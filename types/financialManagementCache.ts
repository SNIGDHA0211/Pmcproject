import type { PlannedEarnedPartyFormValues } from '../components/PlannedEarnedValueFormSection';
import type {
  ContractPerformanceRecord,
  ContractValueRecord,
  ContractValueType,
  InvoicingRecord,
  InvoiceType,
} from '../types';

export type PevPartyLabel = 'SCL' | 'CONTRACTOR';

export interface FinancialDataSnapshot {
  progressForm: Record<string, unknown>;
  pevForms: Record<PevPartyLabel, PlannedEarnedPartyFormValues>;
  pevErrors: Record<PevPartyLabel, string | null>;
  contractForm: ContractPerformanceRecord | null;
  contractFormError: string | null;
  costForm: Record<string, unknown>;
  budgetForm: Record<string, unknown>;
  invoicingForms: Record<InvoiceType, InvoicingRecord | null>;
  invoicingErrors: Record<InvoiceType, string | null>;
  contractValuesForms: Record<ContractValueType, ContractValueRecord | null>;
  contractValuesErrors: Record<ContractValueType, string | null>;
}

export interface FinancialCacheEntry {
  month: number;
  year: number;
  snapshot: FinancialDataSnapshot;
  fetchedAt: number;
}
