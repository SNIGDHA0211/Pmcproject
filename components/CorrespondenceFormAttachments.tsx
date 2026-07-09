import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CorrespondenceAttachment } from '../types';
import { Icons } from './Icons';
import {
  CORRESPONDENCE_ATTACHMENT_ACCEPT,
  canPreviewCorrespondenceAttachment,
  formatCorrespondenceAttachmentDateTime,
  getCorrespondenceAttachmentFileIcon,
  sortCorrespondenceAttachments,
  validateCorrespondenceAttachmentFile,
} from '../utils/correspondenceAttachments';
import {
  correspondenceAttachmentsApi,
  downloadCorrespondenceAttachmentSecure,
  getCorrespondenceAttachmentsErrorMessage,
} from '../services/correspondenceAttachmentsApi';
import { getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceFormAttachmentsProps {
  documentId?: string | number | null;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  onAttachmentsChanged?: () => void;
}

const CorrespondenceFormAttachments: React.FC<CorrespondenceFormAttachmentsProps> = ({
  documentId,
  pendingFiles,
  onPendingFilesChange,
  onAttachmentsChanged,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<CorrespondenceAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAttachment, setEditingAttachment] = useState<CorrespondenceAttachment | null>(null);
  const [editDocumentType, setEditDocumentType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CorrespondenceAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const labelClass = `mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`;
  const inputClass = `w-full rounded-2xl px-4 py-3 text-sm font-bold outline-none ${themeClasses.input}`;

  const loadAttachments = useCallback(async () => {
    if (documentId == null) {
      setAttachments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await correspondenceAttachmentsApi.getDocumentDetail(documentId);
      setAttachments(sortCorrespondenceAttachments(detail.attachments));
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Failed to load attachments.'));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  const addPendingFiles = (files: FileList | File[]) => {
    const next: File[] = [];
    Array.from(files).forEach((file) => {
      const validation = validateCorrespondenceAttachmentFile(file);
      if (validation) {
        setError(validation);
        return;
      }
      next.push(file);
    });
    if (next.length > 0) {
      onPendingFilesChange([...pendingFiles, ...next]);
      setError(null);
    }
  };

  const uploadPendingToDocument = async (targetDocumentId: string | number) => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append('file', file);
        await correspondenceAttachmentsApi.upload(targetDocumentId, formData);
      }
      onPendingFilesChange([]);
      await loadAttachments();
      onAttachmentsChanged?.();
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Failed to upload attachment.'));
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (documentId != null) {
      void uploadFilesToServer(event.dataTransfer.files);
      return;
    }
    addPendingFiles(event.dataTransfer.files);
  };

  const uploadFilesToServer = async (files: FileList | File[]) => {
    if (documentId == null) return;
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      const validation = validateCorrespondenceAttachmentFile(file);
      if (validation) {
        setError(validation);
      } else {
        validFiles.push(file);
      }
    }
    if (validFiles.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        await correspondenceAttachmentsApi.upload(documentId, formData);
      }
      await loadAttachments();
      onAttachmentsChanged?.();
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Failed to upload attachment.'));
    } finally {
      setUploading(false);
    }
  };

  const handleBrowse = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    if (documentId != null) {
      void uploadFilesToServer(files);
    } else {
      addPendingFiles(files);
    }
    event.target.value = '';
  };

  const handleDownload = async (attachment: CorrespondenceAttachment) => {
    try {
      await downloadCorrespondenceAttachmentSecure(attachment.id, attachment.fileName);
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Download failed.'));
    }
  };

  const handlePreview = async (attachment: CorrespondenceAttachment) => {
    if (!canPreviewCorrespondenceAttachment(attachment.fileName)) {
      await handleDownload(attachment);
      return;
    }
    try {
      const url = await correspondenceAttachmentsApi.getDownloadUrl(attachment.id);
      setPreviewUrl(url);
      setPreviewName(attachment.fileName);
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Preview failed.'));
    }
  };

  const handleUpdateAttachment = async () => {
    if (!editingAttachment) return;
    if (editFile) {
      const fileError = validateCorrespondenceAttachmentFile(editFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (editDocumentType.trim()) formData.append('document_type', editDocumentType.trim());
      formData.append('description', editDescription.trim());
      if (editFile) formData.append('file', editFile);
      await correspondenceAttachmentsApi.update(editingAttachment.id, formData);
      setEditingAttachment(null);
      setEditFile(null);
      await loadAttachments();
      onAttachmentsChanged?.();
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Update failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async () => {
    if (!deleteTarget) return;
    setUploading(true);
    setError(null);
    try {
      await correspondenceAttachmentsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      await loadAttachments();
      onAttachmentsChanged?.();
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Delete failed.'));
    } finally {
      setUploading(false);
    }
  };

  const renderActionLink = (
    label: string,
    onClick: () => void,
    danger = false,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] font-bold hover:underline ${
        danger
          ? isDarkTheme
            ? 'text-rose-300'
            : 'text-rose-600'
          : isDarkTheme
            ? 'text-blue-300'
            : 'text-blue-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <label className={labelClass}>Upload Document Attachments</label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
            : isDarkTheme
              ? 'border-white/15 bg-white/[0.02] hover:border-white/25'
              : 'border-slate-200 bg-slate-50/80 hover:border-blue-300'
        }`}
      >
        <Icons.Upload size={28} className={`mx-auto mb-2 ${isDarkTheme ? 'text-blue-300' : 'text-blue-600'}`} />
        <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>
          Drag &amp; Drop your files here or Browse
        </p>
        <p className={`mt-1 text-[10px] ${themeClasses.textMuted}`}>
          PDF, DOCX, XLSX, PPTX, JPG, JPEG, PNG
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={CORRESPONDENCE_ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={handleBrowse}
        />
      </div>

      {uploading && (
        <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>Uploading attachment…</p>
      )}

      {loading && documentId != null && (
        <div className={`h-12 animate-pulse rounded-xl ${isDarkTheme ? 'bg-white/5' : 'bg-slate-100'}`} />
      )}

      {!loading && pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className={`text-[10px] font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>
            Queued for upload after save
          </p>
          {pendingFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}
            >
              <span className={`truncate text-sm font-semibold ${themeClasses.textPrimary}`}>{file.name}</span>
              <button
                type="button"
                onClick={() => onPendingFilesChange(pendingFiles.filter((_, i) => i !== index))}
                className="text-[11px] font-bold text-rose-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getCorrespondenceAttachmentFileIcon(attachment.fileName);
            return (
              <div
                key={`${attachment.id}-${attachment.version}`}
                className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-start gap-2">
                  <FileIcon size={18} className="mt-0.5 shrink-0 text-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold ${themeClasses.textPrimary}`}>
                      {attachment.fileName}
                    </p>
                    <p className={`text-[10px] ${themeClasses.textMuted}`}>
                      v{attachment.version} · {attachment.uploadedBy} ·{' '}
                      {formatCorrespondenceAttachmentDateTime(attachment.uploadedOn)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {canPreviewCorrespondenceAttachment(attachment.fileName) &&
                        renderActionLink('View', () => void handlePreview(attachment))}
                      {renderActionLink('Download', () => void handleDownload(attachment))}
                      {attachment.canEdit !== false &&
                        renderActionLink('Version', () => {
                          setEditingAttachment(attachment);
                          setEditDocumentType(attachment.documentType ?? '');
                          setEditDescription(attachment.description ?? '');
                          setEditFile(null);
                        })}
                      {attachment.canEdit !== false &&
                        renderActionLink('Edit', () => {
                          setEditingAttachment(attachment);
                          setEditDocumentType(attachment.documentType ?? '');
                          setEditDescription(attachment.description ?? '');
                          setEditFile(null);
                        })}
                      {attachment.canDelete !== false &&
                        renderActionLink('Delete', () => setDeleteTarget(attachment), true)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm font-bold text-rose-500">{error}</p>}

      {editingAttachment && (
        <div className={`rounded-2xl border p-4 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
          <p className={`mb-3 text-sm font-bold ${themeClasses.textPrimary}`}>
            Update {editingAttachment.fileName}
          </p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Document Type (Optional)</label>
              <input
                type="text"
                value={editDocumentType}
                onChange={(e) => setEditDocumentType(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Description (Optional)</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Upload New Version (Optional)</label>
              <input
                type="file"
                accept={CORRESPONDENCE_ATTACHMENT_ACCEPT}
                onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingAttachment(null);
                  setEditFile(null);
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${themeClasses.buttonSecondary}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleUpdateAttachment()}
                className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                {uploading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={`rounded-2xl border p-4 ${isDarkTheme ? 'border-rose-500/30' : 'border-rose-200'}`}>
          <p className={`text-sm ${themeClasses.textPrimary}`}>
            Delete <strong>{deleteTarget.fileName}</strong>?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${themeClasses.buttonSecondary}`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => void handleDeleteAttachment()}
              className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-60"
            >
              {uploading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className={`rounded-2xl border p-3 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={`truncate text-sm font-bold ${themeClasses.textPrimary}`}>{previewName}</p>
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className={`text-xs font-bold ${themeClasses.buttonSecondary} rounded-lg px-2 py-1`}
            >
              Close
            </button>
          </div>
          {previewName.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? (
            <img src={previewUrl} alt={previewName} className="max-h-64 w-full rounded-lg object-contain" />
          ) : (
            <iframe title={previewName} src={previewUrl} className="h-64 w-full rounded-lg border" />
          )}
        </div>
      )}
    </div>
  );
};

export async function uploadCorrespondencePendingAttachments(
  documentId: string | number,
  files: File[],
): Promise<void> {
  for (const file of files) {
    const validation = validateCorrespondenceAttachmentFile(file);
    if (validation) throw new Error(validation);
    const formData = new FormData();
    formData.append('file', file);
    await correspondenceAttachmentsApi.upload(documentId, formData);
  }
}

export default React.memo(CorrespondenceFormAttachments);
