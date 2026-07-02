import React from 'react';
import type { FinancialExecutiveMetrics } from '../../utils/financialDashboardMetrics';
import { formatFinancialAmount } from '../../utils/financialDashboardMetrics';

interface MetricCardProps {
  label: string;
  value: string;
  pct?: number;
  status?: 'good' | 'warn' | 'bad' | 'neutral';
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}

function statusTone(status: MetricCardProps['status'], isDarkTheme: boolean) {
  if (status === 'good') return isDarkTheme ? 'text-emerald-400' : 'text-[#16A34A]';
  if (status === 'warn') return isDarkTheme ? 'text-amber-400' : 'text-[#D97706]';
  if (status === 'bad') return isDarkTheme ? 'text-rose-400' : 'text-[#DC2626]';
  return isDarkTheme ? 'text-slate-300' : 'text-[#0F172A]';
}

function barColor(status: MetricCardProps['status'], isDarkTheme: boolean) {
  if (status === 'good') return isDarkTheme ? 'bg-emerald-500' : 'bg-[#22C55E]';
  if (status === 'warn') return isDarkTheme ? 'bg-amber-500' : 'bg-[#F59E0B]';
  if (status === 'bad') return isDarkTheme ? 'bg-rose-500' : 'bg-[#EF4444]';
  return isDarkTheme ? 'bg-indigo-500' : 'bg-[#4F46E5]';
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  pct,
  status = 'neutral',
  isDarkTheme,
  themeClasses,
}) => {
  const width = pct != null ? Math.min(100, Math.max(0, pct)) : 0;
  return (
    <div
      className={`rounded-xl border p-4 ${
        isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-[#E2E8F0] bg-white'
      }`}
    >
      <p className={`text-xs font-semibold ${isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'}`}>
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${statusTone(status, isDarkTheme)}`}>{value}</p>
      {pct != null && (
        <div
          className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${
            isDarkTheme ? 'bg-slate-700' : 'bg-[#E2E8F0]'
          }`}
        >
          <div className={`h-full rounded-full ${barColor(status, isDarkTheme)}`} style={{ width: `${width}%` }} />
        </div>
      )}
    </div>
  );
};

interface FinancialPerformancePanelProps {
  metrics: FinancialExecutiveMetrics;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}

const FinancialPerformancePanel: React.FC<FinancialPerformancePanelProps> = ({
  metrics,
  isDarkTheme,
  themeClasses,
}) => {
  const physStatus =
    metrics.physicalProgressPct >= 70 ? 'good' : metrics.physicalProgressPct >= 40 ? 'warn' : 'bad';
  const finStatus =
    metrics.financialProgressPct >= 70 ? 'good' : metrics.financialProgressPct >= 40 ? 'warn' : 'bad';
  const cvStatus =
    metrics.costVariance == null
      ? 'neutral'
      : metrics.costVariance >= 0
        ? 'good'
        : 'bad';
  const svStatus =
    metrics.scheduleVariance == null
      ? 'neutral'
      : metrics.scheduleVariance >= 0
        ? 'good'
        : 'bad';

  return (
    <div className="financial-performance-panel progress-status-card grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Physical Progress"
        value={`${Math.round(metrics.physicalProgressPct)}%`}
        pct={metrics.physicalProgressPct}
        status={physStatus}
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      />
      <MetricCard
        label="Financial Progress"
        value={`${Math.round(metrics.financialProgressPct)}%`}
        pct={metrics.financialProgressPct}
        status={finStatus}
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      />
      <MetricCard
        label="Cost Variance"
        value={
          metrics.costVariance == null
            ? '—'
            : formatFinancialAmount(metrics.costVariance)
        }
        status={cvStatus}
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      />
      <MetricCard
        label="Schedule Variance"
        value={
          metrics.scheduleVariance == null
            ? '—'
            : formatFinancialAmount(metrics.scheduleVariance)
        }
        status={svStatus}
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      />
    </div>
  );
};

export default FinancialPerformancePanel;
