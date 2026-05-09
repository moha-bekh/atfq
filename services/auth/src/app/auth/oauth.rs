use crate::app::auth::types::AuthResult;
use crate::domain::error::DomainError;
use crate::domain::ports::{
    cache_service::CacheService,
    oauth_service::OAuthProvider,
    token_service::TokenService,
    user_profile_service::UserProfileService,
    user_repository::{UserDto, UserRepository},
};
use std::sync::Arc;
use std::time::Duration;

pub struct OAuthUseCase {
    repo: Arc<dyn UserRepository>,
    tokens: Arc<dyn TokenService>,
    cache: Arc<dyn CacheService>,
    profiles: Arc<dyn UserProfileService>,
}

impl OAuthUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        tokens: Arc<dyn TokenService>,
        cache: Arc<dyn CacheService>,
        profiles: Arc<dyn UserProfileService>,
    ) -> Self {
        Self {
            repo,
            tokens,
            cache,
            profiles,
        }
    }

    pub async fn get_auth_url(
        &self,
        provider: Arc<dyn OAuthProvider>,
        linking_user_id: Option<String>,
    ) -> Result<String, DomainError> {
        let (url, state) = provider.generate_auth_url();

        self.cache
            .set(
                &format!("oauth_state:{}", state),
                "pending",
                Duration::from_secs(600),
            )
            .await?;

        if let Some(user_id) = linking_user_id {
            self.cache
                .set(
                    &format!("oauth_link:{}", state),
                    &user_id,
                    Duration::from_secs(600),
                )
                .await?;
        }

        Ok(url)
    }

    pub async fn handle_callback(
        &self,
        provider_name: &str,
        provider: Arc<dyn OAuthProvider>,
        code: String,
        state: String,
    ) -> Result<AuthResult, DomainError> {
        let state_key = format!("oauth_state:{}", state);
        if !self.cache.exists(&state_key).await? {
            return Err(DomainError::InvalidInput(
                "Invalid or expired state".to_string(),
            ));
        }
        self.cache.delete(&state_key).await?;

        // Check if this was a linking request
        let link_key = format!("oauth_link:{}", state);
        let linking_user_id: Option<String> = self.cache.get(&link_key).await.ok().flatten();
        if linking_user_id.is_some() {
            self.cache.delete(&link_key).await?;
        }

        let oauth_user = provider.fetch_user_info(code).await?;

        let user = if let Some(id_str) = linking_user_id {
            // Priority: Link to the specific user requesting the link
            let target_id = uuid::Uuid::parse_str(&id_str)
                .map_err(|_| DomainError::InvalidInput("Invalid linking user id".into()))?;

            let user = self
                .repo
                .find_by_id(target_id)
                .await?
                .ok_or(DomainError::NotFound)?;

            self.repo
                .link_oauth_account(user.id, provider_name, &oauth_user.provider_id)
                .await?;
            user
        } else {
            // Standard login/registration logic
            let user = self
                .repo
                .find_by_oauth_id(provider_name, &oauth_user.provider_id)
                .await?;

            match user {
                Some(u) => u,
                None => {
                    let existing_user = self.repo.find_by_email(&oauth_user.email).await?;

                    match existing_user {
                        Some(u) => {
                            self.repo
                                .link_oauth_account(u.id, provider_name, &oauth_user.provider_id)
                                .await?;
                            u
                        }
                        None => {
                            let mut username_base =
                                oauth_user.username.replace(" ", "_").to_lowercase();
                            if username_base.is_empty() {
                                username_base = oauth_user
                                    .email
                                    .split('@')
                                    .next()
                                    .unwrap_or("user")
                                    .to_string();
                            }
                            let username = self.unique_oauth_username(&username_base).await?;

                            let dto = UserDto {
                                username,
                                email: crate::domain::types::Email::new(&oauth_user.email)?,
                                password_hash: None,
                            };
                            let new_user = self.repo.save_user(dto).await?;
                            self.repo
                                .link_oauth_account(
                                    new_user.id,
                                    provider_name,
                                    &oauth_user.provider_id,
                                )
                                .await?;

                            // Create profile in User service
                            if let Err(e) = self.profiles.create_profile(new_user.id).await {
                                eprintln!(
                                    "Failed to create user profile for {}: {}",
                                    new_user.id, e
                                );
                            }

                            new_user
                        }
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

    async fn unique_oauth_username(
        &self,
        username_base: &str,
    ) -> Result<crate::domain::types::Username, DomainError> {
        let mut candidate = username_base.to_string();

        for suffix in 1..=100 {
            let username = crate::domain::types::Username::new(&candidate)?;
            if self
                .repo
                .find_by_username(username.as_str())
                .await?
                .is_none()
            {
                return Ok(username);
            }

            candidate = format!("{}_{}", username_base, suffix + 1);
        }

        Err(DomainError::Internal(
            "Could not generate a unique username".into(),
        ))
    }
}
