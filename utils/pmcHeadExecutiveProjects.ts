import type { Project } from '../types';
import { ProjectStatus } from '../types';
import { projectApi, projectDatesApi, unwrapList } from '../services/api';
import { extractAssigneeId } from './roleProjectAssignments';
import { loadUserDirectory, type DirectoryUser } from './userDirectory';
import {
  HSE_SITE_ENGINEER_ACCOUNTS,
  areDuplicateProjectTitles,
  normalizeProjectTitleKey,
  pickProjectByHseTitle,
  sanitizeProjectDisplayName,
} from './hseSiteEngineerProjects';
import { extractCompletionFields, isProjectCompleted } from './projectCompletion';

/** Exact login id — not pmc_tl1, pmc_tl19, etc. */
export const PMC_TL_USERNAME = 'pmc_tl';

/** Team-lead projects that must appear in the PMC Head executive dropdown. */
export const PMC_TL_KNOWN_PROJECT_TITLES = [
  'B3482 RGSL: Rajeev Gandhi Sea Link',
] as const;

/** Projects explicitly excluded from Head / HO portfolio UI (dropdowns, overview cards, lists). */
export const PMC_TL_DROPDOWN_EXCLUDE_TITLES = [
  'Thane Project',
  'White Bliss',
  'White bliss',
  'WHITE BLISS CORPORATION',
  'Democracy',
  'Multi-Modal Transit Hub – Thane',
  'SHIVALIKA',
  /** Stub-only name — keep real "Avissa G+40, Mahim" */
  'AVISSA',
] as const;

export function isExactPmcTlLogin(value?: string | null): boolean {
  return String(value ?? '').trim().toLowerCase() === PMC_TL_USERNAME;
}

export function isKnownPmcTlProjectTitle(title?: string | null): boolean {
  const key = normalizeTitleKey(title);
  return PMC_TL_KNOWN_PROJECT_TITLES.some((name) => normalizeTitleKey(name) === key);
}

function normalizeTitleKey(title?: string | null): string {
  return String(title ?? '').trim().toLowerCase();
}

export function isExcludedPmcTlProjectTitle(title?: string | null): boolean {
  const key = normalizeProjectTitleKey(title);
  if (!key) return false;
  return PMC_TL_DROPDOWN_EXCLUDE_TITLES.some((t) => {
    const excluded = normalizeProjectTitleKey(t);
    if (!excluded) return false;
    return (
      key === excluded ||
      key.startsWith(`${excluded} (`) ||
      key.startsWith(`${excluded}(`) ||
      // e.g. "White Bliss" also hides "WHITE BLISS CORPORATION"
      (excluded.length >= 8 && key.startsWith(`${excluded} `)) ||
      areDuplicateProjectTitles(title, t)
    );
  });
}

export function isSyntheticExecutiveProjectId(id?: string | null): boolean {
  const value = String(id ?? '');
  return value.startsWith('executive-known-') || value.startsWith('executive-hse-');
}

/** Canonical portfolio titles for Head / HO / Manager project overview. */
export const PMC_HEAD_HSE_PROJECT_TITLES = HSE_SITE_ENGINEER_ACCOUNTS.map(
  (row) => row.projectTitle,
);

function buildHseExecutiveProjectStub(title: string, index: number): Project {
  const stub = buildKnownExecutiveProjectStub(title);
  return { ...stub, id: `executive-hse-${index}` };
}

/** Stubs for HSE portfolio projects missing from the backend list. */
export function getHseExecutiveProjectStubs(existingProjects: Project[]): Project[] {
  return HSE_SITE_ENGINEER_ACCOUNTS.filter(
    ({ projectTitle }) =>
      !isExcludedPmcTlProjectTitle(projectTitle) &&
      !pickProjectByHseTitle(existingProjects, projectTitle),
  ).map(({ projectTitle, index }) => buildHseExecutiveProjectStub(projectTitle, index));
}

/** True when title matches the Head / HO / Manager portfolio allowlist. */
export function isClientPortfolioProjectTitle(title?: string | null): boolean {
  if (!String(title ?? '').trim()) return false;
  return HSE_SITE_ENGINEER_ACCOUNTS.some((row) =>
    areDuplicateProjectTitles(row.projectTitle, title),
  );
}

