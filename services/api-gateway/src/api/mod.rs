use tower_http::cors::CorsLayer;
use axum::Router;
use std::sync::Arc;
use crate::state::AppState;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

pub mod auth;
pub mod user;
pub mod openapi;

pub fn create_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
        ]);

    Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", openapi::ApiDoc::openapi()))
        .nest("/api/v1", v1_routes(state))
        .layer(cors)
}

fn v1_routes(state: Arc<AppState>) -> Router {
    Router::new()
        .nest("/auth", auth::routes())
        .nest("/user", user::routes())
        // .nest("/wiki", wiki::routes()) // Futur service
        .with_state(state)
}
