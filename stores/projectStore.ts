/**
 * Global Project Store — single source of truth for projects / overview / dropdown.
 * Sits above apiGetCache; dedupes in-flight loads; supports progressive startup.
 */

import type { Project } from '../types';
import type { ProjectVitalsCard } from '../utils/projectVitals';
import type { User } from '../types';
import { projectApi, unwrapList, getApiErrorMessage } from '../services/api';
import {
  getProjectOverview,
  type ProjectOverviewQuery,
} from '../services/projectOverviewService';
import {
  normalizeBackendProjectRow,
  buildPmcHeadDropdownProjects,
  buildPmcHeadExecutiveProjectOptions,
  getKnownExecutiveProjectStubs,
  getHseExecutiveProjectStubs,
  seedProjectRowCache,
  isExcludedPmcTlProjectTitle,
} from '../utils/pmcHeadExecutiveProjects';
import { isPmcHeadEquivalent } from '../utils/pmcRoleAccess';
import { DEFAULT_OVERVIEW_ORDERING } from '../utils/dashboardBootstrap';
import { invalidateApiGetCache } from '../utils/apiGetCache';

/** Store-level freshness (above axios GET TTL). */
const PROJECTS_TTL_MS = 45_000;
const OVERVIEW_TTL_MS = 30_000;
const DROPDOWN_TTL_MS = 45_000;

export type ProjectOverviewStoreQuery = {
  search?: string;
  ordering?: string;
  client?: string;
  billingFilter?: 'all' | 'pending' | 'completed';
};

export type ProjectStoreState = {
  projects: Project[];
  overview: ProjectVitalsCard[];
  overviewQuery: ProjectOverviewStoreQuery;
  dropdownProjects: Project[];
  selectedProjectId: string | null;
  loadingProjects: boolean;
  loadingOverview: boolean;
  loadingDropdown: boolean;
  error: string | null;
  lastFetched: number | null;
  lastOverviewFetched: number | null;
  lastDropdownFetched: number | null;
  projectsStale: boolean;
  overviewStale: boolean;
  dropdownStale: boolean;
};

type Listener = () => void;

const initialState: ProjectStoreState = {
  projects: [],
  overview: [],
  overviewQuery: { ordering: DEFAULT_OVERVIEW_ORDERING },
  dropdownProjects: [],
  selectedProjectId: null,
  loadingProjects: false,
  loadingOverview: false,
  loadingDropdown: false,
  error: null,
  lastFetched: null,
  lastOverviewFetched: null,
  lastDropdownFetched: null,
  projectsStale: true,
  overviewStale: true,
  dropdownStale: true,
};

let state: ProjectStoreState = { ...initialState };
const listeners = new Set<Listener>();

let projectsInflight: Promise<Project[]> | null = null;
let overviewInflight: Promise<ProjectVitalsCard[]> | null = null;
let dropdownInflight: Promise<Project[]> | null = null;
/** Bumps when a newer overview query starts so stale responses are ignored. */
let overviewRequestSeq = 0;

/** Optional role context for PMC Head page_size / dropdown enrich. */
let bootstrapUser: User | null = null;

function emit(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // ignore
    }
  });
}

function setState(patch: Partial<ProjectStoreState>): void {
  state = { ...state, ...patch };
  emit();
}

function isFresh(last: number | null, ttl: number, stale: boolean): boolean {
  if (stale || last == null) return false;
  return Date.now() - last < ttl;
}

function mapProjectRows(rows: unknown[]): Project[] {
  return rows
    .map((p) => normalizeBackendProjectRow(p as Record<string, unknown>))
    .filter((project) => project.id);
}

function buildDropdownFromProjects(backendProjects: Project[], isPmcHead: boolean): Project[] {
  let list = backendProjects.filter((p) => !isExcludedPmcTlProjectTitle(p.title));
  if (isPmcHead) {
    list = buildPmcHeadDropdownProjects(
      backendProjects,
      getKnownExecutiveProjectStubs(backendProjects),
      getHseExecutiveProjectStubs(backendProjects),
    );
  }
  return list;
}

function toOverviewApiQuery(q: ProjectOverviewStoreQuery): ProjectOverviewQuery {
  const billing = q.billingFilter ?? 'all';
  return {
    search: q.search?.trim() || undefined,
    ordering: q.ordering || DEFAULT_OVERVIEW_ORDERING,
    client: q.client && q.client !== 'all' ? q.client : undefined,
    ...(billing !== 'all'
      ? {
          status: 'completed',
          billing_status: billing === 'pending' ? 'Pending' : 'Completed',
        }
      : {}),
  };
}

