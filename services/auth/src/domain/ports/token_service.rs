use uuid::Uuid;
use crate::domain::error::DomainError;

pub struct TokenPair {
    pub access: String,
    pub refresh: String,
}

#[derive(Debug, Clone)]
pub struct TokenClaims {
    pub user_id: Uuid,
    pub exp: usize,
    pub typ: String,
}

pub trait TokenService: Send + Sync {
    fn generate_tokens(&self, user_id: Uuid) -> TokenPair;
    fn decode_token(&self, token: &str) -> Result<TokenClaims, DomainError>;
}
