import type { AppNotification } from '../types';
import type { AlertApiRecord } from '../services/alertsApi';
import type { SubTab } from '../components/FinancialManagement';

export type AlertFilter = 'all' | 'unread' | 'read' | 'billing';

export interface AlertNavigationTarget {
  tab: string;
  section?: SubTab;
  returnTab?: string;
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
    timestamp: formatAlertRelativeTime(createdAt),
    createdAt,
    isRead: Boolean(row.is_read),
    senderName: row.sender,
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
    timestamp: formatAlertRelativeTime(createdAt),
    createdAt,
    isRead: false,
    senderName: String(payload.sender || payload.sender_name || 'System'),
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
  'project dates': { tab: 'team_projects' },
  'bg status': { tab: 'team_projects' },
  correspondence: { tab: 'team_projects' },
  'drawing summary': { tab: 'team_projects' },
  'drawing register': { tab: 'team_projects' },
};

export function resolveAlertNavigation(
  notification: AppNotification,
): AlertNavigationTarget | null {
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
