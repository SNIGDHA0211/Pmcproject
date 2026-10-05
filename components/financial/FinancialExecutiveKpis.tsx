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
  const cardShell = (accentHex: string, className = '') =>
    `pmc-ov-tile rounded-xl border p-3.5 transition-all ${
      isDarkTheme
        ? `${themeClasses.glassCard} ${themeClasses.border}`
        : 'border-slate-200/80 bg-white shadow-sm'
    } ${className}`;

  const labelClass = `text-[10px] font-black uppercase tracking-wider ${
    isDarkTheme ? themeClasses.textMuted : 'text-slate-500'
  }`;

  const renderPrimary = (
    label: string,
    value: string,
    tone: KpiTone,
    hint?: string,
    accentHex = '#3b82f6'
  ) => {
    return (
      <div
        className={cardShell(accentHex)}
        style={{ borderLeftWidth: 4, borderLeftColor: accentHex }}
      >
        <p className={labelClass}>{label}</p>
        {hint && (
          <p className={`mt-0.5 text-[9.5px] font-medium leading-tight ${themeClasses.textMuted}`}>
            {hint}
          </p>
        )}
        <p className={`mt-1.5 text-2xl font-black leading-tight tabular-nums sm:text-3xl ${themeClasses.textPrimary}`}>
          {value}
        </p>
      </div>
    );
  };

  const renderSecondary = (label: string, value: string, tone: KpiTone, accentHex = '#6366f1') => {
    return (
      <div
        className={cardShell(accentHex)}
        style={{ borderLeftWidth: 4, borderLeftColor: accentHex }}
      >
        <p className={labelClass}>{label}</p>
        <p className={`mt-1 text-xl font-black leading-tight tabular-nums sm:text-2xl ${themeClasses.textPrimary}`}>
          {value}
        </p>
      </div>
    );
  };

  const renderEvm = (label: string, value: string, abbrev: string, accentHex = '#10b981') => (
    <div
      className={`rounded-xl border p-2.5 transition-all ${
        isDarkTheme ? `${themeClasses.border} bg-white/[0.04]` : 'border-slate-200/80 bg-slate-50/70'
      } ${abbrev === 'CPI' ? 'cpi-card' : ''} ${abbrev === 'SPI' ? 'spi-card' : ''}`}
      style={{ borderLeftWidth: 3, borderLeftColor: accentHex }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{abbrev}</p>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentHex }} />
      </div>
      <p className={`mt-0.5 text-[9.5px] font-medium leading-tight ${themeClasses.textMuted}`}>
        {label}
      </p>
      <p className={`mt-1 text-lg font-black tabular-nums ${themeClasses.textPrimary}`}>
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
          'green',
          undefined,
          '#10b981'
        )}
        {renderPrimary(
          'Financial Progress',
          `${Math.round(metrics.financialProgressPct)}%`,
          'green',
          undefined,
          '#3b82f6'
        )}
        {renderPrimary(
          'Cost Variance',
          formatCostVarianceDisplay(metrics.costVariance),
          cvTone,
          'BCWP − ACWP',
          metrics.costVariance == null ? '#64748b' : metrics.costVariance >= 0 ? '#10b981' : '#f43f5e'
        )}
        {renderPrimary(
          'Pending Invoice',
          formatFinancialAmount(metrics.pendingInvoice),
          'red',
          undefined,
          '#f43f5e'
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {renderSecondary('Contract Value', formatFinancialAmount(metrics.contractValue), 'blue', '#3b82f6')}
        {renderSecondary('Budget', formatFinancialAmount(metrics.budget), 'indigo', '#6366f1')}
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
