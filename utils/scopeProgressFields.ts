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
