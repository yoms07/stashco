#![no_std]

//! Treasury Vault — a single-owner on-chain treasury that supplies USDC to Blend for yield and
//! gates every payout behind a separate approver.
//!
//! The security claim is narrow and must be exactly true: **the owner cannot spend alone, and
//! cannot make themselves the approver.**
//!
//! Two asymmetries are deliberate and must not be "fixed":
//!   * `set_approver` is approver-only — the owner can never rotate the approver.
//!   * There is no recovery path. A lost approver key freezes the treasury permanently. An
//!     escape hatch would by definition be a way to move funds without approval, i.e. the exact
//!     thing this contract exists to prevent.

use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contracterror, contractimpl, contracttype, panic_with_error, token, vec, Address,
    Env, IntoVal, String, Symbol,
};

mod blend;
use blend::{PoolClient, Request, SCALAR_12, SUPPLY_COLLATERAL, WITHDRAW_COLLATERAL};

const MEMO_MAX_LEN: u32 = 64;

/// Blend floors the bToken->underlying conversion, so withdrawing exactly `amount` can land a
/// stroop short. We ask for a few extra stroops and then transfer exactly `amount`; the pool
/// clamps the request to the available position, so over-asking is safe. Any residue stays in
/// the contract, which is the treasury.
const WITHDRAW_BUFFER: i128 = 100;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAuthorized = 3,
    OwnerIsApprover = 4,
    RequestNotFound = 5,
    RequestNotPending = 6,
    InsufficientFunds = 7,
    InvalidAmount = 8,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RequestStatus {
    Pending,
    Approved,
    Rejected,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayoutRequest {
    pub destination: Address,
    pub amount: i128,
    pub memo: String,
    pub status: RequestStatus,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Owner,
    Approver,
    Pool,
    Usdc,
    NextRequestId,
    Request(u32),
}

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    /// `owner == approver` is rejected here because, under approver-only rotation, this is the
    /// only moment separation can ever be established. Allow it once and the owner is both
    /// parties permanently and the entire security claim is void.
    pub fn init(
        env: Env,
        owner: Address,
        approver: Address,
        pool: Address,
        usdc: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Owner) {
            return Err(Error::AlreadyInitialized);
        }
        if owner == approver {
            return Err(Error::OwnerIsApprover);
        }

        let storage = env.storage().instance();
        storage.set(&DataKey::Owner, &owner);
        storage.set(&DataKey::Approver, &approver);
        storage.set(&DataKey::Pool, &pool);
        storage.set(&DataKey::Usdc, &usdc);
        storage.set(&DataKey::NextRequestId, &0u32);
        Ok(())
    }

    /// Anyone may deposit. Depositing buys no claim on the funds — there is no per-depositor
    /// accounting, just one pooled position. Funds are supplied to Blend in the same
    /// transaction; there is no idle buffer.
    pub fn deposit(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let usdc = Self::usdc(&env)?;
        let me = env.current_contract_address();
        token::TokenClient::new(&env, &usdc).transfer(&from, &me, &amount);
        Self::supply_to_blend(&env, amount)?;
        Ok(())
    }

    /// Owner only. Moves no money — it queues an intent that only the approver can execute.
    pub fn request_payout(
        env: Env,
        destination: Address,
        amount: i128,
        memo: String,
    ) -> Result<u32, Error> {
        let owner = Self::owner(&env)?;
        owner.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if memo.len() > MEMO_MAX_LEN {
            return Err(Error::InvalidAmount);
        }

        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextRequestId)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::NextRequestId, &(id + 1));

        env.storage().persistent().set(
            &DataKey::Request(id),
            &PayoutRequest {
                destination,
                amount,
                memo,
                status: RequestStatus::Pending,
            },
        );
        Ok(id)
    }

    /// Approver only. Withdraws from Blend and pays the destination in one transaction.
    ///
    /// Funds are checked here and nowhere else — a request is queued without regard to balance,
    /// so several may be pending at once. If the treasury cannot cover this one the call reverts
    /// and the request stays `Pending` for a retry after the next deposit.
    pub fn approve_payout(env: Env, id: u32) -> Result<(), Error> {
        let approver = Self::approver(&env)?;
        approver.require_auth();

        let mut request = Self::load_request(&env, id)?;
        if request.status != RequestStatus::Pending {
            return Err(Error::RequestNotPending);
        }

        // Explicit pre-check so the approver gets a legible error instead of an opaque Blend
        // host error from deep inside the pool.
        if Self::balance(env.clone()) < request.amount {
            return Err(Error::InsufficientFunds);
        }

        let usdc = Self::usdc(&env)?;
        let me = env.current_contract_address();
        let token_client = token::TokenClient::new(&env, &usdc);

        let before = token_client.balance(&me);
        Self::withdraw_from_blend(&env, request.amount + WITHDRAW_BUFFER)?;
        let received = token_client.balance(&me) - before;

        // Never pay partially: a partial transfer would silently change what the approver
        // signed off on.
        if received < request.amount {
            return Err(Error::InsufficientFunds);
        }

        token_client.transfer(&me, &request.destination, &request.amount);

        request.status = RequestStatus::Approved;
        env.storage()
            .persistent()
            .set(&DataKey::Request(id), &request);
        Ok(())
    }

    /// Approver only. The record is kept, never deleted — the request log is the audit trail.
    pub fn reject_payout(env: Env, id: u32) -> Result<(), Error> {
        let approver = Self::approver(&env)?;
        approver.require_auth();

        let mut request = Self::load_request(&env, id)?;
        if request.status != RequestStatus::Pending {
            return Err(Error::RequestNotPending);
        }

        request.status = RequestStatus::Rejected;
        env.storage()
            .persistent()
            .set(&DataKey::Request(id), &request);
        Ok(())
    }

    /// Approver only — the owner can never rotate the approver. This asymmetry is what makes
    /// the gate real rather than decorative, and it is why a lost approver key is unrecoverable.
    pub fn set_approver(env: Env, new_approver: Address) -> Result<(), Error> {
        let approver = Self::approver(&env)?;
        approver.require_auth();

        // Rotating to the owner would collapse the two roles and void the security claim just
        // as surely as allowing it at init.
        if new_approver == Self::owner(&env)? {
            return Err(Error::OwnerIsApprover);
        }

        env.storage()
            .instance()
            .set(&DataKey::Approver, &new_approver);
        Ok(())
    }

    /// The treasury's Blend position in underlying USDC.
    ///
    /// Blend reports positions in bTokens, which appreciate against the underlying as `b_rate`
    /// rises — that appreciation *is* the yield. Returning the raw position would understate the
    /// treasury and make the `InsufficientFunds` pre-check compare bTokens against underlying.
    pub fn balance(env: Env) -> i128 {
        let pool = match Self::pool(&env) {
            Ok(p) => p,
            Err(e) => panic_with_error!(&env, e),
        };
        let usdc = match Self::usdc(&env) {
            Ok(u) => u,
            Err(e) => panic_with_error!(&env, e),
        };

        let client = PoolClient::new(&env, &pool);
        let reserve = client.get_reserve(&usdc);
        let positions = client.get_positions(&env.current_contract_address());
        let btokens = positions.collateral.get(reserve.config.index).unwrap_or(0);

        btokens * reserve.data.b_rate / SCALAR_12
    }

    pub fn get_request(env: Env, id: u32) -> Result<PayoutRequest, Error> {
        Self::load_request(&env, id)
    }

    pub fn get_owner(env: Env) -> Result<Address, Error> {
        Self::owner(&env)
    }

    pub fn get_approver(env: Env) -> Result<Address, Error> {
        Self::approver(&env)
    }

    pub fn next_request_id(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::NextRequestId)
            .unwrap_or(0)
    }

    // --- internals ---

    /// The contract is both `from` and `spender`, so it must authorize the pool's nested
    /// `transfer` as itself. Proven on testnet in the #5 spike; see
    /// `.scratch/notes/05-blend-auth-spike.md`.
    fn supply_to_blend(env: &Env, amount: i128) -> Result<(), Error> {
        let pool = Self::pool(env)?;
        let usdc = Self::usdc(env)?;
        let me = env.current_contract_address();

        env.authorize_as_current_contract(vec![
            env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: usdc.clone(),
                    fn_name: Symbol::new(env, "transfer"),
                    args: (me.clone(), pool.clone(), amount).into_val(env),
                },
                sub_invocations: vec![env],
            }),
        ]);

        PoolClient::new(env, &pool).submit(
            &me,
            &me,
            &me,
            &vec![
                env,
                Request {
                    address: usdc,
                    amount,
                    request_type: SUPPLY_COLLATERAL,
                },
            ],
        );
        Ok(())
    }

    /// No invoker auth entry needed here — the pool transfers *to* us.
    fn withdraw_from_blend(env: &Env, amount: i128) -> Result<(), Error> {
        let pool = Self::pool(env)?;
        let usdc = Self::usdc(env)?;
        let me = env.current_contract_address();

        PoolClient::new(env, &pool).submit(
            &me,
            &me,
            &me,
            &vec![
                env,
                Request {
                    address: usdc,
                    amount,
                    request_type: WITHDRAW_COLLATERAL,
                },
            ],
        );
        Ok(())
    }

    fn load_request(env: &Env, id: u32) -> Result<PayoutRequest, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Request(id))
            .ok_or(Error::RequestNotFound)
    }

    fn owner(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Owner)
            .ok_or(Error::NotInitialized)
    }

    fn approver(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Approver)
            .ok_or(Error::NotInitialized)
    }

    fn pool(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Pool)
            .ok_or(Error::NotInitialized)
    }

    fn usdc(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Usdc)
            .ok_or(Error::NotInitialized)
    }
}

mod test;
