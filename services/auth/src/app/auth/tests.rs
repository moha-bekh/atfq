use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use async_trait::async_trait;
use uuid::Uuid;
use crate::domain::ports::{
    mfa_service::EncryptedMfaSecret,
    user_repository::{UserRepository, UserDto},
    token_service::{TokenService, TokenPair, TokenClaims},
    cache_service::CacheService,
    crypto_service::CryptoService
};
use crate::domain::entities::{LoginResult, User};
use crate::domain::error::DomainError;
use crate::app::auth::register::RegisterUseCase;
use crate::app::auth::login::LoginUseCase;
use crate::app::auth::refresh::RefreshTokenUseCase;
use crate::app::auth::oauth::OAuthUseCase;
use crate::domain::ports::oauth_service::{OAuthProvider, OAuthUserInfo};

// --- MOCKS ---

struct MockOAuthProvider {
    auth_url: String,
    state: String,
    user_info: Result<OAuthUserInfo, DomainError>,
}

#[async_trait]
impl OAuthProvider for MockOAuthProvider {
    fn generate_auth_url(&self) -> (String, String) {
        (self.auth_url.clone(), self.state.clone())
    }

    async fn fetch_user_info(&self, _code: String) -> Result<OAuthUserInfo, DomainError> {
        self.user_info.clone()
    }
}

