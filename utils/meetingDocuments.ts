import type { MeetingDocumentType } from '../types/meetingDocuments';
import { MONTH_OPTIONS } from './healthSafety';

export { MONTH_OPTIONS };

export const MEETING_DOCUMENT_ACCEPT =
  '.pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png';

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'jpg',
  'jpeg',
  'png',
]);

export function meetingTypeLabel(type: MeetingDocumentType): string {
  return type === 'EDL' ? 'EDL' : 'MOM';
}

export function meetingTypeBadgeClass(type: MeetingDocumentType, isDark: boolean): string {
  if (type === 'EDL') {
    return isDark
      ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
      : 'bg-violet-50 text-violet-700 border-violet-200';
  }
  return isDark
    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    : 'bg-blue-50 text-blue-700 border-blue-200';
}

export function formatMeetingFileSize(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatMeetingDisplayDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMeetingDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function validateMeetingDocumentFile(file: File | null): string | null {
  if (!file) return 'Please select a file to upload.';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return 'Unsupported file type. Use PDF, DOCX, XLSX, PPTX, JPG, or PNG.';
  }
  return null;
}

export function buildMeetingYearOptions(centerYear = new Date().getFullYear()): number[] {
  return Array.from({ length: 6 }, (_, index) => centerYear - 3 + index);
}

export function formatStorageSaved(value: string | number): string {
  if (typeof value === 'number') {
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${value} B`;
  }
  return value || '—';
}
