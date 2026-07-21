import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Eye,
  ImageIcon,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type {
  FeedbackPriority,
  FeedbackStatus,
  Project,
  ProjectFeedback,
  User,
} from '../../types';
import { getApiErrorMessage } from '../../services/api';
import {
  createFeedback,
  deleteFeedback,
  getFeedbackList,
  updateFeedback,
  updateFeedbackStatus,
  type FeedbackOrdering,
} from '../../services/feedbackService';
import {
  canCreateProjectFeedback,
  canDeleteProjectFeedback,
  canEditFeedbackContent,
  canEditProjectFeedback,
  canUpdateFeedbackStatus,
  feedbackProjectsForUser,
} from '../../utils/projectFeedbackAccess';
import { MONTH_OPTIONS } from '../../utils/healthSafety';
import { ModalPortal } from '../ModalPortal';
import DashboardToastStack, { type DashboardToastItem } from '../DashboardToastStack';
import { getThemeClasses, useTheme } from '../../utils/theme';
import { Icons } from '../Icons';

const PRIORITIES: FeedbackPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES: FeedbackStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];
const ORDERINGS: { value: FeedbackOrdering; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
];

const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_ATTACHMENT_EXT = /\.(jpe?g|png|webp)$/i;
const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024; // 100 MB

const PAGE_SIZE = 10;

function priorityBadgeCls(priority: FeedbackPriority, isDark: boolean): string {
  switch (priority) {
    case 'Critical':
      return isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-700';
    case 'High':
      return isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700';
    case 'Medium':
      return isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700';
    default:
      return isDark ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-100 text-slate-600';
  }
}