struct MockUserRepo {
    users: Mutex<Vec<User>>,
    oauth_accounts: Mutex<HashMap<(String, String), Uuid>>,
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
            password_hash: if data.password_hash.is_empty() { None } else { Some(data.password_hash) },
            mfa_secret: None,
            mfa_nonce: None,
            created_at: chrono::Utc::now(),
        };
        users.push(user.clone());
        Ok(user)
    }

    #[allow(unused)]
    async fn enable_mfa(&self, id: uuid::Uuid, mfa: EncryptedMfaSecret) -> Result<(), DomainError> {
        unimplemented!()
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

    async fn find_by_oauth_id(&self, provider: &str, provider_id: &str) -> Result<Option<User>, DomainError> {
        let user_id = {
            let oauth_accounts = self.oauth_accounts.lock().unwrap();
            oauth_accounts.get(&(provider.to_string(), provider_id.to_string())).cloned()
        };
        
        match user_id {
            Some(id) => self.find_by_id(id).await,
            None => Ok(None),
        }
    }

    async fn link_oauth_account(&self, user_id: Uuid, provider: &str, provider_id: &str) -> Result<(), DomainError> {
        let mut oauth_accounts = self.oauth_accounts.lock().unwrap();
        oauth_accounts.insert((provider.to_string(), provider_id.to_string()), user_id);
        Ok(())
    }

    async fn delete_by_id(&self, _id: uuid::Uuid) -> Result<(), DomainError> {
        unimplemented!()
    }

    async fn update_email(&self, _id: uuid::Uuid, _new_email: &str) -> Result<(), DomainError> {
        unimplemented!()
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

    fn decode_token(&self, token: &str) -> Result<TokenClaims, DomainError> {
        Ok(TokenClaims {
            user_id: *self.next_user_id.lock().unwrap(),
            exp: 0,
            typ: if token.contains("refresh") { "refresh".into() } else { "access".into() },
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
    storage: Mutex<HashMap<String, String>>,
}
#[async_trait]
impl CacheService for MockCacheService {
    async fn set(&self, key: &str, value: &str, _ttl: std::time::Duration) -> Result<(), DomainError> {
        self.storage.lock().unwrap().insert(key.to_string(), value.to_string());
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

// --- TESTS ---

#[tokio::test]
async fn test_register_success() {
    let repo = Arc::new(MockUserRepo { 
        users: Mutex::new(vec![]),
        oauth_accounts: Mutex::new(HashMap::new()),
    });
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
    let repo = Arc::new(MockUserRepo { 
        users: Mutex::new(vec![]),
        oauth_accounts: Mutex::new(HashMap::new()),
    });
    let cache = Arc::new(MockCacheService { storage: Mutex::new(HashMap::new()) });
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
    let repo = Arc::new(MockUserRepo { 
        users: Mutex::new(vec![]),
        oauth_accounts: Mutex::new(HashMap::new()),
    });
    let cache = Arc::new(MockCacheService { storage: Mutex::new(HashMap::new()) });
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
async fn test_refresh_token_fails_with_access_token() {
    let repo = Arc::new(MockUserRepo { 
        users: Mutex::new(vec![]),
        oauth_accounts: Mutex::new(HashMap::new()),
    });
    let cache = Arc::new(MockCacheService { storage: Mutex::new(HashMap::new()) });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::nil()) });
    
    let refresh_uc = RefreshTokenUseCase::new(repo.clone(), cache.clone(), tokens.clone());
    
    // By default MockTokenService returns "access" if token doesn't contain "refresh"
    let token = "mock_access";
    
    let result = refresh_uc.execute(token).await;
    
    assert!(result.is_err());
    match result.unwrap_err() {
        DomainError::Unauthenticated => (),
        e => panic!("Expected Unauthenticated, got {:?}", e),
    }
}

#[tokio::test]
async fn test_login_success_with_email() {
    let repo = Arc::new(MockUserRepo { 
        users: Mutex::new(vec![]),
        oauth_accounts: Mutex::new(HashMap::new()),
    });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::nil()) });
    let crypto = Arc::new(MockCryptoService);
    
    let register_uc = RegisterUseCase::new(repo.clone(), tokens.clone(), crypto.clone());
    let login_uc = LoginUseCase::new(repo, tokens, crypto);
    
    // Register first
    register_uc.execute("johndoe", "john@example.com", "password123").await.unwrap();
    
    // Login with email
    let result = login_uc.execute("john@example.com", "password123").await;
    
    assert!(result.is_ok());
    assert!(matches!(result, Ok(LoginResult::Success(_))));
    let Ok(LoginResult::Success(res)) = result else {
        unreachable!();
    };

    assert_eq!(res.user.username.to_string(), "johndoe");
}

#[tokio::test]
async fn test_oauth_get_url_success() {
    let repo = Arc::new(MockUserRepo { 
        users: Mutex::new(vec![]),
        oauth_accounts: Mutex::new(HashMap::new()),
    });
    let cache = Arc::new(MockCacheService { storage: Mutex::new(HashMap::new()) });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::nil()) });
    
    let uc = OAuthUseCase::new(repo, tokens, cache.clone());
    let provider = Arc::new(MockOAuthProvider {
        auth_url: "https://github.com/login/oauth/authorize?client_id=123".to_string(),
        state: "test_state".to_string(),
        user_info: Err(DomainError::Internal("Not implemented".to_string())),
    });
    
    let result = uc.get_auth_url(provider).await;
    
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "https://github.com/login/oauth/authorize?client_id=123");
    assert!(cache.exists("oauth_state:test_state").await.unwrap());
}

#[tokio::test]
async fn test_oauth_handle_callback_new_user() {
    let repo = Arc::new(MockUserRepo { 
        users: Mutex::new(vec![]),
        oauth_accounts: Mutex::new(HashMap::new()),
    });
    let cache = Arc::new(MockCacheService { storage: Mutex::new(HashMap::new()) });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::nil()) });
    
    let uc = OAuthUseCase::new(repo.clone(), tokens, cache.clone());
    
    let provider_name = "github";
    let state = "test_state";
    cache.set(&format!("oauth_state:{}", state), "pending", std::time::Duration::from_secs(600)).await.unwrap();
    
    let provider = Arc::new(MockOAuthProvider {
        auth_url: "".into(),
        state: "".into(),
        user_info: Ok(OAuthUserInfo {
            email: "oauth_user@example.com".into(),
            username: "OAuth User".into(),
            provider_id: "12345".into(),
            avatar_url: None,
        }),
    });
    
    let result = uc.handle_callback(provider_name, provider, "some_code".into(), state.into()).await;
    
    assert!(result.is_ok());
    let res = result.unwrap();
    assert_eq!(res.user.email.to_string(), "oauth_user@example.com");
    assert_eq!(res.user.username.to_string(), "oauth_user"); // normalized name
    
    // Check if linked in repo
    let linked_user = repo.find_by_oauth_id(provider_name, "12345").await.unwrap();
    assert!(linked_user.is_some());
    assert_eq!(linked_user.unwrap().id, res.user.id);
    
    // Check state deleted
    assert!(!cache.exists(&format!("oauth_state:{}", state)).await.unwrap());
}

