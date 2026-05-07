mod api;
mod state;
mod error;
mod grpc;

use std::sync::Arc;
use crate::state::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = std::env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into());

    let auth_client = crate::grpc::auth::connect().await?;
    let user_client = crate::grpc::user::connect().await?;
    let wiki_client = crate::grpc::wiki::connect().await?;

    let state = Arc::new(AppState {
        auth_client,
        user_client,
        wiki_client,
    });

    let app = api::create_router(state);

    println!("API Gateway running on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