export const projectStore = {
  getState(): ProjectStoreState {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setBootstrapUser(user: User | null): void {
    bootstrapUser = user;
  },

  selectProject(id: string | null): void {
    setState({ selectedProjectId: id });
  },

  updateProject(project: Project): void {
    const id = String(project.id);
    const projects = state.projects.map((p) => (String(p.id) === id ? { ...p, ...project } : p));
    const dropdownProjects = state.dropdownProjects.map((p) =>
      String(p.id) === id ? { ...p, ...project } : p,
    );
    setState({ projects, dropdownProjects });
  },

  removeProject(id: string | number): void {
    const sid = String(id);
    setState({
      projects: state.projects.filter((p) => String(p.id) !== sid),
      dropdownProjects: state.dropdownProjects.filter((p) => String(p.id) !== sid),
      overview: state.overview.filter((c) => String(c.projectId) !== sid),
      selectedProjectId:
        state.selectedProjectId && String(state.selectedProjectId) === sid
          ? null
          : state.selectedProjectId,
    });
  },

  addProject(project: Project): void {
    const id = String(project.id);
    const exists = state.projects.some((p) => String(p.id) === id);
    const projects = exists
      ? state.projects.map((p) => (String(p.id) === id ? { ...p, ...project } : p))
      : [...state.projects, project];
    const dropdownExists = state.dropdownProjects.some((p) => String(p.id) === id);
    const dropdownProjects = dropdownExists
      ? state.dropdownProjects.map((p) => (String(p.id) === id ? { ...p, ...project } : p))
      : [...state.dropdownProjects, project];
    setState({ projects, dropdownProjects });
  },

  /** Replace portfolio lists (optimistic App updates). */
  replaceProjects(projects: Project[]): void {
    setState({
      projects,
      dropdownProjects: projects,
      lastFetched: Date.now(),
      lastDropdownFetched: Date.now(),
      projectsStale: false,
      dropdownStale: false,
    });
  },

  /** Replace overview cards locally (e.g. after delete) without refetch. */
  replaceOverview(cards: ProjectVitalsCard[]): void {
    setState({ overview: cards });
  },

  invalidateProjects(): void {
    setState({ projectsStale: true });
    invalidateApiGetCache(['/projects-data/projects']);
  },

  invalidateOverview(): void {
    setState({ overviewStale: true });
    invalidateApiGetCache(['/projects/overview']);
  },

  invalidateDropdown(): void {
    setState({ dropdownStale: true });
  },

  /** Mark all project families stale and drop related GET cache entries. */
  invalidateAll(): void {
    setState({
      projectsStale: true,
      overviewStale: true,
      dropdownStale: true,
    });
    invalidateApiGetCache(['/projects-data/projects', '/projects/overview', '/projects/init']);
  },

  clearStore(): void {
    projectsInflight = null;
    overviewInflight = null;
    dropdownInflight = null;
    overviewRequestSeq += 1;
    bootstrapUser = null;
    state = { ...initialState };
    emit();
  },

  async loadProjects(force = false): Promise<Project[]> {
    if (
      !force &&
      state.projects.length > 0 &&
      isFresh(state.lastFetched, PROJECTS_TTL_MS, state.projectsStale)
    ) {
      return state.projects;
    }
    if (projectsInflight) return projectsInflight;

    projectsInflight = (async () => {
      setState({ loadingProjects: true, error: null });
      try {
        const isPmcHead = isPmcHeadEquivalent(bootstrapUser);
        const projectsRes = await projectApi.getProjects(
          isPmcHead ? { page_size: 1000 } : undefined,
        );
        const projectsData = unwrapList(projectsRes.data);
        if (isPmcHead) {
          seedProjectRowCache(projectsData);
        }
        const backendProjects = mapProjectRows(projectsData);
        const dropdown = buildDropdownFromProjects(backendProjects, isPmcHead);
        const projectsForState = isPmcHead
          ? dropdown
          : backendProjects.filter((p) => !isExcludedPmcTlProjectTitle(p.title));

        setState({
          projects: projectsForState,
          dropdownProjects: dropdown,
          loadingProjects: false,
          lastFetched: Date.now(),
          lastDropdownFetched: Date.now(),
          projectsStale: false,
          dropdownStale: false,
          error: null,
        });

        // Background enrich for PMC Head (same as prior App behavior)
        if (isPmcHead) {
          window.setTimeout(() => {
            void buildPmcHeadExecutiveProjectOptions(backendProjects)
              .then(({ projects: executiveProjects }) => {
                if (executiveProjects.length > 0) {
                  setState({
                    projects: executiveProjects,
                    dropdownProjects: executiveProjects,
                    lastFetched: Date.now(),
                    lastDropdownFetched: Date.now(),
                  });
                }
              })
              .catch(() => {
                // keep stubs
              });
          }, 0);
        }

        return projectStore.getState().projects;
      } catch (error) {
        const message = getApiErrorMessage(error, 'Unable to load projects.');
        setState({
          loadingProjects: false,
          error: message,
          projects: force ? [] : state.projects,
        });
        throw error;
      } finally {
        projectsInflight = null;
      }
    })();

    return projectsInflight;
  },

  async loadOverview(
    force = false,
    query: ProjectOverviewStoreQuery = { ordering: DEFAULT_OVERVIEW_ORDERING },
    options?: { signal?: AbortSignal },
  ): Promise<ProjectVitalsCard[]> {
    const nextQuery: ProjectOverviewStoreQuery = {
      ordering: query.ordering || DEFAULT_OVERVIEW_ORDERING,
      search: query.search,
      client: query.client,
      billingFilter: query.billingFilter ?? 'all',
    };
    const queryChanged =
      (state.overviewQuery.ordering || DEFAULT_OVERVIEW_ORDERING) !== nextQuery.ordering ||
      (state.overviewQuery.search || '') !== (nextQuery.search || '') ||
      (state.overviewQuery.client || 'all') !== (nextQuery.client || 'all') ||
      (state.overviewQuery.billingFilter || 'all') !== (nextQuery.billingFilter || 'all');

    if (
      !force &&
      !queryChanged &&
      state.lastOverviewFetched != null &&
      isFresh(state.lastOverviewFetched, OVERVIEW_TTL_MS, state.overviewStale)
    ) {
      return state.overview;
    }

    if (overviewInflight && !force && !queryChanged) {
      return overviewInflight;
    }

    const requestSeq = ++overviewRequestSeq;
    overviewInflight = (async () => {
      const keepExisting = state.overview.length > 0 && !force;
      setState({
        loadingOverview: !keepExisting,
        error: null,
        overviewQuery: nextQuery,
      });
      try {
        const result = await getProjectOverview(toOverviewApiQuery(nextQuery), {
          signal: options?.signal,
        });
        if (requestSeq !== overviewRequestSeq) {
          return projectStore.getState().overview;
        }
        setState({
          overview: result.cards,
          loadingOverview: false,
          lastOverviewFetched: Date.now(),
          overviewStale: false,
          error: null,
        });
        return result.cards;
      } catch (error) {
        if (requestSeq !== overviewRequestSeq) {
          return projectStore.getState().overview;
        }
        const message = getApiErrorMessage(error, 'Unable to load project overview.');
        setState({
          loadingOverview: false,
          error: message,
          // keep existing cards on background failure
          overview: keepExisting ? state.overview : [],
        });
        throw error;
      } finally {
        if (requestSeq === overviewRequestSeq) {
          overviewInflight = null;
        }
      }
    })();

    return overviewInflight;
  },

  /**
   * Dropdown options — no dedicated /projects/dropdown/ in this codebase;
   * derived from the projects list (PMC Head enrich included).
   */
  async loadDropdown(force = false): Promise<Project[]> {
    if (
      !force &&
      state.dropdownProjects.length > 0 &&
      isFresh(state.lastDropdownFetched, DROPDOWN_TTL_MS, state.dropdownStale)
    ) {
      return state.dropdownProjects;
    }
    if (dropdownInflight) return dropdownInflight;

    dropdownInflight = (async () => {
      setState({ loadingDropdown: true, error: null });
      try {
        await projectStore.loadProjects(force);
        const dropdown = projectStore.getState().dropdownProjects;
        setState({
          loadingDropdown: false,
          lastDropdownFetched: Date.now(),
          dropdownStale: false,
        });
        return dropdown;
      } catch (error) {
        setState({ loadingDropdown: false });
        throw error;
      } finally {
        dropdownInflight = null;
      }
    })();

    return dropdownInflight;
  },

  refreshProjects(): Promise<Project[]> {
    return projectStore.loadProjects(true);
  },

  refreshOverview(query?: ProjectOverviewStoreQuery): Promise<ProjectVitalsCard[]> {
    return projectStore.loadOverview(true, query ?? state.overviewQuery);
  },

  refreshDropdown(): Promise<Project[]> {
    return projectStore.loadDropdown(true);
  },

  /** After mutations: invalidate once, then single refresh pass. */
  async refreshAfterMutation(): Promise<void> {
    projectStore.invalidateAll();
    await Promise.allSettled([
      projectStore.refreshProjects(),
      projectStore.refreshOverview(state.overviewQuery),
    ]);
  },

  /** Sprint 2 parallel bootstrap — neither call awaits the other. */
  bootstrapParallel(): { projects: Promise<Project[]>; overview: Promise<ProjectVitalsCard[]> } {
    return {
      overview: projectStore.loadOverview(false, { ordering: DEFAULT_OVERVIEW_ORDERING }),
      projects: projectStore.loadProjects(false),
    };
  },
};

export type ProjectStore = typeof projectStore;
