import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  HardHat,
  HelpCircle,
  TrendingUp,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { ProjectEquipmentRecord } from '../../types';
import MachinerySubmissionsTL from '../MachinerySubmissionsTL';
import ProjectEquipmentCard from '../ProjectEquipmentCard';
import { PMCExecutivePanel } from './PMCHeadScheduleSection';
import { getPmcExecutiveTheme, usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import {
  chartAxisStroke,
  chartAxisTick,
  chartBarPlotMarginExecutive,
  chartGridStroke,
  chartTooltipStyle,
  chartXAxisMonthPropsExecutive,
  formatChartCountAxisTick,
} from '../../utils/dashboardCharts';
import { ExecutiveChartWithLegend } from '../charts/ChartLegendFooter';

const HISTOGRAM_PLOT_HEIGHT = 220;
const DONUT_SIZE = 72;
const PLANNED_COLOR = '#f59e0b';
const ACTUAL_COLOR = '#0ea5e9';

function formatEquipmentMonthLabel(month: string): string {
  const raw = String(month ?? '').trim();
  if (!raw) return '—';
  const m = raw.match(/^(\d{4})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    }
  }
  return raw;
}

function equipmentVariance(record: ProjectEquipmentRecord): number {
  if (Number.isFinite(record.variance)) return record.variance;
  return (Number(record.actualEquipment) || 0) - (Number(record.plannedEquipment) || 0);
}

const compactSitePanelClass = (isDark: boolean) =>
  [
    'pmc-people-site-panel h-full',
    '[&>div]:!min-h-0',
    '[&>div]:h-full',
    '[&>div]:!rounded-2xl',
    isDark ? '[&>div]:!border-white/10' : '[&>div]:!border-slate-200',
    isDark ? '[&>div]:!bg-[#0b1d36]/70' : '[&>div]:!bg-white',
    '[&>div]:!shadow-sm',
  ].join(' ');

