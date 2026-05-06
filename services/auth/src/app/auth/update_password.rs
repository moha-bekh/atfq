use std::sync::Arc;
use uuid::Uuid;
use crate::domain::ports::user_repository::UserRepository;
use crate::domain::ports::crypto_service::CryptoService;
use crate::domain::error::DomainError;

pub struct UpdatePasswordUseCase {
    repo: Arc<dyn UserRepository>,
    crypto: Arc<dyn CryptoService>,
}

impl UpdatePasswordUseCase {
    pub fn new(repo: Arc<dyn UserRepository>, crypto: Arc<dyn CryptoService>) -> Self {
        Self { repo, crypto }
    }

    pub async fn execute(&self, id: Uuid, old_password: &str, new_password: &str) -> Result<(), DomainError> {
        let user = self.repo.find_by_id(id).await?
            .ok_or(DomainError::NotFound)?;

        let current_hash = user.password_hash.ok_or(DomainError::Unauthenticated)?;

        if !self.crypto.verify_password(old_password, &current_hash) {
            return Err(DomainError::Unauthenticated);
        }

        let new_hash = self.crypto.hash_password(new_password)
            .map_err(DomainError::Internal)?;

        self.repo.update_password(id, &current_hash, &new_hash).await
    }
}
