import { useEffect, useMemo, useState } from 'react';
import type { ContractPerformanceRecord } from '../types';
import {
  budgetPerformanceApi,
  cashflowApi,
  contractPerformanceApi,
  getApiErrorMessage,
  normalizeContractPerformanceRecord,
  normalizePlannedEarnedByPeriod,
  plannedEarnedValueApi,
  toNum,
  unwrapList,
  type PlannedEarnedByPeriodResponse,
} from '../services/api';
import { fetchCostPerformanceChart } from '../utils/costPerformance';
import { plannedVsActualApi } from '../services/plannedVsActualApi';
import { pvaBundleToPlannedEarnedPeriod } from '../utils/pvaDashboardAdapter';
import { emptyCashflowRecord, type CashFlowRecord } from '../types/billing';
import { buildCashflowChartData, summarizeCashflow } from '../utils/billingDashboardAnalytics';

const BILLING_ROLE = 'Billing Site Engineer';

type CostPerformancePoint = {
  month: string;
  bcws: number;
  bcwp: number;
  acwp: number;
  fcst: number;
};

function pickBestRow<T>(rows: T[], score: (row: T) => number): T | null {
  if (!rows || rows.length === 0) return null;
  let best = rows[0];
  let bestScore = score(best);
  for (let i = 1; i < rows.length; i++) {
    const s = score(rows[i]);
    if (s > bestScore) {
      best = rows[i];
      bestScore = s;
    }
  }
  return best;
}

function normalizeCashflowRecord(row: unknown): CashFlowRecord {
  const r = row as Record<string, unknown>;
  const base = emptyCashflowRecord(String(r.project_name ?? r.projectName ?? ''));
  return {
    ...base,
    id: r.id as number | undefined,
    month_year: String(r.month_year ?? r.monthYear ?? base.month_year),
    cash_in_monthly_plan: toNum(r.cash_in_monthly_plan ?? r.cashInMonthlyPlan),
    cash_in_monthly_actual: toNum(r.cash_in_monthly_actual ?? r.cashInMonthlyActual),
    cash_out_monthly_plan: toNum(r.cash_out_monthly_plan ?? r.cashOutMonthlyPlan),
    cash_out_monthly_actual: toNum(r.cash_out_monthly_actual ?? r.cashOutMonthlyActual),
    actual_cost_monthly: toNum(r.actual_cost_monthly ?? r.actualCostMonthly),
  };
}

