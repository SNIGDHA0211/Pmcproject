/**
 * Project Feedback API service.
 * Reuses the shared authenticated axios instance from services/api.ts
 * (JWT, refresh, base URL and error handling all come from there).
 */
import api from './api';
import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  FeedbackPriority,
  FeedbackStatus,
  ProjectFeedback,
} from '../types';

export type FeedbackOrdering = 'newest' | 'oldest' | 'priority' | 'status';

const ORDERING_PARAM: Record<FeedbackOrdering, string> = {
  newest: '-created_at',
  oldest: 'created_at',
  priority: 'priority',
  status: 'status',
};

export interface FeedbackListParams {
  project?: number | string;
  status?: string;
  priority?: string;
  reported_by?: string;
  month?: number;
  year?: number;
  search?: string;
  ordering?: FeedbackOrdering;
  page?: number;
  page_size?: number;
}

export interface FeedbackCreatePayload {
  projectId: number | string;
  issueTitle: string;
  issueDescription: string;
  priority: FeedbackPriority;
  attachment?: File | null;
}

export interface FeedbackUpdatePayload {
  issueTitle?: string;
  issueDescription?: string;
  priority?: FeedbackPriority;
  remarks?: string;
  attachment?: File | null;
}

export interface FeedbackListResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProjectFeedback[];
}

function normalizeFeedback(row: any): ProjectFeedback {
  const project = row?.project;
  const reportedBy = row?.reported_by ?? row?.reportedBy;
  const attachment = row?.attachment;
  const attachmentUrl =
    (attachment && typeof attachment === 'object' ? attachment.url : null) ??
    (typeof attachment === 'string' ? attachment : null) ??
    row?.attachment_url ??
    row?.attachmentUrl ??
    '';
  return {
    id: Number(row?.id) || 0,
    projectId:
      Number(
        typeof project === 'object' ? project?.id : row?.project_id ?? project,
      ) || 0,
    projectName: String(
      (typeof project === 'object' ? project?.name : null) ??
        row?.project_name ??
        row?.projectName ??
        '',
    ),
    issueTitle: String(row?.issue_title ?? row?.issueTitle ?? ''),
    issueDescription: String(
      row?.issue_description ?? row?.issueDescription ?? '',
    ),
    priority: (row?.priority as FeedbackPriority) || 'Medium',
    status: (row?.status as FeedbackStatus) || 'Open',
    remarks: String(row?.remarks ?? ''),
    reportedById:
      typeof reportedBy === 'object'
        ? Number(reportedBy?.id) || undefined
        : Number(row?.reported_by_id) || undefined,
    reportedByUsername:
      typeof reportedBy === 'object'
        ? String(reportedBy?.username ?? '')
        : String(row?.reported_by_username ?? reportedBy ?? ''),
    reportedByRole:
      typeof reportedBy === 'object'
        ? String(reportedBy?.role ?? '')
        : String(row?.reported_by_role ?? ''),
    attachmentUrl: String(attachmentUrl ?? ''),
    attachmentName: String(
      (attachment && typeof attachment === 'object' ? attachment.name : null) ??
        row?.attachment_name ??
        '',
    ),
    createdAt: row?.created_at ?? row?.createdAt,
    updatedAt: row?.updated_at ?? row?.updatedAt,
    resolvedAt: row?.resolved_at ?? row?.resolvedAt ?? null,
  };
}

function unwrapEnvelope(payload: unknown): {
  success: boolean;
  message: string;
  data: unknown;
} {
  const body =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};
  return {
    success: body.success !== false,
    message: String(body.message ?? ''),
    data: 'data' in body ? body.data : payload,
  };
}

export function parseFeedbackListResponse(payload: unknown): FeedbackListResult {
  const { data } = unwrapEnvelope(payload);
  const body =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const results = Array.isArray(body.results)
    ? body.results
    : Array.isArray(data)
      ? (data as unknown[])
      : [];
  return {
    count: Number(body.count) || results.length,
    next: (body.next as string | null) ?? null,
    previous: (body.previous as string | null) ?? null,
    results: results.map(normalizeFeedback).filter((f) => f.id),
  };
}

