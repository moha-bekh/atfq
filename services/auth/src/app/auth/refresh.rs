use std::sync::Arc;
use crate::domain::ports::{
    user_repository::UserRepository,
    cache_service::CacheService,
    token_service::TokenService,
};
use crate::domain::error::DomainError;
use crate::app::auth::types::AuthResult;

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
        Self { repo, cache, tokens }
    }

    pub async fn execute(&self, refresh_token: &str) -> Result<AuthResult, DomainError> {
        // 1. Vérifier si le refresh token est blacklisté
        let is_blacklisted = self.cache.exists(&format!("blacklist:{}", refresh_token))
            .await
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        if is_blacklisted {
            return Err(DomainError::Unauthenticated);
        }

        // 2. Décoder et valider le token
        let claims = self.tokens.decode_token(refresh_token)?;

        // 3. Vérifier que l'utilisateur existe toujours
        let user = self.repo.find_by_id(claims.user_id)
            .await?
            .ok_or(DomainError::Unauthenticated)?;

        // 4. Blacklister l'ancien refresh token (rotation)
        let ttl = std::time::Duration::from_secs(7 * 24 * 3600);
        self.cache.set(&format!("blacklist:{}", refresh_token), "rotated", ttl)
            .await
            .map_err(|e| DomainError::Internal(e.to_string()))?;

        // 5. Générer une nouvelle paire
        let token_pair = self.tokens.generate_tokens(user.id);

        Ok(AuthResult {
            user,
            access_token: token_pair.access,
            refresh_token: token_pair.refresh,
        })
    }
}
