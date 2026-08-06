/**
 * Helpers for DPR / monthly-scope quantity fields.
 * Backend is the source of truth — do not recompute cumulative or progress on the client.
 */

export function toScopeNumber(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Prefer explicit backend progress fields; never derive from executed/planned. */
export function readScopeProgressPercent(source: unknown): number | null {
  if (!source || typeof source !== 'object') return null;
  const row = source as Record<string, unknown>;
  const raw =
    row.progress ??
    row.progress_percentage ??
    row.progressPercentage ??
    row.progress_pct;
  if (raw == null || raw === '') return null;
  const n = toScopeNumber(raw);
  return Number.isFinite(n) ? n : null;
}

export function readScopeCumulativeQuantity(source: unknown): number | null {
  if (!source || typeof source !== 'object') return null;
  const row = source as Record<string, unknown>;
  const raw =
    row.cumulative_quantity ??
    row.cumulativeQuantity ??
    row.previous_cumulative ??
    row.previousCumulative;
  if (raw == null || raw === '') return null;
  const n = toScopeNumber(raw);
  return Number.isFinite(n) ? n : null;
}

export function readScopeRemainingQuantity(source: unknown): number | null {
  if (!source || typeof source !== 'object') return null;
  const row = source as Record<string, unknown>;
  const raw = row.remaining_quantity ?? row.remainingQuantity;
  if (raw == null || raw === '') return null;
  const n = toScopeNumber(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Remaining qty for DPR validation / display.
 * Prefer planned − cumulative when the API remaining field is missing or stale
 * (e.g. remaining=0 while cumulative=0 and planned>0).
 */
export function resolveScopeRemainingQuantity(
  source: unknown,
  plannedOverride?: number,
  cumulativeOverride?: number,
): number {
  const planned =
    plannedOverride ??
    (source && typeof source === 'object' ? readScopePlannedQuantity(source) : 0);
  const cumulative =
    cumulativeOverride ??
    (source && typeof source === 'object'
      ? readScopeCumulativeQuantity(source) ?? 0
      : 0);
  const derived = Math.max(0, planned - cumulative);
  const api = source && typeof source === 'object' ? readScopeRemainingQuantity(source) : null;

  if (api == null) return derived;
  if (api <= 0 && derived > 0) return derived;
  return api;
}

export function readScopeExecutedQuantity(source: unknown): number {
  if (!source || typeof source !== 'object') return 0;
  const row = source as Record<string, unknown>;
  return toScopeNumber(row.executed_quantity ?? row.executedQuantity);
}

export function readScopePlannedQuantity(source: unknown): number {
  if (!source || typeof source !== 'object') return 0;
  const row = source as Record<string, unknown>;
  return toScopeNumber(row.planned_quantity ?? row.plannedQuantity);
}

/**
 * Quantity shown in progress cells as "X / planned".
 * Prefer cumulative_quantity (total done). Fall back to executed_quantity.
 * If both are 0/missing but progress% is set, derive X from progress×planned for display
 * so the fraction matches the percentage bar.
 */
export function readScopeCompletedQuantity(source: unknown): number {
  const cumulative = readScopeCumulativeQuantity(source);
  if (cumulative != null && cumulative > 0) return cumulative;

  const executed = readScopeExecutedQuantity(source);
  if (executed > 0) return executed;

  const progress = readScopeProgressPercent(source);
  const planned = readScopePlannedQuantity(source);
  if (progress != null && progress > 0 && planned > 0) {
    return Math.round((progress / 100) * planned * 100) / 100;
  }

  return cumulative ?? executed;
}

export function formatScopeQty(value: unknown, unit?: string | null): string {
  const n = toScopeNumber(value);
  const qty =
    Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9
      ? String(Math.round(n))
      : n.toFixed(2).replace(/\.?0+$/, '');
  const u = String(unit ?? '').trim();
  return u ? `${qty} ${u}` : qty;
}

export function formatScopeProgressFraction(source: unknown): string {
  const completed = readScopeCompletedQuantity(source);
  const planned = readScopePlannedQuantity(source);
  const unit =
    source && typeof source === 'object'
      ? String((source as { unit?: unknown }).unit ?? '').trim()
      : '';
  const left = formatScopeQty(completed);
  const right = formatScopeQty(planned, unit || undefined);
  return `${left} / ${right}`;
}
