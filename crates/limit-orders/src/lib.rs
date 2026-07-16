use ghostRbot_core::{AppError, LimitOrder, LimitOrderStatus, LimitOrderType};
use ghostRbot_trading_engine::{DexClient, SellParams};
use std::collections::HashMap;
use std::sync::Arc;

pub struct LimitOrderEngine {
    poll_interval_secs: u64,
}

impl LimitOrderEngine {
    pub fn new() -> Self {
        Self { poll_interval_secs: 30 }
    }

    pub async fn run_poll_loop(
        &self,
        orders: &mut Vec<LimitOrder>,
        solana_client: Arc<dyn DexClient>,
        bsc_client: Arc<dyn DexClient>,
        wallet_keys: &HashMap<String, String>,
    ) {
        loop {
            self.poll_cycle(orders, &solana_client, &bsc_client, wallet_keys).await;
            tokio::time::sleep(tokio::time::Duration::from_secs(self.poll_interval_secs)).await;
        }
    }

    async fn poll_cycle(
        &self,
        orders: &mut Vec<LimitOrder>,
        solana_client: &Arc<dyn DexClient>,
        bsc_client: &Arc<dyn DexClient>,
        wallet_keys: &HashMap<String, String>,
    ) {
        for order in orders.iter_mut() {
            if order.status != LimitOrderStatus::Pending {
                continue;
            }

            if let Err(e) = self.check_and_trigger(order, solana_client, bsc_client, wallet_keys).await {
                tracing::error!(order_id = %order.id, error = %e, "Failed to check limit order");
            }
        }
    }

    async fn check_and_trigger(
        &self,
        order: &mut LimitOrder,
        solana_client: &Arc<dyn DexClient>,
        bsc_client: &Arc<dyn DexClient>,
        wallet_keys: &HashMap<String, String>,
    ) -> Result<(), AppError> {
        let client: &dyn DexClient = match order.chain {
            ghostRbot_core::Chain::Solana => &**solana_client,
            ghostRbot_core::Chain::Bsc | ghostRbot_core::Chain::Ethereum => &**bsc_client,
        };

        let current_price = client.get_token_price(&order.token_address).await?;

        let should_trigger = match order.order_type {
            LimitOrderType::TakeProfit => current_price >= order.trigger_price,
            LimitOrderType::StopLoss => current_price <= order.trigger_price,
        };

        if should_trigger {
            tracing::info!(
                order_id = %order.id,
                current_price = current_price,
                trigger_price = order.trigger_price,
                "Limit order triggered"
            );

            let wallet_label = wallet_keys.keys().next().ok_or_else(|| AppError::Trading("No wallet available".into()))?;
            let private_key = wallet_keys.get(wallet_label).unwrap();

            match client.sell(SellParams {
                token_address: order.token_address.clone(),
                pool_address: order.token_address.clone(),
                amount: order.amount,
                slippage: 1.0,
                priority_fee: 0.001,
                wallet_private_key: private_key.clone(),
                quote_mint: "So11111111111111111111111111111111111111112".to_string(),
            }).await {
                Ok(_tx) => {
                    order.status = LimitOrderStatus::Triggered;
                    tracing::info!(order_id = %order.id, "Limit order executed");
                }
                Err(e) => {
                    order.status = LimitOrderStatus::Error;
                    tracing::error!(order_id = %order.id, error = %e, "Limit order execution failed");
                }
            }
        }

        Ok(())
    }
}
