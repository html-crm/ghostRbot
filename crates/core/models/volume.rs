use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::Chain;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VolumeOrderStatus {
    Running,
    Stopped,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeBotOrder {
    pub id: Uuid,
    pub chain: Chain,
    pub token_address: String,
    pub buy_amount: f64,
    pub total_buys: u32,
    pub current_buys: u32,
    pub total_sells: u32,
    pub current_sells: u32,
    pub buy_interval_secs: u64,
    pub sell_interval_secs: u64,
    pub status: VolumeOrderStatus,
    pub wallets: Vec<String>,
    pub created_at: DateTime<Utc>,
}
