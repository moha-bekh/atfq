use tonic::{transport::Server, Request, Response, Status, body::BoxBody};
use tonic_reflection::server::Builder;
use std::env;
use std::sync::Arc;
use std::task::{Context, Poll};
use dotenvy::dotenv;
use sqlx::postgres::{PgPool, PgPoolOptions};
use uuid::Uuid;
use serde_json::json;
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::primitives::ByteStream;
use serde::{Serialize, Deserialize};
use jsonwebtoken::{decode, DecodingKey, Validation};
use tower::{Layer, Service};
use futures_util::future::{BoxFuture, FutureExt};
use http::{Request as HttpRequest, Response as HttpResponse, HeaderValue};

pub mod user {
    pub mod v1 {
        tonic::include_proto!("user.v1");
        pub const FILE_DESCRIPTOR_SET: &[u8] = tonic::include_file_descriptor_set!("user_descriptor");
    }
}

use user::v1::user_service_server::{UserService, UserServiceServer};
use user::v1::{
    HelloRequest, HelloResponse, CreateProfileRequest, Profile, DeleteProfileRequest, 
    GetProfileRequest, UpdateProfileRequest, UpdateThemeRequest, RoleRequest, 
    PermissionList, RoleChangeRequest, RoleRequestStatus, RoleRequestsList, ReviewRequest, Theme,
    UploadProfilePictureRequest
};

// --- AUTH LOGIC ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenClaims {
    pub sub: String, // user_id
    pub exp: usize,
    pub typ: String,
}

pub struct AuthLayer {
    secret: String,
}

impl AuthLayer {
    pub fn new(secret: String) -> Self {
        Self { secret }
    }
}

impl<S> Layer<S> for AuthLayer {
    type Service = AuthService<S>;

    fn layer(&self, service: S) -> Self::Service {
        AuthService {
            inner: service,
            secret: self.secret.clone(),
        }
    }
}

#[derive(Clone)]
pub struct AuthService<S> {
    inner: S,
    secret: String,
}

impl<S> Service<HttpRequest<tonic::transport::Body>> for AuthService<S>
where
    S: Service<HttpRequest<tonic::transport::Body>, Response = HttpResponse<BoxBody>> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = HttpResponse<BoxBody>;
    type Error = S::Error;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: HttpRequest<tonic::transport::Body>) -> Self::Future {
        let mut inner = self.inner.clone();
        let secret = self.secret.clone();

        async move {
            let path = req.uri().path();
            
            // Liste des méthodes publiques (sans auth)
            let is_public = path.contains("SayHello") || path.contains("grpc.reflection");

            if is_public {
                return inner.call(req).await;
            }

            let auth_header = req.headers()
                .get("authorization")
                .and_then(|v: &HeaderValue| v.to_str().ok());

            if let Some(auth_header_str) = auth_header {
                if auth_header_str.starts_with("Bearer ") {
                    let token = &auth_header_str[7..];

                    let validation = Validation::default();
                    match decode::<TokenClaims>(
                        token,
                        &DecodingKey::from_secret(secret.as_ref()),
                        &validation,
                    ) {
                        Ok(data) => {
                            if data.claims.typ != "access" {
                                return Ok(status_to_http(Status::unauthenticated("Invalid token type")));
                            }
                            let mut req = req;
                            req.extensions_mut().insert(data.claims);
                            return inner.call(req).await;
                        }
                        Err(_) => {
                            return Ok(status_to_http(Status::unauthenticated("Invalid or expired token")));
                        }
                    }
                }
            }
            
            Ok(status_to_http(Status::unauthenticated("Missing or invalid authorization header")))
        }.boxed()
    }
}

fn status_to_http(status: Status) -> HttpResponse<BoxBody> {
    let mut res = HttpResponse::new(tonic::body::empty_body());
    res.headers_mut().insert("grpc-status", HeaderValue::from_str(&format!("{}", status.code() as i32)).unwrap());
    if !status.message().is_empty() {
         res.headers_mut().insert("grpc-message", HeaderValue::from_str(status.message()).unwrap());
    }
    res.headers_mut().insert("content-type", HeaderValue::from_static("application/grpc"));
    res
}

// --- SERVICE IMPLEMENTATION ---

pub struct MyUserService {
    pool: PgPool,
    s3_client: S3Client,
    bucket_name: String,
    s3_public_url: String,
}

impl MyUserService {
    pub fn new(pool: PgPool, s3_client: S3Client, bucket_name: String, s3_public_url: String) -> Self {
        Self { pool, s3_client, bucket_name, s3_public_url }
    }

