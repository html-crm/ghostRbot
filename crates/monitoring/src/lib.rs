use ghostRbot_core::{AppError, Order, OrderStatus};
use ghostRbot_trading_engine::TradingEngine;
use ghostRbot_notifications::NotificationManager;
use std::collections::HashMap;
use std::sync::Arc;

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

    pub async fn run(&self, orders: &mut Vec<Order>, wallet_keys: &HashMap<String, String>) {
        loop {
            self.monitor_cycle(orders, wallet_keys).await;
            tokio::time::sleep(tokio::time::Duration::from_secs(self.check_interval_secs)).await;
        }
    }

    async fn monitor_cycle(&self, orders: &mut Vec<Order>, _wallet_keys: &HashMap<String, String>) {
        for order in orders.iter_mut() {
            if order.status == OrderStatus::Error || order.status == OrderStatus::Sold || order.status == OrderStatus::Cancelled {
                continue;
            }

            if let Err(e) = self.trading_engine.monitor_order(order).await {
                tracing::error!(token = %order.token_symbol, error = %e, "Failed to update price");
                continue;
            }

            if order.pnl_percent.abs() > 5.0 {
                let direction = if order.pnl_percent > 0.0 { "📈" } else { "📉" };
                let msg = format!(
                    "{} {} PnL: {:+.1}% | Price: ${:.6}",
                    direction, order.token_symbol, order.pnl_percent, order.current_price
                );
                self.notifier.send_alert("PnL Alert", &msg).await.ok();
            }
        }
    }
}

pub struct RugDetector;

impl RugDetector {
    pub async fn detect_rug(pool_address: &str, http: &reqwest::Client) -> Result<bool, AppError> {
        let resp = http.get(format!("https://api.dexscreener.com/latest/dex/pools/{}", pool_address))
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        if let Some(pool) = body["pairs"][0].as_object() {
            let liquidity = pool["liquidity"]["usd"].as_f64().unwrap_or(0.0);
            let price_change = pool["priceChange"]["h1"].as_f64().unwrap_or(0.0);

            if liquidity < 100.0 {
                tracing::warn!(pool = %pool_address, liquidity = liquidity, "Low liquidity - possible rug");
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
