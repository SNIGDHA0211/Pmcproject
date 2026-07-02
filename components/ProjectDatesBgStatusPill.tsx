import React, { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { BGEntry } from '../types/bgStatus';
import { useTheme } from '../utils/theme';
import {
  bgStatusToneClasses,
  derivePartyBgPill,
  formatBgDisplayDate,
  formatPartyBgTooltip,
} from '../utils/bgStatusDisplay';

interface ProjectDatesBgStatusPillProps {
  party: 'SCL' | 'CONTRACTOR';
  entries?: BGEntry[];
  label?: string;
  className?: string;
  showStatusLabel?: boolean;
}

const ProjectDatesBgStatusPill: React.FC<ProjectDatesBgStatusPillProps> = ({
  party,
  entries = [],
  label,
  className = '',
  showStatusLabel = true,
}) => {
  const { isDarkTheme } = useTheme();
  const pill = derivePartyBgPill(entries);
  const pillLabel = label ?? (party === 'SCL' ? 'SCL BG' : 'CO BG');
  const toneClasses = bgStatusToneClasses(pill.status, isDarkTheme);
  const countSuffix = pill.count > 1 ? ` (${pill.count})` : '';
  const datePrefix = pill.dateKind === 'updated' ? 'Upd' : 'Due';

  const tooltip = useMemo(
    () => formatPartyBgTooltip(entries, pillLabel),
    [entries, pillLabel],
  );

  return (
    <div
      className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold sm:text-xs ${toneClasses} ${className}`}
      title={tooltip}
    >
      <ShieldCheck size={12} strokeWidth={2.5} className="shrink-0" />
      <span className="shrink-0 font-bold opacity-80">{pillLabel}:</span>
      <span className="inline-flex min-w-0 items-baseline gap-1 tabular-nums">
        <span className="text-[9px] font-bold uppercase opacity-70">{datePrefix}</span>
        <span className="truncate font-semibold">
          {pill.displayDate ? formatBgDisplayDate(pill.displayDate) : '—'}
        </span>
      </span>
      {showStatusLabel && (
        <span className="shrink-0 rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide opacity-90">
          {pill.label}
          {countSuffix}
        </span>
      )}
    </div>
  );
};

export default React.memo(ProjectDatesBgStatusPill);