/** Prefer PDF / HSE canonical titles when merging spelling variants. */
function isCanonicalClientTitle(title?: string | null): boolean {
  const key = normalizeProjectTitleKey(title);
  return HSE_SITE_ENGINEER_ACCOUNTS.some(
    (row) => normalizeProjectTitleKey(row.projectTitle) === key,
  );
}

/** Prefer real backend rows over stubs, assigned TLs, and PDF-exact titles over variants. */
function preferProjectForDropdown(a: Project, b: Project): Project {
  const aSynthetic = isSyntheticExecutiveProjectId(a.id);
  const bSynthetic = isSyntheticExecutiveProjectId(b.id);
  if (aSynthetic !== bSynthetic) return aSynthetic ? b : a;

  const aHasTl = Boolean(String(a.teamLeadName ?? '').trim() || String(a.teamLeadId ?? '').trim());
  const bHasTl = Boolean(String(b.teamLeadName ?? '').trim() || String(b.teamLeadId ?? '').trim());
  if (aHasTl !== bHasTl) return aHasTl ? a : b;

  const aCanonical = isCanonicalClientTitle(a.title);
  const bCanonical = isCanonicalClientTitle(b.title);
  if (aCanonical !== bCanonical) return aCanonical ? a : b;

  const aLen = String(a.title ?? '').trim().length;
  const bLen = String(b.title ?? '').trim().length;
  if (aLen !== bLen) return aLen >= bLen ? a : b;

  return a;
}

/**
 * Remove duplicate PMC Head dropdown entries caused by spelling variants
 * (Mayapur/Miyapur) or backend titles with extra location suffixes.
 * Display titles prefer the client PDF wording when known.
 */
export function dedupePmcHeadDropdownProjects(projects: Project[]): Project[] {
  const unique: Project[] = [];

  for (const project of projects) {
    if (!project?.title?.trim()) continue;
    const existingIndex = unique.findIndex((row) =>
      areDuplicateProjectTitles(row.title, project.title),
    );
    if (existingIndex < 0) {
      unique.push(withCanonicalClientTitle(project));
      continue;
    }
    unique[existingIndex] = withCanonicalClientTitle(
      preferProjectForDropdown(unique[existingIndex], project),
    );
  }

  return unique.sort(sortProjectsByTitle);
}

function withCanonicalClientTitle(project: Project): Project {
  const canonical = HSE_SITE_ENGINEER_ACCOUNTS.find((row) =>
    areDuplicateProjectTitles(row.projectTitle, project.title),
  );
  if (!canonical) return project;
  if (normalizeProjectTitleKey(project.title) === normalizeProjectTitleKey(canonical.projectTitle)) {
    return project;
  }
  return { ...project, title: canonical.projectTitle };
}

/**
 * Build the Head / HO / Manager portfolio allowlist.
 * Wrong / extra backend projects are dropped; missing ones use stubs.
 * Each backend row is matched at most once (K2 and K3 stay separate).
 */
export function ensureHsePortfolioProjects(projects: Project[]): Project[] {
  const pool = projects.filter((project) => project?.id && project?.title?.trim());
  const picked: Project[] = [];
  const usedIds = new Set<string>();

  for (const { projectTitle, index } of HSE_SITE_ENGINEER_ACCOUNTS) {
    const available = pool.filter((project) => !usedIds.has(project.id));
    const matched = pickProjectByHseTitle(available, projectTitle);
    if (matched) {
      usedIds.add(matched.id);
      picked.push(withCanonicalClientTitle(matched));
      continue;
    }
    picked.push(buildHseExecutiveProjectStub(projectTitle, index));
  }

  return dedupePmcHeadDropdownProjects(picked);
}

/** PMC Head / HO / Manager live registry: official allowlist + newly initiated projects
 * (including completed ones, so Mark as Complete stays visible in Enterprise Portfolio).
 */
