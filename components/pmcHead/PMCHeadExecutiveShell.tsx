import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  HardHat,
  Shield,
  TrendingUp,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { Project } from '../../types';
import type { ProjectDatesRecord } from '../../services/api';
import type { BottleneckItem } from '../../utils/bottleneck';
import type { ProjectHealthTone } from '../../utils/projectDashboardMetrics';
import PMCExecutiveTimeline from './PMCExecutiveTimeline';
import { getPmcExecutiveTheme, usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import { useTheme } from '../../utils/theme';

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
}

const TABS: { id: PMCExecutiveTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'schedule', label: 'Schedule & Dates' },
  { id: 'money', label: 'Money' },
  { id: 'people', label: 'People & Site' },
  { id: 'risk', label: 'Risk' },
  { id: 'compliance', label: 'Compliance' },
];

const healthToneClass = (tone: ProjectHealthTone, isDark: boolean) => {
  if (tone === 'bad') return isDark ? 'text-rose-400' : 'text-rose-600';
  if (tone === 'warn') return isDark ? 'text-amber-400' : 'text-amber-600';
  return isDark ? 'text-emerald-400' : 'text-emerald-600';
};

const dotToneClass = (tone: ProjectHealthTone) => {
  if (tone === 'bad') return 'bg-rose-500';
  if (tone === 'warn') return 'bg-amber-500';
  return 'bg-emerald-500';
};

type PriorityLevel = 'Critical' | 'High' | 'Urgent';

const priorityPillClass = (priority: PriorityLevel, isDark: boolean) =>
  getPmcExecutiveTheme(isDark).priorityPill[priority];

const CompliancePill: React.FC<{
  status: 'compliant' | 'non-compliant' | 'at-risk' | 'neutral';
  label: string;
}> = ({ status, label }) => {
  const { isDarkTheme } = useTheme();
  const styles = getPmcExecutiveTheme(isDarkTheme).compliancePill[status];

  const Icon =
    status === 'compliant'
      ? CheckCircle2
      : status === 'non-compliant'
        ? XCircle
        : AlertTriangle;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${styles}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
};

