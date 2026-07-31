import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, History, Pencil, Trash2, X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { Icons } from './Icons';
import DashboardToastStack, { type DashboardToastItem } from './DashboardToastStack';
import type { CorrespondenceAttachment, CorrespondenceDocument } from '../types';
import {
  CORRESPONDENCE_ATTACHMENT_ACCEPT,
  canPreviewCorrespondenceAttachment,
  filterCorrespondenceAttachments,
  formatCorrespondenceAttachmentCount,
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
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export type CorrespondenceAttachmentsMode = 'view' | 'upload';

interface CorrespondenceAttachmentsPanelProps {
  document: CorrespondenceDocument;
  initialMode?: CorrespondenceAttachmentsMode;
  onClose: () => void;
  onChanged: () => void;
}

type PanelView = 'list' | 'upload' | 'edit' | 'delete' | 'preview';

const CorrespondenceAttachmentsPanel: React.FC<CorrespondenceAttachmentsPanelProps> = ({
  document,
  initialMode = 'view',
  onClose,
  onChanged,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [attachments, setAttachments] = useState<CorrespondenceAttachment[]>([]);
  const [canUpload, setCanUpload] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [panelView, setPanelView] = useState<PanelView>(
    initialMode === 'upload' ? 'upload' : 'list',
  );
  const [activeAttachment, setActiveAttachment] = useState<CorrespondenceAttachment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toasts, setToasts] = useState<DashboardToastItem[]>([]);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocumentType, setUploadDocumentType] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [editDocumentType, setEditDocumentType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const loadAttachments = useCallback(async () => {
    if (document.id == null) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await correspondenceAttachmentsApi.getDocumentDetail(document.id);
      setAttachments(sortCorrespondenceAttachments(detail.attachments));
      if (detail.permissions.canUpload != null) {
        setCanUpload(detail.permissions.canUpload);
      }
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Failed to load attachments.'));
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [document.id]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  const filteredAttachments = useMemo(
    () => filterCorrespondenceAttachments(attachments, debouncedSearch),
    [attachments, debouncedSearch],
  );

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadDocumentType('');
    setUploadDescription('');
    setUploadProgress(0);
  };

  const resetEditForm = () => {
    setEditDocumentType('');
    setEditDescription('');
    setEditFile(null);
    setUploadProgress(0);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (document.id == null) return;
    const fileError = validateCorrespondenceAttachmentFile(uploadFile);
    if (fileError) {
      setError(fileError);
      return;
    }
    setIsSaving(true);
    setError(null);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile as File);
      if (uploadDocumentType.trim()) formData.append('document_type', uploadDocumentType.trim());
      if (uploadDescription.trim()) formData.append('description', uploadDescription.trim());
      await correspondenceAttachmentsApi.upload(document.id, formData, setUploadProgress);
      resetUploadForm();
      setPanelView('list');
      await loadAttachments();
      onChanged();
      showToast('Attachment uploaded successfully.');
    } catch (err) {
      if (axiosIsForbidden(err)) setCanUpload(false);
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Upload failed.'));
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeAttachment) return;
    if (editFile) {
      const fileError = validateCorrespondenceAttachmentFile(editFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }
    setIsSaving(true);
    setError(null);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      if (editDocumentType.trim()) formData.append('document_type', editDocumentType.trim());
      formData.append('description', editDescription.trim());
      if (editFile) formData.append('file', editFile);
      await correspondenceAttachmentsApi.update(activeAttachment.id, formData, setUploadProgress);
      resetEditForm();
      setActiveAttachment(null);
      setPanelView('list');
      await loadAttachments();
      onChanged();
      showToast('Attachment updated successfully.');
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Update failed.'));
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!activeAttachment) return;
    setIsSaving(true);
    setError(null);
    try {
      await correspondenceAttachmentsApi.delete(activeAttachment.id);
      setActiveAttachment(null);
      setPanelView('list');
      await loadAttachments();
      onChanged();
      showToast('Attachment deleted successfully.');
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Delete failed.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (attachment: CorrespondenceAttachment) => {
    setDownloadingId(attachment.id);
    try {
      await downloadCorrespondenceAttachmentSecure(attachment.id, attachment.fileName);
    } catch (err) {
      showToast(getCorrespondenceAttachmentsErrorMessage(err, 'Download failed.'), 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (attachment: CorrespondenceAttachment) => {
    if (!canPreviewCorrespondenceAttachment(attachment.fileName)) return;
    setActiveAttachment(attachment);
    setPanelView('preview');
    setPreviewLoading(true);
    setPreviewUrl(null);
    setError(null);
    try {
      const url = await correspondenceAttachmentsApi.getDownloadUrl(attachment.id);
      setPreviewUrl(url);
    } catch (err) {
      setError(getCorrespondenceAttachmentsErrorMessage(err, 'Preview failed.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const openEdit = (attachment: CorrespondenceAttachment) => {
    setActiveAttachment(attachment);
    setEditDocumentType(attachment.documentType ?? '');
    setEditDescription(attachment.description ?? '');
    setEditFile(null);
    setError(null);
    setPanelView('edit');
  };

  const openDelete = (attachment: CorrespondenceAttachment) => {
    setActiveAttachment(attachment);
    setError(null);
    setPanelView('delete');
  };

  const shellClass = `flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`;
  const inputClass = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-blue-500/20 ${themeClasses.input}`;
  const labelClass = `mb-1.5 block text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`;

  const iconBtnClass = (tone: 'neutral' | 'primary' | 'danger' = 'neutral') => {
    if (tone === 'primary') {
      return `inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        isDarkTheme
          ? 'text-blue-300 hover:bg-blue-500/15'
          : 'text-blue-600 hover:bg-blue-50'
      }`;
    }
    if (tone === 'danger') {
      return `inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        isDarkTheme
          ? 'text-rose-300 hover:bg-rose-500/15'
          : 'text-rose-600 hover:bg-rose-50'
      }`;
    }
    return `inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
      isDarkTheme
        ? 'text-slate-300 hover:bg-white/10'
        : 'text-slate-600 hover:bg-slate-100'
    }`;
  };

  const renderAttachmentActions = (attachment: CorrespondenceAttachment) => {
    const showDelete = attachment.canDelete !== false;
    const showEdit = attachment.canEdit !== false;
    const showPreview = canPreviewCorrespondenceAttachment(attachment.fileName);
    const isDownloading = downloadingId === attachment.id;

    return (
      <div className="flex shrink-0 items-center gap-0.5">
        {showPreview && (
          <button
            type="button"
            title="Preview"
            aria-label="Preview attachment"
            onClick={() => void handlePreview(attachment)}
            className={iconBtnClass('neutral')}
          >
            <Eye size={16} />
          </button>
        )}
        <button
          type="button"
          title="Download"
          aria-label="Download attachment"
          disabled={isDownloading}
          onClick={() => void handleDownload(attachment)}
          className={iconBtnClass('primary')}
        >
          <Download size={16} className={isDownloading ? 'animate-pulse' : ''} />
        </button>
        {showEdit && (
          <>
            <button
              type="button"
              title="Upload new version"
              aria-label="Upload new version"
              onClick={() => {
                setActiveAttachment(attachment);
                setEditDocumentType(attachment.documentType ?? '');
                setEditDescription(attachment.description ?? '');
                setEditFile(null);
                setError(null);
                setPanelView('edit');
              }}
              className={iconBtnClass('neutral')}
            >
              <History size={16} />
            </button>
            <button
              type="button"
              title="Edit metadata"
              aria-label="Edit attachment"
              onClick={() => openEdit(attachment)}
              className={iconBtnClass('primary')}
            >
              <Pencil size={16} />
            </button>
          </>
        )}
        {showDelete && (
          <button
            type="button"
            title="Delete"
            aria-label="Delete attachment"
            onClick={() => openDelete(attachment)}
            className={iconBtnClass('danger')}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  };

  const renderAttachmentRow = (attachment: CorrespondenceAttachment) => {
    const FileIcon = getCorrespondenceAttachmentFileIcon(attachment.fileName);
    return (
      <div
        key={`${attachment.id}-${attachment.version}`}
        className={`rounded-xl border p-3.5 transition-colors sm:p-4 ${
          isDarkTheme
            ? 'border-white/10 bg-white/[0.02] hover:border-white/15'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isDarkTheme ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              <FileIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`truncate text-sm font-bold ${themeClasses.textPrimary}`}>
                  {attachment.fileName}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isDarkTheme
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  v{attachment.version}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <span className={themeClasses.textSecondary}>
                  <span className={`font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>Type </span>
                  {attachment.documentType || '—'}
                </span>
                <span className={themeClasses.textSecondary}>
                  <span className={`font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>By </span>
                  {attachment.uploadedBy}
                </span>
                <span className={`${themeClasses.textSecondary} tabular-nums`}>
                  <span className={`font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>On </span>
                  {formatCorrespondenceAttachmentDateTime(attachment.uploadedOn)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end border-t pt-3 sm:border-t-0 sm:pt-0">
            {renderAttachmentActions(attachment)}
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <>
      <div
        className={`shrink-0 border-b px-4 py-4 sm:px-6 ${
          isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                Attachments
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  isDarkTheme
                    ? 'bg-blue-500/15 text-blue-300'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {formatCorrespondenceAttachmentCount(attachments.length)}
              </span>
            </div>
            <p className={`mt-1 line-clamp-2 text-sm font-medium ${themeClasses.textSecondary}`}>
              {document.description || 'Correspondence document'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close attachments"
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${themeClasses.buttonSecondary}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Icons.Search
              size={15}
              className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name or document type…"
              className={`${inputClass} pl-10`}
            />
          </div>
          {canUpload && (
            <button
              type="button"
              onClick={() => {
                resetUploadForm();
                setError(null);
                setPanelView('upload');
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Icons.Upload size={16} />
              Upload Attachment
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`h-20 animate-pulse rounded-xl ${isDarkTheme ? 'bg-white/5' : 'bg-slate-100'}`}
              />
            ))}
          </div>
        ) : filteredAttachments.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center ${
              isDarkTheme ? 'border-white/15 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div
              className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${
                isDarkTheme ? 'bg-white/5 text-slate-400' : 'bg-white text-slate-400 shadow-sm'
              }`}
            >
              <Icons.Document size={22} />
            </div>
            <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>
              {search.trim() ? 'No matching attachments' : 'No attachments yet'}
            </p>
            <p className={`mt-1 max-w-xs text-xs ${themeClasses.textMuted}`}>
              {search.trim()
                ? 'Try a different search term.'
                : 'Upload PDF, Office, or image files for this correspondence.'}
            </p>
            {canUpload && !search.trim() && (
              <button
                type="button"
                onClick={() => {
                  resetUploadForm();
                  setPanelView('upload');
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Icons.Upload size={16} />
                Upload Attachment
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
              {filteredAttachments.length} attachment{filteredAttachments.length === 1 ? '' : 's'}
              {search.trim() ? ' found' : ''}
            </p>
            {filteredAttachments.map(renderAttachmentRow)}
          </div>
        )}
        {error && panelView === 'list' && (
          <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500">{error}</p>
        )}
      </div>
    </>
  );

  const renderUpload = () => (
    <form onSubmit={handleUpload} className="flex min-h-0 flex-1 flex-col">
      <div
        className={`shrink-0 border-b px-4 py-4 sm:px-6 ${
          isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
            Upload Attachment
          </h3>
          <button
            type="button"
            onClick={() => {
              resetUploadForm();
              setError(null);
              setPanelView('list');
            }}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${themeClasses.buttonSecondary}`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
        <div>
          <label className={labelClass}>Upload File *</label>
          <input
            type="file"
            accept={CORRESPONDENCE_ATTACHMENT_ACCEPT}
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Document Type (Optional)</label>
          <input
            type="text"
            value={uploadDocumentType}
            onChange={(e) => setUploadDocumentType(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Description (Optional)</label>
          <textarea
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div>
            <div className={`h-1.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className={`mt-1 text-[10px] ${themeClasses.textMuted}`}>Uploading… {uploadProgress}%</p>
          </div>
        )}
        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
      </div>
      <div className={`flex gap-3 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={() => {
            resetUploadForm();
            setError(null);
            setPanelView('list');
          }}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ${themeClasses.buttonSecondary}`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
        >
          {isSaving ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  );

  const renderEdit = () => (
    <form onSubmit={handleUpdate} className="flex min-h-0 flex-1 flex-col">
      <div
        className={`shrink-0 border-b px-4 py-4 sm:px-6 ${
          isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
              Edit Attachment
            </h3>
            <p className={`mt-0.5 truncate text-sm ${themeClasses.textSecondary}`}>{activeAttachment?.fileName}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetEditForm();
              setActiveAttachment(null);
              setError(null);
              setPanelView('list');
            }}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${themeClasses.buttonSecondary}`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
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
            rows={3}
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
          <p className={`mt-1 text-[10px] ${themeClasses.textMuted}`}>
            Uploading a new file creates the next version automatically.
          </p>
        </div>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className={`h-1.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
      </div>
      <div className={`flex gap-3 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={() => {
            resetEditForm();
            setActiveAttachment(null);
            setError(null);
            setPanelView('list');
          }}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ${themeClasses.buttonSecondary}`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );

  const renderDelete = () => (
    <>
      <div
        className={`shrink-0 border-b px-4 py-4 sm:px-6 ${
          isDarkTheme ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-100 bg-rose-50/80'
        }`}
      >
        <h3 className="text-lg font-black uppercase tracking-tight text-rose-600">Delete Attachment</h3>
      </div>
      <div className="px-4 py-6 sm:px-6">
        <p className={`text-sm leading-relaxed ${themeClasses.textPrimary}`}>
          Are you sure you want to delete <strong>{activeAttachment?.fileName}</strong>
          {activeAttachment ? ` (v${activeAttachment.version})` : ''}? This cannot be undone.
        </p>
        {error && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500">{error}</p>}
      </div>
      <div className={`flex gap-3 border-t px-4 py-4 sm:px-6 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={() => {
            setActiveAttachment(null);
            setError(null);
            setPanelView('list');
          }}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ${themeClasses.buttonSecondary}`}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleDelete()}
          className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-500 disabled:opacity-60"
        >
          {isSaving ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </>
  );

  const renderPreview = () => {
    const ext = activeAttachment?.fileName.split('.').pop()?.toLowerCase() ?? '';
    const isImage = ext === 'jpg' || ext === 'jpeg' || ext === 'png';

    return (
      <>
        <div className={`shrink-0 border-b px-4 py-4 sm:px-6 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className={`text-lg font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                Preview
              </h3>
              <p className={`truncate text-sm ${themeClasses.textSecondary}`}>{activeAttachment?.fileName}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPreviewUrl(null);
                setActiveAttachment(null);
                setPanelView('list');
              }}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${themeClasses.buttonSecondary}`}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-900/5 p-4 sm:p-6">
          {previewLoading ? (
            <div className={`h-[50vh] animate-pulse rounded-xl ${isDarkTheme ? 'bg-white/5' : 'bg-slate-100'}`} />
          ) : previewUrl ? (
            isImage ? (
              <img src={previewUrl} alt={activeAttachment?.fileName} className="mx-auto max-h-[65vh] rounded-lg border object-contain" />
            ) : (
              <iframe title={activeAttachment?.fileName} src={previewUrl} className="h-[65vh] w-full rounded-lg border" />
            )
          ) : (
            <p className={`text-sm ${themeClasses.textMuted}`}>Preview is not available.</p>
          )}
          {error && <p className="mt-2 text-xs font-bold text-rose-500">{error}</p>}
        </div>
        <div className={`border-t px-4 py-3 sm:px-5 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
          {activeAttachment && (
            <button
              type="button"
              onClick={() => void handleDownload(activeAttachment)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
            >
              <Icons.Download size={16} />
              Download
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      <ModalPortal open>
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
          <div className={shellClass}>
            {panelView === 'list' && renderList()}
            {panelView === 'upload' && renderUpload()}
            {panelView === 'edit' && renderEdit()}
            {panelView === 'delete' && renderDelete()}
            {panelView === 'preview' && renderPreview()}
          </div>
        </div>
      </ModalPortal>
      <DashboardToastStack toasts={toasts} />
    </>
  );
};

function axiosIsForbidden(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 403
  );
}

export default React.memo(CorrespondenceAttachmentsPanel);
