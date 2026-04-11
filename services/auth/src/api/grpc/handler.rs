use std::sync::Arc;
use tonic::{Request, Response, Status};
use crate::auth_proto::auth_service_server::AuthService;
use crate::auth_proto::{RegisterRequest, LoginRequest, AuthResponse};
use crate::app::auth::register::RegisterUseCase;
use crate::domain::error::DomainError;

pub struct AuthHandler {
    pub register_uc: Arc<RegisterUseCase>,
}

impl AuthHandler {
    pub fn new(register_uc: Arc<RegisterUseCase>) -> Self {
        Self { register_uc }
    }
}

#[tonic::async_trait]
impl AuthService for AuthHandler {
    async fn register(&self, request: Request<RegisterRequest>) -> Result<Response<AuthResponse>, Status> {
        self.register_handler(request).await
    }

    async fn login(&self, _request: Request<LoginRequest>) -> Result<Response<AuthResponse>, Status> {
        Err(Status::unimplemented("Login not implemented yet"))
    }
}

pub fn map_domain_error(err: DomainError) -> Status {
    match err {
        DomainError::AlreadyExists => Status::already_exists("User already exists"),
        DomainError::InvalidInput(msg) => Status::invalid_argument(msg),
        DomainError::Unauthenticated => Status::unauthenticated("Unauthorized"),
        DomainError::Internal(msg) => Status::internal(msg),
    }
}
