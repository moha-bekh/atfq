use axum::{
    extract::{Path, Query, State},
    Json,
    http::HeaderMap,
};
use std::sync::Arc;
use crate::error::AppError;
use crate::api::openapi::auth::oauth::{OAuthProvider as ApiOAuthProvider, OAuthUrlResponse, OAuthCallbackParams, LinkedProvidersResponse, LinkedProvider};
use crate::api::openapi::{LoginResponse, UserSchema};
use crate::state::AppState;
use crate::grpc::auth::{
    OAuthUrlRequest, 
    OAuthCallbackRequest, 
    OAuthProvider as GrpcOAuthProvider,
    GetUserRequest,
    UnlinkProviderRequest,
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
    path = "/api/v1/auth/oauth/providers",
    responses(
        (status = 200, description = "Linked providers list", body = LinkedProvidersResponse),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_linked_providers_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<LinkedProvidersResponse>, AppError> {
    let mut client = state.auth_client.clone();
    let mut request = tonic::Request::new(GetUserRequest {
        access_token: "".into(),
    });

    // We use the helper to add metadata and extract token for the message body
    let token = super::account::add_auth_header(&mut request, &headers)?;
    request.get_mut().access_token = token;

    let response = client.get_linked_providers(request).await?.into_inner();

    Ok(Json(LinkedProvidersResponse {
        providers: response.providers.into_iter().map(|p| LinkedProvider {
            name: p.name,
            provider_id: p.provider_id,
        }).collect(),
    }))
}

#[utoipa::path(
    delete,
    path = "/api/v1/auth/oauth/providers/{provider}",
    params(
        ("provider" = ApiOAuthProvider, Path, description = "Provider to unlink")
    ),
    responses(
        (status = 200, description = "Provider unlinked"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer_auth" = []))
)]
pub async fn unlink_provider_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(provider): Path<ApiOAuthProvider>,
) -> Result<axum::http::StatusCode, AppError> {
    let mut client = state.auth_client.clone();
    let mut request = tonic::Request::new(UnlinkProviderRequest {
        access_token: "".into(),
        provider: match provider {
            ApiOAuthProvider::Google => "google".into(),
            ApiOAuthProvider::Github => "github".into(),
        },
    });

    let token = super::account::add_auth_header(&mut request, &headers)?;
    request.get_mut().access_token = token;

    client.unlink_provider(request).await?;

    Ok(axum::http::StatusCode::OK)
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
    headers: HeaderMap,
    Path(provider): Path<ApiOAuthProvider>,
) -> Result<Json<OAuthUrlResponse>, AppError> {
    let mut client = state.auth_client.clone();

    let mut request = tonic::Request::new(OAuthUrlRequest {
        provider: GrpcOAuthProvider::from(provider).into(),
        linking_user_id: None,
    });

    // Check for authorization header to enable linking
    if let Some(auth_header) = headers.get("authorization") {
        if let Ok(val) = auth_header.to_str() {
            if let Ok(metadata_val) = val.parse::<tonic::metadata::MetadataValue<tonic::metadata::Ascii>>() {
                request.metadata_mut().insert("authorization", metadata_val);
            }
        }
    }

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

    let response = client.o_auth_callback(request).await?.into_inner();

    match response.result {
        Some(AuthResult::Success(success)) => {
            let user = success.user.unwrap();
            Ok(Json(LoginResponse {
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
        Some(AuthResult::MfaRequired(mfa)) => {
            Ok(Json(LoginResponse {
                status: "MFA_REQUIRED".into(),
                access_token: None,
                refresh_token: None,
                mfa_login_id: Some(mfa.login_request_id),
                user: None,
            }))
        }
        None => Err(AppError::Internal("Empty auth response".into()))
    }
}
