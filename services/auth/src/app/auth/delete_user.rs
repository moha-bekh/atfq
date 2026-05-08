use crate::domain::error::DomainError;
use crate::domain::ports::cache_service::CacheService;
use crate::domain::ports::token_service::TokenPair;
use crate::domain::ports::user_repository::UserRepository;
use std::sync::Arc;
use uuid::Uuid;

use std::time::Duration;

const BLACKLIST_TTL: Duration = Duration::from_secs(7 * 24 * 3600);

pub struct DeleteUserUseCase {
    repo: Arc<dyn UserRepository>,
    cache: Arc<dyn CacheService>,
}

impl DeleteUserUseCase {
    pub fn new(repo: Arc<dyn UserRepository>, cache: Arc<dyn CacheService>) -> Self {
        Self { repo, cache }
    }

    pub async fn execute(&self, id: Uuid, tokens: TokenPair) -> Result<(), DomainError> {
        self.repo.delete_by_id(id).await?;

        self.cache
            .set(
                &format!("blacklist:{}", tokens.access),
                "revoked",
                BLACKLIST_TTL,
            )
            .await?;
        self.cache
            .set(
                &format!("blacklist:{}", tokens.refresh),
                "revoked",
                BLACKLIST_TTL,
            )
            .await?;

        Ok(())
    }
}
