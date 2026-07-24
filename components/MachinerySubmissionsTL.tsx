import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme, getThemeClasses } from '../utils/theme';
import { Icons } from './Icons';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { CardEditButton } from './FormulaInfoButton';
import { plantMachineryApi } from '../services/api';
import { formatIsoDateLabel, toLocalDateIso } from '../utils/format';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import {
  computeMachinerySummary,
  extractMachineryReportList,
  getMachineryReportUpdatedAtIso,
  isWorkingMachineryStatus,
  mapReportItemsToMachineryRows,
  normalizeMachineryReportDateIso,
  normalizeMachineryStatus,
  parseMachineryQty,
  pickDailyMachineryReport,
  PLANT_MACHINERY_UPDATED_EVENT,
  readReportSummary,
  resolveMachineryReportWithItems,
  type MachineryRow,
} from '../utils/machineryDashboard';

interface MachinerySubmission {
  projectName: string;
  date: string;
  machinery: MachineryRow[];
  submittedAt: string;
  isToday: boolean;
  summary?: ReturnType<typeof computeMachinerySummary>;
}

interface MachinerySubmissionsTLProps {
  projectName?: string;
  projectId?: string;
  currentUser?: { role?: string };
  onNavigate?: (tab: string) => void;
}

const REFRESH_MS = 60_000;

function formatSubmittedAt(value?: string): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function mapReportToSubmission(
  report: Record<string, unknown>,
  isToday: boolean
): MachinerySubmission {
  const items = (report.machinery_items ?? report.items ?? []) as Record<string, unknown>[];
  const machinery = mapReportItemsToMachineryRows(items);
  const summaryFromApi = readReportSummary(report);
  const summary = summaryFromApi ?? computeMachinerySummary(machinery);

  return {
    projectName: String(report.project_name ?? report.projectName ?? ''),
    date: normalizeMachineryReportDateIso(report),
    machinery,
    submittedAt: getMachineryReportUpdatedAtIso(report),
    isToday,
    summary,
  };
}

async function resolveReportWithItems(report: Record<string, unknown>): Promise<Record<string, unknown>> {
  return resolveMachineryReportWithItems(report);
}

