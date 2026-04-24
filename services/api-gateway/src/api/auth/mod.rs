use axum::{routing::{get, post}, Router};
use std::sync::Arc;
use crate::state::AppState;

pub mod register;
pub mod login;
pub mod oauth;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/register", post(register::register_handler))
        .route("/login", post(login::login_handler))
        .route("/oauth/url/:provider", get(oauth::get_oauth_url_handler))
        .route("/oauth/callback/:provider", get(oauth::oauth_callback_handler))
}
