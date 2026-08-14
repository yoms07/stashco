'use client';

import { ConnectWalletButton } from '@/components/wallet/connect-wallet-button';
import { DepositForm } from '@/components/treasury/deposit-form';
import { PositionPanel } from '@/components/treasury/position-panel';
import { getStellarConfig } from '@/lib/stellar';
import { useWallet } from '@/providers/wallet-provider';
import { useMe } from '@/services/auth';

export default function Home() {
  const { restoring, isInstalled, isConnected } = useWallet();
  const { data: session } = useMe();
  const { network, treasuryContractId } = getStellarConfig();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-lg p-xl">
      <div>
        <h1 className="font-display text-page-title text-ink">StashCo</h1>
        <p className="text-sm text-muted-soft">
          Network: {network} · Contract: {treasuryContractId || 'not deployed yet'}
        </p>
      </div>

      {restoring ? (
        <p className="text-sm text-muted-soft">Checking wallet…</p>
      ) : (
        <>
          <ConnectWalletButton />
          {!isInstalled ? (
            <p className="text-sm text-muted-soft">
              No Freighter detected —{' '}
              <a className="underline" href="https://www.freighter.app" target="_blank" rel="noreferrer">
                install the extension
              </a>
              .
            </p>
          ) : null}
          {session ? <p className="text-sm text-ink">Signed in as {session.address}</p> : null}

          {isConnected ? (
            <div className="flex flex-col gap-lg">
              <PositionPanel />
              <DepositForm />
            </div>
          ) : (
            <p className="text-sm text-muted-soft">Connect a wallet to see the treasury position.</p>
          )}
        </>
      )}
    </main>
  );
}
