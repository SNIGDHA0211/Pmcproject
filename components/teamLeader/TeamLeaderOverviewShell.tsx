import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  Building2,
  Download,
  HardHat,
  IndianRupee,
  LayoutGrid,
  Shield,
  Users,
} from 'lucide-react';
import type { Project } from '../../types';
import type { ProjectDatesRecord } from '../../services/api';
import type { BottleneckItem } from '../../utils/bottleneck';
import type { ProjectHealthTone } from '../../utils/projectDashboardMetrics';
import PMCExecutiveOverviewPanel, {
  type ExecutiveProgressPoint,
} from '../pmcHead/PMCExecutiveOverviewPanel';
import type { PMCExecutiveTab } from '../pmcHead/PMCHeadExecutiveShell';
import { useTheme, getThemeClasses } from '../../utils/theme';

export type TeamLeaderOverviewSection =
  | 'contractor'
  | 'financial'
  | 'compliance'
  | 'people'
  | 'risk'
  | 'charts';

export interface TeamLeaderOverviewMetrics {
  projectHealth: { label: string; tone: ProjectHealthTone };
  overallProgressPct: number;
  progressDeltaLabel?: string;
  summaryDelayDays: number;
  sclDelayDays: number;
  contractorDelayDays: number;
  criticalRisks: number;
  healthSafetyLabel: string;
  drawingApprovalPct: number;
  cpiPct: number;
  contractValueLabel: string;
  openBottleneckCount: number;
}

interface TeamLeaderOverviewShellProps {
  project: Project;
  metrics: TeamLeaderOverviewMetrics;
  progressTrend: ExecutiveProgressPoint[];
  bottleneckItems: BottleneckItem[];
  sclDates?: ProjectDatesRecord | null;
  contractorDates?: ProjectDatesRecord | null;
  healthSafetySublabel?: string;
  onExport: () => void;
  onOpenFullView: (section?: TeamLeaderOverviewSection) => void;
  onNavigateModule?: (tab: string) => void;
}

const QUICK_MODULES: Array<{
  id: TeamLeaderOverviewSection | 'module';
  title: string;
  subtitle: string;
  tab?: string;
  section: TeamLeaderOverviewSection;
  icon: React.ReactNode;
  accent: string;
  stat: (m: TeamLeaderOverviewMetrics) => string;
}> = [
  {
    id: 'contractor',
    title: 'Contractor & Timeline',
    subtitle: 'Dates, delay, bank guarantees',
    section: 'contractor',
    icon: <Building2 size={16} />,
    accent: '#38bdf8',
    stat: (m) => `${m.summaryDelayDays}d delay`,
  },
  {
    id: 'financial',
    title: 'Financial',
    subtitle: 'Cost, contract, invoicing',
    section: 'financial',
    icon: <IndianRupee size={16} />,
    accent: '#6366f1',
    stat: (m) => m.contractValueLabel,
  },
  {
    id: 'compliance',
    title: 'HSE & Quality',
    subtitle: 'Safety, quality, drawings',
    section: 'compliance',
    icon: <Shield size={16} />,
    accent: '#10b981',
    stat: (m) => m.healthSafetyLabel,
  },
  {
    id: 'people',
    title: 'Manpower & Site',
    subtitle: 'Team, machinery, photos',
    section: 'people',
    icon: <Users size={16} />,
    accent: '#8b5cf6',
    stat: () => 'Site ops',
  },
  {
    id: 'risk',
    title: 'Risks & Logs',
    subtitle: 'Bottlenecks and open issues',
    section: 'risk',
    icon: <HardHat size={16} />,
    accent: '#f43f5e',
    stat: (m) => `${m.criticalRisks} critical`,
  },
  {
    id: 'charts',
    title: 'Analytics Charts',
    subtitle: 'Progress curves and KPIs',
    section: 'charts',
    icon: <LayoutGrid size={16} />,
    accent: '#14b8a6',
    stat: (m) => `${Math.round(m.overallProgressPct)}% progress`,
  },
];

