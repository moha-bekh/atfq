use crate::api::openapi::{RegisterRequest, RegisterResponse, UserSchema};
use crate::error::AppError;
use crate::grpc::auth::auth_response::Result as AuthResult;
use crate::state::AppState;
use axum::{Json, extract::State};
use std::sync::Arc;

#[utoipa::path(
    post,
    path = "/api/v1/auth/register",
    operation_id = "register_handler",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "User created", body = RegisterResponse),
        (status = 409, description = "Conflict - User already exists"),
        (status = 502, description = "Downstream service error")
    )
)]
pub async fn register_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(axum::http::StatusCode, Json<RegisterResponse>), AppError> {
    let mut client = state.auth_client.clone();

    let request = tonic::Request::new(crate::grpc::auth::RegisterRequest {
        username: payload.username,
        email: payload.email,
        password: payload.password,
    });

    let response = client.register(request).await?.into_inner();

    match response.result {
        Some(AuthResult::Success(success)) => {
            let user = success.user.unwrap();
            Ok((
                axum::http::StatusCode::CREATED,
                Json(RegisterResponse {
                    status: "SUCCESS".into(),
                    access_token: Some(success.access_token),
                    refresh_token: Some(success.refresh_token),
                    mfa_login_id: None,
                    user: Some(UserSchema {
                        id: user.id,
                        username: user.username.clone(),
                        email: user.email,
                        avatar_url: Some(user.username),
                        has_password: true,
                        mfa_enabled: user.mfa_enabled,
                    }),
                }),
            ))
        }
        _ => Err(AppError::Internal(
            "Registration failed to return user data".into(),
        )),
    }
}
