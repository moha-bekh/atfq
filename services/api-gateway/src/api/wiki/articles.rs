use crate::api::openapi::wiki::articles::*;
use crate::error::AppError;
use crate::state::AppState;
use axum::{
    Json,
    extract::{Path, Query, State},
    http::HeaderMap,
};
use jsonwebtoken::{DecodingKey, Validation, decode};
use serde::Deserialize;
use sqlx::Row;
use std::sync::Arc;
use tonic::metadata::MetadataValue;

const RESOURCES_MARKER: &str = "\n\n<!-- ATFQ_RESOURCES:";
const RESOURCES_MARKER_END: &str = " -->";

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

#[derive(Deserialize)]
pub struct DeleteNodeQuery {
    pub mode: Option<String>,
    pub new_parent: Option<i32>,
}

#[derive(Deserialize)]
struct TokenClaims {
    sub: String,
    typ: String,
}

fn legacy_wiki_user_id(user_id: &str) -> i32 {
    let hex: String = user_id
        .chars()
        .filter(|c| c.is_ascii_hexdigit())
        .take(7)
        .collect();
    i32::from_str_radix(&hex, 16).unwrap_or(1).max(1)
}

fn current_user_id_from_headers(headers: &HeaderMap) -> Option<String> {
    let auth_header = headers.get("authorization")?.to_str().ok()?;
    let token = auth_header.strip_prefix("Bearer ")?;
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "jwt_secret".to_string());
    let data = decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )
    .ok()?;

    (data.claims.typ == "access").then_some(data.claims.sub)
}

async fn touch_user_presence(state: &Arc<AppState>, user_id: &str) {
    if let Some(user_db) = &state.user_db {
        let _ = sqlx::query(
            "UPDATE profiles SET last_seen_at = NOW(), updated_at = NOW() WHERE id = $1::uuid",
        )
        .bind(user_id)
        .execute(user_db)
        .await;
    }
}

async fn require_wiki_admin(state: &Arc<AppState>, user_id: &str) -> Result<(), AppError> {
    let Some(user_db) = &state.user_db else {
        return Err(AppError::Grpc(tonic::Status::permission_denied(
            "Admin role check is unavailable",
        )));
    };

    let is_admin: bool = sqlx::query_scalar(
        r#"
        SELECT EXISTS (
            SELECT 1
            FROM profile_roles
            WHERE profile_id = $1::uuid AND role_name = 'admin'
        )
        "#,
    )
    .bind(user_id)
    .fetch_one(user_db)
    .await
    .map_err(|e| AppError::Internal(format!("Failed to check admin role: {}", e)))?;

    if !is_admin {
        return Err(AppError::Grpc(tonic::Status::permission_denied(
            "Only admins can delete wiki articles",
        )));
    }

    Ok(())
}

fn add_auth_header<T>(request: &mut tonic::Request<T>, headers: &HeaderMap) {
    if let Some(auth_header) = headers.get("authorization") {
        if let Ok(val) = auth_header.to_str() {
            if let Ok(metadata_val) = val.parse::<MetadataValue<tonic::metadata::Ascii>>() {
                request.metadata_mut().insert("authorization", metadata_val);
            }

            if let Some(token) = val.strip_prefix("Bearer ") {
                let secret =
                    std::env::var("JWT_SECRET").unwrap_or_else(|_| "jwt_secret".to_string());
                if let Ok(data) = decode::<TokenClaims>(
                    token,
                    &DecodingKey::from_secret(secret.as_ref()),
                    &Validation::default(),
                ) {
                    if data.claims.typ == "access" {
                        let wiki_user_id = legacy_wiki_user_id(&data.claims.sub).to_string();
                        if let Ok(metadata_val) =
                            wiki_user_id.parse::<MetadataValue<tonic::metadata::Ascii>>()
                        {
                            request.metadata_mut().insert("x-user-id", metadata_val);
                        }
                    }
                }
            }
        }
    }
}

