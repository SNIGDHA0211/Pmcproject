import React from 'react';
import { getInvoiceTypeLabel, InvoicingRecord, InvoiceType } from '../types';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { Icons } from './Icons';
import { CardEditButton } from './FormulaInfoButton';
import { formatIndianCurrencyCompact, formatIndianCurrencyFull } from '../utils/format';
import { getThemeClasses, useTheme, DASHBOARD_FINANCIAL_CARD_PADDING, DASHBOARD_CARD_HEADER_ROW_CLASS, DASHBOARD_NEUTRAL_VALUE_CLASS } from '../utils/theme';
import {
  getCertificationSemanticTone,
  getCertificationStatusLabel,
  semanticBadgeClass,
  semanticBarFillClass,
  semanticBorderAccentClass,
  semanticDotClass,
  semanticIconWrapClass,
  semanticValueClass,
  type DashboardSemanticTone,
} from '../utils/dashboardSemanticColors';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { invoicingSectionTitle } from '../utils/dashboardContractorLabels';

interface InvoicingTableProps {
  invoiceType: InvoiceType;
  data: InvoicingRecord | null;
  isLoading?: boolean;
  error?: string | null;
  onEdit?: (invoiceType: InvoiceType) => void;
  embedded?: boolean;
  contractorDisplayName?: string;
}

type CertificationTone = DashboardSemanticTone;

const getCertificationStatus = (pct: number): { label: string; tone: CertificationTone } => ({
  label: getCertificationStatusLabel(pct),
  tone: getCertificationSemanticTone(pct),
});

