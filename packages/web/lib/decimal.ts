/**
 * Decimal <-> integer-unit conversion for i128 contract amounts (7 decimals, per
 * docs/CONTRACT_SPEC.md). Never round-trips through `Number`/`parseFloat` — float64 cannot
 * represent every 7-decimal value exactly, so string/BigInt math is the only safe path.
 */
const DECIMALS = 7;

/** Parses a user-entered decimal string (e.g. "12.5") into integer contract units. */
export function parseDecimalToUnits(input: string, decimals = DECIMALS): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Enter a valid amount, e.g. 10 or 10.5');
  }

  const [whole, fraction = ''] = trimmed.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Enter at most ${decimals} decimal places`);
  }

  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0');
  if (units <= 0n) {
    throw new Error('Enter an amount greater than zero');
  }
  return units;
}

/** Formats integer contract units back into a decimal string for display. */
export function formatUnitsToDecimal(units: bigint | string, decimals = DECIMALS): string {
  const value = typeof units === 'bigint' ? units : BigInt(units);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  const fraction = (abs % divisor).toString().padStart(decimals, '0').replace(/0+$/, '');
  const formatted = fraction.length > 0 ? `${whole}.${fraction}` : whole.toString();
  return negative ? `-${formatted}` : formatted;
}
