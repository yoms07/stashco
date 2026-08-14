# Testnet assets — issue #4

## Deployer

- Address: `GBW65PM5E3O3TVV4JMBVSJI7NDOFLHH3MNJJDLRARXRZ562HE3ZLOXQV`
- Final balances (Horizon, post-borrow):
  - USDC: `500.0000000` (confirmed both via Horizon `accounts` and token contract `balance` call → `"5000000000"` = 500 * 10^7)
  - XLM: `9973.8078986` (started ~19973.9091075; spent ~10000 supplied as collateral + fees)
- Trustline for USDC was already present before this session (per issue text) and is confirmed present now (non-zero balance).

## Vendor (demo payout recipient)

- Address: `GBL4TKOXBNQOXFPHBPZQTWJS5UWROHNS2U6PIDDNLGFKCQUWN2MANEUY`
- Secret key: NOT recorded here (stored only in local `stellar keys` identity `vendor`, alias in `/Users/jason/.config/stellar/identity/vendor.toml`)
- Trustline: confirmed via Horizon — `USDC` balance `0.0000000`, issuer `GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56` present in `accounts` response. Ready to receive.

## Acquisition path used

DEX path is dead — re-verified fresh. Fetched order book both orientations from Horizon:
- `selling=USDC/buying=XLM`: **zero asks**.
- `selling=XLM/buying=USDC`: one ask, 1000 XLM at price 1 (i.e. someone selling XLM wanting USDC) — this is the offer the spec author misread; it is not a USDC ask.

Fallback used: **borrow USDC from the Blend V2 pool against XLM collateral**, as a plain account (deployer signs for itself, not a contract).

### Confirming `Request` type numbers

Confirmed by fetching the actual Blend v2 pool source (`blend-capital/blend-contracts-v2`, `pool/src/pool/actions.rs`, `RequestType` enum) via GitHub:

```rust
pub enum RequestType {
    Supply = 0,
    Withdraw = 1,
    SupplyCollateral = 2,
    WithdrawCollateral = 3,
    Borrow = 4,
    Repay = 5,
    FillUserLiquidationAuction = 6,
    FillBadDebtAuction = 7,
    FillInterestAuction = 8,
    DeleteLiquidationAuction = 9,
}
```

This matches the numbering given in the issue/task exactly (2 = SupplyCollateral, 3 = WithdrawCollateral, 4 = Borrow, 5 = Repay). Also cross-checked pool interface with:
```
stellar contract invoke --network testnet --source deployer --id CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF -- submit --help
```
which confirms the `submit` args: `--requests`, `--to`, `--spender`, `--from`.

### Reserve / oracle data used to size the borrow

- `get_reserve_list` on the pool → `["CDLZ...(XLM, index 0)", "CAZA...(index 1)", "CAP5...(index 2)", "CAQC...(USDC, index 3)"]` — confirms XLM=0, USDC=3 as stated in the issue.
- XLM reserve config: `c_factor 9000000` (90%), `decimals 7`.
- USDC reserve config: `l_factor 9500000` (95%), `decimals 7`.
- Oracle (`CAZOKR2Y5E2OSWSIBRVZMJ47RUTQPIGVWSAQ2UISGAVC46XKPGDG5PKI`) `lastprice`: XLM = `4200000` (i.e. $0.42, 7 decimals), USDC = `10000000` (i.e. $1.00).
- Supplying 10000 XLM ≈ $4200 notional, ~$3780 after 90% c_factor — borrowing 500 USDC ($500) is heavily overcollateralized (safety margin ~7.5x). Confirmed no revert.

### Exact commands that worked

1. Supply 10000 XLM as collateral (`request_type=2`, amount = `100000000000` = 10000 * 10^7):

```bash
DEPLOYER=GBW65PM5E3O3TVV4JMBVSJI7NDOFLHH3MNJJDLRARXRZ562HE3ZLOXQV
stellar contract invoke --network testnet --source deployer --send=yes \
  --id CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF -- submit \
  --from $DEPLOYER --spender $DEPLOYER --to $DEPLOYER \
  --requests '[{"address":"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC","amount":"100000000000","request_type":2}]'
```
Result: success, `supply_collateral` event, collateral position `{"0":"56673653382"}` (bTokens).

2. Borrow 500 USDC (`request_type=4`, amount = `5000000000` = 500 * 10^7):

```bash
stellar contract invoke --network testnet --source deployer --send=yes \
  --id CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF -- submit \
  --from $DEPLOYER --spender $DEPLOYER --to $DEPLOYER \
  --requests '[{"address":"CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU","amount":"5000000000","request_type":4}]'
```
Result: success, `borrow` event, 500 USDC transferred to deployer, liabilities `{"3":"4676014012"}` (dTokens).

3. Vendor identity + trustline:

```bash
stellar keys generate vendor --network testnet --fund
# -> GBL4TKOXBNQOXFPHBPZQTWJS5UWROHNS2U6PIDDNLGFKCQUWN2MANEUY

VENDOR=GBL4TKOXBNQOXFPHBPZQTWJS5UWROHNS2U6PIDDNLGFKCQUWN2MANEUY
stellar contract invoke --network testnet --source vendor --send=yes \
  --id CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU -- trust --addr $VENDOR
```
Result: success.

### Transaction hashes

| Step | Tx hash |
|------|---------|
| Supply 10000 XLM collateral | `2c1b0623877f0f4e27a961eeba5a8ed3f4704e4197f7aff869b04ebea53d6992` |
| Borrow 500 USDC | `fef433544e20290c5d1e5a08eee98c264e972300a26ef282416531e56bb97b2b` |
| Vendor `trust()` call | `84c0985a657b3ca2933df5e2833f42f5fcb8d412f4fa692d4861e234270bd94d` |

Explorer links:
- https://stellar.expert/explorer/testnet/tx/2c1b0623877f0f4e27a961eeba5a8ed3f4704e4197f7aff869b04ebea53d6992
- https://stellar.expert/explorer/testnet/tx/fef433544e20290c5d1e5a08eee98c264e972300a26ef282416531e56bb97b2b
- https://stellar.expert/explorer/testnet/tx/84c0985a657b3ca2933df5e2833f42f5fcb8d412f4fa692d4861e234270bd94d

## Failures / workarounds

None. Every step succeeded on the first attempt. No `mint` was attempted (per the rules). No Rust/contracts files touched, no `packages/` files touched, no git commit made.
