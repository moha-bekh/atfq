use crate::domain::types::{Email, Username};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: Username,
    pub email: Email,
    pub password_hash: Option<String>,
    pub mfa_secret: Option<Vec<u8>>,
    pub mfa_nonce: Option<Vec<u8>>,
    pub created_at: DateTime<Utc>,
}

pub struct AuthenticatedUser {
    pub user: User,
    pub access_token: String,
    pub refresh_token: String,
}

pub enum LoginResult {
    Success(AuthenticatedUser),
    Requires2FA(User),
}
