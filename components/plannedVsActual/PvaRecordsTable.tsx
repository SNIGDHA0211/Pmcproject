import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import type { PvaExportFormat, PvaRecord } from '../../types/plannedVsActual';
import { formatIndianCurrencyCompact } from '../../utils/format';
import { getThemeClasses, useTheme } from '../../utils/theme';
import { MONTH_OPTIONS } from '../../utils/healthSafety';
import PvaVarianceBadge from './PvaVarianceBadge';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

type SortKey =
  | 'month'
  | 'year'
  | 'partyType'
  | 'contractorName'
  | 'plannedValue'
  | 'actualValue'
  | 'collection'
  | 'difference'
  | 'achievementPct'
  | 'collectionPct'
  | 'variancePct';

interface PvaRecordsTableProps {
  rows: PvaRecord[];
  isLoading?: boolean;
  onExport: (format: PvaExportFormat) => void;
  isExporting?: boolean;
}

const PAGE_SIZE = 10;

const monthLabel = (month: number) =>
  MONTH_OPTIONS.find((m) => m.value === month)?.label ?? String(month);

const PvaRecordsTable: React.FC<PvaRecordsTableProps> = ({
  rows,
  isLoading = false,
  onExport,
  isExporting = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim().toLowerCase());
  const [sortKey, setSortKey] = useState<SortKey>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = debouncedSearch;
    let list = [...rows];
    if (q) {
      list = list.filter((row) =>
        [
          row.partyType,
          row.contractorName,
          row.varianceStatus,
          row.reason,
          row.remarks,
          monthLabel(row.month),
          String(row.year),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    list.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return list;
  }, [rows, debouncedSearch, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const th = (key: SortKey, label: string) => (
    <th className="cursor-pointer whitespace-nowrap px-3 py-2 text-left" onClick={() => toggleSort(key)}>
      {label}
      {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <section
      className={`rounded-2xl border p-3 sm:p-4 ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border}`
          : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Records Table
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search records…"
              className={`w-full rounded-lg border py-2 pl-8 pr-3 text-xs outline-none ${themeClasses.input} ${themeClasses.border}`}
            />
          </div>
          {(['csv', 'excel', 'pdf'] as PvaExportFormat[]).map((format) => (
            <button
              key={format}
              type="button"
              disabled={isExporting}
              onClick={() => onExport(format)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase ${
                isDarkTheme
                  ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Download size={12} />
              {format}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={`min-w-full text-[11px] ${themeClasses.textPrimary}`}>
          <thead className={isDarkTheme ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}>
            <tr className="font-bold uppercase tracking-wide">
              {th('month', 'Month')}
              {th('year', 'Year')}
              {th('partyType', 'Type')}
              {th('contractorName', 'Contractor')}
              {th('plannedValue', 'Planned')}
              {th('actualValue', 'Actual')}
              {th('collection', 'Collection')}
              {th('difference', 'Difference')}
              {th('achievementPct', 'Achievement %')}
              {th('collectionPct', 'Collection %')}
              {th('variancePct', 'Variance %')}
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center">
                  Loading records…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={14} className={`px-3 py-8 text-center ${themeClasses.textMuted}`}>
                  No records found
                </td>
              </tr>
            ) : (
              pageRows.map((row, index) => (
                <tr
                  key={`${row.id ?? index}-${row.partyType}-${row.contractorId ?? 'x'}`}
                  className={`border-t ${isDarkTheme ? 'border-white/5' : 'border-slate-100'}`}
                >
                  <td className="px-3 py-2">{monthLabel(row.month)}</td>
                  <td className="px-3 py-2">{row.year || '—'}</td>
                  <td className="px-3 py-2">{row.partyType}</td>
                  <td className="px-3 py-2">{row.contractorName || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{formatIndianCurrencyCompact(row.plannedValue)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatIndianCurrencyCompact(row.actualValue)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatIndianCurrencyCompact(row.collection)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatIndianCurrencyCompact(row.difference)}</td>
                  <td className="px-3 py-2 tabular-nums">{Number(row.achievementPct).toFixed(1)}%</td>
                  <td className="px-3 py-2 tabular-nums">{Number(row.collectionPct).toFixed(1)}%</td>
                  <td className="px-3 py-2 tabular-nums">{Number(row.variancePct).toFixed(1)}%</td>
                  <td className="px-3 py-2">
                    <PvaVarianceBadge status={row.varianceStatus} isDark={isDarkTheme} />
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2" title={row.reason}>
                    {row.reason || '—'}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2" title={row.remarks}>
                    {row.remarks || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        <p className={themeClasses.textMuted}>
          {filtered.length} record{filtered.length === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border px-2 py-1 font-bold disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border px-2 py-1 font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
};

export default React.memo(PvaRecordsTable);
