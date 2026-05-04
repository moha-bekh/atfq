use axum::{routing::{get, post, put, delete}, Router};
use std::sync::Arc;
use crate::state::AppState;

pub mod hello;
pub mod profile;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/say-hello", post(hello::say_hello_handler))
        .route("/profile", post(profile::create_profile_handler))
        .route("/profile/:id", get(profile::get_profile_handler))
        .route("/profile", put(profile::update_profile_handler))
        .route("/profile/theme", put(profile::update_theme_handler))
        .route("/profile/roles", post(profile::assign_role_handler))
        .route("/profile/roles", delete(profile::remove_role_handler))
        .route("/profile/picture", post(profile::upload_profile_picture_handler))
        .route("/permissions", get(profile::list_permissions_handler))
        .route("/role-requests", post(profile::create_role_request_handler))
        .route("/role-requests", get(profile::list_role_requests_handler))
        .route("/role-requests/review", post(profile::review_role_request_handler))
        .route("/profile", delete(profile::delete_profile_handler))
}
