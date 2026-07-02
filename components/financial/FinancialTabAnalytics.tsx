import React from 'react';
import type { FinancialExecutiveMetrics } from '../../utils/financialDashboardMetrics';
import FinancialExecutiveKpis from './FinancialExecutiveKpis';
import PlanVsActualBars from './PlanVsActualBars';
import FinancialProgressCharts, { type ProgressTrendRow } from './FinancialProgressCharts';
import type { ContractPerformanceRecord } from '../../types';

export type FinancialAnalyticsVariant =
  | 'progress'
  | 'earned_value'
  | 'contract'
  | 'cost'
  | 'budget'
  | 'invoicing'
  | 'contracts';

interface FinancialTabAnalyticsProps {
  variant: FinancialAnalyticsVariant;
  metrics: FinancialExecutiveMetrics;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
  projectName: string;
  progressTrendData?: ProgressTrendRow[];
  isLoadingProgressTrend?: boolean;
  monthlyPlan?: number;
  monthlyActual?: number;
  cumulativePlan?: number;
  cumulativeActual?: number;
  costForm?: Record<string, unknown>;
  budgetForm?: Record<string, unknown>;
  contractMetrics?: Pick<
    ContractPerformanceRecord,
    'performancePercentage' | 'variance' | 'variancePercentage'
  >;
}

const FORM_EVM_EXTRA_KEYS: Record<'cost' | 'budget', string[]> = {
  cost: ['eac', 'vac', 'sv'],
  budget: ['eac', 'vac', 'etg'],
};

const FinancialTabAnalytics: React.FC<FinancialTabAnalyticsProps> = ({
  variant,
  metrics,
  isDarkTheme,
  themeClasses,
  projectName,
  progressTrendData = [],
  isLoadingProgressTrend = false,
  monthlyPlan = 0,
  monthlyActual = 0,
  cumulativePlan = 0,
  cumulativeActual = 0,
  costForm = {},
  budgetForm = {},
  contractMetrics,
}) => {
  if (!projectName) return null;

  const sectionTitle = (text: string) => (
    <h4
      className={`text-xs font-semibold uppercase tracking-wide ${
        isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
      }`}
    >
      {text}
    </h4>
  );

  const formSource = variant === 'cost' ? costForm : variant === 'budget' ? budgetForm : {};
  const extraKeys =
    variant === 'cost' || variant === 'budget' ? FORM_EVM_EXTRA_KEYS[variant] : [];

  return (
    <div className="financial-tab-analytics space-y-5 border-t border-dashed border-[#E2E8F0] pt-5 dark:border-white/10">
      {sectionTitle('Summary after update')}
      <FinancialExecutiveKpis
        metrics={metrics}
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      />

      {variant === 'progress' && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PlanVsActualBars plan={monthlyPlan} actual={monthlyActual} label="Monthly" isDarkTheme={isDarkTheme} />
            <PlanVsActualBars
              plan={cumulativePlan}
              actual={cumulativeActual}
              label="Cumulative"
              isDarkTheme={isDarkTheme}
            />
          </div>
          <FinancialProgressCharts
            data={progressTrendData}
            loading={isLoadingProgressTrend}
            isDarkTheme={isDarkTheme}
            themeClasses={themeClasses}
          />
        </>
      )}

      {variant === 'contract' && contractMetrics && (
        <>
          {sectionTitle('Contract billing')}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: 'Performance %',
                value: `${contractMetrics.performancePercentage.toFixed(2)}%`,
                cls: 'performance-percent-card',
              },
              {
                label: 'Billing Variance',
                value: contractMetrics.variance.toLocaleString('en-IN'),
                cls: 'variance-card',
              },
              {
                label: 'Variance %',
                value: `${contractMetrics.variancePercentage.toFixed(2)}%`,
                cls: 'variance-percent-card',
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border p-4 ${item.cls} ${
                  isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>{item.label}</p>
                <p className={`mt-1 text-xl font-bold ${themeClasses.textPrimary}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {extraKeys.length > 0 && (
        <>
          {sectionTitle('Additional saved metrics')}
          <div className="financial-cost-kpis grid grid-cols-2 gap-3 md:grid-cols-3">
            {extraKeys.map((key) => (
              <div
                key={key}
                className={`rounded-xl border p-3 ${
                  isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-[#E2E8F0] bg-[#F8FAFC]'
                }`}
              >
                <p className={`text-xs font-semibold uppercase ${themeClasses.textSecondary}`}>{key}</p>
                <p className={`mt-1 text-lg font-bold ${themeClasses.textPrimary}`}>
                  {String(formSource[key] ?? '—')}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FinancialTabAnalytics;
