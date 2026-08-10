import api, { getApiErrorMessage, toNum, unwrapList } from './api';
import { API_ENDPOINTS } from '../config/apiConfig';

export type ProjectEotDateType = 'SCL' | 'CONTRACTOR';

export type ProjectEotStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'pending'
  | string;

/** Create / update payload — legacy Project Dates field names + EOT extras. */
export type ProjectEotPayload = {
  project_name: string;
  date_type: ProjectEotDateType;
  contractor_id?: number | null;
  contractor_name?: string | null;
  contractor?: string | null;
  project_start: string;
  contract_finish: string;
  forecast_finish: string;
  eot_date: string;
  extension_days: number;
  reason?: string;
  remarks?: string;
  status?: ProjectEotStatus;
  approval_date?: string | null;
  supporting_document?: File | null;
};

export type ProjectEotHistoryItem = {
  id: number;
  eot_no?: number | string | null;
  eot_date: string | null;
  extension_days: number;
  reason: string;
  status: ProjectEotStatus;
  approval_date: string | null;
  remarks: string;
  supporting_document_url: string | null;
  created_at: string | null;
  updated_at?: string | null;
  date_type?: ProjectEotDateType;
  contractor_id?: number | null;
  contractor_name?: string | null;
  project_start?: string | null;
  contract_finish?: string | null;
  forecast_finish?: string | null;
};

export type ProjectEotCurrent = {
  id?: number;
  eot_date: string | null;
  extension_days?: number;
  reason?: string;
  status?: ProjectEotStatus;
  approval_date?: string | null;
  remarks?: string;
  supporting_document_url?: string | null;
  date_type?: ProjectEotDateType;
};

export type ProjectEotSummary = {
  project_name: string;
  current_eot: ProjectEotCurrent | null;
  latest_completion_date: string | null;
  total_eot_count: number;
  eot_history: ProjectEotHistoryItem[];
};

function str(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  return String(v).trim();
}

function strOrNull(v: unknown): string | null {
  const s = str(v);
  return s || null;
}

function unwrapData(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  if (obj.data !== undefined) return obj.data;
  return raw;
}

export function normalizeProjectEotHistoryItem(
  row: unknown,
): ProjectEotHistoryItem | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = toNum(r.id ?? r.eot_id ?? r.pk);
  if (!id) return null;

  const eotNoRaw = r.eot_no ?? r.eot_number ?? r.number ?? r.seq;
  const eot_no =
    typeof eotNoRaw === 'string' || typeof eotNoRaw === 'number'
      ? eotNoRaw
      : id;

  return {
    id,
    eot_no,
    eot_date: strOrNull(r.eot_date ?? r.eotDate),
    extension_days: toNum(r.extension_days ?? r.extensionDays),
    reason: str(r.reason),
    status: str(r.status, 'draft') as ProjectEotStatus,
    approval_date: strOrNull(r.approval_date ?? r.approvalDate),
    remarks: str(r.remarks),
    supporting_document_url: strOrNull(
      r.supporting_document_url ??
        r.supportingDocumentUrl ??
        r.document_url ??
        r.file_url ??
        r.fileUrl ??
        r.s3_url ??
        r.s3Url ??
        r.attachment_url,
    ),
    created_at: strOrNull(r.created_at ?? r.createdAt),
    updated_at: strOrNull(r.updated_at ?? r.updatedAt) ?? undefined,
    date_type: (str(r.date_type ?? r.dateType, 'SCL').toUpperCase() ===
    'CONTRACTOR'
      ? 'CONTRACTOR'
      : 'SCL') as ProjectEotDateType,
    contractor_id:
      r.contractor_id != null || r.contractorId != null
        ? toNum(r.contractor_id ?? r.contractorId) || null
        : null,
    contractor_name: strOrNull(r.contractor_name ?? r.contractorName),
    project_start: strOrNull(r.project_start ?? r.projectStart),
    contract_finish: strOrNull(r.contract_finish ?? r.contractFinish),
    forecast_finish: strOrNull(r.forecast_finish ?? r.forecastFinish),
  };
}

