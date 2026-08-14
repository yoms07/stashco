'use client';

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
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={connect}
          disabled={connecting}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {connecting ? 'Connecting…' : 'Connect Freighter'}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <code className="text-sm" title={address}>
        {truncate(address)}
      </code>
      {network ? <span className="text-xs opacity-60">{network}</span> : null}
      {session ? (
        <button
          type="button"
          onClick={() => {
            signOut.mutate();
            disconnect();
          }}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          Sign out
        </button>
      ) : (
        <button
          type="button"
          onClick={() => signIn.mutate()}
          disabled={signIn.isPending}
          className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {signIn.isPending ? 'Signing…' : 'Sign in'}
        </button>
      )}
    </div>
  );
}
