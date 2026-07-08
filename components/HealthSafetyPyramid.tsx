import React from 'react';
import { getThemeClasses, useTheme } from '../utils/theme';
import { INCIDENT_KPI_CONFIG, type IncidentMetrics } from '../utils/healthSafety';

const PYRAMID_TIERS = [
  { key: 'fatalities' as const, label: 'Fatalities', color: '#000000' },
  { key: 'significant' as const, label: 'Significant', color: '#dc2626' },
  { key: 'major' as const, label: 'Major', color: '#f97316' },
  { key: 'minor' as const, label: 'Minor', color: '#facc15' },
  { key: 'nearMiss' as const, label: 'Near Miss', color: '#22c55e' },
] as const;

const KPI_BY_KEY = Object.fromEntries(INCIDENT_KPI_CONFIG.map((c) => [c.key, c])) as Record<
  (typeof PYRAMID_TIERS)[number]['key'],
  (typeof INCIDENT_KPI_CONFIG)[number]
>;

const PYRAMID_HEIGHT_DEFAULT = 84;
const PYRAMID_WIDTH_DEFAULT = 270;

interface HealthSafetyPyramidProps {
  stats?: IncidentMetrics;
  variant?: 'default' | 'summary' | 'list';
}

const HealthSafetyPyramid: React.FC<HealthSafetyPyramidProps> = ({ stats, variant = 'default' }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const defaultStats = stats ?? { fatalities: 0, significant: 0, major: 0, minor: 0, nearMiss: 0 };
  const isSummary = variant === 'summary';
  const isList = variant === 'list';
  const pyramidHeight = PYRAMID_HEIGHT_DEFAULT;

  const tiers = PYRAMID_TIERS.map((tier) => ({
    ...tier,
    count: defaultStats[tier.key],
    kpi: KPI_BY_KEY[tier.key],
  }));
  const totalTiers = tiers.length;
  const tierHeightPct = 100 / totalTiers;

  const summaryPanelClass = isDarkTheme
    ? 'border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-800/50 to-blue-950/30'
    : 'border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/40';

  const content = (
    <div
      className={`flex w-full min-h-0 items-stretch ${isSummary ? 'h-full gap-3' : 'gap-3 sm:gap-4'}`}
      style={isSummary ? undefined : { height: pyramidHeight }}
    >
      <div
        className={`flex flex-col justify-stretch ${
          isSummary ? 'h-full w-[44%] max-w-[48%] shrink-0' : 'w-[132px] flex-shrink-0'
        } ${themeClasses.textPrimary}`}
        style={isSummary ? undefined : { height: pyramidHeight }}
      >
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className={`flex flex-1 min-h-0 flex-col justify-center py-0.5 ${
              isSummary
                ? 'border-b border-dashed border-slate-200/80 last:border-b-0 dark:border-white/10'
                : `border-b ${themeClasses.border}`
            }`}
          >
            <div
              className={`flex items-center ${isSummary ? 'gap-2 px-0.5' : 'justify-between gap-2'}`}
              style={isSummary ? { borderLeft: `3px solid ${tier.color}` } : undefined}
            >
              <span className="flex min-w-0 items-center gap-2 pl-1.5 text-xs font-semibold uppercase leading-snug tracking-wide">
                <span
                  className={`shrink-0 rounded-full shadow-sm ring-2 ring-white/80 dark:ring-slate-900/80 ${
                    isSummary ? 'h-3 w-3' : 'h-3 w-3'
                  }`}
                  style={{ backgroundColor: tier.color }}
                />
                <span className={isSummary ? 'truncate' : ''}>{tier.label}</span>
              </span>
              <span
                className={`shrink-0 font-black tabular-nums ${
                  isSummary
                    ? `rounded-md px-1.5 py-0.5 text-[11px] ${tier.kpi.textColor} ${
                        isDarkTheme ? 'bg-white/10' : 'bg-white shadow-sm'
                      }`
                    : 'ml-auto text-[11px]'
                }`}
              >
                {tier.count.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        className={`relative min-w-0 ${isSummary ? 'h-full flex-1 px-1' : 'mx-auto flex flex-1 items-center justify-center'}`}
        style={isSummary ? undefined : { maxWidth: PYRAMID_WIDTH_DEFAULT, height: pyramidHeight }}
      >
        <div
          className={`relative h-full w-full ${isSummary ? 'mx-auto max-w-[92%] origin-center scale-90 drop-shadow-[0_4px_12px_rgba(15,23,42,0.12)]' : ''}`}
        >
          {tiers.map((tier, idx) => {
            const topWidthPct = (idx / totalTiers) * 100;
            const bottomWidthPct = ((idx + 1) / totalTiers) * 100;
            const leftTop = 50 - topWidthPct / 2;
            const rightTop = 50 + topWidthPct / 2;
            const leftBottom = 50 - bottomWidthPct / 2;
            const rightBottom = 50 + bottomWidthPct / 2;
            const topY = (idx / totalTiers) * 100;
            const tierGap = isSummary ? 2 : 1.5;
            const clipPath =
              idx === 0
                ? `polygon(50% 0%, ${rightBottom}% 100%, ${leftBottom}% 100%)`
                : `polygon(${leftTop}% 0%, ${rightTop}% 0%, ${rightBottom}% 100%, ${leftBottom}% 100%)`;

            return (
              <div
                key={tier.label}
                className="absolute flex items-center justify-center"
                style={{
                  clipPath,
                  top: `calc(${topY}% + ${idx * tierGap}px)`,
                  left: 0,
                  right: 0,
                  height: `calc(${tierHeightPct}% - ${tierGap}px)`,
                  filter: isSummary ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : undefined,
                }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    backgroundColor: tier.color,
                    boxShadow: isSummary ? 'inset 0 1px 0 rgba(255,255,255,0.25)' : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (isList) {
    return (
      <div className={`rounded-xl border p-2 shadow-inner ${summaryPanelClass}`}>
        <div className="flex flex-col gap-0.5">
          {tiers.map((tier) => (
            <div
              key={tier.label}
              className={`flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 ${
                isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-slate-50'
              }`}
              style={{ borderLeft: `3px solid ${tier.color}` }}
            >
              <span className="flex min-w-0 items-center gap-1.5 pl-1 text-[10px] font-semibold uppercase leading-tight tracking-wide">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-1 ring-white/80 dark:ring-slate-900/80"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="truncate">{tier.label}</span>
              </span>
              <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-black tabular-nums ${tier.kpi.textColor} ${
                  isDarkTheme ? 'bg-white/10' : 'bg-white shadow-sm'
                }`}
              >
                {tier.count.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isSummary) {
    return (
      <div className={`h-full rounded-xl border p-3 shadow-inner ${summaryPanelClass}`}>{content}</div>
    );
  }

  return content;
};

export default React.memo(HealthSafetyPyramid);
