use crate::domain::entities::User;

#[derive(Debug)]
pub struct AuthResult {
    pub user: User,
    pub access_token: String,
    pub refresh_token: String,
}
