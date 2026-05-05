use std::sync::Arc;
use uuid::Uuid;
use crate::domain::ports::user_repository::UserRepository;
use crate::domain::ports::cache_service::CacheService;
use crate::domain::ports::token_service::TokenPair;
use crate::domain::error::DomainError;

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

        let ttl = std::time::Duration::from_secs(7 * 24 * 3600);
        self.cache.set(&format!("blacklist:{}", tokens.access), "revoked", ttl).await?;
        self.cache.set(&format!("blacklist:{}", tokens.refresh), "revoked", ttl).await?;
        
        Ok(())
    }
}
