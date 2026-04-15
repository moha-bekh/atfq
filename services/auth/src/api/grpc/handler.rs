use std::sync::Arc;
use tonic::{Request, Response, Status};
use crate::auth_proto::auth_service_server::AuthService;
use crate::auth_proto::{AuthResponse, RegisterRequest, LoginRequest, LogoutRequest};
use crate::app::auth::register::RegisterUseCase;
use crate::app::auth::login::LoginUseCase;
use crate::app::auth::logout::LogoutUseCase;
use crate::domain::error::DomainError;

use crate::domain::ports::cache_service::CacheService;
use crate::domain::ports::token_service::TokenService;

pub struct AuthHandler {
    pub register_uc: Arc<RegisterUseCase>,
    pub login_uc: Arc<LoginUseCase>,
    pub logout_uc: Arc<LogoutUseCase>,
    pub cache_service: Arc<dyn CacheService>,
    pub token_service: Arc<dyn TokenService>,
}

impl AuthHandler {
    pub fn new(
        register_uc: Arc<RegisterUseCase>,
        login_uc: Arc<LoginUseCase>,
        logout_uc: Arc<LogoutUseCase>,
        cache_service: Arc<dyn CacheService>,
        token_service: Arc<dyn TokenService>,
    ) -> Self {
        Self { register_uc, login_uc, logout_uc, cache_service, token_service }
    }
}

#[tonic::async_trait]
impl AuthService for AuthHandler {
    async fn register(&self, request: Request<RegisterRequest>) -> Result<Response<AuthResponse>, Status> {
        self.register_handler(request).await
    }

    async fn login(&self, request: Request<LoginRequest>) -> Result<Response<AuthResponse>, Status> {
        self.login_handler(request).await
    }

    async fn logout(&self, request: Request<LogoutRequest>) -> Result<Response<()>, Status> {
        self.logout_handler(request).await
    }
}

pub fn map_domain_error(err: DomainError) -> Status {
    match err {
        DomainError::AlreadyExists => Status::already_exists("User already exists"),
        DomainError::InvalidInput(msg) => Status::invalid_argument(msg),
        DomainError::Unauthenticated | DomainError::Unauthorized => Status::unauthenticated("Unauthorized"),
        DomainError::NotFound => Status::not_found("Not found"),
        DomainError::Internal(msg) => Status::internal(msg),
    }
}
