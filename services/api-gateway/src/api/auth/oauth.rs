use axum::{
    extract::{Path, Query, State},
    Json,
};
use std::sync::Arc;
use crate::error::AppError;
use crate::api::openapi::auth::oauth::{OAuthProvider as ApiOAuthProvider, OAuthUrlResponse, OAuthCallbackParams};
use crate::api::openapi::{LoginResponse, UserSchema};
use crate::state::AppState;
use crate::grpc::auth::{
    OAuthUrlRequest, 
    OAuthCallbackRequest, 
    OAuthProvider as GrpcOAuthProvider,
    auth_response::Result as AuthResult
};

impl From<ApiOAuthProvider> for GrpcOAuthProvider {
    fn from(provider: ApiOAuthProvider) -> Self {
        match provider {
            ApiOAuthProvider::Google => GrpcOAuthProvider::Google,
            ApiOAuthProvider::Github => GrpcOAuthProvider::Github,
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/oauth/url/{provider}",
    params(
        ("provider" = ApiOAuthProvider, Path, description = "OAuth provider name")
    ),
    responses(
        (status = 200, description = "OAuth URL generated", body = OAuthUrlResponse),
        (status = 400, description = "Invalid provider")
    )
)]
pub async fn get_oauth_url_handler(
    State(state): State<Arc<AppState>>,
    Path(provider): Path<ApiOAuthProvider>,
) -> Result<Json<OAuthUrlResponse>, AppError> {
    let mut client = state.auth_client.clone();

    let request = tonic::Request::new(OAuthUrlRequest {
        provider: GrpcOAuthProvider::from(provider).into(),
    });

    let response = client.get_o_auth_url(request).await?.into_inner();

    Ok(Json(OAuthUrlResponse { url: response.url }))
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/oauth/callback/{provider}",
    params(
        ("provider" = ApiOAuthProvider, Path, description = "OAuth provider name"),
        ("code" = String, Query, description = "Auth code from provider"),
        ("state" = String, Query, description = "State for security")
    ),
    responses(
        (status = 200, description = "Login Success", body = LoginResponse),
        (status = 401, description = "Unauthorized")
    )
)]
pub async fn oauth_callback_handler(
    State(state): State<Arc<AppState>>,
    Path(provider): Path<ApiOAuthProvider>,
    Query(params): Query<OAuthCallbackParams>,
) -> Result<Json<LoginResponse>, AppError> {
    let mut client = state.auth_client.clone();

    let request = tonic::Request::new(OAuthCallbackRequest {
        provider: GrpcOAuthProvider::from(provider).into(),
        code: params.code,
        state: params.state,
    });

    let response = match client.o_auth_callback(request).await {
        Ok(res) => res.into_inner(),
        Err(e) => {
            eprintln!("gRPC OAuthCallback error: {:?}", e);
            return Err(e.into());
        }
    };

    match response.result {
        Some(AuthResult::Success(success)) => {
            let user = success.user.unwrap();
            Ok(Json(LoginResponse {
                status: "SUCCESS".into(),
                access_token: Some(success.access_token),
                refresh_token: Some(success.refresh_token),
                user: Some(UserSchema {
                    id: user.id,
                    username: user.username.clone(),
                    email: user.email,
                    avatar_url: Some(user.username),
                }),
            }))
        }
        Some(AuthResult::MfaRequired(_)) => {
            Ok(Json(LoginResponse {
                status: "MFA_REQUIRED".into(),
                access_token: None,
                refresh_token: None,
                user: None,
            }))
        }
        None => {
            eprintln!("gRPC OAuthCallback returned empty result");
            Err(AppError::Internal("Empty auth response".into()))
        }
    }
}
