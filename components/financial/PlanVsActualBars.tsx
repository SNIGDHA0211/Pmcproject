import React from 'react';
import { planActualVariance } from '../../utils/financialDashboardMetrics';

interface PlanVsActualBarsProps {
  plan: number;
  actual: number;
  label?: string;
  isDarkTheme: boolean;
}

const PlanVsActualBars: React.FC<PlanVsActualBarsProps> = ({
  plan,
  actual,
  label = 'Monthly',
  isDarkTheme,
}) => {
  const variance = planActualVariance(plan, actual);
  const varianceTone =
    variance > 0
      ? isDarkTheme
        ? 'text-emerald-400'
        : 'text-[#16A34A]'
      : variance < 0
        ? isDarkTheme
          ? 'text-rose-400'
          : 'text-[#DC2626]'
        : isDarkTheme
          ? 'text-slate-400'
          : 'text-[#64748B]';

  const renderBar = (value: number, color: string) => (
    <div className="flex items-center gap-3">
      <span className={`w-12 text-xs font-semibold tabular-nums ${isDarkTheme ? 'text-slate-400' : 'text-[#64748B]'}`}>
        {Math.round(value)}%
      </span>
      <div className={`h-2 flex-1 overflow-hidden rounded-full ${isDarkTheme ? 'bg-slate-700' : 'bg-[#E2E8F0]'}`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );

  return (
    <div
      className={`financial-plan-vs-actual rounded-2xl border p-5 ${
        isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-[#E2E8F0] bg-white'
      }`}
    >
      <p className={`mb-4 text-sm font-semibold ${isDarkTheme ? 'text-white' : 'text-[#0F172A]'}`}>
        {label} — Plan vs Actual
      </p>
      <div className="space-y-3">
        <div>
          <p className={`mb-1 text-xs font-medium ${isDarkTheme ? 'text-slate-500' : 'text-[#94A3B8]'}`}>Plan</p>
          {renderBar(plan, isDarkTheme ? 'bg-indigo-500' : 'bg-[#6366F1]')}
        </div>
        <div>
          <p className={`mb-1 text-xs font-medium ${isDarkTheme ? 'text-slate-500' : 'text-[#94A3B8]'}`}>Actual</p>
          {renderBar(actual, isDarkTheme ? 'bg-emerald-500' : 'bg-[#22C55E]')}
        </div>
        <p className={`text-sm font-bold tabular-nums ${varianceTone}`}>
          Variance: {variance > 0 ? '+' : ''}
          {variance.toFixed(0)}%
        </p>
      </div>
    </div>
  );
};

export default PlanVsActualBars;