export function buildPmcHeadDropdownProjects(...lists: Project[][]): Project[] {
  const merged = buildExecutiveProjectDropdownList(...lists).filter(
    (project) => !isExcludedPmcTlProjectTitle(project.title),
  );

  const allowlisted = merged.filter((project) =>
    isClientPortfolioProjectTitle(project.title),
  );
  const withOfficialStubs = ensureHsePortfolioProjects(allowlisted);
  const initiatedExtras = merged.filter(isAdditionalInitiatedPortfolioProject);

  const combined = dedupePmcHeadDropdownProjects([...withOfficialStubs, ...initiatedExtras]);

  // Active projects first, then completed — completed stay in the same registry table.
  return combined.sort((a, b) => {
    const aDone = isProjectCompleted(a) ? 1 : 0;
    const bDone = isProjectCompleted(b) ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

export type ExecutiveProjectSelectOption = {
  id: number;
  name: string;
};

/**
 * Full Head / HO / Manager project list for select dropdowns
 * (User Management filter, assign-projects, create/edit, etc.).
 * Resolves stubs to real backend IDs when the project-row cache has them.
 */
export function buildExecutiveProjectSelectOptions(
  projects: Project[],
): ExecutiveProjectSelectOption[] {
  const portfolio = buildPmcHeadDropdownProjects(
    projects,
    getKnownExecutiveProjectStubs(projects),
    getHseExecutiveProjectStubs(projects),
  );

  const byKey = new Map<string, ExecutiveProjectSelectOption>();

  const absorb = (project: Project) => {
    if (!project?.title?.trim()) return;
    if (isExcludedPmcTlProjectTitle(project.title)) return;

    const resolved = resolveExecutiveProjectForApi(project);
    const name = String(resolved.title || project.title).trim();
    if (!name) return;

    const rawId = String(resolved.id ?? '');
    const numericId = Number(rawId);
    const id =
      !isSyntheticExecutiveProjectId(rawId) &&
      Number.isFinite(numericId) &&
      numericId > 0
        ? numericId
        : 0;

    const key = normalizeProjectTitleKey(name);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { id, name });
      return;
    }
    if (id && !existing.id) {
      byKey.set(key, {
        id,
        name:
          existing.name.length >= name.length ? existing.name : name,
      });
    }
  };

  portfolio.forEach(absorb);
  // Include any other live projects already loaded (except excluded titles).
  projects.forEach(absorb);

  return [...byKey.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

/**
 * Non-allowlist projects created via Initiate Project (e.g. "testing1").
 * Includes completed projects so they remain visible in Enterprise Portfolio /
 * 360 Overview after Mark as Complete. User Management assign lists still
 * exclude completed via `isAssignableUserManagementProject`.
 */
export function isAdditionalInitiatedPortfolioProject(project: Project): boolean {
  if (!project?.title?.trim()) return false;
  if (isExcludedPmcTlProjectTitle(project.title)) return false;
  if (isClientPortfolioProjectTitle(project.title)) return false;
  if (isSyntheticExecutiveProjectId(String(project.id ?? ''))) return false;

  const numericId = Number(project.id);
  if (!Number.isFinite(numericId) || numericId <= 0) return false;

  const createdMs = Date.parse(String(project.createdAt ?? ''));
  if (Number.isFinite(createdMs)) {
    const twoYearsMs = 730 * 24 * 60 * 60 * 1000;
    return Date.now() - createdMs <= twoYearsMs;
  }

  // Optimistic local add right after Initiate Project (before backend createdAt lands)
  return true;
}

/**
 * Active / working projects for User Management assign / create checkboxes.
 * Matches Enterprise Portfolio live registry: official ~25 + newly created.
 * Excludes completed, excluded, and stale backend rows.
 */
export function isAssignableUserManagementProject(project: Project): boolean {
  if (!project?.title?.trim()) return false;
  if (isExcludedPmcTlProjectTitle(project.title)) return false;
  if (isProjectCompleted(project)) return false;
  if (isSyntheticExecutiveProjectId(String(project.id ?? ''))) return false;

  if (isClientPortfolioProjectTitle(project.title)) return true;
  return isAdditionalInitiatedPortfolioProject(project);
}

/**
 * Build the same project set shown in Enterprise Portfolio, then drop completed
 * rows — for User Management assign / create checkboxes only.
 */
export function buildLiveAssignableProjects(
  apiProjects: Project[],
  appProjects: Project[] = [],
): Project[] {
  return buildPmcHeadDropdownProjects(
    apiProjects,
    appProjects,
    getKnownExecutiveProjectStubs(apiProjects),
    getHseExecutiveProjectStubs(apiProjects),
  ).filter(
    (project) =>
      isAssignableUserManagementProject(project) &&
      !isSyntheticExecutiveProjectId(String(project.id ?? '')),
  );
}

/**
 * Assignable projects for User Management (create / assign).
 * Shows the ~25 active portfolio projects and newly initialized ones only.
 */
export function buildAssignableProjectSelectOptions(
  projects: Project[],
): ExecutiveProjectSelectOption[] {
  const byKey = new Map<string, ExecutiveProjectSelectOption>();

  for (const project of projects) {
    if (!isAssignableUserManagementProject(project)) continue;

    const rawId = String(project.id ?? '');
    if (isSyntheticExecutiveProjectId(rawId)) continue;

    const numericId = Number(rawId);
    if (!Number.isFinite(numericId) || numericId <= 0) continue;

    const name = String(project.title).trim();
    const key = normalizeProjectTitleKey(name);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { id: numericId, name });
      continue;
    }
    if (name.length > existing.name.length) {
      byKey.set(key, { id: existing.id || numericId, name });
    } else if (!existing.id && numericId) {
      byKey.set(key, { id: numericId, name: existing.name });
    }
  }

  return [...byKey.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

/**
 * Async variant that resolves portfolio titles to real backend project IDs
 * before building select options, so dropdown items remain clickable.
 */
export async function buildExecutiveProjectSelectOptionsAsync(
  projects: Project[],
): Promise<ExecutiveProjectSelectOption[]> {
  const portfolio = buildPmcHeadDropdownProjects(
    projects,
    getKnownExecutiveProjectStubs(projects),
    getHseExecutiveProjectStubs(projects),
  );

  const resolvedProjects = await Promise.all(
    portfolio.map(async (project) => {
      if (!isSyntheticExecutiveProjectId(project.id)) return project;
      const resolved = await fetchProjectsByTitle(project.title, projects);
      return resolved ?? project;
    }),
  );

  return buildExecutiveProjectSelectOptions(
    mergeProjectListsById(projects, resolvedProjects),
  );
}

function buildKnownExecutiveProjectStub(title: string): Project {
  const slug = normalizeTitleKey(title).replace(/[^a-z0-9]+/g, '-');
  const now = new Date().toISOString();

  return {
    id: `executive-known-${slug}`,
    title: title.trim(),
    client: '',
    location: '',
    budget: 0,
    description: '',
    status: ProjectStatus.IN_PROGRESS,
    createdAt: now,
    updatedAt: now,
    pmcHeadId: '',
    teamLeadId: PMC_TL_USERNAME,
    teamLeadName: PMC_TL_USERNAME,
    siteEngineerIds: [],
    coordinatorIds: [],
    tasks: [],
    documents: [],
    activities: [],
    auditLogs: [],
  };
}

let cachedProjectRows: Record<string, unknown>[] | null = null;
let cachedProjectRowsAt = 0;
let inflightProjectRows: Promise<Record<string, unknown>[]> | null = null;

const PROJECT_ROW_CACHE_TTL_MS = 2 * 60 * 1000;

function absorbProjectRowsIntoMap(
  target: Map<string, Record<string, unknown>>,
  rows: unknown[],
): void {
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const record = row as Record<string, unknown>;
    const id = String(record.id ?? '');
    if (id) target.set(id, record);
  });
}

/** Seed in-memory cache from an already-fetched projects response (avoids duplicate API calls). */
export function seedProjectRowCache(rows: unknown[]): void {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const merged = new Map<string, Record<string, unknown>>();
  if (cachedProjectRows) absorbProjectRowsIntoMap(merged, cachedProjectRows);
  absorbProjectRowsIntoMap(merged, rows);
  cachedProjectRows = [...merged.values()];
  cachedProjectRowsAt = Date.now();
}

export function clearProjectRowCache(): void {
  cachedProjectRows = null;
  cachedProjectRowsAt = 0;
  inflightProjectRows = null;
}

export function getCachedProjectRowByTitle(title: string): Record<string, unknown> | null {
  const titleKey = normalizeTitleKey(title);
  if (!titleKey || !cachedProjectRows?.length) return null;
  const exact =
    cachedProjectRows.find((row) => {
      const name = String(row.name ?? row.title ?? row.project_name ?? '').trim();
      return normalizeTitleKey(name) === titleKey;
    }) ?? null;
  if (exact) return exact;

  return (
    cachedProjectRows.find((row) => {
      const name = String(row.name ?? row.title ?? row.project_name ?? '').trim();
      return areDuplicateProjectTitles(name, title);
    }) ?? null
  );
}

function getCachedProjectRowByHseTitle(title: string): Record<string, unknown> | null {
  if (!cachedProjectRows?.length) return null;
  const projects = cachedProjectRows.map((row) => normalizeBackendProjectRow(row));
  const matched = pickProjectByHseTitle(projects, title);
  if (!matched?.id) return null;
  return getCachedProjectRowById(matched.id);
}

export function getCachedProjectRowById(projectId: string): Record<string, unknown> | null {
  if (!projectId || !cachedProjectRows?.length) return null;
  return cachedProjectRows.find((row) => String(row.id ?? '') === projectId) ?? null;
}

/**
 * Map executive stubs (executive-known-*) to real backend rows when available,
 * and merge list-row financial/HSE fields into the project used for vitals.
 */
export function resolveExecutiveProjectForApi(project: Project): Project {
  const row =
    getCachedProjectRowById(project.id) ??
    getCachedProjectRowByTitle(project.title) ??
    getCachedProjectRowByHseTitle(project.title);
  if (!row) {
    if (isSyntheticExecutiveProjectId(project.id)) return project;
    return project;
  }

  const fromRow = normalizeBackendProjectRow(row);
  const useRowId =
    isSyntheticExecutiveProjectId(project.id) &&
    fromRow.id &&
    !isSyntheticExecutiveProjectId(fromRow.id);

  return {
    ...project,
    ...fromRow,
    id: useRowId ? fromRow.id : project.id || fromRow.id,
    title: project.title || fromRow.title,
    apiName: fromRow.apiName || project.apiName,
    location: project.location || fromRow.location,
    teamLeadId: project.teamLeadId || fromRow.teamLeadId,
    teamLeadName: project.teamLeadName || fromRow.teamLeadName,
  };
}

export function resolveExecutiveProjectsForApi(projects: Project[]): Project[] {
  return projects.map(resolveExecutiveProjectForApi);
}

async function fetchAllProjectRows(forceRefresh = false): Promise<Record<string, unknown>[]> {
  if (
    !forceRefresh &&
    cachedProjectRows &&
    cachedProjectRows.length > 0 &&
    Date.now() - cachedProjectRowsAt < PROJECT_ROW_CACHE_TTL_MS
  ) {
    return cachedProjectRows;
  }

  if (inflightProjectRows) return inflightProjectRows;

  inflightProjectRows = (async () => {
    try {
      const response = await projectApi.getProjects({ page_size: 1000 });
      const rows = unwrapList(response.data).filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object',
      );
      seedProjectRowCache(rows);
      return cachedProjectRows ?? rows;
    } catch {
      return cachedProjectRows ?? [];
    } finally {
      inflightProjectRows = null;
    }
  })();

  return inflightProjectRows;
}

