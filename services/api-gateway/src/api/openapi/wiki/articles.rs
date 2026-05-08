use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

// --- SHARED ---

#[derive(Serialize, Deserialize, ToSchema)]
pub struct NodeBreadcrumbResponse {
    pub id: i32,
    pub title: String,
}

#[derive(Serialize, Deserialize, ToSchema, Clone)]
pub enum NodeType {
    Unspecified = 0,
    Article = 1,
    Notion = 2,
    Question = 3,
}

impl From<i32> for NodeType {
    fn from(v: i32) -> Self {
        match v {
            1 => NodeType::Article,
            2 => NodeType::Notion,
            3 => NodeType::Question,
            _ => NodeType::Unspecified,
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct NodeResponse {
    pub id: i32,
    pub parent_id: Option<i32>,
    pub node_type: NodeType,
    pub current_version_id: i32,
    pub order_index: i32,
    pub title: String,
    pub content: String,
    pub created_at: Option<String>,
    pub author: i32,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct VersionResponse {
    pub version_id: i32,
    pub node_id: i32,
    pub title: String,
    pub content: String,
    pub status: String,
    pub created_at: Option<String>,
    pub author: i32,
    pub activated_at: Option<String>,
}

// --- REQUESTS ---

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CreateNodeRequest {
    pub parent_id: Option<i32>,
    pub node_type: NodeType,
    pub title: String,
    pub content: String,
    pub order_index: i32,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CreateArticleRequest {
    pub article_node: CreateNodeRequest,
    pub children: Vec<CreateNodeRequest>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateNodeRequest {
    pub node_id: i32,
    pub title: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct AssignParentRequest {
    pub new_parent: i32,
    pub child: i32,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ModerateVersionRequest {
    pub version_id: i32,
}

// --- RESPONSES ---

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ContributorResponse {
    pub id: i32,
    pub username: String,
    pub profile_picture_url: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ArticleResponse {
    pub article_node: NodeResponse,
    pub sub_articles: Vec<NodeBreadcrumbResponse>,
    pub notions: Vec<NodeResponse>,
    pub questions: Vec<NodeResponse>,
    pub lineage: Vec<NodeBreadcrumbResponse>,
    pub contributors: Vec<ContributorResponse>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct GetHistoryResponse {
    pub versions: Vec<VersionResponse>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct PendingVersionsResponse {
    pub versions: Vec<VersionResponse>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct GetRootArticlesResponse {
    pub articles: Vec<NodeBreadcrumbResponse>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct SearchResponse {
    pub results: Vec<NodeBreadcrumbResponse>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct DeleteResponse {
    pub message: String,
}
