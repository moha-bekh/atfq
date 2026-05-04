use axum::{extract::State, Json};
use std::sync::Arc;
use crate::error::AppError;
use crate::api::openapi::{HelloRequest, HelloResponse};
use crate::state::AppState;

#[utoipa::path(
    post,
    path = "/api/v1/user/say-hello",
    operation_id = "say_hello_handler",
    request_body = HelloRequest,
    responses(
        (status = 200, description = "Greeting response", body = HelloResponse),
        (status = 502, description = "Downstream service error")
    )
)]
pub async fn say_hello_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<HelloRequest>,
) -> Result<Json<HelloResponse>, AppError> {
    let mut client = state.user_client.clone();

    let request = tonic::Request::new(crate::grpc::user::HelloRequest {
        name: payload.name,
    });

    let response = client.say_hello(request).await?.into_inner();

    Ok(Json(HelloResponse {
        message: response.message,
    }))
}
