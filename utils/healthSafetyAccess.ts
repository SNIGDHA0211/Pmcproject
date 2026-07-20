import { UserRole } from '../types';

/** Roles that can open Health & Safety UI for a project. */
export function canViewHealthSafety(role: UserRole): boolean {
  switch (role) {
    case UserRole.HSE_SITE_ENGINEER:
    case UserRole.SITE_ENGINEER:
    case UserRole.QAQC_SITE_ENGINEER:
    case UserRole.TEAM_LEAD:
    case UserRole.PMC_HEAD:
    case UserRole.COORDINATOR:
    case UserRole.CEO:
      return true;
    case UserRole.BILLING_SITE_ENGINEER:
    default:
      return false;
  }
}

/**
 * Who may create/update HSE monthly records (practical site ownership).
 * HSE Site Engineer is primary; Site / QAQC / TL / PMC Head can still save.
 * Coordinator & CEO are view-only. Billing has no access.
 */
export function canEditHealthSafety(role: UserRole): boolean {
  switch (role) {
    case UserRole.HSE_SITE_ENGINEER:
    case UserRole.SITE_ENGINEER:
    case UserRole.QAQC_SITE_ENGINEER:
    case UserRole.TEAM_LEAD:
    case UserRole.PMC_HEAD:
      return true;
    default:
      return false;
  }
}

export function isHseSiteEngineerRole(role: UserRole): boolean {
  return role === UserRole.HSE_SITE_ENGINEER;
}
