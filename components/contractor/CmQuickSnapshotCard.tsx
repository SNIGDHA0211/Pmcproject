import React from 'react';
import DashboardCardTopAccent from '../DashboardCardTopAccent';
import {
  DASHBOARD_CARD_HEADER_ROW_CLASS,
  DASHBOARD_CARD_TITLE_CLASS,
  getThemeClasses,
  useTheme,
} from '../../utils/theme';
import { Icons } from '../Icons';

export interface CmQuickSnapshotMetrics {
  revisedValue?: string;
  increasePct?: string;
  grossBilled?: string;
  efficiency?: string;
  delayDays?: string;
  bgUpdated?: string;
}

interface CmQuickSnapshotCardProps {
  contractorDisplayName?: string;
  scl: CmQuickSnapshotMetrics;
  contractor: CmQuickSnapshotMetrics;
}

const SnapshotColumn: React.FC<{
  title: string;
  metrics: CmQuickSnapshotMetrics;
}> = ({ title, metrics }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const items = [
    { label: 'Revised Value', value: metrics.revisedValue },
    { label: 'Increase', value: metrics.increasePct },
    { label: 'Gross Billed', value: metrics.grossBilled },
    { label: 'Efficiency', value: metrics.efficiency },
    { label: 'Delay', value: metrics.delayDays },
    { label: 'BG Updated', value: metrics.bgUpdated },
  ].filter((item) => item.value != null && item.value !== '');

  return (
    <div className="flex min-h-0 flex-col p-4 sm:p-5">
      <p className="mb-3 text-sm font-black uppercase tracking-wide text-blue-600">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex min-h-[4rem] flex-col justify-center rounded-lg border border-b-[3px] border-b-slate-400 px-2.5 py-2 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm'
              }`}
          >
            <p className={`text-[10px] font-semibold uppercase ${themeClasses.textMuted}`}>{item.label}</p>
            <p className={`mt-0.5 text-sm font-bold tabular-nums sm:text-base ${themeClasses.textPrimary}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const CmQuickSnapshotCard: React.FC<CmQuickSnapshotCardProps> = ({
  contractorDisplayName,
  scl,
  contractor,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const contractorLabel = contractorDisplayName ?? 'Contractor';

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-md ${isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
          : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
        }`}
    >
      <DashboardCardTopAccent />
      <div className={DASHBOARD_CARD_HEADER_ROW_CLASS(themeClasses.border)}>
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'
              }`}
          >
            <Icons.Performance size={18} strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className={DASHBOARD_CARD_TITLE_CLASS}>Quick Snapshot</h3>
            <p className={`mt-0.5 text-xs font-medium uppercase tracking-wide ${themeClasses.textMuted}`}>
              SCL summary + {contractorLabel}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`grid min-h-0 grid-cols-1 divide-y divide-dashed lg:grid-cols-2 lg:divide-x lg:divide-y-0 ${isDarkTheme ? 'divide-white/10' : 'divide-slate-200'
          }`}
      >
        <SnapshotColumn title="SCL Summary" metrics={scl} />
        <SnapshotColumn title={`Contractor Summary · ${contractorLabel}`} metrics={contractor} />
      </div>
    </div>
  );
};

export default CmQuickSnapshotCard;