    async fn fetch_full_profile(&self, user_id: Uuid) -> Result<Profile, Status> {
        let row = sqlx::query(
            r#"
            SELECT 
                p.id, p.profile_picture_url, p.theme, p.created_at, p.updated_at,
                COALESCE(array_agg(DISTINCT pr.role_name) FILTER (WHERE pr.role_name IS NOT NULL), '{}') as roles,
                COALESCE(array_agg(DISTINCT rp.permission_slug) FILTER (WHERE rp.permission_slug IS NOT NULL), '{}') as permissions
            FROM profiles p
            LEFT JOIN profile_roles pr ON p.id = pr.profile_id
            LEFT JOIN role_permissions rp ON pr.role_name = rp.role_name
            WHERE p.id = $1
            GROUP BY p.id
            "#
        )
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        match row {
            Some(row) => map_row_to_profile(row),
            None => Err(Status::not_found("Profile not found")),
        }
    }

    fn get_user_id<T>(&self, request: &Request<T>) -> Result<Uuid, Status> {
        request.extensions()
            .get::<TokenClaims>()
            .ok_or_else(|| Status::unauthenticated("No valid token found in request"))
            .and_then(|claims| {
                Uuid::parse_str(&claims.sub)
                    .map_err(|_| Status::unauthenticated("Invalid user_id in token"))
            })
    }
}

fn map_row_to_profile(row: sqlx::postgres::PgRow) -> Result<Profile, Status> {
    use sqlx::Row;
    let id: Uuid = row.get("id");
    let profile_picture_url: Option<String> = row.get("profile_picture_url");
    let theme_json: serde_json::Value = row.get("theme");
    let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
    let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");

    let roles: Vec<String> = row.try_get("roles").unwrap_or_default();
    let permissions: Vec<String> = row.try_get("permissions").unwrap_or_default();

    let theme = Theme {
        is_preset: theme_json["is_preset"].as_bool().unwrap_or(true),
        name: theme_json["name"].as_str().unwrap_or("default").to_string(),
        colors: theme_json["colors"].as_object()
            .map(|obj| obj.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string())).collect())
            .unwrap_or_default(),
        font_main: theme_json["font_main"].as_str().unwrap_or("Plus Jakarta Sans").to_string(),
    };

    Ok(Profile {
        id: id.to_string(),
        profile_picture_url,
        roles,
        permissions,
        theme: Some(theme),
        created_at: Some(prost_types::Timestamp {
            seconds: created_at.timestamp(),
            nanos: created_at.timestamp_subsec_nanos() as i32,
        }),
        updated_at: Some(prost_types::Timestamp {
            seconds: updated_at.timestamp(),
            nanos: updated_at.timestamp_subsec_nanos() as i32,
        }),
    })
}

#[tonic::async_trait]
impl UserService for MyUserService {
    async fn say_hello(
        &self,
        request: Request<HelloRequest>,
    ) -> Result<Response<HelloResponse>, Status> {
        let reply = HelloResponse {
            message: format!("Hello {}!", request.into_inner().name),
        };
        Ok(Response::new(reply))
    }

    async fn create_profile(&self, request: Request<CreateProfileRequest>) -> Result<Response<Profile>, Status> {
        let user_id = self.get_user_id(&request)?;
        
        sqlx::query(
            r#"
            INSERT INTO profiles (id)
            VALUES ($1)
            ON CONFLICT (id) DO NOTHING
            "#
        )
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        Ok(Response::new(self.fetch_full_profile(user_id).await?))
    }

    async fn delete_profile(&self, request: Request<DeleteProfileRequest>) -> Result<Response<()>, Status> {
        let user_id = self.get_user_id(&request)?;
        
        let result = sqlx::query("DELETE FROM profiles WHERE id = $1")
            .bind(user_id)
            .execute(&self.pool)
            .await
            .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(Status::not_found("Profile not found"));
        }

