import type { User } from '../types';
import { UserRole } from '../types';
import { isPmcHeadEquivalent } from './pmcRoleAccess';
import type { TutorialSectionKey } from './tutorialVideosSections';

/**
 * Frontend UX gate for upload / edit / delete.
 * Backend RBAC remains authoritative.
 *
 * - PMC Head / PMC HO / PMC Manager (Coordinator): manage executive sections
 * - Team Leader: manage TL sections only (not PMC Head Overview)
 * - Admin (superuser): all
 */
export function canManageTutorialVideos(
  user?: Pick<User, 'role' | 'isSuperuser'> | null,
  section?: TutorialSectionKey | string | null,
): boolean {
  if (!user) return false;
  if (user.isSuperuser) return true;

  const key = String(section || '').toLowerCase();

  // PMC Head family owns executive Overview (`overview`) and other head modules.
  if (isPmcHeadEquivalent(user)) {
    // Do not let Head roles manage Team Leader–only overview bucket.
    if (key === 'tl_overview') return false;
    return true;
  }

  // Team Leader may manage TL Overview and shared field modules they use —
  // never the PMC Head `overview` section.
  if (user.role === UserRole.TEAM_LEAD) {
    if (key === 'overview') return false;
    return true;
  }

  return false;
}

/** Who may view videos stored under a section key. */
export function canViewTutorialSection(
  user?: Pick<User, 'role' | 'isSuperuser'> | null,
  section?: TutorialSectionKey | string | null,
): boolean {
  if (!user) return false;
  if (user.isSuperuser) return true;

  const key = String(section || '').toLowerCase();

  if (key === 'overview') {
    // PMC Head Overview videos: Head / HO / Manager only (not Team Leader).
    return isPmcHeadEquivalent(user);
  }

  if (key === 'tl_overview') {
    return user.role === UserRole.TEAM_LEAD;
  }

  return true;
}
