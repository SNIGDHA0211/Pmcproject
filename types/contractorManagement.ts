/** Types aligned with Backend API Reference (July 2026) — do not invent fields. */

export type ContractorStatus = 'ACTIVE' | 'INACTIVE';

export interface ApiContractorRef {
  id: number;
  contractor_name: string;
}

export interface ContractorMasterRecord {
  id: number;
  project_name?: string;
  contractor_name: string;
  contractor_code?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status: ContractorStatus;
  contractor?: ApiContractorRef;
  created_at?: string;
  updated_at?: string;
}

/** Contract Values — dashboard GET /contract-values/project/{name}/ */
export interface ContractValueApiRecord {
  id: number;
  project_name: string;
  contract_type: 'SCL' | 'CONTRACTOR';
  contractor_name: string | null;
  contractor: ApiContractorRef | null;
  original_contract_value: string;
  excess_value: string;
  saving: string;
  /** Backend field: cos / Cos */
  cos: string;
  revised_value: string;
  increase_percentage: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContractValuesContractorSummary {
  original_contract_value: string;
  excess_value: string;
  saving: string;
  /** Backend field: cos / Cos */
  cos: string;
  revised_value: string;
  increase_percentage: string;
}

export interface ContractValuesContractorRow {
  id: number;
  contractor_name: string;
  contractor: ApiContractorRef;
  contract_values: ContractValueApiRecord;
}

export interface ContractValuesDashboard {
  project_name: string;
  scl: ContractValueApiRecord | null;
  contractor_summary: ContractValuesContractorSummary;
  contractors: ContractValuesContractorRow[];
}

/** Invoicing — dashboard GET /invoicing/project/{name}/ */
export interface InvoicingApiRecord {
  id: number;
  project_name: string;
  invoice_type: 'SCL' | 'CONTRACTOR';
  contractor_name: string | null;
  contractor: ApiContractorRef | null;
  gross_billed: string;
  gross_certified_billed: string;
  difference: string;
  certification_efficiency: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoicingContractorSummary {
  gross_billed: string;
  gross_certified_billed: string;
  difference: string;
  certification_efficiency: string;
}

export interface InvoicingContractorRow {
  id: number;
  contractor_name: string;
  contractor: ApiContractorRef;
  invoicing: InvoicingApiRecord;
}

export interface InvoicingDashboard {
  project_name: string;
  scl: InvoicingApiRecord | null;
  contractor_summary: InvoicingContractorSummary;
  contractors: InvoicingContractorRow[];
}

/** BG Status */
export interface BgSummaryApi {
  total_bg: number;
  updated: number;
  yet_to_update: number;
  not_updated: number;
  compliance_percentage: number;
}

export interface BgEntryApi {
  id: number;
  bg_type: 'SCL' | 'CONTRACTOR';
  bg_name: string;
  due_date: string;
  updated_date: string | null;
  status: string;
  remarks: string;
  contractor_name?: string;
}

export interface BgStatusBundleApi {
  contractor_bg: BgEntryApi[];
  scl_bg: BgEntryApi[];
  bg_summary: BgSummaryApi;
}

/** Project Dates — GET /project-dates/project/{name}/ */
export interface ProjectDatesApiRecord {
  id: number;
  project_name: string;
  date_type: 'SCL' | 'CONTRACTOR';
  contractor_name: string | null;
  contractor: ApiContractorRef | null;
  project_start: string | null;
  contract_finish: string | null;
  forecast_finish: string | null;
  eot_date: string | null;
  elapsed_duration: number;
  remaining_duration: number;
  forecast_finish_duration?: number;
  eot_duration?: number;
  delay_days: number;
  eot_delay_days?: number;
  current_delay?: number;
  bg_status?: BgStatusBundleApi;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectDatesDashboard {
  project_name: string;
  scl: ProjectDatesApiRecord | null;
  contractors: ProjectDatesApiRecord[];
  contractor_bg: BgEntryApi[];
  scl_bg: BgEntryApi[];
  bg_summary: BgSummaryApi | null;
}

export type ContractorDashboardTab =
  | 'overview'
  | 'contract_values'
  | 'invoicing'
  | 'project_dates'
  | 'bg_status'
  | 'masters';
