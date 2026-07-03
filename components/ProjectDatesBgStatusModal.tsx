import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, ShieldCheck, ShieldPlus, Trash2 } from 'lucide-react';
import { getApiErrorMessage, projectDatesApi } from '../services/api';
import type {
  BgEntryType,
  BgStatusBundle,
  BGEntry,
  CreateBGPayload,
  UpdateBGPayload,
} from '../types/bgStatus';
import { ModalPortal } from './ModalPortal';
import { Icons } from './Icons';
import { getThemeClasses, useTheme } from '../utils/theme';
import {
  bgStatusLabel,
  bgStatusToneClasses,
  emptyBgStatusBundle,
  formatBgDisplayDate,
  pickLatestUpdatedBgEntry,
  sortBgEntriesForDisplay,
  toDateInputValue,
} from '../utils/bgStatusDisplay';

export type BgModalScope =
  | { mode: 'all' }
  | { mode: 'SCL' }
  | { mode: 'CONTRACTOR'; contractorName: string };

interface ProjectDatesBgStatusModalProps {
  open: boolean;
  projectName: string;
  initialBundle?: BgStatusBundle | null;
  scope?: BgModalScope;
  contractorOptions?: string[];
  onClose: () => void;
  onSaved: (bundle: BgStatusBundle) => void;
}

type FormMode = 'add' | 'edit';

interface BgFormState {
  bg_type: BgEntryType;
  bg_name: string;
  due_date: string;
  updated_date: string;
  remarks: string;
  contractor_name: string;
}

const emptyForm = (bgType: BgEntryType = 'CONTRACTOR', contractorName = ''): BgFormState => ({
  bg_type: bgType,
  bg_name: '',
  due_date: '',
  updated_date: '',
  remarks: '',
  contractor_name: contractorName,
});

function formFromEntry(entry: BGEntry): BgFormState {
  return {
    bg_type: entry.bg_type,
    bg_name: entry.bg_name,
    due_date: toDateInputValue(entry.due_date),
    updated_date: toDateInputValue(entry.updated_date),
    remarks: entry.remarks ?? '',
    contractor_name: entry.contractor_name ?? '',
  };
}

const SUMMARY_ITEMS = [
  { key: 'total_bg' as const, label: 'Total BG' },
  { key: 'updated' as const, label: 'Updated' },
  { key: 'yet_to_update' as const, label: 'Yet To Update' },
  { key: 'not_updated' as const, label: 'Not Updated' },
];

