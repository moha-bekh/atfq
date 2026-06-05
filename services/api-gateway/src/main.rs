mod api;
mod error;
mod grpc;
mod metrics;
mod state;

use crate::state::AppState;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;

async fn optional_pg_pool(
    env_name: &str,
) -> Result<Option<sqlx::PgPool>, Box<dyn std::error::Error>> {
    let Ok(url) = env::var(env_name) else {
        return Ok(None);
    };
    let max_connections = env::var("API_GATEWAY_DB_MAX_CONNECTIONS")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(10);
    let acquire_timeout_secs = env::var("API_GATEWAY_DB_ACQUIRE_TIMEOUT_SECS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(5);

    let pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .acquire_timeout(std::time::Duration::from_secs(acquire_timeout_secs))
        .connect(&url)
        .await?;

    Ok(Some(pool))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::from_path("/vault/secrets/.env").ok();
    metrics::init();

    let addr = env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into());

    let auth_client = crate::grpc::auth::connect().await?;
    let user_client = crate::grpc::user::connect().await?;
    let wiki_client = crate::grpc::wiki::connect().await?;
    let auth_db = optional_pg_pool("AUTH_DATABASE_URL").await?;
    let user_db = optional_pg_pool("USER_DATABASE_URL").await?;

    let state = Arc::new(AppState {
        auth_client,
        user_client,
        wiki_client,
        auth_db,
        user_db,
    });

    let app = api::create_router(state);

    println!("API Gateway running on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
