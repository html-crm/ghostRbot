use ghostRbot_core::AppError;
use reqwest::Client;

pub struct MarketEngine {
    http: Client,
}

impl MarketEngine {
    pub fn new(http: Client) -> Self {
        Self { http }
    }

    pub async fn get_overview(&self) -> Result<String, AppError> {
        let resp = self.http.get("https://api.coingecko.com/api/v3/global")
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let data = &body["data"];
        let total_market_cap = data["total_market_cap"]["usd"].as_f64().unwrap_or(0.0);
        let btc_dominance = data["market_cap_percentage"]["btc"].as_f64().unwrap_or(0.0);
        let total_volume = data["total_volume"]["usd"].as_f64().unwrap_or(0.0);

        // Get top gainers
        let gainers_resp = self.http.get("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h")
            .send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let gainers: Vec<serde_json::Value> = gainers_resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        let mut result = format!(
            "📊 Market Overview:\n\n\
            Total Market Cap: ${}\n\
            BTC Dominance: {:.1}%\n\
            24h Volume: ${}\n\n\
            Top Performers (24h):\n",
            format_market_cap(total_market_cap),
            btc_dominance,
            format_market_cap(total_volume),
        );

        for coin in gainers.iter().take(10) {
            let name = coin["symbol"].as_str().unwrap_or("???").to_uppercase();
            let price = coin["current_price"].as_f64().unwrap_or(0.0);
            let change = coin["price_change_percentage_24h"].as_f64().unwrap_or(0.0);
            let emoji = if change >= 0.0 { "🟢" } else { "🔴" };
            result.push_str(&format!("{} {}: ${:.4} ({:+.1}%)\n", emoji, name, price, change));
        }

        Ok(result)
    }

    pub async fn get_price(&self, query: &str) -> Result<String, AppError> {
        // Extract coin name from query
        let coin = query.split_whitespace()
            .last()
            .unwrap_or("bitcoin")
            .to_lowercase();

        let resp = self.http.get(format!(
            "https://api.coingecko.com/api/v3/simple/price?ids={}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true",
            coin
        )).send().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;
        let body: serde_json::Value = resp.json().await.map_err(|e| AppError::ExternalApi(e.to_string()))?;

        if let Some(data) = body.get(&coin) {
            let price = data["usd"].as_f64().unwrap_or(0.0);
            let change = data["usd_24h_change"].as_f64().unwrap_or(0.0);
            let mcap = data["usd_market_cap"].as_f64().unwrap_or(0.0);
            Ok(format!("💰 {}: ${:.4} ({:+.1}%) | MCap: ${}", coin.to_uppercase(), price, change, format_market_cap(mcap)))
        } else {
            Ok(format!("Could not find price data for '{}'", coin))
        }
    }
}

fn format_market_cap(value: f64) -> String {
    if value >= 1_000_000_000_000.0 {
        format!("{:.2}T", value / 1_000_000_000_000.0)
    } else if value >= 1_000_000_000.0 {
        format!("{:.2}B", value / 1_000_000_000.0)
    } else if value >= 1_000_000.0 {
        format!("{:.2}M", value / 1_000_000.0)
    } else {
        format!("{:.2}", value)
    }
}
