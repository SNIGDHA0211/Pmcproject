import React from 'react';
import { Calendar, CalendarClock, Flag, Plus, ShieldPlus, Timer, Trash2 } from 'lucide-react';
import type { ProjectDatesRecord } from '../services/api';
import type { BGEntry } from '../types/bgStatus';
import { contractorLabel } from '../utils/projectDatesMulti';
import { Icons } from './Icons';
import { CardEditButton, CardHeaderActions } from './FormulaInfoButton';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import ScheduleBgStrip from './contractor/ScheduleBgStrip';
import { DASHBOARD_CARD_TITLE_CLASS, getThemeClasses, useTheme } from '../utils/theme';

export type ProjectDatesCardVariant = 'SCL' | 'Contractor';

export type BgManageScope = 'all' | 'SCL' | { contractorName: string };

const formatDisplayDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleString('en-GB', { month: 'short' });
  const year = parsed.getFullYear();
  return `${day} ${month} ${year}`;
};

const getDelayTone = (delay: number, isDarkTheme: boolean) => {
  if (delay <= 0) {
    return {
      value: isDarkTheme ? 'text-emerald-400' : 'text-[#059669]',
      icon: isDarkTheme ? 'text-emerald-400' : 'text-[#059669]',
      label: isDarkTheme ? 'text-emerald-400/90' : 'text-[#059669]',
      bg: isDarkTheme ? 'bg-emerald-500/10' : 'bg-emerald-50',
      border: isDarkTheme ? 'border-emerald-500/20' : 'border-emerald-100',
    };
  }
  return {
    value: isDarkTheme ? 'text-rose-400' : 'text-[#E11D48]',
    icon: isDarkTheme ? 'text-rose-400' : 'text-[#E11D48]',
    label: isDarkTheme ? 'text-rose-400/90' : 'text-[#E11D48]',
    bg: isDarkTheme ? 'bg-rose-500/10' : 'bg-rose-50',
    border: isDarkTheme ? 'border-rose-500/20' : 'border-rose-100',
  };
};

const DATE_MILESTONES = [
  { key: 'start', label: 'START DATE', field: 'project_start' as const, Icon: Calendar },
  { key: 'contract', label: 'CONTRACT FINISH', field: 'contract_finish' as const, Icon: Calendar },
  { key: 'forecast', label: 'FORECAST FINISH', field: 'forecast_finish' as const, Icon: CalendarClock },
  { key: 'eot', label: 'EOT', field: 'eot_date' as const, Icon: Flag },
] as const;

const DelayStatusCard: React.FC<{
  delay: number;
  isDarkTheme: boolean;
  /** Wider layout when stacked under timeline on narrow columns */
  layout?: 'compact' | 'wide';
}> = ({ delay, isDarkTheme, layout = 'compact' }) => {
  const tone = getDelayTone(delay, isDarkTheme);
  const roundedDelay = Math.round(delay);
  const hasIssue = roundedDelay > 0;
  const displayValue =
    roundedDelay < 0 ? String(roundedDelay) : String(Math.abs(roundedDelay));
  const blinkClass = hasIssue
    ? isDarkTheme
      ? 'pmc-delay-alert-blink-dark'
      : 'pmc-delay-alert-blink'
    : '';
  const sizeClass =
    layout === 'wide'
      ? 'w-full max-w-none flex-row gap-3 px-3 py-2.5 sm:max-w-xs sm:flex-col sm:gap-0 sm:px-2 sm:py-2.5'
      : 'w-full max-w-[11rem] sm:w-[5.25rem] sm:max-w-none md:w-[5.75rem]';

  return (
    <div
      role={hasIssue ? 'status' : undefined}
      aria-live={hasIssue ? 'polite' : undefined}
      aria-label={
        hasIssue
          ? `Schedule delay alert: ${displayValue} days late`
          : `Delay up to date: ${displayValue} days`
      }
      title={
        hasIssue
          ? `Attention: ${displayValue} days delay — check schedule milestones`
          : undefined
      }
      className={`flex shrink-0 flex-col items-center justify-center rounded-lg border text-center ${sizeClass} ${tone.bg} ${tone.border} ${blinkClass} ${
        hasIssue ? 'ring-2 ring-rose-400/40' : ''
      }`}
    >
      <Timer size={14} strokeWidth={2.2} className={`mb-0.5 ${tone.icon}`} aria-hidden />
      <p className={`text-[8px] font-bold uppercase leading-tight tracking-wide sm:text-[9px] ${tone.label}`}>
        {hasIssue ? 'Delay — Check' : 'Delay Up To Date'}
      </p>
      <p className={`mt-1 text-2xl font-black leading-none tabular-nums sm:text-3xl ${tone.value}`}>
        {displayValue}
      </p>
      <p className={`mt-0.5 text-[10px] font-semibold sm:text-xs ${tone.label}`}>Days</p>
    </div>
  );
};

