use serde::Deserialize;
use utoipa::ToSchema;
use super::common::AuthResponse;

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    #[schema(example = "Moha")]
    pub identifier: String,
    pub password: String,
}

pub type LoginResponse = AuthResponse;
