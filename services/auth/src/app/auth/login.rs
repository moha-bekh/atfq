use std::sync::Arc;
use crate::domain::ports::{
    user_repository::UserRepository,
    token_service::TokenService,
    crypto_service::CryptoService
};
use crate::domain::types::{Username, Email};
use crate::domain::error::DomainError;
use crate::app::auth::types::AuthResult;

pub struct LoginUseCase {
    repo: Arc<dyn UserRepository>,
    tokens: Arc<dyn TokenService>,
    crypto: Arc<dyn CryptoService>,
}

impl LoginUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        tokens: Arc<dyn TokenService>,
        crypto: Arc<dyn CryptoService>
    ) -> Self {
        Self { repo, tokens, crypto }
    }

    pub async fn execute(
        &self,
        identifier: &str,
        password_raw: &str
    ) -> Result<AuthResult, DomainError> {

        let user = if identifier.contains('@') {
            let email = Email::new(identifier)?;
            self.repo.find_by_email(email.as_str()).await?
        } else {
            let username = Username::new(identifier)?;
            self.repo.find_by_username(username.as_str()).await?
        };

        let user = user.ok_or(DomainError::Unauthenticated)?;

        let hash = user.password_hash.as_deref().ok_or_else(|| {
             DomainError::Internal("User has no password hash".to_string())
        })?;

        if !self.crypto.verify_password(password_raw, hash) {
            return Err(DomainError::Unauthenticated);
        }

        let tokens = self.tokens.generate_tokens(user.id);

        Ok(AuthResult {
            user,
            access_token: tokens.access,
            refresh_token: tokens.refresh,
        })
    }
}