async function resolveProjectFromDatesEndpoint(title: string): Promise<Project | null> {
  try {
    const response = await projectDatesApi.getByProject(title);
    const payload = (response.data as Record<string, unknown>)?.data ?? response.data;
    if (!payload || typeof payload !== 'object') return null;

    const record = payload as Record<string, unknown>;
    const projectName = String(record.project_name ?? title).trim() || title.trim();
    const backendProjectId =
      record.project_id ??
      record.project ??
      (record.scl && typeof record.scl === 'object'
        ? (record.scl as Record<string, unknown>).project_id
        : undefined);

    const stub = buildKnownExecutiveProjectStub(projectName);
    if (backendProjectId != null && String(backendProjectId).trim()) {
      return { ...stub, id: String(backendProjectId) };
    }
    return stub;
  } catch {
    return null;
  }
}

function pickProjectByTitle(projects: Project[], title: string): Project | null {
  const titleKey = normalizeTitleKey(title);
  return projects.find((project) => normalizeTitleKey(project.title) === titleKey) ?? null;
}

export function normalizeBackendProjectRow(row: Record<string, unknown>): Project {
  const createdById = row.created_by ? String(row.created_by) : '';
  const createdByName = String(row.created_by_name ?? '');
  const createdAt = String(row.created_at ?? new Date().toISOString());
  const initialAudit = createdById
    ? [
        {
          id: `init-${row.id}`,
          action: 'Project Initiated',
          performedBy: createdById,
          timestamp: createdAt,
          details: createdByName ? `Created by ${createdByName}` : 'Created',
        },
      ]
    : [];
  const statusRaw = String(row.status ?? '');
  const backendName =
    String(row.name ?? row.title ?? row.project_name ?? '').trim() ||
    `Project ${String(row.id ?? '')}`;
  const completion = extractCompletionFields(row);
  const isCompletedStatus =
    statusRaw === 'completed' ||
    statusRaw === 'APPROVED' ||
    Boolean(completion.completedAt);

  const budget = Number(row.budget) || Number(row.bac) || 0;
  const commencementRaw = row.commencement_date ?? row.project_start ?? '';

  return {
    id: String(row.id ?? ''),
    title: sanitizeProjectDisplayName(backendName),
    apiName: backendName,
    client: String(row.client_name ?? ''),
    location: String(row.location ?? ''),
    budget,
    description: String(row.description ?? ''),
    status: isCompletedStatus
      ? ProjectStatus.APPROVED
      : statusRaw === 'planning' || statusRaw === 'active'
        ? ProjectStatus.IN_PROGRESS
        : statusRaw === 'on_hold'
          ? ProjectStatus.REJECTED
          : ProjectStatus.CREATED,
    createdAt,
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    pmcHeadId: row.pmc_head != null ? String(row.pmc_head) : '',
    teamLeadId: extractAssigneeId(row.team_lead) || '',
    teamLeadName: String(row.team_lead_name ?? ''),
    siteEngineerIds: (Array.isArray(row.site_engineers) ? row.site_engineers : [])
      .map((id: unknown) => extractAssigneeId(id))
      .filter(Boolean),
    billingEngineerId: extractAssigneeId(row.billing_site_engineer),
    qaqcEngineerId: extractAssigneeId(row.qaqc_site_engineer),
    hseEngineerId: extractAssigneeId(row.hse_site_engineer),
    coordinatorIds: (Array.isArray(row.coordinators) ? row.coordinators : []).map((id) =>
      String(id),
    ),
    tasks: [],
    documents: [],
    activities: [],
    auditLogs: initialAudit,
    commencementDate: String(commencementRaw ?? ''),
    duration: String(row.duration ?? ''),
    salientFeatures: String(row.salient_features ?? ''),
    siteStaffDetails: String(row.site_staff_details ?? ''),
    hasDocumentation: Boolean(row.has_documentation),
    hasISOChecklist: Boolean(row.has_iso_checklist),
    hasTestFrequencyChart: Boolean(row.has_test_frequency_chart),
    plannedValue: Number(row.planned_value) || 0,
    earnedValue: Number(row.earned_value) || 0,
    actualCost: Number(row.actual_cost) || 0,
    grossBilled: Number(row.gross_billed) || 0,
    netBilled: Number(row.net_billed) || 0,
    netCollected: Number(row.net_collected) || 0,
    netDue: Number(row.net_due) || 0,
    totalManhours: Number(row.total_manhours) || 0,
    fatalities: Number(row.fatalities) || 0,
    significant: Number(row.significant) || 0,
    major: Number(row.major) || 0,
    minor: Number(row.minor) || 0,
    nearMiss: Number(row.near_miss) || 0,
    completedAt: completion.completedAt ?? null,
    completedBy: completion.completedBy ?? null,
    completionNotes: completion.completionNotes ?? null,
    billingStatus: completion.billingStatus ?? null,
    billingCompletedAt: completion.billingCompletedAt ?? null,
    billingCompletedBy: completion.billingCompletedBy ?? null,
    billingCompletionNotes: completion.billingCompletionNotes ?? null,
  };
}

