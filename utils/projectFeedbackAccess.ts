import type { Project, User } from '../types';
import { UserRole } from '../types';
import { projectAssignedToUser, userMatchesAssignee } from './roleProjectAssignments';
import { isPmcHeadEquivalent } from './pmcRoleAccess';

/**
 * Project Feedback RBAC:
 * - Site Engineer: view only, assigned projects
 * - Team Leader: view / create / edit / delete on own projects
 * - PMC Head / PMC Manager: view all projects, update status / remarks / priority
 */

export function canViewProjectFeedback(role: UserRole): boolean {
  switch (role) {
    case UserRole.PMC_HEAD:
    case UserRole.PMC_HEAD_OFFICE:
    case UserRole.COORDINATOR:
    case UserRole.TEAM_LEAD:
    case UserRole.SITE_ENGINEER:
      return true;
    default:
      return false;
  }
}

export function canCreateProjectFeedback(role: UserRole): boolean {
  return role === UserRole.TEAM_LEAD;
}

export function canEditProjectFeedback(role: UserRole): boolean {
  return role === UserRole.TEAM_LEAD || isPmcHeadEquivalent(role);
}

export function canDeleteProjectFeedback(role: UserRole): boolean {
  return role === UserRole.TEAM_LEAD;
}

/** Status dropdown is PMC Head / PMC Manager. */
export function canUpdateFeedbackStatus(role: UserRole): boolean {
  return isPmcHeadEquivalent(role);
}

/** Team Leaders can edit content fields; PMC Head edits status/remarks/priority only. */
export function canEditFeedbackContent(role: UserRole): boolean {
  return role === UserRole.TEAM_LEAD;
}

export function feedbackProjectsForUser(
  projects: Project[],
  user: User,
): Project[] {
  if (!canViewProjectFeedback(user.role)) return [];
  if (isPmcHeadEquivalent(user.role)) return projects;

  if (user.role === UserRole.TEAM_LEAD) {
    return projects.filter(
      (p) => p.teamLeadId && userMatchesAssignee(user, p.teamLeadId),
    );
  }

  return projects.filter((p) => projectAssignedToUser(p, user, 'site'));
}
