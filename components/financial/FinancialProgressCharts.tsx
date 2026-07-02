import React from 'react';
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

export type ProgressTrendRow = {
  month: string;
  monthlyPlanned: number;
  monthlyActual: number;
  cumulativePlanned: number;
  cumulativeActual: number;
};

interface FinancialProgressChartsProps {
  data: ProgressTrendRow[];
  loading: boolean;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}

const ChartCard: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}> = ({ title, children, className = '', isDarkTheme, themeClasses }) => (
  <div
    className={`financial-progress-chart progress-chart rounded-2xl border p-4 ${className} ${
      isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-[#E2E8F0] bg-white'
    }`}
  >
    <h4 className={`mb-3 text-xs font-semibold uppercase tracking-wide ${isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'}`}>
      {title}
    </h4>
    <div className="h-56">{children}</div>
  </div>
);

const FinancialProgressCharts: React.FC<FinancialProgressChartsProps> = ({
  data,
  loading,
  isDarkTheme,
  themeClasses,
}) => {
  const empty = (
    <div className={`flex h-full items-center justify-center text-xs font-medium ${themeClasses.textMuted}`}>
      No progress history for this project yet.
    </div>
  );

  const loadingEl = (
    <div className="flex h-full items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard
        title="Monthly Plan vs Actual Trend"
        className="financial-monthly-trend-chart"
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      >
        {loading ? (
          loadingEl
        ) : data.length === 0 ? (
          empty
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? '#334155' : '#E2E8F0'} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="monthlyPlanned" name="Plan" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="monthlyActual" name="Actual" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        title="Cumulative Plan vs Actual Trend"
        className="financial-cumulative-trend-chart"
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      >
        {loading ? (
          loadingEl
        ) : data.length === 0 ? (
          empty
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? '#334155' : '#E2E8F0'} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulativePlanned"
                name="Cum. Plan"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cumulativeActual"
                name="Cum. Actual"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
};

export default FinancialProgressCharts;
