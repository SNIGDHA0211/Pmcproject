/**
 * Contractor Management API — normalized strictly from Backend API Reference (July 2026).
 * Falls back to legacy LIST endpoints when dashboard or contractor-master routes are unavailable.
 */
import axios from 'axios';
import api, {
  getApiErrorMessage,
  normalizeProjectDatesByProject,
  toNum,
  unwrapList,
} from './api';
import { API_ENDPOINTS } from '../config/apiConfig';
import { parseApiAmount } from '../components/contractor/enterpriseTheme';
import type {
  BgEntryApi,
  BgStatusBundleApi,
  BgSummaryApi,
  ContractValueApiRecord,
  ContractValuesContractorSummary,
  ContractValuesDashboard,
  ContractorMasterRecord,
  InvoicingApiRecord,
  InvoicingContractorSummary,
  InvoicingDashboard,
  ProjectDatesApiRecord,
  ProjectDatesDashboard,
  ApiContractorRef,
} from '../types/contractorManagement';

function isMissingEndpointError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 404 || status === 405;
}

function sumContractValuesSummary(
  rows: ContractValueApiRecord[],
): ContractValuesContractorSummary {
  const totals = rows.reduce(
    (acc, row) => ({
      original: acc.original + parseApiAmount(row.original_contract_value),
      excess: acc.excess + parseApiAmount(row.excess_value),
      saving: acc.saving + parseApiAmount(row.saving),
      revised: acc.revised + parseApiAmount(row.revised_value),
    }),
    { original: 0, excess: 0, saving: 0, revised: 0 },
  );
  const increase =
    totals.original > 0 ? ((totals.revised - totals.original) / totals.original) * 100 : 0;
  return {
    original_contract_value: String(totals.original),
    excess_value: String(totals.excess),
    saving: String(totals.saving),
    revised_value: String(totals.revised),
    increase_percentage: increase.toFixed(2),
  };
}

function sumInvoicingSummary(rows: InvoicingApiRecord[]): InvoicingContractorSummary {
  const totals = rows.reduce(
    (acc, row) => ({
      gross: acc.gross + parseApiAmount(row.gross_billed),
      certified: acc.certified + parseApiAmount(row.gross_certified_billed),
      difference: acc.difference + parseApiAmount(row.difference),
    }),
    { gross: 0, certified: 0, difference: 0 },
  );
  const efficiency = totals.gross > 0 ? (totals.certified / totals.gross) * 100 : 0;
  return {
    gross_billed: String(totals.gross),
    gross_certified_billed: String(totals.certified),
    difference: String(totals.difference),
    certification_efficiency: efficiency.toFixed(2),
  };
}

async function fetchContractValuesDashboardWithFallback(
  projectName: string,
): Promise<ContractValuesDashboard | null> {
  try {
    return await contractValuesDashboardApi.getDashboard(projectName);
  } catch (error) {
    if (!isMissingEndpointError(error)) throw error;
  }

  const res = await api.get(API_ENDPOINTS.CONTRACT_VALUES.LIST, {
    params: { project_name: projectName },
  });
  const rows = unwrapList(res.data)
    .map(normalizeContractValueRecord)
    .filter((row): row is ContractValueApiRecord => row != null);

  if (!rows.length) return null;

  const scl = rows.find((row) => row.contract_type === 'SCL') ?? null;
  const contractorRows = rows.filter((row) => row.contract_type === 'CONTRACTOR');

  return {
    project_name: projectName,
    scl,
    contractor_summary: sumContractValuesSummary(contractorRows),
    contractors: contractorRows.map((cv) => {
      const contractor =
        cv.contractor ??
        resolveContractorRefFromRecord(cv as unknown as Record<string, unknown>);
      return {
        id: cv.id,
        contractor_name: cv.contractor_name ?? contractor?.contractor_name ?? 'Contractor',
        contractor: contractor ?? { id: 0, contractor_name: cv.contractor_name ?? 'Contractor' },
        contract_values: cv,
      };
    }),
  };
}

