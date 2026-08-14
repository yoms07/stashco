'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useWallet } from '@/providers/wallet-provider';

import { treasuryKeys } from './treasury.queries';
import { TreasuryService } from './treasury.service';
import type { DepositInput } from './treasury.types';

/** The treasury's live position, read straight from the chain. Anyone connected can see it. */
export function useTreasuryPosition() {
  const { address } = useWallet();
  return useQuery({
    queryKey: treasuryKeys.position(address),
    queryFn: () => TreasuryService.getPosition(),
    enabled: !!address,
    // The position grows on its own as Blend's b_rate rises — poll so the panel reflects that.
    refetchInterval: 15_000,
  });
}

export function useDeposit() {
  const { address } = useWallet();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amountUnits: DepositInput['amountUnits']) => {
      if (!address) throw new Error('Connect a wallet first');
      return TreasuryService.deposit({ address, amountUnits });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: treasuryKeys.all(address) }),
  });
}
