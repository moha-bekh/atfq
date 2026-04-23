use crate::domain::error::DomainError;
use crate::infra::persistence::postgres_user_repo::handler::PostgresUserRepository;
use uuid::Uuid;

impl PostgresUserRepository {
    pub async fn link_oauth_account_handler(
        &self,
        user_id: Uuid,
        provider: &str,
        provider_id: &str,
    ) -> Result<(), DomainError> {
        sqlx::query!(
            r#"
            INSERT INTO user_oauth (user_id, provider, provider_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (provider, provider_id) DO NOTHING
            "#,
            user_id,
            provider,
            provider_id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        Ok(())
    }
}
