#![cfg(test)]

//! Policy tests for the treasury.
//!
//! The pool is a mock, deliberately. `blend-contract-sdk` pins `soroban-sdk ^25` against this
//! workspace's 26, and standing up a real Blend pool (oracle, backstop, reserve init) in a unit
//! test is an integration test wearing a disguise. The Blend *interaction* was proven on testnet
//! by the #5 spike and is proven again by the real deposit in #7; what these tests guard is the
//! policy, which is where a subtle mistake voids the security claim.
//!
//! The mock reproduces the two Blend behaviours that actually affect this contract: positions
//! are denominated in bTokens, and the bToken->underlying conversion floors (so a withdraw can
//! land a stroop short of what was asked).

use soroban_sdk::{
    contract, contractimpl, contracttype,
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    token, Address, Env, IntoVal, Map, String, Vec,
};

use crate::blend::{
    Positions, Request, Reserve, ReserveConfig, ReserveData, SCALAR_12, SUPPLY_COLLATERAL,
    WITHDRAW_COLLATERAL,
};
use crate::{Error, RequestStatus, TreasuryContract, TreasuryContractClient};

// --- mock Blend pool ---

#[contracttype]
#[derive(Clone)]
enum MockKey {
    BRate,
    Asset,
    Position(Address),
}

#[contract]
pub struct MockPool;

#[contractimpl]
impl MockPool {
    pub fn init(env: Env, asset: Address, b_rate: i128) {
        env.storage().instance().set(&MockKey::Asset, &asset);
        env.storage().instance().set(&MockKey::BRate, &b_rate);
    }

    /// Simulates yield: raising `b_rate` makes every existing bToken worth more underlying.
    pub fn set_b_rate(env: Env, b_rate: i128) {
        env.storage().instance().set(&MockKey::BRate, &b_rate);
    }

    pub fn submit(
        env: Env,
        from: Address,
        _spender: Address,
        to: Address,
        requests: Vec<Request>,
    ) -> Positions {
        let asset: Address = env.storage().instance().get(&MockKey::Asset).unwrap();
        let b_rate: i128 = env.storage().instance().get(&MockKey::BRate).unwrap();
        let me = env.current_contract_address();
        let client = token::TokenClient::new(&env, &asset);

        for request in requests.iter() {
            let held: i128 = env
                .storage()
                .instance()
                .get(&MockKey::Position(from.clone()))
                .unwrap_or(0);

            if request.request_type == SUPPLY_COLLATERAL {
                client.transfer(&from, &me, &request.amount);
                let minted = request.amount * SCALAR_12 / b_rate;
                env.storage()
                    .instance()
                    .set(&MockKey::Position(from.clone()), &(held + minted));
            } else if request.request_type == WITHDRAW_COLLATERAL {
                // Blend clamps the request to the available position and floors the payout.
                let wanted = request.amount * SCALAR_12 / b_rate;
                let burned = if wanted > held { held } else { wanted };
                let out = burned * b_rate / SCALAR_12;
                env.storage()
                    .instance()
                    .set(&MockKey::Position(from.clone()), &(held - burned));
                client.transfer(&me, &to, &out);
            }
        }

        Self::get_positions(env, from)
    }

    pub fn get_positions(env: Env, address: Address) -> Positions {
        let held: i128 = env
            .storage()
            .instance()
            .get(&MockKey::Position(address))
            .unwrap_or(0);
        let mut collateral = Map::new(&env);
        collateral.set(3u32, held);
        Positions {
            collateral,
            liabilities: Map::new(&env),
            supply: Map::new(&env),
        }
    }

    pub fn get_reserve(env: Env, asset: Address) -> Reserve {
        let b_rate: i128 = env.storage().instance().get(&MockKey::BRate).unwrap();
        Reserve {
            asset,
            config: ReserveConfig {
                c_factor: 9_500_000,
                decimals: 7,
                enabled: true,
                index: 3,
                l_factor: 9_500_000,
                max_util: 9_500_000,
                r_base: 5_000,
                r_one: 300_000,
                r_three: 10_000_000,
                r_two: 1_000_000,
                reactivity: 20,
                supply_cap: i128::MAX,
                util: 7_000_000,
            },
            data: ReserveData {
                b_rate,
                b_supply: 0,
                backstop_credit: 0,
                d_rate: 0,
                d_supply: 0,
                ir_mod: 1_000_000,
                last_time: 0,
            },
            scalar: 10_000_000,
        }
    }
}

// --- harness ---

/// The live testnet b_rate at the time of the #5 spike. Deliberately not 1.0, so any place that
/// confuses bTokens with underlying shows up as a wrong number rather than passing by accident.
const B_RATE: i128 = 1_055_907_628_507;

struct Fixture {
    env: Env,
    treasury: TreasuryContractClient<'static>,
    owner: Address,
    approver: Address,
    vendor: Address,
    usdc: Address,
    pool: Address,
}

fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let approver = Address::generate(&env);
    let vendor = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let usdc = env
        .register_stellar_asset_contract_v2(token_admin.clone())
        .address();

    let pool = env.register(MockPool, ());
    MockPoolClient::new(&env, &pool).init(&usdc, &B_RATE);

    let treasury_id = env.register(TreasuryContract, ());
    let treasury = TreasuryContractClient::new(&env, &treasury_id);
    treasury.init(&owner, &approver, &pool, &usdc);

    // Fund the owner so it has something to deposit, and the pool so withdrawals can be paid
    // out of accrued yield rather than only principal.
    token::StellarAssetClient::new(&env, &usdc).mint(&owner, &1_000_0000000);
    token::StellarAssetClient::new(&env, &usdc).mint(&pool, &1_000_0000000);

    Fixture {
        env,
        treasury,
        owner,
        approver,
        vendor,
        usdc,
        pool,
    }
}

fn memo(env: &Env) -> String {
    String::from_str(env, "invoice 1042")
}

// --- the security claim ---

#[test]
fn init_rejects_owner_equal_to_approver() {
    let env = Env::default();
    env.mock_all_auths();

    let owner = Address::generate(&env);
    let pool = Address::generate(&env);
    let usdc = Address::generate(&env);

    let treasury = TreasuryContractClient::new(&env, &env.register(TreasuryContract, ()));

    // Under approver-only rotation this is the only moment separation can be established.
    assert_eq!(
        treasury.try_init(&owner, &owner, &pool, &usdc),
        Err(Ok(Error::OwnerIsApprover))
    );
}

#[test]
#[should_panic(expected = "Error(Auth, InvalidAction)")]
fn owner_cannot_approve_payout() {
    let f = setup();
    f.treasury.deposit(&f.owner, &100_0000000);
    let id = f
        .treasury
        .request_payout(&f.vendor, &10_0000000, &memo(&f.env));

    // Only the owner's signature is available. approve_payout requires the approver's.
    f.env.mock_auths(&[MockAuth {
        address: &f.owner,
        invoke: &MockAuthInvoke {
            contract: &f.treasury.address,
            fn_name: "approve_payout",
            args: (id,).into_val(&f.env),
            sub_invokes: &[],
        },
    }]);
    f.treasury.approve_payout(&id);
}

#[test]
#[should_panic(expected = "Error(Auth, InvalidAction)")]
fn owner_cannot_set_approver() {
    let f = setup();
    let attacker = Address::generate(&f.env);

    f.env.mock_auths(&[MockAuth {
        address: &f.owner,
        invoke: &MockAuthInvoke {
            contract: &f.treasury.address,
            fn_name: "set_approver",
            args: (attacker.clone(),).into_val(&f.env),
            sub_invokes: &[],
        },
    }]);
    f.treasury.set_approver(&attacker);
}

#[test]
#[should_panic(expected = "Error(Auth, InvalidAction)")]
fn approver_cannot_request_payout() {
    let f = setup();

    f.env.mock_auths(&[MockAuth {
        address: &f.approver,
        invoke: &MockAuthInvoke {
            contract: &f.treasury.address,
            fn_name: "request_payout",
            args: (f.vendor.clone(), 10_0000000i128, memo(&f.env)).into_val(&f.env),
            sub_invokes: &[],
        },
    }]);
    f.treasury
        .request_payout(&f.vendor, &10_0000000, &memo(&f.env));
}

#[test]
fn set_approver_rejects_the_owner() {
    let f = setup();

    // Rotating the approver to the owner would collapse the roles just as surely as init doing so.
    assert_eq!(
        f.treasury.try_set_approver(&f.owner),
        Err(Ok(Error::OwnerIsApprover))
    );
    assert_eq!(f.treasury.get_approver(), f.approver);
}

#[test]
fn approver_can_rotate_to_a_third_party() {
    let f = setup();
    let next = Address::generate(&f.env);

    f.treasury.set_approver(&next);
    assert_eq!(f.treasury.get_approver(), next);
}

// --- payout policy ---

#[test]
fn happy_path_deposit_request_approve() {
    let f = setup();
    let usdc = token::TokenClient::new(&f.env, &f.usdc);

    f.treasury.deposit(&f.owner, &100_0000000);
    let funded = f.treasury.balance();
    assert!((100_0000000 - funded) <= 1, "balance {} off by more than a stroop", funded);

    let id = f
        .treasury
        .request_payout(&f.vendor, &10_0000000, &memo(&f.env));

    // Requesting moves no money.
    assert_eq!(f.treasury.balance(), funded);
    assert_eq!(usdc.balance(&f.vendor), 0);
    assert_eq!(f.treasury.get_request(&id).status, RequestStatus::Pending);

    f.treasury.approve_payout(&id);

    // The vendor is paid exactly the requested amount — never partially.
    assert_eq!(usdc.balance(&f.vendor), 10_0000000);
    assert_eq!(f.treasury.get_request(&id).status, RequestStatus::Approved);
    assert!(f.treasury.balance() < funded);
}

