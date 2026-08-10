import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileText,
  Film,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Project, TestingDocument, User } from '../../types';
import {
  getApiErrorMessage,
  normalizeTestingDocumentsList,
  parseTestingDocumentMutationResponse,
  testingDocumentsApi,
} from '../../services/api';
import { openStoredFile } from '../../utils/storedFileUrl';
import { MONTH_OPTIONS } from '../../utils/healthSafety';
import {
  canEditTestingPhotos,
  testingPhotosProjectsForUser,
} from '../../utils/testingDocumentsAccess';
import { ModalPortal } from '../ModalPortal';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface TestingPhotosPageProps {
  projects?: Project[];
  currentUser: User;
  /** Prefill project when navigating from QAQC dashboard. */
  initialProjectId?: string | null;
  initialMonth?: number;
  initialYear?: number;
}

const ALLOWED_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.avi,image/*,video/*,application/pdf';

function formatBytes(size: number): string {
  if (!size || size <= 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageDoc(doc: TestingDocument): boolean {
  const mime = (doc.mimeType || '').toLowerCase();
  const type = (doc.documentType || '').toLowerCase();
  return mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'image'].includes(type);
}

function isVideoDoc(doc: TestingDocument): boolean {
  const mime = (doc.mimeType || '').toLowerCase();
  const type = (doc.documentType || '').toLowerCase();
  return mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'video'].includes(type);
}

function DocTypeIcon({ doc }: { doc: TestingDocument }) {
  if (isImageDoc(doc)) return <ImageIcon size={18} />;
  if (isVideoDoc(doc)) return <Film size={18} />;
  return <FileText size={18} />;
}

type UploadFormState = {
  title: string;
  remarks: string;
  testDate: string;
  file: File | null;
};

const emptyForm = (): UploadFormState => ({
  title: '',
  remarks: '',
  testDate: new Date().toISOString().slice(0, 10),
  file: null,
});

function resolveBackendProjectId(
  projectId: string,
  accessibleProjects: Project[],
  allProjects: Project[],
): string | null {
  const trimmed = projectId.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  const match =
    accessibleProjects.find((p) => p.id === trimmed) ??
    allProjects.find((p) => p.id === trimmed);
  if (match?.id && /^\d+$/.test(String(match.id))) {
    return String(match.id);
  }
  return null;
}

const TestingPhotosPage: React.FC<TestingPhotosPageProps> = ({
  projects = [],
  currentUser,
  initialProjectId = null,
  initialMonth,
  initialYear,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accessibleProjects = useMemo(
    () => testingPhotosProjectsForUser(projects, currentUser),
    [projects, currentUser],
  );

  const canEdit = canEditTestingPhotos(currentUser.role);
  const now = new Date();
  const [projectId, setProjectId] = useState(
    () => initialProjectId || accessibleProjects[0]?.id || '',
  );
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);
  const [year, setYear] = useState(initialYear ?? now.getFullYear());

  const [docs, setDocs] = useState<TestingDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<TestingDocument | null>(null);
  const [form, setForm] = useState<UploadFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const [previewDoc, setPreviewDoc] = useState<TestingDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestingDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openingId, setOpeningId] = useState<string | number | null>(null);

  useEffect(() => {
    if (initialProjectId) {
      setProjectId(initialProjectId);
      return;
    }
    if (!projectId && accessibleProjects[0]?.id) {
      setProjectId(accessibleProjects[0].id);
    }
  }, [initialProjectId, accessibleProjects, projectId]);

  const selectedProject = useMemo(
    () => accessibleProjects.find((p) => p.id === projectId) ?? null,
    [accessibleProjects, projectId],
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadDocs = useCallback(async () => {
    if (!projectId) {
      setDocs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await testingDocumentsApi.list({
        project: projectId,
        month,
        year,
        page_size: 200,
      });
      setDocs(normalizeTestingDocumentsList(res.data));
    } catch (err) {
      setDocs([]);
      setError(getApiErrorMessage(err, 'Unable to load testing documents.'));
    } finally {
      setLoading(false);
    }
  }, [projectId, month, year]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const openUpload = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setUploadPct(0);
    setUploadOpen(true);
  };

  const openEdit = (doc: TestingDocument) => {
    setEditing(doc);
    setForm({
      title: doc.title,
      remarks: doc.remarks,
      testDate: doc.testDate || new Date().toISOString().slice(0, 10),
      file: null,
    });
    setFormError(null);
    setUploadPct(0);
    setUploadOpen(true);
  };

  const closeUpload = () => {
    if (saving) return;
    setUploadOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) {
      setFormError('You do not have permission to upload testing documents.');
      return;
    }
    const backendProjectId = resolveBackendProjectId(projectId, accessibleProjects, projects);
    if (!backendProjectId) {
      setFormError('Select a valid project with a backend project ID before uploading.');
      return;
    }
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!form.testDate) {
      setFormError('Test date is required.');
      return;
    }
    if (!editing && !form.file) {
      setFormError('Please choose a file (PDF, image, or video).');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const res = await testingDocumentsApi.update(
          editing.id,
          {
            title: form.title,
            remarks: form.remarks,
            testDate: form.testDate,
            file: form.file,
          },
          setUploadPct,
        );
        const { document: updated, message } = parseTestingDocumentMutationResponse(res.data);
        if (updated) {
          if (updated.month) setMonth(updated.month);
          if (updated.year) setYear(updated.year);
          setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        } else {
          await loadDocs();
        }
        showToast(message || 'Testing document updated.');
      } else {
        const res = await testingDocumentsApi.upload(
          {
            projectId: backendProjectId,
            title: form.title,
            remarks: form.remarks,
            testDate: form.testDate,
            file: form.file!,
          },
          setUploadPct,
        );
        const { document: created, message } = parseTestingDocumentMutationResponse(res.data);
        if (created) {
          if (created.month) setMonth(created.month);
          if (created.year) setYear(created.year);
          setDocs((prev) => {
            const without = prev.filter((d) => d.id !== created.id);
            return [created, ...without];
          });
        } else {
          await loadDocs();
        }
        showToast(message || 'Testing document uploaded.');
      }
      setUploadOpen(false);
      setEditing(null);
      setForm(emptyForm());
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to save testing document.'));
    } finally {
      setSaving(false);
      setUploadPct(0);
    }
  };

  const handleDownload = async (doc: TestingDocument) => {
    if (openingId != null) return;
    setOpeningId(doc.id);
    try {
      const { url } = await openStoredFile({
        directUrl: doc.fileUrl,
        fileName: doc.fileName || undefined,
        download: Boolean(doc.fileName),
        fetchPresignedUrl: async () => {
          const res = await testingDocumentsApi.download(doc.id);
          const body = res.data as {
            data?: { download_url?: string; file_url?: string; s3_url?: string };
            download_url?: string;
            file_url?: string;
            s3_url?: string;
          };
          return (
            body?.data?.download_url ||
            body?.data?.file_url ||
            body?.data?.s3_url ||
            body?.download_url ||
            body?.file_url ||
            body?.s3_url ||
            ''
          );
        },
      });
      if (url && url !== doc.fileUrl) {
        setDocs((prev) =>
          prev.map((row) => (row.id === doc.id ? { ...row, fileUrl: url } : row)),
        );
        if (previewDoc?.id === doc.id) {
          setPreviewDoc({ ...previewDoc, fileUrl: url });
        }
      }
    } catch (err) {
      if ((err as Error)?.message === 'OPEN_IN_PROGRESS') return;
      showToast(getApiErrorMessage(err, 'Unable to download file.'));
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !canEdit) return;
    setDeleting(true);
    try {
      await testingDocumentsApi.delete(deleteTarget.id);
      setDocs((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      showToast('Testing document deleted.');
      if (previewDoc?.id === deleteTarget.id) setPreviewDoc(null);
      setDeleteTarget(null);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Unable to delete document.'));
    } finally {
      setDeleting(false);
    }
  };

  const cardCls = `rounded-2xl border ${
    isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
  }`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 animate-in fade-in duration-500">
      <header
        className={`flex flex-wrap items-end justify-between gap-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${
          isDarkTheme ? 'border-indigo-500/25 bg-indigo-500/10' : 'border-indigo-100 bg-white shadow-sm'
        }`}
      >
        <div>
          <h2 className={`text-xl font-black tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
            Testing Photos
          </h2>
          <p className={`mt-0.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
            Upload and manage material testing documents, photos &amp; videos
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openUpload}
            disabled={!projectId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Plus size={14} />
            Upload Testing Photo
          </button>
        )}
      </header>

      <section className={`${cardCls} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`}>
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
            >
              {accessibleProjects.length === 0 && <option value="">No accessible projects</option>}
              {accessibleProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[130px]">
            <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`}>
              Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[110px]">
            <label className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`}>
              Year
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
            />
          </div>
          <button
            type="button"
            onClick={() => void loadDocs()}
            className={`rounded-xl border px-3 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
          >
            Refresh
          </button>
        </div>
        {selectedProject && (
          <p className={`mt-2 text-[11px] ${themeClasses.textMuted}`}>
            Showing evidence for <strong className={themeClasses.textPrimary}>{selectedProject.title}</strong>
            {' · '}
            {MONTH_OPTIONS.find((m) => m.value === month)?.label} {year}
          </p>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <section className={`${cardCls} overflow-hidden`}>
        <div
          className={`flex items-center justify-between border-b px-4 py-3 sm:px-5 ${
            isDarkTheme ? 'border-white/10' : 'border-slate-100'
          }`}
        >
          <h3 className={`text-sm font-black ${themeClasses.textPrimary}`}>
            Documents ({docs.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center px-4 py-10 text-center">
            <Upload className={isDarkTheme ? 'text-slate-500' : 'text-slate-400'} size={32} />
            <p className={`mt-3 text-sm font-semibold ${themeClasses.textSecondary}`}>
              No testing documents for this period
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={openUpload}
                disabled={!projectId}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Upload first document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {docs.map((doc) => (
              <article
                key={doc.id}
                className={`flex flex-col overflow-hidden rounded-xl border ${
                  isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setPreviewDoc(doc)}
                  className={`relative flex h-36 items-center justify-center overflow-hidden ${
                    isDarkTheme ? 'bg-slate-900/60' : 'bg-slate-100'
                  }`}
                >
                  {isImageDoc(doc) && doc.fileUrl ? (
                    <img src={doc.fileUrl} alt={doc.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className={isDarkTheme ? 'text-indigo-300' : 'text-indigo-600'}>
                      <DocTypeIcon doc={doc} />
                    </span>
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${
                      isDarkTheme ? 'bg-black/50 text-white' : 'bg-white/90 text-slate-700'
                    }`}
                  >
                    {doc.documentType || 'file'}
                  </span>
                </button>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <h4 className={`line-clamp-2 text-sm font-bold ${themeClasses.textPrimary}`}>{doc.title}</h4>
                  <p className={`line-clamp-2 text-[11px] ${themeClasses.textMuted}`}>
                    {doc.remarks || 'No remarks'}
                  </p>
                  <p className={`text-[10px] font-semibold ${themeClasses.textSecondary}`}>
                    {doc.testDate || '—'} · {formatBytes(doc.fileSize)}
                  </p>
                  <p className={`text-[10px] ${themeClasses.textMuted}`}>
                    by {doc.uploadedByUsername || '—'}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${themeClasses.border} ${themeClasses.textSecondary}`}
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      type="button"
                      disabled={openingId === doc.id}
                      onClick={() => void handleDownload(doc)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold disabled:opacity-50 ${themeClasses.border} ${themeClasses.textSecondary}`}
                    >
                      <Download size={12} /> {openingId === doc.id ? 'Opening…' : 'Download'}
                    </button>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(doc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2 py-1 text-[10px] font-bold text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-300"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(doc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-600 dark:border-rose-500/30 dark:text-rose-300"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100050] rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {uploadOpen && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[100040] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
            <form
              onSubmit={handleSave}
              className={`flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-w-lg sm:rounded-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
            >
              <div
                className={`flex items-center justify-between border-b px-4 py-3 ${themeClasses.border} ${
                  isDarkTheme ? 'bg-white/5' : 'bg-indigo-50/80'
                }`}
              >
                <h3 className={`text-sm font-bold ${themeClasses.textPrimary}`}>
                  {editing ? 'Edit Testing Document' : 'Upload Testing Photo'}
                </h3>
                <button type="button" onClick={closeUpload} className={`rounded-lg p-1 ${themeClasses.textSecondary}`}>
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                <div>
                  <label className={`mb-1 block text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>
                    Title *
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${themeClasses.input} ${themeClasses.border}`}
                    placeholder="e.g. Concrete Cube Test"
                    required
                  />
                </div>
                <div>
                  <label className={`mb-1 block text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>
                    Test Date *
                  </label>
                  <input
                    type="date"
                    value={form.testDate}
                    onChange={(e) => setForm((p) => ({ ...p, testDate: e.target.value }))}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${themeClasses.input} ${themeClasses.border}`}
                    required
                  />
                </div>
                <div>
                  <label className={`mb-1 block text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>
                    Remarks
                  </label>
                  <textarea
                    value={form.remarks}
                    onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                    rows={3}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${themeClasses.input} ${themeClasses.border}`}
                    placeholder="Optional notes"
                  />
                </div>
                <div>
                  <label className={`mb-1 block text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>
                    File {editing ? '(optional replace)' : '*'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_ACCEPT}
                    onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
                    className={`w-full rounded-xl border px-3 py-2 text-xs outline-none ${themeClasses.input} ${themeClasses.border}`}
                  />
                  <p className={`mt-1 text-[10px] ${themeClasses.textMuted}`}>
                    Allowed: PDF, JPG, JPEG, PNG, WEBP, MP4, MOV, AVI
                  </p>
                  {form.file && (
                    <p className={`mt-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                      Selected: {form.file.name} ({formatBytes(form.file.size)})
                    </p>
                  )}
                </div>
                {saving && uploadPct > 0 && (
                  <div>
                    <div className={`h-2 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
                      <div className="h-full bg-indigo-500 transition-all" style={{ width: `${uploadPct}%` }} />
                    </div>
                    <p className={`mt-1 text-[10px] font-semibold ${themeClasses.textSecondary}`}>{uploadPct}%</p>
                  </div>
                )}
                {formError && <p className="text-xs font-semibold text-rose-500">{formError}</p>}
              </div>

              <div className={`flex gap-2 border-t px-4 py-3 ${themeClasses.border}`}>
                <button
                  type="button"
                  onClick={closeUpload}
                  disabled={saving}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold ${themeClasses.buttonSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {previewDoc && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/70 p-4">
            <div className={`flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border ${themeClasses.bgPrimary} ${themeClasses.border}`}>
              <div className={`flex items-center justify-between border-b px-4 py-3 ${themeClasses.border}`}>
                <div className="min-w-0">
                  <h3 className={`truncate text-sm font-bold ${themeClasses.textPrimary}`}>{previewDoc.title}</h3>
                  <p className={`text-[11px] ${themeClasses.textSecondary}`}>
                    {previewDoc.fileName} · {previewDoc.testDate}
                  </p>
                </div>
                <button type="button" onClick={() => setPreviewDoc(null)} className={themeClasses.textSecondary}>
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                {isImageDoc(previewDoc) && previewDoc.fileUrl ? (
                  <img src={previewDoc.fileUrl} alt={previewDoc.title} className="mx-auto max-h-[60vh] rounded-lg object-contain" />
                ) : isVideoDoc(previewDoc) && previewDoc.fileUrl ? (
                  <video src={previewDoc.fileUrl} controls className="mx-auto max-h-[60vh] w-full rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <FileText size={40} className={isDarkTheme ? 'text-slate-400' : 'text-slate-500'} />
                    <p className={`text-sm ${themeClasses.textSecondary}`}>Preview not available in-browser for this file type.</p>
                    <button
                      type="button"
                      disabled={openingId === previewDoc.id}
                      onClick={() => void handleDownload(previewDoc)}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {openingId === previewDoc.id ? 'Opening…' : 'Download to view'}
                    </button>
                  </div>
                )}
                {previewDoc.remarks && (
                  <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${themeClasses.border} ${themeClasses.textSecondary}`}>
                    {previewDoc.remarks}
                  </p>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTarget && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/60 p-4">
            <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}>
              <h3 className={`text-sm font-bold ${themeClasses.textPrimary}`}>Delete testing document?</h3>
              <p className={`mt-2 text-xs ${themeClasses.textSecondary}`}>
                This will permanently delete <strong>{deleteTarget.title}</strong>.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold ${themeClasses.buttonSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default TestingPhotosPage;
