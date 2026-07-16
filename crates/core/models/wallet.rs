use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::Chain;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallet {
    pub label: String,
    pub chain: Chain,
    pub address: String,
    pub private_key_encrypted: Vec<u8>,
    pub created_at: DateTime<Utc>,
}
