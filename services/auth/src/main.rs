use tonic::transport::Server;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use dotenvy::dotenv;

use auth::infra::persistence::postgres_user_repo::PostgresUserRepository;
use auth::infra::persistence::redis_cache::handler::RedisCache;
use auth::infra::security::jwt_adapter::JwtAdapter;
use auth::infra::security::password_hasher::Argon2Hasher;
use auth::infra::security::encryption::ChaChaEncryption;
use auth::infra::security::totp::TotpMfa;
use auth::app::auth::register::RegisterUseCase;
use auth::app::auth::login::LoginUseCase;
use auth::app::auth::enable_mfa::EnableMfaUseCase;
use auth::app::auth::logout::LogoutUseCase;
use auth::app::auth::refresh::RefreshTokenUseCase;
use auth::api::grpc::handler::AuthHandler;
use auth::auth_proto::auth_service_server::AuthServiceServer;
use auth::auth_proto;

const CHA_CHA_KEY: &[u8; 32] = &[42; 32];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {

    // CONFIG
    dotenvy::from_path("/vault/secrets/.env").ok();
    dotenv().ok();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let server_addr = env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string()).parse()?;
    let redis_url = env::var("REDIS_URL").expect("REDIS_URL must be set");
    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    println!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    // INFRA
    let user_repo = Arc::new(PostgresUserRepository::new(pool));

    let encryption_service = Arc::new(ChaChaEncryption::from_key(CHA_CHA_KEY));

    let mfa_service = Arc::new(TotpMfa);

    let cache_service = Arc::new(RedisCache::new(&redis_url));

    let jwt_service = Arc::new(JwtAdapter::new(jwt_secret));

    let crypto_service = Arc::new(Argon2Hasher);

    // APP
    let register_uc = Arc::new(RegisterUseCase::new(
        user_repo.clone(),
        jwt_service.clone(),
        crypto_service.clone(),
    ));

    let login_uc = Arc::new(LoginUseCase::new(
        user_repo.clone(),
        jwt_service.clone(),
        crypto_service.clone(),
    ));

    let enable_mfa_uc = Arc::new(EnableMfaUseCase::new(
        user_repo.clone(),
        encryption_service.clone(),
        mfa_service.clone(),
        jwt_service.clone(),
    ));

    let logout_uc = Arc::new(LogoutUseCase::new(
        cache_service.clone(),
    ));

    let refresh_uc = Arc::new(RefreshTokenUseCase::new(
        user_repo.clone(),
        cache_service.clone(),
        jwt_service.clone(),
    ));

    // API
    let auth_handler = AuthHandler::new(
        register_uc,
        login_uc,
        enable_mfa_uc,
        logout_uc,
        refresh_uc,
        cache_service.clone(),
        jwt_service.clone(),
    );

    let auth_layer = auth::api::grpc::auth_interceptor::AuthLayer::new(
        jwt_service.clone(),
        cache_service.clone(),
    );

    // TRANSPORT
    let reflection_service = tonic_reflection::server::Builder::configure()
        .register_encoded_file_descriptor_set(auth_proto::FILE_DESCRIPTOR_SET)
        .build()?;

    println!("Auth Service starting on {}", server_addr);

    Server::builder()
        .layer(auth_layer)
        .add_service(reflection_service)
        .add_service(AuthServiceServer::new(auth_handler))
        .serve(server_addr)
        .await?;

    Ok(())
}
