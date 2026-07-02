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
import {
  AlertTriangle,
  ArrowRight,
  HardHat,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import ProjectEquipmentChart from './ProjectEquipmentChart';
import { SITE_ENGINEER_QUICK_LINKS } from '../utils/siteEngineerProjects';
import { getThemeClasses, useTheme } from '../utils/theme';

export interface SiteEngineerDashboardSnapshot {
  progressPct: number;
  manpowerTotal: number;
  safetyScore: number;
  equipmentCount: number;
  progressChart: { month: string; plan: number; actual: number }[];
  manpowerChart: { month: string; planned: number; actual: number }[];
  equipmentChart: {
    month: string;
    plannedMonthly: number;
    actualMonthly: number;
    plannedCumulative: number;
    actualCumulative: number;
  }[];
  healthSafety: {
    fatalities: number;
    significant: number;
    major: number;
    minor: number;
    near_miss: number;
    total_manhours: number;
  } | null;
}

interface SiteEngineerOverviewPanelProps {
  projectName: string;
  projectOptions: string[];
  onProjectChange: (name: string) => void;
  loading: boolean;
  snapshot: SiteEngineerDashboardSnapshot | null;
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onEditHse?: () => void;
}

const SiteEngineerOverviewPanel: React.FC<SiteEngineerOverviewPanelProps> = ({
  projectName,
  projectOptions,
  onProjectChange,
  loading,
  snapshot,
  onNavigate,
  onRefresh,
  isRefreshing = false,
  onEditHse,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const cardCls = `rounded-2xl border p-4 sm:p-5 ${
    isDarkTheme ? `${themeClasses.glassCard} ${themeClasses.border}` : 'border-slate-200 bg-white shadow-sm'
  }`;

  const tooltipStyle = {
    backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
    border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
  };

  const kpis = snapshot
    ? [
        { label: 'Progress', value: `${snapshot.progressPct.toFixed(1)}%`, icon: TrendingUp, tone: isDarkTheme ? 'text-indigo-300 bg-indigo-500/15' : 'text-indigo-600 bg-indigo-50' },
        { label: 'Manpower', value: snapshot.manpowerTotal.toLocaleString('en-IN'), icon: Users, tone: isDarkTheme ? 'text-blue-300 bg-blue-500/15' : 'text-blue-600 bg-blue-50' },
        { label: 'Safety Score', value: `${snapshot.safetyScore}%`, icon: Shield, tone: isDarkTheme ? 'text-emerald-300 bg-emerald-500/15' : 'text-emerald-600 bg-emerald-50' },
        { label: 'Equipment', value: snapshot.equipmentCount.toLocaleString('en-IN'), icon: HardHat, tone: isDarkTheme ? 'text-amber-300 bg-amber-500/15' : 'text-amber-600 bg-amber-50' },
      ]
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-xl font-black uppercase tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
            Site Engineer Dashboard
          </h2>
          <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
            Live project monitoring from backend APIs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {projectOptions.length > 0 && (
            <select
              value={projectName}
              onChange={(e) => onProjectChange(e.target.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none sm:text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary}`}
            >
              {projectOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || isRefreshing}
            className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider ${themeClasses.buttonSecondary} ${themeClasses.border}`}
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && !snapshot ? (
        <div className={`flex min-h-[280px] items-center justify-center ${cardCls}`}>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : !projectName ? (
        <div className={`${cardCls} py-12 text-center`}>
          <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>No project assigned yet</p>
          <p className={`mt-1 text-xs ${themeClasses.textSecondary}`}>Contact your Team Lead to be added as Site Engineer on a project.</p>
        </div>
      ) : (
        <>
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

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className={cardCls}>
              <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Cumulative Progress</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={snapshot?.progressChart ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="plan" name="Plan %" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="actual" name="Actual %" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={cardCls}>
              <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Manpower Histogram</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={snapshot?.manpowerChart ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="planned" name="Planned" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={`${cardCls} lg:col-span-1`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Health &amp; Safety</h3>
                <button type="button" onClick={() => onEditHse?.()} className="text-[10px] font-bold uppercase text-indigo-500">Update HSE</button>
              </div>
              {snapshot?.healthSafety ? (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Fatalities', value: snapshot.healthSafety.fatalities, cls: 'text-rose-500' },
                    { label: 'Significant', value: snapshot.healthSafety.significant, cls: 'text-amber-500' },
                    { label: 'Major', value: snapshot.healthSafety.major, cls: 'text-yellow-600' },
                    { label: 'Minor', value: snapshot.healthSafety.minor, cls: 'text-indigo-500' },
                    { label: 'Near Miss', value: snapshot.healthSafety.near_miss, cls: 'text-slate-500' },
                    { label: 'Manhours', value: snapshot.healthSafety.total_manhours, cls: themeClasses.textPrimary },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl border px-2.5 py-2 text-center ${isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                      <p className={`text-[9px] font-bold uppercase ${themeClasses.textSecondary}`}>{item.label}</p>
                      <p className={`text-lg font-black tabular-nums ${item.cls}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`py-8 text-center text-sm ${themeClasses.textSecondary}`}>No H&amp;S data</p>
              )}
            </div>

            <div className={`${cardCls} lg:col-span-2`}>
              <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Project Equipment</h3>
              <ProjectEquipmentChart data={snapshot?.equipmentChart ?? []} embedded />
            </div>
          </div>
        </>
      )}

      <div className={cardCls}>
        <h3 className={`mb-3 text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>Quick Access</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SITE_ENGINEER_QUICK_LINKS.map((link) => (
            <button
              key={link.tab}
              type="button"
              onClick={() => onNavigate(link.tab)}
              className={`group flex items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors ${
                isDarkTheme
                  ? 'border-white/10 bg-white/[0.02] hover:border-indigo-500/40 hover:bg-indigo-500/10'
                  : 'border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <div className="min-w-0 pr-2">
                <p className={`text-xs font-black uppercase tracking-wide ${themeClasses.textPrimary}`}>{link.label}</p>
                <p className={`mt-0.5 truncate text-[10px] ${themeClasses.textSecondary}`}>{link.description}</p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-indigo-500 opacity-70 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>

      {!loading && projectName && snapshot && snapshot.healthSafety && snapshot.safetyScore < 70 && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${isDarkTheme ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`}>
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={18} />
          <p className={`text-xs font-semibold ${isDarkTheme ? 'text-amber-200' : 'text-amber-800'}`}>
            Safety score is below target. Review Health &amp; Safety records and update incident data.
          </p>
        </div>
      )}
    </div>
  );
};

export default SiteEngineerOverviewPanel;