fn add_required_auth_header<T>(
    request: &mut tonic::Request<T>,
    headers: &HeaderMap,
) -> Result<(), AppError> {
    let auth_header = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing authorization header".into()))?;

    let metadata_val = auth_header
        .parse::<MetadataValue<tonic::metadata::Ascii>>()
        .map_err(|_| AppError::Unauthorized("Invalid authorization header".into()))?;
    request.metadata_mut().insert("authorization", metadata_val);

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::Unauthorized("Expected bearer token".into()))?;
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "jwt_secret".to_string());
    let data = decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized("Invalid or expired access token".into()))?;

    if data.claims.typ != "access" {
        return Err(AppError::Unauthorized("Expected access token".into()));
    }

    let wiki_user_id = legacy_wiki_user_id(&data.claims.sub).to_string();
    let metadata_val = wiki_user_id
        .parse::<MetadataValue<tonic::metadata::Ascii>>()
        .map_err(|_| AppError::Unauthorized("Invalid user id".into()))?;
    request.metadata_mut().insert("x-user-id", metadata_val);

    Ok(())
}

fn map_node(n: crate::grpc::wiki::Node) -> NodeResponse {
    NodeResponse {
        id: n.id,
        parent_id: n.parent_id,
        node_type: NodeType::from(n.r#type),
        current_version_id: n.current_version_id,
        order_index: n.order_index,
        title: n.title,
        content: n.content,
        created_at: n.created_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
        author: n.author,
    }
}

fn clean_resources(resources: &[ResourceEntry]) -> Vec<ResourceEntry> {
    resources
        .iter()
        .filter_map(|resource| {
            let label = resource.label.trim();
            let url = resource
                .url
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty());

            if label.is_empty() {
                return None;
            }

            Some(ResourceEntry {
                label: label.to_string(),
                url: url.map(ToOwned::to_owned),
            })
        })
        .collect()
}

fn append_resources_marker(content: &str, resources: &[ResourceEntry]) -> Result<String, AppError> {
    let resources = clean_resources(resources);

    if resources.is_empty() {
        return Err(AppError::Grpc(tonic::Status::invalid_argument(
            "at least one resource is required",
        )));
    }

    let json = serde_json::to_string(&resources)
        .map_err(|e| AppError::Internal(format!("Failed to serialize resources: {}", e)))?;
    Ok(format!(
        "{}{}{}{}",
        content.trim_end(),
        RESOURCES_MARKER,
        json,
        RESOURCES_MARKER_END
    ))
}

fn split_resources_marker(content: &str) -> (String, Vec<ResourceEntry>) {
    let Some(marker_start) = content.rfind(RESOURCES_MARKER) else {
        return (content.to_string(), Vec::new());
    };
    let marker_body_start = marker_start + RESOURCES_MARKER.len();
    let Some(relative_end) = content[marker_body_start..].find(RESOURCES_MARKER_END) else {
        return (content.to_string(), Vec::new());
    };
    let marker_end = marker_body_start + relative_end + RESOURCES_MARKER_END.len();

    if marker_end != content.len() {
        return (content.to_string(), Vec::new());
    }

    let json = &content[marker_body_start..marker_body_start + relative_end];
    let resources = serde_json::from_str::<Vec<ResourceEntry>>(json).unwrap_or_default();
    let visible_content = content[..marker_start].trim_end().to_string();

    (visible_content, clean_resources(&resources))
}

fn map_article_node_with_resources(
    node: crate::grpc::wiki::Node,
) -> (NodeResponse, Vec<ResourceEntry>) {
    let mut node_response = map_node(node);
    let (content, resources) = split_resources_marker(&node_response.content);
    node_response.content = content;
    (node_response, resources)
}

fn validate_create_node_payload(payload: &CreateNodeRequest) -> Result<(), AppError> {
    if payload.title.trim().is_empty() {
        return Err(AppError::Grpc(tonic::Status::invalid_argument(
            "title is required",
        )));
    }

    if payload.content.trim().is_empty() {
        return Err(AppError::Grpc(tonic::Status::invalid_argument(
            "content is required",
        )));
    }

    Ok(())
}

