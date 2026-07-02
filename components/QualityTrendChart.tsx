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
import type { ProjectQualityStatusRecord } from '../types';
import { buildQualityMonthlyTrendData } from '../utils/qualityStatus';
import { getThemeClasses, useTheme } from '../utils/theme';

interface QualityTrendChartProps {
  records: ProjectQualityStatusRecord[];
  year: number;
}

const QualityTrendChart: React.FC<QualityTrendChartProps> = ({ records, year }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const trendData = useMemo(() => buildQualityMonthlyTrendData(records, year), [records, year]);

  return (
    <div className={`rounded-xl border p-3 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
      <h4 className={`mb-2 text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
        Overall Trend ({year})
      </h4>

      {trendData.length === 0 ? (
        <div
          className={`flex min-h-[190px] items-center justify-center rounded-lg border border-dashed px-3 text-center ${themeClasses.border}`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textMuted}`}>
            No overall trend data for {year}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={190}>
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
                color: isDarkTheme ? '#fff' : '#000',
                fontSize: 11,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="testsRequired"
              name="Tests Required"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="testsConducted"
              name="Tests Conducted"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default React.memo(QualityTrendChart);
