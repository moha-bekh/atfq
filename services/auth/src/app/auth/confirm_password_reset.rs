use std::sync::Arc;

use uuid::Uuid;

use crate::domain::error::DomainError;
use crate::domain::ports::cache_service::CacheService;
use crate::domain::ports::crypto_service::CryptoService;
use crate::domain::ports::user_repository::UserRepository;

pub struct ConfirmPasswordResetUseCase {
    repo: Arc<dyn UserRepository>,
    cache: Arc<dyn CacheService>,
    crypto: Arc<dyn CryptoService>,
}

impl ConfirmPasswordResetUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        cache: Arc<dyn CacheService>,
        crypto: Arc<dyn CryptoService>,
    ) -> Self {
        Self {
            repo,
            cache,
            crypto,
        }
    }

    pub async fn execute(&self, reset_token: &str, new_password: &str) -> Result<(), DomainError> {
        if new_password.len() < 8
            || !new_password.chars().any(|c| c.is_ascii_uppercase())
            || !new_password.chars().any(|c| c.is_ascii_digit())
        {
            return Err(DomainError::InvalidInput(
                "Password must be at least 8 characters and include one uppercase letter and one number".into(),
            ));
        }

        let reset_key = format!("password_reset:{}", reset_token.trim());
        let user_id = self
            .cache
            .get(&reset_key)
            .await?
            .ok_or(DomainError::Unauthenticated)?;

        let user_id = Uuid::parse_str(&user_id)
            .map_err(|_| DomainError::Internal("Invalid password reset payload".into()))?;

        let new_hash = self
            .crypto
            .hash_password(new_password)
            .map_err(DomainError::Internal)?;

        self.repo.update_password(user_id, &new_hash).await?;
        self.cache.delete(&reset_key).await?;

        Ok(())
    }
}
