import type { ApiResponse, PayoutMeta, PayoutMetaRequest } from '@stellar-ambassador/shared';

import { getTreasuryClient } from '@/lib/contracts';
import { contractErrorVariant } from '@/lib/contract-errors';

import { ApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { PayoutRequest, RequestPayoutInput } from './payouts.types';

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
}
