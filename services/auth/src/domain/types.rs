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

