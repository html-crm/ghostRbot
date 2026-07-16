use ghostRbot_core::{AppError, DiscoveredToken};
use reqwest::Client;

pub struct SocialData {
    pub has_twitter: bool,
    pub twitter_followers: u64,
    pub has_telegram: bool,
    pub telegram_members: u32,
    pub has_website: bool,
    pub website_age_days: Option<u32>,
}

pub async fn analyze(http: &Client, token: &DiscoveredToken) -> Result<SocialData, AppError> {
    let mut has_twitter = false;
    let mut twitter_followers = 0u64;
    let mut has_telegram = false;
    let mut telegram_members = 0u32;
    let mut has_website = false;
    let mut website_age_days = None;

    // Check token profiles on DexScreener for social links
    let url = format!(
        "https://api.dexscreener.com/tokens/v1/{}/{}",
        match token.chain {
            ghostRbot_core::Chain::Solana => "solana",
            ghostRbot_core::Chain::Bsc => "bsc",
            ghostRbot_core::Chain::Ethereum => "ethereum",
        },
        token.token_address
    );

    match http.get(&url).send().await {
        Ok(resp) => {
            if let Ok(body) = resp.json::<serde_json::Value>().await {
                if let Some(pairs) = body.as_array() {
                    if let Some(first) = pairs.first() {
                        if let Some(info) = first.get("info") {
                            if let Some(socials) = info["socials"].as_array() {
                                for social in socials {
                                    let platform = social["type"].as_str().unwrap_or("");
                                    let url = social["url"].as_str().unwrap_or("");
                                    match platform {
                                        "twitter" => {
                                            has_twitter = true;
                                            // Try to get follower count from Twitter username
                                            let username = url.split('/').last().unwrap_or("");
                                            if !username.is_empty() {
                                                twitter_followers = fetch_twitter_followers(http, username).await;
                                            }
                                        }
                                        "telegram" => {
                                            has_telegram = true;
                                        }
                                        "website" => {
                                            has_website = true;
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(e) => tracing::warn!("DexScreener social check failed: {}", e),
    }

    Ok(SocialData {
        has_twitter,
        twitter_followers,
        has_telegram,
        telegram_members,
        has_website,
        website_age_days,
    })
}

async fn fetch_twitter_followers(_http: &Client, _username: &str) -> u64 {
    // TODO: Implement Twitter API or scraping
    0
}