const InvoicingSectionBody: React.FC<{
  data: InvoicingRecord | null;
  isLoading: boolean;
  error: string | null;
  themeClasses: ReturnType<typeof getThemeClasses>;
  isDarkTheme: boolean;
}> = ({ data, isLoading, error, themeClasses, isDarkTheme }) => {
  const typo = useProjectsDashboardTypo();
  if (isLoading) {
    return <div className={`animate-pulse h-[100px] rounded-lg ${themeClasses.bgSecondary}`} aria-label="Loading invoicing data" />;
  }
  if (error) {
    return <p className={`flex min-h-[100px] items-center ${typo.bodyBold} text-rose-500`}>{error}</p>;
  }
  if (!data) {
    return (
      <p className={`flex min-h-[100px] items-center ${typo.labelBold} ${themeClasses.textMuted}`}>
        No invoicing data
      </p>
    );
  }

  const certificationEfficiency = data.collectionPercentage ?? 0;
  const status = getCertificationStatus(certificationEfficiency);
  const barFillPercent = Math.min(100, Math.max(0, certificationEfficiency));
  const neutralValue = DASHBOARD_NEUTRAL_VALUE_CLASS(isDarkTheme);
  const differenceTone: DashboardSemanticTone = (data.netCollected ?? 0) >= 0 ? 'positive' : 'negative';
  const efficiencyTone = status.tone;

  const metrics = [
    {
      label: 'Gross Billed',
      display: formatIndianCurrencyCompact(data.grossBilled),
      full: formatIndianCurrencyFull(data.grossBilled),
      icon: Icons.Finance,
      border: semanticBorderAccentClass('neutral'),
      iconBg: semanticIconWrapClass('neutral', isDarkTheme),
      value: neutralValue,
    },
    {
      label: 'Gross Certified Billed',
      display: formatIndianCurrencyCompact(data.netBilledWithoutVAT),
      full: formatIndianCurrencyFull(data.netBilledWithoutVAT),
      icon: Icons.Document,
      border: semanticBorderAccentClass('neutral'),
      iconBg: semanticIconWrapClass('neutral', isDarkTheme),
      value: neutralValue,
    },
    {
      label: 'Difference',
      display: formatIndianCurrencyCompact(data.netCollected),
      full: formatIndianCurrencyFull(data.netCollected),
      icon: Icons.Download,
      border: semanticBorderAccentClass(differenceTone),
      iconBg: semanticIconWrapClass(differenceTone, isDarkTheme),
      value: semanticValueClass(differenceTone, isDarkTheme),
    },
    {
      label: 'Certification Efficiency',
      display: `${certificationEfficiency.toFixed(0)}%`,
      full: `${certificationEfficiency.toFixed(1)}%`,
      icon: Icons.Calendar,
      border: semanticBorderAccentClass(efficiencyTone),
      iconBg: semanticIconWrapClass(efficiencyTone, isDarkTheme),
      value: semanticValueClass(efficiencyTone, isDarkTheme),
    },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((item) => {
          const MetricIcon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex min-h-[5.5rem] min-w-0 flex-col overflow-hidden rounded-lg border border-b-[3px] px-2.5 py-2.5 ${
                item.border
              } ${isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${item.iconBg}`}>
                  <MetricIcon size={11} strokeWidth={2.5} />
                </div>
                <p className={`${typo.financialKpiLabel} ${themeClasses.textMuted}`}>
                  {item.label}
                </p>
              </div>
              <p
                className={`mt-auto pt-2 truncate ${typo.compactValue} ${item.value}`}
                title={item.full}
              >
                {item.display}
              </p>
            </div>
          );
        })}
      </div>

      <div className={`rounded-xl border px-3.5 py-3 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`${typo.labelBold} tracking-wide ${themeClasses.textPrimary}`}>
              Certification Efficiency
            </p>
            <p className={`${typo.micro} ${themeClasses.textMuted}`}>
              Gross Certified Billed vs Gross Billed
            </p>
          </div>
          <span className={`shrink-0 pl-1 font-black ${typo.performancePct} ${semanticValueClass(status.tone, isDarkTheme)}`}>
            {certificationEfficiency.toFixed(0)}%
          </span>
        </div>
        <div className={`mt-2 h-2 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
          <div
            className={`h-full rounded-full ${semanticBarFillClass(status.tone)}`}
            style={{ width: `${barFillPercent}%` }}
          />
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 ${typo.microBold} ${semanticBadgeClass(status.tone, isDarkTheme)}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${semanticDotClass(status.tone)}`} />
            {status.label}
          </span>
          <span className={`${typo.micro} ${themeClasses.textMuted}`}>Target: ≥ 90%</span>
        </div>
      </div>
    </div>
  );
};

const InvoicingTable: React.FC<InvoicingTableProps> = ({
  invoiceType,
  data,
  isLoading = false,
  error = null,
  onEdit,
  embedded = false,
  contractorDisplayName,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const party: 'SCL' | 'Contractor' = invoiceType === 'PMC' ? 'SCL' : 'Contractor';
  const sectionTitle = invoicingSectionTitle(
    party,
    party === 'Contractor' ? contractorDisplayName : undefined,
  );

  if (embedded) {
    return (
      <div className="flex flex-1 flex-col justify-center px-0 py-3 sm:px-1 sm:py-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h4 className={`embedded-section-title min-w-0 break-words ${typo.embeddedSectionTitle}`}>{sectionTitle}</h4>
          {onEdit && (
            <CardEditButton
              onClick={() => onEdit(invoiceType)}
              title={`Edit ${getInvoiceTypeLabel(invoiceType)} invoicing`}
            />
          )}
        </div>
        <InvoicingSectionBody
          data={data}
          isLoading={isLoading}
          error={error}
          themeClasses={themeClasses}
          isDarkTheme={isDarkTheme}
        />
      </div>
    );
  }

  return (
    <div
      className={`invoicing-card flex min-h-[250px] flex-col overflow-hidden rounded-2xl border p-3.5 transition-shadow hover:shadow-md ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
          : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
      }`}
    >
      <div className={`mb-2.5 flex items-center justify-between gap-3 border-b pb-2.5 ${themeClasses.border}`}>
        <div className="flex min-w-0 items-center gap-3">
          {invoiceType === 'PMC' ? (
            <Icons.Document size={22} className={isDarkTheme ? 'text-blue-300' : 'text-blue-700'} />
          ) : (
            <Icons.Labor size={22} className={isDarkTheme ? 'text-blue-300' : 'text-blue-700'} />
          )}
          <h3 className={`truncate ${typo.cardTitle}`}>{sectionTitle}</h3>
        </div>
        {onEdit && (
          <CardEditButton
            onClick={() => onEdit(invoiceType)}
            title={`Edit ${getInvoiceTypeLabel(invoiceType)} invoicing`}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <InvoicingSectionBody
          data={data}
          isLoading={isLoading}
          error={error}
          themeClasses={themeClasses}
          isDarkTheme={isDarkTheme}
        />
      </div>
    </div>
  );
};

interface InvoicingGroupCardProps {
  contractorData: InvoicingRecord | null;
  pmcData: InvoicingRecord | null;
  contractorDisplayName?: string;
  isLoading?: boolean;
  contractorError?: string | null;
  pmcError?: string | null;
  onEdit?: (invoiceType: InvoiceType) => void;
}

export const InvoicingGroupCard: React.FC<InvoicingGroupCardProps> = ({
  contractorData,
  pmcData,
  contractorDisplayName,
  isLoading = false,
  contractorError = null,
  pmcError = null,
  onEdit,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();

  return (
    <div
      className={`invoicing-group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border ${DASHBOARD_FINANCIAL_CARD_PADDING} transition-shadow hover:shadow-md sm:min-h-[460px] lg:min-h-[520px] ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
          : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
      }`}
    >
      <DashboardCardTopAccent />
      <div className={`mb-3 ${DASHBOARD_CARD_HEADER_ROW_CLASS(themeClasses.border)}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
            <Icons.Finance size={18} className={isDarkTheme ? 'text-violet-300' : 'text-violet-600'} />
          </div>
          <div className="min-w-0">
            <h3 className={typo.financialGroupTitle}>Invoicing Information</h3>
            <p className={typo.financialGroupSubtitle(isDarkTheme)}>
              SCL (owner) +{' '}
              {contractorDisplayName
                ? `selected contractor: ${contractorDisplayName}`
                : 'selected contractor'}
            </p>
          </div>
        </div>
        {onEdit && <CardEditButton onClick={() => onEdit('Contractor')} title="Edit invoicing" />}
      </div>
      <div className={`flex min-h-0 flex-1 flex-col divide-y divide-dashed ${themeClasses.border}`}>
        <InvoicingTable
          embedded
          invoiceType="PMC"
          data={pmcData}
          isLoading={isLoading}
          error={pmcError}
        />
        <InvoicingTable
          embedded
          invoiceType="Contractor"
          data={contractorData}
          contractorDisplayName={contractorDisplayName}
          isLoading={isLoading}
          error={contractorError}
        />
      </div>
    </div>
  );
};

export default React.memo(InvoicingTable);
