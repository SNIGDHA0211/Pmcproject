import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getThemeClasses, useTheme } from '../utils/theme';

interface DrawingApprovalChartProps {
  submitted: number;
  approved: number;
  variance: number;
}

const BAR_COLORS = {
  submitted: '#3b82f6',
  approved: '#22c55e',
  variance: '#f97316',
} as const;

const DrawingApprovalChart: React.FC<DrawingApprovalChartProps> = ({ submitted, approved, variance }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const data = useMemo(
    () => [
      { name: 'Submitted', value: submitted, key: 'submitted' as const },
      { name: 'Approved', value: approved, key: 'approved' as const },
      { name: 'Variance', value: variance, key: 'variance' as const },
    ],
    [submitted, approved, variance]
  );

  return (
    <div
      className={`rounded-xl border p-4 ${
        isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <h4 className={`mb-3 text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
        Drawing Approval Status
      </h4>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
          <XAxis
            type="number"
            tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 9 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 9 }}
          />
          <Tooltip
            contentStyle={{
              background: isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: '0.5rem',
              fontSize: 11,
            }}
          />
          <Bar dataKey="value" barSize={14} radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={BAR_COLORS[entry.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(DrawingApprovalChart);
