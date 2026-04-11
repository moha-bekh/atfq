use async_trait::async_trait;
use crate::domain::entities::{User};
use crate::domain::types::{Username, Email};
use crate::domain::error::DomainError;

pub struct UserDto {
    pub username: Username,
    pub email: Email,
    pub password_hash: String,
}

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn save_user(&self, data: UserDto) -> Result<User, DomainError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, DomainError>;
    async fn find_by_id(&self, id: uuid::Uuid) -> Result<Option<User>, DomainError>;
}
