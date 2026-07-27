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
  /** Epoch ms for chronological sort / phase detection */
  sortKey: number;
};

export type ExecutiveProgressCurvePoint = {
  month: string;
  planned: number;
  actual: number;
  monthlyPlanned: number;
  monthlyActual: number;
};

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

function formatProgressMonthLabel(raw: string, sortKey: number): string {
  if (sortKey > 0) {
    return new Date(sortKey).toLocaleString('en-US', { month: 'short', year: '2-digit' });
  }
  return String(raw || '—').trim() || '—';
}

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
      const sortKey = parseProgressMonthSortKey(progressMonth);
      const monthLabel = formatProgressMonthLabel(progressMonth, sortKey);

      const monthlyPlanned = clampPct(
        Number(item.monthly_plan ?? item.monthlyPlan ?? item.monthly_planned ?? item.monthly_plan_pct) || 0,
      );
      const monthlyActual = clampPct(
        Number(item.monthly_actual ?? item.monthlyActual ?? item.monthly_actual_progress) || 0,
      );
      const cumulativePlanned = clampPct(
        Number(item.cumulative_plan ?? item.cumulativePlan ?? item.planned_progress ?? item.planned) || 0,
      );
      const cumulativeActual = clampPct(
        Number(item.cumulative_actual ?? item.cumulativeActual ?? item.actual_progress ?? item.actual) || 0,
      );

      return {
        month: monthLabel,
        monthlyPlanned,
        monthlyActual,
        planned: cumulativePlanned,
        actual: cumulativeActual,
        cumulativePlanned,
        cumulativeActual,
        sortKey,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey || a.month.localeCompare(b.month));
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
 * Overview Progress Curve: chronological cumulative plan vs actual
 * from the latest S-curve phase (same backend rows as Physical Progress Status).
 */
export function buildExecutiveProgressCurveData(
  points: ProjectProgressChartPoint[],
  maxPoints = 10,
): ExecutiveProgressCurvePoint[] {
  const phase = sliceLatestProgressPhase(points);
  const sampled =
    phase.length <= maxPoints
      ? phase
      : phase.slice(-maxPoints);

  return sampled.map((p) => ({
    month: p.month,
    planned: p.cumulativePlanned,
    actual: p.cumulativeActual,
    monthlyPlanned: p.monthlyPlanned,
    monthlyActual: p.monthlyActual,
  }));
}
