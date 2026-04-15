use auth::app::auth::register::RegisterUseCase;
use auth::app::auth::login::LoginUseCase;
use auth::app::auth::logout::LogoutUseCase;
use auth::infra::persistence::postgres_user_repo::PostgresUserRepository;
use auth::infra::persistence::redis_cache::handler::RedisCache;
use auth::infra::security::jwt_adapter::JwtAdapter;
use auth::infra::security::password_hasher::Argon2Hasher;
use auth::domain::ports::token_service::TokenPair;
use auth::domain::ports::cache_service::CacheService;
use sqlx::PgPool;
use std::sync::Arc;
use std::env;
use dotenvy::dotenv;

async fn setup_pool() -> PgPool {
    dotenvy::from_path("/vault/secrets/.env").ok();
    dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set for integration tests");
    let pool = PgPool::connect(&db_url).await.expect("Failed to connect to test database");
    sqlx::migrate!("./migrations").run(&pool).await.expect("Failed to run migrations");
    pool
}

#[tokio::test]
async fn test_logout_full_flow() {
    let pool = setup_pool().await;
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    
    let test_email = "logout_test@example.com";
    let test_user = "logout_test_user";
    let test_pass = "Password123!";

    sqlx::query("DELETE FROM users WHERE email = $1 OR username = $2")
        .bind(test_email)
        .bind(test_user)
        .execute(&pool)
        .await
        .unwrap();

    let user_repo = Arc::new(PostgresUserRepository::new(pool.clone()));
    let cache_service = Arc::new(RedisCache::new(&redis_url));
    let jwt_service = Arc::new(JwtAdapter::new("test_secret".into()));
    let crypto_service = Arc::new(Argon2Hasher);

    let register_uc = RegisterUseCase::new(
        user_repo.clone(),
        jwt_service.clone(),
        crypto_service.clone(),
    );

    let login_uc = LoginUseCase::new(
        user_repo.clone(),
        jwt_service.clone(),
        crypto_service.clone(),
    );

    let logout_uc = LogoutUseCase::new(
        cache_service.clone(),
    );

    // 1. Register
    register_uc
        .execute(test_user, test_email, test_pass)
        .await
        .expect("Registration should succeed");

    // 2. Login to get tokens
    let login_res = login_uc
        .execute(test_email, test_pass)
        .await
        .expect("Login should succeed");
    
    let access_token = login_res.access_token.clone();
    let refresh_token = login_res.refresh_token.clone();

    // 3. Verify tokens are NOT blacklisted initially
    let is_access_blacklisted = cache_service.exists(&format!("blacklist:{}", access_token)).await.unwrap();
    let is_refresh_blacklisted = cache_service.exists(&format!("blacklist:{}", refresh_token)).await.unwrap();
    assert!(!is_access_blacklisted);
    assert!(!is_refresh_blacklisted);

    // 4. Logout
    let tokens = TokenPair {
        access: access_token.clone(),
        refresh: refresh_token.clone(),
    };
    logout_uc.execute(tokens).await.expect("Logout should succeed");

    // 5. Verify tokens ARE blacklisted now
    let is_access_blacklisted_after = cache_service.exists(&format!("blacklist:{}", access_token)).await.unwrap();
    let is_refresh_blacklisted_after = cache_service.exists(&format!("blacklist:{}", refresh_token)).await.unwrap();
    assert!(is_access_blacklisted_after);
    assert!(is_refresh_blacklisted_after);

    // Nettoyage final
    sqlx::query("DELETE FROM users WHERE email = $1")
        .bind(test_email)
        .execute(&pool)
        .await
        .unwrap();
}
