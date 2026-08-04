import React, { useState } from 'react';
import { MonthlyScope } from '../types';
import { Icons } from './Icons';
import StatusBadge from './StatusBadge';
import {
  formatVarianceTooltip,
  getScopeHealth,
  getScopeScheduleMetrics,
  personInitials,
  progressBarTone,
  toTitleCase,
} from '../utils/scopeSchedule';
import {
  formatScopeProgressFraction,
  readScopeCompletedQuantity,
  readScopePlannedQuantity,
  readScopeProgressPercent,
} from '../utils/scopeProgressFields';

interface ScopeTableProps {
  scopes: MonthlyScope[];
  loading: boolean;
  onEdit: (scope: MonthlyScope) => void;
  onDelete: (scope: MonthlyScope) => void;
  themeClasses: Record<string, string>;
  isDarkTheme?: boolean;
}

const PRIMARY_COLUMN_COUNT = 10;
const EXPAND_COL_WIDTH = '32px';
const ACTIONS_COL_WIDTH = '60px';
// Fixed pixel widths so every column is always readable; table scrolls horizontally on small screens
const COL_WIDTHS = {
  expand: '32px',
  project: '140px',
  activity: '150px',
  workArea: '130px',
  qty: '90px',
  status: '100px',
  duration: '140px',
  progress: '110px',
  delay: '90px',
  actions: '60px',
};
const TABLE_MIN_WIDTH = '1060px';
const CELL_PAD = 'px-3';
const ROW_CELL_CLASS = `py-2.5 align-middle ${CELL_PAD}`;
const EXPAND_CELL_CLASS = 'py-2.5 px-0 align-middle';
const ACTIONS_CELL_CLASS = `py-2.5 align-middle ${CELL_PAD}`;

const SECONDARY_TEXT = 'text-[11px] font-normal leading-tight text-[#94A3B8]';
const SECONDARY_TEXT_DARK = 'text-[11px] font-normal leading-tight text-slate-500';
const PRIMARY_CELL_TEXT = 'text-[13px] font-medium leading-tight';

function projectInitials(name?: string): string {
  return personInitials(name) || '?';
}

function formatScopeDate(dateStr: string): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatCompactDuration(start?: string, end?: string): string {
  const startLabel = formatShortDate(start);
  const endLabel = formatShortDate(end);
  if (startLabel === '—' && endLabel === '—') return '—';
  return `${startLabel} → ${endLabel}`;
}

