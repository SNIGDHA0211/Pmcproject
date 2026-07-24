import { User, UserRole } from '../types';
import { getApiBaseUrl } from '../config/apiConfig';
import { isPmcHeadOfficeBackendRole, isPmcManagerBackendRole } from './pmcRoleAccess';

export type BackendUserProfile = {
  id?: string | number;
  username?: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  groups?: string[];
  primary_role?: string;
  name?: string;
  role?: string;
  avatar?: string;
  profile_image?: string;
  profile_picture?: string;
  photo?: string;
};

function resolveAvatarUrl(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return undefined;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${getApiBaseUrl('main')}${trimmed}`;
  }
  return trimmed;
}

export function mapBackendUserToUser(userData: BackendUserProfile | null | undefined): User {
  if (!userData || typeof userData !== 'object') {
    return {
      id: '',
      name: 'User',
      email: '',
      role: UserRole.SITE_ENGINEER,
    };
  }

  const rawGroups = userData.groups;
  const userGroups: string[] = Array.isArray(rawGroups)
    ? rawGroups.map((g) => (typeof g === 'string' ? g : String((g as { name?: string }).name ?? g)))
    : [];
  const primaryRole = userData.primary_role || userData.role || '';

  let role = UserRole.SITE_ENGINEER;
  if (isPmcHeadOfficeBackendRole(userGroups, primaryRole, userData.username)) {
    role = UserRole.PMC_HEAD_OFFICE;
  } else if (userGroups.includes('PMC Head') || userGroups.includes('CEO') || primaryRole === 'PMC Head') {
    role = UserRole.PMC_HEAD;
  } else if (userGroups.includes('Team Leader') || primaryRole === 'Team Leader') {
    role = UserRole.TEAM_LEAD;
  } else if (isPmcManagerBackendRole(userGroups, primaryRole, userData.username)) {
    role = UserRole.COORDINATOR; // displayed as PMC Manager; same access as PMC Head
  } else if (
    userGroups.includes('Billing Site Engineer') ||
    primaryRole === 'Billing Site Engineer'
  ) {
    role = UserRole.BILLING_SITE_ENGINEER;
  } else if (
    userGroups.includes('HSE Site Engineer') ||
    primaryRole === 'HSE Site Engineer' ||
    /^pmc_hse\d+$/i.test(String(userData.username ?? '').trim())
  ) {
    role = UserRole.HSE_SITE_ENGINEER;
  } else if (
    userGroups.includes('QAQC Site Engineer') ||
    primaryRole === 'QAQC Site Engineer'
  ) {
    role = UserRole.QAQC_SITE_ENGINEER;
  } else if (userGroups.includes('Site Engineer') || primaryRole === 'Site Engineer') {
    role = UserRole.SITE_ENGINEER;
  }

  const fullName =
    userData.full_name?.trim() ||
    `${userData.first_name || ''} ${userData.last_name || ''}`.trim() ||
    userData.name ||
    userData.username ||
    'User';

  return {
    id: String(userData.id ?? userData.username ?? ''),
    name: fullName,
    email: userData.email || '',
    role,
    username: userData.username,
    avatar: resolveAvatarUrl(
      userData.avatar ??
        userData.profile_image ??
        userData.profile_picture ??
        userData.photo,
    ),
  };
}
