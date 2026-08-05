import { unwrapList } from '../services/api';

export type ProjectProgressChartPoint = {
  month: string;
  monthlyPlanned: number;
  monthlyActual: number;
  /** Cumulative planned % (alias of cumulativePlanned) */
  planned: number;
  /** Cumulative actual % (alias of cumulativeActual) */
  actual: number;
  cumulativePlanned: number;
  cumulativeActual: number;
  /** Cumulative planned − cumulative actual */
  difference: number;
  /** Epoch ms for chronological sort / phase detection */
  sortKey: number;
  /** Raw API progress_month (YYYY-MM-DD) when available */
  progressMonth?: string;
};

export type ExecutiveProgressCurvePoint = {
  month: string;
  planned: number;
  actual: number;
  monthlyPlanned: number;
  monthlyActual: number;
  /** Cumulative planned − cumulative actual (%). Positive = behind plan. */
  difference: number;
};

/** Cumulative planned − cumulative actual (percentage points). */
export function progressCumulativeDifference(
  cumulativePlanned: number,
  cumulativeActual: number,
): number {
  const planned = Number(cumulativePlanned);
  const actual = Number(cumulativeActual);
  if (!Number.isFinite(planned) || !Number.isFinite(actual)) return 0;
  return Math.round((planned - actual) * 10) / 10;
}