async function fetchInvoicingDashboardWithFallback(
  projectName: string,
): Promise<InvoicingDashboard | null> {
  try {
    return await invoicingDashboardApi.getDashboard(projectName);
  } catch (error) {
    if (!isMissingEndpointError(error)) throw error;
  }

  const res = await api.get(API_ENDPOINTS.INVOICING.LIST, {
    params: { project_name: projectName },
  });
  const rows = unwrapList(res.data)
    .map(normalizeInvoicingRecord)
    .filter((row): row is InvoicingApiRecord => row != null);

  if (!rows.length) return null;

  const scl = rows.find((row) => row.invoice_type === 'SCL') ?? null;
  const contractorRows = rows.filter((row) => row.invoice_type === 'CONTRACTOR');

  return {
    project_name: projectName,
    scl,
    contractor_summary: sumInvoicingSummary(contractorRows),
    contractors: contractorRows.map((inv) => {
      const contractor =
        inv.contractor ??
        resolveContractorRefFromRecord(inv as unknown as Record<string, unknown>);
      return {
        id: inv.id,
        contractor_name: inv.contractor_name ?? contractor?.contractor_name ?? 'Contractor',
        contractor: contractor ?? { id: 0, contractor_name: inv.contractor_name ?? 'Contractor' },
        invoicing: inv,
      };
    }),
  };
}

async function fetchProjectDatesDashboardWithFallback(
  projectName: string,
): Promise<ProjectDatesDashboard | null> {
  try {
    return await projectDatesDashboardApi.getDashboard(projectName);
  } catch (error) {
    if (!isMissingEndpointError(error)) throw error;
  }

  const [datesRes, bgRes] = await Promise.all([
    api.get(API_ENDPOINTS.PROJECT_DATES.PROJECT(projectName)),
    api.get(API_ENDPOINTS.PROJECT_DATES.BG_STATUS(projectName)).catch(() => null),
  ]);

  const legacy = normalizeProjectDatesByProject(datesRes.data, projectName);
  const bgPayload = bgRes?.data
    ? unwrapData<Record<string, unknown>>(bgRes.data)
    : null;

  return normalizeProjectDatesDashboard({
    project_name: legacy.project_name ?? projectName,
    scl: legacy.scl,
    contractors: legacy.contractors,
    contractor: legacy.contractor,
    contractor_bg: bgPayload?.contractor_bg ?? legacy.contractor_bg,
    scl_bg: bgPayload?.scl_bg ?? legacy.scl_bg,
    bg_summary: bgPayload?.bg_summary ?? legacy.bg_summary,
  });
}

function deriveContractorMastersFromDashboards(
  projectName: string,
  contractValues: ContractValuesDashboard | null,
  invoicing: InvoicingDashboard | null,
  projectDates: ProjectDatesDashboard | null,
): ContractorMasterRecord[] {
  const byId = new Map<number, ContractorMasterRecord>();

  const add = (id: number, name: string, contractor?: ApiContractorRef | null) => {
    const contractorName = name.trim();
    if (!contractorName) return;
    const masterId = contractor?.id ?? id;
    if (!masterId) return;
    if (!byId.has(masterId)) {
      byId.set(masterId, {
        id: masterId,
        project_name: projectName,
        contractor_name: contractorName,
        status: 'ACTIVE',
        contractor: contractor ?? { id: masterId, contractor_name: contractorName },
      });
    }
  };

  contractValues?.contractors.forEach((row) => {
    add(row.contractor?.id ?? row.id, row.contractor_name, row.contractor);
  });
  invoicing?.contractors.forEach((row) => {
    add(row.contractor?.id ?? row.id, row.contractor_name, row.contractor);
  });
  projectDates?.contractors.forEach((row) => {
    add(row.contractor?.id ?? row.id, row.contractor_name ?? '', row.contractor);
  });

  return [...byId.values()].sort((a, b) =>
    a.contractor_name.localeCompare(b.contractor_name),
  );
}