#[test]
fn balance_is_underlying_not_btokens() {
    let f = setup();
    f.treasury.deposit(&f.owner, &100_0000000);

    // The position is held in bTokens, which are worth less than 1:1 at b_rate > 1. A contract
    // returning the raw position would report ~94.7 USDC for a 100 USDC deposit. The permitted
    // 1-stroop shortfall is Blend flooring the conversion in both directions, not an error.
    let reported = f.treasury.balance();
    assert!(
        (100_0000000 - reported) <= 1,
        "expected ~100 USDC of underlying, got {}",
        reported
    );
    assert!(reported > 99_0000000, "balance looks like raw bTokens: {}", reported);
}

#[test]
fn balance_grows_as_b_rate_rises() {
    let f = setup();
    f.treasury.deposit(&f.owner, &100_0000000);
    let before = f.treasury.balance();

    // Yield is b_rate appreciation; nobody has to call anything for the position to grow.
    MockPoolClient::new(&f.env, &f.pool).set_b_rate(&(B_RATE * 11 / 10));

    assert!(f.treasury.balance() > before);
}

#[test]
fn approving_above_balance_reverts_and_leaves_request_pending() {
    let f = setup();
    f.treasury.deposit(&f.owner, &10_0000000);

    let id = f
        .treasury
        .request_payout(&f.vendor, &50_0000000, &memo(&f.env));

    assert_eq!(
        f.treasury.try_approve_payout(&id),
        Err(Ok(Error::InsufficientFunds))
    );

    // The request survives for a retry after the next deposit — it is not cancelled.
    assert_eq!(f.treasury.get_request(&id).status, RequestStatus::Pending);
    assert_eq!(token::TokenClient::new(&f.env, &f.usdc).balance(&f.vendor), 0);

    f.treasury.deposit(&f.owner, &100_0000000);
    f.treasury.approve_payout(&id);
    assert_eq!(
        token::TokenClient::new(&f.env, &f.usdc).balance(&f.vendor),
        50_0000000
    );
}

#[test]
fn approving_twice_fails() {
    let f = setup();
    f.treasury.deposit(&f.owner, &100_0000000);
    let id = f
        .treasury
        .request_payout(&f.vendor, &10_0000000, &memo(&f.env));

    f.treasury.approve_payout(&id);
    assert_eq!(
        f.treasury.try_approve_payout(&id),
        Err(Ok(Error::RequestNotPending))
    );

    // The vendor was paid once, not twice.
    assert_eq!(
        token::TokenClient::new(&f.env, &f.usdc).balance(&f.vendor),
        10_0000000
    );
}

#[test]
fn rejecting_then_approving_fails() {
    let f = setup();
    f.treasury.deposit(&f.owner, &100_0000000);
    let id = f
        .treasury
        .request_payout(&f.vendor, &10_0000000, &memo(&f.env));

    f.treasury.reject_payout(&id);
    assert_eq!(f.treasury.get_request(&id).status, RequestStatus::Rejected);

    assert_eq!(
        f.treasury.try_approve_payout(&id),
        Err(Ok(Error::RequestNotPending))
    );
    assert_eq!(token::TokenClient::new(&f.env, &f.usdc).balance(&f.vendor), 0);
}

#[test]
fn several_requests_may_be_pending_at_once() {
    let f = setup();
    f.treasury.deposit(&f.owner, &100_0000000);

    let a = f
        .treasury
        .request_payout(&f.vendor, &10_0000000, &memo(&f.env));
    let b = f
        .treasury
        .request_payout(&f.vendor, &20_0000000, &memo(&f.env));

    assert_ne!(a, b);
    assert_eq!(f.treasury.get_request(&a).status, RequestStatus::Pending);
    assert_eq!(f.treasury.get_request(&b).status, RequestStatus::Pending);

    f.treasury.approve_payout(&b);
    assert_eq!(f.treasury.get_request(&a).status, RequestStatus::Pending);
    assert_eq!(f.treasury.get_request(&b).status, RequestStatus::Approved);
}

// --- validation ---

#[test]
fn init_is_once_only() {
    let f = setup();
    let other = Address::generate(&f.env);
    assert_eq!(
        f.treasury.try_init(&f.owner, &other, &other, &other),
        Err(Ok(Error::AlreadyInitialized))
    );
}

#[test]
fn rejects_non_positive_amounts() {
    let f = setup();
    assert_eq!(
        f.treasury.try_deposit(&f.owner, &0),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        f.treasury.try_request_payout(&f.vendor, &0, &memo(&f.env)),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        f.treasury.try_request_payout(&f.vendor, &-1, &memo(&f.env)),
        Err(Ok(Error::InvalidAmount))
    );
}

#[test]
fn rejects_memo_over_64_chars() {
    let f = setup();
    let long = String::from_str(&f.env, "x123456789x123456789x123456789x123456789x123456789x123456789x1234567890");

    assert_eq!(
        f.treasury
            .try_request_payout(&f.vendor, &10_0000000, &long),
        Err(Ok(Error::InvalidAmount))
    );
}

#[test]
fn unknown_request_is_not_found() {
    let f = setup();
    assert_eq!(f.treasury.try_get_request(&404), Err(Ok(Error::RequestNotFound)));
    assert_eq!(
        f.treasury.try_approve_payout(&404),
        Err(Ok(Error::RequestNotFound))
    );
}