export function useBillingFinanceDashboardData(projectName: string | null, refreshKey = 0) {
  const periodMonth = new Date().getMonth() + 1;
  const periodYear = new Date().getFullYear();

  const [costPerformanceData, setCostPerformanceData] = useState<CostPerformancePoint[]>([]);
  const [isLoadingCostPerformance, setIsLoadingCostPerformance] = useState(false);

  const [budgetPerformanceData, setBudgetPerformanceData] = useState<Record<string, unknown> | null>(null);
  const [isLoadingBudgetPerformance, setIsLoadingBudgetPerformance] = useState(false);

  const [contractPerformanceData, setContractPerformanceData] = useState<ContractPerformanceRecord | null>(null);
  const [isLoadingContractPerformance, setIsLoadingContractPerformance] = useState(false);
  const [contractPerformanceError, setContractPerformanceError] = useState<string | null>(null);

  const [plannedEarnedByPeriod, setPlannedEarnedByPeriod] = useState<PlannedEarnedByPeriodResponse | null>(null);
  const [isLoadingPlannedEarned, setIsLoadingPlannedEarned] = useState(false);
  const [plannedEarnedError, setPlannedEarnedError] = useState<string | null>(null);

  const [cashflowRecords, setCashflowRecords] = useState<CashFlowRecord[]>([]);
  const [isLoadingCashflow, setIsLoadingCashflow] = useState(false);

  useEffect(() => {
    if (!projectName) {
      setCostPerformanceData([]);
      return;
    }

    let cancelled = false;
    setIsLoadingCostPerformance(true);
    fetchCostPerformanceChart(projectName, BILLING_ROLE)
      .then((chart) => {
        if (cancelled) return;
        setCostPerformanceData(
          chart.map((item) => ({
            month: item.month,
            bcws: item.bcws,
            bcwp: item.bcwp,
            acwp: item.acwp,
            fcst: item.fcst,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setCostPerformanceData([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCostPerformance(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectName, refreshKey]);

  useEffect(() => {
    if (!projectName) {
      setBudgetPerformanceData(null);
      return;
    }

    let cancelled = false;
    setIsLoadingBudgetPerformance(true);
    budgetPerformanceApi
      .getBudgetPerformance({ project_name: projectName })
      .then((response) => {
        if (cancelled) return;
        const rows = unwrapList<Record<string, unknown>>(response.data);
        if (rows.length > 0) {
          const best = pickBestRow(rows, (r) =>
            toNum(r?.bac) + toNum(r?.eac) + toNum(r?.etg) + Math.abs(toNum(r?.vac)) + Math.abs(toNum(r?.cv)),
          );
          setBudgetPerformanceData(best);
        } else {
          setBudgetPerformanceData(null);
        }
      })
      .catch(() => {
        if (!cancelled) setBudgetPerformanceData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingBudgetPerformance(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectName, refreshKey]);

  useEffect(() => {
    if (!projectName) {
      setContractPerformanceData(null);
      setContractPerformanceError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingContractPerformance(true);
    setContractPerformanceError(null);
    contractPerformanceApi
      .getContractPerformance({ project_name: projectName, role: BILLING_ROLE })
      .then((response) => {
        if (cancelled) return;
        const rows = unwrapList<Record<string, unknown>>(response.data);
        if (rows.length > 0) {
          const latest = pickBestRow(rows, (r) =>
            toNum(r?.billedValue ?? r?.billed_value) + toNum(r?.actualReceiptValue ?? r?.actual_receipt_value),
          );
          setContractPerformanceData(normalizeContractPerformanceRecord(latest));
        } else {
          setContractPerformanceData(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setContractPerformanceData(null);
          setContractPerformanceError(getApiErrorMessage(error, 'Unable to load contract performance'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingContractPerformance(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectName, refreshKey]);

  useEffect(() => {
    if (!projectName) {
      setPlannedEarnedByPeriod(null);
      setPlannedEarnedError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingPlannedEarned(true);
    setPlannedEarnedError(null);

    const load = async () => {
      try {
        try {
          const bundle = await plannedVsActualApi.getByProject(projectName, {
            month: periodMonth,
            year: periodYear,
          });
          if (!cancelled) setPlannedEarnedByPeriod(pvaBundleToPlannedEarnedPeriod(bundle));
          return;
        } catch (pvaError) {
          const pvaStatus = (pvaError as { response?: { status?: number } })?.response?.status;
          if (pvaStatus && pvaStatus !== 404) throw pvaError;
        }

        const response = await plannedEarnedValueApi.getByProjectMonthYear(
          projectName,
          periodMonth,
          periodYear,
        );
        if (!cancelled) {
          setPlannedEarnedByPeriod(normalizePlannedEarnedByPeriod(response.data, projectName));
        }
      } catch (error) {
        if (cancelled) return;
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setPlannedEarnedByPeriod({
            projectName,
            month: periodMonth,
            year: periodYear,
            scl: null,
            contractor: null,
          });
        } else {
          setPlannedEarnedByPeriod(null);
          setPlannedEarnedError(getApiErrorMessage(error, 'Unable to load Planned vs Actual Value'));
        }
      } finally {
        if (!cancelled) setIsLoadingPlannedEarned(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectName, periodMonth, periodYear, refreshKey]);

  useEffect(() => {
    if (!projectName) {
      setCashflowRecords([]);
      return;
    }

    let cancelled = false;
    setIsLoadingCashflow(true);
    cashflowApi
      .getCashflow({ project_name: projectName })
      .then((response) => {
        if (cancelled) return;
        setCashflowRecords(unwrapList<unknown>(response.data).map(normalizeCashflowRecord));
      })
      .catch(() => {
        if (!cancelled) setCashflowRecords([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCashflow(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectName, refreshKey]);

  const lastCostRow =
    costPerformanceData.length > 0 ? costPerformanceData[costPerformanceData.length - 1] : null;

  const bcwp = toNum(lastCostRow?.bcwp);
  const ac = toNum(lastCostRow?.acwp);
  const costVariance = bcwp - ac;
  const cpiGaugePct = ac > 0 ? (bcwp / ac) * 100 : 0;

  const billedValue = contractPerformanceData?.billedValue ?? 0;
  const actualReceiptValue = contractPerformanceData?.actualReceiptValue ?? 0;
  const receiptVariance = contractPerformanceData?.variance ?? 0;
  const performancePercentage = contractPerformanceData?.performancePercentage ?? 0;

  const cashflowSummary = useMemo(() => summarizeCashflow(cashflowRecords), [cashflowRecords]);
  const cashflowChartData = useMemo(() => buildCashflowChartData(cashflowRecords), [cashflowRecords]);

  return {
    costPerformanceData,
    isLoadingCostPerformance,
    budgetPerformanceData,
    isLoadingBudgetPerformance,
    contractPerformanceData,
    isLoadingContractPerformance,
    contractPerformanceError,
    plannedEarnedByPeriod,
    isLoadingPlannedEarned,
    plannedEarnedError,
    cashflowRecords,
    cashflowSummary,
    cashflowChartData,
    isLoadingCashflow,
    bcwp,
    ac,
    costVariance,
    cpiGaugePct,
    billedValue,
    actualReceiptValue,
    receiptVariance,
    performancePercentage,
  };
}
