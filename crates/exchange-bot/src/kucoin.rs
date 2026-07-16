use super::types::*;
use super::ExchangeApi;
use async_trait::async_trait;
use ghostRbot_core::AppError;
use reqwest::Client;
use std::collections::HashMap;

pub struct KucoinExchange {
    api_key: String,
    api_secret: String,
    passphrase: String,
    base_url: String,
    http: Client,
}

impl KucoinExchange {
    pub fn new(api_key: &str, api_secret: &str, passphrase: &str, http: Client) -> Self {
        Self {
            api_key: api_key.to_string(),
            api_secret: api_secret.to_string(),
            passphrase: passphrase.to_string(),
            base_url: "https://api.kucoin.com".to_string(),
            http,
        }
    }
}

#[async_trait]
impl ExchangeApi for KucoinExchange {
    fn name(&self) -> &str { "kucoin" }

    async fn fetch_balance(&self) -> Result<HashMap<String, f64>, AppError> {
        let resp = self.http.get(format!("{}/api/v1/accounts", self.base_url))
            .header("KC-API-KEY", &self.api_key)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut balances = HashMap::new();

        if let Some(data) = body["data"].as_array() {
            for a in data {
                let currency = a["currency"].as_str().unwrap_or("");
                let total = a["balance"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
                if total > 0.0 { balances.insert(currency.to_string(), total); }
            }
        }
        Ok(balances)
    }

    async fn fetch_ticker(&self, symbol: &str) -> Result<Ticker, AppError> {
        let resp = self.http.get(format!("{}/api/v1/market/orderbook/level1?symbol={}", self.base_url, symbol))
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let d = &body["data"];

        Ok(Ticker {
            symbol: symbol.to_string(),
            last: d["price"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            bid: d["bestBid"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            ask: d["bestAsk"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            high_24h: 0.0, low_24h: 0.0, volume_24h: 0.0, change_24h_percent: 0.0,
        })
    }

    async fn create_order(&self, params: CreateOrderParams) -> Result<OrderResponse, AppError> {
        let side_str = match params.side { OrderSide::Buy => "buy", OrderSide::Sell => "sell" };
        let order_type = match params.order_type { ExchangeOrderType::Market => "market", ExchangeOrderType::Limit => "limit" };

        let mut body_map = serde_json::json!({
            "symbol": params.symbol,
            "side": side_str,
            "type": order_type,
            "size": format!("{}", params.amount),
        });
        if let Some(price) = params.price { body_map["price"] = serde_json::json!(format!("{}", price)); }

        let resp = self.http.post(format!("{}/api/v1/orders", self.base_url))
            .header("KC-API-KEY", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&body_map)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        Ok(OrderResponse {
            order_id: body["data"]["orderId"].as_str().unwrap_or("").to_string(),
            symbol: params.symbol, side: params.side, order_type: params.order_type,
            amount: params.amount, price: params.price.unwrap_or(0.0),
            status: "NEW".to_string(), filled_amount: 0.0,
            created_at: chrono::Utc::now().timestamp_millis(),
        })
    }

    async fn cancel_order(&self, id: &str, _symbol: &str) -> Result<(), AppError> {
        self.http.delete(format!("{}/api/v1/orders/{}", self.base_url, id))
            .header("KC-API-KEY", &self.api_key)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        Ok(())
    }

    async fn fetch_open_orders(&self, _symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> { Ok(vec![]) }
    async fn fetch_order_history(&self, _symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> { Ok(vec![]) }

    async fn fetch_markets(&self) -> Result<Vec<MarketInfo>, AppError> {
        let resp = self.http.get(format!("{}/api/v1/symbols", self.base_url))
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut markets = Vec::new();
        if let Some(list) = body["data"].as_array() {
            for s in list {
                markets.push(MarketInfo {
                    symbol: s["symbol"].as_str().unwrap_or("").to_string(),
                    base: s["baseCurrency"].as_str().unwrap_or("").to_string(),
                    quote: s["quoteCurrency"].as_str().unwrap_or("").to_string(),
                    min_amount: s["baseMinSize"].as_str().unwrap_or("0.001").parse().unwrap_or(0.001),
                    min_notional: s["minOrderAmt"].as_str().unwrap_or("10").parse().unwrap_or(10.0),
                    price_precision: 8, amount_precision: 8,
                });
            }
        }
        Ok(markets)
    }
}
