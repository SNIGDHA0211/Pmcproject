import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PvaRecord, PvaTrendPoint } from '../../types/plannedVsActual';
import {
  chartAxisTick,
  chartGridStroke,
  chartTooltipStyle,
  formatChartCurrencyAxisTick,
} from '../../utils/dashboardCharts';
import { getThemeClasses, useTheme } from '../../utils/theme';

const COLORS = {
  planned: '#6366f1',
  actual: '#0ea5e9',
  collection: '#10b981',
  difference: '#f59e0b',
  scl: '#6366f1',
  contractor: '#f59e0b',
};

interface PvaChartsProps {
  scl: PvaRecord | null;
  contractorSummary: PvaRecord | null;
  selectedContractor: PvaRecord | null;
  trend: PvaTrendPoint[];
  isLoadingTrend?: boolean;
}

const RadialGauge: React.FC<{
  label: string;
  value: number;
  color: string;
  isDark: boolean;
}> = ({ label, value, color, isDark }) => {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const track = isDark ? '#1e293b' : '#e8edf4';
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[88px] w-[88px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: 'v', value: pct || 0.01, fill: color },
                { name: 'g', value: Math.max(0, 100 - pct), fill: track },
              ]}
              dataKey="value"
              innerRadius={28}
              outerRadius={40}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
      <p className={`mt-1 text-center text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
      </p>
    </div>
  );
};

const ChartCard: React.FC<{ title: string; children: React.ReactNode; isDark: boolean }> = ({
  title,
  children,
  isDark,
}) => (
  <div
    className={`rounded-2xl border p-3 sm:p-4 ${
      isDark ? 'border-white/10 bg-[#0b1d36]/80' : 'border-slate-200 bg-white shadow-sm'
    }`}
  >
    <h3 className={`mb-3 text-[11px] font-black uppercase tracking-wide ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
      {title}
    </h3>
    {children}
  </div>
);

