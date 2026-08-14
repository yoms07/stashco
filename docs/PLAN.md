# PLAN

> **Placeholder.** The product idea is not defined yet. Fill §1 first — everything else
> follows from it.

## 1. What it is

_TBD._ One paragraph: who the user is, what they pay/earn, what the chain guarantees that
a database could not.

Demo script (the exact click path a judge/investor follows), once known:

1. …

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

## 4. Open questions

- What does the contract actually store and enforce?
- Which token (mock SEP-41 on testnet vs. real asset)?
- What must be on-chain vs. what is merely recorded off-chain?
