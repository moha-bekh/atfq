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
    pub is_online: bool,
    pub last_seen_at: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ThemeSchema {
    pub is_preset: bool,
    pub name: String,
    pub colors: std::collections::HashMap<String, String>,
    pub font_main: String,
    pub font_display: String,
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
pub struct LeaveRoleRequest {
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
    pub user_username: Option<String>,
    pub user_email: Option<String>,
    pub requested_role: String,
    pub reason: String,
    pub created_at: Option<String>,
    pub status: String,
    pub rejection_reason: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ReviewRoleRequest {
    pub request_id: String,
    pub approve: bool,
    pub rejection_reason: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CancelRoleRequest {
    pub request_id: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct FriendTargetRequest {
    pub target_id: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct FriendshipResponse {
    pub user_id: String,
    pub friend_id: String,
    pub requester_id: String,
    pub addressee_id: String,
    pub friend_username: Option<String>,
    pub friend_email: Option<String>,
    pub profile_picture_url: Option<String>,
    pub status: String,
    pub can_accept: bool,
    pub is_online: bool,
    pub last_seen_at: Option<String>,
    pub created_at: Option<String>,
    pub accepted_at: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct FriendListResponse {
    pub friends: Vec<FriendshipResponse>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct PresenceResponse {
    pub id: String,
    pub is_online: bool,
    pub last_seen_at: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UserSearchResult {
    pub id: String,
    pub username: String,
    pub email: String,
    pub profile_picture_url: Option<String>,
    pub friendship_status: Option<String>,
    pub is_friend: bool,
    pub is_online: bool,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UserSearchResponse {
    pub users: Vec<UserSearchResult>,
}