const PMCHeadExecutiveShell: React.FC<PMCHeadExecutiveShellProps> = ({
  projects,
  selectedProject,
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

  const cpiValue =
    metrics.cpiPct > 0 ? (metrics.cpiPct / 100).toFixed(2) : '—';
  const cpiOnTrack = metrics.cpiPct > 0 && metrics.cpiPct >= 100;

  const healthBullets = useMemo(
    () => [
      {
        text: `SCL delay at ${metrics.sclDelayDays}d vs baseline`,
        tone: metrics.sclDelayDays > 0 ? ('bad' as const) : ('good' as const),
      },
      {
        text: `Contractor delay at ${metrics.contractorDelayDays}d vs baseline`,
        tone:
          metrics.contractorDelayDays > metrics.sclDelayDays
            ? ('bad' as const)
            : ('warn' as const),
      },
      {
        text: metrics.healthSafetySublabel,
        tone:
          metrics.healthSafetyLabel === 'CRITICAL'
            ? ('bad' as const)
            : ('warn' as const),
      },
      {
        text: `${metrics.criticalRisks} open risk${metrics.criticalRisks !== 1 ? 's' : ''} flagged`,
        tone: metrics.criticalRisks > 0 ? ('bad' as const) : ('good' as const),
      },
      {
        text: `Drawing approval at ${Math.round(metrics.drawingApprovalPct)}%`,
        tone: metrics.drawingApprovalPct >= 75 ? ('good' as const) : ('warn' as const),
      },
    ],
    [metrics],
  );

  const decisionQueue = useMemo(() => {
    const items: {
      id: string;
      title: string;
      priority: PriorityLevel;
      due: string;
      owner: string;
      tab: PMCExecutiveTab;
      action: string;
    }[] = [];

    criticalRiskItems.slice(0, 2).forEach((item) => {
      items.push({
        id: item.id,
        title: item.description.trim() || 'Critical risk requires approval',
        priority: item.priority === 'High' ? 'High' : 'Critical',
        due: 'Due: Today',
        owner: item.assignedTo?.trim() || 'Risk Owner',
        tab: 'risk',
        action: 'Review',
      });
    });

    if (metrics.healthSafetyLabel === 'CRITICAL') {
      items.push({
        id: 'hse',
        title: `HSE: ${metrics.healthSafetySublabel}`,
        priority: 'Critical',
        due: 'Due: Today',
        owner: 'HSE Lead',
        tab: 'risk',
        action: 'Open HSE',
      });
    }

    if (metrics.drawingApprovalPct < 75) {
      items.push({
        id: 'drawing',
        title: `Drawing approval at ${Math.round(metrics.drawingApprovalPct)}%`,
        priority: 'Urgent',
        due: 'Due: This week',
        owner: 'Document Control',
        tab: 'compliance',
        action: 'View',
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'clear',
        title: 'No critical leadership actions pending today',
        priority: 'High',
        due: '',
        owner: '',
        tab: 'overview',
        action: '',
      });
    }

    return items;
  }, [criticalRiskItems, metrics]);

  const kpiCards = [
    {
      label: 'Project Status',
      value: metrics.projectHealth.label,
      valueClass: healthToneClass(metrics.projectHealth.tone, ex.isDark),
      icon: AlertTriangle,
      iconWrap: ex.roseIconWrap,
    },
    {
      label: 'Overall Progress',
      value: `${Math.round(metrics.overallProgressPct)}%`,
      valueClass: ex.emeraldText,
      icon: TrendingUp,
      iconWrap: ex.emeraldIconWrap,
    },
    {
      label: 'SCL Delay',
      value: `${metrics.sclDelayDays}d`,
      valueClass: ex.amberText,
      icon: Clock3,
      iconWrap: ex.amberIconWrap,
    },
    {
      label: 'Contractor Delay',
      value: `${metrics.contractorDelayDays}d`,
      valueClass: ex.amberText,
      icon: Clock3,
      iconWrap: ex.amberIconWrap,
    },
    {
      label: 'Critical Risks',
      value: String(metrics.criticalRisks),
      valueClass: metrics.criticalRisks > 0 ? ex.roseText : ex.slateValue,
      icon: Shield,
      iconWrap: ex.roseIconWrap,
    },
    {
      label: 'HSE',
      value: metrics.healthSafetyLabel,
      valueClass:
        metrics.healthSafetyLabel === 'CRITICAL' ? ex.roseText : ex.emeraldText,
      icon: HardHat,
      iconWrap:
        metrics.healthSafetyLabel === 'CRITICAL' ? ex.roseIconWrap : ex.emeraldIconWrap,
    },
    {
      label: 'Drawing',
      value: `${Math.round(metrics.drawingApprovalPct)}%`,
      valueClass:
        metrics.drawingApprovalPct >= 75 ? ex.emeraldText : ex.roseText,
      icon: FileText,
      iconWrap:
        metrics.drawingApprovalPct >= 75 ? ex.emeraldIconWrap : ex.roseIconWrap,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Executive header */}
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f2744] via-[#1e3a5f] to-[#1e3a5f] text-white shadow-[0_8px_30px_rgba(15,39,68,0.25)]">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Briefcase size={22} className="text-white" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                PMC Executive Project Review
              </h1>
              <p className="mt-0.5 text-sm text-blue-100/90">
                Strategic Oversight · {selectedProject.title}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
            <div className="relative min-w-0 flex-1 sm:min-w-[200px] lg:min-w-[240px]">
              <Briefcase
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
              />
              <select
                value={selectedProjectId}
                onChange={(e) => onProjectChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/15 bg-white/10 py-2.5 pl-9 pr-9 text-sm font-semibold text-white outline-none backdrop-blur-sm transition hover:bg-white/15"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-900">
                    {p.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60"
              />
            </div>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <Download size={16} />
              Export
            </button>
            <button
              type="button"
              onClick={() => onJumpToTab('risk')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-400"
            >
              <ArrowUpRight size={16} />
              Escalate
            </button>
          </div>
        </div>
      </header>

      {/* KPI metric cards */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={ex.kpiCard}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={ex.kpiLabel}>
                  {card.label}
                </p>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${card.iconWrap}`}
                >
                  <Icon size={14} />
                </span>
              </div>
              <p
                className={`mt-1.5 text-lg font-black leading-tight sm:text-xl ${card.valueClass}`}
              >
                {card.value}
              </p>
            </div>
          );
        })}
      </section>

      {showAlert && (
        <div className={ex.alert}>
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

      {/* Tabs */}
      <nav className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition sm:text-sm ${
              activeTab === tab.id ? ex.tabActive : ex.tabInactive
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Snapshot row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <article className={`flex flex-col p-4 sm:p-5 ${ex.surface}`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ActivityIcon tone={metrics.projectHealth.tone} isDark={ex.isDark} />
                  <h2 className={`text-sm font-bold uppercase tracking-wide ${ex.heading}`}>
                    Project Health
                  </h2>
                </div>
                {metrics.projectHealth.tone === 'bad' && (
                  <span className={ex.criticalBadge}>Critical</span>
                )}
              </div>
              <ul className="space-y-2.5">
                {healthBullets.map((item) => (
                  <li
                    key={item.text}
                    className={`flex items-start gap-2 text-sm ${ex.body}`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotToneClass(item.tone)}`}
                    />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onJumpToTab('risk')}
                className={`mt-auto pt-4 text-left text-sm font-semibold ${ex.link}`}
              >
                View full health report →
              </button>
            </article>

            <article className={`flex flex-col p-4 sm:p-5 ${ex.surface}`}>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp size={18} className={ex.isDark ? 'text-blue-400' : 'text-blue-600'} />
                <h2 className={`text-sm font-bold uppercase tracking-wide ${ex.heading}`}>
                  Schedule Snapshot
                </h2>
              </div>
              <p className={`text-3xl font-black sm:text-4xl ${ex.headingStrong}`}>
                {Math.round(metrics.overallProgressPct)}%
              </p>
              <p className={`mt-1 text-sm font-medium ${ex.muted}`}>
                Overall Progress
              </p>
              <div className={`mt-3 h-2 overflow-hidden rounded-full ${ex.progressTrack}`}>
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, metrics.overallProgressPct))}%`,
                  }}
                />
              </div>
              <p className={`mt-2 text-sm font-semibold ${ex.emeraldText}`}>
                {metrics.progressDeltaLabel ?? 'Physical progress to date'}
              </p>
              <p className={`text-sm ${ex.roseText}`}>
                {metrics.summaryDelayDays} days behind schedule
              </p>
              <button
                type="button"
                onClick={() => onJumpToTab('schedule')}
                className={`mt-auto pt-4 text-left text-sm font-semibold ${ex.link}`}
              >
                View schedule dashboard →
              </button>
            </article>

            <article className={`flex flex-col p-4 sm:p-5 ${ex.surface}`}>
              <div className="mb-3 flex items-center gap-2">
                <Wallet size={18} className={ex.isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                <h2 className={`text-sm font-bold uppercase tracking-wide ${ex.heading}`}>
                  Financial Snapshot
                </h2>
              </div>
              <p className={`text-2xl font-black sm:text-3xl ${ex.headingStrong}`}>
                {metrics.contractValueLabel}
              </p>
              <p className={`mt-1 text-sm ${ex.muted}`}>Contract Value</p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${ex.label}`}>
                    CPI
                  </p>
                  <p className={`text-2xl font-black ${ex.headingStrong}`}>{cpiValue}</p>
                  <p className={`text-sm ${ex.muted}`}>Cost Performance Index</p>
                </div>
                {cpiOnTrack && (
                  <span className={ex.onTrackBadge}>On Track</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onJumpToTab('money')}
                className={`mt-auto pt-4 text-left text-sm font-semibold ${ex.link}`}
              >
                View cost dashboard →
              </button>
            </article>
          </div>

          <PMCExecutiveTimeline scl={sclDates} contractor={contractorDates} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className={`p-4 sm:p-5 ${ex.surface}`}>
              <h2 className={`text-sm font-bold uppercase tracking-wide ${ex.heading}`}>
                Decision Queue Today
              </h2>
              <ul className="mt-4 space-y-3">
                {decisionQueue.map((item) =>
                  item.id === 'clear' ? (
                    <li key={item.id} className={ex.queueClear}>
                      {item.title}
                    </li>
                  ) : (
                    <li key={item.id} className={ex.queueItem}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-semibold ${ex.heading}`}>
                            {item.title}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${priorityPillClass(item.priority, ex.isDark)}`}
                          >
                            {item.priority}
                          </span>
                        </div>
                        <p className={`mt-1 text-xs ${ex.muted}`}>
                          {[item.due, item.owner].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {item.action && (
                        <button
                          type="button"
                          onClick={() => onJumpToTab(item.tab)}
                          className={ex.queueActionBtn}
                        >
                          {item.action}
                        </button>
                      )}
                    </li>
                  ),
                )}
              </ul>
              <button
                type="button"
                onClick={() => onJumpToTab('risk')}
                className={`mt-4 text-sm font-semibold ${ex.link}`}
              >
                View all decisions →
              </button>
            </article>

            <article className={`p-4 sm:p-5 ${ex.surface}`}>
              <h2 className={`text-sm font-bold uppercase tracking-wide ${ex.heading}`}>
                Compliance Pulse
              </h2>
              <ul className={`mt-4 divide-y ${ex.divide}`}>
                <li className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <span className={`text-sm font-medium ${ex.body}`}>
                    HSE Compliance
                  </span>
                  <CompliancePill
                    status={
                      metrics.healthSafetyLabel === 'SAFE'
                        ? 'compliant'
                        : 'non-compliant'
                    }
                    label={
                      metrics.healthSafetyLabel === 'SAFE'
                        ? 'Compliant'
                        : 'Non-Compliant'
                    }
                  />
                </li>
                <li className="flex items-center justify-between gap-3 py-3">
                  <span className={`text-sm font-medium ${ex.body}`}>
                    Drawing Submittals
                  </span>
                  <CompliancePill
                    status={
                      metrics.drawingApprovalPct >= 75
                        ? 'compliant'
                        : metrics.drawingApprovalPct >= 50
                          ? 'at-risk'
                          : 'non-compliant'
                    }
                    label={
                      metrics.drawingApprovalPct >= 75
                        ? 'Compliant'
                        : metrics.drawingApprovalPct >= 50
                          ? 'At Risk'
                          : 'Non-Compliant'
                    }
                  />
                </li>
                <li className="flex items-center justify-between gap-3 py-3">
                  <span className={`text-sm font-medium ${ex.body}`}>
                    Open Bottlenecks
                  </span>
                  <CompliancePill
                    status={
                      metrics.openBottleneckCount === 0
                        ? 'compliant'
                        : metrics.openBottleneckCount <= 2
                          ? 'at-risk'
                          : 'non-compliant'
                    }
                    label={
                      metrics.openBottleneckCount === 0
                        ? 'Compliant'
                        : metrics.openBottleneckCount <= 2
                          ? 'At Risk'
                          : 'Non-Compliant'
                    }
                  />
                </li>
                <li className="flex items-center justify-between gap-3 py-3">
                  <span className={`text-sm font-medium ${ex.body}`}>
                    Open Issues / Risks
                  </span>
                  <span className={`text-sm font-bold ${ex.slateValue}`}>
                    {openIssues.length} records
                  </span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => onJumpToTab('compliance')}
                className={`mt-4 text-sm font-semibold ${ex.link}`}
              >
                View compliance dashboard →
              </button>
            </article>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <footer className={ex.footer}>
          PMC Head view · Same data as Team Lead · Executive layout only
        </footer>
      )}
    </div>
  );
};

const ActivityIcon: React.FC<{ tone: ProjectHealthTone; isDark: boolean }> = ({ tone, isDark }) => {
  const ex = getPmcExecutiveTheme(isDark);
  return (
  <span
    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
      tone === 'bad'
        ? ex.roseIconWrap
        : tone === 'warn'
          ? ex.amberIconWrap
          : ex.emeraldIconWrap
    }`}
  >
    <TrendingUp size={16} />
  </span>
  );
};

export default PMCHeadExecutiveShell;
