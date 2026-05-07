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
        let result = sqlx::query!(
            r#"
            INSERT INTO user_oauth (user_id, provider, provider_id)
            VALUES ($1, $2, $3)
            "#,
            user_id,
            provider,
            provider_id
        )
        .execute(&self.pool)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(e) => {
                if let Some(db_err) = e.as_database_error() {
                    if db_err.is_unique_violation() {
                        return Err(DomainError::AlreadyExists);
                    }
                }
                Err(DomainError::Internal(e.to_string()))
            }
        }
    }
}
