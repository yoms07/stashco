'use client';

import { useState } from 'react';

import type { PayoutMetaRequest } from '@stashco/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { parseDecimalToUnits } from '@/lib/decimal';
import { useWallet } from '@/providers/wallet-provider';
import {
  useIsOwner,
  usePayoutRequest,
  useRequestPayout,
  useSubmitPayoutMeta,
  type PayoutStatus,
} from '@/services/payouts';

const MEMO_MAX = 64;

const STATUS_BADGE_VARIANT: Record<PayoutStatus, 'pending' | 'success' | 'destructive'> = {
  Pending: 'pending',
  Approved: 'success',
  Rejected: 'destructive',
};

/**
 * Once the chain write lands, the request sits Pending with no control to advance it — only
 * the approver wallet (a different screen entirely, #15) can move it forward. That dead end is
 * the product working correctly, so it renders as its own confirmation state, not an error.
 */
function QueuedRequestPanel({
  requestId,
  pendingMeta,
  onQueueAnother,
}: {
  requestId: number;
  pendingMeta: PayoutMetaRequest | null;
  onQueueAnother: () => void;
}) {
  const { data: request, isLoading } = usePayoutRequest(requestId);
  const submitMeta = useSubmitPayoutMeta();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout request #{requestId} queued</CardTitle>
        <CardDescription>
          No funds moved. Only the approver wallet can execute this request — there is nothing
          more to do here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-sm">
        {isLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <Badge variant={STATUS_BADGE_VARIANT[request?.status ?? 'Pending']}>
            {request?.status ?? 'Pending'}
          </Badge>
        )}

        {pendingMeta ? (
          <div className="flex flex-col gap-xs rounded-md border border-hairline bg-surface-soft p-md">
            <p className="text-sm text-ink">
              The payout is queued on-chain, but saving the vendor name (&ldquo;{pendingMeta.vendorName}
              &rdquo;) failed. The request was not duplicated — retry just this step.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={submitMeta.isPending}
              onClick={() => submitMeta.mutate({ requestId, data: pendingMeta })}
            >
              {submitMeta.isPending ? 'Retrying…' : 'Retry saving vendor name'}
            </Button>
          </div>
        ) : null}

        <Button type="button" variant="outline" onClick={onQueueAnother}>
          Queue another payout
        </Button>
      </CardContent>
    </Card>
  );
}

export function RequestPayoutForm() {
  const { address } = useWallet();
  const { isOwner, isLoading: ownerCheckLoading, isError: ownerCheckError } = useIsOwner();
  const requestPayout = useRequestPayout();
  const submitMeta = useSubmitPayoutMeta();

  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [queuedId, setQueuedId] = useState<number | null>(null);
  const [pendingMeta, setPendingMeta] = useState<PayoutMetaRequest | null>(null);

  if (!address) {
    return <p className="text-sm text-muted-soft">Connect a wallet to request a payout.</p>;
  }

  if (ownerCheckLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (ownerCheckError) {
    return (
      <p className="text-sm text-error">
        Could not verify the connected wallet against the treasury owner. Try again shortly.
      </p>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Request a payout</CardTitle>
          <CardDescription>
            This wallet is not the treasury owner, so it cannot request payouts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (queuedId !== null) {
    return (
      <QueuedRequestPanel
        requestId={queuedId}
        pendingMeta={pendingMeta}
        onQueueAnother={() => {
          setQueuedId(null);
          setPendingMeta(null);
        }}
      />
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    requestPayout.reset();

    if (!destination.trim()) {
      setValidationError('Enter a destination address');
      return;
    }
    if (memo.length > MEMO_MAX) {
      setValidationError(`Memo must be ${MEMO_MAX} characters or fewer`);
      return;
    }
    if (!vendorName.trim()) {
      setValidationError('Enter the vendor name');
      return;
    }

    let units: bigint;
    try {
      units = parseDecimalToUnits(amount);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Enter a valid amount');
      return;
    }

    const metaInput: PayoutMetaRequest = { vendorName: vendorName.trim() };

    requestPayout.mutate(
      { destination: destination.trim(), amountUnits: units, memo },
      {
        onSuccess: (id) => {
          setQueuedId(id);
          setDestination('');
          setAmount('');
          setMemo('');
          setVendorName('');
          submitMeta.mutate(
            { requestId: id, data: metaInput },
            { onError: () => setPendingMeta(metaInput) },
          );
        },
      },
    );
  }

  const errorMessage =
    validationError ?? (requestPayout.error instanceof Error ? requestPayout.error.message : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a payout</CardTitle>
        <CardDescription>
          Signs one transaction that queues the payout on-chain. No funds move — the approver
          must execute it separately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
          <label className="flex flex-col gap-xxs text-sm text-ink">
            Destination address
            <Input
              type="text"
              placeholder="G..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={requestPayout.isPending}
            />
          </label>

          <label className="flex flex-col gap-xxs text-sm text-ink">
            Amount (USDC)
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={requestPayout.isPending}
            />
          </label>

          <label className="flex flex-col gap-xxs text-sm text-ink">
            Memo
            <Input
              type="text"
              maxLength={MEMO_MAX}
              placeholder="Invoice INV-1234"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={requestPayout.isPending}
            />
            <span className="text-xs text-muted-soft">
              {memo.length}/{MEMO_MAX}
            </span>
          </label>

          <label className="flex flex-col gap-xxs text-sm text-ink">
            Vendor name
            <Input
              type="text"
              placeholder="Acme Supplies"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              disabled={requestPayout.isPending}
            />
          </label>

          <Button type="submit" disabled={requestPayout.isPending}>
            {requestPayout.isPending ? 'Queuing…' : 'Queue payout'}
          </Button>

          {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
