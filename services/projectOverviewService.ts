import api, { getApiErrorMessage } from './api';
import { API_ENDPOINTS } from '../config/apiConfig';
import type { HealthLabel, ProjectVital, ProjectVitalsCard, VitalStatus } from '../utils/projectVitals';

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
  status?: string;
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
}

export interface ProjectOverviewQuery {
  search?: string;
  client?: string;
  status?: string | string[];
  project_name?: string;
  ordering?: string;
  /** Dashboard must omit this (never paginate=true). */
  paginate?: boolean;
}

function toVitalStatus(raw: string | null | undefined): VitalStatus {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!s) return 'unknown';
  if (/(excellent|on\s*track|healthy|good)/.test(s)) return 'healthy';
  if (/(watch|at\s*risk|warning)/.test(s)) return 'watch';
  if (/(delay|critical|risk|poor|bad)/.test(s)) return 'critical';
  return 'unknown';
}

function toPercent(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function healthLabelFromScore(score: number | null): HealthLabel {
  if (score == null) return 'NO DATA';
  if (score < 50) return 'CRITICAL';
  if (score < 75) return 'AT RISK';
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

function kpiToVital(
  key: ProjectVital['key'],
  label: string,
  kpi: ProjectOverviewKpi | null | undefined,
): ProjectVital {
  const percent = toPercent(kpi?.percentage);
  const statusLabel = String(kpi?.status ?? '').trim() || undefined;
  return {
    key,
    label,
    percent,
    status: toVitalStatus(statusLabel),
    statusLabel,
    note: statusLabel || (percent == null ? 'No data' : `${percent}%`),
  };
}

/** Map overview API row → existing dashboard card model (no KPI recalculation). */
export function mapOverviewItemToVitalsCard(item: ProjectOverviewItem): ProjectVitalsCard {
  const overallScore = toPercent(item.health_score);
  const progressPct = toPercent(item.progress?.percentage);
  const quality = kpiToVital('drawings', 'Quality', item.quality);
  const statusRaw = String(item.status ?? '').trim().toLowerCase();
  const completedAt =
    item.completed_at ?? item.completed_on ?? null;
  const completedBy =
    item.completed_by_name ??
    (typeof item.completed_by === 'string' ? item.completed_by : null);
  const isCompleted =
    statusRaw === 'completed' ||
    statusRaw === 'approved' ||
    Boolean(completedAt);

  return {
    projectId: String(item.project_id),
    title: String(item.project_name ?? '').trim() || `Project ${item.project_id}`,
    location: String(item.location ?? '').trim() || '—',
    pmName: teamLeaderDisplayName(item.team_leader),
    client: String(item.client ?? '').trim() || '—',
    overallScore,
    healthLabel: isCompleted ? 'ON TRACK' : healthLabelFromScore(overallScore),
    progressPct,
    openIssues: Math.max(0, Number(item.issues_count) || 0),
    dprCount: Math.max(0, Number(item.dpr_count) || 0),
    drawingApprovalPct: quality.percent,
    vitals: [
      kpiToVital('schedule', 'Time', item.time),
      kpiToVital('budget', 'Cost', item.cost),
      quality,
      kpiToVital('safety', 'Safety', item.safety),
    ],
    trend: 'stable',
    lastUpdate: formatRelativeUpdate(item.last_updated),
    compareEnabled: item.compare_enabled !== false,
    isCompleted,
    completedAt,
    completedBy,
  };
}

function buildOverviewParams(query: ProjectOverviewQuery = {}): Record<string, string> {
  const params: Record<string, string> = {};
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

  // Dashboard: never send paginate=true
  if (query.paginate === true) {
    params.paginate = 'true';
  }

  return params;
}

/**
 * Lightweight Project Overview — single request for all accessible project cards.
 * Do not pass paginate=true for the PMC Head dashboard.
 */
export async function getProjectOverview(
  query: ProjectOverviewQuery = {},
  options?: { signal?: AbortSignal },
): Promise<{ count: number; cards: ProjectVitalsCard[]; raw: ProjectOverviewItem[] }> {
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
  return {
    count: typeof body.count === 'number' ? body.count : raw.length,
    cards: raw.map(mapOverviewItemToVitalsCard),
    raw,
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

export { getApiErrorMessage };
