/**
 * Wallet-address-prefixed query keys, matching `services/auth/` — a Freighter account switch
 * invalidates everything automatically. The treasury position isn't per-wallet (it's one
 * pooled balance), but the connected wallet is who's asking and who just deposited into it.
 */
export const treasuryKeys = {
  all: (address: string | null) => ['treasury', address] as const,
  position: (address: string | null) => [...treasuryKeys.all(address), 'position'] as const,
  history: (address: string | null) => [...treasuryKeys.all(address), 'history'] as const,
};
