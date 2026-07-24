import type { Project, User } from '../types';
import { UserRole } from '../types';
import { projectAssignedToUser, userMatchesAssignee } from './roleProjectAssignments';
import { isPmcHeadEquivalent } from './pmcRoleAccess';

type HealthSafetyProjectRef = Pick<
  Project,
  'id' | 'title' | 'teamLeadId' | 'hseEngineerId'
>;

type HealthSafetyUserRef = Pick<User, 'id' | 'role'> &
  Partial<Pick<User, 'username' | 'email' | 'name'>>;

/** Roles allowed to open Health & Safety UI at all. */
export function canViewHealthSafety(role: UserRole): boolean {
  switch (role) {
    case UserRole.HSE_SITE_ENGINEER:
    case UserRole.TEAM_LEAD:
    case UserRole.PMC_HEAD:
    case UserRole.PMC_HEAD_OFFICE:
    case UserRole.COORDINATOR:
      return true;
    default:
      return false;
  }
}

/** Same roles may create/update HSE records (subject to project scope). */
export function canEditHealthSafety(role: UserRole): boolean {
  return canViewHealthSafety(role);
}

function resolveProjectTitle(
  project: HealthSafetyProjectRef | null | undefined,
  projectTitle?: string | null,
): string {
  return String(project?.title ?? projectTitle ?? '').trim();
}

/**
 * Project-scoped HSE access:
 * - PMC Head / PMC Manager: all projects
 * - Team Leader: only projects where they are team lead
 * - HSE Site Engineer: only their assigned HSE project(s)
 */
export function canViewHealthSafetyForProject(
  user: HealthSafetyUserRef,
  project: HealthSafetyProjectRef | null | undefined,
  options?: { projectTitle?: string | null },
): boolean {
  if (!canViewHealthSafety(user.role)) return false;
  if (isPmcHeadEquivalent(user.role)) return true;

  const title = resolveProjectTitle(project, options?.projectTitle);
  if (!title) return false;

  if (user.role === UserRole.TEAM_LEAD) {
    if (!project?.teamLeadId) return false;
    return userMatchesAssignee(user as User, project.teamLeadId);
  }

  if (user.role === UserRole.HSE_SITE_ENGINEER) {
    const ref = {
      id: project?.id ?? '',
      title,
      teamLeadId: project?.teamLeadId ?? '',
      hseEngineerId: project?.hseEngineerId,
    } as Project;
    return projectAssignedToUser(ref, user as User, 'hse');
  }

  return false;
}

export function canEditHealthSafetyForProject(
  user: HealthSafetyUserRef,
  project: HealthSafetyProjectRef | null | undefined,
  options?: { projectTitle?: string | null },
): boolean {
  return canViewHealthSafetyForProject(user, project, options);
}

export function isHseSiteEngineerRole(role: UserRole): boolean {
  return role === UserRole.HSE_SITE_ENGINEER;
}
