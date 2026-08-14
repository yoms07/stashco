'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PayoutMetaRequest } from '@stellar-ambassador/shared';

import { useWallet } from '@/providers/wallet-provider';

import { payoutKeys } from './payouts.queries';
import { PayoutsService } from './payouts.service';
import type { RequestPayoutInput } from './payouts.types';

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
