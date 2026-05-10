use crate::api::openapi::{LoginRequest, LoginResponse, UserSchema}; // Import des types documentés
use crate::error::AppError;
use crate::grpc::auth::{Identifier, auth_response::Result as AuthResult, identifier::Id};
use crate::state::AppState;
use axum::{Json, extract::State};
use std::sync::Arc; // Import corrigé du message et de son enum interne
use tonic::Code;

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login Success", body = LoginResponse),
        (status = 202, description = "MFA required", body = LoginResponse)
    )
)]
pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<(axum::http::StatusCode, Json<LoginResponse>), AppError> {
    let mut client = state.auth_client.clone();

    // On prépare le 'oneof' interne de l'objet Identifier
    let id_variant = if payload.identifier.contains('@') {
        Id::Email(payload.identifier)
    } else {
        Id::Username(payload.identifier)
    };

    // On construit l'objet Identifier gRPC
    let grpc_identifier = Identifier {
        id: Some(id_variant),
    };

    // On envoie la requête LoginRequest au service auth
    let request = tonic::Request::new(crate::grpc::auth::LoginRequest {
        id: Some(grpc_identifier),
        password: payload.password,
    });

    let response = match client.login(request).await {
        Ok(response) => response.into_inner(),
        Err(status) if status.code() == Code::Unauthenticated => {
            return Ok((
                axum::http::StatusCode::OK,
                Json(LoginResponse {
                    status: "INVALID_CREDENTIALS".into(),
                    access_token: None,
                    refresh_token: None,
                    mfa_login_id: None,
                    user: None,
                }),
            ));
        }
        Err(status) => return Err(status.into()),
    };

    // On traite le résultat 'oneof' du service auth
    match response.result {
        Some(AuthResult::Success(success)) => {
            let user = success.user.unwrap();
            Ok((
                axum::http::StatusCode::OK,
                Json(LoginResponse {
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
                }),
            ))
        }
        Some(AuthResult::MfaRequired(mfa)) => Ok((
            axum::http::StatusCode::ACCEPTED,
            Json(LoginResponse {
                status: "MFA_REQUIRED".into(),
                access_token: None,
                refresh_token: None,
                mfa_login_id: Some(mfa.login_request_id),
                user: None,
            }),
        )),
        None => Err(AppError::Internal("Empty auth response".into())),
    }
}
