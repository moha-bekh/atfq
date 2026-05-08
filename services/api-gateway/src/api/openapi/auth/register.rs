use super::common::AuthResponse;
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct RegisterRequest {
    #[schema(example = "Moha")]
    pub username: String,
    #[schema(example = "moha@gmail.com")]
    pub email: String,
    pub password: String,
}

pub type RegisterResponse = AuthResponse;
