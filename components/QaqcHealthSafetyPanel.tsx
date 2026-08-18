import React, { useMemo } from 'react';
import { AlertTriangle, Clock, Shield } from 'lucide-react';
import type { HealthSafetyDashboardData } from '../services/api';
import HealthSafetyPyramid from './HealthSafetyPyramid';
import HealthSafetyTrendChart from './HealthSafetyTrendChart';
import HealthSafetyScorecardGrid from './HealthSafetyScorecardGrid';
import { resolveManHoursWorked } from '../utils/healthSafetyScorecard';
import {
  getHealthSafetyStatus,
  INCIDENT_KPI_CONFIG,
  monthYearLabel,
  statusBadgeClasses,
  toIncidentMetrics,
} from '../utils/healthSafety';
import { getThemeClasses, useTheme } from '../utils/theme';
import { SectionLoadingPanel } from './WorkspaceStatusPanels';

interface QaqcHealthSafetyPanelProps {
  projectName?: string | null;
  dashboard: HealthSafetyDashboardData | null;
  loading?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

const QaqcHealthSafetyPanel: React.FC<QaqcHealthSafetyPanelProps> = ({
  projectName,
  dashboard,
  loading = false,
  onEdit,
  onDelete,
  canDelete = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const record = dashboard?.currentMonth ?? null;
  const ytd = dashboard?.ytdSummary ?? null;
  const year = dashboard?.selectedYear ?? record?.year ?? new Date().getFullYear();
  const month = dashboard?.selectedMonth ?? record?.month ?? new Date().getMonth() + 1;

  const status = useMemo(
    () => (record ? getHealthSafetyStatus(record) : null),
    [record],
  );

  const cardCls = `rounded-2xl border p-4 sm:p-5 ${
    isDarkTheme
      ? `${themeClasses.glassCard} ${themeClasses.border}`
      : 'border-slate-200 bg-white shadow-sm'
  }`;

  return (
    <div className={cardCls}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDarkTheme
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25'
                : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
            }`}
          >
            <Shield size={20} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h3 className={`text-xs font-black uppercase tracking-widest sm:text-sm ${themeClasses.textPrimary}`}>
              Health &amp; Safety Status
            </h3>
            <p className={`mt-0.5 truncate text-[11px] font-semibold sm:text-xs ${themeClasses.textSecondary}`}>
              {projectName ? `${projectName} · ` : ''}
              {monthYearLabel(month, year)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500"
            >
              {record ? 'Edit H&S' : 'Add H&S'}
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                isDarkTheme
                  ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10'
                  : 'border-rose-200 text-rose-600 hover:bg-rose-50'
              }`}
            >
              Delete
            </button>
          )}
          {status && (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadgeClasses[status.level]}`}
            >
              {status.label}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <SectionLoadingPanel label="Loading health and safety" minHeight={200} />
      ) : !record ? (
        <div
          className={`flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center ${
            isDarkTheme ? 'border-white/15 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'
          }`}
        >
          <Shield size={28} className={isDarkTheme ? 'text-slate-500' : 'text-slate-400'} />
          <p className={`mt-2 text-sm font-semibold ${themeClasses.textSecondary}`}>
            No health &amp; safety data for this project yet.
          </p>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-500"
            >
              Add H&amp;S Record
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <HealthSafetyScorecardGrid record={record} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className={`min-h-[180px] rounded-xl border p-3 sm:p-4 xl:col-span-5 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/60'}`}>
              <p className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Legacy incident pyramid
              </p>
              <HealthSafetyPyramid stats={toIncidentMetrics(record)} variant="summary" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-7">
              <div
                className={`relative overflow-hidden rounded-xl border px-4 py-3 ${
                  isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className={`absolute inset-y-0 left-0 w-1 ${isDarkTheme ? 'bg-blue-400' : 'bg-blue-500'}`} />
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
                      Man Hrs Worked (#3)
                    </p>
                    <p className={`mt-1 text-2xl font-black tabular-nums sm:text-3xl ${themeClasses.textPrimary}`}>
                      {resolveManHoursWorked(record).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${isDarkTheme ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                    <Clock size={16} />
                  </span>
                </div>
              </div>

              <div
                className={`relative overflow-hidden rounded-xl border px-4 py-3 ${
                  isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className={`absolute inset-y-0 left-0 w-1 ${isDarkTheme ? 'bg-rose-400' : 'bg-rose-500'}`} />
                <div className="flex items-start justify-between gap-2 pl-2">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
                      Man Hours Lost (#9)
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-rose-500 sm:text-3xl">
                      {record.lossOfManhours.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${isDarkTheme ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>
                    <AlertTriangle size={16} />
                  </span>
                </div>
              </div>

              {ytd && (
                <div
                  className={`sm:col-span-2 rounded-xl border px-4 py-3 ${
                    isDarkTheme ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-100 bg-emerald-50/80'
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    Year-to-Date Summary ({year})
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {INCIDENT_KPI_CONFIG.map((cfg) => {
                      const ytdMetrics = toIncidentMetrics(ytd);
                      return (
                        <div key={cfg.key} className="text-center">
                          <p className={`text-[9px] font-bold uppercase ${themeClasses.textSecondary}`}>{cfg.shortLabel}</p>
                          <p className={`text-lg font-black tabular-nums ${themeClasses.textPrimary}`}>
                            {(ytdMetrics[cfg.key] ?? 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {dashboard?.monthlyRecords && dashboard.monthlyRecords.length > 1 && (
            <div className={`rounded-xl border p-3 sm:p-4 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/60'}`}>
              <p className={`mb-3 text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Incident Trend
              </p>
              <div className="h-[200px] w-full min-w-0 sm:h-[220px]">
                <HealthSafetyTrendChart records={dashboard.monthlyRecords} year={year} variant="lines" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QaqcHealthSafetyPanel;
