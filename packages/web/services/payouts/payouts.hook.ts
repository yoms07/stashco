'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PayoutMetaRequest } from '@stashco/shared';

import { useWallet } from '@/providers/wallet-provider';
import { treasuryKeys } from '@/services/treasury';

import { payoutKeys } from './payouts.queries';
import { PayoutsService } from './payouts.service';
import type { ApprovePayoutInput, RejectPayoutInput, RequestPayoutInput } from './payouts.types';

/**
 * Whether the connected wallet is the on-chain owner, simulated live — never cached across
 * wallets or trusted from a JWT. Gates the request-payout form.
 */
export function useIsOwner() {
  const { address } = useWallet();
  const query = useQuery({
    queryKey: payoutKeys.owner(address),
    queryFn: () => PayoutsService.getOwner(),
    enabled: !!address,
  });
  return { ...query, isOwner: !!address && !!query.data && query.data === address };
}

export function useRequestPayout() {
  const { address } = useWallet();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<RequestPayoutInput, 'address'>) => {
      if (!address) throw new Error('Connect a wallet first');
      return PayoutsService.requestPayout({ address, ...input });
    },
    onSuccess: (id) => qc.invalidateQueries({ queryKey: payoutKeys.request(address, id) }),
  });
}

/** The metadata step of the two-step write — retried independently of `useRequestPayout`. */
export function useSubmitPayoutMeta() {
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: number; data: PayoutMetaRequest }) =>
      PayoutsService.submitMeta(requestId, data),
  });
}

/** Live status of a just-queued request, so the owner sees it sitting Pending. */
export function usePayoutRequest(id: number | null) {
  const { address } = useWallet();
  return useQuery({
    queryKey: payoutKeys.request(address, id),
    queryFn: () => {
      if (id === null) throw new Error('No request queued yet');
      return PayoutsService.getRequest(id);
    },
    enabled: id !== null,
    refetchInterval: 15_000,
  });
}

/**
 * Whether the connected wallet is the on-chain approver, simulated live — never cached across
 * wallets or trusted from a JWT (D-002). Gates the approver inbox.
 */
export function useIsApprover() {
  const { address } = useWallet();
  const query = useQuery({
    queryKey: payoutKeys.approver(address),
    queryFn: () => PayoutsService.getApprover(),
    enabled: !!address,
  });
  return { ...query, isApprover: !!address && !!query.data && query.data === address };
}

/** `GET /payouts/pending` — the approver's inbox. Polled: it's the closest thing to a notification. */
export function usePendingPayouts() {
  const { address } = useWallet();
  return useQuery({
    queryKey: payoutKeys.pending(address),
    queryFn: () => PayoutsService.getPending(),
    enabled: !!address,
    refetchInterval: 10_000,
  });
}

/** Approving moves money in two systems — invalidate the pending list, the full payout list,
 * and the treasury position together so the position visibly dropping is the proof it moved. */
export function useApprovePayout() {
  const { address } = useWallet();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ApprovePayoutInput, 'address'>) => {
      if (!address) throw new Error('Connect a wallet first');
      return PayoutsService.approvePayout({ address, ...input });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payoutKeys.all(address) });
      qc.invalidateQueries({ queryKey: treasuryKeys.all(address) });
    },
  });
}

/** Rejecting cancels the request on-chain — no funds move, so only the payout cache invalidates. */
export function useRejectPayout() {
  const { address } = useWallet();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: RejectPayoutInput['id']) => {
      if (!address) throw new Error('Connect a wallet first');
      return PayoutsService.rejectPayout({ address, id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: payoutKeys.all(address) }),
  });
}
