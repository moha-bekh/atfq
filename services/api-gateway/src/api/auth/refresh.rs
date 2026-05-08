use crate::api::openapi::auth::refresh::RefreshRequest;
use crate::api::openapi::{AuthResponse, UserSchema};
use crate::error::AppError;
use crate::grpc::auth::auth_response::Result as AuthResult;
use crate::state::AppState;
use axum::{Json, extract::State};
use std::sync::Arc;

#[utoipa::path(
    post,
    path = "/api/v1/auth/refresh",
    request_body = RefreshRequest,
    responses(
        (status = 200, description = "Token refreshed", body = AuthResponse),
        (status = 401, description = "Unauthorized")
    )
)]
pub async fn refresh_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let mut client = state.auth_client.clone();

    let request = tonic::Request::new(crate::grpc::auth::RefreshRequest {
        refresh_token: payload.refresh_token,
    });

    let response = client.refresh_token(request).await?.into_inner();

    match response.result {
        Some(AuthResult::Success(success)) => {
            let user = success.user.unwrap();
            Ok(Json(AuthResponse {
                status: "SUCCESS".into(),
                access_token: Some(success.access_token),
                refresh_token: Some(success.refresh_token),
                mfa_login_id: None,
                user: Some(UserSchema {
                    id: user.id,
                    username: user.username.clone(),
                    email: user.email,
                    avatar_url: Some(user.username),
                    has_password: user.has_password,
                    mfa_enabled: user.mfa_enabled,
                }),
            }))
        }
        Some(AuthResult::MfaRequired(mfa)) => Ok(Json(AuthResponse {
            status: "MFA_REQUIRED".into(),
            access_token: None,
            refresh_token: None,
            mfa_login_id: Some(mfa.login_request_id),
            user: None,
        })),
        None => Err(AppError::Internal("Empty auth response".into())),
    }
}
