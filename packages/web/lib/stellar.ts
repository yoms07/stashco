import { getNetworkConfig, type StellarNetwork } from '@stashco/shared';

/**
 * Runtime Stellar config for the web app, assembled from public env vars.
 * Falls back to the shared network defaults (testnet) when unset.
 */
export function getStellarConfig() {
  const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet') as StellarNetwork;
  const net = getNetworkConfig(network);
  return {
    network,
    networkPassphrase: net.networkPassphrase,
    rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? net.rpcUrl,
    horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL ?? net.horizonUrl,
    /** Deployed contract id (C...). Empty until you deploy + set it. */
    treasuryContractId: process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ID ?? '',
    /** Principal deposited, in raw contract units — see .env.example. `null` if unset/invalid,
     * so callers can omit the principal reference line rather than fabricate a value. */
    treasuryPrincipalUnits: parseBigIntEnv(process.env.NEXT_PUBLIC_TREASURY_PRINCIPAL_UNITS),
  };
}

function parseBigIntEnv(raw: string | undefined): bigint | null {
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export type StellarConfig = ReturnType<typeof getStellarConfig>;

/** Stellar Expert URL, or null for networks the explorer doesn't index (futurenet / local). */
export function explorerUrl(
  kind: 'tx' | 'contract' | 'account',
  id: string,
  network: string,
): string | null {
  const segment = network === 'mainnet' ? 'public' : network === 'testnet' ? 'testnet' : null;
  if (!segment || !id) return null;
  return `https://stellar.expert/explorer/${segment}/${kind}/${id}`;
}
