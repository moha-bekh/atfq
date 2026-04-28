use std::sync::Arc;
use crate::domain::ports::{
    user_repository::{UserRepository, UserDto},
    token_service::TokenService,
    cache_service::CacheService,
    oauth_service::OAuthProvider,
};
use crate::domain::error::DomainError;
use crate::app::auth::types::AuthResult;
use std::time::Duration;

pub struct OAuthUseCase {
    repo: Arc<dyn UserRepository>,
    tokens: Arc<dyn TokenService>,
    cache: Arc<dyn CacheService>,
}

impl OAuthUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        tokens: Arc<dyn TokenService>,
        cache: Arc<dyn CacheService>,
    ) -> Self {
        Self { repo, tokens, cache }
    }

    pub async fn get_auth_url(&self, provider: Arc<dyn OAuthProvider>) -> Result<String, DomainError> {
        let (url, state) = provider.generate_auth_url();

        self.cache.set(&format!("oauth_state:{}", state), "pending", Duration::from_secs(600)).await?;

        Ok(url)
    }

    pub async fn handle_callback(
        &self, 
        provider_name: &str,
        provider: Arc<dyn OAuthProvider>,
        code: String, 
        state: String
    ) -> Result<AuthResult, DomainError> {

        let state_key = format!("oauth_state:{}", state);
        if !self.cache.exists(&state_key).await? {
            return Err(DomainError::InvalidInput("Invalid or expired state".to_string()));
        }
        self.cache.delete(&state_key).await?;

        let oauth_user = provider.fetch_user_info(code).await?;

        let user = self.repo.find_by_oauth_id(provider_name, &oauth_user.provider_id).await?;

        let user = match user {
            Some(u) => u,
            None => {
                let existing_user = self.repo.find_by_email(&oauth_user.email).await?;

                match existing_user {
                    Some(u) => {
                        self.repo.link_oauth_account(u.id, provider_name, &oauth_user.provider_id).await?;
                        u
                    },
                    None => {
                        let mut username_base = oauth_user.username.replace(" ", "_").to_lowercase();
                        if username_base.is_empty() {
                            username_base = oauth_user.email.split('@').next().unwrap_or("user").to_string();
                        }

                        let dto = UserDto {
                            username: crate::domain::types::Username::new(&username_base)?,
                            email: crate::domain::types::Email::new(&oauth_user.email)?,
                            password_hash: "".to_string(),
                        };
                        let new_user = self.repo.save_user(dto).await?;
                        self.repo.link_oauth_account(new_user.id, provider_name, &oauth_user.provider_id).await?;
                        new_user
                    }
                }
            }
        };

        let tokens = self.tokens.generate_tokens(user.id);

        Ok(AuthResult {
            user,
            access_token: tokens.access,
            refresh_token: tokens.refresh,
        })
    }
}
