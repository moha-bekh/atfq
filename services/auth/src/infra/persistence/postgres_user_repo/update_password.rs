use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;
use crate::domain::error::DomainError;

impl PostgresUserRepository {
    pub async fn update_password_handler(
        &self, 
        id: uuid::Uuid, 
        old_password_hash: &str, 
        new_password_hash: &str
    ) -> Result<(), DomainError> {
        let result = sqlx::query!(
            "UPDATE users SET password_hash = $1 WHERE id = $2 AND password_hash = $3",
            new_password_hash,
            id,
            old_password_hash
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(DomainError::Unauthenticated);
        }

        Ok(())
    }
}
