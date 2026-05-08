use crate::domain::error::DomainError;
use crate::domain::ports::user_repository::UserRepository;
use std::sync::Arc;
use uuid::Uuid;

pub struct UnlinkOAuthUseCase {
    repo: Arc<dyn UserRepository>,
}

impl UnlinkOAuthUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, user_id: Uuid, provider: &str) -> Result<(), DomainError> {
        self.repo.unlink_oauth_account(user_id, provider).await
    }
}
