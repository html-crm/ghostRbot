use super::DiscoverySource;
use std::time::Duration;

pub struct UniswapSource;

impl DiscoverySource for UniswapSource {
    fn name(&self) -> &str { "uniswap" }
    fn interval(&self) -> Duration { Duration::from_secs(60) }
}
