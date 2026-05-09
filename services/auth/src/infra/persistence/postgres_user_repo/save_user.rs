use crate::domain::entities::User;
use crate::domain::error::DomainError;
use crate::domain::ports::user_repository::UserDto;
use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;
use sqlx::Error as SqlxError;

impl PostgresUserRepository {
    pub async fn save_user_handler(&self, data: UserDto) -> Result<User, DomainError> {
        let row = sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (id, username, email, password_hash)
            VALUES ($1, $2, $3, $4)
            RETURNING 
                id, 
                username, 
                email, 
                password_hash, 
                mfa_secret,
                mfa_nonce,
                created_at
            "#,
        )
        .bind(uuid::Uuid::new_v4())
        .bind(data.username)
        .bind(data.email)
        .bind(data.password_hash)
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
