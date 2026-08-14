# CONTRACT_SPEC

Frozen interface for the Soroban contracts. Agents build against this; change it here
before changing Rust, and rerun `make bindings` after.

> **Placeholder** — `ambassador` currently exists only to prove the toolchain. Replace it.

## `ambassador`

`contracts/contracts/ambassador/src/lib.rs`

### Storage keys

| Key | Type | Meaning |
|-----|------|---------|
| `DataKey::Admin` | `Address` | Set once by `init`; the only address allowed to write. |
| `DataKey::Counter` | `u32` | Placeholder state. |

### Functions

| Signature | Auth | Notes |
|-----------|------|-------|
| `init(admin: Address) -> Result<(), Error>` | none (once) | Errors `AlreadyInitialized` on a second call. |
| `get_admin() -> Result<Address, Error>` | view | `NotInitialized` before `init`. |
| `bump(caller: Address) -> Result<u32, Error>` | `caller.require_auth()` | Admin only; returns the new value. |
| `get_counter() -> u32` | view | `0` before `init`. |

### Errors

| Variant | Code |
|---------|------|
| `AlreadyInitialized` | 1 |
| `NotInitialized` | 2 |
| `NotAuthorized` | 3 |

Keep error codes append-only — the frontend maps them to messages by number.
