use async_trait::async_trait;
use ghostRbot_core::{AppError, Chain, Order, OrderStatus};

pub mod solana;
pub mod bsc;
pub mod risk_manager;
pub mod position_manager;

#[async_trait]
pub trait DexClient: Send + Sync {
    async fn get_token_price(&self, pool_address: &str) -> Result<f64, AppError>;
    async fn get_pool_info(&self, pool_address: &str) -> Result<PoolInfo, AppError>;
    async fn buy(&self, params: BuyParams) -> Result<String, AppError>;
    async fn sell(&self, params: SellParams) -> Result<String, AppError>;
}

#[derive(Debug, Clone)]
pub struct PoolInfo {
    pub address: String,
    pub token_a: String,
    pub token_b: String,
    pub liquidity_usd: f64,
    pub price: f64,
}

#[derive(Debug, Clone)]
pub struct BuyParams {
    pub token_address: String,
    pub pool_address: String,
    pub amount: f64,
    pub slippage: f64,
    pub priority_fee: f64,
    pub wallet_private_key: String,
    pub quote_mint: String,
}

#[derive(Debug, Clone)]
pub struct SellParams {
    pub token_address: String,
    pub pool_address: String,
    pub amount: f64,
    pub slippage: f64,
    pub priority_fee: f64,
    pub wallet_private_key: String,
    pub quote_mint: String,
}

pub struct TradingEngine {
    pub solana_client: Box<dyn DexClient>,
    pub bsc_client: Box<dyn DexClient>,
    pub monitor_interval_secs: u64,
    pub max_sell_attempts: u32,
}

impl TradingEngine {
    pub fn new(solana_client: Box<dyn DexClient>, bsc_client: Box<dyn DexClient>) -> Self {
        Self {
            solana_client,
            bsc_client,
            monitor_interval_secs: 10,
            max_sell_attempts: 10,
        }
    }

    fn client_for_chain(&self, chain: &Chain) -> &dyn DexClient {
        match chain {
            Chain::Solana => &*self.solana_client,
            Chain::Bsc | Chain::Ethereum => &*self.bsc_client,
        }
    }

    pub async fn execute_buy(&self, order: &mut Order, wallet_key: &str) -> Result<(), AppError> {
        let client = self.client_for_chain(&order.chain);

        let tx_sig = client.buy(BuyParams {
            token_address: order.token_address.clone(),
            pool_address: order.pool_address.clone(),
            amount: order.buy_amount,
            slippage: order.slippage_buy,
            priority_fee: order.priority_fee,
            wallet_private_key: wallet_key.to_string(),
            quote_mint: order.quote_mint.clone(),
        }).await?;

        order.buy_tx_signature = Some(tx_sig);
        order.buy_filled = true;
        order.entry_price = order.current_price;
        order.status = OrderStatus::Monitoring;
        order.updated_at = chrono::Utc::now();

        tracing::info!(token = %order.token_symbol, amount = order.buy_amount, "Buy executed");
        Ok(())
    }

    pub async fn execute_sell(&self, order: &mut Order, wallet_key: &str) -> Result<(), AppError> {
        let client = self.client_for_chain(&order.chain);
        let sell_amount = order.sell_amount.unwrap_or(order.buy_amount);

        let tx_sig = client.sell(SellParams {
            token_address: order.token_address.clone(),
            pool_address: order.pool_address.clone(),
            amount: sell_amount,
            slippage: order.slippage_sell,
            priority_fee: order.priority_fee,
            wallet_private_key: wallet_key.to_string(),
            quote_mint: order.quote_mint.clone(),
        }).await?;

        order.sell_tx_signature = Some(tx_sig);
        order.sell_filled = true;
        order.exit_price = order.current_price;
        order.pnl_percent = if order.entry_price > 0.0 {
            ((order.current_price - order.entry_price) / order.entry_price) * 100.0
        } else {
            0.0
        };
        order.status = OrderStatus::Sold;
        order.updated_at = chrono::Utc::now();

        tracing::info!(token = %order.token_symbol, pnl = order.pnl_percent, "Sell executed");
        Ok(())
    }

    pub async fn monitor_order(&self, order: &mut Order) -> Result<(), AppError> {
        if order.status == OrderStatus::Error || order.status == OrderStatus::Sold || order.status == OrderStatus::Cancelled {
            return Ok(());
        }

        let client = self.client_for_chain(&order.chain);
        let current_price = client.get_token_price(&order.pool_address).await?;
        order.current_price = current_price;

        order.pnl_percent = if order.entry_price > 0.0 {
            ((current_price - order.entry_price) / order.entry_price) * 100.0
        } else {
            0.0
        };
        order.updated_at = chrono::Utc::now();

        tracing::debug!(token = %order.token_symbol, price = current_price, pnl = order.pnl_percent, "Price updated");

        Ok(())
    }

    pub async fn run_monitor_loop(
        &self,
        db_pool: &sqlx::PgPool,
        wallet_keys: &std::collections::HashMap<String, String>,
    ) {
        loop {
            match self.monitor_cycle(db_pool, wallet_keys).await {
                Ok(_) => {}
                Err(e) => tracing::error!("Monitor cycle error: {}", e),
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(self.monitor_interval_secs)).await;
        }
    }

    async fn monitor_cycle(
        &self,
        db_pool: &sqlx::PgPool,
        wallet_keys: &std::collections::HashMap<String, String>,
    ) -> Result<(), AppError> {
        let orders = ghostRbot_db::queries::get_active_orders(db_pool).await
            .map_err(|e| AppError::Database(e.to_string()))?;

        for mut order in orders {
            if let Err(e) = self.monitor_order(&mut order).await {
                tracing::error!(token = %order.token_symbol, error = %e, "Failed to monitor order");
                continue;
            }

            if let Err(e) = ghostRbot_db::queries::update_order(db_pool, &order).await {
                tracing::error!(error = %e, "Failed to update order in DB");
            }

            if order.status == OrderStatus::Monitoring {
                // TODO: Check TP/SL conditions here based on config
            }
        }

        Ok(())
    }
}
