/**
 * Frontend reminder notification helpers.
 * Ensures assignees see due reminders even if backend scheduler/WebSocket is delayed.
 */
import type { AppNotification, User } from '../types';
import { alertsApi } from '../services/alertsApi';
import { API_ENDPOINTS, getApiBaseUrl } from '../config/apiConfig';
import { getAccessToken } from './authStorage';
import { resolveActorFromUser } from './actorDisplay';
import type { ReminderRecord } from '../services/remindersApi';
import axios from 'axios';

const TOASTED_KEY = 'pmc.reminderDueToasted';

function readToastedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(TOASTED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeToastedIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(TOASTED_KEY, JSON.stringify([...ids].slice(-80)));
  } catch {
    /* ignore */
  }
}

export function reminderDueNotificationId(reminderId: number | string): string {
  return `reminder-due-${reminderId}`;
}

export function isReminderDueNotification(id: string): boolean {
  return id.startsWith('reminder-due-');
}

export function isReminderAssignedToUser(reminder: ReminderRecord, user: User): boolean {
  const assigneeId = Number(reminder.assigned_to_id);
  const userId = Number(user.id);
  if (Number.isFinite(assigneeId) && Number.isFinite(userId) && assigneeId === userId) {
    return true;
  }
  if (String(reminder.assigned_to_id) === String(user.id)) return true;

  const username = user.username?.trim().toLowerCase();
  const assigneeUsername = reminder.assigned_to?.username?.trim().toLowerCase();
  if (username && assigneeUsername && username === assigneeUsername) return true;

  const userName = user.name?.trim().toLowerCase();
  const assigneeName = reminder.assigned_to?.full_name?.trim().toLowerCase();
  if (userName && assigneeName && userName === assigneeName) return true;

  return false;
}

export function isReminderActionableDue(reminder: ReminderRecord): boolean {
  const status = (reminder.status || '').toLowerCase();
  if (status === 'completed' || status === 'dismissed') return false;
  if (reminder.is_overdue) return true;

  const due = new Date(reminder.effective_due_at || reminder.due_at);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() <= Date.now();
}

export function buildReminderDueNotification(
  reminder: ReminderRecord,
  userId: string,
): AppNotification {
  const dueLabel = new Date(reminder.effective_due_at || reminder.due_at).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const project = reminder.project_name || 'project';
  return {
    id: reminderDueNotificationId(reminder.id),
    userId,
    projectId: reminder.project_id ? String(reminder.project_id) : undefined,
    title: `Reminder: ${reminder.title}`,
    message:
      reminder.description?.trim() ||
      `Due now for ${project} · ${dueLabel}`,
    type: 'ALERT',
    timestamp: new Date().toLocaleString('en-IN'),
    createdAt: new Date().toISOString(),
    isRead: false,
    senderName: reminder.created_by?.full_name || reminder.created_by?.username || 'System',
    senderUsername: reminder.created_by?.username,
    senderRole: undefined,
    moduleName: 'reminders',
    projectName: reminder.project_name,
    actionType: 'REMINDER_DUE',
    notificationType: 'REMINDER_DUE',
  };
}

/** Returns notification ids that should toast (first time this session). */
export function claimReminderDueToasts(reminderIds: Array<number | string>): string[] {
  const toasted = readToastedIds();
  const fresh: string[] = [];
  for (const id of reminderIds) {
    const key = reminderDueNotificationId(id);
    if (toasted.has(key)) continue;
    toasted.add(key);
    fresh.push(key);
  }
  writeToastedIds(toasted);
  return fresh;
}

/** Allow a new toast after snooze when the reminder becomes due again. */
export function clearReminderDueToastClaim(reminderId: number | string): void {
  const toasted = readToastedIds();
  toasted.delete(reminderDueNotificationId(reminderId));
  writeToastedIds(toasted);
}

const AUDIO_CLAIM_KEY = 'pmc.reminderOverdueAudioClaimed';

function readAudioClaimedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(AUDIO_CLAIM_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeAudioClaimedIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(AUDIO_CLAIM_KEY, JSON.stringify([...ids].slice(-80)));
  } catch {
    /* ignore */
  }
}

/** First-time overdue audio trigger per reminder id this session. */
export function claimReminderOverdueAudio(reminderIds: Array<number | string>): string[] {
  const claimed = readAudioClaimedIds();
  const fresh: string[] = [];
  for (const id of reminderIds) {
    const key = reminderDueNotificationId(id);
    if (claimed.has(key)) continue;
    claimed.add(key);
    fresh.push(key);
  }
  writeAudioClaimedIds(claimed);
  return fresh;
}

export function clearReminderOverdueAudioClaim(reminderId: number | string): void {
  const claimed = readAudioClaimedIds();
  claimed.delete(reminderDueNotificationId(reminderId));
  writeAudioClaimedIds(claimed);
}

/**
 * Best-effort: create alert + channel notification for assignee when reminder is created.
 * Backend may accept notify_user_id; if not, assignee still gets FE poll notifications.
 */
export async function notifyReminderAssignee(params: {
  reminder: ReminderRecord;
  actor?: User | null;
}): Promise<void> {
  const { reminder, actor } = params;
  const resolved = resolveActorFromUser(actor ?? null);
  const title = `Reminder: ${reminder.title}`;
  const message =
    reminder.description?.trim() ||
    `You have a new reminder on ${reminder.project_name || 'a project'}. Due: ${new Date(
      reminder.due_at,
    ).toLocaleString('en-IN')}`;

  const alertPayload = {
    title,
    message,
    module_name: 'reminders',
    project_name: reminder.project_name || '',
    action_type: 'REMINDER_DUE',
    notification_type: 'REMINDER_DUE',
    sender: resolved?.displayName,
    sender_username: resolved?.username,
    sender_role: resolved?.roleLabel,
    // Common targeting fields — backend may honor one of these
    notify_user_id: reminder.assigned_to_id,
    user_id: reminder.assigned_to_id,
    assigned_to_id: reminder.assigned_to_id,
  };

  const token = getAccessToken();
  await Promise.allSettled([
    alertsApi.create(alertPayload as Parameters<typeof alertsApi.create>[0] & {
      notify_user_id?: number;
      user_id?: number;
      assigned_to_id?: number;
    }),
    axios.post(
      `${getApiBaseUrl('main')}${API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION}`,
      {
        type: 'reminder_due',
        ...alertPayload,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    ),
  ]);
}

export function notifyReminderAssigneeSafe(params: {
  reminder: ReminderRecord;
  actor?: User | null;
}): void {
  void notifyReminderAssignee(params).catch((err) => {
    console.warn('Reminder assignee notify failed:', err);
  });
}