function unwrapData<T>(raw: unknown): T {
  const row = raw as Record<string, unknown>;
  if (row && typeof row === 'object' && 'success' in row && 'data' in row) {
    return row.data as T;
  }
  return raw as T;
}

function parseContractorRef(raw: unknown): ApiContractorRef | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = toNum(r.id);
  const name = String(r.contractor_name ?? r.contractorName ?? '').trim();
  if (!id || !name) return null;
  return { id, contractor_name: name };
}

function resolveContractorRefFromRecord(r: Record<string, unknown>): ApiContractorRef | null {
  const nested = parseContractorRef(r.contractor);
  if (nested) return nested;
  const id = toNum(r.contractor_id ?? r.contractorId);
  const name = String(r.contractor_name ?? r.contractorName ?? '').trim();
  if (!id) return null;
  return { id, contractor_name: name || `Contractor ${id}` };
}

function strVal(v: unknown, fallback = '0'): string {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}

function numVal(v: unknown, fallback = 0): number {
  const n = toNum(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeContractorMaster(raw: unknown): ContractorMasterRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = toNum(r.id);
  const name = String(r.contractor_name ?? r.contractorName ?? '').trim();
  if (!id || !name) return null;
  return {
    id,
    project_name: String(r.project_name ?? r.projectName ?? ''),
    contractor_name: name,
    contractor_code: (r.contractor_code ?? r.contractorCode ?? null) as string | null,
    contact_person: (r.contact_person ?? r.contactPerson ?? null) as string | null,
    phone: (r.phone ?? null) as string | null,
    email: (r.email ?? null) as string | null,
    address: (r.address ?? null) as string | null,
    status: String(r.status ?? 'ACTIVE').toUpperCase() as ContractorMasterRecord['status'],
    contractor: parseContractorRef(r.contractor) ?? { id, contractor_name: name },
    created_at: r.created_at as string | undefined,
    updated_at: r.updated_at as string | undefined,
  };
}

export function normalizeContractValueRecord(raw: unknown): ContractValueApiRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = toNum(r.id);
  if (!id) return null;
  return {
    id,
    project_name: String(r.project_name ?? r.projectName ?? ''),
    contract_type: String(r.contract_type ?? r.contractType ?? 'SCL').toUpperCase() as
      | 'SCL'
      | 'CONTRACTOR',
    contractor_name: (r.contractor_name ?? r.contractorName ?? null) as string | null,
    contractor: resolveContractorRefFromRecord(r),
    original_contract_value: strVal(r.original_contract_value ?? r.originalContractValue),
    excess_value: strVal(r.excess_value ?? r.excessValue ?? r.approvedVO),
    saving: strVal(r.saving ?? r.potentialPendingVO),
    revised_value: strVal(r.revised_value ?? r.revisedValue ?? r.revisedContractValue),
    increase_percentage: strVal(
      r.increase_percentage ?? r.increasePercentage ?? r.growth_percentage,
      '0.00',
    ),
    created_at: r.created_at as string | undefined,
    updated_at: r.updated_at as string | undefined,
  };
}

export function normalizeContractValuesDashboard(raw: unknown): ContractValuesDashboard {
  const payload = unwrapData<Record<string, unknown>>(raw);
  const summaryRaw = (payload.contractor_summary ?? payload.contractorSummary ?? {}) as Record<
    string,
    unknown
  >;

  const contractors = (Array.isArray(payload.contractors) ? payload.contractors : [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const cv = normalizeContractValueRecord(r.contract_values ?? r.contractValues ?? r);
      const contractor =
        parseContractorRef(r.contractor) ??
        (cv
          ? resolveContractorRefFromRecord(cv as unknown as Record<string, unknown>)
          : null) ??
        resolveContractorRefFromRecord(r);
      return {
        id: toNum(r.id) || cv?.id || 0,
        contractor_name: String(
          r.contractor_name ?? contractor?.contractor_name ?? cv?.contractor_name ?? '',
        ),
        contractor: contractor ?? { id: 0, contractor_name: '' },
        contract_values: cv!,
      };
    })
    .filter((row) => row.contract_values);

  return {
    project_name: String(payload.project_name ?? payload.projectName ?? ''),
    scl: normalizeContractValueRecord(payload.scl),
    contractor_summary: {
      original_contract_value: strVal(summaryRaw.original_contract_value),
      excess_value: strVal(summaryRaw.excess_value),
      saving: strVal(summaryRaw.saving),
      revised_value: strVal(summaryRaw.revised_value),
      increase_percentage: strVal(summaryRaw.increase_percentage, '0.00'),
    },
    contractors,
  };
}

