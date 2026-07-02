import type { ProjectDatesBgStatus } from '../services/api';

export type BgParty = 'SCL' | 'CONTRACTOR';
export type BgVisualTone = 'overdue' | 'compliant' | 'pending';

export interface BgPartyFields {
  dueDate: string | null;
  updatedDate: string | null;
  legacyDate: string | null;
  status: string | null;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseBgDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = startOfDay(new Date(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function extractBgPartyFields(
  bg: ProjectDatesBgStatus | null | undefined,
  party: BgParty,
): BgPartyFields {
  if (!bg) {
    return { dueDate: null, updatedDate: null, legacyDate: null, status: null };
  }

  if (party === 'SCL') {
    return {
      dueDate: bg.scl_bg_due_date,
      updatedDate: bg.scl_bg_updated_date,
      legacyDate: bg.scl_bg_date,
      status: bg.scl_bg_status,
    };
  }

  return {
    dueDate: bg.contractor_bg_due_date,
    updatedDate: bg.contractor_bg_updated_date,
    legacyDate: bg.contractor_bg_date,
    status: bg.contractor_bg_status,
  };
}

/** Effective updated date (new field or legacy alias). */
export function resolveBgUpdatedDate(fields: BgPartyFields): string | null {
  return fields.updatedDate ?? fields.legacyDate;
}

/**
 * Red  — due date passed without timely update, or updated after due date.
 * Green — updated on/before due date (compliant).
 * Blue  — pending / not yet due / yet to update.
 */
export function resolveBgVisualTone(
  fields: BgPartyFields,
  referenceDate: Date = new Date(),
): BgVisualTone {
  const today = startOfDay(referenceDate);
  const due = parseBgDay(fields.dueDate);
  const updated = parseBgDay(resolveBgUpdatedDate(fields));
  const status = (fields.status ?? '').toUpperCase();

  if (due && today > due) {
    if (!updated || updated > due) return 'overdue';
    if (status === 'YET_TO_UPDATE') return 'overdue';
  }

  if (updated && due && updated > due) return 'overdue';

  if (status === 'UPDATED' && updated) {
    if (!due || updated <= due) return 'compliant';
  }

  if (updated && due && updated <= due) return 'compliant';

  return 'pending';
}

export function bgToneClasses(tone: BgVisualTone, isDarkTheme: boolean): string {
  if (tone === 'overdue') {
    return isDarkTheme
      ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
      : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  }
  if (tone === 'compliant') {
    return isDarkTheme
      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }
  return isDarkTheme
    ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25'
    : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100';
}

export function bgToneLabel(tone: BgVisualTone): string {
  if (tone === 'overdue') return 'Overdue';
  if (tone === 'compliant') return 'Updated';
  return 'Pending';
}

/** Primary date shown on the pill — due date first, then updated. */
export function resolveBgDisplayDate(fields: BgPartyFields): string | null {
  return fields.dueDate ?? resolveBgUpdatedDate(fields);
}

export function hasAnyBgStatusData(bg: ProjectDatesBgStatus | null | undefined): boolean {
  if (!bg) return false;
  return Boolean(
    bg.contractor_bg_due_date ||
      bg.contractor_bg_updated_date ||
      bg.contractor_bg_date ||
      bg.scl_bg_due_date ||
      bg.scl_bg_updated_date ||
      bg.scl_bg_date ||
      (bg.contractor_bg_status && bg.contractor_bg_status !== 'YET_TO_UPDATE') ||
      (bg.scl_bg_status && bg.scl_bg_status !== 'YET_TO_UPDATE'),
  );
}

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}
