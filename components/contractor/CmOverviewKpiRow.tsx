import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from '../../utils/theme';
import {
  semanticBorderAccentClass,
  semanticIconWrapClass,
  semanticValueClass,
  type DashboardSemanticTone,
} from '../../utils/dashboardSemanticColors';
import { useProjectsDashboardTypo } from '../../utils/projectsDashboardTypography';

const KPI_TILE_MIN_H = 'min-h-[4.25rem] sm:min-h-[4.5rem]';

export interface CmOverviewKpiItem {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: DashboardSemanticTone;
}

const CmOverviewKpiTile: React.FC<CmOverviewKpiItem> = ({ icon: Icon, label, value, tone }) => {
  const { isDarkTheme } = useTheme();
  const typo = useProjectsDashboardTypo();
  const border = semanticBorderAccentClass(tone);
  const iconWrap = semanticIconWrapClass(tone, isDarkTheme);
  const valueClass = semanticValueClass(tone, isDarkTheme);

  return (
    <div
      className={`relative flex ${KPI_TILE_MIN_H} flex-col rounded-lg border border-b-[3px] ${border} px-2.5 py-2 sm:px-3 sm:py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm'
        }`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${iconWrap}`}>
          <Icon size={13} strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`${typo.metricLabel} ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}>{label}</p>
          <p className={`mt-0.5 truncate ${typo.metricValue} tabular-nums ${valueClass}`}>{value}</p>
        </div>
      </div>
    </div>
  );
};

const CmOverviewKpiRow: React.FC<{ items: CmOverviewKpiItem[] }> = ({ items }) => (
  <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-3 xl:grid-cols-6">
    {items.map((item) => (
      <CmOverviewKpiTile key={item.label} {...item} />
    ))}
  </div>
);

export default CmOverviewKpiRow;
