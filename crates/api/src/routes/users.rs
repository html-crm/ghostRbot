use axum::{extract::State, Json};
use std::sync::Arc;
use crate::state::AppState;
use ghostRbot_core::AppError;

pub async fn list_users(State(_): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"users": []})))
}

pub async fn create_user(State(_): State<Arc<AppState>>, Json(_): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "User created"})))
}

pub async fn update_user(State(_): State<Arc<AppState>>, axum::extract::Path(_): axum::extract::Path<String>, Json(_): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "User updated"})))
}

pub async fn delete_user(State(_): State<Arc<AppState>>, axum::extract::Path(_): axum::extract::Path<String>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "User deleted"})))
}

pub async fn update_status(State(_): State<Arc<AppState>>, axum::extract::Path(_): axum::extract::Path<String>, Json(_): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "Status updated"})))
}