function sortProjectsByTitle(a: Project, b: Project): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function mergeProjectListsById(...lists: Project[][]): Project[] {
  const byId = new Map<string, Project>();
  const byTitle = new Map<string, Project>();

  const absorb = (project: Project) => {
    if (!project.id) return;
    const titleKey = normalizeTitleKey(project.title);
    const existingById = byId.get(project.id);
    if (
      !existingById ||
      (isSyntheticExecutiveProjectId(existingById.id) && !isSyntheticExecutiveProjectId(project.id))
    ) {
      byId.set(project.id, project);
    }

    if (!titleKey) return;
    const existingByTitle = byTitle.get(titleKey);
    if (
      !existingByTitle ||
      (isSyntheticExecutiveProjectId(existingByTitle.id) && !isSyntheticExecutiveProjectId(project.id))
    ) {
      byTitle.set(titleKey, project);
    }
  };

  for (const list of lists) {
    for (const project of list) absorb(project);
  }

  const merged = new Map<string, Project>();
  for (const project of byId.values()) merged.set(project.id, project);
  for (const project of byTitle.values()) {
    if (![...merged.values()].some((p) => normalizeTitleKey(p.title) === normalizeTitleKey(project.title))) {
      merged.set(project.id, project);
    }
  }

  return [...merged.values()];
}

