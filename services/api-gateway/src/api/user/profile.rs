use axum::{extract::{State, Path, Multipart}, Json, http::HeaderMap};
use std::sync::Arc;
use crate::error::AppError;
use crate::api::openapi::user::profile::{
    ProfileResponse, CreateProfileRequest, UpdateProfileRequest, 
    ThemeSchema, UpdateThemeRequest, RoleRequest, PermissionListResponse,
    RoleChangeRequest, RoleRequestStatusResponse, RoleRequestsListResponse,
    RoleRequestEntry, ReviewRoleRequest
};
use crate::state::AppState;
use tonic::metadata::MetadataValue;

fn add_auth_header<T>(request: &mut tonic::Request<T>, headers: &HeaderMap) {
    if let Some(auth_header) = headers.get("authorization") {
        if let Ok(val) = auth_header.to_str() {
            if let Ok(metadata_val) = val.parse::<MetadataValue<tonic::metadata::Ascii>>() {
                request.metadata_mut().insert("authorization", metadata_val);
            }
        }
    }
}

fn map_grpc_profile(p: crate::grpc::user::Profile) -> ProfileResponse {
    ProfileResponse {
        id: p.id,
        profile_picture_url: p.profile_picture_url,
        roles: p.roles,
        permissions: p.permissions,
        theme: p.theme.map(|t| ThemeSchema {
            is_preset: t.is_preset,
            name: t.name,
            colors: t.colors,
            font_main: t.font_main,
        }),
        created_at: p.created_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
        updated_at: p.updated_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/user/profile",
    operation_id = "create_profile",
    request_body = CreateProfileRequest,
    responses(
        (status = 201, description = "Profile created", body = ProfileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_profile_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<CreateProfileRequest>,
) -> Result<(axum::http::StatusCode, Json<ProfileResponse>), AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::CreateProfileRequest {
        id: payload.id,
    });
    add_auth_header(&mut request, &headers);

    let response = client.create_profile(request).await?.into_inner();
    Ok((axum::http::StatusCode::CREATED, Json(map_grpc_profile(response))))
}

#[utoipa::path(
    get,
    path = "/api/v1/user/profile/{id}",
    operation_id = "get_profile",
    params(
        ("id" = String, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "Profile found", body = ProfileResponse),
        (status = 404, description = "Profile not found"),
        (status = 502, description = "Downstream service error")
    )
)]
pub async fn get_profile_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    let request = tonic::Request::new(crate::grpc::user::GetProfileRequest { id });

    let response = client.get_profile(request).await?.into_inner();
    Ok(Json(map_grpc_profile(response)))
}

