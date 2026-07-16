use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub port: u16,
    pub database_url: String,
    pub admin_password: String,
    pub session_secret: String,
    pub telegram_bot_token: Option<String>,
    pub telegram_chat_id: Option<i64>,
    pub exchange_encryption_key: Option<String>,
    pub birdeye_api_key: Option<String>,
    pub helius_api_key: Option<String>,
    pub openai_api_key: Option<String>,
    pub solana_rpc_url: String,
    pub bsc_rpc_url: String,
    pub fee_wallet: Option<String>,
    pub buy_fee_percent: f64,
    pub sell_fee_percent: f64,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "8002".into())
                .parse()
                .unwrap_or(8002),
            database_url: std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            admin_password: std::env::var("ADMIN_PASSWORD")
                .expect("ADMIN_PASSWORD must be set"),
            session_secret: std::env::var("SESSION_SECRET")
                .unwrap_or_else(|_| uuid::Uuid::new_v4().to_string()),
            telegram_bot_token: std::env::var("TELEGRAM_BOT_TOKEN").ok(),
            telegram_chat_id: std::env::var("TELEGRAM_CHAT_ID")
                .ok()
                .and_then(|v| v.parse().ok()),
            exchange_encryption_key: std::env::var("EXCHANGE_ENCRYPTION_KEY").ok(),
            birdeye_api_key: std::env::var("BIRDEYE_API_KEY").ok(),
            helius_api_key: std::env::var("HELIUS_API_KEY").ok(),
            openai_api_key: std::env::var("OPENAI_API_KEY").ok(),
            solana_rpc_url: std::env::var("SOLANA_RPC_URL")
                .unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".into()),
            bsc_rpc_url: std::env::var("BSC_RPC_URL")
                .unwrap_or_else(|_| "https://bsc-dataseed.binance.org".into()),
            fee_wallet: std::env::var("FEE_WALLET").ok(),
            buy_fee_percent: std::env::var("BUY_FEE_PERCENT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0.5),
            sell_fee_percent: std::env::var("SELL_FEE_PERCENT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0.5),
        }
    }
}
