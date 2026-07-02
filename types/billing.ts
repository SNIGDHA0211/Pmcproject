export interface CashFlowRecord {
  id?: string | number;
  project_name: string;
  month_year: string;
  cash_in_monthly_plan: number;
  cash_in_monthly_actual: number;
  cash_out_monthly_plan: number;
  cash_out_monthly_actual: number;
  actual_cost_monthly: number;
}

export const emptyCashflowRecord = (projectName: string): CashFlowRecord => ({
  project_name: projectName,
  month_year: '',
  cash_in_monthly_plan: 0,
  cash_in_monthly_actual: 0,
  cash_out_monthly_plan: 0,
  cash_out_monthly_actual: 0,
  actual_cost_monthly: 0,
});
