/**
 * PO-31 Reminders API — /api/reminders/
 * Dedicated module (not Alerts / Tasks / Notifications).
 */
import axios from 'axios';
import api, { getApiErrorMessage, unwrapList } from './api';
import { API_ENDPOINTS } from '../config/apiConfig';

export type ReminderStatus =
  | 'pending'
  | 'sent'
  | 'completed'
  | 'dismissed'
  | 'snoozed';

export type ReminderScope = 'overdue' | 'today' | 'upcoming' | 'mine' | 'all';

export interface ReminderPerson {
  id: number;
  username: string;
  full_name: string;
}

export interface ReminderRecord {
  id: number;
  project_id: number;
  project_name: string;
  title: string;
  description: string;
  due_at: string;
  effective_due_at: string;
  is_overdue: boolean;
  assigned_to_id: number;
  assigned_to: ReminderPerson | null;
  created_by: ReminderPerson | null;
  status: ReminderStatus;
  snoozed_until: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderListParams {
  project_id?: number | string;
  scope?: ReminderScope;
  status?: ReminderStatus | '';
  assigned_to?: number | string;
  created_by?: number | string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
  signal?: AbortSignal;
  /** Bypass GET cache — use for alarm polling / live due checks */
  skipCache?: boolean;
}

export interface ReminderListResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: ReminderRecord[];
}

export interface CreateReminderPayload {
  project_id: number;
  title: string;
  description?: string;
  due_at: string;
  assigned_to_id: number;
  remind_at?: string;
}

export interface UpdateReminderPayload {
  title?: string;
  description?: string;
  due_at?: string;
  assigned_to_id?: number;
  status?: ReminderStatus;
}

export interface SnoozeReminderPayload {
  minutes?: number;
  snooze_until?: string;
}

export interface ReminderBadgeCounts {
  overdue: number;
  today: number;
  total: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function unwrapEnvelope(payload: unknown): {
  success: boolean;
  message: string;
  data: unknown;
} {
  const body = asRecord(payload);
  return {
    success: body.success !== false,
    message: String(body.message ?? ''),
    data: 'data' in body ? body.data : payload,
  };
}

function toPerson(raw: unknown): ReminderPerson | null {
  const row = asRecord(raw);
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    username: String(row.username ?? ''),
    full_name: String(row.full_name ?? row.name ?? row.username ?? ''),
  };
}

