use crate::api::grpc::handler::{AuthHandler, map_domain_error};
use crate::auth_proto::{
    AuthResponse, OAuthCallbackRequest, OAuthProvider, OAuthUrlRequest, OAuthUrlResponse,
    auth_response,
};
use tonic::{Request, Response, Status};

impl AuthHandler {
    pub async fn get_oauth_url_handler(
        &self,
        request: Request<OAuthUrlRequest>,
    ) -> Result<Response<OAuthUrlResponse>, Status> {
        let mut linking_user_id = None;

        // Try to get user_id from metadata (AuthInterceptor should have populated it or we check header)
        if let Some(auth_header) = request.metadata().get("authorization") {
            if let Ok(val) = auth_header.to_str() {
                let token = val.strip_prefix("Bearer ").unwrap_or(val);
                if let Ok(claims) = self.token_service.decode_token(token) {
                    linking_user_id = Some(claims.user_id.to_string());
                }
            }
        }

        let req = request.into_inner();

        let provider = match OAuthProvider::try_from(req.provider) {
            Ok(OAuthProvider::Google) => self
                .google_provider
                .as_ref()
                .ok_or_else(|| Status::unimplemented("Google provider not configured"))?,
            Ok(OAuthProvider::Github) => self
                .github_provider
                .as_ref()
                .ok_or_else(|| Status::unimplemented("Github provider not configured"))?,
            _ => return Err(Status::invalid_argument("Invalid provider")),
        };

        let url = self
            .oauth_uc
            .get_auth_url(provider.clone(), linking_user_id)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(OAuthUrlResponse { url }))
    }

    pub async fn oauth_callback_handler(
        &self,
        request: Request<OAuthCallbackRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let req = request.into_inner();

        let (provider_name, provider) = match OAuthProvider::try_from(req.provider) {
            Ok(OAuthProvider::Google) => (
                "google",
                self.google_provider
                    .as_ref()
                    .ok_or_else(|| Status::unimplemented("Google provider not configured"))?,
            ),
            Ok(OAuthProvider::Github) => (
                "github",
                self.github_provider
                    .as_ref()
                    .ok_or_else(|| Status::unimplemented("Github provider not configured"))?,
            ),
            _ => return Err(Status::invalid_argument("Invalid provider")),
        };

        let auth_result = self
            .oauth_uc
            .handle_callback(provider_name, provider.clone(), req.code, req.state)
            .await
            .map_err(map_domain_error)?;

        Ok(Response::new(AuthResponse {
            result: Some(auth_response::Result::Success(
                crate::auth_proto::AuthSuccess {
                    access_token: auth_result.access_token,
                    refresh_token: auth_result.refresh_token,
                    user: Some(crate::auth_proto::User {
                        id: auth_result.user.id.to_string(),
                        username: auth_result.user.username.to_string(),
                        email: auth_result.user.email.to_string(),
                        has_password: auth_result
                            .user
                            .password_hash
                            .as_ref()
                            .map(|h| !h.is_empty())
                            .unwrap_or(false),
                        mfa_enabled: auth_result.user.mfa_secret.is_some(),
                    }),
                },
            )),
        }))
    }
}
