#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env};

fn setup() -> (Env, AmbassadorContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register(AmbassadorContract, ());
    let client = AmbassadorContractClient::new(&env, &id);
    client.init(&admin);
    (env, client, admin)
}

#[test]
fn init_sets_admin_and_zero_counter() {
    let (_env, client, admin) = setup();
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_counter(), 0);
}

#[test]
fn init_twice_fails() {
    let (env, client, _admin) = setup();
    let other = Address::generate(&env);
    assert_eq!(client.try_init(&other), Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn bump_increments_for_admin() {
    let (_env, client, admin) = setup();
    assert_eq!(client.bump(&admin), 1);
    assert_eq!(client.bump(&admin), 2);
    assert_eq!(client.get_counter(), 2);
}

#[test]
fn bump_rejects_non_admin() {
    let (env, client, _admin) = setup();
    let stranger = Address::generate(&env);
    assert_eq!(
        client.try_bump(&stranger),
        Err(Ok(Error::NotAuthorized))
    );
}
