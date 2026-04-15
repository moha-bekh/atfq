use utoipa::OpenApi;

pub mod auth;

pub use auth::login::{LoginRequest, LoginResponse};
pub use auth::register::{RegisterRequest, RegisterResponse};
pub use auth::common::{UserSchema, AuthResponse};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::auth::register::register_handler,
        crate::api::auth::login::login_handler
    ),
    components(schemas(
        auth::register::RegisterRequest,
        auth::login::LoginRequest,
        auth::common::AuthResponse,
        auth::common::UserSchema
    ))
)]
pub struct ApiDoc;
