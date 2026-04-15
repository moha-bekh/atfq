use axum::{routing::post, Router};
use std::sync::Arc;
use crate::state::AppState;

pub mod register;
pub mod login;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/register", post(register::register_handler))
        .route("/login", post(login::login_handler))
}