function formatQty(planned: number, unit?: string): string {
  const unitLabel = unit?.trim() || '';
  return unitLabel ? `${planned} ${unitLabel}` : String(planned);
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ScopeProgressCell: React.FC<{
  scope: MonthlyScope;
  isDarkTheme: boolean;
}> = ({ scope, isDarkTheme }) => {
  const pct = Math.min(
    Math.max(Number(readScopeProgressPercent(scope) ?? scope.progress_percentage) || 0, 0),
    100,
  );
  const tone = progressBarTone(pct, isDarkTheme);

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-1">
      <span className={`text-[10px] font-semibold tabular-nums ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
        {formatScopeProgressFraction(scope)}
      </span>
      <div className="flex w-full min-w-0 items-center justify-end gap-2">
        <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${tone.text}`}>
          {pct.toFixed(0)}%
        </span>
        <div
          className={`h-1.5 min-w-0 flex-1 overflow-hidden rounded-full ${
            isDarkTheme ? 'bg-slate-700' : 'bg-[#E2E8F0]'
          }`}
          role="presentation"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${tone.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const HealthCell: React.FC<{
  scope: MonthlyScope;
  isDarkTheme: boolean;
}> = ({ scope, isDarkTheme }) => {
  const metrics = getScopeScheduleMetrics(scope);
  const health = getScopeHealth(metrics);

  const textClass =
    health.kind === 'late'
      ? isDarkTheme
        ? 'text-rose-400'
        : 'text-[#DC2626]'
      : health.kind === 'at_risk'
        ? isDarkTheme
          ? 'text-amber-400'
          : 'text-[#B45309]'
        : health.kind === 'on_track'
          ? isDarkTheme
            ? 'text-emerald-400'
            : 'text-[#15803D]'
          : isDarkTheme
            ? 'text-slate-500'
            : 'text-[#64748B]';

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums whitespace-nowrap ${textClass}`}
      title={health.fullTooltip}
    >
      <span aria-hidden className="text-[10px]">
        {health.emoji}
      </span>
      <span>{health.compactLabel}</span>
    </span>
  );
};

const ScopeExpandedPanel: React.FC<{
  scope: MonthlyScope;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}> = ({ scope, isDarkTheme, themeClasses }) => {
  const metrics = getScopeScheduleMetrics(scope);
  const health = getScopeHealth(metrics);
  const creatorName = scope.created_by_name?.trim();
  const varianceLabel =
    metrics.variancePct == null
      ? '—'
      : `${metrics.variancePct > 0 ? '+' : ''}${Math.round(metrics.variancePct)}%`;
  const remarks = scope.description?.trim() || '—';
  const completed = readScopeCompletedQuantity(scope);
  const planned = readScopePlannedQuantity(scope);

  const detailItems: { label: string; value: React.ReactNode; emphasis?: boolean }[] = [
    { label: 'Start Date', value: formatScopeDate(scope.start_date), emphasis: true },
    { label: 'End Date', value: formatScopeDate(scope.end_date), emphasis: true },
    {
      label: 'Planned Progress',
      value:
        metrics.expectedProgressPct != null
          ? `${Math.round(metrics.expectedProgressPct)}%`
          : '—',
      emphasis: true,
    },
    {
      label: 'Actual Progress',
      value: `${Math.round(metrics.actualProgressPct)}%`,
      emphasis: true,
    },
    { label: 'Variance', value: varianceLabel, emphasis: true },
    { label: 'Delay Status', value: `${health.emoji} ${health.label}`, emphasis: true },
    {
      label: 'Quantity',
      value: `${completed} / ${planned} ${scope.unit}`,
    },
    {
      label: 'Created By',
      value: creatorName ? (
        <span className="inline-flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
              isDarkTheme ? 'bg-indigo-500/20 text-indigo-300' : 'bg-[#EEF2FF] text-[#4F46E5]'
            }`}
          >
            {personInitials(creatorName)}
          </span>
          {creatorName}
        </span>
      ) : (
        '—'
      ),
    },
    { label: 'Remarks', value: remarks },
    { label: 'Last Updated', value: formatDateTime(scope.updated_at) },
  ];

  const labelClass = isDarkTheme ? themeClasses.textSecondary : 'text-[#94A3B8]';
  const valueClass = (emphasis?: boolean) =>
    emphasis
      ? `text-sm font-semibold ${isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'}`
      : `text-sm font-medium ${isDarkTheme ? 'text-slate-400' : 'text-[#64748B]'}`;

  return (
    <div
      className={`border-t px-4 py-3 sm:px-6 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-[#E2E8F0] bg-[#F8FAFC]'
      }`}
    >
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {detailItems.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className={`text-[10px] font-semibold uppercase tracking-wide ${labelClass}`}>
              {item.label}
            </dt>
            <dd className={`mt-0.5 truncate ${valueClass(item.emphasis)}`} title={String(item.value)}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className={`mt-2 text-[11px] ${labelClass}`} title={health.fullTooltip}>
        {health.fullTooltip}
      </p>
    </div>
  );
};

const actionBtnClass = (variant: 'edit' | 'delete', isDarkTheme: boolean) => {
  const base =
    'flex h-7 w-7 items-center justify-center rounded-md border border-transparent transition-colors duration-150';
  if (variant === 'edit') {
    return isDarkTheme
      ? `${base} text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/20 hover:shadow-sm`
      : `${base} text-[#2563EB] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:shadow-sm`;
  }
  return isDarkTheme
    ? `${base} text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/20 hover:shadow-sm`
    : `${base} text-[#DC2626] hover:border-[#FECACA] hover:bg-[#FEF2F2] hover:shadow-sm`;
};

