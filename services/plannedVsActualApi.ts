/**
 * Planned vs Actual API client.
 * Maps backend fields for display only — never computes financial metrics.
 *
 * Contract (see integration guide):
 * - POST /planned-vs-actual/ → UPSERT (201 create / 200 update)
 * - PATCH /planned-vs-actual/{id}/ → partial update
 * - Envelope: { success, message, data }
 * - Field: planned_type (SCL | CONTRACTOR)
 */
import api, { getApiErrorMessage, toNum, unwrapList } from './api';
import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  PvaCreatePayload,
  PvaDashboardKpis,
  PvaExportFormat,
  PvaPartyType,
  PvaPatchPayload,
  PvaPendingProjects,
  PvaProjectBundle,
  PvaRecord,
  PvaTrendPoint,
  PvaTrendResponse,
} from '../types/plannedVsActual';

const MONTH_SHORT = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function pickNum(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return toNum(row[key]);
    }
  }
  return 0;
}

function pickStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

/** Unwrap { success, data } envelope → data object. */
function unwrapData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  const root = payload as Record<string, unknown>;
  const nested = root.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return root;
}

/** Prefer field-level validation errors from the API envelope. */
export function getPvaApiErrorMessage(
  error: unknown,
  fallback = 'Failed to save Planned vs Actual record',
): string {
  const err = error as { response?: { data?: unknown } };
  const data = err?.response?.data;
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>;
    const errors = body.errors;
    if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
      const entries = Object.entries(errors as Record<string, unknown>);
      if (entries.length > 0) {
        return entries
          .map(([field, value]) => {
            const msg = Array.isArray(value) ? value.join(' ') : String(value);
            return `${field}: ${msg}`;
          })
          .join(' · ');
      }
    }
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
  }
  return getApiErrorMessage(error, fallback);
}

export function isMeaningfulPvaRecord(record: PvaRecord | null | undefined): boolean {
  if (!record) return false;
  if (record.id != null && record.id !== '') return true;
  return (
    Number(record.plannedValue) !== 0 ||
    Number(record.actualValue) !== 0 ||
    Number(record.collection) !== 0 ||
    Boolean(record.reason?.trim()) ||
    Boolean(record.remarks?.trim())
  );
}

export function isMeaningfulPvaDashboard(data: PvaDashboardKpis | null | undefined): boolean {
  if (!data) return false;
  return (
    data.totalPlannedValue !== 0 ||
    data.totalActualValue !== 0 ||
    data.totalCollection !== 0 ||
    data.totalDifference !== 0 ||
    data.overallAchievementPct !== 0 ||
    data.overallCollectionPct !== 0 ||
    data.updatedProjects !== 0 ||
    data.pendingProjects !== 0 ||
    (data.totalProjects ?? 0) !== 0
  );
}

/**
 * Flatten contractor list / type responses that nest metrics under planned_vs_actual.
 */
function flattenPvaRow(row: Record<string, unknown>): Record<string, unknown> {
  const nested =
    row.planned_vs_actual && typeof row.planned_vs_actual === 'object'
      ? (row.planned_vs_actual as Record<string, unknown>)
      : null;
  if (!nested) return row;
  return {
    ...row,
    ...nested,
    id: nested.id ?? row.id,
    planned_type: nested.planned_type ?? row.planned_type ?? 'CONTRACTOR',
    contractor: row.contractor ?? nested.contractor,
    contractor_name: row.contractor_name ?? nested.contractor_name,
  };
}

