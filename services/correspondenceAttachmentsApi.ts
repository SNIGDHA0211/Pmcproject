import axios, { type AxiosProgressEvent } from 'axios';
import { API_ENDPOINTS, getApiBaseUrl } from '../config/apiConfig';
import { getAccessToken } from '../utils/authStorage';
import { getApiErrorMessage, unwrapList } from './api';
import type {
  CorrespondenceAttachment,
  CorrespondenceDocumentDetailPermissions,
} from '../types';
import {
  extractCorrespondenceAttachments,
  normalizeCorrespondenceDocumentPermissions,
  sortCorrespondenceAttachments,
} from '../utils/correspondenceAttachments';
import { openStoredFile, resolveStoredFileUrl } from '../utils/storedFileUrl';

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

const multipartHeaders = { 'Content-Type': 'multipart/form-data' } as const;

function unwrapPayload(data: unknown): Record<string, unknown> {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.data !== undefined && typeof obj.data === 'object' && obj.data !== null) {
      return obj.data as Record<string, unknown>;
    }
    return obj;
  }
  return {};
}

export interface CorrespondenceDocumentDetail {
  attachments: CorrespondenceAttachment[];
  permissions: CorrespondenceDocumentDetailPermissions;
}

function unwrapDetailPayload(data: unknown): Record<string, unknown> {
  return unwrapPayload(data);
}

export const correspondenceAttachmentsApi = {
  getDocumentDetail: async (documentId: string | number): Promise<CorrespondenceDocumentDetail> => {
    const res = await client.get(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.DETAIL(documentId));
    const body = unwrapDetailPayload(res.data);
    const attachments = sortCorrespondenceAttachments(extractCorrespondenceAttachments(body.attachments));
    const permissions = normalizeCorrespondenceDocumentPermissions(body);
    return { attachments, permissions };
  },

  upload: (
    documentId: string | number,
    formData: FormData,
    onUploadProgress?: (percent: number) => void,
  ) =>
    client.post(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.ATTACHMENTS(documentId), formData, {
      headers: multipartHeaders,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      },
    }),

  update: (
    attachmentId: string | number,
    formData: FormData,
    onUploadProgress?: (percent: number) => void,
  ) =>
    client.patch(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.ATTACHMENT_DETAIL(attachmentId), formData, {
      headers: multipartHeaders,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      },
    }),

  delete: (attachmentId: string | number) =>
    client.delete(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.ATTACHMENT_DETAIL(attachmentId)),

  getDownloadUrl: async (attachmentId: string | number): Promise<string> => {
    const res = await client.get(
      API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.ATTACHMENT_DOWNLOAD(attachmentId),
    );
    if (typeof res.data === 'string' && res.data.trim().startsWith('http')) {
      return res.data.trim();
    }
    const body = unwrapDetailPayload(res.data);
    const url = String(body.download_url ?? body.url ?? '');
    if (!url) {
      throw new Error('Download URL was not returned by the server.');
    }
    return url;
  },
};

export function getCorrespondenceAttachmentsErrorMessage(
  error: unknown,
  fallback: string,
): string {
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
      if (typeof body.file === 'string') return body.file;
      if (Array.isArray(body.file)) return body.file.join(' ');
    }
  }
  return getApiErrorMessage(error, fallback);
}

export async function downloadCorrespondenceAttachmentSecure(
  attachmentId: string | number,
  fileName?: string,
  directUrl?: string | null,
): Promise<{ url: string; source: 'direct' | 'presigned_download' }> {
  return openStoredFile({
    directUrl,
    fileName,
    download: Boolean(fileName),
    fetchPresignedUrl: () => correspondenceAttachmentsApi.getDownloadUrl(attachmentId),
  });
}

/** Resolve preview URL — prefer attachment.fileUrl already in state. */
export async function resolveCorrespondenceAttachmentUrl(
  attachment: { id: string | number; fileUrl?: string | null },
): Promise<string> {
  const { url } = await resolveStoredFileUrl({
    directUrl: attachment.fileUrl,
    fetchPresignedUrl: () => correspondenceAttachmentsApi.getDownloadUrl(attachment.id),
  });
  return url;
}

export function extractCorrespondenceAttachmentMetaFromList(
  raw: unknown,
): Map<
  string | number,
  {
    attachmentCount: number;
    latestAttachment: { id: string | number; fileName: string } | null;
    updatedAt?: string;
  }
> {
  const rows = unwrapList(raw);
  const map = new Map<
    string | number,
    {
      attachmentCount: number;
      latestAttachment: { id: string | number; fileName: string } | null;
      updatedAt?: string;
    }
  >();

  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const record = row as Record<string, unknown>;
    const id = record.id ?? record.pk;
    if (id == null) return;
    const attachmentCount = Number(record.attachment_count ?? record.attachmentCount ?? 0) || 0;
    const latestRaw = record.latest_attachment ?? record.latestAttachment;
    let latestAttachment: { id: string | number; fileName: string } | null = null;
    if (latestRaw && typeof latestRaw === 'object') {
      const latest = latestRaw as Record<string, unknown>;
      const latestId = latest.id ?? latest.pk;
      const fileName = String(latest.file_name ?? latest.fileName ?? '').trim();
      if (latestId != null && fileName) {
        latestAttachment = { id: latestId as string | number, fileName };
      }
    }
    const updatedAt = String(
      record.updated_at ?? record.updatedAt ?? record.modified_at ?? record.modifiedAt ?? '',
    ).trim();
    map.set(id as string | number, {
      attachmentCount,
      latestAttachment,
      ...(updatedAt ? { updatedAt } : {}),
    });
  });

  return map;
}
