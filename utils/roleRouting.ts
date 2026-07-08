import { UserRole, type User } from '../types';
import { SITE_ENGINEER_NAV_IDS } from './siteEngineerProjects';
import {
  getAppRoutePath,
  LOGIN_ROUTE,
  syncAppRoutePath,
  tabFromRoutePath,
  TAB_PATHS,
} from './appRouting';

export { LOGIN_ROUTE };

const ROLE_DEFAULT_TAB: Record<UserRole, string> = {
  [UserRole.PMC_HEAD]: 'dashboard',
  [UserRole.CEO]: 'dashboard',
  [UserRole.COORDINATOR]: 'projects',
  [UserRole.TEAM_LEAD]: 'team_projects',
  [UserRole.SITE_ENGINEER]: 'site_engineer_dashboard',
  [UserRole.BILLING_SITE_ENGINEER]: 'my_scopes',
  [UserRole.QAQC_SITE_ENGINEER]: 'my_scopes',
};

function teamLeadTabs(): string[] {
  return [
    'team_projects',
    'execution',
    'monthly_scope',
    'manpower_management',
    'financial_management',
    'site_photos',
    'machinery_list',
    'projects',
    'dpr_records',
    'wpr_records',
    'alerts',
  ];
}

/** Tabs each role may open (mirrors Layout navigation). */
export function getAllowedTabsForRole(role: UserRole, username?: string): ReadonlySet<string> {
  const map: Record<UserRole, readonly string[]> = {
    [UserRole.PMC_HEAD]: [
      'dashboard',
      'team_projects',
      'project_init',
      'execution',
      'site_photos',
      'projects',
      'dpr_records',
      'wpr_records',
      'alerts',
    ],
    [UserRole.CEO]: [
      'dashboard',
      'team_projects',
      'project_init',
      'execution',
      'site_photos',
      'projects',
      'dpr_records',
      'wpr_records',
    ],
    [UserRole.COORDINATOR]: [
      'dashboard',
      'team_projects',
      'site_photos',
      'projects',
      'dpr_records',
      'wpr_records',
    ],
    [UserRole.TEAM_LEAD]: teamLeadTabs(),
    [UserRole.SITE_ENGINEER]: [...SITE_ENGINEER_NAV_IDS],
    [UserRole.BILLING_SITE_ENGINEER]: ['my_scopes', 'financial_management'],
    [UserRole.QAQC_SITE_ENGINEER]: ['my_scopes'],
  };

  const allowed = new Set(map[role] ?? ['dashboard']);
  if (username === 'pmc_bse') {
    allowed.add('financial_management');
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
): boolean {
  if (!tab) return false;
  return getAllowedTabsForRole(role, username).has(tab);
}

/** Pick URL tab if allowed, otherwise role home tab. */
export function resolveTabForRole(
  tab: string | undefined,
  role: UserRole,
  username?: string,
): string {
  if (tab && isTabAllowedForRole(tab, role, username)) {
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
  const tab = resolveTabForRole(urlTab, user.role, user.username);
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
  return resolveTabForRole(urlTab, user.role, user.username);
}
