import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  Lightbulb,
  Minus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import type { ProjectDatesRecord } from '../../services/api';
import type { BottleneckItem } from '../../utils/bottleneck';
import type { ProjectHealthTone } from '../../utils/projectDashboardMetrics';
import {
  buildExecutiveDecisionPack,
  type ActionableKpi,
  type AiInsightItem,
  type PriorityAction,
  type RiskHeatCell,
  type UrgencyLevel,
} from '../../utils/executiveDecisionInsights';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';
import type { ExecutiveOverviewAnchor } from '../../utils/executiveOverviewNavigation';
import type { PMCExecutiveTab } from './PMCHeadExecutiveShell';
import { ModalPortal } from '../ModalPortal';

type MetricsBag = {
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
};

interface PMCExecutiveDecisionDashboardProps {
  projectTitle: string;
  metrics: MetricsBag;
  openIssuesCount: number;
  sclDates?: ProjectDatesRecord | null;
  contractorDates?: ProjectDatesRecord | null;
  bottleneckItems?: BottleneckItem[];
  qualityPct?: number | null;
  decisionQueueTitles?: string[];
  onNavigate: (tab: PMCExecutiveTab, anchor?: ExecutiveOverviewAnchor) => void;
  onBriefReady?: (markdown: string) => void;
}

const statusSurface = (status: ActionableKpi['status'], isDark: boolean) => {
  if (status === 'critical') {
    return isDark
      ? 'border-rose-500/40 bg-rose-500/10'
      : 'border-rose-200 bg-rose-50/90';
  }
  if (status === 'watch') {
    return isDark
      ? 'border-amber-500/35 bg-amber-500/10'
      : 'border-amber-200 bg-amber-50/90';
  }
  if (status === 'good') {
    return isDark
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : 'border-emerald-200 bg-emerald-50/80';
  }
  return isDark ? 'border-white/10 bg-white/[0.06] backdrop-blur-sm' : 'border-cyan-100/70 bg-white/60 backdrop-blur-md';
};

const statusDot = (status: ActionableKpi['status']) => {
  if (status === 'critical') return 'bg-rose-500';
  if (status === 'watch') return 'bg-amber-500';
  if (status === 'good') return 'bg-emerald-500';
  return 'bg-slate-400';
};

const urgencyStyle = (urgency: UrgencyLevel, isDark: boolean) => {
  if (urgency === 'critical') {
    return isDark
      ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/35'
      : 'bg-rose-100 text-rose-800 ring-1 ring-rose-200';
  }
  if (urgency === 'high') {
    return isDark
      ? 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30'
      : 'bg-orange-100 text-orange-800 ring-1 ring-orange-200';
  }
  if (urgency === 'medium') {
    return isDark
      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
      : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200';
  }
  return isDark
    ? 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30'
    : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
};

const heatColor = (level: RiskHeatCell['level'], isDark: boolean) => {
  if (level === 0) return isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700';
  if (level === 1) return isDark ? 'bg-amber-500/25 text-amber-200' : 'bg-amber-100 text-amber-800';
  if (level === 2) return isDark ? 'bg-orange-500/30 text-orange-200' : 'bg-orange-100 text-orange-900';
  return isDark
    ? 'bg-rose-500/35 text-rose-100 pmc-critical-section-pulse-dark'
    : 'bg-rose-500 text-white pmc-critical-section-pulse';
};

const insightIcon = (item: AiInsightItem) => {
  if (item.category === 'positive') return <TrendingUp size={14} className="text-emerald-500" />;
  if (item.category === 'negative') return <TrendingDown size={14} className="text-rose-500" />;
  if (item.category === 'bottleneck') return <AlertTriangle size={14} className="text-amber-500" />;
  if (item.category === 'stagnant') return <Minus size={14} className="text-slate-500" />;
  return <CircleDot size={14} className="text-indigo-500" />;
};

const CardShell: React.FC<{
  children: React.ReactNode;
  className?: string;
  isDark: boolean;
}> = ({ children, className = '', isDark }) => (
  <div
    className={`rounded-2xl p-3.5 sm:p-4 ${
      isDark ? 'pmc360-glass-panel-dark' : 'pmc360-glass-panel-light'
    } ${className}`}
  >
    {children}
  </div>
);

const CardTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  isDark: boolean;
}> = ({ icon, title, subtitle, isDark }) => (
  <div className="mb-3 flex items-start gap-2.5">
    <span
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
        isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
      }`}
    >
      {icon}
    </span>
    <div className="min-w-0">
      <h3 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h3>
      {subtitle && (
        <p className={`mt-0.5 text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

const PMCExecutiveDecisionDashboard: React.FC<PMCExecutiveDecisionDashboardProps> = ({
  projectTitle,
  metrics,
  openIssuesCount,
  sclDates = null,
  contractorDates = null,
  bottleneckItems = [],
  qualityPct = null,
  decisionQueueTitles = [],
  onNavigate,
  onBriefReady,
}) => {
  const ex = usePmcExecutiveTheme();
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [showAiSuggest, setShowAiSuggest] = useState(false);

  const pack = useMemo(
    () =>
      buildExecutiveDecisionPack({
        projectTitle,
        projectHealth: metrics.projectHealth,
        overallProgressPct: metrics.overallProgressPct,
        progressDeltaLabel: metrics.progressDeltaLabel,
        summaryDelayDays: metrics.summaryDelayDays,
        sclDelayDays: metrics.sclDelayDays,
        contractorDelayDays: metrics.contractorDelayDays,
        criticalRisks: metrics.criticalRisks,
        openIssuesCount,
        openBottleneckCount: metrics.openBottleneckCount,
        healthSafetyLabel: metrics.healthSafetyLabel,
        drawingApprovalPct: metrics.drawingApprovalPct,
        cpiPct: metrics.cpiPct,
        contractValueLabel: metrics.contractValueLabel,
        sclDates,
        contractorDates,
        bottleneckItems,
        qualityPct,
        decisionQueueTitles,
      }),
    [
      projectTitle,
      metrics,
      openIssuesCount,
      sclDates,
      contractorDates,
      bottleneckItems,
      qualityPct,
      decisionQueueTitles,
    ],
  );

  useEffect(() => {
    onBriefReady?.(pack.briefMarkdown);
  }, [pack.briefMarkdown, onBriefReady]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAiSummary(false);
        setShowAiSuggest(false);
      }
    };
    if (showAiSummary || showAiSuggest) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    return undefined;
  }, [showAiSummary, showAiSuggest]);

  const go = (tab: PMCExecutiveTab, anchor?: string) => {
    setShowAiSummary(false);
    setShowAiSuggest(false);
    onNavigate(tab, anchor as ExecutiveOverviewAnchor | undefined);
  };

  const summaryTone =
    pack.summary.tone === 'bad'
      ? ex.isDark
        ? 'border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-[#0b1d36] to-[#0b1d36]'
        : 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-white'
      : pack.summary.tone === 'warn'
        ? ex.isDark
          ? 'border-amber-500/35 bg-gradient-to-br from-amber-500/10 via-[#0b1d36] to-[#0b1d36]'
          : 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white'
        : ex.isDark
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#0b1d36] to-[#0b1d36]'
          : 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white';

  const panelBg = ex.isDark ? 'bg-[#0b1d36] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200';

  return (
    <div className="space-y-3 sm:space-y-4" aria-label="Executive decision dashboard">
      {/* Prominent AI CTAs — always visible first */}
      <div
        className={`relative overflow-hidden rounded-xl border px-3.5 py-3 sm:px-4 sm:py-3.5 ${
          ex.isDark
            ? 'border-white/12 bg-[#161f2b]'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 sm:max-w-[46%]">
            <p
              className={`text-[10px] font-black uppercase tracking-[0.16em] ${
                ex.isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              AI decision support
            </p>
            <p className={`mt-0.5 truncate text-sm font-bold tracking-tight ${ex.isDark ? 'text-white' : 'text-slate-900'}`}>
              Leadership guidance on demand
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:w-auto sm:min-w-[22rem]">
            <button
              type="button"
              onClick={() => {
                setShowAiSuggest(false);
                setShowAiSummary(true);
              }}
              className={`pmc-ai-btn-summary inline-flex w-full items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition focus:outline-none focus-visible:ring-2 sm:text-xs ${
                ex.isDark
                  ? 'bg-cyan-600 hover:bg-cyan-500 focus-visible:ring-cyan-300/40'
                  : 'bg-[#1e3a5f] hover:bg-[#16304f] focus-visible:ring-slate-300'
              }`}
            >
              <Sparkles size={15} strokeWidth={2.3} className="shrink-0" />
              AI Executive Summary
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAiSummary(false);
                setShowAiSuggest(true);
              }}
              className={`pmc-ai-btn-suggest inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide shadow-sm transition focus:outline-none focus-visible:ring-2 sm:text-xs ${
                ex.isDark
                  ? 'border-white/15 bg-white/8 text-white hover:bg-white/12 focus-visible:ring-cyan-300/30'
                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-300'
              }`}
            >
              <Lightbulb size={15} strokeWidth={2.3} className="shrink-0" />
              AI Suggest
            </button>
          </div>
        </div>
      </div>

      {/* Popup: AI Executive Summary */}
      <ModalPortal open={showAiSummary}>
        <div
          className="fixed inset-0 z-[9990] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setShowAiSummary(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AI Executive Summary"
            className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:rounded-2xl ${panelBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5 ${ex.isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                  <Sparkles size={18} />
                </span>
                <div className="min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${ex.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    AI Executive Summary
                  </p>
                  <h2 className="mt-1 text-base font-black leading-snug sm:text-lg">{pack.summary.headline}</h2>
                  <p className={`mt-1 text-xs font-semibold ${ex.isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {pack.summary.healthLine}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiSummary(false)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold uppercase ${
                  ex.isDark ? 'border-white/15 hover:bg-white/10' : 'border-slate-200 hover:bg-slate-50'
                }`}
                aria-label="Close"
              >
                <X size={14} />
                Close
              </button>
            </div>
            <div className={`min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 ${summaryTone}`}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  { title: 'Why delayed', items: pack.summary.delayReasons },
                  { title: 'Major risks', items: pack.summary.majorRisks },
                  { title: 'Recommended actions', items: pack.summary.recommendedActions },
                ].map((col) => (
                  <div
                    key={col.title}
                    className={`rounded-xl border px-3 py-2.5 ${
                      ex.isDark ? 'border-white/10 bg-black/20' : 'border-slate-200/80 bg-white/80'
                    }`}
                  >
                    <p className={`text-[10px] font-black uppercase tracking-wide ${ex.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {col.title}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {col.items.slice(0, 3).map((item) => (
                        <li key={item} className={`flex gap-2 text-[11px] font-medium leading-snug ${ex.isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Popup: AI Suggest */}
      <ModalPortal open={showAiSuggest}>
        <div
          className="fixed inset-0 z-[9990] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setShowAiSuggest(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AI Suggest"
            className={`flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200 sm:rounded-2xl ${panelBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5 ${ex.isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
                  <Lightbulb size={18} />
                </span>
                <div className="min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${ex.isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                    AI Suggest
                  </p>
                  <p className="text-sm font-black sm:text-base">KPIs · insights · priorities · forecast</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiSuggest(false)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold uppercase ${
                  ex.isDark ? 'border-white/15 hover:bg-white/10' : 'border-slate-200 hover:bg-slate-50'
                }`}
                aria-label="Close"
              >
                <X size={14} />
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4">
      {/* 2. Actionable KPIs */}
      <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {pack.kpis.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            onClick={() => go(kpi.tab, kpi.anchor)}
            className={`group rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${statusSurface(
              kpi.status,
              ex.isDark,
            )}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${ex.label}`}>
                {kpi.label}
              </span>
              <span className={`h-2 w-2 rounded-full ${statusDot(kpi.status)}`} aria-hidden />
            </div>
            <p
              className={`mt-2 text-xl font-black tabular-nums leading-none ${
                ex.isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {kpi.value}
            </p>
            <p className={`mt-2 text-[10px] font-semibold ${ex.isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {kpi.trend}
            </p>
            <p className={`mt-1 text-[10px] font-medium ${ex.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Impact: {kpi.impact}
            </p>
            <span
              className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-70 transition group-hover:opacity-100 ${
                ex.isDark ? 'text-indigo-300' : 'text-indigo-600'
              }`}
            >
              Drill down <ArrowRight size={11} />
            </span>
          </button>
        ))}
      </div>

      {/* 3–5: Insights · Priorities · Forecast */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <CardShell isDark={ex.isDark} className="xl:col-span-4">
          <CardTitle
            icon={<Lightbulb size={16} />}
            title="AI Insights"
            subtitle="Trends, bottlenecks & shifts"
            isDark={ex.isDark}
          />
          <ul className="space-y-2">
            {pack.insights.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border px-3 py-2.5 ${
                  ex.isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-2">
                  {insightIcon(item)}
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${ex.isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.title}
                    </p>
                    <p className={`mt-0.5 text-[11px] leading-snug ${ex.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.detail}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardShell>

        <CardShell isDark={ex.isDark} className="xl:col-span-4">
          <CardTitle
            icon={<Zap size={16} />}
            title="Today's Priority Actions"
            subtitle="Ranked by urgency"
            isDark={ex.isDark}
          />
          <ul className="space-y-2">
            {pack.priorities.map((item: PriorityAction, idx) => (
              <li
                key={item.id}
                className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${
                  item.urgency === 'critical'
                    ? ex.isDark
                      ? 'border-rose-500/35 bg-rose-500/10'
                      : 'border-rose-200 bg-rose-50'
                    : ex.isDark
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-slate-100 bg-slate-50/80'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black tabular-nums text-slate-400">
                      #{idx + 1}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${urgencyStyle(
                        item.urgency,
                        ex.isDark,
                      )}`}
                    >
                      {item.urgency}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs font-bold ${ex.isDark ? 'text-white' : 'text-slate-900'}`}>
                    {item.title}
                  </p>
                  <p className={`text-[11px] ${ex.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {item.reason}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => go(item.tab)}
                  className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                    ex.isDark
                      ? 'bg-white/10 text-white hover:bg-white/15'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {item.actionLabel}
                  <ArrowRight size={11} />
                </button>
              </li>
            ))}
          </ul>
        </CardShell>

        <CardShell isDark={ex.isDark} className="xl:col-span-4">
          <CardTitle
            icon={<Target size={16} />}
            title="Project Forecast"
            subtitle="Predictive completion outlook"
            isDark={ex.isDark}
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: 'On-time probability',
                value: `${pack.forecast.onTimeProbabilityPct}%`,
                warn: pack.forecast.onTimeProbabilityPct < 50,
              },
              {
                label: 'Expected completion',
                value: pack.forecast.expectedCompletionLabel,
                warn: false,
              },
              {
                label: 'Forecast delay',
                value: `${pack.forecast.forecastDelayDays}d`,
                warn: pack.forecast.forecastDelayDays > 0,
              },
              {
                label: 'Confidence',
                value: `${pack.forecast.confidencePct}%`,
                warn: pack.forecast.confidencePct < 60,
              },
            ].map((m) => (
              <div
                key={m.label}
                className={`rounded-xl border px-2.5 py-2 ${
                  m.warn
                    ? ex.isDark
                      ? 'border-rose-500/30 bg-rose-500/10'
                      : 'border-rose-200 bg-rose-50'
                    : ex.isDark
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-slate-100 bg-slate-50'
                }`}
              >
                <p className={`text-[9px] font-bold uppercase tracking-wide ${ex.label}`}>{m.label}</p>
                <p
                  className={`mt-1 text-sm font-black tabular-nums ${
                    m.warn
                      ? ex.isDark
                        ? 'text-rose-300'
                        : 'text-rose-700'
                      : ex.isDark
                        ? 'text-white'
                        : 'text-slate-900'
                  }`}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
          <p className={`mt-3 text-[11px] leading-snug ${ex.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {pack.forecast.narrative}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                pack.forecast.onTimeProbabilityPct >= 70
                  ? 'bg-emerald-500'
                  : pack.forecast.onTimeProbabilityPct >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
              }`}
              style={{ width: `${pack.forecast.onTimeProbabilityPct}%` }}
            />
          </div>
        </CardShell>
      </div>

      {/* 6–8: Risk heat · Delay contributors · Change timeline */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <CardShell isDark={ex.isDark} className="lg:col-span-4">
          <CardTitle
            icon={<AlertTriangle size={16} />}
            title="Risk Heat Map"
            subtitle="By executive domain"
            isDark={ex.isDark}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {pack.riskHeat.map((cell) => (
              <button
                key={cell.category}
                type="button"
                onClick={() => go('risk', 'risk')}
                className={`rounded-xl px-2.5 py-3 text-left transition hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${heatColor(
                  cell.level,
                  ex.isDark,
                )}`}
              >
                <p className="text-[10px] font-black uppercase tracking-wide opacity-90">
                  {cell.category}
                </p>
                <p className="mt-1 text-sm font-black">{cell.label}</p>
                <p className="mt-0.5 text-[10px] font-semibold opacity-80">{cell.count} signal(s)</p>
              </button>
            ))}
          </div>
        </CardShell>

        <CardShell isDark={ex.isDark} className="lg:col-span-4">
          <CardTitle
            icon={<TrendingDown size={16} />}
            title="Top Delay Contributors"
            subtitle="Impact share of schedule slip"
            isDark={ex.isDark}
          />
          <ul className="space-y-3">
            {pack.delayContributors.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => go(row.tab)}
                  className="w-full text-left"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${ex.isDark ? 'text-white' : 'text-slate-900'}`}>
                      {row.label}
                    </span>
                    <span className={`text-[11px] font-black tabular-nums ${ex.isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                      {row.days}d · {row.impactPct}%
                    </span>
                  </div>
                  <div className={`h-2 overflow-hidden rounded-full ${ex.isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                      style={{ width: `${Math.max(4, row.impactPct)}%` }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </CardShell>

        <CardShell isDark={ex.isDark} className="lg:col-span-4">
          <CardTitle
            icon={<CircleDot size={16} />}
            title="What's Changed"
            subtitle="Since last review"
            isDark={ex.isDark}
          />
          <ol className="relative space-y-0 border-l border-dashed pl-4 ml-1.5">
            {pack.changes.map((item) => (
              <li key={item.id} className="relative pb-3 last:pb-0">
                <span
                  className={`absolute -left-[1.3rem] top-1 flex h-5 w-5 items-center justify-center rounded-full ${
                    item.direction === 'improved'
                      ? 'bg-emerald-500 text-white'
                      : item.direction === 'regressed'
                        ? 'bg-rose-500 text-white'
                        : ex.isDark
                          ? 'bg-slate-600 text-white'
                          : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {item.direction === 'improved' ? (
                    <ArrowUpRight size={11} />
                  ) : item.direction === 'regressed' ? (
                    <ArrowDownRight size={11} />
                  ) : (
                    <Minus size={11} />
                  )}
                </span>
                <p className={`text-xs font-bold ${ex.isDark ? 'text-white' : 'text-slate-900'}`}>
                  {item.title}
                </p>
                <p className={`text-[11px] ${ex.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item.detail}
                </p>
              </li>
            ))}
          </ol>
        </CardShell>
      </div>

      {/* 10. AI Recommendation panel */}
      <CardShell isDark={ex.isDark}>
        <CardTitle
          icon={<CheckCircle2 size={16} />}
          title="AI Recommendations"
          subtitle="Next best actions · expected recovery · confidence"
          isDark={ex.isDark}
        />
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {pack.recommendations.map((rec, idx) => (
            <button
              key={rec.id}
              type="button"
              onClick={() => go(rec.tab)}
              className={`rounded-xl border p-3 text-left transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                ex.isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/90'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${urgencyStyle(
                    rec.priority,
                    ex.isDark,
                  )}`}
                >
                  P{idx + 1} · {rec.priority}
                </span>
                <span className={`text-[10px] font-bold tabular-nums ${ex.isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  {rec.confidencePct}% conf.
                </span>
              </div>
              <p className={`mt-2 text-xs font-bold leading-snug ${ex.isDark ? 'text-white' : 'text-slate-900'}`}>
                {rec.action}
              </p>
              <p className={`mt-1.5 text-[11px] leading-snug ${ex.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Impact: {rec.expectedImpact}
              </p>
            </button>
          ))}
        </div>
      </CardShell>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default PMCExecutiveDecisionDashboard;
