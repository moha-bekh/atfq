use crate::domain::error::DomainError;
use async_trait::async_trait;
use uuid::Uuid;

#[async_trait]
pub trait UserProfileService: Send + Sync {
    async fn create_profile(&self, user_id: Uuid) -> Result<(), DomainError>;
}
