'use client';

import { Button } from '@/components/ui/button';
import { useWallet } from '@/providers/wallet-provider';
import { useMe, useSignIn, useSignOut } from '@/services/auth';

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/**
 * Connect Freighter, then sign the nonce to open an API session. Two steps on purpose:
 * connecting is local to the extension, signing in is what the backend trusts.
 */
export function ConnectWalletButton() {
  const { isConnected, address, network, connecting, error, connect, disconnect } = useWallet();
  const { data: session } = useMe();
  const signIn = useSignIn();
  const signOut = useSignOut();

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-start gap-xs">
        <Button type="button" onClick={connect} disabled={connecting}>
          {connecting ? 'Connecting…' : 'Connect Freighter'}
        </Button>
        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-sm">
      <code className="text-sm text-ink" title={address}>
        {truncate(address)}
      </code>
      {network ? <span className="text-xs text-muted-soft">{network}</span> : null}
      {session ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            signOut.mutate();
            disconnect();
          }}
        >
          Sign out
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => signIn.mutate()} disabled={signIn.isPending}>
          {signIn.isPending ? 'Signing…' : 'Sign in'}
        </Button>
      )}
    </div>
  );
}