const PvaCharts: React.FC<PvaChartsProps> = ({
  scl,
  contractorSummary,
  selectedContractor,
  trend,
  isLoadingTrend = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [visibleSeries, setVisibleSeries] = useState({
    sclPlanned: true,
    sclActual: true,
    contractorPlanned: true,
    contractorActual: true,
    contractorCollection: true,
  });

  const compareBars = useMemo(() => {
    const rows: Array<{
      name: string;
      planned: number;
      actual: number;
      collection: number;
      difference: number;
    }> = [];
    if (scl) {
      rows.push({
        name: 'SCL',
        planned: scl.plannedValue,
        actual: scl.actualValue,
        collection: scl.collection,
        difference: scl.difference,
      });
    }
    if (contractorSummary) {
      rows.push({
        name: 'Contractor Summary',
        planned: contractorSummary.plannedValue,
        actual: contractorSummary.actualValue,
        collection: contractorSummary.collection,
        difference: contractorSummary.difference,
      });
    }
    if (selectedContractor) {
      rows.push({
        name: selectedContractor.contractorName || 'Selected',
        planned: selectedContractor.plannedValue,
        actual: selectedContractor.actualValue,
        collection: selectedContractor.collection,
        difference: selectedContractor.difference,
      });
    }
    return rows;
  }, [scl, contractorSummary, selectedContractor]);

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="space-y-3">
      <h2 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
        Graphical Analytics
      </h2>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard title="Planned · Actual · Collection" isDark={isDarkTheme}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
                <XAxis dataKey="name" tick={chartAxisTick(isDarkTheme, 10)} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick(isDarkTheme, 10)} axisLine={false} tickLine={false} tickFormatter={formatChartCurrencyAxisTick} width={48} />
                <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
                <Legend />
                <Bar dataKey="planned" name="Planned" fill={COLORS.planned} radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill={COLORS.actual} radius={[4, 4, 0, 0]} />
                <Bar dataKey="collection" name="Collection" fill={COLORS.collection} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Variance Analysis (Difference)" isDark={isDarkTheme}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareBars} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(isDarkTheme)} horizontal={false} />
                <XAxis type="number" tick={chartAxisTick(isDarkTheme, 10)} tickFormatter={formatChartCurrencyAxisTick} />
                <YAxis type="category" dataKey="name" width={110} tick={chartAxisTick(isDarkTheme, 10)} />
                <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
                <Bar dataKey="difference" name="Difference" radius={[0, 4, 4, 0]}>
                  {compareBars.map((row) => (
                    <Cell
                      key={row.name}
                      fill={row.difference === 0 ? COLORS.collection : COLORS.difference}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChartCard title="Achievement %" isDark={isDarkTheme}>
          <div className="flex flex-wrap items-center justify-around gap-4 py-2">
            {scl && (
              <RadialGauge label="SCL" value={scl.achievementPct} color={COLORS.scl} isDark={isDarkTheme} />
            )}
            {contractorSummary && (
              <RadialGauge
                label="Contractor Summary"
                value={contractorSummary.achievementPct}
                color={COLORS.contractor}
                isDark={isDarkTheme}
              />
            )}
            {selectedContractor && (
              <RadialGauge
                label={selectedContractor.contractorName || 'Selected'}
                value={selectedContractor.achievementPct}
                color={COLORS.collection}
                isDark={isDarkTheme}
              />
            )}
            {!scl && !contractorSummary && !selectedContractor && (
              <p className={`text-sm ${themeClasses.textMuted}`}>No achievement data</p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Collection %" isDark={isDarkTheme}>
          <div className="flex flex-wrap items-center justify-around gap-4 py-2">
            {scl && (
              <RadialGauge label="SCL" value={scl.collectionPct} color={COLORS.scl} isDark={isDarkTheme} />
            )}
            {contractorSummary && (
              <RadialGauge
                label="Contractor Summary"
                value={contractorSummary.collectionPct}
                color={COLORS.contractor}
                isDark={isDarkTheme}
              />
            )}
            {selectedContractor && (
              <RadialGauge
                label={selectedContractor.contractorName || 'Selected'}
                value={selectedContractor.collectionPct}
                color={COLORS.collection}
                isDark={isDarkTheme}
              />
            )}
            {!scl && !contractorSummary && !selectedContractor && (
              <p className={`text-sm ${themeClasses.textMuted}`}>No collection data</p>
            )}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Monthly Trend" isDark={isDarkTheme}>
        <div className="mb-2 flex flex-wrap gap-2">
          {(
            [
              ['sclPlanned', 'SCL Planned', COLORS.scl],
              ['sclActual', 'SCL Actual', '#38bdf8'],
              ['contractorPlanned', 'Contractor Planned', COLORS.contractor],
              ['contractorActual', 'Contractor Actual', '#fb923c'],
              ['contractorCollection', 'Contractor Collection', COLORS.collection],
            ] as const
          ).map(([key, label, color]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSeries(key)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                visibleSeries[key]
                  ? 'text-white'
                  : isDarkTheme
                    ? 'bg-white/10 text-slate-400'
                    : 'bg-slate-100 text-slate-500'
              }`}
              style={visibleSeries[key] ? { backgroundColor: color } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-[240px]">
          {isLoadingTrend ? (
            <div className={`h-full animate-pulse rounded-xl ${themeClasses.bgSecondary}`} />
          ) : trend.length === 0 ? (
            <p className={`flex h-full items-center justify-center text-sm ${themeClasses.textMuted}`}>
              No trend data for this year
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
                <XAxis dataKey="monthLabel" tick={chartAxisTick(isDarkTheme, 10)} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick(isDarkTheme, 10)} tickFormatter={formatChartCurrencyAxisTick} width={48} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
                {visibleSeries.sclPlanned && (
                  <Line type="monotone" dataKey="sclPlanned" name="SCL Planned" stroke={COLORS.scl} strokeWidth={2} dot={false} />
                )}
                {visibleSeries.sclActual && (
                  <Line type="monotone" dataKey="sclActual" name="SCL Actual" stroke="#38bdf8" strokeWidth={2} dot={false} />
                )}
                {visibleSeries.contractorPlanned && (
                  <Line type="monotone" dataKey="contractorPlanned" name="Contractor Planned" stroke={COLORS.contractor} strokeWidth={2} dot={false} />
                )}
                {visibleSeries.contractorActual && (
                  <Line type="monotone" dataKey="contractorActual" name="Contractor Actual" stroke="#fb923c" strokeWidth={2} dot={false} />
                )}
                {visibleSeries.contractorCollection && (
                  <Line type="monotone" dataKey="contractorCollection" name="Contractor Collection" stroke={COLORS.collection} strokeWidth={2} strokeDasharray="5 4" dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard title="Variance Trend %" isDark={isDarkTheme}>
          <div className="h-[220px]">
            {trend.length === 0 ? (
              <p className={`flex h-full items-center justify-center text-sm ${themeClasses.textMuted}`}>
                No variance trend
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
                  <XAxis dataKey="monthLabel" tick={chartAxisTick(isDarkTheme, 10)} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick(isDarkTheme, 10)} width={36} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
                  <Legend />
                  <Line type="monotone" dataKey="sclVariancePct" name="SCL Variance %" stroke={COLORS.scl} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="contractorVariancePct" name="Contractor Variance %" stroke={COLORS.contractor} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Monthly Stacked Comparison" isDark={isDarkTheme}>
          <div className="h-[220px]">
            {trend.length === 0 ? (
              <p className={`flex h-full items-center justify-center text-sm ${themeClasses.textMuted}`}>
                No monthly stack data
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
                  <XAxis dataKey="monthLabel" tick={chartAxisTick(isDarkTheme, 10)} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisTick(isDarkTheme, 10)} tickFormatter={formatChartCurrencyAxisTick} width={48} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
                  <Legend />
                  <Bar dataKey="contractorPlanned" stackId="a" name="Planned" fill={COLORS.planned} />
                  <Bar dataKey="contractorActual" stackId="a" name="Actual" fill={COLORS.actual} />
                  <Bar dataKey="contractorCollection" stackId="a" name="Collection" fill={COLORS.collection} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>
    </section>
  );
};

export default React.memo(PvaCharts);
