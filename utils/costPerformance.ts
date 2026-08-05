import { unwrapList, toNum, costPerformanceApi, getApiErrorMessage } from '../services/api';

/** Row shape from GET /api/cost-performance/ (paginated results). */
export type CostPerformanceRecord = {
  id?: number | string;
  project_name?: string;
  month_year: string;
  bcws: number;
  bcwp: number;
  acwp: number;
  fcst?: number;
  bac?: number;
  eac?: number;
  cv?: number;
  sv?: number;
  cpi?: number;
  vac?: number;
  etg?: number;
  over_budget_cost?: boolean;
  behind_schedule?: boolean;
  created_at?: string;
  updated_at?: string;
};

/** Chart / Financial Progress point — one saved month only (no fillers). */
export type CostPerformanceChartPoint = {
  month: string;
  monthYear: string;
  bcws: number;
  bcwp: number;
  acwp: number;
  fcst: number;
  bac: number;
  eac: number;
  cv: number;
  sv: number;
  cpi: number;
  vac: number;
  overBudgetCost: boolean;
  behindSchedule: boolean;
  sortKey: number;
};

export type CostPerformanceQueryParams = {
  project_name?: string;
  /** Legacy / form resolve — not required for S-curve list */
  month_year?: string;
  role?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
};

type CostRow = Record<string, unknown>;

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/** Parse API month_year (e.g. Jan-2026, Jan-26, 2026-01) into sort timestamp. */
export function parseCostMonthYearSortKey(raw: string): number {
  const value = String(raw ?? '').trim();
  if (!value) return 0;

  // Jan-2026 / January-2026 / Jan-26
  const monYr = value.match(/^([A-Za-z]{3,9})[-\s]+(\d{2,4})$/);
  if (monYr) {
    const monthIdx = MONTH_INDEX[monYr[1].toLowerCase()];
    if (monthIdx != null) {
      const yearRaw = Number(monYr[2]);
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
      return new Date(year, monthIdx, 1).getTime();
    }
  }

  // 2026-01 / 2026-01-01
  const iso = value.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3] ?? 1)).getTime();
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
}

/** Extract rows from list or PageNumberPagination { count, next, results }. */
export function unwrapCostPerformanceList(data: unknown): CostRow[] {
  const list = unwrapList<CostRow>(data);
  if (list.length > 0) return list;

  if (!data || typeof data !== 'object') return [];
  const obj = data as CostRow;
  if (obj.month_year ?? obj.monthYear ?? obj.bcws != null) return [obj];
  return [];
}

/**
 * Map API rows → chart points.
 * Plots only saved months from the backend — does not invent missing months.
 */
export function mapCostPerformanceToChartPoints(
  rows: CostRow[],
  projectName?: string,
): CostPerformanceChartPoint[] {
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
      const monthYear = String(item.month_year ?? item.monthYear ?? item.month ?? '').trim();
      const sortKey = parseCostMonthYearSortKey(monthYear);
      const bcws = toNum(item.bcws ?? item.BCWS);
      const bcwp = toNum(item.bcwp ?? item.BCWP);
      const acwp = toNum(item.acwp ?? item.ACWP ?? item.ac);
      const fcst = toNum(item.fcst ?? item.FCST ?? item.forecast);
      const bac = toNum(item.bac ?? item.BAC);
      const eac = toNum(item.eac ?? item.EAC);
      const cv = toNum(item.cv ?? item.CV);
      const sv = toNum(item.sv ?? item.SV);
      const cpi = toNum(item.cpi ?? item.CPI);
      const vac = toNum(item.vac ?? item.VAC);

      return {
        month: monthYear || '—',
        monthYear,
        bcws,
        bcwp,
        acwp,
        fcst,
        bac,
        eac,
        cv,
        sv,
        cpi,
        vac,
        overBudgetCost: Boolean(item.over_budget_cost ?? item.overBudgetCost),
        behindSchedule: Boolean(item.behind_schedule ?? item.behindSchedule),
        sortKey,
      };
    })
    .filter((p) => p.monthYear || p.sortKey > 0)
    .sort((a, b) => a.sortKey - b.sortKey || a.month.localeCompare(b.month));
}

export function getLatestCostPerformancePoint(
  points: CostPerformanceChartPoint[],
): CostPerformanceChartPoint | null {
  if (!points.length) return null;
  return [...points].sort((a, b) => a.sortKey - b.sortKey).at(-1) ?? null;
}

/**
 * Load all saved cost-performance months for a project (follows pagination).
 * Default API returns all stored months — no current-month cutoff, no fillers.
 */
export async function fetchCostPerformanceChart(
  projectName: string,
  role?: string,
): Promise<CostPerformanceChartPoint[]> {
  const base: CostPerformanceQueryParams = { project_name: projectName, page_size: 100 };
  if (role?.trim()) base.role = role.trim();

  const attempts: CostPerformanceQueryParams[] = [];
  if (role?.trim()) attempts.push({ ...base });
  attempts.push({ project_name: projectName, page_size: 100 });

  for (const params of attempts) {
    try {
      const rows = await fetchAllCostPerformanceRows(params);
      const chart = mapCostPerformanceToChartPoints(rows, projectName);
      if (chart.length > 0) return chart;
    } catch (error) {
      console.warn('Cost performance fetch attempt failed:', params, getApiErrorMessage(error));
    }
  }

  return [];
}

async function fetchAllCostPerformanceRows(
  params: CostPerformanceQueryParams,
): Promise<CostRow[]> {
  const collected: CostRow[] = [];
  let page = 1;
  let guard = 0;

  while (guard < 40) {
    guard += 1;
    const response = await costPerformanceApi.getCostPerformance({
      ...params,
      page,
      page_size: params.page_size ?? 100,
    });
    const body = response.data as Record<string, unknown> | unknown[];
    const rows = unwrapCostPerformanceList(body);
    collected.push(...rows);

    const next =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as { next?: string | null }).next
        : null;

    if (!next || rows.length === 0) break;
    page += 1;
  }

  return collected;
}
