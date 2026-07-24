import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  FileText,
} from 'lucide-react';
import { Project } from '../../types';
import type { ProjectDatesRecord } from '../../services/api';
import type { BottleneckItem } from '../../utils/bottleneck';
import type { ProjectHealthTone } from '../../utils/projectDashboardMetrics';
import {
  buildExecutiveTabAlerts,
  flashExecutiveSection,
} from '../../utils/executiveTabAlerts';
import PMCExecutiveOverviewPanel, {
  type ExecutiveProgressPoint,
  type ExecutiveManpowerPoint,
  type ExecutiveCostPerformancePoint,
  type ExecutiveContractSnapshot,
  type ExecutiveQualitySnapshot,
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
  onNavigate: (tab: PMCExecutiveTab, anchor?: import('../../utils/executiveOverviewNavigation').ExecutiveOverviewAnchor) => void;
  metrics: PMCExecutiveShellMetrics;
  bottleneckItems: BottleneckItem[];
  onJumpToTab: (tab: PMCExecutiveTab) => void;
  sclDates?: ProjectDatesRecord | null;
  contractorDates?: ProjectDatesRecord | null;
  progressTrend?: ExecutiveProgressPoint[];
  manpowerTrend?: ExecutiveManpowerPoint[];
  costPerformanceTrend?: ExecutiveCostPerformancePoint[];
  qualityPerformancePct?: number;
  qualitySnapshot?: ExecutiveQualitySnapshot | null;
  correspondenceStats?: import('../../utils/executiveOverviewNavigation').ExecutiveCorrespondenceStats | null;
  contractSnapshot?: ExecutiveContractSnapshot | null;
  pvaVelocity?: import('./PMCExecutiveOverviewPanel').ExecutivePvaVelocityData | null;
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
  onNavigate,
  metrics,
  bottleneckItems,
  onJumpToTab,
  sclDates = null,
  contractorDates = null,
  progressTrend = [],
  manpowerTrend = [],
  costPerformanceTrend = [],
  qualityPerformancePct,
  qualitySnapshot = null,
  correspondenceStats = null,
  contractSnapshot = null,
  pvaVelocity = null,
}) => {
  const ex = usePmcExecutiveTheme();
  const briefRef = useRef<string>('');
  const [briefToast, setBriefToast] = useState<string | null>(null);

  const handleBriefReady = useCallback((markdown: string) => {
    briefRef.current = markdown;
  }, []);

  const handleGenerateBrief = useCallback(async () => {
    const text = briefRef.current.trim();
    if (!text) {
      setBriefToast('Brief not ready yet — open Overview first');
      window.setTimeout(() => setBriefToast(null), 2500);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setBriefToast('Executive brief copied to clipboard');
    } catch {
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-brief-${selectedProjectId}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setBriefToast('Executive brief downloaded');
    }
    window.setTimeout(() => setBriefToast(null), 2800);
  }, [selectedProjectId]);

  const criticalRiskItems = bottleneckItems.filter(
    (i) => i.type === 'RISK' && i.status !== 'Closed' && i.description.trim(),
  );
  const openIssues = bottleneckItems.filter(
    (i) => i.status !== 'Closed' && i.description.trim(),
  );

  const correspondencePending = useMemo(() => {
    if (!correspondenceStats) return 0;
    return (
      (correspondenceStats.client?.pending ?? 0) +
      (correspondenceStats.contractor?.pending ?? 0)
    );
  }, [correspondenceStats]);

  const tabAlerts = useMemo(
    () =>
      buildExecutiveTabAlerts({
        healthTone: metrics.projectHealth.tone,
        sclDates,
        contractorDates,
        openIssuesCount: openIssues.length,
        bottleneckItems,
        drawingApprovalPct: metrics.drawingApprovalPct,
        correspondencePending,
        cpiPct: metrics.cpiPct,
        hseStatus: metrics.healthSafetyLabel,
        delayDays: metrics.summaryDelayDays,
        criticalRisks: metrics.criticalRisks,
      }),
    [
      metrics,
      sclDates,
      contractorDates,
      openIssues.length,
      bottleneckItems,
      correspondencePending,
    ],
  );

  const activeTabAlert = tabAlerts[activeTab];

  const handleLookHere = useCallback(
    (item: { goToTab?: PMCExecutiveTab; sectionId?: string }) => {
      if (item.goToTab && item.goToTab !== activeTab) {
        onTabChange(item.goToTab);
        if (item.sectionId) {
          window.setTimeout(() => flashExecutiveSection(item.sectionId!), 240);
        }
        return;
      }
      if (item.sectionId) flashExecutiveSection(item.sectionId);
    },
    [activeTab, onTabChange],
  );

  useEffect(() => {
    if (activeTab === 'overview' || activeTabAlert.count === 0) return;
    const first = activeTabAlert.lookHere.find((i) => i.sectionId);
    if (!first?.sectionId) return;
    const t = window.setTimeout(() => flashExecutiveSection(first.sectionId!), 220);
    return () => window.clearTimeout(t);
    // Flash once when landing on a tab / project — not on every alert recalc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedProjectId]);

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

          <div className="flex shrink-0 flex-wrap gap-1.5">
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
              onClick={() => void handleGenerateBrief()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-300/30 bg-sky-500/20 px-3 py-2 text-xs font-semibold text-sky-50 transition hover:bg-sky-500/30 sm:text-sm"
              title="Generate one-click executive meeting brief"
            >
              <FileText size={14} />
              <span className="hidden min-[420px]:inline">Generate Brief</span>
              <span className="min-[420px]:hidden">Brief</span>
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
          {TABS.map((tab) => {
            const alert = tabAlerts[tab.id];
            const badgeCount = alert.count;
            const isCritical = alert.severity === 'critical';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative shrink-0 rounded-full px-3 py-1.5 pr-3 text-[10px] font-bold uppercase tracking-wide transition sm:px-3.5 sm:pr-3.5 sm:text-xs ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white ring-1 ring-white/25'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                }`}
                aria-label={
                  badgeCount > 0
                    ? `${tab.label}, ${badgeCount} important item${badgeCount === 1 ? '' : 's'}`
                    : tab.label
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.label}
                  {badgeCount > 0 && (
                    <span
                      className={`pmc-tab-alert-badge inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
                        isCritical
                          ? 'bg-[#c45c5c] text-white ring-1 ring-white/25'
                          : 'bg-[#c4a35a] text-[#1a1520] ring-1 ring-white/20'
                      }`}
                    >
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      {briefToast && (
        <div
          className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-xs font-bold text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200"
          role="status"
        >
          {briefToast}
        </div>
      )}

      {activeTabAlert.count > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-slate-200 bg-[#f4f7fb] px-3 py-2 dark:border-white/12 dark:bg-[#122a45]/55"
          role="status"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#1e3a5f] dark:text-slate-200">
            Updates
            <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded bg-[#1e3a5f] px-1 text-[9px] font-bold text-white dark:bg-slate-200 dark:text-[#0f2744]">
              {activeTabAlert.count}
            </span>
          </span>
          <span className="hidden h-3.5 w-px bg-slate-300 dark:bg-white/15 sm:block" aria-hidden />
          <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {activeTabAlert.lookHere.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleLookHere(item)}
                  title={item.hint}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-left shadow-[0_1px_1px_rgba(15,39,68,0.04)] transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/25 dark:bg-[#163352] dark:hover:bg-[#1a3a5c] ${
                    item.severity === 'critical'
                      ? 'border-slate-200 border-l-2 border-l-[#8b5a5a] dark:border-white/10 dark:border-l-[#b89090]'
                      : 'border-slate-200 border-l-2 border-l-[#8a7a55] dark:border-white/10 dark:border-l-[#c4b48a]'
                  }`}
                >
                  <span className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                    {item.label}
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {' · '}
                      {item.hint}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
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
          onNavigate={onNavigate}
          manpowerTrend={manpowerTrend}
          costPerformanceTrend={costPerformanceTrend}
          qualityPerformancePct={qualityPerformancePct}
          qualitySnapshot={qualitySnapshot}
          correspondenceStats={correspondenceStats}
          contractSnapshot={contractSnapshot}
          pvaVelocity={pvaVelocity}
          projectTitle={projects.find((p) => p.id === selectedProjectId)?.title ?? 'Project'}
          bottleneckItems={bottleneckItems}
          onBriefReady={handleBriefReady}
        />
      )}
    </div>
  );
};

export default PMCHeadExecutiveShell;
