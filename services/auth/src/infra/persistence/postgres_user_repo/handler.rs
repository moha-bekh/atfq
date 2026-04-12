use crate::domain::ports::user_repository::UserRepository;
use crate::domain::entities::{User};
use crate::domain::ports::user_repository::UserDto;
use crate::domain::error::DomainError;
use async_trait::async_trait;
use sqlx::PgPool;

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

    async fn find_by_id(&self, id: uuid::Uuid) -> Result<Option<User>, DomainError> {
        self.find_by_id_handler(id).await
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<User>, DomainError> {
        self.find_by_email_handler(email).await
    }

    async fn find_by_username(&self, username: &str) -> Result<Option<User>, DomainError> {
        self.find_by_username_handler(username).await
    }
}

