import type {
  BgEntryApi,
  ContractValueApiRecord,
  ContractValuesContractorSummary,
  InvoicingApiRecord,
  InvoicingContractorSummary,
  ProjectDatesApiRecord,
} from '../types/contractorManagement';
import type { ContractValueRecord, InvoicingRecord } from '../types';
import type { ProjectDatesRecord } from '../services/api';
import type { BGEntry, BgEntryStatus } from '../types/bgStatus';
import { parseApiAmount } from '../components/contractor/enterpriseTheme';

function normalizeBgEntryStatus(status: string): BgEntryStatus {
  const raw = status.toUpperCase();
  if (raw === 'UPDATED') return 'UPDATED';
  if (raw === 'NOT_UPDATED') return 'NOT_UPDATED';
  return 'YET_TO_UPDATE';
}

export function mapBgEntryApiToBgEntry(api: BgEntryApi): BGEntry {
  return {
    id: api.id,
    bg_type: api.bg_type,
    bg_name: api.bg_name,
    due_date: api.due_date?.trim() ?? '',
    updated_date: api.updated_date?.trim() ? api.updated_date : null,
    status: normalizeBgEntryStatus(api.status),
    remarks: api.remarks ?? '',
    contractor_name: api.contractor_name,
  };
}

export function mapBgEntriesApi(entries: BgEntryApi[]): BGEntry[] {
  return entries.map(mapBgEntryApiToBgEntry);
}

/** Match contractor BG rows to a schedule row (by name when API provides it). */
export function filterContractorBgEntries(
  entries: BgEntryApi[],
  contractorName?: string | null,
): BGEntry[] {
  if (!contractorName?.trim()) return mapBgEntriesApi(entries);
  const name = contractorName.trim().toLowerCase();
  return entries
    .filter((entry) => {
      const bgName = entry.contractor_name?.trim().toLowerCase();
      return !bgName || bgName === name;
    })
    .map(mapBgEntryApiToBgEntry);
}

export function mapProjectDatesApiRecord(record: ProjectDatesApiRecord): ProjectDatesRecord {
  return {
    id: record.id,
    project_name: record.project_name,
    date_type: record.date_type,
    contractor_name: record.contractor_name ?? undefined,
    project_start: record.project_start,
    contract_finish: record.contract_finish,
    forecast_finish: record.forecast_finish,
    eot_date: record.eot_date,
    elapsed_duration: record.elapsed_duration,
    remaining_duration: record.remaining_duration,
    forecast_finish_duration: record.forecast_finish_duration ?? 0,
    eot_duration: record.eot_duration ?? 0,
    delay_days: record.delay_days,
    eot_delay_days: record.eot_delay_days ?? 0,
    current_delay: record.current_delay ?? record.delay_days,
  };
}

export function mapContractValueApiRecord(
  api: ContractValueApiRecord,
  contractorName?: string,
): ContractValueRecord {
  return {
    id: api.id,
    projectName: api.project_name,
    contractType: api.contract_type === 'SCL' ? 'SCL' : 'Contractor',
    contractorName: contractorName ?? api.contractor_name ?? undefined,
    originalContractValue: parseApiAmount(api.original_contract_value),
    approvedVO: parseApiAmount(api.excess_value),
    revisedContractValue: parseApiAmount(api.revised_value),
    potentialPendingVO: parseApiAmount(api.saving),
    growthPercentage: parseApiAmount(api.increase_percentage),
    approvedVOPercentage: parseApiAmount(api.increase_percentage),
  };
}

export function mapContractValueSummary(
  projectName: string,
  summary: ContractValuesContractorSummary,
  contractorLabel?: string,
): ContractValueRecord {
  return {
    projectName,
    contractType: 'Contractor',
    contractorName: contractorLabel,
    originalContractValue: parseApiAmount(summary.original_contract_value),
    approvedVO: parseApiAmount(summary.excess_value),
    revisedContractValue: parseApiAmount(summary.revised_value),
    potentialPendingVO: parseApiAmount(summary.saving),
    growthPercentage: parseApiAmount(summary.increase_percentage),
    approvedVOPercentage: parseApiAmount(summary.increase_percentage),
  };
}

export function mapInvoicingApiRecord(
  api: InvoicingApiRecord,
  contractorName?: string,
): InvoicingRecord {
  return {
    id: api.id,
    projectName: api.project_name,
    invoiceType: api.invoice_type === 'SCL' ? 'PMC' : 'Contractor',
    contractorName: contractorName ?? api.contractor_name ?? undefined,
    grossBilled: parseApiAmount(api.gross_billed),
    netBilledWithoutVAT: parseApiAmount(api.gross_certified_billed),
    netCollected: parseApiAmount(api.difference),
    collectionPercentage: parseApiAmount(api.certification_efficiency),
  };
}

export function mapInvoicingSummary(
  projectName: string,
  summary: InvoicingContractorSummary,
  contractorLabel?: string,
): InvoicingRecord {
  return {
    projectName,
    invoiceType: 'Contractor',
    contractorName: contractorLabel,
    grossBilled: parseApiAmount(summary.gross_billed),
    netBilledWithoutVAT: parseApiAmount(summary.gross_certified_billed),
    netCollected: parseApiAmount(summary.difference),
    collectionPercentage: parseApiAmount(summary.certification_efficiency),
  };
}
