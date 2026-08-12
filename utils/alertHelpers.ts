import type { AppNotification } from '../types';
import { UserRole } from '../types';
import type { AlertApiRecord } from '../services/alertsApi';
import type { SubTab } from '../components/FinancialManagement';
import { ROLE_LABELS } from '../constants';
import { resolveActorDisplayName } from './actorDisplay';

export type AlertFilter = 'all' | 'unread' | 'read' | 'billing' | 'pending';

export interface AlertNavigationTarget {
  tab: string;
  section?: SubTab;
  returnTab?: string;
}

const MODULE_DEFAULT_ROLE_LABEL: Record<string, string> = {
  'health & safety': 'QAQC Site Engineer',
  'quality status': 'QAQC Site Engineer',
  'site photos': 'Site Engineer',
  invoicing: 'Billing Site Engineer',
  'cash flow': 'Billing Site Engineer',
  'contract values': 'Billing Site Engineer',
  'cost performance': 'Billing Site Engineer',
  'budget performance': 'Billing Site Engineer',
  'contract performance': 'Billing Site Engineer',
  'planned earned value': 'Billing Site Engineer',
  'monthly scope': 'Site Engineer',
  'manpower management': 'Team Leader',
  'project dates': 'Team Leader',
  correspondence: 'Team Leader',
  'drawing register': 'Team Leader',
  dpr: 'Site Engineer',
  wpr: 'Team Leader',
};

