use std::sync::Arc;
use crate::domain::ports::user_repository::UserRepository;
use crate::domain::ports::token_service::TokenService;
use crate::domain::entities::UserDto;
use crate::domain::types::{Username, Email};
use crate::auth_proto::{AuthResponse, AuthSuccess, User as ProtoUser, auth_response};

pub struct RegisterUseCase {
    repo: Arc<dyn UserRepository>,
    tokens: Arc<dyn TokenService>,
}

impl RegisterUseCase {
    pub fn new(repo: Arc<dyn UserRepository>, tokens: Arc<dyn TokenService>) -> Self {
        Self { repo, tokens }
    }

    pub async fn execute(&self, username_raw: &str, email_raw: &str, password_raw: &str) -> AuthResponse {
        // 1. Validation via Newtypes (Username / Email)
        let username = Username::new(username_raw).expect("Invalid username");
        let email = Email::new(email_raw).expect("Invalid email");

        // 2. Logic: Hash (Mock)
        let hashed_password = format!("hashed_{}", password_raw);

        // 3. Create DTO and call Repo
        let dto = UserDto {
            username,
            email,
            password_hash: hashed_password,
        };
        
        let user = self.repo.save(dto).await;

        // 4. Tokens
        let token_pair = self.tokens.generate_tokens(user.id);

        // 5. Mapping vers Proto
        AuthResponse {
            result: Some(auth_response::Result::Success(AuthSuccess {
                access_token: token_pair.access,
                refresh_token: token_pair.refresh,
                user: Some(ProtoUser {
                    id: user.id.to_string(),
                    username: user.username.to_string(), // Grâce à Deref ou to_string
                    email: user.email.to_string(),
                }),
            })),
        }
    }
}
