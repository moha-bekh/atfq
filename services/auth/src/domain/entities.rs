use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::domain::types::{Username, Email};

pub struct UserDto {
    pub username: Username,
    pub email: Email,
    pub password_hash: String,
}

pub struct User {
    pub id: Uuid,
    pub username: Username,
    pub email: Email,
    pub password_hash: Option<String>,
    pub is_2fa_enabled: bool,
    pub created_at: DateTime<Utc>,
}

pub struct AuthenticatedUser {
    pub user: User,
    pub access_token: String,
    pub refresh_token: String,
}

pub struct TwoFactorPending {
    pub user_id: Uuid,
    pub tmp_session_id: String,
}

pub enum LoginResult {
    Success(AuthenticatedUser),
    Requires2FA(TwoFactorPending),
}