const TeamLeaderOverviewShell: React.FC<TeamLeaderOverviewShellProps> = ({
  project,
  metrics,
  progressTrend,
  bottleneckItems,
  sclDates = null,
  contractorDates = null,
  healthSafetySublabel = '',
  onExport,
  onOpenFullView,
  onNavigateModule,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const criticalRiskItems = bottleneckItems.filter(
    (item) => item.type === 'RISK' && item.status !== 'Closed' && item.description.trim(),
  );
  const openIssuesCount = bottleneckItems.filter(
    (item) => item.status !== 'Closed' && item.description.trim(),
  ).length;

  const decisionQueue = useMemo(() => {
    const items: {
      id: string;
      title: string;
      priority: 'Critical' | 'High' | 'Urgent';
      tab: PMCExecutiveTab;
      section: TeamLeaderOverviewSection;
      action?: string;
    }[] = [];

    criticalRiskItems.slice(0, 2).forEach((item) => {
      items.push({
        id: item.id,
        title: item.description.trim() || 'Critical risk needs review',
        priority: item.priority === 'High' ? 'High' : 'Critical',
        tab: 'risk',
        section: 'risk',
        action: 'Review',
      });
    });

    if (metrics.healthSafetyLabel === 'CRITICAL') {
      items.push({
        id: 'hse',
        title: healthSafetySublabel
          ? `HSE: ${healthSafetySublabel}`
          : 'Health & safety status is critical',
        priority: 'Critical',
        tab: 'risk',
        section: 'compliance',
        action: 'Open',
      });
    }

    if (metrics.drawingApprovalPct < 75) {
      items.push({
        id: 'drawing',
        title: `Drawing approval at ${Math.round(metrics.drawingApprovalPct)}%`,
        priority: 'Urgent',
        tab: 'compliance',
        section: 'compliance',
        action: 'View',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'clear',
        title: 'Project overview is up to date — open full view for details',
        priority: 'High',
        tab: 'overview',
        section: 'charts',
      });
    }

    return items;
  }, [criticalRiskItems, metrics, healthSafetySublabel]);

  const handleJumpToTab = (tab: PMCExecutiveTab) => {
    const map: Partial<Record<PMCExecutiveTab, TeamLeaderOverviewSection>> = {
      overview: 'charts',
      schedule: 'contractor',
      money: 'financial',
      people: 'people',
      risk: 'risk',
      compliance: 'compliance',
    };
    onOpenFullView(map[tab] ?? 'charts');
  };

  const cardBase = isDarkTheme
    ? 'rounded-2xl border border-white/10 bg-white/[0.03]'
    : 'rounded-2xl border border-slate-200/90 bg-white shadow-sm';

  return (
    <div className="space-y-3 sm:space-y-4">
      <header
        className={`overflow-hidden rounded-2xl border px-4 py-4 sm:px-5 ${
          isDarkTheme
            ? 'border-indigo-500/20 bg-gradient-to-r from-[#0f2744] via-[#1e3a5f] to-[#243b5c] text-white'
            : 'border-indigo-200/80 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white shadow-md'
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              Project Overview
            </p>
            <h1 className="mt-1 truncate text-lg font-black tracking-tight sm:text-xl">
              {project.title}
            </h1>
            {project.location && (
              <p className="mt-0.5 truncate text-xs font-medium text-white/75">{project.location}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15"
            >
              <Download size={14} />
              Export
            </button>
            <button
              type="button"
              onClick={() => onOpenFullView('charts')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-indigo-700 shadow transition hover:bg-indigo-50"
            >
              <LayoutGrid size={14} />
              Full Project View
            </button>
          </div>
        </div>
      </header>

      <PMCExecutiveOverviewPanel
        metrics={metrics}
        progressTrend={progressTrend}
        decisionQueue={decisionQueue.map((item) => ({
          id: item.id,
          title: item.title,
          priority: item.priority,
          tab: item.tab,
          action: item.action,
        }))}
        openIssuesCount={openIssuesCount}
        sclDates={sclDates}
        contractorDates={contractorDates}
        onJumpToTab={handleJumpToTab}
      />

      <section aria-label="Project modules">
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
          <h2 className={`text-xs font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
            Project Sections
          </h2>
          <span className={`text-[10px] font-bold ${themeClasses.textSecondary}`}>
            Tap full view to open in project dashboard
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_MODULES.map((module) => (
            <article
              key={module.title}
              className={`${cardBase} flex flex-col p-4 transition hover:shadow-md`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${module.accent}, #1e3a5f)` }}
                >
                  {module.icon}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                    isDarkTheme ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {module.stat(metrics)}
                </span>
              </div>
              <h3 className={`mt-3 text-sm font-black ${themeClasses.textPrimary}`}>{module.title}</h3>
              <p className={`mt-1 text-[11px] font-medium ${themeClasses.textSecondary}`}>
                {module.subtitle}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenFullView(module.section)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-indigo-500"
                >
                  Full View
                  <ArrowUpRight size={12} />
                </button>
                {module.tab && onNavigateModule && (
                  <button
                    type="button"
                    onClick={() => onNavigateModule(module.tab!)}
                    className={`rounded-lg border px-3 py-2 text-[10px] font-bold uppercase ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                  >
                    Open Module
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TeamLeaderOverviewShell;
