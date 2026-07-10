import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  HardHat,
  MapPin,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Minus,
  Wallet,
  ClipboardList,
  PenTool,
} from 'lucide-react';
import { DPR, Project, User } from '../types';
import { useTheme, getThemeClasses } from '../utils/theme';
import { getPmcExecutiveTheme } from '../utils/pmcExecutiveTheme';
import type { HealthLabel } from '../utils/projectVitals';
import { buildSeedVitalsSnapshot, loadProjectVitalsProgressively } from '../services/projectVitalsService';
import {
  ProjectVitalsCard,
  VitalKey,
  buildPortfolioSummary,
  buildProjectVitalsCardFromSnapshot,
  healthBadgeClass,
  PORTFOLIO_SCORE_FORMULAS,
  scoreToAccent,
  statusColor,
} from '../utils/projectVitals';
import {
  downloadPmcHead360CompareExcel,
  pmcHead360CompareFilename,
} from '../utils/pmcHead360CompareExport';
import {
  buildDprsFingerprint,
  buildPMCHead360CachePayload,
  buildProjectsFingerprint,
  readPMCHead360Cache,
  writePMCHead360Cache,
} from '../utils/pmcHead360Cache';

interface PMCHead360DashboardProps {
  user: User;
  projects: Project[];
  dprs: DPR[];
  onViewProject: (id: string) => void;
}

const VITAL_ICONS: Record<VitalKey, React.ElementType> = {
  schedule: Calendar,
  budget: Wallet,
  manpower: HardHat,
  safety: ShieldCheck,
  reports: ClipboardList,
  drawings: PenTool,
  compliance: ClipboardList,
};

const KPI_HEALTHY_COLORS = {
  schedule: '#6366f1',
  financial: '#0ea5e9',
  compliance: '#8b5cf6',
  safety: '#10b981',
} as const;

const head360HealthBorder = (label: HealthLabel, isDark: boolean): string => {
  if (isDark) {
    switch (label) {
      case 'CRITICAL':
        return 'border-rose-800/50 ring-1 ring-rose-900/40';
      case 'AT RISK':
        return 'border-amber-700/50 ring-1 ring-amber-900/40';
      case 'ON TRACK':
        return 'border-emerald-800/50 ring-1 ring-emerald-900/40';
      default:
        return 'border-white/10';
    }
  }
  switch (label) {
    case 'CRITICAL':
      return 'border-red-200 ring-1 ring-red-100';
    case 'AT RISK':
      return 'border-amber-200 ring-1 ring-amber-100';
    case 'ON TRACK':
      return 'border-emerald-200 ring-1 ring-emerald-100';
    default:
      return 'border-slate-200';
  }
};

const head360HealthBadge = (label: HealthLabel, isDark: boolean): string => {
  if (isDark) {
    switch (label) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-400 border-rose-800/50';
      case 'AT RISK':
        return 'bg-amber-500/15 text-amber-400 border-amber-800/50';
      case 'ON TRACK':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-800/50';
      default:
        return 'bg-white/10 text-slate-400 border-white/15';
    }
  }
  return healthBadgeClass(label);
};

const PRIMARY_VITAL_KEYS: VitalKey[] = ['schedule', 'budget', 'manpower', 'safety'];