export function normalizePvaRecord(
  row: unknown,
  fallbackProjectName = '',
): PvaRecord | null {
  if (!row || typeof row !== 'object') return null;
  let r = row as Record<string, unknown>;

  // Ignore API error / empty envelopes
  if (
    'detail' in r &&
    Object.keys(r).length <= 2 &&
    !('planned_value' in r) &&
    !('plannedValue' in r) &&
    !('planned_vs_actual' in r)
  ) {
    return null;
  }

  r = flattenPvaRow(r);

  const nestedMetrics =
    (r.record && typeof r.record === 'object' ? r.record : null) ||
    (r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : null) ||
    (r.values && typeof r.values === 'object' ? r.values : null);
  const m = (nestedMetrics ?? r) as Record<string, unknown>;

  const partyRaw =
    pickStr(r, 'planned_type', 'party_type', 'partyType', 'type', 'record_type').toUpperCase() ||
    pickStr(m, 'planned_type', 'party_type', 'partyType', 'type', 'record_type').toUpperCase();

  const partyType: PvaPartyType | string =
    partyRaw === 'SCL' || partyRaw === 'PMC'
      ? 'SCL'
      : partyRaw === 'CONTRACTOR_SUMMARY' || partyRaw === 'SUMMARY'
        ? 'CONTRACTOR_SUMMARY'
        : partyRaw === 'CONTRACTOR'
          ? 'CONTRACTOR'
          : partyRaw || 'SCL';

  const nestedContractor =
    (r.contractor && typeof r.contractor === 'object'
      ? (r.contractor as Record<string, unknown>)
      : null) ||
    (m.contractor && typeof m.contractor === 'object'
      ? (m.contractor as Record<string, unknown>)
      : null);

  const contractorIdRaw =
    r.contractor_id ??
    r.contractorId ??
    m.contractor_id ??
    m.contractorId ??
    nestedContractor?.id;
  const contractorId =
    contractorIdRaw === undefined || contractorIdRaw === null || contractorIdRaw === ''
      ? null
      : Number(contractorIdRaw);

  const contractorName =
    pickStr(r, 'contractor_name', 'contractorName') ||
    pickStr(m, 'contractor_name', 'contractorName') ||
    pickStr(nestedContractor ?? {}, 'contractor_name', 'contractorName') ||
    null;

  const id = (m.id ?? r.id ?? r.pk) as string | number | undefined;

  const resolvedPartyType =
    !partyRaw && contractorId != null ? 'CONTRACTOR' : partyType;

  const hasAnyMetricKey = [
    'planned_value',
    'plannedValue',
    'actual_value',
    'actualValue',
    'collection',
    'difference',
    'achievement_percentage',
    'achievement_pct',
    'id',
    'pk',
  ].some((k) => m[k] != null || r[k] != null);

  if (!hasAnyMetricKey && !contractorName && id == null) {
    return null;
  }

  const plannedValue = pickNum(m, 'planned_value', 'plannedValue', 'total_planned_value');
  const actualValue = pickNum(
    m,
    'actual_value',
    'actualValue',
    'earned_value',
    'total_actual_value',
  );
  const collection = pickNum(m, 'collection', 'collection_value', 'total_collection');
  const reason =
    pickStr(m, 'reason_for_difference', 'reason', 'reasonForDifference') ||
    pickStr(r, 'reason_for_difference', 'reason', 'reasonForDifference') ||
    undefined;
  const remarks = pickStr(m, 'remarks') || pickStr(r, 'remarks') || undefined;
  const varianceStatusRaw =
    pickStr(m, 'variance_status', 'varianceStatus') ||
    pickStr(r, 'variance_status', 'varianceStatus');

  const record: PvaRecord = {
    id,
    projectName:
      pickStr(r, 'project_name', 'projectName') ||
      pickStr(m, 'project_name', 'projectName') ||
      fallbackProjectName,
    month: pickNum(m, 'month') || pickNum(r, 'month'),
    year: pickNum(m, 'year') || pickNum(r, 'year'),
    partyType: resolvedPartyType,
    contractorId: Number.isFinite(contractorId as number) ? (contractorId as number) : null,
    contractorName,
    plannedValue,
    actualValue,
    collection,
    difference: pickNum(m, 'difference', 'total_difference'),
    achievementPct: pickNum(
      m,
      'achievement_percentage',
      'achievement_pct',
      'achievementPercentage',
      'overall_achievement_percentage',
    ),
    collectionPct: pickNum(
      m,
      'collection_percentage',
      'collection_pct',
      'collectionPercentage',
      'overall_collection_percentage',
    ),
    variancePct: pickNum(m, 'variance_percentage', 'variance_pct', 'variancePercentage'),
    varianceStatus:
      varianceStatusRaw ||
      (id != null || plannedValue || actualValue || collection ? 'ON_TRACK' : ''),
    reason,
    remarks,
  };

  if (!isMeaningfulPvaRecord(record)) return null;
  return record;
}

