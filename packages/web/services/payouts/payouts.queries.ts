/**
 * Wallet-address-prefixed query keys, matching `services/auth/` and `services/treasury/` — a
 * Freighter account switch invalidates everything automatically.
 */
export const payoutKeys = {
  all: (address: string | null) => ['payouts', address] as const,
  /** Live `get_owner()` check used to gate the request form. */
  owner: (address: string | null) => [...payoutKeys.all(address), 'owner'] as const,
  request: (address: string | null, id: number | null) =>
    [...payoutKeys.all(address), 'request', id] as const,
};
