use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ticker {
    pub symbol: String,
    pub last: f64,
    pub bid: f64,
    pub ask: f64,
    pub high_24h: f64,
    pub low_24h: f64,
    pub volume_24h: f64,
    pub change_24h_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderParams {
    pub symbol: String,
    pub side: OrderSide,
    pub order_type: ExchangeOrderType,
    pub amount: f64,
    pub price: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum OrderSide {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum ExchangeOrderType {
    Market,
    Limit,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderResponse {
    pub order_id: String,
    pub symbol: String,
    pub side: OrderSide,
    pub order_type: ExchangeOrderType,
    pub amount: f64,
    pub price: f64,
    pub status: String,
    pub filled_amount: f64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketInfo {
    pub symbol: String,
    pub base: String,
    pub quote: String,
    pub min_amount: f64,
    pub min_notional: f64,
    pub price_precision: u32,
    pub amount_precision: u32,
}

pub struct SignedParams {
    pub query: String,
    pub signature: String,
}
