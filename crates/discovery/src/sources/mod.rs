use ghostRbot_core::DiscoveredToken;
use std::time::Duration;

pub mod dexscreener;
pub mod birdeye;
pub mod pumpfun;
pub mod raydium;
pub mod uniswap;
pub mod pancakeswap;

pub trait DiscoverySource: Send + Sync {
    fn name(&self) -> &str;
    fn interval(&self) -> Duration;
}
