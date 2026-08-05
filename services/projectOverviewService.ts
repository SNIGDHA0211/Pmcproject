import api, { getApiErrorMessage } from './api';
import { API_ENDPOINTS } from '../config/apiConfig';
import type { Project } from '../types';
import type { HealthLabel, ProjectVital, ProjectVitalsCard, VitalStatus } from '../utils/projectVitals';
import { isProjectCompleted } from '../utils/projectCompletion';
import { areDuplicateProjectTitles, normalizeProjectTitleKey } from '../utils/hseSiteEngineerProjects';
import {
  isExcludedPmcTlProjectTitle,
  isSyntheticExecutiveProjectId,
} from '../utils/pmcHeadExecutiveProjects';

/** KPI chip from lightweight Project Overview API */
export interface ProjectOverviewKpi {
  percentage: number | null;
  status: string;
}

export interface ProjectOverviewTeamLeader {
  id: number | string | null;
  username?: string | null;
  full_name?: string | null;
}

/** One row from GET /api/projects/overview/ */
export interface ProjectOverviewItem {
  project_id: number | string;
  project_name: string;
  project_code?: string;
  client?: string | null;
  project_type?: string;
  project_icon?: string;
  /** DB lifecycle: active | completed | planning | … */
  status?: string;
  /**
   * Health label from backend (live KPIs):
   * On Track | Watch | At Risk | Critical | Completed | No Data
   */
  project_status?: string | null;
  health_score?: number | null;
  progress?: ProjectOverviewKpi | null;
  time?: ProjectOverviewKpi | null;
  cost?: ProjectOverviewKpi | null;
  quality?: ProjectOverviewKpi | null;
  safety?: ProjectOverviewKpi | null;
  team_leader?: ProjectOverviewTeamLeader | null;
  location?: string | null;
  issues_count?: number | null;
  dpr_count?: number | null;
  last_updated?: string | null;
  compare_enabled?: boolean;
  completed_at?: string | null;
  completed_on?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  completion_notes?: string | null;
}

export interface ProjectOverviewResponse {
  success: boolean;
  message?: string;
  count?: number;
  data?: ProjectOverviewItem[];
  /** Present when ?paginate=true */
  page?: number;
  page_size?: number;
  total_pages?: number;
}

export interface ProjectOverviewQuery {
  search?: string;
  client?: string;
  /** Filter by lifecycle `status` (active, completed, …) — not project_status. */
  status?: string | string[];
  project_name?: string;
  ordering?: string;
  /** Dashboard should omit this (never paginate=true) unless intentionally paging. */
  paginate?: boolean;
  page?: number;
  page_size?: number;
}

export interface ProjectOverviewResult {
  count: number;
  cards: ProjectVitalsCard[];
  raw: ProjectOverviewItem[];
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

function isNoDataStatus(raw: string | null | undefined): boolean {
  return /no\s*data/i.test(String(raw ?? '').trim());
}

function toVitalStatus(raw: string | null | undefined): VitalStatus {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!s || isNoDataStatus(s)) return 'unknown';
  if (/(excellent|on\s*track|healthy|good|completed)/.test(s)) return 'healthy';
  if (/(watch|warning)/.test(s)) return 'watch';
  if (/(at\s*risk)/.test(s)) return 'watch';
  if (/(delay|critical|risk|poor|bad)/.test(s)) return 'critical';
  return 'unknown';
}

function toPercent(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Map overview `project_status` → card HealthLabel. */
export function mapProjectStatusToHealthLabel(
  raw: string | null | undefined,
): HealthLabel | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (/no\s*data/.test(s)) return 'NO DATA';
  if (/completed/.test(s)) return 'COMPLETED';
  if (/critical/.test(s)) return 'CRITICAL';
  if (/at\s*risk/.test(s)) return 'AT RISK';
  if (/watch/.test(s)) return 'WATCH';
  if (/on\s*track/.test(s)) return 'ON TRACK';
  return null;
}

