use std::sync::Arc;
use crate::domain::ports::{
    user_repository::UserRepository, 
    token_service::TokenService,
    crypto_service::CryptoService
};

use crate::domain::ports::user_repository::UserDto; 
use crate::domain::entities::User;
use crate::domain::types::{Username, Email};
use crate::domain::error::DomainError;

pub struct RegistrationResult {
    pub user: User,
    pub access_token: String,
    pub refresh_token: String,
}

pub struct RegisterUseCase {
    repo: Arc<dyn UserRepository>,
    tokens: Arc<dyn TokenService>,
    crypto: Arc<dyn CryptoService>,
}

impl RegisterUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>, 
        tokens: Arc<dyn TokenService>,
        crypto: Arc<dyn CryptoService>
    ) -> Self {
        Self { repo, tokens, crypto }
    }

    pub async fn execute(
        &self, 
        username_raw: &str, 
        email_raw: &str, 
        password_raw: &str
    ) -> Result<RegistrationResult, DomainError> {

        let username = Username::new(username_raw)?;
        let email = Email::new(email_raw)?;

        let hashed_password = self.crypto
            .hash_password(password_raw)
            .map_err(DomainError::Internal)?;

        let dto = UserDto {
            username,
            email,
            password_hash: hashed_password,
        };

        let user = self.repo.save_user(dto).await?;

        let token_pair = self.tokens.generate_tokens(user.id);

        Ok(RegistrationResult {
            user,
            access_token: token_pair.access,
            refresh_token: token_pair.refresh,
        })
    }
}
