import axios, { type AxiosProgressEvent } from 'axios';
import { API_ENDPOINTS, getApiBaseUrl } from '../config/apiConfig';
import { getAccessToken } from '../utils/authStorage';
import { getApiErrorMessage, unwrapList } from './api';
import { openStoredFile, pickDirectStoredFileUrl } from '../utils/storedFileUrl';
import type {
  MeetingDocumentMetadataPatch,
  MeetingDocumentRecord,
  MeetingDocumentsByProject,
  MeetingDocumentsDashboardStats,
  MeetingDocumentsListParams,
  PaginatedMeetingDocuments,
  MeetingDocumentType,
  MeetingDocumentVersionRecord,
  MeetingDocumentProjectGroup,
} from '../types/meetingDocuments';

const client = axios.create({
  baseURL: getApiBaseUrl('main'),
});

client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function unwrapPayload<T>(data: unknown): T {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.data !== undefined) return obj.data as T;
    if (obj.results !== undefined) return obj as T;
  }
  return data as T;
}

function toMeetingType(value: unknown): MeetingDocumentType {
  const raw = String(value ?? 'MOM').toUpperCase();
  return raw === 'EDL' ? 'EDL' : 'MOM';
}

function normalizeVersion(row: Record<string, unknown>): MeetingDocumentVersionRecord {
  return {
    id: (row.id ?? row.version_id ?? '') as number | string,
    version: Number(row.version ?? row.version_number ?? 1) || 1,
    uploadedBy: String(
      row.uploaded_by_name ?? row.uploaded_by ?? row.created_by ?? row.uploader ?? '—',
    ),
    uploadedOn: String(row.uploaded_on ?? row.uploaded_at ?? row.created_at ?? ''),
    fileName: (row.file_name ?? row.filename ?? row.original_filename ?? null) as string | null,
    fileSizeBytes: Number(row.file_size ?? row.file_size_bytes ?? row.size ?? 0) || null,
    fileUrl: pickDirectStoredFileUrl(row),
  };
}

export function normalizeMeetingDocument(row: unknown): MeetingDocumentRecord {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: (r.id ?? '') as number | string,
    projectName: String(r.project_name ?? r.project ?? r.projectName ?? '—'),
    meetingType: toMeetingType(r.meeting_type ?? r.meetingType),
    title: String(r.title ?? 'Untitled'),
    meetingNumber: (r.meeting_number ?? r.meetingNumber ?? null) as string | null,
    meetingDate: String(r.meeting_date ?? r.meetingDate ?? ''),
    version: Number(r.version ?? r.version_number ?? 1) || 1,
    uploadedBy: String(
      r.uploaded_by_name ?? r.uploaded_by ?? r.created_by ?? r.uploader ?? '—',
    ),
    uploadedOn: String(r.uploaded_on ?? r.uploaded_at ?? r.created_at ?? ''),
    description: (r.description ?? null) as string | null,
    fileName: (r.file_name ?? r.filename ?? r.original_filename ?? null) as string | null,
    fileSizeBytes: Number(r.file_size ?? r.file_size_bytes ?? r.size ?? 0) || null,
    fileUrl: pickDirectStoredFileUrl(r),
    metadata: (r.metadata ?? r.document_metadata ?? null) as Record<string, unknown> | null,
  };
}

function normalizeProjectGroup(row: unknown): MeetingDocumentProjectGroup {
  const r = (row ?? {}) as Record<string, unknown>;
  const versionsRaw = unwrapList<Record<string, unknown>>(r.versions ?? r.previous_versions);
  const latestRaw =
    (r.latest_version as Record<string, unknown> | undefined) ??
    (r.latest as Record<string, unknown> | undefined) ??
    (versionsRaw[0] as Record<string, unknown> | undefined) ??
    r;

  const latestVersion = normalizeVersion(latestRaw);
  const previousVersions = versionsRaw
    .map(normalizeVersion)
    .filter((v) => v.version !== latestVersion.version)
    .sort((a, b) => b.version - a.version);

  return {
    id: (r.id ?? latestVersion.id) as number | string,
    title: String(r.title ?? 'Untitled'),
    meetingType: toMeetingType(r.meeting_type ?? r.meetingType),
    meetingNumber: (r.meeting_number ?? r.meetingNumber ?? null) as string | null,
    meetingDate: String(r.meeting_date ?? r.meetingDate ?? ''),
    latestVersion,
    previousVersions,
  };
}

export function normalizeMeetingDocumentsDashboard(data: unknown): MeetingDocumentsDashboardStats {
  const r = unwrapPayload<Record<string, unknown>>(data) ?? {};
  const storage =
    r.storage_saved_through_compression ??
    r.storage_saved ??
    r.compression_saved ??
    r.storage_saved_compression ??
    '—';

  return {
    totalMom: Number(r.total_mom ?? r.totalMom ?? 0) || 0,
    totalEdl: Number(r.total_edl ?? r.totalEdl ?? 0) || 0,
    uploadedThisMonth: Number(r.uploaded_this_month ?? r.uploadedThisMonth ?? 0) || 0,
    storageSavedThroughCompression: String(storage),
  };
}