function healthLabelFromScore(score: number | null): HealthLabel {
  if (score == null) return 'NO DATA';
  if (score < 50) return 'CRITICAL';
  if (score < 65) return 'AT RISK';
  if (score < 80) return 'WATCH';
  return 'ON TRACK';
}

function formatRelativeUpdate(iso?: string | null): string {
  if (!iso) return 'No recent update';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return 'No recent update';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Updated today';
  if (days === 1) return 'Last update: 1 day ago';
  return `Last update: ${days} days ago`;
}

function teamLeaderDisplayName(tl: ProjectOverviewTeamLeader | null | undefined): string {
  if (!tl) return 'Not Assigned';
  const full = String(tl.full_name ?? '').trim();
  if (full) return full;
  const username = String(tl.username ?? '').trim();
  if (username) return username;
  return 'Not Assigned';
}

/**
 * Map KPI { percentage, status }.
 * Missing module data: percentage 0 + status "No Data" → treat percent as null
 * (never stub Safety at 100%).
 */
function kpiToVital(
  key: ProjectVital['key'],
  label: string,
  kpi: ProjectOverviewKpi | null | undefined,
): ProjectVital {
  const statusLabel = String(kpi?.status ?? '').trim() || undefined;
  const noData = !statusLabel || isNoDataStatus(statusLabel);
  const percent = noData ? null : toPercent(kpi?.percentage);
  return {
    key,
    label,
    percent,
    status: toVitalStatus(statusLabel),
    statusLabel: statusLabel || (noData ? 'No Data' : undefined),
    note: statusLabel || (percent == null ? 'No Data' : `${percent}%`),
  };
}

/** Map overview API row → existing dashboard card model (no KPI recalculation). */
export function mapOverviewItemToVitalsCard(item: ProjectOverviewItem): ProjectVitalsCard {
  const overallScore = toPercent(item.health_score);
  const progressStatus = String(item.progress?.status ?? '').trim();
  const progressNoData = !progressStatus || isNoDataStatus(progressStatus);
  const progressPct = progressNoData ? null : toPercent(item.progress?.percentage);

  const quality = kpiToVital('drawings', 'Quality', item.quality);
  const timeVital = kpiToVital('schedule', 'Time', item.time);
  const costVital = kpiToVital('budget', 'Cost', item.cost);
  const safetyVital = kpiToVital('safety', 'Safety', item.safety);
  const vitals = [timeVital, costVital, quality, safetyVital];
  const allKpisNoData =
    progressNoData &&
    vitals.every(
      (v) =>
        v.percent == null ||
        v.status === 'unknown' ||
        isNoDataStatus(v.statusLabel),
    );

  const lifecycleRaw = String(item.status ?? '').trim();
  const lifecycleStatus = lifecycleRaw || null;
  const statusRaw = lifecycleRaw.toLowerCase();
  const completedAt = item.completed_at ?? item.completed_on ?? null;
  const completedBy =
    item.completed_by_name ??
    (typeof item.completed_by === 'string' ? item.completed_by : null);
  const isCompleted =
    statusRaw === 'completed' ||
    statusRaw === 'approved' ||
    Boolean(completedAt) ||
    mapProjectStatusToHealthLabel(item.project_status) === 'COMPLETED';

  const projectStatusLabel = String(item.project_status ?? '').trim() || undefined;
  // Prefer backend project_status. If missing and all KPIs are empty → new / no-data
  // project (never force Critical from a low stub score).
  const healthLabel =
    mapProjectStatusToHealthLabel(item.project_status) ??
    (isCompleted
      ? 'COMPLETED'
      : allKpisNoData
        ? 'NO DATA'
        : healthLabelFromScore(overallScore));

  const isNoDataProject = healthLabel === 'NO DATA' || allKpisNoData;

  return {
    projectId: String(item.project_id),
    title: String(item.project_name ?? '').trim() || `Project ${item.project_id}`,
    location: String(item.location ?? '').trim() || '—',
    pmName: teamLeaderDisplayName(item.team_leader),
    client: String(item.client ?? '').trim() || '—',
    // Do not let stub low scores on empty/new projects drag the portfolio average.
    overallScore: isNoDataProject ? null : overallScore,
    healthLabel,
    projectStatusLabel: projectStatusLabel || (isNoDataProject ? 'No Data' : undefined),
    lifecycleStatus,
    progressPct,
    progressStatusLabel: progressStatus || undefined,
    openIssues: Math.max(0, Number(item.issues_count) || 0),
    dprCount: Math.max(0, Number(item.dpr_count) || 0),
    drawingApprovalPct: quality.percent,
    vitals,
    trend: 'stable',
    lastUpdate: formatRelativeUpdate(item.last_updated),
    compareEnabled: item.compare_enabled !== false,
    isCompleted,
    completedAt,
    completedBy,
  };
}