export function normalizeInvoicingRecord(raw: unknown): InvoicingApiRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = toNum(r.id);
  if (!id) return null;
  return {
    id,
    project_name: String(r.project_name ?? r.projectName ?? ''),
    invoice_type: String(r.invoice_type ?? r.invoiceType ?? 'SCL').toUpperCase() as
      | 'SCL'
      | 'CONTRACTOR',
    contractor_name: (r.contractor_name ?? r.contractorName ?? null) as string | null,
    contractor: resolveContractorRefFromRecord(r),
    gross_billed: strVal(r.gross_billed ?? r.grossBilled),
    gross_certified_billed: strVal(
      r.gross_certified_billed ?? r.grossCertifiedBilled ?? r.netBilledWithoutVAT,
    ),
    difference: strVal(r.difference ?? r.netCollected),
    certification_efficiency: strVal(
      r.certification_efficiency ?? r.certificationEfficiency ?? r.collection_percentage,
      '0.00',
    ),
    created_at: r.created_at as string | undefined,
    updated_at: r.updated_at as string | undefined,
  };
}

export function normalizeInvoicingDashboard(raw: unknown): InvoicingDashboard {
  const payload = unwrapData<Record<string, unknown>>(raw);
  const summaryRaw = (payload.contractor_summary ?? payload.contractorSummary ?? {}) as Record<
    string,
    unknown
  >;

  const contractors = (Array.isArray(payload.contractors) ? payload.contractors : [])
    .map((row) => {
      const r = row as Record<string, unknown>;
      const inv = normalizeInvoicingRecord(r.invoicing ?? r);
      const contractor =
        parseContractorRef(r.contractor) ??
        (inv
          ? resolveContractorRefFromRecord(inv as unknown as Record<string, unknown>)
          : null) ??
        resolveContractorRefFromRecord(r);
      return {
        id: toNum(r.id) || inv?.id || 0,
        contractor_name: String(
          r.contractor_name ?? contractor?.contractor_name ?? inv?.contractor_name ?? '',
        ),
        contractor: contractor ?? { id: 0, contractor_name: '' },
        invoicing: inv!,
      };
    })
    .filter((row) => row.invoicing);

  return {
    project_name: String(payload.project_name ?? payload.projectName ?? ''),
    scl: normalizeInvoicingRecord(payload.scl),
    contractor_summary: {
      gross_billed: strVal(summaryRaw.gross_billed),
      gross_certified_billed: strVal(summaryRaw.gross_certified_billed),
      difference: strVal(summaryRaw.difference),
      certification_efficiency: strVal(summaryRaw.certification_efficiency, '0.00'),
    },
    contractors,
  };
}

export function normalizeBgSummary(raw: unknown): BgSummaryApi | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    total_bg: numVal(r.total_bg),
    updated: numVal(r.updated),
    yet_to_update: numVal(r.yet_to_update),
    not_updated: numVal(r.not_updated),
    compliance_percentage: numVal(r.compliance_percentage),
  };
}

export function normalizeBgEntry(raw: unknown): BgEntryApi | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = toNum(r.id);
  if (!id) return null;
  return {
    id,
    bg_type: String(r.bg_type ?? r.bgType ?? 'CONTRACTOR').toUpperCase() as 'SCL' | 'CONTRACTOR',
    bg_name: String(r.bg_name ?? r.bgName ?? ''),
    due_date: String(r.due_date ?? r.dueDate ?? ''),
    updated_date: (r.updated_date ?? r.updatedDate ?? null) as string | null,
    status: String(r.status ?? ''),
    remarks: String(r.remarks ?? ''),
    contractor_name: (r.contractor_name ?? r.contractorName ?? undefined) as string | undefined,
  };
}

