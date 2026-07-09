import type { ProjectDatesByProject, ProjectDatesRecord } from '../services/api';
import type { BgEntryStatus, BGEntry } from '../types/bgStatus';
import type {
  BgEntryApi,
  BgSummaryApi,
  ProjectDatesApiRecord,
  ProjectDatesDashboard,
} from '../types/contractorManagement';

const CACHE_VERSION = 1;
const CACHE_PREFIX = 'pmc.projectDates';
const TTL_MS = 30 * 60 * 1000;

export interface CachedProjectDatesRecord {
  id?: number;
  date_type?: 'SCL' | 'CONTRACTOR';
  contractor_name?: string | null;
  project_start: string | null;
  contract_finish: string | null;
  forecast_finish: string | null;
  eot_date: string | null;
  elapsed_duration: number;
  remaining_duration: number;
  forecast_finish_duration: number;
  eot_duration: number;
  delay_days: number;
  eot_delay_days: number;
  current_delay: number;
}

export interface CachedBgEntry {
  id: number;
  bg_type: 'SCL' | 'CONTRACTOR';
  bg_name: string;
  due_date: string;
  updated_date: string | null;
  status: string;
  contractor_name?: string;
}

export interface ProjectDatesSectionCachePayload {
  v: typeof CACHE_VERSION;
  cachedAt: string;
  projectId: string;
  projectName: string;
  scl: CachedProjectDatesRecord | null;
  contractors: CachedProjectDatesRecord[];
  scl_bg: CachedBgEntry[];
  contractor_bg: CachedBgEntry[];
  bg_summary: BgSummaryApi | null;
  selectedContractorId: number | null;
}

function sanitizeScheduleRecord(
  record: ProjectDatesRecord | ProjectDatesApiRecord | null | undefined,
): CachedProjectDatesRecord | null {
  if (!record) return null;
  return {
    id: record.id,
    date_type: record.date_type,
    contractor_name: record.contractor_name ?? null,
    project_start: record.project_start ?? null,
    contract_finish: record.contract_finish ?? null,
    forecast_finish: record.forecast_finish ?? null,
    eot_date: record.eot_date ?? null,
    elapsed_duration: record.elapsed_duration ?? 0,
    remaining_duration: record.remaining_duration ?? 0,
    forecast_finish_duration: record.forecast_finish_duration ?? 0,
    eot_duration: record.eot_duration ?? 0,
    delay_days: record.delay_days ?? 0,
    eot_delay_days: record.eot_delay_days ?? 0,
    current_delay: record.current_delay ?? record.delay_days ?? 0,
  };
}

function sanitizeBgEntry(entry: BgEntryApi): CachedBgEntry {
  return {
    id: entry.id,
    bg_type: entry.bg_type,
    bg_name: entry.bg_name,
    due_date: entry.due_date?.trim() ?? '',
    updated_date: entry.updated_date?.trim() ? entry.updated_date : null,
    status: entry.status,
    contractor_name: entry.contractor_name,
  };
}

function toCachedRecord(record: CachedProjectDatesRecord): ProjectDatesRecord {
  return {
    id: record.id,
    date_type: record.date_type,
    contractor_name: record.contractor_name ?? undefined,
    project_start: record.project_start,
    contract_finish: record.contract_finish,
    forecast_finish: record.forecast_finish,
    eot_date: record.eot_date,
    elapsed_duration: record.elapsed_duration,
    remaining_duration: record.remaining_duration,
    forecast_finish_duration: record.forecast_finish_duration,
    eot_duration: record.eot_duration,
    delay_days: record.delay_days,
    eot_delay_days: record.eot_delay_days,
    current_delay: record.current_delay,
  };
}

function toCachedApiRecord(record: CachedProjectDatesRecord): ProjectDatesApiRecord {
  return {
    id: record.id ?? 0,
    project_name: '',
    date_type: record.date_type ?? 'CONTRACTOR',
    contractor_name: record.contractor_name ?? null,
    contractor: record.contractor_name
      ? { id: record.id ?? 0, contractor_name: record.contractor_name }
      : null,
    project_start: record.project_start,
    contract_finish: record.contract_finish,
    forecast_finish: record.forecast_finish,
    eot_date: record.eot_date,
    elapsed_duration: record.elapsed_duration,
    remaining_duration: record.remaining_duration,
    forecast_finish_duration: record.forecast_finish_duration,
    eot_duration: record.eot_duration,
    delay_days: record.delay_days,
    eot_delay_days: record.eot_delay_days,
    current_delay: record.current_delay,
  };
}

export function buildProjectDatesSectionCachePayload(input: {
  projectId: string;
  projectName: string;
  dashboard: ProjectDatesDashboard;
  selectedContractorId?: number | null;
}): ProjectDatesSectionCachePayload {
  return {
    v: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    projectId: input.projectId,
    projectName: input.projectName,
    scl: sanitizeScheduleRecord(input.dashboard.scl),
    contractors: input.dashboard.contractors
      .map(sanitizeScheduleRecord)
      .filter((row): row is CachedProjectDatesRecord => row != null),
    scl_bg: (input.dashboard.scl_bg ?? []).map(sanitizeBgEntry),
    contractor_bg: (input.dashboard.contractor_bg ?? []).map(sanitizeBgEntry),
    bg_summary: input.dashboard.bg_summary ?? null,
    selectedContractorId: input.selectedContractorId ?? null,
  };
}

