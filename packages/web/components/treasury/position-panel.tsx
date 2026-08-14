'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUnitsToDecimal } from '@/lib/decimal';
import { useTreasuryPosition } from '@/services/treasury';

// docs/DESIGN.md `card-dark` is a scarce single emphasis moment — the treasury balance is its
// intended home. Do not reuse this treatment elsewhere on the page.
export function PositionPanel() {
  const { data, isLoading, isError } = useTreasuryPosition();

  return (
    <Card variant="dark">
      <CardHeader>
        <CardTitle className="text-eyebrow uppercase tracking-wide text-on-dark/70">
          Treasury position
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-12 w-48 bg-on-dark/10" />
        ) : isError ? (
          <p className="text-sm text-on-dark/70">Could not read the treasury position.</p>
        ) : (
          <p className="font-display text-page-title text-on-dark">
            {formatUnitsToDecimal(data?.balanceUnits ?? '0')} <span className="text-xl">USDC</span>
          </p>
        )}
        <p className="mt-sm text-sm text-on-dark/70">
          Supplied to Blend for yield. Grows on its own as interest accrues.
        </p>
      </CardContent>
    </Card>
  );
}
