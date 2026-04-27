use auth::app::auth::register::RegisterUseCase;
use auth::app::auth::refresh::RefreshTokenUseCase;
use auth::infra::persistence::postgres_user_repo::PostgresUserRepository;
use auth::infra::persistence::redis_cache::handler::RedisCache;
use auth::infra::security::jwt_adapter::JwtAdapter;
use auth::infra::security::password_hasher::Argon2Hasher;
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
async fn test_refresh_token_integration() {
    let pool = setup_pool().await;
    let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    
    let test_email = "refresh_test@example.com";
    let test_user = "refresh_test_user";
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

    let refresh_uc = RefreshTokenUseCase::new(
        user_repo.clone(),
        cache_service.clone(),
        jwt_service.clone(),
    );

    // 1. Register to get a refresh token
    let reg_res = register_uc
        .execute(test_user, test_email, test_pass)
        .await
        .expect("Registration should succeed");
    
    let first_refresh_token = reg_res.refresh_token.clone();

    // 2. Perform refresh
    let refresh_res = refresh_uc
        .execute(&first_refresh_token)
        .await
        .expect("First refresh should succeed");
    
    assert_ne!(refresh_res.refresh_token, first_refresh_token);
    assert_eq!(refresh_res.user.email.to_string(), test_email);

    // 3. Verify the old refresh token is now blacklisted
    let is_blacklisted = cache_service.exists(&format!("blacklist:{}", first_refresh_token)).await.unwrap();
    assert!(is_blacklisted);

    // 4. Try to refresh again with the OLD token (should fail)
    let second_refresh_attempt = refresh_uc.execute(&first_refresh_token).await;
    assert!(second_refresh_attempt.is_err());

    // Nettoyage final
    sqlx::query("DELETE FROM users WHERE email = $1")
        .bind(test_email)
        .execute(&pool)
        .await
        .unwrap();
}