function buildOverviewParams(query: ProjectOverviewQuery = {}): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const search = String(query.search ?? '').trim();
  if (search) params.search = search;

  const client = String(query.client ?? '').trim();
  if (client) params.client = client;

  if (query.status != null) {
    const status = Array.isArray(query.status)
      ? query.status.map((s) => String(s).trim()).filter(Boolean).join(',')
      : String(query.status).trim();
    if (status) params.status = status;
  }

  const projectName = String(query.project_name ?? '').trim();
  if (projectName) params.project_name = projectName;

  const ordering = String(query.ordering ?? '').trim();
  if (ordering) params.ordering = ordering;

  if (query.paginate === true) {
    params.paginate = 'true';
    if (query.page != null && Number(query.page) > 0) params.page = Number(query.page);
    if (query.page_size != null && Number(query.page_size) > 0) {
      params.page_size = Number(query.page_size);
    }
  }

  return params;
}

/**
 * Lightweight Project Overview — single request for all accessible project cards.
 * Do not pass paginate=true for the PMC Head dashboard unless intentionally paging.
 */
export async function getProjectOverview(
  query: ProjectOverviewQuery = {},
  options?: { signal?: AbortSignal },
): Promise<ProjectOverviewResult> {
  const response = await api.get<ProjectOverviewResponse>(API_ENDPOINTS.PROJECTS.OVERVIEW, {
    params: buildOverviewParams(query),
    ...(options?.signal ? { signal: options.signal } : {}),
  });

  const body = response.data;
  if (!body || body.success !== true) {
    throw new Error(
      (body && typeof body.message === 'string' && body.message.trim()) ||
        'Unable to load project overview.',
    );
  }

  const raw = Array.isArray(body.data) ? body.data : [];
  const visible = raw.filter(
    (item) =>
      !isExcludedPmcTlProjectTitle(item.project_name) &&
      !isExcludedPmcTlProjectTitle(item.client),
  );
  return {
    count: typeof body.count === 'number' ? body.count : visible.length,
    cards: visible.map(mapOverviewItemToVitalsCard),
    raw: visible,
    page: typeof body.page === 'number' ? body.page : undefined,
    pageSize: typeof body.page_size === 'number' ? body.page_size : undefined,
    totalPages: typeof body.total_pages === 'number' ? body.total_pages : undefined,
  };
}

export async function searchProjects(search: string, query: ProjectOverviewQuery = {}) {
  return getProjectOverview({ ...query, search });
}

export async function filterProjects(filters: ProjectOverviewQuery) {
  return getProjectOverview(filters);
}

export async function sortProjects(ordering: string, query: ProjectOverviewQuery = {}) {
  return getProjectOverview({ ...query, ordering });
}

function emptyVital(key: ProjectVital['key'], label: string): ProjectVital {
  return {
    key,
    label,
    percent: null,
    status: 'unknown',
    statusLabel: 'No Data',
    note: 'No Data',
  };
}

