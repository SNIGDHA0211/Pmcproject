import { UserRole, type User } from '../types';
import { ROLE_LABELS } from '../constants';

/** Roles that share PMC Head executive UI, nav, and access. */
export const PMC_HEAD_EQUIVALENT_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.PMC_HEAD,
  UserRole.PMC_HEAD_OFFICE,
  UserRole.COORDINATOR,
]);

/**
 * PMC Manager (Coordinator) and PMC Head Office share the same
 * frontend access and dashboards as PMC Head.
 */
export function isPmcHeadEquivalent(
  roleOrUser?: UserRole | Pick<User, 'role'> | string | null,
): boolean {
  if (roleOrUser == null) return false;
  if (typeof roleOrUser === 'object') {
    return PMC_HEAD_EQUIVALENT_ROLES.has(roleOrUser.role);
  }
  return PMC_HEAD_EQUIVALENT_ROLES.has(roleOrUser as UserRole);
}

/** Project Dates section capabilities by role (frontend gates for buttons). */
export type ProjectDatesSectionAccess = {
  roleLabel: string;
  canView: boolean;
  canEditDates: boolean;
  canAddContractor: boolean;
  canDeleteContractor: boolean;
  canManageBg: boolean;
  summary: string;
};

export function getProjectDatesSectionAccess(
  roleOrUser?: UserRole | Pick<User, 'role'> | string | null,
): ProjectDatesSectionAccess {
  const role =
    roleOrUser == null
      ? null
      : typeof roleOrUser === 'object'
        ? roleOrUser.role
        : (roleOrUser as UserRole);

  const roleLabel =
    role && ROLE_LABELS[role as UserRole]
      ? ROLE_LABELS[role as UserRole]
      : 'Unknown role';

  // Team Lead operates & updates schedule / BG
  if (role === UserRole.TEAM_LEAD) {
    return {
      roleLabel,
      canView: true,
      canEditDates: true,
      canAddContractor: true,
      canDeleteContractor: true,
      canManageBg: true,
      summary: 'Can view, edit dates, add/remove contractors, and manage BG status',
    };
  }

  // PMC Head / Head Office / PMC Manager / CEO — oversight (view only)
  if (
    role === UserRole.PMC_HEAD ||
    role === UserRole.PMC_HEAD_OFFICE ||
    role === UserRole.COORDINATOR ||
    role === UserRole.CEO
  ) {
    return {
      roleLabel,
      canView: true,
      canEditDates: false,
      canAddContractor: false,
      canDeleteContractor: false,
      canManageBg: false,
      summary: 'View-only · milestones, delay & BG status (no edit)',
    };
  }

  // Other site roles — view if they reach this screen
  return {
    roleLabel,
    canView: true,
    canEditDates: false,
    canAddContractor: false,
    canDeleteContractor: false,
    canManageBg: false,
    summary: 'View-only · contact Team Lead to update dates or BG',
  };
}

function normalizeRoleToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Backend still uses Coordinator group; also accept PMC Manager naming. */
export function isPmcManagerBackendRole(
  groups: string[],
  primaryRole?: string | null,
  username?: string | null,
): boolean {
  const role = normalizeRoleToken(String(primaryRole ?? ''));
  const user = String(username ?? '').trim().toLowerCase();
  if (
    groups.some((g) => {
      const name = normalizeRoleToken(String(g ?? ''));
      return name === 'coordinator' || name === 'pmc_manager';
    })
  ) {
    return true;
  }
  if (role === 'coordinator' || role === 'pmc_manager') {
    return true;
  }
  return user === 'pmc_coordinator' || user === 'pmc_manager';
}

/**
 * Detect PMC Head Office from Django groups / primary_role / username (pmc_ho).
 */
export function isPmcHeadOfficeBackendRole(
  groups: string[],
  primaryRole?: string | null,
  username?: string | null,
): boolean {
  const role = normalizeRoleToken(String(primaryRole ?? ''));
  const user = String(username ?? '').trim().toLowerCase();

  const groupMatch = groups.some((g) => {
    const name = normalizeRoleToken(String(g ?? ''));
    return (
      name === 'pmc_headoffice' ||
      name === 'pmc_head_office' ||
      name === 'headoffice' ||
      name === 'head_office'
    );
  });
  if (groupMatch) return true;

  if (
    role === 'pmc_headoffice' ||
    role === 'pmc_head_office' ||
    role === 'headoffice' ||
    role === 'head_office'
  ) {
    return true;
  }

  return user === 'pmc_ho' || user === 'pmc_headoffice' || user === 'pmc_head_office';
}
