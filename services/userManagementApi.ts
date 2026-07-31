/**
 * HO User Management API — /api/users/
 * Reuses the shared authenticated axios instance (JWT, refresh, base URL).
 */
import axios from 'axios';
import api, { getApiErrorMessage } from './api';
import { API_ENDPOINTS } from '../config/apiConfig';
import type {
  ManageableUserRole,
  ManagedUser,
  ManagedUserProject,
} from '../types';

export interface UserListParams {
  search?: string;
  role?: string;
  project?: number | string;
  status?: 'active' | 'inactive' | '';
  page?: number;
  page_size?: number;
  /** Abort in-flight list fetch when filters/search change. */
  signal?: AbortSignal;
}

export interface UserCreatePayload {
  full_name: string;
  username: string;
  role: ManageableUserRole | string;
  project_ids: number[];
  password: string;
  confirm_password: string;
}

export interface UserUpdatePayload {
  full_name?: string;
  username?: string;
  role?: ManageableUserRole | string;
  project_ids?: number[];
  is_active?: boolean;
  status?: 'active' | 'inactive';
}

export interface UserListResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: ManagedUser[];
  message: string;
  success: boolean;
}

export interface UserMutationResult {
  user: ManagedUser | null;
  message: string;
  success: boolean;
  fieldErrors: Record<string, string>;
}

function unwrapEnvelope(payload: unknown): {
  success: boolean;
  message: string;
  data: unknown;
} {
  const body =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};
  return {
    success: body.success !== false,
    message: String(body.message ?? ''),
    data: 'data' in body ? body.data : payload,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && value.length > 0) return firstString(value[0]);
  return '';
}

function parseProjects(row: Record<string, unknown>): ManagedUserProject[] {
  const raw =
    row.projects ??
    row.assigned_projects ??
    row.assignedProjects ??
    row.project_list;

  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (item && typeof item === 'object') {
          const p = item as Record<string, unknown>;
          const id = Number(p.id ?? p.project_id ?? 0);
          const name = String(
            p.name ?? p.title ?? p.project_name ?? p.projectName ?? '',
          );
          if (!id) return null;
          return { id, name: name || `Project ${id}` };
        }
        const id = Number(item);
        if (!id) return null;
        return { id, name: `Project ${id}` };
      })
      .filter((p): p is ManagedUserProject => Boolean(p));
  }

  const ids = row.project_ids ?? row.projectIds;
  const names = row.project_names ?? row.projectNames;
  if (Array.isArray(ids)) {
    return ids
      .map((id, index) => {
        const num = Number(id);
        if (!num) return null;
        const name = Array.isArray(names) ? String(names[index] ?? '') : '';
        return { id: num, name: name || `Project ${num}` };
      })
      .filter((p): p is ManagedUserProject => Boolean(p));
  }

  return [];
}

function parseIsActive(row: Record<string, unknown>): boolean {
  if (typeof row.is_active === 'boolean') return row.is_active;
  if (typeof row.isActive === 'boolean') return row.isActive;
  const status = String(row.status ?? '').toLowerCase();
  if (status === 'inactive' || status === 'deactivated' || status === 'disabled') {
    return false;
  }
  if (status === 'active') return true;
  return true;
}

export function normalizeManagedUser(row: unknown): ManagedUser | null {
  const data = asRecord(row);
  const id = Number(data.id);
  if (!id) return null;

  return {
    id,
    fullName: String(
      data.full_name ?? data.fullName ?? data.name ?? data.username ?? '',
    ),
    username: String(data.username ?? ''),
    role: String(data.role ?? data.primary_role ?? data.group ?? ''),
    email: String(data.email ?? ''),
    isActive: parseIsActive(data),
    projects: parseProjects(data),
    createdAt:
      (data.created_at as string | null | undefined) ??
      (data.date_joined as string | null | undefined) ??
      (data.createdAt as string | null | undefined) ??
      null,
    lastLogin:
      (data.last_login as string | null | undefined) ??
      (data.lastLogin as string | null | undefined) ??
      null,
  };
}

export function parseUserListResponse(payload: unknown): UserListResult {
  const { success, message, data } = unwrapEnvelope(payload);
  const body = asRecord(data);
  const resultsRaw = Array.isArray(body.results)
    ? body.results
    : Array.isArray(data)
      ? (data as unknown[])
      : Array.isArray(body.users)
        ? body.users
        : [];

  const results = resultsRaw
    .map(normalizeManagedUser)
    .filter((u): u is ManagedUser => Boolean(u));

  return {
    count: Number(body.count) || results.length,
    next: (body.next as string | null) ?? null,
    previous: (body.previous as string | null) ?? null,
    results,
    message,
    success,
  };
}

