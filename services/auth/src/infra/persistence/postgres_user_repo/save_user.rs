use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;
use crate::domain::entities::User;
use crate::domain::ports::user_repository::UserDto;
use crate::domain::error::DomainError;
use crate::domain::types::{Username, Email};
use sqlx::Error as SqlxError;

impl PostgresUserRepository {
    pub async fn save_user_handler(&self, data: UserDto) -> Result<User, DomainError> {
        let row = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (id, username, email, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING 
                id, 
                username as "username: Username", 
                email as "email: Email", 
                password_hash, 
                is_2fa_enabled, 
                created_at
            "#,
            uuid::Uuid::new_v4(),
            data.username as _,
            data.email as _,
            data.password_hash
        )
        .fetch_one(&self.pool)
        .await;

        match row {
            Ok(user) => Ok(user),
            Err(e) => match e {
                SqlxError::Database(db_err) if db_err.is_unique_violation() => {
                    Err(DomainError::AlreadyExists)
                }
                _ => Err(DomainError::Internal(e.to_string())),
            },
        }
    }
}
