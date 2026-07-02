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
import { findContractorDashboardRow } from './contractorFinancialRecords';

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
): ContractValueRecord {
  return {
    projectName,
    contractType: 'Contractor',
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
): InvoicingRecord {
  return {
    projectName,
    invoiceType: 'Contractor',
    grossBilled: parseApiAmount(summary.gross_billed),
    netBilledWithoutVAT: parseApiAmount(summary.gross_certified_billed),
    netCollected: parseApiAmount(summary.difference),
    collectionPercentage: parseApiAmount(summary.certification_efficiency),
  };
}

function emptyContractorContractValue(
  projectName: string,
  contractorLabel: string,
  contractorId?: number,
): ContractValueRecord {
  return {
    projectName,
    contractType: 'Contractor',
    contractorName: contractorLabel,
    contractorId,
    originalContractValue: 0,
    approvedVO: 0,
    revisedContractValue: 0,
    potentialPendingVO: 0,
    growthPercentage: 0,
    approvedVOPercentage: 0,
  };
}

function emptyContractorInvoicing(
  projectName: string,
  contractorLabel: string,
  contractorId?: number,
): InvoicingRecord {
  return {
    projectName,
    invoiceType: 'Contractor',
    contractorName: contractorLabel,
    contractorId,
    grossBilled: 0,
    netBilledWithoutVAT: 0,
    netCollected: 0,
    collectionPercentage: 0,
    netDue: 0,
  };
}

export function resolveCmContractValuesPanel(
  contractValues: import('../types/contractorManagement').ContractValuesDashboard,
  selectedContractorMasterId: number | null,
  contractorDisplayName: string,
  selectedMaster?: { id: number; contractor_name: string } | null,
  selectedContractorValueOverride?: ContractValueApiRecord | null,
) {
  const sclCv = contractValues.scl ? mapContractValueApiRecord(contractValues.scl) : null;
  const contractorSummaryCv = mapContractValueSummary(
    contractValues.project_name,
    contractValues.contractor_summary,
  );
  const master =
    selectedMaster ??
    (selectedContractorMasterId
      ? { id: selectedContractorMasterId, contractor_name: contractorDisplayName }
      : null);

  let selectedContractorCv: ContractValueRecord;
  if (selectedContractorValueOverride) {
    selectedContractorCv = mapContractValueApiRecord(
      selectedContractorValueOverride,
      master?.contractor_name ?? contractorDisplayName,
    );
  } else {
    const selectedRow = findContractorDashboardRow(contractValues.contractors, master);
    selectedContractorCv = selectedRow
      ? mapContractValueApiRecord(selectedRow.contract_values, selectedRow.contractor_name)
      : master
        ? emptyContractorContractValue(
          contractValues.project_name,
          master.contractor_name,
          master.id,
        )
        : emptyContractorContractValue(contractValues.project_name, contractorDisplayName);
  }

  return {
    sclCv,
    contractorSummaryCv,
    selectedContractorCv,
    contractorLabel: master?.contractor_name ?? contractorDisplayName,
  };
}

export function resolveCmInvoicingPanel(
  invoicing: import('../types/contractorManagement').InvoicingDashboard,
  selectedContractorMasterId: number | null,
  contractorDisplayName: string,
  selectedMaster?: { id: number; contractor_name: string } | null,
  selectedContractorInvoicingOverride?: InvoicingApiRecord | null,
) {
  const sclInv = invoicing.scl ? mapInvoicingApiRecord(invoicing.scl) : null;
  const contractorSummaryInv = mapInvoicingSummary(
    invoicing.project_name,
    invoicing.contractor_summary,
  );
  const master =
    selectedMaster ??
    (selectedContractorMasterId
      ? { id: selectedContractorMasterId, contractor_name: contractorDisplayName }
      : null);

  let selectedContractorInv: InvoicingRecord;
  if (selectedContractorInvoicingOverride) {
    selectedContractorInv = mapInvoicingApiRecord(
      selectedContractorInvoicingOverride,
      master?.contractor_name ?? contractorDisplayName,
    );
  } else {
    const selectedRow = findContractorDashboardRow(invoicing.contractors, master);
    selectedContractorInv = selectedRow
      ? mapInvoicingApiRecord(selectedRow.invoicing, selectedRow.contractor_name)
      : master
        ? emptyContractorInvoicing(invoicing.project_name, master.contractor_name, master.id)
        : emptyContractorInvoicing(invoicing.project_name, contractorDisplayName);
  }

  return {
    sclInv,
    contractorSummaryInv,
    selectedContractorInv,
    contractorLabel: master?.contractor_name ?? contractorDisplayName,
  };
}