/** Immediate stubs so known pmc_tl projects appear before async resolution finishes. */
export function getKnownExecutiveProjectStubs(existingProjects: Project[]): Project[] {
  return PMC_TL_KNOWN_PROJECT_TITLES.filter(
    (title) => !pickProjectByTitle(existingProjects, title),
  ).map((title) => buildKnownExecutiveProjectStub(title));
}

/** Single sorted list for PMC Head dropdown — portfolio + pmc_tl assignments. */
export function buildExecutiveProjectDropdownList(...lists: Project[][]): Project[] {
  return mergeProjectListsById(...lists).sort(sortProjectsByTitle);
}

function absorbTeamLeaderRow(tokens: Set<string>, row: Record<string, unknown>) {
  const username = String(row.username ?? row.user_name ?? row.login ?? '')
    .trim()
    .toLowerCase();
  if (!isExactPmcTlLogin(username)) return;
  const id = String(row.id ?? row.pk ?? row.user_id ?? '').trim().toLowerCase();
  if (id) tokens.add(id);
  tokens.add(username);
}

export async function resolvePmcTlAssigneeTokens(): Promise<ReadonlySet<string>> {
  const tokens = new Set<string>([PMC_TL_USERNAME]);

  const [directory, teamLeadersRes] = await Promise.all([
    loadUserDirectory().catch(() => [] as DirectoryUser[]),
    projectApi.getAvailableUsers('Team Leader').catch(() => null),
  ]);

  directory.forEach((user) => {
    if (!isExactPmcTlLogin(user.username)) return;
    if (user.id) tokens.add(user.id.toLowerCase());
    if (user.username) tokens.add(user.username.toLowerCase());
  });

  unwrapList(teamLeadersRes?.data).forEach((row) => {
    if (row && typeof row === 'object') {
      absorbTeamLeaderRow(tokens, row as Record<string, unknown>);
    }
  });

  return tokens;
}

