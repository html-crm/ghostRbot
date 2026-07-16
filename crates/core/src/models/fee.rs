use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeConfig {
    pub buy_fee_percent: f64,
    pub sell_fee_percent: f64,
    pub fee_wallet: String,
    pub enabled: bool,
}

impl Default for FeeConfig {
    fn default() -> Self {
        Self {
            buy_fee_percent: 0.5,
            sell_fee_percent: 0.5,
            fee_wallet: String::new(),
            enabled: true,
        }
    }
}
