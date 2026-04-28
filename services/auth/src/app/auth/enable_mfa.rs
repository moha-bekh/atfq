use std::sync::Arc;
use crate::domain::ports::{
    user_repository::UserRepository,
    encryption_service::EncryptionService,
    token_service::TokenService,
    mfa_service::MfaService,
};
use crate::domain::error::DomainError;
use crate::app::auth::types::MfaHumanReadableSecret;

pub struct EnableMfaUseCase {
    repo: Arc<dyn UserRepository>,
    enc: Arc<dyn EncryptionService>,
    mfa: Arc<dyn MfaService>,
    tokens: Arc<dyn TokenService>,
}

impl EnableMfaUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        enc: Arc<dyn EncryptionService>,
        mfa: Arc<dyn MfaService>,
        tokens: Arc<dyn TokenService>,
    ) -> Self {
        Self { repo, enc, mfa, tokens }
    }

    pub async fn execute(&self, access_token: &str) -> Result<MfaHumanReadableSecret, DomainError> {
        let claims = self.tokens.decode_token(access_token)?;

        let secret = self.mfa.generate_mfa_secret();
        let ciphertext = self.enc.encrypt(&secret)?;

        self.repo.enable_mfa(claims.user_id, ciphertext).await?;

        Ok(self.mfa.make_human_readable_secret(&secret))
    }
}
