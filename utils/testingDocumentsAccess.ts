import type { Project, User } from '../types';
import { UserRole } from '../types';
import { projectAssignedToUser, userMatchesAssignee } from './roleProjectAssignments';

type TestingPhotosUserRef = Pick<User, 'id' | 'role'> &
  Partial<Pick<User, 'username' | 'email' | 'name'>>;

type TestingPhotosProjectRef = Pick<
  Project,
  'id' | 'title' | 'teamLeadId' | 'qaqcEngineerId'
>;

/** Roles that may open Testing Photos at all. */
export function canViewTestingPhotos(role: UserRole): boolean {
  switch (role) {
    case UserRole.PMC_HEAD:
    case UserRole.TEAM_LEAD:
    case UserRole.QAQC_SITE_ENGINEER:
      return true;
    default:
      return false;
  }
}

export function canEditTestingPhotos(role: UserRole): boolean {
  return canViewTestingPhotos(role);
}

/**
 * Project-scoped Testing Photos access:
 * - PMC Head: all projects
 * - Team Leader: only projects where they are team lead
 * - QAQC Site Engineer: only their assigned QAQC projects
 */
export function canAccessTestingPhotosForProject(
  user: TestingPhotosUserRef,
  project: TestingPhotosProjectRef | null | undefined,
): boolean {
  if (!canViewTestingPhotos(user.role)) return false;
  if (user.role === UserRole.PMC_HEAD) return true;
  if (!project?.id && !project?.title) return false;

  if (user.role === UserRole.TEAM_LEAD) {
    if (!project.teamLeadId) return false;
    return userMatchesAssignee(user as User, project.teamLeadId);
  }

  if (user.role === UserRole.QAQC_SITE_ENGINEER) {
    return projectAssignedToUser(project as Project, user as User, 'qaqc');
  }

  return false;
}

/** Filter projects visible on Testing Photos for this user. */
export function testingPhotosProjectsForUser(
  projects: Project[],
  user: TestingPhotosUserRef,
): Project[] {
  if (!canViewTestingPhotos(user.role)) return [];
  if (user.role === UserRole.PMC_HEAD) return projects;
  return projects.filter((project) => canAccessTestingPhotosForProject(user, project));
}