export function normalizePvaDashboard(payload: unknown): PvaDashboardKpis {
  const data = unwrapData(payload);
  const summary =
    data.summary && typeof data.summary === 'object' && !Array.isArray(data.summary)
      ? (data.summary as Record<string, unknown>)
      : data;

  return {
    totalPlannedValue: pickNum(summary, 'total_planned_value', 'totalPlannedValue'),
    totalActualValue: pickNum(summary, 'total_actual_value', 'totalActualValue'),
    totalCollection: pickNum(summary, 'total_collection', 'totalCollection'),
    totalDifference: pickNum(summary, 'total_difference', 'totalDifference'),
    overallAchievementPct: pickNum(
      summary,
      'overall_achievement_percentage',
      'overall_achievement_pct',
      'overallAchievementPct',
    ),
    overallCollectionPct: pickNum(
      summary,
      'overall_collection_percentage',
      'overall_collection_pct',
      'overallCollectionPct',
    ),
    updatedProjects: pickNum(summary, 'updated_projects', 'updatedProjects'),
    pendingProjects: pickNum(summary, 'pending_projects', 'pendingProjects'),
    totalProjects: pickNum(summary, 'total_projects', 'totalProjects'),
    projectsOnTrack: pickNum(summary, 'projects_on_track', 'projectsOnTrack'),
    projectsMinorVariance: pickNum(summary, 'projects_minor_variance', 'projectsMinorVariance'),
    projectsMajorVariance: pickNum(summary, 'projects_major_variance', 'projectsMajorVariance'),
  };
}

export function normalizePvaProjectBundle(
  payload: unknown,
  projectName: string,
  month: number,
  year: number,
): PvaProjectBundle {
  const data = unwrapData(payload);
  const contractorsRaw = data.contractors;
  const contractors = Array.isArray(contractorsRaw)
    ? contractorsRaw
        .map((row) => normalizePvaRecord(row, projectName))
        .filter((row): row is PvaRecord => isMeaningfulPvaRecord(row))
        .map((row) => ({
          ...row,
          partyType: 'CONTRACTOR' as const,
          month: row.month || month,
          year: row.year || year,
        }))
    : [];

  const sclRaw = normalizePvaRecord(data.scl, projectName);
  const scl =
    isMeaningfulPvaRecord(sclRaw) && sclRaw
      ? { ...sclRaw, partyType: 'SCL' as const, month: sclRaw.month || month, year: sclRaw.year || year }
      : null;

  // contractor_summary is backend-computed — display only, never re-sum
  const summaryRaw = normalizePvaRecord(
    data.contractor_summary ?? data.contractorSummary,
    projectName,
  );
  const contractorSummary =
    summaryRaw &&
    (summaryRaw.plannedValue !== 0 ||
      summaryRaw.actualValue !== 0 ||
      summaryRaw.collection !== 0 ||
      contractors.length > 0)
      ? {
          ...summaryRaw,
          partyType: 'CONTRACTOR_SUMMARY',
          month: summaryRaw.month || month,
          year: summaryRaw.year || year,
        }
      : null;

  return {
    projectName: pickStr(data, 'project_name', 'projectName') || projectName,
    month: pickNum(data, 'month') || month,
    year: pickNum(data, 'year') || year,
    scl,
    contractorSummary,
    contractors,
  };
}