const SectionHint: React.FC<{
  title: string;
  points: string[];
  isDark: boolean;
}> = ({ title, points, isDark }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
          open
            ? isDark
              ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
              : 'border-cyan-300 bg-cyan-50 text-cyan-700'
            : isDark
              ? 'border-white/10 text-slate-400 hover:bg-white/5'
              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
        }`}
        aria-label={`${title} help`}
        aria-expanded={open}
      >
        <HelpCircle size={14} strokeWidth={2.2} />
      </button>
      {open && (
        <div
          className={`absolute right-0 top-9 z-20 w-64 rounded-xl border p-3 shadow-xl ${
            isDark ? 'border-white/10 bg-[#0f2744]' : 'border-slate-200 bg-white'
          }`}
          role="dialog"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className={`text-[11px] font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {title}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`rounded-md p-0.5 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
              aria-label="Close"
            >
              <X size={12} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            </button>
          </div>
          <ul className="space-y-1.5">
            {points.map((point) => (
              <li
                key={point}
                className={`text-[10px] font-medium leading-relaxed ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const StatChip: React.FC<{
  label: string;
  value: string | number;
  tone?: 'neutral' | 'planned' | 'actual' | 'up' | 'down';
  isDark: boolean;
}> = ({ label, value, tone = 'neutral', isDark }) => {
  const toneClass =
    tone === 'planned'
      ? isDark
        ? 'border-amber-400/25 bg-amber-500/10 text-amber-300'
        : 'border-amber-200 bg-amber-50 text-amber-800'
      : tone === 'actual'
        ? isDark
          ? 'border-sky-400/25 bg-sky-500/10 text-sky-300'
          : 'border-sky-200 bg-sky-50 text-sky-800'
        : tone === 'up'
          ? isDark
            ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : tone === 'down'
            ? isDark
              ? 'border-rose-400/25 bg-rose-500/10 text-rose-300'
              : 'border-rose-200 bg-rose-50 text-rose-700'
            : isDark
              ? 'border-white/10 bg-white/5 text-slate-200'
              : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`min-w-[5.5rem] rounded-xl border px-2.5 py-2 ${toneClass}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-sm font-black tabular-nums leading-none">{value}</p>
    </div>
  );
};

const MiniDonut: React.FC<{
  title: string;
  data: { name: string; value: number; color: string }[];
  isDark: boolean;
}> = ({ title, data, isDark }) => {
  const ex = getPmcExecutiveTheme(isDark);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div
      className={`flex flex-col items-center rounded-xl border px-2 py-2.5 ${
        isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'
      }`}
    >
      <p
        className={`mb-1.5 line-clamp-2 min-h-[2rem] text-center text-[9px] font-bold uppercase leading-tight tracking-wide ${ex.label}`}
      >
        {title}
      </p>
      <ResponsiveContainer width={DONUT_SIZE} height={DONUT_SIZE}>
        <PieChart>
          <Pie
            data={data.length ? data : [{ name: 'Empty', value: 1, color: isDark ? '#334155' : '#e2e8f0' }]}
            cx="50%"
            cy="50%"
            innerRadius={DONUT_SIZE * 0.38}
            outerRadius={DONUT_SIZE * 0.5}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {(data.length ? data : [{ color: isDark ? '#334155' : '#e2e8f0' }]).map((entry, index) => (
              <Cell key={`${title}-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value}%`, '']}
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
              background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className={`mt-1 text-[11px] font-black tabular-nums ${ex.slateValue}`}>
        {data.length ? `${total}%` : '—'}
      </p>
    </div>
  );
};

const ManpowerHistogramCompact: React.FC<{
  isDarkTheme: boolean;
  data: { month: string; planned: number; actual: number }[];
}> = ({ isDarkTheme, data }) => {
  const ex = getPmcExecutiveTheme(isDarkTheme);
  const axisTick = chartAxisTick(isDarkTheme, 10);
  const hasAnyValue = data.some((d) => (d.planned || 0) > 0 || (d.actual || 0) > 0);

  if (data.length === 0 || !hasAnyValue) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-sm font-medium ${ex.emptyState} ${
          isDarkTheme ? 'border-white/10' : 'border-slate-200'
        }`}
        style={{ height: HISTOGRAM_PLOT_HEIGHT }}
      >
        <Users size={18} className="opacity-50" />
        <span>No manpower planned/actual data yet</span>
      </div>
    );
  }

  return (
    <ExecutiveChartWithLegend
      height={HISTOGRAM_PLOT_HEIGHT}
      legend={[
        { label: 'Planned', color: PLANNED_COLOR },
        { label: 'Actual', color: ACTUAL_COLOR },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartBarPlotMarginExecutive} barCategoryGap="18%" barGap={3}>
          <defs>
            <linearGradient id="execPlannedBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PLANNED_COLOR} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="execActualBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACTUAL_COLOR} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
          <XAxis
            dataKey="month"
            tick={axisTick}
            axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
            tickLine={false}
            {...chartXAxisMonthPropsExecutive}
          />
          <YAxis
            width={36}
            tick={axisTick}
            tickFormatter={formatChartCountAxisTick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
          <Bar dataKey="planned" fill="url(#execPlannedBar)" radius={[4, 4, 0, 0]} maxBarSize={20} name="Planned" />
          <Bar dataKey="actual" fill="url(#execActualBar)" radius={[4, 4, 0, 0]} maxBarSize={20} name="Actual" />
        </BarChart>
      </ResponsiveContainer>
    </ExecutiveChartWithLegend>
  );
};

