use async_trait::async_trait;
use auth::app::auth::oauth::OAuthUseCase;
use auth::domain::error::DomainError;
use auth::domain::ports::cache_service::CacheService;
use auth::domain::ports::oauth_service::{OAuthProvider, OAuthUserInfo};
use auth::domain::ports::user_repository::UserRepository;
use auth::infra::persistence::postgres_user_repo::PostgresUserRepository;
use auth::infra::security::jwt_adapter::JwtAdapter;
use dotenvy::dotenv;
use sqlx::PgPool;
use std::env;
use std::sync::{Arc, Mutex};

struct MockUserProfileService;
#[async_trait]
impl auth::domain::ports::user_profile_service::UserProfileService for MockUserProfileService {
    async fn create_profile(
        &self,
        _user_id: uuid::Uuid,
    ) -> Result<(), auth::domain::error::DomainError> {
        Ok(())
    }
}

async fn setup_pool() -> PgPool {
    dotenvy::from_path("/vault/secrets/.env").ok();
    dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set for integration tests");
    let pool = PgPool::connect(&db_url)
        .await
        .expect("Failed to connect to test database");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    pool
}

struct MockCache {
    storage: Mutex<std::collections::HashMap<String, String>>,
}

#[async_trait]
impl CacheService for MockCache {
    async fn set(
        &self,
        key: &str,
        value: &str,
        _ttl: std::time::Duration,
    ) -> Result<(), DomainError> {
        self.storage
            .lock()
            .unwrap()
            .insert(key.to_string(), value.to_string());
        Ok(())
    }
    async fn get(&self, key: &str) -> Result<Option<String>, DomainError> {
        Ok(self.storage.lock().unwrap().get(key).cloned())
    }
    #[allow(unused)]
    async fn increment(&self, key: &str) -> Result<u64, DomainError> {
        unimplemented!()
    }
    async fn exists(&self, key: &str) -> Result<bool, DomainError> {
        Ok(self.storage.lock().unwrap().contains_key(key))
    }
    async fn delete(&self, key: &str) -> Result<(), DomainError> {
        self.storage.lock().unwrap().remove(key);
        Ok(())
    }
}

struct MockOAuth {
    user_info: OAuthUserInfo,
}

#[async_trait]
impl OAuthProvider for MockOAuth {
    fn generate_auth_url(&self) -> (String, String) {
        ("http://localhost/auth".into(), "test_state".into())
    }
    async fn fetch_user_info(&self, _code: String) -> Result<OAuthUserInfo, DomainError> {
        Ok(self.user_info.clone())
    }
}

#[tokio::test]
async fn test_oauth_registration_and_login_it() {
    let pool = setup_pool().await;
    let repo = Arc::new(PostgresUserRepository::new(pool.clone()));
    let cache = Arc::new(MockCache {
        storage: Mutex::new(std::collections::HashMap::new()),
    });
    let tokens = Arc::new(JwtAdapter::new("test_secret".into()));
    let profiles = Arc::new(MockUserProfileService);

    let uc = OAuthUseCase::new(repo.clone(), tokens, cache.clone(), profiles);

    let provider_name = "github";
    let provider_id = "gh_it_123";
    let email = "oauth_it@example.com";

    // Clean up
    sqlx::query("DELETE FROM users WHERE email = $1")
        .bind(email)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("DELETE FROM user_oauth WHERE provider = $1 AND provider_id = $2")
        .bind(provider_name)
        .bind(provider_id)
        .execute(&pool)
        .await
        .unwrap();

    let provider = Arc::new(MockOAuth {
        user_info: OAuthUserInfo {
            email: email.into(),
            username: "IT User".into(),
            provider_id: provider_id.into(),
            avatar_url: None,
        },
    });

    // 1. Get URL
    let _ = uc.get_auth_url(provider.clone(), None).await.unwrap();

    // 2. Callback (New User)
    let res = uc
        .handle_callback(
            provider_name,
            provider.clone(),
            "code".into(),
            "test_state".into(),
        )
        .await
        .unwrap();
    assert_eq!(res.user.email.to_string(), email);

    // Verify in DB
    let user_in_db = repo
        .find_by_oauth_id(provider_name, provider_id)
        .await
        .unwrap()
        .expect("User should be found in DB");
    assert_eq!(user_in_db.id, res.user.id);

    // 3. Callback (Existing User)
    cache
        .set(
            "oauth_state:test_state2",
            "pending",
            std::time::Duration::from_secs(60),
        )
        .await
        .unwrap();
    let res2 = uc
        .handle_callback(provider_name, provider, "code".into(), "test_state2".into())
        .await
        .unwrap();
    assert_eq!(res2.user.id, res.user.id);

    // Clean up
    sqlx::query("DELETE FROM users WHERE email = $1")
        .bind(email)
        .execute(&pool)
        .await
        .unwrap();
}