function normalizeTrendPoint(row: unknown, index: number): PvaTrendPoint | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const month = pickNum(r, 'month') || index + 1;
  const scl = (r.scl && typeof r.scl === 'object' ? r.scl : {}) as Record<string, unknown>;
  const contractor = (
    r.contractor_summary && typeof r.contractor_summary === 'object'
      ? r.contractor_summary
      : {}
  ) as Record<string, unknown>;

  return {
    month,
    monthLabel:
      pickStr(r, 'month_name', 'month_label', 'monthLabel', 'label') ||
      MONTH_SHORT[month] ||
      String(month),
    sclPlanned: pickNum(scl, 'planned_value', 'plannedValue'),
    sclActual: pickNum(scl, 'actual_value', 'actualValue'),
    sclCollection: pickNum(scl, 'collection'),
    sclVariancePct: pickNum(scl, 'variance_percentage', 'variance_pct'),
    contractorPlanned: pickNum(contractor, 'planned_value', 'plannedValue'),
    contractorActual: pickNum(contractor, 'actual_value', 'actualValue'),
    contractorCollection: pickNum(contractor, 'collection'),
    contractorVariancePct: pickNum(contractor, 'variance_percentage', 'variance_pct'),
  };
}

export function normalizePvaTrend(
  payload: unknown,
  projectName: string,
  year: number,
): PvaTrendResponse {
  const data = unwrapData(payload);
  const list =
    (Array.isArray(data.months) && data.months) ||
    (Array.isArray(data.points) && data.points) ||
    (Array.isArray(data.trend) && data.trend) ||
    (Array.isArray(data) && data) ||
    (Array.isArray(payload) && payload) ||
    [];

  const points = (list as unknown[])
    .map((row, index) => normalizeTrendPoint(row, index))
    .filter((row): row is PvaTrendPoint => row != null)
    .sort((a, b) => a.month - b.month);

  return {
    projectName: pickStr(data, 'project_name', 'projectName') || projectName,
    year: pickNum(data, 'year') || year,
    points,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  link.remove();
}

/**
 * Build snake_case body for POST upsert / PATCH.
 * Uses planned_type (not party_type). Does not send contractor_id for SCL.
 */
export function toPvaBackendPayload(payload: PvaCreatePayload): Record<string, unknown> {
  const plannedType = payload.planned_type;
  const reason =
    (payload.reason_for_difference ?? payload.reason ?? '').trim() || undefined;

  const body: Record<string, unknown> = {
    project_name: payload.project_name,
    planned_type: plannedType,
    month: payload.month,
    year: payload.year,
    planned_value: payload.planned_value,
    actual_value: payload.actual_value,
    collection: payload.collection,
  };

  if (reason !== undefined) body.reason_for_difference = reason;
  if (payload.remarks !== undefined) body.remarks = payload.remarks.trim();

  if (plannedType === 'CONTRACTOR') {
    if (payload.contractor_id != null) body.contractor_id = payload.contractor_id;
  }

  return body;
}

export function toPvaPatchPayload(payload: PvaPatchPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.planned_value !== undefined) body.planned_value = payload.planned_value;
  if (payload.actual_value !== undefined) body.actual_value = payload.actual_value;
  if (payload.collection !== undefined) body.collection = payload.collection;
  const reason = (payload.reason_for_difference ?? payload.reason ?? '').trim();
  if (payload.reason_for_difference !== undefined || payload.reason !== undefined) {
    body.reason_for_difference = reason;
  }
  if (payload.remarks !== undefined) body.remarks = payload.remarks.trim();
  return body;
}

