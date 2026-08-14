import { Treasury } from '@stellar-ambassador/contract-client';
import { signTransaction } from '@stellar/freighter-api';

import { getStellarConfig } from './stellar';

/**
 * Contract client bound to the connected Freighter wallet. Pass `address` to sign and submit;
 * omit it for read-only simulation (the generated client only needs a source account then).
 */
export function getTreasuryClient(address?: string | null): Treasury.Client {
  const { treasuryContractId, networkPassphrase, rpcUrl } = getStellarConfig();
  if (!treasuryContractId) {
    throw new Error('NEXT_PUBLIC_TREASURY_CONTRACT_ID is not set — deploy with `make deploy`');
  }

  return new Treasury.Client({
    contractId: treasuryContractId,
    networkPassphrase,
    rpcUrl,
    publicKey: address ?? undefined,
    signTransaction: address
      ? async (xdr: string) => {
          const res = await signTransaction(xdr, { networkPassphrase, address });
          if (res.error) throw new Error(res.error.message);
          return { signedTxXdr: res.signedTxXdr, signerAddress: res.signerAddress };
        }
      : undefined,
  });
}
