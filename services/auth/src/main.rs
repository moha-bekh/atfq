use tonic::transport::Server;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use dotenvy::dotenv;

// Module declarations for the hexagonal architecture
pub mod domain;
pub mod app;
pub mod infra;
pub mod api;

// Inclusion of generated code from Tonic
pub mod auth_proto {
    tonic::include_proto!("auth");
    pub const FILE_DESCRIPTOR_SET: &[u8] = tonic::include_file_descriptor_set!("auth_descriptor");
}

// Imports of concrete implementations
use crate::infra::persistence::postgres_user_repo::PostgresUserRepository;
use crate::infra::security::jwt_adapter::JwtAdapter;
use crate::app::auth::register::RegisterUseCase;
use crate::api::grpc::handler::AuthHandler;
use crate::auth_proto::auth_service_server::AuthServiceServer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {

    dotenvy::from_path("/vault/secrets/.env").expect("Failed to load secrets from Vault");
    dotenv().ok();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let server_addr = env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    let addr = server_addr.parse()?;

    println!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // --- DEPENDENCY INJECTION ---

    // 1. Infrastructure Layer (Adapters)
    // We wrap them in Arc to allow safe sharing across threads
    let user_repo = Arc::new(PostgresUserRepository::new(pool.clone()));
    let jwt_service = Arc::new(JwtAdapter);

    // 2. Application Layer (Use Cases)
    // Injecting ports (repository and token service) into the use case
    let register_uc = RegisterUseCase::new(user_repo, jwt_service);

    // 3. API Layer (Handlers)
    // The gRPC handler holds the application logic (use cases)
    let auth_handler = AuthHandler::new(register_uc);

    // 4. Additional gRPC Services
    let reflection_service = tonic_reflection::server::Builder::configure()
        .register_encoded_file_descriptor_set(auth_proto::FILE_DESCRIPTOR_SET)
        .build()?;

    println!("Auth Service [api-app-domain-infra] starting on {}", addr);

    Server::builder()
        .add_service(reflection_service)
        .add_service(AuthServiceServer::new(auth_handler))
        .serve(addr)
        .await?;

    Ok(())
}
