/** Mirrors the contract's `RequestStatus` tag (`packages/contract-client`). */
export type PayoutStatus = 'Pending' | 'Approved' | 'Rejected';

/** A queued payout request, read straight from the chain (`get_request`). */
export interface PayoutRequest {
  destination: string;
  /** Raw i128 units at 7 decimals, as a decimal string — never a float. */
  amountUnits: string;
  memo: string;
  status: PayoutStatus;
}

export interface RequestPayoutInput {
  /** The connected wallet address — must be the on-chain owner. */
  address: string;
  destination: string;
  /** Contract units (7 decimals), already parsed from the user's decimal input. */
  amountUnits: bigint;
  memo: string;
}
