import React from 'react';
import type { PvaVarianceStatus } from '../../types/plannedVsActual';

const STATUS_STYLES: Record<string, string> = {
  ON_TRACK: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  MINOR_VARIANCE: 'bg-amber-100 text-amber-800 border-amber-200',
  MAJOR_VARIANCE: 'bg-rose-100 text-rose-800 border-rose-200',
};

const STATUS_STYLES_DARK: Record<string, string> = {
  ON_TRACK: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  MINOR_VARIANCE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  MAJOR_VARIANCE: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export function PvaVarianceBadge({
  status,
  isDark = false,
}: {
  status?: PvaVarianceStatus | null;
  isDark?: boolean;
}) {
  const key = String(status ?? 'ON_TRACK').toUpperCase();
  const label = key.replace(/_/g, ' ');
  const styles = isDark ? STATUS_STYLES_DARK : STATUS_STYLES;
  const className =
    styles[key] ??
    (isDark
      ? 'bg-slate-500/15 text-slate-300 border-white/10'
      : 'bg-slate-100 text-slate-700 border-slate-200');

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

export default PvaVarianceBadge;