export function formatProgressDifferencePct(diff: number): string {
  if (!Number.isFinite(diff)) return '—';
  const rounded = Math.round(diff * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)}%`;
}

/** Client-facing meaning of planned − actual. */
export function progressDifferenceStatus(diff: number): 'on_plan' | 'behind' | 'ahead' {
  if (!Number.isFinite(diff) || Math.abs(diff) < 0.05) return 'on_plan';
  return diff > 0 ? 'behind' : 'ahead';
}

export function progressDifferenceStatusLabel(diff: number): string {
  const status = progressDifferenceStatus(diff);
  if (status === 'on_plan') return 'On plan';
  if (status === 'behind') return 'Behind plan';
  return 'Ahead of plan';
}

type ProgressRow = Record<string, unknown>;

/** Extract progress rows from list, paginated, or single-record API payloads. */
export function unwrapProjectProgressList(data: unknown): ProgressRow[] {
  const list = unwrapList<ProgressRow>(data);
  if (list.length > 0) return list;

  if (!data || typeof data !== 'object') return [];
  const obj = data as ProgressRow;

  if (obj.progress_month ?? obj.progressMonth) {
    return [obj];
  }

  for (const key of ['progress_records', 'records', 'entries', 'history', 'months', 'items']) {
    const nested = obj[key];
    if (Array.isArray(nested) && nested.length > 0) {
      return nested as ProgressRow[];
    }
  }

  if (obj.data && typeof obj.data === 'object') {
    return unwrapProjectProgressList(obj.data);
  }

  return [];
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Parse backend progress_month into a reliable sort timestamp. */
export function parseProgressMonthSortKey(raw: string): number {
  const value = String(raw ?? '').trim();
  if (!value) return 0;

  // ISO / YYYY-MM / YYYY-MM-DD
  const iso = value.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const d = Number(iso[3] ?? 1);
    const dt = new Date(y, m, d);
    return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
  }

  // "Jan-26" / "Jan-2026" (progress_month_display)
  const dashYr = value.match(/^([A-Za-z]{3,9})-(\d{2,4})$/);
  if (dashYr) {
    const yearRaw = Number(dashYr[2]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const dt = new Date(`${dashYr[1]} 1, ${year}`);
    return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
  }

  // "Jun 24" / "Jun 2024" / "June 2024"
  const monYr = value.match(/^([A-Za-z]{3,9})\s+(\d{2,4})$/);
  if (monYr) {
    const yearRaw = Number(monYr[2]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const dt = new Date(`${monYr[1]} 1, ${year}`);
    return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
}

function formatProgressMonthLabel(
  progressMonth: string,
  display: string,
  sortKey: number,
): string {
  const fromApi = String(display ?? '').trim();
  if (fromApi) return fromApi;

  if (sortKey > 0) {
    return new Date(sortKey).toLocaleString('en-US', { month: 'short', year: '2-digit' });
  }
  return String(progressMonth || '—').trim() || '—';
}

/**
 * Map API month rows → chart points.
 * Plots only saved rows from the backend — does not invent missing months or filler zeros.
 */
export function mapProjectProgressToChartPoints(
  rows: ProgressRow[],
  projectName?: string,
): ProjectProgressChartPoint[] {
  const normalizedName = projectName?.trim().toLowerCase();

  const filtered = normalizedName
    ? rows.filter((item) => {
        const pn = String(item.project_name ?? item.projectName ?? item.project ?? '')
          .trim()
          .toLowerCase();
        return !pn || pn === normalizedName;
      })
    : rows;

  return filtered
    .map((item) => {
      const progressMonth = String(
        item.progress_month ?? item.progressMonth ?? item.month ?? item.month_year ?? '',
      );
      const display = String(
        item.progress_month_display ?? item.progressMonthDisplay ?? '',
      );
      const sortKey =
        parseProgressMonthSortKey(progressMonth) || parseProgressMonthSortKey(display);
      const monthLabel = formatProgressMonthLabel(progressMonth, display, sortKey);

      const monthlyPlanned = clampPct(
        Number(item.monthly_plan ?? item.monthlyPlan ?? item.monthly_planned ?? item.monthly_plan_pct) ||
          0,
      );
      const monthlyActual = clampPct(
        Number(item.monthly_actual ?? item.monthlyActual ?? item.monthly_actual_progress) || 0,
      );
      const cumulativePlanned = clampPct(
        Number(item.cumulative_plan ?? item.cumulativePlan ?? item.planned_progress ?? item.planned) ||
          0,
      );
      const cumulativeActual = clampPct(
        Number(item.cumulative_actual ?? item.cumulativeActual ?? item.actual_progress ?? item.actual) ||
          0,
      );

      return {
        month: monthLabel,
        monthlyPlanned,
        monthlyActual,
        planned: cumulativePlanned,
        actual: cumulativeActual,
        cumulativePlanned,
        cumulativeActual,
        difference: progressCumulativeDifference(cumulativePlanned, cumulativeActual),
        sortKey,
        progressMonth: progressMonth || undefined,
      };
    })
    .filter((point) => point.sortKey > 0 || point.month !== '—')
    .sort((a, b) => a.sortKey - b.sortKey || a.month.localeCompare(b.month));
}

/** Latest saved month point (by progress_month), or null when API returned no rows. */
export function getLatestProjectProgressPoint(
  points: ProjectProgressChartPoint[],
): ProjectProgressChartPoint | null {
  if (!points.length) return null;
  return [...points].sort((a, b) => a.sortKey - b.sortKey).at(-1) ?? null;
}

/**
 * Latest continuous cumulative phase (after a big reset), for Overview summary.
 * A drop of ≥35pp on cumulative actual (or planned) starts a new phase.
 */
export function sliceLatestProgressPhase(
  points: ProjectProgressChartPoint[],
): ProjectProgressChartPoint[] {
  if (points.length <= 1) return points;
  const sorted = [...points].sort((a, b) => a.sortKey - b.sortKey);
  let phaseStart = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const actualDrop = prev.cumulativeActual - curr.cumulativeActual;
    const planDrop = prev.cumulativePlanned - curr.cumulativePlanned;
    if (actualDrop >= 35 || planDrop >= 35) {
      phaseStart = i;
    }
  }
  return sorted.slice(phaseStart);
}

/**
 * Overview / executive Progress Curve from the same project-progress rows
 * used by Physical Progress Status.
 * By default keeps full saved history (no invented months). Set latestPhaseOnly
 * only when you intentionally want the post-reset segment.
 */
export function buildExecutiveProgressCurveData(
  points: ProjectProgressChartPoint[],
  maxPoints = 36,
  options?: { latestPhaseOnly?: boolean },
): ExecutiveProgressCurvePoint[] {
  const source = options?.latestPhaseOnly
    ? sliceLatestProgressPhase(points)
    : [...points].sort((a, b) => a.sortKey - b.sortKey || a.month.localeCompare(b.month));

  const sampled = source.length <= maxPoints ? source : source.slice(-maxPoints);

  return sampled.map((p) => {
    const planned = p.cumulativePlanned;
    const actual = p.cumulativeActual;
    return {
      month: p.month,
      planned,
      actual,
      monthlyPlanned: p.monthlyPlanned,
      monthlyActual: p.monthlyActual,
      difference: progressCumulativeDifference(planned, actual),
    };
  });
}
