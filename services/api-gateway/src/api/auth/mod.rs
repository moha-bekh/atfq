use axum::{routing::{get, post, put, delete}, Router};
use std::sync::Arc;
use crate::state::AppState;

pub mod register;
pub mod login;
pub mod oauth;
pub mod logout;
pub mod mfa;
pub mod refresh;
pub mod account;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/register", post(register::register_handler))
        .route("/login", post(login::login_handler))
        .route("/logout", post(logout::logout_handler))
        .route("/oauth/url/:provider", get(oauth::get_oauth_url_handler))
        .route("/oauth/callback/:provider", get(oauth::oauth_callback_handler))
        .route("/oauth/providers", get(oauth::get_linked_providers_handler))
        .route("/oauth/providers/:provider", delete(oauth::unlink_provider_handler))
        .route("/mfa/enable", post(mfa::enable_mfa_handler))
        .route("/mfa/disable", post(mfa::disable_mfa_handler))
        .route("/mfa/verify", post(mfa::verify_mfa_handler))
        .route("/refresh", post(refresh::refresh_handler))
        .route("/me", get(account::get_me_handler))
        .route("/email", put(account::update_email_handler))
        .route("/username", put(account::update_username_handler))
        .route("/password", put(account::update_password_handler))
        .route("/account", delete(account::delete_account_handler))
}
