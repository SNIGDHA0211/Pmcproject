import axios from 'axios';
import api, { getApiErrorMessage } from './api';
import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  MprDownloadPayload,
  MprHistoryListResult,
  MprPreviewMeta,
  MprPreviewSnapshot,
  MprReportRecord,
  MprReportStatus,
} from '../types/mpr';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function unwrapEnvelope(payload: unknown): {
  success: boolean;
  message: string;
  data: unknown;
  meta?: MprPreviewMeta;
  count?: number;
  page?: number;
  page_size?: number;
} {
  const body = asRecord(payload);
  return {
    success: body.success !== false,
    message: String(body.message ?? ''),
    data: 'data' in body ? body.data : payload,
    meta: asRecord(body.meta) as MprPreviewMeta,
    count: Number(body.count),
    page: Number(body.page),
    page_size: Number(body.page_size),
  };
}

function toPerson(raw: unknown): MprReportRecord['generated_by'] {
  const row = asRecord(raw);
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    username: String(row.username ?? ''),
    full_name: String(row.full_name ?? row.name ?? row.username ?? ''),
  };
}

function normalizeMprReport(raw: unknown): MprReportRecord | null {
  const row = asRecord(raw);
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  const projectId = Number(row.project_id);
  const status = String(row.status ?? 'draft').toLowerCase() as MprReportStatus;
  return {
    id,
    project_id: Number.isFinite(projectId) ? projectId : 0,
    project_name: String(row.project_name ?? ''),
    report_month: String(row.report_month ?? ''),
    report_year: Number(row.report_year) || 0,
    report_month_number: Number(row.report_month_number) || 0,
    version: Number(row.version) || 1,
    is_latest: Boolean(row.is_latest),
    status,
    generated_at: row.generated_at ? String(row.generated_at) : null,
    generation_started_at: row.generation_started_at
      ? String(row.generation_started_at)
      : null,
    generated_by: toPerson(row.generated_by),
    pdf_available: Boolean(row.pdf_available),
    excel_available: Boolean(row.excel_available),
    error_message: row.error_message ? String(row.error_message) : null,
  };
}

function parseOne(payload: unknown): MprReportRecord {
  const { data, message, success } = unwrapEnvelope(payload);
  const candidates = [data, asRecord(data).mpr, payload];
  for (const candidate of candidates) {
    const row = normalizeMprReport(candidate);
    if (row) return row;
  }
  throw new Error(message || 'Invalid MPR response from server.');
}

function parseList(payload: unknown): MprHistoryListResult {
  const envelope = unwrapEnvelope(payload);
  const body = asRecord(payload);
  const data = envelope.data;

  const list = Array.isArray(data)
    ? data
    : Array.isArray(body.data)
      ? (body.data as unknown[])
      : Array.isArray(asRecord(data).results)
        ? (asRecord(data).results as unknown[])
        : [];

  const results = list
    .map((row) => normalizeMprReport(row))
    .filter((row): row is MprReportRecord => Boolean(row));

  return {
    count: Number.isFinite(envelope.count) && envelope.count! > 0
      ? envelope.count!
      : Number(body.count) || results.length,
    page: Number.isFinite(envelope.page) ? envelope.page! : 1,
    page_size: Number.isFinite(envelope.page_size) ? envelope.page_size! : results.length,
    results,
  };
}

function parsePreview(payload: unknown): { snapshot: MprPreviewSnapshot; meta?: MprPreviewMeta } {
  const envelope = unwrapEnvelope(payload);
  if (!envelope.success && envelope.message) {
    throw new Error(envelope.message);
  }
  const snapshot = (envelope.data ?? {}) as MprPreviewSnapshot;
  return { snapshot, meta: envelope.meta };
}

function parseDownload(payload: unknown): MprDownloadPayload {
  const envelope = unwrapEnvelope(payload);
  const data = asRecord(envelope.data);
  const url = String(data.url ?? data.download_url ?? '');
  if (!url) throw new Error(envelope.message || 'Download URL not available.');
  const format = String(data.format ?? 'pdf').toLowerCase();
  return {
    url,
    mpr_id: Number(data.mpr_id) || 0,
    format: format === 'excel' ? 'excel' : 'pdf',
  };
}

export const mprApi = {
  preview: async (
    projectId: string | number,
    month: string,
  ): Promise<{ snapshot: MprPreviewSnapshot; meta?: MprPreviewMeta }> => {
    const response = await api.get(API_ENDPOINTS.MPR.PREVIEW(projectId), {
      params: { month },
    });
    return parsePreview(response.data);
  },

  generate: async (projectId: string | number, month: string): Promise<MprReportRecord> => {
    const response = await api.post(API_ENDPOINTS.MPR.GENERATE(projectId), { month });
    return parseOne(response.data);
  },

  listForProject: async (
    projectId: string | number,
    params?: { latest_only?: boolean; page?: number; page_size?: number },
  ): Promise<MprHistoryListResult> => {
    const response = await api.get(API_ENDPOINTS.MPR.PROJECT_LIST(projectId), {
      params: {
        latest_only: params?.latest_only ?? true,
        page: params?.page ?? 1,
        page_size: params?.page_size ?? 20,
      },
    });
    return parseList(response.data);
  },

  get: async (mprId: string | number): Promise<MprReportRecord> => {
    const response = await api.get(API_ENDPOINTS.MPR.DETAIL(mprId));
    return parseOne(response.data);
  },

  regenerate: async (mprId: string | number): Promise<MprReportRecord> => {
    const response = await api.post(API_ENDPOINTS.MPR.REGENERATE(mprId), {});
    return parseOne(response.data);
  },

  getPdfUrl: async (mprId: string | number): Promise<MprDownloadPayload> => {
    const response = await api.get(API_ENDPOINTS.MPR.PDF(mprId));
    return parseDownload(response.data);
  },

  getExcelUrl: async (mprId: string | number): Promise<MprDownloadPayload> => {
    const response = await api.get(API_ENDPOINTS.MPR.EXCEL(mprId));
    return parseDownload(response.data);
  },

  /** Poll detail until completed or failed. */
  waitUntilReady: async (
    mprId: number,
    options?: { intervalMs?: number; maxAttempts?: number },
  ): Promise<MprReportRecord> => {
    const intervalMs = options?.intervalMs ?? 3000;
    const maxAttempts = options?.maxAttempts ?? 40;
    let last: MprReportRecord | null = null;
    for (let i = 0; i < maxAttempts; i += 1) {
      last = await mprApi.get(mprId);
      if (last.status === 'completed' || last.status === 'failed') return last;
      await new Promise((r) => window.setTimeout(r, intervalMs));
    }
    if (last) return last;
    throw new Error('MPR generation timed out. Try again later.');
  },
};

export function openMprDownloadUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function getMprApiErrorMessage(error: unknown, fallback = 'MPR request failed.'): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const body = data as Record<string, unknown>;
      const msg = body.message ?? body.detail;
      if (typeof msg === 'string' && msg.trim()) return msg;
      const errors = body.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        const first = errors[0] as Record<string, unknown>;
        if (typeof first.message === 'string') return first.message;
      }
    }
    if (status === 404) return 'MPR API or file not found (404).';
    if (status === 400) return 'Invalid request. Use month format YYYY-MM.';
  }
  return getApiErrorMessage(error, fallback);
}

export const fetchMprPreview = mprApi.preview;
export const generateMpr = mprApi.generate;
export const listMprHistory = mprApi.listForProject;
export const getMprReport = mprApi.get;
export const regenerateMpr = mprApi.regenerate;
