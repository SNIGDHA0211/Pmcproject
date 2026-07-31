export type MeetingDocumentType = 'MOM' | 'EDL';

export interface MeetingDocumentRecord {
  id: number | string;
  projectName: string;
  meetingType: MeetingDocumentType;
  title: string;
  meetingNumber: string | null;
  meetingDate: string;
  version: number;
  uploadedBy: string;
  uploadedOn: string;
  description?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface MeetingDocumentsDashboardStats {
  totalMom: number;
  totalEdl: number;
  uploadedThisMonth: number;
  storageSavedThroughCompression: string;
}

export interface MeetingDocumentsListParams {
  page?: number;
  page_size?: number;
  search?: string;
  project?: string;
  meeting_type?: MeetingDocumentType | '';
  month?: number | '';
  year?: number | '';
  /** Abort in-flight list fetch when filters/search change. */
  signal?: AbortSignal;
}

export interface PaginatedMeetingDocuments {
  results: MeetingDocumentRecord[];
  count: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface MeetingDocumentVersionRecord {
  id: number | string;
  version: number;
  uploadedBy: string;
  uploadedOn: string;
  fileName?: string | null;
  fileSizeBytes?: number | null;
}

export interface MeetingDocumentProjectGroup {
  id: number | string;
  title: string;
  meetingType: MeetingDocumentType;
  meetingNumber: string | null;
  meetingDate: string;
  latestVersion: MeetingDocumentVersionRecord;
  previousVersions: MeetingDocumentVersionRecord[];
}

export interface MeetingDocumentsByProject {
  projectName: string;
  momDocuments: MeetingDocumentProjectGroup[];
  edlDocuments: MeetingDocumentProjectGroup[];
}

export interface MeetingDocumentUploadInput {
  project_name: string;
  meeting_type: MeetingDocumentType;
  title: string;
  meeting_date: string;
  meeting_number?: string;
  description?: string;
  file: File;
}

export interface MeetingDocumentMetadataPatch {
  title?: string;
  description?: string;
  meeting_date?: string;
  meeting_number?: string;
}
