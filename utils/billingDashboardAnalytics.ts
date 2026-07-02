import type { MonthlyScope } from '../types';
import type { CashFlowRecord } from '../types/billing';
import { computeQaqcScopeSummary, buildStatusChartData } from './qaqcScopeAnalytics';

export { computeQaqcScopeSummary as computeBillingScopeSummary, buildStatusChartData };

export function summarizeCashflow(records: CashFlowRecord[]) {
  let cashInActual = 0;
  let cashOutActual = 0;
  let cashInPlan = 0;
  let cashOutPlan = 0;

  for (const row of records) {
    cashInActual += Number(row.cash_in_monthly_actual) || 0;
    cashOutActual += Number(row.cash_out_monthly_actual) || 0;
    cashInPlan += Number(row.cash_in_monthly_plan) || 0;
    cashOutPlan += Number(row.cash_out_monthly_plan) || 0;
  }

  return {
    cashInActual,
    cashOutActual,
    cashInPlan,
    cashOutPlan,
    netActual: cashInActual - cashOutActual,
    recordCount: records.length,
  };
}

export function buildCashflowChartData(records: CashFlowRecord[]) {
  return [...records]
    .sort((a, b) => String(a.month_year).localeCompare(String(b.month_year)))
    .map((row) => ({
      month: row.month_year,
      cashIn: Number(row.cash_in_monthly_actual) || 0,
      cashOut: Number(row.cash_out_monthly_actual) || 0,
      net: (Number(row.cash_in_monthly_actual) || 0) - (Number(row.cash_out_monthly_actual) || 0),
    }));
}

export function scopeProjectName(scopes: MonthlyScope[]): string | null {
  if (!scopes.length) return null;
  const counts = new Map<string, number>();
  for (const scope of scopes) {
    const key = scope.project_name || `Project ${scope.project}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