function collectTeamLeadCandidates(row: Record<string, unknown>): string[] {
  const teamLead = row.team_lead;
  const nested =
    teamLead && typeof teamLead === 'object'
      ? [
          (teamLead as Record<string, unknown>).id,
          (teamLead as Record<string, unknown>).username,
          (teamLead as Record<string, unknown>).user_name,
        ]
      : [teamLead];

  return [
    ...nested,
    row.team_lead_id,
    row.team_lead_name,
    row.team_lead_username,
  ]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean);
}

function rowAssignedToPmcTl(
  row: Record<string, unknown>,
  tokens: ReadonlySet<string>,
): boolean {
  return collectTeamLeadCandidates(row).some(
    (candidate) => tokens.has(candidate) || isExactPmcTlLogin(candidate),
  );
}

export function isPmcTlUserProject(
  project: Project,
  assigneeTokens?: ReadonlySet<string>,
): boolean {
  if (isKnownPmcTlProjectTitle(project.title)) return true;
  const tokens = assigneeTokens ?? new Set([PMC_TL_USERNAME]);
  const teamLeadId = String(project.teamLeadId ?? '').trim().toLowerCase();
  if (teamLeadId && tokens.has(teamLeadId)) return true;
  return isExactPmcTlLogin(project.teamLeadName);
}

async function rowsToProjects(rows: unknown[]): Promise<Project[]> {
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => normalizeBackendProjectRow(row))
    .filter((project) => project.id);
}

async function fetchProjectsByTitle(
  title: string,
  existingProjects: Project[] = [],
): Promise<Project | null> {
  const fromExisting = pickProjectByTitle(existingProjects, title);
  if (fromExisting) return fromExisting;

  const rows = await fetchAllProjectRows();
  const fromCache = pickProjectByTitle(
    rows.map((row) => normalizeBackendProjectRow(row)),
    title,
  );
  if (fromCache) return fromCache;

  try {
    const response = await projectApi.getProjects({ search: title });
    const fetchedRows = unwrapList(response.data);
    seedProjectRowCache(fetchedRows);
    const projects = await rowsToProjects(fetchedRows);
    const exact = pickProjectByTitle(projects, title);
    if (exact) return exact;
  } catch {
    // fall through
  }

  const fromDates = await resolveProjectFromDatesEndpoint(title);
  if (fromDates) return fromDates;

  if (isKnownPmcTlProjectTitle(title)) {
    return buildKnownExecutiveProjectStub(title);
  }

  return null;
}

