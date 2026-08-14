//! Blend V2 pool interface, declared locally.
//!
//! `blend-contract-sdk` cannot be used as a dependency: its latest release pins
//! `soroban-sdk ^25.0.1` and this workspace is on 26. These types mirror the deployed pool's
//! XDR exactly (verified with `stellar contract info interface` against
//! `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF`). Field *names* and types must
//! match; declaration order need not, because `contracttype` structs encode as name-keyed maps.

use soroban_sdk::{contractclient, contracttype, Address, Env, Map, Vec};

pub const SUPPLY_COLLATERAL: u32 = 2;
pub const WITHDRAW_COLLATERAL: u32 = 3;

/// `b_rate` is fixed-point scaled by 1e12 — *not* by the reserve's `scalar` field, which is the
/// token's 1e7 decimals scalar. Confusing the two is a five-order-of-magnitude error.
pub const SCALAR_12: i128 = 1_000_000_000_000;

#[contracttype]
#[derive(Clone)]
pub struct Request {
    pub address: Address,
    pub amount: i128,
    pub request_type: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct Positions {
    pub collateral: Map<u32, i128>,
    pub liabilities: Map<u32, i128>,
    pub supply: Map<u32, i128>,
}

#[contracttype]
#[derive(Clone)]
pub struct ReserveConfig {
    pub c_factor: u32,
    pub decimals: u32,
    pub enabled: bool,
    pub index: u32,
    pub l_factor: u32,
    pub max_util: u32,
    pub r_base: u32,
    pub r_one: u32,
    pub r_three: u32,
    pub r_two: u32,
    pub reactivity: u32,
    pub supply_cap: i128,
    pub util: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct ReserveData {
    pub b_rate: i128,
    pub b_supply: i128,
    pub backstop_credit: i128,
    pub d_rate: i128,
    pub d_supply: i128,
    pub ir_mod: i128,
    pub last_time: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Reserve {
    pub asset: Address,
    pub config: ReserveConfig,
    pub data: ReserveData,
    pub scalar: i128,
}

// The trait exists only to generate `PoolClient`; nothing calls it directly.
#[allow(dead_code)]
#[contractclient(name = "PoolClient")]
pub trait PoolInterface {
    fn submit(
        env: Env,
        from: Address,
        spender: Address,
        to: Address,
        requests: Vec<Request>,
    ) -> Positions;
    fn get_positions(env: Env, address: Address) -> Positions;
    fn get_reserve(env: Env, asset: Address) -> Reserve;
}
