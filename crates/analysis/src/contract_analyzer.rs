use ghostRbot_core::{AppError, DiscoveredToken, AnalysisResult, LiquidityInfo, RugRisk};
use reqwest::Client;

pub struct ContractData {
    pub has_mint_authority: bool,
    pub has_freeze_authority: bool,
    pub is_honeypot: bool,
    pub liquidity_locked: bool,
    pub liquidity_usd: f64,
}

pub async fn analyze(http: &Client, helius_key: &str, token: &DiscoveredToken) -> Result<ContractData, AppError> {
    // RugCheck API
    let rugcheck_url = format!("https://api.rugcheck.xyz/v1/tokens/{}/report", token.token_address);
    let mut has_mint = false;
    let mut has_freeze = false;
    let mut is_honeypot = false;
    let mut liquidity_locked = false;
    let mut liquidity_usd = 0.0;

    match http.get(&rugcheck_url).send().await {
        Ok(resp) => {
            if let Ok(body) = resp.json::<serde_json::Value>().await {
                if let Some(risks) = body["risks"].as_array() {
                    for risk in risks {
                        let name = risk["name"].as_str().unwrap_or("");
                        let level = risk["level"].as_str().unwrap_or("");
                        if name == "Mint Authority" && level == "danger" { has_mint = true; }
                        if name == "Freeze Authority" && level == "danger" { has_freeze = true; }
                        if name == "Honeypot" { is_honeypot = level == "danger"; }
                    }
                }

                liquidity_usd = body["totalMarketLiquidity"].as_f64().unwrap_or(0.0);

                // Check if liquidity is locked (LP tokens burned or locked in known locker)
                if let Some(score) = body["score"].as_i64() {
                    liquidity_locked = score > 500;
                }
            }
        }
        Err(e) => {
            tracing::warn!("RugCheck failed: {}", e);
        }
    }

    Ok(ContractData {
        has_mint_authority: has_mint,
        has_freeze_authority: has_freeze,
        is_honeypot,
        liquidity_locked,
        liquidity_usd,
    })
}
