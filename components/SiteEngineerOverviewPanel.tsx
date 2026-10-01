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
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import ProjectEquipmentChart from './ProjectEquipmentChart';
import { SITE_ENGINEER_QUICK_LINKS } from '../utils/siteEngineerProjects';
import { getThemeClasses, useTheme } from '../utils/theme';
import { SectionLoadingPanel } from './WorkspaceStatusPanels';

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

  const cardBase = isDarkTheme
    ? 'pmc-ov-card rounded-2xl pmc360-glass-panel-dark'
    : 'pmc-ov-card rounded-2xl pmc360-glass-panel-light';

  const tooltipStyle = {
    backgroundColor: isDarkTheme ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
  };

  const kpis = snapshot
    ? [
        { label: 'Progress', value: `${snapshot.progressPct.toFixed(1)}%`, icon: TrendingUp, accent: '#0284c7', hint: 'Physical completion' },
        { label: 'Manpower', value: snapshot.manpowerTotal.toLocaleString('en-IN'), icon: Users, accent: '#3b82f6', hint: 'On-site workforce' },
        { label: 'Safety Score', value: `${snapshot.safetyScore}%`, icon: Shield, accent: snapshot.safetyScore >= 80 ? '#10b981' : snapshot.safetyScore >= 60 ? '#f59e0b' : '#f43f5e', hint: 'HSE compliance rating' },
        { label: 'Equipment', value: snapshot.equipmentCount.toLocaleString('en-IN'), icon: HardHat, accent: '#f59e0b', hint: 'Deployed machinery' },
      ]
    : [];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── HEADER ── */}
      <div className={`p-4 sm:p-5 ${cardBase}`} style={{ '--ov-accent': '#0284c7', '--ov-delay': '0ms' } as React.CSSProperties}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #1e3a5f 130%)' }}
            >
              <HardHat size={22} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-black uppercase tracking-wider sm:text-lg ${themeClasses.textPrimary}`}>
                  Site Engineer Dashboard
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-sky-600 dark:text-sky-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
                  Live Field Data
                </span>
              </div>
              <p className={`text-[11px] font-medium ${themeClasses.textMuted}`}>
                Real-time construction execution, site safety &amp; equipment deployment
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {projectOptions.length > 0 && (
              <select
                value={projectName}
                onChange={(e) => onProjectChange(e.target.value)}
                className={`rounded-xl border px-3.5 py-2 text-xs font-bold outline-none transition-all shadow-sm ${themeClasses.input}`}
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
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${themeClasses.buttonSecondary}`}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {loading && !snapshot ? (
        <SectionLoadingPanel label="Loading site engineer dashboard" minHeight={280} />
      ) : !projectName ? (
        <div className={`${cardBase} p-12 text-center`} style={{ '--ov-accent': '#64748b' } as React.CSSProperties}>
          <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>No project assigned yet</p>
          <p className={`mt-1 text-xs ${themeClasses.textSecondary}`}>Contact your Team Lead to be added as Site Engineer on a project.</p>
        </div>
      ) : (
        <>
          {/* ── KPI TILE GRID ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {kpis.map(({ label, value, icon: Icon, accent, hint }, index) => (
              <div
                key={label}
                className={`p-3.5 sm:p-4 ${cardBase} pmc-ov-tile`}
                style={{
                  '--ov-accent': accent,
                  '--ov-delay': `${index * 70}ms`,
                  borderLeftWidth: 4,
                  borderLeftColor: accent,
                } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${themeClasses.textMuted}`}>{label}</p>
                    <p className={`mt-1 text-2xl font-black tabular-nums sm:text-3xl ${themeClasses.textPrimary}`}>{value}</p>
                    <p className="mt-0.5 truncate text-[9.5px] font-medium text-slate-400">{hint}</p>
                  </div>
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${accent} 0%, #1e3a5f 130%)` }}
                  >
                    <Icon size={18} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── CHARTS ROW ── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className={`p-4 sm:p-5 ${cardBase}`} style={{ '--ov-accent': '#0284c7', '--ov-delay': '150ms' } as React.CSSProperties}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500">
                    <TrendingUp size={15} />
                  </span>
                  <h3 className={`text-xs font-black uppercase tracking-wider ${themeClasses.textPrimary}`}>Cumulative Progress</h3>
                </div>
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-sky-500">Target vs Actual</span>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={snapshot?.progressChart ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} unit="%" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="plan" name="Plan %" stroke="#6366f1" strokeWidth={2.25} dot={false} animationDuration={1200} />
                    <Line type="monotone" dataKey="actual" name="Actual %" stroke="#10b981" strokeWidth={2.25} activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#ffffff' }} animationDuration={1200} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`p-4 sm:p-5 ${cardBase}`} style={{ '--ov-accent': '#3b82f6', '--ov-delay': '220ms' } as React.CSSProperties}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
                    <Users size={15} />
                  </span>
                  <h3 className={`text-xs font-black uppercase tracking-wider ${themeClasses.textPrimary}`}>Manpower Histogram</h3>
                </div>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-blue-500">Headcount</span>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={snapshot?.manpowerChart ?? []}>
                    <defs>
                      <linearGradient id="se-mp-planned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="se-mp-actual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: isDarkTheme ? '#94a3b8' : '#64748b' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="planned" name="Planned" fill="url(#se-mp-planned)" radius={[5, 5, 0, 0]} maxBarSize={28} animationDuration={900} />
                    <Bar dataKey="actual" name="Actual" fill="url(#se-mp-actual)" radius={[5, 5, 0, 0]} maxBarSize={28} animationDuration={900} animationBegin={150} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── SAFETY & EQUIPMENT ROW ── */}
          <div className={`grid grid-cols-1 gap-4 ${onEditHse ? 'lg:grid-cols-3' : ''}`}>
            {onEditHse && (
              <div className={`p-4 sm:p-5 ${cardBase} lg:col-span-1`} style={{ '--ov-accent': '#10b981', '--ov-delay': '280ms' } as React.CSSProperties}>
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                      <Shield size={15} />
                    </span>
                    <h3 className={`text-xs font-black uppercase tracking-wider ${themeClasses.textPrimary}`}>Health &amp; Safety</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditHse?.()}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors"
                  >
                    Update HSE
                  </button>
                </div>
                {snapshot?.healthSafety ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Fatalities', value: snapshot.healthSafety.fatalities, cls: 'text-rose-500' },
                      { label: 'Significant', value: snapshot.healthSafety.significant, cls: 'text-amber-500' },
                      { label: 'Major', value: snapshot.healthSafety.major, cls: 'text-yellow-600' },
                      { label: 'Minor', value: snapshot.healthSafety.minor, cls: 'text-indigo-500' },
                      { label: 'Near Miss', value: snapshot.healthSafety.near_miss, cls: 'text-slate-500' },
                      { label: 'Manhours', value: snapshot.healthSafety.total_manhours.toLocaleString('en-IN'), cls: themeClasses.textPrimary },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-xl border p-2.5 text-center transition-all ${
                          isDarkTheme ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200/80 bg-slate-50/70'
                        }`}
                      >
                        <p className={`text-[9px] font-black uppercase tracking-wider ${themeClasses.textMuted}`}>{item.label}</p>
                        <p className={`mt-0.5 text-base font-black tabular-nums ${item.cls}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`py-8 text-center text-xs font-medium ${themeClasses.textMuted}`}>No H&amp;S data recorded</p>
                )}
              </div>
            )}

            <div className={`p-4 sm:p-5 ${cardBase} ${onEditHse ? 'lg:col-span-2' : 'lg:col-span-full'}`} style={{ '--ov-accent': '#f59e0b', '--ov-delay': '350ms' } as React.CSSProperties}>
              <div className="mb-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                    <HardHat size={15} />
                  </span>
                  <h3 className={`text-xs font-black uppercase tracking-wider ${themeClasses.textPrimary}`}>Project Equipment</h3>
                </div>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase text-amber-500">Machinery Deployment</span>
              </div>
              <ProjectEquipmentChart data={snapshot?.equipmentChart ?? []} embedded />
            </div>
          </div>
        </>
      )}

      {/* ── QUICK ACCESS GRID ── */}
      <div className={`p-4 sm:p-5 ${cardBase}`} style={{ '--ov-accent': '#6366f1', '--ov-delay': '400ms' } as React.CSSProperties}>
        <div className="mb-3.5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-500">
            <Activity size={15} />
          </span>
          <h3 className={`text-xs font-black uppercase tracking-wider ${themeClasses.textPrimary}`}>Quick Navigation &amp; Workflows</h3>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SITE_ENGINEER_QUICK_LINKS.map((link, i) => (
            <button
              key={link.tab}
              type="button"
              onClick={() => onNavigate(link.tab)}
              className={`pmc-ov-row group flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                isDarkTheme
                  ? 'border-white/10 bg-white/[0.03] hover:border-sky-500/50 hover:bg-sky-500/10'
                  : 'border-slate-200/90 bg-slate-50/70 hover:border-sky-300 hover:bg-sky-50/60'
              }`}
              style={{ '--ov-row-delay': `${i * 60}ms` } as React.CSSProperties}
            >
              <div className="min-w-0 pr-2">
                <p className={`text-xs font-black uppercase tracking-wide ${themeClasses.textPrimary}`}>{link.label}</p>
                <p className={`mt-0.5 truncate text-[10px] font-medium ${themeClasses.textMuted}`}>{link.description}</p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-sky-500 opacity-70 transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>

      {onEditHse && !loading && projectName && snapshot && snapshot.healthSafety && snapshot.safetyScore < 70 && (
        <div className={`flex items-start gap-3 rounded-2xl border p-4 ${isDarkTheme ? 'border-rose-500/30 bg-rose-500/10' : 'border-rose-200 bg-rose-50'}`}>
          <AlertTriangle className="mt-0.5 shrink-0 text-rose-500 animate-pulse" size={18} />
          <p className={`text-xs font-semibold ${isDarkTheme ? 'text-rose-200' : 'text-rose-800'}`}>
            Safety score is below 70%. Please review site hazard mitigation protocols and update HSE records immediately.
          </p>
        </div>
      )}
    </div>
  );
};

export default SiteEngineerOverviewPanel;

