use ghostRbot_core::{AnalysisResult, RugRisk};

pub struct RiskManager {
    pub max_position_size_sol: f64,
    pub max_position_size_bnb: f64,
    pub max_concurrent_positions: u32,
    pub min_score_threshold: f64,
    pub max_rug_risk: RugRisk,
    pub require_locked_liquidity: bool,
    pub min_liquidity_usd: f64,
}

impl Default for RiskManager {
    fn default() -> Self {
        Self {
            max_position_size_sol: 0.5,
            max_position_size_bnb: 0.1,
            max_concurrent_positions: 5,
            min_score_threshold: 30.0,
            max_rug_risk: RugRisk::High,
            require_locked_liquidity: false,
            min_liquidity_usd: 1000.0,
        }
    }
}

impl RiskManager {
    pub fn evaluate(&self, analysis: &AnalysisResult, current_positions: u32) -> RiskDecision {
        let mut reasons = Vec::new();
        let mut approved = true;

        if analysis.score < self.min_score_threshold {
            reasons.push(format!("Score {} below threshold {}", analysis.score, self.min_score_threshold));
            approved = false;
        }

        if analysis.rug_risk == RugRisk::Critical {
            reasons.push("Critical rug risk".to_string());
            approved = false;
        }

        if analysis.is_honeypot {
            reasons.push("Token is a honeypot".to_string());
            approved = false;
        }

        if current_positions >= self.max_concurrent_positions {
            reasons.push(format!("Max concurrent positions {} reached", self.max_concurrent_positions));
            approved = false;
        }

        if let Some(ref liq) = analysis.liquidity_info {
            if liq.total_liquidity_usd < self.min_liquidity_usd {
                reasons.push(format!("Liquidity ${:.0} below min ${:.0}", liq.total_liquidity_usd, self.min_liquidity_usd));
                approved = false;
            }
            if self.require_locked_liquidity && !liq.locked {
                reasons.push("Liquidity not locked".to_string());
                approved = false;
            }
        }

        if analysis.holder_concentration > 80.0 {
            reasons.push(format!("Top holder concentration {:.0}% is too high", analysis.holder_concentration));
            approved = false;
        }

        let suggested_amount = if approved {
            match analysis.rug_risk {
                RugRisk::Low => self.max_position_size_sol,
                RugRisk::Medium => self.max_position_size_sol * 0.5,
                RugRisk::High => self.max_position_size_sol * 0.25,
                RugRisk::Critical => 0.0,
            }
        } else {
            0.0
        };

        RiskDecision {
            approved,
            reasons,
            suggested_amount,
        }
    }
}

#[derive(Debug)]
pub struct RiskDecision {
    pub approved: bool,
    pub reasons: Vec<String>,
    pub suggested_amount: f64,
}
