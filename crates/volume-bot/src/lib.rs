use ghostRbot_core::{AppError, VolumeBotOrder};
use ghostRbot_trading_engine::{DexClient, BuyParams, SellParams};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;

pub struct VolumeBot {
    solana_client: Arc<dyn DexClient>,
    bsc_client: Arc<dyn DexClient>,
    cancel_txs: HashMap<uuid::Uuid, mpsc::Sender<()>>,
}

impl VolumeBot {
    pub fn new(solana_client: Arc<dyn DexClient>, bsc_client: Arc<dyn DexClient>) -> Self {
        Self {
            solana_client,
            bsc_client,
            cancel_txs: HashMap::new(),
        }
    }

    fn client_for_chain(&self, chain: &ghostRbot_core::Chain) -> Arc<dyn DexClient> {
        match chain {
            ghostRbot_core::Chain::Solana => self.solana_client.clone(),
            ghostRbot_core::Chain::Bsc | ghostRbot_core::Chain::Ethereum => self.bsc_client.clone(),
        }
    }

    pub fn start_order(&mut self, order: VolumeBotOrder, wallet_keys: HashMap<String, String>) {
        let id = order.id;
        let (cancel_tx, mut cancel_rx) = mpsc::channel::<()>(1);
        self.cancel_txs.insert(id, cancel_tx);

        let client = self.client_for_chain(&order.chain);
        let token_address = order.token_address.clone();
        let buy_amount = order.buy_amount;
        let buy_interval = std::time::Duration::from_secs(order.buy_interval_secs);
        let sell_interval = std::time::Duration::from_secs(order.sell_interval_secs);
        let total_buys = order.total_buys;
        let total_sells = order.total_sells;
        let wallets = order.wallets.clone();

        tokio::spawn(async move {
            let mut wallet_index = 0usize;
            let mut buys_done = 0u32;
            let mut sells_done = 0u32;

            tracing::info!(order_id = %id, "Volume bot order started");

            loop {
                if cancel_rx.try_recv().is_ok() {
                    tracing::info!(order_id = %id, "Volume order cancelled");
                    break;
                }

                // Buy
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
                                tracing::info!(order_id = %id, buys = buys_done, tx = %tx, "Volume buy");
                            }
                            Err(e) => tracing::error!(order_id = %id, error = %e, "Volume buy failed"),
                        }
                    }

                    if buys_done >= total_buys && sells_done >= total_sells {
                        tracing::info!(order_id = %id, "Volume order completed");
                        break;
                    }

                    tokio::select! {
                        _ = tokio::time::sleep(buy_interval) => {},
                        _ = cancel_rx.recv() => { break; }
                    }
                }

                // Sell
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
                                tracing::info!(order_id = %id, sells = sells_done, tx = %tx, "Volume sell");
                            }
                            Err(e) => tracing::error!(order_id = %id, error = %e, "Volume sell failed"),
                        }
                    }

                    if buys_done >= total_buys && sells_done >= total_sells {
                        tracing::info!(order_id = %id, "Volume order completed");
                        break;
                    }

                    tokio::select! {
                        _ = tokio::time::sleep(sell_interval) => {},
                        _ = cancel_rx.recv() => { break; }
                    }
                }
            }

            tracing::info!(order_id = %id, "Volume bot task finished");
        });
    }

    pub fn stop_order(&mut self, id: &uuid::Uuid) {
        if let Some(tx) = self.cancel_txs.remove(id) {
            let _ = tx.try_send(());
            tracing::info!(order_id = %id, "Volume order stop signal sent");
        }
    }

    pub fn stop_all(&mut self) {
        for (id, tx) in self.cancel_txs.drain() {
            let _ = tx.try_send(());
            tracing::info!(order_id = %id, "Volume order stop signal sent");
        }
        tracing::info!("All volume orders stopped");
    }
}
