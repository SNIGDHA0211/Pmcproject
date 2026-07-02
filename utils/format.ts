const CRORE = 1_00_00_000;
const LAKH = 1_00_000;
const THOUSAND = 1_000;

/**
 * Compact Indian currency for dashboard KPI cards.
 * Picks the largest readable unit: Cr → L → Th (thousand) → ₹
 */
export function formatIndianCurrencyCompact(
  amount: number,
  options?: { showSign?: boolean }
): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';

  const sign = n < 0 ? '-' : options?.showSign && n > 0 ? '+' : '';
  const abs = Math.abs(n);

  if (abs >= CRORE) {
    return `${sign}₹${(abs / CRORE).toFixed(2)} Cr`;
  }
  if (abs >= LAKH) {
    return `${sign}₹${(abs / LAKH).toFixed(2)} L`;
  }
  if (abs >= THOUSAND) {
    return `${sign}₹${(abs / THOUSAND).toFixed(2)} Th`;
  }
  return `${sign}₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** Full amount for tooltips / exports */
export function formatIndianCurrencyFull(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export const formatINR = (amount: number) => formatIndianCurrencyCompact(amount);

/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function toLocalDateIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Display YYYY-MM-DD or ISO datetime date portion as en-GB date. */
export function formatIsoDateLabel(value?: string | null): string {
  if (!value) return '—';
  const iso = value.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match) {
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return value;
}
