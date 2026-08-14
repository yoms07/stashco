'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useWallet } from '@/providers/wallet-provider';

import { authKeys } from './auth.queries';
import { AuthService } from './auth.service';

/** Current session, if any. A wallet address change invalidates this automatically. */
export function useMe() {
  const { address } = useWallet();
  return useQuery({
    queryKey: authKeys.me(address),
    queryFn: () => AuthService.me(),
    enabled: !!address,
    retry: false,
  });
}

export function useSignIn() {
  const { address } = useWallet();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!address) throw new Error('Connect a wallet first');
      return AuthService.signIn(address);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.all(address) }),
  });
}

export function useSignOut() {
  const { address } = useWallet();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => AuthService.logout(),
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.all(address) }),
  });
}