export const ProjectDatesPartyColumn: React.FC<{
  variant: ProjectDatesCardVariant;
  data: ProjectDatesRecord | null;
  bgEntries?: BGEntry[];
  isLoading: boolean;
  error: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onManageBg?: () => void;
  themeClasses: ReturnType<typeof getThemeClasses>;
  isDarkTheme: boolean;
  /** Compact layout for contractor schedule cards — hides duplicate title row */
  layout?: 'default' | 'compact';
  /** Title shown in BG details modal (e.g. "1. Contractor") */
  partyDisplayTitle?: string;
  /** When false, timeline column only (BG shown in group card panel). */
  showBgStrip?: boolean;
}> = ({
  variant,
  data,
  bgEntries = [],
  isLoading,
  error,
  onEdit,
  onDelete,
  onManageBg,
  themeClasses,
  isDarkTheme,
  layout = 'default',
  partyDisplayTitle,
  showBgStrip = false,
}) => {
  const partyLabel =
    variant === 'SCL' ? 'SCL' : contractorLabel(data).toUpperCase();
  const partyInitial = variant === 'SCL' ? 'sc' : 'co';
  const mutedClass = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const primaryText = isDarkTheme ? themeClasses.textPrimary : 'text-slate-900';
  const lineClass = isDarkTheme ? 'bg-slate-500/90' : 'bg-slate-400';
  const iconTile = isDarkTheme
    ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20'
    : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100';
  const borderClass = isDarkTheme ? 'border-white/10' : 'border-slate-200';

  if (isLoading) {
    return (
      <div className="flex min-h-[120px] flex-col gap-2.5 p-3.5">
        <div className={`h-7 w-28 animate-pulse rounded-lg ${themeClasses.bgSecondary}`} />
        <div className={`h-12 flex-1 animate-pulse rounded-lg ${themeClasses.bgSecondary}`} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className={`flex min-h-[120px] items-center justify-center p-3.5`}>
        <p className="text-center text-sm font-semibold text-rose-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className={`flex min-h-[120px] flex-col items-center justify-center gap-3 border-dashed p-3.5 ${borderClass}`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold lowercase ${iconTile}`}
        >
          {partyInitial}
        </span>
        <p className={`text-sm font-semibold ${mutedClass}`}>No {partyLabel} dates</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-blue-500"
          >
            <Plus size={14} />
            {variant === 'SCL' ? 'Add SCL Dates' : 'Add Schedule'}
          </button>
        )}
      </div>
    );
  }

  const delayNum = Math.round(data.current_delay ?? data.delay_days ?? 0);
  const isCompact = layout === 'compact';
  const shellPad = isCompact ? 'gap-2 px-3 py-2 sm:px-4' : 'gap-2.5 px-3.5 py-3';
  const milestoneLabelClass = isCompact
    ? `mb-1 min-h-[1.35rem] text-center text-[9px] font-bold uppercase leading-tight tracking-wide md:text-[10px] ${mutedClass}`
    : `mb-1.5 min-h-[2rem] text-center text-[10px] font-bold uppercase leading-tight tracking-wide md:min-h-[2.25rem] md:text-xs lg:text-sm ${mutedClass}`;

  const partyBgRole = variant === 'SCL' ? 'SCL' : 'CONTRACTOR' as const;

  return (
    <div className={`relative flex flex-col ${shellPad}`}>
      {!isCompact && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold lowercase leading-none ${iconTile}`}
            >
              {partyInitial}
            </span>
            <p
              className={`truncate text-sm font-semibold uppercase leading-none tracking-wide sm:text-base ${
                isDarkTheme ? 'text-blue-400/90' : 'text-blue-600/90'
              }`}
            >
              {partyLabel}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                title="Delete contractor schedule"
                className={`rounded-lg p-1.5 transition-colors ${
                  isDarkTheme
                    ? 'text-rose-400 hover:bg-rose-500/15'
                    : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Trash2 size={14} />
              </button>
            )}
            {onEdit && (
              <CardEditButton onClick={onEdit} title={`Edit ${partyLabel} project dates`} />
            )}
          </div>
        </div>
      )}

      {showBgStrip && (
        <ScheduleBgStrip
          entries={bgEntries}
          isDarkTheme={isDarkTheme}
          party={partyBgRole}
          partyTitle={partyDisplayTitle ?? partyLabel}
          onManageBg={onManageBg}
        />
      )}

      <div className={`flex flex-col ${isCompact ? 'gap-2' : showBgStrip ? 'gap-3 sm:gap-2' : 'gap-2 sm:gap-1'} sm:pr-0.5`}>
        {/* Mobile: stacked milestones + delay alert */}
        <div className="flex flex-col gap-2 lg:hidden">
          {DATE_MILESTONES.map(({ key, label, field, Icon }) => (
            <div
              key={key}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${borderClass} ${isDarkTheme ? 'bg-white/[0.03]' : 'bg-slate-50/80'
                }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconTile}`}>
                <Icon size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-bold uppercase leading-tight tracking-wide ${mutedClass}`}>
                  {label}
                </p>
                <p className={`mt-0.5 text-sm font-bold leading-tight tabular-nums ${primaryText}`}>
                  {formatDisplayDate(data[field])}
                </p>
              </div>
            </div>
          ))}
          <div className="flex justify-center pt-1">
            <DelayStatusCard delay={delayNum} isDarkTheme={isDarkTheme} layout="wide" />
          </div>
        </div>

        {/* Desktop: horizontal timeline; delay stacks under on tight columns, beside on xl+ */}
        <div className="hidden lg:flex lg:flex-col lg:gap-2 xl:flex-row xl:items-center xl:gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <div className="min-w-[22rem] xl:min-w-[24rem]">
              <div className="grid grid-cols-4 gap-1">
                {DATE_MILESTONES.map(({ key, label }) => (
                  <p key={`${key}-label`} className={milestoneLabelClass}>
                    {label}
                  </p>
                ))}
              </div>

              <div className={`relative ${isCompact ? 'mb-1' : 'mb-1.5'}`}>
                <div
                  className={`pointer-events-none absolute inset-x-[12.5%] top-1/2 z-0 h-[3px] -translate-y-1/2 rounded-full ${lineClass}`}
                  aria-hidden
                />
                <div className="relative grid grid-cols-4 gap-1">
                  {DATE_MILESTONES.map(({ key, Icon }) => (
                    <div key={`${key}-icon`} className="flex justify-center">
                      <div
                        className={`relative z-10 flex h-[30px] w-[30px] items-center justify-center rounded-lg md:h-[34px] md:w-[34px] ${iconTile}`}
                      >
                        <Icon size={16} strokeWidth={2} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {DATE_MILESTONES.map(({ key, field }) => (
                  <p
                    key={`${key}-date`}
                    className={`text-center text-xs font-bold leading-tight tabular-nums md:text-sm xl:text-base ${primaryText}`}
                  >
                    {formatDisplayDate(data[field])}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-center xl:justify-end">
            <DelayStatusCard delay={delayNum} isDarkTheme={isDarkTheme} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProjectDatesGroupCardProps {
  sclData: ProjectDatesRecord | null;
  contractors: ProjectDatesRecord[];
  selectedContractorId: number | null;
  onSelectContractor: (id: number) => void;
  hideContractorSelector?: boolean;
  sclBgEntries?: BGEntry[];
  contractorBgEntries?: BGEntry[];
  bgSummary?: import('../types/bgStatus').BGSummary | null;
  isLoading?: boolean;
  sclError?: string | null;
  contractorError?: string | null;
  onEditScl?: () => void;
  onEditContractor?: (record: ProjectDatesRecord) => void;
  onAddContractor?: () => void;
  onDeleteContractor?: (record: ProjectDatesRecord) => void;
  onManageBg?: (scope: BgManageScope) => void;
  headerActions?: React.ReactNode;
}

export const ProjectDatesGroupCard: React.FC<ProjectDatesGroupCardProps> = ({
  sclData,
  contractors,
  selectedContractorId,
  onSelectContractor,
  hideContractorSelector = false,
  sclBgEntries = [],
  contractorBgEntries = [],
  bgSummary = null,
  isLoading = false,
  sclError = null,
  contractorError = null,
  onEditScl,
  onEditContractor,
  onAddContractor,
  onDeleteContractor,
  onManageBg,
  headerActions,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const selectedContractor =
    contractors.find((c) => c.id === selectedContractorId) ?? contractors[0] ?? null;

  /** Project-level contractor BG rows (not tied to schedule contractor name). */
  const contractorBgForPanel = contractorBgEntries;

  const showBgPanel =
    sclBgEntries.length > 0 || contractorBgForPanel.length > 0 || Boolean(onManageBg);

  const summaryItems = bgSummary
    ? [
        { label: 'Total BG', value: bgSummary.total_bg },
        { label: 'Updated', value: bgSummary.updated },
        { label: 'Yet To Update', value: bgSummary.yet_to_update },
        { label: 'Compliance', value: `${bgSummary.compliance_percentage.toFixed(0)}%` },
      ]
    : [];

  return (
    <div
      className={`project-dates-group joyride-target-stable relative flex h-auto min-h-0 flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
          : 'border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.07)]'
        }`}
    >
      <DashboardCardTopAccent />

      {/* Card Header — single row on md+ */}
      <div
        className={`flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2.5 sm:px-4 sm:py-3 md:flex-nowrap md:justify-between md:gap-4 md:px-5 ${themeClasses.border}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg sm:h-9 sm:w-9 ${isDarkTheme
                ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25'
                : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
              }`}
          >
            <Icons.Calendar size={18} strokeWidth={2} className="shrink-0 sm:hidden" />
            <Icons.Calendar size={20} strokeWidth={2} className="hidden shrink-0 sm:block" />
          </span>
          <div className="min-w-0">
            <h3 className={`${DASHBOARD_CARD_TITLE_CLASS} m-0 leading-none`}>Project Dates</h3>
            {contractors.length > 0 && selectedContractor && (
              <p className={`mt-0.5 truncate text-[10px] font-semibold sm:text-[11px] ${themeClasses.textSecondary}`}>
                Contractor:{' '}
                <span className={themeClasses.textPrimary}>{contractorLabel(selectedContractor)}</span>
                {contractors.length > 1 && (
                  <span className={themeClasses.textMuted}>
                    {' '}
                    ({contractors.findIndex((c) => c.id === selectedContractor.id) + 1}/
                    {contractors.length})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <CardHeaderActions className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {onAddContractor && (
            <button
              type="button"
              onClick={onAddContractor}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.03] active:scale-[0.97] ${
                isDarkTheme
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Plus size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">Add Contractor</span>
            </button>
          )}
          {onManageBg && (
            <button
              type="button"
              onClick={() => onManageBg('all')}
              title="Manage all bank guarantee entries"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-[1.03] active:scale-[0.97] ${
                isDarkTheme
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                  : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <ShieldPlus size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">Manage BG Status</span>
            </button>
          )}
          {headerActions}
        </CardHeaderActions>
      </div>

      {summaryItems.length > 0 && (
        <div
          className={`grid grid-cols-2 gap-2 border-b px-4 py-3 sm:grid-cols-4 ${themeClasses.border}`}
        >
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className={`rounded-lg border px-2.5 py-2 text-center ${
                isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'
              }`}
            >
              <p className={`text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>
                {item.label}
              </p>
              <p className={`mt-0.5 text-sm font-black tabular-nums ${themeClasses.textPrimary}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div
        className={`grid min-h-0 grid-cols-1 divide-y divide-dashed xl:grid-cols-2 xl:divide-x xl:divide-y-0 ${
          isDarkTheme ? 'divide-white/10' : 'divide-slate-200'
        }`}
      >
        <ProjectDatesPartyColumn
          variant="SCL"
          data={sclData}
          bgEntries={sclBgEntries}
          isLoading={isLoading}
          error={sclError}
          onEdit={onEditScl}
          onManageBg={onManageBg ? () => onManageBg('SCL') : undefined}
          themeClasses={themeClasses}
          isDarkTheme={isDarkTheme}
          showBgStrip={false}
        />

        <div className="flex flex-col">
          {contractors.length > 1 && !hideContractorSelector && (
            <div
              className={`flex flex-wrap items-center gap-2 border-b px-3 py-2.5 ${
                isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                Contractor
              </span>
              <select
                value={selectedContractor?.id ?? ''}
                onChange={(e) => onSelectContractor(Number(e.target.value))}
                className={`max-w-full flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold outline-none sm:min-w-[180px] ${
                  isDarkTheme
                    ? `${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`
                    : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contractorLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedContractor ? (
            <ProjectDatesPartyColumn
              variant="Contractor"
              data={selectedContractor}
              bgEntries={contractorBgForPanel}
              isLoading={isLoading}
              error={contractorError}
              onEdit={onEditContractor ? () => onEditContractor(selectedContractor) : undefined}
              onDelete={
                onDeleteContractor ? () => onDeleteContractor(selectedContractor) : undefined
              }
              onManageBg={
                onManageBg
                  ? () =>
                      onManageBg({
                        contractorName: contractorLabel(selectedContractor),
                      })
                  : undefined
              }
              themeClasses={themeClasses}
              isDarkTheme={isDarkTheme}
              showBgStrip={false}
            />
          ) : (
            <div className={`flex min-h-[120px] flex-col items-center justify-center gap-3 p-6`}>
              <p className={`text-sm font-semibold ${themeClasses.textSecondary}`}>
                No contractor schedules yet
              </p>
              {onAddContractor && (
                <button
                  type="button"
                  onClick={onAddContractor}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-blue-500"
                >
                  <Plus size={14} />
                  Add Contractor
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showBgPanel && (
        <div
          className={`border-t px-3 py-3 sm:px-4 md:px-5 ${
            isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/40'
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                isDarkTheme ? 'text-white/50' : 'text-slate-500'
              }`}
            >
              Bank Guarantee Status
            </p>
            {onManageBg && (
              <button
                type="button"
                onClick={() => onManageBg('all')}
                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${
                  isDarkTheme ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-700'
                }`}
              >
                <ShieldPlus size={11} />
                Manage all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
            <ScheduleBgStrip
              entries={sclBgEntries}
              isDarkTheme={isDarkTheme}
              party="SCL"
              partyTitle="SCL Bank Guarantee"
              onManageBg={onManageBg ? () => onManageBg('SCL') : undefined}
              hideWhenEmpty={!onManageBg}
            />
            <ScheduleBgStrip
              entries={contractorBgForPanel}
              isDarkTheme={isDarkTheme}
              party="CONTRACTOR"
              partyTitle="Contractor Bank Guarantee"
              onManageBg={
                onManageBg
                  ? () =>
                      onManageBg(
                        selectedContractor
                          ? { contractorName: contractorLabel(selectedContractor) }
                          : 'all',
                      )
                  : undefined
              }
              hideWhenEmpty={!onManageBg}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/** @deprecated Use ProjectDatesGroupCard */
export const ProjectDatesRow = ProjectDatesGroupCard;

/** Single-party card (legacy) */
const ProjectDatesSection: React.FC<{
  variant: ProjectDatesCardVariant;
  data: ProjectDatesRecord | null;
  isLoading?: boolean;
  error?: string | null;
  onEdit?: (variant: ProjectDatesCardVariant) => void;
}> = ({ variant, data, isLoading = false, error = null, onEdit }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  return (
    <div
      className={`project-dates-card flex min-h-0 flex-col overflow-hidden rounded-2xl border ${isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white'
        }`}
    >
      <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${themeClasses.border}`}>
        <h3 className={DASHBOARD_CARD_TITLE_CLASS}>Project Dates</h3>
        {onEdit && <CardEditButton onClick={() => onEdit(variant)} title="Edit project dates" />}
      </div>
      <ProjectDatesPartyColumn
        variant={variant}
        data={data}
        isLoading={isLoading}
        error={error}
        onEdit={onEdit ? () => onEdit(variant) : undefined}
        themeClasses={themeClasses}
        isDarkTheme={isDarkTheme}
      />
    </div>
  );
};

export default ProjectDatesSection;
