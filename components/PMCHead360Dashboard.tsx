import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Download,
  Factory,
  FileText,
  Filter,
  HelpCircle,
  Landmark,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  TrainFront,
  Trash2,
  Trees,
  UserRound,
  X,
} from 'lucide-react';
import { DPR, Project, User } from '../types';
import { ROLE_LABELS } from '../constants';
import TutorialVideosPanel from './tutorialVideos/TutorialVideosPanel';
import TutorialWatchButton from './tutorialVideos/TutorialWatchButton';
import { useTheme, getThemeClasses } from '../utils/theme';
import { getPmcExecutiveTheme } from '../utils/pmcExecutiveTheme';
import type { HealthLabel, ProjectVital, ProjectVitalsCard, VitalStatus } from '../utils/projectVitals';
import { formatHealthLabelDisplay } from '../utils/projectVitals';
import {
  formatCompletedBillingLabel,
  normalizeBillingStatus,
} from '../utils/projectCompletion';
import {
  buildPortfolioSummary,
  PORTFOLIO_SCORE_FORMULAS,
  SCORE_COLORS,
  scoreToAccent,
} from '../utils/projectVitals';
import {
  downloadPmcHead360CompareExcel,
  pmcHead360CompareFilename,
} from '../utils/pmcHead360CompareExport';
import {
  getApiErrorMessage,
  mergeOverviewCardsWithLiveProjects,
} from '../services/projectOverviewService';
import { projectApi } from '../services/api';
import { canDeleteProjectSite } from '../utils/userManagementAccess';
import { sanitizeProjectDisplayName } from '../utils/hseSiteEngineerProjects';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { isAbortError } from '../utils/isAbortError';
import {
  useOverviewCards,
  useOverviewLoading,
  useProjectStoreError,
} from '../hooks/useProjectStore';
import { projectStore } from '../stores/projectStore';
import SiteDeleteDialog, { type SiteDeleteDependency } from './SiteDeleteDialog';
import { parseSiteDeleteDependencies } from './ProjectSiteList';
import axios from 'axios';

interface PMCHead360DashboardProps {
  user: User;
  projects: Project[];
  dprs: DPR[];
  onViewProject: (id: string) => void;
  /** Navigate to Initialize Project (sidebar `project_init`). */
  onInitializeProject?: () => void;
  /** Called after a project is deleted from the 360 grid (keeps App portfolio in sync). */
  onProjectDeleted?: (projectId: string) => void;
}

function healthTone(label: HealthLabel): string {
  switch (label) {
    case 'CRITICAL':
      return SCORE_COLORS.critical;
    case 'AT RISK':
    case 'WATCH':
      return SCORE_COLORS.watch;
    case 'ON TRACK':
    case 'COMPLETED':
      return SCORE_COLORS.healthy;
    case 'NO DATA':
    default:
      return SCORE_COLORS.unknown;
  }
}

function vitalPct(card: ProjectVitalsCard, key: ProjectVitalsCard['vitals'][number]['key']): number | null {
  return card.vitals.find((v) => v.key === key)?.percent ?? null;
}

/** Theme-safe filter dropdown — avoids native &lt;select&gt; white flash on dark Windows UI. */
const ThemeFilterSelect: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  isDark: boolean;
  ariaLabel: string;
  className?: string;
}> = ({ value, options, onChange, isDark, ariaLabel, className = '' }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl px-3 pr-2.5 text-left text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-blue-500/30 sm:text-sm ${
          isDark
            ? 'pmc360-glass-input-dark text-slate-100 hover:border-cyan-400/35'
            : 'pmc360-glass-input-light text-slate-700 hover:border-slate-400'
        }`}
      >
        <span className="truncate">{selected}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        />
      </button>
      {open && (
        <ul
          className={`absolute right-0 z-50 mt-1.5 max-h-56 min-w-full overflow-y-auto rounded-xl py-1 ${
            isDark
              ? 'pmc360-glass-panel-dark text-slate-100'
              : 'pmc360-glass-panel-light text-slate-700'
          }`}
          role="listbox"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full truncate px-3 py-2 text-left text-xs font-semibold transition-colors sm:text-sm ${
                    active
                      ? isDark
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-blue-50 text-blue-700'
                      : isDark
                        ? 'hover:bg-white/10'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/** Semi-circular portfolio gauge with animated arc. */
const BriefingGauge: React.FC<{ score: number | null; isDark: boolean }> = ({ score, isDark }) => {
  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = Math.PI * r;
  const pct = score == null ? 0 : Math.min(100, Math.max(0, score));
  const offset = c - (pct / 100) * c;
  const accent = scoreToAccent(score);

  return (
    <div className="relative mx-auto flex w-full max-w-[200px] flex-col items-center">
      <svg width={size} height={size / 2 + 18} viewBox={`0 0 ${size} ${size / 2 + 18}`} className="overflow-visible">
        <defs>
          <linearGradient id="briefingGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={SCORE_COLORS.critical} />
            <stop offset="45%" stopColor={SCORE_COLORS.watch} />
            <stop offset="100%" stopColor={SCORE_COLORS.healthy} />
          </linearGradient>
          <filter id="gaugeGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          stroke="url(#briefingGaugeGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          filter="url(#gaugeGlow)"
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="-mt-10 flex flex-col items-center">
        <p className="text-3xl font-black tabular-nums leading-none" style={{ color: accent }}>
          {score ?? '—'}
          {score != null && (
            <span className={`text-base font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>/100</span>
          )}
        </p>
        <p className={`mt-1 text-[10px] font-black uppercase tracking-[0.16em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Portfolio Score
        </p>
        <p className={`mt-1 max-w-[11rem] text-center text-[9px] font-semibold leading-snug ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Average health of all projects with a live score
        </p>
      </div>
    </div>
  );
};

