use std::sync::Arc;
use tonic::{Request, Response, Status};
use crate::auth_proto::auth_service_server::AuthService;
use crate::auth_proto::{
    AuthSuccess,
    AuthResponse,
    RegisterRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    EnableMfaRequest,
    EnableMfaResponse,
    VerifyMfaRequest
};
use crate::app::auth::register::RegisterUseCase;
use crate::app::auth::login::LoginUseCase;
use crate::app::auth::enable_mfa::EnableMfaUseCase;
use crate::app::auth::verify_mfa::VerifyMfaUseCase;
use crate::app::auth::logout::LogoutUseCase;
use crate::app::auth::refresh::RefreshTokenUseCase;
use crate::app::auth::oauth::OAuthUseCase;
use crate::app::auth::get_user::GetUserUseCase;
use crate::app::auth::delete_user::DeleteUserUseCase;
use crate::domain::error::DomainError;

use crate::domain::ports::cache_service::CacheService;
use crate::domain::ports::token_service::TokenService;
use crate::domain::ports::oauth_service::OAuthProvider as DomainOAuthProvider;
use crate::auth_proto::{OAuthUrlRequest, OAuthUrlResponse, OAuthCallbackRequest, UserIdMessage, User};

pub struct AuthHandler {
    pub register_uc: Arc<RegisterUseCase>,
    pub login_uc: Arc<LoginUseCase>,
    pub enable_mfa_uc: Arc<EnableMfaUseCase>,
    pub verify_mfa_uc: Arc<VerifyMfaUseCase>,
    pub logout_uc: Arc<LogoutUseCase>,
    pub refresh_uc: Arc<RefreshTokenUseCase>,
    pub oauth_uc: Arc<OAuthUseCase>,
    pub get_user_uc: Arc<GetUserUseCase>,
    pub delete_user_uc: Arc<DeleteUserUseCase>,
    pub cache_service: Arc<dyn CacheService>,
    pub token_service: Arc<dyn TokenService>,
    pub google_provider: Option<Arc<dyn DomainOAuthProvider>>,
    pub github_provider: Option<Arc<dyn DomainOAuthProvider>>,
}

impl AuthHandler {
    pub fn new(
        register_uc: Arc<RegisterUseCase>,
        login_uc: Arc<LoginUseCase>,
        enable_mfa_uc: Arc<EnableMfaUseCase>,
        verify_mfa_uc: Arc<VerifyMfaUseCase>,
        logout_uc: Arc<LogoutUseCase>,
        refresh_uc: Arc<RefreshTokenUseCase>,
        oauth_uc: Arc<OAuthUseCase>,
        get_user_uc: Arc<GetUserUseCase>,
        delete_user_uc: Arc<DeleteUserUseCase>,
        cache_service: Arc<dyn CacheService>,
        token_service: Arc<dyn TokenService>,
        google_provider: Option<Arc<dyn DomainOAuthProvider>>,
        github_provider: Option<Arc<dyn DomainOAuthProvider>>,
    ) -> Self {
        Self {
            register_uc,
            login_uc,
            enable_mfa_uc,
            verify_mfa_uc,
            logout_uc,
            refresh_uc,
            oauth_uc,
            get_user_uc,
            delete_user_uc,
            cache_service,
            token_service,
            google_provider,
            github_provider
        }
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

    async fn refresh_token(&self, request: Request<RefreshRequest>) -> Result<Response<AuthResponse>, Status> {
        self.refresh_handler(request).await
    }

    async fn enable_mfa(&self, request: Request<EnableMfaRequest>) -> Result<Response<EnableMfaResponse>, Status> {
        self.enable_mfa_handler(request).await
    }

    async fn verify_mfa(&self, request: Request<VerifyMfaRequest>) -> Result<Response<AuthSuccess>, Status> {
        self.verify_mfa_handler(request).await
    }

    async fn get_user_by_id(&self, request: Request<UserIdMessage>) -> Result<Response<User>, Status> {
        self.get_user_by_id_handler(request).await
    }

    async fn delete_user_by_id(&self, request: Request<UserIdMessage>) -> Result<Response<()>, Status> {
        self.delete_user_by_id_handler(request).await
    }

    async fn get_o_auth_url(&self, request: Request<OAuthUrlRequest>) -> Result<Response<OAuthUrlResponse>, Status> {
        self.get_oauth_url_handler(request).await
    }

    async fn o_auth_callback(&self, request: Request<OAuthCallbackRequest>) -> Result<Response<AuthResponse>, Status> {
        self.oauth_callback_handler(request).await
    }
}

pub fn map_domain_error(err: DomainError) -> Status {
    match err {
        DomainError::AlreadyExists => Status::already_exists("User already exists"),
        DomainError::MfaAlreadyEnabled => Status::already_exists("2FA already enabled"),
        DomainError::InvalidInput(msg) => Status::invalid_argument(msg),
        DomainError::Unauthenticated => Status::unauthenticated("Invalid identifier or password"),
        DomainError::Unauthorized => Status::permission_denied("You do not have permission to perform this action"),
        DomainError::NotFound => Status::not_found("The requested resource was not found"),
        DomainError::Internal(msg) => Status::internal(msg),
    }
}
