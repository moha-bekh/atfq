pub mod confirm_password_reset;
pub mod delete_user;
pub mod disable_mfa;
pub mod enable_mfa;
pub mod get_linked_providers;
pub mod get_user;
pub mod login;
pub mod logout;
pub mod oauth;
pub mod refresh;
pub mod register;
pub mod request_password_reset;
pub mod types;
pub mod unlink_oauth;
pub mod update_email;
pub mod update_password;
pub mod update_username;
pub mod verify_mfa;

#[cfg(test)]
mod tests;
