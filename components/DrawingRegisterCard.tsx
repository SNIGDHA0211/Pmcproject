import React, { useState, useEffect, useCallback, useRef } from 'react';
import { drawingRegisterApi, getApiErrorMessage, registerRowToClientReportRow } from '../services/api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { isAbortError } from '../utils/isAbortError';
import type {
  DrawingClientReportData,
  DrawingClientReportRow,
  DrawingRegisterFile,
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
import {
  DRAWING_REGISTER_ALLOWED_EXT,
  formatDrawingFileSize,
  validateDrawingRegisterFiles,
} from '../utils/drawingRegisterForm';

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

type DrawingStatusTone = 'approved' | 'pending' | 'review' | 'resubmitted' | 'submitted';

function deriveDrawingRowStatus(row: DrawingClientReportRow): {
  label: string;
  tone: DrawingStatusTone;
} {
  const remarks = String(row.remarks ?? '').trim().toLowerCase();

  if (remarks.includes('pending') || remarks.includes('in progress') || remarks.includes('in_progress')) {
    if (row.resubmissionDate) return { label: 'Resubmitted', tone: 'resubmitted' };
    if (row.consultantCommentsDate) return { label: 'In Review', tone: 'review' };
    return { label: 'Pending', tone: 'pending' };
  }

  if (remarks.includes('approved') || row.approvedByConsultant) {
    return { label: 'Approved', tone: 'approved' };
  }
  if (row.resubmissionDate) return { label: 'Resubmitted', tone: 'resubmitted' };
  if (row.consultantCommentsDate) return { label: 'In Review', tone: 'review' };
  if (row.submissionByContractor) return { label: 'Submitted', tone: 'submitted' };
  return { label: 'Pending', tone: 'pending' };
}

function isDrawingRowApproved(row: DrawingClientReportRow): boolean {
  return deriveDrawingRowStatus(row).tone === 'approved';
}

function computeDrawingSummaryFromRows(
  rows: DrawingClientReportRow[],
): DrawingClientReportData['summary'] {
  const submittedDrawings = rows.length;
  const approvedDrawings = rows.filter(isDrawingRowApproved).length;
  const variance = Math.max(0, submittedDrawings - approvedDrawings);
  const approvalRate =
    submittedDrawings > 0
      ? Number(((approvedDrawings / submittedDrawings) * 100).toFixed(1))
      : 0;
  return { submittedDrawings, approvedDrawings, variance, approvalRate };
}

function statusBadgeClasses(tone: DrawingStatusTone, isDarkTheme: boolean): string {
  const map: Record<DrawingStatusTone, string> = {
    approved: isDarkTheme ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-100 text-emerald-800',
    pending: isDarkTheme ? 'bg-amber-950/50 text-amber-300' : 'bg-amber-100 text-amber-800',
    review: isDarkTheme ? 'bg-orange-950/50 text-orange-300' : 'bg-orange-100 text-orange-800',
    resubmitted: isDarkTheme ? 'bg-violet-950/50 text-violet-300' : 'bg-violet-100 text-violet-800',
    submitted: isDarkTheme ? 'bg-blue-950/50 text-blue-300' : 'bg-blue-100 text-blue-800',
  };
  return map[tone];
}

function DrawingStatusBadge({
  row,
  isDarkTheme,
}: {
  row: DrawingClientReportRow;
  isDarkTheme: boolean;
}) {
  const { label, tone } = deriveDrawingRowStatus(row);
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${statusBadgeClasses(tone, isDarkTheme)}`}>
      {label}
    </span>
  );
}

function countRowsWithFiles(rows: DrawingClientReportRow[]): number {
  return rows.filter((row) => (row.drawings?.length ?? row.drawingFileCount ?? 0) > 0).length;
}

function isDrawingImageFile(file: DrawingRegisterFile): boolean {
  if (file.contentType?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(file.originalFilename || '');
}

function truncateFilename(name: string, max = 20): string {
  const trimmed = name.trim();
  if (!trimmed) return 'File';
  if (trimmed.length <= max) return trimmed;
  const dot = trimmed.lastIndexOf('.');
  if (dot > 0 && dot < trimmed.length - 1) {
    const ext = trimmed.slice(dot);
    const baseMax = max - ext.length - 1;
    if (baseMax > 4) return `${trimmed.slice(0, baseMax)}…${ext}`;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

function DrawingFileChip({
  file,
  isDarkTheme,
  className = '',
}: {
  file: DrawingRegisterFile;
  isDarkTheme: boolean;
  className?: string;
}) {
  const isImage = isDrawingImageFile(file);
  return (
    <a
      href={file.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={file.originalFilename || 'Open file'}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 min-w-0 max-w-full transition-colors ${isDarkTheme ? 'border-white/10 bg-white/5 hover:bg-white/10 text-blue-300' : 'border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-blue-700'} ${className}`}
    >
      {isImage && file.fileUrl ? (
        <img
          src={file.fileUrl}
          alt=""
          className="h-6 w-6 rounded object-cover flex-shrink-0 ring-1 ring-black/5"
          loading="lazy"
        />
      ) : (
        <span className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded ${isDarkTheme ? 'bg-white/10' : 'bg-white'}`}>
          <Icons.Document size={13} />
        </span>
      )}
      <span className="text-[10px] font-semibold truncate leading-tight">
        {truncateFilename(file.originalFilename || 'Download')}
      </span>
    </a>
  );
}

/** Compact single-line file display for table rows (consistent row height). */
function DrawingFilesCell({
  files,
  isDarkTheme,
}: {
  files?: DrawingRegisterFile[];
  isDarkTheme: boolean;
}) {
  const tc = getThemeClasses(isDarkTheme);
  if (!files?.length) {
    return (
      <span className={`inline-block text-[11px] ${tc.textMuted}`}>—</span>
    );
  }

  const primary = files[0];
  const extra = files.length - 1;

  return (
    <div className="flex items-center justify-center gap-1.5 min-w-[140px] max-w-[180px] mx-auto">
      <DrawingFileChip file={primary} isDarkTheme={isDarkTheme} className="flex-1 min-w-0" />
      {extra > 0 && (
        <span
          title={files.slice(1).map((f) => f.originalFilename).join(', ')}
          className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isDarkTheme ? 'bg-indigo-950/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

function mergeSavedRowIntoReport(
  prev: DrawingClientReportData | null,
  saved: DrawingRegisterRow,
): DrawingClientReportData | null {
  if (!prev) return prev;
  const clientRow = registerRowToClientReportRow(saved);
  const idx = prev.rows.findIndex((row) => row.id === clientRow.id);
  let rows: DrawingClientReportRow[];
  if (idx >= 0) {
    rows = prev.rows.map((row, i) =>
      i === idx
        ? {
            ...row,
            ...clientRow,
            drawings: clientRow.drawings?.length ? clientRow.drawings : row.drawings,
            drawingFileCount: clientRow.drawings?.length ?? row.drawingFileCount,
          }
        : row,
    );
  } else {
    rows = [...prev.rows, clientRow].sort((a, b) => (a.srNo ?? 0) - (b.srNo ?? 0));
  }
  return {
    ...prev,
    rows,
    summary: computeDrawingSummaryFromRows(rows),
  };
}

// ─── Summary KPIs ─────────────────────────────────────────────────────────────

function SummaryKPIs({
  summary,
  rows,
  isDarkTheme,
}: {
  summary: DrawingClientReportData['summary'];
  rows: DrawingClientReportRow[];
  isDarkTheme: boolean;
}) {
  const display = rows.length > 0 ? computeDrawingSummaryFromRows(rows) : summary;
  const rate = Math.min(100, Math.max(0, n(display.approvalRate)));
  const pending = Math.max(0, n(display.variance));
  const filesCount = countRowsWithFiles(rows);
  const tc = getThemeClasses(isDarkTheme);

  const kpis = [
    { label: 'Submitted', value: n(display.submittedDrawings), icon: '📤', tone: isDarkTheme ? 'text-blue-400' : 'text-blue-600', bg: isDarkTheme ? 'bg-blue-950/40 border-blue-800/40' : 'bg-blue-50 border-blue-100' },
    { label: 'Approved', value: n(display.approvedDrawings), icon: '✅', tone: isDarkTheme ? 'text-emerald-400' : 'text-emerald-600', bg: isDarkTheme ? 'bg-emerald-950/40 border-emerald-800/40' : 'bg-emerald-50 border-emerald-100' },
    { label: 'Pending', value: pending, icon: '⚠️', tone: pending > 0 ? (isDarkTheme ? 'text-amber-400' : 'text-amber-600') : (isDarkTheme ? 'text-slate-400' : 'text-slate-500'), bg: isDarkTheme ? 'bg-amber-950/40 border-amber-800/40' : 'bg-amber-50 border-amber-100' },
    { label: 'Approval Rate', value: `${rate.toFixed(1)}%`, icon: '📊', tone: rate >= 85 ? (isDarkTheme ? 'text-emerald-400' : 'text-emerald-600') : rate >= 70 ? (isDarkTheme ? 'text-amber-400' : 'text-amber-600') : (isDarkTheme ? 'text-rose-400' : 'text-rose-600'), bg: isDarkTheme ? 'bg-purple-950/40 border-purple-800/40' : 'bg-purple-50 border-purple-100' },
    {
      label: 'With Attachments',
      sublabel: 'Drawing Files',
      value: filesCount,
      secondary: rows.length > 0 ? `of ${rows.length} records` : undefined,
      icon: '📎',
      tone: filesCount > 0 ? (isDarkTheme ? 'text-cyan-400' : 'text-cyan-700') : (isDarkTheme ? 'text-slate-400' : 'text-slate-500'),
      bg: isDarkTheme ? 'bg-cyan-950/40 border-cyan-800/40' : 'bg-cyan-50 border-cyan-100',
      highlight: filesCount > 0,
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

function stickyHead(extra = '') {
  return `sticky z-20 bg-[#6333c5] ${extra}`;
}

function stickyBody(isDarkTheme: boolean, stripe: boolean, extra = '') {
  const bg = stripe
    ? (isDarkTheme ? 'bg-[#1a2332]' : 'bg-slate-50')
    : (isDarkTheme ? 'bg-[#0f172a]' : 'bg-white');
  return `sticky z-[5] ${bg} ${extra}`;
}

function DesktopTable({
  rows, isDarkTheme, onEdit, onDelete, scrollRef,
}: {
  rows: DrawingClientReportRow[];
  isDarkTheme: boolean;
  onEdit: (row: DrawingClientReportRow) => void;
  onDelete: (id: number, label: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const tc = getThemeClasses(isDarkTheme);
  const TH = 'px-2.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap';
  const TD = `px-2.5 py-2.5 align-middle text-xs ${tc.textPrimary}`;

  return (
    <div className="hidden md:block w-full min-w-0">
      <div
        ref={scrollRef}
        className="w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border shadow-sm"
        style={{ borderColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}
      >
        <div className="max-h-[min(65vh,640px)] overflow-y-auto">
          <table className="w-full min-w-[1080px] text-sm border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-[#6333c5] shadow-sm">
                <th className={`${TH} ${stickyHead('left-0 text-center w-12 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.2)]')}`}>Sr.</th>
                <th className={`${TH} ${stickyHead('left-12 text-left min-w-[140px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.2)]')}`}>Design &amp; Drawing</th>
                <th className={`${TH} text-left min-w-[100px]`}>Contractor</th>
                <th className={`${TH} text-center w-12`}>Rev.</th>
                <th className={`${TH} text-center`}>Submitted</th>
                <th className={`${TH} text-center`}>Consultant</th>
                <th className={`${TH} text-center`}>Resubmitted</th>
                <th className={`${TH} text-center`}>Approved</th>
                <th className={`${TH} text-center w-24`}>Status</th>
                <th className={`${TH} text-left min-w-[88px]`}>Remarks</th>
                <th className={`${TH} text-center min-w-[150px]`}>Files</th>
                <th className={`${TH} ${stickyHead('right-0 text-center w-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.2)]')}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkTheme ? 'divide-white/10' : 'divide-slate-100'}`}>
              {rows.map((row, i) => {
                const approved = isDrawingRowApproved(row);
                const stripe = i % 2 === 1;
                const rowBg = stripe
                  ? (isDarkTheme ? 'bg-white/[0.02]' : 'bg-slate-50/70')
                  : (isDarkTheme ? 'bg-[#0f172a]' : 'bg-white');

                return (
                  <tr key={row.id ?? i} className={`transition-colors ${rowBg} ${isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-indigo-50/40'}`}>
                    <td className={`${TD} ${stickyBody(isDarkTheme, stripe, 'left-0 text-center font-bold shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)]')} ${tc.textSecondary}`}>{row.srNo}</td>
                    <td className={`${TD} ${stickyBody(isDarkTheme, stripe, 'left-12 font-semibold shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)]')}`}>
                      <div className="truncate max-w-[180px]" title={row.designAndDrawing || undefined}>{row.designAndDrawing || '—'}</div>
                    </td>
                    <td className={`${TD} ${tc.textSecondary}`}>
                      <div className="truncate max-w-[120px]" title={row.contractorName || undefined}>{row.contractorName || '—'}</div>
                    </td>
                    <td className={`${TD} text-center ${tc.textSecondary}`}>{row.revision ?? '—'}</td>
                    <td className={`${TD} text-center whitespace-nowrap tabular-nums`}>{fmtDate(row.submissionByContractor)}</td>
                    <td className={`${TD} text-center whitespace-nowrap tabular-nums ${tc.textSecondary}`}>{fmtDate(row.consultantCommentsDate)}</td>
                    <td className={`${TD} text-center whitespace-nowrap tabular-nums ${tc.textSecondary}`}>{fmtDate(row.resubmissionDate)}</td>
                    <td className={`${TD} text-center whitespace-nowrap tabular-nums font-medium ${approved ? (isDarkTheme ? 'text-emerald-400' : 'text-emerald-700') : tc.textMuted}`}>
                      {fmtDate(row.approvedByConsultant)}
                    </td>
                    <td className={`${TD} text-center`}>
                      <DrawingStatusBadge row={row} isDarkTheme={isDarkTheme} />
                    </td>
                    <td className={`${TD} ${tc.textMuted}`}>
                      <div className="truncate max-w-[100px]" title={row.remarks || undefined}>{row.remarks || '—'}</div>
                    </td>
                    <td className={`${TD} text-center`}>
                      <DrawingFilesCell files={row.drawings} isDarkTheme={isDarkTheme} />
                    </td>
                    <td className={`${TD} ${stickyBody(isDarkTheme, stripe, 'right-0 text-center shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]')}`}>
                      <div className="flex items-center justify-center gap-1">
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
      </div>
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
    <div className={`md:hidden rounded-2xl border overflow-hidden divide-y ${isDarkTheme ? 'border-white/10 divide-white/10' : 'border-slate-200 divide-slate-100'}`}>
      {rows.map((row, i) => {
        const isOpen = expanded === (row.id ?? i);

        return (
          <div key={row.id ?? i} className={`p-4 ${isDarkTheme ? '' : 'bg-white'}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <button className="flex-1 text-left" onClick={() => setExpanded(isOpen ? null : (row.id ?? i) as number)}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${isDarkTheme ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                    {row.srNo}
                  </span>
                  <DrawingStatusBadge row={row} isDarkTheme={isDarkTheme} />
                  {row.revision != null && (
                    <span className={`text-[10px] font-bold ${tc.textMuted}`}>Rev. {row.revision}</span>
                  )}
                  {row.drawings?.length ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isDarkTheme ? 'bg-indigo-950/50 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                      <Icons.Document size={10} />
                      {row.drawings.length}
                    </span>
                  ) : null}
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
                { label: 'Approved', val: row.approvedByConsultant, color: isDrawingRowApproved(row) ? (isDarkTheme ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-50 text-emerald-700') : (isDarkTheme ? 'bg-white/5 text-white/30' : 'bg-slate-50 text-slate-400') },
              ].map(s => (
                <div key={s.label} className={`rounded-xl px-3 py-2 ${s.color}`}>
                  <p className="text-[9px] font-black uppercase tracking-wider opacity-70 mb-0.5">{s.label}</p>
                  <p className="text-xs font-bold">{fmtDate(s.val)}</p>
                </div>
              ))}
            </div>

            {row.drawings?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.drawings.slice(0, 3).map((file) => (
                  <DrawingFileChip key={`${file.id ?? 'f'}-${file.fileUrl}`} file={file} isDarkTheme={isDarkTheme} />
                ))}
                {row.drawings.length > 3 && (
                  <span className={`self-center text-[10px] font-bold ${tc.textSecondary}`}>+{row.drawings.length - 3} more</span>
                )}
              </div>
            ) : null}

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
                {(row.drawings?.length || row.drawingFileCount) ? (
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-wider mb-1 ${tc.textMuted}`}>Attachments</p>
                    {row.drawings?.length ? (
                      <DrawingFilesList files={row.drawings} isDarkTheme={isDarkTheme} />
                    ) : (
                      <p className={`text-xs font-semibold ${tc.textSecondary}`}>{row.drawingFileCount} file(s)</p>
                    )}
                  </div>
                ) : null}
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
  onSaved: (result?: { notice?: string; savedRow?: DrawingRegisterRow }) => void;
}

type EventEntry = { action: string; eventDate: string; notes: string };

function DrawingFilesList({
  files,
  isDarkTheme,
  onDelete,
  deletingId,
}: {
  files: DrawingRegisterFile[];
  isDarkTheme: boolean;
  onDelete?: (fileId: number) => void;
  deletingId?: number | null;
}) {
  if (!files.length) return null;

  return (
    <div className="space-y-1.5">
      {files.map((file) => (
        <div
          key={`${file.id ?? 'f'}-${file.fileUrl}`}
          className="flex items-center gap-2"
        >
          <DrawingFileChip file={file} isDarkTheme={isDarkTheme} className="flex-1 min-w-0" />
          {onDelete && file.id != null && (
            <button
              type="button"
              onClick={() => onDelete(file.id!)}
              disabled={deletingId === file.id}
              title="Remove file"
              className={`rounded-lg p-1.5 flex-shrink-0 ${isDarkTheme ? 'hover:bg-white/10 text-rose-400' : 'hover:bg-red-50 text-rose-600'} disabled:opacity-50`}
            >
              <Icons.Reject size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function RegisterModal({ projectName, editRow, onClose, onSaved }: ModalProps) {
  const { isDarkTheme } = useTheme();
  const tc = getThemeClasses(isDarkTheme);
  const isEditing = editRow?.id != null;

  const [drawingName, setDrawingName] = useState(editRow?.designAndDrawing ?? '');
  const [contractorName, setContractorName] = useState(String(editRow?.contractorName ?? ''));
  const [revision, setRevision] = useState<number | ''>(editRow?.revision ?? '');
  const [remarks, setRemarks] = useState(editRow?.remarks ?? '');
  const [submittedDate, setSubmittedDate] = useState('');
  const [consultantCommentsDate, setConsultantCommentsDate] = useState('');
  const [resubmittedDate, setResubmittedDate] = useState('');
  const [approvedDate, setApprovedDate] = useState('');
  const [useWorkflow, setUseWorkflow] = useState(false);
  const [events, setEvents] = useState<EventEntry[]>([{ action: 'SUBMITTED', eventDate: '', notes: '' }]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<DrawingRegisterFile[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    if (editRow) {
      setSubmittedDate(toDateInputValue(editRow.submissionByContractor));
      setConsultantCommentsDate(toDateInputValue(editRow.consultantCommentsDate));
      setResubmittedDate(toDateInputValue(editRow.resubmissionDate));
      setApprovedDate(toDateInputValue(editRow.approvedByConsultant));
      setExistingFiles(editRow.drawings ?? []);
    } else {
      setExistingFiles([]);
      setPendingFiles([]);
      setUseWorkflow(false);
      setEvents([{ action: 'SUBMITTED', eventDate: '', notes: '' }]);
    }
  }, [editRow]);

  useEffect(() => {
    if (!isEditing || editRow?.id == null) return;
    let cancelled = false;
    setLoadingDetail(true);
    void drawingRegisterApi.getRegisterRow(editRow.id).then((res) => {
      if (cancelled) return;
      const row: DrawingRegisterRow = res.data;
      setSubmittedDate(toDateInputValue(row.submittedDate));
      setConsultantCommentsDate(toDateInputValue(row.consultantCommentsDate));
      setResubmittedDate(toDateInputValue(row.resubmittedDate));
      setApprovedDate(toDateInputValue(row.approvedDate));
      setContractorName(String(row.contractorName ?? ''));
      setRevision(row.revision ?? '');
      setRemarks(row.remarks ?? '');
      setExistingFiles(row.drawings ?? []);
      if (row.workflowEvents?.length) {
        setUseWorkflow(true);
        setEvents(
          row.workflowEvents.map((ev) => ({
            action: ev.action,
            eventDate: toDateInputValue(ev.eventDate),
            notes: ev.notes ?? '',
          })),
        );
      }
    }).catch((err) => {
      if (!cancelled) setFormErr(getApiErrorMessage(err, 'Failed to load drawing details'));
    }).finally(() => {
      if (!cancelled) setLoadingDetail(false);
    });
    return () => { cancelled = true; };
  }, [isEditing, editRow?.id]);

  function addEvent() {
    setEvents(prev => [...prev, { action: 'SUBMITTED', eventDate: '', notes: '' }]);
  }
  function removeEvent(i: number) {
    setEvents(prev => prev.filter((_, idx) => idx !== i));
  }
  function setEventField(i: number, key: keyof EventEntry, val: string) {
    setEvents(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e));
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!picked.length) return;
    const combined = [...pendingFiles, ...picked];
    const validationErr = validateDrawingRegisterFiles(combined);
    if (validationErr) {
      setFormErr(validationErr);
      return;
    }
    setFormErr(null);
    setPendingFiles(combined);
  }

  function removePendingFile(index: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleDeleteExistingFile(fileId: number) {
    setDeletingFileId(fileId);
    setFormErr(null);
    try {
      await drawingRegisterApi.deleteRegisterFile(fileId);
      setExistingFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      setFormErr(getApiErrorMessage(err, 'Failed to delete file'));
    } finally {
      setDeletingFileId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    if (!drawingName.trim()) return setFormErr('Drawing name is required.');

    const fileValidation = pendingFiles.length
      ? validateDrawingRegisterFiles(pendingFiles)
      : null;
    if (fileValidation) return setFormErr(fileValidation);

    const workflowPayload = useWorkflow
      ? events
        .filter(ev => ev.action && ev.eventDate)
        .map(ev => ({
          action: ev.action,
          eventDate: ev.eventDate,
          ...(ev.notes.trim() ? { notes: ev.notes.trim() } : {}),
        }))
      : undefined;

    setSaving(true);
    try {
      let fileNotice: string | undefined;
      let savedRow: DrawingRegisterRow | undefined;
      if (isEditing) {
        const updated = await drawingRegisterApi.updateRegisterRow(editRow!.id!, {
          remarks,
          submittedDate: useWorkflow ? undefined : (submittedDate || undefined),
          consultantCommentsDate: useWorkflow ? undefined : (consultantCommentsDate || undefined),
          resubmittedDate: useWorkflow ? undefined : (resubmittedDate || undefined),
          approvedDate: useWorkflow ? undefined : (approvedDate || undefined),
          contractorName: contractorName || undefined,
          revision: revision !== '' ? Number(revision) : undefined,
          ...(workflowPayload?.length ? { workflowEvents: workflowPayload } : {}),
          ...(pendingFiles.length ? { files: pendingFiles } : {}),
        });
        savedRow = updated.data;
        if (pendingFiles.length && !updated.data.drawings?.length) {
          fileNotice = 'Record saved, but no files appeared in the API response. Try Edit again or refresh.';
        }
      } else {
        const created = await drawingRegisterApi.createRegisterRow({
          projectName,
          drawingName: drawingName.trim(),
          contractorName: contractorName || undefined,
          revision: revision !== '' ? Number(revision) : undefined,
          remarks: remarks || undefined,
          ...(useWorkflow && workflowPayload?.length
            ? { workflowEvents: workflowPayload }
            : {
              submittedDate: submittedDate || undefined,
              consultantCommentsDate: consultantCommentsDate || undefined,
              resubmittedDate: resubmittedDate || undefined,
              approvedDate: approvedDate || undefined,
            }),
          ...(pendingFiles.length ? { files: pendingFiles } : {}),
        });
        savedRow = created.data;
        if (pendingFiles.length && !created.data.drawings?.length) {
          fileNotice = 'Drawing saved, but uploaded file(s) were not returned by the server. Refresh or open Edit to verify attachments.';
        }
      }
      onSaved({ notice: fileNotice, savedRow });
    } catch (err) {
      setFormErr(getApiErrorMessage(err, 'Failed to save drawing record'));
    } finally {
      setSaving(false);
    }
  }

  const labelCls = `mb-1 block text-[10px] font-black uppercase tracking-widest ${tc.textSecondary}`;
  const inputCls = `w-full rounded-2xl px-4 py-2.5 text-sm font-medium outline-none transition-colors ${tc.input} ${tc.textPrimary}`;
  const allowedExtLabel = DRAWING_REGISTER_ALLOWED_EXT.join(', ');

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
            {loadingDetail && (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${isDarkTheme ? 'bg-white/5 text-white/70' : 'bg-slate-50 text-slate-600'}`}>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                Loading drawing details…
              </div>
            )}

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
                  placeholder="1" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Remarks</label>
                <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                  placeholder="e.g. Approved, Pending" className={inputCls} />
              </div>
            </div>

            {/* Workflow toggle */}
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
              <label className="relative inline-flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={useWorkflow} onChange={e => setUseWorkflow(e.target.checked)} className="sr-only" />
                <div className={`relative w-10 h-5 rounded-full transition-colors ${useWorkflow ? 'bg-indigo-600' : (isDarkTheme ? 'bg-white/20' : 'bg-slate-300')}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${useWorkflow ? 'left-[22px]' : 'left-0.5'}`} />
                </div>
                <span className={`text-xs font-bold ${tc.textSecondary}`}>
                  Use workflow events {isEditing ? '(replaces history when saved)' : '(recommended)'}
                </span>
              </label>
            </div>

            {/* Dates — direct or workflow */}
            {useWorkflow ? (
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Workflow Events
                </p>
                <div className="space-y-3">
                  {events.map((ev, i) => (
                    <div key={i} className={`rounded-2xl border p-3 space-y-2 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}>
                      <div className="flex gap-2 items-end">
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
                      <div>
                        <label className={labelCls}>Notes (optional)</label>
                        <input type="text" value={ev.notes} onChange={e => setEventField(i, 'notes', e.target.value)}
                          placeholder="e.g. First submission" className={inputCls} />
                      </div>
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

            {/* File attachments */}
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Drawing Files
              </p>
              <p className={`text-[10px] mb-3 ${tc.textMuted}`}>
                Allowed: {allowedExtLabel} · Max 100 MB per file
                {isEditing ? ' · New files attach to the current revision' : ''}
              </p>

              {existingFiles.length > 0 && (
                <div className="mb-3">
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${tc.textSecondary}`}>Existing files</p>
                  <DrawingFilesList
                    files={existingFiles}
                    isDarkTheme={isDarkTheme}
                    onDelete={handleDeleteExistingFile}
                    deletingId={deletingFileId}
                  />
                </div>
              )}

              {pendingFiles.length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${tc.textSecondary}`}>New uploads</p>
                  {pendingFiles.map((file, i) => (
                    <div key={`${file.name}-${i}`} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${tc.textPrimary}`}>{file.name}</p>
                        <p className={`text-[10px] ${tc.textMuted}`}>{formatDrawingFileSize(file.size)}</p>
                      </div>
                      <button type="button" onClick={() => removePendingFile(i)}
                        className={`rounded-lg p-1.5 ${isDarkTheme ? 'hover:bg-white/10 text-rose-400' : 'hover:bg-red-50 text-rose-600'}`}>
                        <Icons.Reject size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4 text-xs font-bold transition-colors ${isDarkTheme ? 'border-white/20 text-white/70 hover:bg-white/10' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                <Icons.Upload size={14} />
                Choose files
                <input
                  type="file"
                  multiple
                  accept={DRAWING_REGISTER_ALLOWED_EXT.join(',')}
                  onChange={handleFilePick}
                  className="sr-only"
                />
              </label>
            </div>

            {formErr && <p className={`text-sm font-bold ${isDarkTheme ? 'text-rose-400' : 'text-rose-600'}`}>{formErr}</p>}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button type="button" onClick={onClose} disabled={saving}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
                Cancel
              </button>
              <button type="submit" disabled={saving || loadingDetail}
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
  /** When false (hidden tab), card stays mounted but inactive. */
  isActive?: boolean;
}

export default function DrawingRegisterCard({
  project,
  selectedContractorName = null,
  syncContractorFromDashboard = false,
  isActive = true,
}: DrawingRegisterCardProps) {
  const { isDarkTheme } = useTheme();
  const tc = getThemeClasses(isDarkTheme);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

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
  const [showDrawingTable, setShowDrawingTable] = useState(true);

  // Always restore Image-1 framing when this section becomes visible again.
  useEffect(() => {
    if (!isActive) return;
    setShowDrawingTable(true);
    tableScrollRef.current?.scrollTo({ left: 0, top: 0 });
  }, [isActive]);

  const loadData = useCallback(async (signal?: AbortSignal, fresh = false) => {
    if (!project?.title) return;
    setLoading(true);
    setError(null);
    try {
      const res = await drawingRegisterApi.getClientReport({
        projectName: project.title,
        month: selMonth,
        year: selYear,
        view,
        fresh,
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
      void loadData(undefined, true);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Delete failed'));
    } finally {
      setDeleting(false);
    }
  }

  const MONTH_NAME = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selMonth - 1];
  const periodLabel = view === 'cumulative' ? `Jan – ${MONTH_NAME} ${selYear}` : `${MONTH_NAME} ${selYear}`;

  return (
    <div className={`w-full min-w-0 max-w-full rounded-2xl border shadow-md ${tc.bgPrimary} ${tc.border}`}>
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
      <div className={`px-4 sm:px-6 py-3 border-b ${tc.border} ${isDarkTheme ? 'bg-white/[0.02]' : 'bg-slate-50/80'}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1 min-w-0">
            <div className="grid grid-cols-2 gap-2 flex-1 min-w-0 sm:max-w-sm">
              <div>
                <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${tc.textSecondary}`}>Month</label>
                <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
                  className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium outline-none ${tc.input} ${tc.textPrimary}`}>
                  {MONTH_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <div>
                <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${tc.textSecondary}`}>Year</label>
                <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
                  className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium outline-none ${tc.input} ${tc.textPrimary}`}>
                  {YEAR_OPTS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="sm:pb-0.5">
              <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${tc.textSecondary}`}>View</label>
              <div className={`flex rounded-xl overflow-hidden border w-full sm:w-auto ${isDarkTheme ? 'border-white/20' : 'border-slate-300'}`}>
                {(['monthly', 'cumulative'] as const).map((v, i) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`flex-1 sm:flex-none sm:min-w-[7rem] py-2 px-3 text-xs font-bold transition-colors ${i > 0 ? `border-l ${isDarkTheme ? 'border-white/20' : 'border-slate-300'}` : ''} ${view === v ? 'bg-indigo-600 text-white' : isDarkTheme ? 'text-white/60 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {v === 'monthly' ? 'Monthly' : 'Cumulative'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 space-y-4 min-w-0">

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
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold ${tc.textPrimary}`}>
                      {reportData.rows.length} record{reportData.rows.length !== 1 ? 's' : ''}
                    </span>
                    <span className={`text-[10px] ${tc.textMuted}`}>·</span>
                    <span className={`text-xs font-medium ${tc.textSecondary}`}>{periodLabel}</span>
                    {countRowsWithFiles(reportData.rows) > 0 && (
                      <>
                        <span className={`text-[10px] ${tc.textMuted}`}>·</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isDarkTheme ? 'bg-cyan-950/50 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                          <Icons.Document size={10} />
                          {countRowsWithFiles(reportData.rows)} with files
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDrawingTable((v) => !v)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${tc.border} ${showDrawingTable ? (isDarkTheme ? 'bg-indigo-950/50 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200') : (isDarkTheme ? 'text-white/70 hover:bg-white/10' : 'text-slate-600 hover:bg-white')}`}
                  >
                    {showDrawingTable ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}
                    {showDrawingTable ? 'Hide table' : 'Show table'}
                  </button>
                </div>

                {showDrawingTable && (
                  <div className="space-y-3 min-w-0">
                    <DesktopTable
                      rows={reportData.rows}
                      isDarkTheme={isDarkTheme}
                      scrollRef={tableScrollRef}
                      onEdit={row => { setEditRow(row); setModalOpen(true); }}
                      onDelete={(id, label) => setDeleteConfirm({ id, label })}
                    />
                    <MobileCards
                      rows={reportData.rows}
                      isDarkTheme={isDarkTheme}
                      onEdit={row => { setEditRow(row); setModalOpen(true); }}
                      onDelete={(id, label) => setDeleteConfirm({ id, label })}
                    />
                  </div>
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
          onSaved={(result) => {
            setModalOpen(false);
            setEditRow(null);
            setShowDrawingTable(true);
            if (result?.savedRow) {
              setReportData((prev) => mergeSavedRowIntoReport(prev, result.savedRow!));
            }
            setSuccessMsg(
              result?.notice ??
                (editRow
                  ? 'Drawing record updated successfully'
                  : 'Drawing record created successfully'),
            );
            void loadData(undefined, true);
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
