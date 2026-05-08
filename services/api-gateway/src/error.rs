use axum::response::{IntoResponse, Response};
use axum::{Json, http::StatusCode};
use serde_json::json;
use tonic::Code;

pub enum AppError {
    Grpc(tonic::Status),
    Internal(String),
    Unauthorized(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::Grpc(status) => {
                let code = match status.code() {
                    Code::InvalidArgument => StatusCode::BAD_REQUEST,
                    Code::Unauthenticated => StatusCode::UNAUTHORIZED,
                    Code::PermissionDenied => StatusCode::FORBIDDEN,
                    Code::AlreadyExists => StatusCode::CONFLICT,
                    Code::NotFound => StatusCode::NOT_FOUND,
                    Code::FailedPrecondition => StatusCode::BAD_REQUEST,
                    _ => StatusCode::INTERNAL_SERVER_ERROR,
                };
                (code, status.message().to_string())
            }
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg),
        };

        let body = Json(json!({
            "error": message,
            "status": status.as_u16()
        }));

        (status, body).into_response()
    }
}

impl From<tonic::Status> for AppError {
    fn from(status: tonic::Status) -> Self {
        AppError::Grpc(status)
    }
}
