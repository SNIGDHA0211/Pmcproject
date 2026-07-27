import { UserRole, type User } from '../types';

/**
 * HO User Management is available to Head Office, CEO, PMC Head, and Django
 * superusers — not Team Leaders, site roles, or PMC Manager (Coordinator).
 */
export function canAccessUserManagement(
  user?: Pick<User, 'role' | 'isSuperuser'> | null,
): boolean {
  if (!user) return false;
  if (user.isSuperuser) return true;
  return (
    user.role === UserRole.PMC_HEAD ||
    user.role === UserRole.PMC_HEAD_OFFICE ||
    user.role === UserRole.CEO
  );
}
