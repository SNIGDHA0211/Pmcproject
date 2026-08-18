import type {
  CorrespondenceDocument,
  CorrespondenceMonthlyPeriod,
  CorrespondencePartyMetrics,
  CorrespondenceCategory,
  CorrespondenceDocumentScope,
  CorrespondenceRecipientType,
  CorrespondenceType,
} from '../types';
import { MONTH_OPTIONS, monthShortLabel, monthYearLabel } from './healthSafety';

export { MONTH_OPTIONS, monthShortLabel, monthYearLabel };

export function buildCorrespondenceYearOptions(centerYear = new Date().getFullYear()): number[] {
  return Array.from({ length: 4 }, (_, index) => centerYear - 2 + index);
}

export type CorrespondenceEfficiencyLevel = 'excellent' | 'good' | 'attention' | 'critical';

export interface CorrespondenceEfficiencyStatus {
  level: CorrespondenceEfficiencyLevel;
  label: 'EXCELLENT' | 'GOOD' | 'NEEDS ATTENTION' | 'CRITICAL';
  emoji: string;
}

export function getCorrespondenceEfficiencyStatus(efficiency: number): CorrespondenceEfficiencyStatus {
  if (efficiency >= 95) return { level: 'excellent', label: 'EXCELLENT', emoji: '🟢' };
  if (efficiency >= 85) return { level: 'good', label: 'GOOD', emoji: '🟡' };
  if (efficiency >= 70) return { level: 'attention', label: 'NEEDS ATTENTION', emoji: '🟠' };
  return { level: 'critical', label: 'CRITICAL', emoji: '🔴' };
}

export const correspondenceEfficiencyBadgeClasses: Record<CorrespondenceEfficiencyLevel, string> = {
  excellent: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  good: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  attention: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  critical: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
};

/** Compact summary pill (e.g. ON TRACK) */
export const correspondenceTrackingBadgeClasses: Record<CorrespondenceEfficiencyLevel, string> = {
  excellent: 'bg-emerald-100 text-emerald-800',
  good: 'bg-emerald-100 text-emerald-800',
  attention: 'bg-amber-100 text-amber-800',
  critical: 'bg-rose-100 text-rose-800',
};

export function getCorrespondenceTrackingLabel(efficiency: number): string {
  if (efficiency >= 85) return 'ON TRACK';
  if (efficiency >= 70) return 'ATTENTION';
  return 'AT RISK';
}

export function getCorrespondenceTrackingStatus(efficiency: number): {
  level: CorrespondenceEfficiencyLevel;
  label: string;
} {
  const status = getCorrespondenceEfficiencyStatus(efficiency);
  return {
    level: status.level,
    label: getCorrespondenceTrackingLabel(efficiency),
  };
}

