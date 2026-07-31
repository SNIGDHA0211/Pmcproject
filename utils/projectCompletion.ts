import { ProjectStatus, type Project } from '../types';

/** True when the project is marked completed (API `completed` or APPROVED). */
export function isProjectCompleted(
  project?: Pick<Project, 'status' | 'completedAt'> | null,
): boolean {
  if (!project) return false;
  if (project.completedAt) return true;
  return project.status === ProjectStatus.APPROVED;
}

/** Portfolio / details status badge label. */
export function getProjectStatusLabel(
  project?: Pick<Project, 'status' | 'completedAt'> | null,
): string {
  if (!project) return '';
  if (isProjectCompleted(project)) return 'Completed';
  return String(project.status ?? '').replace(/_/g, ' ');
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

/** Parse completion fields from a backend project row or complete API payload. */
export function extractCompletionFields(row: Record<string, unknown> | null | undefined): {
  completedAt?: string;
  completedBy?: string;
  completionNotes?: string;
} {
  if (!row || typeof row !== 'object') return {};

  const completedAtRaw =
    row.completed_at ??
    row.completed_on ??
    row.completion_date ??
    row.completedAt;
  const completedAt =
    completedAtRaw != null && String(completedAtRaw).trim()
      ? String(completedAtRaw)
      : undefined;

  const byObj =
    row.completed_by && typeof row.completed_by === 'object'
      ? (row.completed_by as Record<string, unknown>)
      : null;
  const completedByRaw =
    row.completed_by_name ??
    row.completed_by_username ??
    byObj?.full_name ??
    byObj?.name ??
    byObj?.username ??
    (typeof row.completed_by === 'string' || typeof row.completed_by === 'number'
      ? row.completed_by
      : null);
  const completedBy =
    completedByRaw != null && String(completedByRaw).trim()
      ? String(completedByRaw).trim()
      : undefined;

  const notesRaw = row.completion_notes ?? row.completionNotes ?? row.notes;
  const completionNotes =
    notesRaw != null && String(notesRaw).trim()
      ? String(notesRaw).trim()
      : undefined;

  return { completedAt, completedBy, completionNotes };
}
