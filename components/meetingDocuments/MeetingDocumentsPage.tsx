import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icons } from '../Icons';
import DashboardToastStack, { type DashboardToastItem } from '../DashboardToastStack';
import MeetingDocumentModals, { type MeetingDocumentModalMode } from './MeetingDocumentModals';
import type { Project } from '../../types';
import type {
  MeetingDocumentRecord,
  MeetingDocumentsDashboardStats,
  MeetingDocumentsByProject,
} from '../../types/meetingDocuments';
import {
  MONTH_OPTIONS,
  buildMeetingYearOptions,
  formatMeetingDateTime,
  formatMeetingDisplayDate,
  formatStorageSaved,
  meetingTypeBadgeClass,
  meetingTypeLabel,
} from '../../utils/meetingDocuments';
import {
  downloadMeetingDocumentSecure,
  getMeetingDocumentsErrorMessage,
  meetingDocumentsApi,
  normalizeMeetingDocument,
  normalizeMeetingDocumentsByProject,
  normalizeMeetingDocumentsDashboard,
  normalizeMeetingDocumentsList,
  parseMeetingDocumentResponse,
} from '../../services/meetingDocumentsApi';
import { getThemeClasses, useTheme } from '../../utils/theme';
import { useDebouncedValue, SEARCH_DEBOUNCE_MS } from '../../hooks/useDebouncedValue';
import { isAbortError } from '../../utils/isAbortError';

interface MeetingDocumentsPageProps {
  projects: Project[];
}

const PAGE_SIZE = 10;

