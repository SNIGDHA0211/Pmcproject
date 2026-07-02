import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HSERecord } from '../services/api';
import {
  buildHealthSafetyLineTrendData,
  buildHealthSafetyYearlyLineTrendData,
  buildMonthlyTrendData,
  buildYearlyTrendData,
  type HealthSafetyTrendPoint,
} from '../utils/healthSafety';
import { getThemeClasses, useTheme } from '../utils/theme';

type TrendView = 'monthly' | 'yearly';

interface HealthSafetyTrendChartProps {
  records: HSERecord[];
  year: number;
  variant?: 'stacked' | 'lines';
}

const LINE_SERIES = [
  { key: 'fatalities', name: 'Fatalities', color: '#e11d48' },
  { key: 'significant', name: 'Significant', color: '#f97316' },
  { key: 'major', name: 'Major', color: '#eab308' },
  { key: 'minor', name: 'Minor', color: '#facc15' },
  { key: 'nearMiss', name: 'Near Miss', color: '#22c55e' },
] as const;

const HealthSafetyTrendChart: React.FC<HealthSafetyTrendChartProps> = ({
  records,
  year,
  variant = 'stacked',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [view, setView] = useState<TrendView>('monthly');

  const monthlyBarData = useMemo(() => buildMonthlyTrendData(records, year), [records, year]);
  const monthlyLineData = useMemo(() => buildHealthSafetyLineTrendData(records, year), [records, year]);
  const yearlyBarData = useMemo(() => buildYearlyTrendData(records), [records]);
  const yearlyLineData = useMemo(() => buildHealthSafetyYearlyLineTrendData(records), [records]);

  const barData = view === 'monthly' ? monthlyBarData : yearlyBarData;
  const lineData = view === 'monthly' ? monthlyLineData : yearlyLineData;
  const title = view === 'monthly' ? `Monthly Trend (${year})` : 'Yearly Trend';

  const hasLinePoints = (point: { fatalities: number; significant: number; major: number; minor: number; nearMiss: number }) =>
    point.fatalities + point.significant + point.major + point.minor + point.nearMiss > 0;
  const hasBarPoints = (point: { nearMiss: number; major: number; minor: number }) =>
    point.nearMiss + point.major + point.minor > 0;

  const isEmpty =
    variant === 'lines'
      ? view === 'monthly'
        ? !lineData.some(hasLinePoints)
        : lineData.length === 0
      : view === 'monthly'
        ? !barData.some(hasBarPoints)
        : barData.length === 0;

  return (
    <div className={`rounded-xl border p-4 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>{title}</h4>
        <div className={`inline-flex rounded-lg border p-0.5 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-100'}`}>
          {([
            ['monthly', 'Monthly'],
            ['yearly', 'Yearly'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`rounded-md px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
                view === value ? 'bg-blue-600 text-white' : themeClasses.textSecondary
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className={`flex min-h-[220px] items-center justify-center rounded-lg border border-dashed px-3 text-center ${themeClasses.border}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
            {view === 'monthly' ? `No monthly trend data for ${year}` : 'No yearly trend data available'}
          </p>
        </div>
      ) : variant === 'lines' ? (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={lineData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 9 }}
            />
            <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: '0.5rem',
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {LINE_SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.name}
                stroke={series.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={barData as HealthSafetyTrendPoint[]} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 8 }}
            />
            <YAxis tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 9 }} />
            <Tooltip
              contentStyle={{
                background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: '0.5rem',
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="nearMiss" name="Near Miss" stackId="incidents" fill="#22c55e" />
            <Bar dataKey="major" name="Major" stackId="incidents" fill="#f97316" />
            <Bar dataKey="minor" name="Minor" stackId="incidents" fill="#facc15" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default React.memo(HealthSafetyTrendChart);
