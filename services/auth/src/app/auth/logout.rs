use std::sync::Arc;
use crate::domain::ports::{
    cache_service::CacheService,
    token_service::TokenPair,
};

use crate::domain::error::DomainError;

use std::time::Duration;

const BLACKLIST_TTL: Duration = Duration::from_secs(7 * 24 * 3600);

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
        self.cache.set(&format!("blacklist:{}", tokens.access), "revoked", BLACKLIST_TTL).await?;
        self.cache.set(&format!("blacklist:{}", tokens.refresh), "revoked", BLACKLIST_TTL).await?;

        Ok(())
    }
}
