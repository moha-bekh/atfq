use tonic::{Request, Response, Status};
use crate::auth_proto::auth_service_server::AuthService;
use crate::auth_proto::{RegisterRequest, AuthResponse};
use crate::app::auth::register::RegisterUseCase;

pub struct AuthHandler {
    register_uc: RegisterUseCase,
}

impl AuthHandler {
    pub fn new(register_uc: RegisterUseCase) -> Self {
        Self { register_uc }
    }
}

#[tonic::async_trait]
impl AuthService for AuthHandler {
    async fn register(&self, request: Request<RegisterRequest>) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();
        
        // On délègue à l'expert. 
        // Note: En prod, on gèrerait les erreurs ici avec .map_err()
        let response = self.register_uc.execute(&req.username, &req.email, &req.password).await;

        Ok(Response::new(response))
    }
}
