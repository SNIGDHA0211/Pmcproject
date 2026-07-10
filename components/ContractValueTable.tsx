import React from 'react';
import { Layers, CheckCircle2, FileText, Clock } from 'lucide-react';
import { ContractValueRecord, ContractValueType } from '../types';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { Icons } from './Icons';
import { CardEditButton } from './FormulaInfoButton';
import { formatIndianCurrencyCompact, formatIndianCurrencyFull } from '../utils/format';
import { getThemeClasses, useTheme, DASHBOARD_FINANCIAL_CARD_PADDING, DASHBOARD_CARD_HEADER_ROW_CLASS, DASHBOARD_NEUTRAL_VALUE_CLASS } from '../utils/theme';
import {
  getGrowthSemanticTone,
  semanticBadgeClass,
  semanticBarFillClass,
  semanticBorderAccentClass,
  semanticIconWrapClass,
  semanticValueClass,
} from '../utils/dashboardSemanticColors';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { contractValuesSectionTitle } from '../utils/dashboardContractorLabels';

interface ContractValueTableProps {
  contractType: ContractValueType;
  data: ContractValueRecord | null;
  isLoading?: boolean;
  error?: string | null;
  onEdit?: (contractType: ContractValueType) => void;
  embedded?: boolean;
  /** Display name for contractor sections (from dashboard selector) */
  contractorDisplayName?: string;
  /** Override embedded section heading */
  embeddedSectionTitle?: string;
}

const KPI_TILE_MIN_H = 'min-h-[5.5rem]';

const ContractValueSectionBody: React.FC<{
  contractType: ContractValueType;
  data: ContractValueRecord | null;
  isLoading: boolean;
  error: string | null;
  themeClasses: ReturnType<typeof getThemeClasses>;
  isDarkTheme: boolean;
}> = ({ contractType, data, isLoading, error, themeClasses, isDarkTheme }) => {
  const typo = useProjectsDashboardTypo();

  if (isLoading) {
    return <div className={`animate-pulse h-[100px] rounded-lg ${themeClasses.bgSecondary}`} aria-label="Loading contract values" />;
  }
  if (error) {
    return <p className={`flex min-h-[100px] items-center ${typo.bodyBold} text-rose-500`}>{error}</p>;
  }
  if (!data) {
    return (
      <p className={`flex min-h-[100px] items-center ${typo.labelBold} ${themeClasses.textMuted}`}>
        No contract value data
      </p>
    );
  }

  const growthPercentage = data.growthPercentage ?? data.approvedVOPercentage ?? 0;
  const barFillPercent = Math.min(100, Math.max(0, growthPercentage));
  const growthTone = getGrowthSemanticTone(growthPercentage);
  const pctTone = semanticValueClass(growthTone, isDarkTheme);
  const barClass = semanticBarFillClass(growthTone);
  const growthBadgeClass = semanticBadgeClass(growthTone, isDarkTheme);

  const neutralValue = DASHBOARD_NEUTRAL_VALUE_CLASS(isDarkTheme);
  const positiveValue = semanticValueClass('positive', isDarkTheme);
  const negativeValue = semanticValueClass('negative', isDarkTheme);

  const metrics = [
    {
      label: 'Original Contract Value',
      value: data.originalContractValue,
      icon: Layers,
      border: semanticBorderAccentClass('neutral'),
      iconBg: semanticIconWrapClass('neutral', isDarkTheme),
      valueClass: neutralValue,
    },
    {
      label: 'Excess Value',
      value: data.approvedVO,
      icon: CheckCircle2,
      border: semanticBorderAccentClass('positive'),
      iconBg: semanticIconWrapClass('positive', isDarkTheme),
      valueClass: positiveValue,
    },
    {
      label: 'Saving',
      value: data.potentialPendingVO,
      icon: Clock,
      border: semanticBorderAccentClass('negative'),
      iconBg: semanticIconWrapClass('negative', isDarkTheme),
      valueClass: negativeValue,
    },
    {
      label: 'Revised Contract Value',
      value: data.revisedContractValue,
      icon: FileText,
      border: semanticBorderAccentClass('neutral'),
      iconBg: semanticIconWrapClass('neutral', isDarkTheme),
      valueClass: neutralValue,
    },

  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 2xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, border, iconBg, valueClass }) => (
          <div
            key={label}
            className={`flex ${KPI_TILE_MIN_H} min-w-0 flex-col overflow-hidden rounded-lg border border-b-[3px] px-2.5 py-2.5 ${border} ${isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
              }`}
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
                <Icon size={11} strokeWidth={2.5} />
              </div>
              <p className={`${typo.financialKpiLabel} ${themeClasses.textMuted}`}>
                {label}
              </p>
            </div>
            <p
              className={`mt-auto pt-2 truncate ${typo.compactValue} ${valueClass}`}
              title={formatIndianCurrencyFull(value)}
            >
              {formatIndianCurrencyCompact(value)}
            </p>
          </div>
        ))}
      </div>

      <div className={`rounded-xl border px-3.5 py-3 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`${typo.labelBold} tracking-wide ${themeClasses.textPrimary}`}>
              Contract Value Growth
            </p>
            <p className={`${typo.micro} ${themeClasses.textMuted}`}>
              Revised Contract Value vs Original Contract Value
            </p>
          </div>
          <span className={`shrink-0 pl-1 font-black ${typo.performancePct} ${pctTone}`}>
            {growthPercentage.toFixed(0)}%
          </span>
        </div>
        <div className={`mt-2 h-2 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${barFillPercent}%` }} />
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 ${typo.microBold} ${growthBadgeClass}`}
          >
            <span aria-hidden className={typo.caption}>{growthPercentage >= 0 ? '▲' : '▼'}</span>
            {Math.abs(growthPercentage).toFixed(0)}% Growth
          </span>
          <span className={`${typo.micro} ${themeClasses.textMuted}`}>
            Growth over original contract value
          </span>
        </div>
      </div>
    </div>
  );
};

