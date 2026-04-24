use std::time::Duration;
use crate::domain::ports::cache_service::CacheService;
use crate::domain::error::DomainError;
use async_trait::async_trait;

pub struct RedisCache {
    pub(crate) client: redis::Client,
}

impl RedisCache {
    pub fn new(url: &str) -> Self {
        let client = redis::Client::open(url).expect("Failed to create Redis client");
        Self { client }
    }
}

#[async_trait]
impl CacheService for RedisCache {
    async fn set(&self, key: &str, value: &str, ttl: Duration) -> Result<(), DomainError> {
        self.set_handler(key, value, ttl).await
    }
    async fn get(&self, key: &str) -> Result<Option<String>, DomainError> {
        self.get_handler(key).await
    }
    async fn exists(&self, key: &str) -> Result<bool, DomainError> {
        self.exists_handler(key).await
    }
    async fn delete(&self, key: &str) -> Result<(), DomainError> {
        self.delete_handler(key).await
    }
}
