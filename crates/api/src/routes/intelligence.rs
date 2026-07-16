use axum::{extract::State, Json};
use std::sync::Arc;
use crate::state::AppState;
use ghostRbot_core::AppError;

pub async fn chat(State(_): State<Arc<AppState>>, Json(req): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, AppError> {
    let message = req.get("message").and_then(|v| v.as_str()).unwrap_or("");
    Ok(Json(serde_json::json!({
        "response": format!("Echo: {}", message),
    })))
}

pub async fn briefing(State(_): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"briefing": "Daily briefing not yet implemented"})))
}

pub async fn news(State(_): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"news": []})))
}

pub async fn market(State(_): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"market": {}})))
}

pub async fn sentiment(State(_): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"sentiment": "neutral"})))
}

pub async fn module(State(_): State<Arc<AppState>>, axum::extract::Path(_): axum::extract::Path<String>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"data": "Not yet implemented"})))
}
