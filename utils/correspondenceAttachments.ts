import type { LucideIcon } from 'lucide-react';
import { FileImage, FileSpreadsheet, FileText, Presentation } from 'lucide-react';
import type {
  CorrespondenceAttachment,
  CorrespondenceAttachmentSummary,
  CorrespondenceDocumentDetailPermissions,
} from '../types';
import { pickDirectStoredFileUrl } from './storedFileUrl';

export const CORRESPONDENCE_ATTACHMENT_ACCEPT =
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

export function getCorrespondenceAttachmentExtension(fileName?: string | null): string {
  if (!fileName) return '';
  const parts = fileName.trim().toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function getCorrespondenceAttachmentFileIcon(
  fileName?: string | null,
): LucideIcon {
  const ext = getCorrespondenceAttachmentExtension(fileName);
  if (ext === 'pdf') return FileText;
  if (ext === 'docx') return FileText;
  if (ext === 'xlsx') return FileSpreadsheet;
  if (ext === 'pptx') return Presentation;
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return FileImage;
  return FileText;
}

export function canPreviewCorrespondenceAttachment(fileName?: string | null): boolean {
  const ext = getCorrespondenceAttachmentExtension(fileName);
  return ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
}

export function formatCorrespondenceAttachmentCount(count?: number | null): string {
  const value = Number(count ?? 0) || 0;
  if (value === 1) return '1 File';
  return `${value} Files`;
}

export function formatCorrespondenceAttachmentDateTime(value?: string | null): string {
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

export function validateCorrespondenceAttachmentFile(file: File | null): string | null {
  if (!file) return 'Please select a file to upload.';
  const ext = getCorrespondenceAttachmentExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return 'Unsupported file type. Allowed: PDF, DOCX, XLSX, PPTX, JPG, JPEG, PNG.';
  }
  return null;
}

export function sortCorrespondenceAttachments(
  attachments: CorrespondenceAttachment[],
): CorrespondenceAttachment[] {
  return [...attachments].sort((a, b) => {
    if (b.version !== a.version) return b.version - a.version;
    return String(b.uploadedOn).localeCompare(String(a.uploadedOn));
  });
}

export function filterCorrespondenceAttachments(
  attachments: CorrespondenceAttachment[],
  query: string,
): CorrespondenceAttachment[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return attachments;
  return attachments.filter((item) => {
    const fileName = item.fileName.toLowerCase();
    const documentType = String(item.documentType ?? '').toLowerCase();
    return fileName.includes(needle) || documentType.includes(needle);
  });
}

export function normalizeCorrespondenceAttachmentSummary(
  row: unknown,
): CorrespondenceAttachmentSummary | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = r.id ?? r.pk;
  if (id == null) return null;
  const fileName = String(r.file_name ?? r.fileName ?? r.filename ?? '').trim();
  if (!fileName) return null;
  return { id: id as string | number, fileName };
}

export function normalizeCorrespondenceAttachment(row: unknown): CorrespondenceAttachment | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = r.id ?? r.pk;
  if (id == null) return null;

  const permissions =
    r.permissions && typeof r.permissions === 'object'
      ? (r.permissions as Record<string, unknown>)
      : null;

  return {
    id: id as string | number,
    fileName: String(r.file_name ?? r.fileName ?? r.filename ?? 'Attachment').trim(),
    documentType: (r.document_type ?? r.documentType ?? null) as string | null,
    description: (r.description ?? null) as string | null,
    uploadedBy: String(
      r.uploaded_by_name ?? r.uploaded_by ?? r.uploadedBy ?? r.created_by ?? '—',
    ),
    uploadedOn: String(
      r.uploaded_on ?? r.uploaded_at ?? r.uploadedOn ?? r.created_at ?? '',
    ),
    version: Number(r.version ?? r.version_number ?? 1) || 1,
    fileUrl: pickDirectStoredFileUrl(r),
    canDownload: permissions?.can_download != null ? Boolean(permissions.can_download) : undefined,
    canEdit: permissions?.can_edit != null ? Boolean(permissions.can_edit) : undefined,
    canDelete: permissions?.can_delete != null ? Boolean(permissions.can_delete) : undefined,
  };
}

export function normalizeCorrespondenceDocumentPermissions(
  row: unknown,
): CorrespondenceDocumentDetailPermissions {
  if (!row || typeof row !== 'object') return {};
  const r = row as Record<string, unknown>;
  const permissions =
    r.permissions && typeof r.permissions === 'object'
      ? (r.permissions as Record<string, unknown>)
      : r;

  return {
    canUpload:
      permissions.can_upload != null
        ? Boolean(permissions.can_upload)
        : permissions.canUpload != null
          ? Boolean(permissions.canUpload)
          : undefined,
    canDelete:
      permissions.can_delete != null
        ? Boolean(permissions.can_delete)
        : permissions.canDelete != null
          ? Boolean(permissions.canDelete)
          : undefined,
    canEdit:
      permissions.can_edit != null
        ? Boolean(permissions.can_edit)
        : permissions.canEdit != null
          ? Boolean(permissions.canEdit)
          : undefined,
  };
}

export function extractCorrespondenceAttachments(raw: unknown): CorrespondenceAttachment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(normalizeCorrespondenceAttachment)
      .filter((item): item is CorrespondenceAttachment => item != null);
  }
  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const nested = record.attachments ?? record.results ?? record.items;
    if (Array.isArray(nested)) {
      return nested
        .map(normalizeCorrespondenceAttachment)
        .filter((item): item is CorrespondenceAttachment => item != null);
    }
  }
  return [];
}
