import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlannedEarnedPartyMetrics } from '../services/api';
import { Icons } from './Icons';
import { CardEditButton, CardHeaderActions } from './FormulaInfoButton';
import PlannedEarnedSection from './PlannedEarnedSection';
import PerformanceHighlightCard, { KPI_METRIC_COLORS } from './PerformanceHighlightCard';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { PvaVarianceBadge } from './plannedVsActual/PvaVarianceBadge';
import { formatIndianCurrencyCompact } from '../utils/format';
import {
  chartAxisTick,
  chartGridStroke,
  chartTooltipStyle,
  formatChartCurrencyAxisTick,
} from '../utils/dashboardCharts';
import {
  getPlanDeltaHelperText,
  getPlannedEarnedPerformanceStatus,
  getPlannedEarnedProgressTone,
} from '../utils/plannedEarnedValue';
import {
  DASHBOARD_CARD_HEADER_ROW_CLASS,
  DASHBOARD_FINANCIAL_CARD_PADDING,
  getThemeClasses,
  useTheme,
} from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';

interface PlannedEarnedValueCardProps {
  className?: string;
  sectionTitle: string;
  data: PlannedEarnedPartyMetrics | null;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  headerActions?: React.ReactNode;
  /** Always-on dim overlay (e.g. dashboard while client reviews this block) */
  showTbdOverlay?: boolean;
}

