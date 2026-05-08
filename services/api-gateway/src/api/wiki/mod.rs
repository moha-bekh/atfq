use crate::state::AppState;
use axum::{
    Router,
    routing::{delete, get, post, put},
};
use std::sync::Arc;

pub mod articles;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/root-articles", get(articles::get_root_articles_handler))
        .route("/articles", post(articles::create_article_handler))
        .route("/articles/:id", get(articles::get_article_handler))
        .route("/nodes", post(articles::create_node_handler))
        .route("/nodes", put(articles::update_node_handler))
        .route("/nodes/:id", delete(articles::delete_node_handler))
        .route(
            "/nodes/assign-parent",
            post(articles::assign_parent_handler),
        )
        .route("/nodes/:id/history", get(articles::get_history_handler))
        .route("/nodes/:id/pending", get(articles::get_pending_handler))
        .route("/pending", get(articles::get_all_pending_handler))
        .route(
            "/moderation/approve",
            post(articles::approve_version_handler),
        )
        .route("/moderation/reject", post(articles::reject_version_handler))
        .route("/search", get(articles::search_articles_handler))
}