function coalesceSavedRecord(
  normalized: PvaRecord | null,
  payload: PvaCreatePayload,
  fallbackId?: string | number,
): PvaRecord {
  if (isMeaningfulPvaRecord(normalized)) {
    return {
      ...normalized!,
      id: normalized!.id ?? fallbackId,
      partyType: payload.planned_type,
      contractorId: normalized!.contractorId ?? payload.contractor_id ?? null,
      contractorName: normalized!.contractorName ?? payload.contractor_name ?? null,
    };
  }
  return {
    id: normalized?.id ?? fallbackId,
    projectName: payload.project_name,
    month: payload.month,
    year: payload.year,
    partyType: payload.planned_type,
    contractorId: payload.contractor_id ?? null,
    contractorName: payload.contractor_name ?? null,
    plannedValue: payload.planned_value,
    actualValue: payload.actual_value,
    collection: payload.collection,
    // Calculated fields come from backend — leave 0 until refresh if response empty
    difference: 0,
    achievementPct: 0,
    collectionPct: 0,
    variancePct: 0,
    varianceStatus: 'ON_TRACK',
    reason: payload.reason_for_difference ?? payload.reason,
    remarks: payload.remarks,
  };
}

function detectUpsertAction(
  status: number,
  message?: string,
  hadExistingId?: boolean,
): 'created' | 'updated' {
  if (status === 201) return 'created';
  if (status === 200 && hadExistingId) return 'updated';
  const msg = (message ?? '').toLowerCase();
  if (msg.includes('creat')) return 'created';
  if (msg.includes('updat')) return 'updated';
  // POST upsert: 200 without prior id still means update of existing unique key
  if (status === 200) return 'updated';
  return hadExistingId ? 'updated' : 'created';
}

