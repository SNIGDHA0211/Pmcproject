import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
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

const PROJECT_SWITCH_LOGS = [
  'Connecting to project workspace…',
  'Loading schedule, dates & progress…',
  'Syncing financial & compliance metrics…',
  'Preparing executive overview…',
] as const;

const PROJECT_SWITCH_STEP_MS = 650;
const PROJECT_SWITCH_HOLD_MS = 450;

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
  /** False when drawing register has no backend rows for this project. */
  hasDrawingData?: boolean;
  /** False when bottleneck log is empty (new / unloaded project). */
  hasBottleneckData?: boolean;
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
  bgStatusSnapshot?: import('./PMCExecutiveOverviewPanel').ExecutiveBgStatusSnapshot | null;
  cashInflowSnapshot?: import('./PMCExecutiveOverviewPanel').ExecutiveCashInflowSnapshot | null;
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
  bgStatusSnapshot = null,
  cashInflowSnapshot = null,
}) => {
  const ex = usePmcExecutiveTheme();
  const briefRef = useRef<string>('');
  const [briefToast, setBriefToast] = useState<string | null>(null);
  const [projectSwitch, setProjectSwitch] = useState<{
    title: string;
    visibleLogCount: number;
  } | null>(null);
  const switchTimersRef = useRef<number[]>([]);

  const clearSwitchTimers = useCallback(() => {
    switchTimersRef.current.forEach((id) => window.clearTimeout(id));
    switchTimersRef.current = [];
  }, []);

  useEffect(() => () => clearSwitchTimers(), [clearSwitchTimers]);

  const handleProjectSelect = useCallback(
    (id: string) => {
      if (id === selectedProjectId || projectSwitch) return;
      const next = projects.find((p) => p.id === id);
      const title = next?.title?.trim() || 'Selected project';
      clearSwitchTimers();
      setProjectSwitch({ title, visibleLogCount: 1 });
      onProjectChange(id);

      PROJECT_SWITCH_LOGS.forEach((_, index) => {
        if (index === 0) return;
        const timer = window.setTimeout(() => {
          setProjectSwitch((prev) =>
            prev ? { ...prev, visibleLogCount: index + 1 } : prev,
          );
        }, index * PROJECT_SWITCH_STEP_MS);
        switchTimersRef.current.push(timer);
      });

      const doneAt =
        (PROJECT_SWITCH_LOGS.length - 1) * PROJECT_SWITCH_STEP_MS + PROJECT_SWITCH_HOLD_MS;
      const doneTimer = window.setTimeout(() => {
        setProjectSwitch(null);
        switchTimersRef.current = [];
      }, doneAt);
      switchTimersRef.current.push(doneTimer);
    },
    [
      clearSwitchTimers,
      onProjectChange,
      projectSwitch,
      projects,
      selectedProjectId,
    ],
  );

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
        healthLabel: metrics.projectHealth.label,
        sclDates,
        contractorDates,
        openIssuesCount: openIssues.length,
        bottleneckItems,
        drawingApprovalPct: metrics.drawingApprovalPct,
        hasDrawingData: metrics.hasDrawingData === true,
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

    if (metrics.healthSafetySublabel !== 'No HSE data' && metrics.healthSafetyLabel === 'CRITICAL') {
      items.push({
        id: 'hse',
        title: `HSE: ${metrics.healthSafetySublabel}`,
        priority: 'Critical',
        tab: 'risk',
        action: 'Open',
      });
    }

    if (metrics.hasDrawingData && metrics.drawingApprovalPct < 75) {
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
    <div className="relative space-y-2 sm:space-y-3">
      {projectSwitch && (
        <div
          className="absolute inset-0 z-40 flex items-start justify-center rounded-2xl bg-[#0f2744]/55 px-3 py-10 backdrop-blur-[3px] sm:items-center sm:py-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#0b1d36]/95 shadow-[0_16px_48px_rgba(7,20,40,0.45)]">
            <div className="border-b border-white/10 bg-gradient-to-r from-[#1e3a5f]/50 to-transparent px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Loader2 size={16} className="shrink-0 animate-spin text-sky-300" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-200/80">
                    Switching project
                  </p>
                  <p className="truncate text-sm font-semibold text-white">{projectSwitch.title}</p>
                </div>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-400 transition-[width] duration-500 ease-out"
                  style={{
                    width: `${Math.min(
                      100,
                      (projectSwitch.visibleLogCount / PROJECT_SWITCH_LOGS.length) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
            <ul className="space-y-1.5 px-4 py-3 font-mono text-[11px] leading-relaxed">
              {PROJECT_SWITCH_LOGS.slice(0, projectSwitch.visibleLogCount).map((line, index) => {
                const isLatest = index === projectSwitch.visibleLogCount - 1;
                const isDone = index < projectSwitch.visibleLogCount - 1;
                return (
                  <li
                    key={line}
                    className={`flex items-start gap-2 ${
                      isLatest ? 'text-sky-100' : 'text-slate-400'
                    }`}
                  >
                    <span className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                      {isDone ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Loader2 size={12} className="animate-spin text-sky-300" />
                      )}
                    </span>
                    <span>
                      <span className="text-slate-500">[{String(index + 1).padStart(2, '0')}]</span>{' '}
                      {line}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-white/10 px-4 py-2 text-[10px] font-medium text-slate-500">
              Almost ready — just a moment
            </p>
          </div>
        </div>
      )}

      <header className={ex.shellHeader}>
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5">
          <div className="min-w-0 flex-1 sm:max-w-md lg:max-w-lg">
            <h1 className={ex.shellTitle}>
              PMC Executive Project Review
            </h1>
            <div className="relative mt-1 max-w-full">
              <label htmlFor="pmc-exec-project-select" className="sr-only">
                Select project
              </label>
              <select
                id="pmc-exec-project-select"
                value={selectedProjectId}
                disabled={Boolean(projectSwitch)}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className={ex.shellSelect}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-900">
                    {p.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${ex.shellSelectChevron}`}
                aria-hidden
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-1.5">
            <button type="button" onClick={onExport} className={ex.shellBtnSecondary}>
              <Download size={14} />
              Export
            </button>
            <button
              type="button"
              onClick={() => void handleGenerateBrief()}
              className={ex.shellBtnBrief}
              title="Generate one-click executive meeting brief"
            >
              <FileText size={14} />
              <span className="hidden min-[420px]:inline">Generate Brief</span>
              <span className="min-[420px]:hidden">Brief</span>
            </button>
            <button
              type="button"
              onClick={() => onJumpToTab('risk')}
              className={ex.shellBtnEscalate}
            >
              <ArrowUpRight size={14} />
              Escalate
            </button>
          </div>
        </div>

        <nav className={ex.shellNav}>
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
                  activeTab === tab.id ? ex.shellTabActive : ex.shellTabInactive
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
                        isCritical ? ex.shellTabBadgeCritical : ex.shellTabBadgeWatch
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
          className={
            ex.isDark
              ? 'rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-center text-xs font-bold text-sky-200'
              : 'rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-xs font-bold text-sky-800'
          }
          role="status"
        >
          {briefToast}
        </div>
      )}

      {activeTabAlert.count > 0 && (
        <div className={ex.shellUpdates} role="status">
          <span className={ex.shellUpdatesLabel}>
            Updates
            <span className={ex.shellUpdatesCount}>{activeTabAlert.count}</span>
          </span>
          <span className={ex.shellUpdatesDivider} aria-hidden />
          <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {activeTabAlert.lookHere.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleLookHere(item)}
                  title={item.hint}
                  className={`${ex.shellUpdatePill} ${
                    item.severity === 'critical' ? ex.shellUpdatePillCritical : ex.shellUpdatePillWatch
                  }`}
                >
                  <span className={ex.shellUpdateText}>
                    {item.label}
                    <span className={ex.shellUpdateHint}>
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
          bgStatusSnapshot={bgStatusSnapshot}
          cashInflowSnapshot={cashInflowSnapshot}
          projectTitle={projects.find((p) => p.id === selectedProjectId)?.title ?? 'Project'}
          bottleneckItems={bottleneckItems}
          onBriefReady={handleBriefReady}
        />
      )}
    </div>
  );
};

export default PMCHeadExecutiveShell;