const KpiStatCard: React.FC<{
  label: string;
  value: number | string;
  hint: string;
  color: string;
  isDark: boolean;
  delayMs?: number;
}> = ({ label, value, hint, color, isDark, delayMs = 0 }) => (
  <div
    className={`group flex min-h-[7rem] flex-col justify-between rounded-2xl p-4 transition-all duration-500 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-2 ${
      isDark ? 'pmc360-glass-dark' : 'pmc360-glass-light'
    }`}
    style={{ animationDelay: `${delayMs}ms`, animationFillMode: 'both' }}
  >
    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
      {label}
    </p>
    <p
      className="text-3xl font-black tabular-nums leading-none transition-transform duration-300 group-hover:scale-105 sm:text-4xl"
      style={{ color }}
    >
      {value}
    </p>
    <p
      className={`mt-1 text-[10px] font-semibold leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
    >
      {hint}
    </p>
  </div>
);

function statusTone(status: VitalStatus): string {
  switch (status) {
    case 'healthy':
      return SCORE_COLORS.healthy;
    case 'watch':
      return SCORE_COLORS.watch;
    case 'critical':
      return SCORE_COLORS.critical;
    default:
      return SCORE_COLORS.unknown;
  }
}

function statusWord(status: VitalStatus, key: 'time' | 'cost' | 'quality' | 'safety'): string {
  if (status === 'unknown') return 'No Data';
  if (key === 'safety' || key === 'quality') {
    if (status === 'healthy') return 'Excellent';
    if (status === 'watch') return 'Watch';
    return 'Delay';
  }
  if (key === 'time') {
    if (status === 'healthy') return 'On Track';
    if (status === 'watch') return 'Watch';
    return 'Critical';
  }
  // cost
  if (status === 'healthy') return 'Excellent';
  if (status === 'watch') return 'Watch';
  return 'Delay';
}

function projectTypeIcon(title: string) {
  const t = title.toLowerCase();
  if (/\b(rob|bridge|flyover|lane)\b/.test(t)) return Landmark;
  if (/\b(metro|mmrcl|transit|station)\b/.test(t)) return TrainFront;
  if (/\b(park|promenade|sagar|fox)\b/.test(t)) return Trees;
  if (/\b(pkg|package|industrial|plant)\b/.test(t)) return Factory;
  if (/\b(building|tower|center|centre|multiplex|avissa|shivalik)\b/.test(t)) return Building2;
  return Building2;
}

function vitalOf(card: ProjectVitalsCard, key: ProjectVital['key']): ProjectVital | undefined {
  return card.vitals.find((v) => v.key === key);
}

const KpiStatusCell: React.FC<{
  label: string;
  vital: ProjectVital | undefined;
  kind: 'time' | 'cost' | 'quality' | 'safety';
  isDark: boolean;
}> = ({ label, vital, kind, isDark }) => {
  const status = vital?.status ?? 'unknown';
  const color = statusTone(status);
  const word = (vital?.statusLabel && vital.statusLabel.trim()) || statusWord(status, kind);
  return (
    <div className="min-w-0 text-center">
      <p className={`text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </p>
      <div className="mt-1 flex items-center justify-center gap-1">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-[10px] font-bold" style={{ color }}>
          {word}
        </span>
      </div>
      <p className={`mt-0.5 text-[9px] font-semibold tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {vital?.percent == null ? '—' : `${vital.percent}%`}
      </p>
    </div>
  );
};

const ProjectGridCard: React.FC<{
  card: ProjectVitalsCard;
  selected: boolean;
  isDark: boolean;
  index: number;
  onOpen: () => void;
  onToggleCompare: () => void;
  compareDisabled: boolean;
  canDelete?: boolean;
  onDelete?: () => void;
}> = ({
  card,
  selected,
  isDark,
  index,
  onOpen,
  onToggleCompare,
  compareDisabled,
  canDelete = false,
  onDelete,
}) => {
  const tone = healthTone(card.healthLabel);
  const TypeIcon = projectTypeIcon(card.title);
  const schedule = vitalOf(card, 'schedule');
  const budget = vitalOf(card, 'budget');
  const safety = vitalOf(card, 'safety');
  const quality =
    vitalOf(card, 'drawings')?.percent != null || vitalOf(card, 'drawings')?.statusLabel
      ? vitalOf(card, 'drawings')
      : vitalOf(card, 'compliance');
  const progress = card.progressPct;
  const progressTone = scoreToAccent(progress);
  const score = card.overallScore;
  const circumference = 2 * Math.PI * 18;
  const scoreDash =
    score == null ? 0 : (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const compareBlocked = card.compareEnabled === false || (compareDisabled && !selected);

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 ${
        isDark ? 'pmc360-glass-dark' : 'pmc360-glass-light'
      } ${selected ? (isDark ? 'ring-2 ring-cyan-400/50' : 'ring-2 ring-cyan-500/35 ring-offset-1 ring-offset-transparent') : ''}`}
      style={{
        animationDelay: `${Math.min(index, 12) * 35}ms`,
        animationFillMode: 'both',
        borderTopWidth: 3,
        borderTopColor: tone,
      }}
    >
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Header: icon + title/client + score ring */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isDark
                ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25'
                : 'bg-cyan-50/80 text-cyan-800 ring-1 ring-cyan-200/70'
            }`}
          >
            <TypeIcon size={20} strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={`line-clamp-2 text-[13px] font-black leading-snug sm:text-sm ${
                isDark ? 'text-slate-50' : 'text-slate-900'
              }`}
            >
              {card.title}
            </h3>
            <p className={`mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {card.client && card.client !== '—' ? card.client : 'Client TBD'}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide backdrop-blur-sm ${
                  isDark ? 'border-white/20 bg-white/10' : 'border-white/60 bg-white/55'
                }`}
                style={{ color: tone, borderColor: `${tone}55` }}
                title="Project health status from overview API"
              >
                {card.projectStatusLabel || formatHealthLabelDisplay(card.healthLabel)}
              </span>
              {card.isCompleted && (
                <>
                  <span
                    className={`inline-flex max-w-full rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                      (normalizeBillingStatus(card.billingStatus) ?? 'Pending') === 'Completed'
                        ? isDark
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : isDark
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                    title={formatCompletedBillingLabel(card.billingStatus)}
                  >
                    {formatCompletedBillingLabel(card.billingStatus)}
                  </span>
                  {card.completedAt && (
                    <span className={`text-[9px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {new Date(card.completedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  {card.completedBy && (
                    <span className={`text-[9px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      · {card.completedBy}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90" aria-hidden>
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                strokeWidth="3.5"
                className={isDark ? 'stroke-white/10' : 'stroke-slate-100'}
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                strokeWidth="3.5"
                stroke={tone}
                strokeLinecap="round"
                strokeDasharray={`${scoreDash} ${circumference}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-black tabular-nums leading-none" style={{ color: tone }}>
                {score ?? '—'}
              </span>
              <span className={`text-[7px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                /100
              </span>
            </div>
          </div>
        </div>

        {/* Overview Progress — from GET /api/projects/overview/ → progress.percentage */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className={`text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Overview Progress
            </span>
            <span
              className="text-[11px] font-black tabular-nums"
              style={{ color: progress == null ? (isDark ? '#94a3b8' : '#64748b') : progressTone }}
            >
              {progress == null ? '—' : `${Number(progress).toFixed(1)}%`}
            </span>
          </div>
          <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress == null ? 0 : Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: progress == null ? 'transparent' : progressTone,
              }}
            />
          </div>
        </div>

        {/* KPI status row */}
        <div
          className={`grid grid-cols-4 gap-1 rounded-xl px-1 py-2 ${
            isDark ? 'bg-white/[0.03]' : 'bg-slate-50/80'
          }`}
        >
          <KpiStatusCell label="Time" vital={schedule} kind="time" isDark={isDark} />
          <KpiStatusCell label="Cost" vital={budget} kind="cost" isDark={isDark} />
          <KpiStatusCell label="Quality" vital={quality} kind="quality" isDark={isDark} />
          <KpiStatusCell label="Safety" vital={safety} kind="safety" isDark={isDark} />
        </div>

        {/* Meta */}
        <div
          className={`grid grid-cols-3 gap-2 text-[10px] font-semibold ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <span className="inline-flex min-w-0 items-center gap-1">
            <UserRound size={11} className="shrink-0 opacity-70" />
            <span className="truncate">{card.pmName}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin size={11} className="shrink-0 opacity-70" />
            <span className="truncate">{card.location || '—'}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <ClipboardList size={11} className="shrink-0 opacity-70" />
            <span className="truncate">{card.lastUpdate.replace(/^Last update:\s*/i, '')}</span>
          </span>
        </div>

        {/* Footer */}
        <div
          className={`mt-auto flex items-center gap-2 border-t pt-3 ${
            isDark ? 'border-white/10' : 'border-slate-100'
          }`}
        >
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black tabular-nums ${
              card.openIssues > 0
                ? isDark
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-rose-50 text-rose-600'
                : isDark
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-emerald-50 text-emerald-700'
            }`}
            title="Open critical risks from bottleneck register"
          >
            {card.openIssues} issue{card.openIssues === 1 ? '' : 's'}
          </span>
          <span
            className={`text-[9px] font-bold tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            title="DPR reports logged for this project"
          >
            {card.dprCount} DPR{card.dprCount === 1 ? '' : 's'}
            {card.drawingApprovalPct != null ? ` · Drawings ${card.drawingApprovalPct}%` : ''}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {canDelete && !card.isCompleted && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={`rounded-lg border p-1.5 transition-all ${
                  isDark
                    ? 'border-rose-500/40 bg-rose-600/15 text-rose-300 hover:bg-rose-600/30'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
                title="Delete project"
                aria-label={`Delete ${card.title}`}
              >
                <Trash2 size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleCompare}
              disabled={compareBlocked}
              title={
                card.compareEnabled === false
                  ? 'Comparison is not available for this project'
                  : undefined
              }
              className={`rounded-lg border px-2 py-1.5 text-[9px] font-black uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                selected
                  ? isDark
                    ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200'
                    : 'border-cyan-500 bg-cyan-600 text-white'
                  : isDark
                    ? 'border-white/15 text-slate-300 hover:bg-white/5'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {selected ? 'Added' : 'Compare'}
            </button>
            <button
              type="button"
              onClick={onOpen}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide transition-all ${
                isDark
                  ? 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              View
              <ArrowRight size={11} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

/** Trailing grid tile — opens Initialize Project. */
const InitializeProjectGridCard: React.FC<{
  isDark: boolean;
  onClick: () => void;
}> = ({ isDark, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex h-full min-h-[14rem] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-6 text-center transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${
      isDark
        ? 'border-cyan-400/45 bg-cyan-500/10 backdrop-blur-md hover:border-cyan-300/60 hover:bg-cyan-500/15'
        : 'border-cyan-400/50 bg-cyan-50/45 backdrop-blur-md hover:border-cyan-500/70 hover:bg-cyan-50/70'
    }`}
    aria-label="Initialize Project — create a new project"
  >
    <span
      className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-105 ${
        isDark
          ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
          : 'border-cyan-300/70 bg-white/50 text-cyan-800'
      }`}
    >
      <Plus size={28} strokeWidth={2.4} />
    </span>
    <div className="max-w-[14rem] space-y-1">
      <p
        className={`text-sm font-black uppercase tracking-wide ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}
      >
        Create new project
      </p>
      <p
        className={`text-[11px] font-semibold leading-snug ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        Click to open Initialize Project and set up a new site in the portfolio.
      </p>
    </div>
    <span
      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
        isDark
          ? 'bg-cyan-500/15 text-cyan-200'
          : 'bg-cyan-600/90 text-white backdrop-blur-sm'
      }`}
    >
      Initialize Project
      <ArrowRight size={12} strokeWidth={2.4} />
    </span>
  </button>
);

const CompareMiniBar: React.FC<{ label: string; value: number | null; color: string; isDark: boolean }> = ({
  label,
  value,
  color,
  isDark,
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wide">
      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
      <span className="tabular-nums" style={{ color: value == null ? '#94a3b8' : color }}>
        {value == null ? '—' : `${value}%`}
      </span>
    </div>
    <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{
          width: `${value == null ? 0 : Math.min(100, value)}%`,
          backgroundColor: color,
          boxShadow: value != null ? `0 0 8px ${color}66` : undefined,
        }}
      />
    </div>
  </div>
);

const PMCHead360Dashboard: React.FC<PMCHead360DashboardProps> = ({
  user,
  projects,
  dprs: _dprs,
  onViewProject,
  onInitializeProject,
  onProjectDeleted,
}) => {
  void _dprs;
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const ex = getPmcExecutiveTheme(isDarkTheme);
  const canDelete = canDeleteProjectSite(user);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [regionFilter, setRegionFilter] = useState('all');
  const [pmFilter, setPmFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  /** all | pending | completed — completed projects by billing_status */
  const [billingFilter, setBillingFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [ordering, setOrdering] = useState('name');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isExportingCompare, setIsExportingCompare] = useState(false);
  const [showScoreFormulas, setShowScoreFormulas] = useState(false);
  const [showCardGuide, setShowCardGuide] = useState(false);

  const overviewCards = useOverviewCards();
  const isLoadingVitals = useOverviewLoading();
  const loadError = useProjectStoreError();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const forceOverviewRefreshRef = useRef(false);

  const [deleteTarget, setDeleteTarget] = useState<ProjectVitalsCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDeps, setDeleteDeps] = useState<SiteDeleteDependency[]>([]);
  const [deleteDepError, setDeleteDepError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const force = forceOverviewRefreshRef.current;
    forceOverviewRefreshRef.current = false;

    const load = async () => {
      try {
        await projectStore.loadOverview(
          force,
          {
            search: debouncedSearch || undefined,
            ordering: ordering || undefined,
            client: clientFilter,
            billingFilter,
          },
          { signal: controller.signal },
        );
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        console.error('Failed to load project overview:', error);
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, [user.id, debouncedSearch, ordering, clientFilter, billingFilter, refreshNonce]);

  const allCards = useMemo(
    () => mergeOverviewCardsWithLiveProjects(overviewCards, projects),
    [overviewCards, projects],
  );

  const handleForceRefresh = () => {
    if (isLoadingVitals) return;
    forceOverviewRefreshRef.current = true;
    setRefreshNonce((n) => n + 1);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
    setDeleteDeps([]);
    setDeleteDepError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    setDeleteDeps([]);
    setDeleteDepError(null);

    try {
      await projectApi.deleteProject(deleteTarget.projectId);
      const deletedId = String(deleteTarget.projectId);
      setDeleteTarget(null);
      projectStore.removeProject(deletedId);
      setCompareIds((prev) => prev.filter((id) => id !== deletedId));
      onProjectDeleted?.(deletedId);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const data = err.response.data;
        if (status === 400) {
          setDeleteDeps(parseSiteDeleteDependencies(data));
          setDeleteDepError(
            getApiErrorMessage(
              err,
              'This project cannot be deleted because it is referenced by existing records.',
            ),
          );
          return;
        }
        if (status === 403) {
          setDeleteError('You do not have permission to delete this project.');
          return;
        }
        if (status === 404) {
          const deletedId = String(deleteTarget.projectId);
          setDeleteTarget(null);
          projectStore.removeProject(deletedId);
          onProjectDeleted?.(deletedId);
          return;
        }
        setDeleteError(getApiErrorMessage(err, 'Failed to delete project.'));
        return;
      }
      setDeleteError(getApiErrorMessage(err, 'Failed to delete project.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const regions = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          [
            ...projects.map((p) => p.location),
            ...allCards.map((c) => c.location),
          ].filter((loc) => Boolean(loc) && loc !== '—'),
        ),
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    ],
    [projects, allCards],
  );

  const clients = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          [
            ...projects.map((p) => p.client),
            ...allCards.map((c) => c.client),
          ].filter((c) => Boolean(c) && c !== '—'),
        ),
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    ],
    [projects, allCards],
  );

  const pms = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          allCards
            .map((c) => c.pmName)
            .filter((n) => n && n !== 'Unassigned' && n !== 'Not Assigned'),
        ),
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    ],
    [allCards],
  );

  const filteredCards = useMemo(() => {
    return allCards.filter((c) => {
      if (regionFilter !== 'all' && c.location !== regionFilter) return false;
      if (pmFilter !== 'all' && c.pmName !== pmFilter) return false;
      if (billingFilter !== 'all') {
        if (!c.isCompleted) return false;
        const billing = normalizeBillingStatus(c.billingStatus) ?? 'Pending';
        if (billingFilter === 'pending' && billing !== 'Pending') return false;
        if (billingFilter === 'completed' && billing !== 'Completed') return false;
      }
      return true;
    });
  }, [allCards, regionFilter, pmFilter, billingFilter]);

  const portfolio = useMemo(() => buildPortfolioSummary(filteredCards), [filteredCards]);

  const healthCounts = useMemo(() => {
    let critical = 0;
    let atRisk = 0;
    let onTrack = 0;
    let newOrNoData = 0;
    filteredCards.forEach((card) => {
      // Prefer backend project_status. New / no-data projects count as On Track
      // so clients do not confuse empty new sites with delayed / unsafe sites.
      switch (card.healthLabel) {
        case 'CRITICAL':
          critical += 1;
          break;
        case 'AT RISK':
        case 'WATCH':
          atRisk += 1;
          break;
        case 'ON TRACK':
        case 'COMPLETED':
          onTrack += 1;
          break;
        case 'NO DATA':
          newOrNoData += 1;
          onTrack += 1;
          break;
        default:
          break;
      }
    });
    return { critical, atRisk, onTrack, newOrNoData };
  }, [filteredCards]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [],
  );

  const toggleCompare = (id: string) => {
    const card = allCards.find((c) => c.projectId === id);
    if (card && card.compareEnabled === false) return;
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const compareCards = compareIds
    .map((id) => allCards.find((c) => c.projectId === id))
    .filter((c): c is ProjectVitalsCard => Boolean(c));

  const handleExport = async () => {
    if (compareCards.length === 0) return;
    setIsExportingCompare(true);
    try {
      await downloadPmcHead360CompareExcel(compareCards, pmcHead360CompareFilename());
    } catch (error) {
      console.error('Compare export failed:', error);
      window.alert('Failed to export comparison. Please try again.');
    } finally {
      setIsExportingCompare(false);
    }
  };

  const liveBadgeLabel = isLoadingVitals
    ? 'Loading project overview…'
    : `Live · ${portfolio.projectsWithScore}/${portfolio.projectsTotal} scored`;

  if (!isLoadingVitals && !loadError && allCards.length === 0 && !debouncedSearch && clientFilter === 'all') {
    return (
      <div
        className={`flex min-h-[400px] flex-col items-center justify-center rounded-3xl p-8 text-center ${
          isDarkTheme ? 'pmc360-glass-panel-dark' : 'pmc360-glass-panel-light'
        }`}
      >
        <FileText className={`mb-4 ${themeClasses.textMuted}`} size={48} />
        <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
          No Projects Yet
        </h3>
        <p className={`mt-2 max-w-md text-sm ${themeClasses.textSecondary}`}>
          Create projects in Portfolio to see the 360° overview here.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in space-y-4 pb-36 duration-500 sm:pb-40">
      {/* Header — construction hero */}
      <div className="pmc360-hero">
        <div
          className="pmc360-hero-photo"
          style={{
            backgroundImage: isDarkTheme
              ? 'url(/images/construction-bg.jpg)'
              : 'url(/images/construction-cranes-bg.jpg)',
          }}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute inset-0 ${
            isDarkTheme ? 'pmc360-hero-wash-dark' : 'pmc360-hero-wash-light'
          }`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute inset-0 bg-cover bg-center mix-blend-soft-light ${
            isDarkTheme ? 'opacity-[0.16]' : 'opacity-[0.08]'
          }`}
          style={{
            backgroundImage: isDarkTheme
              ? 'url(/images/blueprint-dark.png)'
              : 'url(/images/blueprint-light.png)',
          }}
          aria-hidden
        />
        <div className="relative space-y-3 p-4 sm:p-5">
        <div className="absolute right-4 top-4 z-10 sm:right-5 sm:top-5">
          <TutorialWatchButton section="overview" variant="hero" isDark={isDarkTheme} />
        </div>
        <div className="min-w-0 pr-[8.5rem] sm:pr-44">
          <p className={`pmc-type-eyebrow ${ex.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {ROLE_LABELS[user.role] || 'PMC Head'}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className={`pmc-type-h1 ${ex.headingStrong}`}>
              Project 360° Overview
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm ${
                isLoadingVitals
                  ? isDarkTheme
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-amber-200 bg-amber-50/80 text-amber-700'
                  : isDarkTheme
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLoadingVitals ? 'animate-pulse bg-amber-500' : 'animate-pulse bg-emerald-500'
                }`}
              />
              {liveBadgeLabel}
            </span>
            <button
              type="button"
              onClick={handleForceRefresh}
              disabled={isLoadingVitals}
              title="Refresh live data from server"
              aria-label="Refresh live data from server"
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkTheme
                  ? 'pmc360-glass-input-dark text-slate-200 hover:border-cyan-400/35'
                  : 'pmc360-glass-input-light text-slate-600 hover:border-slate-400'
              }`}
            >
              <RefreshCw size={12} className={isLoadingVitals ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          <p className={`mt-1.5 max-w-2xl text-xs font-semibold sm:text-sm ${ex.muted}`}>
            Live portfolio command center — site health, billing, and delivery at a glance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 basis-[14rem] sm:max-w-[18rem]">
            <Search size={14} className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${ex.muted}`} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className={`h-10 w-full rounded-xl pl-8 pr-3 text-xs outline-none transition-shadow focus:ring-2 focus:ring-blue-500/30 sm:text-sm ${
                isDarkTheme
                  ? 'pmc360-glass-input-dark text-slate-100 placeholder:text-slate-500'
                  : 'pmc360-glass-input-light text-slate-800 placeholder:text-slate-400'
              }`}
            />
          </div>

          <ThemeFilterSelect
            className="w-[8.75rem] shrink-0"
            ariaLabel="Filter by client"
            isDark={isDarkTheme}
            value={clientFilter}
            onChange={setClientFilter}
            options={clients.map((c) => ({
              value: c,
              label: c === 'all' ? 'All Clients' : c,
            }))}
          />

          <ThemeFilterSelect
            className="w-[8.75rem] shrink-0"
            ariaLabel="Filter by region"
            isDark={isDarkTheme}
            value={regionFilter}
            onChange={setRegionFilter}
            options={regions.map((r) => ({
              value: r,
              label: r === 'all' ? 'All Regions' : r,
            }))}
          />

          <ThemeFilterSelect
            className="w-[8.75rem] shrink-0"
            ariaLabel="Filter by PM"
            isDark={isDarkTheme}
            value={pmFilter}
            onChange={setPmFilter}
            options={pms.map((pm) => ({
              value: pm,
              label: pm === 'all' ? 'All PMs' : pm,
            }))}
          />

          <ThemeFilterSelect
            className="w-[9.5rem] shrink-0"
            ariaLabel="Filter by billing status"
            isDark={isDarkTheme}
            value={billingFilter}
            onChange={(v) =>
              setBillingFilter(v as 'all' | 'pending' | 'completed')
            }
            options={[
              { value: 'all', label: 'All Billing' },
              { value: 'pending', label: 'Completed · Billing Pending' },
              { value: 'completed', label: 'Completed · Billing Done' },
            ]}
          />

          <ThemeFilterSelect
            className="w-[8.75rem] shrink-0"
            ariaLabel="Sort projects"
            isDark={isDarkTheme}
            value={ordering}
            onChange={setOrdering}
            options={[
              { value: 'name', label: 'Name A–Z' },
              { value: '-name', label: 'Name Z–A' },
              { value: '-health_score', label: 'Score high' },
              { value: 'health_score', label: 'Score low' },
              { value: '-updated_at', label: 'Recently updated' },
            ]}
          />

          <div
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[11px] font-bold ${
              isDarkTheme
                ? 'pmc360-glass-input-dark text-slate-300'
                : 'pmc360-glass-input-light text-slate-600'
            }`}
          >
            <CalendarDays size={14} />
            {todayLabel}
          </div>
        </div>
        </div>
      </div>

      {loadError && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
            isDarkTheme
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          <p className="font-semibold">{loadError}</p>
          <button
            type="button"
            onClick={handleForceRefresh}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${
              isDarkTheme
                ? 'border-rose-400/40 bg-rose-500/20 hover:bg-rose-500/30'
                : 'border-rose-300 bg-white hover:bg-rose-100'
            }`}
          >
            Retry
          </button>
        </div>
      )}

      {/* Portfolio summary strip */}
      <section
        className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 ${
          isDarkTheme ? 'pmc360-glass-panel-dark' : 'pmc360-glass-panel-light'
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${isDarkTheme ? 'opacity-[0.14]' : 'opacity-[0.16]'}`}
          style={{
            backgroundImage: isDarkTheme
              ? 'url(/images/construction-bg.jpg)'
              : 'url(/images/construction-cranes-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute inset-0 ${
            isDarkTheme ? 'pmc360-hero-wash-dark' : 'pmc360-hero-wash-light'
          }`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute inset-0 bg-cover bg-center mix-blend-soft-light ${
            isDarkTheme ? 'opacity-[0.14]' : 'opacity-[0.09]'
          }`}
          style={{
            backgroundImage: isDarkTheme
              ? 'url(/images/blueprint-dark.png)'
              : 'url(/images/blueprint-light.png)',
          }}
          aria-hidden
        />
        <h2 className={`relative mb-3 text-[10px] font-black uppercase tracking-widest ${ex.muted}`}>
          Portfolio health at a glance
        </h2>

        <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-5 lg:items-stretch">
          <KpiStatCard
            label="Critical"
            value={healthCounts.critical}
            hint="Serious delay, major cost overrun, or safety incidents — needs immediate attention"
            color={SCORE_COLORS.critical}
            isDark={isDarkTheme}
            delayMs={40}
          />
          <KpiStatCard
            label="At Risk"
            value={healthCounts.atRisk}
            hint="Watch items — slipping schedule, cost pressure, or safety/quality warnings"
            color={SCORE_COLORS.watch}
            isDark={isDarkTheme}
            delayMs={80}
          />
          <div
            className={`col-span-2 flex flex-col justify-center rounded-2xl px-3 py-4 lg:col-span-1 ${
              isDarkTheme ? 'pmc360-glass-dark' : 'pmc360-glass-light'
            }`}
          >
            <BriefingGauge score={portfolio.portfolioScore} isDark={isDarkTheme} />
            <button
              type="button"
              onClick={() => setShowScoreFormulas((v) => !v)}
              className={`mx-auto mt-2 text-[9px] font-bold uppercase tracking-wide ${
                isDarkTheme ? 'text-blue-300 hover:text-blue-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {showScoreFormulas ? 'Hide explanation' : 'How this score is calculated'}
            </button>
          </div>
          <KpiStatCard
            label="On Track"
            value={healthCounts.onTrack}
            hint={
              healthCounts.newOrNoData > 0
                ? `Healthy projects + newly created sites (${healthCounts.newOrNoData} new / no data yet)`
                : 'Healthy projects — schedule, cost, quality & safety in good shape'
            }
            color={SCORE_COLORS.healthy}
            isDark={isDarkTheme}
            delayMs={120}
          />
          <KpiStatCard
            label="Total Projects"
            value={filteredCards.length}
            hint="All projects shown in the grid below"
            color={isDarkTheme ? '#93c5fd' : '#2563eb'}
            isDark={isDarkTheme}
            delayMs={160}
          />
        </div>

        {showScoreFormulas && (
          <div
            className={`relative mt-4 space-y-3 rounded-2xl p-3.5 text-[11px] leading-relaxed sm:p-4 ${
              isDarkTheme
                ? 'pmc360-glass-dark text-slate-300'
                : 'pmc360-glass-light text-slate-600'
            }`}
            role="region"
            aria-label="How portfolio scores are calculated"
          >
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${ex.muted}`}>
                Portfolio score (/100)
              </p>
              <p className={`mt-1 font-semibold ${ex.body}`}>
                Simple average of each project&apos;s health score (0–100) from the overview API.
                Projects with no live score yet (new / no data) are not included in the average —
                that is why a portfolio full of new sites can still show a low or mid score if only
                a few scored projects exist.
              </p>
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${ex.muted}`}>
                What each count means
              </p>
              <ul className="mt-1.5 space-y-1.5">
                <li>
                  <strong className={ex.body}>Critical:</strong> Project status is Critical —
                  typically serious schedule delay, major cost issues, or safety accidents.
                </li>
                <li>
                  <strong className={ex.body}>At Risk:</strong> Status is Watch or At Risk —
                  early warning on time, cost, quality, or safety before it becomes Critical.
                </li>
                <li>
                  <strong className={ex.body}>On Track:</strong> Status is On Track or Completed,
                  plus newly created projects that have no KPI data yet (shown as No Data on the card).
                </li>
              </ul>
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${ex.muted}`}>
                What feeds each project score
              </p>
              <ul className="mt-1.5 space-y-1">
                <li><strong className={ex.body}>Time:</strong> {PORTFOLIO_SCORE_FORMULAS.schedule}</li>
                <li><strong className={ex.body}>Cost:</strong> {PORTFOLIO_SCORE_FORMULAS.financial}</li>
                <li><strong className={ex.body}>Quality / compliance:</strong> {PORTFOLIO_SCORE_FORMULAS.compliance}</li>
                <li><strong className={ex.body}>Safety:</strong> {PORTFOLIO_SCORE_FORMULAS.safety}</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Uniform project grid */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-0.5">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${ex.muted}`}>
              Project portfolio
            </p>
            <p className={`text-sm font-black ${ex.heading}`}>
              {filteredCards.length} project{filteredCards.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className={`hidden text-[10px] font-semibold sm:inline ${ex.muted}`}>
              Live portfolio · overview scores when available
            </p>
            <button
              type="button"
              onClick={() => setShowCardGuide((v) => !v)}
              aria-expanded={showCardGuide}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                showCardGuide
                  ? isDarkTheme
                    ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                    : 'border border-cyan-500/40 bg-cyan-50/80 text-cyan-800'
                  : isDarkTheme
                    ? 'pmc360-glass-input-dark text-slate-300 hover:border-cyan-400/35'
                    : 'pmc360-glass-input-light text-slate-600 hover:border-slate-400'
              }`}
            >
              <HelpCircle size={14} strokeWidth={2.2} />
              {showCardGuide ? 'Hide card guide' : 'What does this card mean?'}
            </button>
          </div>
        </div>

        {showCardGuide && (
          <div
            className={`mb-4 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 ${
              isDarkTheme ? 'pmc360-glass-panel-dark' : 'pmc360-glass-panel-light'
            }`}
            role="region"
            aria-label="Project card meaning guide"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${ex.muted}`}>
                  Card guide
                </p>
                <p className={`text-sm font-black ${ex.heading}`}>What each section means</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCardGuide(false)}
                className={`rounded-lg p-1.5 ${isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                aria-label="Close card guide"
              >
                <X size={14} className={ex.muted} />
              </button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: 'Icon + title + client',
                  body: 'Project type icon, full project name, and client/agency (e.g. GSIDC).',
                },
                {
                  title: 'Score ring (/100)',
                  body: 'Overall health score — average of available Schedule, Cost, Manpower, Safety, and Compliance values.',
                },
                {
                  title: 'Overview Progress',
                  body: 'Progress % from the Projects Overview API (progress.percentage). This is not the same as Site Progress, which uses Project Progress records (cumulative actual). Also not the same as the /100 health score ring.',
                },
                {
                  title: 'Time',
                  body: 'Schedule health from delay days (on time ≈ 100%). Status: On Track / Watch / Delay.',
                },
                {
                  title: 'Cost',
                  body: 'Cost performance (earned vs actual). Status: On Track / Watch / Risk.',
                },
                {
                  title: 'Quality',
                  body: 'Drawing approval % from the drawing register when available. If no drawings, uses a compliance blend from DPR activity. Shows — when neither drawings nor DPRs exist for that project.',
                },
                {
                  title: 'Safety',
                  body: 'HSE status from incident data. Status: Excellent / Watch / Critical.',
                },
                {
                  title: 'PM · Location · Updated',
                  body: 'Assigned Team Leader, project location, and when vitals were last refreshed.',
                },
                {
                  title: 'Issues + DPRs',
                  body: 'Open critical risks from the bottleneck register, plus count of Daily Progress Reports logged.',
                },
                {
                  title: 'Compare · View',
                  body: 'Add up to 4 projects to the compare tray, or open the full project dashboard.',
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className={`rounded-xl px-3 py-2.5 ${
                    isDarkTheme ? 'pmc360-glass-dark' : 'pmc360-glass-light'
                  }`}
                >
                  <p className={`text-[11px] font-black ${ex.heading}`}>{item.title}</p>
                  <p className={`mt-1 text-[11px] font-medium leading-relaxed ${ex.muted}`}>{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isLoadingVitals && filteredCards.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className={`h-56 animate-pulse rounded-2xl ${
                  isDarkTheme ? 'pmc360-glass-dark' : 'pmc360-glass-light'
                }`}
              />
            ))}
          </div>
        ) : (
          <>
            {filteredCards.length === 0 && (
              <p
                className={`mb-3 text-center text-xs font-semibold ${
                  isDarkTheme ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                No projects match your filters.
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredCards.map((card, index) => (
                <ProjectGridCard
                  key={card.projectId}
                  card={card}
                  index={index}
                  isDark={isDarkTheme}
                  selected={compareIds.includes(card.projectId)}
                  compareDisabled={compareIds.length >= 4}
                  onOpen={() => onViewProject(card.projectId)}
                  onToggleCompare={() => toggleCompare(card.projectId)}
                  canDelete={canDelete}
                  onDelete={() => {
                    setDeleteError(null);
                    setDeleteDeps([]);
                    setDeleteDepError(null);
                    setDeleteTarget(card);
                  }}
                />
              ))}
              {onInitializeProject && (
                <InitializeProjectGridCard
                  isDark={isDarkTheme}
                  onClick={onInitializeProject}
                />
              )}
            </div>
          </>
        )}
      </section>

      <SiteDeleteDialog
        open={Boolean(deleteTarget)}
        entityLabel="Project"
        siteName={
          deleteTarget
            ? sanitizeProjectDisplayName(deleteTarget.title) || deleteTarget.title
            : undefined
        }
        onCancel={closeDeleteDialog}
        onConfirm={() => void handleConfirmDelete()}
        isDeleting={isDeleting}
        dependencyError={deleteDepError}
        dependencies={deleteDeps}
        errorMessage={deleteError}
      />

      {/* Sticky compare tray */}
      <div
        className={`fixed inset-x-3 bottom-3 z-30 mx-auto max-w-[1600px] rounded-2xl p-3 md:inset-x-4 md:bottom-4 md:left-[calc(var(--app-sidebar-width,15.5rem)+1rem)] md:p-4 ${
          isDarkTheme ? 'pmc360-glass-panel-dark' : 'pmc360-glass-panel-light'
        }`}
      >
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter size={14} className={ex.muted} />
            <h2 className={`text-xs font-black uppercase tracking-widest ${ex.heading}`}>Compare Tray</h2>
            <span className={`text-[10px] font-semibold ${ex.muted}`}>{compareCards.length}/4 selected</span>
          </div>
          <div className="flex items-center gap-2">
            {compareCards.length > 0 && (
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${
                  isDarkTheme ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <X size={12} /> Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={compareCards.length === 0 || isExportingCompare}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${
                isDarkTheme
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <Download size={13} className={isExportingCompare ? 'animate-pulse' : ''} />
              {isExportingCompare ? 'Exporting…' : 'Export Comparison'}
            </button>
          </div>
        </div>

        {compareCards.length === 0 ? (
          <p className={`py-3 text-center text-[11px] font-semibold ${ex.muted}`}>
            Select up to 4 projects from the grid to compare Time, Cost & Safety.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {compareCards.map((card) => {
              const color = healthTone(card.healthLabel);
              return (
                <div
                  key={card.projectId}
                  className={`rounded-xl p-2.5 transition-all duration-300 ${
                    isDarkTheme ? 'pmc360-glass-dark' : 'pmc360-glass-light'
                  }`}
                >
                  <div className="mb-2 flex items-start gap-2">
                    <div
                      className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-[11px] font-black tabular-nums backdrop-blur-sm ${
                        isDarkTheme ? 'bg-white/10' : 'bg-white/55'
                      }`}
                      style={{ borderColor: `${color}66`, color }}
                    >
                      {card.overallScore ?? '—'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`line-clamp-2 text-[11px] font-black leading-snug ${ex.body}`}>{card.title}</p>
                      <p className="text-[10px] font-semibold" style={{ color }}>
                        {card.projectStatusLabel ||
                          formatHealthLabelDisplay(card.healthLabel)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCompare(card.projectId)}
                      className={`rounded-md p-1 ${isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-white'}`}
                      aria-label="Remove from compare"
                    >
                      <X size={12} className={ex.muted} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <CompareMiniBar label="Time" value={vitalPct(card, 'schedule')} color={scoreToAccent(vitalPct(card, 'schedule'))} isDark={isDarkTheme} />
                    <CompareMiniBar label="Cost" value={vitalPct(card, 'budget')} color={scoreToAccent(vitalPct(card, 'budget'))} isDark={isDarkTheme} />
                    <CompareMiniBar label="Safety" value={vitalPct(card, 'safety')} color={scoreToAccent(vitalPct(card, 'safety'))} isDark={isDarkTheme} />
                  </div>
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, 4 - compareCards.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className={`flex min-h-[7.5rem] items-center justify-center rounded-xl border border-dashed text-[10px] font-bold uppercase tracking-wide ${
                  isDarkTheme ? 'border-white/10 text-slate-600' : 'border-slate-200 text-slate-300'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  <Plus size={12} /> Slot {compareCards.length + i + 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <TutorialVideosPanel section="overview" hideWatchButton />
    </div>
  );
};

export default PMCHead360Dashboard;
