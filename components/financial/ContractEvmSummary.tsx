import React from 'react';
import { formatFinancialAmount, type FinancialExecutiveMetrics } from '../../utils/financialDashboardMetrics';

interface ContractEvmSummaryProps {
  metrics: FinancialExecutiveMetrics;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
  className?: string;
}

const ITEMS = [
  { key: 'earnedValue' as const, label: 'Earned Value' },
  { key: 'plannedValue' as const, label: 'Planned Value' },
  { key: 'actualCost' as const, label: 'Actual Cost' },
  { key: 'cpi' as const, label: 'CPI', isIndex: true },
  { key: 'spi' as const, label: 'SPI', isIndex: true },
];

const ContractEvmSummary: React.FC<ContractEvmSummaryProps> = ({
  metrics,
  isDarkTheme,
  themeClasses,
  className = '',
}) => (
  <div className={`financial-contract-evm grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 ${className}`}>
    {ITEMS.map((item) => {
      const raw = metrics[item.key];
      const display =
        raw == null
          ? '—'
          : item.isIndex
            ? Number(raw).toFixed(2)
            : formatFinancialAmount(Number(raw));

      return (
        <div
          key={item.key}
          className={`financial-contract-kpis rounded-xl border p-4 ${
            isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-[#E2E8F0] bg-[#F8FAFC]'
          } ${item.key === 'cpi' ? 'cpi-card' : ''} ${item.key === 'spi' ? 'spi-card' : ''}`}
        >
          <p className={`text-xs font-semibold ${isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'}`}>
            {item.label}
          </p>
          <p
            className={`mt-1 text-xl font-bold tabular-nums ${
              isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
            }`}
          >
            {display}
          </p>
        </div>
      );
    })}
  </div>
);

export default ContractEvmSummary;
