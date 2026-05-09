use crate::domain::entities::User;
use crate::domain::error::DomainError;
use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;

impl PostgresUserRepository {
    pub async fn find_by_username_handler(
        &self,
        username: &str,
    ) -> Result<Option<User>, DomainError> {
        let user = sqlx::query_as::<_, User>(
            r#"
            SELECT 
                id, 
                username, 
                email, 
                password_hash, 
                mfa_secret,
                mfa_nonce,
                created_at
            FROM users 
            WHERE username = $1
            "#,
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        Ok(user)
    }
}
