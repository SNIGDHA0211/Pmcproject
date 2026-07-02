import React from 'react';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceKpiCardProps {
  label: string;
  value: string | number;
  accent?: string;
  icon?: React.ReactNode;
  variant?: 'simple' | 'icon' | 'compact';
}

const CorrespondenceKpiCard: React.FC<CorrespondenceKpiCardProps> = ({
  label,
  value,
  accent,
  icon,
  variant = 'simple',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const display =
    typeof value === 'number' && Number.isFinite(value)
      ? value.toLocaleString('en-IN')
      : typeof value === 'string'
        ? value
        : '0';

  if (variant === 'icon' && icon) {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
          isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isDarkTheme ? 'bg-white/10' : 'bg-slate-50'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`min-w-0 leading-tight line-clamp-2 ${typo.label} ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>{label}</p>
          <p className={`mt-0.5 text-2xl font-black tabular-nums leading-none ${accent ?? themeClasses.textPrimary}`}>
            {display}
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'compact' && icon) {
    return (
      <div
        className={`flex min-h-[5.5rem] flex-col rounded-lg border px-2 py-2 ${
          isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
        }`}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              isDarkTheme ? 'bg-white/10' : 'bg-slate-50'
            }`}
          >
            {icon}
          </div>
          <p className={`min-w-0 leading-tight line-clamp-2 ${typo.label} ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>{label}</p>
        </div>
        <p
          className={`mt-auto pt-2 truncate font-black tabular-nums leading-none ${typo.compactValue} ${accent ?? themeClasses.textPrimary}`}
        >
          {display}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[5.5rem] flex-col rounded-xl border px-2.5 py-2 ${themeClasses.border} ${
        isDarkTheme ? 'bg-white/5' : 'bg-slate-50'
      }`}
    >
      <p className={`min-w-0 leading-tight line-clamp-2 ${typo.label} ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>{label}</p>
      <p
        className={`mt-auto pt-2 truncate font-black tabular-nums leading-none ${typo.compactValue} ${accent ?? themeClasses.textPrimary}`}
      >
        {display}
      </p>
    </div>
  );
};

export default React.memo(CorrespondenceKpiCard);
