use crate::domain::error::DomainError;
use crate::domain::ports::user_repository::UserRepository;
use crate::domain::types::Email;
use std::sync::Arc;
use uuid::Uuid;

pub struct UpdateEmailUseCase {
    repo: Arc<dyn UserRepository>,
}

impl UpdateEmailUseCase {
    pub fn new(repo: Arc<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn execute(&self, id: Uuid, new_email_raw: &str) -> Result<(), DomainError> {
        let new_email = Email::new(new_email_raw)?;
        self.repo.update_email(id, &new_email.to_string()).await
    }
}
