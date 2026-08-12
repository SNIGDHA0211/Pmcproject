import React, { useMemo } from 'react';
import { Download, FileSpreadsheet, History, RefreshCw, RotateCcw } from 'lucide-react';
import type { MprReportRecord } from '../../types/mpr';
import {
  formatMprDateTime,
  formatMprMonthLabel,
  mprStatusClasses,
  mprStatusLabel,
} from '../../utils/mprHelpers';
import { useMprTheme } from '../../utils/mprTheme';

interface MprHistoryPanelProps {
  rows: MprReportRecord[];
  loading: boolean;
  busyId: number | null;
  selectedMonth?: string;
  onRegenerate: (id: number) => void;
  onDownloadPdf: (id: number) => void;
  onDownloadExcel: (id: number) => void;
}

const MprHistoryPanel: React.FC<MprHistoryPanelProps> = ({
  rows,
  loading,
  busyId,
  selectedMonth,
  onRegenerate,
  onDownloadPdf,
  onDownloadExcel,
}) => {
  const mpr = useMprTheme();

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const am = a.report_month.localeCompare(b.report_month);
        if (am !== 0) return -am;
        return b.version - a.version;
      }),
    [rows],
  );

  const actionBtn = mpr.isDark
    ? 'inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-50'
    : 'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700 transition hover:bg-[#eef6fb] disabled:opacity-50';

  if (loading) {
    return (
      <div className={`${mpr.card} flex min-h-[200px] items-center justify-center`}>
        <div
          className={`h-8 w-8 animate-spin rounded-full border-2 border-t-transparent ${
            mpr.isDark ? 'border-amber-400' : 'border-[#2563a8]'
          }`}
        />
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className={mpr.emptyState}>
        <History size={32} className={mpr.isDark ? 'text-slate-500' : 'text-slate-400'} aria-hidden />
        <p className={`mt-3 text-sm font-bold ${mpr.isDark ? 'text-white' : 'text-slate-900'}`}>
          No generated reports yet
        </p>
        <p className={`mt-1 text-xs ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Use <strong>Generate</strong> for {selectedMonth ? formatMprMonthLabel(selectedMonth) : 'a month'}.
        </p>
      </div>
    );
  }

  return (
    <div className={mpr.tableWrap}>
      <div className={mpr.tableHead}>
        <p className={`text-xs font-black uppercase tracking-wide ${mpr.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Report history ({sorted.length})
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr
              className={`border-b text-[10px] font-black uppercase tracking-wide ${mpr.divider} ${
                mpr.isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Ver.</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Generated</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const busy = busyId === row.id;
              const highlight = selectedMonth && row.report_month === selectedMonth;
              return (
                <tr
                  key={row.id}
                  className={`border-t ${
                    highlight
                      ? mpr.isDark
                        ? 'border-cyan-500/20 bg-cyan-500/10'
                        : 'border-[#2563a8]/20 bg-[#eef6fb]'
                      : mpr.divider
                  }`}
                >
                  <td className={`px-4 py-3 font-semibold ${mpr.isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {formatMprMonthLabel(row.report_month)}
                    {row.is_latest ? (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                          mpr.isDark ? 'bg-cyan-500/20 text-cyan-200' : 'bg-[#eef6fb] text-[#1e3a5f]'
                        }`}
                      >
                        Latest
                      </span>
                    ) : null}
                  </td>
                  <td className={`px-4 py-3 text-xs ${mpr.isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    v{row.version}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${mprStatusClasses(
                        row.status,
                        mpr.isDark,
                      )}`}
                    >
                      {mprStatusLabel(row.status)}
                    </span>
                    {row.error_message ? (
                      <p className="mt-1 max-w-xs text-[10px] text-rose-500">{row.error_message}</p>
                    ) : null}
                  </td>
                  <td className={`px-4 py-3 text-xs whitespace-nowrap ${mpr.isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {formatMprDateTime(row.generated_at)}
                  </td>
                  <td className={`px-4 py-3 text-xs ${mpr.isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {row.generated_by?.full_name || row.generated_by?.username || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {row.pdf_available ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onDownloadPdf(row.id)}
                          className={actionBtn}
                        >
                          <Download size={12} /> PDF
                        </button>
                      ) : null}
                      {row.excel_available ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onDownloadExcel(row.id)}
                          className={actionBtn}
                        >
                          <FileSpreadsheet size={12} /> Excel
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy || row.status === 'generating'}
                        onClick={() => onRegenerate(row.id)}
                        className={actionBtn}
                      >
                        {busy ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        Regenerate
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MprHistoryPanel;
