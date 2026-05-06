use async_trait::async_trait;
use crate::domain::entities::User;
use crate::domain::ports::mfa_service::EncryptedMfaSecret;
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
    async fn enable_mfa(&self, id: uuid::Uuid, mfa: EncryptedMfaSecret) -> Result<(), DomainError>;
    async fn find_by_id(&self, id: uuid::Uuid) -> Result<Option<User>, DomainError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, DomainError>;
    async fn find_by_username(&self, username: &str) -> Result<Option<User>, DomainError>;
    async fn find_by_oauth_id(&self, provider: &str, provider_id: &str) -> Result<Option<User>, DomainError>;
    async fn link_oauth_account(&self, user_id: uuid::Uuid, provider: &str, provider_id: &str) -> Result<(), DomainError>;
    async fn delete_by_id(&self, id: uuid::Uuid) -> Result<(), DomainError>;
    async fn update_email(&self, id: uuid::Uuid, new_email: &str) -> Result<(), DomainError>;
    async fn update_password(&self, id: uuid::Uuid, old_password_hash: &str, new_password_hash: &str) -> Result<(), DomainError>;
}
