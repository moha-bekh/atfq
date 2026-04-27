use redis::AsyncCommands;
use crate::infra::persistence::redis_cache::RedisCache;
use crate::domain::error::DomainError;

impl RedisCache {
    pub async fn increment_handler(&self, key: &str) -> Result<u64, DomainError> {
        let mut conn = self.client.get_multiplexed_async_connection()
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to connect to Redis: {}", e)) })?;

        let new_value = conn.incr(key, 1)
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to set key in Redis: {}", e)) })?;

        Ok(new_value)
    }
}
