use crate::api::openapi::user::profile::{
    CreateProfileRequest, FriendListResponse, FriendTargetRequest, FriendshipResponse,
    PermissionListResponse, PresenceResponse, ProfileResponse, ReviewRoleRequest,
    RoleChangeRequest, RoleRequest, RoleRequestEntry, RoleRequestStatusResponse,
    RoleRequestsListResponse, ThemeSchema, UpdateProfileRequest, UpdateThemeRequest,
    UserSearchResponse, UserSearchResult,
};
use crate::error::AppError;
use crate::state::AppState;
use axum::{
    Json,
    extract::{Multipart, Path, Query, State},
    http::HeaderMap,
};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tonic::metadata::MetadataValue;

#[derive(Serialize)]
struct InternalTokenClaims {
    sub: String,
    iat: usize,
    exp: usize,
    jti: String,
    typ: String,
}

#[derive(Deserialize)]
struct AccessTokenClaims {
    sub: String,
    typ: String,
}

#[derive(Deserialize)]
pub struct UserSearchQuery {
    q: String,
}

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
            font_display: t.font_display,
        }),
        created_at: p.created_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
        updated_at: p.updated_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
        is_online: p.is_online,
        last_seen_at: p.last_seen_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
    }
}

fn make_internal_access_token(user_id: &str) -> Result<String, AppError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Internal(format!("System clock error: {}", e)))?
        .as_secs() as usize;
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "jwt_secret".to_string());

    encode(
        &Header::default(),
        &InternalTokenClaims {
            sub: user_id.to_string(),
            iat: now,
            exp: now + 60,
            jti: format!("gateway-role-request-{}-{}", user_id, now),
            typ: "access".to_string(),
        },
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .map_err(|e| AppError::Internal(format!("Failed to build internal auth token: {}", e)))
}

fn current_user_id_from_headers(headers: &HeaderMap) -> Result<String, AppError> {
    let auth_header = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing authorization header".into()))?;
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::Unauthorized("Expected bearer token".into()))?;
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "jwt_secret".to_string());
    let data = decode::<AccessTokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized("Invalid or expired access token".into()))?;

    if data.claims.typ != "access" {
        return Err(AppError::Unauthorized("Expected access token".into()));
    }

    Ok(data.claims.sub)
}

async fn resolve_user_identity(
    state: &Arc<AppState>,
    user_id: &str,
) -> (Option<String>, Option<String>) {
    let Ok(access_token) = make_internal_access_token(user_id) else {
        return (None, None);
    };

    let mut client = state.auth_client.clone();
    let request = tonic::Request::new(crate::grpc::auth::GetUserRequest { access_token });

    match client.get_user(request).await {
        Ok(response) => {
            let user = response.into_inner();
            (Some(user.username), Some(user.email))
        }
        Err(_) => (None, None),
    }
}

async fn map_role_request_entry(
    state: &Arc<AppState>,
    e: crate::grpc::user::role_requests_list::Entry,
) -> RoleRequestEntry {
    let user_id = e.id;
    let (user_username, user_email) = resolve_user_identity(state, &user_id).await;

    RoleRequestEntry {
        request_id: e.request_id,
        user_id,
        user_username,
        user_email,
        requested_role: e.requested_role,
        reason: e.reason,
        created_at: e.created_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
        status: e.status,
        rejection_reason: e.rejection_reason,
        updated_at: e.updated_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
    }
}

