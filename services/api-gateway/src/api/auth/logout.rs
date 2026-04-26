use axum::{extract::State, Json};
use std::sync::Arc;
use crate::error::AppError;
use crate::api::openapi::LogoutRequest;
use crate::state::AppState;

#[utoipa::path(
    post,
    path = "/api/v1/auth/logout",
    request_body = LogoutRequest,
    responses(
        (status = 200, description = "Logout Success"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal Server Error")
    )
)]
pub async fn logout_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LogoutRequest>,
) -> Result<axum::http::StatusCode, AppError> {
    let mut client = state.auth_client.clone();

    let mut request = tonic::Request::new(crate::grpc::auth::LogoutRequest {
        access_token: payload.access_token.clone(),
        refresh_token: payload.refresh_token,
    });

    // On ajoute le header Authorization pour que l'intercepteur du service auth puisse valider le token
    let bearer_token = format!("Bearer {}", payload.access_token);
    if let Ok(header_value) = bearer_token.parse::<tonic::metadata::MetadataValue<tonic::metadata::Ascii>>() {
        request.metadata_mut().insert("authorization", header_value);
    }

    client.logout(request).await?;

    Ok(axum::http::StatusCode::OK)
}
