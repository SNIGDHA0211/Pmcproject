import React from 'react';
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
import DashboardCardTopAccent from '../DashboardCardTopAccent';
import DashboardChartShell from '../DashboardChartShell';
import { FullScreenCard, FullScreenHeaderToolbar } from '../FullScreenCard';
import { CardEditButton, CardHeaderActions, FormulaInfoButton } from '../FormulaInfoButton';
import { Icons } from '../Icons';
import { PlannedEarnedValueGroupCard } from '../PlannedEarnedValueCard';
import PerformanceHighlightCard, {
  getCollectionPerformanceStatus,
  getCostPerformanceStatus,
  KPI_METRIC_COLORS,
} from '../PerformanceHighlightCard';
import type { SubTab } from '../FinancialManagement';
import { useBillingFinanceDashboardData } from '../../hooks/useBillingFinanceDashboardData';
import {
  chartActiveDot,
  chartAxisStroke,
  chartAxisTick,
  chartGridStroke,
  chartLegendProps,
  chartLineBarMargin,
  chartTooltipStyle,
  chartXAxisMonthProps,
  formatChartCurrencyAxisTick,
} from '../../utils/dashboardCharts';
import {
  plannedValueSectionTitle,
} from '../../utils/dashboardContractorLabels';
import { DASHBOARD_FORMULAS } from '../../utils/dashboardFormulas';
import { formatINR, formatIndianCurrencyCompact } from '../../utils/format';
import {
  ProjectsDashboardTypographyProvider,
  useProjectsDashboardTypo,
} from '../../utils/projectsDashboardTypography';
import { getThemeClasses, useTheme } from '../../utils/theme';
import { toNum } from '../../services/api';
import BillingFinancialPortfolioRow from './BillingFinancialPortfolioRow';

export type BillingFinancialSection = SubTab;

interface BillingFinanceDashboardCardsProps {
  projectName: string;
  refreshKey?: number;
  onNavigateFinancial?: (section: BillingFinancialSection) => void;
}

const FinancialProgressChartPlot: React.FC<{
  isDarkTheme: boolean;
  data: { month: string; bcws: number; bcwp: number; acwp: number; fcst: number }[];
}> = ({ isDarkTheme, data }) => (
  <ResponsiveContainer width="100%" height="100%" minHeight={280}>
    <LineChart data={data} margin={chartLineBarMargin(false)}>
      <CartesianGrid strokeDasharray="4 6" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
      <XAxis
        dataKey="month"
        tick={chartAxisTick(isDarkTheme, 12)}
        axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
        tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
        {...chartXAxisMonthProps}
      />
      <YAxis
        width={58}
        tick={chartAxisTick(isDarkTheme, 12)}
        tickFormatter={formatChartCurrencyAxisTick}
        axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
        tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
      />
      <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
      <Legend {...chartLegendProps(11)} />
      <Line type="monotone" dataKey="bcws" stroke="#4f46e5" strokeWidth={2} name="BCWS" dot={false} activeDot={chartActiveDot} />
      <Line type="monotone" dataKey="bcwp" stroke="#f59e0b" strokeWidth={2} name="BCWP" dot={false} activeDot={chartActiveDot} />
      <Line type="monotone" dataKey="acwp" stroke="#ef4444" strokeWidth={2} name="ACWP" dot={false} activeDot={chartActiveDot} />
      <Line
        type="monotone"
        dataKey="fcst"
        stroke="#10b981"
        strokeWidth={2}
        strokeDasharray="6 4"
        name="FCST"
        dot={false}
        activeDot={chartActiveDot}
      />
    </LineChart>
  </ResponsiveContainer>
);

