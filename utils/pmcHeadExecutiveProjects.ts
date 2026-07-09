import type { Project } from '../types';
import { ProjectStatus } from '../types';
import { projectApi, projectDatesApi, unwrapList } from '../services/api';
import { extractAssigneeId } from './roleProjectAssignments';
import { loadUserDirectory, type DirectoryUser } from './userDirectory';

/** Exact login id — not pmc_tl1, pmc_tl19, etc. */
export const PMC_TL_USERNAME = 'pmc_tl';

/** Team-lead projects that must appear in the PMC Head executive dropdown. */
export const PMC_TL_KNOWN_PROJECT_TITLES = [
  'Thane Project',
  'White bliss',
  'Democracy',
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

function isSyntheticExecutiveProjectId(id?: string | null): boolean {
  return String(id ?? '').startsWith('executive-known-');
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

async function fetchAllProjectRows(): Promise<Record<string, unknown>[]> {
  const paramAttempts: Array<Record<string, string | number | boolean> | undefined> = [
    { page_size: 1000 },
    { page_size: 500 },
    undefined,
  ];
  const merged = new Map<string, Record<string, unknown>>();

  for (const params of paramAttempts) {
    try {
      const response = await projectApi.getProjects(params);
      unwrapList(response.data).forEach((row) => {
        if (!row || typeof row !== 'object') return;
        const record = row as Record<string, unknown>;
        const id = String(record.id ?? '');
        if (id) merged.set(id, record);
      });
      if (merged.size > 0) break;
    } catch {
      // try next
    }
  }

  return [...merged.values()];
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

  return {
    id: String(row.id ?? ''),
    title:
      String(row.name ?? row.title ?? row.project_name ?? '').trim() ||
      `Project ${String(row.id ?? '')}`,
    client: String(row.client_name ?? ''),
    location: String(row.location ?? ''),
    budget: Number(row.budget) || 0,
    description: String(row.description ?? ''),
    status:
      statusRaw === 'planning' || statusRaw === 'active'
        ? ProjectStatus.IN_PROGRESS
        : statusRaw === 'completed'
          ? ProjectStatus.APPROVED
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
    coordinatorIds: (Array.isArray(row.coordinators) ? row.coordinators : []).map((id) =>
      String(id),
    ),
    tasks: [],
    documents: [],
    activities: [],
    auditLogs: initialAudit,
    commencementDate: String(row.commencement_date ?? ''),
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

async function fetchProjectsByTitle(title: string): Promise<Project | null> {
  const titleKey = normalizeTitleKey(title);

  const allRows = await fetchAllProjectRows();
  const fromFullList = pickProjectByTitle(
    allRows.map((row) => normalizeBackendProjectRow(row)),
    title,
  );
  if (fromFullList) return fromFullList;

  const paramAttempts: Array<Record<string, string | number | boolean>> = [
    { search: title },
    { name: title },
    { project_name: title },
    { q: title },
  ];

  for (const params of paramAttempts) {
    try {
      const response = await projectApi.getProjects(params);
      const projects = await rowsToProjects(unwrapList(response.data));
      const exact = pickProjectByTitle(projects, title);
      if (exact) return exact;
    } catch {
      // try next
    }
  }

  const fromDates = await resolveProjectFromDatesEndpoint(title);
  if (fromDates) return fromDates;

  if (isKnownPmcTlProjectTitle(title)) {
    return buildKnownExecutiveProjectStub(title);
  }

  return null;
}

async function ensureKnownExecutiveProjects(existing: Project[]): Promise<Project[]> {
  const merged = new Map<string, Project>();
  const absorb = (project: Project) => {
    if (project.id) merged.set(project.id, project);
  };

  existing.forEach(absorb);

  for (const title of PMC_TL_KNOWN_PROJECT_TITLES) {
    if (pickProjectByTitle([...merged.values()], title)) continue;

    const resolved =
      (await fetchProjectsByTitle(title)) ??
      (await resolveProjectFromDatesEndpoint(title)) ??
      buildKnownExecutiveProjectStub(title);

    absorb(resolved);
  }

  return [...merged.values()].sort(sortProjectsByTitle);
}

/** Load pmc_tl assignments (Thane Project, White bliss, Democracy, etc.). */
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

  const paramAttempts: Array<Record<string, string | number | boolean> | undefined> = [
    { team_lead: PMC_TL_USERNAME },
    { team_lead_username: PMC_TL_USERNAME },
    { page_size: 1000 },
    { page_size: 500 },
    undefined,
  ];

  for (const params of paramAttempts) {
    try {
      const response = await projectApi.getProjects(params);
      const rows = unwrapList(response.data);
      rows.forEach((row) => {
        if (!row || typeof row !== 'object') return;
        const record = row as Record<string, unknown>;
        if (!rowAssignedToPmcTl(record, tokens)) return;
        absorb(normalizeBackendProjectRow(record));
      });
    } catch {
      // try next
    }
  }

  for (const title of PMC_TL_KNOWN_PROJECT_TITLES) {
    if (pickProjectByTitle([...merged.values()], title)) continue;
    const found = await fetchProjectsByTitle(title);
    if (found) absorb(found);
  }

  return ensureKnownExecutiveProjects([...merged.values()]);
}

/** PMC Head: merge portfolio with pmc_tl team-lead projects into one dropdown list. */
export async function buildPmcHeadExecutiveProjectOptions(
  seedProjects: Project[],
): Promise<{ projects: Project[]; tokens: ReadonlySet<string> }> {
  try {
    const tokens = await resolvePmcTlAssigneeTokens();
    const pmcTlProjects = await fetchPmcTlPortfolioProjects(seedProjects, tokens);
    const projects = buildExecutiveProjectDropdownList(seedProjects, pmcTlProjects);

    return {
      projects: projects.length > 0 ? projects : buildExecutiveProjectDropdownList(seedProjects),
      tokens,
    };
  } catch {
    return {
      projects: buildExecutiveProjectDropdownList(
        seedProjects,
        getKnownExecutiveProjectStubs(seedProjects),
      ),
      tokens: new Set([PMC_TL_USERNAME]),
    };
  }
}
