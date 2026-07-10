import React, { useMemo } from 'react';
import { Download, LayoutGrid } from 'lucide-react';
import type { Project } from '../../types';
import type { ProjectDatesRecord } from '../../services/api';
import type { BottleneckItem } from '../../utils/bottleneck';
import type { ProjectHealthTone } from '../../utils/projectDashboardMetrics';
import PMCExecutiveOverviewPanel, {
  type ExecutiveCostPerformancePoint,
  type ExecutiveContractSnapshot,
  type ExecutiveQualitySnapshot,
  type ExecutiveDecisionItem,
  type ExecutiveManpowerPoint,
  type ExecutiveProgressPoint,
  type ExecutivePvaVelocityData,
} from '../pmcHead/PMCExecutiveOverviewPanel';
import type { PMCExecutiveTab } from '../pmcHead/PMCHeadExecutiveShell';
import { buildTeamLeaderOverviewDecisionQueue } from '../../utils/teamLeaderOverviewCache';
import type { ExecutiveCorrespondenceStats } from '../../utils/executiveOverviewNavigation';
import {
  resolveTeamLeaderOverviewSection,
  scrollToOverviewSection,
  type ExecutiveOverviewAnchor,
  type TeamLeaderOverviewSection,
} from '../../utils/executiveOverviewNavigation';

export type { TeamLeaderOverviewSection };

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
  manpowerTrend?: ExecutiveManpowerPoint[];
  costPerformanceTrend?: ExecutiveCostPerformancePoint[];
  qualityPerformancePct?: number;
  qualitySnapshot?: ExecutiveQualitySnapshot | null;
  correspondenceStats?: ExecutiveCorrespondenceStats | null;
  contractSnapshot?: ExecutiveContractSnapshot | null;
  pvaVelocity?: ExecutivePvaVelocityData | null;
  onExport: () => void;
  onOpenFullView: (section?: TeamLeaderOverviewSection) => void;
  onNavigateModule?: (tab: string) => void;
  decisionQueueOverride?: ExecutiveDecisionItem[];
  openIssuesCountOverride?: number;
  isRefreshingLiveData?: boolean;
}

const TeamLeaderOverviewShell: React.FC<TeamLeaderOverviewShellProps> = ({
  project,
  metrics,
  progressTrend,
  bottleneckItems,
  sclDates = null,
  contractorDates = null,
  healthSafetySublabel = '',
  manpowerTrend = [],
  costPerformanceTrend = [],
  qualityPerformancePct,
  qualitySnapshot = null,
  correspondenceStats = null,
  contractSnapshot = null,
  pvaVelocity = null,
  onExport,
  onOpenFullView,
  decisionQueueOverride,
  openIssuesCountOverride,
  isRefreshingLiveData = false,
}) => {
  const openIssuesCount =
    openIssuesCountOverride ??
    bottleneckItems.filter((item) => item.status !== 'Closed' && item.description.trim()).length;

  const decisionQueue = useMemo(() => {
    if (decisionQueueOverride?.length) return decisionQueueOverride;
    return buildTeamLeaderOverviewDecisionQueue(metrics, healthSafetySublabel, bottleneckItems);
  }, [decisionQueueOverride, metrics, healthSafetySublabel, bottleneckItems]);

  const decisionQueueForPanel = useMemo(
    () =>
      decisionQueue.map((item) => ({
        id: item.id,
        title: item.title,
        priority: item.priority,
        tab: item.tab,
        action: item.action,
      })),
    [decisionQueue],
  );

  const handleNavigate = (tab: PMCExecutiveTab, anchor?: ExecutiveOverviewAnchor) => {
    const section = resolveTeamLeaderOverviewSection(tab, anchor);
    onOpenFullView(section);
    if (anchor) {
      scrollToOverviewSection(anchor, 'team-lead');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {isRefreshingLiveData && (
        <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-200">
          Showing saved overview — updating live data…
        </p>
      )}
      <header className="overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 px-4 py-4 text-white shadow-md sm:px-5 dark:border-indigo-500/20 dark:from-[#0f2744] dark:via-[#1e3a5f] dark:to-[#243b5c]">
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
        decisionQueue={decisionQueueForPanel}
        openIssuesCount={openIssuesCount}
        sclDates={sclDates}
        contractorDates={contractorDates}
        onNavigate={handleNavigate}
        manpowerTrend={manpowerTrend}
        costPerformanceTrend={costPerformanceTrend}
        qualityPerformancePct={qualityPerformancePct}
        qualitySnapshot={qualitySnapshot}
        correspondenceStats={correspondenceStats}
        contractSnapshot={contractSnapshot}
        pvaVelocity={pvaVelocity}
      />
    </div>
  );
};

export default TeamLeaderOverviewShell;
