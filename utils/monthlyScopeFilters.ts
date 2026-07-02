import type { MonthlyScope, MonthlyScopeFilters } from '../types';

/** Normalize API/UI status values to pending | in_progress | completed. */
export function normalizeScopeStatus(status?: string | null): string {
  if (!status) return '';
  let normalized = status.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (normalized === 'inprogress') normalized = 'in_progress';
  if (normalized === 'complete') normalized = 'completed';
  return normalized;
}

export function scopeMatchesStatus(scope: MonthlyScope, filterStatus?: string): boolean {
  if (!filterStatus?.trim()) return true;
  return normalizeScopeStatus(scope.status) === normalizeScopeStatus(filterStatus);
}

export function scopeMatchesProject(scope: MonthlyScope, projectId?: number): boolean {
  if (projectId == null || Number.isNaN(Number(projectId))) return true;
  return Number(scope.project) === Number(projectId);
}

export function scopeMatchesMonth(scope: MonthlyScope, month?: string): boolean {
  if (!month?.trim()) return true;
  const filterMonth = month.trim().slice(0, 7);
  const scopeMonth = String(scope.month ?? '').slice(0, 7);
  return scopeMonth === filterMonth;
}

export function scopeMatchesSearch(scope: MonthlyScope, search?: string): boolean {
  const query = search?.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    scope.project_name,
    scope.category_name,
    scope.subcategory_name,
    scope.description,
    scope.section,
    scope.location,
    scope.unit,
    scope.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export function applyMonthlyScopeFilters(
  scopes: MonthlyScope[],
  filters: MonthlyScopeFilters
): MonthlyScope[] {
  return scopes.filter(
    (scope) =>
      scopeMatchesProject(scope, filters.project) &&
      scopeMatchesMonth(scope, filters.month) &&
      scopeMatchesStatus(scope, filters.status) &&
      scopeMatchesSearch(scope, filters.search)
  );
}

export function buildMonthlyScopeQueryParams(
  filters: MonthlyScopeFilters
): Record<string, string | number> {
  const params: Record<string, string | number> = {};

  if (filters.project != null && !Number.isNaN(Number(filters.project))) {
    params.project = Number(filters.project);
  }
  if (filters.month?.trim()) {
    params.month = filters.month.trim();
  }
  // Status is applied client-side — API values vary (e.g. "In Progress" vs in_progress).
  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }
  if (filters.page != null) {
    params.page = filters.page;
  }
  if (filters.page_size != null) {
    params.page_size = filters.page_size;
  }

  return params;
}
