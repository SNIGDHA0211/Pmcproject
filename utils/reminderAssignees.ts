import type { Project } from '../types';
import { lookupDirectoryUser, type DirectoryUser } from './userDirectory';

export interface ProjectReminderAssigneeOption {
  /** Numeric user id for Reminders API `assigned_to_id` */
  id: number;
  label: string;
  roleLabel: string;
  username?: string;
}

/**
 * Resolve a project assignment field (id or username) to a numeric User PK.
 * Never guess from display name alone — that caused wrong assigned_to_id values.
 */
function resolveNumericUserId(
  directory: DirectoryUser[],
  rawId: string | undefined | null,
  rawName: string | undefined | null,
): { id: number; username?: string; name?: string } | null {
  const key = String(rawId ?? '').trim();
  const name = String(rawName ?? '').trim();

  if (key) {
    const byKey = lookupDirectoryUser(directory, key);
    if (byKey) {
      const id = Number(byKey.id);
      if (Number.isFinite(id) && id > 0) {
        return {
          id,
          username: byKey.username,
          name: byKey.name || name || undefined,
        };
      }
    }
  }

  // Numeric PK stored directly on the project (e.g. pmc_head / coordinator ids)
  if (/^\d+$/.test(key)) {
    const id = Number(key);
    const byId = lookupDirectoryUser(directory, key);
    return {
      id,
      username: byId?.username,
      name: byId?.name || name || undefined,
    };
  }

  return null;
}

function pushAssignee(
  map: Map<number, ProjectReminderAssigneeOption>,
  directory: DirectoryUser[],
  rawId: string | undefined | null,
  rawName: string | undefined | null,
  roleLabel: string,
) {
  const resolved = resolveNumericUserId(directory, rawId, rawName);
  if (!resolved) return;

  const displayName =
    resolved.name?.trim() ||
    rawName?.trim() ||
    resolved.username?.trim() ||
    String(resolved.id);

  const label = resolved.username
    ? `${displayName} (${resolved.username}) · ${roleLabel}`
    : `${displayName} · ${roleLabel}`;

  if (!map.has(resolved.id)) {
    map.set(resolved.id, {
      id: resolved.id,
      label,
      roleLabel,
      username: resolved.username,
    });
  }
}

/**
 * Assignees = execution team on that project only
 * (Team Lead, Site Engineers, Billing/QAQC/HSE, Coordinators).
 * PMC Head is excluded — Reminder RBAC requires project assignment access.
 */
export function buildProjectReminderAssignees(
  project: Project | null | undefined,
  directory: DirectoryUser[],
): ProjectReminderAssigneeOption[] {
  if (!project) return [];

  const map = new Map<number, ProjectReminderAssigneeOption>();

  pushAssignee(map, directory, project.teamLeadId, project.teamLeadName, 'Team Leader');

  const seIds = project.siteEngineerIds ?? [];
  const seNames = project.siteEngineerNames ?? [];
  seIds.forEach((id, index) => {
    pushAssignee(map, directory, id, seNames[index], 'Site Engineer');
  });

  pushAssignee(
    map,
    directory,
    project.billingEngineerId,
    project.billingEngineerName,
    'Billing Site Engineer',
  );
  pushAssignee(
    map,
    directory,
    project.qaqcEngineerId,
    project.qaqcEngineerName,
    'QAQC Site Engineer',
  );
  pushAssignee(
    map,
    directory,
    project.hseEngineerId,
    project.hseEngineerName,
    'HSE Site Engineer',
  );

  const coordIds = project.coordinatorIds ?? [];
  const coordNames = project.coordinatorNames ?? [];
  coordIds.forEach((id, index) => {
    pushAssignee(map, directory, id, coordNames[index], 'PMC Manager');
  });

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}
