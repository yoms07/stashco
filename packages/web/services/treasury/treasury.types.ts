/** Treasury's live pooled position, read straight from the contract (`balance()`). */
export interface TreasuryPosition {
  /** Raw i128 units at 7 decimals, as a decimal string — never a float. */
  balanceUnits: string;
}

export interface DepositInput {
  /** The connected wallet address supplying the funds. */
  address: string;
  /** Contract units (7 decimals), already parsed from the user's decimal input. */
  amountUnits: bigint;
}