export function buildProjectDatesSectionCacheFromBundle(input: {
  projectId: string;
  projectName: string;
  bundle: ProjectDatesByProject;
  selectedContractorId?: number | null;
}): ProjectDatesSectionCachePayload {
  const contractors = (input.bundle.contractors?.length
    ? input.bundle.contractors
    : input.bundle.contractor
      ? [input.bundle.contractor]
      : []
  )
    .map(sanitizeScheduleRecord)
    .filter((row): row is CachedProjectDatesRecord => row != null);

  return {
    v: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    projectId: input.projectId,
    projectName: input.projectName,
    scl: sanitizeScheduleRecord(input.bundle.scl),
    contractors,
    scl_bg: (input.bundle.scl_bg ?? []).map(sanitizeBgEntry),
    contractor_bg: (input.bundle.contractor_bg ?? []).map(sanitizeBgEntry),
    bg_summary: input.bundle.bg_summary ?? null,
    selectedContractorId: input.selectedContractorId ?? null,
  };
}

function normalizeBgStatus(status: string): BgEntryStatus {
  const raw = status.toUpperCase();
  if (raw === 'UPDATED') return 'UPDATED';
  if (raw === 'NOT_UPDATED') return 'NOT_UPDATED';
  return 'YET_TO_UPDATE';
}

function toBgEntryApi(entry: CachedBgEntry): BgEntryApi {
  return {
    id: entry.id,
    bg_type: entry.bg_type,
    bg_name: entry.bg_name,
    due_date: entry.due_date,
    updated_date: entry.updated_date,
    status: normalizeBgStatus(entry.status),
    remarks: '',
    contractor_name: entry.contractor_name,
  };
}

function toBgEntry(entry: CachedBgEntry): BGEntry {
  return {
    id: entry.id,
    bg_type: entry.bg_type,
    bg_name: entry.bg_name,
    due_date: entry.due_date,
    updated_date: entry.updated_date,
    status: normalizeBgStatus(entry.status),
    remarks: '',
    contractor_name: entry.contractor_name,
  };
}

export function projectDatesDashboardFromCache(
  payload: ProjectDatesSectionCachePayload,
): ProjectDatesDashboard {
  return {
    project_name: payload.projectName,
    scl: payload.scl ? toCachedApiRecord(payload.scl) : null,
    contractors: payload.contractors.map(toCachedApiRecord),
    scl_bg: payload.scl_bg.map(toBgEntryApi),
    contractor_bg: payload.contractor_bg.map(toBgEntryApi),
    bg_summary: payload.bg_summary,
  };
}

export function projectDatesBundleFromCache(
  payload: ProjectDatesSectionCachePayload,
): ProjectDatesByProject {
  const contractors = payload.contractors.map(toCachedRecord);
  return {
    project_name: payload.projectName,
    scl: payload.scl ? toCachedRecord(payload.scl) : null,
    contractor: contractors[0] ?? null,
    contractors,
    scl_bg: payload.scl_bg.map(toBgEntry),
    contractor_bg: payload.contractor_bg.map(toBgEntry),
    bg_summary: payload.bg_summary,
  };
}

function cacheKey(userId: string, projectId: string): string {
  return `${CACHE_PREFIX}.v${CACHE_VERSION}.${userId}.${projectId}`;
}

export function readProjectDatesSectionCache(
  userId: string,
  projectId: string,
): ProjectDatesSectionCachePayload | null {
  if (!userId || !projectId || typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(cacheKey(userId, projectId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ProjectDatesSectionCachePayload;
    if (parsed.v !== CACHE_VERSION || parsed.projectId !== projectId) {
      localStorage.removeItem(cacheKey(userId, projectId));
      return null;
    }

    const age = Date.now() - new Date(parsed.cachedAt).getTime();
    if (!Number.isFinite(age) || age > TTL_MS) {
      localStorage.removeItem(cacheKey(userId, projectId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeProjectDatesSectionCache(
  userId: string,
  payload: ProjectDatesSectionCachePayload,
): void {
  if (!userId || !payload.projectId || typeof window === 'undefined') return;

  try {
    localStorage.setItem(cacheKey(userId, payload.projectId), JSON.stringify(payload));
  } catch (error) {
    console.warn('[Project Dates cache] Failed to persist:', error);
  }
}

export function clearProjectDatesSectionCache(userId: string, projectId?: string): void {
  if (typeof window === 'undefined' || !userId) return;

  if (projectId) {
    localStorage.removeItem(cacheKey(userId, projectId));
    return;
  }

  const prefix = `${CACHE_PREFIX}.v${CACHE_VERSION}.${userId}.`;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) localStorage.removeItem(key);
  }
}

export function clearAllProjectDatesSectionCaches(): void {
  if (typeof window === 'undefined') return;

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${CACHE_PREFIX}.`)) localStorage.removeItem(key);
  }
}