const ScopeTable: React.FC<ScopeTableProps> = ({
  scopes,
  loading,
  onEdit,
  onDelete,
  themeClasses,
  isDarkTheme = false,
}) => {
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const secondaryMuted = isDarkTheme ? SECONDARY_TEXT_DARK : SECONDARY_TEXT;

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedScopes = [...scopes].sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sortField];
    const bVal = (b as unknown as Record<string, unknown>)[sortField];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedScopes = sortedScopes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(sortedScopes.length / pageSize);

  const SortIcon = ({ field }: { field: string }) =>
    sortField === field ? (
      <Icons.ChevronRight
        size={12}
        className={`ml-0.5 inline transition-transform ${sortDirection === 'desc' ? 'rotate-90' : '-rotate-90'}`}
      />
    ) : null;

  const headerCell = (
    label: string,
    sortKey?: string,
    options?: { className?: string; align?: 'left' | 'right' | 'center' }
  ) => {
    const align = options?.align ?? 'left';
    const alignClass =
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    return (
      <th
        scope="col"
        className={`whitespace-nowrap ${CELL_PAD} py-2.5 text-[10px] font-semibold uppercase tracking-wide ${alignClass} ${
          isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
        } ${sortKey ? 'cursor-pointer select-none hover:opacity-80' : ''} ${options?.className ?? ''}`}
        onClick={sortKey ? () => handleSort(sortKey) : undefined}
      >
        {label}
        {sortKey && <SortIcon field={sortKey} />}
      </th>
    );
  };

  const stickyHeaderBg = isDarkTheme ? 'bg-inherit' : 'bg-[#F8FAFC]';

  if (loading) {
    return (
      <div
        className={`overflow-hidden rounded-[20px] border ${
          isDarkTheme
            ? `${themeClasses.glassCard} ${themeClasses.border}`
            : 'border-[#E2E8F0] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
        }`}
      >
        <div className="p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className={`mt-4 text-sm font-medium ${themeClasses.textSecondary}`}>Loading scopes...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`monthly-scope-table overflow-hidden rounded-[20px] border ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border}`
          : 'border-[#E2E8F0] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
      }`}
      data-tour="scope-table"
    >
      <div className="overflow-x-auto overflow-y-auto max-h-[min(70vh,720px)]">
        <table className="w-full border-collapse text-left" style={{ minWidth: TABLE_MIN_WIDTH }}>
          <colgroup>
            <col style={{ width: COL_WIDTHS.expand }} />
            <col style={{ width: COL_WIDTHS.project }} />
            <col style={{ width: COL_WIDTHS.activity }} />
            <col style={{ width: COL_WIDTHS.workArea }} />
            <col style={{ width: COL_WIDTHS.qty }} />
            <col style={{ width: COL_WIDTHS.status }} />
            <col style={{ width: COL_WIDTHS.duration }} />
            <col style={{ width: COL_WIDTHS.progress }} />
            <col style={{ width: COL_WIDTHS.delay }} />
            <col style={{ width: COL_WIDTHS.actions }} />
          </colgroup>
          <thead className="sticky top-0 z-20">
            <tr
              className={`border-b ${
                isDarkTheme
                  ? `${themeClasses.bgSecondary} ${themeClasses.border}`
                  : 'border-[#E2E8F0] bg-[#F8FAFC]'
              }`}
            >
              <th
                scope="col"
                className={`sticky left-0 z-30 py-2.5 px-0 ${stickyHeaderBg}`}
                style={{ width: EXPAND_COL_WIDTH }}
                aria-label="Expand row"
              />
              {headerCell('Project', 'project_name', {
                className: `sticky left-8 z-30 ${stickyHeaderBg}`,
              })}
              {headerCell('Activity')}
              {headerCell('Work Area')}
              {headerCell('Qty', 'planned_quantity', { align: 'right' })}
              {headerCell('Status', 'status', { align: 'center' })}
              {headerCell('Duration')}
              {headerCell('Progress', 'progress_percentage', { align: 'right' })}
              {headerCell('Delay', undefined, { align: 'center' })}
              {headerCell('Actions', undefined, { align: 'right' })}
            </tr>
          </thead>
          <tbody>
            {paginatedScopes.length === 0 ? (
              <tr>
                <td
                  colSpan={PRIMARY_COLUMN_COUNT}
                  className={`px-6 py-16 text-center text-sm font-medium ${
                    isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
                  }`}
                >
                  No scope records match the current filters.
                </td>
              </tr>
            ) : (
              paginatedScopes.map((scope, index) => {
                const isExpanded = expandedIds.has(scope.id);
                const isEven = index % 2 === 1;
                const rowBg = isDarkTheme
                  ? isEven
                    ? 'bg-white/[0.03]'
                    : 'bg-transparent'
                  : isEven
                    ? 'bg-[#FAFBFC]'
                    : 'bg-white';
                const stickyBg = isDarkTheme
                  ? isEven
                    ? 'bg-slate-900/95 group-hover:bg-slate-800/95'
                    : 'bg-slate-950/95 group-hover:bg-slate-800/95'
                  : isEven
                    ? 'bg-[#FAFBFC] group-hover:bg-[#F8FAFC]'
                    : 'bg-white group-hover:bg-[#F8FAFC]';

                const sectionLabel = toTitleCase(scope.section) || '—';
                const locationLabel = toTitleCase(scope.location) || '—';
                const fullDuration = `${formatScopeDate(scope.start_date)} → ${formatScopeDate(scope.end_date)}`;

                return (
                  <React.Fragment key={scope.id}>
                    <tr
                      className={`group border-b transition-colors duration-200 ease-in-out ${
                        isDarkTheme
                          ? 'border-white/5 hover:bg-white/[0.06]'
                          : 'border-[#F1F5F9] hover:bg-[#F8FAFC]'
                      } ${rowBg} ${isExpanded ? (isDarkTheme ? 'bg-white/[0.06]' : 'bg-[#F8FAFC]') : ''}`}
                    >
                      <td className={`sticky left-0 z-10 ${EXPAND_CELL_CLASS} ${stickyBg}`}>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(scope.id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                            isDarkTheme
                              ? 'text-slate-500 hover:bg-white/10 hover:text-slate-200'
                              : 'text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                          }`}
                        >
                          <Icons.ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </td>
                      <td className={`sticky left-8 z-10 ${ROW_CELL_CLASS} ${stickyBg}`}>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-semibold ${
                              isDarkTheme
                                ? 'bg-indigo-500/15 text-indigo-300'
                                : 'bg-[#EEF2FF] text-[#4F46E5]'
                            }`}
                          >
                            {projectInitials(scope.project_name)}
                          </span>
                          <span
                            className={`truncate ${PRIMARY_CELL_TEXT} ${
                              isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
                            }`}
                            title={scope.project_name}
                          >
                            {scope.project_name}
                          </span>
                        </div>
                      </td>
                      <td className={ROW_CELL_CLASS}>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p
                            className={`truncate ${PRIMARY_CELL_TEXT} ${
                              isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
                            }`}
                            title={scope.category_name}
                          >
                            {toTitleCase(scope.category_name) || '—'}
                          </p>
                          <p className={`truncate ${secondaryMuted}`} title={scope.subcategory_name}>
                            {toTitleCase(scope.subcategory_name) || '—'}
                          </p>
                        </div>
                      </td>
                      <td className={`${ROW_CELL_CLASS} overflow-hidden`}>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p
                            className={`truncate ${PRIMARY_CELL_TEXT} ${
                              isDarkTheme ? 'text-slate-300' : 'text-[#334155]'
                            }`}
                            title={sectionLabel}
                          >
                            {sectionLabel}
                          </p>
                          <p className={`truncate ${secondaryMuted}`} title={locationLabel}>
                            {locationLabel}
                          </p>
                        </div>
                      </td>
                      <td
                        className={`${ROW_CELL_CLASS} text-right text-[11px] font-medium tabular-nums ${
                          isDarkTheme ? 'text-slate-400' : 'text-[#64748B]'
                        }`}
                      >
                        <span className="block truncate" title={formatQty(scope.planned_quantity, scope.unit)}>
                          {formatQty(scope.planned_quantity, scope.unit)}
                        </span>
                      </td>
                      <td className={`${ROW_CELL_CLASS} text-center`}>
                        <StatusBadge status={scope.status} isDarkTheme={isDarkTheme} compact />
                      </td>
                      <td
                        className={`${ROW_CELL_CLASS} text-[11px] font-normal whitespace-nowrap ${
                          isDarkTheme ? 'text-slate-400' : 'text-[#64748B]'
                        }`}
                        title={fullDuration}
                      >
                        {formatCompactDuration(scope.start_date, scope.end_date)}
                      </td>
                      <td className={ROW_CELL_CLASS}>
                        <ScopeProgressCell scope={scope} isDarkTheme={isDarkTheme} />
                      </td>
                      <td className={`${ROW_CELL_CLASS} text-center`}>
                        <HealthCell scope={scope} isDarkTheme={isDarkTheme} />
                      </td>
                      <td className={`${ACTIONS_CELL_CLASS} text-right`}>
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => onEdit(scope)}
                            title="Edit record"
                            aria-label="Edit record"
                            className={actionBtnClass('edit', isDarkTheme)}
                          >
                            <Icons.Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(scope)}
                            title="Delete record"
                            aria-label="Delete record"
                            className={actionBtnClass('delete', isDarkTheme)}
                          >
                            <Icons.Close size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr
                        className={
                          isDarkTheme ? 'border-b border-white/5' : 'border-b border-[#F1F5F9]'
                        }
                      >
                        <td colSpan={PRIMARY_COLUMN_COUNT} className="p-0">
                          <ScopeExpandedPanel
                            scope={scope}
                            isDarkTheme={isDarkTheme}
                            themeClasses={themeClasses}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-4 border-t px-4 py-4 sm:px-6 ${
            isDarkTheme ? themeClasses.border : 'border-[#E2E8F0]'
          }`}
        >
          <div className={`text-sm font-medium ${isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'}`}>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedScopes.length)} of {sortedScopes.length} scopes
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentPage(Math.max(1, currentPage - 1));
                setExpandedIds(new Set());
              }}
              disabled={currentPage === 1}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
                isDarkTheme ? themeClasses.buttonSecondary : 'border border-[#E2E8F0] bg-white hover:bg-slate-50'
              }`}
              aria-label="Previous page"
            >
              <Icons.ChevronRight size={16} className="rotate-180" />
            </button>
            <span
              className={`px-3 text-sm font-semibold tabular-nums ${
                isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
              }`}
            >
              {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => {
                setCurrentPage(Math.min(totalPages, currentPage + 1));
                setExpandedIds(new Set());
              }}
              disabled={currentPage === totalPages}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${
                isDarkTheme ? themeClasses.buttonSecondary : 'border border-[#E2E8F0] bg-white hover:bg-slate-50'
              }`}
              aria-label="Next page"
            >
              <Icons.ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScopeTable;
