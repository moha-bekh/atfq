use std::sync::Arc;
use uuid::Uuid;
use crate::domain::ports::user_repository::UserRepository;
use crate::domain::error::DomainError;

pub struct GetLinkedProvidersUseCase {
    repo: Arc<dyn UserRepository>,
}

impl GetLinkedProvidersUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, user_id: Uuid) -> Result<Vec<(String, String)>, DomainError> {
        self.repo.find_oauth_accounts(user_id).await
    }
}
