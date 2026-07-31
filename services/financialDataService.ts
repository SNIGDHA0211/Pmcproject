import type { PlannedEarnedPartyFormValues } from '../components/PlannedEarnedValueFormSection';
import type { FinancialDataSnapshot } from '../types/financialManagementCache';
import type { ContractValueType, InvoiceType } from '../types';
import {
  budgetPerformanceApi,
  contractPerformanceApi,
  contractValuesApi,
  costPerformanceApi,
  invoicingApi,
  normalizeContractPerformanceRecord,
  normalizeContractValueRecord,
  normalizeInvoicingRecord,
  normalizePlannedEarnedByPeriod,
  plannedEarnedValueApi,
  projectProgressApi,
  unwrapList,
  getApiErrorMessage,
} from './api';
import {
  unwrapProjectProgressList,
  mapProjectProgressToChartPoints,
  type ProjectProgressChartPoint,
} from '../utils/projectProgress';
import {
  mapBudgetPerformanceToForm,
  mapCostPerformanceToForm,
  mapProjectProgressToForm,
  pickCostPerformanceRecord,
  pickProjectProgressRecord,
  pickBudgetPerformanceRecord,
  formatFinancialMonthYear,
} from '../utils/financialPeriod';

const CONTRACT_VALUE_TYPES: ContractValueType[] = ['SCL', 'Contractor'];
const INVOICE_TYPES: InvoiceType[] = ['PMC', 'Contractor'];
const emptyPevPartyForm = (): PlannedEarnedPartyFormValues => ({
  planned_value: '',
  earned_value: '',
});

const getErrorMessage = (error: unknown): string => {
  const err = error as { response?: { data?: unknown }; message?: string };
  const data = err?.response?.data;

  if (typeof data === 'string') {
    if (data.includes('<!DOCTYPE html>') || data.includes('<html')) {
      return 'Internal server error. Please try again later.';
    }
    return 'Server error occurred';
  }

  if (data && typeof data === 'object' && 'detail' in data && typeof (data as { detail: unknown }).detail === 'string') {
    return (data as { detail: string }).detail;
  }

  if (typeof data === 'object' && data !== null) {
    return Object.entries(data)
      .map(([field, messages]) => {
        const msgStr = Array.isArray(messages) ? messages.join(', ') : String(messages);
        return `${field}: ${msgStr}`;
      })
      .join(' | ');
  }

  return err?.message || 'Something went wrong. Please try again.';
};

export type FetchFinancialDataParams = {
  projectName: string;
  month: number;
  year: number;
  roleForSubmission: string;
};

