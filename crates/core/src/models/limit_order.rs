use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Chain;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LimitOrderType {
    TakeProfit,
    StopLoss,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LimitOrderStatus {
    Pending,
    Triggered,
    Cancelled,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimitOrder {
    pub id: Uuid,
    pub chain: Chain,
    pub token_address: String,
    pub order_type: LimitOrderType,
    pub trigger_price: f64,
    pub amount: f64,
    pub status: LimitOrderStatus,
    pub created_at: DateTime<Utc>,
}
