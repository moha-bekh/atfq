use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateEmailRequest {
    pub new_email: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateUsernameRequest {
    pub new_username: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdatePasswordRequest {
    pub old_password: String,
    pub new_password: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct PasswordResetRequest {
    pub identifier: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct PasswordResetResponse {
    pub accepted: bool,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct PasswordResetConfirmRequest {
    pub reset_token: String,
    pub new_password: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct DeleteUserRequest {
    pub refresh_token: String,
}
