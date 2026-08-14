# Spike #5 — supply & withdraw from Blend *inside a Soroban contract*

**Verdict: PASSED on testnet. The hard gate is cleared — no fallback to a mock yield token is needed.**

Spike contract: `CCVX5TCIFDHY4JSAIHP7IEVSG5NMAQRVLEP3FBLIODNYLK66AGGPE2WA`
(crate `contracts/contracts/blend_spike` — throwaway, delete during #7)

Pool `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF` ·
USDC `CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU` (reserve index **3**)

## Transaction evidence

| Step | Result | Tx |
|------|--------|-----|
| Deploy spike | — | `53f510c88f9e01fc126d5a6a34b5bfdee088fe6f4f229e73049245c25b2e73a9` |
| `init(pool, usdc)` | — | `215890785b206b8819bfcfe58643353ba7c0f8d0dd9d77858c2a966351a6c6e5` |
| `fund` 10 USDC → contract | balance `100000000` | `de646f136ef3885a1184f893560619dabce7d4faf6f1c43c44f6065d0ef05af6` |
| **Approach 1** `approve` + `submit_with_allowance` 5 USDC | +`47352627` bTokens | `25eb62e92cb9f0af4e0594187b3fa01fe8a118c850e70cb5e4862e617194159f` |
| **Approach 2** `authorize_as_current_contract` + `submit` 5 USDC | +`47352626` bTokens | `ee931993d9a4bbedf47406a57c8c9195a61913f2afb0f906511b97aaeb7d6a54` |
| `withdraw` 10 USDC | position → `0`, returned `99999999` | `b3231fe9d7ea7469e1296e17705818375c82e4f5e2471a815d03fd5e5a98cbc2` |

Position appeared and then disappeared, observed on-chain. That is the ticket's success condition.

## Which approach to use in #6 — **approach 2**

Both work. Approach 2 (`env.authorize_as_current_contract` with an
`InvokerContractAuthEntry::Contract` covering the nested `transfer`, then plain `submit`) is
preferred:

- no allowance state to set, expire, or reason about (approach 1 needs an expiry ledger, and a
  stale allowance is a standing approval to move treasury funds — a real, if small, security
  surface in a contract whose entire point is that funds cannot move without approval)
- one fewer cross-contract call — the `approve` event is absent from approach 2's tx
- the authorization is scoped to exactly one transfer of exactly one amount, per invocation

The auth entry that worked:

```rust
env.authorize_as_current_contract(vec![
    &env,
    InvokerContractAuthEntry::Contract(SubContractInvocation {
        context: ContractContext {
            contract: usdc.clone(),
            fn_name: Symbol::new(&env, "transfer"),
            args: (me.clone(), pool.clone(), amount).into_val(&env),
        },
        sub_invocations: vec![&env],
    }),
]);
```

Withdraw needs **no** auth entry — the pool transfers *to* us.

## Findings that change #6

### 1. Positions are denominated in bTokens, not underlying USDC

Supplying `50000000` credited `47352627`. The ratio is the reserve's `b_rate`.

`balance()` must convert:

```
underlying = collateral_bTokens * b_rate / 1e12
```

`b_rate` comes from `get_reserve(usdc).data.b_rate` and is scaled by **1e12** (SCALAR_12).
It is *not* the reserve's `scalar` field, which is `1e7` (the token's decimals). Confusing the
two is a 5-order-of-magnitude error.

Verified: `94705253 * 1055907628507 / 1e12 = 99999999.6` → floor `99999999`, exactly the amount
the withdraw returned.

A naive `balance()` returning the raw map value would have understated the treasury by 5.6% and
— worse — made the `InsufficientFunds` pre-check compare underlying against bTokens, rejecting
payouts the treasury could actually afford.

### 2. The round trip loses 1 stroop

Withdrawing `100000000` returned `99999999`. Blend floors the bToken→underlying conversion.

The spec says `approve_payout` "withdraws exactly `amount` and transfers it to the destination".
Taken literally that is not achievable — the withdraw can land a stroop short and the subsequent
transfer of `amount` would fail.

The invariant that actually matters is **the destination receives exactly `amount`** (never
partial — that is the settled design). How much is pulled from Blend is an implementation
detail. So `approve_payout` should withdraw with a small buffer, verify the realised balance
delta covers `amount`, then transfer exactly `amount`. Sub-stroop dust stays in the contract,
which is the treasury — it is not lost.

### 3. Contract addresses need no trustline

`trust()` against the spike's `C...` address simulated as read-only (no ledger write), and the
contract received 10 USDC with no trustline. SAC balances for contract addresses are contract
data, not trustlines.

Only `G...` destinations need `trust()` — so the trustline risk is real for **payout
destinations** (#15) and not for the treasury itself.

### 4. `blend-contract-sdk` is unusable as a Rust dependency here

Latest (2.25.0) pins `soroban-sdk ^25.0.1`; this workspace is on 26. Declaring the pool
interface with `#[contractclient]` and matching `#[contracttype]` structs works against the live
pool and is what the spike used. Field *order* in the struct declaration is irrelevant —
`contracttype` encodes to a name-keyed map — but names and types must match exactly.

For #6's tests this means the pool WASM must be fetched (`stellar contract fetch`) and
registered directly rather than pulled in as a crate.

## Confirmed constants

`Supply=0, Withdraw=1, SupplyCollateral=2, WithdrawCollateral=3, Borrow=4, Repay=5`
(independently confirmed from Blend v2 source during #4).

USDC reserve config: `decimals: 7`, `c_factor 9500000`, `max_util 9500000`, `b_rate` at time of
spike `1055907628507`.
