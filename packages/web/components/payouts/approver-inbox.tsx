'use client';

import { useState } from 'react';

import type { Payout } from '@stellar-ambassador/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUnitsToDecimal } from '@/lib/decimal';
import { useWallet } from '@/providers/wallet-provider';
import { useApprovePayout, useIsApprover, usePendingPayouts, useRejectPayout } from '@/services/payouts';

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

interface PendingPayoutRowProps {
  payout: Payout;
}

/**
 * One queued request. Approve and reject share a disabled state while either is in flight, so
 * a slow signature can't double-submit the other action against the same request.
 */
function PendingPayoutRow({ payout }: PendingPayoutRowProps) {
  const approvePayout = useApprovePayout();
  const rejectPayout = useRejectPayout();
  const [rowError, setRowError] = useState<string | null>(null);

  const busy = approvePayout.isPending || rejectPayout.isPending;

  function handleApprove() {
    setRowError(null);
    approvePayout.mutate(
      { id: payout.id, destination: payout.destination, amountUnits: payout.amount },
      { onError: (e) => setRowError(e instanceof Error ? e.message : 'The payout could not be approved.') },
    );
  }

  function handleReject() {
    setRowError(null);
    rejectPayout.mutate(payout.id, {
      onError: (e) => setRowError(e instanceof Error ? e.message : 'The payout could not be rejected.'),
    });
  }

  return (
    <div className="flex flex-col gap-sm rounded-md border border-hairline p-md">
      <div className="flex items-start justify-between gap-md">
        <div>
          <p className="text-sm font-medium text-ink">
            {payout.vendorName ?? <span className="text-muted-soft">No vendor name</span>}
          </p>
          <p className="text-xs text-muted-soft">
            To {truncateAddress(payout.destination)} · {payout.memo || 'No memo'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-ink">{formatUnitsToDecimal(payout.amount)} USDC</p>
          <Badge variant="pending">Pending</Badge>
        </div>
      </div>

      <div className="flex gap-sm">
        <Button type="button" size="sm" disabled={busy} onClick={handleApprove}>
          {approvePayout.isPending ? 'Approving…' : 'Approve'}
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={handleReject}>
          {rejectPayout.isPending ? 'Rejecting…' : 'Reject'}
        </Button>
      </div>

      {rowError ? <p className="text-sm text-error">{rowError}</p> : null}
    </div>
  );
}

/**
 * Renders only when the connected wallet is the on-chain approver (`get_approver()`, simulated
 * live per render — D-002). The owner wallet never sees this component's contents: the
 * conditional render itself is the demo's proof that the same app grants different wallets
 * different powers.
 */
export function ApproverInbox() {
  const { address } = useWallet();
  const { isApprover, isLoading: approverCheckLoading } = useIsApprover();
  const { data: pending, isLoading: pendingLoading, isError: pendingError } = usePendingPayouts();

  if (!address || approverCheckLoading) {
    return null;
  }

  if (!isApprover) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approver inbox</CardTitle>
        <CardDescription>
          Queued payouts waiting on your signature. Approving withdraws from Blend and pays the
          vendor in one transaction; rejecting cancels the request for good.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-sm">
        {pendingLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : pendingError ? (
          <p className="text-sm text-error">Could not load pending payouts. Try again shortly.</p>
        ) : !pending || pending.length === 0 ? (
          <p className="text-sm text-muted-soft">Nothing waiting on approval right now.</p>
        ) : (
          pending.map((payout) => <PendingPayoutRow key={payout.id} payout={payout} />)
        )}
      </CardContent>
    </Card>
  );
}
