import React from 'react';
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
import {
  buildBudgetComparisonRows,
  buildEvmMetricBars,
  earnedValuePct,
  formatBillingAmount,
  formatBillingChartAxis,
  hasEvmData,
  type EvmTrendPoint,
} from '../utils/billingEvmAnalytics';
import { formatIndexValue } from '../utils/financialDashboardMetrics';
import { getThemeClasses, useTheme } from '../utils/theme';

interface BillingEvmChartsProps {
  variant: 'cost' | 'budget';
  costForm: Record<string, unknown>;
  budgetForm: Record<string, unknown>;
  cpi: number | null;
  spi: number | null;
  trendData: EvmTrendPoint[];
  loading?: boolean;
}

const BillingEvmCharts: React.FC<BillingEvmChartsProps> = ({
  variant,
  costForm,
  budgetForm,
  cpi,
  spi,
  trendData,
  loading = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const cardCls = `rounded-2xl border p-4 sm:p-5 ${
    isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
  }`;

  const gridStroke = isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const axisStroke = isDarkTheme ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
    border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
    color: isDarkTheme ? '#f1f5f9' : '#0f172a',
  };

  const evmBars = buildEvmMetricBars(costForm, budgetForm);
  const budgetRows = buildBudgetComparisonRows(budgetForm);
  const bac = evmBars.find((b) => b.short === 'BAC')?.value ?? 0;
  const bcwp = evmBars.find((b) => b.short === 'BCWP')?.value ?? 0;
  const acwp = evmBars.find((b) => b.short === 'ACWP')?.value ?? 0;
  const earnedPct = earnedValuePct(bac, bcwp);
  const spentPct = bac > 0 ? Math.min(100, (acwp / bac) * 100) : 0;

  const donutData = [
    { name: 'Earned', value: earnedPct, fill: '#10b981' },
    { name: 'Remaining', value: Math.max(0, 100 - earnedPct), fill: isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
  ];

  const indexCards = [
    {
      label: 'Cost Performance Index',
      abbrev: 'CPI',
      value: formatIndexValue(cpi),
      hint: 'BCWP ÷ ACWP',
      tone: cpi == null ? 'neutral' : cpi >= 1 ? 'good' : 'warn',
    },
    {
      label: 'Schedule Performance Index',
      abbrev: 'SPI',
      value: formatIndexValue(spi),
      hint: 'BCWP ÷ BCWS',
      tone: spi == null ? 'neutral' : spi >= 1 ? 'good' : 'warn',
    },
    {
      label: 'Earned Value',
      abbrev: 'EV%',
      value: `${Math.round(earnedPct)}%`,
      hint: 'BCWP ÷ BAC',
      tone: earnedPct >= 70 ? 'good' : earnedPct >= 40 ? 'warn' : 'neutral',
    },
    {
      label: 'Budget Spent',
      abbrev: 'Spent%',
      value: `${Math.round(spentPct)}%`,
      hint: 'ACWP ÷ BAC',
      tone: spentPct > 100 ? 'warn' : 'good',
    },
  ];

  const toneClass = (tone: string) => {
    if (tone === 'good') return isDarkTheme ? 'text-emerald-400' : 'text-emerald-600';
    if (tone === 'warn') return isDarkTheme ? 'text-amber-400' : 'text-amber-600';
    return themeClasses.textPrimary;
  };

  if (loading) {
    return (
      <div className={`flex min-h-[200px] items-center justify-center ${cardCls}`}>
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {indexCards.map((item) => (
          <div
            key={item.abbrev}
            className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}
          >
            <p className={`text-[9px] font-black uppercase tracking-wider ${themeClasses.textSecondary}`}>
              {item.abbrev}
            </p>
            <p className={`mt-1 text-xl font-black tabular-nums sm:text-2xl ${toneClass(item.tone)}`}>
              {item.value}
            </p>
            <p className={`mt-0.5 text-[10px] font-semibold ${themeClasses.textMuted}`}>{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardCls} xl:col-span-2`}>
          <h4 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            {variant === 'budget' ? 'Budget vs Cost Breakdown' : 'EVM Value Comparison'}
          </h4>
          {hasEvmData(evmBars) ? (
            <div className="h-[260px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={variant === 'budget' ? budgetRows : evmBars}
                  margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                  barGap={variant === 'budget' ? 4 : 8}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey={variant === 'budget' ? 'label' : 'short'}
                    tick={{ fontSize: 11, fill: axisStroke }}
                    axisLine={{ stroke: gridStroke }}
                  />
                  <YAxis
                    tickFormatter={formatBillingChartAxis}
                    tick={{ fontSize: 11, fill: axisStroke }}
                    axisLine={{ stroke: gridStroke }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatBillingAmount(value)}
                  />
                  {variant === 'budget' ? (
                    <>
                      <Legend formatter={(v) => <span style={{ color: axisStroke, fontSize: 11 }}>{v}</span>} />
                      <Bar dataKey="planned" name="Reference" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                      <Bar dataKey="actual" name="Actual" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </>
                  ) : (
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {evmBars.map((entry) => (
                        <Cell key={entry.short} fill={entry.fill} />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={`py-16 text-center text-sm ${themeClasses.textSecondary}`}>
              Enter EVM values above to see the comparison chart.
            </p>
          )}
        </div>

        <div className={cardCls}>
          <h4 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Financial Progress
          </h4>
          <div className="relative h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={78}
                  paddingAngle={2}
                  startAngle={90}
                  endAngle={-270}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className={`text-3xl font-black tabular-nums ${themeClasses.textPrimary}`}>
                {Math.round(earnedPct)}%
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`}>
                of BAC earned
              </p>
            </div>
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className={themeClasses.textSecondary}>BAC</span>
              <span className={`font-bold tabular-nums ${themeClasses.textPrimary}`}>{formatBillingAmount(bac)}</span>
            </div>
            <div className="flex justify-between">
              <span className={themeClasses.textSecondary}>BCWP (Earned)</span>
              <span className="font-bold tabular-nums text-emerald-500">{formatBillingAmount(bcwp)}</span>
            </div>
            <div className="flex justify-between">
              <span className={themeClasses.textSecondary}>ACWP (Spent)</span>
              <span className="font-bold tabular-nums text-orange-500">{formatBillingAmount(acwp)}</span>
            </div>
          </div>
        </div>
      </div>

      {trendData.length > 1 && (
        <div className={cardCls}>
          <h4 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            EVM Trend Over Time
          </h4>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisStroke }} />
                <YAxis tickFormatter={formatBillingChartAxis} tick={{ fontSize: 11, fill: axisStroke }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBillingAmount(v)} />
                <Legend formatter={(v) => <span style={{ color: axisStroke, fontSize: 11 }}>{v}</span>} />
                <Line type="monotone" dataKey="bcws" name="BCWS" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bcwp" name="BCWP" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="acwp" name="ACWP" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingEvmCharts;
