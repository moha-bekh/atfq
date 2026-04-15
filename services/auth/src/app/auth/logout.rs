use std::sync::Arc;
use crate::domain::ports::{
    cache_service::CacheService,
    token_service::TokenPair,
};

use crate::domain::error::DomainError;

pub struct LogoutUseCase {
    cache: Arc<dyn CacheService>,
}

impl LogoutUseCase {
    pub fn new(
        cache: Arc<dyn CacheService>,
    ) -> Self {
        Self { cache }
    }

    pub async fn execute(&self, tokens: TokenPair) -> Result<(), DomainError> {

        // Set a TTL of 7 days (matching the longest-lived token, the refresh token)
        let ttl = std::time::Duration::from_secs(7 * 24 * 3600);

        self.cache.set(&format!("blacklist:{}", tokens.access), "revoked", ttl).await?;
        self.cache.set(&format!("blacklist:{}", tokens.refresh), "revoked", ttl).await?;

        Ok(())
    }
}
