import type { MonthlyScope } from '../types';

export type ScheduleDelayKind = 'on_track' | 'ahead' | 'late' | 'unknown';
export type ScopeHealthKind = 'late' | 'at_risk' | 'on_track' | 'unknown';

export interface ScopeHealthDisplay {
  kind: ScopeHealthKind;
  label: string;
  emoji: string;
  varianceTooltip: string;
  compactLabel: string;
  fullTooltip: string;
}

export interface ScopeScheduleMetrics {
  actualProgressPct: number;
  expectedProgressPct: number | null;
  variancePct: number | null;
  delayLabel: string;
  delayKind: ScheduleDelayKind;
  /** Days late (positive) or ahead (negative); 0 when on track. */
  scheduleDayDelta: number;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseScopeDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

/** Title-case labels for work area and similar fields. */
export function toTitleCase(value?: string | null): string {
  if (!value?.trim()) return '';
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      if (/^\d+$/.test(word)) return word;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function personInitials(name?: string | null): string {
  if (!name?.trim()) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '').toUpperCase();
}

export function hasCreatorData(scopes: MonthlyScope[]): boolean {
  return scopes.some((scope) => Boolean(scope.created_by_name?.trim()));
}

/** Expected progress from elapsed schedule; variance = actual % − expected %. */
export function getScopeScheduleMetrics(
  scope: MonthlyScope,
  referenceDate = new Date()
): ScopeScheduleMetrics {
  const actualProgressPct = Math.min(Math.max(Number(scope.progress_percentage) || 0, 0), 100);
  const start = parseScopeDate(scope.start_date);
  const end = parseScopeDate(scope.end_date);
  const today = startOfDay(referenceDate);

  if (!start || !end || end.getTime() <= start.getTime()) {
    return {
      actualProgressPct,
      expectedProgressPct: null,
      variancePct: null,
      delayLabel: '—',
      delayKind: 'unknown',
      scheduleDayDelta: 0,
    };
  }

  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = Math.min(Math.max(today.getTime() - start.getTime(), 0), totalMs);
  const expectedProgressPct = (elapsedMs / totalMs) * 100;
  const variancePct = actualProgressPct - expectedProgressPct;

  const dayMs = 86_400_000;
  const impliedElapsedMs = (actualProgressPct / 100) * totalMs;
  const dayDelta = Math.round((impliedElapsedMs - elapsedMs) / dayMs);

  if (scope.status === 'completed' || actualProgressPct >= 99) {
    return {
      actualProgressPct,
      expectedProgressPct,
      variancePct,
      delayLabel: 'On Track',
      delayKind: 'on_track',
      scheduleDayDelta: 0,
    };
  }

  const varianceDays = Math.round((Math.abs(variancePct) / 100) * (totalMs / dayMs));

  if (Math.abs(variancePct) <= 5 && Math.abs(dayDelta) <= 1) {
    return {
      actualProgressPct,
      expectedProgressPct,
      variancePct,
      delayLabel: 'On Track',
      delayKind: 'on_track',
      scheduleDayDelta: 0,
    };
  }

  if (variancePct > 5 || dayDelta >= 2) {
    const days = Math.max(dayDelta, varianceDays, 1);
    return {
      actualProgressPct,
      expectedProgressPct,
      variancePct,
      delayLabel: `${days} Day${days === 1 ? '' : 's'} Ahead`,
      delayKind: 'ahead',
      scheduleDayDelta: -days,
    };
  }

  if (variancePct < -5 || dayDelta <= -2) {
    const days = Math.max(Math.abs(dayDelta), varianceDays, 1);
    return {
      actualProgressPct,
      expectedProgressPct,
      variancePct,
      delayLabel: `${days} Day${days === 1 ? '' : 's'} Late`,
      delayKind: 'late',
      scheduleDayDelta: days,
    };
  }

  return {
    actualProgressPct,
    expectedProgressPct,
    variancePct,
    delayLabel: 'On Track',
    delayKind: 'on_track',
    scheduleDayDelta: 0,
  };
}

export function countDelayedScopes(scopes: MonthlyScope[], referenceDate = new Date()): number {
  return scopes.filter((scope) => getScopeScheduleMetrics(scope, referenceDate).delayKind === 'late').length;
}

export function formatVarianceTooltip(variancePct: number | null): string {
  if (variancePct == null || !Number.isFinite(variancePct)) {
    return 'Variance: schedule data unavailable';
  }
  const rounded = Math.round(variancePct);
  const sign = rounded > 0 ? '+' : '';
  return `Variance: ${sign}${rounded}% (actual progress vs planned schedule)`;
}

function buildHealthTooltip(metrics: ScopeScheduleMetrics): string {
  const parts = [metrics.delayLabel, formatVarianceTooltip(metrics.variancePct)];
  if (metrics.expectedProgressPct != null) {
    parts.push(`Planned progress: ${Math.round(metrics.expectedProgressPct)}%`);
  }
  parts.push(`Actual progress: ${Math.round(metrics.actualProgressPct)}%`);
  return parts.filter(Boolean).join(' · ');
}

/** Executive health: late, at risk, or on track — compact label + full tooltip. */
export function getScopeHealth(metrics: ScopeScheduleMetrics): ScopeHealthDisplay {
  const varianceTooltip = formatVarianceTooltip(metrics.variancePct);
  const fullTooltip = buildHealthTooltip(metrics);

  if (metrics.delayKind === 'unknown') {
    return {
      kind: 'unknown',
      label: '—',
      emoji: '⚪',
      varianceTooltip,
      compactLabel: '—',
      fullTooltip,
    };
  }

  if (metrics.delayKind === 'late') {
    const days = Math.max(metrics.scheduleDayDelta, 1);
    return {
      kind: 'late',
      label: metrics.delayLabel,
      emoji: '🔴',
      varianceTooltip,
      compactLabel: `${days}D`,
      fullTooltip,
    };
  }

  const variance = metrics.variancePct ?? 0;
  if (variance < -2 && variance > -15) {
    const days = Math.max(
      metrics.scheduleDayDelta > 0 ? metrics.scheduleDayDelta : 0,
      Math.round(Math.abs(variance) / 3),
      1
    );
    return {
      kind: 'at_risk',
      label: 'At Risk',
      emoji: '🟡',
      varianceTooltip,
      compactLabel: `${days}D`,
      fullTooltip: `At Risk · ${fullTooltip}`,
    };
  }

  if (metrics.delayKind === 'ahead') {
    const days = Math.abs(metrics.scheduleDayDelta);
    return {
      kind: 'on_track',
      label: metrics.delayLabel,
      emoji: '🟢',
      varianceTooltip,
      compactLabel: days >= 2 ? `+${days}D` : 'On Track',
      fullTooltip,
    };
  }

  return {
    kind: 'on_track',
    label: 'On Track',
    emoji: '🟢',
    varianceTooltip,
    compactLabel: 'On Track',
    fullTooltip,
  };
}

export function progressBarTone(
  pct: number,
  isDarkTheme: boolean
): { bar: string; text: string } {
  if (pct <= 40) {
    return {
      bar: isDarkTheme ? 'bg-rose-500' : 'bg-[#EF4444]',
      text: isDarkTheme ? 'text-rose-400' : 'text-[#DC2626]',
    };
  }
  if (pct <= 70) {
    return {
      bar: isDarkTheme ? 'bg-amber-500' : 'bg-[#F59E0B]',
      text: isDarkTheme ? 'text-amber-400' : 'text-[#D97706]',
    };
  }
  return {
    bar: isDarkTheme ? 'bg-emerald-500' : 'bg-[#22C55E]',
    text: isDarkTheme ? 'text-emerald-400' : 'text-[#16A34A]',
  };
}