const ScoreRing: React.FC<{ score: number | null; size?: number; isDark?: boolean }> = ({
  score,
  size = 64,
  isDark = false,
}) => {
  const strokeWidth = size <= 64 ? 4 : 5;
  const r = (size - strokeWidth * 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = score != null ? c - (score / 100) * c : c;
  const stroke =
    score == null ? '#cbd5e1' : score < 50 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e';
  const trackStroke = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';
  const fontSize = size <= 64 ? 'text-sm' : size <= 72 ? 'text-base' : 'text-lg';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackStroke}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-black tabular-nums ${fontSize} ${
          isDark ? 'text-slate-100' : 'text-slate-800'
        }`}
      >
        {score ?? '—'}
      </span>
    </div>
  );
};

const PortfolioGauge: React.FC<{ score: number | null; isDark?: boolean }> = ({
  score,
  isDark = false,
}) => {
  const size = 96;
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = score != null ? c - (score / 100) * c : c;
  const trackStroke = isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackStroke} strokeWidth={6} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={score != null ? '#4f46e5' : '#cbd5e1'}
            strokeWidth={6}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-2xl font-black leading-none ${
              isDark ? 'text-indigo-300' : 'text-indigo-700'
            }`}
          >
            {score ?? '—'}
          </span>
          {score != null && (
            <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              /100
            </span>
          )}
        </div>
      </div>
      <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Portfolio Score
      </p>
    </div>
  );
};

const KpiPill: React.FC<{
  shortLabel: string;
  value: number | null;
  icon: React.ElementType;
  accent: string;
  isDark?: boolean;
}> = ({ shortLabel, value, icon: Icon, accent, isDark = false }) => {
  const valueColor = scoreToAccent(value, accent);
  return (
  <div
    className={`flex min-h-[4.25rem] min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
      isDark ? 'border-white/10 bg-[#0f2744]/70' : 'border-slate-100 bg-white shadow-sm'
    }`}
  >
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${valueColor}${isDark ? '28' : '18'}`, color: valueColor }}
    >
      <Icon size={16} />
    </div>
    <div className="min-w-0">
      <p
        className={`truncate text-[10px] font-bold uppercase tracking-wide ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {shortLabel}
      </p>
      <p
        className="mt-0.5 text-xl font-black tabular-nums leading-none"
        style={{ color: valueColor }}
      >
        {value != null ? `${value}%` : '—'}
      </p>
    </div>
  </div>
  );
};

