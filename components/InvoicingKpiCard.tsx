import React from 'react';
import { getInvoiceTypeLabel, InvoicingRecord, InvoiceType } from '../types';
import { formatIndianCurrencyCompact } from '../utils/format';
import { getThemeClasses, useTheme } from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';

interface InvoicingKpiCardProps {
  invoiceType: InvoiceType;
  data: InvoicingRecord | null;
  isLoading?: boolean;
  error?: string | null;
}

const InvoicingKpiCard: React.FC<InvoicingKpiCardProps> = ({ invoiceType, data, isLoading = false, error }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const certificationEfficiency = data?.collectionPercentage ?? 0;
  const metrics = data
    ? [
        { label: 'Gross Billed', value: formatIndianCurrencyCompact(data.grossBilled) },
        { label: 'Gross Certified Billed', value: formatIndianCurrencyCompact(data.netBilledWithoutVAT) },
        { label: 'Difference', value: formatIndianCurrencyCompact(data.netCollected) },
        { label: 'Certification Efficiency', value: `${certificationEfficiency.toFixed(0)}%` },
      ]
    : [];

  return (
    <div className={`p-3 rounded-2xl border ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}>
      <h3 className={`mb-2 ${typo.sectionTitle(isDarkTheme)}`}>{getInvoiceTypeLabel(invoiceType)} Invoicing KPI</h3>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`animate-pulse h-12 rounded-xl ${themeClasses.bgSecondary}`} />
          ))}
        </div>
      ) : error ? (
        <p className={`${typo.bodyBold} text-rose-500`}>{error}</p>
      ) : !data ? (
        <p className={`${typo.labelBold} ${themeClasses.textMuted}`}>No KPI data</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {metrics.map(metric => (
            <div key={metric.label} className={`rounded-xl border p-2 ${themeClasses.bgSecondary} ${themeClasses.border}`}>
              <p className={`${typo.microBold} tracking-wider ${themeClasses.textMuted}`}>{metric.label}</p>
              <p className={`mt-1 ${typo.caption} font-black ${themeClasses.textPrimary}`}>{metric.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(InvoicingKpiCard);
