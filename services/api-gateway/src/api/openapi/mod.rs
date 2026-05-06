use utoipa::{
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
    Modify, OpenApi,
};

pub mod auth;
pub mod user;

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
#[allow(unused_imports)]
pub use user::hello::{HelloRequest, HelloResponse};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::api::auth::register::register_handler,
        crate::api::auth::login::login_handler,
        crate::api::auth::logout::logout_handler,
        crate::api::auth::oauth::get_oauth_url_handler,
        crate::api::auth::oauth::oauth_callback_handler,
        crate::api::user::hello::say_hello_handler,
        crate::api::user::profile::create_profile_handler,
        crate::api::user::profile::get_profile_handler,
        crate::api::user::profile::update_profile_handler,
        crate::api::user::profile::update_theme_handler,
        crate::api::user::profile::assign_role_handler,
        crate::api::user::profile::remove_role_handler,
        crate::api::user::profile::list_permissions_handler,
        crate::api::user::profile::create_role_request_handler,
        crate::api::user::profile::list_role_requests_handler,
        crate::api::user::profile::review_role_request_handler,
        crate::api::user::profile::upload_profile_picture_handler,
        crate::api::user::profile::delete_profile_picture_handler,
        crate::api::user::profile::delete_profile_handler
    ),
    components(
        schemas(
            auth::register::RegisterRequest,
            auth::login::LoginRequest,
            auth::logout::LogoutRequest,
            auth::common::AuthResponse,
            auth::common::UserSchema,
            auth::oauth::OAuthProvider,
            auth::oauth::OAuthUrlResponse,
            user::hello::HelloRequest,
            user::hello::HelloResponse,
            user::profile::ProfileResponse,
            user::profile::CreateProfileRequest,
            user::profile::UpdateProfileRequest,
            user::profile::UpdateThemeRequest,
            user::profile::RoleRequest,
            user::profile::ThemeSchema,
            user::profile::PermissionListResponse,
            user::profile::RoleChangeRequest,
            user::profile::RoleRequestStatusResponse,
            user::profile::RoleRequestsListResponse,
            user::profile::RoleRequestEntry,
            user::profile::ReviewRoleRequest
        )
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::Http(
                    HttpBuilder::new()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .build(),
                ),
            );
        }
    }
}
