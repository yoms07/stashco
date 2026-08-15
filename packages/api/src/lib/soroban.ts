import { Treasury, contract, Keypair } from '@stashco/contract-client';
import { getNetworkConfig } from '@stashco/shared';
import { env } from '../config/env.js';

/**
 * Read access to the on-chain contract. Simulation only — `contract.NULL_ACCOUNT` is the
 * source account since reads never sign or submit. Nothing here is cached: on-chain state
 * is the authority, so every check re-simulates.
 */
export function readClient(): Treasury.Client {
  if (!env.TREASURY_CONTRACT_ID) {
    throw new Error('TREASURY_CONTRACT_ID is not configured');
  }
  const { networkPassphrase } = getNetworkConfig(env.STELLAR_NETWORK);
  return new Treasury.Client({
    contractId: env.TREASURY_CONTRACT_ID,
    networkPassphrase,
    rpcUrl: env.SOROBAN_RPC_URL,
    publicKey: contract.NULL_ACCOUNT,
  });
}

/**
 * A client that can sign and submit, backed by the `SERVER_SIGNER_SECRET` keypair — for
 * permissionless calls the backend makes on users' behalf. Returns null when no signer is
 * configured so callers can 503 cleanly instead of crashing at import time.
 */
export function signingClient(): { client: Treasury.Client; address: string } | null {
  if (!env.TREASURY_CONTRACT_ID || !env.SERVER_SIGNER_SECRET) return null;

  const { networkPassphrase } = getNetworkConfig(env.STELLAR_NETWORK);
  const keypair = Keypair.fromSecret(env.SERVER_SIGNER_SECRET);
  const signer = contract.basicNodeSigner(keypair, networkPassphrase);
  const client = new Treasury.Client({
    contractId: env.TREASURY_CONTRACT_ID,
    networkPassphrase,
    rpcUrl: env.SOROBAN_RPC_URL,
    publicKey: keypair.publicKey(),
    signTransaction: signer.signTransaction,
  });
  return { client, address: keypair.publicKey() };
}
