use super::DiscoverySource;
use std::time::Duration;

pub struct PancakeSwapSource;

impl DiscoverySource for PancakeSwapSource {
    fn name(&self) -> &str { "pancakeswap" }
    fn interval(&self) -> Duration { Duration::from_secs(60) }
}
