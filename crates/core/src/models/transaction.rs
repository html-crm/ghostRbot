use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Chain;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TxType {
    Buy,
    Sell,
    Fee,
    Transfer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: Uuid,
    pub tx_signature: String,
    pub chain: Chain,
    pub order_id: Option<Uuid>,
    pub tx_type: TxType,
    pub token_address: String,
    pub token_amount: f64,
    pub quote_amount: f64,
    pub price: f64,
    pub fee_amount: f64,
    pub fee_paid: bool,
    pub created_at: DateTime<Utc>,
    pub metadata: Option<serde_json::Value>,
}
