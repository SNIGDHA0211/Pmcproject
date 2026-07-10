import React from 'react';
import { Building2 } from 'lucide-react';
import type { PvaRecord } from '../../types/plannedVsActual';
import { formatIndianCurrencyCompact, formatIndianCurrencyFull } from '../../utils/format';
import { getThemeClasses, useTheme } from '../../utils/theme';
import PvaVarianceBadge from './PvaVarianceBadge';

interface PvaPartyCardProps {
  title: string;
  subtitle?: string;
  data: PvaRecord | null;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

const Metric: React.FC<{
  label: string;
  value: string;
  full?: string;
  tone?: string;
}> = ({ label, value, full, tone }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-100 bg-white'
      }`}
    >
      <p className={`text-[9px] font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-black tabular-nums ${tone ?? themeClasses.textPrimary}`}
        title={full ?? value}
      >
        {value}
      </p>
    </div>
  );
};

const PvaPartyCard: React.FC<PvaPartyCardProps> = ({
  title,
  subtitle,
  data,
  isLoading = false,
  error = null,
  emptyMessage = 'No data for this period',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const hasData = Boolean(data);

  return (
    <article
      className={`overflow-hidden rounded-2xl border ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border}`
          : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
      }`}
    >
      <header
        className={`flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5 ${
          isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDarkTheme ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            <Building2 size={18} />
          </span>
          <div className="min-w-0">
            <h3 className={`truncate text-sm font-black uppercase tracking-wide ${themeClasses.textPrimary}`}>
              {title}
            </h3>
            {subtitle && (
              <p className={`mt-0.5 truncate text-[11px] ${themeClasses.textMuted}`}>{subtitle}</p>
            )}
          </div>
        </div>
        {hasData && data?.varianceStatus ? (
          <PvaVarianceBadge status={data.varianceStatus} isDark={isDarkTheme} />
        ) : null}
      </header>

      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className={`h-36 animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
        ) : error ? (
          <p className="text-sm font-semibold text-rose-500">{error}</p>
        ) : !hasData ? (
          <p className={`text-sm font-medium ${themeClasses.textMuted}`}>{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <Metric
                label="Planned Value"
                value={formatIndianCurrencyCompact(data!.plannedValue)}
                full={formatIndianCurrencyFull(data!.plannedValue)}
              />
              <Metric
                label="Actual Value"
                value={formatIndianCurrencyCompact(data!.actualValue)}
                full={formatIndianCurrencyFull(data!.actualValue)}
              />
              <Metric
                label="Collection"
                value={formatIndianCurrencyCompact(data!.collection)}
                full={formatIndianCurrencyFull(data!.collection)}
              />
              <Metric
                label="Difference"
                value={formatIndianCurrencyCompact(data!.difference)}
                full={formatIndianCurrencyFull(data!.difference)}
                tone={
                  data!.difference === 0
                    ? isDarkTheme
                      ? 'text-emerald-300'
                      : 'text-emerald-700'
                    : isDarkTheme
                      ? 'text-amber-300'
                      : 'text-amber-700'
                }
              />
              <Metric label="Achievement %" value={`${Number(data!.achievementPct).toFixed(1)}%`} />
              <Metric label="Collection %" value={`${Number(data!.collectionPct).toFixed(1)}%`} />
              <Metric label="Variance %" value={`${Number(data!.variancePct).toFixed(1)}%`} />
              {data!.varianceStatus ? (
                <Metric
                  label="Variance Status"
                  value={String(data!.varianceStatus).replace(/_/g, ' ')}
                />
              ) : null}
            </div>

            {(data!.reason || data!.remarks) && (
              <div
                className={`grid gap-2 rounded-xl border p-3 text-[11px] sm:grid-cols-2 ${
                  isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div>
                  <p className={`font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>
                    Reason for Difference
                  </p>
                  <p className={`mt-1 font-medium ${themeClasses.textPrimary}`}>
                    {data!.reason || '—'}
                  </p>
                </div>
                <div>
                  <p className={`font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>
                    Remarks
                  </p>
                  <p className={`mt-1 font-medium ${themeClasses.textPrimary}`}>
                    {data!.remarks || '—'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default React.memo(PvaPartyCard);