export function resolveRoleLabel(role?: string): string | undefined {
  if (!role?.trim()) return undefined;
  const raw = role.trim();
  const enumMatch = Object.values(UserRole).find(
    (value) => value === raw || value.toLowerCase() === raw.toLowerCase(),
  );
  if (enumMatch) return ROLE_LABELS[enumMatch as UserRole];
  const labelMatch = Object.entries(ROLE_LABELS).find(
    ([, label]) => label.toLowerCase() === raw.toLowerCase(),
  );
  if (labelMatch) return labelMatch[1];
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function inferRoleLabelFromModule(moduleName?: string): string | undefined {
  const key = (moduleName || '').trim().toLowerCase();
  if (!key) return undefined;
  return MODULE_DEFAULT_ROLE_LABEL[key];
}

export function formatAlertActorName(
  notification: Pick<AppNotification, 'senderName' | 'senderUsername' | 'senderRole'>,
): string {
  return resolveActorDisplayName({
    name: notification.senderName,
    username: notification.senderUsername,
    roleLabel: notification.senderRole,
  });
}

export function formatAlertActorRole(
  notification: Pick<AppNotification, 'senderRole' | 'moduleName'>,
): string | undefined {
  return (
    notification.senderRole?.trim() ||
    inferRoleLabelFromModule(notification.moduleName)
  );
}

export { formatSubRoleUsername } from './actorDisplay';

export function formatAlertActorLine(
  notification: Pick<AppNotification, 'senderName' | 'senderRole' | 'moduleName'>,
): string {
  const name = formatAlertActorName(notification);
  const role = formatAlertActorRole(notification);
  return role ? `${name} · ${role}` : name;
}

export function formatAlertDateTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAlertDateOnly(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAlertTimeOnly(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface AlertActionVisuals {
  iconKey: 'finance' | 'create' | 'update' | 'delete' | 'info';
  label: string;
  lightBg: string;
  lightColor: string;
  lightBadge: string;
  darkBg: string;
  darkColor: string;
  darkBadge: string;
}

export function getAlertActionVisuals(
  actionType?: string,
  notificationType?: string,
): AlertActionVisuals {
  const action = (actionType || '').toUpperCase();
  const type = (notificationType || '').toUpperCase();

  if (type.includes('BILLING')) {
    return {
      iconKey: 'finance',
      label: 'Financial',
      lightBg: 'bg-indigo-50',
      lightColor: 'text-indigo-600',
      lightBadge: 'bg-indigo-100 text-indigo-800',
      darkBg: 'bg-indigo-500/15',
      darkColor: 'text-indigo-300',
      darkBadge: 'bg-indigo-500/20 text-indigo-200',
    };
  }
  if (action === 'CREATE') {
    return {
      iconKey: 'create',
      label: 'Created',
      lightBg: 'bg-emerald-50',
      lightColor: 'text-emerald-600',
      lightBadge: 'bg-emerald-100 text-emerald-800',
      darkBg: 'bg-emerald-500/15',
      darkColor: 'text-emerald-300',
      darkBadge: 'bg-emerald-500/20 text-emerald-200',
    };
  }
  if (action === 'DELETE') {
    return {
      iconKey: 'delete',
      label: 'Deleted',
      lightBg: 'bg-rose-50',
      lightColor: 'text-rose-600',
      lightBadge: 'bg-rose-100 text-rose-800',
      darkBg: 'bg-rose-500/15',
      darkColor: 'text-rose-300',
      darkBadge: 'bg-rose-500/20 text-rose-200',
    };
  }
  if (action === 'UPDATE') {
    return {
      iconKey: 'update',
      label: 'Updated',
      lightBg: 'bg-blue-50',
      lightColor: 'text-blue-600',
      lightBadge: 'bg-blue-100 text-blue-800',
      darkBg: 'bg-blue-500/15',
      darkColor: 'text-blue-300',
      darkBadge: 'bg-blue-500/20 text-blue-200',
    };
  }

  return {
    iconKey: 'info',
    label: 'Update',
    lightBg: 'bg-slate-100',
    lightColor: 'text-slate-600',
    lightBadge: 'bg-slate-100 text-slate-700',
    darkBg: 'bg-white/10',
    darkColor: 'text-white/80',
    darkBadge: 'bg-white/10 text-white/70',
  };
}

export function formatAlertRelativeTime(iso?: string): string {
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Relative time plus absolute sent/created date for list and dropdown display. */
export function formatAlertTimestampLabel(iso?: string): string {
  if (!iso) return 'Just now';
  const relative = formatAlertRelativeTime(iso);
  const absolute = formatAlertDateTime(iso);
  if (relative === absolute || absolute === '—') return relative;
  return `${relative} · ${absolute}`;
}

export function mapAlertType(notificationType?: string, actionType?: string): AppNotification['type'] {
  const type = (notificationType || '').toUpperCase();
  const action = (actionType || '').toUpperCase();
  if (type.includes('BILLING')) return 'UPDATE';
  if (action === 'DELETE') return 'ALERT';
  if (action === 'CREATE') return 'SUCCESS';
  if (action === 'UPDATE') return 'UPDATE';
  return 'INFO';
}

export function normalizeAlertRecord(
  row: AlertApiRecord,
  userId: string,
  projectId?: string,
): AppNotification {
  const createdAt = row.created_at;
  return {
    id: String(row.id),
    userId,
    projectId,
    title: row.title || 'Notification',
    message: row.message || '',
    type: mapAlertType(row.notification_type, row.action_type),
    timestamp: formatAlertTimestampLabel(createdAt),
    createdAt,
    isRead: Boolean(row.is_read),
    senderName: row.sender,
    senderUsername: row.sender_username,
    senderRole: resolveRoleLabel(row.sender_role),
    moduleName: row.module_name,
    projectName: row.project_name,
    actionType: row.action_type,
    notificationType: row.notification_type,
  };
}

export function normalizeWsAlertPayload(
  payload: Record<string, unknown>,
  userId: string,
  projectId?: string,
): AppNotification | null {
  const title = String(payload.title || '').trim();
  const message = String(payload.message || '').trim();
  if (!title && !message) return null;

  const id = payload.id != null ? String(payload.id) : `ws-${Date.now()}`;
  const createdAt =
    typeof payload.created_at === 'string'
      ? payload.created_at
      : typeof payload.timestamp === 'string'
        ? payload.timestamp
        : new Date().toISOString();

  return {
    id,
    userId,
    projectId:
      projectId ||
      (payload.project_id != null ? String(payload.project_id) : undefined) ||
      (payload.data && typeof payload.data === 'object'
        ? String((payload.data as Record<string, unknown>).project_id ?? '')
        : undefined),
    title: title || 'Notification',
    message: message || 'You have a new update.',
    type: mapAlertType(
      String(payload.notification_type || payload.type || ''),
      String(payload.action_type || ''),
    ),
    timestamp: formatAlertTimestampLabel(createdAt),
    createdAt,
    isRead: false,
    senderName: String(payload.sender || payload.sender_name || 'System'),
    senderUsername: String(payload.sender_username || payload.senderUsername || '') || undefined,
    senderRole: resolveRoleLabel(
      String(payload.sender_role || payload.senderRole || ''),
    ),
    moduleName: String(payload.module_name || ''),
    projectName: String(payload.project_name || ''),
    actionType: String(payload.action_type || ''),
    notificationType: String(payload.notification_type || payload.type || ''),
  };
}

export function sortNotificationsDesc(items: AppNotification[]): AppNotification[] {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function filterNotifications(
  items: AppNotification[],
  filter: AlertFilter,
): AppNotification[] {
  switch (filter) {
    case 'unread':
      return items.filter((n) => !n.isRead);
    case 'read':
      return items.filter((n) => n.isRead);
    case 'billing':
      return items.filter(
        (n) => (n.notificationType || '').toUpperCase() === 'BILLING_UPDATE',
      );
    case 'pending':
      return [];
    default:
      return items;
  }
}

const MODULE_NAV_MAP: Record<string, AlertNavigationTarget> = {
  'contract values': { tab: 'financial_management', section: 'contracts', returnTab: 'team_projects' },
  invoicing: { tab: 'financial_management', section: 'invoicing', returnTab: 'team_projects' },
  'contract performance': { tab: 'financial_management', section: 'contract', returnTab: 'team_projects' },
  'budget performance': { tab: 'financial_management', section: 'budget', returnTab: 'team_projects' },
  'cost performance': { tab: 'financial_management', section: 'cost', returnTab: 'team_projects' },
  'internal cost performance': { tab: 'financial_management', section: 'cost', returnTab: 'team_projects' },
  'financial progress': { tab: 'financial_management', section: 'cost', returnTab: 'team_projects' },
  'cash flow': { tab: 'financial_management', section: 'cashflow', returnTab: 'team_projects' },
  'planned earned value': { tab: 'financial_management', section: 'earned_value', returnTab: 'team_projects' },
  'planned vs actual': { tab: 'financial_management', section: 'earned_value', returnTab: 'team_projects' },
  'planned-vs-actual': { tab: 'financial_management', section: 'earned_value', returnTab: 'team_projects' },
  'project dates': { tab: 'team_projects' },
  'bg status': { tab: 'team_projects' },
  correspondence: { tab: 'team_projects' },
  'drawing summary': { tab: 'team_projects' },
  'drawing register': { tab: 'team_projects' },
  'site photos': { tab: 'site_photos', returnTab: 'dashboard' },
  'health & safety': { tab: 'team_projects' },
  'quality status': { tab: 'team_projects' },
  'monthly scope': { tab: 'monthly_scope', returnTab: 'team_projects' },
  'manpower management': { tab: 'manpower_management', returnTab: 'team_projects' },
  reminders: { tab: 'reminders', returnTab: 'alerts' },
  reminder: { tab: 'reminders', returnTab: 'alerts' },
};

export function resolveAlertNavigation(
  notification: AppNotification,
): AlertNavigationTarget | null {
  const type = (notification.notificationType || '').trim().toUpperCase();
  if (type === 'REMINDER_DUE' || (notification.actionType || '').toUpperCase() === 'REMINDER_DUE') {
    return { tab: 'reminders', returnTab: 'alerts' };
  }
  const key = (notification.moduleName || '').trim().toLowerCase();
  if (!key) return null;
  return MODULE_NAV_MAP[key] ?? null;
}

export function getActionTypeIcon(actionType?: string): string {
  const action = (actionType || '').toUpperCase();
  if (action === 'CREATE') return '➕';
  if (action === 'UPDATE') return '✏️';
  if (action === 'DELETE') return '🗑️';
  return 'ℹ️';
}

export function isBillingAlert(notification: AppNotification): boolean {
  return (notification.notificationType || '').toUpperCase() === 'BILLING_UPDATE';
}
