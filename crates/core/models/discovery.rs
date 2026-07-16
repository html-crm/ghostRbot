use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::Chain;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredToken {
    pub source: String,
    pub chain: Chain,
    pub token_address: String,
    pub token_symbol: String,
    pub token_name: String,
    pub pool_address: String,
    pub liquidity_usd: f64,
    pub price_usd: f64,
    pub volume_24h: f64,
    pub fdv: f64,
    pub created_at: DateTime<Utc>,
}
