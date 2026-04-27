use auth::app::auth::register::RegisterUseCase;
use auth::app::auth::login::LoginUseCase;
use auth::infra::persistence::postgres_user_repo::PostgresUserRepository;
use auth::infra::security::jwt_adapter::JwtAdapter;
use auth::infra::security::password_hasher::Argon2Hasher;
use auth::domain::entities::LoginResult;
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
async fn test_auth_full_flow() {
    let pool = setup_pool().await;
    let test_email = "auth_test@example.com";
    let test_user = "auth_test_user";
    let test_pass = "Password123!";

    sqlx::query("DELETE FROM users WHERE email = $1 OR username = $2")
        .bind(test_email)
        .bind(test_user)
        .execute(&pool)
        .await
        .unwrap();

    let user_repo = Arc::new(PostgresUserRepository::new(pool.clone()));
    let jwt_service = Arc::new(JwtAdapter::new("test_secret".into()));
    let crypto_service = Arc::new(Argon2Hasher);

    let register_uc = RegisterUseCase::new(
        user_repo.clone(),
        jwt_service.clone(),
        crypto_service.clone(),
    );

    let login_uc = LoginUseCase::new(
        user_repo.clone(),
        jwt_service,
        crypto_service,
    );

    // 1. Register
    register_uc
        .execute(test_user, test_email, test_pass)
        .await
        .expect("Registration should succeed");

    // 2. Login with Email
    let login_email_res = login_uc
        .execute(test_email, test_pass)
        .await
        .expect("Login with email should succeed");

    assert!(matches!(login_email_res, LoginResult::Success(_)));
    let LoginResult::Success(login_email_res) = login_email_res else {
        unreachable!();
    };

    assert_eq!(login_email_res.user.email.to_string(), test_email);
    assert!(!login_email_res.access_token.is_empty());

    // 3. Login with Username
    let login_user_res = login_uc
        .execute(test_user, test_pass)
        .await
        .expect("Login with username should succeed");

    assert!(matches!(login_user_res, LoginResult::Success(_)));
    let LoginResult::Success(login_user_res) = login_user_res else {
        unreachable!();
    };

    assert_eq!(login_user_res.user.username.to_string(), test_user);

    // 4. Login Failure - Wrong Password
    let wrong_pass_res = login_uc.execute(test_email, "WrongPass").await;
    assert!(wrong_pass_res.is_err());

    // 5. Login Failure - User Not Found
    let not_found_res = login_uc.execute("nonexistent@example.com", test_pass).await;
    assert!(not_found_res.is_err());

    sqlx::query("DELETE FROM users WHERE email = $1")
        .bind(test_email)
        .execute(&pool)
        .await
        .unwrap();
}
