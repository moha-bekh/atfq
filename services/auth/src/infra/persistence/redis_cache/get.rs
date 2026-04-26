use redis::AsyncCommands;
use crate::infra::persistence::redis_cache::RedisCache;
use crate::domain::error::DomainError;

impl RedisCache {
    pub async fn get_handler(&self, key: &str) -> Result<Option<String>, DomainError> {
        let mut conn = self.client.get_multiplexed_async_connection()
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to connect to Redis: {}", e)) })?;

        let value: Option<String> = conn.get(key)
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to get key from Redis: {}", e)) })?;
        
        Ok(value)
    }

    pub async fn delete_handler(&self, key: &str) -> Result<(), DomainError> {
        let mut conn = self.client.get_multiplexed_async_connection()
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to connect to Redis: {}", e)) })?;

        let _: () = conn.del(key)
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to delete key from Redis: {}", e)) })?;
        
        Ok(())
    }

    pub async fn exists_handler(&self, key: &str) -> Result<bool, DomainError> {
        let mut conn = self.client.get_multiplexed_async_connection()
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to connect to Redis: {}", e)) })?;

        let exists: bool = conn.exists(key)
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to check key existence in Redis: {}", e)) })?;

        Ok(exists)
    }

    pub async fn get_handler(&self, key: &str) -> Result<String, DomainError> {
        let mut conn = self.client.get_multiplexed_async_connection()
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to connect to Redis: {}", e)) })?;

        let value = conn.get(key)
            .await
            .map_err(|e| { DomainError::Internal(format!("Failed to check key existence in Redis: {}", e)) })?;

        Ok(value)
    }
}