export const plannedVsActualApi = {
  getDashboard: async (params: { month: number; year: number }) => {
    const response = await api.get(API_ENDPOINTS.PLANNED_VS_ACTUAL.DASHBOARD, { params });
    const data = normalizePvaDashboard(response.data);
    return isMeaningfulPvaDashboard(data) ? data : null;
  },

  getPending: async (params: { month: number; year: number }): Promise<PvaPendingProjects> => {
    const response = await api.get(API_ENDPOINTS.PLANNED_VS_ACTUAL.PENDING, { params });
    const data = unwrapData(response.data);
    const list = Array.isArray(data.pending_projects) ? data.pending_projects : [];
    return {
      month: pickNum(data, 'month') || params.month,
      year: pickNum(data, 'year') || params.year,
      pendingProjects: list.map(String),
      count: pickNum(data, 'count') || list.length,
    };
  },

  getByProject: async (projectName: string, params: { month: number; year: number }) => {
    const response = await api.get(API_ENDPOINTS.PLANNED_VS_ACTUAL.PROJECT(projectName), {
      params,
    });
    return normalizePvaProjectBundle(response.data, projectName, params.month, params.year);
  },

  getByType: async (
    projectName: string,
    plannedType: PvaPartyType,
    params: { month: number; year: number; contractor_id?: number },
  ) => {
    try {
      const response = await api.get(
        API_ENDPOINTS.PLANNED_VS_ACTUAL.BY_TYPE(projectName, plannedType),
        { params },
      );
      const data = unwrapData(response.data);
      const record = normalizePvaRecord(data, projectName);
      if (!isMeaningfulPvaRecord(record)) return null;
      return {
        ...record!,
        partyType: plannedType,
        contractorId: record!.contractorId ?? params.contractor_id ?? null,
        month: record!.month || params.month,
        year: record!.year || params.year,
      };
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      const message = getApiErrorMessage(error, '').toLowerCase();
      if (message.includes('not found') || message.includes('does not exist')) return null;
      throw error;
    }
  },

  getScl: async (projectName: string, params: { month: number; year: number }) =>
    plannedVsActualApi.getByType(projectName, 'SCL', params),

  getContractor: async (
    projectName: string,
    params: { contractor_id: number; month: number; year: number },
  ) =>
    plannedVsActualApi.getByType(projectName, 'CONTRACTOR', {
      month: params.month,
      year: params.year,
      contractor_id: params.contractor_id,
    }),

  getDetail: async (id: string | number, fallbackProjectName = '') => {
    const response = await api.get(API_ENDPOINTS.PLANNED_VS_ACTUAL.DETAIL(id));
    return normalizePvaRecord(unwrapData(response.data), fallbackProjectName);
  },

  getTrend: async (projectName: string, params: { year: number }) => {
    const response = await api.get(API_ENDPOINTS.PLANNED_VS_ACTUAL.TREND(projectName), {
      params,
    });
    return normalizePvaTrend(response.data, projectName, params.year);
  },

  list: async (params?: {
    project_name?: string;
    planned_type?: PvaPartyType;
    contractor_id?: number;
    month?: number;
    year?: number;
    variance_status?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await api.get(API_ENDPOINTS.PLANNED_VS_ACTUAL.LIST, { params });
    return unwrapList(response.data)
      .map((row) => normalizePvaRecord(row, params?.project_name ?? ''))
      .filter((row): row is PvaRecord => isMeaningfulPvaRecord(row));
  },

  /**
   * POST /planned-vs-actual/ — UPSERT by unique key.
   * SCL: project_name + SCL + month + year
   * CONTRACTOR: project_name + CONTRACTOR + contractor_id + month + year
   * Status: 201 Created | 200 OK (updated)
   */
  upsert: async (
    payload: PvaCreatePayload,
    options?: { existingId?: string | number | null },
  ): Promise<{ record: PvaRecord; action: 'created' | 'updated' }> => {
    const response = await api.post(
      API_ENDPOINTS.PLANNED_VS_ACTUAL.LIST,
      toPvaBackendPayload(payload),
    );
    const data = unwrapData(response.data);
    const message =
      response.data && typeof response.data === 'object'
        ? String((response.data as Record<string, unknown>).message ?? '')
        : '';
    const record = coalesceSavedRecord(
      normalizePvaRecord(data, payload.project_name),
      payload,
      options?.existingId ?? undefined,
    );
    const action = detectUpsertAction(
      response.status,
      message,
      options?.existingId != null && options.existingId !== '',
    );
    return { record, action };
  },

  /** Alias for upsert — preferred save path per API guide. */
  save: async (
    payload: PvaCreatePayload,
    options?: { existingId?: string | number | null; knownRecords?: PvaRecord[] },
  ): Promise<{ record: PvaRecord; action: 'created' | 'updated' }> =>
    plannedVsActualApi.upsert(payload, { existingId: options?.existingId }),

  /**
   * PATCH /planned-vs-actual/{id}/ — partial update; backend recalculates metrics.
   */
  patch: async (id: string | number, payload: PvaPatchPayload, projectName = '') => {
    const response = await api.patch(
      API_ENDPOINTS.PLANNED_VS_ACTUAL.DETAIL(id),
      toPvaPatchPayload(payload),
    );
    return normalizePvaRecord(unwrapData(response.data), projectName);
  },

  /** Full-field update via PATCH (same endpoint; send complete values). */
  update: async (id: string | number, payload: PvaCreatePayload) => {
    const response = await api.patch(
      API_ENDPOINTS.PLANNED_VS_ACTUAL.DETAIL(id),
      toPvaBackendPayload(payload),
    );
    return coalesceSavedRecord(
      normalizePvaRecord(unwrapData(response.data), payload.project_name),
      payload,
      id,
    );
  },

  delete: async (id: string | number) => {
    const response = await api.delete(API_ENDPOINTS.PLANNED_VS_ACTUAL.DETAIL(id));
    return response.data;
  },

  export: async (
    format: PvaExportFormat,
    params?: { project_name?: string; month?: number; year?: number },
  ) => {
    const response = await api.get(API_ENDPOINTS.PLANNED_VS_ACTUAL.LIST, {
      params: { ...params, export: format },
      responseType: 'blob',
    });
    const ext = format === 'excel' ? 'xlsx' : format;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(response.data as Blob, `planned-vs-actual-${stamp}.${ext}`);
  },
};

export { getApiErrorMessage };