fn validate_create_article_payload(payload: &CreateArticleRequest) -> Result<(), AppError> {
    validate_create_node_payload(&payload.article_node)?;
    let resources = clean_resources(&payload.resources);

    if resources.is_empty() {
        return Err(AppError::Grpc(tonic::Status::invalid_argument(
            "at least one resource is required",
        )));
    }

    let has_notion = payload
        .children
        .iter()
        .any(|child| matches!(&child.node_type, NodeType::Notion));
    let has_question = payload
        .children
        .iter()
        .any(|child| matches!(&child.node_type, NodeType::Question));

    if !has_notion || !has_question {
        return Err(AppError::Grpc(tonic::Status::invalid_argument(
            "at least one notion and one key question are required",
        )));
    }

    for child in &payload.children {
        validate_create_node_payload(child)?;
    }

    Ok(())
}

fn map_version(v: crate::grpc::wiki::Version) -> VersionResponse {
    let requested_parent_id = v.metadata.as_ref().and_then(|metadata| {
        metadata
            .fields
            .get("requested_parent_id")
            .and_then(|value| match &value.kind {
                Some(prost_types::value::Kind::NumberValue(parent_id)) => Some(*parent_id as i32),
                _ => None,
            })
    });

    VersionResponse {
        version_id: v.version_id,
        node_id: v.node_id,
        title: v.title,
        content: v.content,
        status: v.status,
        created_at: v.created_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
        author: v.author,
        activated_at: v.activated_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
        requested_parent_id,
    }
}

fn build_update_metadata(requested_parent_id: Option<i32>) -> Option<prost_types::Struct> {
    requested_parent_id.map(|parent_id| {
        let mut metadata = prost_types::Struct::default();
        metadata.fields.insert(
            "requested_parent_id".to_string(),
            prost_types::Value {
                kind: Some(prost_types::value::Kind::NumberValue(parent_id as f64)),
            },
        );
        metadata
    })
}

fn parse_contributor_id(label: &str) -> Option<i32> {
    label
        .split_whitespace()
        .last()
        .and_then(|value| value.parse::<i32>().ok())
}

async fn resolve_contributors(
    state: &Arc<AppState>,
    contributors: Vec<String>,
    current_user_id: Option<&str>,
) -> Vec<ContributorResponse> {
    let mut resolved = Vec::with_capacity(contributors.len());

    for contributor in contributors {
        let contributor_id = parse_contributor_id(&contributor).unwrap_or_default();
        let mut entry = ContributorResponse {
            id: contributor_id,
            user_id: None,
            username: contributor.clone(),
            profile_picture_url: None,
            friendship_status: None,
            is_friend: false,
            is_online: false,
        };

        if let (Some(auth_db), Some(user_db)) = (&state.auth_db, &state.user_db) {
            if let Ok(users) = sqlx::query("SELECT id::text AS id, username FROM users")
                .fetch_all(auth_db)
                .await
            {
                if let Some(user) = users.into_iter().find(|row| {
                    let id: String = row.get("id");
                    legacy_wiki_user_id(&id) == contributor_id
                }) {
                    let user_id: String = user.get("id");
                    entry.username = user.get("username");
                    entry.user_id = Some(user_id.clone());

                    if let Ok(profile) =
                        sqlx::query("SELECT profile_picture_url, last_seen_at FROM profiles WHERE id = $1::uuid")
                            .bind(&user_id)
                            .fetch_optional(user_db)
                            .await
                    {
                        if let Some(profile) = profile {
                            entry.profile_picture_url = profile.get("profile_picture_url");
                            let last_seen_at: Option<chrono::DateTime<chrono::Utc>> =
                                profile.get("last_seen_at");
                            entry.is_online = last_seen_at
                                .map(|seen_at| {
                                    chrono::Utc::now()
                                        .signed_duration_since(seen_at)
                                        .num_seconds()
                                        <= 120
                                })
                                .unwrap_or(false);
                        }
                    }

                    if let Some(current_user_id) = current_user_id {
                        if current_user_id != user_id {
                            entry.friendship_status = sqlx::query_scalar::<_, String>(
                                r#"
                                SELECT status FROM friendships
                                WHERE (
                                    (requester_id = $1::uuid AND addressee_id = $2::uuid)
                                    OR (requester_id = $2::uuid AND addressee_id = $1::uuid)
                                )
                                LIMIT 1
                                "#,
                            )
                            .bind(current_user_id)
                            .bind(&user_id)
                            .fetch_optional(user_db)
                            .await
                            .ok()
                            .flatten();
                            entry.is_friend =
                                entry.friendship_status.as_deref() == Some("accepted");
                        }
                    }
                }
            }
        }

        resolved.push(entry);
    }

    resolved
}