const MeetingDocumentsPage: React.FC<MeetingDocumentsPageProps> = ({ projects }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [dashboard, setDashboard] = useState<MeetingDocumentsDashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [documents, setDocuments] = useState<MeetingDocumentRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim());
  const [projectFilter, setProjectFilter] = useState('');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<'MOM' | 'EDL' | ''>('');
  const [monthFilter, setMonthFilter] = useState<number | ''>('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');

  // Batch discrete filter changes so flipping several dropdowns fires one request.
  const filterBatchKey = `${projectFilter}|${meetingTypeFilter}|${monthFilter}|${yearFilter}`;
  const debouncedFilterBatchKey = useDebouncedValue(filterBatchKey, SEARCH_DEBOUNCE_MS);
  const [batchedProject, batchedMeetingType, batchedMonth, batchedYear] = useMemo(() => {
    const [p, mt, m, y] = debouncedFilterBatchKey.split('|');
    return [
      p ?? '',
      (mt ?? '') as 'MOM' | 'EDL' | '',
      m === '' ? '' : (Number(m) as number | ''),
      y === '' ? '' : (Number(y) as number | ''),
    ] as const;
  }, [debouncedFilterBatchKey]);

  const [modalMode, setModalMode] = useState<MeetingDocumentModalMode | null>(null);
  const [activeDocument, setActiveDocument] = useState<MeetingDocumentRecord | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<MeetingDocumentsByProject | null>(null);
  const [projectDocumentsLoading, setProjectDocumentsLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<DashboardToastItem[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);

  const yearOptions = useMemo(() => buildMeetingYearOptions(), []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setActiveDocument(null);
    setModalError(null);
    setUploadProgress(0);
    setProjectDocuments(null);
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await meetingDocumentsApi.getDashboard();
      setDashboard(normalizeMeetingDocumentsDashboard(res.data));
    } catch (error) {
      console.error('[MeetingDocuments] Dashboard load failed:', error);
      setDashboard({
        totalMom: 0,
        totalEdl: 0,
        uploadedThisMonth: 0,
        storageSavedThroughCompression: '—',
      });
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async (signal?: AbortSignal) => {
    setListLoading(true);
    try {
      const res = await meetingDocumentsApi.list({
        page,
        page_size: PAGE_SIZE,
        search,
        project: batchedProject,
        meeting_type: batchedMeetingType,
        month: batchedMonth,
        year: batchedYear,
        signal,
      });
      if (signal?.aborted) return;
      const parsed = normalizeMeetingDocumentsList(res.data);
      setDocuments(parsed.results);
      setTotalCount(parsed.count);
      setHasNext(parsed.hasNext);
      setHasPrevious(parsed.hasPrevious);
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) return;
      console.error('[MeetingDocuments] List load failed:', error);
      setDocuments([]);
      setTotalCount(0);
    } finally {
      if (!signal?.aborted) setListLoading(false);
    }
  }, [page, search, batchedProject, batchedMeetingType, batchedMonth, batchedYear]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDocuments(controller.signal);
    return () => controller.abort();
  }, [loadDocuments]);

  useEffect(() => {
    setPage((p) => (p === 1 ? p : 1));
  }, [search, batchedProject, batchedMeetingType, batchedMonth, batchedYear]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadDashboard(), loadDocuments()]);
  }, [loadDashboard, loadDocuments]);

  const openModal = (mode: MeetingDocumentModalMode, doc: MeetingDocumentRecord | null = null) => {
    setModalMode(mode);
    setActiveDocument(doc);
    setModalError(null);
    setUploadProgress(0);
  };

  const openProjectDocuments = async (projectName: string) => {
    openModal('project');
    setProjectDocumentsLoading(true);
    try {
      const res = await meetingDocumentsApi.getByProject(projectName);
      setProjectDocuments(normalizeMeetingDocumentsByProject(res.data));
    } catch (error) {
      console.error('[MeetingDocuments] Project documents failed:', error);
      setProjectDocuments({ projectName, momDocuments: [], edlDocuments: [] });
      showToast(getMeetingDocumentsErrorMessage(error, 'Failed to load project documents.'), 'error');
    } finally {
      setProjectDocumentsLoading(false);
    }
  };

  const handleUpload = async (formData: FormData) => {
    setModalSaving(true);
    setModalError(null);
    setUploadProgress(0);
    try {
      await meetingDocumentsApi.create(formData, setUploadProgress);
      closeModal();
      await refreshAll();
      showToast('Meeting document uploaded successfully.');
    } catch (error) {
      setModalError(getMeetingDocumentsErrorMessage(error, 'Upload failed.'));
    } finally {
      setModalSaving(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = async (payload: {
    title: string;
    description: string;
    meeting_date: string;
    meeting_number: string;
  }) => {
    if (!activeDocument) return;
    setModalSaving(true);
    setModalError(null);
    try {
      await meetingDocumentsApi.patchMetadata(activeDocument.id, payload);
      closeModal();
      await refreshAll();
      showToast('Meeting document updated successfully.');
    } catch (error) {
      setModalError(getMeetingDocumentsErrorMessage(error, 'Update failed.'));
    } finally {
      setModalSaving(false);
    }
  };

  const handleUploadVersion = async (file: File) => {
    if (!activeDocument) return;
    setModalSaving(true);
    setModalError(null);
    setUploadProgress(0);
    try {
      await meetingDocumentsApi.uploadNewVersion(activeDocument.id, file, setUploadProgress);
      closeModal();
      await refreshAll();
      showToast('New document version uploaded successfully.');
    } catch (error) {
      setModalError(getMeetingDocumentsErrorMessage(error, 'Version upload failed.'));
    } finally {
      setModalSaving(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!activeDocument) return;
    setModalSaving(true);
    setModalError(null);
    try {
      await meetingDocumentsApi.delete(activeDocument.id);
      closeModal();
      await refreshAll();
      showToast('Meeting document deleted successfully.');
    } catch (error) {
      setModalError(getMeetingDocumentsErrorMessage(error, 'Delete failed.'));
    } finally {
      setModalSaving(false);
    }
  };

  const handleDownload = async (doc: MeetingDocumentRecord) => {
    if (downloadingId != null) return;
    setDownloadingId(doc.id);
    try {
      const { url } = await downloadMeetingDocumentSecure(
        doc.id,
        doc.fileName ?? undefined,
        doc.fileUrl,
      );
      if (url && url !== doc.fileUrl) {
        setDocuments((prev) =>
          prev.map((row) => (String(row.id) === String(doc.id) ? { ...row, fileUrl: url } : row)),
        );
        if (activeDocument && String(activeDocument.id) === String(doc.id)) {
          setActiveDocument({ ...activeDocument, fileUrl: url });
        }
      }
    } catch (error) {
      if ((error as Error)?.message === 'OPEN_IN_PROGRESS') return;
      showToast(getMeetingDocumentsErrorMessage(error, 'Download failed.'), 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = async (doc: MeetingDocumentRecord) => {
    try {
      const res = await meetingDocumentsApi.getById(doc.id);
      openModal('view', parseMeetingDocumentResponse(res.data));
    } catch (error) {
      openModal('view', doc);
      showToast(getMeetingDocumentsErrorMessage(error, 'Could not refresh document details.'), 'error');
    }
  };

  const kpiCards = [
    { label: 'Total MOM', value: dashboard?.totalMom ?? 0, accent: 'text-blue-600' },
    { label: 'Total EDL', value: dashboard?.totalEdl ?? 0, accent: 'text-violet-600' },
    { label: 'Uploaded This Month', value: dashboard?.uploadedThisMonth ?? 0, accent: 'text-emerald-600' },
    {
      label: 'Storage Saved',
      value: formatStorageSaved(dashboard?.storageSavedThroughCompression ?? '—'),
      accent: 'text-amber-600',
      isText: true,
    },
  ];

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 ${themeClasses.input}`;
  const labelClass = `mb-1 block text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`;

  const isEmpty = !listLoading && documents.length === 0;

  return (
    <div className="mx-auto max-w-[1680px] space-y-4 px-2 pb-4 sm:px-3 md:px-0">
      <DashboardToastStack toasts={toasts} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-500'}`}>
            Meetings
          </p>
          <h1 className={`text-xl font-black tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
            Meeting Documents
          </h1>
        </div>
        <button
          type="button"
          onClick={() => openModal('upload')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500"
        >
          <Icons.Upload size={16} />
          Upload Document
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {dashboardLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`h-20 animate-pulse rounded-2xl border ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-white'}`} />
            ))
          : kpiCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${isDarkTheme ? 'border-white/10 bg-[#0f2744]/70' : 'border-slate-200 bg-white'}`}
              >
                <p className={`text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>{card.label}</p>
                <p className={`mt-1 text-xl font-black tabular-nums sm:text-2xl ${card.accent}`}>
                  {card.isText ? card.value : Number(card.value).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
      </div>

      <div className={`rounded-2xl border p-3 sm:p-4 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm'}`}>
        {listLoading && documents.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-10 animate-pulse rounded-lg ${isDarkTheme ? 'bg-white/5' : 'bg-slate-100'}`} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className={labelClass}>Search</label>
              <div className="relative">
                <Icons.Search size={14} className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`} />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search documents…"
                  className={`${inputClass} pl-8`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Project</label>
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={inputClass}>
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.title}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Meeting Type</label>
              <select
                value={meetingTypeFilter}
                onChange={(e) => setMeetingTypeFilter(e.target.value as 'MOM' | 'EDL' | '')}
                className={inputClass}
              >
                <option value="">All Types</option>
                <option value="MOM">MOM</option>
                <option value="EDL">EDL</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Month</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value ? Number(e.target.value) : '')}
                className={inputClass}
              >
                <option value="">All Months</option>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value ? Number(e.target.value) : '')}
                className={inputClass}
              >
                <option value="">All Years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className={`flex min-h-[280px] flex-col items-center justify-center rounded-2xl border p-8 text-center ${themeClasses.glassCard} ${themeClasses.border}`}>
          <Icons.ClipboardList size={40} className={`mb-3 ${themeClasses.textMuted}`} />
          <h3 className={`text-lg font-black ${themeClasses.textPrimary}`}>No Meeting Documents Available</h3>
          <p className={`mt-1 max-w-md text-sm ${themeClasses.textSecondary}`}>
            Upload MOM or EDL documents to start tracking meeting records across your projects.
          </p>
          <button
            type="button"
            onClick={() => openModal('upload')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
          >
            <Icons.Upload size={16} />
            Upload Document
          </button>
        </div>
      ) : (
        <div className={`overflow-hidden rounded-2xl border ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className={isDarkTheme ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}>
                <tr>
                  {['Project', 'Meeting Type', 'Title', 'Meeting Number', 'Meeting Date', 'Version', 'Uploaded By', 'Uploaded On', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className={`border-t ${isDarkTheme ? 'border-white/10' : 'border-slate-100'}`}>
                        {Array.from({ length: 9 }).map((__, j) => (
                          <td key={j} className="px-3 py-3">
                            <div className={`h-4 animate-pulse rounded ${isDarkTheme ? 'bg-white/5' : 'bg-slate-100'}`} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : documents.map((doc) => (
                      <tr key={doc.id} className={`border-t ${isDarkTheme ? 'border-white/10 hover:bg-white/[0.02]' : 'border-slate-100 hover:bg-slate-50/80'}`}>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => void openProjectDocuments(doc.projectName)}
                            className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                          >
                            {doc.projectName}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${meetingTypeBadgeClass(doc.meetingType, isDarkTheme)}`}>
                            {meetingTypeLabel(doc.meetingType)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{doc.title}</td>
                        <td className="px-3 py-2.5">{doc.meetingNumber || '—'}</td>
                        <td className="px-3 py-2.5">{formatMeetingDisplayDate(doc.meetingDate)}</td>
                        <td className="px-3 py-2.5 font-bold">v{doc.version}</td>
                        <td className="px-3 py-2.5">{doc.uploadedBy}</td>
                        <td className="px-3 py-2.5">{formatMeetingDateTime(doc.uploadedOn)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {[
                              { label: 'View', onClick: () => void handleView(doc) },
                              {
                                label: downloadingId === doc.id ? 'Opening…' : 'Download',
                                onClick: () => void handleDownload(doc),
                                disabled: downloadingId === doc.id,
                              },
                              { label: 'Version', onClick: () => openModal('version', doc) },
                              { label: 'Edit', onClick: () => openModal('edit', doc) },
                              { label: 'Delete', onClick: () => openModal('delete', doc), danger: true },
                            ].map((action) => (
                              <button
                                key={action.label}
                                type="button"
                                disabled={Boolean(action.disabled)}
                                onClick={action.onClick}
                                className={`rounded-md border px-2 py-1 text-[10px] font-bold disabled:opacity-50 ${
                                  action.danger
                                    ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className={`flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2.5 sm:px-4 ${isDarkTheme ? 'border-white/10' : 'border-slate-100'}`}>
            <p className={`text-xs ${themeClasses.textSecondary}`}>
              Showing {documents.length} of {totalCount.toLocaleString('en-IN')} documents
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!hasPrevious || page <= 1 || listLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${themeClasses.buttonSecondary}`}
              >
                Previous
              </button>
              <span className={`text-xs font-semibold ${themeClasses.textSecondary}`}>Page {page}</span>
              <button
                type="button"
                disabled={!hasNext || listLoading}
                onClick={() => setPage((p) => p + 1)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${themeClasses.buttonSecondary}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <MeetingDocumentModals
        mode={modalMode}
        document={activeDocument}
        projects={projects}
        projectDocuments={projectDocuments}
        projectDocumentsLoading={projectDocumentsLoading}
        isSaving={modalSaving}
        uploadProgress={uploadProgress}
        error={modalError}
        onClose={closeModal}
        onUpload={handleUpload}
        onEdit={handleEdit}
        onUploadVersion={handleUploadVersion}
        onDelete={handleDelete}
        onDownload={handleDownload}
        downloading={downloadingId != null && activeDocument != null && downloadingId === activeDocument.id}
      />
    </div>
  );
};

export default React.memo(MeetingDocumentsPage);
