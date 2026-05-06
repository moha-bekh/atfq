use std::sync::Arc;
use uuid::Uuid;
use crate::domain::ports::user_repository::UserRepository;
use crate::domain::entities::User;
use crate::domain::error::DomainError;

pub struct GetUserUseCase {
    repo: Arc<dyn UserRepository>,
}

impl GetUserUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid) -> Result<User, DomainError> {
        let user = self.repo.find_by_id(id).await?;
        user.ok_or(DomainError::NotFound)
    }
}
