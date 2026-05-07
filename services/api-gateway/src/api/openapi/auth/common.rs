use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UserSchema {
    pub id: String,
    pub username: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub has_password: bool,
    pub mfa_enabled: bool,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct AuthResponse {
    pub status: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub mfa_login_id: Option<String>,
    pub user: Option<UserSchema>,
}
