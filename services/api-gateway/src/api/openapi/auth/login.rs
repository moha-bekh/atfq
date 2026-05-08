use super::common::AuthResponse;
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct LoginRequest {
    #[schema(example = "Moha")]
    pub identifier: String,
    pub password: String,
}

pub type LoginResponse = AuthResponse;
