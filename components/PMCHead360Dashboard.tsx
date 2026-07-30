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
  Trees,
  UserRound,
  X,
} from 'lucide-react';
import { DPR, Project, User } from '../types';
import { ROLE_LABELS } from '../constants';
import { useTheme, getThemeClasses } from '../utils/theme';
import { getPmcExecutiveTheme } from '../utils/pmcExecutiveTheme';
import type { HealthLabel, ProjectVital, ProjectVitalsCard, VitalStatus } from '../utils/projectVitals';
import { buildSeedVitalsSnapshot, loadProjectVitalsProgressively } from '../services/projectVitalsService';
import {
  buildPortfolioSummary,
  buildProjectVitalsCardFromSnapshot,
  PORTFOLIO_SCORE_FORMULAS,
  SCORE_COLORS,
  scoreToAccent,
} from '../utils/projectVitals';
import {
  downloadPmcHead360CompareExcel,
  pmcHead360CompareFilename,
} from '../utils/pmcHead360CompareExport';
import {
  buildDprsFingerprint,
  buildPMCHead360CachePayload,
  buildProjectsFingerprint,
  clearPMCHead360Cache,
  getPMCHead360CacheAgeMs,
  isPMCHead360CacheFresh,
  readPMCHead360Cache,
  writePMCHead360Cache,
} from '../utils/pmcHead360Cache';

interface PMCHead360DashboardProps {
  user: User;
  projects: Project[];
  dprs: DPR[];
  onViewProject: (id: string) => void;
}

function healthTone(label: HealthLabel): string {
  switch (label) {
    case 'CRITICAL':
      return SCORE_COLORS.critical;
    case 'AT RISK':
      return SCORE_COLORS.watch;
    case 'ON TRACK':
      return SCORE_COLORS.healthy;
    default:
      return SCORE_COLORS.unknown;
  }
}

function vitalPct(card: ProjectVitalsCard, key: ProjectVitalsCard['vitals'][number]['key']): number | null {
  return card.vitals.find((v) => v.key === key)?.percent ?? null;
}

function formatCacheAge(ageMs: number): string {
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'just now';
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  return hours === 1 ? '1 hr ago' : `${hours} hr ago`;
}