export function parseFeedbackResponse(payload: unknown): {
  feedback: ProjectFeedback | null;
  message: string;
  success: boolean;
} {
  const { success, message, data } = unwrapEnvelope(payload);
  if (!data || typeof data !== 'object') {
    return { feedback: null, message, success };
  }
  const feedback = normalizeFeedback(data);
  return { feedback: feedback.id ? feedback : null, message, success };
}

export async function getFeedbackList(params: FeedbackListParams = {}) {
  const query: Record<string, string | number> = {};
  if (params.project) query.project = params.project;
  if (params.status) query.status = params.status;
  if (params.priority) query.priority = params.priority;
  if (params.reported_by) query.reported_by = params.reported_by;
  if (params.month) query.month = params.month;
  if (params.year) query.year = params.year;
  if (params.search) query.search = params.search;
  if (params.ordering) query.ordering = ORDERING_PARAM[params.ordering];
  if (params.page) query.page = params.page;
  if (params.page_size) query.page_size = params.page_size;

  const res = await api.get(API_ENDPOINTS.PROJECT_FEEDBACK.LIST, {
    params: query,
  });
  return parseFeedbackListResponse(res.data);
}

export async function getFeedback(id: string | number) {
  const res = await api.get(API_ENDPOINTS.PROJECT_FEEDBACK.DETAIL(id));
  return parseFeedbackResponse(res.data);
}

export async function createFeedback(
  payload: FeedbackCreatePayload,
  onUploadProgress?: (percent: number) => void,
) {
  const formData = new FormData();
  formData.append('project', String(payload.projectId));
  formData.append('issue_title', payload.issueTitle.trim());
  formData.append('issue_description', payload.issueDescription.trim());
  formData.append('priority', payload.priority);
  if (payload.attachment) {
    formData.append('attachment', payload.attachment, payload.attachment.name);
  }

  const res = await api.post(API_ENDPOINTS.PROJECT_FEEDBACK.LIST, formData, {
    headers: { 'Content-Type': undefined as unknown as string },
    onUploadProgress: (event) => {
      if (!onUploadProgress || !event.total) return;
      onUploadProgress(Math.round((event.loaded * 100) / event.total));
    },
  });
  return parseFeedbackResponse(res.data);
}

export async function updateFeedback(
  id: string | number,
  payload: FeedbackUpdatePayload,
  onUploadProgress?: (percent: number) => void,
) {
  const formData = new FormData();
  if (payload.issueTitle !== undefined) {
    formData.append('issue_title', payload.issueTitle.trim());
  }
  if (payload.issueDescription !== undefined) {
    formData.append('issue_description', payload.issueDescription.trim());
  }
  if (payload.priority !== undefined) {
    formData.append('priority', payload.priority);
  }
  if (payload.remarks !== undefined) {
    formData.append('remarks', payload.remarks);
  }
  if (payload.attachment) {
    formData.append('attachment', payload.attachment, payload.attachment.name);
  }

  const res = await api.patch(
    API_ENDPOINTS.PROJECT_FEEDBACK.DETAIL(id),
    formData,
    {
      headers: { 'Content-Type': undefined as unknown as string },
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      },
    },
  );
  return parseFeedbackResponse(res.data);
}

export async function deleteFeedback(id: string | number) {
  const res = await api.delete(API_ENDPOINTS.PROJECT_FEEDBACK.DETAIL(id));
  return unwrapEnvelope(res.data);
}

/** PMC Head / Admin only — PATCH just the status, not the whole object. */
export async function updateFeedbackStatus(
  id: string | number,
  status: FeedbackStatus,
) {
  const res = await api.patch(API_ENDPOINTS.PROJECT_FEEDBACK.STATUS(id), {
    status,
  });
  return parseFeedbackResponse(res.data);
}
