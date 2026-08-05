import { ProjectStatus, type Project } from '../types';

/** Additive billing field from complete / overview APIs. */
export type ProjectBillingStatus = 'Pending' | 'Completed';

export type CompletionActor = {
  id?: number | string | null;
  username?: string | null;
  full_name?: string | null;
};

export type ExtractedCompletionFields = {
  completedAt?: string;
  completedBy?: string;
  completionNotes?: string;
  billingStatus?: ProjectBillingStatus;
  billingCompletedAt?: string;
  billingCompletedBy?: string;
  billingCompletionNotes?: string;
};

/** True when the project is marked completed (API `completed` or APPROVED). */
export function isProjectCompleted(
  project?: Pick<Project, 'status' | 'completedAt'> | null,
): boolean {
  if (!project) return false;
  if (project.completedAt) return true;
  return project.status === ProjectStatus.APPROVED;
}

export function normalizeBillingStatus(
  raw: unknown,
): ProjectBillingStatus | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'pending') return 'Pending';
  if (s === 'completed' || s === 'complete') return 'Completed';
  return null;
}

/** Billing still open after project completion. */
export function isBillingPending(
  project?: Pick<Project, 'status' | 'completedAt' | 'billingStatus'> | null,
): boolean {
  if (!isProjectCompleted(project)) return false;
  const billing = normalizeBillingStatus(project?.billingStatus);
  return billing !== 'Completed';
}

export function canCompleteProjectBilling(
  project?: Pick<Project, 'status' | 'completedAt' | 'billingStatus'> | null,
): boolean {
  return isBillingPending(project);
}

function actorDisplayName(actor: unknown): string | undefined {
  if (actor == null) return undefined;
  if (typeof actor === 'string' || typeof actor === 'number') {
    const s = String(actor).trim();
    return s || undefined;
  }
  if (typeof actor !== 'object') return undefined;
  const obj = actor as CompletionActor;
  const full = String(obj.full_name ?? '').trim();
  if (full) return full;
  const username = String(obj.username ?? '').trim();
  if (username) return username;
  if (obj.id != null && String(obj.id).trim()) return String(obj.id);
  return undefined;
}

/** Portfolio / details status badge label (lifecycle only). */
export function getProjectStatusLabel(
  project?: Pick<Project, 'status' | 'completedAt'> | null,
): string {
  if (!project) return '';
  if (isProjectCompleted(project)) return 'Completed';
  return String(project.status ?? '').replace(/_/g, ' ');
}

/**
 * Suggested UI labels:
 * completed + Pending → Project Completed · Billing Pending
 * completed + Completed → Project Completed · Billing Completed
 */
export function getProjectCompletionBillingLabel(
  project?: Pick<Project, 'status' | 'completedAt' | 'billingStatus'> | null,
): string {
  if (!isProjectCompleted(project)) return getProjectStatusLabel(project);
  return formatCompletedBillingLabel(project?.billingStatus);
}

/** Label when you already know the project is completed (e.g. overview cards). */
export function formatCompletedBillingLabel(billingStatus?: string | null): string {
  const billing = normalizeBillingStatus(billingStatus);
  if (billing === 'Completed') return 'Project Completed · Billing Completed';
  return 'Project Completed · Billing Pending';
}

export function formatCompletionDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse completion + billing fields from a backend project row,
 * complete API `data`, or overview card payload.
 */
export function extractCompletionFields(
  row: Record<string, unknown> | null | undefined,
): ExtractedCompletionFields {
  if (!row || typeof row !== 'object') return {};

  // Prefer nested `data` from { success, message, data } envelopes
  const dataNested =
    row.data && typeof row.data === 'object'
      ? (row.data as Record<string, unknown>)
      : null;
  const source = dataNested ?? row;

  const completedAtRaw =
    source.completed_at ??
    source.completed_on ??
    source.completion_date ??
    source.completedAt;
  const completedAt =
    completedAtRaw != null && String(completedAtRaw).trim()
      ? String(completedAtRaw)
      : undefined;

  const completedBy =
    actorDisplayName(source.completed_by) ??
    (source.completed_by_name != null && String(source.completed_by_name).trim()
      ? String(source.completed_by_name).trim()
      : undefined) ??
    (source.completed_by_username != null &&
    String(source.completed_by_username).trim()
      ? String(source.completed_by_username).trim()
      : undefined) ??
    (source.completedBy != null && String(source.completedBy).trim()
      ? String(source.completedBy).trim()
      : undefined);

  const notesRaw = source.completion_notes ?? source.completionNotes ?? source.notes;
  const completionNotes =
    notesRaw != null && String(notesRaw).trim()
      ? String(notesRaw).trim()
      : undefined;

  const billingStatus = normalizeBillingStatus(
    source.billing_status ?? source.billingStatus,
  );

  const billingCompletedAtRaw =
    source.billing_completed_at ?? source.billingCompletedAt;
  const billingCompletedAt =
    billingCompletedAtRaw != null && String(billingCompletedAtRaw).trim()
      ? String(billingCompletedAtRaw)
      : undefined;

  const billingCompletedBy =
    actorDisplayName(source.billing_completed_by) ??
    (source.billing_completed_by_name != null &&
    String(source.billing_completed_by_name).trim()
      ? String(source.billing_completed_by_name).trim()
      : undefined) ??
    (source.billingCompletedBy != null && String(source.billingCompletedBy).trim()
      ? String(source.billingCompletedBy).trim()
      : undefined);

  const billingNotesRaw =
    source.billing_completion_notes ?? source.billingCompletionNotes;
  const billingCompletionNotes =
    billingNotesRaw != null && String(billingNotesRaw).trim()
      ? String(billingNotesRaw).trim()
      : undefined;

  return {
    completedAt,
    completedBy,
    completionNotes,
    billingStatus: billingStatus ?? undefined,
    billingCompletedAt,
    billingCompletedBy,
    billingCompletionNotes,
  };
}