#[utoipa::path(
    get,
    path = "/api/v1/wiki/root-articles",
    operation_id = "get_root_articles",
    responses(
        (status = 200, description = "Root articles found", body = GetRootArticlesResponse),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_root_articles_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<GetRootArticlesResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let request = tonic::Request::new(crate::grpc::wiki::GetRootArticlesRequest {});

    let response = client.get_root_articles(request).await?.into_inner();

    let articles = response
        .articles
        .into_iter()
        .map(|a| NodeBreadcrumbResponse {
            id: a.id,
            title: a.title,
        })
        .collect();

    Ok(Json(GetRootArticlesResponse { articles }))
}

#[utoipa::path(
    post,
    path = "/api/v1/wiki/articles",
    operation_id = "create_article",
    request_body = CreateArticleRequest,
    responses(
        (status = 201, description = "Article created", body = ArticleResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_article_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<CreateArticleRequest>,
) -> Result<(axum::http::StatusCode, Json<ArticleResponse>), AppError> {
    validate_create_article_payload(&payload)?;

    let mut client = state.wiki_client.clone();
    let article_content =
        append_resources_marker(&payload.article_node.content, &payload.resources)?;

    let article_node = Some(crate::grpc::wiki::CreateNodeRequest {
        parent_id: payload.article_node.parent_id,
        r#type: payload.article_node.node_type as i32,
        title: payload.article_node.title,
        content: article_content,
        order_index: payload.article_node.order_index,
        metadata: None,
    });

    let children = payload
        .children
        .into_iter()
        .map(|c| crate::grpc::wiki::CreateNodeRequest {
            parent_id: c.parent_id,
            r#type: c.node_type as i32,
            title: c.title,
            content: c.content,
            order_index: c.order_index,
            metadata: None,
        })
        .collect();

    let mut request = tonic::Request::new(crate::grpc::wiki::CreateArticleRequest {
        article_node,
        children,
    });
    add_required_auth_header(&mut request, &headers)?;
    let current_user_id = current_user_id_from_headers(&headers);
    if let Some(user_id) = current_user_id.as_deref() {
        touch_user_presence(&state, user_id).await;
    }

    let response = client.create_article(request).await?.into_inner();
    let contributors =
        resolve_contributors(&state, response.contributors, current_user_id.as_deref()).await;
    let (article_node, resources) = map_article_node_with_resources(response.article_node.unwrap());

    Ok((
        axum::http::StatusCode::CREATED,
        Json(ArticleResponse {
            article_node,
            sub_articles: response
                .sub_articles
                .into_iter()
                .map(|a| NodeBreadcrumbResponse {
                    id: a.id,
                    title: a.title,
                })
                .collect(),
            notions: response.notions.into_iter().map(map_node).collect(),
            questions: response.questions.into_iter().map(map_node).collect(),
            lineage: response
                .lineage
                .into_iter()
                .map(|a| NodeBreadcrumbResponse {
                    id: a.id,
                    title: a.title,
                })
                .collect(),
            contributors,
            resources,
        }),
    ))
}

#[utoipa::path(
    post,
    path = "/api/v1/wiki/nodes",
    operation_id = "create_node",
    request_body = CreateNodeRequest,
    responses(
        (status = 201, description = "Node created", body = NodeResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn create_node_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<CreateNodeRequest>,
) -> Result<(axum::http::StatusCode, Json<NodeResponse>), AppError> {
    validate_create_node_payload(&payload)?;

    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::CreateNodeRequest {
        parent_id: payload.parent_id,
        r#type: payload.node_type as i32,
        title: payload.title,
        content: payload.content,
        order_index: payload.order_index,
        metadata: None,
    });
    add_required_auth_header(&mut request, &headers)?;

    let response = client.create_node(request).await?.into_inner();
    Ok((axum::http::StatusCode::CREATED, Json(map_node(response))))
}

#[utoipa::path(
    get,
    path = "/api/v1/wiki/articles/{id}",
    operation_id = "get_article",
    params(
        ("id" = i32, Path, description = "Article Node ID")
    ),
    responses(
        (status = 200, description = "Article found", body = ArticleResponse),
        (status = 404, description = "Article not found"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_article_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<i32>,
) -> Result<Json<ArticleResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::GetArticleRequest { id });
    add_auth_header(&mut request, &headers);
    let current_user_id = current_user_id_from_headers(&headers);
    if let Some(user_id) = current_user_id.as_deref() {
        touch_user_presence(&state, user_id).await;
    }

    let response = client.get_article(request).await?.into_inner();
    let contributors =
        resolve_contributors(&state, response.contributors, current_user_id.as_deref()).await;
    let (article_node, resources) = map_article_node_with_resources(response.article_node.unwrap());
    Ok(Json(ArticleResponse {
        article_node,
        sub_articles: response
            .sub_articles
            .into_iter()
            .map(|a| NodeBreadcrumbResponse {
                id: a.id,
                title: a.title,
            })
            .collect(),
        notions: response.notions.into_iter().map(map_node).collect(),
        questions: response.questions.into_iter().map(map_node).collect(),
        lineage: response
            .lineage
            .into_iter()
            .map(|a| NodeBreadcrumbResponse {
                id: a.id,
                title: a.title,
            })
            .collect(),
        contributors,
        resources,
    }))
}

