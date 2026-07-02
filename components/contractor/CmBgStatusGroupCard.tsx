import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { BgEntryApi } from '../../types/contractorManagement';
import DashboardCardTopAccent from '../DashboardCardTopAccent';
import { CardEditButton } from '../FormulaInfoButton';
import {
  DASHBOARD_CARD_HEADER_ROW_CLASS,
  DASHBOARD_CARD_TITLE_CLASS,
  getThemeClasses,
  useTheme,
} from '../../utils/theme';
import { formatDisplayDate } from './enterpriseTheme';

interface CmBgStatusGroupCardProps {
  sclEntries: BgEntryApi[];
  contractorEntries: BgEntryApi[];
  contractorDisplayName?: string;
  onManageBg?: () => void;
}

const BgEntryRow: React.FC<{ entry: BgEntryApi; isDarkTheme: boolean }> = ({ entry, isDarkTheme }) => {
  const themeClasses = getThemeClasses(isDarkTheme);
  const statusTone =
    entry.status === 'UPDATED'
      ? isDarkTheme
        ? 'bg-emerald-500/15 text-emerald-300'
        : 'bg-emerald-50 text-emerald-700'
      : entry.status === 'NOT_UPDATED'
        ? isDarkTheme
          ? 'bg-rose-500/15 text-rose-300'
          : 'bg-rose-50 text-rose-700'
        : isDarkTheme
          ? 'bg-amber-500/15 text-amber-300'
          : 'bg-amber-50 text-amber-700';

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white shadow-sm'
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-bold leading-snug ${themeClasses.textPrimary}`}>{entry.bg_name}</p>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone}`}>
          {entry.status.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className={`font-semibold uppercase ${themeClasses.textMuted}`}>Due</p>
          <p className={`font-semibold tabular-nums ${themeClasses.textPrimary}`}>
            {formatDisplayDate(entry.due_date)}
          </p>
        </div>
        <div>
          <p className={`font-semibold uppercase ${themeClasses.textMuted}`}>Updated</p>
          <p className={`font-semibold tabular-nums ${themeClasses.textPrimary}`}>
            {formatDisplayDate(entry.updated_date)}
          </p>
        </div>
      </div>
    </div>
  );
};

const BgPartyColumn: React.FC<{
  title: string;
  entries: BgEntryApi[];
  emptyLabel: string;
}> = ({ title, entries, emptyLabel }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div className="flex min-h-0 flex-col p-4 sm:p-5">
      <p className={`mb-3 text-sm font-black uppercase tracking-wide text-blue-600`}>{title}</p>
      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className={`text-xs ${themeClasses.textMuted}`}>{emptyLabel}</p>
        ) : (
          entries.map((entry) => <BgEntryRow key={entry.id} entry={entry} isDarkTheme={isDarkTheme} />)
        )}
      </div>
    </div>
  );
};

const CmBgStatusGroupCard: React.FC<CmBgStatusGroupCardProps> = ({
  sclEntries,
  contractorEntries,
  contractorDisplayName,
  onManageBg,
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
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700'
              }`}
          >
            <ShieldCheck size={18} strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className={DASHBOARD_CARD_TITLE_CLASS}>BG Status</h3>
            <p className={`mt-0.5 text-xs font-medium uppercase tracking-wide ${themeClasses.textMuted}`}>
              SCL + {contractorLabel}
            </p>
          </div>
        </div>
        {onManageBg && <CardEditButton onClick={onManageBg} title="Manage bank guarantees" />}
      </div>

      <div
        className={`grid min-h-0 grid-cols-1 divide-y divide-dashed lg:grid-cols-2 lg:divide-x lg:divide-y-0 ${isDarkTheme ? 'divide-white/10' : 'divide-slate-200'
          }`}
      >
        <BgPartyColumn title="SCL BG Status" entries={sclEntries} emptyLabel="None on file" />
        <BgPartyColumn
          title={`Contractor BG Status · ${contractorLabel}`}
          entries={contractorEntries}
          emptyLabel="None on file"
        />
      </div>
    </div>
  );
};

export default CmBgStatusGroupCard;
