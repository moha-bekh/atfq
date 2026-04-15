use redis::AsyncCommands;
use crate::infra::persistence::redis_cache::RedisCache;
use crate::domain::error::DomainError;

impl RedisCache {
    pub async fn exists_handler(&self, key: &str) -> Result<bool, DomainError> {
        let mut conn = self.client.get_multiplexed_async_connection()
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to connect to Redis: {}", e)) })?;

        let exists: bool = conn.exists(key)
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to check key existence in Redis: {}", e)) })?;
        
        Ok(exists)
    }
}
