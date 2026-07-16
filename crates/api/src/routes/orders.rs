use axum::{extract::State, Json};
use serde::Deserialize;
use std::sync::Arc;
use crate::state::AppState;
use ghostRbot_core::AppError;

pub async fn list_orders(
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"orders": []})))
}

pub async fn create_order(
    State(state): State<Arc<AppState>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "Order created"})))
}

pub async fn cancel_order(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "Order cancelled"})))
}
