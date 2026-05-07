use crate::domain::error::DomainError;
use crate::infra::persistence::postgres_user_repo::handler::PostgresUserRepository;
use uuid::Uuid;

impl PostgresUserRepository {
    pub async fn disable_mfa_handler(&self, id: Uuid) -> Result<(), DomainError> {
        sqlx::query!(
            "UPDATE users SET mfa_secret = NULL, mfa_nonce = NULL WHERE id = $1",
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        Ok(())
    }
}
