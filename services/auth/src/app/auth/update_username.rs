use crate::domain::error::DomainError;
use crate::domain::ports::user_repository::UserRepository;
use crate::domain::types::Username;
use std::sync::Arc;
use uuid::Uuid;

pub struct UpdateUsernameUseCase {
    repo: Arc<dyn UserRepository>,
}

impl UpdateUsernameUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid, new_username_raw: &str) -> Result<(), DomainError> {
        let new_username = Username::new(new_username_raw)?;
        self.repo
            .update_username(id, &new_username.to_string())
            .await
    }
}
