use std::sync::{Arc, Mutex};
use async_trait::async_trait;
use uuid::Uuid;
use crate::domain::ports::{
    user_repository::{UserRepository, UserDto},
    token_service::{TokenService, TokenPair},
    crypto_service::CryptoService
};
use crate::domain::entities::User;
use crate::domain::error::DomainError;
use crate::app::auth::register::RegisterUseCase;
use crate::app::auth::login::LoginUseCase;

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
            is_2fa_enabled: false,
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

struct MockTokenService;
impl TokenService for MockTokenService {
    fn generate_tokens(&self, _user_id: Uuid) -> TokenPair {
        TokenPair {
            access: "mock_access".into(),
            refresh: "mock_refresh".into(),
        }
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

// --- TESTS ---

#[tokio::test]
async fn test_register_success() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService);
    let crypto = Arc::new(MockCryptoService);
    
    let uc = RegisterUseCase::new(repo, tokens, crypto);
    
    let result = uc.execute("johndoe", "john@example.com", "password123").await;
    
    assert!(result.is_ok());
    let res = result.unwrap();
    assert_eq!(res.access_token, "mock_access");
    assert_eq!(res.user.username.to_string(), "johndoe");
}

#[tokio::test]
async fn test_register_duplicate_user() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService);
    let crypto = Arc::new(MockCryptoService);
    
    let uc = RegisterUseCase::new(repo.clone(), tokens, crypto);
    
    // Premier enregistrement
    let _ = uc.execute("johndoe", "john@example.com", "password123").await.unwrap();
    
    // Deuxième enregistrement avec le même email
    let result = uc.execute("other", "john@example.com", "password123").await;
    
    assert!(result.is_err());
    // On vérifie que c'est bien l'erreur attendue
    match result.unwrap_err() {
        DomainError::AlreadyExists => (),
        e => panic!("Expected AlreadyExists, got {:?}", e),
    }
}

#[tokio::test]
async fn test_register_invalid_input() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService);
    let crypto = Arc::new(MockCryptoService);
    
    let uc = RegisterUseCase::new(repo, tokens, crypto);
    
    // Email invalide (pas d'@')
    let result = uc.execute("johndoe", "invalid-email", "password123").await;
    
    assert!(result.is_err());
    match result.unwrap_err() {
        DomainError::InvalidInput(msg) => assert!(msg.contains("email")),
        e => panic!("Expected InvalidInput, got {:?}", e),
    }
}

#[tokio::test]
async fn test_login_success_with_email() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService);
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

#[tokio::test]
async fn test_login_success_with_username() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService);
    let crypto = Arc::new(MockCryptoService);
    
    let register_uc = RegisterUseCase::new(repo.clone(), tokens.clone(), crypto.clone());
    let login_uc = LoginUseCase::new(repo, tokens, crypto);
    
    // Register first
    register_uc.execute("johndoe", "john@example.com", "password123").await.unwrap();
    
    // Login with username
    let result = login_uc.execute("johndoe", "password123").await;
    
    assert!(result.is_ok());
    let res = result.unwrap();
    assert_eq!(res.user.email.to_string(), "john@example.com");
}

#[tokio::test]
async fn test_login_wrong_password() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService);
    let crypto = Arc::new(MockCryptoService);
    
    let register_uc = RegisterUseCase::new(repo.clone(), tokens.clone(), crypto.clone());
    let login_uc = LoginUseCase::new(repo, tokens, crypto);
    
    register_uc.execute("johndoe", "john@example.com", "password123").await.unwrap();
    
    // Wrong password
    let result = login_uc.execute("john@example.com", "wrongpassword").await;
    
    assert!(result.is_err());
    match result.unwrap_err() {
        DomainError::Unauthenticated => (),
        e => panic!("Expected Unauthenticated, got {:?}", e),
    }
}

#[tokio::test]
async fn test_login_user_not_found() {
    let repo = Arc::new(MockUserRepo { users: Mutex::new(vec![]) });
    let tokens = Arc::new(MockTokenService);
    let crypto = Arc::new(MockCryptoService);
    
    let login_uc = LoginUseCase::new(repo, tokens, crypto);
    
    let result = login_uc.execute("nonexistent@example.com", "password123").await;
    
    assert!(result.is_err());
    match result.unwrap_err() {
        DomainError::Unauthenticated => (),
        e => panic!("Expected Unauthenticated, got {:?}", e),
    }
}
