use std::sync::Arc;
use std::task::{Context, Poll};
use futures_util::future::{BoxFuture, FutureExt};
use tower::{Layer, Service};
use tonic::{Status, transport::Body, body::BoxBody};
use http::{Request as HttpRequest, Response as HttpResponse, HeaderValue};

use crate::domain::ports::token_service::TokenService;
use crate::domain::ports::cache_service::CacheService;
use crate::infra::persistence::redis_cache::handler::RedisCache;

#[derive(Debug, Clone, Copy)]
pub enum AuthServiceMethod {
    Register,
    Login,
    Logout,
    RefreshToken,
}

impl AuthServiceMethod {
    pub fn from_path(path: &str) -> Option<Self> {
        match path {
            "/auth.v1.AuthService/Register" => Some(Self::Register),
            "/auth.v1.AuthService/Login" => Some(Self::Login),
            "/auth.v1.AuthService/Logout" => Some(Self::Logout),
            "/auth.v1.AuthService/RefreshToken" => Some(Self::RefreshToken),
            _ => None,
        }
    }

    pub fn requires_auth(&self) -> bool {
        match self {
            Self::Logout => true,
            Self::Register | Self::Login | Self::RefreshToken => false,
        }
    }
}

#[derive(Clone)]
pub struct AuthLayer {
    pub token_service: Arc<dyn TokenService>,
    pub cache_service: Arc<RedisCache>,
}

impl AuthLayer {
    pub fn new(token_service: Arc<dyn TokenService>, cache_service: Arc<RedisCache>) -> Self {
        Self {
            token_service,
            cache_service,
        }
    }
}

impl<S> Layer<S> for AuthLayer {
    type Service = AuthService<S>;

    fn layer(&self, service: S) -> Self::Service {
        AuthService {
            inner: service,
            token_service: self.token_service.clone(),
            cache_service: self.cache_service.clone(),
        }
    }
}

#[derive(Clone)]
pub struct AuthService<S> {
    inner: S,
    token_service: Arc<dyn TokenService>,
    cache_service: Arc<RedisCache>,
}

impl<S> Service<HttpRequest<Body>> for AuthService<S>
where
    S: Service<HttpRequest<Body>, Response = HttpResponse<BoxBody>> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = HttpResponse<BoxBody>;
    type Error = S::Error;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: HttpRequest<Body>) -> Self::Future {
        let mut inner = self.inner.clone();
        let token_service = self.token_service.clone();
        let cache_service = self.cache_service.clone();

        async move {
            let path = req.uri().path();
            let method = AuthServiceMethod::from_path(path);

            match method {
                Some(m) if !m.requires_auth() => {
                    return inner.call(req).await;
                }
                Some(m) => {

                    let auth_header = req.headers()
                        .get("authorization")
                        .and_then(|v: &HeaderValue| v.to_str().ok());

                    if let Some(auth_header_str) = auth_header {
                        if auth_header_str.starts_with("Bearer ") {
                            let token = &auth_header_str[7..];

                            let is_blacklisted = cache_service.exists(&format!("blacklist:{}", token))
                                .await
                                .unwrap_or(false);

                            if is_blacklisted {
                                if let AuthServiceMethod::Logout = m {
                                    // Proceed to allow blacklisting the refresh token
                                } else {
                                    return Ok(status_to_http(Status::unauthenticated("Token is revoked")));
                                }
                            }

                            match token_service.decode_token(token) {
                                Ok(claims) => {
                                    if claims.typ != "access" {
                                        return Ok(status_to_http(Status::unauthenticated("Invalid token type")));
                                    }
                                    let mut req = req;
                                    req.extensions_mut().insert(claims);
                                    return inner.call(req).await;
                                }
                                Err(_) => {
                                    return Ok(status_to_http(Status::unauthenticated("Invalid or expired token")));
                                }
                            }
                        }
                    }
                    return Ok(status_to_http(Status::unauthenticated("Missing or invalid authorization header")));
                }
                None => {
                    inner.call(req).await
                }
            }
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
