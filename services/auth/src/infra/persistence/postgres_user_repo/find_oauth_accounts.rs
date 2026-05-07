use crate::domain::error::DomainError;
use crate::infra::persistence::postgres_user_repo::handler::PostgresUserRepository;

impl PostgresUserRepository {
    pub async fn find_oauth_accounts_handler(
        &self,
        user_id: uuid::Uuid,
    ) -> Result<Vec<(String, String)>, DomainError> {
        let rows = sqlx::query(
            "SELECT provider, provider_id FROM user_oauth WHERE user_id = $1"
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::Internal(e.to_string()))?;

        use sqlx::Row;
        Ok(rows.into_iter().map(|r| (r.get(0), r.get(1))).collect())
    }
}
