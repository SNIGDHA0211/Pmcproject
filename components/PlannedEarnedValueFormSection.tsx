import React, { useMemo } from 'react';
import { Icons } from './Icons';
import { formatIndianCurrencyCompact } from '../utils/format';
import { getThemeClasses, useTheme } from '../utils/theme';
import {
  FinancialFormGrid,
  financialFieldInput,
  financialFieldLabel,
} from './financial/FinancialQuickUpdateCard';

export type PlannedEarnedPartyFormValues = {
  planned_value: string | number;
  earned_value: string | number;
};

export type PlannedEarnedPartyKey = 'SCL' | 'CONTRACTOR';

const PARTY_META: Record<
  PlannedEarnedPartyKey,
  {
    title: string;
    description: string;
    saveLabel: string;
    tintCard: boolean;
    formClassName: string;
  }
> = {
  SCL: {
    title: 'SCL Financial Values',
    description: 'Update planned and actual values for the client side.',
    saveLabel: 'Save SCL',
    tintCard: false,
    formClassName: 'financial-earned-value-form financial-earned-value-scl',
  },
  CONTRACTOR: {
    title: 'Contractor Financial Values',
    description: 'Update planned and actual values for contractor execution.',
    saveLabel: 'Save Contractor',
    tintCard: true,
    formClassName: 'financial-earned-value-form financial-earned-value-contractor',
  },
};

interface PlannedEarnedValueFormSectionProps {
  party: PlannedEarnedPartyKey;
  projectName: string;
  periodLabel: string;
  values: PlannedEarnedPartyFormValues;
  error?: string | null;
  isSaving?: boolean;
  successBanner?: string | null;
  sectionRef?: React.Ref<HTMLDivElement>;
  onChange: (field: keyof PlannedEarnedPartyFormValues, value: string) => void;
  onSave: () => void;
  onReset: () => void;
  onRefresh: () => void;
  refreshDisabled?: boolean;
}

const parseNumericValue = (value: string | number) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = value.replace(/,/g, '').trim();
    return numeric === '' ? 0 : Number(numeric) || 0;
  }
  return 0;
};

const PlannedEarnedValueFormSection: React.FC<PlannedEarnedValueFormSectionProps> = ({
  party,
  projectName,
  periodLabel,
  values,
  error,
  isSaving = false,
  successBanner,
  sectionRef,
  onChange,
  onSave,
  onReset,
  onRefresh,
  refreshDisabled = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const meta = PARTY_META[party];
  const fieldLabel = financialFieldLabel(isDarkTheme, themeClasses);
  const fieldInput = financialFieldInput(isDarkTheme, themeClasses);

  const planned = parseNumericValue(values.planned_value);
  const earned = parseNumericValue(values.earned_value);
  const variance = earned - planned;

  const kpiCards = useMemo(
    () => [
      {
        label: 'Planned Value',
        value: planned > 0 || values.planned_value !== '' ? formatIndianCurrencyCompact(planned) : '—',
        valueClass: isDarkTheme ? 'text-blue-300' : 'text-[#2563EB]',
      },
      {
        label: 'Actual Value',
        value: earned > 0 || values.earned_value !== '' ? formatIndianCurrencyCompact(earned) : '—',
        valueClass: isDarkTheme ? 'text-emerald-400' : 'text-[#16A34A]',
      },
      {
        label: 'Variance',
        value:
          planned > 0 || earned > 0 || values.planned_value !== '' || values.earned_value !== ''
            ? formatIndianCurrencyCompact(variance, { showSign: true })
            : '—',
        valueClass:
          variance >= 0
            ? isDarkTheme
              ? 'text-emerald-400'
              : 'text-[#16A34A]'
            : isDarkTheme
              ? 'text-rose-400'
              : 'text-[#DC2626]',
      },
    ],
    [earned, isDarkTheme, planned, values.earned_value, values.planned_value, variance]
  );

  const primaryBtn = `h-11 rounded-lg px-5 text-sm font-semibold transition-colors disabled:opacity-60 ${
    isDarkTheme ? themeClasses.buttonPrimary : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
  }`;
  const secondaryBtn = `h-11 rounded-lg border px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
    isDarkTheme
      ? `${themeClasses.buttonSecondary} ${themeClasses.border}`
      : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'
  }`;

  const cardSurface = meta.tintCard
    ? isDarkTheme
      ? 'bg-white/[0.04]'
      : 'bg-[#FAFBFC]'
    : isDarkTheme
      ? `${themeClasses.glassCard}`
      : 'bg-white';

  return (
    <div
      ref={sectionRef}
      id={sectionRef ? 'financial-entry-form' : undefined}
      className={`scroll-mt-4 rounded-2xl border ${cardSurface} ${meta.formClassName} ${
        isDarkTheme ? themeClasses.border : 'border-[#E2E8F0]'
      }`}
      style={{ borderRadius: 16 }}
    >
      {successBanner && (
        <div
          className={`flex items-center gap-2 border-b px-6 py-3 text-sm font-semibold ${
            isDarkTheme
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
          }`}
          role="status"
          aria-live="polite"
        >
          <Icons.Approve size={18} />
          <span>{successBanner}</span>
        </div>
      )}

      <div className="p-6">
        <header>
          <h3
            className={`text-[22px] font-bold leading-tight ${
              isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
            }`}
          >
            {meta.title}
          </h3>
          <p
            className={`mt-2 text-sm font-medium leading-snug ${
              isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
            }`}
          >
            {meta.description}
          </p>
          <p
            className={`mt-2 text-xs font-medium ${
              isDarkTheme ? themeClasses.textMuted : 'text-[#94A3B8]'
            }`}
          >
            {projectName || 'Select a project'} · Reporting period: {periodLabel}
          </p>
        </header>

        {error && <p className="mt-4 text-sm font-medium text-rose-500">{error}</p>}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpiCards.map((kpi) => (
            <div
              key={kpi.label}
              className={`rounded-xl border p-4 ${
                isDarkTheme
                  ? `${themeClasses.border} bg-white/[0.06]`
                  : 'border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                {kpi.label}
              </p>
              <p className={`mt-1 truncate text-xl font-bold tabular-nums ${kpi.valueClass}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        <FinancialFormGrid className="mt-6">
          <div className="financial-earned-value-planned-value">
            <label className={fieldLabel}>Planned Value</label>
            <input
              type="text"
              inputMode="decimal"
              value={values.planned_value ?? ''}
              onChange={(e) => onChange('planned_value', e.target.value)}
              className={fieldInput}
            />
          </div>
          <div className="financial-earned-value-earned-value">
            <label className={fieldLabel}>Actual Value</label>
            <input
              type="text"
              inputMode="decimal"
              value={values.earned_value ?? ''}
              onChange={(e) => onChange('earned_value', e.target.value)}
              className={fieldInput}
            />
          </div>
        </FinancialFormGrid>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`${primaryBtn} financial-earned-value-save-btn min-w-[120px]`}
          >
            {isSaving ? 'Saving…' : meta.saveLabel}
          </button>
          <button type="button" onClick={onReset} className={secondaryBtn}>
            Reset
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshDisabled}
            className={`${secondaryBtn} progress-refresh-btn`}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PlannedEarnedValueFormSection);