export async function fetchFinancialDataSnapshot({
  projectName,
  month,
  year,
  roleForSubmission,
}: FetchFinancialDataParams): Promise<FinancialDataSnapshot> {
  const roleParam = { role: roleForSubmission };

  // Independent GETs run in parallel to cut financial-tab waterfall latency.
  const [
    progSettled,
    pevSettled,
    cpSettled,
    costSettled,
    bpSettled,
    invoicingResults,
    contractResults,
  ] = await Promise.all([
    projectProgressApi
      .getProjectProgress({ project_name: projectName, ...roleParam })
      .then((value) => ({ status: 'fulfilled' as const, value }))
      .catch((reason) => ({ status: 'rejected' as const, reason })),
    plannedEarnedValueApi
      .getByProjectMonthYear(projectName, month, year)
      .then((value) => ({ status: 'fulfilled' as const, value }))
      .catch((reason) => ({ status: 'rejected' as const, reason })),
    contractPerformanceApi
      .getContractPerformance({ project_name: projectName, ...roleParam })
      .then((value) => ({ status: 'fulfilled' as const, value }))
      .catch((reason) => ({ status: 'rejected' as const, reason })),
    costPerformanceApi
      .getCostPerformance({
        project_name: projectName,
        month_year: formatFinancialMonthYear(month, year),
        ...roleParam,
      })
      .then((value) => ({ status: 'fulfilled' as const, value }))
      .catch((reason) => ({ status: 'rejected' as const, reason })),
    budgetPerformanceApi
      .getBudgetPerformance({ project_name: projectName, ...roleParam })
      .then((value) => ({ status: 'fulfilled' as const, value }))
      .catch((reason) => ({ status: 'rejected' as const, reason })),
    Promise.allSettled(
      INVOICE_TYPES.map((invoiceType) => invoicingApi.getInvoicing({ projectName, invoiceType }))
    ),
    Promise.allSettled(
      CONTRACT_VALUE_TYPES.map((contractType) =>
        contractValuesApi.getContractValues({ projectName, contractType })
      )
    ),
  ]);

  let progressForm = mapProjectProgressToForm(null, month, year);
  if (progSettled.status === 'fulfilled') {
    const progressRows = unwrapProjectProgressList(progSettled.value.data);
    const progressRow = pickProjectProgressRecord(progressRows, month, year);
    progressForm = mapProjectProgressToForm(
      progressRow as Record<string, unknown> | null,
      month,
      year
    );
  }

  let pevForms: FinancialDataSnapshot['pevForms'] = {
    SCL: emptyPevPartyForm(),
    CONTRACTOR: emptyPevPartyForm(),
  };
  let pevErrors: FinancialDataSnapshot['pevErrors'] = { SCL: null, CONTRACTOR: null };

  if (pevSettled.status === 'fulfilled') {
    const period = normalizePlannedEarnedByPeriod(pevSettled.value.data, projectName);
    pevForms = {
      SCL: {
        planned_value: period.scl?.plannedValue ?? '',
        earned_value: period.scl?.earnedValue ?? '',
      },
      CONTRACTOR: {
        planned_value: period.contractor?.plannedValue ?? '',
        earned_value: period.contractor?.earnedValue ?? '',
      },
    };
  } else {
    const status = (pevSettled.reason as { response?: { status?: number } })?.response?.status;
    if (status !== 404) {
      const message = getErrorMessage(pevSettled.reason);
      pevErrors = { SCL: message, CONTRACTOR: message };
    }
  }

  let contractForm: FinancialDataSnapshot['contractForm'] = null;
  let contractFormError: string | null = null;
  if (cpSettled.status === 'fulfilled') {
    const cpRow = unwrapList<Record<string, unknown>>(cpSettled.value.data)[0];
    contractForm = cpRow ? normalizeContractPerformanceRecord(cpRow) : null;
  } else {
    contractFormError = getErrorMessage(cpSettled.reason);
  }

  let costRows: Record<string, unknown>[] = [];
  if (costSettled.status === 'fulfilled') {
    costRows = unwrapList<Record<string, unknown>>(costSettled.value.data);
  }
  if (costRows.length === 0) {
    try {
      const fallbackRes = await costPerformanceApi.getCostPerformance({ project_name: projectName });
      costRows = unwrapList<Record<string, unknown>>(fallbackRes.data);
    } catch {
      // keep empty — form maps to blanks
    }
  }
  const costRow = pickCostPerformanceRecord(costRows, month, year);
  const costForm = mapCostPerformanceToForm(costRow, month, year);

  const budgetRows =
    bpSettled.status === 'fulfilled'
      ? unwrapList<Record<string, unknown>>(bpSettled.value.data)
      : [];
  const budgetRow = pickBudgetPerformanceRecord(budgetRows, month, year);
  const budgetForm = mapBudgetPerformanceToForm(budgetRow, month, year);

  const invoicingForms = { PMC: null, Contractor: null } as FinancialDataSnapshot['invoicingForms'];
  const invoicingErrors = { PMC: null, Contractor: null } as FinancialDataSnapshot['invoicingErrors'];
  invoicingResults.forEach((result, index) => {
    const invoiceType = INVOICE_TYPES[index];
    if (result.status === 'fulfilled') {
      const row = unwrapList<Record<string, unknown>>(result.value.data)[0];
      invoicingForms[invoiceType] = row
        ? normalizeInvoicingRecord(row, projectName, invoiceType)
        : null;
    } else {
      invoicingErrors[invoiceType] = getErrorMessage(result.reason);
    }
  });

  const contractValuesForms = { SCL: null, Contractor: null } as FinancialDataSnapshot['contractValuesForms'];
  const contractValuesErrors = { SCL: null, Contractor: null } as FinancialDataSnapshot['contractValuesErrors'];
  contractResults.forEach((result, index) => {
    const contractType = CONTRACT_VALUE_TYPES[index];
    if (result.status === 'fulfilled') {
      const row = unwrapList<Record<string, unknown>>(result.value.data)[0];
      contractValuesForms[contractType] = row
        ? normalizeContractValueRecord(row, projectName, contractType)
        : null;
    } else {
      contractValuesErrors[contractType] = getErrorMessage(result.reason);
    }
  });

  return {
    progressForm,
    pevForms,
    pevErrors,
    contractForm,
    contractFormError,
    costForm,
    budgetForm,
    invoicingForms,
    invoicingErrors,
    contractValuesForms,
    contractValuesErrors,
  };
}

export async function fetchProjectProgressTrend(
  projectName: string,
  roleForSubmission: string
): Promise<
  Array<{
    month: string;
    monthlyPlanned: number;
    monthlyActual: number;
    cumulativePlanned: number;
    cumulativeActual: number;
  }>
> {
  const chart = await fetchProjectProgressChart(projectName, roleForSubmission);
  return chart.map(({ month, monthlyPlanned, monthlyActual, cumulativePlanned, cumulativeActual }) => ({
    month,
    monthlyPlanned,
    monthlyActual,
    cumulativePlanned,
    cumulativeActual,
  }));
}

/** Load S-curve points for a project; retries without role and alternate query keys when needed. */
export async function fetchProjectProgressChart(
  projectName: string,
  role?: string
): Promise<ProjectProgressChartPoint[]> {
  const attempts: Array<Record<string, string>> = [];

  if (role?.trim()) {
    attempts.push({ project_name: projectName, role: role.trim() });
  }
  attempts.push({ project_name: projectName });
  attempts.push({ project: projectName });

  for (const params of attempts) {
    try {
      const response = await projectProgressApi.getProjectProgress(params);
      const rows = unwrapProjectProgressList(response.data);
      const chart = mapProjectProgressToChartPoints(rows, projectName);
      if (chart.length > 0) return chart;
    } catch (error) {
      console.warn('Project progress fetch attempt failed:', params, getApiErrorMessage(error));
    }
  }

  return [];
}