export function normalizeProjectEotSummary(
  raw: unknown,
  fallbackProjectName = '',
): ProjectEotSummary {
  const data = unwrapData(raw);
  if (!data || typeof data !== 'object') {
    return {
      project_name: fallbackProjectName,
      current_eot: null,
      latest_completion_date: null,
      total_eot_count: 0,
      eot_history: [],
    };
  }

  const row = data as Record<string, unknown>;
  const historyRaw =
    row.eot_history ?? row.eotHistory ?? row.history ?? row.results ?? [];
  const historyList = Array.isArray(historyRaw)
    ? historyRaw
    : unwrapList(historyRaw);

  const eot_history = historyList
    .map(normalizeProjectEotHistoryItem)
    .filter((item): item is ProjectEotHistoryItem => Boolean(item));

  const currentRaw = row.current_eot ?? row.currentEot ?? row.latest_eot ?? null;
  let current_eot: ProjectEotCurrent | null = null;
  if (currentRaw && typeof currentRaw === 'object') {
    const c = currentRaw as Record<string, unknown>;
    current_eot = {
      id: toNum(c.id) || undefined,
      eot_date: strOrNull(c.eot_date ?? c.eotDate),
      extension_days: toNum(c.extension_days ?? c.extensionDays) || undefined,
      reason: str(c.reason) || undefined,
      status: (str(c.status) || undefined) as ProjectEotStatus | undefined,
      approval_date: strOrNull(c.approval_date ?? c.approvalDate),
      remarks: str(c.remarks) || undefined,
      supporting_document_url: strOrNull(
        c.supporting_document_url ?? c.supportingDocumentUrl,
      ),
      date_type: (str(c.date_type ?? c.dateType, 'SCL').toUpperCase() ===
      'CONTRACTOR'
        ? 'CONTRACTOR'
        : 'SCL') as ProjectEotDateType,
    };
  } else if (eot_history.length > 0) {
    const latest = eot_history[eot_history.length - 1];
    current_eot = {
      id: latest.id,
      eot_date: latest.eot_date,
      extension_days: latest.extension_days,
      reason: latest.reason,
      status: latest.status,
      approval_date: latest.approval_date,
      remarks: latest.remarks,
      supporting_document_url: latest.supporting_document_url,
      date_type: latest.date_type,
    };
  }

  const total =
    toNum(row.total_eot_count ?? row.totalEotCount ?? row.total_eots) ||
    eot_history.length;

  return {
    project_name:
      str(row.project_name ?? row.projectName, fallbackProjectName) ||
      fallbackProjectName,
    current_eot,
    latest_completion_date: strOrNull(
      row.latest_completion_date ??
        row.latestCompletionDate ??
        row.revised_completion_date,
    ),
    total_eot_count: total,
    eot_history,
  };
}

function buildEotFormData(payload: ProjectEotPayload): FormData {
  const form = new FormData();
  form.append('project_name', payload.project_name);
  form.append('date_type', payload.date_type);

  if (payload.contractor_id != null) {
    form.append('contractor_id', String(payload.contractor_id));
  } else {
    form.append('contractor_id', '');
  }
  if (payload.contractor_name) {
    form.append('contractor_name', payload.contractor_name);
  }
  if (payload.contractor) {
    form.append('contractor', payload.contractor);
  }

  form.append('project_start', payload.project_start);
  form.append('contract_finish', payload.contract_finish);
  form.append('forecast_finish', payload.forecast_finish);
  form.append('eot_date', payload.eot_date);
  form.append('extension_days', String(payload.extension_days));

  if (payload.reason != null) form.append('reason', payload.reason);
  if (payload.remarks != null) form.append('remarks', payload.remarks);
  if (payload.status != null) form.append('status', payload.status);
  if (payload.approval_date) {
    form.append('approval_date', payload.approval_date);
  } else {
    form.append('approval_date', '');
  }

  if (payload.supporting_document instanceof File) {
    form.append('supporting_document', payload.supporting_document);
  }

  return form;
}

function buildEotJsonBody(payload: ProjectEotPayload): Record<string, unknown> {
  return {
    project_name: payload.project_name,
    date_type: payload.date_type,
    contractor_id: payload.contractor_id ?? null,
    ...(payload.contractor_name != null
      ? { contractor_name: payload.contractor_name }
      : {}),
    ...(payload.contractor != null ? { contractor: payload.contractor } : {}),
    project_start: payload.project_start,
    contract_finish: payload.contract_finish,
    forecast_finish: payload.forecast_finish,
    eot_date: payload.eot_date,
    extension_days: payload.extension_days,
    reason: payload.reason ?? '',
    remarks: payload.remarks ?? '',
    status: payload.status ?? 'submitted',
    approval_date: payload.approval_date || null,
    supporting_document: null,
  };
}

