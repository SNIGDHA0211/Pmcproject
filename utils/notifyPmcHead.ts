import axios from 'axios';
import { API_ENDPOINTS, getApiBaseUrl } from '../config/apiConfig';
import { UserRole } from '../types';
import { alertsApi } from '../services/alertsApi';
import { getAccessToken, getStoredUser } from './authStorage';
import {
  resolveActorDisplayName,
  resolveActorFromUser,
} from './actorDisplay';

export type PmcHeadUpdateAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface NotifyPmcHeadParams {
  moduleName: string;
  projectName?: string;
  action: PmcHeadUpdateAction;
  title: string;
  message: string;
  senderName?: string;
  senderRole?: string;
  notificationType?: string;
}

export interface AlertActor {
  displayName: string;
  name: string;
  username?: string;
  roleLabel: string;
  role?: UserRole;
}
const NOTIFY_SOURCE_ROLES = new Set<UserRole>([
  UserRole.TEAM_LEAD,
  UserRole.SITE_ENGINEER,
  UserRole.QAQC_SITE_ENGINEER,
  UserRole.BILLING_SITE_ENGINEER,
  UserRole.COORDINATOR,
]);

async function sendChannelNotification(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const token = getAccessToken();
  await axios.post(
    `${getApiBaseUrl('main')}${API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION}`,
    { type, ...payload },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
}

export function shouldNotifyPmcHeadForCurrentUser(): boolean {
  const user = getStoredUser();
  if (!user) return false;
  return NOTIFY_SOURCE_ROLES.has(user.role);
}

export function getCurrentActor(): AlertActor | undefined {
  const resolved = resolveActorFromUser(getStoredUser());
  if (!resolved) return undefined;
  return {
    displayName: resolved.displayName,
    name: resolved.displayName,
    username: resolved.username,
    roleLabel: resolved.roleLabel,
    role: resolved.role,
  };
}

export function getCurrentActorName(): string | undefined {
  return getCurrentActor()?.name;
}

export function formatActorLine(actor?: Pick<AlertActor, 'displayName' | 'name' | 'roleLabel'>): string {
  if (!actor) return 'Team member';
  const label = actor.displayName || actor.name;
  return `${label} · ${actor.roleLabel}`;
}

export function buildPmcHeadUpdateCopy(
  moduleName: string,
  action: PmcHeadUpdateAction,
  projectName?: string,
  actor?: Pick<AlertActor, 'displayName' | 'name' | 'roleLabel'>,
): { title: string; message: string } {
  const actorLine = formatActorLine(actor);
  const projectSuffix = projectName?.trim() ? ` on ${projectName.trim()}` : '';
  if (action === 'CREATE') {
    return {
      title: `${moduleName} added`,
      message: `${actorLine} added new ${moduleName} data${projectSuffix}.`,
    };
  }
  if (action === 'DELETE') {
    return {
      title: `${moduleName} removed`,
      message: `${actorLine} deleted ${moduleName} data${projectSuffix}.`,
    };
  }
  return {
    title: `${moduleName} updated`,
    message: `${actorLine} updated ${moduleName}${projectSuffix}.`,
  };
}
/** Fire-and-forget PMC Head alert for any team-side data change. */
export async function notifyPmcHeadUpdate(params: NotifyPmcHeadParams): Promise<void> {
  if (!shouldNotifyPmcHeadForCurrentUser()) return;

  const actor = getCurrentActor();
  const senderName = params.senderName ?? actor?.displayName;
  const senderRole = params.senderRole ?? actor?.roleLabel;
  const senderUsername = actor?.username;

  const payload = {
    notification_type: params.notificationType ?? 'MODULE_UPDATE',
    module_name: params.moduleName,
    project_name: params.projectName ?? '',
    action_type: params.action,
    title: params.title,
    message: params.message,
    sender: senderName,
    sender_username: senderUsername,
    sender_role: senderRole,
    notify_role: 'pmc_head',
  };

  await Promise.allSettled([
    sendChannelNotification('module_update', payload),
    alertsApi.create({
      title: params.title,
      message: params.message,
      module_name: params.moduleName,
      project_name: params.projectName,
      action_type: params.action,
      notification_type: params.notificationType ?? 'MODULE_UPDATE',
      sender: senderName,
      sender_username: senderUsername,
      sender_role: senderRole,
      notify_role: 'pmc_head',
    }),
  ]);
}
export function notifyPmcHeadUpdateSafe(params: NotifyPmcHeadParams): void {
  void notifyPmcHeadUpdate(params).catch((error) => {
    console.warn('PMC Head notification failed:', error);
  });
}
