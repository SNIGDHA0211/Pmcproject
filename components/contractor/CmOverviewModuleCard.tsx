import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import DashboardCardTopAccent from '../DashboardCardTopAccent';
import { getThemeClasses, useTheme } from '../../utils/theme';
import { useProjectsDashboardTypo } from '../../utils/projectsDashboardTypography';
import {
  semanticBorderAccentClass,
  semanticIconWrapClass,
  type DashboardSemanticTone,
} from '../../utils/dashboardSemanticColors';

export interface CmOverviewModuleMetric {
  label: string;
  value: string;
}

interface CmOverviewModuleCardProps {
  icon: LucideIcon;
  title: string;
  metrics: CmOverviewModuleMetric[];
  tone?: DashboardSemanticTone;
  onOpen: () => void;
}

const CmOverviewModuleCard: React.FC<CmOverviewModuleCardProps> = ({
  icon: Icon,
  title,
  metrics,
  tone = 'neutral',
  onOpen,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const border = semanticBorderAccentClass(tone);
  const iconWrap = semanticIconWrapClass(tone, isDarkTheme);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex min-h-[6.5rem] w-full flex-col overflow-hidden rounded-xl border text-left shadow-sm transition-shadow hover:shadow-md sm:min-h-[7rem] ${themeClasses.glassCard} ${themeClasses.border}`}
    >
      <DashboardCardTopAccent />
      <div className="flex flex-1 flex-col px-3 py-2.5 sm:px-3.5 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${iconWrap}`}>
              <Icon size={14} strokeWidth={2.25} aria-hidden />
            </span>
            <span className="truncate text-sm font-semibold uppercase tracking-wide text-blue-600 sm:text-base">
              {title}
            </span>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${isDarkTheme
                ? 'bg-white/10 text-slate-300 group-hover:bg-blue-500/20 group-hover:text-blue-300'
                : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700'
              }`}
          >
            View
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
        <div className="mt-2 grid flex-1 grid-cols-2 gap-1.5 sm:gap-2">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={`flex min-h-[3.25rem] flex-col justify-center rounded-md border border-b-[3px] ${border} px-2 py-1.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
                }`}
            >
              <p className={`text-[10px] font-semibold uppercase leading-tight ${themeClasses.textMuted}`}>
                {m.label}
              </p>
              <p className={`mt-0.5 truncate ${typo.metricValue} tabular-nums ${themeClasses.textPrimary}`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
};

export default CmOverviewModuleCard;
