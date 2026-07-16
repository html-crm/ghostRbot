use ghostRbot_core::{AppError, DiscoveredToken};
use reqwest::Client;

pub struct WalletData {
    pub top10_concentration: f64,
    pub creator_age_days: Option<u32>,
    pub insider_accumulation: bool,
    pub holder_count: u32,
}

pub async fn analyze(http: &Client, birdeye_key: &str, token: &DiscoveredToken) -> Result<WalletData, AppError> {
    let mut top10_concentration = 0.0;
    let mut holder_count = 0u32;

    // Birdeye token holders
    let url = format!(
        "https://public-api.birdeye.so/public/token_holders?address={}&offset=0&limit=20",
        token.token_address
    );

    match http.get(&url)
        .header("X-API-KEY", birdeye_key)
        .send().await
    {
        Ok(resp) => {
            if let Ok(body) = resp.json::<serde_json::Value>().await {
                if let Some(holders) = body["data"]["items"].as_array() {
                    holder_count = holders.len() as u32;
                    let mut total_held = 0.0;
                    let mut top10_held = 0.0;

                    for (i, holder) in holders.iter().enumerate() {
                        let amount = holder["amount"].as_f64().unwrap_or(0.0);
                        total_held += amount;
                        if i < 10 {
                            top10_held += amount;
                        }
                    }

                    if total_held > 0.0 {
                        top10_concentration = (top10_held / total_held) * 100.0;
                    }
                }
            }
        }
        Err(e) => tracing::warn!("Birdeye holders check failed: {}", e),
    }

    Ok(WalletData {
        top10_concentration,
        creator_age_days: None,
        insider_accumulation: false,
        holder_count,
    })
}
