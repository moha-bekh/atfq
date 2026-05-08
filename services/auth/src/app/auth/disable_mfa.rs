use crate::domain::error::DomainError;
use crate::domain::ports::user_repository::UserRepository;
use std::sync::Arc;
use uuid::Uuid;

pub struct DisableMfaUseCase {
    repo: Arc<dyn UserRepository>,
}

impl DisableMfaUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, user_id: Uuid) -> Result<(), DomainError> {
        self.repo.disable_mfa(user_id).await
    }
}
