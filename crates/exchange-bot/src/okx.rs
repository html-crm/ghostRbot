use super::types::*;
use super::ExchangeApi;
use async_trait::async_trait;
use ghostRbot_core::AppError;
use hmac::{Hmac, Mac};
use reqwest::Client;
use sha2::Sha256;
use base64::Engine;
use std::collections::HashMap;

type HmacSha256 = Hmac<Sha256>;

pub struct OkxExchange {
    api_key: String,
    api_secret: String,
    passphrase: String,
    base_url: String,
    http: Client,
}

impl OkxExchange {
    pub fn new(api_key: &str, api_secret: &str, passphrase: &str, http: Client) -> Self {
        Self {
            api_key: api_key.to_string(),
            api_secret: api_secret.to_string(),
            passphrase: passphrase.to_string(),
            base_url: "https://www.okx.com".to_string(),
            http,
        }
    }

    fn sign(&self, timestamp: &str, method: &str, path: &str, body: &str) -> Result<String, AppError> {
        let message = format!("{}{}{}{}", timestamp, method.to_uppercase(), path, body);
        let mut mac = HmacSha256::new_from_slice(self.api_secret.as_bytes())
            .map_err(|e| AppError::Encryption(e.to_string()))?;
        mac.update(message.as_bytes());
        Ok(base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes()))
    }

    fn timestamp() -> String {
        chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
    }
}

#[async_trait]
impl ExchangeApi for OkxExchange {
    fn name(&self) -> &str { "okx" }

    async fn fetch_balance(&self) -> Result<HashMap<String, f64>, AppError> {
        let timestamp = Self::timestamp();
        let path = "/api/v5/account/balance";
        let signature = self.sign(&timestamp, "GET", path, "")?;

        let url = format!("{}{}", self.base_url, path);
        let resp = self.http.get(&url)
            .header("OK-ACCESS-KEY", &self.api_key)
            .header("OK-ACCESS-SIGN", &signature)
            .header("OK-ACCESS-TIMESTAMP", &timestamp)
            .header("OK-ACCESS-PASSPHRASE", &self.passphrase)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut balances = HashMap::new();

        if let Some(details) = body["data"][0]["details"].as_array() {
            for d in details {
                let ccy = d["ccy"].as_str().unwrap_or("");
                let total = d["eq"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
                if total > 0.0 {
                    balances.insert(ccy.to_string(), total);
                }
            }
        }
        Ok(balances)
    }

    async fn fetch_ticker(&self, symbol: &str) -> Result<Ticker, AppError> {
        let url = format!("{}/api/v5/market/ticker?instId={}", self.base_url, symbol);
        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let t = &body["data"][0];

        Ok(Ticker {
            symbol: symbol.to_string(),
            last: t["last"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            bid: t["bidPx"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            ask: t["askPx"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            high_24h: t["high24h"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            low_24h: t["low24h"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            volume_24h: t["vol24h"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            change_24h_percent: t["sodUtc8"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0),
        })
    }

    async fn create_order(&self, params: CreateOrderParams) -> Result<OrderResponse, AppError> {
        let timestamp = Self::timestamp();
        let side_str = match params.side { OrderSide::Buy => "buy", OrderSide::Sell => "sell" };
        let order_type = match params.order_type { ExchangeOrderType::Market => "market", ExchangeOrderType::Limit => "limit" };

        let mut body_map = serde_json::json!({
            "instId": params.symbol,
            "tdMode": "cash",
            "side": side_str,
            "ordType": order_type,
            "sz": format!("{}", params.amount),
        });

        if let Some(price) = params.price {
            body_map["px"] = serde_json::json!(format!("{}", price));
        }

        let body_str = serde_json::to_string(&body_map).unwrap_or_default();
        let path = "/api/v5/trade/order";
        let signature = self.sign(&timestamp, "POST", path, &body_str)?;

        let resp = self.http.post(format!("{}{}", self.base_url, path))
            .header("OK-ACCESS-KEY", &self.api_key)
            .header("OK-ACCESS-SIGN", &signature)
            .header("OK-ACCESS-TIMESTAMP", &timestamp)
            .header("OK-ACCESS-PASSPHRASE", &self.passphrase)
            .header("Content-Type", "application/json")
            .body(body_str)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        if body["code"].as_str() != Some("0") {
            return Err(AppError::Trading(format!("OKX error: {}", body["msg"].as_str().unwrap_or("unknown"))));
        }

        Ok(OrderResponse {
            order_id: body["data"][0]["ordId"].as_str().unwrap_or("").to_string(),
            symbol: params.symbol,
            side: params.side,
            order_type: params.order_type,
            amount: params.amount,
            price: params.price.unwrap_or(0.0),
            status: "NEW".to_string(),
            filled_amount: 0.0,
            created_at: chrono::Utc::now().timestamp_millis(),
        })
    }

    async fn cancel_order(&self, id: &str, symbol: &str) -> Result<(), AppError> {
        let timestamp = Self::timestamp();
        let body = serde_json::json!({"instId":symbol,"ordId":id});
        let body_str = serde_json::to_string(&body).unwrap_or_default();
        let path = "/api/v5/trade/cancel-order";
        let signature = self.sign(&timestamp, "POST", path, &body_str)?;

        self.http.post(format!("{}{}", self.base_url, path))
            .header("OK-ACCESS-KEY", &self.api_key)
            .header("OK-ACCESS-SIGN", &signature)
            .header("OK-ACCESS-TIMESTAMP", &timestamp)
            .header("OK-ACCESS-PASSPHRASE", &self.passphrase)
            .header("Content-Type", "application/json")
            .body(body_str)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        Ok(())
    }

    async fn fetch_open_orders(&self, _symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> {
        Ok(vec![])
    }

    async fn fetch_order_history(&self, _symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> {
        Ok(vec![])
    }

    async fn fetch_markets(&self) -> Result<Vec<MarketInfo>, AppError> {
        let url = format!("{}/api/v5/public/instruments?instType=SPOT", self.base_url);
        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut markets = Vec::new();

        if let Some(list) = body["data"].as_array() {
            for s in list {
                let base = s["baseCcy"].as_str().unwrap_or("").to_string();
                let quote = s["quoteCcy"].as_str().unwrap_or("").to_string();
                markets.push(MarketInfo {
                    symbol: s["instId"].as_str().unwrap_or("").to_string(),
                    base,
                    quote,
                    min_amount: s["lotSz"].as_str().unwrap_or("0.001").parse().unwrap_or(0.001),
                    min_notional: s["minSz"].as_str().unwrap_or("0.001").parse().unwrap_or(0.001),
                    price_precision: s["tickSz"].as_str().unwrap_or("0.01").split('.').last().map(|d| d.len() as u32).unwrap_or(2),
                    amount_precision: s["lotSz"].as_str().unwrap_or("0.001").split('.').last().map(|d| d.len() as u32).unwrap_or(3),
                });
            }
        }
        Ok(markets)
    }
}
