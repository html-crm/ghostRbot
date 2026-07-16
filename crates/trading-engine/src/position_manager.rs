use ghostRbot_core::Order;
use std::collections::HashMap;

pub struct PositionManager {
    pub positions: HashMap<String, Order>,
}

impl PositionManager {
    pub fn new() -> Self {
        Self { positions: HashMap::new() }
    }

    pub fn has_position(&self, token_address: &str) -> bool {
        self.positions.contains_key(token_address)
    }

    pub fn add_position(&mut self, order: Order) {
        self.positions.insert(order.token_address.clone(), order);
    }

    pub fn remove_position(&mut self, token_address: &str) -> Option<Order> {
        self.positions.remove(token_address)
    }

    pub fn open_position_count(&self) -> u32 {
        self.positions.len() as u32
    }

    pub fn calculate_trailing_stop(&self, order: &Order, current_price: f64, trailing_percent: f64) -> Option<f64> {
        if let Some(exit) = order.exit_price {
            let trailing_stop = exit * (1.0 - trailing_percent / 100.0);
            if current_price < trailing_stop {
                return Some(trailing_stop);
            }
        }
        None
    }
}
