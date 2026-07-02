import React from 'react';
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
import { ExternalLink, Users } from 'lucide-react';
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

const HISTOGRAM_PLOT_HEIGHT = 210;
const DONUT_SIZE = 68;

const EQUIPMENT_ROWS = ['Thabat', 'Supplier', 'Subcon', 'Total'] as const;

const compactSitePanelClass = (isDark: boolean) => [
  'pmc-people-site-panel',
  '[&_.dashboard-card-top-accent]:hidden',
  '[&>div]:!min-h-0',
  '[&>div]:h-full',
  '[&>div]:!rounded-xl',
  isDark ? '[&>div]:!border-white/10' : '[&>div]:!border-slate-200/80',
  '[&>div]:!shadow-none',
  '[&_h3]:!text-xs',
  '[&_h3]:!font-black',
  '[&_h3]:!tracking-wide',
  '[&_h3]:sm:!text-sm',
  '[&_.mb-3]:!mb-2',
  '[&_.pb-3]:!pb-2',
  '[&_.p-3]:!p-2.5',
  '[&_.sm\\:p-4]:sm:!p-3',
  '[&_.min-h-\\[240px\\]]:!min-h-[140px]',
  '[&_.min-h-\\[4\\.5rem\\]]:!min-h-[3.25rem]',
  '[&_.min-h-\\[160px\\]]:!min-h-[110px]',
  '[&_.sm\\:min-h-\\[190px\\]]:sm:!min-h-[120px]',
  '[&_.mb-2\\.5]:!mb-2',
  '[&_.gap-3]:!gap-2',
].join(' ');

const MiniDonut: React.FC<{
  title: string;
  data: { name: string; value: number; color: string }[];
  isDark: boolean;
}> = ({ title, data, isDark }) => {
  const ex = getPmcExecutiveTheme(isDark);
  return (
  <div className={ex.miniDonut}>
    <p className={`mb-1 line-clamp-2 min-h-[2rem] text-center text-[9px] font-bold uppercase leading-tight tracking-wide sm:text-[10px] ${ex.label}`}>
      {title}
    </p>
    <ResponsiveContainer width={DONUT_SIZE} height={DONUT_SIZE}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={DONUT_SIZE * 0.36}
          outerRadius={DONUT_SIZE * 0.48}
          dataKey="value"
          startAngle={90}
          endAngle={-270}
          stroke="none"
        >
          {data.map((entry, index) => (
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
    <p className={`mt-0.5 text-[10px] font-bold tabular-nums ${ex.slateValue}`}>
      {data.reduce((s, d) => s + d.value, 0)}%
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

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm font-medium ${ex.emptyState}`}
        style={{ height: HISTOGRAM_PLOT_HEIGHT }}
      >
        No manpower data available
      </div>
    );
  }

  return (
    <ExecutiveChartWithLegend
      height={HISTOGRAM_PLOT_HEIGHT}
      legend={[
        { label: 'Planned', color: '#f59e0b' },
        { label: 'Actual', color: '#eab308' },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={chartBarPlotMarginExecutive}
          barCategoryGap="18%"
          barGap={4}
        >
          <defs>
            <linearGradient id="execPlannedBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.65} />
            </linearGradient>
            <linearGradient id="execActualBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#fde047" stopOpacity={0.65} />
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
          <Bar
            dataKey="planned"
            fill="url(#execPlannedBar)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
            name="Planned"
          />
          <Bar
            dataKey="actual"
            fill="url(#execActualBar)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
            name="Actual"
          />
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
  onManpowerEdit,
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

  return (
  <div className="space-y-3">
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px] 2xl:grid-cols-[minmax(0,1fr)_272px]">
      <PMCExecutivePanel
        title="Project Manpower Histogram"
        subtitle="Planned vs actual headcount by month"
        className="min-w-0"
      >
        <div className="px-3 pb-3 pt-2 sm:px-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${ex.label}`}>
              <Users size={13} className={ex.isDark ? 'text-blue-400' : 'text-[#1e3a5f]'} />
              Workforce trend
            </span>
            {onManpowerEdit && (
              <button
                type="button"
                onClick={onManpowerEdit}
                className={ex.editBtn}
              >
                Edit
                <ExternalLink size={11} />
              </button>
            )}
          </div>
          <ManpowerHistogramCompact isDarkTheme={isDarkTheme} data={manpowerData} />
        </div>
      </PMCExecutivePanel>

      <div className={ex.panel}>
        <div className={ex.panelHeader}>
          <h3 className={ex.panelTitle}>Manpower Mix</h3>
          <p className={ex.panelSubtitle}>Distribution snapshot</p>
        </div>
        <div className="grid grid-cols-3 gap-2 p-2.5 sm:p-3">
          <MiniDonut title="Total Manpower" data={manpowerDonutData} isDark={ex.isDark} />
          <MiniDonut title="Direct & Indirect" data={manpowerDonutData} isDark={ex.isDark} />
          <MiniDonut title="TCC Manpower" data={manpowerDonutData} isDark={ex.isDark} />
        </div>
      </div>
    </div>

    <PMCExecutivePanel
      title="Project Equipment Summary"
      subtitle="Planned · actual · variance by source"
      className="overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-xs sm:text-sm">
          <thead>
            <tr className={ex.tableHeader}>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide sm:px-4">
                Source
              </th>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide sm:px-4">
                Planned
              </th>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide sm:px-4">
                Actual
              </th>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide sm:px-4">
                Variance
              </th>
            </tr>
          </thead>
          <tbody>
            {EQUIPMENT_ROWS.map((row, index) => (
              <tr
                key={row}
                className={index % 2 === 0 ? ex.tableRowEven : ex.tableRowOdd}
              >
                <td className={`px-3 py-2 font-bold sm:px-4 ${ex.tableCell}`}>{row}</td>
                <td className={`px-3 py-2 text-center sm:px-4 ${ex.tableCellMuted}`}>—</td>
                <td className={`px-3 py-2 text-center sm:px-4 ${ex.tableCellMuted}`}>—</td>
                <td className={`px-3 py-2 text-center sm:px-4 ${ex.tableCellMuted}`}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PMCExecutivePanel>

    <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
      <div
        ref={machineryLogRef}
        id="site-machinery-log"
        className={`machinery-log-card joyride-target-stable min-h-0 ${compactSitePanelClass(ex.isDark)}`}
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
        className={`project-equipment-card joyride-target-stable min-h-0 ${compactSitePanelClass(ex.isDark)}`}
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
