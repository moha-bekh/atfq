use uuid::Uuid;

pub struct TokenPair {
    pub access: String,
    pub refresh: String,
}

pub trait TokenService: Send + Sync {
    fn generate_tokens(&self, user_id: Uuid) -> TokenPair;
}
