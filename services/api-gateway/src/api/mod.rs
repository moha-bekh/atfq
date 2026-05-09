use crate::state::AppState;
use axum::{Router, extract::DefaultBodyLimit, http::Method, routing::get};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;
pub mod auth;
pub mod openapi;
pub mod user;
pub mod wiki;

pub fn create_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::HEAD,
            Method::POST,
            Method::OPTIONS,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
        ]);

    Router::new()
        .merge(
            SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", openapi::ApiDoc::openapi()),
        )
        .route("/metrics", get(crate::metrics::handler))
        .nest("/api/v1", v1_routes(state))
        .layer(cors)
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024))
}

fn v1_routes(state: Arc<AppState>) -> Router {
    Router::new()
        .nest("/auth", auth::routes())
        .nest("/user", user::routes())
        .nest("/wiki", wiki::routes())
        .with_state(state)
}
