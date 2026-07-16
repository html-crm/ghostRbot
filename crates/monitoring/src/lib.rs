use ghostRbot_core::{AppError, Order, OrderStatus};
use ghostRbot_trading_engine::TradingEngine;
use ghostRbot_notifications::NotificationManager;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct PortfolioMonitor {
    trading_engine: Arc<TradingEngine>,
    notifier: Arc<NotificationManager>,
    check_interval_secs: u64,
}

impl PortfolioMonitor {
    pub fn new(trading_engine: Arc<TradingEngine>, notifier: Arc<NotificationManager>) -> Self {
        Self {
            trading_engine,
            notifier,
            check_interval_secs: 10,
        }
    }

    pub async fn run(&self, db_pool: &sqlx::PgPool, wallet_keys: Arc<std::collections::HashMap<String, String>>) {
        loop {
            match self.monitor_cycle(db_pool, &wallet_keys).await {
                Ok(_) => {}
                Err(e) => tracing::error!("Monitor cycle error: {}", e),
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(self.check_interval_secs)).await;
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
            // Skip orders in error state to prevent infinite loop
            if order.status == OrderStatus::Error || order.status == OrderStatus::Sold || order.status == OrderStatus::Cancelled {
                continue;
            }

            // Update price
            if let Err(e) = self.trading_engine.monitor_order(&mut order).await {
                tracing::error!(token = %order.token_symbol, error = %e, "Failed to update price");
                continue;
            }

            // Check for significant PnL changes
            if order.pnl_percent.abs() > 5.0 {
                let direction = if order.pnl_percent > 0.0 { "📈" } else { "📉" };
                let msg = format!(
                    "{} {} PnL: {:+.1}% | Price: ${:.6}",
                    direction, order.token_symbol, order.pnl_percent, order.current_price
                );
                self.notifier.send_alert("PnL Alert", &msg).await.ok();
            }

            // Save to DB
            if let Err(e) = ghostRbot_db::queries::update_order(db_pool, &order).await {
                tracing::error!(error = %e, "Failed to update order");
            }
        }

        Ok(())
    }
}

pub struct RugDetector;

impl RugDetector {
    pub async fn detect_rug(pool_address: &str, http: &reqwest::Client) -> Result<bool, AppError> {
        // Check liquidity drop via DexScreener
        let resp = http.get(format!("https://api.dexscreener.com/latest/dex/pools/{}", pool_address))
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        if let Some(pool) = body["pairs"][0].as_object() {
            let liquidity = pool["liquidity"]["usd"].as_f64().unwrap_or(0.0);
            let price_change = pool["priceChange"]["h1"].as_f64().unwrap_or(0.0);

            // Detect rug conditions
            if liquidity < 100.0 {
                tracing::warn!(pool = %pool_address, liquidity = liquidity, "Low liquidity detected - possible rug");
                return Ok(true);
            }

            if price_change < -90.0 {
                tracing::warn!(pool = %pool_address, drop = price_change, "Massive price drop - possible rug");
                return Ok(true);
            }
        }

        Ok(false)
    }
}
