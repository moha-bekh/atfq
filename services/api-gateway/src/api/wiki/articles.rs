use axum::{extract::{State, Path, Query}, Json, http::HeaderMap};
use std::sync::Arc;
use crate::error::AppError;
use crate::state::AppState;
use crate::api::openapi::wiki::articles::*;
use tonic::metadata::MetadataValue;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
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

fn map_version(v: crate::grpc::wiki::Version) -> VersionResponse {
    VersionResponse {
        version_id: v.version_id,
        node_id: v.node_id,
        title: v.title,
        content: v.content,
        status: v.status,
        created_at: v.created_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
        author: v.author,
        activated_at: v.activated_at.map(|t| format!("{}.{}", t.seconds, t.nanos)),
    }
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
    
    let articles = response.articles.into_iter().map(|a| NodeBreadcrumbResponse {
        id: a.id,
        title: a.title,
    }).collect();

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
    let mut client = state.wiki_client.clone();
    
    let article_node = Some(crate::grpc::wiki::CreateNodeRequest {
        parent_id: payload.article_node.parent_id,
        r#type: payload.article_node.node_type as i32,
        title: payload.article_node.title,
        content: payload.article_node.content,
        order_index: payload.article_node.order_index,
        metadata: None,
    });

    let children = payload.children.into_iter().map(|c| crate::grpc::wiki::CreateNodeRequest {
        parent_id: c.parent_id,
        r#type: c.node_type as i32,
        title: c.title,
        content: c.content,
        order_index: c.order_index,
        metadata: None,
    }).collect();

    let mut request = tonic::Request::new(crate::grpc::wiki::CreateArticleRequest {
        article_node,
        children,
    });
    add_auth_header(&mut request, &headers);

    let response = client.create_article(request).await?.into_inner();
    
    Ok((axum::http::StatusCode::CREATED, Json(ArticleResponse {
        article_node: map_node(response.article_node.unwrap()),
        sub_articles: response.sub_articles.into_iter().map(|a| NodeBreadcrumbResponse { id: a.id, title: a.title }).collect(),
        notions: response.notions.into_iter().map(map_node).collect(),
        questions: response.questions.into_iter().map(map_node).collect(),
        lineage: response.lineage.into_iter().map(|a| NodeBreadcrumbResponse { id: a.id, title: a.title }).collect(),
        contributors: response.contributors,
    })))
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
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::CreateNodeRequest {
        parent_id: payload.parent_id,
        r#type: payload.node_type as i32,
        title: payload.title,
        content: payload.content,
        order_index: payload.order_index,
        metadata: None,
    });
    add_auth_header(&mut request, &headers);

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

    let response = client.get_article(request).await?.into_inner();
    Ok(Json(ArticleResponse {
        article_node: map_node(response.article_node.unwrap()),
        sub_articles: response.sub_articles.into_iter().map(|a| NodeBreadcrumbResponse { id: a.id, title: a.title }).collect(),
        notions: response.notions.into_iter().map(map_node).collect(),
        questions: response.questions.into_iter().map(map_node).collect(),
        lineage: response.lineage.into_iter().map(|a| NodeBreadcrumbResponse { id: a.id, title: a.title }).collect(),
        contributors: response.contributors,
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
    let mut request = tonic::Request::new(crate::grpc::wiki::UpdateNodeRequest {
        node_id: payload.node_id,
        title: payload.title,
        content: payload.content,
        metadata: None,
    });
    add_auth_header(&mut request, &headers);

    let response = client.update_node(request).await?.into_inner();
    Ok(Json(map_version(response)))
}

#[utoipa::path(
    delete,
    path = "/api/v1/wiki/nodes/{id}",
    operation_id = "delete_node",
    params(
        ("id" = i32, Path, description = "Node ID")
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
) -> Result<Json<DeleteResponse>, AppError> {
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::DeleteNodeRequest { node_id: id });
    add_auth_header(&mut request, &headers);

    let response = client.delete_node(request).await?.into_inner();
    Ok(Json(DeleteResponse { message: response.message }))
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
    let mut client = state.wiki_client.clone();
    let mut request = tonic::Request::new(crate::grpc::wiki::AssignParentRequest {
        new_parent: payload.new_parent,
        child: payload.child,
    });
    add_auth_header(&mut request, &headers);

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
    add_auth_header(&mut request, &headers);

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
    add_auth_header(&mut request, &headers);

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
    let mut request = tonic::Request::new(crate::grpc::wiki::SearchRequest {
        query: query.q,
    });
    add_auth_header(&mut request, &headers);

    let response = client.search_articles(request).await?.into_inner();
    Ok(Json(SearchResponse {
        results: response.results.into_iter().map(|a| NodeBreadcrumbResponse { id: a.id, title: a.title }).collect(),
    }))
}
