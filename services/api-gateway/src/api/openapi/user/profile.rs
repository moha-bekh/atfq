use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ProfileResponse {
    pub id: String,
    pub profile_picture_url: Option<String>,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub theme: Option<ThemeSchema>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ThemeSchema {
    pub is_preset: bool,
    pub name: String,
    pub colors: std::collections::HashMap<String, String>,
    pub font_main: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CreateProfileRequest {
    pub id: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateProfileRequest {
    pub profile_picture_url: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateThemeRequest {
    pub theme: ThemeSchema,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct RoleRequest {
    pub id: String,
    pub role_name: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct PermissionListResponse {
    pub permissions: Vec<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct RoleChangeRequest {
    pub requested_role: String,
    pub reason: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct RoleRequestStatusResponse {
    pub request_id: String,
    pub status: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct RoleRequestsListResponse {
    pub requests: Vec<RoleRequestEntry>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct RoleRequestEntry {
    pub request_id: String,
    pub user_id: String,
    pub requested_role: String,
    pub reason: String,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ReviewRoleRequest {
    pub request_id: String,
    pub approve: bool,
    pub rejection_reason: Option<String>,
}
