import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import {
  buildPmcHeadUpdateCopy,
  getCurrentActor,
  notifyPmcHeadUpdateSafe,
  shouldNotifyPmcHeadForCurrentUser,
  type PmcHeadUpdateAction,
} from './notifyPmcHead';

type RouteRule = {
  match: (url: string) => boolean;
  moduleName: string;
};

const SKIP_URL_PARTS = [
  '/alerts/',
  '/notifications/',
  '/auth/',
  '/token/',
  '/approve',
  '/reject',
  'export=excel',
  'export=xlsx',
];

const MODULE_ROUTE_RULES: RouteRule[] = [
  { match: (url) => url.includes('/health-safety'), moduleName: 'Health & Safety' },
  { match: (url) => url.includes('/project-quality'), moduleName: 'Quality Status' },
  { match: (url) => url.includes('/site-images'), moduleName: 'Site Photos' },
  { match: (url) => url.includes('/monthly-scope'), moduleName: 'Monthly Scope' },
  { match: (url) => url.includes('/manpower'), moduleName: 'Manpower Management' },
  { match: (url) => url.includes('/project-equipment'), moduleName: 'Project Equipment' },
  { match: (url) => url.includes('/plant-machinery'), moduleName: 'Plant Machinery' },
  { match: (url) => url.includes('/machinery-master'), moduleName: 'Machinery Master' },
  { match: (url) => url.includes('/project-dates'), moduleName: 'Project Dates' },
  { match: (url) => url.includes('/cashflow'), moduleName: 'Cash Flow' },
  { match: (url) => url.includes('/invoicing'), moduleName: 'Invoicing' },
  { match: (url) => url.includes('/contract-values'), moduleName: 'Contract Values' },
  { match: (url) => url.includes('/cost-performance'), moduleName: 'Cost Performance' },
  { match: (url) => url.includes('/budget-performance'), moduleName: 'Budget Performance' },
  { match: (url) => url.includes('/contract-performance'), moduleName: 'Contract Performance' },
  { match: (url) => url.includes('/planned-earned-value'), moduleName: 'Planned Earned Value' },
  { match: (url) => url.includes('/drawings'), moduleName: 'Drawing Register' },
  { match: (url) => url.includes('/correspondence-documents'), moduleName: 'Correspondence' },
  { match: (url) => url.includes('/correspondence/'), moduleName: 'Correspondence' },
  { match: (url) => url.includes('/frequency-chart'), moduleName: 'Frequency Chart' },
  { match: (url) => url.includes('/project-progress'), moduleName: 'Project Progress' },
  { match: (url) => url.includes('/construction-progress'), moduleName: 'Construction Progress' },
  { match: (url) => url.includes('/dpr/'), moduleName: 'DPR' },
  { match: (url) => url.includes('/wpr/'), moduleName: 'WPR' },
  { match: (url) => url.includes('/projects-data/projects/'), moduleName: 'Projects' },
];

let lastNotifyKey = '';
let lastNotifyAt = 0;

function shouldSkipUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return SKIP_URL_PARTS.some((part) => lower.includes(part));
}

function resolveModuleName(url: string): string | null {
  const rule = MODULE_ROUTE_RULES.find((entry) => entry.match(url));
  return rule?.moduleName ?? null;
}

function methodToAction(method?: string): PmcHeadUpdateAction | null {
  const verb = (method ?? '').toUpperCase();
  if (verb === 'POST') return 'CREATE';
  if (verb === 'PUT' || verb === 'PATCH') return 'UPDATE';
  if (verb === 'DELETE') return 'DELETE';
  return null;
}

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || value instanceof FormData) return null;
  return value as Record<string, unknown>;
}

function pickProjectName(...sources: unknown[]): string {
  for (const source of sources) {
    if (source instanceof FormData) {
      const fromForm =
        source.get('project_name') ??
        source.get('projectName') ??
        source.get('project');
      if (typeof fromForm === 'string' && fromForm.trim()) return fromForm.trim();
      continue;
    }

    const obj = readObject(source);
    if (!obj) continue;

    const nested = readObject(obj.data) ?? readObject(obj.record);
    const candidates = [
      obj.project_name,
      obj.projectName,
      obj.project,
      nested?.project_name,
      nested?.projectName,
      nested?.project,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return String(candidate);
      }
    }
  }
  return '';
}

function shouldDedupe(key: string): boolean {
  const now = Date.now();
  if (key === lastNotifyKey && now - lastNotifyAt < 2500) return true;
  lastNotifyKey = key;
  lastNotifyAt = now;
  return false;
}

export function handlePmcHeadMutationNotify(
  response: AxiosResponse,
): void {
  if (!shouldNotifyPmcHeadForCurrentUser()) return;

  const config = response.config as InternalAxiosRequestConfig;
  const method = config.method;
  const action = methodToAction(method);
  if (!action) return;

  const url = `${config.url ?? ''}`;
  if (!url || shouldSkipUrl(url)) return;

  const moduleName = resolveModuleName(url);
  if (!moduleName) return;

  const status = response.status;
  if (status < 200 || status >= 300) return;

  const projectName = pickProjectName(config.data, response.data, readObject(response.data)?.data);
  const actor = getCurrentActor();
  const dedupeKey = `${method}:${url}:${projectName}:${action}`;
  if (shouldDedupe(dedupeKey)) return;

  const copy = buildPmcHeadUpdateCopy(moduleName, action, projectName, actor);
  notifyPmcHeadUpdateSafe({
    moduleName,
    projectName: projectName || undefined,
    action,
    title: copy.title,
    message: copy.message,
    senderName: actor?.displayName,
    senderRole: actor?.roleLabel,
    notificationType: 'MODULE_UPDATE',
  });
}