export function getCorrespondenceProgressTone(efficiency: number): string {
  if (efficiency >= 90) return 'bg-emerald-500';
  if (efficiency >= 70) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getCorrespondenceProgressTextTone(efficiency: number): string {
  if (efficiency >= 90) return 'text-emerald-500';
  if (efficiency >= 70) return 'text-orange-500';
  return 'text-red-500';
}

export type CorrespondenceTrendPoint = {
  label: string;
  clientReceived: number;
  clientDelivered: number;
  contractorReceived: number;
  contractorDelivered: number;
};

export function buildCorrespondenceTrendData(periods: CorrespondenceMonthlyPeriod[]): CorrespondenceTrendPoint[] {
  return [...periods]
    .filter((p) => p.month)
    .sort((a, b) => a.month - b.month)
    .map((period) => ({
      label: monthShortLabel(period.month),
      clientReceived: period.client.correspondenceReceived,
      clientDelivered: period.client.correspondenceDelivered,
      contractorReceived: period.contractor.correspondenceReceived,
      contractorDelivered: period.contractor.correspondenceDelivered,
    }));
}

export function hasCorrespondencePeriodData(period: CorrespondenceMonthlyPeriod | null): boolean {
  if (!period) return false;
  const parties = [period.client, period.contractor];
  return parties.some(
    (p) =>
      p.correspondenceReceived > 0 ||
      p.correspondenceDelivered > 0 ||
      p.pendingCorrespondence > 0 ||
      p.deliveryEfficiency > 0
  );
}

export function hasCorrespondenceContent(
  period: CorrespondenceMonthlyPeriod | null,
  documents: CorrespondenceDocument[]
): boolean {
  return hasCorrespondencePeriodData(period) || documents.length > 0;
}

const periodNum = (value: number | string | undefined) => Number(value) || 0;

export function filterCorrespondenceDocuments(
  documents: CorrespondenceDocument[],
  opts: { month: number; year: number; correspondenceType?: CorrespondenceType; projectName?: string }
): CorrespondenceDocument[] {
  return documents.filter((doc) => {
    if (periodNum(doc.month) !== opts.month || periodNum(doc.year) !== opts.year) return false;
    if (opts.correspondenceType && doc.correspondenceType !== opts.correspondenceType) return false;
    if (opts.projectName && doc.projectName && doc.projectName !== opts.projectName) return false;
    return true;
  });
}

export function compareCorrespondenceDocumentsByLatestUpdated(
  a: CorrespondenceDocument,
  b: CorrespondenceDocument,
): number {
  const aStamp = a.updatedAt || a.receivedDate || '';
  const bStamp = b.updatedAt || b.receivedDate || '';
  const byStamp = bStamp.localeCompare(aStamp);
  if (byStamp !== 0) return byStamp;

  const aId = a.id != null ? Number(a.id) : 0;
  const bId = b.id != null ? Number(b.id) : 0;
  if (aId !== bId) return bId - aId;

  return b.srNo - a.srNo;
}

export function sortCorrespondenceDocumentsByLatestUpdated(
  documents: CorrespondenceDocument[],
): CorrespondenceDocument[] {
  return [...documents].sort(compareCorrespondenceDocumentsByLatestUpdated);
}

function aggregateCorrespondencePartyMetrics(
  parties: CorrespondencePartyMetrics[],
): CorrespondencePartyMetrics {
  if (parties.length === 0) {
    return {
      correspondenceReceived: 0,
      correspondenceDelivered: 0,
      correspondenceRecord: 0,
      onTimeDelivered: 0,
      lateDeliveries: 0,
      pendingCorrespondence: 0,
      deliveryEfficiency: 0,
    };
  }

  let correspondenceReceived = 0;
  let correspondenceDelivered = 0;
  let correspondenceRecord = 0;
  let onTimeDelivered = 0;
  let lateDeliveries = 0;

  for (const party of parties) {
    correspondenceReceived += party.correspondenceReceived;
    correspondenceDelivered += party.correspondenceDelivered;
    correspondenceRecord += party.correspondenceRecord;
    onTimeDelivered += party.onTimeDelivered;
    lateDeliveries += party.lateDeliveries;
  }

  const last = parties[parties.length - 1];
  const pendingCorrespondence = last.pendingCorrespondence;
  const deliveryEfficiency =
    correspondenceDelivered > 0
      ? Math.min(100, Math.max(0, (onTimeDelivered / correspondenceDelivered) * 100))
      : 0;

  return {
    correspondenceReceived,
    correspondenceDelivered,
    correspondenceRecord,
    onTimeDelivered,
    lateDeliveries,
    pendingCorrespondence,
    deliveryEfficiency,
  };
}

/** Sum Jan–selected month for the given year (cumulative YTD). */
export function aggregateCorrespondenceCumulativePeriod(
  periods: CorrespondenceMonthlyPeriod[],
  month: number,
  year: number,
  projectName = '',
): CorrespondenceMonthlyPeriod | null {
  const filtered = periods
    .filter((p) => p.year === year && p.month >= 1 && p.month <= month)
    .sort((a, b) => a.month - b.month);

  if (filtered.length === 0) return null;

  return {
    projectName: projectName || filtered[0].projectName,
    month,
    year,
    client: aggregateCorrespondencePartyMetrics(filtered.map((p) => p.client)),
    contractor: aggregateCorrespondencePartyMetrics(filtered.map((p) => p.contractor)),
  };
}

export function filterCorrespondenceDocumentsByView(
  documents: CorrespondenceDocument[],
  opts: {
    month: number;
    year: number;
    view: 'monthly' | 'cumulative';
    correspondenceType?: CorrespondenceType;
    projectName?: string;
  },
): CorrespondenceDocument[] {
  if (opts.view === 'monthly') {
    return filterCorrespondenceDocuments(documents, opts);
  }

  return documents
    .filter((doc) => {
      const docYear = periodNum(doc.year);
      const docMonth = periodNum(doc.month);
      if (docYear !== opts.year || docMonth < 1 || docMonth > opts.month) return false;
      if (opts.correspondenceType && doc.correspondenceType !== opts.correspondenceType) return false;
      if (opts.projectName && doc.projectName && doc.projectName !== opts.projectName) return false;
      return true;
    });
}

export function nextCorrespondenceSrNo(
  documents: CorrespondenceDocument[],
  correspondenceType: CorrespondenceType,
  month: number,
  year: number
): number {
  const filtered = filterCorrespondenceDocuments(documents, { month, year, correspondenceType });
  if (filtered.length === 0) return 1;
  return Math.max(...filtered.map((doc) => doc.srNo)) + 1;
}

export function formatCorrespondenceDisplayDate(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function correspondenceStatusBadgeClass(status?: string): string {
  const normalized = (status ?? '').toLowerCase();
  if (normalized.includes('deliver') || normalized.includes('complete') || normalized.includes('on time')) {
    return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
  }
  if (normalized.includes('pending') || normalized.includes('progress')) {
    return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
  }
  if (normalized.includes('overdue') || normalized.includes('late') || normalized.includes('critical')) {
    return 'bg-rose-500/15 text-rose-600 border-rose-500/30';
  }
  return 'bg-slate-500/15 text-slate-600 border-slate-500/30';
}

export type CorrespondenceDocumentFormValues = {
  month: number;
  year: number;
  documentScope: CorrespondenceDocumentScope;
  correspondenceType: CorrespondenceType;
  recipientType: CorrespondenceRecipientType | '';
  correspondenceCategory: CorrespondenceCategory;
  srNo: number;
  description: string;
  receivedDate: string;
  deliveredDate: string;
};

export function normalizeCorrespondenceCategory(value: unknown): CorrespondenceCategory {
  const normalized = String(value ?? 'DELIVERY').toUpperCase();
  return normalized === 'RECORD' ? 'RECORD' : 'DELIVERY';
}

export function normalizeCorrespondenceRecipientType(
  value: unknown,
): CorrespondenceRecipientType | '' {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'CONTRACTOR') return 'CONTRACTOR';
  if (normalized === 'OTHER_AGENCY' || normalized === 'OTHER AGENCY') return 'OTHER_AGENCY';
  if (normalized === 'CLIENT') return 'CLIENT';
  return '';
}

export function isSclOutboundDocument(document: CorrespondenceDocument): boolean {
  const flow = String(document.flowDirection ?? '').toUpperCase();
  if (flow === 'OUTBOUND_SCL') return true;
  return Boolean(normalizeCorrespondenceRecipientType(document.recipientType));
}

/**
 * Whether the Comments UI should appear under View PDF / attachments.
 * Incoming Client and Contractor letters can have comments.
 * SCL delivered letters cannot — the backend rejects comments on those.
 */
export function canShowCorrespondenceComments(input: {
  correspondenceType?: string | null;
  flowDirection?: string | null;
  recipientType?: string | null;
}): boolean {
  return correspondenceCommentsUnavailableReason(input) == null;
}

export function correspondenceCommentsUnavailableReason(input: {
  correspondenceType?: string | null;
  flowDirection?: string | null;
  recipientType?: string | null;
}): string | null {
  const flow = String(input.flowDirection ?? '').toUpperCase();
  if (flow === 'OUTBOUND_SCL') {
    return 'Comments are not available for SCL delivered correspondence.';
  }

  const type = String(input.correspondenceType ?? input.recipientType ?? '').toUpperCase();
  if (!type || type === 'CLIENT' || type === 'CONTRACTOR') return null;
  if (type === 'OTHER' || type === 'OTHER_AGENCY') {
    return 'Comments are not available for this correspondence type.';
  }
  return 'Comments are only available for incoming Client and Contractor correspondence.';
}

export const CORRESPONDENCE_COMMENT_MAX_LENGTH = 2000;

export function validateCorrespondenceCommentInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Comment cannot be empty.';
  if (trimmed.length > CORRESPONDENCE_COMMENT_MAX_LENGTH) {
    return `Comment must be ${CORRESPONDENCE_COMMENT_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function correspondenceCategoryLabel(category: CorrespondenceCategory): string {
  return category === 'RECORD' ? 'Record' : 'Delivery';
}

export function correspondenceRecipientLabel(recipient: CorrespondenceRecipientType): string {
  if (recipient === 'OTHER_AGENCY') return 'Other Agency';
  return recipient === 'CONTRACTOR' ? 'Contractor' : 'Client';
}

export function validateCorrespondenceDocumentFields(
  values: CorrespondenceDocumentFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.month || values.month < 1 || values.month > 12) {
    errors.month = 'Select a month.';
  }
  if (!values.year || values.year < 2000) {
    errors.year = 'Select a year.';
  }
  if (!values.correspondenceCategory) {
    errors.correspondenceCategory = 'Select delivery or record.';
  }
  if (!values.description.trim()) {
    errors.description = 'Description is required.';
  }
  if (!values.receivedDate) {
    errors.receivedDate = 'Received date is required.';
  }

  if (values.documentScope === 'scl') {
    if (!values.recipientType) {
      errors.recipientType = 'Select a recipient.';
    }
  } else {
    if (!values.correspondenceType) {
      errors.correspondenceType = 'Select client or contractor.';
    }
    if (!Number.isFinite(values.srNo) || values.srNo < 1) {
      errors.srNo = 'Sr No must be at least 1.';
    }
  }

  if (
    values.correspondenceCategory === 'DELIVERY' &&
    values.deliveredDate &&
    values.receivedDate &&
    values.deliveredDate < values.receivedDate
  ) {
    errors.deliveredDate = 'Cannot be before received date.';
  }

  return errors;
}

export function validateCorrespondenceDocumentInput(values: CorrespondenceDocumentFormValues): string | null {
  const errors = validateCorrespondenceDocumentFields(values);
  const first = Object.values(errors)[0];
  return first ?? null;
}

/** @deprecated Count-based monthly form */
export function validateCorrespondenceFormInput(values: {
  correspondenceReceived: number;
  correspondenceDelivered: number;
  correspondenceRecord: number;
}): string | null {
  if (
    values.correspondenceReceived < 0 ||
    values.correspondenceDelivered < 0 ||
    values.correspondenceRecord < 0
  ) {
    return 'Values cannot be negative.';
  }
  if (values.correspondenceDelivered > values.correspondenceReceived) {
    return 'Delivered correspondence cannot exceed received correspondence.';
  }
  if (values.correspondenceRecord > values.correspondenceReceived) {
    return 'Record cannot exceed received correspondence.';
  }
  return null;
}

export function validateCorrespondencePartyCountsInput(values: {
  client_received: number;
  client_delivered: number;
  contractor_received: number;
  contractor_delivered: number;
}): string | null {
  const parties = [
    { label: 'Client', received: values.client_received, delivered: values.client_delivered },
    { label: 'Contractor', received: values.contractor_received, delivered: values.contractor_delivered },
  ];

  for (const party of parties) {
    if (party.received < 0 || party.delivered < 0) {
      return `${party.label} values cannot be negative.`;
    }
    if (party.delivered > party.received) {
      return `${party.label} delivered cannot exceed received.`;
    }
  }
  return null;
}

export function validateCorrespondenceSclPartyCountsInput(values: {
  received: number;
  delivered: number;
  label: string;
}): string | null {
  if (values.received < 0 || values.delivered < 0) {
    return `${values.label} values cannot be negative.`;
  }
  if (values.delivered > values.received) {
    return `${values.label} delivered cannot exceed received.`;
  }
  return null;
}

export function correspondenceTypeLabel(type: CorrespondenceType): string {
  return type === 'CLIENT' ? 'Client' : 'Contractor';
}

export type CorrespondenceDocumentStatusKind = 'onTime' | 'pending' | 'delayed' | 'unknown';

export interface CorrespondenceStatusBreakdown {
  received: number;
  /** On time + late deliveries */
  delivered: number;
  record: number;
  onTime: number;
  pending: number;
  lateDeliveries: number;
}

export function classifyCorrespondenceDocumentStatus(status?: string): CorrespondenceDocumentStatusKind {
  const normalized = (status ?? '').toLowerCase();
  if (normalized.includes('pending') && !normalized.includes('deliver')) return 'pending';
  if (normalized.includes('on time') || normalized.includes('ontime')) return 'onTime';
  if (normalized.includes('delay') || normalized.includes('late') || normalized.includes('overdue')) {
    return 'delayed';
  }
  if (normalized.includes('deliver') || normalized.includes('complete')) return 'onTime';
  return 'unknown';
}

/** Resolve status from delivered/deadline dates first, then API status text. */
export function resolveCorrespondenceDocumentStatus(doc: CorrespondenceDocument): CorrespondenceDocumentStatusKind {
  const delivered = doc.deliveredDate?.trim();
  const deadline = doc.deadlineDate?.trim();

  if (!delivered) {
    const fromStatus = classifyCorrespondenceDocumentStatus(doc.status);
    return fromStatus === 'unknown' ? 'pending' : fromStatus;
  }

  if (deadline) {
    return delivered <= deadline ? 'onTime' : 'delayed';
  }

  const fromStatus = classifyCorrespondenceDocumentStatus(doc.status);
  if (fromStatus === 'delayed') {
    return 'delayed';
  }
  return 'onTime';
}

export function formatCorrespondenceStatusLabel(status?: string): string {
  const kind = classifyCorrespondenceDocumentStatus(status);
  if (kind === 'onTime') return 'ON TIME';
  if (kind === 'pending') return 'PENDING';
  if (kind === 'delayed') return 'DELAYED';
  return status?.trim().toUpperCase() || '—';
}

export function formatCorrespondenceDocumentStatus(doc: CorrespondenceDocument): string {
  const kind = resolveCorrespondenceDocumentStatus(doc);
  if (kind === 'onTime') return 'ON TIME';
  if (kind === 'pending') return 'PENDING';
  if (kind === 'delayed') return 'DELAYED';
  return formatCorrespondenceStatusLabel(doc.status);
}

export function computeDeliveryEfficiencyFromBreakdown(breakdown: CorrespondenceStatusBreakdown): number {
  if (breakdown.delivered <= 0) return 0;
  return Math.min(100, Math.max(0, (breakdown.onTime / breakdown.delivered) * 100));
}

export function coerceCorrespondenceCount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizePartyMetricsForBreakdown(
  metrics: CorrespondencePartyMetrics,
): CorrespondencePartyMetrics {
  return {
    correspondenceReceived: coerceCorrespondenceCount(metrics.correspondenceReceived),
    correspondenceDelivered: coerceCorrespondenceCount(metrics.correspondenceDelivered),
    correspondenceRecord: coerceCorrespondenceCount(metrics.correspondenceRecord),
    onTimeDelivered: coerceCorrespondenceCount(metrics.onTimeDelivered),
    lateDeliveries: coerceCorrespondenceCount(metrics.lateDeliveries),
    pendingCorrespondence: coerceCorrespondenceCount(metrics.pendingCorrespondence),
    deliveryEfficiency: coerceCorrespondenceCount(metrics.deliveryEfficiency),
  };
}

export function buildCorrespondenceStatusBreakdown(
  metrics: CorrespondencePartyMetrics,
  documents: CorrespondenceDocument[],
  correspondenceType: CorrespondenceType,
  periodFilter?: { month: number; year: number }
): CorrespondenceStatusBreakdown {
  metrics = normalizePartyMetricsForBreakdown(metrics);
  const partyDocs = periodFilter
    ? filterCorrespondenceDocuments(documents, { ...periodFilter, correspondenceType })
    : documents.filter((doc) => doc.correspondenceType === correspondenceType);

  let docOnTime = 0;
  let docLate = 0;
  let docPending = 0;

  partyDocs.forEach((doc) => {
    const kind = resolveCorrespondenceDocumentStatus(doc);
    if (kind === 'onTime') docOnTime += 1;
    else if (kind === 'delayed') docLate += 1;
    else if (kind === 'pending') docPending += 1;
  });

  const apiHasCounts =
    metrics.correspondenceReceived > 0 ||
    metrics.correspondenceDelivered > 0 ||
    metrics.correspondenceRecord > 0 ||
    metrics.pendingCorrespondence > 0 ||
    metrics.onTimeDelivered > 0 ||
    metrics.lateDeliveries > 0;

  if (apiHasCounts) {
    let onTime = metrics.onTimeDelivered;
    let lateDeliveries = metrics.lateDeliveries;
    const delivered =
      metrics.correspondenceDelivered > 0
        ? metrics.correspondenceDelivered
        : onTime + lateDeliveries;
    const record = metrics.correspondenceRecord;
    const pending = metrics.pendingCorrespondence;
    const received = metrics.correspondenceReceived;

    if (partyDocs.length > 0 && onTime + lateDeliveries === 0 && delivered > 0) {
      onTime = docOnTime;
      lateDeliveries = docLate;
    }

    return {
      received,
      delivered,
      record,
      onTime,
      pending,
      lateDeliveries,
    };
  }

  const onTime = docOnTime;
  const lateDeliveries = docLate;
  const delivered = onTime + lateDeliveries;
  const pending = docPending;
  const received = metrics.correspondenceReceived;

  return {
    received,
    delivered,
    record: 0,
    onTime,
    pending,
    lateDeliveries,
  };
}

export const correspondenceTypePillClass: Record<CorrespondenceType, string> = {
  CLIENT: 'bg-blue-50 text-blue-700 border-blue-200',
  CONTRACTOR: 'bg-violet-50 text-violet-700 border-violet-200',
};

export const correspondenceStatusPillClass: Record<CorrespondenceDocumentStatusKind, string> = {
  onTime: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  delayed: 'bg-rose-50 text-rose-700 border-rose-200',
  unknown: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function getCorrespondenceTypePillClass(
  type: CorrespondenceType,
  isDarkTheme: boolean
): string {
  if (!isDarkTheme) return correspondenceTypePillClass[type];
  return type === 'CLIENT'
    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    : 'bg-violet-500/20 text-violet-300 border-violet-500/30';
}

export function getCorrespondenceStatusPillClass(
  kind: CorrespondenceDocumentStatusKind,
  isDarkTheme: boolean
): string {
  if (!isDarkTheme) return correspondenceStatusPillClass[kind];
  const dark: Record<CorrespondenceDocumentStatusKind, string> = {
    onTime: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    delayed: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  return dark[kind];
}
