import React from 'react';
import { formatFinancialAmount } from '../../utils/financialDashboardMetrics';

interface BudgetUtilizationPanelProps {
  budget: number;
  utilized: number;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}

const BudgetUtilizationPanel: React.FC<BudgetUtilizationPanelProps> = ({
  budget,
  utilized,
  isDarkTheme,
  themeClasses,
}) => {
  const pct = budget > 0 ? Math.min(100, (utilized / budget) * 100) : 0;
  const tone =
    pct > 90
      ? isDarkTheme
        ? 'text-rose-400'
        : 'text-[#DC2626]'
      : pct > 70
        ? isDarkTheme
          ? 'text-amber-400'
          : 'text-[#D97706]'
        : isDarkTheme
          ? 'text-emerald-400'
          : 'text-[#16A34A]';

  return (
    <div
      className={`financial-budget-utilization rounded-2xl border p-5 ${
        isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-[#E2E8F0] bg-white'
      }`}
    >
      <p className={`text-sm font-semibold ${isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'}`}>
        Budget Utilized
      </p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'}`}>
        {formatFinancialAmount(utilized)} of {formatFinancialAmount(budget)}
      </p>
      <div
        className={`mt-4 h-3 w-full overflow-hidden rounded-full ${
          isDarkTheme ? 'bg-slate-700' : 'bg-[#E2E8F0]'
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct > 90 ? 'bg-[#EF4444]' : pct > 70 ? 'bg-[#F59E0B]' : 'bg-[#4F46E5]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${tone}`}>{Math.round(pct)}%</p>
    </div>
  );
};

export default BudgetUtilizationPanel;
