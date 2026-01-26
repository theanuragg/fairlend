use crate::{errors::LendingError, math::rate::Rate};

#[derive(Clone, Copy, Debug)]
pub struct CollateralExchangeRate(pub Rate);

/// Struct for mutual conversion between collateral and liquidity
impl CollateralExchangeRate {
    /// Convert Reserve Collateral to liquidity
    pub fn collateral_to_liquidity(&self, collateral_amount: u64) -> Result<u64, LendingError> {
        collateral_amount
            .checked_div(self.0.into())
            .ok_or(LendingError::InvalidConfig)
    }

    pub fn liquidity_to_collateral(&self, liquidity_amount: u64) -> Result<u64, LendingError> {
        liquidity_amount
            .checked_mul(self.0.into())
            .ok_or(LendingError::InvalidConfig)
    }
}

impl From<CollateralExchangeRate> for Rate {
    fn from(exchange_rate: CollateralExchangeRate) -> Self {
        exchange_rate.0
    }
}
