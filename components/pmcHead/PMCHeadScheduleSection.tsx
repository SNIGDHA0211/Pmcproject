import React from 'react';
import {
  Calendar,
  CalendarClock,
  Flag,
  Timer,
} from 'lucide-react';
import type { ProjectDatesRecord } from '../../services/api';
import type { BGEntry, BGSummary } from '../../types/bgStatus';
import { toNum } from '../../services/api';
import PMCExecutiveTimeline from './PMCExecutiveTimeline';
import ProjectDatesBgStatusPill from '../ProjectDatesBgStatusPill';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import {
  contractorLabel,
  filterContractorBgEntries,
  resolveSelectedContractor,
} from '../../utils/projectDatesMulti';

const formatDisplayDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleString('en-GB', { month: 'short' });
  return `${day} ${month} ${parsed.getFullYear()}`;
};

const MILESTONES = [
  { key: 'start', label: 'Start Date', field: 'project_start' as const, Icon: Calendar },
  { key: 'contract', label: 'Contract Finish', field: 'contract_finish' as const, Icon: Calendar },
  { key: 'forecast', label: 'Forecast Finish', field: 'forecast_finish' as const, Icon: CalendarClock },
  { key: 'eot', label: 'EOT', field: 'eot_date' as const, Icon: Flag },
];

const delayDays = (record: ProjectDatesRecord | null): number => {
  if (!record) return 0;
  return Math.abs(Math.round(toNum(record.current_delay ?? record.delay_days)));
};

const BgPill: React.FC<{
  party: 'SCL' | 'CONTRACTOR';
  entries?: BGEntry[];
}> = ({ party, entries = [] }) => (
  <ProjectDatesBgStatusPill party={party} entries={entries} showStatusLabel={false} />
);