function normalizeReminder(raw: unknown): ReminderRecord | null {
  const row = asRecord(raw);
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;

  const assigned = toPerson(row.assigned_to);
  const assignedToId = Number(row.assigned_to_id ?? assigned?.id);
  const projectId = Number(row.project_id);

  return {
    id,
    project_id: Number.isFinite(projectId) ? projectId : 0,
    project_name: String(row.project_name ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    due_at: String(row.due_at ?? ''),
    effective_due_at: String(row.effective_due_at ?? row.due_at ?? ''),
    is_overdue: Boolean(row.is_overdue),
    assigned_to_id: Number.isFinite(assignedToId) ? assignedToId : 0,
    assigned_to: assigned,
    created_by: toPerson(row.created_by),
    status: (String(row.status || 'pending').toLowerCase() as ReminderStatus) || 'pending',
    snoozed_until: row.snoozed_until ? String(row.snoozed_until) : null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    dismissed_at: row.dismissed_at ? String(row.dismissed_at) : null,
    notified_at: row.notified_at ? String(row.notified_at) : null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function parseListPayload(payload: unknown): ReminderListResult {
  const body = asRecord(payload);
  const inner =
    body.data && typeof body.data === 'object' ? asRecord(body.data) : body;

  const resultsRaw = Array.isArray(inner.results)
    ? inner.results
    : unwrapList(inner);

  const results = resultsRaw
    .map((row) => normalizeReminder(row))
    .filter((row): row is ReminderRecord => Boolean(row));

  return {
    count: Number(inner.count ?? results.length) || results.length,
    next: inner.next ? String(inner.next) : null,
    previous: inner.previous ? String(inner.previous) : null,
    results,
  };
}

function parseOne(payload: unknown): ReminderRecord {
  const { data } = unwrapEnvelope(payload);
  // Support { data: reminder }, { data: { reminder } }, or bare reminder object.
  const candidates: unknown[] = [data, asRecord(data).reminder, payload, asRecord(payload).reminder];
  for (const candidate of candidates) {
    const reminder = normalizeReminder(candidate);
    if (reminder) return reminder;
  }
  throw new Error('Invalid reminder response from server.');
}

export const remindersApi = {
  list: async (params: ReminderListParams = {}): Promise<ReminderListResult> => {
    const { signal, skipCache, ...query } = params;
    const response = await api.get(API_ENDPOINTS.REMINDERS.LIST, {
      params: {
        page_size: 50,
        ordering: 'due_at',
        ...query,
      },
      signal,
      ...(skipCache ? { skipGetCache: true } : {}),
    });
    return parseListPayload(response.data);
  },

  get: async (id: string | number): Promise<ReminderRecord> => {
    const response = await api.get(API_ENDPOINTS.REMINDERS.DETAIL(id));
    return parseOne(response.data);
  },

  create: async (payload: CreateReminderPayload): Promise<ReminderRecord> => {
    const response = await api.post(API_ENDPOINTS.REMINDERS.LIST, payload);
    return parseOne(response.data);
  },

  update: async (
    id: string | number,
    payload: UpdateReminderPayload,
  ): Promise<ReminderRecord> => {
    const response = await api.patch(API_ENDPOINTS.REMINDERS.DETAIL(id), payload);
    return parseOne(response.data);
  },

  remove: async (id: string | number): Promise<void> => {
    await api.delete(API_ENDPOINTS.REMINDERS.DETAIL(id));
  },

  complete: async (id: string | number): Promise<ReminderRecord> => {
    const response = await api.post(API_ENDPOINTS.REMINDERS.COMPLETE(id));
    return parseOne(response.data);
  },

  dismiss: async (id: string | number): Promise<ReminderRecord> => {
    const response = await api.post(API_ENDPOINTS.REMINDERS.DISMISS(id));
    return parseOne(response.data);
  },

  snooze: async (
    id: string | number,
    payload: SnoozeReminderPayload,
  ): Promise<ReminderRecord> => {
    const minutes =
      typeof payload.minutes === 'number' && Number.isFinite(payload.minutes)
        ? Math.max(1, Math.round(payload.minutes))
        : undefined;
    const body: SnoozeReminderPayload = {
      ...payload,
      ...(minutes != null ? { minutes } : {}),
    };
    // If only minutes provided, also send snooze_until for backends that expect an ISO stamp.
    if (minutes != null && !body.snooze_until) {
      body.snooze_until = new Date(Date.now() + minutes * 60_000).toISOString();
    }
    const response = await api.post(API_ENDPOINTS.REMINDERS.SNOOZE(id), body);
    return parseOne(response.data);
  },

  /** Badge counts for nav — uses DRF pagination `count`. */
  badgeCounts: async (): Promise<ReminderBadgeCounts> => {
    const [overdue, today] = await Promise.all([
      remindersApi.list({ scope: 'overdue', page_size: 1 }),
      remindersApi.list({ scope: 'today', page_size: 1 }),
    ]);
    return {
      overdue: overdue.count,
      today: today.count,
      total: overdue.count + today.count,
    };
  },
};

export const listReminders = remindersApi.list;
export const getReminder = remindersApi.get;
export const createReminder = remindersApi.create;
export const updateReminder = remindersApi.update;
export const deleteReminder = remindersApi.remove;
export const completeReminder = remindersApi.complete;
export const dismissReminder = remindersApi.dismiss;
export const snoozeReminder = remindersApi.snooze;
export const fetchReminderBadgeCounts = remindersApi.badgeCounts;

export { getApiErrorMessage };

/** Clear message when Reminders routes are not deployed yet (production 404). */
export function getReminderApiErrorMessage(
  error: unknown,
  fallback = 'Could not save reminder. Please try again.',
): string {
  if (axios.isAxiosError(error) && error.response?.status === 404) {
    return 'Reminders API is not available on the server (404). Ask backend to deploy /api/reminders/ to Railway, run migrations, and restart.';
  }
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return 'Session expired. Please log in again and retry.';
  }
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return 'You do not have permission to manage reminders for this project.';
  }
  return getApiErrorMessage(error, fallback);
}
