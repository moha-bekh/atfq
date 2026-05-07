use auth::app::auth::register::RegisterUseCase;
use auth::infra::persistence::postgres_user_repo::PostgresUserRepository;
use auth::infra::security::jwt_adapter::JwtAdapter;
use auth::infra::security::password_hasher::Argon2Hasher;
use auth::domain::ports::user_repository::UserRepository;
use sqlx::PgPool;
use std::sync::Arc;
use std::env;
use dotenvy::dotenv;
use async_trait::async_trait;

struct MockUserProfileService;
#[async_trait]
impl auth::domain::ports::user_profile_service::UserProfileService for MockUserProfileService {
    async fn create_profile(&self, _user_id: uuid::Uuid) -> Result<(), auth::domain::error::DomainError> {
        Ok(())
    }
}

async fn setup_pool() -> PgPool {
    dotenvy::from_path("/vault/secrets/.env").ok();
    dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set for integration tests");
    
    let pool = PgPool::connect(&db_url).await.expect("Failed to connect to test database");
    
    sqlx::migrate!("./migrations").run(&pool).await.expect("Failed to run migrations");
    
    pool
}

#[tokio::test]
async fn test_registration_full_flow() {
    let pool = setup_pool().await;
    
    // Nettoyage avant le test (optionnel mais recommandé)
    sqlx::query("DELETE FROM users WHERE email = $1")
        .bind("test_it@example.com")
        .execute(&pool)
        .await
        .unwrap();

    let user_repo = Arc::new(PostgresUserRepository::new(pool.clone()));
    let jwt_service = Arc::new(JwtAdapter::new("test_secret".into()));
    let crypto_service = Arc::new(Argon2Hasher);
    let profiles_service = Arc::new(MockUserProfileService);

    let register_uc = RegisterUseCase::new(
        user_repo.clone(),
        jwt_service,
        crypto_service,
        profiles_service,
    );

    // 1. Exécution du Use Case
    let result = register_uc
        .execute("test_it_user", "test_it@example.com", "securePassword123")
        .await
        .expect("Registration should succeed");

    // 2. Vérifications de base
    assert_eq!(result.user.username.to_string(), "test_it_user");
    assert!(!result.access_token.is_empty());
    assert!(!result.refresh_token.is_empty());

    // 3. Vérification directe dans la DB
    let db_user = user_repo.find_by_email("test_it@example.com").await.unwrap();
    assert!(db_user.is_some());
    let u = db_user.unwrap();
    assert_eq!(u.username.to_string(), "test_it_user");
    
    // Nettoyage final
    sqlx::query("DELETE FROM users WHERE email = $1")
        .bind("test_it@example.com")
        .execute(&pool)
        .await
        .unwrap();
}
