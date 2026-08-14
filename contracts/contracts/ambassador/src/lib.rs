#![no_std]

//! Placeholder contract. It exists so the whole toolchain — build, test, bindings, deploy —
//! is wired end to end before the product idea lands. Replace the body; keep the shape:
//! `init` once, admin-gated writes, `#[contracterror]` for every failure, typed storage keys.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAuthorized = 3,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Counter,
}

#[contract]
pub struct AmbassadorContract;

#[contractimpl]
impl AmbassadorContract {
    pub fn init(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Counter, &0u32);
        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    pub fn bump(env: Env, caller: Address) -> Result<u32, Error> {
        caller.require_auth();
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if caller != admin {
            return Err(Error::NotAuthorized);
        }

        let next: u32 = Self::get_counter(env.clone()) + 1;
        env.storage().instance().set(&DataKey::Counter, &next);
        Ok(next)
    }

    pub fn get_counter(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0u32)
    }
}

mod test;