const PartySchedulePanel: React.FC<{
  party: 'SCL' | 'CONTRACTOR';
  record: ProjectDatesRecord | null;
  partyTitle?: string;
  bgEntries?: BGEntry[];
  isLoading?: boolean;
  error?: string | null;
}> = ({ party, record, partyTitle, bgEntries = [], isLoading, error }) => {
  const ex = usePmcExecutiveTheme();
  const isScl = party === 'SCL';
  const accent = isScl ? 'blue' : 'rose';
  const delay = delayDays(record);
  const displayTitle = partyTitle ?? party;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-4 sm:p-5">
        <div className={`h-6 w-32 rounded-lg ${ex.skeleton}`} />
        <div className={`h-24 rounded-xl ${ex.skeleton}`} />
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="flex min-h-[160px] items-center justify-center p-5">
        <p className={`text-center text-sm font-semibold ${ex.roseText}`}>{error}</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex min-h-[160px] items-center justify-center p-5">
        <p className={`text-sm font-semibold ${ex.muted}`}>No {displayTitle} schedule data</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black uppercase text-white ${isScl ? 'bg-blue-600' : 'bg-rose-600'
              }`}
          >
            {isScl ? 'SC' : 'CO'}
          </span>
          <h3 className={`text-base font-black uppercase tracking-tight sm:text-lg ${ex.heading}`}>
            {displayTitle}
          </h3>
        </div>
        <BgPill party={isScl ? 'SCL' : 'CONTRACTOR'} entries={bgEntries} />
      </div>

      {/* Desktop: milestone rail + delay */}
      <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1">
          {/* Mobile milestone list */}
          <div className="space-y-2 lg:hidden">
            {MILESTONES.map(({ key, label, field, Icon }) => (
              <div
                key={key}
                className={`flex items-center gap-3 px-3 py-2.5 ${ex.milestoneCard}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${accent === 'blue' ? 'bg-blue-600' : 'bg-rose-600'
                    }`}
                >
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${ex.label}`}>
                    {label}
                  </p>
                  <p className={`text-sm font-bold tabular-nums ${ex.milestoneText}`}>
                    {formatDisplayDate(record[field])}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop milestone rail */}
          <div className="relative hidden lg:block">
            <div className={`absolute left-4 right-4 top-5 h-0.5 ${ex.milestoneRail}`} />
            <div className="relative grid grid-cols-4 gap-2">
              {MILESTONES.map(({ key, label, field, Icon }) => (
                <div key={key} className="flex flex-col items-center text-center">
                  <p className={`mb-2 min-h-[2rem] text-[9px] font-bold uppercase leading-tight tracking-wide xl:text-[10px] ${ex.label}`}>
                    {label}
                  </p>
                  <div
                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 text-white shadow-md ${ex.milestoneBorderWhite} ${accent === 'blue' ? 'bg-blue-600' : 'bg-rose-600'
                      }`}
                  >
                    <Icon size={16} strokeWidth={2.5} />
                  </div>
                  <p className={`mt-2 text-xs font-bold tabular-nums xl:text-sm ${ex.milestoneText}`}>
                    {formatDisplayDate(record[field])}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`flex shrink-0 flex-col items-center justify-center rounded-xl border px-4 py-4 text-center lg:w-[7.5rem] xl:w-[8.5rem] ${delay > 0 ? ex.delayBoxBad : ex.delayBoxGood
            }`}
        >
          <Timer
            size={18}
            className={delay > 0 ? 'text-rose-500' : 'text-emerald-600'}
            strokeWidth={2}
          />
          <p
            className={`mt-1 text-[9px] font-bold uppercase leading-tight tracking-wide ${delay > 0 ? 'text-rose-500' : 'text-emerald-600'
              }`}
          >
            Delay Up To Date
          </p>
          <p
            className={`mt-1 text-3xl font-black leading-none tabular-nums xl:text-4xl ${delay > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
          >
            {delay}
          </p>
          <p className={`text-xs font-semibold ${delay > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
            Days
          </p>
        </div>
      </div>
    </div>
  );
};

export const PMCExecutivePanel: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, children, className = '' }) => {
  const ex = usePmcExecutiveTheme();

  return (
    <div className={`${ex.panel} ${className}`}>
      <div className={ex.panelHeader}>
        <h3 className={ex.panelTitle}>{title}</h3>
        {subtitle && <p className={ex.panelSubtitle}>{subtitle}</p>}
      </div>
      <div className="pmc-executive-panel-body [&_.dashboard-card-top-accent]:hidden [&>div]:!rounded-none [&>div]:!border-0 [&>div]:!shadow-none">
        {children}
      </div>
    </div>
  );
};

interface PMCHeadScheduleSectionProps {
  scl: ProjectDatesRecord | null;
  contractors: ProjectDatesRecord[];
  selectedContractorId: number | null;
  onSelectContractor: (id: number) => void;
  hideContractorSelector?: boolean;
  sclBgEntries?: BGEntry[];
  contractorBgEntries?: BGEntry[];
  bgSummary?: BGSummary | null;
  isLoading?: boolean;
  error?: string | null;
  children?: React.ReactNode;
}

const PMCHeadScheduleSection: React.FC<PMCHeadScheduleSectionProps> = ({
  scl,
  contractors,
  selectedContractorId,
  onSelectContractor,
  hideContractorSelector = false,
  sclBgEntries = [],
  contractorBgEntries = [],
  bgSummary = null,
  isLoading = false,
  error = null,
  children,
}) => {
  const ex = usePmcExecutiveTheme();
  const selectedContractor = resolveSelectedContractor(contractors, selectedContractorId);
  const selectedContractorBg = selectedContractor
    ? filterContractorBgEntries(
        contractorBgEntries,
        contractorLabel(selectedContractor),
        contractors.length,
      )
    : [];

  const summaryItems = bgSummary
    ? [
        { label: 'Total BG', value: bgSummary.total_bg },
        { label: 'Updated', value: bgSummary.updated },
        { label: 'Compliance', value: `${bgSummary.compliance_percentage.toFixed(0)}%` },
      ]
    : [];

  return (
    <div className="space-y-4 sm:space-y-5">
      <PMCExecutiveTimeline scl={scl} contractor={selectedContractor} />

      <div className={ex.panel}>
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${ex.panelHeader}`}>
          <div className="flex items-center gap-2.5">
            <span className={ex.iconBox}>
              <Calendar size={20} strokeWidth={2} />
            </span>
            <div>
              <h2 className={ex.panelTitle}>Project Dates</h2>
              <p className={ex.panelSubtitle}>Executive schedule snapshot</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <BgPill party="SCL" entries={sclBgEntries} />
            <BgPill party="CONTRACTOR" entries={selectedContractorBg} />
          </div>
        </div>

        {summaryItems.length > 0 && (
          <div className={`grid grid-cols-3 gap-2 border-b px-4 py-3 ${ex.divide}`}>
            {summaryItems.map((item) => (
              <div key={item.label} className={`rounded-lg border px-2.5 py-2 text-center ${ex.milestoneCard}`}>
                <p className={`text-[9px] font-bold uppercase tracking-wide ${ex.label}`}>{item.label}</p>
                <p className={`mt-0.5 text-sm font-black tabular-nums ${ex.milestoneText}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-y-0 divide-y ${ex.divide}`}>
          <PartySchedulePanel
            party="SCL"
            record={scl}
            bgEntries={sclBgEntries}
            isLoading={isLoading}
            error={error}
          />
          <div className="flex flex-col">
            {contractors.length > 1 && !hideContractorSelector && (
              <div className={`flex flex-wrap items-center gap-2 border-b px-4 py-2.5 ${ex.divide}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${ex.label}`}>
                  Contractor
                </span>
                <select
                  value={selectedContractor?.id ?? ''}
                  onChange={(e) => onSelectContractor(Number(e.target.value))}
                  className={`max-w-full flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold outline-none sm:min-w-[180px] ${ex.milestoneCard}`}
                >
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {contractorLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <PartySchedulePanel
              party="CONTRACTOR"
              record={selectedContractor}
              partyTitle={selectedContractor ? contractorLabel(selectedContractor) : 'Contractor'}
              bgEntries={selectedContractorBg}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
};

export default PMCHeadScheduleSection;
