use axum::{extract::State, Json};
use std::sync::Arc;
use crate::state::AppState;
use ghostRbot_core::AppError;

pub async fn get_config(State(state): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "solana_rpc": state.config.solana_rpc_url,
        "bsc_rpc": state.config.bsc_rpc_url,
    })))
}

pub async fn update_config(State(_): State<Arc<AppState>>, Json(_): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "Config updated"})))
}

pub async fn get_fees(State(state): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "buy_fee_percent": state.config.buy_fee_percent,
        "sell_fee_percent": state.config.sell_fee_percent,
        "fee_wallet": state.config.fee_wallet,
        "enabled": true,
    })))
}

pub async fn update_fees(State(_): State<Arc<AppState>>, Json(_): Json<serde_json::Value>) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({"message": "Fees updated"})))
}