export function normalizeBgStatusBundle(raw: unknown): BgStatusBundleApi {
  const payload = unwrapData<Record<string, unknown>>(raw);
  const contractor_bg = (Array.isArray(payload.contractor_bg) ? payload.contractor_bg : [])
    .map(normalizeBgEntry)
    .filter((e): e is BgEntryApi => e != null);
  const scl_bg = (Array.isArray(payload.scl_bg) ? payload.scl_bg : [])
    .map(normalizeBgEntry)
    .filter((e): e is BgEntryApi => e != null);
  return {
    contractor_bg,
    scl_bg,
    bg_summary: normalizeBgSummary(payload.bg_summary) ?? {
      total_bg: 0,
      updated: 0,
      yet_to_update: 0,
      not_updated: 0,
      compliance_percentage: 0,
    },
  };
}

export function normalizeProjectDatesRecord(raw: unknown): ProjectDatesApiRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = toNum(r.id);
  if (!id) return null;
  const bgRaw = r.bg_status ?? r.bgStatus;
  return {
    id,
    project_name: String(r.project_name ?? r.projectName ?? ''),
    date_type: String(r.date_type ?? r.dateType ?? 'SCL').toUpperCase() as 'SCL' | 'CONTRACTOR',
    contractor_name: (r.contractor_name ?? r.contractorName ?? null) as string | null,
    contractor: resolveContractorRefFromRecord(r),
    project_start: (r.project_start ?? r.projectStart ?? null) as string | null,
    contract_finish: (r.contract_finish ?? r.contractFinish ?? null) as string | null,
    forecast_finish: (r.forecast_finish ?? r.forecastFinish ?? null) as string | null,
    eot_date: (r.eot_date ?? r.eotDate ?? null) as string | null,
    elapsed_duration: numVal(r.elapsed_duration ?? r.elapsedDuration),
    remaining_duration: numVal(r.remaining_duration ?? r.remainingDuration),
    forecast_finish_duration: numVal(r.forecast_finish_duration),
    eot_duration: numVal(r.eot_duration),
    delay_days: numVal(r.delay_days ?? r.delayDays),
    eot_delay_days: numVal(r.eot_delay_days),
    current_delay: numVal(r.current_delay ?? r.currentDelay),
    bg_status: bgRaw ? normalizeBgStatusBundle(bgRaw) : undefined,
    created_at: r.created_at as string | undefined,
    updated_at: r.updated_at as string | undefined,
  };
}

export function normalizeProjectDatesDashboard(raw: unknown): ProjectDatesDashboard {
  const payload = unwrapData<Record<string, unknown>>(raw);

  const contractorsRaw = Array.isArray(payload.contractors) ? payload.contractors : [];
  let contractors = contractorsRaw
    .map(normalizeProjectDatesRecord)
    .filter((r): r is ProjectDatesApiRecord => r != null);

  const legacy = normalizeProjectDatesRecord(payload.contractor);
  if (legacy && !contractors.some((c) => c.id === legacy.id)) {
    contractors.push(legacy);
  }

  const bgBundle = normalizeBgStatusBundle({
    contractor_bg: payload.contractor_bg,
    scl_bg: payload.scl_bg,
    bg_summary: payload.bg_summary,
  });

  return {
    project_name: String(payload.project_name ?? payload.projectName ?? ''),
    scl: normalizeProjectDatesRecord(payload.scl),
    contractors,
    contractor_bg: bgBundle.contractor_bg,
    scl_bg: bgBundle.scl_bg,
    bg_summary: bgBundle.bg_summary,
  };
}

