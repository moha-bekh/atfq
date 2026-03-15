use axum::{
    extract::{Path, State},
    http::{Request, StatusCode},
    response::{IntoResponse, Response}, // Added Response
    routing::{get, any},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use reqwest::Client;
use tower_http::cors::{Any, CorsLayer};

struct AppState {
    client: Client,
    auth_service_url: String,
    user_service_url: String,
    wiki_service_url: String,
}

#[tokio::main]
async fn main() {
    let http_client = Client::new();

    let state = Arc::new(AppState {
        client: http_client,
        auth_service_url: std::env::var("AUTH_SVC_URL").unwrap_or_else(|_| "http://auth:8080".to_string()),
        user_service_url: std::env::var("USER_SVC_URL").unwrap_or_else(|_| "http://user:8080".to_string()),
        wiki_service_url: std::env::var("WIKI_SVC_URL").unwrap_or_else(|_| "http://wiki:8080".to_string()),
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Correct Axum 0.8 wildcard syntax: {*path}
    let app = Router::new()
        .route("/", get(|| async { "ATFQ API Gateway v1.0" }))
        .route("/health", get(health_check))
        .route("/api/auth/{*path}", any(proxy_auth_handler))
        .route("/api/user/{*path}", any(proxy_user_handler))
        .route("/api/wiki/{*path}", any(proxy_wiki_handler))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("🚀 API Gateway live on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> (StatusCode, &'static str) {
    (StatusCode::OK, "OK")
}

async fn proxy_user_handler(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
    req: Request<axum::body::Body>,
) -> Response { // Explicit return type
    let target_url = format!("{}/{}", state.user_service_url, path);
    forward_request(state.client.clone(), target_url, req).await.into_response()
}

async fn proxy_auth_handler(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
    req: Request<axum::body::Body>,
) -> Response {
    let target_url = format!("{}/{}", state.auth_service_url, path);
    forward_request(state.client.clone(), target_url, req).await.into_response()
}

async fn proxy_wiki_handler(
    State(state): State<Arc<AppState>>,
    Path(path): Path<String>,
    req: Request<axum::body::Body>,
) -> Response {
    let target_url = format!("{}/{}", state.wiki_service_url, path);
    forward_request(state.client.clone(), target_url, req).await.into_response()
}

async fn forward_request(client: Client, target_url: String, _req: Request<axum::body::Body>) -> impl IntoResponse {
    match client.get(&target_url).send().await {
        Ok(res) => {
            let status = StatusCode::from_u16(res.status().as_u16()).unwrap_or(StatusCode::OK);
            (status, format!("Forwarded to {}. Target responded with status: {}", target_url, res.status()))
        },
        Err(_) => (StatusCode::BAD_GATEWAY, "Service unreachable".to_string()),
    }
}