function ensureKnownExecutiveStubs(projects: Project[]): Project[] {
  const merged = new Map<string, Project>();
  projects.forEach((project) => {
    if (project.id) merged.set(project.id, project);
  });

  for (const title of PMC_TL_KNOWN_PROJECT_TITLES) {
    if (pickProjectByTitle([...merged.values()], title)) continue;
    const stub = buildKnownExecutiveProjectStub(title);
    merged.set(stub.id, stub);
  }

  return [...merged.values()].sort(sortProjectsByTitle);
}

/** Load pmc_tl assignments for the Head executive portfolio (excludes stub titles). */
export async function fetchPmcTlPortfolioProjects(
  existingProjects: Project[],
  assigneeTokens?: ReadonlySet<string>,
): Promise<Project[]> {
  const tokens = assigneeTokens ?? (await resolvePmcTlAssigneeTokens());
  const merged = new Map<string, Project>();

  const absorb = (project: Project) => {
    if (project.id) merged.set(project.id, project);
  };

  existingProjects.filter((p) => isPmcTlUserProject(p, tokens)).forEach(absorb);

  const allRows = await fetchAllProjectRows();
  allRows.forEach((row) => {
    if (!rowAssignedToPmcTl(row, tokens)) return;
    absorb(normalizeBackendProjectRow(row));
  });

  const missingKnown = PMC_TL_KNOWN_PROJECT_TITLES.filter(
    (title) => !pickProjectByTitle([...merged.values()], title),
  );

  if (missingKnown.length > 0) {
    const supplementalResponses = await Promise.allSettled([
      projectApi.getProjects({ team_lead: PMC_TL_USERNAME }),
      projectApi.getProjects({ team_lead_username: PMC_TL_USERNAME }),
    ]);

    for (const result of supplementalResponses) {
      if (result.status !== 'fulfilled') continue;
      const rows = unwrapList(result.value.data);
      seedProjectRowCache(rows);
      rows.forEach((row) => {
        if (!row || typeof row !== 'object') return;
        const record = row as Record<string, unknown>;
        const title = String(record.name ?? record.title ?? record.project_name ?? '');
        if (
          rowAssignedToPmcTl(record, tokens) ||
          isKnownPmcTlProjectTitle(title)
        ) {
          absorb(normalizeBackendProjectRow(record));
        }
      });
    }

    const stillMissing = PMC_TL_KNOWN_PROJECT_TITLES.filter(
      (title) => !pickProjectByTitle([...merged.values()], title),
    );

    if (stillMissing.length > 0) {
      const resolved = await Promise.all(
        stillMissing.map((title) => fetchProjectsByTitle(title, [...merged.values()])),
      );
      resolved.forEach((project) => {
        if (project) absorb(project);
      });
    }
  }

  const mergedProjects = [...merged.values()].filter(
    (p) => !isExcludedPmcTlProjectTitle(p.title),
  );
  return ensureKnownExecutiveStubs(mergedProjects);
}

/** PMC Head: merge portfolio with pmc_tl team-lead projects into one dropdown list. */
export async function buildPmcHeadExecutiveProjectOptions(
  seedProjects: Project[],
): Promise<{ projects: Project[]; tokens: ReadonlySet<string> }> {
  try {
    const tokens = await resolvePmcTlAssigneeTokens();
    const pmcTlProjects = await fetchPmcTlPortfolioProjects(seedProjects, tokens);
    const projects = buildPmcHeadDropdownProjects(seedProjects, pmcTlProjects);

    return {
      projects: projects.length > 0 ? projects : buildPmcHeadDropdownProjects(seedProjects),
      tokens,
    };
  } catch {
    return {
      projects: buildPmcHeadDropdownProjects(
        seedProjects,
        getKnownExecutiveProjectStubs(seedProjects),
        getHseExecutiveProjectStubs(seedProjects),
      ),
      tokens: new Set([PMC_TL_USERNAME]),
    };
  }
}
