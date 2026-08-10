import type { AppNotification } from '../types';
import { ROLE_LABELS } from '../constants';
import { UserRole } from '../types';
import {
  formatSubRoleUsername,
  isGenericActorDisplay,
  parseSubRoleUsername,
  resolveActorDisplayName,
} from './actorDisplay';
import { lookupDirectoryUser, type DirectoryUser } from './userDirectory';
import { extractAssigneeId } from './roleProjectAssignments';
import {
  fetchAllProjectRows,
  normalizeBackendProjectRow,
} from './pmcHeadExecutiveProjects';

export interface ProjectAssigneeInfo {
  title: string;
  teamLeadId?: string;
  teamLeadName?: string;
  siteEngineerIds: string[];
  siteEngineerNames: string[];
  billingEngineerId?: string;
  billingEngineerName?: string;
  qaqcEngineerId?: string;
  qaqcEngineerName?: string;
  hseEngineerId?: string;
  hseEngineerName?: string;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
}

function normalizeProjectName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function stripProjectCode(name: string): string {
  return normalizeProjectName(name.replace(/\s*\([^)]*\)\s*/g, ' '));
}

function findProjectByName(
  projects: ProjectAssigneeInfo[],
  projectName: string,
): ProjectAssigneeInfo | undefined {
  const target = normalizeProjectName(projectName);
  const targetStripped = stripProjectCode(projectName);
  if (!target) return undefined;

  const exact = projects.find(
    (project) => normalizeProjectName(project.title) === target,
  );
  if (exact) return exact;

  const stripped = projects.find(
    (project) => stripProjectCode(project.title) === targetStripped,
  );
  if (stripped) return stripped;

  return projects.find((project) => {
    const projectTitle = normalizeProjectName(project.title);
    const projectStripped = stripProjectCode(project.title);
    return (
      projectTitle.includes(targetStripped) ||
      targetStripped.includes(projectStripped) ||
      projectTitle.includes(target) ||
      target.includes(projectTitle)
    );
  });
}

function actorFromDirectoryUser(
  directoryUser: DirectoryUser,
  roleLabel: string,
): { displayName: string; username?: string; roleLabel: string } {
  const resolvedRole = directoryUser.roleLabel || roleLabel;
  return {
    displayName: resolveActorDisplayName({
      name: directoryUser.name,
      username: directoryUser.username,
      roleLabel: resolvedRole,
    }),
    username: directoryUser.username,
    roleLabel: resolvedRole,
  };
}

function actorFromSubRoleToken(
  token: string,
  directory: DirectoryUser[],
  roleLabel: string,
): { displayName: string; username?: string; roleLabel: string } | undefined {
  const parsed = parseSubRoleUsername(token);
  if (!parsed) return undefined;

  const directoryUser = lookupDirectoryUser(directory, parsed) || lookupDirectoryUser(directory, token);
  if (directoryUser) {
    return actorFromDirectoryUser(directoryUser, roleLabel);
  }

  return {
    displayName: formatSubRoleUsername(parsed) || parsed.toUpperCase(),
    username: parsed,
    roleLabel,
  };
}

function actorFromAssigneeKeys(
  keys: string[],
  directory: DirectoryUser[],
  roleLabel: string,
): { displayName: string; username?: string; roleLabel: string } | undefined {
  for (const key of keys) {
    const directoryUser = lookupDirectoryUser(directory, key);
    if (directoryUser) {
      return actorFromDirectoryUser(directoryUser, roleLabel);
    }

    const fromToken = actorFromSubRoleToken(key, directory, roleLabel);
    if (fromToken) return fromToken;
  }
  return undefined;
}

function assigneeKeysForModule(
  project: ProjectAssigneeInfo,
  moduleName: string,
): string[] {
  const key = moduleName.trim().toLowerCase();
  switch (key) {
    case 'manpower management':
    case 'project dates':
    case 'correspondence':
    case 'drawing register':
    case 'wpr':
      return uniqueStrings([project.teamLeadId, project.teamLeadName]);
    case 'health & safety':
    case 'quality status':
      return uniqueStrings([
        project.qaqcEngineerId,
        project.qaqcEngineerName,
        project.siteEngineerIds[0],
        project.siteEngineerNames[0],
      ]);
    case 'invoicing':
    case 'cash flow':
    case 'contract values':
    case 'cost performance':
    case 'budget performance':
    case 'contract performance':
    case 'planned earned value':
      return uniqueStrings([project.billingEngineerId, project.billingEngineerName]);
    case 'site photos':
    case 'monthly scope':
    case 'dpr':
      return uniqueStrings([
        ...project.siteEngineerIds,
        ...project.siteEngineerNames,
      ]);
    default:
      return uniqueStrings([
        project.teamLeadId,
        project.teamLeadName,
        project.siteEngineerIds[0],
        project.siteEngineerNames[0],
      ]);
  }
}

function roleLabelForModule(moduleName: string): string {
  const key = moduleName.trim().toLowerCase();
  switch (key) {
    case 'manpower management':
    case 'project dates':
    case 'correspondence':
    case 'drawing register':
    case 'wpr':
      return ROLE_LABELS[UserRole.TEAM_LEAD];
    case 'health & safety':
    case 'quality status':
      return ROLE_LABELS[UserRole.QAQC_SITE_ENGINEER];
    case 'invoicing':
    case 'cash flow':
    case 'contract values':
    case 'cost performance':
    case 'budget performance':
    case 'contract performance':
    case 'planned earned value':
      return ROLE_LABELS[UserRole.BILLING_SITE_ENGINEER];
    default:
      return ROLE_LABELS[UserRole.SITE_ENGINEER];
  }
}

