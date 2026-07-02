import React, { useMemo } from 'react';
import { Calendar, CalendarClock, Flag } from 'lucide-react';
import type { ProjectDatesRecord } from '../../services/api';
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
  record: ProjectDatesRecord | null;
  accent: 'blue' | 'rose';
  rangeMin: number;
  rangeMax: number;
  todayTs: number;
}

const TrackRow: React.FC<TrackProps> = ({
  label,
  record,
  accent,
  rangeMin,
  rangeMax,
  todayTs,
}) => {
  const ex = usePmcExecutiveTheme();
  const span = rangeMax - rangeMin || 1;
  const pct = (ts: number) => Math.min(100, Math.max(0, ((ts - rangeMin) / span) * 100));

  const startTs = parseTs(record?.project_start);
  const plannedEndTs = parseTs(record?.contract_finish);
  const actualEndTs =
    parseTs(record?.eot_date) ??
    parseTs(record?.forecast_finish) ??
    plannedEndTs;

  const barFrom = startTs ?? rangeMin;
  const plannedTo = plannedEndTs ?? actualEndTs ?? rangeMax;
  const actualTo = actualEndTs ?? plannedTo;
  const plannedLeft = pct(barFrom);
  const plannedWidth = Math.max(2, pct(plannedTo) - plannedLeft);
  const actualWidth = Math.max(2, pct(actualTo) - plannedLeft);
  const todayLeft = pct(todayTs);

  const barColor = accent === 'blue' ? 'bg-blue-500' : 'bg-rose-500';
  const barBg = accent === 'blue'
    ? (ex.isDark ? 'bg-blue-500/20' : 'bg-blue-100/60')
    : (ex.isDark ? 'bg-rose-500/20' : 'bg-rose-100/60');
  const dashedColor = accent === 'blue' ? 'border-blue-400' : 'border-rose-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-black uppercase tracking-wide sm:text-sm ${ex.trackLabel}`}>
          {label}
        </span>
        <span className={`text-[10px] font-semibold sm:text-xs ${ex.trackMeta}`}>
          {formatShort(record?.project_start)} → {formatShort(record?.eot_date ?? record?.forecast_finish)}
        </span>
      </div>

      <div className="relative h-10 sm:h-11">
        <div className={`absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full ${barBg}`} />
        <div
          className={`absolute top-1/2 h-0 -translate-y-1/2 border-t-2 border-dashed ${dashedColor}`}
          style={{ left: `${plannedLeft}%`, width: `${plannedWidth}%` }}
          title="Planned"
        />
        <div
          className={`absolute top-1/2 h-2 -translate-y-1/2 rounded-full ${barColor}`}
          style={{ left: `${plannedLeft}%`, width: `${actualWidth}%` }}
          title="Actual progress"
        />
        {todayLeft >= 0 && todayLeft <= 100 && (
          <div
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-500/80"
            style={{ left: `${todayLeft}%` }}
            title="Today"
          >
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase text-blue-600 sm:text-[10px]">
              Today
            </span>
          </div>
        )}
        {MILESTONES.map(({ key, field, Icon }) => {
          const ts = parseTs(record?.[field]);
          if (ts == null) return null;
          const pos = pct(ts);
          return (
            <div
              key={key}
              className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos}%` }}
              title={formatFull(record?.[field])}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 shadow sm:h-7 sm:w-7 ${ex.milestoneBorderWhite} ${accent === 'blue' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
                  }`}
              >
                <Icon size={12} strokeWidth={2.5} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden grid-cols-4 gap-1 sm:grid">
        {MILESTONES.map(({ key, label: mLabel, field }) => (
          <div key={key} className="min-w-0 text-center">
            <p className={`text-[9px] font-bold uppercase tracking-wide ${ex.label}`}>{mLabel}</p>
            <p className={`truncate text-[10px] font-bold sm:text-xs ${ex.milestoneText}`}>
              {formatFull(record?.[field])}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PMCExecutiveTimelineProps {
  scl: ProjectDatesRecord | null;
  contractor: ProjectDatesRecord | null;
  className?: string;
}

const PMCExecutiveTimeline: React.FC<PMCExecutiveTimelineProps> = ({
  scl,
  contractor,
  className = '',
}) => {
  const ex = usePmcExecutiveTheme();
  const todayTs = Date.now();

  const { rangeMin, rangeMax } = useMemo(() => {
    const stamps: number[] = [todayTs];
    for (const record of [scl, contractor]) {
      if (!record) continue;
      for (const { field } of MILESTONES) {
        const ts = parseTs(record[field]);
        if (ts != null) stamps.push(ts);
      }
    }
    const min = Math.min(...stamps);
    const max = Math.max(...stamps);
    const pad = (max - min) * 0.04 || 86400000 * 30;
    return { rangeMin: min - pad, rangeMax: max + pad };
  }, [scl, contractor, todayTs]);

  const hasData = scl || contractor;

  if (!hasData) {
    return (
      <div className={`${ex.timelineEmpty} ${className}`}>
        Schedule timeline will appear when project dates are available.
      </div>
    );
  }

  return (
    <div className={`${ex.panel} ${className}`}>
      <div className={ex.panelHeader}>
        <h2 className={ex.panelTitle}>Project Schedule Timeline</h2>
        <p className={ex.panelSubtitle}>
          Milestone comparison across SCL and Contractor schedules
        </p>
      </div>

      <div className="p-4 sm:p-5">
        <div className="space-y-6 sm:space-y-7">
          <TrackRow
            label="SCL"
            record={scl}
            accent="blue"
            rangeMin={rangeMin}
            rangeMax={rangeMax}
            todayTs={todayTs}
          />
          <TrackRow
            label="Contractor"
            record={contractor}
            accent="rose"
            rangeMin={rangeMin}
            rangeMax={rangeMax}
            todayTs={todayTs}
          />
        </div>

        <div className={`mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-[10px] font-semibold sm:text-xs ${ex.toolbarBorder} ${ex.trackLegend}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-blue-500" /> Actual progress
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-6 border-t-2 border-dashed border-blue-400" /> Planned
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 border-l-2 border-dashed border-blue-500" /> Today
          </span>
        </div>
      </div>
    </div>
  );
};

export default PMCExecutiveTimeline;
