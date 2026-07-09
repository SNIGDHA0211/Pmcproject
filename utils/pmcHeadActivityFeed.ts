import type { AppNotification } from '../types';
import type { MonthlyScope } from '../types';
import {
  cashflowApi,
  correspondenceDocumentsApi,
  healthSafetyApi,
  invoicingApi,
  manpowerApi,
  monthlyScopeApi,
  normalizeHSERecord,
  normalizeManpowerRecord,
  normalizeProjectQualityStatusRecord,
  normalizeSiteImageList,
  projectQualityApi,
  siteImagesApi,
  unwrapList,
} from '../services/api';
import {
  formatAlertTimestampLabel,
  sortNotificationsDesc,
} from './alertHelpers';
import { resolveActorDisplayFromRecord, resolveActorDisplayName } from './actorDisplay';
import { loadUserDirectory, type DirectoryUser } from './userDirectory';
import { enrichActorFromProjectAssignment, enrichNotificationsActors, loadProjectsForActorFallback, type ProjectAssigneeInfo } from './projectActorFallback';
import { MONTH_OPTIONS } from './siteImages';

export interface ActivityRow {
  id: string;
  moduleName: string;
  projectName: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByUsername?: string;
  updatedByRole?: string;
  actionType: 'CREATE' | 'UPDATE';
  title: string;
  message: string;
  notificationType: string;
}

function monthLabel(month: number): string {
  return MONTH_OPTIONS.find((m) => m.value === month)?.label ?? `Month ${month}`;
}

