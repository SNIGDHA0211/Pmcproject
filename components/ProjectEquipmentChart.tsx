import React from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList
} from 'recharts';
import { HardHat } from 'lucide-react';

interface EquipmentData {
    month: string;
    plannedMonthly: number;
    actualMonthly: number;
    plannedCumulative: number;
    actualCumulative: number;
}

interface ProjectEquipmentChartProps {
    data: EquipmentData[];
}

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                <p className="font-semibold text-gray-900 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex justify-between gap-4 text-sm">
                        <span style={{ color: entry.color }}>{entry.name}:</span>
                        <span className="font-medium">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const ProjectEquipmentChart: React.FC<ProjectEquipmentChartProps> = ({ data }) => {
    // Handle empty or null data
    const chartData = data && data.length > 0 ? data : [
        {
            month: 'No Data',
            plannedMonthly: 0,
            actualMonthly: 0,
            plannedCumulative: 0,
            actualCumulative: 0
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">PROJECT EQUIPMENT</h3>
                <HardHat className="h-5 w-5 text-orange-600" />
            </div>

            {/* Chart Container */}
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                            dataKey="month"
                            stroke="#6B7280"
                            fontSize={12}
                            tickLine={false}
                            axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis
                            stroke="#6B7280"
                            fontSize={12}
                            tickLine={false}
                            axisLine={{ stroke: '#E5E7EB' }}
                            label={{
                                value: 'Equipment Count',
                                angle: -90,
                                position: 'insideLeft',
                                style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 }
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ paddingTop: 20 }}
                            formatter={(value) => <span className="text-gray-700 text-sm">{value}</span>}
                        />

                        {/* Bars - Monthly Data */}
                        <Bar
                            dataKey="plannedMonthly"
                            name="Planned Monthly"
                            fill="#9CA3AF"
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                        >
                            {chartData.map((entry, index) => (
                                entry.plannedMonthly > 0 ? (
                                    <LabelList
                                        key={`label-${index}`}
                                        dataKey="plannedMonthly"
                                        position="top"
                                        style={{ fontSize: 11, fontWeight: 'bold', fill: '#4B5563' }}
                                    />
                                ) : null
                            ))}
                        </Bar>
                        <Bar
                            dataKey="actualMonthly"
                            name="Actual Monthly"
                            fill="#3B82F6"
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                        >
                            {chartData.map((entry, index) => (
                                entry.actualMonthly > 0 ? (
                                    <LabelList
                                        key={`label-${index}`}
                                        dataKey="actualMonthly"
                                        position="top"
                                        style={{ fontSize: 11, fontWeight: 'bold', fill: '#1D4ED8' }}
                                    />
                                ) : null
                            ))}
                        </Bar>

                        {/* Lines - Cumulative Data */}
                        <Line
                            type="monotone"
                            dataKey="plannedCumulative"
                            name="Planned Cumulative"
                            stroke="#4B5563"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={{ fill: '#4B5563', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 7, strokeWidth: 2 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="actualCumulative"
                            name="Actual Cumulative"
                            stroke="#F97316"
                            strokeWidth={3}
                            dot={{ fill: '#F97316', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 7, strokeWidth: 2 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ProjectEquipmentChart;
