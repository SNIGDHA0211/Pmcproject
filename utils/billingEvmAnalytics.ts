import { unwrapList } from '../services/api';
import { costPerformanceApi } from '../services/api';
import { costRecordMatchesPeriod } from './financialPeriod';

export function parseBillingNumeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = value.replace(/,/g, '').trim();
    return numeric === '' ? 0 : Number(numeric) || 0;
  }
  return 0;
}

export function formatBillingAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `₹${(value / 1e3).toFixed(1)} K`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatBillingChartAxis(value: number): string {
  if (Math.abs(value) >= 1e7) return `${(value / 1e7).toFixed(1)}Cr`;
  if (Math.abs(value) >= 1e5) return `${(value / 1e5).toFixed(0)}L`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return String(Math.round(value));
}

export interface EvmMetricBar {
  name: string;
  short: string;
  value: number;
  fill: string;
}

export function buildEvmMetricBars(
  costForm: Record<string, unknown>,
  budgetForm: Record<string, unknown>,
): EvmMetricBar[] {
  const bcws = parseBillingNumeric(costForm.bcws);
  const bcwp =
    parseBillingNumeric(costForm.bcwp) || parseBillingNumeric(budgetForm.bcwp);
  const acwp =
    parseBillingNumeric(costForm.acwp) || parseBillingNumeric(budgetForm.acwp);
  const bac =
    parseBillingNumeric(costForm.bac) || parseBillingNumeric(budgetForm.bac);

  return [
    { name: 'Budgeted Cost Scheduled', short: 'BCWS', value: bcws, fill: '#6366f1' },
    { name: 'Budgeted Cost Performed', short: 'BCWP', value: bcwp, fill: '#10b981' },
    { name: 'Actual Cost Performed', short: 'ACWP', value: acwp, fill: '#f97316' },
    { name: 'Budget at Completion', short: 'BAC', value: bac, fill: '#8b5cf6' },
  ];
}

export interface BudgetComparisonRow {
  label: string;
  planned: number;
  actual: number;
}

export function buildBudgetComparisonRows(
  budgetForm: Record<string, unknown>,
): BudgetComparisonRow[] {
  const bac = parseBillingNumeric(budgetForm.bac);
  const bcwp = parseBillingNumeric(budgetForm.bcwp);
  const acwp = parseBillingNumeric(budgetForm.acwp);

  return [
    { label: 'Earned vs Budget', planned: bac, actual: bcwp },
    { label: 'Spent vs Budget', planned: bac, actual: acwp },
    { label: 'Earned vs Spent', planned: bcwp, actual: acwp },
  ];
}

export interface EvmTrendPoint {
  month: string;
  bcws: number;
  bcwp: number;
  acwp: number;
}

export async function fetchCostPerformanceTrend(
  projectName: string,
  role?: string,
): Promise<EvmTrendPoint[]> {
  const params: Record<string, string> = { project_name: projectName };
  if (role?.trim()) params.role = role.trim();

  try {
    const res = await costPerformanceApi.getCostPerformance(params);
    const rows = unwrapList<Record<string, unknown>>(res.data);
    return rows
      .map((row) => ({
        month: String(row.month_year ?? row.monthYear ?? ''),
        bcws: parseBillingNumeric(row.bcws ?? row.BCWS),
        bcwp: parseBillingNumeric(row.bcwp ?? row.BCWP),
        acwp: parseBillingNumeric(row.acwp ?? row.ACWP ?? row.ac),
      }))
      .filter((row) => row.month)
      .sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return [];
  }
}

export function hasEvmData(bars: EvmMetricBar[]): boolean {
  return bars.some((bar) => bar.value > 0);
}

export function budgetUtilizationPct(bac: number, acwp: number): number {
  if (bac <= 0) return 0;
  return Math.min(100, (acwp / bac) * 100);
}

export function earnedValuePct(bac: number, bcwp: number): number {
  if (bac <= 0) return 0;
  return Math.min(100, (bcwp / bac) * 100);
}

export function periodHasSavedRecord(
  rows: Array<{ month_year?: string; monthYear?: string }>,
  month: number,
  year: number,
): boolean {
  return rows.some((row) =>
    costRecordMatchesPeriod(row.month_year ?? row.monthYear, month, year),
  );
}
