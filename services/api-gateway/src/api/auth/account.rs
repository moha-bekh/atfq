use axum::{extract::State, Json, http::HeaderMap};
use std::sync::Arc;
use crate::error::AppError;
use crate::api::openapi::auth::user::{UpdateEmailRequest, UpdateUsernameRequest, UpdatePasswordRequest, DeleteUserRequest};
use crate::api::openapi::{UserSchema};
use crate::state::AppState;
use tonic::metadata::MetadataValue;

pub fn add_auth_header<T>(request: &mut tonic::Request<T>, headers: &HeaderMap) -> Result<String, AppError> {
    let auth_header = headers.get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing authorization header".into()))?;

    if let Ok(metadata_val) = auth_header.parse::<MetadataValue<tonic::metadata::Ascii>>() {
        request.metadata_mut().insert("authorization", metadata_val);
    }

    Ok(auth_header.strip_prefix("Bearer ").unwrap_or(auth_header).to_string())
}

#[utoipa::path(
    get,
    path = "/api/v1/auth/me",
    responses(
        (status = 200, description = "Get current user", body = UserSchema),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_me_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<UserSchema>, AppError> {
    let mut client = state.auth_client.clone();
    let mut request = tonic::Request::new(crate::grpc::auth::GetUserRequest {
        access_token: "".into(), // Will be populated from header if needed by service, but we pass it anyway
    });
    
    let access_token = add_auth_header(&mut request, &headers)?;
    request.get_mut().access_token = access_token;

    let response = client.get_user(request).await?.into_inner();
    Ok(Json(UserSchema {
        id: response.id,
        username: response.username.clone(),
        email: response.email,
        avatar_url: Some(response.username),
        has_password: response.has_password,
        mfa_enabled: response.mfa_enabled,
    }))
}

#[utoipa::path(
    put,
    path = "/api/v1/auth/email",
    request_body = UpdateEmailRequest,
    responses(
        (status = 200, description = "Email updated"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_email_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<UpdateEmailRequest>,
) -> Result<axum::http::StatusCode, AppError> {
    let mut client = state.auth_client.clone();
    let mut request = tonic::Request::new(crate::grpc::auth::UpdateEmailRequest {
        access_token: "".into(),
        new_email: payload.new_email,
    });
    
    let access_token = add_auth_header(&mut request, &headers)?;
    request.get_mut().access_token = access_token;

    client.update_email(request).await?;
    Ok(axum::http::StatusCode::OK)
}

#[utoipa::path(
    put,
    path = "/api/v1/auth/username",
    request_body = UpdateUsernameRequest,
    responses(
        (status = 200, description = "Username updated"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_username_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<UpdateUsernameRequest>,
) -> Result<axum::http::StatusCode, AppError> {
    let mut client = state.auth_client.clone();
    let mut request = tonic::Request::new(crate::grpc::auth::UpdateUsernameRequest {
        access_token: "".into(),
        new_username: payload.new_username,
    });
    
    let access_token = add_auth_header(&mut request, &headers)?;
    request.get_mut().access_token = access_token;

    client.update_username(request).await?;
    Ok(axum::http::StatusCode::OK)
}

#[utoipa::path(
    put,
    path = "/api/v1/auth/password",
    request_body = UpdatePasswordRequest,
    responses(
        (status = 200, description = "Password updated"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_password_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<UpdatePasswordRequest>,
) -> Result<axum::http::StatusCode, AppError> {
    let mut client = state.auth_client.clone();
    let mut request = tonic::Request::new(crate::grpc::auth::UpdatePasswordRequest {
        access_token: "".into(),
        old_password: payload.old_password,
        new_password: payload.new_password,
    });
    
    let access_token = add_auth_header(&mut request, &headers)?;
    request.get_mut().access_token = access_token;

    client.update_password(request).await?;
    Ok(axum::http::StatusCode::OK)
}

#[utoipa::path(
    delete,
    path = "/api/v1/auth/account",
    request_body = DeleteUserRequest,
    responses(
        (status = 200, description = "Account deleted"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_account_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<DeleteUserRequest>,
) -> Result<axum::http::StatusCode, AppError> {
    let mut client = state.auth_client.clone();
    let mut request = tonic::Request::new(crate::grpc::auth::DeleteUserRequest {
        access_token: "".into(),
        refresh_token: payload.refresh_token,
    });
    
    let access_token = add_auth_header(&mut request, &headers)?;
    request.get_mut().access_token = access_token;

    client.delete_user(request).await?;
    Ok(axum::http::StatusCode::OK)
}
