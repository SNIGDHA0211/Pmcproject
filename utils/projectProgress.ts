import { unwrapList } from '../services/api';

export type ProjectProgressChartPoint = {
  month: string;
  monthlyPlanned: number;
  monthlyActual: number;
  planned: number;
  actual: number;
  cumulativePlanned: number;
  cumulativeActual: number;
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

export function mapProjectProgressToChartPoints(
  rows: ProgressRow[],
  projectName?: string
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
        item.progress_month ?? item.progressMonth ?? item.month ?? item.month_year ?? ''
      );
      const date = progressMonth ? new Date(progressMonth) : null;
      const monthLabel =
        date && !Number.isNaN(date.getTime())
          ? date.toLocaleString('en-US', { month: 'short', year: '2-digit' })
          : progressMonth || '—';

      const monthlyPlanned =
        Number(item.monthly_plan ?? item.monthlyPlan ?? item.monthly_planned ?? item.monthly_plan_pct) || 0;
      const monthlyActual =
        Number(item.monthly_actual ?? item.monthlyActual ?? item.monthly_actual_progress) || 0;
      const cumulativePlanned =
        Number(item.cumulative_plan ?? item.cumulativePlan ?? item.planned_progress ?? item.planned) || 0;
      const cumulativeActual =
        Number(item.cumulative_actual ?? item.cumulativeActual ?? item.actual_progress ?? item.actual) || 0;

      const sortKey = date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;

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
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey: _ignored, ...row }) => row);
}
