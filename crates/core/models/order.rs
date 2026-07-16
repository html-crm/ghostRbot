use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Chain {
    Solana,
    Bsc,
    Ethereum,
}

impl std::fmt::Display for Chain {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Chain::Solana => write!(f, "solana"),
            Chain::Bsc => write!(f, "bsc"),
            Chain::Ethereum => write!(f, "ethereum"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OrderStatus {
    Monitoring,
    Selling,
    Sold,
    Error,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: Uuid,
    pub chain: Chain,
    pub token_address: String,
    pub token_symbol: String,
    pub token_name: String,
    pub token_decimals: u8,
    pub quote_mint: String,
    pub pool_address: String,
    pub buy_amount: f64,
    pub buy_tx_signature: Option<String>,
    pub buy_filled: bool,
    pub sell_amount: Option<f64>,
    pub sell_tx_signature: Option<String>,
    pub sell_filled: bool,
    pub entry_price: f64,
    pub exit_price: Option<f64>,
    pub current_price: f64,
    pub pnl_percent: f64,
    pub status: OrderStatus,
    pub error: Option<String>,
    pub slippage_buy: f64,
    pub slippage_sell: f64,
    pub priority_fee: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Default for Order {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4(),
            chain: Chain::Solana,
            token_address: String::new(),
            token_symbol: String::new(),
            token_name: String::new(),
            token_decimals: 9,
            quote_mint: "So11111111111111111111111111111111111111112".into(),
            pool_address: String::new(),
            buy_amount: 0.0,
            buy_tx_signature: None,
            buy_filled: false,
            sell_amount: None,
            sell_tx_signature: None,
            sell_filled: false,
            entry_price: 0.0,
            exit_price: None,
            current_price: 0.0,
            pnl_percent: 0.0,
            status: OrderStatus::Monitoring,
            error: None,
            slippage_buy: 0.5,
            slippage_sell: 0.5,
            priority_fee: 0.001,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}
