/** Client-side routes — hash-based so refresh works on static hosts without server rewrites. */

export const LOGIN_ROUTE = '/login';
/** Marketing landing. Root URL `localhost:5173/` (no hash) resolves here for guests. */
export const LANDING_ROUTE = '/welcome';
export const DEFAULT_APP_ROUTE = '/dashboard';

export const PATH_TO_TAB: Record<string, string> = {
  [LOGIN_ROUTE]: 'login',
  [LANDING_ROUTE]: 'landing',
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
  // Bare `/` stays `/` so callers can map root → landing; dashboard is explicit `/dashboard`.
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const isLandingRoutePath = (path: string): boolean => {
  const normalized = normalizePath(path);
  return normalized === '/' || normalized === LANDING_ROUTE;
};

/** Current in-app path, e.g. `/projects` (reads hash first, then legacy pathname). */
export const getAppRoutePath = (): string => {
  const hash = window.location.hash;

  // `#/` or bare `#` → marketing landing
  if (hash === '#' || hash === '#/') {
    return LANDING_ROUTE;
  }

  if (hash.startsWith('#/')) {
    const path = normalizePath(hash.slice(1));
    if (path === '/') return LANDING_ROUTE;
    return path;
  }

  // No hash: clean root `localhost:5173/` is the landing page for guests
  const pathname = window.location.pathname.toLowerCase();
  if (!pathname || pathname === '/' || pathname === '/index.html') {
    return LANDING_ROUTE;
  }

  return normalizePath(pathname);
};

export const tabFromRoutePath = (path: string): string | undefined => {
  const normalized = normalizePath(path);
  if (isLandingRoutePath(normalized)) return 'landing';
  return PATH_TO_TAB[normalized];
};

export const syncAppRoutePath = (
  path: string,
  method: 'push' | 'replace' = 'replace',
): void => {
  let normalized = normalizePath(path);
  // Keep a stable public hash for the landing so Back from login works.
  if (normalized === '/' || normalized === LANDING_ROUTE) {
    normalized = LANDING_ROUTE;
  }

  const originPath = `${window.location.origin}${window.location.pathname}`;

  // Landing: prefer clean root URL when arriving with no hash; otherwise use #/welcome.
  const nextUrl =
    normalized === LANDING_ROUTE && method === 'replace' && !window.location.hash
      ? originPath
      : `${originPath}#${normalized}`;

  if (getAppRoutePath() === normalized) {
    if (normalized === LANDING_ROUTE) {
      const onLandingHash =
        !window.location.hash ||
        window.location.hash === '#' ||
        window.location.hash === '#/' ||
        window.location.hash === `#${LANDING_ROUTE}`;
      if (onLandingHash) return;
    } else if (window.location.hash.startsWith('#/')) {
      return;
    }
  }

  if (method === 'push') {
    window.history.pushState(null, '', nextUrl);
  } else {
    window.history.replaceState(null, '', nextUrl);
  }

  // pushState/replaceState do not fire hashchange/popstate — notify app listeners.
  window.dispatchEvent(new Event('pmc-route-change'));
};

/** Convert legacy `/projects` URLs to `/#/projects` on first load. */
export const migratePathnameToHashRoute = (): void => {
  if (window.location.hash.startsWith('#/')) return;

  if (window.location.hash === '#' || window.location.hash === '#/') {
    // Normalize bare hash to clean root landing URL
    const base = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState(null, '', base);
    window.dispatchEvent(new Event('pmc-route-change'));
    return;
  }

  const pathname = window.location.pathname.toLowerCase();
  if (pathname && pathname !== '/' && pathname !== '/index.html') {
    syncAppRoutePath(pathname, 'replace');
    return;
  }

  // Root with no hash → stay on clean `localhost:5173/` (landing). Do not send guests to login.
};

export const subscribeAppRoutePath = (listener: () => void): (() => void) => {
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  window.addEventListener('pmc-route-change', listener);
  return () => {
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
    window.removeEventListener('pmc-route-change', listener);
  };
};
