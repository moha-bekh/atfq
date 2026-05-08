use crate::domain::error::DomainError;
use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;

impl PostgresUserRepository {
    pub async fn update_password_handler(
        &self,
        id: uuid::Uuid,
        new_password_hash: &str,
    ) -> Result<(), DomainError> {
        let result = sqlx::query!(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            new_password_hash,
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound);
        }

        Ok(())
    }
}
