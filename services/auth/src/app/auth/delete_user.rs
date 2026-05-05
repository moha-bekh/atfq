use std::sync::Arc;
use uuid::Uuid;
use crate::domain::ports::user_repository::UserRepository;
use crate::domain::error::DomainError;

pub struct DeleteUserUseCase {
    repo: Arc<dyn UserRepository>,
}

impl DeleteUserUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<(), DomainError> {
        self.repo.delete_by_id(id).await
    }
}
