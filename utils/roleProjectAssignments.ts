import type { Project, User } from '../types';
import { UserRole } from '../types';

export interface AssignedProjectOption {
  id: string;
  title: string;
}

export type EngineerAssignmentRole = 'qaqc' | 'billing' | 'site';

function normalizeToken(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function assigneeTokens(assignee: unknown): string[] {
  if (assignee == null || assignee === '') return [];
  if (typeof assignee === 'object') {
    const row = assignee as Record<string, unknown>;
    return [row.id, row.pk, row.username, row.email, row.name]
      .map(normalizeToken)
      .filter(Boolean);
  }
  return [normalizeToken(assignee)];
}

/** Match assignee field from API (id, username, email, or nested user object). */
export function userMatchesAssignee(user: User, assignee: unknown): boolean {
  const targets = assigneeTokens(assignee);
  if (!targets.length) return false;

  const candidates = [user.id, user.username, user.email, user.name]
    .map(normalizeToken)
    .filter(Boolean);

  return targets.some((target) => candidates.some((c) => c === target));
}

export function userMatchesAnyAssignee(user: User, assignees: unknown[]): boolean {
  return assignees.some((a) => userMatchesAssignee(user, a));
}

function projectTitleFromRow(row: Record<string, unknown>): string {
  return String(row.name ?? row.title ?? row.project_name ?? '').trim();
}

function projectIdFromRow(row: Record<string, unknown>): string {
  return String(row.id ?? '').trim();
}

export function rawProjectAssignedToUser(
  row: Record<string, unknown>,
  user: User,
  role: EngineerAssignmentRole,
): boolean {
  if (role === 'qaqc') {
    return userMatchesAssignee(user, row.qaqc_site_engineer ?? row.qaqcSiteEngineer);
  }
  if (role === 'billing') {
    return userMatchesAssignee(user, row.billing_site_engineer ?? row.billingSiteEngineer);
  }
  const engineers = row.site_engineers ?? row.siteEngineers;
  if (Array.isArray(engineers)) {
    return engineers.some((id) => userMatchesAssignee(user, id));
  }
  return userMatchesAssignee(user, engineers);
}

export function projectAssignedToUser(
  project: Project,
  user: User,
  role: EngineerAssignmentRole,
): boolean {
  if (role === 'qaqc') {
    return userMatchesAssignee(user, project.qaqcEngineerId);
  }
  if (role === 'billing') {
    return userMatchesAssignee(user, project.billingEngineerId);
  }
  return (project.siteEngineerIds ?? []).some((id) => userMatchesAssignee(user, id));
}

export function assignedProjectsFromList(
  projects: Project[],
  user: User,
  role: EngineerAssignmentRole,
): AssignedProjectOption[] {
  return projects
    .filter((p) => projectAssignedToUser(p, user, role))
    .map((p) => ({ id: p.id, title: p.title }))
    .filter((p) => p.title);
}

export function assignedProjectsFromRawApi(
  rows: Record<string, unknown>[],
  user: User,
  role: EngineerAssignmentRole,
): AssignedProjectOption[] {
  return rows
    .filter((row) => rawProjectAssignedToUser(row, user, role))
    .map((row) => ({
      id: projectIdFromRow(row),
      title: projectTitleFromRow(row),
    }))
    .filter((p) => p.id && p.title);
}

export function assignmentRoleForUser(user: User): EngineerAssignmentRole | null {
  if (user.role === UserRole.QAQC_SITE_ENGINEER) return 'qaqc';
  if (user.role === UserRole.BILLING_SITE_ENGINEER) return 'billing';
  if (user.role === UserRole.SITE_ENGINEER) return 'site';
  return null;
}

export function extractAssigneeId(assignee: unknown): string {
  if (assignee == null || assignee === '') return '';
  if (typeof assignee === 'object') {
    const row = assignee as Record<string, unknown>;
    const username = String(row.username ?? row.user_name ?? '').trim();
    if (username) return username;
    return String(row.id ?? row.pk ?? '').trim();
  }
  return String(assignee).trim();
}

export function mergeAssignedProjectOptions(
  ...lists: AssignedProjectOption[][]
): AssignedProjectOption[] {
  const map = new Map<string, AssignedProjectOption>();
  for (const list of lists) {
    for (const item of list) {
      if (item.title) map.set(item.title, item);
    }
  }
  return [...map.values()];
}