const ContractValueTable: React.FC<ContractValueTableProps> = ({
  contractType,
  data,
  isLoading = false,
  error = null,
  onEdit,
  embedded = false,
  contractorDisplayName,
  embeddedSectionTitle,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const sectionTitle =
    embeddedSectionTitle ??
    contractValuesSectionTitle(
      contractType,
      contractType === 'Contractor' ? contractorDisplayName : undefined,
    );

  if (embedded) {
    return (
      <div className="flex flex-1 flex-col justify-center px-0 py-3 sm:px-1 sm:py-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h4 className={`embedded-section-title min-w-0 break-words ${typo.embeddedSectionTitle}`}>{sectionTitle}</h4>
          {/* {onEdit && (
            <CardEditButton
              onClick={() => onEdit(contractType)}
              title={`Edit ${contractType} contract values`}
            />
          )} */}
        </div>
        <ContractValueSectionBody
          contractType={contractType}
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
      className={`contract-values-card flex min-h-[250px] flex-col overflow-hidden rounded-2xl border p-3.5 transition-shadow hover:shadow-md ${isDarkTheme
        ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
        : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
        }`}
    >
      <div className={`mb-2.5 flex items-center justify-between gap-3 border-b pb-2.5 ${themeClasses.border}`}>
        <div className="flex min-w-0 items-center gap-3">
          <Icons.Building2 size={22} className={isDarkTheme ? 'text-blue-300' : 'text-blue-700'} />
          <h3 className={`truncate ${typo.cardTitle}`}>{sectionTitle}</h3>
        </div>
        {onEdit && (
          <CardEditButton onClick={() => onEdit(contractType)} title={`Edit ${contractType} contract values`} />
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <ContractValueSectionBody
          contractType={contractType}
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

interface ContractValuesGroupCardProps {
  sclData: ContractValueRecord | null;
  contractorData: ContractValueRecord | null;
  contractorSectionTitle: string;
  groupSubtitle?: string;
  className?: string;
  id?: string;
  isLoading?: boolean;
  sclError?: string | null;
  contractorError?: string | null;
  contractorLoading?: boolean;
  onEdit?: (contractType: ContractValueType) => void;
}

export const ContractValuesGroupCard: React.FC<ContractValuesGroupCardProps> = ({
  sclData,
  contractorData,
  contractorSectionTitle,
  groupSubtitle,
  className = '',
  isLoading = false,
  sclError = null,
  contractorError = null,
  contractorLoading = false,
  onEdit,
  id,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const subtitle = groupSubtitle ?? 'SCL (owner) + contractor portfolio';

  return (
    <div
      id={id}
      className={`contract-values-group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border ${DASHBOARD_FINANCIAL_CARD_PADDING} transition-shadow hover:shadow-md sm:min-h-[460px] lg:min-h-[520px] ${isDarkTheme
        ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
        : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
        } ${className}`}
    >
      <DashboardCardTopAccent />
      <div className={`mb-3 ${DASHBOARD_CARD_HEADER_ROW_CLASS(themeClasses.border)}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
            <Icons.Building2 size={18} className={isDarkTheme ? 'text-indigo-300' : 'text-indigo-600'} />
          </div>
          <div className="min-w-0">
            <h3 className={typo.financialGroupTitle}>Contract Values</h3>
            <p className={typo.financialGroupSubtitle(isDarkTheme)}>{subtitle}</p>
          </div>
        </div>
        {onEdit && <CardEditButton onClick={() => onEdit('SCL')} title="Edit contract values" />}
      </div>
      <div className={`flex min-h-0 flex-1 flex-col divide-y divide-dashed ${themeClasses.border}`}>
        <ContractValueTable
          embedded
          contractType="SCL"
          data={sclData}
          isLoading={isLoading}
          error={sclError}
          onEdit={onEdit}
        />
        <ContractValueTable
          embedded
          contractType="Contractor"
          data={contractorData}
          embeddedSectionTitle={contractorSectionTitle}
          isLoading={isLoading || contractorLoading}
          error={contractorError}
          onEdit={onEdit}
        />
      </div>
    </div>
  );
};

export default React.memo(ContractValueTable);
