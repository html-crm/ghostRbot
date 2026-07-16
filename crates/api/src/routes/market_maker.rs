use axum::{extract::State, Json};
use std::sync::Arc;
use crate::state::AppState;
use ghostRbot_core::AppError;

pub async fn fund(State(_): State<Arc<AppState>>, Json(_): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "Funds transferred"})))
}

pub async fn liquidity(State(_): State<Arc<AppState>>, Json(_): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "Liquidity updated"})))
}

pub async fn stats(State(_): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"tvl": 0.0, "fees_earned": 0.0})))
}
