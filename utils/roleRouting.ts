import { UserRole, type User } from '../types';
import { SITE_ENGINEER_NAV_IDS } from './siteEngineerProjects';
import {
  getAppRoutePath,
  LOGIN_ROUTE,
  syncAppRoutePath,
  tabFromRoutePath,
  TAB_PATHS,
} from './appRouting';
import { canAccessUserManagement } from './userManagementAccess';

export { LOGIN_ROUTE };

/** Tabs shared by PMC Head / Head Office (includes User Management). */
const PMC_HEAD_USER_MGMT_TAB = 'user_management' as const;

const PMC_HEAD_TABS = [
  'dashboard',
  'team_projects',
  'project_init',
  'execution',
  'site_photos',
  'testing_photos',
  'projects',
  'dpr_records',
  'wpr_records',
  'meeting_documents',
  'project_feedback',
  'alerts',
  PMC_HEAD_USER_MGMT_TAB,
] as const;

const ROLE_DEFAULT_TAB: Record<UserRole, string> = {
  [UserRole.PMC_HEAD]: 'dashboard',
  [UserRole.PMC_HEAD_OFFICE]: 'dashboard',
  [UserRole.CEO]: 'dashboard',
  [UserRole.COORDINATOR]: 'dashboard', // PMC Manager — same home as PMC Head
  [UserRole.TEAM_LEAD]: 'team_projects',
  [UserRole.SITE_ENGINEER]: 'site_engineer_dashboard',
  [UserRole.BILLING_SITE_ENGINEER]: 'my_scopes',
  [UserRole.QAQC_SITE_ENGINEER]: 'my_scopes',
  [UserRole.HSE_SITE_ENGINEER]: 'my_scopes',
};

function teamLeadTabs(): string[] {
  return [
    'team_projects',
    'execution',
    'monthly_scope',
    'manpower_management',
    'financial_management',
    'site_photos',
    'testing_photos',
    'machinery_list',
    'projects',
    'dpr_records',
    'wpr_records',
    'meeting_documents',
    'project_feedback',
    'alerts',
  ];
}

/** Tabs each role may open (mirrors Layout navigation). */
export function getAllowedTabsForRole(
  role: UserRole,
  username?: string,
  user?: Pick<User, 'role' | 'isSuperuser' | 'username'> | null,
): ReadonlySet<string> {
  const map: Record<UserRole, readonly string[]> = {
    [UserRole.PMC_HEAD]: [...PMC_HEAD_TABS],
    [UserRole.PMC_HEAD_OFFICE]: [...PMC_HEAD_TABS],
    [UserRole.CEO]: [
      'dashboard',
      'team_projects',
      'project_init',
      'execution',
      'site_photos',
      'projects',
      'dpr_records',
      'wpr_records',
      'meeting_documents',
      PMC_HEAD_USER_MGMT_TAB,
    ],
    // PMC Manager — identical navigation to PMC Head except User Management
    [UserRole.COORDINATOR]: PMC_HEAD_TABS.filter((t) => t !== PMC_HEAD_USER_MGMT_TAB),
    [UserRole.TEAM_LEAD]: teamLeadTabs(),
    [UserRole.SITE_ENGINEER]: [...SITE_ENGINEER_NAV_IDS],
    [UserRole.BILLING_SITE_ENGINEER]: ['my_scopes', 'financial_management'],
    [UserRole.QAQC_SITE_ENGINEER]: ['my_scopes', 'testing_photos'],
    [UserRole.HSE_SITE_ENGINEER]: ['my_scopes'],
  };

  const allowed = new Set<string>(map[role] ?? ['dashboard']);
  if (username === 'pmc_bse') {
    allowed.add('financial_management');
  }
  // Superusers may open User Management even if mapped to another role.
  if (
    user
      ? canAccessUserManagement(user)
      : role === UserRole.PMC_HEAD ||
        role === UserRole.PMC_HEAD_OFFICE ||
        role === UserRole.CEO
  ) {
    allowed.add(PMC_HEAD_USER_MGMT_TAB);
  } else {
    allowed.delete(PMC_HEAD_USER_MGMT_TAB);
  }
  return allowed;
}

export function getDefaultTabForRole(role: UserRole): string {
  return ROLE_DEFAULT_TAB[role] ?? 'dashboard';
}

export function isTabAllowedForRole(
  tab: string | undefined,
  role: UserRole,
  username?: string,
  user?: Pick<User, 'role' | 'isSuperuser' | 'username'> | null,
): boolean {
  if (!tab) return false;
  return getAllowedTabsForRole(role, username, user ?? { role, username }).has(tab);
}

/** Pick URL tab if allowed, otherwise role home tab. */
export function resolveTabForRole(
  tab: string | undefined,
  role: UserRole,
  username?: string,
  user?: Pick<User, 'role' | 'isSuperuser' | 'username'> | null,
): string {
  if (tab && isTabAllowedForRole(tab, role, username, user)) {
    return tab;
  }
  return getDefaultTabForRole(role);
}

export function navigateToTab(tab: string, method: 'push' | 'replace' = 'replace'): void {
  const path = TAB_PATHS[tab];
  if (path) {
    syncAppRoutePath(path, method);
  }
}

export function clearAppRouteOnLogout(): void {
  const base = `${window.location.origin}${window.location.pathname}`;
  const nextUrl = `${base}#${LOGIN_ROUTE}`;
  if (window.location.hash !== `#${LOGIN_ROUTE}`) {
    window.history.replaceState(null, '', nextUrl);
  }
}

/**
 * After login or session restore: honor bookmarked URL when allowed,
 * otherwise land on the role home tab.
 */
export function syncAuthenticatedNavigation(
  user: User,
  options: { honorCurrentUrl?: boolean; method?: 'push' | 'replace' } = {},
): string {
  const { honorCurrentUrl = true, method = 'replace' } = options;
  const currentPath = getAppRoutePath();

  if (currentPath === LOGIN_ROUTE) {
    const home = getDefaultTabForRole(user.role);
    navigateToTab(home, method);
    return home;
  }

  const urlTab = honorCurrentUrl ? tabFromRoutePath(currentPath) : undefined;
  const tab = resolveTabForRole(urlTab, user.role, user.username, user);
  const targetPath = TAB_PATHS[tab];

  if (targetPath && currentPath !== targetPath) {
    navigateToTab(tab, method);
  }

  return tab;
}

/** Browser back/forward: resolve hash to a tab the current user may view. */
export function tabFromRouteForUser(user: User): string {
  const currentPath = getAppRoutePath();
  if (currentPath === LOGIN_ROUTE) {
    return getDefaultTabForRole(user.role);
  }
  const urlTab = tabFromRoutePath(currentPath);
  return resolveTabForRole(urlTab, user.role, user.username, user);
}
