import type { FinancialDataSnapshot } from '../types/financialManagementCache';

export interface FinancialExecutiveMetrics {
  contractValue: number;
  budget: number;
  actualCost: number;
  physicalProgressPct: number;
  financialProgressPct: number;
  pendingInvoice: number;
  costVariance: number | null;
  scheduleVariance: number | null;
  earnedValue: number;
  plannedValue: number;
  cpi: number | null;
  spi: number | null;
}

function parseNum(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function formatFinancialAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

/** EVM cost variance (CV) = BCWP − ACWP. Prefer API value when sane vs budget scale. */
function normalizeCostVariance(
  cvRaw: unknown,
  derivedCv: number,
  budget: number
): number | null {
  const hasApiCv = cvRaw !== undefined && cvRaw !== '' && cvRaw !== null;
  const apiCv = hasApiCv ? parseNum(cvRaw) : null;

  const pick = (value: number): number | null =>
    Number.isFinite(value) ? value : null;

  if (budget <= 0) {
    return pick(derivedCv) ?? (apiCv != null ? apiCv : null);
  }

  const isOutlier = (value: number) => Math.abs(value) > budget * 2.5;

  if (apiCv != null && !isOutlier(apiCv)) {
    return apiCv;
  }

  if (!isOutlier(derivedCv)) {
    return derivedCv;
  }

  if (apiCv != null && Math.abs(apiCv) <= Math.abs(derivedCv)) {
    return apiCv;
  }

  return derivedCv;
}

export function formatCostVarianceDisplay(variance: number | null): string {
  if (variance == null || !Number.isFinite(variance)) return '—';
  const sign = variance > 0 ? '+' : variance < 0 ? '' : '';
  return `${sign}${formatFinancialAmount(variance)}`;
}

export function formatIndexValue(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

export function deriveFinancialExecutiveMetrics(
  snapshot: Pick<
    FinancialDataSnapshot,
    'progressForm' | 'costForm' | 'budgetForm' | 'invoicingForms' | 'contractValuesForms'
  >
): FinancialExecutiveMetrics {
  const progress = snapshot.progressForm ?? {};
  const cost = snapshot.costForm ?? {};
  const budget = snapshot.budgetForm ?? {};

  const contractValue =
    parseNum(snapshot.contractValuesForms.SCL?.revisedContractValue) +
    parseNum(snapshot.contractValuesForms.Contractor?.revisedContractValue);

  const bac = parseNum(budget.bac) || parseNum(cost.bac);
  const acwp = parseNum(budget.acwp) || parseNum(cost.acwp);
  const bcwp = parseNum(budget.bcwp) || parseNum(cost.bcwp);
  const bcws = parseNum(cost.bcws);

  const physicalProgressPct =
    parseNum(progress.cumulative_actual) || parseNum(progress.monthly_actual);

  const financialProgressPct = bac > 0 ? Math.min(100, (bcwp / bac) * 100) : 0;

  const pendingInvoice =
    parseNum(snapshot.invoicingForms.PMC?.netDue) +
    parseNum(snapshot.invoicingForms.Contractor?.netDue);

  const cvRaw = cost.cv ?? budget.cv;
  const svRaw = cost.sv ?? budget.sv;
  const derivedCostVariance = bcwp - acwp;
  let costVariance = normalizeCostVariance(cvRaw, derivedCostVariance, bac);
  const scheduleVariance =
    svRaw !== undefined && svRaw !== '' && svRaw !== null ? parseNum(svRaw) : bcwp - bcws;

  const cpiRaw = cost.cpi ?? budget.cpi;
  const spiRaw = cost.spi;
  const cpi =
    cpiRaw !== undefined && cpiRaw !== '' && cpiRaw !== null
      ? parseNum(cpiRaw)
      : acwp > 0
        ? bcwp / acwp
        : null;
  const spi =
    spiRaw !== undefined && spiRaw !== '' && spiRaw !== null
      ? parseNum(spiRaw)
      : bcws > 0
        ? bcwp / bcws
        : null;

  return {
    contractValue,
    budget: bac,
    actualCost: acwp,
    physicalProgressPct,
    financialProgressPct,
    pendingInvoice,
    costVariance: Number.isFinite(costVariance) ? costVariance : null,
    scheduleVariance: Number.isFinite(scheduleVariance) ? scheduleVariance : null,
    earnedValue: bcwp,
    plannedValue: bcws,
    cpi: cpi != null && Number.isFinite(cpi) ? cpi : null,
    spi: spi != null && Number.isFinite(spi) ? spi : null,
  };
}

export function planActualVariance(plan: number, actual: number): number {
  return actual - plan;
}
