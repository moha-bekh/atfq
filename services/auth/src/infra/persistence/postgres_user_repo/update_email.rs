use crate::domain::error::DomainError;
use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;

const PG_UNIQUE_VIOLATION: &str = "23505";

impl PostgresUserRepository {
    pub async fn update_email_handler(
        &self,
        id: uuid::Uuid,
        new_email: &str,
    ) -> Result<(), DomainError> {
        let result = sqlx::query!("UPDATE users SET email = $1 WHERE id = $2", new_email, id)
            .execute(&self.pool)
            .await;

        match result {
            Ok(res) => {
                if res.rows_affected() == 0 {
                    Err(DomainError::NotFound)
                } else {
                    Ok(())
                }
            }
            Err(sqlx::Error::Database(e)) if e.code() == Some(PG_UNIQUE_VIOLATION.into()) => {
                Err(DomainError::AlreadyExists)
            }
            Err(e) => Err(DomainError::Internal(e.to_string())),
        }
    }
}
