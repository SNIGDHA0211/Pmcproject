import { REPORT_NA } from './csvReport';

export type ScheduleStatusLabel = 'Delayed' | 'On Schedule' | 'Ahead of Schedule';

export function getScheduleStatus(delayDays: unknown): ScheduleStatusLabel {
  const n = Number(delayDays);
  if (!Number.isFinite(n)) return 'On Schedule';
  const rounded = Math.round(n);
  if (rounded > 0) return 'Delayed';
  if (rounded < 0) return 'Ahead of Schedule';
  return 'On Schedule';
}

export function formatDelayDaysValue(delayDays: unknown): string {
  const n = Number(delayDays);
  if (!Number.isFinite(n)) return REPORT_NA;
  return String(Math.abs(Math.round(n)));
}

export function formatElapsedDurationDays(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return REPORT_NA;
  const days = Math.max(0, Math.round(n));
  return `${days} days`;
}

export function formatRemainingDurationDays(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return REPORT_NA;
  const rounded = Math.round(n);
  if (rounded < 0) return `${Math.abs(rounded)} days overdue`;
  if (rounded === 0) return '0 days remaining';
  return `${rounded} days remaining`;
}

export function formatForecastDurationDays(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return REPORT_NA;
  const rounded = Math.round(n);
  if (rounded < 0) return 'Behind schedule';
  if (rounded === 0) return '0 days';
  return `${rounded} days`;
}

export function formatEotDurationDays(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return REPORT_NA;
  const rounded = Math.round(n);
  if (rounded < 0) return 'Behind EOT baseline';
  if (rounded === 0) return '0 days';
  return `${rounded} days`;
}

const STATUS_ALIASES: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  'in progress': 'In Progress',
  'in-progress': 'In Progress',
  pending: 'Pending',
  'on time': 'On Time',
  delayed: 'Delayed',
  'at risk': 'At Risk',
  working: 'Working',
  'under maintenance': 'Under Maintenance',
  maintenance: 'Under Maintenance',
  'not available': 'Not Available',
  'not working': 'Not Available',
  breakdown: 'Not Available',
  idle: 'Not Available',
  operational: 'Working',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  issue: 'Issue',
  concern: 'Concern',
  risk: 'Risk',
  action: 'Action',
};

export function normalizeReportStatus(value: unknown): string {
  if (value == null || value === '') return REPORT_NA;
  const raw = String(value).trim();
  if (!raw) return REPORT_NA;
  const key = raw.toLowerCase();
  if (STATUS_ALIASES[key]) return STATUS_ALIASES[key];
  return raw
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeBottleneckType(value: unknown): string {
  if (value == null || value === '') return REPORT_NA;
  const raw = String(value).trim().toUpperCase();
  const map: Record<string, string> = {
    ISSUE: 'Issue',
    CONCERN: 'Concern',
    RISK: 'Risk',
    ACTION: 'Action',
  };
  return map[raw] ?? normalizeReportStatus(value);
}
