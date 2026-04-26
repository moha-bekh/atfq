use axum::{extract::State, Json};
use std::sync::Arc;
use crate::error::AppError;
use crate::api::openapi::{LoginRequest, LoginResponse, UserSchema}; // Import des types documentés
use crate::state::AppState;
use crate::grpc::auth::{Identifier, identifier::Id, auth_response::Result as AuthResult}; // Import corrigé du message et de son enum interne

#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login Success", body = LoginResponse),
        (status = 401, description = "Unauthorized")
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

    let response = client.login(request).await?.into_inner();

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
                    user: Some(UserSchema {
                        id: user.id,
                        username: user.username.clone(),
                        email: user.email,
                        avatar_url: Some(user.username),
                    })

                })
            ))
        },
        Some(AuthResult::MfaRequired(_)) => {
            // Optionnel: Gérer le MFA ici
            Ok((
                axum::http::StatusCode::ACCEPTED,
                Json(LoginResponse { 
                    status: "MFA_REQUIRED".into(),
                    access_token: None,
                    refresh_token: None,
                    user: None,
                })
            ))
        },
        None => Err(AppError::Internal("Empty auth response".into()))
    }
}
