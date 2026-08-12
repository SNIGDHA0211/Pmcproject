import axios from 'axios';
import { API_ENDPOINTS, getApiBaseUrl } from '../config/apiConfig';
import { getAccessToken } from '../utils/authStorage';
import { unwrapList } from './api';

const alertsClient = axios.create({
  baseURL: getApiBaseUrl('main'),
});

alertsClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AlertApiRecord {
  id: number | string;
  title: string;
  message: string;
  module_name?: string;
  project_name?: string;
  action_type?: string;
  notification_type?: string;
  sender?: string;
  sender_username?: string;
  sender_role?: string;
  created_at?: string;
  is_read?: boolean;
}

export interface CreateAlertPayload {
  title: string;
  message: string;
  module_name?: string;
  project_name?: string;
  action_type?: string;
  notification_type?: string;
  sender?: string;
  sender_username?: string;
  sender_role?: string;
  notify_role?: string;
  /** Target a specific user (Reminders assignee) when backend supports it */
  notify_user_id?: number | string;
  user_id?: number | string;
  assigned_to_id?: number | string;
}

export const alertsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    ordering?: string;
  }) =>
    alertsClient.get(API_ENDPOINTS.ALERTS.LIST, {
      params: {
        ordering: '-created_at',
        page_size: 200,
        ...params,
      },
    }),
  create: (payload: CreateAlertPayload) =>
    alertsClient.post(API_ENDPOINTS.ALERTS.LIST, payload),
  update: (id: string | number, payload: { is_read: boolean }) =>
    alertsClient.patch(API_ENDPOINTS.ALERTS.DETAIL(id), payload),
};

function hasNextAlertsPage(data: unknown, rowCount: number, pageSize: number): boolean {
  if (rowCount < pageSize) return false;
  if (!data || typeof data !== 'object') return false;
  const payload = data as Record<string, unknown>;
  const inner =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : payload;
  return Boolean(inner.next ?? payload.next);
}

/** Load all alert pages so PMC Head sees the full recent feed, not just page 1. */
export async function fetchAllAlerts(): Promise<AlertApiRecord[]> {
  const pageSize = 200;
  const collected: AlertApiRecord[] = [];
  let page = 1;

  for (let guard = 0; guard < 25; guard++) {
    const res = await alertsClient.get(API_ENDPOINTS.ALERTS.LIST, {
      params: { page, page_size: pageSize, ordering: '-created_at' },
    });
    const rows = unwrapAlertsResponse(res.data);
    collected.push(...rows);
    if (!hasNextAlertsPage(res.data, rows.length, pageSize)) break;
    page += 1;
  }

  return collected;
}

export function unwrapAlertsResponse(data: unknown): AlertApiRecord[] {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.success === true && obj.data !== undefined) {
      return unwrapList<AlertApiRecord>(obj.data);
    }
  }
  return unwrapList<AlertApiRecord>(data);
}
