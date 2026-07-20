import { ROLE_LABELS } from '../constants';
import { UserRole } from '../types';
import { projectApi, unwrapList } from '../services/api';
import { formatSubRoleUsername, parseSubRoleUsername } from './actorDisplay';

export interface DirectoryUser {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  roleLabel?: string;
}

let directoryCache: DirectoryUser[] | null = null;
let directoryPromise: Promise<DirectoryUser[]> | null = null;

function normalizeDirectoryUser(raw: Record<string, unknown>): DirectoryUser | null {
  const id = raw.id ?? raw.user_id ?? raw.pk;
  if (id == null) return null;

  const username = String(
    raw.username ?? raw.user_name ?? raw.login ?? '',
  ).trim() || undefined;
  const name = String(
    raw.name ?? raw.full_name ?? raw.display_name ?? '',
  ).trim() || undefined;
  const email = String(raw.email ?? '').trim() || undefined;

  const groups = Array.isArray(raw.groups)
    ? raw.groups.map((g) => String((g as { name?: string }).name ?? g))
    : [];
  const primaryRole = String(raw.primary_role ?? raw.role ?? '').trim();

  let roleLabel: string | undefined;
  if (groups.includes('Team Leader') || primaryRole === 'Team Leader') {
    roleLabel = ROLE_LABELS[UserRole.TEAM_LEAD];
  } else if (groups.includes('HSE Site Engineer') || primaryRole === 'HSE Site Engineer') {
    roleLabel = ROLE_LABELS[UserRole.HSE_SITE_ENGINEER];
  } else if (groups.includes('QAQC Site Engineer') || primaryRole === 'QAQC Site Engineer') {
    roleLabel = ROLE_LABELS[UserRole.QAQC_SITE_ENGINEER];
  } else if (groups.includes('Billing Site Engineer') || primaryRole === 'Billing Site Engineer') {
    roleLabel = ROLE_LABELS[UserRole.BILLING_SITE_ENGINEER];
  } else if (groups.includes('Site Engineer') || primaryRole === 'Site Engineer') {
    roleLabel = ROLE_LABELS[UserRole.SITE_ENGINEER];
  } else if (groups.includes('Coordinator') || primaryRole === 'Coordinator') {
    roleLabel = ROLE_LABELS[UserRole.COORDINATOR];
  }

  return {
    id: String(id),
    name,
    username,
    email,
    roleLabel,
  };
}

async function fetchUsersForRole(role?: string): Promise<DirectoryUser[]> {
  try {
    const response = await projectApi.getAvailableUsers(role);
    const rows = unwrapList<Record<string, unknown>>(response.data);
    return rows
      .map((row) => normalizeDirectoryUser(row))
      .filter((row): row is DirectoryUser => Boolean(row));
  } catch {
    return [];
  }
}

export async function loadUserDirectory(force = false): Promise<DirectoryUser[]> {
  if (!force && directoryCache) return directoryCache;
  if (!force && directoryPromise) return directoryPromise;

  directoryPromise = (async () => {
    const batches = await Promise.all([
      fetchUsersForRole(),
      fetchUsersForRole('Team Leader'),
      fetchUsersForRole('Site Engineer'),
      fetchUsersForRole('Billing Site Engineer'),
      fetchUsersForRole('QAQC Site Engineer'),
      fetchUsersForRole('HSE Site Engineer'),
      fetchUsersForRole('Coordinator'),
    ]);

    const byId = new Map<string, DirectoryUser>();
    for (const batch of batches) {
      for (const user of batch) {
        const existing = byId.get(user.id);
        byId.set(user.id, existing ? { ...existing, ...user } : user);
      }
    }

    directoryCache = Array.from(byId.values());
    return directoryCache;
  })();

  return directoryPromise;
}

export function lookupDirectoryUser(
  directory: DirectoryUser[],
  key?: string | number | null,
): DirectoryUser | undefined {
  if (key == null) return undefined;
  const raw = String(key).trim();
  if (!raw) return undefined;

  const lower = raw.toLowerCase();
  const parsedKey = parseSubRoleUsername(raw);
  const formattedKey = formatSubRoleUsername(raw)?.toLowerCase();

  return directory.find((user) => {
    if (user.id === raw) return true;
    if (user.username?.toLowerCase() === lower) return true;
    if (user.email?.toLowerCase() === lower) return true;
    if (user.name?.toLowerCase() === lower) return true;
    if (formatSubRoleUsername(user.username)?.toLowerCase() === lower) return true;
    if (parsedKey && user.username?.toLowerCase() === parsedKey) return true;
    if (formattedKey && formatSubRoleUsername(user.username)?.toLowerCase() === formattedKey) {
      return true;
    }
    if (parsedKey && parseSubRoleUsername(user.name)?.toLowerCase() === parsedKey) return true;
    return false;
  });
}

export function clearUserDirectoryCache(): void {
  directoryCache = null;
  directoryPromise = null;
}
