use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("External API error: {0}")]
    ExternalApi(String),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Trading error: {0}")]
    Trading(String),

    #[error("Rate limited")]
    RateLimited,
}

impl axum::response::IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self {
            AppError::Database(msg) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
            AppError::NotFound(msg) => (axum::http::StatusCode::NOT_FOUND, msg.clone()),
            AppError::Unauthorized => (axum::http::StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            AppError::Forbidden => (axum::http::StatusCode::FORBIDDEN, "Forbidden".into()),
            AppError::BadRequest(msg) => (axum::http::StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Internal(msg) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
            AppError::ExternalApi(msg) => (axum::http::StatusCode::BAD_GATEWAY, msg.clone()),
            AppError::Encryption(msg) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
            AppError::Trading(msg) => (axum::http::StatusCode::BAD_REQUEST, msg.clone()),
            AppError::RateLimited => (axum::http::StatusCode::TOO_MANY_REQUESTS, "Rate limited".into()),
        };

        let body = serde_json::json!({
            "error": message,
            "code": format!("{:?}", status),
        });

        (status, axum::Json(body)).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
