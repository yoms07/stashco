import type { ApiResponse, Payout, PayoutMeta, PayoutMetaRequest } from '@stellar-ambassador/shared';

import { getTreasuryClient } from '@/lib/contracts';
import { contractErrorVariant } from '@/lib/contract-errors';
import { formatUnitsToDecimal } from '@/lib/decimal';

import { ApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type {
  ApprovePayoutInput,
  PayoutRequest,
  RejectPayoutInput,
  RequestPayoutInput,
} from './payouts.types';

/** `ApiClient` never throws; unwrap so React Query can treat failures as errors. */
function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error(res.error ?? 'Request failed');
  return res.data as T;
}

function friendlyRequestPayoutError(rawMessage: string): string {
  const variant = contractErrorVariant(rawMessage);
  if (variant === 'NotAuthorized') {
    return 'Only the treasury owner can request a payout.';
  }
  if (variant === 'InvalidAmount') {
    return 'Enter an amount greater than zero, with a memo of 64 characters or fewer.';
  }
  return 'The payout request could not be queued. Please try again.';
}

/**
 * `InsufficientFunds` is expected and recoverable (docs/CONTRACT_SPEC.md) — the request stays
 * `Pending` for a retry, so this reads a fresh `balance()` to size the shortfall rather than
 * treating the failure as terminal. The trustline failure comes from the token contract, not
 * the treasury, so it's matched on the raw diagnostic text and named to the destination —
 * the single most likely thing to break a live demo.
 */
async function friendlyApprovePayoutError(
  rawMessage: string,
  { destination, amountUnits }: Pick<ApprovePayoutInput, 'destination' | 'amountUnits'>,
): Promise<string> {
  if (rawMessage.includes('trustline entry is missing for account')) {
    return `${destination} has no trustline for USDC yet, so it cannot receive this payout. The request stays pending.`;
  }

  const variant = contractErrorVariant(rawMessage);
  if (variant === 'NotAuthorized') return 'Only the treasury approver can approve payouts.';
  if (variant === 'RequestNotFound') return 'This request no longer exists.';
  if (variant === 'RequestNotPending') return 'Someone already handled this request.';
  if (variant === 'InsufficientFunds') {
    const client = getTreasuryClient();
    const balanceTx = await client.balance();
    const shortfall = BigInt(amountUnits) - balanceTx.result;
    const shortfallDecimal = formatUnitsToDecimal(shortfall > 0n ? shortfall : 0n);
    return `The treasury needs another ${shortfallDecimal} USDC before this can be approved. The request stays pending — retry once it's funded.`;
  }
  return 'The payout could not be approved. Please try again.';
}

function friendlyRejectPayoutError(rawMessage: string): string {
  const variant = contractErrorVariant(rawMessage);
  if (variant === 'NotAuthorized') return 'Only the treasury approver can reject payouts.';
  if (variant === 'RequestNotFound') return 'This request no longer exists.';
  if (variant === 'RequestNotPending') return 'Someone already handled this request.';
  return 'The payout could not be rejected. Please try again.';
}

export class PayoutsService {
  /** Live on-chain owner, read straight from the chain — used to gate the request form. */
  static async getOwner(): Promise<string | null> {
    const client = getTreasuryClient();
    const tx = await client.get_owner();
    return tx.result.isOk() ? tx.result.unwrap() : null;
  }

  /** Builds, simulates and signs `request_payout(destination, amount, memo)`. Moves no funds. */
  static async requestPayout({
    address,
    destination,
    amountUnits,
    memo,
  }: RequestPayoutInput): Promise<number> {
    const client = getTreasuryClient(address);

    let assembled: Awaited<ReturnType<typeof client.request_payout>>;
    try {
      assembled = await client.request_payout({ destination, amount: amountUnits, memo });
      // Forces the SDK to surface the raw simulation diagnostics (see lib/contract-errors.ts)
      // instead of the empty-message `Err` that `.result` would otherwise return silently.
      void assembled.simulationData;
    } catch (e) {
      throw new Error(friendlyRequestPayoutError(e instanceof Error ? e.message : String(e)));
    }

    const sent = await assembled.signAndSend();
    if (sent.result.isErr()) {
      throw new Error(friendlyRequestPayoutError(sent.result.unwrapErr().message));
    }
    return sent.result.unwrap();
  }

  /**
   * Off-chain vendor metadata for an already-queued request. Fails independently of the chain
   * write above — callers must retry this step alone, never re-submit `requestPayout`.
   */
  static async submitMeta(requestId: number, data: PayoutMetaRequest): Promise<PayoutMeta> {
    return unwrap(await ApiClient.post<PayoutMeta>(API_ENDPOINTS.payouts.meta(requestId), data));
  }

  /** Live request status, read straight from the chain (`get_request`). */
  static async getRequest(id: number): Promise<PayoutRequest | null> {
    const client = getTreasuryClient();
    const tx = await client.get_request({ id });
    if (tx.result.isErr()) return null;

    const req = tx.result.unwrap();
    return {
      destination: req.destination,
      amountUnits: req.amount.toString(),
      memo: req.memo,
      status: req.status.tag,
    };
  }

  /** Live on-chain approver, read straight from the chain — used to gate the approver inbox. */
  static async getApprover(): Promise<string | null> {
    const client = getTreasuryClient();
    const tx = await client.get_approver();
    return tx.result.isOk() ? tx.result.unwrap() : null;
  }

  /** `GET /payouts/pending` — chain status left-joined with off-chain vendor metadata (D-003). */
  static async getPending(): Promise<Payout[]> {
    return unwrap(await ApiClient.get<Payout[]>(API_ENDPOINTS.payouts.pending));
  }

  /** Builds, simulates and signs `approve_payout(id)`. Withdraws from Blend and pays the vendor. */
  static async approvePayout({ address, id, destination, amountUnits }: ApprovePayoutInput): Promise<void> {
    const client = getTreasuryClient(address);

    let assembled: Awaited<ReturnType<typeof client.approve_payout>>;
    try {
      assembled = await client.approve_payout({ id });
      // Forces the SDK to surface the raw simulation diagnostics (see lib/contract-errors.ts)
      // instead of the empty-message `Err` that `.result` would otherwise return silently.
      void assembled.simulationData;
    } catch (e) {
      throw new Error(
        await friendlyApprovePayoutError(e instanceof Error ? e.message : String(e), {
          destination,
          amountUnits,
        }),
      );
    }

    const sent = await assembled.signAndSend();
    if (sent.result.isErr()) {
      throw new Error(
        await friendlyApprovePayoutError(sent.result.unwrapErr().message, { destination, amountUnits }),
      );
    }
  }

  /** Builds, simulates and signs `reject_payout(id)`. Marks the request Rejected, never deleted. */
  static async rejectPayout({ address, id }: RejectPayoutInput): Promise<void> {
    const client = getTreasuryClient(address);

    let assembled: Awaited<ReturnType<typeof client.reject_payout>>;
    try {
      assembled = await client.reject_payout({ id });
      void assembled.simulationData;
    } catch (e) {
      throw new Error(friendlyRejectPayoutError(e instanceof Error ? e.message : String(e)));
    }

    const sent = await assembled.signAndSend();
    if (sent.result.isErr()) {
      throw new Error(friendlyRejectPayoutError(sent.result.unwrapErr().message));
    }
  }
}
