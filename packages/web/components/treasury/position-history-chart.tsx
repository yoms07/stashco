'use client';

import type { PositionSnapshot } from '@stashco/shared';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUnitsToDecimal } from '@/lib/decimal';
import { getStellarConfig } from '@/lib/stellar';
import { useTreasuryHistory } from '@/services/treasury';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING = { top: 16, right: 16, bottom: 16, left: 16 };
/** Domain headroom above the highest value (principal or position) so the line never touches
 * the top edge. Anchoring the floor at 0 — rather than fitting tightly to the observed
 * range — is what keeps a 100-stroop wobble reading as flat instead of a mountain range. */
const DOMAIN_HEADROOM = 1.1;

/**
 * Snapshot units are a 7-decimal i128, but every real balance here (hundreds of USDC, i.e.
 * low billions of units) sits far inside `Number.isSafeInteger` range — the conversion is
 * exact. This is only ever used for SVG pixel geometry, never compared or displayed as a
 * value; display always goes through `formatUnitsToDecimal`.
 */
function unitsToNumber(units: string): number {
  return Number(units);
}

/** `ApiClient` returns raw `fetch().json()` without running the Zod parse, so `capturedAt`
 * arrives over the wire as an ISO string even though the shared type says `Date`. */
function toTimestamp(capturedAt: PositionSnapshot['capturedAt']): number {
  return typeof capturedAt === 'string' ? new Date(capturedAt).getTime() : capturedAt.getTime();
}

interface ChartPoint {
  x: number;
  y: number;
  snapshot: PositionSnapshot;
}

interface ChartGeometry {
  points: ChartPoint[];
  principalY: number | null;
}

/** Chronological (oldest-first) points plus the principal reference line, all in SVG pixel
 * space. Kept next to its one call site rather than a shared utility — this shape is specific
 * to this chart. */
function buildGeometry(history: PositionSnapshot[], principalUnits: bigint | null): ChartGeometry {
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const chronological = [...history].sort((a, b) => toTimestamp(a.capturedAt) - toTimestamp(b.capturedAt));
  const values = chronological.map((snapshot) => unitsToNumber(snapshot.positionUsdc));
  const principalValue = principalUnits !== null ? unitsToNumber(principalUnits.toString()) : null;

  const domainMax = Math.max(...values, principalValue ?? 0, 1) * DOMAIN_HEADROOM;
  const valueToY = (value: number) => CHART_HEIGHT - PADDING.bottom - (value / domainMax) * plotHeight;

  const timestamps = chronological.map((snapshot) => toTimestamp(snapshot.capturedAt));
  const tMin = Math.min(...timestamps);
  const tMax = Math.max(...timestamps);
  const timeSpan = tMax - tMin;

  const points = chronological.map((snapshot, index) => {
    const x =
      timeSpan > 0
        ? PADDING.left + ((toTimestamp(snapshot.capturedAt) - tMin) / timeSpan) * plotWidth
        : PADDING.left + (chronological.length > 1 ? (index / (chronological.length - 1)) * plotWidth : plotWidth / 2);
    return { x, y: valueToY(unitsToNumber(snapshot.positionUsdc)), snapshot };
  });

  return {
    points,
    principalY: principalValue !== null ? valueToY(principalValue) : null,
  };
}

function formatTimestamp(capturedAt: PositionSnapshot['capturedAt']): string {
  return new Date(toTimestamp(capturedAt)).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// docs/DESIGN.md `card-dark` is already the position panel's emphasis moment — this stays on
// the default light card so the two don't compete.
export function PositionHistoryChart() {
  const { data: history, isLoading, isError } = useTreasuryHistory();
  const { treasuryPrincipalUnits } = getStellarConfig();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Position over time</CardTitle>
        <CardDescription>
          Captured snapshots of the treasury&rsquo;s Blend position, alongside the principal
          deposited. Supply yield is slow — expect this line to look nearly flat over any short
          window; that is the pool&rsquo;s real rate, not a rendering issue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Could not load the position history.</p>
        ) : !history || history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No snapshots captured yet — capture runs hourly, so check back soon.
          </p>
        ) : (
          <ChartBody history={history} principalUnits={treasuryPrincipalUnits} />
        )}
      </CardContent>
    </Card>
  );
}

function ChartBody({
  history,
  principalUnits,
}: {
  history: PositionSnapshot[];
  principalUnits: bigint | null;
}) {
  const { points, principalY } = buildGeometry(history, principalUnits);
  const oldest = points[0].snapshot;
  const newest = points[points.length - 1].snapshot;
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center gap-md text-xs text-muted-foreground">
        <span className="flex items-center gap-xxs">
          <span className="inline-block h-2 w-2 rounded-full bg-accent-green" aria-hidden />
          Captured position
        </span>
        {principalY !== null ? (
          <span className="flex items-center gap-xxs">
            <span className="inline-block h-px w-4 border-t border-dashed border-muted-soft" aria-hidden />
            Principal deposited
          </span>
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Treasury position captured over time, alongside the principal deposited"
      >
        {principalY !== null ? (
          <line
            x1={PADDING.left}
            y1={principalY}
            x2={CHART_WIDTH - PADDING.right}
            y2={principalY}
            className="stroke-muted-soft"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ) : null}

        {points.length > 1 ? (
          <polyline points={polyline} fill="none" className="stroke-accent-green" strokeWidth={2} />
        ) : null}

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} className="fill-accent-green" />
        ))}
      </svg>

      <p className="text-xs text-muted-foreground">
        {points.length === 1
          ? `Only one snapshot captured so far, at ${formatTimestamp(oldest.capturedAt)} — a trend needs more history.`
          : `${points.length} snapshots captured, ${formatTimestamp(oldest.capturedAt)} to ${formatTimestamp(newest.capturedAt)}.`}
        {principalY === null ? ' Principal deposited is not configured for this environment.' : ''}
      </p>

      <p className="text-xs text-muted-foreground">
        Principal deposited:{' '}
        {principalUnits !== null ? `${formatUnitsToDecimal(principalUnits)} USDC` : '—'} · Latest captured position:{' '}
        {formatUnitsToDecimal(newest.positionUsdc)} USDC
        {principalUnits !== null && BigInt(newest.positionUsdc) < principalUnits
          ? ' — below principal after an approved payout, not lost yield; yield keeps accruing on what remains deposited.'
          : ''}
      </p>
    </div>
  );
}
