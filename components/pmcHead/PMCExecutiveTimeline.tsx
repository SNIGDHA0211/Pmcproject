import React, { useMemo } from 'react';
import { Calendar, CalendarClock, Flag } from 'lucide-react';
import type { ProjectDatesRecord } from '../../services/api';
import { hasProjectDatesMilestones } from '../../services/api';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';

const parseTs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
};

const formatShort = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const formatFull = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleString('en-GB', { month: 'short' });
  return `${day} ${month} ${parsed.getFullYear()}`;
};

const MILESTONES = [
  { key: 'start', label: 'Start', field: 'project_start' as const, Icon: Calendar },
  { key: 'contract', label: 'Contract', field: 'contract_finish' as const, Icon: Calendar },
  { key: 'forecast', label: 'Forecast', field: 'forecast_finish' as const, Icon: CalendarClock },
  { key: 'eot', label: 'EOT', field: 'eot_date' as const, Icon: Flag },
];

interface TrackProps {
  label: string;
  record: ProjectDatesRecord;
  accent: 'blue' | 'rose';
  rangeMin: number;
  rangeMax: number;
  todayTs: number;
  compact?: boolean;
}

const TrackRow: React.FC<TrackProps> = ({
  label,
  record,
  accent,
  rangeMin,
  rangeMax,
  todayTs,
  compact = false,
}) => {
  const ex = usePmcExecutiveTheme();
  const span = rangeMax - rangeMin || 1;
  const pct = (ts: number) => Math.min(100, Math.max(0, ((ts - rangeMin) / span) * 100));

  const startTs = parseTs(record.project_start);
  const plannedEndTs = parseTs(record.contract_finish);
  const actualEndTs =
    parseTs(record.eot_date) ?? parseTs(record.forecast_finish) ?? plannedEndTs;

  const canDrawPlanned = startTs != null && plannedEndTs != null;
  const canDrawActual = startTs != null && actualEndTs != null;
  const plannedLeft = startTs != null ? pct(startTs) : 0;
  const plannedWidth = canDrawPlanned ? Math.max(2, pct(plannedEndTs!) - plannedLeft) : 0;
  const actualWidth = canDrawActual ? Math.max(2, pct(actualEndTs!) - plannedLeft) : 0;
  const todayLeft = pct(todayTs);

  const barColor = accent === 'blue' ? 'bg-blue-500' : 'bg-rose-500';
  const barBg = accent === 'blue'
    ? (ex.isDark ? 'bg-blue-500/15' : 'bg-blue-50')
    : (ex.isDark ? 'bg-rose-500/15' : 'bg-rose-50');
  const dashedColor = accent === 'blue' ? 'border-blue-400' : 'border-rose-400';
  const endLabel = formatShort(record.eot_date ?? record.forecast_finish ?? record.contract_finish);

  return (
    <div
      className={`rounded-xl border ${compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4'} ${
        ex.isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/60'
      }`}
    >
      <div className={`mb-2.5 flex flex-wrap items-center justify-between gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        <span
          className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide sm:text-sm ${
            accent === 'blue'
              ? ex.isDark
                ? 'text-blue-300'
                : 'text-blue-700'
              : ex.isDark
                ? 'text-rose-300'
                : 'text-rose-700'
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${accent === 'blue' ? 'bg-blue-500' : 'bg-rose-500'}`}
          />
          {label}
        </span>
        <span className={`text-[10px] font-semibold sm:text-xs ${ex.trackMeta}`}>
          {formatShort(record.project_start)} → {endLabel}
        </span>
      </div>

      <div className={`relative ${compact ? 'h-10' : 'h-11 sm:h-12'}`}>
        <div className={`absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full ${barBg}`} />
        {canDrawPlanned && (
          <div
            className={`absolute top-1/2 h-0 -translate-y-1/2 border-t-2 border-dashed ${dashedColor}`}
            style={{ left: `${plannedLeft}%`, width: `${plannedWidth}%` }}
            title={`Planned · ${formatFull(record.project_start)} → ${formatFull(record.contract_finish)}`}
          />
        )}
        {canDrawActual && (
          <div
            className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full ${barColor}`}
            style={{ left: `${plannedLeft}%`, width: `${actualWidth}%` }}
            title={`Progress window · ${formatFull(record.project_start)} → ${formatFull(record.eot_date ?? record.forecast_finish)}`}
          />
        )}
        {todayLeft >= 0 && todayLeft <= 100 && (
          <div
            className="absolute top-0 bottom-0 z-[5] border-l-2 border-dashed border-slate-500/70"
            style={{ left: `${todayLeft}%` }}
            title="Today"
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase text-slate-500 sm:text-[10px]">
              Today
            </span>
          </div>
        )}
        {MILESTONES.map(({ key, field, Icon, label: mLabel }) => {
          const ts = parseTs(record[field]);
          if (ts == null) return null;
          const pos = pct(ts);
          return (
            <div
              key={key}
              className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos}%` }}
              title={`${mLabel}: ${formatFull(record[field])}`}
            >
              <div
                className={`flex items-center justify-center rounded-full border-2 shadow-md ${ex.milestoneBorderWhite} ${
                  compact ? 'h-6 w-6 sm:h-7 sm:w-7' : 'h-7 w-7 sm:h-8 sm:w-8'
                } ${accent === 'blue' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'}`}
              >
                <Icon size={compact ? 11 : 12} strokeWidth={2.5} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface PMCExecutiveTimelineProps {
  scl: ProjectDatesRecord | null;
  contractor: ProjectDatesRecord | null;
  className?: string;
  /** Hide outer panel chrome when nested in Overview card */
  embedded?: boolean;
  compact?: boolean;
}

const PMCExecutiveTimeline: React.FC<PMCExecutiveTimelineProps> = ({
  scl,
  contractor,
  className = '',
  embedded = false,
  compact = false,
}) => {
  const ex = usePmcExecutiveTheme();
  const todayTs = Date.now();

  const sclTrack = hasProjectDatesMilestones(scl) ? scl : null;
  const contractorTrack = hasProjectDatesMilestones(contractor) ? contractor : null;

  const { rangeMin, rangeMax } = useMemo(() => {
    const stamps: number[] = [todayTs];
    for (const record of [sclTrack, contractorTrack]) {
      if (!record) continue;
      for (const { field } of MILESTONES) {
        const ts = parseTs(record[field]);
        if (ts != null) stamps.push(ts);
      }
    }
    const min = Math.min(...stamps);
    const max = Math.max(...stamps);
    const pad = (max - min) * 0.05 || 86400000 * 30;
    return { rangeMin: min - pad, rangeMax: max + pad };
  }, [sclTrack, contractorTrack, todayTs]);

  const body = (
    <div className={`space-y-2.5 ${embedded ? (compact ? 'p-0' : 'p-0.5') : 'p-4 sm:p-5'} ${compact ? 'sm:space-y-2.5' : 'sm:space-y-3'}`}>
      {!sclTrack && !contractorTrack ? (
        <div className={`${ex.timelineEmpty} border-0`}>
          No SCL or Contractor milestone dates from backend yet.
        </div>
      ) : (
        <>
          {sclTrack ? (
            <TrackRow
              label="SCL"
              record={sclTrack}
              accent="blue"
              rangeMin={rangeMin}
              rangeMax={rangeMax}
              todayTs={todayTs}
              compact={compact}
            />
          ) : (
            <div
              className={`rounded-xl border border-dashed px-4 py-3 text-center text-[11px] font-semibold ${
                ex.isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'
              }`}
            >
              No SCL schedule dates from backend
            </div>
          )}

          {contractorTrack ? (
            <TrackRow
              label="Contractor"
              record={contractorTrack}
              accent="rose"
              rangeMin={rangeMin}
              rangeMax={rangeMax}
              todayTs={todayTs}
              compact={compact}
            />
          ) : (
            <div
              className={`rounded-xl border border-dashed px-4 py-3 text-center text-[11px] font-semibold ${
                ex.isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'
              }`}
            >
              No Contractor schedule dates from backend
            </div>
          )}

          <div
            className={`flex flex-wrap items-center gap-3 border-t pt-2.5 text-[10px] font-semibold sm:gap-4 sm:text-xs ${ex.toolbarBorder} ${ex.trackLegend}`}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-full bg-blue-500" /> SCL progress
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-full bg-rose-500" /> Contractor progress
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-6 border-t-2 border-dashed border-slate-400" /> Planned (contract)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 border-l-2 border-dashed border-slate-500" /> Today
            </span>
          </div>
        </>
      )}
    </div>
  );

  if (embedded) {
    return <div className={className}>{body}</div>;
  }

  return (
    <div className={`${ex.panel} ${className}`}>
      <div className={ex.panelHeader}>
        <h2 className={ex.panelTitle}>Project Schedule Timeline</h2>
        <p className={ex.panelSubtitle}>Visual comparison of SCL vs Contractor milestones</p>
      </div>
      {body}
    </div>
  );
};

export default PMCExecutiveTimeline;
