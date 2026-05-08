use crate::domain::ports::{
    crypto_service::CryptoService, token_service::TokenService,
    user_profile_service::UserProfileService, user_repository::UserRepository,
};
use std::sync::Arc;

use crate::app::auth::types::AuthResult;
use crate::domain::error::DomainError;
use crate::domain::ports::user_repository::UserDto;
use crate::domain::types::{Email, Username};

pub struct RegisterUseCase {
    repo: Arc<dyn UserRepository>,
    tokens: Arc<dyn TokenService>,
    crypto: Arc<dyn CryptoService>,
    profiles: Arc<dyn UserProfileService>,
}

impl RegisterUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        tokens: Arc<dyn TokenService>,
        crypto: Arc<dyn CryptoService>,
        profiles: Arc<dyn UserProfileService>,
    ) -> Self {
        Self {
            repo,
            tokens,
            crypto,
            profiles,
        }
    }

    pub async fn execute(
        &self,
        username_raw: &str,
        email_raw: &str,
        password_raw: &str,
    ) -> Result<AuthResult, DomainError> {
        let username = Username::new(username_raw)?;
        let email = Email::new(email_raw)?;

        let hashed_password = self
            .crypto
            .hash_password(password_raw)
            .map_err(DomainError::Internal)?;

        let dto = UserDto {
            username,
            email,
            password_hash: Some(hashed_password),
        };

        let user = self.repo.save_user(dto).await?;

        // Create profile in User service
        if let Err(e) = self.profiles.create_profile(user.id).await {
            eprintln!("Failed to create user profile for {}: {}", user.id, e);
        }

        let token_pair = self.tokens.generate_tokens(user.id);

        Ok(AuthResult {
            user,
            access_token: token_pair.access,
            refresh_token: token_pair.refresh,
        })
    }
}
