/**
 * Shared Stellar network configuration.
 *
 * Framework-agnostic: no env reads here. Each app (web / api) assembles its own runtime
 * config from its environment and picks a network from `STELLAR_NETWORKS`.
 */

export type StellarNetwork = 'testnet' | 'mainnet' | 'futurenet' | 'local';

export interface StellarNetworkConfig {
  /** Human label. */
  label: string;
  /** SEP-10 / tx signing network passphrase. */
  networkPassphrase: string;
  /** Soroban RPC endpoint (contract calls / simulation). */
  rpcUrl: string;
  /** Horizon endpoint (classic tx history, balances). */
  horizonUrl: string;
}

/** Default public endpoints per network. Override via env if you run your own. */
export const STELLAR_NETWORKS: Record<StellarNetwork, StellarNetworkConfig> = {
  testnet: {
    label: 'Testnet',
    networkPassphrase: 'Test SDF Network ; September 2015',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
  },
  mainnet: {
    label: 'Mainnet',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    rpcUrl: 'https://mainnet.sorobanrpc.com',
    horizonUrl: 'https://horizon.stellar.org',
  },
  futurenet: {
    label: 'Futurenet',
    networkPassphrase: 'Test SDF Future Network ; October 2022',
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    horizonUrl: 'https://horizon-futurenet.stellar.org',
  },
  local: {
    label: 'Local',
    networkPassphrase: 'Standalone Network ; February 2017',
    rpcUrl: 'http://localhost:8000/rpc',
    horizonUrl: 'http://localhost:8000',
  },
};

/** Resolve a network name to its config, defaulting to testnet for unknown values. */
export function getNetworkConfig(network: string | undefined): StellarNetworkConfig {
  return STELLAR_NETWORKS[(network as StellarNetwork) ?? 'testnet'] ?? STELLAR_NETWORKS.testnet;
}

/** True for a plausible Stellar account public key (G..., 56 chars base32). */
export function isStellarAddress(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(value);
}
