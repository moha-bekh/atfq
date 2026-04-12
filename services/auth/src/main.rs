use tonic::transport::Server;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use dotenvy::dotenv;

use auth::infra::persistence::postgres_user_repo::PostgresUserRepository;
use auth::infra::security::jwt_adapter::JwtAdapter;
use auth::infra::security::password_hasher::Argon2Hasher;
use auth::app::auth::register::RegisterUseCase;
use auth::app::auth::login::LoginUseCase;
use auth::api::grpc::handler::AuthHandler;
use auth::auth_proto::auth_service_server::AuthServiceServer;
use auth::auth_proto;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {

    dotenvy::from_path("/vault/secrets/.env").ok();
    dotenv().ok();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let server_addr = env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    let addr = server_addr.parse()?;

    println!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    // 1. Infrastructure Layer (Adapters)
    let user_repo = Arc::new(PostgresUserRepository::new(pool.clone()));

    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let jwt_service = Arc::new(JwtAdapter::new(jwt_secret));
    let crypto_service = Arc::new(Argon2Hasher);

    // 2. Application Layer (Use Cases)
    let register_uc = Arc::new(RegisterUseCase::new(
        user_repo.clone(),
        jwt_service.clone(),
        crypto_service.clone(),
    ));

    let login_uc = Arc::new(LoginUseCase::new(
        user_repo,
        jwt_service,
        crypto_service,
    ));

    // 3. API Layer (Handlers)
    let auth_handler = AuthHandler::new(
        register_uc,
        login_uc,
    );

    // 4. Additional gRPC Services
    let reflection_service = tonic_reflection::server::Builder::configure()
        .register_encoded_file_descriptor_set(auth_proto::FILE_DESCRIPTOR_SET)
        .build()?;

    println!("Auth Service starting on {}", addr);

    Server::builder()
        .add_service(reflection_service)
        .add_service(AuthServiceServer::new(auth_handler))
        .serve(addr)
        .await?;

    Ok(())
}
