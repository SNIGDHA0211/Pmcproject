import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CorrespondenceMonthlyPeriod } from '../types';
import { buildCorrespondenceTrendData } from '../utils/correspondence';
import { getThemeClasses, useTheme } from '../utils/theme';

interface CorrespondenceTrendChartProps {
  periods: CorrespondenceMonthlyPeriod[];
  year: number;
}

const CorrespondenceTrendChart: React.FC<CorrespondenceTrendChartProps> = ({ periods, year }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const trendData = useMemo(() => buildCorrespondenceTrendData(periods), [periods]);

  return (
    <div className={`rounded-xl border p-3 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
      <h4 className={`mb-2 text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
        Correspondence Trend ({year})
      </h4>

      {trendData.length === 0 ? (
        <div
          className={`flex min-h-[200px] items-center justify-center rounded-lg border border-dashed px-3 text-center ${themeClasses.border}`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
            No correspondence trend data for {year}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
            <XAxis
              dataKey="label"
              tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 9 }}
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
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Line type="monotone" dataKey="clientReceived" name="Client Received" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="clientDelivered" name="Client Delivered" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="contractorReceived" name="Contractor Received" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
            <Line
              type="monotone"
              dataKey="contractorDelivered"
              name="Contractor Delivered"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default React.memo(CorrespondenceTrendChart);
