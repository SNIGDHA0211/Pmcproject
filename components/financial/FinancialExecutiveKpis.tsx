import React from 'react';
import {
  formatCostVarianceDisplay,
  formatFinancialAmount,
  formatIndexValue,
  type FinancialExecutiveMetrics,
} from '../../utils/financialDashboardMetrics';

interface FinancialExecutiveKpisProps {
  metrics: FinancialExecutiveMetrics;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}

type KpiTone = 'blue' | 'indigo' | 'orange' | 'green' | 'red' | 'slate';

const TONE_CLASS: Record<KpiTone, { value: string; accent: string }> = {
  blue: { value: 'text-[#2563EB]', accent: 'bg-[#EFF6FF]' },
  indigo: { value: 'text-[#4F46E5]', accent: 'bg-[#EEF2FF]' },
  orange: { value: 'text-[#EA580C]', accent: 'bg-[#FFF7ED]' },
  green: { value: 'text-[#16A34A]', accent: 'bg-[#F0FDF4]' },
  red: { value: 'text-[#DC2626]', accent: 'bg-[#FEF2F2]' },
  slate: { value: 'text-[#0F172A]', accent: 'bg-[#F1F5F9]' },
};

function costVarianceTone(variance: number | null): KpiTone {
  if (variance == null) return 'slate';
  if (variance > 0) return 'green';
  if (variance < 0) return 'red';
  return 'slate';
}

const FinancialExecutiveKpis: React.FC<FinancialExecutiveKpisProps> = ({
  metrics,
  isDarkTheme,
  themeClasses,
}) => {
  const cardShell = (className = '') =>
    isDarkTheme
      ? `rounded-xl border ${themeClasses.glassCard} ${themeClasses.border} ${className}`
      : `rounded-xl border border-[#E2E8F0] bg-white shadow-sm ${className}`;

  const labelClass = `text-xs font-semibold uppercase tracking-wide ${
    isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
  }`;

  const renderPrimary = (
    label: string,
    value: string,
    tone: KpiTone,
    hint?: string
  ) => {
    const t = TONE_CLASS[tone];
    return (
      <div className={`${cardShell()} p-3`}>
        <p className={labelClass}>{label}</p>
        {hint && (
          <p className={`mt-0.5 text-[10px] font-medium leading-tight ${themeClasses.textMuted}`}>
            {hint}
          </p>
        )}
        <p
          className={`mt-1.5 text-[28px] font-bold leading-tight tabular-nums ${
            isDarkTheme ? themeClasses.textPrimary : t.value
          }`}
        >
          {value}
        </p>
        {!isDarkTheme && <div className={`mt-1.5 h-0.5 w-10 rounded-full ${t.accent}`} aria-hidden />}
      </div>
    );
  };

  const renderSecondary = (label: string, value: string, tone: KpiTone) => {
    const t = TONE_CLASS[tone];
    return (
      <div className={`${cardShell()} p-3`}>
        <p className={labelClass}>{label}</p>
        <p
          className={`mt-1 text-[22px] font-bold leading-tight tabular-nums ${
            isDarkTheme ? themeClasses.textPrimary : t.value
          }`}
        >
          {value}
        </p>
      </div>
    );
  };

  const renderEvm = (label: string, value: string, abbrev: string) => (
    <div
      className={`rounded-lg border p-2 ${
        isDarkTheme ? `${themeClasses.border} bg-white/[0.04]` : 'border-[#E2E8F0] bg-[#FAFBFC]'
      } ${abbrev === 'CPI' ? 'cpi-card' : ''} ${abbrev === 'SPI' ? 'spi-card' : ''}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">{abbrev}</p>
      <p className={`mt-0.5 text-[10px] font-medium leading-tight ${themeClasses.textMuted}`}>
        {label}
      </p>
      <p
        className={`mt-1 text-[20px] font-semibold leading-tight tabular-nums ${
          isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
        }`}
      >
        {value}
      </p>
    </div>
  );

  const cvTone = costVarianceTone(metrics.costVariance);

  return (
    <div className="financial-kpi-summary progress-status-card space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {renderPrimary(
          'Physical Progress',
          `${Math.round(metrics.physicalProgressPct)}%`,
          'green'
        )}
        {renderPrimary(
          'Financial Progress',
          `${Math.round(metrics.financialProgressPct)}%`,
          'green'
        )}
        {renderPrimary(
          'Cost Variance',
          formatCostVarianceDisplay(metrics.costVariance),
          cvTone,
          'BCWP − ACWP'
        )}
        {renderPrimary(
          'Pending Invoice',
          formatFinancialAmount(metrics.pendingInvoice),
          'red'
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {renderSecondary('Contract Value', formatFinancialAmount(metrics.contractValue), 'blue')}
        {renderSecondary('Budget', formatFinancialAmount(metrics.budget), 'indigo')}
        {renderSecondary('Actual Cost', formatFinancialAmount(metrics.actualCost), 'orange')}
      </div>

      <div className={`${cardShell('financial-contract-evm p-3')}`}>
        <h4
          className={`text-xs font-bold ${
            isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
          }`}
        >
          Earned Value Management (EVM)
        </h4>
        <p className={`mt-1 text-[11px] font-medium leading-snug ${themeClasses.textSecondary}`}>
          EV, PV, AC, and performance indices for this period.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {renderEvm('Earned Value', formatFinancialAmount(metrics.earnedValue), 'EV')}
          {renderEvm('Planned Value', formatFinancialAmount(metrics.plannedValue), 'PV')}
          {renderEvm('Actual Cost', formatFinancialAmount(metrics.actualCost), 'AC')}
          {renderEvm('Cost Performance Index', formatIndexValue(metrics.cpi), 'CPI')}
          {renderEvm('Schedule Performance Index', formatIndexValue(metrics.spi), 'SPI')}
        </div>
      </div>
    </div>
  );
};

export default FinancialExecutiveKpis;
