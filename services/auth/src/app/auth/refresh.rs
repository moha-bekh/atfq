use crate::app::auth::types::AuthResult;
use crate::domain::error::DomainError;
use crate::domain::ports::{
    cache_service::CacheService, token_service::TokenService, user_repository::UserRepository,
};
use std::sync::Arc;

pub struct RefreshTokenUseCase {
    repo: Arc<dyn UserRepository>,
    cache: Arc<dyn CacheService>,
    tokens: Arc<dyn TokenService>,
}

impl RefreshTokenUseCase {
    pub fn new(
        repo: Arc<dyn UserRepository>,
        cache: Arc<dyn CacheService>,
        tokens: Arc<dyn TokenService>,
    ) -> Self {
        Self {
            repo,
            cache,
            tokens,
        }
    }

    pub async fn execute(&self, refresh_token: &str) -> Result<AuthResult, DomainError> {
        let is_blacklisted = self
            .cache
            .exists(&format!("blacklist:{}", refresh_token))
            .await
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        if is_blacklisted {
            return Err(DomainError::Unauthenticated);
        }

        let claims = self.tokens.decode_token(refresh_token)?;

        if claims.typ != "refresh" {
            println!(
                "AuthService: Refresh attempt with invalid token type: {}",
                claims.typ
            );
            return Err(DomainError::Unauthenticated);
        }

        let user = self
            .repo
            .find_by_id(claims.user_id)
            .await?
            .ok_or(DomainError::Unauthenticated)?;

        let ttl = std::time::Duration::from_secs(7 * 24 * 3600);
        self.cache
            .set(&format!("blacklist:{}", refresh_token), "rotated", ttl)
            .await
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        let token_pair = self.tokens.generate_tokens(user.id);

        Ok(AuthResult {
            user,
            access_token: token_pair.access,
            refresh_token: token_pair.refresh,
        })
    }
}
