use super::types::*;
use super::ExchangeApi;
use async_trait::async_trait;
use ghostRbot_core::AppError;
use hmac::{Hmac, Mac};
use reqwest::Client;
use sha2::Sha256;
use std::collections::HashMap;

type HmacSha256 = Hmac<Sha256>;

pub struct BybitExchange {
    api_key: String,
    api_secret: String,
    base_url: String,
    http: Client,
}

impl BybitExchange {
    pub fn new(api_key: &str, api_secret: &str, _password: &str, http: Client) -> Self {
        Self {
            api_key: api_key.to_string(),
            api_secret: api_secret.to_string(),
            base_url: "https://api.bybit.com".to_string(),
            http,
        }
    }

    fn sign(&self, timestamp: &str, params: &str) -> Result<String, AppError> {
        let mut mac = HmacSha256::new_from_slice(self.api_secret.as_bytes())
            .map_err(|e| AppError::Encryption(e.to_string()))?;
        mac.update(format!("{}{}{}", timestamp, self.api_key, params).as_bytes());
        Ok(hex::encode(mac.finalize().into_bytes()))
    }

    fn timestamp() -> String {
        chrono::Utc::now().timestamp_millis().to_string()
    }
}

#[async_trait]
impl ExchangeApi for BybitExchange {
    fn name(&self) -> &str { "bybit" }

