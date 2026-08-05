import React from 'react';
import {
  formatProgressDifferencePct,
  progressCumulativeDifference,
  progressDifferenceStatus,
  progressDifferenceStatusLabel,
} from '../../utils/projectProgress';

type TooltipPayloadItem = {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
};

type ProgressCurveTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  isDark?: boolean;
  /** When true, also list monthly plan/actual rows from the payload. */
  showMonthly?: boolean;
};

function pickNumber(
  row: Record<string, unknown> | undefined,
  ...keys: string[]
): number | null {
  if (!row) return null;
  for (const key of keys) {
    const raw = row[key];
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function fromPayload(
  payload: TooltipPayloadItem[] | undefined,
  keys: string[],
  names: string[],
): number | null {
  if (!payload?.length) return null;
  for (const item of payload) {
    const key = String(item.dataKey ?? '');
    const name = String(item.name ?? '');
    if (keys.includes(key) || names.some((n) => name.toLowerCase().includes(n))) {
      const n = typeof item.value === 'number' ? item.value : Number(item.value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/**
 * Shared tooltip for progress S-curves:
 * Cumulative planned − Cumulative actual = Difference
 */
export const ProgressCurveTooltip: React.FC<ProgressCurveTooltipProps> = ({
  active,
  payload,
  label,
  isDark = false,
  showMonthly = false,
}) => {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as Record<string, unknown> | undefined;
  const planned =
    pickNumber(row, 'planned', 'cumulativePlanned', 'cumulative_planned') ??
    fromPayload(
      payload,
      ['planned', 'cumulativePlanned'],
      ['cumulative planned', 'cum. plan', 'planned'],
    );
  const actual =
    pickNumber(row, 'actual', 'cumulativeActual', 'cumulative_actual') ??
    fromPayload(
      payload,
      ['actual', 'cumulativeActual'],
      ['cumulative actual', 'cum. actual', 'actual'],
    );

  if (planned == null && actual == null) return null;

  const plannedVal = planned ?? 0;
  const actualVal = actual ?? 0;
  const difference =
    pickNumber(row, 'difference') ??
    progressCumulativeDifference(plannedVal, actualVal);
  const status = progressDifferenceStatus(difference);
  const statusColor =
    status === 'behind'
      ? isDark
        ? '#fb7185'
        : '#e11d48'
      : status === 'ahead'
        ? isDark
          ? '#34d399'
          : '#059669'
        : isDark
          ? '#94a3b8'
          : '#64748b';

  const monthlyPlanned = showMonthly
    ? pickNumber(row, 'monthlyPlanned', 'monthly_planned')
    : null;
  const monthlyActual = showMonthly
    ? pickNumber(row, 'monthlyActual', 'monthly_actual')
    : null;

  return (
    <div
      className={`min-w-[11.5rem] rounded-xl border px-3 py-2.5 text-[11px] shadow-lg ${
        isDark
          ? 'border-white/15 bg-slate-900/95 text-slate-100'
          : 'border-slate-200 bg-white text-slate-800'
      }`}
    >
      <p className={`mb-2 text-[10px] font-black uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Period: {label}
      </p>
      <div className="space-y-1">
        <p>
          <span className={isDark ? 'text-indigo-300' : 'text-indigo-600'}>
            Cumulative planned
          </span>
          {': '}
          <span className="font-bold tabular-nums">{Number(plannedVal).toFixed(1)}%</span>
        </p>
        <p>
          <span className={isDark ? 'text-teal-300' : 'text-teal-700'}>
            Cumulative actual
          </span>
          {': '}
          <span className="font-bold tabular-nums">{Number(actualVal).toFixed(1)}%</span>
        </p>
        <p className="border-t pt-1.5 mt-1.5" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}>
          <span className="font-semibold">Difference</span>
          <span className={`ml-1 text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            (plan − actual)
          </span>
          {': '}
          <span className="font-black tabular-nums" style={{ color: statusColor }}>
            {formatProgressDifferencePct(difference)}
          </span>
          <span className="ml-1.5 text-[9px] font-bold" style={{ color: statusColor }}>
            · {progressDifferenceStatusLabel(difference)}
          </span>
        </p>
        {monthlyPlanned != null && monthlyActual != null && (
          <p className={`pt-1 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Monthly {Number(monthlyPlanned).toFixed(1)}% plan · {Number(monthlyActual).toFixed(1)}% actual
          </p>
        )}
      </div>
    </div>
  );
};

export const ProgressDifferenceSummaryChip: React.FC<{
  planned: number;
  actual: number;
  isDark?: boolean;
  periodLabel?: string;
  className?: string;
}> = ({ planned, actual, isDark = false, periodLabel, className = '' }) => {
  const difference = progressCumulativeDifference(planned, actual);
  const status = progressDifferenceStatus(difference);
  const tone =
    status === 'behind'
      ? isDark
        ? 'bg-rose-500/15 text-rose-300'
        : 'bg-rose-50 text-rose-700'
      : status === 'ahead'
        ? isDark
          ? 'bg-emerald-500/15 text-emerald-300'
          : 'bg-emerald-50 text-emerald-700'
        : isDark
          ? 'bg-slate-500/20 text-slate-300'
          : 'bg-slate-100 text-slate-600';

  return (
    <p
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${tone} ${className}`}
      title="Difference = Cumulative planned − Cumulative actual"
    >
      <span>
        Difference {formatProgressDifferencePct(difference)}
        <span className="ml-1 font-semibold opacity-80">
          · {progressDifferenceStatusLabel(difference)}
        </span>
      </span>
      <span className="font-semibold opacity-70">
        {Number(planned).toFixed(1)}% − {Number(actual).toFixed(1)}%
        {periodLabel ? ` · ${periodLabel}` : ''}
      </span>
    </p>
  );
};

export default ProgressCurveTooltip;
