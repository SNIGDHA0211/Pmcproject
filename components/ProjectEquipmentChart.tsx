import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HardHat } from 'lucide-react';
import { getThemeClasses, useTheme } from '../utils/theme';

interface EquipmentData {
  month: string;
  plannedMonthly: number;
  actualMonthly: number;
  plannedCumulative: number;
  actualCumulative: number;
}

interface ProjectEquipmentChartProps {
  data: EquipmentData[];
  /** When true, renders chart only (no outer card/header) for use inside themed parent cards */
  embedded?: boolean;
}

const ProjectEquipmentChart: React.FC<ProjectEquipmentChartProps> = ({
  data,
  embedded = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const chartData =
    data && data.length > 0
      ? data
      : [
          {
            month: 'No Data',
            plannedMonthly: 0,
            actualMonthly: 0,
            plannedCumulative: 0,
            actualCumulative: 0,
          },
        ];

  const gridStroke = isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const axisStroke = isDarkTheme ? '#94a3b8' : '#64748b';
  const axisLineStroke = isDarkTheme ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
  const labelFill = isDarkTheme ? '#cbd5e1' : '#64748b';

  const tooltipStyle = {
    backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
    border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
    color: isDarkTheme ? '#f1f5f9' : '#0f172a',
  };

  const chart = (
    <div className={embedded ? 'h-[280px] w-full min-w-0 sm:h-[300px]' : 'h-80'}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis
            dataKey="month"
            stroke={axisStroke}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: axisLineStroke }}
          />
          <YAxis
            stroke={axisStroke}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: axisLineStroke }}
            label={{
              value: 'Equipment Count',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: labelFill, fontSize: 12 },
            }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: isDarkTheme ? '#f1f5f9' : '#0f172a' }}
            itemStyle={{ color: isDarkTheme ? '#e2e8f0' : '#334155' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 16, fontSize: 11 }}
            formatter={(value) => (
              <span style={{ color: isDarkTheme ? '#94a3b8' : '#64748b' }}>{value}</span>
            )}
          />

          <Bar
            dataKey="plannedMonthly"
            name="Planned Monthly"
            fill={isDarkTheme ? '#64748b' : '#9ca3af'}
            radius={[4, 4, 0, 0]}
            barSize={30}
          >
            {chartData.map((entry, index) =>
              entry.plannedMonthly > 0 ? (
                <LabelList
                  key={`planned-label-${index}`}
                  dataKey="plannedMonthly"
                  position="top"
                  style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    fill: isDarkTheme ? '#cbd5e1' : '#4b5563',
                  }}
                />
              ) : null,
            )}
          </Bar>
          <Bar
            dataKey="actualMonthly"
            name="Actual Monthly"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            barSize={30}
          >
            {chartData.map((entry, index) =>
              entry.actualMonthly > 0 ? (
                <LabelList
                  key={`actual-label-${index}`}
                  dataKey="actualMonthly"
                  position="top"
                  style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    fill: isDarkTheme ? '#93c5fd' : '#1d4ed8',
                  }}
                />
              ) : null,
            )}
          </Bar>

          <Line
            type="monotone"
            dataKey="plannedCumulative"
            name="Planned Cumulative"
            stroke={isDarkTheme ? '#94a3b8' : '#4b5563'}
            strokeWidth={3}
            strokeDasharray="5 5"
            dot={{ fill: isDarkTheme ? '#94a3b8' : '#4b5563', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="actualCumulative"
            name="Actual Cumulative"
            stroke="#f97316"
            strokeWidth={3}
            dot={{ fill: '#f97316', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  if (embedded) {
    return chart;
  }

  return (
    <div
      className={`rounded-xl border p-5 ${
        isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border}`
          : 'border-gray-100 bg-white shadow-sm'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${themeClasses.textPrimary}`}>
          PROJECT EQUIPMENT
        </h3>
        <HardHat className={`h-5 w-5 ${isDarkTheme ? 'text-orange-400' : 'text-orange-600'}`} />
      </div>
      {chart}
    </div>
  );
};

export default ProjectEquipmentChart;