const MachinerySubmissionsTL: React.FC<MachinerySubmissionsTLProps> = ({
  projectName,
  projectId,
  onNavigate,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const [latestSubmission, setLatestSubmission] = useState<MachinerySubmission | null>(null);
  const [reportDateIso, setReportDateIso] = useState(() => toLocalDateIso());
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchTodaySubmission = useCallback(async () => {
    const effectiveProjectName = projectName || projectId;
    const today = toLocalDateIso();
    setReportDateIso(today);

    if (!effectiveProjectName) {
      setLatestSubmission(null);
      setFetchError(null);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await plantMachineryApi.getReports({
        project_name: effectiveProjectName,
        report_date_lte: today,
        ordering: '-report_date',
      });

      const picked = pickDailyMachineryReport(extractMachineryReportList(response.data), today);
      if (picked) {
        const reportWithItems = await resolveReportWithItems(picked.report);
        setLatestSubmission(mapReportToSubmission(reportWithItems, picked.isToday));
      } else {
        setLatestSubmission(null);
      }
    } catch (error) {
      console.error('Failed to fetch Plant & Machinery daily report:', error);
      setLatestSubmission(null);
      setFetchError("Unable to load today's machinery log.");
    } finally {
      setIsLoading(false);
    }
  }, [projectName, projectId]);

  useEffect(() => {
    fetchTodaySubmission();

    const intervalId = window.setInterval(fetchTodaySubmission, REFRESH_MS);
    const onFocus = () => fetchTodaySubmission();
    const onMachineryUpdated = () => fetchTodaySubmission();

    window.addEventListener('focus', onFocus);
    window.addEventListener(PLANT_MACHINERY_UPDATED_EVENT, onMachineryUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(PLANT_MACHINERY_UPDATED_EVENT, onMachineryUpdated);
    };
  }, [fetchTodaySubmission]);

  const visibleMachinery = useMemo(
    () => (latestSubmission?.machinery ?? []).filter((item) => parseMachineryQty(item.qty) > 0),
    [latestSubmission?.machinery]
  );

  const summary = useMemo(() => computeMachinerySummary(visibleMachinery), [visibleMachinery]);

  const goToPlantMachinery = () => onNavigate?.('machinery_list');

  const cardShellClass = `relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border p-3 shadow-sm sm:p-4 ${themeClasses.glassCard} ${themeClasses.border}`;

  const statusChipClass = (status: string) => {
    if (isWorkingMachineryStatus(status)) {
      return isDarkTheme
        ? 'border-slate-500/40 bg-slate-500/15 text-slate-200'
        : 'border-slate-200 bg-slate-100 text-slate-700';
    }
    if (normalizeMachineryStatus(status) === 'Under Maintenance') {
      return isDarkTheme
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200/90'
        : 'border-amber-200/80 bg-amber-50 text-amber-800';
    }
    return isDarkTheme
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200/90'
      : 'border-rose-200/80 bg-rose-50 text-rose-800';
  };

  const qtyChipClass = (qty: number) =>
    qty > 0
      ? isDarkTheme
        ? 'border-slate-500/40 bg-slate-500/15 text-slate-200'
        : 'border-slate-200 bg-slate-100 text-slate-800'
      : isDarkTheme
        ? 'border-white/10 bg-white/5 text-slate-400'
        : 'border-slate-200 bg-white text-slate-500';

  const renderCardHeader = (subtitle?: string, showDateBadge = false, dateLabel?: string) => (
    <div className={`mb-3 flex flex-col gap-2 border-b pb-3 pt-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 ${themeClasses.border}`}>
      <div className="min-w-0 flex-1">
        <h3 className={typo.sectionTitle(isDarkTheme)}>Site Machinery Log</h3>
        {subtitle && (
          <p className={`mt-1 line-clamp-3 text-[10px] font-medium leading-snug tracking-wide sm:text-xs ${themeClasses.textMuted}`}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 self-stretch sm:self-auto">
        {showDateBadge && dateLabel && (
          <div
            className={`max-w-full truncate rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase sm:text-xs ${
              isDarkTheme
                ? 'border-white/10 bg-white/5 text-slate-300'
                : 'border-slate-200 bg-slate-50 text-[#1e3a5f]'
            }`}
          >
            Date: {dateLabel}
          </div>
        )}
        <CardEditButton
          onClick={goToPlantMachinery}
          title={latestSubmission ? 'Edit in Plant Machinery' : 'Add machinery in Plant Machinery'}
        />
      </div>
    </div>
  );

  if (isLoading && !latestSubmission) {
    return (
      <div className={cardShellClass}>
        <DashboardCardTopAccent variant="executive" />
        {renderCardHeader('Loading today\'s report…')}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div
            className={`h-8 w-8 animate-spin rounded-full border-2 border-t-transparent ${isDarkTheme ? 'border-blue-400' : 'border-blue-600'}`}
          />
          <p className={`mt-3 ${typo.bodyBold} ${themeClasses.textMuted}`}>Loading today&apos;s machinery log…</p>
        </div>
      </div>
    );
  }

  if (!latestSubmission) {
    return (
      <div className={cardShellClass}>
        <DashboardCardTopAccent variant="executive" />
        {renderCardHeader(`Today: ${formatIsoDateLabel(reportDateIso)}`)}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Icons.Activity className={`mb-2 ${themeClasses.textMuted}`} size={24} />
          <p className={`${typo.bodyBold} ${themeClasses.textMuted}`}>
            {fetchError ||
              `No Plant & Machinery report submitted for today (${formatIsoDateLabel(reportDateIso)}).`}
          </p>
          <p className={`mt-1 ${typo.helper} ${themeClasses.textMuted}`}>
            Use the edit button above to add machinery in Plant Machinery.
          </p>
        </div>
      </div>
    );
  }

  const { totalMachines, workingMachines, notWorkingMachines } = summary;
  const reportDateLabel = formatIsoDateLabel(latestSubmission.date || reportDateIso);
  const subtitle = latestSubmission.isToday
    ? `Daily report · Last updated: ${formatSubmittedAt(latestSubmission.submittedAt)}`
    : `Daily report for ${reportDateLabel} · Last updated: ${formatSubmittedAt(latestSubmission.submittedAt)} · No report for today (${formatIsoDateLabel(reportDateIso)})`;

  return (
    <div className={`${cardShellClass} transition-shadow hover:shadow-md`}>
      <DashboardCardTopAccent variant="executive" />
      {renderCardHeader(subtitle, true, reportDateLabel)}

      <div className={`min-h-0 flex-1 overflow-auto rounded-xl border ${themeClasses.border}`}>
        {/* Mobile cards */}
        <div className={`space-y-2 p-2 md:hidden ${themeClasses.bgSecondary}`}>
          {visibleMachinery.map((item, idx) => (
            <div
              key={`mobile-${item.srNo}-${item.particular}-${idx}`}
              className={`rounded-xl border p-3 ${themeClasses.border} ${isDarkTheme ? 'bg-white/[0.03]' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`min-w-0 flex-1 text-sm font-semibold leading-snug ${themeClasses.textPrimary}`}>
                  {item.particular}
                </p>
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${qtyChipClass(parseMachineryQty(item.qty))}`}
                >
                  Qty: {item.qty}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-md border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusChipClass(item.status ?? '')}`}>
                  {normalizeMachineryStatus(item.status)}
                </span>
                {item.remark && (
                  <span className={`text-xs ${themeClasses.textMuted}`}>{item.remark}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <table className={`hidden w-full min-w-[28rem] border-collapse text-left md:table ${typo.tableCell}`}>
          <thead>
            <tr className={`border-b ${themeClasses.border} ${themeClasses.bgSecondary}`}>
              <th className={`px-2.5 py-2 ${typo.tableHeader} ${themeClasses.textMuted}`}>Particular</th>
              <th className={`px-2.5 py-2 text-center ${typo.tableHeader} ${themeClasses.textMuted}`}>Qty</th>
              <th className={`px-2.5 py-2 text-center ${typo.tableHeader} ${themeClasses.textMuted}`}>Status</th>
              <th className={`px-2.5 py-2 ${typo.tableHeader} ${themeClasses.textMuted}`}>Remark</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkTheme ? 'divide-white/5' : 'divide-slate-100'}`}>
            {visibleMachinery.map((item, idx) => (
              <tr key={`${item.srNo}-${item.particular}-${idx}`} className={`${themeClasses.bgHover} transition-colors`}>
                <td className={`px-2.5 py-2 font-semibold ${themeClasses.textPrimary}`}>{item.particular}</td>
                <td className="px-2.5 py-2 text-center">
                  <span
                    className={`inline-flex min-w-[1.75rem] justify-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${qtyChipClass(parseMachineryQty(item.qty))}`}
                  >
                    {item.qty}
                  </span>
                </td>
                <td className="px-2.5 py-2 text-center">
                  <span className={`inline-flex rounded-md border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusChipClass(item.status ?? '')}`}>
                    {normalizeMachineryStatus(item.status)}
                  </span>
                </td>
                <td className={`px-2.5 py-2 ${typo.tableCell} ${themeClasses.textMuted}`}>{item.remark || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[380px]:grid-cols-3 sm:gap-2.5">
        {[
          ['Total Machines', totalMachines, themeClasses.textPrimary],
          ['Working', workingMachines, isDarkTheme ? 'text-slate-200' : 'text-[#1e3a5f]'],
          [
            'Not Working',
            notWorkingMachines,
            notWorkingMachines > 0
              ? isDarkTheme
                ? 'text-rose-300'
                : 'text-rose-700'
              : themeClasses.textPrimary,
          ],
        ].map(([label, value, color]) => (
          <div
            key={label as string}
            className={`rounded-lg border px-3 py-2.5 text-center min-[380px]:text-left ${themeClasses.border} ${isDarkTheme ? 'bg-white/[0.03]' : 'bg-slate-50/80'}`}
          >
            <p className={`${typo.totalsLabel} ${themeClasses.textMuted}`}>{label}</p>
            <p className={`${typo.totalsValue} font-bold tabular-nums ${color}`}>{Number(value).toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MachinerySubmissionsTL;
