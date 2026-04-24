use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;
use crate::domain::ports::mfa_service::EncryptedMfaSecret;
use crate::domain::error::DomainError;

impl PostgresUserRepository {
    pub async fn enable_mfa_handler(&self, id: uuid::Uuid, mfa: EncryptedMfaSecret) -> Result<(), DomainError> {
        sqlx::query!(
            r#"
            UPDATE users
            SET mfa_secret = $1, mfa_nonce = $2
            WHERE id = $3
            "#,
            mfa.data().as_slice(),
            mfa.nonce().as_slice(),
            id,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        Ok(())
    }
}