/** Theme-safe filter dropdown — avoids native &lt;select&gt; white flash on dark Windows UI. */
const ThemeFilterSelect: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  isDark: boolean;
  ariaLabel: string;
}> = ({ value, options, onChange, isDark, ariaLabel }) => {
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
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border py-2.5 pl-3 pr-2.5 text-left text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-blue-500/30 sm:text-sm ${
          isDark
            ? 'border-white/15 bg-[#0f2744] text-slate-100 hover:border-white/25'
            : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300'
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
          className={`absolute right-0 z-50 mt-1.5 max-h-56 min-w-full overflow-y-auto rounded-xl border py-1 shadow-xl ${
            isDark
              ? 'border-white/15 bg-[#0f2744] text-slate-100'
              : 'border-slate-200 bg-white text-slate-700'
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
    className={`group flex min-h-[7rem] flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
      isDark
        ? 'border-white/10 bg-[#0f2744]/90 backdrop-blur-sm'
        : 'border-slate-200/80 bg-white'
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
    <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</p>
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
  if (status === 'unknown') return '—';
  if (key === 'safety') {
    if (status === 'healthy') return 'Excellent';
    if (status === 'watch') return 'Watch';
    return 'Critical';
  }
  if (key === 'time') {
    if (status === 'healthy') return 'On Track';
    if (status === 'watch') return 'Watch';
    return 'Delay';
  }
  if (status === 'healthy') return 'On Track';
  if (status === 'watch') return 'Watch';
  return 'Risk';
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
  const word = statusWord(status, kind);
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
}> = ({ card, selected, isDark, index, onOpen, onToggleCompare, compareDisabled }) => {
  const tone = healthTone(card.healthLabel);
  const TypeIcon = projectTypeIcon(card.title);
  const schedule = vitalOf(card, 'schedule');
  const budget = vitalOf(card, 'budget');
  const safety = vitalOf(card, 'safety');
  const quality =
    vitalOf(card, 'drawings')?.percent != null
      ? vitalOf(card, 'drawings')
      : vitalOf(card, 'compliance');
  const progress = card.progressPct;
  const progressTone = scoreToAccent(progress);
  const score = card.overallScore;
  const circumference = 2 * Math.PI * 18;
  const scoreDash =
    score == null ? 0 : (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
        isDark
          ? 'border-white/10 bg-[#0b1d36]/95 shadow-[0_6px_20px_rgba(0,0,0,0.28)]'
          : 'border-slate-200 bg-white shadow-[0_2px_14px_rgba(15,23,42,0.05)]'
      } ${selected ? (isDark ? 'ring-2 ring-cyan-400/40' : 'ring-2 ring-cyan-500/25 ring-offset-1') : ''}`}
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
              isDark ? 'bg-white/5 text-cyan-300' : 'bg-slate-50 text-slate-700'
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

        {/* Progress — physical % from project-progress API (same as project detail) */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className={`text-[9px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Progress
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
            <button
              type="button"
              onClick={onToggleCompare}
              disabled={compareDisabled && !selected}
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
  dprs,
  onViewProject,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const ex = getPmcExecutiveTheme(isDarkTheme);

  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [pmFilter, setPmFilter] = useState('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isExportingCompare, setIsExportingCompare] = useState(false);
  const [showScoreFormulas, setShowScoreFormulas] = useState(false);
  const [showCardGuide, setShowCardGuide] = useState(false);

  const [allCards, setAllCards] = useState<ProjectVitalsCard[]>(() => {
    const cached = readPMCHead360Cache(user.id, projects, dprs);
    if (cached?.cards.length) return cached.cards;
    if (projects.length === 0) return [];
    return projects.map((project) =>
      buildProjectVitalsCardFromSnapshot(buildSeedVitalsSnapshot(project, dprs)),
    );
  });
  const [isLoadingVitals, setIsLoadingVitals] = useState(() => {
    if (projects.length === 0) return false;
    const cached = readPMCHead360Cache(user.id, projects, dprs);
    return !(cached && isPMCHead360CacheFresh(cached));
  });
  const [vitalsRefreshProgress, setVitalsRefreshProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Bumps when user clicks Refresh — forces one network revalidation. */
  const [refreshNonce, setRefreshNonce] = useState(0);
  const forceRefreshRef = useRef(false);
  const [servingFromCache, setServingFromCache] = useState(() => {
    const cached = readPMCHead360Cache(user.id, projects, dprs);
    return Boolean(cached && isPMCHead360CacheFresh(cached));
  });
  const [cacheAgeLabel, setCacheAgeLabel] = useState<string | null>(() => {
    const cached = readPMCHead360Cache(user.id, projects, dprs);
    if (!cached || !isPMCHead360CacheFresh(cached)) return null;
    return formatCacheAge(getPMCHead360CacheAgeMs(cached));
  });

  const projectFingerprint = useMemo(() => buildProjectsFingerprint(projects), [projects]);
  const dprsFingerprint = useMemo(() => buildDprsFingerprint(projects, dprs), [projects, dprs]);
  const projectsRef = useRef(projects);
  const dprsRef = useRef(dprs);
  projectsRef.current = projects;
  dprsRef.current = dprs;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const projects = projectsRef.current;
      const dprs = dprsRef.current;

      if (projects.length === 0) {
        setAllCards([]);
        setIsLoadingVitals(false);
        setServingFromCache(false);
        setCacheAgeLabel(null);
        return;
      }

      const forceRefresh = forceRefreshRef.current;
      forceRefreshRef.current = false;

      const cached = readPMCHead360Cache(user.id, projects, dprs);

      // Fresh cache + not a manual refresh → skip all vitals APIs (avoids rate limits).
      if (!forceRefresh && cached && isPMCHead360CacheFresh(cached)) {
        setAllCards(cached.cards);
        setLoadError(null);
        setIsLoadingVitals(false);
        setVitalsRefreshProgress(null);
        setServingFromCache(true);
        setCacheAgeLabel(formatCacheAge(getPMCHead360CacheAgeMs(cached)));
        return;
      }

      if (cached) {
        setAllCards(cached.cards);
        setLoadError(null);
      }

      const realProjectCount = projects.filter(
        (p) => !String(p.id).startsWith('executive-known-') && !String(p.id).startsWith('executive-hse-'),
      ).length;
      setIsLoadingVitals(true);
      setServingFromCache(Boolean(cached));
      setVitalsRefreshProgress(
        realProjectCount > 0 ? { completed: 0, total: realProjectCount } : null,
      );
      setLoadError(null);

      const seedCards = projects.map((project) =>
        buildProjectVitalsCardFromSnapshot(buildSeedVitalsSnapshot(project, dprs)),
      );
      if (!cached) setAllCards(seedCards);

      try {
        const snapshots = await loadProjectVitalsProgressively(projects, dprs, (nextSnapshots, meta) => {
          if (cancelled) return;
          setAllCards(nextSnapshots.map(buildProjectVitalsCardFromSnapshot));
          if (meta) setVitalsRefreshProgress(meta);
        });

        if (!cancelled) {
          const cards = snapshots.map(buildProjectVitalsCardFromSnapshot);
          setAllCards(cards);
          writePMCHead360Cache(
            user.id,
            buildPMCHead360CachePayload(user.id, projects, dprs, cards),
          );
          setServingFromCache(false);
          setCacheAgeLabel(null);
        }
      } catch (error) {
        console.error('Failed to load project vitals:', error);
        if (!cancelled) {
          setLoadError('Some live metrics may be unavailable. Showing available project data.');
          if (cached) {
            setServingFromCache(true);
            setCacheAgeLabel(formatCacheAge(getPMCHead360CacheAgeMs(cached)));
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVitals(false);
          setVitalsRefreshProgress(null);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user.id, projectFingerprint, dprsFingerprint, refreshNonce]);

  const handleForceRefresh = () => {
    if (isLoadingVitals) return;
    clearPMCHead360Cache(user.id);
    forceRefreshRef.current = true;
    setServingFromCache(false);
    setCacheAgeLabel(null);
    setRefreshNonce((n) => n + 1);
  };

  const regions = useMemo(
    () => ['all', ...Array.from(new Set(projects.map((p) => p.location).filter(Boolean)))],
    [projects],
  );

  const pms = useMemo(
    () => [
      'all',
      ...Array.from(new Set(allCards.map((c) => c.pmName).filter((n) => n && n !== 'Unassigned'))),
    ],
    [allCards],
  );

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCards
      .filter((c) => {
        if (
          q &&
          !c.title.toLowerCase().includes(q) &&
          !c.location.toLowerCase().includes(q) &&
          !c.pmName.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (regionFilter !== 'all' && c.location !== regionFilter) return false;
        if (pmFilter !== 'all' && c.pmName !== pmFilter) return false;
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }, [allCards, search, regionFilter, pmFilter]);

  const portfolio = useMemo(() => buildPortfolioSummary(filteredCards), [filteredCards]);

  const healthCounts = useMemo(() => {
    let critical = 0;
    let atRisk = 0;
    let onTrack = 0;
    filteredCards.forEach((card) => {
      const score = card.overallScore;
      if (score == null) {
        if (card.healthLabel === 'CRITICAL') critical += 1;
        else if (card.healthLabel === 'ON TRACK') onTrack += 1;
        else atRisk += 1;
        return;
      }
      if (score < 50) critical += 1;
      else if (score < 75) atRisk += 1;
      else onTrack += 1;
    });
    return { critical, atRisk, onTrack };
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

  if (projects.length === 0) {
    return (
      <div
        className={`flex min-h-[400px] flex-col items-center justify-center rounded-3xl border p-8 text-center ${themeClasses.glassCard} ${themeClasses.border}`}
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

  const liveBadgeLabel =
    isLoadingVitals && vitalsRefreshProgress && vitalsRefreshProgress.total > 0
      ? `Loading live backend data… ${vitalsRefreshProgress.completed} / ${vitalsRefreshProgress.total}`
      : isLoadingVitals
        ? 'Syncing live backend data…'
        : servingFromCache
          ? `Cached${cacheAgeLabel ? ` · ${cacheAgeLabel}` : ''} · ${portfolio.projectsWithScore}/${portfolio.projectsTotal} scored`
          : `Live · ${portfolio.projectsWithScore}/${portfolio.projectsTotal} scored`;

  return (
    <div className="animate-in fade-in space-y-4 pb-36 duration-500 sm:pb-40">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${ex.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {ROLE_LABELS[user.role] || 'PMC Head'}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={`text-xl font-black tracking-tight sm:text-2xl ${ex.headingStrong}`}>
              Project 360° Overview
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                isLoadingVitals
                  ? isDarkTheme
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                  : servingFromCache
                    ? isDarkTheme
                      ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                      : 'border-sky-200 bg-sky-50 text-sky-700'
                    : isDarkTheme
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isLoadingVitals
                    ? 'animate-pulse bg-amber-500'
                    : servingFromCache
                      ? 'bg-sky-500'
                      : 'animate-pulse bg-emerald-500'
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkTheme
                  ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                  : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50'
              }`}
            >
              <RefreshCw size={12} className={isLoadingVitals ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-[1fr_minmax(8rem,10rem)_minmax(8rem,10rem)_auto]">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
            <Search size={14} className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${ex.muted}`} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, location, PM…"
              className={`w-full rounded-xl border py-2.5 pl-8 pr-3 text-xs outline-none transition-shadow focus:ring-2 focus:ring-blue-500/30 sm:text-sm ${
                isDarkTheme
                  ? 'border-white/15 bg-[#0f2744] text-slate-100 placeholder:text-slate-500'
                  : 'border-slate-200 bg-white text-slate-800 shadow-sm placeholder:text-slate-400'
              }`}
            />
          </div>

          <ThemeFilterSelect
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
            ariaLabel="Filter by PM"
            isDark={isDarkTheme}
            value={pmFilter}
            onChange={setPmFilter}
            options={pms.map((pm) => ({
              value: pm,
              label: pm === 'all' ? 'All PMs' : pm,
            }))}
          />

          <div
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[11px] font-bold ${
              isDarkTheme
                ? 'border-white/15 bg-[#0f2744] text-slate-300'
                : 'border-slate-200 bg-white text-slate-600 shadow-sm'
            }`}
          >
            <CalendarDays size={14} />
            {todayLabel}
          </div>
        </div>
      </div>

      {loadError && <div className={ex.alert}>{loadError}</div>}

      {/* Portfolio summary strip */}
      <section
        className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 ${
          isDarkTheme
            ? 'border-white/10 bg-[#071428]/80'
            : 'border-slate-200 bg-slate-50/90'
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-0 ${isDarkTheme ? 'opacity-[0.08]' : 'opacity-[0.05]'}`}
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=60')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          className={`pointer-events-none absolute inset-0 ${
            isDarkTheme
              ? 'bg-gradient-to-br from-[#0b1d36]/90 via-[#0b1d36]/70 to-transparent'
              : 'bg-gradient-to-br from-white/90 via-slate-50/80 to-transparent'
          }`}
        />
        <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-5 lg:items-stretch">
          <KpiStatCard
            label="Critical"
            value={healthCounts.critical}
            hint="Score below 50"
            color={SCORE_COLORS.critical}
            isDark={isDarkTheme}
            delayMs={40}
          />
          <KpiStatCard
            label="At Risk"
            value={healthCounts.atRisk}
            hint="Score 50–74"
            color={SCORE_COLORS.watch}
            isDark={isDarkTheme}
            delayMs={80}
          />
          <div
            className={`col-span-2 flex flex-col justify-center rounded-2xl border px-3 py-4 shadow-sm lg:col-span-1 ${
              isDarkTheme
                ? 'border-white/10 bg-[#0f2744]/95'
                : 'border-slate-200 bg-white'
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
              {showScoreFormulas ? 'Hide formulas' : 'How scores are calculated'}
            </button>
          </div>
          <KpiStatCard
            label="On Track"
            value={healthCounts.onTrack}
            hint="Score 75+"
            color={SCORE_COLORS.healthy}
            isDark={isDarkTheme}
            delayMs={120}
          />
          <KpiStatCard
            label="Total Projects"
            value={filteredCards.length}
            hint="Shown in grid below"
            color={isDarkTheme ? '#93c5fd' : '#2563eb'}
            isDark={isDarkTheme}
            delayMs={160}
          />
        </div>

        {showScoreFormulas && (
          <ul
            className={`relative mt-4 space-y-1.5 rounded-2xl border p-3 text-[10px] leading-relaxed ${
              isDarkTheme ? 'border-white/10 bg-black/20 text-slate-400' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <li><strong className={ex.body}>Portfolio:</strong> {PORTFOLIO_SCORE_FORMULAS.portfolioScore}</li>
            <li><strong className={ex.body}>Schedule:</strong> {PORTFOLIO_SCORE_FORMULAS.schedule}</li>
            <li><strong className={ex.body}>Financial:</strong> {PORTFOLIO_SCORE_FORMULAS.financial}</li>
            <li><strong className={ex.body}>Compliance:</strong> {PORTFOLIO_SCORE_FORMULAS.compliance}</li>
            <li><strong className={ex.body}>Safety:</strong> {PORTFOLIO_SCORE_FORMULAS.safety}</li>
          </ul>
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
            <p className={`hidden text-[10px] font-semibold sm:inline ${ex.muted}`}>A–Z · live vitals cards</p>
            <button
              type="button"
              onClick={() => setShowCardGuide((v) => !v)}
              aria-expanded={showCardGuide}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                showCardGuide
                  ? isDarkTheme
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                    : 'border-cyan-500/40 bg-cyan-50 text-cyan-800'
                  : isDarkTheme
                    ? 'border-white/15 text-slate-300 hover:bg-white/5'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <HelpCircle size={14} strokeWidth={2.2} />
              {showCardGuide ? 'Hide card guide' : 'What does this card mean?'}
            </button>
          </div>
        </div>

        {showCardGuide && (
          <div
            className={`mb-4 rounded-2xl border p-4 shadow-sm animate-in fade-in slide-in-from-top-2 ${
              isDarkTheme
                ? 'border-cyan-400/20 bg-[#0f2744]/90'
                : 'border-cyan-200/80 bg-white'
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
                  title: 'Progress',
                  body: 'Physical progress % from the project-progress API (cumulative actual) — same source as the project Progress chart. Falls back to earned ÷ planned when progress rows are missing. Not the same as the /100 score ring.',
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
                  className={`rounded-xl border px-3 py-2.5 ${
                    isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/80'
                  }`}
                >
                  <p className={`text-[11px] font-black ${ex.heading}`}>{item.title}</p>
                  <p className={`mt-1 text-[11px] font-medium leading-relaxed ${ex.muted}`}>{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {filteredCards.length === 0 ? (
          <div
            className={`rounded-2xl border border-dashed px-4 py-16 text-center text-xs font-semibold ${
              isDarkTheme ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'
            }`}
          >
            No projects match your filters.
          </div>
        ) : (
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
              />
            ))}
          </div>
        )}
      </section>

      {/* Sticky compare tray */}
      <div
        className={`fixed inset-x-3 bottom-3 z-30 mx-auto max-w-[1600px] rounded-2xl border p-3 shadow-2xl backdrop-blur-md md:inset-x-4 md:bottom-4 md:left-[calc(var(--app-sidebar-width,17rem)+1rem)] md:p-4 ${
          isDarkTheme
            ? 'border-white/15 bg-[#0b1d36]/95'
            : 'border-slate-200 bg-white/95'
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
                  className={`rounded-xl border p-2.5 transition-all duration-300 hover:shadow-md ${
                    isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className="mb-2 flex items-start gap-2">
                    <div
                      className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-[11px] font-black tabular-nums ${
                        isDarkTheme ? 'bg-white/5' : 'bg-white'
                      }`}
                      style={{ borderColor: `${color}66`, color }}
                    >
                      {card.overallScore ?? '—'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`line-clamp-2 text-[11px] font-black leading-snug ${ex.body}`}>{card.title}</p>
                      <p className="text-[10px] font-semibold" style={{ color }}>
                        {card.healthLabel}
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
    </div>
  );
};

export default PMCHead360Dashboard;
