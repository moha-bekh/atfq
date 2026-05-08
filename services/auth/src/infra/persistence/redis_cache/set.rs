use crate::domain::error::DomainError;
use crate::infra::persistence::redis_cache::RedisCache;
use redis::AsyncCommands;
use std::time::Duration;

impl RedisCache {
    pub async fn set_handler(
        &self,
        key: &str,
        value: &str,
        ttl: Duration,
    ) -> Result<(), DomainError> {
        let mut conn = self
            .client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| DomainError::Internal(format!("Failed to connect to Redis: {}", e)))?;

        let _: () = conn
            .set_ex(key, value, ttl.as_secs())
            .await
            .map_err(|e| DomainError::Internal(format!("Failed to set key in Redis: {}", e)))?;

        Ok(())
    }
}
