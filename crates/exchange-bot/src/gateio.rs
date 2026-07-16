use super::types::*;
use super::ExchangeApi;
use async_trait::async_trait;
use ghostRbot_core::AppError;
use hmac::{Hmac, Mac};
use reqwest::Client;
use sha2::Sha512;
use std::collections::HashMap;

type HmacSha512 = Hmac<Sha512>;

pub struct GateioExchange {
    api_key: String,
    api_secret: String,
    base_url: String,
    http: Client,
}

impl GateioExchange {
    pub fn new(api_key: &str, api_secret: &str, http: Client) -> Self {
        Self {
            api_key: api_key.to_string(),
            api_secret: api_secret.to_string(),
            base_url: "https://api.gateio.ws".to_string(),
            http,
        }
    }

    fn sign(&self, method: &str, path: &str, query: &str, body: &str) -> Result<(String, String), AppError> {
        let ts = chrono::Utc::now().timestamp().to_string();
        let body_hash = {
            use sha2::Digest;
            let mut hasher = sha2::Sha256::new();
            hasher.update(body.as_bytes());
            hex::encode(hasher.finalize())
        };
        let sign_str = format!("{}\n{}\n{}\n{}\n{}", method, path, query, body_hash, ts);
        let mut mac = HmacSha512::new_from_slice(self.api_secret.as_bytes())
            .map_err(|e| AppError::Encryption(e.to_string()))?;
        mac.update(sign_str.as_bytes());
        let sig = hex::encode(mac.finalize().into_bytes());
        Ok((ts, sig))
    }
}

#[async_trait]
impl ExchangeApi for GateioExchange {
    fn name(&self) -> &str { "gateio" }

    async fn fetch_balance(&self) -> Result<HashMap<String, f64>, AppError> {
        let path = "/api/v4/wallet/spot/accounts";
        let (ts, sig) = self.sign("GET", path, "", "")?;
        let resp = self.http.get(format!("{}{}", self.base_url, path))
            .header("KEY", &self.api_key)
            .header("Timestamp", &ts)
            .header("SIGN", &sig)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut balances = HashMap::new();
        if let Some(arr) = body.as_array() {
            for a in arr {
                let currency = a["currency"].as_str().unwrap_or("");
                let total = a["available"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0)
                    + a["locked"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
                if total > 0.0 { balances.insert(currency.to_string(), total); }
            }
        }
        Ok(balances)
    }

    async fn fetch_ticker(&self, symbol: &str) -> Result<Ticker, AppError> {
        let resp = self.http.get(format!("{}/api/v4/spot/tickers?currency_pair={}", self.base_url, symbol))
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let t = &body[0];
        Ok(Ticker {
            symbol: symbol.to_string(),
            last: t["last"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            bid: t["highest_bid"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            ask: t["lowest_ask"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            high_24h: t["high_24h"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            low_24h: t["low_24h"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            volume_24h: t["base_volume"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            change_24h_percent: t["change_percentage"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
        })
    }

    async fn create_order(&self, params: CreateOrderParams) -> Result<OrderResponse, AppError> {
        let path = "/api/v4/spot/orders";
        let side_str = match params.side { OrderSide::Buy => "buy", OrderSide::Sell => "sell" };
        let order_type = match params.order_type { ExchangeOrderType::Market => "market", ExchangeOrderType::Limit => "limit" };

        let mut body_map = serde_json::json!({
            "currency_pair": params.symbol,
            "side": side_str,
            "type": order_type,
            "amount": format!("{}", params.amount),
        });
        if let Some(price) = params.price { body_map["price"] = serde_json::json!(format!("{}", price)); }
        let body_str = serde_json::to_string(&body_map).unwrap_or_default();

        let (ts, sig) = self.sign("POST", path, "", &body_str)?;
        let resp = self.http.post(format!("{}{}", self.base_url, path))
            .header("KEY", &self.api_key)
            .header("Timestamp", &ts)
            .header("SIGN", &sig)
            .header("Content-Type", "application/json")
            .body(body_str)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        Ok(OrderResponse {
            order_id: body["id"].as_str().unwrap_or("").to_string(),
            symbol: params.symbol, side: params.side, order_type: params.order_type,
            amount: params.amount, price: params.price.unwrap_or(0.0),
            status: body["status"].as_str().unwrap_or("new").to_string(),
            filled_amount: body["filled_amount"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            created_at: chrono::Utc::now().timestamp_millis(),
        })
    }

    async fn cancel_order(&self, id: &str, symbol: &str) -> Result<(), AppError> {
        let path = format!("/api/v4/spot/orders/{}", id);
        let (ts, sig) = self.sign("DELETE", &path, &format!("currency_pair={}", symbol), "")?;
        self.http.delete(format!("{}{}", self.base_url, path))
            .header("KEY", &self.api_key)
            .header("Timestamp", &ts)
            .header("SIGN", &sig)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        Ok(())
    }

    async fn fetch_open_orders(&self, _symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> { Ok(vec![]) }
    async fn fetch_order_history(&self, _symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> { Ok(vec![]) }

    async fn fetch_markets(&self) -> Result<Vec<MarketInfo>, AppError> {
        let resp = self.http.get(format!("{}/api/v4/spot/currency_pairs", self.base_url))
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut markets = Vec::new();
        if let Some(arr) = body.as_array() {
            for s in arr {
                markets.push(MarketInfo {
                    symbol: s["id"].as_str().unwrap_or("").to_string(),
                    base: s["base"].as_str().unwrap_or("").to_string(),
                    quote: s["quote"].as_str().unwrap_or("").to_string(),
                    min_amount: s["min_base_amount"].as_str().unwrap_or("0.001").parse().unwrap_or(0.001),
                    min_notional: s["min_quote_amount"].as_str().unwrap_or("10").parse().unwrap_or(10.0),
                    price_precision: 8, amount_precision: 8,
                });
            }
        }
        Ok(markets)
    }
}
