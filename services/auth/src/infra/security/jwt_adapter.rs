use crate::domain::ports::token_service::{TokenService, TokenPair};
use uuid::Uuid;

pub struct JwtAdapter;

impl TokenService for JwtAdapter {
    fn generate_tokens(&self, _user_id: Uuid) -> TokenPair {
        // Temporary mock implementation
        TokenPair {
            access: "mock_access_token".to_string(),
            refresh: "mock_refresh_token".to_string(),
        }
    }
}
