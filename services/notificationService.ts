/**
 * Optional Chrome / channel notification service.
 *
 * DPR emails (preferred path — do NOT call this after normal actions):
 * - New DPR → POST /api/dpr/ only (initial email when status → pending_team_lead)
 * - Resubmit draft/rejected → POST /api/dpr/{id}/submit/
 * - Approve / reject → POST /api/dpr/{id}/approve_* / reject/
 *
 * Never call /api/notifications/... after create for a new DPR.
 * Never call /api/internal/dpr/executive-digest/ from the frontend.
 * Optional notify endpoints are manual/test only; fire-and-forget if used.
 */
import axios from 'axios';
import {
  API_ENDPOINTS,
  buildApiUrl,
} from '../config/apiConfig';
import { getAccessToken } from '../utils/authStorage';

export type NotificationType =
  | 'project_created'
  | 'project_assigned'
  | 'site_engineer_assigned'
  | 'dpr_submitted'
  | 'dpr_approved'
  | 'dpr_rejected';

export type DprApproverRole = 'Team Leader' | 'PMC Manager' | 'PMC Head';

export interface SendNotificationPayload {
  type: NotificationType;
  project_id?: number | string;
  user_id?: number;
  dpr_id?: number | string;
  approved_by_role?: DprApproverRole;
  rejected_by_role?: DprApproverRole;
}

async function postNotification(
  endpoint: string,
  body: Record<string, unknown>,
) {
  const token = getAccessToken();
  return axios.post(buildApiUrl(endpoint), body, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/** Unified optional endpoint — JWT via existing auth storage. */
export async function sendNotification(payload: SendNotificationPayload) {
  return postNotification(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, {
    ...payload,
  });
}

export async function sendProjectCreatedNotification(projectId: string | number) {
  return sendNotification({ type: 'project_created', project_id: projectId });
}

export async function sendTeamLeadAssignedNotification(
  projectId: string | number,
  userId: number,
) {
  return sendNotification({
    type: 'project_assigned',
    project_id: projectId,
    user_id: userId,
  });
}

export async function sendSiteEngineerAssignedNotification(
  projectId: string | number,
  userId: number,
) {
  return sendNotification({
    type: 'site_engineer_assigned',
    project_id: projectId,
    user_id: userId,
  });
}

export async function sendDprSubmittedNotification(dprId: string | number) {
  return sendNotification({ type: 'dpr_submitted', dpr_id: dprId });
}

export async function sendDprApprovedNotification(
  dprId: string | number,
  approvedByRole?: DprApproverRole,
) {
  return sendNotification({
    type: 'dpr_approved',
    dpr_id: dprId,
    ...(approvedByRole ? { approved_by_role: approvedByRole } : {}),
  });
}

export async function sendDprRejectedNotification(
  dprId: string | number,
  rejectedByRole?: DprApproverRole,
) {
  return sendNotification({
    type: 'dpr_rejected',
    dpr_id: dprId,
    ...(rejectedByRole ? { rejected_by_role: rejectedByRole } : {}),
  });
}

/** Specific endpoints (same payloads). Optional / legacy only. */
export const notificationEndpoints = {
  projectCreated: (projectId: string | number) =>
    postNotification(API_ENDPOINTS.NOTIFICATIONS.PROJECT_CREATED, {
      project_id: projectId,
    }),
  teamLeadAssigned: (projectId: string | number, userId: number) =>
    postNotification(API_ENDPOINTS.NOTIFICATIONS.TEAM_LEAD_ASSIGNED, {
      project_id: projectId,
      user_id: userId,
    }),
  siteEngineerAssigned: (projectId: string | number, userId: number) =>
    postNotification(API_ENDPOINTS.NOTIFICATIONS.SITE_ENGINEER_ASSIGNED, {
      project_id: projectId,
      user_id: userId,
    }),
  dprSubmitted: (dprId: string | number) =>
    postNotification(API_ENDPOINTS.NOTIFICATIONS.DPR_SUBMITTED, {
      dpr_id: dprId,
    }),
  dprApproved: (dprId: string | number) =>
    postNotification(API_ENDPOINTS.NOTIFICATIONS.DPR_APPROVED, {
      dpr_id: dprId,
    }),
  dprRejected: (dprId: string | number) =>
    postNotification(API_ENDPOINTS.NOTIFICATIONS.DPR_REJECTED, {
      dpr_id: dprId,
    }),
};

/**
 * Fire-and-forget. Optional notification failures must never fail the main action.
 */
export function notifyOptionalSafe(
  call: () => Promise<unknown>,
  label = 'optional notification',
): void {
  void call().catch((err) => {
    console.warn(`[notify] ${label} failed (non-blocking):`, err);
  });
}

/** Compatibility object for older `notificationApi` imports. */
export const notificationApi = {
  sendNotification: (type: string, params: Record<string, unknown>) =>
    postNotification(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, {
      type,
      ...params,
    }),
  sendProjectCreatedNotification,
  sendTeamLeadAssignedNotification,
  sendSiteEngineerAssignedNotification,
  sendDPRSubmittedNotification: sendDprSubmittedNotification,
  sendDPRApprovedNotification: sendDprApprovedNotification,
  sendDPRRejectedNotification: sendDprRejectedNotification,
  endpoints: notificationEndpoints,
  notifyOptionalSafe,
};