function statusBadgeCls(status: FeedbackStatus, isDark: boolean): string {
  switch (status) {
    case 'Resolved':
      return isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
    case 'In Progress':
      return isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700';
    case 'Closed':
      return isDark ? 'bg-slate-500/20 text-slate-300' : 'bg-slate-200 text-slate-600';
    default:
      return isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700';
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function validateAttachment(file: File): string | null {
  const typeOk =
    ALLOWED_ATTACHMENT_TYPES.includes(file.type.toLowerCase()) ||
    ALLOWED_ATTACHMENT_EXT.test(file.name);
  if (!typeOk) {
    return 'Unsupported attachment type. Allowed: JPG, JPEG, PNG, WEBP.';
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return 'Attachment is too large. Maximum size is 100 MB.';
  }
  return null;
}

type FormState = {
  projectId: string;
  issueTitle: string;
  issueDescription: string;
  priority: FeedbackPriority;
  remarks: string;
  status: FeedbackStatus;
  attachment: File | null;
};

const emptyForm = (projectId = ''): FormState => ({
  projectId,
  issueTitle: '',
  issueDescription: '',
  priority: 'Medium',
  remarks: '',
  status: 'Open',
  attachment: null,
});

interface ProjectFeedbackPageProps {
  projects?: Project[];
  currentUser: User;
}

const ProjectFeedbackPage: React.FC<ProjectFeedbackPageProps> = ({
  projects = [],
  currentUser,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accessibleProjects = useMemo(
    () => feedbackProjectsForUser(projects, currentUser),
    [projects, currentUser],
  );

  const canCreate = canCreateProjectFeedback(currentUser.role);
  const canEdit = canEditProjectFeedback(currentUser.role);
  const canEditContent = canEditFeedbackContent(currentUser.role);
  const canDelete = canDeleteProjectFeedback(currentUser.role);
  const canSetStatus = canUpdateFeedbackStatus(currentUser.role);

  // ── Filters ──────────────────────────────────────────────────────────
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [reportedByFilter, setReportedByFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState<number | ''>('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState<FeedbackOrdering>('newest');
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 450);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // ── List state ───────────────────────────────────────────────────────
  const [items, setItems] = useState<ProjectFeedback[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Toasts ───────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<DashboardToastItem[]>([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      const id = ++toastIdRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  // ── Modals ───────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectFeedback | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);

  const [viewItem, setViewItem] = useState<ProjectFeedback | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectFeedback | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFeedbackList({
        project: projectFilter || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        reported_by: reportedByFilter.trim() || undefined,
        month: monthFilter || undefined,
        year: yearFilter || undefined,
        search: search || undefined,
        ordering,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(result.results);
      setCount(result.count);
    } catch (err) {
      setItems([]);
      setCount(0);
      setError(getApiErrorMessage(err, 'Unable to load project feedback.'));
    } finally {
      setLoading(false);
    }
  }, [projectFilter, statusFilter, priorityFilter, reportedByFilter, monthFilter, yearFilter, search, ordering, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // ── Form handlers ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(projectFilter || accessibleProjects[0]?.id || ''));
    setFormError(null);
    setUploadPct(0);
    setAttachmentPreview(null);
    setFormOpen(true);
  };

  const openEdit = (item: ProjectFeedback) => {
    setEditing(item);
    setForm({
      projectId: String(item.projectId || ''),
      issueTitle: item.issueTitle,
      issueDescription: item.issueDescription,
      priority: item.priority,
      remarks: item.remarks,
      status: item.status,
      attachment: null,
    });
    setFormError(null);
    setUploadPct(0);
    setAttachmentPreview(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview(null);
    }
  };

  const handleAttachmentChange = (file: File | null) => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview(null);
    }
    if (!file) {
      setForm((p) => ({ ...p, attachment: null }));
      return;
    }
    const validationError = validateAttachment(file);
    if (validationError) {
      setFormError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFormError(null);
    setForm((p) => ({ ...p, attachment: file }));
    setAttachmentPreview(URL.createObjectURL(file));
  };

  const removeAttachment = () => {
    handleAttachmentChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (editing ? !canEdit : !canCreate) {
      setFormError('You do not have permission to perform this action.');
      return;
    }
    if (!editing) {
      if (!form.projectId) {
        setFormError('Select a project.');
        return;
      }
      if (!form.issueTitle.trim()) {
        setFormError('Issue title is required.');
        return;
      }
      if (!form.issueDescription.trim()) {
        setFormError('Issue description is required.');
        return;
      }
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const payload = canEditContent
          ? {
              issueTitle: form.issueTitle,
              issueDescription: form.issueDescription,
              priority: form.priority,
              remarks: form.remarks,
              attachment: form.attachment,
            }
          : {
              priority: form.priority,
              remarks: form.remarks,
            };
        const { feedback, message, success } = await updateFeedback(
          editing.id,
          payload,
          setUploadPct,
        );
        if (!success) {
          setFormError(message || 'Failed to update feedback.');
          return;
        }
        let updated = feedback;
        if (canSetStatus && form.status !== editing.status) {
          const statusRes = await updateFeedbackStatus(editing.id, form.status);
          if (statusRes.success && statusRes.feedback) updated = statusRes.feedback;
        }
        if (updated) {
          setItems((prev) => prev.map((f) => (f.id === updated!.id ? updated! : f)));
        } else {
          await loadList();
        }
        showToast(message || 'Feedback updated successfully.');
      } else {
        const { feedback, message, success } = await createFeedback(
          {
            projectId: form.projectId,
            issueTitle: form.issueTitle,
            issueDescription: form.issueDescription,
            priority: form.priority,
            attachment: form.attachment,
          },
          setUploadPct,
        );
        if (!success) {
          setFormError(message || 'Failed to submit feedback.');
          return;
        }
        showToast(message || 'Feedback submitted successfully.');
        setPage(1);
        if (feedback && page === 1) {
          setItems((prev) => [feedback, ...prev].slice(0, PAGE_SIZE));
          setCount((prev) => prev + 1);
        } else {
          await loadList();
        }
      }
      closeForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to save feedback.'));
    } finally {
      setSaving(false);
      setUploadPct(0);
    }
  };

  const handleQuickStatus = async (item: ProjectFeedback, status: FeedbackStatus) => {
    if (!canSetStatus || status === item.status) return;
    setStatusSavingId(item.id);
    try {
      const { feedback, message, success } = await updateFeedbackStatus(item.id, status);
      if (!success) {
        showToast(message || 'Failed to update status.', 'error');
        return;
      }
      setItems((prev) =>
        prev.map((f) => (f.id === item.id ? feedback ?? { ...f, status } : f)),
      );
      showToast(message || `Status updated to ${status}.`);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to update status.'), 'error');
    } finally {
      setStatusSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !canDelete) return;
    setDeleting(true);
    try {
      const { message, success } = await deleteFeedback(deleteTarget.id);
      if (!success) {
        showToast(message || 'Failed to delete feedback.', 'error');
        return;
      }
      setItems((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setCount((prev) => Math.max(0, prev - 1));
      if (viewItem?.id === deleteTarget.id) setViewItem(null);
      setDeleteTarget(null);
      showToast(message || 'Feedback deleted successfully.');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to delete feedback.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Styling shortcuts ────────────────────────────────────────────────
  const cardCls = `rounded-2xl border ${
    isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
  }`;
  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`;
  const labelCls = `mb-1 block text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`;

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => current - 4 + i);
  }, []);

  const editingLockedForContent = Boolean(editing) && !canEditContent;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <header
        className={`flex flex-wrap items-end justify-between gap-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${
          isDarkTheme ? 'border-indigo-500/25 bg-indigo-500/10' : 'border-indigo-100 bg-white shadow-sm'
        }`}
      >
        <div>
          <h2 className={`text-xl font-black tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
            Project Feedback
          </h2>
          <p className={`mt-0.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
            Raise, track and resolve project issues
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-500"
          >
            <Plus size={14} />
            New Feedback
          </button>
        )}
      </header>

      {/* Filters */}
      <section className={`${cardCls} p-4 sm:p-5`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <div className="col-span-2 xl:col-span-2">
            <label className={labelCls}>Search</label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Title, description, project…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Project</label>
            <select
              value={projectFilter}
              onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
              className={inputCls}
            >
              <option value="">All</option>
              {accessibleProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className={inputCls}
            >
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className={inputCls}
            >
              <option value="">All</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reported By</label>
            <input
              value={reportedByFilter}
              onChange={(e) => { setReportedByFilter(e.target.value); setPage(1); }}
              placeholder="Username"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Month</label>
            <select
              value={monthFilter}
              onChange={(e) => { setMonthFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
              className={inputCls}
            >
              <option value="">All</option>
              {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <select
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
              className={inputCls}
            >
              <option value="">All</option>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`}>
              Sort
            </label>
            <select
              value={ordering}
              onChange={(e) => { setOrdering(e.target.value as FeedbackOrdering); setPage(1); }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
            >
              {ORDERINGS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void loadList()}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
          >
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* List */}
      <section className={`${cardCls} overflow-hidden`}>
        <div
          className={`flex items-center justify-between border-b px-4 py-3 sm:px-5 ${
            isDarkTheme ? 'border-white/10' : 'border-slate-100'
          }`}
        >
          <h3 className={`text-sm font-black ${themeClasses.textPrimary}`}>
            Feedback ({count})
          </h3>
        </div>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center px-4 py-10 text-center">
            <Icons.Comment size={32} className={isDarkTheme ? 'text-slate-500' : 'text-slate-400'} />
            <p className={`mt-3 text-sm font-semibold ${themeClasses.textSecondary}`}>
              No feedback found.
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Create first feedback
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className={isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}>
                    {['Project', 'Issue Title', 'Priority', 'Status', 'Reported By', 'Created', 'Attachment', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider ${themeClasses.textSecondary}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-t text-sm ${isDarkTheme ? 'border-white/5' : 'border-slate-100'}`}
                    >
                      <td className={`px-4 py-3 font-semibold ${themeClasses.textPrimary}`}>
                        {item.projectName || '—'}
                      </td>
                      <td className={`max-w-[220px] px-4 py-3 ${themeClasses.textPrimary}`}>
                        <button
                          type="button"
                          onClick={() => setViewItem(item)}
                          className="line-clamp-2 text-left font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                        >
                          {item.issueTitle}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${priorityBadgeCls(item.priority, isDarkTheme)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canSetStatus ? (
                          <select
                            value={item.status}
                            disabled={statusSavingId === item.id}
                            onChange={(e) => void handleQuickStatus(item, e.target.value as FeedbackStatus)}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-bold outline-none disabled:opacity-50 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
                          >
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${statusBadgeCls(item.status, isDarkTheme)}`}>
                            {item.status}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs font-semibold ${themeClasses.textSecondary}`}>
                        {item.reportedByUsername || '—'}
                      </td>
                      <td className={`px-4 py-3 text-xs font-semibold ${themeClasses.textSecondary}`}>
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {item.attachmentUrl ? (
                          <a
                            href={item.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-300"
                          >
                            <ImageIcon size={13} /> View
                          </a>
                        ) : (
                          <span className={`text-xs ${themeClasses.textMuted}`}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="View"
                            onClick={() => setViewItem(item)}
                            className={`rounded-lg border p-1.5 ${themeClasses.border} ${themeClasses.textSecondary}`}
                          >
                            <Eye size={13} />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              title="Edit"
                              onClick={() => openEdit(item)}
                              className="rounded-lg border border-indigo-200 p-1.5 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-300"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              title="Delete"
                              onClick={() => setDeleteTarget(item)}
                              className="rounded-lg border border-rose-200 p-1.5 text-rose-600 dark:border-rose-500/30 dark:text-rose-300"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 p-4 sm:hidden">
              {items.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setViewItem(item)}
                      className={`text-left text-sm font-bold ${themeClasses.textPrimary}`}
                    >
                      {item.issueTitle}
                    </button>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${priorityBadgeCls(item.priority, isDarkTheme)}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className={`mt-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                    {item.projectName} · {formatDate(item.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase ${statusBadgeCls(item.status, isDarkTheme)}`}>
                      {item.status}
                    </span>
                    <span className={`text-[10px] ${themeClasses.textMuted}`}>
                      by {item.reportedByUsername || '—'}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewItem(item)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold ${themeClasses.border} ${themeClasses.textSecondary}`}
                    >
                      <Eye size={12} /> View
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2 py-1 text-[10px] font-bold text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-300"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-600 dark:border-rose-500/30 dark:text-rose-300"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between border-t px-4 py-3 sm:px-6 ${themeClasses.border}`}>
                <div className={`text-xs sm:text-sm ${themeClasses.textSecondary}`}>
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, count)} of {count}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`rounded-lg p-2 transition-colors ${themeClasses.buttonSecondary} disabled:opacity-50`}
                  >
                    <Icons.ChevronRight size={16} className="rotate-180" />
                  </button>
                  <span className={`px-3 py-1 text-sm ${themeClasses.textPrimary}`}>
                    {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`rounded-lg p-2 transition-colors ${themeClasses.buttonSecondary} disabled:opacity-50`}
                  >
                    <Icons.ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <DashboardToastStack toasts={toasts} />

      {/* Create / Edit modal */}
      {formOpen && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[100040] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
            <form
              onSubmit={handleSubmit}
              className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-w-lg sm:rounded-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
            >
              <div
                className={`flex items-center justify-between border-b px-4 py-3 ${themeClasses.border} ${
                  isDarkTheme ? 'bg-white/5' : 'bg-indigo-50/80'
                }`}
              >
                <h3 className={`text-sm font-bold ${themeClasses.textPrimary}`}>
                  {editing ? 'Edit Feedback' : 'Create Feedback'}
                </h3>
                <button type="button" onClick={closeForm} className={`rounded-lg p-1 ${themeClasses.textSecondary}`}>
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {!editing && (
                  <div>
                    <label className={labelCls}>Project *</label>
                    <select
                      value={form.projectId}
                      onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))}
                      className={inputCls}
                      required
                    >
                      <option value="">Select project…</option>
                      {accessibleProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!editingLockedForContent && (
                  <>
                    <div>
                      <label className={labelCls}>Issue Title *</label>
                      <input
                        value={form.issueTitle}
                        onChange={(e) => setForm((p) => ({ ...p, issueTitle: e.target.value }))}
                        className={inputCls}
                        placeholder="e.g. Waterproofing failure at basement slab"
                        required
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Issue Description *</label>
                      <textarea
                        value={form.issueDescription}
                        onChange={(e) => setForm((p) => ({ ...p, issueDescription: e.target.value }))}
                        rows={4}
                        className={`${inputCls} resize-y`}
                        placeholder="Describe the issue in detail…"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className={labelCls}>Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as FeedbackPriority }))}
                    className={inputCls}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {editing && (
                  <div>
                    <label className={labelCls}>Remarks</label>
                    <textarea
                      value={form.remarks}
                      onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                      rows={3}
                      className={`${inputCls} resize-y`}
                      placeholder="Add remarks…"
                    />
                  </div>
                )}

                {editing && canSetStatus && (
                  <div>
                    <label className={labelCls}>Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as FeedbackStatus }))}
                      className={inputCls}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {!editingLockedForContent && (
                  <div>
                    <label className={labelCls}>
                      Attachment (JPG, JPEG, PNG, WEBP · max 100 MB)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(e) => handleAttachmentChange(e.target.files?.[0] ?? null)}
                      className={`w-full rounded-xl border px-3 py-2 text-xs ${themeClasses.border} ${themeClasses.textSecondary}`}
                    />
                    {attachmentPreview && (
                      <div className="relative mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                        <img
                          src={attachmentPreview}
                          alt="Attachment preview"
                          className="max-h-48 w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={removeAttachment}
                          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-500"
                        >
                          <X size={11} /> Remove Image
                        </button>
                      </div>
                    )}
                    {editing?.attachmentUrl && !attachmentPreview && (
                      <p className={`mt-1.5 text-[11px] ${themeClasses.textMuted}`}>
                        Existing attachment is kept unless a new image is chosen.
                      </p>
                    )}
                  </div>
                )}

                {formError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    {formError}
                  </div>
                )}

                {saving && uploadPct > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                )}
              </div>

              <div className={`flex items-center justify-end gap-2 border-t px-4 py-3 ${themeClasses.border}`}>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {saving && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {editing ? 'Save Changes' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}

      {/* View modal */}
      {viewItem && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[100040] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
            <div
              className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-w-xl sm:rounded-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
            >
              <div
                className={`flex items-center justify-between border-b px-4 py-3 ${themeClasses.border} ${
                  isDarkTheme ? 'bg-white/5' : 'bg-indigo-50/80'
                }`}
              >
                <h3 className={`text-sm font-bold ${themeClasses.textPrimary}`}>Feedback Details</h3>
                <button type="button" onClick={() => setViewItem(null)} className={`rounded-lg p-1 ${themeClasses.textSecondary}`}>
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${priorityBadgeCls(viewItem.priority, isDarkTheme)}`}>
                    {viewItem.priority}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${statusBadgeCls(viewItem.status, isDarkTheme)}`}>
                    {viewItem.status}
                  </span>
                </div>
                <div>
                  <h4 className={`text-base font-black ${themeClasses.textPrimary}`}>{viewItem.issueTitle}</h4>
                  <p className={`mt-0.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                    {viewItem.projectName}
                  </p>
                </div>
                <div>
                  <p className={labelCls}>Description</p>
                  <p className={`whitespace-pre-wrap text-sm ${themeClasses.textPrimary}`}>
                    {viewItem.issueDescription || '—'}
                  </p>
                </div>
                <div>
                  <p className={labelCls}>Remarks</p>
                  <p className={`whitespace-pre-wrap text-sm ${themeClasses.textPrimary}`}>
                    {viewItem.remarks || '—'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                  {[
                    ['Reported By', viewItem.reportedByUsername ? `${viewItem.reportedByUsername}${viewItem.reportedByRole ? ` (${viewItem.reportedByRole})` : ''}` : '—'],
                    ['Created At', formatDate(viewItem.createdAt)],
                    ['Updated At', formatDate(viewItem.updatedAt)],
                    ['Resolved At', formatDate(viewItem.resolvedAt)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className={labelCls}>{label}</p>
                      <p className={`text-sm font-semibold ${themeClasses.textPrimary}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className={labelCls}>Attachment</p>
                  {viewItem.attachmentUrl ? (
                    <a
                      href={viewItem.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open full size in new tab"
                      className="block overflow-hidden rounded-xl border border-slate-200 dark:border-white/10"
                    >
                      <img
                        src={viewItem.attachmentUrl}
                        alt={viewItem.attachmentName || viewItem.issueTitle}
                        loading="lazy"
                        className="max-h-64 w-full object-contain"
                      />
                    </a>
                  ) : (
                    <p className={`text-sm ${themeClasses.textMuted}`}>No attachment uploaded.</p>
                  )}
                </div>
              </div>

              <div className={`flex items-center justify-end gap-2 border-t px-4 py-3 ${themeClasses.border}`}>
                {viewItem.attachmentUrl && (
                  <a
                    href={viewItem.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                  >
                    <Download size={13} /> Open Attachment
                  </a>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => { const item = viewItem; setViewItem(null); openEdit(item); }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[100045] flex items-center justify-center bg-black/50 p-4">
            <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}>
              <h3 className={`text-sm font-black ${themeClasses.textPrimary}`}>Delete Feedback</h3>
              <p className={`mt-2 text-sm ${themeClasses.textSecondary}`}>
                Are you sure you want to delete this feedback?
              </p>
              <p className={`mt-1 text-xs font-semibold ${themeClasses.textMuted}`}>
                “{deleteTarget.issueTitle}”
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-60"
                >
                  {deleting && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ProjectFeedbackPage;