/** Standalone card matching the dashboard PerformanceHighlightCard layout for one party (SCL or Contractor). */
const PlannedEarnedValueCard: React.FC<PlannedEarnedValueCardProps> = ({
  className = '',
  sectionTitle,
  data,
  isLoading = false,
  error = null,
  emptyMessage,
  headerActions,
  showTbdOverlay = false,
}) => {
  const performancePercent = data?.performancePercentage ?? 0;
  const variance = data?.difference ?? data?.variance ?? 0;
  const hasCollection = data?.collection != null;
  const isEmpty = !isLoading && !error && !data;
  const partyLabel = sectionTitle;

  return (
    <PerformanceHighlightCard
      className={className}
      title={partyLabel}
      icon={<Icons.Performance size={14} />}
      performancePercent={performancePercent}
      performanceLabel={hasCollection ? 'Achievement %' : 'Schedule Performance Index'}
      status={getPlannedEarnedPerformanceStatus(performancePercent)}
      progressTone={getPlannedEarnedProgressTone(performancePercent)}
      helperText={data ? getPlanDeltaHelperText(performancePercent) : undefined}
      isLoading={isLoading}
      error={error}
      isEmpty={isEmpty}
      emptyMessage={emptyMessage ?? `No ${sectionTitle} data available.`}
      metrics={
        data
          ? hasCollection
            ? [
                {
                  label: 'Planned Value',
                  value: formatIndianCurrencyCompact(data.plannedValue),
                  valueClassName: KPI_METRIC_COLORS.primary,
                },
                {
                  label: 'Actual Value',
                  value: formatIndianCurrencyCompact(data.earnedValue),
                  valueClassName: KPI_METRIC_COLORS.primary,
                },
                {
                  label: 'Collection',
                  value: formatIndianCurrencyCompact(data.collection ?? 0),
                  valueClassName: KPI_METRIC_COLORS.primary,
                },
              ]
            : [
                {
                  label: 'Planned Value',
                  value: formatIndianCurrencyCompact(data.plannedValue),
                  valueClassName: KPI_METRIC_COLORS.primary,
                },
                {
                  label: 'Actual Value',
                  value: formatIndianCurrencyCompact(data.earnedValue),
                  valueClassName: KPI_METRIC_COLORS.primary,
                },
                {
                  label: 'Difference',
                  value: formatIndianCurrencyCompact(variance, { showSign: true }),
                  valueClassName: variance >= 0 ? KPI_METRIC_COLORS.positive : KPI_METRIC_COLORS.negative,
                },
              ]
          : [
              { label: 'Planned Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
              { label: 'Actual Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
              { label: 'Difference', value: '—', valueClassName: KPI_METRIC_COLORS.muted },
            ]
      }
      headerActions={headerActions}
      showTbdOverlay={showTbdOverlay}
    />
  );
};

/** Build Planned → Actual → Collection series from API metrics (display only). */
function partyCurvePoints(data: PlannedEarnedPartyMetrics | null) {
  if (!data) return [];
  const planned = data.plannedValue ?? 0;
  const actual = data.earnedValue ?? 0;
  const collection = data.collection ?? 0;
  if (!planned && !actual && !collection) return [];
  return [
    { label: 'Planned', value: planned },
    { label: 'Actual', value: actual },
    { label: 'Collection', value: collection },
  ];
}

type PartyChartTheme = {
  stroke: string;
  fillId: string;
  accentBg: string;
  accentText: string;
  accentRing: string;
};

const SCL_THEME: PartyChartTheme = {
  stroke: '#1e3a5f',
  fillId: 'pvaPartySclFill',
  accentBg: 'bg-slate-100',
  accentText: 'text-slate-900',
  accentRing: 'border-l-4 border-slate-800',
};

const CONTRACTOR_THEME: PartyChartTheme = {
  stroke: '#0f766e',
  fillId: 'pvaPartyContractorFill',
  accentBg: 'bg-teal-50',
  accentText: 'text-teal-900',
  accentRing: 'border-l-4 border-teal-600',
};

/** One party curve panel — SCL or Contractor. */
const PartyCurvePanel: React.FC<{
  title: string;
  data: PlannedEarnedPartyMetrics | null;
  isDarkTheme: boolean;
  theme: PartyChartTheme;
  isLoading?: boolean;
  onClick?: () => void;
}> = ({ title, data, isDarkTheme, theme, isLoading = false, onClick }) => {
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const points = useMemo(() => partyCurvePoints(data), [data]);
  const achievement = data?.performancePercentage ?? 0;
  const collectionPct = data?.collectionPct;
  const varianceStatus = data?.varianceStatus;

  const titleBg = isDarkTheme
    ? theme.fillId === 'pvaPartyContractorFill'
      ? 'bg-teal-500/20'
      : 'bg-white/10'
    : theme.accentBg;
  const titleText = isDarkTheme
    ? theme.fillId === 'pvaPartyContractorFill'
      ? 'text-teal-100'
      : 'text-slate-100'
    : theme.accentText;
  const titleBorder = isDarkTheme
    ? theme.fillId === 'pvaPartyContractorFill'
      ? 'border-l-4 border-teal-400'
      : 'border-l-4 border-slate-300'
    : theme.accentRing;

  if (isLoading) {
    return (
      <div
        className={`flex h-[300px] animate-pulse flex-col rounded-xl border ${themeClasses.border} ${
          isDarkTheme ? 'bg-white/5' : 'bg-slate-100'
        }`}
        aria-label={`Loading ${title}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full min-h-[300px] w-full flex-col rounded-xl border p-3 text-left transition-all sm:p-3.5 ${themeClasses.border} ${
        isDarkTheme
          ? 'bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
          : 'bg-white hover:border-slate-300 hover:shadow-sm'
      } ${onClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40' : 'cursor-default'}`}
      aria-label={`${title} — click for number details`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`w-full rounded-r-md py-1.5 pl-2.5 pr-2 text-[11px] font-black uppercase leading-snug tracking-wide ${titleBg} ${titleText} ${titleBorder}`}
          >
            {title}
          </p>
          <p className={`mt-1.5 ${typo.micro} ${themeClasses.textMuted}`}>
            Planned · Actual · Collection
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-lg px-2 py-0.5 text-sm font-black tabular-nums ${titleBg} ${titleText}`}
          >
            {data ? `${achievement.toFixed(0)}%` : '—'}
          </span>
          {varianceStatus ? (
            <PvaVarianceBadge status={varianceStatus} isDark={isDarkTheme} />
          ) : null}
        </div>
      </div>

      {points.length === 0 ? (
        <div
          className={`flex flex-1 items-center justify-center rounded-lg border border-dashed ${themeClasses.border}`}
        >
          <p className={`${typo.micro} ${themeClasses.textMuted}`}>No data for this period</p>
        </div>
      ) : (
        <>
          <div className="w-full shrink-0" style={{ height: 190, minHeight: 190 }}>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={points} margin={{ top: 12, right: 10, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id={theme.fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.stroke} stopOpacity={0.4} />
                    <stop offset="55%" stopColor={theme.stroke} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={theme.stroke} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={chartAxisTick(isDarkTheme, 10)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={chartAxisTick(isDarkTheme, 9)}
                  tickFormatter={formatChartCurrencyAxisTick}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle(isDarkTheme)}
                  formatter={(value: number) => [formatIndianCurrencyCompact(value), 'Value']}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="value"
                  stroke={theme.stroke}
                  strokeWidth={2.75}
                  fill={`url(#${theme.fillId})`}
                  dot={{ r: 4.5, strokeWidth: 2, stroke: '#fff', fill: theme.stroke }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={`mt-2 grid grid-cols-3 gap-1.5 border-t pt-2 ${themeClasses.border}`}>
            {[
              { label: 'Planned', value: data?.plannedValue ?? 0 },
              { label: 'Actual', value: data?.earnedValue ?? 0 },
              { label: 'Collection', value: data?.collection ?? 0 },
            ].map((item) => (
              <div key={item.label} className="min-w-0 text-center">
                <p className={`text-[9px] font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>
                  {item.label}
                </p>
                <p
                  className={`mt-0.5 truncate text-[11px] font-black tabular-nums ${themeClasses.textPrimary}`}
                  title={formatIndianCurrencyCompact(item.value)}
                >
                  {formatIndianCurrencyCompact(item.value)}
                </p>
              </div>
            ))}
          </div>
          {collectionPct != null && (
            <p className={`mt-1.5 text-center ${typo.micro} ${themeClasses.textMuted}`}>
              Collection {Number(collectionPct).toFixed(1)}%
            </p>
          )}
        </>
      )}
    </button>
  );
};

/** Two separate curve sections — SCL | Contractor. */
const PlannedEarnedDualCurves: React.FC<{
  sclData: PlannedEarnedPartyMetrics | null;
  contractorData: PlannedEarnedPartyMetrics | null;
  contractorTitle: string;
  isDarkTheme: boolean;
  isLoading?: boolean;
  onOpenDetails?: () => void;
  hint?: string;
}> = ({
  sclData,
  contractorData,
  contractorTitle,
  isDarkTheme,
  isLoading = false,
  onOpenDetails,
  hint,
}) => {
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {hint && (
        <p className={`text-right ${typo.micro} ${themeClasses.textMuted}`}>{hint}</p>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <PartyCurvePanel
          title="SCL Planned vs Actual"
          data={sclData}
          isDarkTheme={isDarkTheme}
          theme={SCL_THEME}
          isLoading={isLoading}
          onClick={onOpenDetails}
        />
        <PartyCurvePanel
          title={contractorTitle}
          data={contractorData}
          isDarkTheme={isDarkTheme}
          theme={CONTRACTOR_THEME}
          isLoading={isLoading}
          onClick={onOpenDetails}
        />
      </div>
    </div>
  );
};

interface PlannedEarnedValueGroupCardProps {
  sclData: PlannedEarnedPartyMetrics | null;
  contractorData: PlannedEarnedPartyMetrics | null;
  contractorSectionTitle?: string;
  groupSubtitle?: string;
  className?: string;
  isLoading?: boolean;
  sclError?: string | null;
  contractorError?: string | null;
  headerActions?: React.ReactNode;
  onEdit?: () => void;
  showTbdOverlay?: boolean;
}

/**
 * Dashboard card: graph-first.
 * Default = curve only; click chart (or Details) to reveal SCL / Contractor numbers.
 */
export const PlannedEarnedValueGroupCard: React.FC<PlannedEarnedValueGroupCardProps> = ({
  sclData,
  contractorData,
  contractorSectionTitle = 'CONTRACTOR SUMMARY (ALL CONTRACTORS)',
  groupSubtitle,
  className = '',
  isLoading = false,
  sclError = null,
  contractorError = null,
  headerActions,
  onEdit,
  showTbdOverlay = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const subtitle = groupSubtitle ?? 'SCL & Contractor performance';
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      id="exec-section-planned-vs-actual"
      className={`planned-earned-group earned-value-card relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border ${DASHBOARD_FINANCIAL_CARD_PADDING} transition-shadow hover:shadow-md sm:min-h-[360px] ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
          : 'border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]'
      } ${className}`}
    >
      <DashboardCardTopAccent />
      <div className={`mb-3 ${DASHBOARD_CARD_HEADER_ROW_CLASS(themeClasses.border)}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              isDarkTheme ? 'bg-blue-500/15' : 'bg-blue-50'
            }`}
          >
            <Icons.Performance size={18} className={isDarkTheme ? 'text-blue-300' : 'text-blue-600'} />
          </div>
          <div className="min-w-0">
            <h3 className={typo.financialGroupTitle}>Planned vs Actual Value</h3>
            <p className={typo.financialGroupSubtitle(isDarkTheme)}>{subtitle}</p>
          </div>
        </div>
        <CardHeaderActions>
          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${themeClasses.border} ${
              showDetails
                ? isDarkTheme
                  ? 'bg-blue-500/20 text-blue-200'
                  : 'bg-blue-50 text-blue-700'
                : isDarkTheme
                  ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
            aria-expanded={showDetails}
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          {headerActions}
          {onEdit && <CardEditButton onClick={onEdit} title="Edit in Financial Management" />}
        </CardHeaderActions>
      </div>

      {/* Graph-first: separate SCL | Contractor curves */}
      <div className="min-h-0 flex-1">
        <PlannedEarnedDualCurves
          sclData={sclData}
          contractorData={contractorData}
          contractorTitle={contractorSectionTitle}
          isDarkTheme={isDarkTheme}
          isLoading={isLoading}
          onOpenDetails={() => setShowDetails(true)}
          hint={showDetails ? undefined : 'Click a chart for full number details'}
        />
      </div>

      {/* Number details — only after click */}
      {showDetails && (
        <div
          className={`mt-3 grid min-h-0 grid-cols-1 gap-0 divide-y divide-dashed border-t pt-2 lg:grid-cols-2 lg:divide-x lg:divide-y-0 ${themeClasses.border}`}
        >
          <div className="min-w-0 lg:pr-3">
            <PlannedEarnedSection
              title="SCL PLANNED VS ACTUAL VALUE"
              data={sclData}
              isLoading={isLoading}
              error={sclError}
              emptyMessage="No SCL planned vs actual data available."
              compact
              titleTone="scl"
            />
          </div>
          <div className="min-w-0 lg:pl-3">
            <PlannedEarnedSection
              title={contractorSectionTitle}
              data={contractorData}
              isLoading={isLoading}
              error={contractorError}
              emptyMessage="No contractor planned vs actual data available."
              compact
              titleTone="contractor"
            />
          </div>
        </div>
      )}

      {showTbdOverlay && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/55"
          aria-hidden
        >
          <span className="text-3xl font-black uppercase tracking-[0.35em] text-white drop-shadow-sm">
            TBD
          </span>
        </div>
      )}
    </div>
  );
};

export default React.memo(PlannedEarnedValueCard);
