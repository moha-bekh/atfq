use std::sync::{Arc, Mutex};
use async_trait::async_trait;
use uuid::Uuid;
use crate::domain::ports::{
    user_repository::{UserRepository, UserDto},
    token_service::{TokenService, TokenPair, TokenClaims},
    cache_service::CacheService,
    crypto_service::CryptoService
};
use crate::domain::entities::User;
use crate::domain::error::DomainError;
use crate::app::auth::register::RegisterUseCase;
use crate::app::auth::login::LoginUseCase;
use crate::app::auth::refresh::RefreshTokenUseCase;

// --- MOCKS ---

struct MockUserRepo {
    users: Mutex<Vec<User>>,
}

#[async_trait]
impl UserRepository for MockUserRepo {
    async fn save_user(&self, data: UserDto) -> Result<User, DomainError> {
        let mut users = self.users.lock().unwrap();
        
        if users.iter().any(|u| *u.email == *data.email || *u.username == *data.username) {
            return Err(DomainError::AlreadyExists);
        }

        let user = User {
            id: Uuid::new_v4(),
            username: data.username,
            email: data.email,
            password_hash: Some(data.password_hash),
            mfa_secret: None,
            created_at: chrono::Utc::now(),
        };
        users.push(user.clone());
        Ok(user)
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<User>, DomainError> {
        let users = self.users.lock().unwrap();
        Ok(users.iter().find(|u| *u.email == email).cloned())
    }

    async fn find_by_username(&self, username: &str) -> Result<Option<User>, DomainError> {
        let users = self.users.lock().unwrap();
        Ok(users.iter().find(|u| *u.username == username).cloned())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, DomainError> {
        let users = self.users.lock().unwrap();
        Ok(users.iter().find(|u| u.id == id).cloned())
    }
}

struct MockTokenService {
    next_user_id: Mutex<Uuid>,
}
impl TokenService for MockTokenService {
    fn generate_tokens(&self, _user_id: Uuid) -> TokenPair {
        TokenPair {
            access: "mock_access".into(),
            refresh: "mock_refresh".into(),
        }
    }

    fn decode_token(&self, _token: &str) -> Result<TokenClaims, DomainError> {
        Ok(TokenClaims {
            user_id: *self.next_user_id.lock().unwrap(),
            exp: 0,
        })
    }
}

struct MockCryptoService;
impl CryptoService for MockCryptoService {
    fn hash_password(&self, password: &str) -> Result<String, String> {
        Ok(format!("hashed_{}", password))
    }
    fn verify_password(&self, password: &str, hash: &str) -> bool {
        hash == format!("hashed_{}", password)
    }
}

struct MockCacheService {
    blacklist: Mutex<Vec<String>>,
}
#[async_trait]
impl CacheService for MockCacheService {
    async fn set(&self, key: &str, _value: &str, _ttl: std::time::Duration) -> Result<(), DomainError> {
        if key.starts_with("blacklist:") {
            self.blacklist.lock().unwrap().push(key.to_string());
        }
        Ok(())
    }
    async fn exists(&self, key: &str) -> Result<bool, DomainError> {
        Ok(self.blacklist.lock().unwrap().contains(&key.to_string()))
    }
}

// --- TESTS ---

#[tokio::test]
async fn test_register_success() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::new_v4()) });
    let crypto = Arc::new(MockCryptoService);
    
    let uc = RegisterUseCase::new(repo, tokens, crypto);
    
    let result = uc.execute("johndoe", "john@example.com", "password123").await;
    
    assert!(result.is_ok());
    let res = result.unwrap();
    assert_eq!(res.access_token, "mock_access");
    assert_eq!(res.user.username.to_string(), "johndoe");
}

#[tokio::test]
async fn test_refresh_token_success() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let cache = Arc::new(MockCacheService { blacklist: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::nil()) });
    let crypto = Arc::new(MockCryptoService);
    
    let register_uc = RegisterUseCase::new(repo.clone(), tokens.clone(), crypto.clone());
    let refresh_uc = RefreshTokenUseCase::new(repo.clone(), cache.clone(), tokens.clone());
    
    // 1. Register a user
    let reg_res = register_uc.execute("johndoe", "john@example.com", "password123").await.unwrap();
    let user_id = reg_res.user.id;
    let refresh_token = reg_res.refresh_token;
    
    // Configure MockTokenService to return this user_id during decode
    *tokens.next_user_id.lock().unwrap() = user_id;
    
    // 2. Refresh
    let result = refresh_uc.execute(&refresh_token).await;
    
    assert!(result.is_ok());
    let res = result.unwrap();
    assert_eq!(res.user.id, user_id);
    
    // 3. Verify old token is now blacklisted in mock cache
    assert!(cache.exists(&format!("blacklist:{}", refresh_token)).await.unwrap());
}

#[tokio::test]
async fn test_refresh_token_fails_if_blacklisted() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let cache = Arc::new(MockCacheService { blacklist: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::nil()) });
    
    let refresh_uc = RefreshTokenUseCase::new(repo.clone(), cache.clone(), tokens.clone());
    
    let token = "some_token";
    cache.set(&format!("blacklist:{}", token), "revoked", std::time::Duration::from_secs(60)).await.unwrap();
    
    let result = refresh_uc.execute(token).await;
    
    assert!(result.is_err());
    match result.unwrap_err() {
        DomainError::Unauthenticated => (),
        e => panic!("Expected Unauthenticated, got {:?}", e),
    }
}

#[tokio::test]
async fn test_login_success_with_email() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::nil()) });
    let crypto = Arc::new(MockCryptoService);
    
    let register_uc = RegisterUseCase::new(repo.clone(), tokens.clone(), crypto.clone());
    let login_uc = LoginUseCase::new(repo, tokens, crypto);
    
    // Register first
    register_uc.execute("johndoe", "john@example.com", "password123").await.unwrap();
    
    // Login with email
    let result = login_uc.execute("john@example.com", "password123").await;
    
    assert!(result.is_ok());
    let res = result.unwrap();
    assert_eq!(res.user.username.to_string(), "johndoe");
}