const BillingFinanceDashboardCardsInner: React.FC<BillingFinanceDashboardCardsProps> = ({
  projectName,
  refreshKey = 0,
  onNavigateFinancial,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const data = useBillingFinanceDashboardData(projectName, refreshKey);

  const navigate = (section: BillingFinancialSection) => {
    onNavigateFinancial?.(section);
  };

  const formatInr = (value: number, options?: { showSign?: boolean }) =>
    formatIndianCurrencyCompact(value, options);

  return (
    <section className="space-y-4" aria-label="Financial overview">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Financial Overview
          </h3>
          <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
            Same finance cards as Team Leader dashboard · tap edit to update in Financial Management
          </p>
        </div>
      </div>

      {/* Row 1: Planned vs Actual (full width) — Internal Cost / Contract Performance follow below */}
      <div className="earned-value-kpi-row space-y-3">
        <PlannedEarnedValueGroupCard
          className="planned-earned-value-tour-group w-full"
          sclData={data.plannedEarnedByPeriod?.scl ?? null}
          contractorData={data.plannedEarnedByPeriod?.contractor ?? null}
          contractorSectionTitle={plannedValueSectionTitle('Contractor')}
          groupSubtitle="SCL & Contractor performance"
          isLoading={data.isLoadingPlannedEarned}
          sclError={data.plannedEarnedError}
          contractorError={data.plannedEarnedError}
          onEdit={() => navigate('earned_value')}
          headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.plannedVsEarnedValue} />}
        />

        <FullScreenCard
          title="Internal Cost Performance"
          className="internal-cost-card min-h-[320px]"
          onEdit={() => navigate('cost')}
          editTitle="Edit in Financial Management"
        >
          <PerformanceHighlightCard
            className="h-full !min-h-[300px] !rounded-xl !border-0 !shadow-none"
            title="INTERNAL COST PERFORMANCE"
            icon={<Icons.Finance size={14} />}
            performancePercent={data.cpiGaugePct}
            performanceLabel="Cost Performance Index"
            status={getCostPerformanceStatus(data.cpiGaugePct)}
            metrics={[
              { label: 'BCWP', value: formatInr(data.bcwp), valueClassName: KPI_METRIC_COLORS.primary },
              { label: 'AC', value: formatInr(data.ac), valueClassName: KPI_METRIC_COLORS.primary },
              {
                label: 'Variance',
                value: formatInr(data.costVariance, { showSign: true }),
                valueClassName: data.costVariance >= 0 ? KPI_METRIC_COLORS.positive : KPI_METRIC_COLORS.negative,
              },
            ]}
            headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.projectCostPerformance} />}
          />
        </FullScreenCard>
      </div>

      {/* Row 2: Financial Progress */}
      <FullScreenCard
        title="Financial Progress"
        expandSize="fullWidth"
        className="cost-performance-card min-h-0"
        onEdit={() => navigate('cost')}
        editTitle="Edit in Financial Management"
      >
        <DashboardChartShell
          title="FINANCIAL PROGRESS"
          headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.projectCostPerformance} />}
          isLoading={data.isLoadingCostPerformance}
          loadingMessage="Loading financial progress data..."
          hasData={data.costPerformanceData.length > 0}
          emptyMessage="No financial progress data available for this project"
        >
          <FinancialProgressChartPlot isDarkTheme={isDarkTheme} data={data.costPerformanceData} />
        </DashboardChartShell>
      </FullScreenCard>

      {/* Row 3: Cashflow */}
      <FullScreenCard
        title="Cash Flow"
        expandSize="fullWidth"
        className="cashflow-card min-h-0"
        onEdit={() => navigate('cashflow')}
        editTitle="Edit in Financial Management"
      >
        <div className={`relative flex flex-col overflow-hidden rounded-xl border ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}>
          <DashboardCardTopAccent />
          <div className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 ${themeClasses.border}`}>
            <h3 className={`min-w-0 flex-1 ${typo.sectionTitle(isDarkTheme)}`}>CASH FLOW</h3>
            <FullScreenHeaderToolbar>
              <FormulaInfoButton {...DASHBOARD_FORMULAS.cashFlow} />
            </FullScreenHeaderToolbar>
          </div>
          <div className="p-4">
            {data.isLoadingCashflow ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className={`${typo.muted} ${themeClasses.textMuted}`}>Loading cashflow data...</div>
              </div>
            ) : data.cashflowChartData.length > 0 ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Cash In (Actual)', value: formatInr(data.cashflowSummary.cashInActual), tone: 'text-emerald-500' },
                    { label: 'Cash Out (Actual)', value: formatInr(data.cashflowSummary.cashOutActual), tone: 'text-rose-500' },
                    {
                      label: 'Net Cash Flow',
                      value: formatInr(data.cashflowSummary.netActual),
                      tone: data.cashflowSummary.netActual >= 0 ? 'text-emerald-500' : 'text-rose-500',
                    },
                    { label: 'Records', value: String(data.cashflowSummary.recordCount), tone: themeClasses.textPrimary },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-xl border px-3 py-2.5 ${themeClasses.border} ${themeClasses.bgSecondary}`}
                    >
                      <p className={`text-[9px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}>
                        {item.label}
                      </p>
                      <p className={`mt-1 text-sm font-black tabular-nums sm:text-base ${item.tone}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.cashflowChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
                      <XAxis dataKey="month" tick={chartAxisTick(isDarkTheme, 10)} />
                      <YAxis tick={chartAxisTick(isDarkTheme, 10)} tickFormatter={formatChartCurrencyAxisTick} />
                      <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} formatter={(v: number) => [formatInr(v), '']} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="cashIn" name="Cash In" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="cashOut" name="Cash Out" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className={`${typo.muted} ${themeClasses.textMuted}`}>No cashflow data available for this project</div>
              </div>
            )}
          </div>
        </div>
      </FullScreenCard>

      {/* Row 4: Budget vs Cost & Contract Performance */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <div
          className={`budget-cost-card relative flex min-h-[360px] flex-col overflow-hidden rounded-2xl border p-3 sm:min-h-[420px] sm:p-4 lg:min-h-[480px] transition-shadow hover:shadow-md ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}
        >
          <DashboardCardTopAccent />
          <div className={`mb-3 flex shrink-0 flex-col gap-2 border-b pb-2 pt-1 sm:flex-row sm:items-start sm:justify-between ${themeClasses.border}`}>
            <h3 className={`${typo.sectionTitle(isDarkTheme)} min-w-0 flex-1`}>BUDGET VS COST PERFORMANCE</h3>
            <CardHeaderActions className="shrink-0 self-end sm:self-auto">
              <FormulaInfoButton {...DASHBOARD_FORMULAS.budgetVsCost} />
              <CardEditButton
                onClick={() => navigate('budget')}
                title="Edit in Financial Management"
              />
            </CardHeaderActions>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            {data.isLoadingBudgetPerformance ? (
              <div className="flex h-[140px] items-center justify-center">
                <div className={`${themeClasses.textMuted} ${typo.muted}`}>Loading budget performance data...</div>
              </div>
            ) : data.budgetPerformanceData ? (
              <div className="space-y-2">
                {[
                  { label: 'Budget at Completion', value: formatINR(toNum(data.budgetPerformanceData.bac)), color: themeClasses.textPrimary, icon: Icons.Finance },
                  { label: 'Estimate at Completion', value: formatINR(toNum(data.budgetPerformanceData.eac)), color: 'text-amber-500', icon: Icons.Activity },
                  { label: 'Estimate to Go', value: formatINR(toNum(data.budgetPerformanceData.etg)), color: themeClasses.textPrimary, icon: Icons.ArrowRight },
                  {
                    label: 'Variance at Completion',
                    value: formatINR(toNum(data.budgetPerformanceData.vac)),
                    color: toNum(data.budgetPerformanceData.vac) >= 0 ? themeClasses.success : themeClasses.danger,
                    icon: Icons.Performance,
                  },
                  {
                    label: 'Variance to Date',
                    value: formatINR(toNum(data.budgetPerformanceData.cv)),
                    color: toNum(data.budgetPerformanceData.cv) >= 0 ? themeClasses.success : themeClasses.danger,
                    icon: Icons.Clock,
                  },
                ].map((metric) => {
                  const MetricIcon = metric.icon;
                  return (
                    <div
                      key={metric.label}
                      className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2.5 ${themeClasses.border} ${themeClasses.bgSecondary}`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <MetricIcon size={16} className={`shrink-0 ${isDarkTheme ? 'text-blue-300' : 'text-blue-600'}`} />
                        <span className={`min-w-0 flex-1 text-xs font-bold leading-snug sm:text-sm ${themeClasses.textSecondary}`}>
                          {metric.label}
                        </span>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold tabular-nums sm:text-base ${metric.color}`}>
                        {metric.value}
                      </span>
                    </div>
                  );
                })}
                {(() => {
                  const bac = toNum(data.budgetPerformanceData.bac);
                  const eac = toNum(data.budgetPerformanceData.eac);
                  const cpi = bac > 0 ? eac / bac : 0;
                  const isHealthy = cpi <= 1 && cpi > 0;
                  return (
                    <div
                      className={`mt-3 rounded-xl border px-3.5 py-3 ${themeClasses.border} ${isHealthy ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`${typo.labelBold} ${themeClasses.textSecondary}`}>Cost Performance Index</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 ${typo.badge} ${isHealthy ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}
                        >
                          {isHealthy ? 'Healthy' : 'Watch'}
                        </span>
                      </div>
                      <p className={`mt-1.5 ${typo.compactValue} ${isHealthy ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {cpi ? cpi.toFixed(2) : '-'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex h-[140px] items-center justify-center">
                <div className={`${themeClasses.textMuted} ${typo.muted}`}>
                  No budget performance data available for this project
                </div>
              </div>
            )}
          </div>
        </div>

        <FullScreenCard
          title="Contract Performance"
          className="contract-performance-card min-h-[360px] sm:min-h-[420px] lg:min-h-[480px]"
          onEdit={() => navigate('contract')}
          editTitle="Edit in Financial Management"
        >
          <PerformanceHighlightCard
            className="h-full !min-h-[340px] !rounded-xl !border-0 !shadow-none sm:!min-h-[400px] lg:!min-h-[460px]"
            title="CONTRACT PERFORMANCE"
            icon={<Icons.Document size={14} />}
            performancePercent={data.contractPerformanceData ? data.performancePercentage : 0}
            performanceLabel="Collection Performance"
            status={getCollectionPerformanceStatus(
              data.contractPerformanceData ? data.performancePercentage : 0,
            )}
            isLoading={data.isLoadingContractPerformance}
            error={data.contractPerformanceError}
            emptyMessage="No contract performance data"
            isEmpty={
              !data.isLoadingContractPerformance &&
              !data.contractPerformanceError &&
              !data.contractPerformanceData
            }
            metrics={
              data.contractPerformanceData
                ? [
                  {
                    label: 'Billed Value',
                    value: formatInr(data.billedValue),
                    valueClassName: KPI_METRIC_COLORS.primary,
                  },
                  {
                    label: 'Receipt Value',
                    value: formatInr(data.actualReceiptValue),
                    valueClassName: KPI_METRIC_COLORS.primary,
                  },
                  {
                    label: 'Variance',
                    value: formatInr(data.receiptVariance, { showSign: true }),
                    valueClassName:
                      data.receiptVariance >= 0 ? KPI_METRIC_COLORS.positive : KPI_METRIC_COLORS.negative,
                  },
                ]
                : [
                  { label: 'Billed Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
                  { label: 'Receipt Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
                  { label: 'Variance', value: '—', valueClassName: KPI_METRIC_COLORS.muted },
                ]
            }
            headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.contractPerformance} />}
          />
        </FullScreenCard>
      </div>

      {/* Row 5: Contract Values & Invoicing */}
      <BillingFinancialPortfolioRow
        projectName={projectName}
        refreshKey={refreshKey}
        onNavigateFinancial={(section) => navigate(section)}
      />
    </section>
  );
};

const BillingFinanceDashboardCards: React.FC<BillingFinanceDashboardCardsProps> = (props) => (
  <ProjectsDashboardTypographyProvider>
    <BillingFinanceDashboardCardsInner {...props} />
  </ProjectsDashboardTypographyProvider>
);

export default BillingFinanceDashboardCards;
