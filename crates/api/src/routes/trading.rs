use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::state::AppState;
use ghostRbot_core::AppError;

#[derive(Deserialize)]
pub struct BuyRequest {
    pub token_address: String,
    pub amount: f64,
    pub chain: Option<String>,
    pub slippage: Option<f64>,
}

#[derive(Deserialize)]
pub struct SellRequest {
    pub token_address: String,
    pub amount: Option<f64>,
    pub percent: Option<f64>,
}

#[derive(Serialize)]
pub struct TradeResponse {
    pub success: bool,
    pub tx_signature: Option<String>,
    pub message: String,
}

pub async fn buy(
    State(state): State<Arc<AppState>>,
    Json(req): Json<BuyRequest>,
) -> Result<Json<TradeResponse>, AppError> {
    // TODO: Execute buy via trading engine
    Ok(Json(TradeResponse {
        success: false,
        tx_signature: None,
        message: "Buy not yet implemented".into(),
    }))
}

pub async fn sell(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SellRequest>,
) -> Result<Json<TradeResponse>, AppError> {
    Ok(Json(TradeResponse {
        success: false,
        tx_signature: None,
        message: "Sell not yet implemented".into(),
    }))
}

pub async fn balances(
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "balances": {},
    })))
}
