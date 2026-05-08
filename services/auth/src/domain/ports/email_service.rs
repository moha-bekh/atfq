use async_trait::async_trait;

use crate::domain::error::DomainError;

#[async_trait]
pub trait EmailService: Send + Sync {
    async fn send_password_reset(&self, to: &str, reset_url: &str) -> Result<(), DomainError>;
}