export function normalizeMeetingDocumentsList(data: unknown): PaginatedMeetingDocuments {
  const payload = unwrapPayload<Record<string, unknown>>(data) ?? {};
  const results = unwrapList<unknown>(payload.results ?? payload.items ?? data).map(
    normalizeMeetingDocument,
  );
  const count = Number(payload.count ?? results.length) || results.length;
  const page = Number(payload.page ?? 1) || 1;
  const pageSize = Number(payload.page_size ?? payload.pageSize ?? results.length) || 10;

  return {
    results,
    count,
    page,
    pageSize,
    hasNext: Boolean(payload.next),
    hasPrevious: Boolean(payload.previous),
  };
}

export function normalizeMeetingDocumentsByProject(data: unknown): MeetingDocumentsByProject {
  const payload = unwrapPayload<Record<string, unknown>>(data) ?? {};
  const projectName = String(payload.project_name ?? payload.project ?? '');

  const momRaw = unwrapList<unknown>(
    payload.mom_documents ?? payload.mom ?? payload.momDocuments,
  );
  const edlRaw = unwrapList<unknown>(
    payload.edl_documents ?? payload.edl ?? payload.edlDocuments,
  );

  return {
    projectName,
    momDocuments: momRaw.map(normalizeProjectGroup),
    edlDocuments: edlRaw.map(normalizeProjectGroup),
  };
}

function buildListParams(params: MeetingDocumentsListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params.page) query.page = params.page;
  if (params.page_size) query.page_size = params.page_size;
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.project?.trim()) query.project_name = params.project.trim();
  if (params.meeting_type) query.meeting_type = params.meeting_type;
  if (params.month) query.month = params.month;
  if (params.year) query.year = params.year;
  return query;
}

function metadataToFormData(payload: MeetingDocumentMetadataPatch): FormData {
  const formData = new FormData();
  if (payload.title != null) formData.append('title', payload.title);
  if (payload.description != null) formData.append('description', payload.description);
  if (payload.meeting_date != null) formData.append('meeting_date', payload.meeting_date);
  if (payload.meeting_number != null) formData.append('meeting_number', payload.meeting_number);
  return formData;
}

const multipartHeaders = { 'Content-Type': 'multipart/form-data' } as const;

export const meetingDocumentsApi = {
  getDashboard: () => client.get(API_ENDPOINTS.MEETING_DOCUMENTS.DASHBOARD),

  list: (params: MeetingDocumentsListParams = {}) =>
    client.get(API_ENDPOINTS.MEETING_DOCUMENTS.LIST, {
      params: buildListParams(params),
      ...(params.signal ? { signal: params.signal } : {}),
    }),

  getById: (id: string | number) => client.get(API_ENDPOINTS.MEETING_DOCUMENTS.DETAIL(id)),

  getByProject: (projectName: string) =>
    client.get(API_ENDPOINTS.MEETING_DOCUMENTS.BY_PROJECT(projectName)),

  getDownloadUrl: async (id: string | number): Promise<string> => {
    const res = await client.get(API_ENDPOINTS.MEETING_DOCUMENTS.DOWNLOAD(id));
    if (typeof res.data === 'string' && res.data.trim().startsWith('http')) {
      return res.data.trim();
    }

    const payload = unwrapPayload<Record<string, unknown>>(res.data) ?? res.data;
    const body = (payload ?? {}) as Record<string, unknown>;
    const url = String(body.download_url ?? body.url ?? '');
    if (!url) {
      throw new Error('Download URL was not returned by the server.');
    }
    return url;
  },

  create: (
    formData: FormData,
    onUploadProgress?: (percent: number) => void,
  ) =>
    client.post(API_ENDPOINTS.MEETING_DOCUMENTS.LIST, formData, {
      headers: multipartHeaders,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      },
    }),

  patchMetadata: (id: string | number, payload: MeetingDocumentMetadataPatch) =>
    client.patch(API_ENDPOINTS.MEETING_DOCUMENTS.DETAIL(id), metadataToFormData(payload), {
      headers: multipartHeaders,
    }),

  uploadNewVersion: (
    id: string | number,
    file: File,
    onUploadProgress?: (percent: number) => void,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.patch(API_ENDPOINTS.MEETING_DOCUMENTS.DETAIL(id), formData, {
      headers: multipartHeaders,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
  },

  delete: (id: string | number) => client.delete(API_ENDPOINTS.MEETING_DOCUMENTS.DETAIL(id)),
};

export function getMeetingDocumentsErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'object' && data !== null) {
      const body = data as Record<string, unknown>;
      if (typeof body.detail === 'string' && body.detail.trim()) {
        return body.detail;
      }
      const nestedErrors = body.errors;
      if (nestedErrors && typeof nestedErrors === 'object') {
        const entries = Object.entries(nestedErrors as Record<string, unknown>);
        if (entries.length > 0) {
          const [field, value] = entries[0];
          const message = Array.isArray(value) ? value.join(' ') : String(value);
          const label = field.replace(/_/g, ' ');
          return `${label}: ${message}`;
        }
      }
    }
  }
  return getApiErrorMessage(error, fallback);
}

export function parseMeetingDocumentResponse(data: unknown): MeetingDocumentRecord {
  return normalizeMeetingDocument(unwrapPayload(data) ?? data);
}

export async function downloadMeetingDocumentSecure(
  id: string | number,
  fileName?: string,
  directUrl?: string | null,
): Promise<{ url: string; source: 'direct' | 'presigned_download' }> {
  return openStoredFile({
    directUrl,
    fileName,
    download: Boolean(fileName),
    fetchPresignedUrl: () => meetingDocumentsApi.getDownloadUrl(id),
  });
}