export const contractorMasterApi = {
  list: async (projectName: string, params?: { include_inactive?: boolean; status?: string }) => {
    try {
      const res = await api.get(API_ENDPOINTS.CONTRACTOR_MASTER.LIST(projectName), {
        params: {
          ...(params?.include_inactive ? { include_inactive: 'true' } : {}),
          ...(params?.status ? { status: params.status } : {}),
        },
      });
      const data = unwrapData<unknown[]>(res.data);
      return (Array.isArray(data) ? data : [])
        .map(normalizeContractorMaster)
        .filter((c): c is ContractorMasterRecord => c != null);
    } catch (error) {
      if (isMissingEndpointError(error)) return [];
      throw error;
    }
  },

  create: async (
    projectName: string,
    body: {
      contractor_name: string;
      contractor_code?: string;
      contact_person?: string;
      phone?: string;
      email?: string;
      address?: string;
    },
  ) => {
    try {
      const res = await api.post(API_ENDPOINTS.CONTRACTOR_MASTER.CREATE(projectName), body);
      return normalizeContractorMaster(unwrapData(res.data));
    } catch (error) {
      if (isMissingEndpointError(error)) {
        throw new Error(
          'Contractor Master API is not available on this server. Add the contractor via Project Dates or financial records instead.',
        );
      }
      throw error;
    }
  },

  patch: async (id: number, body: Partial<ContractorMasterRecord>) => {
    const res = await api.patch(API_ENDPOINTS.CONTRACTOR_MASTER.DETAIL(id), body);
    return normalizeContractorMaster(unwrapData(res.data));
  },

  deactivate: async (id: number) => {
    const res = await api.delete(API_ENDPOINTS.CONTRACTOR_MASTER.DETAIL(id));
    const data = unwrapData(res.data);
    return data ? normalizeContractorMaster(data) : null;
  },
};

export const contractValuesDashboardApi = {
  getDashboard: async (projectName: string) => {
    const res = await api.get(API_ENDPOINTS.CONTRACT_VALUES.PROJECT_DASHBOARD(projectName));
    return normalizeContractValuesDashboard(res.data);
  },

  getByContractor: async (projectName: string, contractorId: number) => {
    const res = await api.get(API_ENDPOINTS.CONTRACT_VALUES.BY_TYPE(projectName, 'CONTRACTOR'), {
      params: { contractor_id: contractorId },
    });
    const data = unwrapData<unknown>(res.data);
    const row = Array.isArray(data) ? data[0] : data;
    return normalizeContractValueRecord(row);
  },

  upsert: async (body: {
    project_name: string;
    contract_type: 'SCL' | 'CONTRACTOR';
    contractor_id?: number;
    original_contract_value?: string | number;
    excess_value?: string | number;
    saving?: string | number;
  }) => {
    const res = await api.post(API_ENDPOINTS.CONTRACT_VALUES.LIST, body);
    return normalizeContractValueRecord(unwrapData(res.data));
  },

  patch: async (id: number, body: Record<string, unknown>) => {
    const res = await api.patch(API_ENDPOINTS.CONTRACT_VALUES.DETAIL(id), body);
    return normalizeContractValueRecord(unwrapData(res.data));
  },
};

export const invoicingDashboardApi = {
  getDashboard: async (projectName: string) => {
    const res = await api.get(API_ENDPOINTS.INVOICING.PROJECT_DASHBOARD(projectName));
    return normalizeInvoicingDashboard(res.data);
  },

  getByContractor: async (projectName: string, contractorId: number) => {
    const res = await api.get(API_ENDPOINTS.INVOICING.BY_TYPE(projectName, 'CONTRACTOR'), {
      params: { contractor_id: contractorId },
    });
    const data = unwrapData<unknown>(res.data);
    const row = Array.isArray(data) ? data[0] : data;
    return normalizeInvoicingRecord(row);
  },

  upsert: async (body: {
    project_name: string;
    invoice_type: 'SCL' | 'CONTRACTOR';
    contractor_id?: number;
    gross_billed?: string | number;
    gross_certified_billed?: string | number;
  }) => {
    const res = await api.post(API_ENDPOINTS.INVOICING.LIST, body);
    return normalizeInvoicingRecord(unwrapData(res.data));
  },

  patch: async (id: number, body: Record<string, unknown>) => {
    const res = await api.patch(API_ENDPOINTS.INVOICING.DETAIL(id), body);
    return normalizeInvoicingRecord(unwrapData(res.data));
  },
};

