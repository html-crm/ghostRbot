use ghostRbot_core::AppError;

#[derive(Debug, Clone, PartialEq)]
pub enum Intent {
    News,
    Market,
    Whales,
    Sentiment,
    Briefing,
    Price,
    Unknown,
}

pub struct IntentRouter {
    keywords: Vec<(Vec<String>, Intent)>,
}

impl IntentRouter {
    pub fn new() -> Self {
        Self {
            keywords: vec![
                (vec!["news".into(), "latest".into(), "headlines".into()], Intent::News),
                (vec!["market".into(), "overview".into(), "cap".into(), "dominance".into()], Intent::Market),
                (vec!["whale".into(), "whales".into(), "large".into(), "big transfer".into()], Intent::Whales),
                (vec!["sentiment".into(), "fear".into(), "greed".into(), "feargreed".into()], Intent::Sentiment),
                (vec!["briefing".into(), "brief".into(), "daily".into(), "summary".into()], Intent::Briefing),
                (vec!["price".into(), "cost".into(), "how much".into(), "worth".into()], Intent::Price),
            ],
        }
    }

    pub fn classify(&self, query: &str) -> Intent {
        let lower = query.to_lowercase();
        for (keywords, intent) in &self.keywords {
            for kw in keywords {
                if lower.contains(kw.as_str()) {
                    return intent.clone();
                }
            }
        }
        Intent::Unknown
    }
}
