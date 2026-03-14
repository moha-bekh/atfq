use axum::{
    extract::State,
    http::StatusCode,
    routing::get,
    Router,
};
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;

// Shared state for the application
struct AppState {
    db_pool: Pool<Postgres>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Load environment variables
    let config_path = env::var("APP_CONFIG_PATH").unwrap_or_else(|_| ".env".to_string());
    dotenvy::from_path(config_path).ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    // 2. Database connection pool
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    println!("✅ Connected to PostgreSQL!");

    let shared_state = Arc::new(AppState { db_pool: pool });

    // 3. Routes definition
    let app = Router::new()
        .route("/", get(|| async { "Auth Service API v1.0" }))
        // Simple liveness check (is the process alive?)
        .route("/health", get(health_handler))
        // Readiness check (is the database reachable?)
        .route("/ready", get(ready_handler))
        .with_state(shared_state);

    // 4. Start the server
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("🚀 Auth service listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();

    Ok(())
}

// --- Handlers ---

async fn health_handler() -> (StatusCode, &'static str) {
    (StatusCode::OK, "OK")
}

async fn ready_handler(
    State(state): State<Arc<AppState>>,
) -> (StatusCode, &'static str) {
    // We ping the database to ensure we are actually ready
    match sqlx::query("SELECT 1").execute(&state.db_pool).await {
        Ok(_) => (StatusCode::OK, "READY"),
        Err(_) => (StatusCode::SERVICE_UNAVAILABLE, "DATABASE_UNREACHABLE"),
    }
}
