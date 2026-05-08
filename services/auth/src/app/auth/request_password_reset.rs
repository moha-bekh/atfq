use std::sync::Arc;
use std::time::Duration;

use uuid::Uuid;

use crate::domain::error::DomainError;
use crate::domain::ports::cache_service::CacheService;
use crate::domain::ports::email_service::EmailService;
use crate::domain::ports::user_repository::UserRepository;

const RESET_TOKEN_TTL: Duration = Duration::from_secs(15 * 60);

pub struct RequestPasswordResetUseCase {
    repo: Arc<dyn UserRepository>,
    cache: Arc<dyn CacheService>,
    email: Arc<dyn EmailService>,
    app_public_url: String,
}

impl RequestPasswordResetUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        cache: Arc<dyn CacheService>,
        email: Arc<dyn EmailService>,
        app_public_url: String,
    ) -> Self {
        Self {
            repo,
            cache,
            email,
            app_public_url,
        }
    }

    pub async fn execute(&self, identifier: &str) -> Result<(), DomainError> {
        let identifier = identifier.trim();
        if identifier.len() < 3 {
            return Err(DomainError::InvalidInput(
                "Email or username must be at least 3 characters".into(),
            ));
        }

        let user = if identifier.contains('@') {
            self.repo.find_by_email(identifier).await?
        } else {
            self.repo.find_by_username(identifier).await?
        };

        let Some(user) = user else {
            return Ok(());
        };

        let token = Uuid::new_v4().to_string();
        self.cache
            .set(
                &format!("password_reset:{token}"),
                &user.id.to_string(),
                RESET_TOKEN_TTL,
            )
            .await?;

        let reset_url = format!(
            "{}/password-reset?token={}",
            self.app_public_url.trim_end_matches('/'),
            token
        );

        self.email
            .send_password_reset(&user.email.to_string(), &reset_url)
            .await?;

        Ok(())
    }
}
