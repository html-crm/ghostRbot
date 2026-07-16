use ghostRbot_core::{AppError, VolumeBotOrder, VolumeOrderStatus, Chain};
use ghostRbot_trading_engine::{DexClient, BuyParams, SellParams};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;

pub struct VolumeBot {
    orders: HashMap<uuid::Uuid, VolumeBotState>,
    solana_client: Arc<dyn DexClient>,
    bsc_client: Arc<dyn DexClient>,
}

struct VolumeBotState {
    order: VolumeBotOrder,
    current_wallet_index: usize,
    buy_count: u32,
    sell_count: u32,
    running: bool,
    cancel_tx: Option<mpsc::Sender<()>>,
}

impl VolumeBot {
    pub fn new(solana_client: Arc<dyn DexClient>, bsc_client: Arc<dyn DexClient>) -> Self {
        Self {
            orders: HashMap::new(),
            solana_client,
            bsc_client,
        }
    }

    fn client_for_chain(&self, chain: &Chain) -> Arc<dyn DexClient> {
        match chain {
            Chain::Solana => self.solana_client.clone(),
            Chain::Bsc | Chain::Ethereum => self.bsc_client.clone(),
        }
    }

    pub async fn start_order(&mut self, order: VolumeBotOrder, wallet_keys: HashMap<String, String>) -> Result<(), AppError> {
        let id = order.id;
        let (cancel_tx, mut cancel_rx) = mpsc::channel::<()>(1);

        let client = self.client_for_chain(&order.chain);
        let token_address = order.token_address.clone();
        let buy_amount = order.buy_amount;
        let buy_interval = std::time::Duration::from_secs(order.buy_interval_secs);
        let sell_interval = std::time::Duration::from_secs(order.sell_interval_secs);
        let total_buys = order.total_buys;
        let total_sells = order.total_sells;
        let wallets = order.wallets.clone();
        let chain = order.chain.clone();

        let state = VolumeBotState {
            order: order.clone(),
            current_wallet_index: 0,
            buy_count: 0,
            sell_count: 0,
            running: true,
            cancel_tx: Some(cancel_tx),
        };

        self.orders.insert(id, state);

        let order_id = id;
        tokio::spawn(async move {
            let mut wallet_index = 0usize;
            let mut buys_done = 0u32;
            let mut sells_done = 0u32;

            tracing::info!(order_id = %order_id, "Volume bot order started");

            loop {
                // Check for cancel
                if cancel_rx.try_recv().is_ok() {
                    tracing::info!(order_id = %order_id, "Volume bot order cancelled");
                    break;
                }

                // Do buy cycle
                if buys_done < total_buys {
                    let wallet_label = &wallets[wallet_index % wallets.len()];
                    if let Some(private_key) = wallet_keys.get(wallet_label) {
                        match client.buy(BuyParams {
                            token_address: token_address.clone(),
                            pool_address: String::new(),
                            amount: buy_amount,
                            slippage: 1.0,
                            priority_fee: 0.001,
                            wallet_private_key: private_key.clone(),
                            quote_mint: "So11111111111111111111111111111111111111112".to_string(),
                        }).await {
                            Ok(tx) => {
                                buys_done += 1;
                                wallet_index += 1;
                                tracing::info!(order_id = %order_id, buys = buys_done, tx = %tx, "Volume buy executed");
                            }
                            Err(e) => {
                                tracing::error!(order_id = %order_id, error = %e, "Volume buy failed");
                            }
                        }
                    }

                    if buys_done >= total_buys && sells_done >= total_sells {
                        tracing::info!(order_id = %order_id, "Volume order completed");
                        break;
                    }

                    tokio::select! {
                        _ = tokio::time::sleep(buy_interval) => {},
                        _ = cancel_rx.recv() => { break; }
                    }
                }

                // Do sell cycle
                if sells_done < total_sells {
                    let wallet_label = &wallets[wallet_index % wallets.len()];
                    if let Some(private_key) = wallet_keys.get(wallet_label) {
                        match client.sell(SellParams {
                            token_address: token_address.clone(),
                            pool_address: String::new(),
                            amount: buy_amount,
                            slippage: 1.0,
                            priority_fee: 0.001,
                            wallet_private_key: private_key.clone(),
                            quote_mint: "So11111111111111111111111111111111111111112".to_string(),
                        }).await {
                            Ok(tx) => {
                                sells_done += 1;
                                wallet_index += 1;
                                tracing::info!(order_id = %order_id, sells = sells_done, tx = %tx, "Volume sell executed");
                            }
                            Err(e) => {
                                tracing::error!(order_id = %order_id, error = %e, "Volume sell failed");
                            }
                        }
                    }

                    if buys_done >= total_buys && sells_done >= total_sells {
                        tracing::info!(order_id = %order_id, "Volume order completed");
                        break;
                    }

                    tokio::select! {
                        _ = tokio::time::sleep(sell_interval) => {},
                        _ = cancel_rx.recv() => { break; }
                    }
                }
            }

            tracing::info!(order_id = %order_id, "Volume bot task finished");
        });

        Ok(())
    }

    pub fn stop_order(&mut self, id: &uuid::Uuid) -> Result<(), AppError> {
        if let Some(state) = self.orders.get_mut(id) {
            state.running = false;
            if let Some(tx) = state.cancel_tx.take() {
                let _ = tx.try_send(());
            }
            tracing::info!(order_id = %id, "Volume order stop signal sent");
        }
        Ok(())
    }

    pub fn stop_all(&mut self) {
        for (id, state) in &mut self.orders {
            state.running = false;
            if let Some(tx) = state.cancel_tx.take() {
                let _ = tx.try_send(());
            }
        }
        tracing::info!("All volume orders stopped");
    }
}
