use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;
use crate::domain::error::DomainError;

impl PostgresUserRepository {
    pub async fn update_email_handler(&self, id: uuid::Uuid, new_email: &str) -> Result<(), DomainError> {
        let result = sqlx::query(
            "UPDATE users SET email = $1 WHERE id = $2"
        )
        .bind(new_email)
        .bind(id)
        .execute(&self.pool)
        .await;

        match result {
            Ok(res) => {
                if res.rows_affected() == 0 {
                    return Err(DomainError::NotFound);
                }
                Ok(())
            }
            Err(e) => {
                if let Some(db_err) = e.as_database_error() {
                    // Postgres unique_violation code is 23505
                    if db_err.code() == Some(std::borrow::Cow::Borrowed("23505")) {
                        return Err(DomainError::AlreadyExists);
                    }
                }
                Err(DomainError::Internal(e.to_string()))
            }
        }
    }
}