#[utoipa::path(
    put,
    path = "/api/v1/wiki/nodes",
    operation_id = "update_node",
    request_body = UpdateNodeRequest,
    responses(
        (status = 200, description = "Node update pending", body = VersionResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn update_node_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<UpdateNodeRequest>,
) -> Result<Json<VersionResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let content = if let Some(resources) = &payload.resources {
        append_resources_marker(&payload.content, resources)?
    } else {
        payload.content
    };
    let mut request = tonic::Request::new(crate::grpc::wiki::UpdateNodeRequest {
        node_id: payload.node_id,
        title: payload.title,
        content,
        metadata: build_update_metadata(payload.requested_parent_id),
    });
    add_required_auth_header(&mut request, &headers)?;

    let response = client.update_node(request).await?.into_inner();
    Ok(Json(map_version(response)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/wiki/nodes/{id}",
    operation_id = "delete_node",
    params(
        ("id" = i32, Path, description = "Node ID"),
        ("mode" = Option<String>, Query, description = "delete_branch or reassign_children"),
        ("new_parent" = Option<i32>, Query, description = "Target parent for reassign_children. Use 0 for root.")
    ),
    responses(
        (status = 200, description = "Node deleted", body = DeleteResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_node_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<i32>,
    Query(query): Query<DeleteNodeQuery>,
) -> Result<Json<DeleteResponse>, AppError> {
    let user_id = current_user_id_from_headers(&headers)
        .ok_or_else(|| AppError::Unauthorized("Invalid or missing access token".into()))?;
    require_wiki_admin(&state, &user_id).await?;

    let mut client = state.wiki_client.clone();
    let mode = query.mode.as_deref().unwrap_or("delete_branch");

    if mode == "reassign_children" {
        let response = client
            .get_article(tonic::Request::new(crate::grpc::wiki::GetArticleRequest {
                id,
            }))
            .await?
            .into_inner();
        let fallback_parent = response.article_node.and_then(|node| node.parent_id).unwrap_or(0);
        let new_parent = query.new_parent.unwrap_or(fallback_parent);

        for child in response.sub_articles {
            client
                .assign_parent(tonic::Request::new(crate::grpc::wiki::AssignParentRequest {
                    new_parent,
                    child: child.id,
                }))
                .await?;
        }
    } else if mode != "delete_branch" {
        return Err(AppError::Grpc(tonic::Status::invalid_argument(
            "Unsupported delete mode",
        )));
    }

    let mut request = tonic::Request::new(crate::grpc::wiki::DeleteNodeRequest { node_id: id });
    add_required_auth_header(&mut request, &headers)?;

    let response = client.delete_node(request).await?.into_inner();
    Ok(Json(DeleteResponse {
        message: response.message,
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/wiki/nodes/assign-parent",
    operation_id = "assign_parent",
    request_body = AssignParentRequest,
    responses(
        (status = 200, description = "Parent assigned", body = NodeResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn assign_parent_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<AssignParentRequest>,
) -> Result<Json<NodeResponse>, AppError> {
    let user_id = current_user_id_from_headers(&headers)
        .ok_or_else(|| AppError::Unauthorized("Invalid or missing access token".into()))?;
    require_wiki_admin(&state, &user_id).await?;

    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::AssignParentRequest {
        new_parent: payload.new_parent,
        child: payload.child,
    });
    add_required_auth_header(&mut request, &headers)?;

    let response = client.assign_parent(request).await?.into_inner();
    Ok(Json(map_node(response)))
}

#[utoipa::path(
    get,
    path = "/api/v1/wiki/nodes/{id}/history",
    operation_id = "get_history",
    params(
        ("id" = i32, Path, description = "Node ID")
    ),
    responses(
        (status = 200, description = "History found", body = GetHistoryResponse),
        (status = 404, description = "Node not found"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_history_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<i32>,
) -> Result<Json<GetHistoryResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::GetHistoryRequest { node_id: id });
    add_auth_header(&mut request, &headers);

    let response = client.get_history(request).await?.into_inner();
    Ok(Json(GetHistoryResponse {
        versions: response.versions.into_iter().map(map_version).collect(),
    }))
}

#[utoipa::path(
    get,
    path = "/api/v1/wiki/nodes/{id}/pending",
    operation_id = "get_pending",
    params(
        ("id" = i32, Path, description = "Node ID")
    ),
    responses(
        (status = 200, description = "Pending versions found", body = PendingVersionsResponse),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_pending_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<i32>,
) -> Result<Json<PendingVersionsResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::GetPendingRequest { node_id: id });
    add_auth_header(&mut request, &headers);

    let response = client.get_pending(request).await?.into_inner();
    Ok(Json(PendingVersionsResponse {
        versions: response.versions.into_iter().map(map_version).collect(),
    }))
}

#[utoipa::path(
    get,
    path = "/api/v1/wiki/pending",
    operation_id = "get_all_pending",
    responses(
        (status = 200, description = "All pending versions found", body = PendingVersionsResponse),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_all_pending_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<PendingVersionsResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::GetAllPendingRequest {});
    add_auth_header(&mut request, &headers);

    let response = client.get_all_pending(request).await?.into_inner();
    Ok(Json(PendingVersionsResponse {
        versions: response.versions.into_iter().map(map_version).collect(),
    }))
}

#[utoipa::path(
    post,
    path = "/api/v1/wiki/moderation/approve",
    operation_id = "approve_version",
    request_body = ModerateVersionRequest,
    responses(
        (status = 200, description = "Version approved", body = NodeResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn approve_version_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<ModerateVersionRequest>,
) -> Result<Json<NodeResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::ModerateVersionRequest {
        version_id: payload.version_id,
    });
    add_required_auth_header(&mut request, &headers)?;

    let response = client.approve_version(request).await?.into_inner();
    Ok(Json(map_node(response)))
}

#[utoipa::path(
    post,
    path = "/api/v1/wiki/moderation/reject",
    operation_id = "reject_version",
    request_body = ModerateVersionRequest,
    responses(
        (status = 200, description = "Version rejected", body = NodeResponse),
        (status = 401, description = "Unauthorized"),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn reject_version_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<ModerateVersionRequest>,
) -> Result<Json<NodeResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::ModerateVersionRequest {
        version_id: payload.version_id,
    });
    add_required_auth_header(&mut request, &headers)?;

    let response = client.reject_version(request).await?.into_inner();
    Ok(Json(map_node(response)))
}

#[utoipa::path(
    get,
    path = "/api/v1/wiki/search",
    operation_id = "search_articles",
    params(
        ("q" = String, Query, description = "Search query")
    ),
    responses(
        (status = 200, description = "Search results found", body = SearchResponse),
        (status = 502, description = "Downstream service error")
    ),
    security(("bearer_auth" = []))
)]
pub async fn search_articles_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(query): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::SearchRequest { query: query.q });
    add_auth_header(&mut request, &headers);

    let response = client.search_articles(request).await?.into_inner();
    Ok(Json(SearchResponse {
        results: response
            .results
            .into_iter()
            .map(|a| NodeBreadcrumbResponse {
                id: a.id,
                title: a.title,
            })
            .collect(),
    }))
}
