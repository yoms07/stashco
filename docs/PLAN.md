# PLAN

## 1. What it is

**StashCo** is a **single-owner on-chain treasury**. A company deposits USDC into a
Soroban contract; the contract immediately supplies it to a Blend V2 lending pool so it earns
yield. Paying a vendor requires two distinct parties — the `owner` queues the payout, a
separate `approver` executes it — and the contract itself enforces that, not an off-chain
process. The chain guarantee a database could not give: the owner of the money cannot
unilaterally spend it, and cannot appoint themselves as the person who authorises spending.

Full spec: `.scratch/specs/treasury-vault.md`. Frozen interface: `docs/CONTRACT_SPEC.md`.

Demo script (the exact click path a judge/investor follows):

1. Wallet A (owner) connects, deposits USDC — `balance()` starts growing on its own as Blend's
   `b_rate` rises.
2. Wallet A requests a payout to the vendor (destination, amount, memo).
3. Wallet B (approver) opens their pending inbox and approves — one transaction withdraws from
   Blend and pays the vendor.
4. The vendor's balance moves. Wallet A could not have done it alone.

## 2. Architecture

```
contracts/ (Rust, Soroban)              ← authority on money + entitlement
   │  make bindings
   ▼
packages/contract-client (generated TS) ← packages/web
                                        ← packages/api
packages/shared (Zod schemas, network)  ← packages/web, packages/api
```

- **Chain** is the source of truth for value and access.
- **Postgres** is a filing cabinet: off-chain metadata and login nonces only. Never money,
  never entitlement.
- **Wallet is identity.** No email, no password, no user table.

## 3. Frontend domains

`packages/web/services/<domain>/` with the four-file pattern
(`*.types.ts`, `*.queries.ts`, `*.service.ts`, `*.hook.ts`).

Existing: `auth`. Add domains per the idea.

## 4. Open questions (answered)

- **What does the contract actually store and enforce?** `docs/CONTRACT_SPEC.md` — owner,
  approver, pool, USDC addresses, and the payout request log. The contract enforces the
  owner/approver separation; it enforces nothing about vendor identity or invoice metadata,
  which live off-chain (D-003).
- **Which token?** The real testnet USDC reserve behind Blend V2
  (`CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU`), not a mock SEP-41 token —
  acquired per `.scratch/notes/04-testnet-assets.md`.
- **What must be on-chain vs. off-chain?** On-chain: owner, approver, the payout request log,
  and the pooled Blend position. Off-chain (Postgres, D-003): vendor names, invoice refs, and
  position snapshots for the yield chart — none of it is ever consulted to decide whether a
  payout may proceed.

Remaining open question, unchanged from the spec: submission deadline, which decides whether
all three layers (contract, API, web) are realistic or the API gets cut.
