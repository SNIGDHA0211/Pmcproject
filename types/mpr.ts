export type MprReportStatus =
  | 'draft'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'archived';

export interface MprPerson {
  id: number;
  username: string;
  full_name: string;
}

export interface MprReportRecord {
  id: number;
  project_id: number;
  project_name: string;
  report_month: string;
  report_year: number;
  report_month_number: number;
  version: number;
  is_latest: boolean;
  status: MprReportStatus;
  generated_at: string | null;
  generation_started_at: string | null;
  generated_by: MprPerson | null;
  pdf_available: boolean;
  excel_available: boolean;
  error_message: string | null;
}

export interface MprDownloadPayload {
  url: string;
  mpr_id: number;
  format: 'pdf' | 'excel';
}

export interface MprPreviewMeta {
  cache?: 'hit' | 'miss';
}

/** Full snapshot from preview endpoint — loosely typed for nested backend sections. */
export interface MprPreviewSnapshot {
  project?: Record<string, unknown>;
  reporting_period?: {
    month?: string;
    start_date?: string;
    end_date?: string;
  };
  executive_summary?: Record<string, unknown>;
  key_indicators?: Record<string, unknown>;
  physical_progress?: Record<string, unknown>;
  time_progress?: Record<string, unknown>;
  eot?: Record<string, unknown>;
  financial_progress?: Record<string, unknown>;
  bg?: Record<string, unknown>;
  correspondence?: Record<string, unknown>;
  drawings?: Record<string, unknown>;
  bottlenecks?: Record<string, unknown>;
  quality?: Record<string, unknown>;
  hse?: Record<string, unknown>;
  manpower?: Record<string, unknown>;
  equipment?: Record<string, unknown>;
  site_photos?: Record<string, unknown>;
  meetings?: Record<string, unknown>;
  next_month_program?: Record<string, unknown>;
  materials?: Record<string, unknown>;
  laboratory_equipment?: Record<string, unknown>;
  achievements?: Record<string, unknown>;
  client_decisions?: Record<string, unknown>;
  data_availability?: Record<string, unknown>;
  validation?: Record<string, unknown>;
  report_completeness?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MprHistoryListResult {
  count: number;
  page: number;
  page_size: number;
  results: MprReportRecord[];
}
