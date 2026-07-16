use super::types::*;
use super::ExchangeApi;
use async_trait::async_trait;
use ghostRbot_core::AppError;
use hmac::{Hmac, Mac};
use reqwest::Client;
use sha2::Sha256;
use std::collections::HashMap;

type HmacSha256 = Hmac<Sha256>;

pub struct BinanceExchange {
    api_key: String,
    api_secret: String,
    base_url: String,
    http: Client,
}

impl BinanceExchange {
    pub fn new(api_key: &str, api_secret: &str, http: Client) -> Self {
        Self {
            api_key: api_key.to_string(),
            api_secret: api_secret.to_string(),
            base_url: "https://api.binance.com".to_string(),
            http,
        }
    }

    fn sign(&self, query: &str) -> Result<String, AppError> {
        let mut mac = HmacSha256::new_from_slice(self.api_secret.as_bytes())
            .map_err(|e| AppError::Encryption(e.to_string()))?;
        mac.update(query.as_bytes());
        Ok(hex::encode(mac.finalize().into_bytes()))
    }

    fn timestamp() -> i64 {
        chrono::Utc::now().timestamp_millis()
    }
}

#[async_trait]
impl ExchangeApi for BinanceExchange {
    fn name(&self) -> &str { "binance" }

    async fn fetch_balance(&self) -> Result<HashMap<String, f64>, AppError> {
        let timestamp = Self::timestamp();
        let query = format!("timestamp={}", timestamp);
        let signature = self.sign(&query)?;

        let url = format!("{}/api/v3/account?{}&signature={}", self.base_url, query, signature);
        let resp = self.http.get(&url)
            .header("X-MBX-APIKEY", &self.api_key)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let mut balances = HashMap::new();
        if let Some(balances_arr) = body["balances"].as_array() {
            for b in balances_arr {
                let asset = b["asset"].as_str().unwrap_or("");
                let free = b["free"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
                let locked = b["locked"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
                let total = free + locked;
                if total > 0.0 {
                    balances.insert(asset.to_string(), total);
                }
            }
        }
        Ok(balances)
    }

    async fn fetch_ticker(&self, symbol: &str) -> Result<Ticker, AppError> {
        let url = format!("{}/api/v3/ticker/24hr?symbol={}", self.base_url, symbol);
        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        Ok(Ticker {
            symbol: symbol.to_string(),
            last: body["lastPrice"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            bid: body["bidPrice"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            ask: body["askPrice"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            high_24h: body["highPrice"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            low_24h: body["lowPrice"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            volume_24h: body["volume"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            change_24h_percent: body["priceChangePercent"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
        })
    }

    async fn create_order(&self, params: CreateOrderParams) -> Result<OrderResponse, AppError> {
        let timestamp = Self::timestamp();
        let side_str = match params.side { OrderSide::Buy => "BUY", OrderSide::Sell => "SELL" };
        let type_str = match params.order_type { ExchangeOrderType::Market => "MARKET", ExchangeOrderType::Limit => "LIMIT" };

        let mut query = format!("symbol={}&side={}&type={}&quantity={}&timestamp={}", params.symbol, side_str, type_str, params.amount, timestamp);

        if let Some(price) = params.price {
            query.push_str(&format!("&price={}&timeInForce=GTC", price));
        }

        let signature = self.sign(&query)?;
        let url = format!("{}/api/v3/order?{}&signature={}", self.base_url, query, signature);

        let resp = self.http.post(&url)
            .header("X-MBX-APIKEY", &self.api_key)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        if let Some(msg) = body["msg"].as_str() {
            return Err(AppError::Trading(format!("Binance error: {}", msg)));
        }

        Ok(OrderResponse {
            order_id: body["orderId"].as_i64().unwrap_or(0).to_string(),
            symbol: params.symbol,
            side: params.side,
            order_type: params.order_type,
            amount: params.amount,
            price: params.price.unwrap_or(0.0),
            status: body["status"].as_str().unwrap_or("NEW").to_string(),
            filled_amount: body["executedQty"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
            created_at: body["transactTime"].as_i64().unwrap_or(timestamp),
        })
    }

    async fn cancel_order(&self, id: &str, symbol: &str) -> Result<(), AppError> {
        let timestamp = Self::timestamp();
        let query = format!("symbol={}&orderId={}&timestamp={}", symbol, id, timestamp);
        let signature = self.sign(&query)?;
        let url = format!("{}/api/v3/order?{}&signature={}", self.base_url, query, signature);

        self.http.delete(&url)
            .header("X-MBX-APIKEY", &self.api_key)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        Ok(())
    }

    async fn fetch_open_orders(&self, symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> {
        let timestamp = Self::timestamp();
        let mut query = format!("timestamp={}", timestamp);
        if let Some(s) = symbol { query.insert_str(0, &format!("symbol={}&", s)); }

        let signature = self.sign(&query)?;
        let url = format!("{}/api/v3/openOrders?{}&signature={}", self.base_url, query, signature);

        let resp = self.http.get(&url)
            .header("X-MBX-APIKEY", &self.api_key)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut orders = Vec::new();

        if let Some(arr) = body.as_array() {
            for o in arr {
                orders.push(OrderResponse {
                    order_id: o["orderId"].as_i64().unwrap_or(0).to_string(),
                    symbol: o["symbol"].as_str().unwrap_or("").to_string(),
                    side: if o["side"].as_str() == Some("BUY") { OrderSide::Buy } else { OrderSide::Sell },
                    order_type: if o["type"].as_str() == Some("MARKET") { ExchangeOrderType::Market } else { ExchangeOrderType::Limit },
                    amount: o["origQty"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    price: o["price"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    status: o["status"].as_str().unwrap_or("NEW").to_string(),
                    filled_amount: o["executedQty"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    created_at: o["time"].as_i64().unwrap_or(0),
                });
            }
        }
        Ok(orders)
    }

    async fn fetch_order_history(&self, symbol: Option<&str>) -> Result<Vec<OrderResponse>, AppError> {
        let timestamp = Self::timestamp();
        let mut query = format!("timestamp={}", timestamp);
        if let Some(s) = symbol { query.insert_str(0, &format!("symbol={}&", s)); }

        let signature = self.sign(&query)?;
        let url = format!("{}/api/v3/allOrders?{}&signature={}", self.base_url, query, signature);

        let resp = self.http.get(&url)
            .header("X-MBX-APIKEY", &self.api_key)
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut orders = Vec::new();

        if let Some(arr) = body.as_array() {
            for o in arr {
                orders.push(OrderResponse {
                    order_id: o["orderId"].as_i64().unwrap_or(0).to_string(),
                    symbol: o["symbol"].as_str().unwrap_or("").to_string(),
                    side: if o["side"].as_str() == Some("BUY") { OrderSide::Buy } else { OrderSide::Sell },
                    order_type: if o["type"].as_str() == Some("MARKET") { ExchangeOrderType::Market } else { ExchangeOrderType::Limit },
                    amount: o["origQty"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    price: o["price"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    status: o["status"].as_str().unwrap_or("NEW").to_string(),
                    filled_amount: o["executedQty"].as_str().unwrap_or("0").parse().unwrap_or(0.0),
                    created_at: o["time"].as_i64().unwrap_or(0),
                });
            }
        }
        Ok(orders)
    }

    async fn fetch_markets(&self) -> Result<Vec<MarketInfo>, AppError> {
        let url = format!("{}/api/v3/exchangeInfo", self.base_url);
        let resp = self.http.get(&url).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let mut markets = Vec::new();

        if let Some(arr) = body["symbols"].as_array() {
            for s in arr {
                if s["status"].as_str() != Some("TRADING") { continue; }
                let base = s["baseAsset"].as_str().unwrap_or("").to_string();
                let quote = s["quoteAsset"].as_str().unwrap_or("").to_string();
                let base_filters = s["filters"].as_array().map(|f| f.to_vec()).unwrap_or_default();

                let mut min_amount = 0.001;
                let mut min_notional = 10.0;
                let mut price_precision = 8;
                let mut amount_precision = 8;

                if let Some(bp) = s["baseAssetPrecision"].as_i64() { amount_precision = bp as u32; }
                if let Some(pp) = s["quoteAssetPrecision"].as_i64() { price_precision = pp as u32; }

                for f in &base_filters {
                    if f["filterType"].as_str() == Some("LOT_SIZE") {
                        min_amount = f["minQty"].as_str().unwrap_or("0.001").parse().unwrap_or(0.001);
                    }
                    if f["filterType"].as_str() == Some("NOTIONAL") || f["filterType"].as_str() == Some("MIN_NOTIONAL") {
                        min_notional = f["minNotional"].as_str().unwrap_or("10").parse().unwrap_or(10.0);
                    }
                }

                markets.push(MarketInfo {
                    symbol: format!("{}{}", base, quote),
                    base,
                    quote,
                    min_amount,
                    min_notional,
                    price_precision,
                    amount_precision,
                });
            }
        }
        Ok(markets)
    }
}
