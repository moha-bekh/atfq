use utoipa::OpenApi;

pub mod auth;

#[allow(unused_imports)]
pub use auth::login::{LoginRequest, LoginResponse};
#[allow(unused_imports)]
pub use auth::register::{RegisterRequest, RegisterResponse};
#[allow(unused_imports)]
pub use auth::logout::LogoutRequest;
#[allow(unused_imports)]
pub use auth::common::{UserSchema, AuthResponse};
#[allow(unused_imports)]
pub use auth::oauth::{OAuthProvider, OAuthUrlResponse, OAuthCallbackParams};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::auth::register::register_handler,
        crate::api::auth::login::login_handler,
        crate::api::auth::logout::logout_handler,
        crate::api::auth::oauth::get_oauth_url_handler,
        crate::api::auth::oauth::oauth_callback_handler
    ),
    components(schemas(
        auth::register::RegisterRequest,
        auth::login::LoginRequest,
        auth::logout::LogoutRequest,
        auth::common::AuthResponse,
        auth::common::UserSchema,
        auth::oauth::OAuthProvider,
        auth::oauth::OAuthUrlResponse
    ))
)]
pub struct ApiDoc;
