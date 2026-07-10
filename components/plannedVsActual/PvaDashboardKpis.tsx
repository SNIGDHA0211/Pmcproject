import React from 'react';
import {
  CircleDollarSign,
  ClipboardList,
  Percent,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { PvaDashboardKpis } from '../../types/plannedVsActual';
import { formatIndianCurrencyCompact } from '../../utils/format';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface PvaDashboardKpisProps {
  data: PvaDashboardKpis | null;
  isLoading?: boolean;
  error?: string | null;
}

const PvaDashboardKpisPanel: React.FC<PvaDashboardKpisProps> = ({
  data,
  isLoading = false,
  error = null,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const cards = data
    ? [
        {
          label: 'Total Planned Value',
          value: formatIndianCurrencyCompact(data.totalPlannedValue),
          icon: Wallet,
          color: '#6366f1',
        },
        {
          label: 'Total Actual Value',
          value: formatIndianCurrencyCompact(data.totalActualValue),
          icon: CircleDollarSign,
          color: '#0ea5e9',
        },
        {
          label: 'Total Collection',
          value: formatIndianCurrencyCompact(data.totalCollection),
          icon: TrendingUp,
          color: '#10b981',
        },
        {
          label: 'Total Difference',
          value: formatIndianCurrencyCompact(data.totalDifference),
          icon: ClipboardList,
          color: '#f59e0b',
        },
        {
          label: 'Overall Achievement %',
          value: `${Number(data.overallAchievementPct).toFixed(1)}%`,
          icon: Percent,
          color: '#14b8a6',
        },
        {
          label: 'Overall Collection %',
          value: `${Number(data.overallCollectionPct).toFixed(1)}%`,
          icon: Percent,
          color: '#8b5cf6',
        },
        {
          label: 'Updated Projects',
          value: String(data.updatedProjects),
          icon: ClipboardList,
          color: '#22c55e',
        },
        {
          label: 'Pending Projects',
          value: String(data.pendingProjects),
          icon: ClipboardList,
          color: '#ef4444',
        },
      ]
    : [];

  return (
    <section className="space-y-2">
      <h2 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
        Dashboard KPIs
      </h2>
      {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`h-[72px] animate-pulse rounded-xl border ${
                isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-100'
              }`}
            />
          ))}
        </div>
      ) : !data ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            isDarkTheme
              ? 'border-white/10 bg-white/[0.03] text-slate-400'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          No portfolio KPI data for this month yet. Save SCL or Contractor records to populate
          dashboard totals.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`rounded-xl border px-3 py-3 ${
                  isDarkTheme
                    ? 'border-white/10 bg-[#0f2744]/70'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${card.color}18`, color: card.color }}
                  >
                    <Icon size={14} />
                  </span>
                  <p
                    className={`truncate text-[9px] font-bold uppercase tracking-wide ${themeClasses.textMuted}`}
                  >
                    {card.label}
                  </p>
                </div>
                <p
                  className={`mt-2 truncate text-base font-black tabular-nums ${themeClasses.textPrimary}`}
                  style={{ color: card.color }}
                >
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default React.memo(PvaDashboardKpisPanel);
