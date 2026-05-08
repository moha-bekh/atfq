use crate::domain::entities::User;
use crate::domain::error::DomainError;
use crate::domain::types::{Email, Username};
use crate::infra::persistence::postgres_user_repo::handler::PostgresUserRepository;

impl PostgresUserRepository {
    pub async fn find_by_oauth_id_handler(
        &self,
        provider: &str,
        provider_id: &str,
    ) -> Result<Option<User>, DomainError> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT 
                u.id, 
                u.username as "username: Username", 
                u.email as "email: Email", 
                u.password_hash, 
                u.mfa_secret,
                u.mfa_nonce,
                u.created_at
            FROM users u
            JOIN user_oauth uo ON u.id = uo.user_id
            WHERE uo.provider = $1 AND uo.provider_id = $2
            "#,
            provider,
            provider_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        Ok(user)
    }
}