        Ok(Response::new(()))
    }

    async fn get_profile(&self, request: Request<GetProfileRequest>) -> Result<Response<Profile>, Status> {
        let req = request.into_inner();
        let requested_id = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid UUID format"))?;

        Ok(Response::new(self.fetch_full_profile(requested_id).await?))
    }

    async fn update_profile(&self, request: Request<UpdateProfileRequest>) -> Result<Response<Profile>, Status> {
        let user_id = self.get_user_id(&request)?;
        let req = request.into_inner();

        sqlx::query(
            r#"
            UPDATE profiles 
            SET 
                profile_picture_url = COALESCE($2, profile_picture_url),
                updated_at = NOW()
            WHERE id = $1
            "#
        )
        .bind(user_id)
        .bind(req.profile_picture_url)
        .execute(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        Ok(Response::new(self.fetch_full_profile(user_id).await?))
    }

    async fn update_theme(&self, request: Request<UpdateThemeRequest>) -> Result<Response<Profile>, Status> {
        let user_id = self.get_user_id(&request)?;
        let req = request.into_inner();

        let theme = req.theme.ok_or_else(|| Status::invalid_argument("Theme is required"))?;
        
        let theme_json = json!({
            "is_preset": theme.is_preset,
            "name": theme.name,
            "colors": theme.colors,
            "font_main": theme.font_main,
        });

        sqlx::query(
            r#"
            UPDATE profiles 
            SET 
                theme = $2,
                updated_at = NOW()
            WHERE id = $1
            "#
        )
        .bind(user_id)
        .bind(theme_json)
        .execute(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        Ok(Response::new(self.fetch_full_profile(user_id).await?))
    }

    async fn assign_role(&self, request: Request<RoleRequest>) -> Result<Response<Profile>, Status> {
        // Idéalement, seul un admin peut faire ça. 
        // Pour le moment on autorise si le user_id du token est le même ou si on implémente des permissions plus tard
        let req = request.into_inner();
        let target_id = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid UUID format"))?;

        sqlx::query(
            "INSERT INTO profile_roles (profile_id, role_name) VALUES ($1, $2) ON CONFLICT DO NOTHING"
        )
        .bind(target_id)
        .bind(&req.role_name)
        .execute(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        Ok(Response::new(self.fetch_full_profile(target_id).await?))
    }

    async fn remove_role(&self, request: Request<RoleRequest>) -> Result<Response<Profile>, Status> {
        let req = request.into_inner();
        let target_id = Uuid::parse_str(&req.id)
            .map_err(|_| Status::invalid_argument("Invalid UUID format"))?;

        sqlx::query(
            "DELETE FROM profile_roles WHERE profile_id = $1 AND role_name = $2"
        )
        .bind(target_id)
        .bind(&req.role_name)
        .execute(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        Ok(Response::new(self.fetch_full_profile(target_id).await?))
    }

    async fn list_available_permissions(&self, _request: Request<()>) -> Result<Response<PermissionList>, Status> {
        let rows = sqlx::query("SELECT slug FROM permissions")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        use sqlx::Row;
        let permissions = rows.into_iter().map(|r| r.get("slug")).collect();
        
        Ok(Response::new(PermissionList { permissions }))
    }

    async fn create_role_request(&self, request: Request<RoleChangeRequest>) -> Result<Response<RoleRequestStatus>, Status> {
        let user_id = self.get_user_id(&request)?;
        let req = request.into_inner();

        let row = sqlx::query(
            r#"
            INSERT INTO role_change_requests (profile_id, requested_role, reason)
            VALUES ($1, $2, $3)
            RETURNING request_id, status::text
            "#
        )
        .bind(user_id)
        .bind(&req.requested_role)
        .bind(&req.reason)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        use sqlx::Row;
        Ok(Response::new(RoleRequestStatus {
            request_id: row.get::<Uuid, _>("request_id").to_string(),
            status: row.get("status"),
        }))
    }

    async fn list_pending_role_requests(&self, _request: Request<()>) -> Result<Response<RoleRequestsList>, Status> {
        let rows = sqlx::query(
            r#"
            SELECT request_id, profile_id, requested_role, reason, created_at
            FROM role_change_requests
            WHERE status = 'pending'
            "#
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        use sqlx::Row;
        let requests = rows.into_iter().map(|r| {
            let created_at: chrono::DateTime<chrono::Utc> = r.get("created_at");
            user::v1::role_requests_list::Entry {
                request_id: r.get::<Uuid, _>("request_id").to_string(),
                id: r.get::<Uuid, _>("profile_id").to_string(),
                requested_role: r.get("requested_role"),
                reason: r.get("reason"),
                created_at: Some(prost_types::Timestamp {
                    seconds: created_at.timestamp(),
                    nanos: created_at.timestamp_subsec_nanos() as i32,
                }),
            }
        }).collect();

        Ok(Response::new(RoleRequestsList { requests }))
    }

    async fn review_role_request(&self, request: Request<ReviewRequest>) -> Result<Response<Profile>, Status> {
        let req = request.into_inner();
        let request_id = Uuid::parse_str(&req.request_id)
            .map_err(|_| Status::invalid_argument("Invalid UUID format"))?;

        let mut tx = self.pool.begin().await
            .map_err(|e| Status::internal(format!("Transaction error: {}", e)))?;

        let row = sqlx::query("SELECT profile_id, requested_role FROM role_change_requests WHERE request_id = $1")
            .bind(request_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        let (user_id, role) = match row {
            Some(r) => {
                use sqlx::Row;
                (r.get::<Uuid, _>("profile_id"), r.get::<String, _>("requested_role"))
            },
            None => return Err(Status::not_found("Request not found")),
        };

        let status = if req.approve { "approved" } else { "rejected" };
        
        sqlx::query("UPDATE role_change_requests SET status = $2::request_status, rejection_reason = $3, updated_at = NOW() WHERE request_id = $1")
            .bind(request_id)
            .bind(status)
            .bind(&req.rejection_reason)
            .execute(&mut *tx)
            .await
            .map_err(|e| Status::internal(format!("Database error updating status: {}", e)))?;

        if req.approve {
            sqlx::query("INSERT INTO profile_roles (profile_id, role_name) VALUES ($1, $2) ON CONFLICT DO NOTHING")
                .bind(user_id)
                .bind(role)
                .execute(&mut *tx)
                .await
                .map_err(|e| Status::internal(format!("Database error adding role: {}", e)))?;
        }

        tx.commit().await
            .map_err(|e| Status::internal(format!("Commit error: {}", e)))?;

        Ok(Response::new(self.fetch_full_profile(user_id).await?))
    }

    async fn upload_profile_picture(&self, request: Request<UploadProfilePictureRequest>) -> Result<Response<Profile>, Status> {
        let user_id = self.get_user_id(&request)?;
        let req = request.into_inner();

        let old_profile = self.fetch_full_profile(user_id).await?;
        if let Some(old_url) = old_profile.profile_picture_url {
            if let Some(old_key) = old_url.split('/').last() {
                let _ = self.s3_client.delete_object()
                    .bucket(&self.bucket_name)
                    .key(old_key)
                    .send()
                    .await;
            }
        }

        let file_name = format!("{}.{}", user_id, req.extension);
        
        self.s3_client.put_object()
            .bucket(&self.bucket_name)
            .key(&file_name)
            .body(ByteStream::from(req.image_data))
            .content_type(format!("image/{}", req.extension))
            .send()
            .await
            .map_err(|e| Status::internal(format!("Failed to upload to S3: {}", e)))?;

        let public_url = format!("{}/{}/{}", self.s3_public_url, self.bucket_name, file_name);

        sqlx::query("UPDATE profiles SET profile_picture_url = $2, updated_at = NOW() WHERE id = $1")
            .bind(user_id)
            .bind(&public_url)
            .execute(&self.pool)
            .await
            .map_err(|e| Status::internal(format!("Database error: {}", e)))?;

        Ok(Response::new(self.fetch_full_profile(user_id).await?))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let addr_str = env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    let addr = addr_str.parse()?;

    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    // S3 Config
    let s3_endpoint = env::var("S3_ENDPOINT").unwrap_or_else(|_| "http://minio-user:9000".to_string());
    let s3_bucket = env::var("S3_BUCKET").unwrap_or_else(|_| "profiles".to_string());
    let s3_public_url = env::var("S3_PUBLIC_URL").unwrap_or_else(|_| "http://localhost:9000".to_string());
    
    let config = aws_config::from_env()
        .endpoint_url(&s3_endpoint)
        .region(aws_config::Region::new("us-east-1"))
        .load()
        .await;
    
    let s3_config_builder = aws_sdk_s3::config::Builder::from(&config)
        .force_path_style(true)
        .build();
    
    let s3_client = S3Client::from_conf(s3_config_builder);
        
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    let user_service = MyUserService::new(pool, s3_client, s3_bucket, s3_public_url);

    let reflection_service = Builder::configure()
        .register_encoded_file_descriptor_set(user::v1::FILE_DESCRIPTOR_SET)
        .build()?;

    let auth_layer = AuthLayer::new(jwt_secret);

    println!("UserService listening on {}", addr);

    Server::builder()
        .layer(auth_layer)
        .add_service(UserServiceServer::new(user_service)
            .max_decoding_message_size(10 * 1024 * 1024)
            .max_encoding_message_size(10 * 1024 * 1024))
        .add_service(reflection_service)
        .serve(addr)
        .await?;

    Ok(())
}
