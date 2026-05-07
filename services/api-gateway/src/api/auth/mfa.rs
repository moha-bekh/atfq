use axum::{extract::State, Json, http::HeaderMap};
use std::sync::Arc;
use crate::error::AppError;
use crate::api::openapi::auth::mfa::{EnableMFARequest, EnableMFAResponse, VerifyMFARequest};
use crate::api::openapi::{AuthResponse, UserSchema};
use crate::state::AppState;
use crate::grpc::auth::{MfaMethod as GrpcMfaMethod};

#[utoipa::path(
    post,
    path = "/api/v1/auth/mfa/enable",
    request_body = EnableMFARequest,
    responses(
        (status = 200, description = "MFA enabled", body = EnableMFAResponse),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn enable_mfa_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<EnableMFARequest>,
) -> Result<Json<EnableMFAResponse>, AppError> {
    let mut client = state.auth_client.clone();

    let auth_header = headers.get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing authorization header".into()))?;

    let access_token = auth_header.strip_prefix("Bearer ")
        .unwrap_or(auth_header)
        .to_string();

    let method = match payload.method {
        crate::api::openapi::auth::mfa::MfaMethod::TOTP => GrpcMfaMethod::MethodTotp,
        crate::api::openapi::auth::mfa::MfaMethod::SMS => GrpcMfaMethod::MethodSms,
    };

    let mut request = tonic::Request::new(crate::grpc::auth::EnableMfaRequest {
        access_token,
        method: method as i32,
    });

    if let Ok(val) = auth_header.parse::<tonic::metadata::MetadataValue<tonic::metadata::Ascii>>() {
        request.metadata_mut().insert("authorization", val);
    }

    let response = client.enable_mfa(request).await?.into_inner();

    Ok(Json(EnableMFAResponse {
        secret_base32: response.secret_base32,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/mfa/disable",
    responses(
        (status = 200, description = "MFA disabled"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn disable_mfa_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<axum::http::StatusCode, AppError> {
    let mut client = state.auth_client.clone();

    let mut request = tonic::Request::new(crate::grpc::auth::GetUserRequest {
        access_token: "".into(),
    });

    let token = crate::api::auth::account::add_auth_header(&mut request, &headers)?;
    request.get_mut().access_token = token;

    client.disable_mfa(request).await?;

    Ok(axum::http::StatusCode::OK)
}

#[utoipa::path(
    post,
    path = "/api/v1/auth/mfa/verify",
    request_body = VerifyMFARequest,
    responses(
        (status = 200, description = "MFA verified", body = AuthResponse),
        (status = 401, description = "Unauthorized")
    )
)]
pub async fn verify_mfa_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<VerifyMFARequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let mut client = state.auth_client.clone();

    let request = tonic::Request::new(crate::grpc::auth::VerifyMfaRequest {
        login_request_id: payload.login_request_id,
        code: payload.code,
    });

    let response = client.verify_mfa(request).await?.into_inner();

    let user = response.user.unwrap();
    Ok(Json(AuthResponse {
        status: "SUCCESS".into(),
        access_token: Some(response.access_token),
        refresh_token: Some(response.refresh_token),
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