#[tokio::test]
async fn test_oauth_handle_callback_link_existing_email() {
    let repo = Arc::new(MockUserRepo { 
        users: Mutex::new(vec![]),
        oauth_accounts: Mutex::new(HashMap::new()),
    });
    let cache = Arc::new(MockCacheService { storage: Mutex::new(HashMap::new()) });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::nil()) });
    let crypto = Arc::new(MockCryptoService);
    
    // 1. Pre-register a user with the same email
    let register_uc = RegisterUseCase::new(repo.clone(), tokens.clone(), crypto);
    let existing_user = register_uc.execute("existing_user", "match@example.com", "pass").await.unwrap().user;
    
    let uc = OAuthUseCase::new(repo.clone(), tokens, cache.clone());
    
    let provider_name = "github";
    let state = "test_state";
    cache.set(&format!("oauth_state:{}", state), "pending", std::time::Duration::from_secs(600)).await.unwrap();
    
    let provider = Arc::new(MockOAuthProvider {
        auth_url: "".into(),
        state: "".into(),
        user_info: Ok(OAuthUserInfo {
            email: "match@example.com".into(),
            username: "Some Github User".into(),
            provider_id: "gh_123".into(),
            avatar_url: None,
        }),
    });
    
    let result = uc.handle_callback(provider_name, provider, "some_code".into(), state.into()).await;
    
    assert!(result.is_ok());
    let res = result.unwrap();
    assert_eq!(res.user.id, existing_user.id);
    
    // Verify it is now linked
    let linked_user = repo.find_by_oauth_id(provider_name, "gh_123").await.unwrap();
    assert_eq!(linked_user.unwrap().id, existing_user.id);
}

#[tokio::test]
async fn test_oauth_handle_callback_existing_oauth_account() {
    let repo = Arc::new(MockUserRepo { 
        users: Mutex::new(vec![]),
        oauth_accounts: Mutex::new(HashMap::new()),
    });
    let cache = Arc::new(MockCacheService { storage: Mutex::new(HashMap::new()) });
    let tokens = Arc::new(MockTokenService { next_user_id: Mutex::new(Uuid::nil()) });
    
    let uc = OAuthUseCase::new(repo.clone(), tokens, cache.clone());
    
    let provider_name = "github";
    let provider_id = "gh_789";
    
    // 1. Create a user and link it
    let user = repo.save_user(UserDto {
        username: crate::domain::types::Username::new("already_linked").unwrap(),
        email: crate::domain::types::Email::new("linked@example.com").unwrap(),
        password_hash: "".into(),
    }).await.unwrap();
    repo.link_oauth_account(user.id, provider_name, provider_id).await.unwrap();
    
    // 2. Handle callback
    let state = "test_state";
    cache.set(&format!("oauth_state:{}", state), "pending", std::time::Duration::from_secs(600)).await.unwrap();
    
    let provider = Arc::new(MockOAuthProvider {
        auth_url: "".into(),
        state: "".into(),
        user_info: Ok(OAuthUserInfo {
            email: "linked@example.com".into(),
            username: "Some Github User".into(),
            provider_id: provider_id.into(),
            avatar_url: None,
        }),
    });
    
    let result = uc.handle_callback(provider_name, provider, "some_code".into(), state.into()).await;
    
    assert!(result.is_ok());
    let res = result.unwrap();
    assert_eq!(res.user.id, user.id);
}