async fn map_friendship_response(
    state: &Arc<AppState>,
    friendship: crate::grpc::user::Friendship,
) -> FriendshipResponse {
    let (friend_username, friend_email) = resolve_user_identity(state, &friendship.friend_id).await;

    FriendshipResponse {
        can_accept: friendship.status == "pending" && friendship.addressee_id == friendship.user_id,
        user_id: friendship.user_id,
        friend_id: friendship.friend_id,
        requester_id: friendship.requester_id,
        addressee_id: friendship.addressee_id,
        friend_username,
        friend_email,
        profile_picture_url: friendship.profile_picture_url,
        status: friendship.status,
        is_online: friendship.is_online,
        last_seen_at: friendship
            .last_seen_at
            .map(|t| format!("{}.{}", t.seconds, t.nanos)),
        created_at: friendship
            .created_at
            .map(|t| format!("{}.{}", t.seconds, t.nanos)),
        accepted_at: friendship
            .accepted_at
            .map(|t| format!("{}.{}", t.seconds, t.nanos)),
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
    let mut request =
        tonic::Request::new(crate::grpc::user::CreateProfileRequest { id: payload.id });
    add_auth_header(&mut request, &headers);

    let response = client.create_profile(request).await?.into_inner();
    Ok((
        axum::http::StatusCode::CREATED,
        Json(map_grpc_profile(response)),
    ))
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
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_profile_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::GetProfileRequest { id });
    add_auth_header(&mut request, &headers);

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
            font_display: payload.theme.font_display,
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
    delete,
    path = "/api/v1/user/profile/roles/{role_name}",
    operation_id = "leave_role",
    params(
        ("role_name" = String, Path, description = "Role name")
    ),
    responses(
        (status = 200, description = "Role left", body = ProfileResponse),
        (status = 400, description = "Invalid request"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Role not assigned"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn leave_role_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(role_name): Path<String>,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::LeaveRoleRequest { role_name });
    add_auth_header(&mut request, &headers);

    let response = client.leave_role(request).await?.into_inner();
    Ok(Json(map_grpc_profile(response)))
}

#[utoipa::path(
    get,
    path = "/api/v1/user/permissions",
    operation_id = "list_permissions",
    responses(
        (status = 200, description = "List of permissions", body = PermissionListResponse),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_permissions_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<PermissionListResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(());
    add_auth_header(&mut request, &headers);
    let response = client
        .list_available_permissions(request)
        .await?
        .into_inner();
    Ok(Json(PermissionListResponse {
        permissions: response.permissions,
    }))
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
    Ok((
        axum::http::StatusCode::CREATED,
        Json(RoleRequestStatusResponse {
            request_id: response.request_id,
            status: response.status,
        }),
    ))
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

    let response = client
        .list_pending_role_requests(request)
        .await?
        .into_inner();
    let mut requests = Vec::with_capacity(response.requests.len());
    for entry in response.requests {
        requests.push(map_role_request_entry(&state, entry).await);
    }

    Ok(Json(RoleRequestsListResponse { requests }))
}

#[utoipa::path(
    get,
    path = "/api/v1/user/role-requests/history",
    operation_id = "list_all_role_requests",
    responses(
        (status = 200, description = "List of all role requests", body = RoleRequestsListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_all_role_requests_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<RoleRequestsListResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(());
    add_auth_header(&mut request, &headers);

    let response = client.list_all_role_requests(request).await?.into_inner();
    let mut requests = Vec::with_capacity(response.requests.len());
    for entry in response.requests {
        requests.push(map_role_request_entry(&state, entry).await);
    }

    Ok(Json(RoleRequestsListResponse { requests }))
}

#[utoipa::path(
    get,
    path = "/api/v1/user/role-requests/me",
    operation_id = "list_my_role_requests",
    responses(
        (status = 200, description = "List of current user's role requests", body = RoleRequestsListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_my_role_requests_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<RoleRequestsListResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(());
    add_auth_header(&mut request, &headers);

    let response = client.list_my_role_requests(request).await?.into_inner();
    let mut requests = Vec::with_capacity(response.requests.len());
    for entry in response.requests {
        requests.push(map_role_request_entry(&state, entry).await);
    }

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
    delete,
    path = "/api/v1/user/role-requests/{request_id}",
    operation_id = "cancel_role_request",
    params(
        ("request_id" = String, Path, description = "Role request ID")
    ),
    responses(
        (status = 200, description = "Request canceled", body = RoleRequestStatusResponse),
        (status = 400, description = "Invalid request"),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn cancel_role_request_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(request_id): Path<String>,
) -> Result<Json<RoleRequestStatusResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request =
        tonic::Request::new(crate::grpc::user::CancelRoleRequestRequest { request_id });
    add_auth_header(&mut request, &headers);

    let response = client.cancel_role_request(request).await?.into_inner();
    Ok(Json(RoleRequestStatusResponse {
        request_id: response.request_id,
        status: response.status,
    }))
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

    println!("Received multipart upload request");

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
    {
        let name = field.name().unwrap_or_default().to_string();
        println!("Processing field: {}", name);
        if name == "image" {
            let content_type = field.content_type().unwrap_or_default().to_string();
            println!("Field 'image' found. Content-Type: {}", content_type);
            extension = content_type.split('/').last().unwrap_or("png").to_string();
            image_data = field
                .bytes()
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?
                .to_vec();
            println!("Read {} bytes of image data", image_data.len());
        }
    }

    if image_data.is_empty() {
        println!("Error: No image data found in multipart request");
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
    path = "/api/v1/user/profile/picture",
    operation_id = "delete_profile_picture",
    responses(
        (status = 200, description = "Picture removed", body = ProfileResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_profile_picture_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<ProfileResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(());
    add_auth_header(&mut request, &headers);

    let response = client.remove_profile_picture(request).await?.into_inner();
    Ok(Json(map_grpc_profile(response)))
}

#[utoipa::path(
    post,
    path = "/api/v1/user/presence",
    operation_id = "touch_presence",
    responses(
        (status = 200, description = "Presence updated", body = PresenceResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn touch_presence_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<PresenceResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(());
    add_auth_header(&mut request, &headers);

    let response = client.touch_presence(request).await?.into_inner();
    Ok(Json(PresenceResponse {
        id: response.id,
        is_online: response.is_online,
        last_seen_at: response
            .last_seen_at
            .map(|t| format!("{}.{}", t.seconds, t.nanos)),
    }))
}

#[utoipa::path(
    get,
    path = "/api/v1/user/search",
    operation_id = "search_users",
    params(
        ("q" = String, Query, description = "Username or email search")
    ),
    responses(
        (status = 200, description = "Matching users", body = UserSearchResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn search_users_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(query): Query<UserSearchQuery>,
) -> Result<Json<UserSearchResponse>, AppError> {
    let current_user_id = current_user_id_from_headers(&headers)?;
    let search = query.q.trim();

    if search.len() < 2 {
        return Ok(Json(UserSearchResponse { users: Vec::new() }));
    }

    let Some(auth_db) = &state.auth_db else {
        return Ok(Json(UserSearchResponse { users: Vec::new() }));
    };

    let rows = sqlx::query(
        r#"
        SELECT id::text AS id, username, email
        FROM users
        WHERE id::text <> $1
        AND (username ILIKE $2 OR email ILIKE $2)
        ORDER BY username ASC
        LIMIT 10
        "#,
    )
    .bind(&current_user_id)
    .bind(format!("%{}%", search))
    .fetch_all(auth_db)
    .await
    .map_err(|e| AppError::Internal(format!("Database error searching users: {}", e)))?;

    use sqlx::Row;
    let mut users = Vec::with_capacity(rows.len());
    for row in rows {
        let id: String = row.get("id");
        let mut result = UserSearchResult {
            id: id.clone(),
            username: row.get("username"),
            email: row.get("email"),
            profile_picture_url: None,
            friendship_status: None,
            is_friend: false,
            is_online: false,
        };

        if let Some(user_db) = &state.user_db {
            if let Ok(profile) =
                sqlx::query("SELECT profile_picture_url, last_seen_at FROM profiles WHERE id = $1::uuid")
                    .bind(&id)
                    .fetch_optional(user_db)
                    .await
            {
                if let Some(profile) = profile {
                    result.profile_picture_url = profile.get("profile_picture_url");
                    let last_seen_at: Option<chrono::DateTime<chrono::Utc>> =
                        profile.get("last_seen_at");
                    result.is_online = last_seen_at
                        .map(|seen_at| {
                            chrono::Utc::now()
                                .signed_duration_since(seen_at)
                                .num_seconds()
                                <= 120
                        })
                        .unwrap_or(false);
                }
            }

            if let Ok(friendship) = sqlx::query(
                r#"
                SELECT status
                FROM friendships
                WHERE
                    (requester_id = $1::uuid AND addressee_id = $2::uuid)
                    OR (requester_id = $2::uuid AND addressee_id = $1::uuid)
                LIMIT 1
                "#,
            )
            .bind(&current_user_id)
            .bind(&id)
            .fetch_optional(user_db)
            .await
            {
                if let Some(friendship) = friendship {
                    let status: String = friendship.get("status");
                    result.is_friend = status == "accepted";
                    result.friendship_status = Some(status);
                }
            }
        }

        users.push(result);
    }

    Ok(Json(UserSearchResponse { users }))
}

#[utoipa::path(
    get,
    path = "/api/v1/user/friends",
    operation_id = "list_friends",
    responses(
        (status = 200, description = "Friend list", body = FriendListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_friends_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<FriendListResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(());
    add_auth_header(&mut request, &headers);

    let response = client.list_friends(request).await?.into_inner();
    let mut friends = Vec::with_capacity(response.friends.len());
    for friendship in response.friends {
        friends.push(map_friendship_response(&state, friendship).await);
    }

    Ok(Json(FriendListResponse { friends }))
}

#[utoipa::path(
    post,
    path = "/api/v1/user/friends",
    operation_id = "send_friend_request",
    request_body = FriendTargetRequest,
    responses(
        (status = 200, description = "Friend request created", body = FriendshipResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn send_friend_request_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<FriendTargetRequest>,
) -> Result<Json<FriendshipResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::FriendTargetRequest {
        target_id: payload.target_id,
    });
    add_auth_header(&mut request, &headers);

    let response = client.send_friend_request(request).await?.into_inner();
    Ok(Json(map_friendship_response(&state, response).await))
}

#[utoipa::path(
    put,
    path = "/api/v1/user/friends/{target_id}/accept",
    operation_id = "accept_friend_request",
    params(
        ("target_id" = String, Path, description = "Requester user ID")
    ),
    responses(
        (status = 200, description = "Friend request accepted", body = FriendshipResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn accept_friend_request_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(target_id): Path<String>,
) -> Result<Json<FriendshipResponse>, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::FriendTargetRequest { target_id });
    add_auth_header(&mut request, &headers);

    let response = client.accept_friend_request(request).await?.into_inner();
    Ok(Json(map_friendship_response(&state, response).await))
}

#[utoipa::path(
    delete,
    path = "/api/v1/user/friends/{target_id}",
    operation_id = "remove_friend",
    params(
        ("target_id" = String, Path, description = "Friend user ID")
    ),
    responses(
        (status = 204, description = "Friend removed"),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn remove_friend_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(target_id): Path<String>,
) -> Result<axum::http::StatusCode, AppError> {
    let mut client = state.user_client.clone();
    let mut request = tonic::Request::new(crate::grpc::user::FriendTargetRequest { target_id });
    add_auth_header(&mut request, &headers);

    client.remove_friend(request).await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
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