function pickTimestamp(row: Record<string, unknown>): string {
  const candidates = [
    row.updated_at,
    row.updatedAt,
    row.modified_at,
    row.uploaded_at,
    row.uploadedAt,
    row.created_at,
    row.createdAt,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function formatActorMessage(
  name: string | undefined,
  role: string | undefined,
  verb: string,
  moduleName: string,
  projectName: string,
): string {
  const actorName = name?.trim() || 'Team member';
  const actorRole = role?.trim();
  const actorLine = actorRole ? `${actorName} · ${actorRole}` : actorName;
  const projectSuffix = projectName ? ` on ${projectName}` : '';
  return `${actorLine} ${verb} ${moduleName}${projectSuffix}.`;
}

function isRecent(iso: string, maxAgeDays: number): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return time >= Date.now() - maxAgeDays * 86_400_000;
}

function toNotification(row: ActivityRow, viewerUserId: string): AppNotification {
  return {
    id: `activity-${row.moduleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${row.id}`,
    userId: viewerUserId,
    title: row.title,
    message: row.message,
    type: row.actionType === 'CREATE' ? 'SUCCESS' : 'UPDATE',
    timestamp: formatAlertTimestampLabel(row.updatedAt),
    createdAt: row.updatedAt,
    isRead: false,
    senderName: row.updatedBy || 'Team member',
    senderUsername: row.updatedByUsername,
    senderRole: row.updatedByRole,
    moduleName: row.moduleName,
    projectName: row.projectName,
    actionType: row.actionType,
    notificationType: row.notificationType,
  };
}

function buildRowsFromRecords(
  moduleName: string,
  records: Array<Record<string, unknown>>,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
  options: {
    maxAgeDays: number;
    titleForCreate?: (record: Record<string, unknown>) => string;
    messageForCreate?: (record: Record<string, unknown>) => string;
    notificationType?: string;
  },
): ActivityRow[] {
  const rows: ActivityRow[] = [];
  for (const record of records) {
    const updatedAt = pickTimestamp(record);
    if (!updatedAt || !isRecent(updatedAt, options.maxAgeDays)) continue;

    const projectName = String(
      record.project_name ?? record.projectName ?? record.project ?? '',
    ).trim();
    if (!projectName) continue;

    const id = String(record.id ?? `${projectName}-${updatedAt}`);
    const actor = enrichActorFromProjectAssignment(
      resolveActorDisplayFromRecord(record, moduleName, directory),
      projectName,
      moduleName,
      projects,
      directory,
    );
    const title =
      options.titleForCreate?.(record) ??
      `${moduleName} updated`;
    const message =
      options.messageForCreate?.(record) ??
      formatActorMessage(actor.displayName, actor.roleLabel, 'updated', moduleName, projectName);

    rows.push({
      id,
      moduleName,
      projectName,
      updatedAt,
      updatedBy: actor.displayName,
      updatedByUsername: actor.username,
      updatedByRole: actor.roleLabel,
      actionType: 'UPDATE',
      title,
      message,
      notificationType: options.notificationType ?? 'MODULE_UPDATE',
    });
  }
  return rows;
}

async function fetchHealthSafetyActivity(
  maxAgeDays: number,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): Promise<ActivityRow[]> {
  const response = await healthSafetyApi.getAll({ page_size: 200 });
  const records = unwrapList<Record<string, unknown>>(response.data).map((row) => {
    const normalized = normalizeHSERecord(row);
    return {
      ...row,
      id: normalized.id,
      project_name: normalized.projectName,
      month: normalized.month,
      year: normalized.year,
      updated_at: normalized.updatedAt,
      updated_by_name: normalized.updatedBy,
      updated_by_username: normalized.updatedByUsername,
    };
  });
  return buildRowsFromRecords('Health & Safety', records, directory, projects, {
    maxAgeDays,
    titleForCreate: () => 'Health & Safety updated',
    notificationType: 'HSE_UPDATE',
  });
}

async function fetchQualityActivity(
  maxAgeDays: number,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): Promise<ActivityRow[]> {
  const response = await projectQualityApi.getAll({ page_size: 200 });
  const records = unwrapList<Record<string, unknown>>(response.data).map((row) => {
    const normalized = normalizeProjectQualityStatusRecord(row);
    return {
      ...row,
      id: normalized.id,
      project_name: normalized.projectName,
      updated_at: normalized.updatedAt,
      updated_by_name: normalized.updatedBy,
    };
  });
  return buildRowsFromRecords('Quality Status', records, directory, projects, {
    maxAgeDays,
    titleForCreate: () => 'Quality status updated',
    notificationType: 'QUALITY_UPDATE',
  });
}

async function fetchManpowerActivity(
  maxAgeDays: number,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): Promise<ActivityRow[]> {
  const response = await manpowerApi.getManpower({ page_size: 200 });
  const records = unwrapList<Record<string, unknown>>(response.data).map((row) => ({
    ...row,
    ...normalizeManpowerRecord(row),
  }));
  return buildRowsFromRecords(
    'Manpower Management',
    records.map((row) => ({
      ...row,
      project_name: row.project_name,
      updated_at: row.updated_at || row.created_at,
    })),
    directory,
    projects,
    {
      maxAgeDays,
      titleForCreate: () => 'Manpower updated',
    },
  );
}

async function fetchScopeActivity(
  maxAgeDays: number,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): Promise<ActivityRow[]> {
  const response = await monthlyScopeApi.getScopes({ page_size: 200 });
  const records = unwrapList<MonthlyScope>(response.data);
  return buildRowsFromRecords(
    'Monthly Scope',
    records.map((scope) => ({
      id: scope.id,
      project_name: scope.project_name,
      updated_at: scope.updated_at || scope.created_at,
      updated_by_name: scope.created_by_name,
      created_by: scope.created_by,
      month: scope.month,
      status: scope.status,
    })),
    directory,
    projects,
    {
      maxAgeDays,
      titleForCreate: () => 'Monthly scope updated',
    },
  );
}

async function fetchSitePhotoActivity(
  maxAgeDays: number,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): Promise<ActivityRow[]> {
  const response = await siteImagesApi.list();
  const images = normalizeSiteImageList(response.data?.data ?? response.data);
  const groups = new Map<string, typeof images>();
  for (const image of images) {
    if (!image.uploadedAt || !isRecent(image.uploadedAt, maxAgeDays)) continue;
    const day = image.uploadedAt.slice(0, 10);
    const key = `${image.projectName}|${image.month}|${image.year}|${image.uploadedBy ?? 'unknown'}|${day}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(image);
    groups.set(key, bucket);
  }

  const rows: ActivityRow[] = [];
  for (const [, group] of groups) {
    const latest = group.reduce((a, b) =>
      new Date(a.uploadedAt).getTime() > new Date(b.uploadedAt).getTime() ? a : b,
    );
    const count = group.length;
    const period = `${monthLabel(latest.month)} ${latest.year}`;
    const actor = enrichActorFromProjectAssignment(
      resolveActorDisplayFromRecord(
        {
          uploaded_by_name: latest.uploadedBy,
          uploaded_by_username: latest.uploadedByUsername,
          uploaded_by: latest.uploadedBy,
        },
        'Site Photos',
        directory,
      ),
      latest.projectName,
      'Site Photos',
      projects,
      directory,
    );
    const actorLine = actor.roleLabel
      ? `${actor.displayName} · ${actor.roleLabel}`
      : actor.displayName;
    rows.push({
      id: `site-${latest.projectName}-${latest.month}-${latest.year}-${latest.uploadedAt}`,
      moduleName: 'Site Photos',
      projectName: latest.projectName,
      updatedAt: latest.uploadedAt,
      updatedBy: actor.displayName,
      updatedByUsername: actor.username,
      updatedByRole: actor.roleLabel,
      actionType: 'CREATE',
      title: count > 1 ? `${count} site photos uploaded` : 'Site photo uploaded',
      message: `${actorLine} uploaded ${count} photo${count > 1 ? 's' : ''} for ${period} on ${latest.projectName}.`,
      notificationType: 'SITE_PHOTO_UPDATE',
    });
  }
  return rows;
}

async function fetchCashflowActivity(
  maxAgeDays: number,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): Promise<ActivityRow[]> {
  const response = await cashflowApi.getCashflow();
  const records = unwrapList<Record<string, unknown>>(response.data);
  return buildRowsFromRecords('Cash Flow', records, directory, projects, {
    maxAgeDays,
    titleForCreate: () => 'Cash flow updated',
    notificationType: 'BILLING_UPDATE',
  });
}

async function fetchInvoicingActivity(
  maxAgeDays: number,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): Promise<ActivityRow[]> {
  const response = await invoicingApi.getInvoicing();
  const records = unwrapList<Record<string, unknown>>(response.data);
  return buildRowsFromRecords('Invoicing', records, directory, projects, {
    maxAgeDays,
    titleForCreate: () => 'Invoicing updated',
    notificationType: 'BILLING_UPDATE',
  });
}

async function fetchCorrespondenceActivity(
  maxAgeDays: number,
  directory: DirectoryUser[],
  projects: ProjectAssigneeInfo[],
): Promise<ActivityRow[]> {
  const response = await correspondenceDocumentsApi.getAll({ page_size: 200 });
  const records = unwrapList<Record<string, unknown>>(response.data);
  return buildRowsFromRecords('Correspondence', records, directory, projects, {
    maxAgeDays,
    titleForCreate: (record) => {
      const type = String(record.correspondence_type ?? record.correspondenceType ?? '').toUpperCase();
      if (type === 'CONTRACTOR') return 'Contractor correspondence updated';
      if (type === 'CLIENT') return 'Client correspondence updated';
      return 'Correspondence updated';
    },
    notificationType: 'MODULE_UPDATE',
  });
}

export async function fetchPmcHeadActivityNotifications(
  viewerUserId: string,
  options?: { maxAgeDays?: number; limit?: number },
): Promise<AppNotification[]> {
  const maxAgeDays = options?.maxAgeDays ?? 30;
  const limit = options?.limit ?? 120;

  const [directory, projects] = await Promise.all([
    loadUserDirectory(),
    loadProjectsForActorFallback(),
  ]);

  const batches = await Promise.allSettled([
    fetchHealthSafetyActivity(maxAgeDays, directory, projects),
    fetchQualityActivity(maxAgeDays, directory, projects),
    fetchManpowerActivity(maxAgeDays, directory, projects),
    fetchScopeActivity(maxAgeDays, directory, projects),
    fetchSitePhotoActivity(maxAgeDays, directory, projects),
    fetchInvoicingActivity(maxAgeDays, directory, projects),
    fetchCashflowActivity(maxAgeDays, directory, projects),
    fetchCorrespondenceActivity(maxAgeDays, directory, projects),
  ]);

  const rows: ActivityRow[] = [];
  for (const batch of batches) {
    if (batch.status === 'fulfilled') rows.push(...batch.value);
  }

  const notifications = rows.map((row) => toNotification(row, viewerUserId));
  const enriched = enrichNotificationsActors(notifications, directory, projects);
  return sortNotificationsDesc(enriched).slice(0, limit);
}

export function isSyntheticActivityNotification(id: string): boolean {
  return id.startsWith('activity-') || id.startsWith('site-photo-activity-');
}

export function mergeActivityNotifications(
  primary: AppNotification[],
  activity: AppNotification[],
): AppNotification[] {
  const seen = new Set(
    primary.map((n) => `${n.projectName}|${n.moduleName}|${n.createdAt}|${n.senderName}|${n.title}`),
  );
  const extras = activity.filter((n) => {
    const key = `${n.projectName}|${n.moduleName}|${n.createdAt}|${n.senderName}|${n.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return sortNotificationsDesc([...primary, ...extras]);
}
