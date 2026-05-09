use crate::domain::error::DomainError;
use crate::domain::ports::mfa_service::EncryptedMfaSecret;
use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;

impl PostgresUserRepository {
    pub async fn enable_mfa_handler(
        &self,
        id: uuid::Uuid,
        mfa: EncryptedMfaSecret,
    ) -> Result<(), DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET mfa_secret = $1, mfa_nonce = $2
            WHERE id = $3
            AND mfa_secret IS NULL AND mfa_nonce IS NULL
            "#,
        )
        .bind(mfa.data().as_slice())
        .bind(mfa.nonce().as_slice())
        .bind(id)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(DomainError::MfaAlreadyEnabled);
        }

        Ok(())
    }
}
