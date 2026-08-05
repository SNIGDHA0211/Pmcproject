import React, { useCallback, useEffect, useState } from 'react';
import type { UserRole } from '../../types';
import { useTheme, getThemeClasses } from '../../utils/theme';
import { getProjectDatesSectionAccess } from '../../utils/pmcRoleAccess';
import { formatIsoDateLabel } from '../../utils/format';
import { ModalPortal } from '../ModalPortal';
import {
  projectEotApi,
  getProjectEotErrorMessage,
  normalizeProjectEotSummary,
  type ProjectEotHistoryItem,
  type ProjectEotPayload,
  type ProjectEotStatus,
  type ProjectEotSummary,
} from '../../services/projectEotApi';

export type ProjectEotSeedDates = {
  project_start?: string | null;
  contract_finish?: string | null;
  forecast_finish?: string | null;
  eot_date?: string | null;
};

type FormState = {
  project_start: string;
  contract_finish: string;
  forecast_finish: string;
  eot_date: string;
  extension_days: string;
  reason: string;
  remarks: string;
  status: ProjectEotStatus;
  approval_date: string;
  supporting_document: File | null;
};

const STATUS_OPTIONS: { value: ProjectEotStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function toInputDate(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function displayDate(value: string | null | undefined): string {
  return formatIsoDateLabel(value);
}

function statusBadgeClass(status: string, isDark: boolean): string {
  const s = status.toLowerCase();
  if (s === 'approved') {
    return isDark
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (s === 'rejected') {
    return isDark
      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      : 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (s === 'submitted' || s === 'pending') {
    return isDark
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : 'bg-amber-50 text-amber-800 border-amber-200';
  }
  return isDark
    ? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    : 'bg-slate-100 text-slate-700 border-slate-200';
}

function emptyForm(seed?: ProjectEotSeedDates | null): FormState {
  return {
    project_start: toInputDate(seed?.project_start),
    contract_finish: toInputDate(seed?.contract_finish),
    forecast_finish: toInputDate(seed?.forecast_finish),
    eot_date: toInputDate(seed?.eot_date),
    extension_days: '',
    reason: '',
    remarks: '',
    status: 'draft',
    approval_date: '',
    supporting_document: null,
  };
}

function formFromHistory(
  item: ProjectEotHistoryItem,
  seed?: ProjectEotSeedDates | null,
): FormState {
  return {
    project_start: toInputDate(item.project_start ?? seed?.project_start),
    contract_finish: toInputDate(item.contract_finish ?? seed?.contract_finish),
    forecast_finish: toInputDate(item.forecast_finish ?? seed?.forecast_finish),
    eot_date: toInputDate(item.eot_date ?? seed?.eot_date),
    extension_days:
      item.extension_days != null && item.extension_days !== 0
        ? String(item.extension_days)
        : '',
    reason: item.reason || '',
    remarks: item.remarks || '',
    status: item.status || 'draft',
    approval_date: toInputDate(item.approval_date),
    supporting_document: null,
  };
}

interface ProjectEotSectionProps {
  projectName: string;
  role: UserRole;
  /** Prefill schedule dates from existing Project Dates (SCL) without mutating dates state. */
  seedDates?: ProjectEotSeedDates | null;
  className?: string;
  compact?: boolean;
}

const ProjectEotSection: React.FC<ProjectEotSectionProps> = ({
  projectName,
  role,
  seedDates = null,
  className = '',
  compact = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const access = getProjectDatesSectionAccess(role);
  const canManage = access.canEditDates;

  const [summary, setSummary] = useState<ProjectEotSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectEotHistoryItem | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(() => emptyForm(seedDates));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadSummary = useCallback(async () => {
    const name = projectName?.trim();
    if (!name) {
      setSummary(null);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    setForbidden(false);
    try {
      const res = await projectEotApi.getProjectEOTSummary(name);
      setSummary(normalizeProjectEotSummary(res.data, name));
    } catch (err: unknown) {
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 403) {
        setForbidden(true);
        setLoadError(null);
        setSummary(null);
      } else if (status === 404) {
        setSummary({
          project_name: name,
          current_eot: null,
          latest_completion_date: null,
          total_eot_count: 0,
          eot_history: [],
        });
      } else {
        setLoadError(getProjectEotErrorMessage(err, 'Failed to load EOT summary'));
        setSummary(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectName]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm(seedDates));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: ProjectEotHistoryItem) => {
    setEditingItem(item);
    setForm(formFromHistory(item, seedDates));
    setFormError(null);
    setModalOpen(true);
  };

  const buildPayload = (): ProjectEotPayload | null => {
    const name = projectName.trim();
    if (!name) {
      setFormError('Project name is required.');
      return null;
    }
    const extensionDays = Number(form.extension_days);
    if (!Number.isFinite(extensionDays) || extensionDays <= 0) {
      setFormError('Extension Days must be greater than 0.');
      return null;
    }
    if (
      String(form.status).toLowerCase() === 'approved' &&
      !form.approval_date
    ) {
      setFormError('Approval Date is required when status is approved.');
      return null;
    }
    if (
      !form.project_start ||
      !form.contract_finish ||
      !form.forecast_finish ||
      !form.eot_date
    ) {
      setFormError('All schedule dates are required.');
      return null;
    }

    return {
      project_name: name,
      date_type: 'SCL',
      contractor_id: null,
      project_start: form.project_start,
      contract_finish: form.contract_finish,
      forecast_finish: form.forecast_finish,
      eot_date: form.eot_date,
      extension_days: extensionDays,
      reason: form.reason,
      remarks: form.remarks,
      status: form.status,
      approval_date: form.approval_date || null,
      supporting_document: form.supporting_document,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingItem) {
        await projectEotApi.updateProjectEOT(editingItem.id, payload);
      } else {
        await projectEotApi.createProjectEOT(payload);
      }
      setModalOpen(false);
      setEditingItem(null);
      await loadSummary();
    } catch (err) {
      setFormError(getProjectEotErrorMessage(err, 'Failed to save EOT'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ProjectEotHistoryItem) => {
    if (!canManage) return;
    const label = item.eot_no != null ? `EOT #${item.eot_no}` : `EOT ${item.id}`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setDeletingId(item.id);
    try {
      await projectEotApi.deleteProjectEOT(item.id);
      await loadSummary();
    } catch (err) {
      window.alert(getProjectEotErrorMessage(err, 'Failed to delete EOT'));
    } finally {
      setDeletingId(null);
    }
  };

  if (!projectName?.trim()) return null;
  if (forbidden) return null;

  const currentEotDate = summary?.current_eot?.eot_date ?? null;
  const currentStatus = summary?.current_eot?.status ?? null;
  const history = summary?.eot_history ?? [];

  return (
    <div
      className={`${themeClasses.glassCard} rounded-2xl border ${themeClasses.border} shadow-sm ${compact ? 'p-4' : 'p-5 sm:p-6'} ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}
          >
            Extension of Time (EOT)
          </h3>
          <p className={`mt-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
            Current EOT summary and history for this project
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition-colors hover:bg-blue-500"
          >
            Add New EOT
          </button>
        )}
      </div>

      {isLoading && !summary ? (
        <p className={`text-sm font-bold ${themeClasses.textSecondary}`}>
          Loading EOT…
        </p>
      ) : loadError ? (
        <div className="space-y-2">
          <p className="text-sm font-bold text-rose-500">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'}`}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
              >
                Current EOT Date
              </p>
              <p className={`mt-1 text-lg font-black ${themeClasses.textPrimary}`}>
                {displayDate(currentEotDate)}
              </p>
            </div>
            <div
              className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
              >
                Latest Completion Date
              </p>
              <p className={`mt-1 text-lg font-black ${themeClasses.textPrimary}`}>
                {displayDate(summary?.latest_completion_date)}
              </p>
            </div>
            <div
              className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
              >
                Total EOTs
              </p>
              <p className={`mt-1 text-lg font-black ${themeClasses.textPrimary}`}>
                {summary?.total_eot_count ?? 0}
              </p>
            </div>
            <div
              className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
              >
                Status
              </p>
              <div className="mt-2">
                {currentStatus ? (
                  <span
                    className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusBadgeClass(String(currentStatus), isDarkTheme)}`}
                  >
                    {String(currentStatus)}
                  </span>
                ) : (
                  <p className={`text-lg font-black ${themeClasses.textPrimary}`}>
                    —
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between gap-2">
            <h4
              className={`text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}
            >
              EOT History
            </h4>
            <button
              type="button"
              onClick={() => void loadSummary()}
              className={`text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary} hover:underline`}
            >
              Refresh
            </button>
          </div>

          {history.length === 0 ? (
            <p className={`text-sm font-semibold ${themeClasses.textSecondary}`}>
              No EOT records yet.
            </p>
          ) : (
            <div className={`overflow-x-auto rounded-xl border ${themeClasses.border}`}>
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr
                    className={`border-b text-[10px] font-black uppercase tracking-widest ${themeClasses.border} ${themeClasses.textSecondary} ${isDarkTheme ? 'bg-white/[0.03]' : 'bg-slate-50'}`}
                  >
                    <th className="px-3 py-2.5">EOT No</th>
                    <th className="px-3 py-2.5">EOT Date</th>
                    <th className="px-3 py-2.5">Extension Days</th>
                    <th className="px-3 py-2.5">Reason</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Approval Date</th>
                    <th className="px-3 py-2.5">Remarks</th>
                    <th className="px-3 py-2.5">Supporting Document</th>
                    <th className="px-3 py-2.5">Created At</th>
                    {canManage && <th className="px-3 py-2.5">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b last:border-0 ${themeClasses.border}`}
                    >
                      <td
                        className={`px-3 py-2.5 font-bold ${themeClasses.textPrimary}`}
                      >
                        {row.eot_no ?? row.id}
                      </td>
                      <td className={`px-3 py-2.5 ${themeClasses.textPrimary}`}>
                        {displayDate(row.eot_date)}
                      </td>
                      <td className={`px-3 py-2.5 ${themeClasses.textPrimary}`}>
                        {row.extension_days || '—'}
                      </td>
                      <td
                        className={`max-w-[180px] truncate px-3 py-2.5 ${themeClasses.textSecondary}`}
                        title={row.reason || undefined}
                      >
                        {row.reason || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${statusBadgeClass(String(row.status), isDarkTheme)}`}
                        >
                          {row.status || '—'}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 ${themeClasses.textPrimary}`}>
                        {displayDate(row.approval_date)}
                      </td>
                      <td
                        className={`max-w-[160px] truncate px-3 py-2.5 ${themeClasses.textSecondary}`}
                        title={row.remarks || undefined}
                      >
                        {row.remarks || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.supporting_document_url ? (
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={row.supporting_document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              View
                            </a>
                            <a
                              href={row.supporting_document_url}
                              download
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              Download
                            </a>
                          </div>
                        ) : (
                          <span className={`text-xs ${themeClasses.textSecondary}`}>
                            No Document
                          </span>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 text-xs ${themeClasses.textSecondary}`}>
                        {displayDate(row.created_at)}
                      </td>
                      {canManage && (
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === row.id}
                              onClick={() => void handleDelete(row)}
                              className="rounded-lg bg-rose-600/10 px-2 py-1 text-[10px] font-black uppercase text-rose-600 hover:bg-rose-600/20 disabled:opacity-50"
                            >
                              {deletingId === row.id ? '…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ModalPortal open={modalOpen}>
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div
            className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3
                  className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}
                >
                  {editingItem ? 'Edit EOT' : 'Add New EOT'}
                </h3>
                <p className={`mt-1 text-[11px] ${themeClasses.textSecondary}`}>
                  Uses legacy Project Dates field names. Extension metadata is
                  stored via the Multi-EOT API.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
              >
                Close
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    ['project_start', 'Project Start'],
                    ['contract_finish', 'Contract Finish'],
                    ['forecast_finish', 'Forecast Finish'],
                    ['eot_date', 'EOT Date'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label
                      className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                    >
                      {label}
                    </label>
                    <input
                      type="date"
                      required
                      value={form[key]}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.border}`}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                  >
                    Extension Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.extension_days}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        extension_days: e.target.value,
                      }))
                    }
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.border}`}
                  />
                </div>
                <div>
                  <label
                    className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                  >
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as ProjectEotStatus,
                      }))
                    }
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.border}`}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                  >
                    Approval Date
                    {String(form.status).toLowerCase() === 'approved'
                      ? ' *'
                      : ''}
                  </label>
                  <input
                    type="date"
                    required={String(form.status).toLowerCase() === 'approved'}
                    value={form.approval_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        approval_date: e.target.value,
                      }))
                    }
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.border}`}
                  />
                </div>
                <div>
                  <label
                    className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                  >
                    Supporting Document
                  </label>
                  <input
                    type="file"
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        supporting_document: e.target.files?.[0] ?? null,
                      }))
                    }
                    className={`w-full rounded-2xl border px-4 py-2.5 text-sm outline-none ${themeClasses.input} ${themeClasses.border}`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                >
                  Reason
                </label>
                <textarea
                  rows={2}
                  value={form.reason}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none ${themeClasses.input} ${themeClasses.border}`}
                />
              </div>

              <div>
                <label
                  className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}
                >
                  Remarks
                </label>
                <textarea
                  rows={2}
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, remarks: e.target.value }))
                  }
                  className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none ${themeClasses.input} ${themeClasses.border}`}
                />
              </div>

              {formError && (
                <p className="whitespace-pre-wrap text-[11px] font-bold text-rose-500">
                  {formError}
                </p>
              )}

              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSaving}
                  className={`flex-1 rounded-2xl px-4 py-3 font-bold transition-colors ${isDarkTheme ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                >
                  {isSaving
                    ? 'Saving…'
                    : editingItem
                      ? 'Update EOT'
                      : 'Create EOT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default ProjectEotSection;
