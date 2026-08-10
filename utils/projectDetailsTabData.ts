import type { AuditLog, Document, Task } from '../types';
import { unwrapList } from '../services/api';
import { pickDirectStoredFileUrl } from './storedFileUrl';

function matchProjectRef(
  row: Record<string, unknown>,
  projectId: string,
  projectTitle: string,
  projectApiName?: string,
): boolean {
  const idCandidates = [
    row.project_id,
    row.projectId,
    typeof row.project === 'object' && row.project
      ? (row.project as Record<string, unknown>).id
      : row.project,
  ]
    .filter((v) => v != null && v !== '')
    .map(String);

  if (idCandidates.some((id) => id === String(projectId))) return true;

  const nameCandidates = [
    row.project_name,
    row.projectName,
    typeof row.project === 'object' && row.project
      ? (row.project as Record<string, unknown>).name ??
        (row.project as Record<string, unknown>).title
      : null,
    row.name,
    row.title,
  ]
    .filter((v) => typeof v === 'string' && v.trim())
    .map((v) => String(v).trim().toLowerCase());

  const titles = [projectTitle, projectApiName]
    .filter(Boolean)
    .map((t) => String(t).trim().toLowerCase());

  return nameCandidates.some((n) => titles.includes(n));
}

export function extractDocumentationFileUrl(detail: unknown): string | undefined {
  if (!detail || typeof detail !== 'object') return undefined;
  const row = detail as Record<string, unknown>;
  const candidates = [
    row.documentation_file_url,
    row.documentationFileUrl,
    row.documentation_url,
    row.documentation_file,
    row.file_url,
    row.fileUrl,
    row.s3_url,
    row.s3Url,
    row.attachment_url,
    row.document_url,
    row.url,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//i.test(c.trim())) return c.trim();
  }
  return undefined;
}

export function mapVaultDocumentsFromApi(
  payload: unknown,
  projectId: string,
  projectTitle: string,
  projectApiName?: string,
): Document[] {
  const rows = unwrapList<Record<string, unknown>>(payload);
  return rows
    .filter((row) => matchProjectRef(row, projectId, projectTitle, projectApiName))
    .map((row, index) => {
      const name = String(
        row.file_name ?? row.fileName ?? row.name ?? row.title ?? `Document ${index + 1}`,
      ).trim();
      const url =
        pickDirectStoredFileUrl(row) ??
        String(row.file_url ?? row.fileUrl ?? row.url ?? row.document_url ?? '#').trim();
      const type = String(row.file_type ?? row.fileType ?? row.type ?? 'FILE').trim();
      return {
        id: String(row.id ?? `vault-${projectId}-${index}`),
        name,
        type,
        url: url || '#',
        uploadedBy: String(
          row.uploaded_by_name ??
            row.uploaded_by ??
            row.uploadedBy ??
            row.created_by_name ??
            'System',
        ),
        uploadedAt: String(
          row.uploaded_at ?? row.uploadedAt ?? row.created_at ?? new Date().toISOString(),
        ),
        status: 'VERIFIED' as const,
        version: Number(row.version) || 1,
      };
    });
}

export function mapTasksFromApi(
  payload: unknown,
  projectId: string,
  projectTitle: string,
  projectApiName?: string,
): Task[] {
  const rows = unwrapList<Record<string, unknown>>(payload);
  return rows
    .filter((row) => matchProjectRef(row, projectId, projectTitle, projectApiName))
    .map((row, index) => {
      const statusRaw = String(row.status ?? 'PENDING').toUpperCase();
      const status: Task['status'] =
        statusRaw.includes('COMPLETE')
          ? 'COMPLETED'
          : statusRaw.includes('PROGRESS')
            ? 'IN_PROGRESS'
            : 'PENDING';
      return {
        id: String(row.id ?? `task-${projectId}-${index}`),
        title: String(row.title ?? row.name ?? row.task_name ?? `Task ${index + 1}`).trim(),
        description: String(row.description ?? row.details ?? row.remarks ?? '').trim(),
        assignedTo: String(
          row.assigned_to ??
            row.assignedTo ??
            row.assignee ??
            row.assigned_user ??
            '',
        ),
        status,
        dueDate: String(
          row.due_date ?? row.dueDate ?? row.deadline ?? row.target_date ?? '—',
        ),
      };
    });
}

export function buildProjectAuditTrail(options: {
  projectId: string;
  projectTitle: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  completedBy?: string | null;
  teamLeadName?: string;
  siteEngineerNames?: string[];
  existing?: AuditLog[];
  detail?: Record<string, unknown> | null;
}): AuditLog[] {
  const logs: AuditLog[] = [];
  const seen = new Set<string>();

  const push = (log: AuditLog) => {
    const key = `${log.action}|${log.timestamp}|${log.details}`;
    if (seen.has(key)) return;
    seen.add(key);
    logs.push(log);
  };

  for (const log of options.existing ?? []) {
    push(log);
  }

  if (options.createdAt) {
    push({
      id: `created-${options.projectId}`,
      action: 'Project Created',
      performedBy: 'System',
      timestamp: options.createdAt,
      details: `"${options.projectTitle}" was initialized in the portfolio.`,
    });
  }

  if (options.teamLeadName?.trim()) {
    push({
      id: `tl-${options.projectId}`,
      action: 'Team Leader Assigned',
      performedBy: options.teamLeadName.trim(),
      timestamp: options.updatedAt || options.createdAt || new Date().toISOString(),
      details: `${options.teamLeadName.trim()} is assigned as Team Leader.`,
    });
  }

  for (const name of options.siteEngineerNames ?? []) {
    if (!name?.trim()) continue;
    push({
      id: `se-${options.projectId}-${name}`,
      action: 'Site Engineer Assigned',
      performedBy: name.trim(),
      timestamp: options.updatedAt || options.createdAt || new Date().toISOString(),
      details: `${name.trim()} is assigned as Site Engineer.`,
    });
  }

  if (options.completedAt) {
    push({
      id: `complete-${options.projectId}`,
      action: 'Project Completed',
      performedBy: options.completedBy || 'System',
      timestamp: options.completedAt,
      details: options.completedBy
        ? `Marked completed by ${options.completedBy}.`
        : 'Project marked as completed.',
    });
  }

  const detail = options.detail;
  if (detail) {
    const history =
      (Array.isArray(detail.audit_logs) && detail.audit_logs) ||
      (Array.isArray(detail.auditLogs) && detail.auditLogs) ||
      (Array.isArray(detail.activity_log) && detail.activity_log) ||
      (Array.isArray(detail.history) && detail.history) ||
      [];

    history.forEach((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') return;
      const row = item as Record<string, unknown>;
      push({
        id: String(row.id ?? `detail-audit-${index}`),
        action: String(row.action ?? row.event ?? row.title ?? 'Activity').trim(),
        performedBy: String(
          row.performed_by_name ??
            row.performed_by ??
            row.user_name ??
            row.actor ??
            'System',
        ),
        timestamp: String(
          row.timestamp ?? row.created_at ?? row.date ?? new Date().toISOString(),
        ),
        details: String(row.details ?? row.description ?? row.message ?? '').trim(),
      });
    });
  }

  return logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
