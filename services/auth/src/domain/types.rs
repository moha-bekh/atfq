use serde::{Serialize, Deserialize};
use std::ops::Deref;
use crate::domain::error::DomainError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(transparent)]
pub struct Username(String);

impl Username {
    pub fn new(s: &str) -> Result<Self, DomainError> {
        let s = s.trim();
        if s.is_empty() || s.contains('@') {
            return Err(DomainError::InvalidInput("Username cannot be empty or contain '@'".into()));
        }
        if s.len() < 3 {
            return Err(DomainError::InvalidInput("Username must be at least 3 characters long".into()));
        }
        Ok(Self(s.to_string()))
    }
}

impl Deref for Username {
    type Target = String;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl TryFrom<&str> for Username {
    type Error = DomainError;
    fn try_from(value: &str) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl TryFrom<String> for Username {
    type Error = DomainError;
    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::new(&value)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(transparent)]
pub struct Email(String);

impl Email {
    pub fn new(s: &str) -> Result<Self, DomainError> {
        let s = s.trim().to_lowercase();
        if !s.contains('@') || !s.contains('.') {
            return Err(DomainError::InvalidInput("Invalid email format".into()));
        }
        Ok(Self(s))
    }
}

impl Deref for Email {
    type Target = String;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl TryFrom<&str> for Email {
    type Error = DomainError;
    fn try_from(value: &str) -> Result<Self, Self::Error> {
        Self::new(value)
    }
}

impl TryFrom<String> for Email {
    type Error = DomainError;
    fn try_from(value: String) -> Result<Self, Self::Error> {
        Self::new(&value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_username_valid() {
        let username = Username::new("johndoe");
        assert!(username.is_ok());
        assert_eq!(username.unwrap().to_string(), "johndoe");
    }

    #[test]
    fn test_username_too_short() {
        let username = Username::new("jo");
        assert!(username.is_err());
        if let Err(DomainError::InvalidInput(msg)) = username {
            assert!(msg.contains("at least 3 characters"));
        } else {
            panic!("Expected InvalidInput error");
        }
    }

    #[test]
    fn test_username_contains_at_symbol() {
        let username = Username::new("user@name");
        assert!(username.is_err());
        if let Err(DomainError::InvalidInput(msg)) = username {
            assert!(msg.contains("cannot be empty or contain '@'"));
        } else {
            panic!("Expected InvalidInput error");
        }
    }

    #[test]
    // Check automatic lowercasing
    fn test_email_valid() {
        let email = Email::new("Test@Example.Com");
        assert!(email.is_ok());
        assert_eq!(email.unwrap().to_string(), "test@example.com");
    }

    #[test]
    fn test_email_invalid_format() {
        let email = Email::new("invalid-email");
        assert!(email.is_err());
        if let Err(DomainError::InvalidInput(msg)) = email {
            assert_eq!(msg, "Invalid email format");
        } else {
            panic!("Expected InvalidInput error");
        }
    }
}