export function parseUserResponse(payload: unknown): UserMutationResult {
  const { success, message, data } = unwrapEnvelope(payload);
  const user = normalizeManagedUser(data);
  return { user, message, success, fieldErrors: {} };
}

export function extractUserFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error) || !error.response?.data) return {};
  const data = error.response.data;
  if (!data || typeof data !== 'object') return {};

  const body = data as Record<string, unknown>;
  const source =
    body.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)
      ? (body.errors as Record<string, unknown>)
      : body.data && typeof body.data === 'object' && !Array.isArray(body.data)
        ? (body.data as Record<string, unknown>)
        : body;

  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === 'success' || key === 'message' || key === 'detail' || key === 'data') {
      continue;
    }
    const msg = firstString(value).trim();
    if (msg) fieldErrors[key] = msg;
  }
  return fieldErrors;
}

export function getUserManagementErrorMessage(
  error: unknown,
  fallback = 'Unable to complete the request.',
): string {
  return getApiErrorMessage(error, fallback);
}

export async function getUsers(params: UserListParams = {}): Promise<UserListResult> {
  const query: Record<string, string | number> = {};
  if (params.search) query.search = params.search;
  if (params.role) query.role = params.role;
  if (params.project) query.project = params.project;
  if (params.status) query.status = params.status;
  if (params.page) query.page = params.page;
  if (params.page_size) query.page_size = params.page_size;

  const res = await api.get(API_ENDPOINTS.USERS.LIST, {
    params: query,
    ...(params.signal ? { signal: params.signal } : {}),
  });
  return parseUserListResponse(res.data);
}

export async function getUser(id: string | number): Promise<UserMutationResult> {
  const res = await api.get(API_ENDPOINTS.USERS.DETAIL(id));
  return parseUserResponse(res.data);
}

export async function createUser(
  payload: UserCreatePayload,
): Promise<UserMutationResult> {
  const res = await api.post(API_ENDPOINTS.USERS.LIST, payload);
  return parseUserResponse(res.data);
}

export async function updateUser(
  id: string | number,
  payload: UserUpdatePayload,
): Promise<UserMutationResult> {
  const res = await api.patch(API_ENDPOINTS.USERS.DETAIL(id), payload);
  return parseUserResponse(res.data);
}

export async function assignProjects(
  id: string | number,
  projectIds: number[],
): Promise<UserMutationResult> {
  const res = await api.patch(API_ENDPOINTS.USERS.ASSIGN_PROJECTS(id), {
    project_ids: projectIds,
  });
  return parseUserResponse(res.data);
}

export async function changePassword(
  id: string | number,
  password: string,
  confirmPassword: string,
): Promise<{ success: boolean; message: string; fieldErrors: Record<string, string> }> {
  const res = await api.patch(API_ENDPOINTS.USERS.CHANGE_PASSWORD(id), {
    password,
    confirm_password: confirmPassword,
    new_password: password,
    confirm_new_password: confirmPassword,
  });
  const { success, message } = unwrapEnvelope(res.data);
  return { success, message, fieldErrors: {} };
}

export async function resetPassword(
  id: string | number,
  password: string,
  confirmPassword: string,
): Promise<{ success: boolean; message: string; fieldErrors: Record<string, string> }> {
  const res = await api.patch(API_ENDPOINTS.USERS.RESET_PASSWORD(id), {
    password,
    confirm_password: confirmPassword,
    new_password: password,
    confirm_new_password: confirmPassword,
  });
  const { success, message } = unwrapEnvelope(res.data);
  return { success, message, fieldErrors: {} };
}

export async function updateUserStatus(
  id: string | number,
  isActive: boolean,
): Promise<UserMutationResult> {
  const res = await api.patch(API_ENDPOINTS.USERS.STATUS(id), {
    is_active: isActive,
    status: isActive ? 'active' : 'inactive',
  });
  return parseUserResponse(res.data);
}

export async function deleteUser(
  id: string | number,
): Promise<{ success: boolean; message: string }> {
  const res = await api.delete(API_ENDPOINTS.USERS.DETAIL(id));
  return unwrapEnvelope(res.data);
}
