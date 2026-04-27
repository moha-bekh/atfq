use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct LogoutRequest {
    pub access_token: String,
    pub refresh_token: String,
}