export const projectDatesDashboardApi = {
  getDashboard: async (projectName: string) => {
    const res = await api.get(API_ENDPOINTS.PROJECT_DATES.PROJECT(projectName));
    return normalizeProjectDatesDashboard(res.data);
  },

  createSchedule: async (body: {
    project_name: string;
    date_type: 'SCL' | 'CONTRACTOR';
    contractor_id?: number;
    project_start: string;
    contract_finish: string;
    forecast_finish: string;
    eot_date: string;
  }) => {
    const res = await api.post(API_ENDPOINTS.PROJECT_DATES.LIST, body);
    return normalizeProjectDatesRecord(unwrapData(res.data));
  },

  patchSchedule: async (id: number, body: Record<string, unknown>) => {
    const res = await api.patch(API_ENDPOINTS.PROJECT_DATES.DETAIL(id), body);
    return normalizeProjectDatesRecord(unwrapData(res.data));
  },

  deleteSchedule: async (id: number) => {
    await api.delete(API_ENDPOINTS.PROJECT_DATES.DETAIL(id));
  },
};

export const bgStatusDashboardApi = {
  get: async (projectName: string, contractorId?: number) => {
    const res = await api.get(API_ENDPOINTS.PROJECT_DATES.BG_STATUS(projectName), {
      params: contractorId ? { contractor_id: contractorId } : undefined,
    });
    return normalizeBgStatusBundle(res.data);
  },

  create: async (
    projectName: string,
    body: {
      bg_type: 'SCL' | 'CONTRACTOR';
      bg_name: string;
      due_date: string;
      contractor_id?: number;
      updated_date?: string;
      remarks?: string;
    },
  ) => {
    const res = await api.post(API_ENDPOINTS.PROJECT_DATES.BG_STATUS(projectName), body);
    return normalizeBgEntry(unwrapData(res.data));
  },

  patch: async (id: number, body: Record<string, unknown>) => {
    const res = await api.patch(API_ENDPOINTS.PROJECT_DATES.BG_STATUS_DETAIL(id), body);
    return normalizeBgEntry(unwrapData(res.data));
  },

  delete: async (id: number) => {
    await api.delete(API_ENDPOINTS.PROJECT_DATES.BG_STATUS_DETAIL(id));
  },
};

export async function fetchContractorManagementBundle(projectName: string) {
  const [mastersResult, contractValuesResult, invoicingResult, projectDatesResult] =
    await Promise.allSettled([
      contractorMasterApi.list(projectName),
      fetchContractValuesDashboardWithFallback(projectName),
      fetchInvoicingDashboardWithFallback(projectName),
      fetchProjectDatesDashboardWithFallback(projectName),
    ]);

  if (mastersResult.status === 'rejected') {
    throw mastersResult.reason;
  }

  const dashboardFailures = [contractValuesResult, invoicingResult, projectDatesResult].filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (dashboardFailures.length === 3) {
    throw dashboardFailures[0].reason;
  }

  let masters = mastersResult.value;
  const contractValues =
    contractValuesResult.status === 'fulfilled' ? contractValuesResult.value : null;
  const invoicing = invoicingResult.status === 'fulfilled' ? invoicingResult.value : null;
  const projectDates =
    projectDatesResult.status === 'fulfilled' ? projectDatesResult.value : null;

  if (!masters.length) {
    masters = deriveContractorMastersFromDashboards(
      projectName,
      contractValues,
      invoicing,
      projectDates,
    );
  }

  return { masters, contractValues, invoicing, projectDates };
}

export { getApiErrorMessage };
