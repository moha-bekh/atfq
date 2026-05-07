pub mod types;
pub mod register;
pub mod login;
pub mod logout;
pub mod refresh;
pub mod enable_mfa;
pub mod disable_mfa;
pub mod verify_mfa;
pub mod oauth;
pub mod unlink_oauth;
pub mod get_user;
pub mod get_linked_providers;
pub mod delete_user;
pub mod update_email;
pub mod update_username;
pub mod update_password;

#[cfg(test)]
mod tests;
