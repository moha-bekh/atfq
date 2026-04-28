use thiserror::Error;

#[derive(Debug, Error, Clone)]
pub enum DomainError {

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("User with this email or username already exists")]
    AlreadyExists,

    #[error("Multi-factor authentication already enabled")]
    MfaAlreadyEnabled,

    #[error("Invalid credentials")]
    Unauthenticated,

    #[error("Unauthorized access")]
    Unauthorized,

    #[error("User not found")]
    NotFound,

    #[error("Internal server error: {0}")]
    Internal(String),
}
