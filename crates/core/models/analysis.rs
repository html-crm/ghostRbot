use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RugRisk {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityInfo {
    pub total_liquidity_usd: f64,
    pub locked: bool,
    pub lock_duration_days: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUnlock {
    pub date: String,
    pub amount: f64,
    pub percent_supply: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub score: f64,
    pub rug_risk: RugRisk,
    pub contract_verdict: Option<String>,
    pub mint_authority: Option<String>,
    pub freeze_authority: Option<String>,
    pub liquidity_info: Option<LiquidityInfo>,
    pub holder_concentration: f64,
    pub social_score: f64,
    pub wallet_score: f64,
    pub token_unlocks: Vec<TokenUnlock>,
    pub is_honeypot: bool,
}

impl Default for AnalysisResult {
    fn default() -> Self {
        Self {
            score: 0.0,
            rug_risk: RugRisk::Medium,
            contract_verdict: None,
            mint_authority: None,
            freeze_authority: None,
            liquidity_info: None,
            holder_concentration: 0.0,
            social_score: 0.0,
            wallet_score: 0.0,
            token_unlocks: Vec::new(),
            is_honeypot: false,
        }
    }
}