#[utoipa::path(
    put,
    path = "/api/v1/user/profile",
    operation_id = "update_profile",
    request_body = UpdateProfileRequest,
    responses(
        (status = 200, description = "Profile updated", body = ProfileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_profile_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    // Note: The user ID is retrieved from the token by the user service itself
    let mut request = tonic::Request::new(crate::grpc::user::UpdateProfileRequest {
        id: "".into(), // Will be ignored by service because it uses token
        profile_picture_url: payload.profile_picture_url,
    });
    add_auth_header(&mut request, &headers);

    let response = client.update_profile(request).await?.into_inner();
    Ok(Json(map_grpc_profile(response)))
}

#[utoipa::path(
    put,
    path = "/api/v1/user/profile/theme",
    operation_id = "update_theme",
    request_body = UpdateThemeRequest,
    responses(
        (status = 200, description = "Theme updated", body = ProfileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_theme_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<UpdateThemeRequest>,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::UpdateThemeRequest {
        id: "".into(),
        theme: Some(crate::grpc::user::Theme {
            is_preset: payload.theme.is_preset,
            name: payload.theme.name,
            colors: payload.theme.colors,
            font_main: payload.theme.font_main,
        }),
    });
    add_auth_header(&mut request, &headers);

    let response = client.update_theme(request).await?.into_inner();
    Ok(Json(map_grpc_profile(response)))
}

#[utoipa::path(
    post,
    path = "/api/v1/user/profile/roles",
    operation_id = "assign_role",
    request_body = RoleRequest,
    responses(
        (status = 200, description = "Role assigned", body = ProfileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn assign_role_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<RoleRequest>,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::RoleRequest {
        id: payload.id,
        role_name: payload.role_name,
    });
    add_auth_header(&mut request, &headers);

    let response = client.assign_role(request).await?.into_inner();
    Ok(Json(map_grpc_profile(response)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/user/profile/roles",
    operation_id = "remove_role",
    request_body = RoleRequest,
    responses(
        (status = 200, description = "Role removed", body = ProfileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn remove_role_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<RoleRequest>,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::RoleRequest {
        id: payload.id,
        role_name: payload.role_name,
    });
    add_auth_header(&mut request, &headers);

    let response = client.remove_role(request).await?.into_inner();
    Ok(Json(map_grpc_profile(response)))
}

#[utoipa::path(
    get,
    path = "/api/v1/user/permissions",
    operation_id = "list_permissions",
    responses(
        (status = 200, description = "List of permissions", body = PermissionListResponse),
        (status = 502, description = "Downstream service error")
    )
)]
pub async fn list_permissions_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<PermissionListResponse>, AppError> {
    let mut client = state.user_client.clone();
    let request = tonic::Request::new(());
    let response = client.list_available_permissions(request).await?.into_inner();
    Ok(Json(PermissionListResponse { permissions: response.permissions }))
}

#[utoipa::path(
    post,
    path = "/api/v1/user/role-requests",
    operation_id = "create_role_request",
    request_body = RoleChangeRequest,
    responses(
        (status = 201, description = "Request created", body = RoleRequestStatusResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_role_request_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<RoleChangeRequest>,
) -> Result<(axum::http::StatusCode, Json<RoleRequestStatusResponse>), AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::RoleChangeRequest {
        id: "".into(),
        requested_role: payload.requested_role,
        reason: payload.reason,
    });
    add_auth_header(&mut request, &headers);

    let response = client.create_role_request(request).await?.into_inner();
    Ok((axum::http::StatusCode::CREATED, Json(RoleRequestStatusResponse {
        request_id: response.request_id,
        status: response.status,
    })))
}

#[utoipa::path(
    get,
    path = "/api/v1/user/role-requests",
    operation_id = "list_role_requests",
    responses(
        (status = 200, description = "List of pending requests", body = RoleRequestsListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_role_requests_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<RoleRequestsListResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(());
    add_auth_header(&mut request, &headers);

    let response = client.list_pending_role_requests(request).await?.into_inner();
    let requests = response.requests.into_iter().map(|e| RoleRequestEntry {
        request_id: e.request_id,
        user_id: e.id,
        requested_role: e.requested_role,
        reason: e.reason,
        created_at: e.created_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
    }).collect();

    Ok(Json(RoleRequestsListResponse { requests }))
}

#[utoipa::path(
    post,
    path = "/api/v1/user/role-requests/review",
    operation_id = "review_role_request",
    request_body = ReviewRoleRequest,
    responses(
        (status = 200, description = "Request reviewed", body = ProfileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn review_role_request_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<ReviewRoleRequest>,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::ReviewRequest {
        request_id: payload.request_id,
        approve: payload.approve,
        rejection_reason: payload.rejection_reason,
    });
    add_auth_header(&mut request, &headers);

    let response = client.review_role_request(request).await?.into_inner();
    Ok(Json(map_grpc_profile(response)))
}

#[utoipa::path(
    post,
    path = "/api/v1/user/profile/picture",
    operation_id = "upload_profile_picture",
    responses(
        (status = 200, description = "Picture uploaded", body = ProfileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn upload_profile_picture_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    
    let mut image_data = Vec::new();
    let mut extension = String::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::Internal(e.to_string()))? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "image" {
            let content_type = field.content_type().unwrap_or_default().to_string();
            extension = content_type.split('/').last().unwrap_or("png").to_string();
            image_data = field.bytes().await.map_err(|e| AppError::Internal(e.to_string()))?.to_vec();
        }
    }

    if image_data.is_empty() {
        return Err(AppError::Internal("No image data provided".into()));
    }

    let mut request = tonic::Request::new(crate::grpc::user::UploadProfilePictureRequest {
        id: "".into(),
        image_data,
        extension,
    });
    add_auth_header(&mut request, &headers);

    let response = client.upload_profile_picture(request).await?.into_inner();
    Ok(Json(map_grpc_profile(response)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/user/profile",
    operation_id = "delete_profile",
    responses(
        (status = 204, description = "Profile deleted"),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_profile_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<axum::http::StatusCode, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::DeleteProfileRequest {
        id: "".into(), // Will be ignored by service because it uses token
    });
    add_auth_header(&mut request, &headers);

    client.delete_profile(request).await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}
