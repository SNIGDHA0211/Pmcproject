import type { MonthlyScope } from '../types';
import { normalizeScopeStatus } from './monthlyScopeFilters';
import {
  readScopeCompletedQuantity,
  readScopePlannedQuantity,
  readScopeProgressPercent,
} from './scopeProgressFields';

export interface QaqcScopeSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  avgProgress: number;
  plannedQty: number;
  executedQty: number;
}

export function computeQaqcScopeSummary(scopes: MonthlyScope[]): QaqcScopeSummary {
  if (!scopes.length) {
    return {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      avgProgress: 0,
      plannedQty: 0,
      executedQty: 0,
    };
  }

  let pending = 0;
  let inProgress = 0;
  let completed = 0;
  let progressSum = 0;
  let plannedQty = 0;
  let executedQty = 0;

  for (const scope of scopes) {
    const status = normalizeScopeStatus(scope.status);
    if (status === 'completed') completed += 1;
    else if (status === 'in_progress') inProgress += 1;
    else pending += 1;
    progressSum += Number(readScopeProgressPercent(scope) ?? scope.progress_percentage) || 0;
    plannedQty += readScopePlannedQuantity(scope);
    executedQty += readScopeCompletedQuantity(scope);
  }

  return {
    total: scopes.length,
    pending,
    inProgress,
    completed,
    avgProgress: Math.round((progressSum / scopes.length) * 10) / 10,
    plannedQty,
    executedQty,
  };
}

export function buildStatusChartData(summary: QaqcScopeSummary) {
  return [
    { name: 'Pending', value: summary.pending, color: '#F59E0B' },
    { name: 'In Progress', value: summary.inProgress, color: '#3B82F6' },
    { name: 'Completed', value: summary.completed, color: '#10B981' },
  ].filter((row) => row.value > 0);
}

export function buildCategoryProgressData(scopes: MonthlyScope[]) {
  const map = new Map<string, { planned: number; executed: number; progressSum: number; count: number }>();

  for (const scope of scopes) {
    const key = scope.category_name || 'Uncategorized';
    const entry = map.get(key) ?? { planned: 0, executed: 0, progressSum: 0, count: 0 };
    entry.planned += Number(scope.planned_quantity) || 0;
    entry.executed += Number(scope.executed_quantity) || 0;
    entry.progressSum += Number(scope.progress_percentage) || 0;
    entry.count += 1;
    map.set(key, entry);
  }

  return [...map.entries()]
    .map(([category, stats]) => ({
      category: category.length > 18 ? `${category.slice(0, 16)}…` : category,
      fullCategory: category,
      progress: stats.count ? Math.round(stats.progressSum / stats.count) : 0,
      planned: stats.planned,
      executed: stats.executed,
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 8);
}

export function buildProjectScopeData(scopes: MonthlyScope[]) {
  const map = new Map<string, number>();

  for (const scope of scopes) {
    const key = scope.project_name || `Project ${scope.project}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return [...map.entries()]
    .map(([project, count]) => ({ project, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function primaryProjectName(scopes: MonthlyScope[]): string | null {
  const counts = buildProjectScopeData(scopes);
  return counts[0]?.project ?? null;
}
