# CONTRACT_SPEC

Frozen interface for the Soroban contracts. Agents build against this; change it here
before changing Rust, and rerun `make bindings` after.

## `treasury`

`contracts/contracts/treasury/src/lib.rs`

A single-owner on-chain treasury. `owner` deposits USDC, which is immediately supplied to a
Blend V2 pool for yield. Paying a vendor requires two distinct parties: `owner` queues a
payout, `approver` executes it — the contract enforces the separation, not an off-chain
process.

Two asymmetries are deliberate, not bugs — see `docs/DECISIONS.md` D-006 and D-007:

- `set_approver` is **approver-only**. The owner can never rotate the approver.
- There is **no recovery path**. Losing the approver key freezes the treasury permanently.

### Storage keys

Instance storage:

| Key | Type | Meaning |
|-----|------|---------|
| `Owner` | `Address` | May call `deposit` and `request_payout`. Nothing else. |
| `Approver` | `Address` | May call `approve_payout`, `reject_payout`, `set_approver`. |
| `Pool` | `Address` | Blend V2 pool. Set at `init`, immutable. |
| `Usdc` | `Address` | Reserve asset. Set at `init`, immutable. |
| `NextRequestId` | `u32` | Monotonic counter. |

Persistent storage:

| Key | Type | Meaning |
|-----|------|---------|
| `Request(u32)` | `PayoutRequest` | `{ destination, amount, memo, status }`. Never deleted — the request log is the audit trail. |

### Types

```rust
enum RequestStatus { Pending, Approved, Rejected }

struct PayoutRequest {
    destination: Address,
    amount: i128,
    memo: String,       // capped at 64 chars
    status: RequestStatus,
}
```

### Functions

| Signature | Auth | Notes |
|-----------|------|-------|
| `init(owner: Address, approver: Address, pool: Address, usdc: Address) -> Result<(), Error>` | none (once) | `AlreadyInitialized` on a second call. `OwnerIsApprover` if `owner == approver` — the only moment separation can ever be established. |
| `deposit(from: Address, amount: i128) -> Result<(), Error>` | `from.require_auth()` | Anyone may call. Transfers `amount` USDC from `from` into the contract and supplies it to Blend in the same transaction. No idle buffer. `InvalidAmount` if `amount <= 0`. |
| `request_payout(destination: Address, amount: i128, memo: String) -> Result<u32, Error>` | owner only | Queues an intent; moves no money. Returns the new request id. `InvalidAmount` if `amount <= 0` or `memo` exceeds 64 chars. |
| `approve_payout(id: u32) -> Result<(), Error>` | approver only | Withdraws from Blend and pays `destination` in one transaction. `RequestNotFound` / `RequestNotPending` / `InsufficientFunds` (checked against `balance()` before *and* after the withdraw — never a partial payment). |
| `reject_payout(id: u32) -> Result<(), Error>` | approver only | Marks the request `Rejected`. Record is kept, never deleted. |
| `set_approver(new_approver: Address) -> Result<(), Error>` | approver only | Rotates the approver. `OwnerIsApprover` if `new_approver == owner`. |
| `balance() -> i128` | view | The treasury's Blend position converted from bTokens to underlying USDC (see D-008). |
| `get_request(id: u32) -> Result<PayoutRequest, Error>` | view | `RequestNotFound` if unknown. |
| `get_owner() -> Result<Address, Error>` | view | `NotInitialized` before `init`. |
| `get_approver() -> Result<Address, Error>` | view | `NotInitialized` before `init`. |
| `next_request_id() -> u32` | view | `0` before any request. |

Amounts are `i128` at **7 decimals**, matching the pool's USDC reserve config.

### Errors

Append-only — the frontend maps these to messages by number.

| Variant | Code |
|---------|------|
| `AlreadyInitialized` | 1 |
| `NotInitialized` | 2 |
| `NotAuthorized` | 3 |
| `OwnerIsApprover` | 4 |
| `RequestNotFound` | 5 |
| `RequestNotPending` | 6 |
| `InsufficientFunds` | 7 |
| `InvalidAmount` | 8 |

### Third-party dependency

Blend V2 pool interface is declared locally in `contracts/contracts/treasury/src/blend.rs`
(`blend-contract-sdk` pins an incompatible `soroban-sdk` version — see `docs/DECISIONS.md`).
Testnet addresses:

| What | Address |
|------|---------|
| Pool | `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF` |
| USDC | `CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU` (reserve index 3) |

Both are `init` params, not compile-time constants, so a testnet reset is a redeploy.