const ProjectDatesBgStatusModal: React.FC<ProjectDatesBgStatusModalProps> = ({
  open,
  projectName,
  initialBundle,
  scope = { mode: 'all' },
  contractorOptions = [],
  onClose,
  onSaved,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [bundle, setBundle] = useState<BgStatusBundle>(emptyBgStatusBundle());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [editingEntry, setEditingEntry] = useState<BGEntry | null>(null);
  const [form, setForm] = useState<BgFormState>(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<BgEntryType, boolean>>({
    SCL: false,
    CONTRACTOR: false,
  });
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const formPanelRef = useRef<HTMLFormElement>(null);

  const loadBundle = useCallback(async () => {
    if (!projectName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectDatesApi.getBgStatusBundle(projectName);
      setBundle(res.data ?? emptyBgStatusBundle());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load BG status.'));
      setBundle(initialBundle ?? emptyBgStatusBundle());
    } finally {
      setLoading(false);
    }
  }, [projectName, initialBundle]);

  useEffect(() => {
    if (open) {
      setFormMode(null);
      setEditingEntry(null);
      setDeleteConfirmId(null);
      setExpandedSections({ SCL: false, CONTRACTOR: false });
      setForm(emptyForm());
      if (initialBundle) {
        setBundle(initialBundle);
      }
      void loadBundle();
    }
  }, [open, initialBundle, loadBundle]);

  useEffect(() => {
    if (!formMode) return;
    scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [formMode, editingEntry?.id]);

  const labelCls = `mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`;
  const inputCls = `w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-blue-500/40 ${themeClasses.input} ${themeClasses.border}`;
  const sectionCls = `rounded-2xl border p-4 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'}`;
  const tableHeadCls = `text-left text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`;
  const tableCellCls = `py-2.5 text-sm font-semibold ${themeClasses.textPrimary}`;

  const openAddForm = (bgType: BgEntryType, contractorName = '') => {
    setFormMode('add');
    setEditingEntry(null);
    setForm(
      emptyForm(
        bgType,
        bgType === 'CONTRACTOR'
          ? contractorName || (scope.mode === 'CONTRACTOR' ? scope.contractorName : '')
          : '',
      ),
    );
    setError(null);
  };

  const openEditForm = (entry: BGEntry) => {
    setFormMode('edit');
    setEditingEntry(entry);
    setForm(formFromEntry(entry));
    setError(null);
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingEntry(null);
    setForm(emptyForm());
    setError(null);
  };

  const refreshAndNotify = async () => {
    const res = await projectDatesApi.getBgStatusBundle(projectName);
    const next = res.data ?? emptyBgStatusBundle();
    setBundle(next);
    onSaved(next);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName) return;
    if (!form.bg_name.trim()) {
      setError('BG Name is required.');
      return;
    }
    if (!form.due_date) {
      setError('Due Date is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (formMode === 'edit' && editingEntry) {
        const payload: UpdateBGPayload = {
          bg_name: form.bg_name.trim(),
          due_date: form.due_date,
          updated_date: form.updated_date || null,
          remarks: form.remarks.trim(),
        };
        await projectDatesApi.patchBgEntry(editingEntry.id, payload);
      } else {
        const payload: CreateBGPayload = {
          bg_type: form.bg_type,
          bg_name: form.bg_name.trim(),
          due_date: form.due_date,
          updated_date: form.updated_date || null,
          remarks: form.remarks.trim(),
          ...(form.bg_type === 'CONTRACTOR' && form.contractor_name.trim()
            ? { contractor_name: form.contractor_name.trim() }
            : {}),
        };
        await projectDatesApi.createBgEntry(projectName, payload);
      }
      closeForm();
      await refreshAndNotify();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save BG entry.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    setError(null);
    try {
      await projectDatesApi.deleteBgEntry(id);
      setDeleteConfirmId(null);
      await refreshAndNotify();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete BG entry.'));
    } finally {
      setSaving(false);
    }
  };

  const renderBgForm = () => (
    <form
      ref={formPanelRef}
      onSubmit={handleFormSubmit}
      className={`rounded-2xl border p-4 sm:p-5 ${isDarkTheme ? 'border-blue-500/30 bg-blue-500/5' : 'border-blue-200 bg-blue-50/50'}`}
    >
      <p className={`mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide ${themeClasses.textPrimary}`}>
        {formMode === 'edit' ? (
          <>
            <Pencil size={14} strokeWidth={2.5} />
            Edit BG Entry
          </>
        ) : (
          <>
            <ShieldPlus size={14} strokeWidth={2.5} />
            Add BG Entry
          </>
        )}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>BG Type</label>
          <select
            value={form.bg_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                bg_type: e.target.value as BgEntryType,
              }))
            }
            disabled={formMode === 'edit'}
            className={inputCls}
          >
            <option value="CONTRACTOR">Contractor</option>
            <option value="SCL">SCL</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>BG Name</label>
          <input
            type="text"
            value={form.bg_name}
            onChange={(e) => setForm((prev) => ({ ...prev, bg_name: e.target.value }))}
            className={inputCls}
            placeholder="e.g. Performance BG"
            required
          />
        </div>
        {form.bg_type === 'CONTRACTOR' && (
          <div>
            <label className={labelCls}>Contractor</label>
            {contractorOptions.length > 0 ? (
              <select
                value={form.contractor_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contractor_name: e.target.value }))
                }
                className={inputCls}
                required
                disabled={formMode === 'edit'}
              >
                <option value="">Select contractor</option>
                {contractorOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.contractor_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contractor_name: e.target.value }))
                }
                className={inputCls}
                placeholder="Contractor name"
                required
                disabled={formMode === 'edit' || scope.mode === 'CONTRACTOR'}
              />
            )}
          </div>
        )}
        <div>
          <label className={labelCls}>Due Date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Updated Date (optional)</label>
          <input
            type="date"
            value={form.updated_date}
            onChange={(e) => setForm((prev) => ({ ...prev, updated_date: e.target.value }))}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Remarks (optional)</label>
          <textarea
            value={form.remarks}
            onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
            rows={2}
            className={inputCls}
            placeholder="Optional notes"
          />
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={closeForm}
          disabled={saving}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'}`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {formMode === 'edit' ? (
            <>
              <Pencil size={15} strokeWidth={2.5} />
              {saving ? 'Saving…' : 'Update BG'}
            </>
          ) : (
            <>
              <ShieldPlus size={15} strokeWidth={2.5} />
              {saving ? 'Saving…' : 'Add BG'}
            </>
          )}
        </button>
      </div>
    </form>
  );

  const renderStatusBadge = (status: BGEntry['status']) => (
    <span
      className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${bgStatusToneClasses(status, isDarkTheme)}`}
    >
      {bgStatusLabel(status)}
    </span>
  );

  const renderTable = (
    party: BgEntryType,
    entries: BGEntry[],
    defaultContractorName = '',
  ) => {
    const partyLabel = party === 'SCL' ? 'SCL Bank Guarantee' : 'Contractor Bank Guarantee';
    const badge = party === 'SCL' ? 'SC' : 'CO';
    const badgeCls =
      party === 'SCL'
        ? isDarkTheme
          ? 'bg-blue-500/20 text-blue-300'
          : 'bg-blue-100 text-blue-700'
        : isDarkTheme
          ? 'bg-violet-500/20 text-violet-300'
          : 'bg-violet-100 text-violet-700';

    const sorted = sortBgEntriesForDisplay(entries);
    const expanded = expandedSections[party];
    const latest = pickLatestUpdatedBgEntry(entries);
    const displayEntries =
      expanded || entries.length <= 1
        ? sorted
        : latest
          ? [latest]
          : sorted.slice(0, 1);
    const hiddenCount = entries.length - displayEntries.length;

    const toggleExpanded = () => {
      setExpandedSections((prev) => ({ ...prev, [party]: !prev[party] }));
    };

    return (
      <div className={sectionCls}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={`flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide ${themeClasses.textPrimary}`}>
              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold ${badgeCls}`}>
                {badge}
              </span>
              {partyLabel}
              {entries.length > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${bgStatusToneClasses(latest?.status ?? entries[0]?.status, isDarkTheme)}`}>
                  {entries.length} total
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {entries.length > 1 && (
              <button
                type="button"
                onClick={toggleExpanded}
                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  isDarkTheme
                    ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {expanded ? (
                  <>
                    <ChevronUp size={12} />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} />
                    Show all ({entries.length})
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => openAddForm(party, defaultContractorName)}
              disabled={saving || loading}
              title={`Add ${party === 'SCL' ? 'SCL' : 'Contractor'} bank guarantee`}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.02] disabled:opacity-50 ${isDarkTheme
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
            >
              <ShieldPlus size={14} strokeWidth={2.5} />
              Add BG
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-5">
            <p className={`text-center text-sm font-medium ${themeClasses.textSecondary}`}>
              No {party === 'SCL' ? 'SCL' : 'Contractor'} BG entries yet.
            </p>
            <button
              type="button"
              onClick={() => openAddForm(party, defaultContractorName)}
              disabled={saving || loading}
              title={`Add ${party === 'SCL' ? 'SCL' : 'Contractor'} bank guarantee`}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all hover:scale-[1.02] disabled:opacity-50 ${isDarkTheme
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
            >
              <ShieldPlus size={15} strokeWidth={2.5} />
              Add First BG
            </button>
          </div>
        ) : (
          <>
            {!expanded && entries.length > 1 && (
              <p className={`mb-2 text-[10px] font-semibold uppercase tracking-wide ${isDarkTheme ? 'text-indigo-300/80' : 'text-indigo-600'}`}>
                Latest update
              </p>
            )}
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[36rem] border-collapse">
                <thead>
                  <tr className={`border-b ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
                    <th className={`pb-2 pr-3 ${tableHeadCls}`}>BG Name</th>
                    <th className={`pb-2 pr-3 ${tableHeadCls}`}>Due Date</th>
                    <th className={`pb-2 pr-3 ${tableHeadCls}`}>Updated Date</th>
                    <th className={`pb-2 pr-3 ${tableHeadCls}`}>Status</th>
                    <th className={`pb-2 text-right ${tableHeadCls}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`border-b last:border-0 ${isDarkTheme ? 'border-white/5' : 'border-slate-100'}`}
                    >
                      <td className={`max-w-[14rem] pr-3 ${tableCellCls}`}>
                        <span className="line-clamp-2 sm:line-clamp-none">{entry.bg_name}</span>
                      </td>
                      <td className={`whitespace-nowrap pr-3 tabular-nums ${tableCellCls}`}>
                        {formatBgDisplayDate(entry.due_date)}
                      </td>
                      <td className={`whitespace-nowrap pr-3 tabular-nums ${tableCellCls}`}>
                        {formatBgDisplayDate(entry.updated_date)}
                      </td>
                      <td className="pr-3">{renderStatusBadge(entry.status)}</td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(entry)}
                            disabled={saving}
                            title="Edit"
                            className={`rounded-lg p-1.5 transition-colors ${isDarkTheme
                                ? 'text-blue-400 hover:bg-white/10'
                                : 'text-blue-600 hover:bg-blue-50'
                              }`}
                          >
                            <Pencil size={14} strokeWidth={2} />
                          </button>
                          {deleteConfirmId === entry.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDelete(entry.id)}
                                disabled={saving}
                                className="rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-bold text-white"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={saving}
                                className={`rounded-lg px-2 py-1 text-[10px] font-bold ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(entry.id)}
                              disabled={saving}
                              title="Delete"
                              className={`rounded-lg p-1.5 transition-colors ${isDarkTheme
                                  ? 'text-rose-400 hover:bg-white/10'
                                  : 'text-rose-600 hover:bg-rose-50'
                                }`}
                            >
                              <Trash2 size={14} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!expanded && hiddenCount > 0 && (
              <button
                type="button"
                onClick={toggleExpanded}
                className={`mt-2 w-full rounded-lg py-2 text-center text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  isDarkTheme
                    ? 'text-indigo-300 hover:bg-indigo-500/10'
                    : 'text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                + {hiddenCount} more — Show all ({entries.length})
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  if (!open) return null;

  const summary = bundle.bg_summary;
  const scopedContractorEntries =
    scope.mode === 'CONTRACTOR'
      ? bundle.contractor_bg.filter((entry) => {
          const name = scope.contractorName.trim().toLowerCase();
          if (!name) return true;
          return (
            entry.contractor_name?.trim().toLowerCase() === name ||
            (!entry.contractor_name && bundle.contractor_bg.length <= 1)
          );
        })
      : bundle.contractor_bg;

  const showScl = scope.mode === 'all' || scope.mode === 'SCL';
  const showContractor = scope.mode === 'all' || scope.mode === 'CONTRACTOR';
  const scopeSubtitle =
    scope.mode === 'SCL'
      ? `${projectName} — SCL bank guarantees`
      : scope.mode === 'CONTRACTOR'
        ? `${projectName} — ${scope.contractorName}`
        : `${projectName} — manage SCL & Contractor BG entries`;

  const defaultContractorForAdd =
    scope.mode === 'CONTRACTOR' ? scope.contractorName : contractorOptions[0] ?? '';

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div
          className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}
        >
          <div
            className={`flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3 sm:px-6 ${themeClasses.border} ${isDarkTheme ? 'bg-blue-600/10' : 'bg-blue-50/70'}`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${isDarkTheme ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-blue-100 text-blue-600 ring-1 ring-blue-200'}`}
              >
                <ShieldCheck size={18} strokeWidth={2} className="sm:hidden" />
                <ShieldCheck size={20} strokeWidth={2} className="hidden sm:block" />
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0">
                <h3 className={`text-sm font-bold sm:text-lg ${themeClasses.textPrimary}`}>
                  Bank Guarantee Status
                </h3>
                <span className={`hidden text-xs sm:inline ${themeClasses.textMuted}`}>·</span>
                <p className={`min-w-0 truncate text-xs ${themeClasses.textSecondary}`}>
                  {scopeSubtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 rounded-xl p-2 ${isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              aria-label="Close"
            >
              <Icons.Close size={18} />
            </button>
          </div>

          <div ref={scrollBodyRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {loading ? (
              <div className={`rounded-2xl border p-8 text-center text-sm font-semibold ${themeClasses.border} ${themeClasses.textSecondary}`}>
                Loading BG status…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {SUMMARY_ITEMS.map(({ key, label }) => (
                    <div
                      key={key}
                      className={`rounded-xl border px-3 py-2.5 text-center ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>
                        {label}
                      </p>
                      <p className={`mt-1 text-xl font-black tabular-nums ${themeClasses.textPrimary}`}>
                        {summary?.[key] ?? 0}
                      </p>
                    </div>
                  ))}
                  <div
                    className={`rounded-xl border px-3 py-2.5 text-center ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>
                      Compliance
                    </p>
                    <p className={`mt-1 text-xl font-black tabular-nums ${themeClasses.textPrimary}`}>
                      {summary != null ? `${summary.compliance_percentage}%` : '—'}
                    </p>
                  </div>
                </div>

                {formMode ? (
                  renderBgForm()
                ) : (
                  <>
                    <div
                      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${isDarkTheme ? 'border-blue-500/20 bg-blue-500/10 text-blue-300' : 'border-blue-100 bg-blue-50 text-blue-700'}`}
                    >
                      <span className="shrink-0">●</span>
                      <p>
                        Status is calculated by the backend.
                        <span className="ml-2 text-emerald-600">Green</span> = Updated,
                        <span className="ml-2 text-amber-600"> Orange</span> = Yet To Update,
                        <span className="ml-2 text-rose-600"> Red</span> = Not Updated.
                      </p>
                    </div>

                    {showScl && renderTable('SCL', bundle.scl_bg)}
                    {showContractor &&
                      renderTable('CONTRACTOR', scopedContractorEntries, defaultContractorForAdd)}
                  </>
                )}
              </>
            )}

            {error && (
              <p className={`text-sm font-semibold ${isDarkTheme ? 'text-rose-400' : 'text-rose-600'}`}>
                {error}
              </p>
            )}
          </div>

          <div
            className={`shrink-0 border-t px-5 py-4 sm:px-6 ${themeClasses.border}`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ProjectDatesBgStatusModal;