const VitalRow: React.FC<{ vital: ProjectVitalsCard['vitals'][0]; isDark?: boolean }> = ({
  vital,
  isDark = false,
}) => {
  const Icon = VITAL_ICONS[vital.key];
  const color = statusColor(vital.status);

  return (
    <div className="flex h-full min-h-[4.5rem] flex-col justify-between gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon size={13} className={`shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <span
            className={`truncate text-[11px] font-bold uppercase tracking-wide ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {vital.label}
          </span>
        </div>
        <span className="shrink-0 text-sm font-black tabular-nums" style={{ color }}>
          {vital.percent != null ? `${vital.percent}%` : '—'}
        </span>
      </div>
      <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: vital.percent != null ? `${Math.min(100, vital.percent)}%` : '0%',
            backgroundColor: color,
          }}
        />
      </div>
      <p
        className={`line-clamp-1 text-[10px] font-medium leading-tight ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        {vital.note}
      </p>
    </div>
  );
};

const ProjectVitalCard: React.FC<{
  card: ProjectVitalsCard;
  onOpen: () => void;
  isDark?: boolean;
}> = ({ card, onOpen, isDark = false }) => {
  const TrendIcon =
    card.trend === 'improving' ? TrendingUp : card.trend === 'declining' ? TrendingDown : Minus;
  const trendColor =
    card.trend === 'improving'
      ? isDark ? 'text-emerald-400' : 'text-emerald-600'
      : card.trend === 'declining'
        ? isDark ? 'text-rose-400' : 'text-red-500'
        : isDark ? 'text-amber-400' : 'text-amber-500';

  const primaryVitals = PRIMARY_VITAL_KEYS.map((key) =>
    card.vitals.find((v) => v.key === key),
  ).filter((v): v is ProjectVitalsCard['vitals'][0] => v != null);

  const secondaryVitals = card.vitals.filter((v) => !PRIMARY_VITAL_KEYS.includes(v.key));

  return (
    <article
      className={`flex min-h-0 flex-col rounded-xl border p-3.5 shadow-sm transition-shadow hover:shadow-md sm:p-4 ${
        isDark ? 'bg-[#0b1d36]/95' : 'bg-white'
      } ${head360HealthBorder(card.healthLabel, isDark)}`}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className={`line-clamp-2 text-sm font-black leading-snug ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}
            title={card.title}
          >
            {card.title}
          </h3>
          <div
            className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{card.location}</span>
            </span>
            <span className="truncate">PM: {card.pmName}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ScoreRing score={card.overallScore} size={62} isDark={isDark} />
          <span
            className={`whitespace-nowrap rounded-full border px-2 py-px text-[9px] font-black uppercase tracking-wide ${head360HealthBadge(card.healthLabel, isDark)}`}
          >
            {card.healthLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {primaryVitals.map((v) => (
          <VitalRow key={v.key} vital={v} isDark={isDark} />
        ))}
      </div>

      {secondaryVitals.length > 0 && (
        <div
          className={`mt-2.5 grid grid-cols-2 gap-2 rounded-lg px-2 py-2 ${
            isDark ? 'bg-white/[0.04]' : 'bg-slate-50'
          }`}
        >
          {secondaryVitals.map((v) => (
            <div key={v.key} className="flex items-center justify-between gap-1.5 text-[10px]">
              <span className={`truncate font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {v.label}
              </span>
              <span className="shrink-0 font-black tabular-nums" style={{ color: statusColor(v.status) }}>
                {v.percent != null ? `${v.percent}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div
        className={`mt-3 flex items-center justify-between gap-2 border-t pt-2.5 ${
          isDark ? 'border-white/10' : 'border-slate-100'
        }`}
      >
        <div className={`flex items-center gap-1 text-[10px] font-bold capitalize ${trendColor}`}>
          <TrendIcon size={12} />
          {card.trend}
        </div>
        <span className={`truncate text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {card.lastUpdate}
        </span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className={`mt-2.5 w-full rounded-lg py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
          isDark
            ? 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60'
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
        }`}
      >
        Open Full View
      </button>
    </article>
  );
};

const CompareBar: React.FC<{
  label: string;
  projects: { name: string; value: number; color: string }[];
  isDark?: boolean;
}> = ({ label, projects, isDark = false }) => (
  <div className="space-y-2">
    <p
      className={`text-[10px] font-black uppercase tracking-widest ${
        isDark ? 'text-slate-500' : 'text-slate-400'
      }`}
    >
      {label}
    </p>
    {projects.map((p) => (
      <div key={p.name} className="space-y-1">
        <div className="flex justify-between gap-2">
          <span
            className={`truncate text-xs font-semibold ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {p.name}
          </span>
          <span
            className={`shrink-0 text-xs font-black tabular-nums ${
              isDark ? 'text-slate-200' : 'text-slate-700'
            }`}
          >
            {p.value}%
          </span>
        </div>
        <div className={`h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
          <div
            className="h-full rounded-full"
            style={{ width: `${p.value}%`, backgroundColor: p.color }}
          />
        </div>
      </div>
    ))}
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
    return !readPMCHead360Cache(user.id, projects, dprs);
  });
  const [vitalsRefreshProgress, setVitalsRefreshProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const projectFingerprint = useMemo(() => buildProjectsFingerprint(projects), [projects]);
  const dprsFingerprint = useMemo(() => buildDprsFingerprint(projects, dprs), [projects, dprs]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (projects.length === 0) {
        setAllCards([]);
        setIsLoadingVitals(false);
        return;
      }

      const cached = readPMCHead360Cache(user.id, projects, dprs);
      if (cached) {
        setAllCards(cached.cards);
        setLoadError(null);
      }

      const realProjectCount = projects.filter(
        (p) => !String(p.id).startsWith('executive-known-'),
      ).length;
      setIsLoadingVitals(true);
      setVitalsRefreshProgress(
        realProjectCount > 0 ? { completed: 0, total: realProjectCount } : null,
      );
      setLoadError(null);

      const seedCards = projects.map((project) =>
        buildProjectVitalsCardFromSnapshot(buildSeedVitalsSnapshot(project, dprs)),
      );
      if (!cached) {
        setAllCards(seedCards);
      }

      try {
        const snapshots = await loadProjectVitalsProgressively(projects, dprs, (nextSnapshots, meta) => {
          if (cancelled) return;
          setAllCards(nextSnapshots.map(buildProjectVitalsCardFromSnapshot));
          if (meta) {
            setVitalsRefreshProgress(meta);
          }
        });

        if (!cancelled) {
          const cards = snapshots.map(buildProjectVitalsCardFromSnapshot);
          setAllCards(cards);
          writePMCHead360Cache(
            user.id,
            buildPMCHead360CachePayload(user.id, projects, dprs, cards),
          );
        }
      } catch (error) {
        console.error('Failed to load project vitals:', error);
        if (!cancelled) {
          setLoadError('Some live metrics may be unavailable. Showing list data.');
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
  }, [user.id, projectFingerprint, dprsFingerprint, projects, dprs]);

  const regions = useMemo(
    () => ['all', ...Array.from(new Set(projects.map((p) => p.location).filter(Boolean)))],
    [projects],
  );

  const pms = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          allCards.map((c) => c.pmName).filter((n) => n && n !== 'Unassigned'),
        ),
      ),
    ],
    [allCards],
  );

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCards
      .filter((c) => {
        if (q && !c.title.toLowerCase().includes(q) && !c.location.toLowerCase().includes(q)) {
          return false;
        }
        if (regionFilter !== 'all' && c.location !== regionFilter) return false;
        if (pmFilter !== 'all' && c.pmName !== pmFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const sa = a.overallScore ?? -1;
        const sb = b.overallScore ?? -1;
        return sa - sb;
      });
  }, [allCards, search, regionFilter, pmFilter]);

  const portfolio = useMemo(() => buildPortfolioSummary(filteredCards), [filteredCards]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const compareCards = allCards.filter((c) => compareIds.includes(c.projectId));

  const barColor = (score: number | null) =>
    score == null ? '#94a3b8' : score < 50 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e';

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

  return (
    <div className="animate-in fade-in space-y-4 duration-500">
      {/* Page header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${ex.isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>
            PMC Head
          </p>
          <h1 className={`text-xl font-black tracking-tight sm:text-2xl ${ex.headingStrong}`}>
            Project 360° Overview
          </h1>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-2xl lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
            <Search
              size={14}
              className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${ex.muted}`}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className={`w-full rounded-lg border py-2 pl-8 pr-3 text-xs outline-none ring-indigo-500 focus:ring-2 sm:text-sm ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
            />
          </div>

          <div className="relative min-w-0">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className={`w-full appearance-none rounded-lg border py-2 pl-2.5 pr-8 text-xs font-bold outline-none sm:text-sm ${themeClasses.input} ${themeClasses.textPrimary}`}
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r === 'all' ? 'All Regions' : r}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${ex.muted}`}
            />
          </div>

          <div className="relative min-w-0">
            <select
              value={pmFilter}
              onChange={(e) => setPmFilter(e.target.value)}
              className={`w-full appearance-none rounded-lg border py-2 pl-2.5 pr-8 text-xs font-bold outline-none sm:text-sm ${themeClasses.input} ${themeClasses.textPrimary}`}
            >
              {pms.map((pm) => (
                <option key={pm} value={pm}>
                  {pm === 'all' ? 'All PMs' : pm}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${ex.muted}`}
            />
          </div>

          <button
            type="button"
            className={`flex h-9 w-full items-center justify-center rounded-lg border sm:w-9 ${ex.isDark ? 'border-white/15 bg-white/5 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}
            aria-label="Notifications"
          >
            <Bell size={16} />
          </button>
        </div>
      </div>

      {/* Portfolio pulse bar */}
      {loadError && (
        <div className={ex.alert}>{loadError}</div>
      )}

      {isLoadingVitals && vitalsRefreshProgress && vitalsRefreshProgress.total > 0 && (
        <p className={`rounded-lg border px-3 py-2 text-center text-[11px] font-semibold ${ex.isDark ? 'border-indigo-500/25 bg-indigo-500/10 text-indigo-200' : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`}>
          Loading live backend data… {vitalsRefreshProgress.completed} / {vitalsRefreshProgress.total} projects
        </p>
      )}

      <>
      <div className={`overflow-hidden ${ex.surface}`}>
        <div
          className={`grid grid-cols-1 gap-3 p-3.5 sm:p-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-4 ${
            isDarkTheme ? 'lg:divide-x lg:divide-white/10' : 'lg:divide-x lg:divide-slate-100'
          }`}
        >
          <div className="flex justify-center lg:justify-start lg:px-1 lg:pr-3">
            <PortfolioGauge score={portfolio.portfolioScore} isDark={isDarkTheme} />
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-4">
            <KpiPill
              shortLabel="Schedule"
              value={portfolio.scheduleHealth}
              icon={Calendar}
              accent={KPI_HEALTHY_COLORS.schedule}
              isDark={isDarkTheme}
            />
            <KpiPill
              shortLabel="Financial"
              value={portfolio.financialHealth}
              icon={Wallet}
              accent={KPI_HEALTHY_COLORS.financial}
              isDark={isDarkTheme}
            />
            <KpiPill
              shortLabel="Compliance"
              value={portfolio.compliance}
              icon={ClipboardList}
              accent={KPI_HEALTHY_COLORS.compliance}
              isDark={isDarkTheme}
            />
            <KpiPill
              shortLabel="Safety"
              value={portfolio.safetyIndex}
              icon={ShieldCheck}
              accent={KPI_HEALTHY_COLORS.safety}
              isDark={isDarkTheme}
            />
          </div>
        </div>
        <div
          className={`border-t px-3.5 py-2 sm:px-4 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/80'}`}
        >
          <button
            type="button"
            onClick={() => setShowScoreFormulas((open) => !open)}
            className={`text-[10px] font-bold uppercase tracking-wide ${ex.isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-700'}`}
          >
            {showScoreFormulas ? 'Hide' : 'How scores are calculated'}
          </button>
          {showScoreFormulas && (
            <ul className={`mt-2 space-y-1.5 text-[10px] leading-relaxed ${ex.muted}`}>
              <li><strong className={ex.body}>Portfolio score:</strong> {PORTFOLIO_SCORE_FORMULAS.portfolioScore} Based on {portfolio.projectsWithScore} of {portfolio.projectsTotal} filtered projects.</li>
              <li><strong className={ex.body}>Schedule:</strong> {PORTFOLIO_SCORE_FORMULAS.schedule}</li>
              <li><strong className={ex.body}>Financial:</strong> {PORTFOLIO_SCORE_FORMULAS.financial}</li>
              <li><strong className={ex.body}>Compliance:</strong> {PORTFOLIO_SCORE_FORMULAS.compliance}</li>
              <li><strong className={ex.body}>Safety:</strong> {PORTFOLIO_SCORE_FORMULAS.safety}</li>
            </ul>
          )}
        </div>
      </div>

      {/* Main grid + compare sidebar */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem] 2xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <div className="mb-2.5">
            <p className={`text-[10px] font-black uppercase tracking-widest ${ex.muted}`}>
              {filteredCards.length} project{filteredCards.length !== 1 ? 's' : ''} · worst first
            </p>
          </div>

          {filteredCards.length === 0 ? (
            <div className={`p-8 text-center ${ex.emptyState}`}>
              <p className="text-xs font-bold">No projects match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:gap-3.5">
              {filteredCards.map((card) => (
                <ProjectVitalCard
                  key={card.projectId}
                  card={card}
                  isDark={isDarkTheme}
                  onOpen={() => onViewProject(card.projectId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Compare panel */}
        <aside
          className={`w-full min-w-0 rounded-xl p-3.5 sm:p-4 xl:sticky xl:top-3 xl:max-h-[calc(100vh-1rem)] xl:self-start xl:overflow-y-auto ${ex.surface}`}
        >
          <h2 className={`text-sm font-black ${ex.heading}`}>Compare Projects</h2>
          <p className={`mb-3 text-[10px] ${ex.muted}`}>Select up to 4 projects</p>

          <div className="mb-3 max-h-48 space-y-0.5 overflow-y-auto">
            {allCards.map((card) => (
              <label
                key={card.projectId}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 ${
                  isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={compareIds.includes(card.projectId)}
                  onChange={() => toggleCompare(card.projectId)}
                  disabled={
                    !compareIds.includes(card.projectId) && compareIds.length >= 4
                  }
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span className={`truncate text-xs font-semibold ${ex.body}`}>{card.title}</span>
              </label>
            ))}
          </div>

          {compareCards.length > 0 ? (
            <div className={`space-y-3.5 border-t pt-3 ${ex.borderSubtle}`}>
              <CompareBar
                label="Schedule %"
                isDark={isDarkTheme}
                projects={compareCards
                  .map((c) => ({
                    name: c.title,
                    value: c.vitals.find((v) => v.key === 'schedule')?.percent,
                    color: barColor(c.overallScore),
                  }))
                  .filter((p): p is { name: string; value: number; color: string } => p.value != null)}
              />
              <CompareBar
                label="Cost %"
                isDark={isDarkTheme}
                projects={compareCards
                  .map((c) => ({
                    name: c.title,
                    value: c.vitals.find((v) => v.key === 'budget')?.percent,
                    color: barColor(c.overallScore),
                  }))
                  .filter((p): p is { name: string; value: number; color: string } => p.value != null)}
              />
              <CompareBar
                label="Safety %"
                isDark={isDarkTheme}
                projects={compareCards
                  .map((c) => ({
                    name: c.title,
                    value: c.vitals.find((v) => v.key === 'safety')?.percent,
                    color: barColor(c.overallScore),
                  }))
                  .filter((p): p is { name: string; value: number; color: string } => p.value != null)}
              />
              <CompareBar
                label="Compliance %"
                isDark={isDarkTheme}
                projects={compareCards
                  .map((c) => ({
                    name: c.title,
                    value: c.vitals.find((v) => v.key === 'compliance')?.percent,
                    color: barColor(c.vitals.find((v) => v.key === 'compliance')?.percent ?? null),
                  }))
                  .filter((p): p is { name: string; value: number; color: string } => p.value != null)}
              />
              <CompareBar
                label="Drawings %"
                isDark={isDarkTheme}
                projects={compareCards
                  .map((c) => ({
                    name: c.title,
                    value: c.vitals.find((v) => v.key === 'drawings')?.percent,
                    color: barColor(c.overallScore),
                  }))
                  .filter((p): p is { name: string; value: number; color: string } => p.value != null)}
              />
            </div>
          ) : (
            <p className={`border-t pt-3 text-center text-[10px] ${ex.borderSubtle} ${ex.muted}`}>
              Select projects to compare
            </p>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={compareCards.length === 0 || isExportingCompare}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={14} className={isExportingCompare ? 'animate-pulse' : ''} />
            {isExportingCompare ? 'Exporting…' : `Export Excel (${compareCards.length})`}
          </button>
        </aside>
      </div>

      </>

      {/* Footer legend */}
      <footer
        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 sm:px-4 ${
          isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'
        }`}
      >
        <div className={`flex flex-wrap items-center gap-3 text-[10px] font-bold ${ex.muted}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Green = Healthy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Amber = Watch
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Red = Critical
          </span>
        </div>
        <p className={`text-[10px] font-semibold ${ex.muted}`}>
          — = no module data yet · matches project full view · {user.name || 'PMC Head'}
        </p>
      </footer>
    </div>
  );
};

export default PMCHead360Dashboard;
