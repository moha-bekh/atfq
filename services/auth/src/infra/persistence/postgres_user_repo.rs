use crate::domain::ports::user_repository::UserRepository;
use crate::domain::entities::{User, UserDto};
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;

pub struct PostgresUserRepository {
    _pool: PgPool,
}

impl PostgresUserRepository {
    pub fn new(pool: PgPool) -> Self { Self { _pool: pool } }
}

#[async_trait]
impl UserRepository for PostgresUserRepository {
    async fn save(&self, data: UserDto) -> User {

        println!("[INFRA] SQL INSERT: user={}, email={}", *data.username, *data.email);
        
        User {
            id: Uuid::new_v4(),
            username: data.username,
            email: data.email,
            password_hash: Some(data.password_hash),
            is_2fa_enabled: false,
            created_at: Utc::now(),
        }
    }
}
