'use client';

import { ConnectWalletButton } from '@/components/wallet/connect-wallet-button';
import { getStellarConfig } from '@/lib/stellar';
import { useWallet } from '@/providers/wallet-provider';
import { useMe } from '@/services/auth';

export default function Home() {
  const { restoring, isInstalled } = useWallet();
  const { data: session } = useMe();
  const { network, ambassadorContractId } = getStellarConfig();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">stellar-ambassador</h1>
        <p className="text-sm opacity-60">
          Network: {network} · Contract: {ambassadorContractId || 'not deployed yet'}
        </p>
      </div>

      {restoring ? (
        <p className="text-sm opacity-60">Checking wallet…</p>
      ) : (
        <>
          <ConnectWalletButton />
          {!isInstalled ? (
            <p className="text-sm opacity-60">
              No Freighter detected —{' '}
              <a className="underline" href="https://www.freighter.app" target="_blank" rel="noreferrer">
                install the extension
              </a>
              .
            </p>
          ) : null}
          {session ? <p className="text-sm">Signed in as {session.address}</p> : null}
        </>
      )}
    </main>
  );
}
