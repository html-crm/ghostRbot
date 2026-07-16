use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::state::AppState;
use ghostRbot_core::AppError;

#[derive(Serialize)]
pub struct WalletResponse {
    pub label: String,
    pub chain: String,
    pub address: String,
}

#[derive(Deserialize)]
pub struct CreateWalletRequest {
    pub label: String,
    pub chain: String,
}

pub async fn list_wallets(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<WalletResponse>>, AppError> {
    // TODO: Fetch from database
    Ok(Json(vec![]))
}

pub async fn create_wallet(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateWalletRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    // TODO: Generate keypair and store encrypted
    Ok(Json(serde_json::json!({
        "message": "Wallet created",
        "label": req.label,
    })))
}

pub async fn import_wallet(
    State(state): State<Arc<AppState>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "message": "Wallet imported",
    })))
}

pub async fn delete_wallet(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(label): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "message": format!("Wallet '{}' deleted", label),
    })))
}

pub async fn batch_create(
    State(state): State<Arc<AppState>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "message": "Batch create not yet implemented",
    })))
}

pub async fn get_secret(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(label): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "private_key": "TODO: decrypt and return",
    })))
}

pub async fn rename_wallet(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(label): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "message": format!("Wallet renamed from '{}'", label),
    })))
}
