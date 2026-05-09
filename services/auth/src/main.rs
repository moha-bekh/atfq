use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use tonic::transport::Server;

use auth::api::grpc::handler::AuthHandler;
use auth::app::auth::confirm_password_reset::ConfirmPasswordResetUseCase;
use auth::app::auth::delete_user::DeleteUserUseCase;
use auth::app::auth::enable_mfa::EnableMfaUseCase;
use auth::app::auth::get_user::GetUserUseCase;
use auth::app::auth::login::LoginUseCase;
use auth::app::auth::logout::LogoutUseCase;
use auth::app::auth::oauth::OAuthUseCase;
use auth::app::auth::refresh::RefreshTokenUseCase;
use auth::app::auth::register::RegisterUseCase;
use auth::app::auth::request_password_reset::RequestPasswordResetUseCase;
use auth::app::auth::update_email::UpdateEmailUseCase;
use auth::app::auth::update_password::UpdatePasswordUseCase;
use auth::app::auth::update_username::UpdateUsernameUseCase;
use auth::app::auth::verify_mfa::VerifyMfaUseCase;
use auth::auth_proto;
use auth::auth_proto::auth_service_server::AuthServiceServer;
use auth::infra::email::SmtpEmailService;
use auth::infra::oauth::google_adapter::GoogleAdapter;
use auth::infra::persistence::postgres_user_repo::PostgresUserRepository;
use auth::infra::persistence::redis_cache::handler::RedisCache;
use auth::infra::security::encryption::ChaChaEncryption;
use auth::infra::security::jwt_adapter::JwtAdapter;
use auth::infra::security::password_hasher::Argon2Hasher;
use auth::infra::security::totp::TotpMfa;
use auth::infra::user_profile::GrpcUserProfileService;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // CONFIG
    dotenvy::from_path("/vault/secrets/.env").ok();
    dotenv().ok();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let server_addr = env::var("SERVER_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
        .parse()?;
    let redis_url = env::var("REDIS_URL").expect("REDIS_URL must be set");
    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let user_service_addr =
        env::var("USER_SERVICE_ADDR").unwrap_or_else(|_| "http://user:8080".to_string());

    let cha_cha_key = env::var("CHA_CHA_KEY").expect("CHA_CHA_KEY must be set");

    let google_client_id = env::var("GOOGLE_CLIENT_ID").ok();
    let google_client_secret = env::var("GOOGLE_CLIENT_SECRET").ok();
    let google_redirect_url = env::var("GOOGLE_REDIRECT_URL").ok();

    let github_client_id = env::var("GITHUB_CLIENT_ID").ok();
    let github_client_secret = env::var("GITHUB_CLIENT_SECRET").ok();
    let github_redirect_url = env::var("GITHUB_REDIRECT_URL").ok();
    let app_public_url =
        env::var("APP_PUBLIC_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());

    let smtp_host = env::var("SMTP_HOST").expect("SMTP_HOST must be set for password reset emails");
    let smtp_port = env::var("SMTP_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(587);
    let smtp_username = env::var("SMTP_USERNAME").ok();
    let smtp_password = env::var("SMTP_PASSWORD").ok();
    let smtp_from = env::var("SMTP_FROM").expect("SMTP_FROM must be set");
    let smtp_tls = env::var("SMTP_TLS")
        .ok()
        .map(|value| !matches!(value.as_str(), "0" | "false" | "FALSE" | "False"))
        .unwrap_or(true);

    println!("Connecting to database...");
    let mut retry_count = 0;
    let max_retries = env::var("STARTUP_MAX_RETRIES")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(90);
    let pool = loop {
        match PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(2))
            .connect(&db_url)
            .await
        {
            Ok(pool) => break pool,
            Err(e) => {
                retry_count += 1;
                if retry_count >= max_retries {
                    return Err(e.into());
                }
                println!(
                    "Database not ready ({}/{})... Retrying in 2s. Error: {}",
                    retry_count, max_retries, e
                );
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }
        }
    };

    sqlx::migrate!("./migrations").run(&pool).await?;

    // INFRA
    let user_repo = Arc::new(PostgresUserRepository::new(pool));

    let cha_cha_key_bytes = cha_cha_key
        .as_str()
        .as_bytes()
        .try_into()
        .expect("CHA_CHA_KEY must be 32 bytes long");
    let encryption_service = Arc::new(ChaChaEncryption::from_key(cha_cha_key_bytes));

    let mfa_service = Arc::new(TotpMfa);

    let cache_service = Arc::new(RedisCache::new(&redis_url));

    let jwt_service = Arc::new(JwtAdapter::new(jwt_secret));

    let crypto_service = Arc::new(Argon2Hasher);

    let user_profile_service = Arc::new(GrpcUserProfileService::new(user_service_addr).await?);

    let email_service = Arc::new(SmtpEmailService::new(
        smtp_host,
        smtp_port,
        smtp_username,
        smtp_password,
        smtp_from,
        smtp_tls,
    )?);

    // APP
    let register_uc = Arc::new(RegisterUseCase::new(
        user_repo.clone(),
        jwt_service.clone(),
        crypto_service.clone(),
        user_profile_service.clone(),
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

    let disable_mfa_uc = Arc::new(auth::app::auth::disable_mfa::DisableMfaUseCase::new(
        user_repo.clone(),
    ));

    let verify_mfa_uc = Arc::new(VerifyMfaUseCase::new(
        user_repo.clone(),
        encryption_service.clone(),
        mfa_service.clone(),
        jwt_service.clone(),
        crypto_service.clone(),
    ));

    let logout_uc = Arc::new(LogoutUseCase::new(cache_service.clone()));

    let refresh_uc = Arc::new(RefreshTokenUseCase::new(
        user_repo.clone(),
        cache_service.clone(),
        jwt_service.clone(),
    ));

    let oauth_uc = Arc::new(OAuthUseCase::new(
        user_repo.clone(),
        jwt_service.clone(),
        cache_service.clone(),
        user_profile_service.clone(),
    ));

    let unlink_oauth_uc = Arc::new(auth::app::auth::unlink_oauth::UnlinkOAuthUseCase::new(
        user_repo.clone(),
    ));

    let get_user_uc = Arc::new(GetUserUseCase::new(user_repo.clone()));

    let get_linked_providers_uc = Arc::new(
        auth::app::auth::get_linked_providers::GetLinkedProvidersUseCase::new(user_repo.clone()),
    );

    let delete_user_uc = Arc::new(DeleteUserUseCase::new(
        user_repo.clone(),
        cache_service.clone(),
    ));

    let update_email_uc = Arc::new(UpdateEmailUseCase::new(user_repo.clone()));

    let update_username_uc = Arc::new(UpdateUsernameUseCase::new(user_repo.clone()));

    let update_password_uc = Arc::new(UpdatePasswordUseCase::new(
        user_repo.clone(),
        crypto_service.clone(),
    ));

    let request_password_reset_uc = Arc::new(RequestPasswordResetUseCase::new(
        user_repo.clone(),
        cache_service.clone(),
        email_service,
        app_public_url,
    ));

    let confirm_password_reset_uc = Arc::new(ConfirmPasswordResetUseCase::new(
        user_repo.clone(),
        cache_service.clone(),
        crypto_service.clone(),
    ));

    let google_provider = if let (Some(id), Some(secret), Some(url)) =
        (google_client_id, google_client_secret, google_redirect_url)
    {
        Some(Arc::new(GoogleAdapter::new(id, secret, url))
            as Arc<dyn auth::domain::ports::oauth_service::OAuthProvider>)
    } else {
        None
    };

    let github_provider = if let (Some(id), Some(secret), Some(url)) =
        (github_client_id, github_client_secret, github_redirect_url)
    {
        Some(
            Arc::new(auth::infra::oauth::github_adapter::GithubAdapter::new(
                id, secret, url,
            )) as Arc<dyn auth::domain::ports::oauth_service::OAuthProvider>,
        )
    } else {
        None
    };

    // API
    let auth_handler = AuthHandler::new(
        register_uc,
        login_uc,
        enable_mfa_uc,
        disable_mfa_uc,
        verify_mfa_uc,
        logout_uc,
        refresh_uc,
        oauth_uc,
        unlink_oauth_uc,
        get_user_uc,
        get_linked_providers_uc,
        delete_user_uc,
        update_email_uc,
        update_username_uc,
        update_password_uc,
        request_password_reset_uc,
        confirm_password_reset_uc,
        cache_service.clone(),
        jwt_service.clone(),
        crypto_service.clone(),
        google_provider,
        github_provider,
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

    let metrics_addr = env::var("METRICS_ADDR").unwrap_or_else(|_| "0.0.0.0:9091".to_string());
    tokio::spawn(async move {
        if let Err(error) = auth::metrics::serve("auth", metrics_addr).await {
            eprintln!("Metrics endpoint failed: {error}");
        }
    });

    Server::builder()
        .layer(auth_layer)
        .add_service(reflection_service)
        .add_service(AuthServiceServer::new(auth_handler))
        .serve(server_addr)
        .await?;

    Ok(())
}
