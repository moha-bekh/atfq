use crate::domain::entities::User;
use crate::domain::error::DomainError;
use crate::domain::ports::mfa_service::EncryptedMfaSecret;
use crate::domain::ports::user_repository::UserDto;
use crate::domain::ports::user_repository::UserRepository;
use async_trait::async_trait;
use sqlx::PgPool;

#[derive(Clone)]
pub struct PostgresUserRepository {
    pub pool: PgPool,
}

impl PostgresUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
    async fn save_user(&self, data: UserDto) -> Result<User, DomainError> {
        self.save_user_handler(data).await
    }

    async fn enable_mfa(&self, id: uuid::Uuid, mfa: EncryptedMfaSecret) -> Result<(), DomainError> {
        self.enable_mfa_handler(id, mfa).await
    }

    async fn disable_mfa(&self, id: uuid::Uuid) -> Result<(), DomainError> {
        self.disable_mfa_handler(id).await
    }

    async fn find_by_id(&self, id: uuid::Uuid) -> Result<Option<User>, DomainError> {
        self.find_by_id_handler(id).await
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<User>, DomainError> {
        self.find_by_email_handler(email).await
    }

    async fn find_by_username(&self, username: &str) -> Result<Option<User>, DomainError> {
        self.find_by_username_handler(username).await
    }
    async fn find_by_oauth_id(
        &self,
        provider: &str,
        provider_id: &str,
    ) -> Result<Option<User>, DomainError> {
        self.find_by_oauth_id_handler(provider, provider_id).await
    }
    async fn link_oauth_account(
        &self,
        user_id: uuid::Uuid,
        provider: &str,
        provider_id: &str,
    ) -> Result<(), DomainError> {
        self.link_oauth_account_handler(user_id, provider, provider_id)
            .await
    }

    async fn unlink_oauth_account(
        &self,
        user_id: uuid::Uuid,
        provider: &str,
    ) -> Result<(), DomainError> {
        self.unlink_oauth_account_handler(user_id, provider).await
    }

    async fn delete_by_id(&self, id: uuid::Uuid) -> Result<(), DomainError> {
        self.delete_by_id_handler(id).await
    }

    async fn update_email(&self, id: uuid::Uuid, new_email: &str) -> Result<(), DomainError> {
        self.update_email_handler(id, new_email).await
    }

    async fn update_username(&self, id: uuid::Uuid, new_username: &str) -> Result<(), DomainError> {
        self.update_username_handler(id, new_username).await
    }

    async fn update_password(
        &self,
        id: uuid::Uuid,
        new_password_hash: &str,
    ) -> Result<(), DomainError> {
        self.update_password_handler(id, new_password_hash).await
    }

    async fn find_oauth_accounts(
        &self,
        user_id: uuid::Uuid,
    ) -> Result<Vec<(String, String)>, DomainError> {
        self.find_oauth_accounts_handler(user_id).await
    }
}
