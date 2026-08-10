import { useMemo, useRef, useSyncExternalStore } from 'react';
import type { Project } from '../types';
import type { ProjectVitalsCard } from '../utils/projectVitals';
import {
  projectStore,
  type ProjectOverviewStoreQuery,
  type ProjectStoreState,
} from '../stores/projectStore';

function subscribe(onStoreChange: () => void): () => void {
  return projectStore.subscribe(onStoreChange);
}

/** Subscribe to a slice of the project store. */
export function useProjectStoreSelector<T>(selector: (s: ProjectStoreState) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  return useSyncExternalStore(
    subscribe,
    () => selectorRef.current(projectStore.getState()),
    () => selectorRef.current(projectStore.getState()),
  );
}

export function useProjects(): Project[] {
  return useProjectStoreSelector((s) => s.projects);
}

export function useOverviewCards(): ProjectVitalsCard[] {
  return useProjectStoreSelector((s) => s.overview);
}

export function useDropdownProjects(): Project[] {
  return useProjectStoreSelector((s) => s.dropdownProjects);
}

export function useSelectedProjectId(): string | null {
  return useProjectStoreSelector((s) => s.selectedProjectId);
}

export function useSelectedProject(): Project | null {
  return useProjectStoreSelector((s) => {
    if (!s.selectedProjectId) return null;
    return (
      s.projects.find((p) => String(p.id) === String(s.selectedProjectId)) ??
      s.dropdownProjects.find((p) => String(p.id) === String(s.selectedProjectId)) ??
      null
    );
  });
}

export function useProjectsLoading(): boolean {
  return useProjectStoreSelector((s) => s.loadingProjects);
}

export function useOverviewLoading(): boolean {
  return useProjectStoreSelector((s) => s.loadingOverview);
}

export function useProjectStoreError(): string | null {
  return useProjectStoreSelector((s) => s.error);
}

export function useProjectStoreActions() {
  return useMemo(
    () => ({
      loadProjects: (force?: boolean) => projectStore.loadProjects(force),
      loadOverview: (
        force?: boolean,
        query?: ProjectOverviewStoreQuery,
        options?: { signal?: AbortSignal },
      ) => projectStore.loadOverview(force, query, options),
      loadDropdown: (force?: boolean) => projectStore.loadDropdown(force),
      refreshProjects: () => projectStore.refreshProjects(),
      refreshOverview: (query?: ProjectOverviewStoreQuery) => projectStore.refreshOverview(query),
      refreshDropdown: () => projectStore.refreshDropdown(),
      selectProject: (id: string | null) => projectStore.selectProject(id),
      updateProject: (project: Project) => projectStore.updateProject(project),
      removeProject: (id: string | number) => projectStore.removeProject(id),
      addProject: (project: Project) => projectStore.addProject(project),
      invalidateProjects: () => projectStore.invalidateProjects(),
      invalidateOverview: () => projectStore.invalidateOverview(),
      invalidateDropdown: () => projectStore.invalidateDropdown(),
      invalidateAll: () => projectStore.invalidateAll(),
      refreshAfterMutation: () => projectStore.refreshAfterMutation(),
      clearStore: () => projectStore.clearStore(),
    }),
    [],
  );
}
