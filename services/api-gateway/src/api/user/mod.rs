use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, post, put},
};
use std::sync::Arc;

pub mod hello;
pub mod profile;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/say-hello", post(hello::say_hello_handler))
        .route("/search", get(profile::search_users_handler))
        .route("/profile", post(profile::create_profile_handler))
        .route("/profile/:id", get(profile::get_profile_handler))
        .route("/profile", put(profile::update_profile_handler))
        .route("/profile/theme", put(profile::update_theme_handler))
        .route("/profile/roles", post(profile::assign_role_handler))
        .route("/profile/roles", delete(profile::remove_role_handler))
        .route(
            "/profile/roles/:role_name",
            delete(profile::leave_role_handler),
        )
        .route(
            "/profile/picture",
            post(profile::upload_profile_picture_handler),
        )
        .route(
            "/profile/picture",
            delete(profile::delete_profile_picture_handler),
        )
        .route("/presence", post(profile::touch_presence_handler))
        .route("/friends", get(profile::list_friends_handler))
        .route("/friends", post(profile::send_friend_request_handler))
        .route(
            "/friends/:target_id/accept",
            put(profile::accept_friend_request_handler),
        )
        .route(
            "/friends/:target_id",
            delete(profile::remove_friend_handler),
        )
        .route("/permissions", get(profile::list_permissions_handler))
        .route("/role-requests", post(profile::create_role_request_handler))
        .route("/role-requests", get(profile::list_role_requests_handler))
        .route(
            "/role-requests/history",
            get(profile::list_all_role_requests_handler),
        )
        .route(
            "/role-requests/me",
            get(profile::list_my_role_requests_handler),
        )
        .route(
            "/role-requests/:request_id",
            delete(profile::cancel_role_request_handler),
        )
        .route(
            "/role-requests/review",
            post(profile::review_role_request_handler),
        )
        .route("/profile", delete(profile::delete_profile_handler))
}
