use crate::domain::error::DomainError;
use async_trait::async_trait;
use std::time::Duration;

#[async_trait]
pub trait CacheService: Send + Sync {
    async fn set(&self, key: &str, value: &str, ttl: Duration) -> Result<(), DomainError>;
    async fn get(&self, key: &str) -> Result<Option<String>, DomainError>;
    async fn increment(&self, key: &str) -> Result<u64, DomainError>;
    async fn exists(&self, key: &str) -> Result<bool, DomainError>;
    async fn delete(&self, key: &str) -> Result<(), DomainError>;
}
