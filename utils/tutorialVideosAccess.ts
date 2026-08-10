import type { User } from '../types';
import { UserRole } from '../types';
import { isPmcHeadEquivalent } from './pmcRoleAccess';

/**
 * Frontend UX gate for upload / edit / delete.
 * Backend RBAC remains authoritative.
 *
 * Allowed (per product): PMC Head equivalents, Team Leader, Admin (superuser).
 */
export function canManageTutorialVideos(
  user?: Pick<User, 'role' | 'isSuperuser'> | null,
): boolean {
  if (!user) return false;
  if (user.isSuperuser) return true;
  if (isPmcHeadEquivalent(user)) return true;
  return user.role === UserRole.TEAM_LEAD;
}
