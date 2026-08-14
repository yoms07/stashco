import { Ambassador } from '@stellar-ambassador/contract-client';
import { signTransaction } from '@stellar/freighter-api';

import { getStellarConfig } from './stellar';

/**
 * Contract client bound to the connected Freighter wallet. Pass `address` to sign and submit;
 * omit it for read-only simulation (the generated client only needs a source account then).
 */
export function getAmbassadorClient(address?: string | null): Ambassador.Client {
  const { ambassadorContractId, networkPassphrase, rpcUrl } = getStellarConfig();
  if (!ambassadorContractId) {
    throw new Error('NEXT_PUBLIC_AMBASSADOR_CONTRACT_ID is not set — deploy with `make deploy`');
  }

  return new Ambassador.Client({
    contractId: ambassadorContractId,
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
