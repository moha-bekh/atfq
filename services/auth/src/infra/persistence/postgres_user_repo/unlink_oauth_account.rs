use crate::domain::error::DomainError;
use crate::infra::persistence::postgres_user_repo::handler::PostgresUserRepository;
use uuid::Uuid;

impl PostgresUserRepository {
    pub async fn unlink_oauth_account_handler(
        &self,
        user_id: Uuid,
        provider: &str,
    ) -> Result<(), DomainError> {
        sqlx::query!(
            r#"
            DELETE FROM user_oauth
            WHERE user_id = $1 AND provider = $2
            "#,
            user_id,
            provider
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        Ok(())
    }
}
