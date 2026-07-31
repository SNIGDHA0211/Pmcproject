import React, { useState, useEffect, useCallback } from 'react';
import { drawingRegisterApi, getApiErrorMessage } from '../services/api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { isAbortError } from '../utils/isAbortError';
import type {
  DrawingClientReportData,
  DrawingClientReportRow,
  DrawingRegisterRow,
  Project,
} from '../types';
import { getThemeClasses, useTheme } from '../utils/theme';
import { ModalPortal } from './ModalPortal';
import { Icons } from './Icons';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import {
  downloadDrawingRegisterExcel,
  triggerDrawingRegisterExcelBlobDownload,
} from '../utils/drawingRegisterExport';

// ─── helpers ─────────────────────────────────────────────────────────────────

function n(v: unknown): number {
  const x = Number(v); return Number.isFinite(x) ? x : 0;
}
function fmtDate(v: unknown): string {
  if (!v) return '—';
  const s = String(v);
  if (s === 'null' || s === 'undefined') return '—';
  // ISO date → DD/MM/YYYY
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/** Normalize API / display dates for HTML date inputs (YYYY-MM-DD). */
function toDateInputValue(v: unknown): string {
  if (!v) return '';
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return '';
}

const MONTH_OPTS = [
  { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
  { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
  { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
  { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' },
];
const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTS = Array.from({ length: 10 }, (_, i) => THIS_YEAR - i);

const STATUS_FILTER_OPTS = [
  { value: '', label: 'All statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'resubmitted', label: 'Resubmitted' },
] as const;

const WORKFLOW_ACTIONS = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'CONSULTANT_COMMENTED', label: 'Consultant Commented' },
  { value: 'RESUBMITTED', label: 'Resubmitted' },
  { value: 'APPROVED', label: 'Approved' },
] as const;

// ─── Summary KPIs ─────────────────────────────────────────────────────────────

function getLatestConsultantCommentsDate(rows: DrawingClientReportRow[]): string {
  const dates = rows
    .map((row) => row.consultantCommentsDate)
    .filter((d): d is string => Boolean(d));
  if (!dates.length) return '—';
  const sorted = [...dates].sort((a, b) => String(b).localeCompare(String(a)));
  return fmtDate(sorted[0]);
}

function SummaryKPIs({
  summary,
  rows,
  isDarkTheme,
}: {
  summary: DrawingClientReportData['summary'];
  rows: DrawingClientReportRow[];
  isDarkTheme: boolean;
}) {
  const rate = Math.min(100, Math.max(0, n(summary.approvalRate)));
  const pending = n(summary.variance);
  const complianceCount = rows.filter((row) => Boolean(row.consultantCommentsDate)).length;
  const latestCommentDate = getLatestConsultantCommentsDate(rows);
  const tc = getThemeClasses(isDarkTheme);

  const kpis = [
    { label: 'Submitted', value: n(summary.submittedDrawings), icon: '📤', tone: isDarkTheme ? 'text-blue-400' : 'text-blue-600', bg: isDarkTheme ? 'bg-blue-950/40 border-blue-800/40' : 'bg-blue-50 border-blue-100' },
    { label: 'Approved', value: n(summary.approvedDrawings), icon: '✅', tone: isDarkTheme ? 'text-emerald-400' : 'text-emerald-600', bg: isDarkTheme ? 'bg-emerald-950/40 border-emerald-800/40' : 'bg-emerald-50 border-emerald-100' },
    { label: 'Pending', value: pending, icon: '⚠️', tone: pending > 0 ? (isDarkTheme ? 'text-amber-400' : 'text-amber-600') : (isDarkTheme ? 'text-slate-400' : 'text-slate-500'), bg: isDarkTheme ? 'bg-amber-950/40 border-amber-800/40' : 'bg-amber-50 border-amber-100' },
    { label: 'Approval Rate', value: `${rate.toFixed(1)}%`, icon: '📊', tone: rate >= 85 ? (isDarkTheme ? 'text-emerald-400' : 'text-emerald-600') : rate >= 70 ? (isDarkTheme ? 'text-amber-400' : 'text-amber-600') : (isDarkTheme ? 'text-rose-400' : 'text-rose-600'), bg: isDarkTheme ? 'bg-purple-950/40 border-purple-800/40' : 'bg-purple-50 border-purple-100' },
    {
      label: 'Compliance Highlighted',
      sublabel: 'Consultant Comments',
      value: latestCommentDate,
      secondary: complianceCount > 0 ? `${complianceCount} with comments` : undefined,
      icon: '📋',
      tone: complianceCount > 0 ? (isDarkTheme ? 'text-cyan-400' : 'text-cyan-700') : (isDarkTheme ? 'text-slate-400' : 'text-slate-500'),
      bg: isDarkTheme ? 'bg-cyan-950/40 border-cyan-800/40' : 'bg-cyan-50 border-cyan-100',
      highlight: complianceCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
      {kpis.map((k) => (
        <div
          key={k.label}
          className={`rounded-2xl border p-3 sm:p-4 ${k.bg} ${'highlight' in k && k.highlight ? 'ring-2 ring-cyan-400/40' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 leading-tight ${tc.textSecondary}`}>
                {k.label}
              </p>
              {'sublabel' in k && k.sublabel && (
                <p className={`text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide mb-1 ${isDarkTheme ? 'text-cyan-300/80' : 'text-cyan-600'}`}>
                  {k.sublabel}
                </p>
              )}
              <p className={`text-lg sm:text-2xl font-black leading-none ${k.tone}`}>{k.value}</p>
              {'secondary' in k && k.secondary && (
                <p className={`mt-1 text-[10px] font-semibold ${tc.textMuted}`}>{k.secondary}</p>
              )}
            </div>
            <span className="text-lg sm:text-xl flex-shrink-0">{k.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Desktop Table ─────────────────────────────────────────────────────────────

function DesktopTable({
  rows, isDarkTheme, onEdit, onDelete,
}: {
  rows: DrawingClientReportRow[];
  isDarkTheme: boolean;
  onEdit: (row: DrawingClientReportRow) => void;
  onDelete: (id: number, label: string) => void;
}) {
  const tc = getThemeClasses(isDarkTheme);
  const TH = 'px-3 py-3 text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap';

  return (
    <div className="hidden lg:block overflow-x-auto rounded-2xl border" style={{ borderColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
      <table className="w-full min-w-[1100px] text-sm border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <th className={`${TH} text-center w-12`}>Sr.</th>
            <th className={`${TH} text-left`}>Design &amp; Drawing</th>
            <th className={`${TH} text-left`}>Contractor</th>
            <th className={`${TH} text-center`}>Rev.</th>
            <th className={`${TH} text-center`}>Submitted</th>
            <th className={`${TH} text-center`}>Consultant Comments</th>
            <th className={`${TH} text-center`}>Resubmitted</th>
            <th className={`${TH} text-center`}>Approved</th>
            <th className={`${TH} text-center`}>Status</th>
            <th className={`${TH} text-left`}>Remarks</th>
            <th className={`${TH} text-center w-20`}>Actions</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDarkTheme ? 'divide-white/10' : 'divide-slate-100'}`}>
          {rows.map((row, i) => {
            const isApproved = !!row.approvedByConsultant;
            const statusLabel = isApproved ? 'Approved' : row.resubmissionDate ? 'Resubmitted' : row.consultantCommentsDate ? 'In Review' : 'Submitted';
            const statusCls = isApproved ? 'bg-emerald-100 text-emerald-800' : row.consultantCommentsDate ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800';

            return (
              <tr key={row.id ?? i} className={`transition-colors ${isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                <td className={`px-3 py-3 text-center text-xs font-bold ${tc.textSecondary}`}>{row.srNo}</td>
                <td className={`px-3 py-3 font-semibold max-w-[200px] ${tc.textPrimary}`}>
                  <div className="truncate">{row.designAndDrawing || '—'}</div>
                </td>
                <td className={`px-3 py-3 text-xs ${tc.textSecondary}`}>{row.contractorName || '—'}</td>
                <td className={`px-3 py-3 text-center text-xs ${tc.textSecondary}`}>{row.revision ?? '—'}</td>
                <td className={`px-3 py-3 text-center text-xs font-medium ${tc.textPrimary}`}>{fmtDate(row.submissionByContractor)}</td>
                <td className={`px-3 py-3 text-center text-xs ${tc.textSecondary}`}>{fmtDate(row.consultantCommentsDate)}</td>
                <td className={`px-3 py-3 text-center text-xs ${tc.textSecondary}`}>{fmtDate(row.resubmissionDate)}</td>
                <td className={`px-3 py-3 text-center text-xs font-medium ${isApproved ? (isDarkTheme ? 'text-emerald-400' : 'text-emerald-700') : tc.textMuted}`}>
                  {fmtDate(row.approvedByConsultant)}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusCls}`}>
                    {statusLabel}
                  </span>
                </td>
                <td className={`px-3 py-3 text-xs max-w-[120px] ${tc.textMuted}`}>
                  <div className="truncate">{row.remarks || '—'}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onEdit(row)}
                      title="Edit"
                      className={`rounded-lg p-1.5 transition-colors ${isDarkTheme ? 'hover:bg-white/10 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`}
                    >
                      <Icons.Edit size={13} />
                    </button>
                    {row.id != null && (
                      <button
                        onClick={() => onDelete(row.id!, `${row.designAndDrawing} (#${row.srNo})`)}
                        title="Delete"
                        className={`rounded-lg p-1.5 transition-colors ${isDarkTheme ? 'hover:bg-white/10 text-rose-400' : 'hover:bg-red-50 text-rose-600'}`}
                      >
                        <Icons.Reject size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mobile Cards ──────────────────────────────────────────────────────────────

function MobileCards({
  rows, isDarkTheme, onEdit, onDelete,
}: {
  rows: DrawingClientReportRow[];
  isDarkTheme: boolean;
  onEdit: (row: DrawingClientReportRow) => void;
  onDelete: (id: number, label: string) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const tc = getThemeClasses(isDarkTheme);

  return (
    <div className={`lg:hidden rounded-2xl border overflow-hidden divide-y ${isDarkTheme ? 'border-white/10 divide-white/10' : 'border-slate-200 divide-slate-100'}`}>
      {rows.map((row, i) => {
        const isApproved = !!row.approvedByConsultant;
        const statusLabel = isApproved ? 'Approved' : row.resubmissionDate ? 'Resubmitted' : row.consultantCommentsDate ? 'In Review' : 'Submitted';
        const statusCls = isApproved ? 'bg-emerald-100 text-emerald-800' : row.consultantCommentsDate ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800';
        const isOpen = expanded === (row.id ?? i);

        return (
          <div key={row.id ?? i} className={`p-4 ${isDarkTheme ? '' : 'bg-white'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <button className="flex-1 text-left" onClick={() => setExpanded(isOpen ? null : (row.id ?? i) as number)}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${isDarkTheme ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                    {row.srNo}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusCls}`}>
                    {statusLabel}
                  </span>
                  {row.revision != null && (
                    <span className={`text-[10px] font-bold ${tc.textMuted}`}>Rev. {row.revision}</span>
                  )}
                </div>
                <p className={`text-sm font-bold leading-tight ${tc.textPrimary}`}>{row.designAndDrawing || '—'}</p>
                {row.contractorName && (
                  <p className={`text-xs mt-0.5 ${tc.textSecondary}`}>{row.contractorName}</p>
                )}
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onEdit(row)} className={`rounded-xl p-2 ${isDarkTheme ? 'hover:bg-white/10 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`}>
                  <Icons.Edit size={14} />
                </button>
                {row.id != null && (
                  <button onClick={() => onDelete(row.id!, `${row.designAndDrawing} (#${row.srNo})`)} className={`rounded-xl p-2 ${isDarkTheme ? 'hover:bg-white/10 text-rose-400' : 'hover:bg-red-50 text-rose-600'}`}>
                    <Icons.Reject size={14} />
                  </button>
                )}
                <button onClick={() => setExpanded(isOpen ? null : (row.id ?? i) as number)} className={`rounded-xl p-2 ${tc.textSecondary}`}>
                  <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Inline date pills */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Submitted', val: row.submissionByContractor, color: isDarkTheme ? 'bg-blue-950/50 text-blue-300' : 'bg-blue-50 text-blue-700' },
                { label: 'Approved', val: row.approvedByConsultant, color: isApproved ? (isDarkTheme ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : (isDarkTheme ? 'bg-white/5 text-white/30' : 'bg-slate-50 text-slate-400') },
              ].map(s => (
                <div key={s.label} className={`rounded-xl px-3 py-2 ${s.color}`}>
                  <p className="text-[9px] font-black uppercase tracking-wider opacity-70 mb-0.5">{s.label}</p>
                  <p className="text-xs font-bold">{fmtDate(s.val)}</p>
                </div>
              ))}
            </div>

            {isOpen && (
              <div className={`mt-3 pt-3 border-t space-y-3 ${isDarkTheme ? 'border-white/10' : 'border-slate-100'}`}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Consultant Comments', row.consultantCommentsDate],
                    ['Resubmitted', row.resubmissionDate],
                  ].map(([l, v]) => (
                    <div key={l as string}>
                      <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${tc.textMuted}`}>{l}</p>
                      <p className={`text-xs font-semibold ${tc.textPrimary}`}>{fmtDate(v)}</p>
                    </div>
                  ))}
                </div>
                {row.remarks && (
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${tc.textMuted}`}>Remarks</p>
                    <div className={`rounded-xl px-3 py-2 text-xs font-medium ${isDarkTheme ? 'bg-amber-950/30 text-amber-300' : 'bg-amber-50 text-amber-800'}`}>{row.remarks}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Register Modal (Create / Edit) ──────────────────────────────────────────

interface ModalProps {
  projectName: string;
  editRow: DrawingClientReportRow | null;
  onClose: () => void;
  onSaved: () => void;
}

type EventEntry = { action: string; eventDate: string };

function RegisterModal({ projectName, editRow, onClose, onSaved }: ModalProps) {
  const { isDarkTheme } = useTheme();
  const tc = getThemeClasses(isDarkTheme);
  const isEditing = editRow?.id != null;

  const [drawingName, setDrawingName] = useState(editRow?.designAndDrawing ?? '');
  const [contractorName, setContractorName] = useState(String(editRow?.contractorName ?? ''));
  const [revision, setRevision] = useState<number | ''>(editRow?.revision ?? '');
  const [remarks, setRemarks] = useState(editRow?.remarks ?? '');
  // date fields (editable in both create & edit)
  const [submittedDate, setSubmittedDate] = useState('');
  const [consultantCommentsDate, setConsultantCommentsDate] = useState('');
  const [resubmittedDate, setResubmittedDate] = useState('');
  const [approvedDate, setApprovedDate] = useState('');
  // workflow events (only on create)
  const [useWorkflow, setUseWorkflow] = useState(false);
  const [events, setEvents] = useState<EventEntry[]>([{ action: 'SUBMITTED', eventDate: '' }]);

  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    if (editRow) {
      setSubmittedDate(toDateInputValue(editRow.submissionByContractor));
      setConsultantCommentsDate(toDateInputValue(editRow.consultantCommentsDate));
      setResubmittedDate(toDateInputValue(editRow.resubmissionDate));
      setApprovedDate(toDateInputValue(editRow.approvedByConsultant));
    }
  }, [editRow]);

  function addEvent() {
    setEvents(prev => [...prev, { action: 'SUBMITTED', eventDate: '' }]);
  }
  function removeEvent(i: number) {
    setEvents(prev => prev.filter((_, idx) => idx !== i));
  }
  function setEventField(i: number, key: keyof EventEntry, val: string) {
    setEvents(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    if (!drawingName.trim()) return setFormErr('Drawing name is required.');

    setSaving(true);
    try {
      if (isEditing) {
        await drawingRegisterApi.updateRegisterRow(editRow!.id!, {
          remarks,
          submittedDate: submittedDate || undefined,
          consultantCommentsDate: consultantCommentsDate || undefined,
          resubmittedDate: resubmittedDate || undefined,
          approvedDate: approvedDate || undefined,
          contractorName: contractorName || undefined,
          revision: revision !== '' ? Number(revision) : undefined,
        });
      } else {
        await drawingRegisterApi.createRegisterRow({
          projectName,
          drawingName: drawingName.trim(),
          contractorName: contractorName || undefined,
          revision: revision !== '' ? Number(revision) : undefined,
          remarks: remarks || undefined,
          ...(useWorkflow
            ? {
              workflowEvents: events
                .filter(ev => ev.action && ev.eventDate)
                .map(ev => ({ action: ev.action, eventDate: ev.eventDate })),
            }
            : {
              submittedDate: submittedDate || undefined,
              consultantCommentsDate: consultantCommentsDate || undefined,
              resubmittedDate: resubmittedDate || undefined,
              approvedDate: approvedDate || undefined,
            }),
        });
      }
      onSaved();
    } catch (err) {
      setFormErr(getApiErrorMessage(err, 'Failed to save drawing record'));
    } finally {
      setSaving(false);
    }
  }

  const labelCls = `mb-1 block text-[10px] font-black uppercase tracking-widest ${tc.textSecondary}`;
  const inputCls = `w-full rounded-2xl px-4 py-2.5 text-sm font-medium outline-none transition-colors ${tc.input} ${tc.textPrimary}`;

  return (
    <ModalPortal open>
      <div className="fixed inset-0 z-[250] flex items-start sm:items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto">
        <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl my-4 ${tc.bgPrimary} ${tc.border}`}>

          {/* Header */}
          <div className={`flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b ${tc.border} ${isDarkTheme ? 'bg-white/5' : 'bg-indigo-50'}`}>
            <div>
              <h3 className={`text-lg font-black uppercase tracking-tight ${tc.textPrimary}`}>
                {isEditing ? 'Edit Drawing Record' : 'Add Drawing Record'}
              </h3>
              <p className={`mt-0.5 text-[11px] font-medium ${tc.textSecondary}`}>{projectName}</p>
            </div>
            <button type="button" onClick={onClose} className={`rounded-xl p-2 ${isDarkTheme ? 'hover:bg-white/10 text-white/70' : 'hover:bg-slate-200 text-slate-500'}`}>
              <Icons.Close size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-5 space-y-5">
            {/* Drawing Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Drawing Name *</label>
                <input type="text" value={drawingName} onChange={e => setDrawingName(e.target.value)}
                  disabled={isEditing} placeholder="e.g. Pile Foundation Drawing"
                  className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`} required />
              </div>
              <div>
                <label className={labelCls}>Contractor Name</label>
                <input type="text" value={contractorName} onChange={e => setContractorName(e.target.value)}
                  placeholder="e.g. ABC Contractors" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Revision</label>
                <input type="number" min="0" value={revision} onChange={e => setRevision(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Remarks</label>
                <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                  placeholder="e.g. Approved, In Progress" className={inputCls} />
              </div>
            </div>

            {/* Date entry mode (create only) */}
            {!isEditing && (
              <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                <label className="relative inline-flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={useWorkflow} onChange={e => setUseWorkflow(e.target.checked)} className="sr-only" />
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${useWorkflow ? 'bg-indigo-600' : (isDarkTheme ? 'bg-white/20' : 'bg-slate-300')}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${useWorkflow ? 'left-[22px]' : 'left-0.5'}`} />
                  </div>
                  <span className={`text-xs font-bold ${tc.textSecondary}`}>
                    Use workflow events (recommended)
                  </span>
                </label>
              </div>
            )}

            {/* Dates — direct or workflow */}
            {!isEditing && useWorkflow ? (
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Workflow Events
                </p>
                <div className="space-y-2">
                  {events.map((ev, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className={labelCls}>Action</label>
                        <select value={ev.action} onChange={e => setEventField(i, 'action', e.target.value)} className={inputCls}>
                          {WORKFLOW_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className={labelCls}>Date</label>
                        <input type="date" value={ev.eventDate} onChange={e => setEventField(i, 'eventDate', e.target.value)} className={inputCls} />
                      </div>
                      {events.length > 1 && (
                        <button type="button" onClick={() => removeEvent(i)}
                          className={`mb-0.5 rounded-xl p-2.5 ${isDarkTheme ? 'hover:bg-white/10 text-rose-400' : 'hover:bg-red-50 text-rose-600'}`}>
                          <Icons.Reject size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addEvent}
                    className={`flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-xs font-bold transition-colors ${isDarkTheme ? 'border-white/20 text-white/60 hover:bg-white/10' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                    <Icons.Add size={12} /> Add Event
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Stage Dates
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Submitted by Contractor', val: submittedDate, set: setSubmittedDate },
                    { label: 'Consultant Comments', val: consultantCommentsDate, set: setConsultantCommentsDate },
                    { label: 'Resubmitted', val: resubmittedDate, set: setResubmittedDate },
                    { label: 'Approved by Consultant', val: approvedDate, set: setApprovedDate },
                  ].map(f => (
                    <div key={f.label}>
                      <label className={labelCls}>{f.label}</label>
                      <input type="date" value={f.val} onChange={e => f.set(e.target.value)} className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formErr && <p className={`text-sm font-bold ${isDarkTheme ? 'text-rose-400' : 'text-rose-600'}`}>{formErr}</p>}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button type="button" onClick={onClose} disabled={saving}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {saving ? 'Saving…' : isEditing ? 'Update Record' : 'Create Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

// ─── Main Card ─────────────────────────────────────────────────────────────────

interface DrawingRegisterCardProps {
  project: Project;
  selectedContractorName?: string | null;
  syncContractorFromDashboard?: boolean;
}

export default function DrawingRegisterCard({
  project,
  selectedContractorName = null,
  syncContractorFromDashboard = false,
}: DrawingRegisterCardProps) {
  const { isDarkTheme } = useTheme();
  const tc = getThemeClasses(isDarkTheme);

  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [view, setView] = useState<'monthly' | 'cumulative'>('cumulative');
  const [contractor, setContractor] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const debouncedContractor = useDebouncedValue(contractor.trim());

  useEffect(() => {
    if (!syncContractorFromDashboard) return;
    setContractor(selectedContractorName?.trim() ?? '');
  }, [syncContractorFromDashboard, selectedContractorName]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [reportData, setReportData] = useState<DrawingClientReportData | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<DrawingClientReportRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDrawingTable, setShowDrawingTable] = useState(false);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!project?.title) return;
    setLoading(true);
    setError(null);
    try {
      const res = await drawingRegisterApi.getClientReport({
        projectName: project.title,
        month: selMonth,
        year: selYear,
        view,
        ...(debouncedContractor && { contractor: debouncedContractor }),
        ...(statusFilter && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
        signal,
      });
      if (signal?.aborted) return;
      setReportData(res.data);
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      setReportData(null);
      setError(getApiErrorMessage(err, 'Unable to load drawing register'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [project?.title, selMonth, selYear, view, debouncedContractor, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (!successMsg) return;
    const timer = window.setTimeout(() => setSuccessMsg(null), 3000);
    return () => window.clearTimeout(timer);
  }, [successMsg]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  async function handleExportExcel() {
    const exportParams = {
      projectName: project.title,
      month: selMonth,
      year: selYear,
      view,
      ...(debouncedContractor && { contractor: debouncedContractor }),
      ...(statusFilter && { status: statusFilter }),
      ...(debouncedSearch && { search: debouncedSearch }),
    };
    const filename = `drawing-register-${project.title}-${selYear}-${String(selMonth).padStart(2, '0')}.xlsx`;

    try {
      const res = await drawingRegisterApi.exportExcel(exportParams);
      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([String(res.data ?? '')], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
      triggerDrawingRegisterExcelBlobDownload(blob, filename);
    } catch (err) {
      if (reportData?.rows?.length) {
        try {
          await downloadDrawingRegisterExcel(reportData, filename);
          return;
        } catch (fallbackErr) {
          console.error('Drawing register Excel fallback failed:', fallbackErr);
        }
      }
      alert(getApiErrorMessage(err, 'Excel export failed'));
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await drawingRegisterApi.deleteRegisterRow(id);
      setDeleteConfirm(null);
      setSuccessMsg('Drawing record deleted successfully');
      loadData();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Delete failed'));
    } finally {
      setDeleting(false);
    }
  }

  const MONTH_NAME = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selMonth - 1];
  const periodLabel = view === 'cumulative' ? `Jan – ${MONTH_NAME} ${selYear}` : `${MONTH_NAME} ${selYear}`;

  return (
    <div className={`w-full rounded-2xl border shadow-md overflow-hidden ${tc.bgPrimary} ${tc.border}`}>
      <DashboardCardTopAccent />

      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b ${tc.border} ${isDarkTheme ? 'bg-white/5' : 'bg-gradient-to-r from-indigo-50 to-purple-50'}`}>
        <div className="min-w-0 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
          <h2 className={`text-sm sm:text-base font-semibold tracking-tight ${tc.textPrimary}`}>
            Drawing Register — Client Report
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto flex-shrink-0">
          <button onClick={() => { setEditRow(null); setModalOpen(true); }}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors">
            <Icons.Add size={14} />
            <span className="hidden sm:inline">Add Drawing</span>
            <span className="sm:hidden">Add Drawing</span>
          </button>
          <button onClick={handleExportExcel} disabled={loading || !reportData?.rows?.length}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors">
            <Icons.Download size={14} /><span>Excel</span>
          </button>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${tc.border} ${tc.textSecondary} ${isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-slate-100'} ${showFilters ? (isDarkTheme ? 'bg-white/10' : 'bg-slate-100') : ''}`}>
            <Icons.Filter size={14} /><span className="hidden sm:inline">Filters</span>
          </button>
          <button onClick={() => void loadData()} disabled={loading}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40 ${tc.border} ${tc.textSecondary} ${isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
            <Icons.History size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick period controls — always visible */}
      <div className={`px-4 sm:px-6 py-3 border-b ${tc.border} ${isDarkTheme ? 'bg-white/[0.02]' : 'bg-white'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="grid grid-cols-2 gap-2 flex-1 min-w-0 sm:max-w-md">
            <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
              className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium outline-none ${tc.input} ${tc.textPrimary}`}>
              {MONTH_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
              className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium outline-none ${tc.input} ${tc.textPrimary}`}>
              {YEAR_OPTS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className={`flex rounded-xl overflow-hidden border flex-shrink-0 w-full sm:w-auto ${isDarkTheme ? 'border-white/20' : 'border-slate-300'}`}>
            {(['monthly', 'cumulative'] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)}
                className={`flex-1 sm:flex-none sm:min-w-[7rem] py-2 px-3 text-xs font-bold transition-colors ${i > 0 ? `border-l ${isDarkTheme ? 'border-white/20' : 'border-slate-300'}` : ''} ${view === v ? 'bg-indigo-600 text-white' : isDarkTheme ? 'text-white/60 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}>
                {v === 'monthly' ? 'Monthly' : 'Cumulative'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 space-y-4">

        {/* Filters panel */}
        {showFilters && (
          <div className={`rounded-2xl border p-4 space-y-3 ${isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${tc.textSecondary}`}>Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className={`w-full rounded-2xl px-3 py-2 text-sm font-medium outline-none ${tc.input} ${tc.textPrimary}`}>
                  {STATUS_FILTER_OPTS.map(o => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${tc.textSecondary}`}>Contractor</label>
                {syncContractorFromDashboard && selectedContractorName?.trim() ? (
                  <div
                    className={`w-full rounded-2xl border px-3 py-2 text-sm font-semibold ${tc.input} ${tc.textPrimary} ${tc.border}`}
                  >
                    {selectedContractorName}
                  </div>
                ) : (
                  <input type="text" value={contractor} onChange={e => setContractor(e.target.value)} placeholder="Filter by contractor…"
                    className={`w-full rounded-2xl px-3 py-2 text-sm font-medium outline-none ${tc.input} ${tc.textPrimary}`} />
                )}
              </div>
            </div>
            <div>
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${tc.textSecondary}`}>Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drawings…"
                className={`w-full rounded-2xl px-3 py-2 text-sm font-medium outline-none ${tc.input} ${tc.textPrimary}`} />
            </div>
          </div>
        )}

        {successMsg && (
          <div className={`rounded-xl px-4 py-3 border ${isDarkTheme ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
        )}

        {error && (
          <div className={`rounded-xl px-4 py-3 border ${isDarkTheme ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent" />
          </div>
        )}

        {!loading && !error && reportData && (
          <>
            <SummaryKPIs summary={reportData.summary} rows={reportData.rows} isDarkTheme={isDarkTheme} />

            {reportData.rows.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <p className={`text-xs font-medium ${tc.textSecondary}`}>
                    {reportData.rows.length} drawing record{reportData.rows.length !== 1 ? 's' : ''} · {periodLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDrawingTable((v) => !v)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors w-full sm:w-auto ${tc.border} ${showDrawingTable ? (isDarkTheme ? 'bg-indigo-950/50 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200') : (isDarkTheme ? 'text-white/70 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')}`}
                  >
                    {showDrawingTable ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                    {showDrawingTable ? 'Hide Drawing Data' : 'Show Drawing Data'}
                    <Icons.ChevronDown size={14} className={`transition-transform ${showDrawingTable ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showDrawingTable && (
                  <>
                    <DesktopTable
                      rows={reportData.rows}
                      isDarkTheme={isDarkTheme}
                      onEdit={row => { setEditRow(row); setModalOpen(true); }}
                      onDelete={(id, label) => setDeleteConfirm({ id, label })}
                    />
                    <MobileCards
                      rows={reportData.rows}
                      isDarkTheme={isDarkTheme}
                      onEdit={row => { setEditRow(row); setModalOpen(true); }}
                      onDelete={(id, label) => setDeleteConfirm({ id, label })}
                    />
                  </>
                )}
              </>
            ) : (
              <div className={`rounded-2xl border-2 border-dashed p-10 text-center ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`}>
                <p className={`text-sm font-medium mb-3 ${tc.textSecondary}`}>No drawing records for {periodLabel}.</p>
                <button onClick={() => { setEditRow(null); setModalOpen(true); }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors">
                  <Icons.Add size={13} /> Add First Record
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <RegisterModal
          projectName={project.title}
          editRow={editRow}
          onClose={() => { setModalOpen(false); setEditRow(null); }}
          onSaved={() => {
            setModalOpen(false);
            setEditRow(null);
            setSuccessMsg(editRow ? 'Drawing record updated successfully' : 'Drawing record created successfully');
            loadData();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4">
            <div className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${tc.bgPrimary} ${tc.border}`}>
              <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${tc.textPrimary}`}>Delete Drawing?</h3>
              <p className={`text-sm mb-6 ${tc.textSecondary}`}>
                This will permanently delete <strong className={tc.textPrimary}>"{deleteConfirm.label}"</strong>. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold ${isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm.id)} disabled={deleting}
                  className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
