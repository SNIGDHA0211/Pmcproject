import React, { useMemo } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ClipboardList, CreditCard, IndianRupee, Landmark, TrendingUp } from 'lucide-react';
import type { MonthlyScope } from '../types';
import {
  buildStatusChartData,
  computeBillingScopeSummary,
} from '../utils/billingDashboardAnalytics';
import type { User } from '../types';
import BillingCashflowPanel from './BillingCashflowPanel';
import BillingEvmPanel from './BillingEvmPanel';
import BillingFinancialCrudPanel from './BillingFinancialCrudPanel';
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

  const summary = useMemo(() => computeBillingScopeSummary(scopes), [scopes]);
  const statusData = useMemo(() => buildStatusChartData(summary), [summary]);

  const cardCls = `rounded-2xl border p-4 sm:p-5 ${
    isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
  }`;

  const kpis = [
    { label: 'Assigned Scopes', value: summary.total, icon: ClipboardList, tone: isDarkTheme ? 'text-blue-300 bg-blue-500/15' : 'text-blue-600 bg-blue-50' },
    { label: 'In Progress', value: summary.inProgress, icon: TrendingUp, tone: isDarkTheme ? 'text-indigo-300 bg-indigo-500/15' : 'text-indigo-600 bg-indigo-50' },
    { label: 'Completed', value: summary.completed, icon: CreditCard, tone: isDarkTheme ? 'text-emerald-300 bg-emerald-500/15' : 'text-emerald-600 bg-emerald-50' },
    { label: 'Avg Progress', value: `${summary.avgProgress}%`, icon: IndianRupee, tone: isDarkTheme ? 'text-amber-300 bg-amber-500/15' : 'text-amber-600 bg-amber-50' },
  ];

  const tooltipStyle = {
    backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
    border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
  };

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
    <div className="space-y-4 sm:space-y-6">
      {/* Financial Management — always visible, primary section for billing engineer */}
      <section
        className={`overflow-hidden rounded-2xl border-2 ${
          isDarkTheme ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-gradient-to-b from-indigo-50/80 to-white shadow-md'
        }`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 sm:py-4 ${
            isDarkTheme
              ? 'border-indigo-500/20 bg-gradient-to-r from-indigo-600/30 to-violet-600/20'
              : 'border-indigo-100 bg-gradient-to-r from-indigo-600 to-violet-600'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-white/20 text-white'}`}>
              <Landmark size={20} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase tracking-widest text-white sm:text-base">
                Financial Management
              </h3>
              <p className={`text-[10px] font-semibold sm:text-xs ${isDarkTheme ? 'text-indigo-100' : 'text-indigo-100'}`}>
                Cashflow · EVM · Invoicing · Contract values · Performance
              </p>
            </div>
          </div>

          <div className="flex w-full min-w-[200px] flex-1 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-none">
            <label className={`text-[10px] font-black uppercase tracking-wider ${isDarkTheme ? 'text-indigo-100' : 'text-white/90'}`}>
              Project
            </label>
            {projectOptions.length > 0 ? (
              <select
                value={projectName ?? ''}
                onChange={(e) => onProjectChange(e.target.value)}
                className={`max-w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none sm:min-w-[200px] sm:text-sm ${
                  isDarkTheme
                    ? 'border-white/20 bg-slate-900/80 text-white'
                    : 'border-white/30 bg-white text-slate-900'
                }`}
              >
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.title}>
                    {p.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`rounded-xl px-3 py-2 text-xs font-bold ${isDarkTheme ? 'bg-white/10 text-white' : 'bg-white/20 text-white'}`}>
                No project assigned
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {projectName ? (
            <>
              <BillingCashflowPanel projectName={projectName} onToast={onToast} />
              <BillingEvmPanel projectName={projectName} user={user} onToast={onToast} />
              <BillingFinancialCrudPanel projectName={projectName} onToast={onToast} />
            </>
          ) : (
            <div className={`rounded-xl border border-dashed px-4 py-10 text-center ${isDarkTheme ? 'border-white/15 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
              <Icons.Finance size={32} className={`mx-auto mb-3 ${themeClasses.textMuted}`} />
              <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>Select a project to manage financial data</p>
              <p className={`mt-1 text-xs ${themeClasses.textSecondary}`}>
                Ask your Team Lead to assign you as Billing Engineer on a project if none appear here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Scope overview */}
      <div>
        <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
          Scope Overview
        </h3>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className={cardCls}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${themeClasses.textSecondary}`}>{label}</p>
                  <p className={`mt-1 text-2xl font-black tabular-nums sm:text-3xl ${themeClasses.textPrimary}`}>{value}</p>
                </div>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon size={18} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${cardCls} lg:col-span-1`}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Scope Status</h3>
          {statusData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3}>
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {statusData.map((row) => (
                  <span key={row.name} className={`inline-flex items-center gap-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
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

        <div className={`${cardCls} lg:col-span-2`}>
          <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Execution Overview</h3>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold">
                <span className={themeClasses.textSecondary}>Overall Progress</span>
                <span className={themeClasses.textPrimary}>{summary.avgProgress}%</span>
              </div>
              <div className={`h-2.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.min(100, summary.avgProgress)}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                <p className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>Planned Qty</p>
                <p className={`mt-1 text-lg font-black tabular-nums ${themeClasses.textPrimary}`}>{summary.plannedQty.toLocaleString('en-IN')}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2.5 ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                <p className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>Executed Qty</p>
                <p className="mt-1 text-lg font-black tabular-nums text-emerald-500">{summary.executedQty.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingEngineerDashboardPanel;
