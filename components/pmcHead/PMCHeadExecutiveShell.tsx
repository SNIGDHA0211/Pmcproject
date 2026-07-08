import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  Download,
  X,
} from 'lucide-react';
import { Project } from '../../types';
import type { ProjectDatesRecord } from '../../services/api';
import type { BottleneckItem } from '../../utils/bottleneck';
import type { ProjectHealthTone } from '../../utils/projectDashboardMetrics';
import PMCExecutiveOverviewPanel, {
  type ExecutiveProgressPoint,
} from './PMCExecutiveOverviewPanel';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';

export type PMCExecutiveTab =
  | 'overview'
  | 'schedule'
  | 'money'
  | 'people'
  | 'risk'
  | 'compliance';

export interface PMCExecutiveShellMetrics {
  projectHealth: { label: string; sublabel: string; tone: ProjectHealthTone };
  overallProgressPct: number;
  progressDeltaLabel?: string;
  summaryDelayDays: number;
  sclDelayDays: number;
  contractorDelayDays: number;
  criticalRisks: number;
  healthSafetyLabel: string;
  healthSafetySublabel: string;
  drawingApprovalPct: number;
  cpiPct: number;
  contractValueLabel: string;
  openBottleneckCount: number;
}

interface PMCHeadExecutiveShellProps {
  projects: Project[];
  selectedProject: Project;
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  onExport: () => void;
  activeTab: PMCExecutiveTab;
  onTabChange: (tab: PMCExecutiveTab) => void;
  metrics: PMCExecutiveShellMetrics;
  bottleneckItems: BottleneckItem[];
  onJumpToTab: (tab: PMCExecutiveTab) => void;
  sclDates?: ProjectDatesRecord | null;
  contractorDates?: ProjectDatesRecord | null;
  progressTrend?: ExecutiveProgressPoint[];
}

const TABS: { id: PMCExecutiveTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'schedule', label: 'Schedule & Dates' },
  { id: 'money', label: 'Financial' },
  { id: 'people', label: 'People & Site' },
  { id: 'risk', label: 'Risk' },
  { id: 'compliance', label: 'Compliance' },
];

type PriorityLevel = 'Critical' | 'High' | 'Urgent';

const PMCHeadExecutiveShell: React.FC<PMCHeadExecutiveShellProps> = ({
  projects,
  selectedProjectId,
  onProjectChange,
  onExport,
  activeTab,
  onTabChange,
  metrics,
  bottleneckItems,
  onJumpToTab,
  sclDates = null,
  contractorDates = null,
  progressTrend = [],
}) => {
  const ex = usePmcExecutiveTheme();
  const [alertDismissed, setAlertDismissed] = useState(false);

  const criticalRiskItems = bottleneckItems.filter(
    (i) => i.type === 'RISK' && i.status !== 'Closed' && i.description.trim(),
  );
  const openIssues = bottleneckItems.filter(
    (i) => i.status !== 'Closed' && i.description.trim(),
  );

  const showAlert =
    !alertDismissed &&
    (metrics.projectHealth.tone === 'bad' || metrics.criticalRisks > 0);

  const decisionQueue = useMemo(() => {
    const items: {
      id: string;
      title: string;
      priority: PriorityLevel;
      tab: PMCExecutiveTab;
      action?: string;
    }[] = [];

    criticalRiskItems.slice(0, 2).forEach((item) => {
      items.push({
        id: item.id,
        title: item.description.trim() || 'Critical risk requires approval',
        priority: item.priority === 'High' ? 'High' : 'Critical',
        tab: 'risk',
        action: 'Review',
      });
    });

    if (metrics.healthSafetyLabel === 'CRITICAL') {
      items.push({
        id: 'hse',
        title: `HSE: ${metrics.healthSafetySublabel}`,
        priority: 'Critical',
        tab: 'risk',
        action: 'Open',
      });
    }

    if (metrics.drawingApprovalPct < 75) {
      items.push({
        id: 'drawing',
        title: `Drawing approval at ${Math.round(metrics.drawingApprovalPct)}%`,
        priority: 'Urgent',
        tab: 'compliance',
        action: 'View',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'clear',
        title: 'No critical leadership actions pending today',
        priority: 'High',
        tab: 'overview',
      });
    }

    return items;
  }, [criticalRiskItems, metrics]);

  return (
    <div className="space-y-2 sm:space-y-3">
      <header className="overflow-hidden rounded-xl bg-gradient-to-r from-[#0f2744] via-[#1e3a5f] to-[#1e3a5f] text-white shadow-[0_4px_20px_rgba(15,39,68,0.2)]">
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5">
          <div className="min-w-0 flex-1 sm:max-w-md lg:max-w-lg">
            <h1 className="truncate text-base font-bold tracking-tight sm:text-lg">
              PMC Executive Project Review
            </h1>
            <div className="relative mt-1 max-w-full">
              <label htmlFor="pmc-exec-project-select" className="sr-only">
                Select project
              </label>
              <select
                id="pmc-exec-project-select"
                value={selectedProjectId}
                onChange={(e) => onProjectChange(e.target.value)}
                className="w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg border border-white/15 bg-white/10 py-1.5 pl-3 pr-8 text-xs font-semibold text-white outline-none backdrop-blur-sm transition hover:bg-white/15 focus:border-white/30 focus:ring-2 focus:ring-white/20 sm:text-sm"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-900">
                    {p.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60"
                aria-hidden
              />
            </div>
          </div>

          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 sm:text-sm"
            >
              <Download size={14} />
              Export
            </button>
            <button
              type="button"
              onClick={() => onJumpToTab('risk')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-400 sm:text-sm"
            >
              <ArrowUpRight size={14} />
              Escalate
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 py-1.5 scrollbar-thin sm:px-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition sm:px-3.5 sm:text-xs ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white ring-1 ring-white/25'
                  : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {showAlert && (
        <div className={`${ex.alert} py-2`}>
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={16} className={`shrink-0 ${ex.amberText}`} />
            Immediate leadership attention required
          </span>
          <button
            type="button"
            onClick={() => setAlertDismissed(true)}
            className={ex.alertDismiss}
            aria-label="Dismiss alert"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {activeTab === 'overview' && (
        <PMCExecutiveOverviewPanel
          metrics={metrics}
          progressTrend={progressTrend}
          decisionQueue={decisionQueue}
          openIssuesCount={openIssues.length}
          sclDates={sclDates}
          contractorDates={contractorDates}
          onJumpToTab={onJumpToTab}
        />
      )}
    </div>
  );
};

export default PMCHeadExecutiveShell;
