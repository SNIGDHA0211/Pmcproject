import React, { useMemo } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ClipboardList, CreditCard, IndianRupee, LayoutDashboard, TrendingUp } from 'lucide-react';
import type { MonthlyScope, User } from '../types';
import {
  buildStatusChartData,
  computeBillingScopeSummary,
} from '../utils/billingDashboardAnalytics';
import { getBillingTheme } from '../utils/billingDashboardTheme';
import BillingCashflowPanel from './BillingCashflowPanel';
import BillingEvmPanel from './BillingEvmPanel';
import BillingFinancialCrudPanel from './BillingFinancialCrudPanel';
import BillingPerformancePanel from './BillingPerformancePanel';
import { Icons } from './Icons';
import { getThemeClasses, useTheme } from '../utils/theme';

export interface BillingProjectOption {
  id: string;
  title: string;
}

interface BillingEngineerDashboardPanelProps {
  scopes: MonthlyScope[];
  projectName: string | null;
  assignedProjects: BillingProjectOption[];
  user: User;
  onProjectChange: (projectTitle: string) => void;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

const BillingEngineerDashboardPanel: React.FC<BillingEngineerDashboardPanelProps> = ({
  scopes,
  projectName,
  assignedProjects,
  user,
  onProjectChange,
  onToast,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const billing = getBillingTheme(isDarkTheme, themeClasses);

  const summary = useMemo(() => computeBillingScopeSummary(scopes), [scopes]);
  const statusData = useMemo(() => buildStatusChartData(summary), [summary]);

  const kpis = [
    { label: 'Assigned Scopes', value: summary.total, icon: ClipboardList },
    { label: 'In Progress', value: summary.inProgress, icon: TrendingUp },
    { label: 'Completed', value: summary.completed, icon: CreditCard },
    { label: 'Avg Progress', value: `${summary.avgProgress}%`, icon: IndianRupee },
  ];

  const projectOptions = useMemo(() => {
    const map = new Map<string, BillingProjectOption>();
    for (const p of assignedProjects) {
      if (p.title) map.set(p.title, p);
    }
    if (projectName && !map.has(projectName)) {
      map.set(projectName, { id: projectName, title: projectName });
    }
    return [...map.values()];
  }, [assignedProjects, projectName]);

  return (
    <div className={billing.pageShell}>
      {/* Page header */}
      <header className={`${billing.card} !p-4 sm:!p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className={billing.sectionIcon}>
              <LayoutDashboard size={20} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h2 className={`text-base font-black uppercase tracking-widest sm:text-lg ${themeClasses.textPrimary}`}>
                Billing Engineer Dashboard
              </h2>
              <p className={billing.sectionSubtitle}>
                Scope execution · Financial management · Performance tracking
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            <label className={billing.label}>Active Project</label>
            {projectOptions.length > 0 ? (
              <select
                value={projectName ?? ''}
                onChange={(e) => onProjectChange(e.target.value)}
                className={`${billing.select} w-full sm:min-w-[220px]`}
              >
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.title}>
                    {p.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`rounded-xl border px-3 py-2 text-xs font-bold ${billing.innerCard} ${themeClasses.textSecondary}`}>
                No project assigned
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Scope KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className={billing.card}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={billing.metricLabel}>{label}</p>
                <p className={`mt-1 text-2xl font-black tabular-nums sm:text-3xl ${themeClasses.textPrimary}`}>
                  {value}
                </p>
              </div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${billing.kpiIcon}`}>
                <Icon size={18} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scope analytics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${billing.card} lg:col-span-1`}>
          <h3 className={`mb-3 ${billing.sectionTitle}`}>Scope Status</h3>
          {statusData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={billing.chartTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {statusData.map((row) => (
                  <span
                    key={row.name}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.name}: {row.value}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className={`py-12 text-center text-sm ${themeClasses.textSecondary}`}>No scope assignments yet</p>
          )}
        </div>

        <div className={`${billing.card} lg:col-span-2`}>
          <h3 className={`mb-3 ${billing.sectionTitle}`}>Execution Overview</h3>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span className={themeClasses.textSecondary}>Overall Progress</span>
                <span className={themeClasses.textPrimary}>{summary.avgProgress}%</span>
              </div>
              <div className={billing.progressTrack}>
                <div
                  className={billing.progressFill}
                  style={{ width: `${Math.min(100, summary.avgProgress)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={billing.metricTile}>
                <p className={billing.metricLabel}>Planned Qty</p>
                <p className={`mt-1 text-lg font-black tabular-nums ${themeClasses.textPrimary}`}>
                  {summary.plannedQty.toLocaleString('en-IN')}
                </p>
              </div>
              <div className={billing.metricTile}>
                <p className={billing.metricLabel}>Executed Qty</p>
                <p className="mt-1 text-lg font-black tabular-nums text-emerald-500">
                  {summary.executedQty.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial modules */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Icons.Finance size={16} className="text-indigo-500" />
          <h3 className={billing.label}>Financial Management</h3>
        </div>

        {projectName ? (
          <div className="space-y-4">
            <BillingCashflowPanel projectName={projectName} onToast={onToast} />
            <BillingPerformancePanel projectName={projectName} user={user} onToast={onToast} />
            <BillingEvmPanel projectName={projectName} user={user} onToast={onToast} />
            <BillingFinancialCrudPanel projectName={projectName} onToast={onToast} />
          </div>
        ) : (
          <div className={billing.emptyState}>
            <Icons.Finance size={32} className={`mx-auto mb-3 ${themeClasses.textMuted}`} />
            <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>Select a project to manage financial data</p>
            <p className={`mt-1 text-xs ${themeClasses.textSecondary}`}>
              Ask your Team Lead to assign you as Billing Engineer on a project if none appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingEngineerDashboardPanel;