/** Placeholder card for newly initiated projects not yet returned by overview API. */
export function buildEmptyOverviewVitalsCard(project: Project): ProjectVitalsCard {
  return {
    projectId: String(project.id),
    title: String(project.title ?? '').trim() || `Project ${project.id}`,
    location: String(project.location ?? '').trim() || '—',
    pmName: String(project.teamLeadName ?? '').trim() || 'Not Assigned',
    client: String(project.client ?? '').trim() || '—',
    overallScore: null,
    healthLabel: 'NO DATA',
    projectStatusLabel: 'No Data',
    lifecycleStatus: isProjectCompleted(project) ? 'completed' : 'active',
    progressPct: null,
    progressStatusLabel: 'No Data',
    openIssues: 0,
    dprCount: 0,
    drawingApprovalPct: null,
    vitals: [
      emptyVital('schedule', 'Time'),
      emptyVital('budget', 'Cost'),
      emptyVital('drawings', 'Quality'),
      emptyVital('safety', 'Safety'),
    ],
    trend: 'stable',
    lastUpdate: 'No recent update',
    compareEnabled: false,
    isCompleted: isProjectCompleted(project),
    completedAt: project.completedAt ?? null,
    completedBy: project.completedBy ?? null,
  };
}

/**
 * Align 360° cards with Enterprise Portfolio live list:
 * - newly initiated projects appear immediately (empty / — scores)
 * - deleted portfolio projects drop out even if overview API is stale
 */
export function mergeOverviewCardsWithLiveProjects(
  overviewCards: ProjectVitalsCard[],
  liveProjects: Project[],
): ProjectVitalsCard[] {
  const byId = new Map(overviewCards.map((card) => [String(card.projectId), card] as const));

  const findOverviewCard = (project: Project): ProjectVitalsCard | null => {
    const rawId = String(project.id ?? '');
    if (rawId && !isSyntheticExecutiveProjectId(rawId) && byId.has(rawId)) {
      return byId.get(rawId) ?? null;
    }
    const titleKey = normalizeProjectTitleKey(project.title);
    return (
      overviewCards.find(
        (card) =>
          normalizeProjectTitleKey(card.title) === titleKey ||
          areDuplicateProjectTitles(card.title, project.title),
      ) ?? null
    );
  };

  const merged: ProjectVitalsCard[] = [];
  const seenIds = new Set<string>();

  for (const project of liveProjects) {
    if (!project?.title?.trim()) continue;
    if (isExcludedPmcTlProjectTitle(project.title)) continue;

    const rawId = String(project.id ?? '');
    const isSynthetic = isSyntheticExecutiveProjectId(rawId);
    const numericId = Number(rawId);
    const hasRealId = !isSynthetic && Number.isFinite(numericId) && numericId > 0;

    const overviewCard = findOverviewCard(project);
    if (overviewCard) {
      const projectId = hasRealId ? rawId : String(overviewCard.projectId);
      if (seenIds.has(projectId)) continue;
      seenIds.add(projectId);
      merged.push({
        ...overviewCard,
        projectId,
        title: String(project.title).trim() || overviewCard.title,
        client: String(project.client ?? '').trim() || overviewCard.client,
        location: String(project.location ?? '').trim() || overviewCard.location,
        pmName:
          String(project.teamLeadName ?? '').trim() || overviewCard.pmName,
        isCompleted: isProjectCompleted(project) || Boolean(overviewCard.isCompleted),
        completedAt: project.completedAt ?? overviewCard.completedAt ?? null,
        completedBy: project.completedBy ?? overviewCard.completedBy ?? null,
      });
      continue;
    }

    // Newly initiated / live portfolio project not in overview payload yet
    if (hasRealId) {
      if (seenIds.has(rawId)) continue;
      seenIds.add(rawId);
      merged.push(buildEmptyOverviewVitalsCard(project));
    }
  }

  return merged.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );
}

export { getApiErrorMessage };