export const projectEotApi = {
  getProjectEOTSummary: (projectName: string) =>
    api.get(API_ENDPOINTS.PROJECT_EOT.PROJECT_SUMMARY(projectName)),

  getProjectEOTList: (params?: Record<string, string | number | boolean>) =>
    api.get(API_ENDPOINTS.PROJECT_EOT.LIST, { params }),

  createProjectEOT: (payload: ProjectEotPayload) => {
    if (payload.supporting_document instanceof File) {
      return api.post(
        API_ENDPOINTS.PROJECT_EOT.LIST,
        buildEotFormData(payload),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
    }
    return api.post(API_ENDPOINTS.PROJECT_EOT.LIST, buildEotJsonBody(payload));
  },

  updateProjectEOT: (id: string | number, payload: ProjectEotPayload) => {
    if (payload.supporting_document instanceof File) {
      return api.patch(
        API_ENDPOINTS.PROJECT_EOT.DETAIL(id),
        buildEotFormData(payload),
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
    }
    return api.patch(
      API_ENDPOINTS.PROJECT_EOT.DETAIL(id),
      buildEotJsonBody(payload),
    );
  },

  deleteProjectEOT: (id: string | number) =>
    api.delete(API_ENDPOINTS.PROJECT_EOT.DETAIL(id)),
};

export { getApiErrorMessage };

/** Prefer full backend validation text for EOT forms. */
export function getProjectEotErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return getApiErrorMessage(error, fallback);
  }
  const response = (error as { response?: { status?: number; data?: unknown } })
    .response;
  const status = response?.status;
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have permission to do this.';
  }
  if (status === 404) {
    return 'This extension of time record was not found.';
  }
  if (status === 413) {
    return 'The file is too large. Please upload a smaller document.';
  }
  if (status && status >= 500) {
    return 'The server is busy right now. Please try again in a moment.';
  }

  const data = response?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const body = data as Record<string, unknown>;
    const fieldFriendly: Record<string, string> = {
      project_name: 'Project name',
      project_start: 'Project start date',
      contract_finish: 'Contract finish date',
      forecast_finish: 'Forecast finish date',
      eot_date: 'EOT date',
      extension_days: 'Extension days',
      reason: 'Reason',
      remarks: 'Remarks',
      status: 'Status',
      approval_date: 'Approval date',
      supporting_document: 'Supporting document',
      date_type: 'Date type',
      contractor_id: 'Contractor',
      non_field_errors: '',
    };

    const simplifyValue = (raw: string): string => {
      const t = raw.trim();
      if (/reason is required/i.test(t)) {
        return 'Please enter the reason for this extension of time.';
      }
      if (/required/i.test(t)) return 'This field is required.';
      if (/valid date|date format|invalid date/i.test(t)) {
        return 'Please enter a valid date.';
      }
      if (/greater than|positive|at least/i.test(t)) {
        return 'Please enter a number greater than 0.';
      }
      if (/invalid choice|not a valid choice/i.test(t)) {
        return 'Please choose a valid option from the list.';
      }
      return t.replace(/[_]/g, ' ');
    };

    const fieldLines: string[] = [];

    // Backend shape: { errors: [{ field, message }] }
    if (Array.isArray(body.errors)) {
      for (const entry of body.errors) {
        if (!entry || typeof entry !== 'object') continue;
        const row = entry as Record<string, unknown>;
        const field = typeof row.field === 'string' ? row.field : '';
        const msg =
          typeof row.message === 'string'
            ? row.message
            : Array.isArray(row.message)
              ? String(row.message[0] ?? '')
              : '';
        if (!msg.trim()) continue;
        const label = fieldFriendly[field] ?? (field ? field.replace(/_/g, ' ') : '');
        const text = simplifyValue(msg);
        fieldLines.push(label ? `${label}: ${text}` : text);
      }
    }

    // DRF field map (skip meta keys / errors array already handled)
    for (const [field, value] of Object.entries(body)) {
      if (
        ['detail', 'message', 'error', 'success', 'errors'].includes(field)
      ) {
        continue;
      }
      const label = fieldFriendly[field] ?? field.replace(/_/g, ' ');
      let text = '';
      if (typeof value === 'string' && value.trim()) text = simplifyValue(value);
      else if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'string') text = simplifyValue(first);
        else if (first && typeof first === 'object') continue; // avoid [object Object]
      }
      if (!text) continue;
      fieldLines.push(label ? `${label}: ${text}` : text);
    }

    if (fieldLines.length > 0) return [...new Set(fieldLines)].join('\n');

    if (typeof body.message === 'string' && body.message.trim()) {
      return simplifyValue(body.message);
    }
    if (typeof body.detail === 'string' && body.detail.trim()) {
      return simplifyValue(body.detail);
    }
  }
  return getApiErrorMessage(error, fallback);
}
