import type { ContractValueRecord, InvoicingRecord } from '../types';

/** Same fields & formulas as Contract Values + Invoicing panels on the Financial tab. */
export interface ExecutiveContractSnapshot {
  originalValue: number;
  excessValue: number;
  saving: number;
  revisedValue: number;
  growthPct: number;
  grossBilled: number | null;
  grossCertified: number | null;
  billingDifference: number | null;
  certificationEfficiencyPct: number | null;
  bcwp: number;
  ac: number;
  costVariance: number;
  cpiPct: number;
  hasContractValue: boolean;
  hasInvoicing: boolean;
  hasCostData: boolean;
}

export const EXECUTIVE_CONTRACT_FORMULAS = {
  revised:
    'Revised contract value = Original + Excess value − Saving (same as Contract Values card).',
  growth:
    'Growth % = API growth_percentage, or (Revised − Original) ÷ Original × 100.',
  certification:
    'Certification efficiency = Gross certified billed ÷ Gross billed × 100.',
  difference:
    'Difference = Gross billed − Gross certified billed (uses API difference when provided).',
  cpi: 'CPI = BCWP ÷ AC (earned value ÷ actual cost). Above 1.00 means under budget.',
} as const;

function contractGrowthPct(contract: ContractValueRecord): number {
  if (contract.growthPercentage != null && Number.isFinite(contract.growthPercentage)) {
    return contract.growthPercentage;
  }
  if (contract.approvedVOPercentage != null && Number.isFinite(contract.approvedVOPercentage)) {
    return contract.approvedVOPercentage;
  }
  const original = contract.originalContractValue;
  const revised = contract.revisedContractValue;
  if (original > 0 && revised > 0) {
    return ((revised - original) / original) * 100;
  }
  return 0;
}

function computeCertificationEfficiencyPct(invoicing: InvoicingRecord): number {
  const fromApi = invoicing.collectionPercentage;
  if (fromApi != null && Number.isFinite(fromApi) && fromApi > 0) {
    return fromApi;
  }
  const gross = invoicing.grossBilled;
  const certified = invoicing.netBilledWithoutVAT;
  if (gross > 0 && certified >= 0) {
    return (certified / gross) * 100;
  }
  return 0;
}

function billingDifferenceAmount(invoicing: InvoicingRecord): number {
  if (invoicing.netCollected != null && Number.isFinite(invoicing.netCollected)) {
    return invoicing.netCollected;
  }
  return invoicing.grossBilled - invoicing.netBilledWithoutVAT;
}

export function buildExecutiveContractSnapshot(
  sclContractValue: ContractValueRecord | null,
  pmcInvoicing: InvoicingRecord | null,
  bcwp: number,
  ac: number,
  costVariance: number,
  cpiPct: number,
): ExecutiveContractSnapshot {
  const hasContractValue = Boolean(
    sclContractValue &&
      (sclContractValue.revisedContractValue > 0 ||
        sclContractValue.originalContractValue > 0),
  );

  const originalValue = sclContractValue?.originalContractValue ?? 0;
  const excessValue = sclContractValue?.approvedVO ?? 0;
  const saving = sclContractValue?.potentialPendingVO ?? 0;
  const revisedValue = sclContractValue?.revisedContractValue ?? 0;
  const growthPct = sclContractValue ? contractGrowthPct(sclContractValue) : 0;

  const hasInvoicing = Boolean(
    pmcInvoicing &&
      (pmcInvoicing.grossBilled > 0 || pmcInvoicing.netBilledWithoutVAT > 0),
  );

  const grossBilled = hasInvoicing ? pmcInvoicing!.grossBilled : null;
  const grossCertified = hasInvoicing ? pmcInvoicing!.netBilledWithoutVAT : null;
  const billingDifference = hasInvoicing ? billingDifferenceAmount(pmcInvoicing!) : null;
  const certificationEfficiencyPct = hasInvoicing
    ? computeCertificationEfficiencyPct(pmcInvoicing!)
    : null;

  return {
    originalValue,
    excessValue,
    saving,
    revisedValue,
    growthPct,
    grossBilled,
    grossCertified,
    billingDifference,
    certificationEfficiencyPct,
    bcwp,
    ac,
    costVariance,
    cpiPct,
    hasContractValue,
    hasInvoicing,
    hasCostData: bcwp > 0 || ac > 0,
  };
}