export interface PMCHeadPeopleSectionProps {
  isDarkTheme: boolean;
  manpowerData: { month: string; planned: number; actual: number }[];
  manpowerDonutData: { name: string; value: number; color: string }[];
  projectName?: string;
  projectId?: string;
  currentUser?: { role?: string };
  onNavigate?: (tab: string) => void;
  onManpowerEdit?: () => void;
  machineryLogRef?: React.RefObject<HTMLDivElement | null>;
  projectEquipmentRef?: React.RefObject<HTMLDivElement | null>;
  equipmentRecords: ProjectEquipmentRecord[];
  isLoadingEquipment: boolean;
  equipmentError?: string | null;
  equipmentFormError?: string | null;
  isSavingEquipment?: boolean;
  onRefreshEquipment: () => void;
  onSaveEquipment: (
    values: import('../ProjectEquipmentCard').EquipmentFormValues,
    record?: ProjectEquipmentRecord | null,
  ) => Promise<boolean> | boolean;
  onDeleteEquipment: (record: ProjectEquipmentRecord) => Promise<boolean> | boolean;
}

const PMCHeadPeopleSection: React.FC<PMCHeadPeopleSectionProps> = ({
  isDarkTheme,
  manpowerData,
  manpowerDonutData,
  projectName,
  projectId,
  currentUser,
  onNavigate,
  machineryLogRef,
  projectEquipmentRef,
  equipmentRecords,
  isLoadingEquipment,
  equipmentError,
  equipmentFormError,
  isSavingEquipment,
  onRefreshEquipment,
  onSaveEquipment,
  onDeleteEquipment,
}) => {
  const ex = usePmcExecutiveTheme();

  const manpowerLatest = useMemo(() => {
    if (!manpowerData.length) return null;
    const last = manpowerData[manpowerData.length - 1];
    const planned = Number(last.planned) || 0;
    const actual = Number(last.actual) || 0;
    return {
      month: last.month,
      planned,
      actual,
      variance: actual - planned,
    };
  }, [manpowerData]);

  const manpowerTotals = useMemo(() => {
    if (!manpowerData.length) return null;
    return manpowerData.reduce(
      (acc, row) => ({
        planned: acc.planned + (Number(row.planned) || 0),
        actual: acc.actual + (Number(row.actual) || 0),
      }),
      { planned: 0, actual: 0 },
    );
  }, [manpowerData]);

  const equipmentSummaryRows = useMemo(() => {
    const sorted = [...equipmentRecords].sort((a, b) =>
      String(a.equipmentMonth).localeCompare(String(b.equipmentMonth)),
    );
    return sorted.map((row) => ({
      id: String(row.id ?? row.equipmentMonth),
      label: formatEquipmentMonthLabel(row.equipmentMonth),
      planned: Number(row.plannedEquipment) || 0,
      actual: Number(row.actualEquipment) || 0,
      variance: equipmentVariance(row),
    }));
  }, [equipmentRecords]);

  const equipmentTotals = useMemo(() => {
    if (equipmentSummaryRows.length === 0) return null;
    return equipmentSummaryRows.reduce(
      (acc, row) => ({
        planned: acc.planned + row.planned,
        actual: acc.actual + row.actual,
        variance: acc.variance + row.variance,
      }),
      { planned: 0, actual: 0, variance: 0 },
    );
  }, [equipmentSummaryRows]);

  return (
    <div className="space-y-4">
      {/* Section intro */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
          isDarkTheme
            ? 'border-white/10 bg-gradient-to-r from-[#0b1d36] to-[#0f2744]'
            : 'border-slate-200 bg-gradient-to-r from-white to-slate-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
              isDarkTheme ? 'bg-cyan-500/15 text-cyan-300' : 'bg-sky-50 text-sky-700'
            }`}
          >
            <HardHat size={18} strokeWidth={2} />
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${ex.muted}`}>People & Site</p>
            <p className={`text-sm font-black ${ex.heading}`}>Workforce · machinery · equipment</p>
            <p className={`mt-0.5 text-[11px] font-medium ${ex.muted}`}>
              {projectName || 'Selected project'} · live backend data only
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              isDarkTheme ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-600'
            }`}
          >
            <Users size={12} />
            {manpowerData.length} manpower month{manpowerData.length === 1 ? '' : 's'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              isDarkTheme ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-600'
            }`}
          >
            <Wrench size={12} />
            {equipmentRecords.length} equipment record{equipmentRecords.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Manpower row */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
        <PMCExecutivePanel
          title="Project Manpower Histogram"
          subtitle="Planned vs actual headcount by month"
          className="min-w-0"
          headerRight={
            <SectionHint
              isDark={isDarkTheme}
              title="Manpower histogram"
              points={[
                'Orange = Planned headcount from Manpower Management.',
                'Blue = Actual headcount logged for that month.',
                'Only months returned by /manpower/ are shown.',
              ]}
            />
          }
        >
          <div className="space-y-3 px-3 pb-3 pt-2 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${ex.label}`}
              >
                <TrendingUp size={13} className={isDarkTheme ? 'text-sky-400' : 'text-sky-600'} />
                Workforce trend
                {manpowerLatest ? ` · ${manpowerLatest.month}` : ''}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <StatChip
                  label="Latest planned"
                  value={manpowerLatest ? manpowerLatest.planned : '—'}
                  tone="planned"
                  isDark={isDarkTheme}
                />
                <StatChip
                  label="Latest actual"
                  value={manpowerLatest ? manpowerLatest.actual : '—'}
                  tone="actual"
                  isDark={isDarkTheme}
                />
                <StatChip
                  label="Variance"
                  value={
                    manpowerLatest
                      ? manpowerLatest.variance > 0
                        ? `+${manpowerLatest.variance}`
                        : manpowerLatest.variance
                      : '—'
                  }
                  tone={
                    !manpowerLatest
                      ? 'neutral'
                      : manpowerLatest.variance > 0
                        ? 'up'
                        : manpowerLatest.variance < 0
                          ? 'down'
                          : 'neutral'
                  }
                  isDark={isDarkTheme}
                />
              </div>
            </div>
            <ManpowerHistogramCompact isDarkTheme={isDarkTheme} data={manpowerData} />
            {manpowerTotals && (
              <p className={`text-[10px] font-semibold ${ex.muted}`}>
                Period totals · Planned {manpowerTotals.planned.toLocaleString()} · Actual{' '}
                {manpowerTotals.actual.toLocaleString()}
              </p>
            )}
          </div>
        </PMCExecutivePanel>

        <div className={ex.panel}>
          <div className={`${ex.panelHeader} flex items-start justify-between gap-2`}>
            <div>
              <h3 className={ex.panelTitle}>Manpower Mix</h3>
              <p className={ex.panelSubtitle}>Distribution snapshot</p>
            </div>
            <SectionHint
              isDark={isDarkTheme}
              title="Manpower mix"
              points={[
                'Donut slices come from the same manpower dataset used for the histogram.',
                'Shows share of categories in the latest available distribution.',
              ]}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            <MiniDonut title="Total Manpower" data={manpowerDonutData} isDark={isDarkTheme} />
            <MiniDonut title="Direct & Indirect" data={manpowerDonutData} isDark={isDarkTheme} />
            <MiniDonut title="TCC Manpower" data={manpowerDonutData} isDark={isDarkTheme} />
          </div>
        </div>
      </div>

      {/* Equipment summary */}
      <PMCExecutivePanel
        title="Project Equipment Summary"
        subtitle="Monthly planned · actual · variance from /project-equipment/"
        className="overflow-hidden"
        headerRight={
          <SectionHint
            isDark={isDarkTheme}
            title="Equipment summary"
            points={[
              'Rows come only from monthly Project Equipment entries.',
              'Variance = Actual − Planned.',
              'Empty means no monthly equipment records exist yet for this project.',
            ]}
          />
        }
      >
        {equipmentTotals && (
          <div className="flex flex-wrap gap-2 border-b px-4 py-3 sm:px-5" style={{ borderColor: isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }}>
            <StatChip label="Months" value={equipmentSummaryRows.length} isDark={isDarkTheme} />
            <StatChip label="Planned total" value={equipmentTotals.planned} tone="planned" isDark={isDarkTheme} />
            <StatChip label="Actual total" value={equipmentTotals.actual} tone="actual" isDark={isDarkTheme} />
            <StatChip
              label="Net variance"
              value={equipmentTotals.variance > 0 ? `+${equipmentTotals.variance}` : equipmentTotals.variance}
              tone={
                equipmentTotals.variance > 0 ? 'up' : equipmentTotals.variance < 0 ? 'down' : 'neutral'
              }
              isDark={isDarkTheme}
            />
          </div>
        )}

        {isLoadingEquipment ? (
          <p className={`px-4 py-8 text-center text-xs font-semibold ${ex.muted}`}>Loading equipment…</p>
        ) : equipmentSummaryRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                isDarkTheme ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Wrench size={20} />
            </div>
            <p className={`text-xs font-bold ${ex.heading}`}>No equipment records yet</p>
            <p className={`max-w-md text-[11px] font-medium ${ex.muted}`}>
              Backend has no monthly `/project-equipment/` rows for this project.
              Use <strong>Add</strong> in Project Equipment below to create the first entry.
              {equipmentError ? ` (${equipmentError})` : ''}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className={ex.tableHeader}>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide">Month</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide">Planned</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide">Actual</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide">Variance</th>
                </tr>
              </thead>
              <tbody>
                {equipmentSummaryRows.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? ex.tableRowEven : ex.tableRowOdd}>
                    <td className={`px-4 py-2.5 font-bold ${ex.tableCell}`}>{row.label}</td>
                    <td className={`px-4 py-2.5 text-center tabular-nums ${ex.tableCell}`}>{row.planned}</td>
                    <td className={`px-4 py-2.5 text-center tabular-nums ${ex.tableCell}`}>{row.actual}</td>
                    <td
                      className={`px-4 py-2.5 text-center font-bold tabular-nums ${
                        row.variance > 0
                          ? 'text-emerald-500'
                          : row.variance < 0
                            ? 'text-rose-500'
                            : ex.tableCellMuted
                      }`}
                    >
                      {row.variance > 0 ? `+${row.variance}` : row.variance}
                    </td>
                  </tr>
                ))}
                {equipmentTotals && (
                  <tr className={ex.tableHeader}>
                    <td className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wide">Total</td>
                    <td className="px-4 py-2.5 text-center text-[11px] font-black tabular-nums">
                      {equipmentTotals.planned}
                    </td>
                    <td className="px-4 py-2.5 text-center text-[11px] font-black tabular-nums">
                      {equipmentTotals.actual}
                    </td>
                    <td className="px-4 py-2.5 text-center text-[11px] font-black tabular-nums">
                      {equipmentTotals.variance > 0
                        ? `+${equipmentTotals.variance}`
                        : equipmentTotals.variance}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PMCExecutivePanel>

      {/* Daily ops */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <div
          ref={machineryLogRef}
          id="site-machinery-log"
          className={`machinery-log-card joyride-target-stable min-h-[280px] ${compactSitePanelClass(isDarkTheme)}`}
        >
          <MachinerySubmissionsTL
            projectName={projectName}
            projectId={projectId}
            currentUser={currentUser}
            onNavigate={onNavigate}
          />
        </div>

        <div
          ref={projectEquipmentRef}
          id="project-equipment"
          className={`project-equipment-card joyride-target-stable min-h-[280px] ${compactSitePanelClass(isDarkTheme)}`}
        >
          <ProjectEquipmentCard
            projectName={projectName}
            records={equipmentRecords}
            isLoading={isLoadingEquipment}
            error={equipmentError}
            formError={equipmentFormError}
            isSaving={isSavingEquipment}
            onRefresh={onRefreshEquipment}
            onSave={onSaveEquipment}
            onDelete={onDeleteEquipment}
          />
        </div>
      </div>
    </div>
  );
};

export default PMCHeadPeopleSection;
