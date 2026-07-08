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
}

export const alertsApi = {
  list: () => alertsClient.get(API_ENDPOINTS.ALERTS.LIST),
  create: (payload: CreateAlertPayload) =>
    alertsClient.post(API_ENDPOINTS.ALERTS.LIST, payload),
  update: (id: string | number, payload: { is_read: boolean }) =>
    alertsClient.patch(API_ENDPOINTS.ALERTS.DETAIL(id), payload),
};

export function unwrapAlertsResponse(data: unknown): AlertApiRecord[] {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.success === true && obj.data !== undefined) {
      return unwrapList<AlertApiRecord>(obj.data);
    }
  }
  return unwrapList<AlertApiRecord>(data);
}
