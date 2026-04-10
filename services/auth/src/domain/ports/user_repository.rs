use async_trait::async_trait;
use crate::domain::entities::{User, UserDto};

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn save(&self, data: UserDto) -> User;
}
