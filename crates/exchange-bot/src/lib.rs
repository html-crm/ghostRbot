pub mod binance;
pub mod bybit;
pub mod okx;
pub mod kucoin;
pub mod gateio;
pub mod types;

use ghostRbot_core::AppError;
use async_trait::async_trait;
use std::collections::HashMap;

pub use types::*;

#[async_trait]
pub trait ExchangeApi: Send + Sync {
    fn name(&self) -> &str;
    async fn fetch_balance(&self) -> Result<HashMap<String, f64>, AppError>;
    async fn fetch_ticker(&self, symbol: &str) -> Result<Ticker, AppError>;
    async fn create_order(&self, params: CreateOrderParams) -> Result<OrderResponse, AppError>;
    async fn cancel_order(&self, id: &str, symbol: &str) -> Result<(), AppError>;
    async fn fetch_open_orders(&self, symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError>;
    async fn fetch_order_history(&self, symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError>;
    async fn fetch_markets(&self) -> Result<Vec<MarketInfo>, AppError>;
}

pub fn create_exchange(name: &str, api_key: &str, api_secret: &str, password: Option<&str>, http: reqwest::Client) -> Result<Box<dyn ExchangeApi>, AppError> {
    match name.to_lowercase().as_str() {
        "binance" => Ok(Box::new(binance::BinanceExchange::new(api_key, api_secret, http))),
        "bybit" => Ok(Box::new(bybit::BybitExchange::new(api_key, api_secret, password.unwrap_or(""), http))),
        "okx" => Ok(Box::new(okx::OkxExchange::new(api_key, api_secret, password.unwrap_or(""), http))),
        "kucoin" => Ok(Box::new(kucoin::KucoinExchange::new(api_key, api_secret, password.unwrap_or(""), http))),
        "gateio" => Ok(Box::new(gateio::GateioExchange::new(api_key, api_secret, http))),
        _ => Err(AppError::BadRequest(format!("Unknown exchange: {}", name))),
    }
}
