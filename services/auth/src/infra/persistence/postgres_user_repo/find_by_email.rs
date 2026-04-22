use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;
use crate::domain::entities::User;
use crate::domain::error::DomainError;
use crate::domain::types::{Username, Email};

impl PostgresUserRepository {
    pub async fn find_by_email_handler(&self, email: &str) -> Result<Option<User>, DomainError> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT 
                id, 
                username as "username: Username", 
                email as "email: Email", 
                password_hash, 
                mfa_secret,
                created_at
            FROM users 
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        Ok(user)
    }
}
