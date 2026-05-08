use crate::domain::entities::AuthenticatedUser;
use crate::domain::error::DomainError;
use crate::domain::ports::{
    crypto_service::CryptoService, encryption_service::Ciphertext,
    encryption_service::EncryptionService, mfa_service::MfaService, token_service::TokenService,
    user_repository::UserRepository,
};
use std::str::FromStr;
use std::sync::Arc;
use uuid::Uuid;

pub struct VerifyMfaUseCase {
    repo: Arc<dyn UserRepository>,
    enc: Arc<dyn EncryptionService>,
    mfa: Arc<dyn MfaService>,
    tokens: Arc<dyn TokenService>,
    crypto: Arc<dyn CryptoService>,
}

impl VerifyMfaUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        enc: Arc<dyn EncryptionService>,
        mfa: Arc<dyn MfaService>,
        tokens: Arc<dyn TokenService>,
        crypto: Arc<dyn CryptoService>,
    ) -> Self {
        Self {
            repo,
            enc,
            mfa,
            tokens,
            crypto,
        }
    }

    pub async fn execute(
        &self,
        user_id: &str,
        code: &str,
        secret_hash: &str,
    ) -> Result<AuthenticatedUser, DomainError> {
        let uuid = Uuid::from_str(user_id)
            .map_err(|_| DomainError::Internal("uuid parse error".to_string()))?;

        let user = self
            .repo
            .find_by_id(uuid)
            .await?
            .ok_or(DomainError::Unauthenticated)?;

        if let Some(secret) = &user.mfa_secret {
            let current_secret_hash = self.crypto.hash(secret);
            if current_secret_hash != secret_hash {
                return Err(DomainError::Unauthenticated);
            }
        }

        let (mfa_secret, mfa_nonce) = (user.mfa_secret.clone(), user.mfa_nonce.clone());
        let Some((secret, nonce)) = mfa_secret.zip(mfa_nonce) else {
            return Err(DomainError::Internal(
                "2fa secret nonce not found".to_string(),
            ));
        };
        let ciphertext = Ciphertext::new(secret, nonce);

        let mfa_secret = self
            .enc
            .decrypt(&ciphertext)?
            .try_into()
            .map_err(|_| DomainError::Internal("badly sized key".to_string()))?;

        let code_valid = self
            .mfa
            .code_currently_valid(&mfa_secret, code)
            .map_err(|_| DomainError::Internal("could not verify 2fa code".to_string()))?;

        if !code_valid {
            return Err(DomainError::Unauthenticated);
        }

        let claims = self.tokens.generate_tokens(user.id);

        Ok(AuthenticatedUser {
            user,
            refresh_token: claims.refresh,
            access_token: claims.access,
        })
    }
}
