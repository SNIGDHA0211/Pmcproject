/** Client-side routes — hash-based so refresh works on static hosts without server rewrites. */

export const LOGIN_ROUTE = '/login';
export const DEFAULT_APP_ROUTE = '/dashboard';

export const PATH_TO_TAB: Record<string, string> = {
  [LOGIN_ROUTE]: 'login',
  '/dashboard': 'dashboard',
  '/site-dashboard': 'site_engineer_dashboard',
  '/my-scopes': 'my_scopes',
  '/team-projects': 'team_projects',
  '/project-init': 'project_init',
  '/execution': 'execution',
  '/machinery-list': 'machinery_list',
  '/monthly-scope': 'monthly_scope',
  '/manpower-management': 'manpower_management',
  '/financial-management': 'financial_management',
  '/site-photos': 'site_photos',
  '/testing-photos': 'testing_photos',
  '/projects': 'projects',
  '/dpr-records': 'dpr_records',
  '/dpr': 'dpr_records',
  '/dpr_records': 'dpr_records',
  '/wpr-records': 'wpr_records',
  '/wpr': 'wpr_records',
  '/wpr_records': 'wpr_records',
  '/mpr-records': 'mpr_records',
  '/mpr': 'mpr_records',
  '/mpr_records': 'mpr_records',
  '/alerts': 'alerts',
  '/reminders': 'reminders',
  '/meeting-documents': 'meeting_documents',
  '/project-feedback': 'project_feedback',
  '/user-management': 'user_management',
};

export const TAB_PATHS: Record<string, string> = {
  dashboard: '/dashboard',
  site_engineer_dashboard: '/site-dashboard',
  my_scopes: '/my-scopes',
  team_projects: '/team-projects',
  project_init: '/project-init',
  execution: '/execution',
  machinery_list: '/machinery-list',
  monthly_scope: '/monthly-scope',
  manpower_management: '/manpower-management',
  financial_management: '/financial-management',
  site_photos: '/site-photos',
  testing_photos: '/testing-photos',
  projects: '/projects',
  dpr_records: '/dpr-records',
  wpr_records: '/wpr-records',
  mpr_records: '/mpr-records',
  alerts: '/alerts',
  reminders: '/reminders',
  meeting_documents: '/meeting-documents',
  project_feedback: '/project-feedback',
  user_management: '/user-management',
};

const normalizePath = (path: string): string => {
  const trimmed = path.trim().toLowerCase().split('?')[0];
  if (!trimmed || trimmed === '/') return DEFAULT_APP_ROUTE;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

/** Current in-app path, e.g. `/projects` (reads hash first, then legacy pathname). */
export const getAppRoutePath = (): string => {
  const hash = window.location.hash;
  if (hash.startsWith('#/')) {
    return normalizePath(hash.slice(1));
  }

  const pathname = window.location.pathname.toLowerCase();
  if (pathname && pathname !== '/' && pathname !== '/index.html') {
    return normalizePath(pathname);
  }

  return DEFAULT_APP_ROUTE;
};

export const tabFromRoutePath = (path: string): string | undefined =>
  PATH_TO_TAB[normalizePath(path)];

export const syncAppRoutePath = (
  path: string,
  method: 'push' | 'replace' = 'replace',
): void => {
  const normalized = normalizePath(path);
  const base = `${window.location.origin}${window.location.pathname}`;
  const nextUrl = `${base}#${normalized}`;

  if (getAppRoutePath() === normalized && window.location.hash.startsWith('#/')) {
    return;
  }

  if (method === 'push') {
    window.history.pushState(null, '', nextUrl);
  } else {
    window.history.replaceState(null, '', nextUrl);
  }
};

/** Convert legacy `/projects` URLs to `/#/projects` on first load. */
export const migratePathnameToHashRoute = (): void => {
  if (window.location.hash.startsWith('#/')) return;

  const pathname = window.location.pathname.toLowerCase();
  if (pathname && pathname !== '/' && pathname !== '/index.html') {
    syncAppRoutePath(pathname, 'replace');
    return;
  }

  if (!window.location.hash) {
    syncAppRoutePath(LOGIN_ROUTE, 'replace');
  }
};

export const subscribeAppRoutePath = (listener: () => void): (() => void) => {
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => {
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
  };
};