    async fn fetch_balance(&self) -> Result<HashMap<String, f64>, AppError> {
        let timestamp = Self::timestamp();
        let query = "accountType=UNIFIED";
        let signature = self.sign(&timestamp, query)?;
        let url = format!("{}/v5/account/wallet-balance?{}&sign={}&timestamp={}&api_key={}", self.base_url, query, signature, timestamp, self.api_key);

        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let mut balances = HashMap::new();
        if let Some(list) = body["result"]["list"][0]["coin"].as_array() {
            for coin in list {
                let name = coin["coin"].as_str().unwrap_or("");
                let total = coin["walletBalance"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
                if total > 0.0 {
                    balances.insert(name.to_string(), total);
                }
            }
        }
        Ok(balances)
    }

    async fn fetch_ticker(&self, symbol: &str) -> Result<Ticker, AppError> {
        let url = format!("{}/v5/market/tickers?category=spot&symbol={}", self.base_url, symbol);
        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let t = &body["result"]["list"][0];

        Ok(Ticker {
            symbol: symbol.to_string(),
            last: t["lastPrice"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            bid: t["bid1Price"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            ask: t["ask1Price"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            high_24h: t["highPrice24h"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            low_24h: t["lowPrice24h"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            volume_24h: t["volume24h"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            change_24h_percent: t["price24hPcnt"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0) * 100.0,
        })
    }

    async fn create_order(&self, params: CreateOrderParams) -> Result<OrderResponse, AppError> {
        let timestamp = Self::timestamp();
        let side_str = match params.side { OrderSide::Buy => "Buy", OrderSide::Sell => "Sell" };
        let order_type = match params.order_type { ExchangeOrderType::Market => "Market", ExchangeOrderType::Limit => "Limit" };

        let mut body_map = serde_json::json!({
            "category": "spot",
            "symbol": params.symbol,
            "side": side_str,
            "orderType": order_type,
            "qty": format!("{}", params.amount),
        });

        if let Some(price) = params.price {
            body_map["price"] = serde_json::json!(format!("{}", price));
        }

        let body_str = serde_json::to_string(&body_map).unwrap_or_default();
        let signature = self.sign(&timestamp, &body_str)?;

        let resp = self.http.post(format!("{}/v5/order/create", self.base_url))
            .header("X-BAPI-API-KEY", &self.api_key)
            .header("X-BAPI-SIGN", &signature)
            .header("X-BAPI-TIMESTAMP", &timestamp)
            .header("Content-Type", "application/json")
            .body(body_str)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        if body["retCode"].as_i64() != Some(0) {
            return Err(AppError::Trading(format!("Bybit error: {}", body["retMsg"].as_str().unwrap_or("unknown"))));
        }

        Ok(OrderResponse {
            order_id: body["result"]["orderId"].as_str().unwrap_or("").to_string(),
            symbol: params.symbol,
            side: params.side,
            order_type: params.order_type,
            amount: params.amount,
            price: params.price.unwrap_or(0.0),
            status: "NEW".to_string(),
            filled_amount: 0.0,
            created_at: timestamp.parse().unwrap_or(0),
        })
    }

    async fn cancel_order(&self, id: &str, symbol: &str) -> Result<(), AppError> {
        let timestamp = Self::timestamp();
        let body = serde_json::json!({"category":"spot","symbol":symbol,"orderId":id});
        let body_str = serde_json::to_string(&body).unwrap_or_default();
        let signature = self.sign(&timestamp, &body_str)?;

        self.http.post(format!("{}/v5/order/cancel", self.base_url))
            .header("X-BAPI-API-KEY", &self.api_key)
            .header("X-BAPI-SIGN", &signature)
            .header("X-BAPI-TIMESTAMP", &timestamp)
            .header("Content-Type", "application/json")
            .body(body_str)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        Ok(())
    }

    async fn fetch_open_orders(&self, symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> {
        let timestamp = Self::timestamp();
        let mut query = "category=spot&openOnly=0".to_string();
        if let Some(s) = symbol { query.push_str(&format!("&symbol={}", s)); }

        let signature = self.sign(&timestamp, &query)?;
        let url = format!("{}/v5/order/realtime?{}&sign={}&timestamp={}&api_key={}", self.base_url, query, signature, timestamp, self.api_key);

        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut orders = Vec::new();

        if let Some(list) = body["result"]["list"].as_array() {
            for o in list {
                orders.push(OrderResponse {
                    order_id: o["orderId"].as_str().unwrap_or("").to_string(),
                    symbol: o["symbol"].as_str().unwrap_or("").to_string(),
                    side: if o["side"].as_str() == Some("Buy") { OrderSide::Buy } else { OrderSide::Sell },
                    order_type: if o["orderType"].as_str() == Some("Market") { ExchangeOrderType::Market } else { ExchangeOrderType::Limit },
                    amount: o["qty"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    price: o["price"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    status: o["orderStatus"].as_str().unwrap_or("").to_string(),
                    filled_amount: o["cumExecQty"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    created_at: o["createdTime"].as_str().unwrap_or("0").parse().unwrap_or(0),
                });
            }
        }
        Ok(orders)
    }

    async fn fetch_order_history(&self, symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> {
        let timestamp = Self::timestamp();
        let mut query = "category=spot".to_string();
        if let Some(s) = symbol { query.push_str(&format!("&symbol={}", s)); }

        let signature = self.sign(&timestamp, &query)?;
        let url = format!("{}/v5/order/history?{}&sign={}&timestamp={}&api_key={}", self.base_url, query, signature, timestamp, self.api_key);

        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut orders = Vec::new();

        if let Some(list) = body["result"]["list"].as_array() {
            for o in list {
                orders.push(OrderResponse {
                    order_id: o["orderId"].as_str().unwrap_or("").to_string(),
                    symbol: o["symbol"].as_str().unwrap_or("").to_string(),
                    side: if o["side"].as_str() == Some("Buy") { OrderSide::Buy } else { OrderSide::Sell },
                    order_type: if o["orderType"].as_str() == Some("Market") { ExchangeOrderType::Market } else { ExchangeOrderType::Limit },
                    amount: o["qty"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    price: o["price"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    status: o["orderStatus"].as_str().unwrap_or("").to_string(),
                    filled_amount: o["cumExecQty"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    created_at: o["createdTime"].as_str().unwrap_or("0").parse().unwrap_or(0),
                });
            }
        }
        Ok(orders)
    }

    async fn fetch_markets(&self) -> Result<Vec<MarketInfo>, AppError> {
        let url = format!("{}/v5/market/instruments-info?category=spot", self.base_url);
        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut markets = Vec::new();

        if let Some(list) = body["result"]["list"].as_array() {
            for s in list {
                markets.push(MarketInfo {
                    symbol: s["symbol"].as_str().unwrap_or("").to_string(),
                    base: s["baseCoin"].as_str().unwrap_or("").to_string(),
                    quote: s["quoteCoin"].as_str().unwrap_or("").to_string(),
                    min_amount: s["lotSizeFilter"]["minOrderQty"].as_str().unwrap_or("0.001").parse().unwrap_or(0.001),
                    min_notional: s["lotSizeFilter"]["minOrderValue"].as_str().unwrap_or("10").parse().unwrap_or(10.0),
                    price_precision: s["priceFilter"]["tickSize"].as_str().unwrap_or("0.01").split('.').last().map(|d| d.len() as u32).unwrap_or(2),
                    amount_precision: s["lotSizeFilter"]["qtyStep"].as_str().unwrap_or("0.001").split('.').last().map(|d| d.len() as u32).unwrap_or(3),
                });
            }
        }
        Ok(markets)
    }
}
