import type { Project, User } from '../types';
import { UserRole } from '../types';
import { projectAssignedToUser, userMatchesAssignee } from './roleProjectAssignments';

/**
 * Project Feedback RBAC:
 * - Site Engineer: view only, assigned projects
 * - Team Leader: view / create / edit / delete on own projects
 * - PMC Head: view all projects, update status / remarks / priority
 * (No dedicated Admin role exists in the frontend enum — PMC Head is highest.)
 */

export function canViewProjectFeedback(role: UserRole): boolean {
  switch (role) {
    case UserRole.PMC_HEAD:
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
  return role === UserRole.TEAM_LEAD || role === UserRole.PMC_HEAD;
}

export function canDeleteProjectFeedback(role: UserRole): boolean {
  return role === UserRole.TEAM_LEAD;
}

/** Status dropdown is PMC Head only. */
export function canUpdateFeedbackStatus(role: UserRole): boolean {
  return role === UserRole.PMC_HEAD;
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
  if (user.role === UserRole.PMC_HEAD) return projects;

  if (user.role === UserRole.TEAM_LEAD) {
    return projects.filter(
      (p) => p.teamLeadId && userMatchesAssignee(user, p.teamLeadId),
    );
  }

  return projects.filter((p) => projectAssignedToUser(p, user, 'site'));
}