export function resolveActorFromProjectAssignment(
  projectName: string,
  moduleName: string,
  projects: ProjectAssigneeInfo[],
  directory: DirectoryUser[],
): { displayName: string; username?: string; roleLabel: string } | undefined {
  const project = findProjectByName(projects, projectName);
  if (!project) return undefined;
  const roleLabel = roleLabelForModule(moduleName);
  const keys = assigneeKeysForModule(project, moduleName);
  return actorFromAssigneeKeys(keys, directory, roleLabel);
}

export function enrichActorFromProjectAssignment(
  actor: { displayName: string; roleLabel?: string; username?: string },
  projectName: string,
  moduleName: string,
  projects: ProjectAssigneeInfo[],
  directory: DirectoryUser[],
): { displayName: string; roleLabel?: string; username?: string } {
  const needsFallback =
    isGenericActorDisplay(actor.displayName, actor.roleLabel) || !actor.username;

  if (!needsFallback) return actor;

  const fallback = resolveActorFromProjectAssignment(
    projectName,
    moduleName,
    projects,
    directory,
  );
  if (!fallback) return actor;

  return {
    displayName: fallback.displayName,
    username: fallback.username || actor.username,
    roleLabel: fallback.roleLabel || actor.roleLabel,
  };
}

function patchNotificationMessage(
  message: string,
  previousName: string | undefined,
  nextName: string,
  roleLabel?: string,
): string {
  if (!message?.trim()) return message;
  const previous = previousName?.trim() || 'Team member';
  const previousLine = roleLabel ? `${previous} · ${roleLabel}` : previous;
  const nextLine = roleLabel ? `${nextName} · ${roleLabel}` : nextName;
  if (message.includes(previousLine)) {
    return message.replace(previousLine, nextLine);
  }
  if (message.includes(previous)) {
    return message.replace(previous, nextName);
  }
  return message;
}

export function enrichNotificationActor(
  notification: AppNotification,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): AppNotification {
  const needsEnrichment =
    isGenericActorDisplay(notification.senderName, notification.senderRole) ||
    !notification.senderUsername;

  if (!needsEnrichment || !notification.projectName) {
    return notification;
  }

  const actor = resolveActorFromProjectAssignment(
    notification.projectName,
    notification.moduleName || '',
    projects,
    directory,
  );
  if (!actor) return notification;

  const roleLabel = actor.roleLabel || notification.senderRole;
  return {
    ...notification,
    senderName: actor.displayName,
    senderUsername: actor.username || notification.senderUsername,
    senderRole: roleLabel,
    message: patchNotificationMessage(
      notification.message,
      notification.senderName,
      actor.displayName,
      roleLabel,
    ),
  };
}

export function enrichNotificationsActors(
  notifications: AppNotification[],
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): AppNotification[] {
  return notifications.map((notification) =>
    enrichNotificationActor(notification, directory, projects),
  );
}

export function projectToAssigneeInfo(project: {
  title?: string;
  teamLeadId?: string;
  teamLeadName?: string;
  siteEngineerIds?: string[];
  billingEngineerId?: string;
  billingEngineerName?: string;
  qaqcEngineerId?: string;
  qaqcEngineerName?: string;
  hseEngineerId?: string;
  hseEngineerName?: string;
}): ProjectAssigneeInfo {
  return {
    title: String(project.title ?? ''),
    teamLeadId: project.teamLeadId || undefined,
    teamLeadName: project.teamLeadName || undefined,
    siteEngineerIds: Array.isArray(project.siteEngineerIds)
      ? project.siteEngineerIds.map(String).filter(Boolean)
      : [],
    siteEngineerNames: [],
    billingEngineerId: project.billingEngineerId || undefined,
    billingEngineerName: project.billingEngineerName || undefined,
    qaqcEngineerId: project.qaqcEngineerId || undefined,
    qaqcEngineerName: project.qaqcEngineerName || undefined,
    hseEngineerId: project.hseEngineerId || undefined,
    hseEngineerName: project.hseEngineerName || undefined,
  };
}

export async function loadProjectsForActorFallback(): Promise<ProjectAssigneeInfo[]> {
  try {
    // Reuse the shared project-row cache / GET dedupe instead of a bare list call.
    const rows = await fetchAllProjectRows();
    return rows.map((p) => {
      const project = normalizeBackendProjectRow(p);
      return {
        title: String(project.title ?? p.name ?? p.title ?? ''),
        teamLeadId: project.teamLeadId || extractAssigneeId(p.team_lead) || undefined,
        teamLeadName:
          project.teamLeadName ||
          String(p.team_lead_name ?? '').trim() ||
          undefined,
        siteEngineerIds: Array.isArray(p.site_engineers)
          ? p.site_engineers.map((id) => extractAssigneeId(id)).filter(Boolean)
          : [],
        siteEngineerNames: Array.isArray(p.site_engineer_names)
          ? p.site_engineer_names.map((name) => String(name).trim()).filter(Boolean)
          : [],
        billingEngineerId: extractAssigneeId(p.billing_site_engineer) || undefined,
        billingEngineerName:
          String(p.billing_engineer_name ?? '').trim() || undefined,
        qaqcEngineerId: extractAssigneeId(p.qaqc_site_engineer) || undefined,
        qaqcEngineerName: String(p.qaqc_engineer_name ?? '').trim() || undefined,
        hseEngineerId: extractAssigneeId(p.hse_site_engineer) || undefined,
        hseEngineerName: String(p.hse_engineer_name ?? '').trim() || undefined,
      };
    });
  } catch {
    return [];
  }
}
