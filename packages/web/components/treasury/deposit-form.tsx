'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { parseDecimalToUnits } from '@/lib/decimal';
import { useWallet } from '@/providers/wallet-provider';
import { useDeposit } from '@/services/treasury';

export function DepositForm() {
  const { address } = useWallet();
  const deposit = useDeposit();
  const [amount, setAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    deposit.reset();

    let units: bigint;
    try {
      units = parseDecimalToUnits(amount);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Enter a valid amount');
      return;
    }

    deposit.mutate(units, { onSuccess: () => setAmount('') });
  }

  const errorMessage = validationError ?? (deposit.error instanceof Error ? deposit.error.message : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit USDC</CardTitle>
        <CardDescription>
          Anyone connected may deposit. Depositing buys no claim on the funds — it contributes to
          the company&rsquo;s treasury, not a share you can withdraw.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!address || deposit.isPending}
          />
          <Button type="submit" disabled={!address || deposit.isPending}>
            {deposit.isPending ? 'Depositing…' : 'Deposit'}
          </Button>
          {!address ? (
            <p className="text-sm text-muted-soft">Connect a wallet to deposit.</p>
          ) : null}
          {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}
          {deposit.isSuccess ? (
            <p className="text-sm text-ink">Deposit confirmed — the position will update shortly.</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
