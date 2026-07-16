use crate::contract_analyzer::ContractData;
use crate::social_analyzer::SocialData;
use crate::wallet_analyzer::WalletData;
use ghostRbot_core::{AnalysisResult, RugRisk, LiquidityInfo};

pub fn score(contract: &ContractData, social: &SocialData, wallet: &WalletData) -> AnalysisResult {
    let mut score = 50.0_f64;

    // Contract security
    if contract.has_mint_authority { score -= 30.0; }
    if contract.has_freeze_authority { score -= 20.0; }
    if contract.is_honeypot { score -= 40.0; }

    // Liquidity
    if contract.liquidity_locked { score += 15.0; }
    if contract.liquidity_usd < 1000.0 { score -= 30.0; }
    else if contract.liquidity_usd > 10000.0 { score += 10.0; }
    else if contract.liquidity_usd > 50000.0 { score += 20.0; }

    // Holder concentration
    if wallet.top10_concentration > 80.0 { score -= 20.0; }
    else if wallet.top10_concentration > 60.0 { score -= 10.0; }
    else if wallet.top10_concentration < 40.0 { score += 10.0; }

    // Social presence
    let mut social_score = 0.0_f64;
    if social.has_twitter { social_score += 10.0; }
    if social.twitter_followers > 1000 { social_score += 5.0; }
    if social.twitter_followers > 10000 { social_score += 5.0; }
    if social.has_telegram { social_score += 5.0; }
    if social.has_website { social_score += 5.0; }
    score += social_score;

    // Holder count
    if wallet.holder_count < 10 { score -= 15.0; }
    else if wallet.holder_count > 100 { score += 5.0; }
    else if wallet.holder_count > 500 { score += 10.0; }

    // Insider detection
    if wallet.insider_accumulation { score -= 15.0; }

    let final_score = score.clamp(0.0, 100.0);

    AnalysisResult {
        score: final_score,
        rug_risk: classify_risk(final_score),
        contract_verdict: None,
        mint_authority: if contract.has_mint_authority { Some("present".into()) } else { None },
        freeze_authority: if contract.has_freeze_authority { Some("present".into()) } else { None },
        liquidity_info: Some(LiquidityInfo {
            total_liquidity_usd: contract.liquidity_usd,
            locked: contract.liquidity_locked,
            lock_duration_days: None,
        }),
        holder_concentration: wallet.top10_concentration,
        social_score,
        wallet_score: 0.0,
        token_unlocks: Vec::new(),
        is_honeypot: contract.is_honeypot,
    }
}

fn classify_risk(score: f64) -> RugRisk {
    if score >= 70.0 { RugRisk::Low }
    else if score >= 50.0 { RugRisk::Medium }
    else if score >= 30.0 { RugRisk::High }
    else { RugRisk::Critical }
}
