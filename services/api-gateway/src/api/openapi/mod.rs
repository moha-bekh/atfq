use utoipa::{
    Modify, OpenApi,
    openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme},
};

pub mod auth;
pub mod user;
pub mod wiki;

#[allow(unused_imports)]
pub use auth::common::{AuthResponse, UserSchema};
#[allow(unused_imports)]
pub use auth::login::{LoginRequest, LoginResponse};
#[allow(unused_imports)]
pub use auth::logout::LogoutRequest;
#[allow(unused_imports)]
pub use auth::oauth::{OAuthCallbackParams, OAuthProvider, OAuthUrlResponse};
#[allow(unused_imports)]
pub use auth::register::{RegisterRequest, RegisterResponse};
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
        crate::api::auth::oauth::get_linked_providers_handler,
        crate::api::auth::oauth::unlink_provider_handler,
        crate::api::auth::mfa::enable_mfa_handler,
        crate::api::auth::mfa::disable_mfa_handler,
        crate::api::auth::mfa::verify_mfa_handler,
        crate::api::auth::refresh::refresh_handler,
        crate::api::auth::account::get_me_handler,
        crate::api::auth::account::update_email_handler,
        crate::api::auth::account::update_username_handler,
        crate::api::auth::account::update_password_handler,
        crate::api::auth::account::request_password_reset_handler,
        crate::api::auth::account::confirm_password_reset_handler,
        crate::api::auth::account::delete_account_handler,
        crate::api::user::hello::say_hello_handler,
        crate::api::user::profile::create_profile_handler,
        crate::api::user::profile::get_profile_handler,
        crate::api::user::profile::update_profile_handler,
        crate::api::user::profile::update_theme_handler,
        crate::api::user::profile::assign_role_handler,
        crate::api::user::profile::remove_role_handler,
        crate::api::user::profile::leave_role_handler,
        crate::api::user::profile::list_permissions_handler,
        crate::api::user::profile::create_role_request_handler,
        crate::api::user::profile::list_role_requests_handler,
        crate::api::user::profile::list_all_role_requests_handler,
        crate::api::user::profile::list_my_role_requests_handler,
        crate::api::user::profile::cancel_role_request_handler,
        crate::api::user::profile::review_role_request_handler,
        crate::api::user::profile::upload_profile_picture_handler,
        crate::api::user::profile::delete_profile_picture_handler,
        crate::api::user::profile::delete_profile_handler,
        crate::api::wiki::articles::get_root_articles_handler,
        crate::api::wiki::articles::create_article_handler,
        crate::api::wiki::articles::get_article_handler,
        crate::api::wiki::articles::create_node_handler,
        crate::api::wiki::articles::update_node_handler,
        crate::api::wiki::articles::delete_node_handler,
        crate::api::wiki::articles::assign_parent_handler,
        crate::api::wiki::articles::get_history_handler,
        crate::api::wiki::articles::get_pending_handler,
        crate::api::wiki::articles::get_all_pending_handler,
        crate::api::wiki::articles::approve_version_handler,
        crate::api::wiki::articles::reject_version_handler,
        crate::api::wiki::articles::search_articles_handler
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
            auth::oauth::LinkedProvider,
            auth::oauth::LinkedProvidersResponse,
            auth::mfa::MfaMethod,
            auth::mfa::EnableMFARequest,
            auth::mfa::EnableMFAResponse,
            auth::mfa::VerifyMFARequest,
            auth::refresh::RefreshRequest,
            auth::user::UpdateEmailRequest,
            auth::user::UpdateUsernameRequest,
            auth::user::UpdatePasswordRequest,
            auth::user::PasswordResetRequest,
            auth::user::PasswordResetResponse,
            auth::user::PasswordResetConfirmRequest,
            auth::user::DeleteUserRequest,
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
            user::profile::LeaveRoleRequest,
            user::profile::RoleRequestStatusResponse,
            user::profile::RoleRequestsListResponse,
            user::profile::RoleRequestEntry,
            user::profile::ReviewRoleRequest,
            user::profile::CancelRoleRequest,
            wiki::articles::GetRootArticlesResponse,
            wiki::articles::NodeBreadcrumbResponse,
            wiki::articles::ArticleResponse,
            wiki::articles::NodeResponse,
            wiki::articles::VersionResponse,
            wiki::articles::CreateArticleRequest,
            wiki::articles::CreateNodeRequest,
            wiki::articles::UpdateNodeRequest,
            wiki::articles::DeleteResponse,
            wiki::articles::NodeType,
            wiki::articles::AssignParentRequest,
            wiki::articles::ModerateVersionRequest,
            wiki::articles::GetHistoryResponse,
            wiki::articles::PendingVersionsResponse,
            wiki::articles::SearchResponse
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
