use async_trait::async_trait;
use crate::domain::error::DomainError;

#[derive(Clone)]
pub struct OAuthUserInfo {
    pub email: String,
    pub username: String,
    pub provider_id: String,
    pub avatar_url: Option<String>,
}

#[async_trait]
pub trait OAuthProvider: Send + Sync {
    fn generate_auth_url(&self) -> (String, String);

    async fn fetch_user_info(&self, code: String) -> Result<OAuthUserInfo, DomainError>;
}
