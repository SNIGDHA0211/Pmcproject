import { MONTH_OPTIONS } from './healthSafety';

const monthAbbrev = (month: number) =>
  MONTH_OPTIONS.find((item) => item.value === month)?.label.slice(0, 3) ?? `M${month}`;

/** Cost / manpower style key, e.g. Jun-2026 */
export function formatFinancialMonthYear(month: number, year: number): string {
  return `${monthAbbrev(month)}-${year}`;
}

/** Project progress API date, e.g. 2026-06-01 */
export function formatProgressMonthDate(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function progressRecordMatchesPeriod(
  progressMonth: string | undefined,
  month: number,
  year: number
): boolean {
  if (!progressMonth?.trim()) return false;
  const parsed = new Date(progressMonth);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getMonth() + 1 === month && parsed.getFullYear() === year;
  }
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return progressMonth.startsWith(prefix);
}

export function costRecordMatchesPeriod(monthYear: string | undefined, month: number, year: number): boolean {
  if (!monthYear?.trim()) return false;
  const normalized = monthYear.trim();
  const target = formatFinancialMonthYear(month, year).toLowerCase();
  if (normalized.toLowerCase() === target) return true;

  const isoPrefix = `${year}-${String(month).padStart(2, '0')}`;
  if (normalized.startsWith(isoPrefix)) return true;

  const slashMatch = /^(\d{1,2})[-/](\d{4})$/.exec(normalized);
  if (slashMatch) {
    const [, monthPart, yearPart] = slashMatch;
    return Number(monthPart) === month && Number(yearPart) === year;
  }

  const parsed = new Date(`1-${normalized.replace(/\s+/g, '-')}`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getMonth() + 1 === month && parsed.getFullYear() === year;
  }

  return false;
}

export function pickProjectProgressRecord<T extends { progress_month?: string; progressMonth?: string }>(
  rows: T[],
  month: number,
  year: number
): T | null {
  return rows.find((row) => progressRecordMatchesPeriod(row.progress_month ?? row.progressMonth, month, year)) ?? null;
}

export function pickCostPerformanceRecord<T extends { month_year?: string; monthYear?: string }>(
  rows: T[],
  month: number,
  year: number
): T | null {
  const matches = rows.filter((row) =>
    costRecordMatchesPeriod(row.month_year ?? row.monthYear, month, year)
  );
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  return matches
    .slice()
    .sort((a, b) => {
      const aUpdated = getRecordUpdatedAtMs(a as Record<string, unknown>);
      const bUpdated = getRecordUpdatedAtMs(b as Record<string, unknown>);
      return bUpdated - aUpdated;
    })[0];
}

function getRecordUpdatedAtMs(row: Record<string, unknown>): number {
  const raw = row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt;
  if (!raw) return 0;
  const parsed = new Date(String(raw));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function emptyProgressForm(month: number, year: number): Record<string, string> {
  return {
    progress_month: formatProgressMonthDate(month, year),
    monthly_plan: '',
    cumulative_plan: '',
    monthly_actual: '',
    cumulative_actual: '',
  };
}

export function emptyCostForm(month: number, year: number): Record<string, string> {
  return {
    month_year: formatFinancialMonthYear(month, year),
    bcws: '',
    bcwp: '',
    acwp: '',
    fcst: '',
    bac: '',
  };
}

export function emptyBudgetForm(month: number, year: number): Record<string, string | number> {
  return {
    month_year: formatFinancialMonthYear(month, year),
    bac: '',
    bcwp: '',
    acwp: '',
  };
}

/** Resolve primary key from common API shapes. */
export function extractRecordId(row: unknown): string | number | undefined {
  if (!row || typeof row !== 'object') return undefined;
  const record = row as Record<string, unknown>;
  const id = record.id ?? record.pk ?? record.record_id ?? record.recordId;
  if (id === null || id === undefined || id === '') return undefined;
  return id as string | number;
}

export function budgetRecordMatchesPeriod(
  monthYear: string | undefined,
  month: number,
  year: number
): boolean {
  return costRecordMatchesPeriod(monthYear, month, year);
}

export function pickBudgetPerformanceRecord<T extends { month_year?: string; monthYear?: string }>(
  rows: T[],
  month: number,
  year: number
): T | null {
  const match = rows.find((row) => budgetRecordMatchesPeriod(row.month_year ?? row.monthYear, month, year));
  return match ?? rows[0] ?? null;
}

export function mapProjectProgressToForm(
  row: Record<string, unknown> | null,
  month: number,
  year: number
): Record<string, unknown> {
  if (!row) return emptyProgressForm(month, year);
  return {
    id: extractRecordId(row),
    progress_month: String(row.progress_month ?? row.progressMonth ?? formatProgressMonthDate(month, year)),
    monthly_plan: row.monthly_plan ?? row.monthlyPlan ?? row.monthly_planned ?? '',
    cumulative_plan: row.cumulative_plan ?? row.cumulativePlan ?? row.cumulative_planned ?? '',
    monthly_actual: row.monthly_actual ?? row.monthlyActual ?? row.monthly_actual_progress ?? '',
    cumulative_actual: row.cumulative_actual ?? row.cumulativeActual ?? row.actual_progress ?? '',
  };
}

export function mapCostPerformanceToForm(
  row: Record<string, unknown> | null,
  month: number,
  year: number
): Record<string, unknown> {
  if (!row) return emptyCostForm(month, year);
  return {
    id: extractRecordId(row),
    month_year: String(row.month_year ?? row.monthYear ?? formatFinancialMonthYear(month, year)),
    bcws: row.bcws ?? row.BCWS ?? '',
    bcwp: row.bcwp ?? row.BCWP ?? '',
    acwp: row.acwp ?? row.ACWP ?? row.ac ?? '',
    fcst: row.fcst ?? row.FCST ?? row.forecast ?? '',
    bac: row.bac ?? row.BAC ?? '',
    cpi: row.cpi,
    eac: row.eac,
    etg: row.etg,
    vac: row.vac,
    cv: row.cv,
  };
}

export function mapBudgetPerformanceToForm(
  row: Record<string, unknown> | null,
  month: number,
  year: number
): Record<string, unknown> {
  if (!row) return emptyBudgetForm(month, year);
  return {
    id: extractRecordId(row),
    month_year: String(row.month_year ?? row.monthYear ?? formatFinancialMonthYear(month, year)),
    bac: row.bac ?? row.BAC ?? '',
    bcwp: row.bcwp ?? row.BCWP ?? '',
    acwp: row.acwp ?? row.ACWP ?? row.ac ?? '',
    cpi: row.cpi,
    eac: row.eac,
    etg: row.etg,
    vac: row.vac,
    cv: row.cv,
  };
}
