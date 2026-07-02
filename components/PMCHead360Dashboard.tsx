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
import { fetchAllProjectVitalsSnapshots } from '../services/projectVitalsService';
import {
  ProjectVitalsCard,
  VitalKey,
  buildPortfolioSummary,
  buildProjectVitalsCardFromSnapshot,
  healthBadgeClass,
  statusColor,
} from '../utils/projectVitals';

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
};

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

const ScoreRing: React.FC<{ score: number | null; size?: number; isDark?: boolean }> = ({
  score,
  size = 80,
  isDark = false,
}) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = score != null ? c - (score / 100) * c : c;
  const stroke =
    score == null ? '#cbd5e1' : score < 50 ? '#ef4444' : score < 75 ? '#f59e0b' : '#22c55e';
  const trackStroke = isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackStroke}
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={5}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-base font-black sm:text-lg ${
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
  const size = 120;
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = score != null ? c - (score / 100) * c : c;
  const trackStroke = isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackStroke} strokeWidth={8} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={score != null ? '#4f46e5' : '#cbd5e1'}
            strokeWidth={8}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-3xl font-black sm:text-4xl ${
              isDark ? 'text-indigo-300' : 'text-indigo-700'
            }`}
          >
            {score ?? '—'}
          </span>
          {score != null && (
            <span className={`text-sm font-bold sm:text-base ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              /100
            </span>
          )}
        </div>
      </div>
      <p className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
}> = ({ shortLabel, value, icon: Icon, accent, isDark = false }) => (
  <div
    className={`flex h-full min-w-0 flex-col justify-between rounded-2xl border p-4 shadow-sm sm:p-5 ${
      isDark ? 'border-white/10 bg-[#0f2744]/70' : 'border-slate-100 bg-white'
    }`}
  >
    <div className="flex items-center gap-2.5">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11"
        style={{ backgroundColor: `${accent}${isDark ? '28' : '18'}`, color: accent }}
      >
        <Icon size={20} />
      </div>
      <p
        className={`min-w-0 text-[11px] font-bold uppercase leading-snug tracking-wide sm:text-xs ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        {shortLabel}
      </p>
    </div>
    <p
      className={`mt-4 text-2xl font-black tabular-nums sm:mt-5 sm:text-3xl ${
        isDark ? 'text-slate-100' : 'text-slate-800'
      }`}
    >
      {value != null ? `${value}%` : '—'}
    </p>
  </div>
);

const VitalRow: React.FC<{ vital: ProjectVitalsCard['vitals'][0]; isDark?: boolean }> = ({
  vital,
  isDark = false,
}) => {
  const Icon = VITAL_ICONS[vital.key];
  const color = statusColor(vital.status);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={16} className={`shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <span
            className={`truncate text-sm font-bold sm:text-base ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {vital.label}
          </span>
        </div>
        <span className="shrink-0 text-base font-black sm:text-lg" style={{ color }}>
          {vital.percent != null ? `${vital.percent}%` : '—'}
        </span>
      </div>
      <div className={`h-2.5 overflow-hidden rounded-full sm:h-3 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: vital.percent != null ? `${vital.percent}%` : '0%',
            backgroundColor: color,
          }}
        />
      </div>
      <p className={`line-clamp-2 text-xs font-semibold sm:text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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

  return (
    <article
      className={`flex min-h-0 flex-col rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${
        isDark ? 'bg-[#0b1d36]/95' : 'bg-white'
      } ${head360HealthBorder(card.healthLabel, isDark)}`}
    >
      <div className="mb-4 grid grid-cols-1 gap-4 sm:mb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h3
            className={`line-clamp-2 text-lg font-black leading-tight sm:text-xl ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}
            title={card.title}
          >
            {card.title}
          </h3>
          <div
            className={`mt-2 flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{card.location}</span>
            </span>
            <span className="truncate">PM: {card.pmName}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
          <ScoreRing score={card.overallScore} size={84} isDark={isDark} />
          <span
            className={`whitespace-nowrap rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-wider sm:text-xs ${head360HealthBadge(card.healthLabel, isDark)}`}
          >
            {card.healthLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 sm:gap-y-4">
        {card.vitals.map((v) => (
          <VitalRow key={v.key} vital={v} isDark={isDark} />
        ))}
      </div>

      <div
        className={`mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4 sm:pt-5 ${
          isDark ? 'border-white/10' : 'border-slate-100'
        }`}
      >
        <div className={`flex items-center gap-1.5 text-sm font-bold capitalize sm:text-base ${trendColor}`}>
          <TrendIcon size={16} />
          {card.trend}
        </div>
        <span className={`text-sm font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {card.lastUpdate}
        </span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className={`mt-4 w-full rounded-xl py-3 text-sm font-black uppercase tracking-widest transition-colors sm:py-3.5 sm:text-base ${
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
  <div className="space-y-2.5">
    <p
      className={`text-xs font-black uppercase tracking-widest sm:text-sm ${
        isDark ? 'text-slate-500' : 'text-slate-400'
      }`}
    >
      {label}
    </p>
    {projects.map((p) => (
      <div key={p.name} className="space-y-1.5">
        <div className="flex justify-between gap-2">
          <span
            className={`truncate text-sm font-semibold sm:text-base ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {p.name}
          </span>
          <span
            className={`shrink-0 text-sm font-black sm:text-base ${
              isDark ? 'text-slate-200' : 'text-slate-700'
            }`}
          >
            {p.value}%
          </span>
        </div>
        <div className={`h-3 overflow-hidden rounded-full sm:h-3.5 ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
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
  const [isLoadingVitals, setIsLoadingVitals] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allCards, setAllCards] = useState<ProjectVitalsCard[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (projects.length === 0) {
        setAllCards([]);
        setIsLoadingVitals(false);
        return;
      }

      setIsLoadingVitals(true);
      setLoadError(null);
      try {
        const snapshots = await fetchAllProjectVitalsSnapshots(projects, dprs, 'PMC Head');
        if (!cancelled) {
          setAllCards(snapshots.map(buildProjectVitalsCardFromSnapshot));
        }
      } catch (error) {
        console.error('Failed to load project vitals:', error);
        if (!cancelled) {
          setLoadError('Unable to load live project data. Please refresh.');
          setAllCards([]);
        }
      } finally {
        if (!cancelled) setIsLoadingVitals(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [projects, dprs]);

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

  const handleExport = () => {
    const rows = compareCards.map((c) =>
      [
        c.title,
        c.overallScore ?? '',
        ...c.vitals.map((v) => (v.percent != null ? v.percent : '')),
      ].join(','),
    );
    const header = 'Project,Score,Schedule,Budget,Manpower,Safety,Reports,Drawings';
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="animate-in fade-in space-y-6 duration-500">
      {/* Page header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.2em] sm:text-sm ${ex.isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>
            PMC Head
          </p>
          <h1 className={`text-2xl font-black tracking-tight sm:text-3xl ${ex.headingStrong}`}>
            Project 360° Overview
          </h1>
        </div>

        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 xl:max-w-2xl xl:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
            <Search
              size={16}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${ex.muted}`}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className={`w-full rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none ring-indigo-500 focus:ring-2 sm:text-base ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder}`}
            />
          </div>

          <div className="relative min-w-0">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className={`w-full appearance-none rounded-xl border py-2.5 pl-3 pr-9 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.textPrimary}`}
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r === 'all' ? 'All Regions' : r}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${ex.muted}`}
            />
          </div>

          <div className="relative min-w-0">
            <select
              value={pmFilter}
              onChange={(e) => setPmFilter(e.target.value)}
              className={`w-full appearance-none rounded-xl border py-2.5 pl-3 pr-9 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.textPrimary}`}
            >
              {pms.map((pm) => (
                <option key={pm} value={pm}>
                  {pm === 'all' ? 'All PMs' : pm}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${ex.muted}`}
            />
          </div>

          <button
            type="button"
            className={`flex h-[42px] w-full items-center justify-center rounded-xl border sm:w-[42px] ${ex.isDark ? 'border-white/15 bg-white/5 text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
        </div>
      </div>

      {/* Portfolio pulse bar */}
      {loadError && (
        <div className={ex.alert}>{loadError}</div>
      )}

      {isLoadingVitals ? (
        <div className={`flex min-h-[360px] flex-col items-center justify-center p-10 ${ex.surface}`}>
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className={`mt-4 text-base font-bold sm:text-lg ${ex.muted}`}>Loading live project data…</p>
        </div>
      ) : (
        <>
      <div className={`overflow-hidden ${ex.surface}`}>
        <div
          className={`grid grid-cols-1 gap-5 p-5 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-6 lg:p-6 ${
            isDarkTheme ? 'lg:divide-x lg:divide-white/10' : 'lg:divide-x lg:divide-slate-100'
          }`}
        >
          <div className="flex justify-center lg:justify-start lg:pr-2">
            <PortfolioGauge score={portfolio.portfolioScore} isDark={isDarkTheme} />
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <KpiPill
              shortLabel="Schedule"
              value={portfolio.scheduleHealth}
              icon={Calendar}
              accent="#ef4444"
              isDark={isDarkTheme}
            />
            <KpiPill
              shortLabel="Financial"
              value={portfolio.financialHealth}
              icon={Wallet}
              accent="#22c55e"
              isDark={isDarkTheme}
            />
            <KpiPill
              shortLabel="Compliance"
              value={portfolio.compliance}
              icon={ClipboardList}
              accent="#f59e0b"
              isDark={isDarkTheme}
            />
            <KpiPill
              shortLabel="Safety"
              value={portfolio.safetyIndex}
              icon={ShieldCheck}
              accent="#22c55e"
              isDark={isDarkTheme}
            />
          </div>
        </div>
      </div>

      {/* Main grid + compare sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0">
          <div className="mb-4">
            <p className={`text-sm font-black uppercase tracking-widest ${ex.muted}`}>
              {filteredCards.length} project{filteredCards.length !== 1 ? 's' : ''} · worst first
            </p>
          </div>

          {filteredCards.length === 0 ? (
            <div className={`p-12 text-center ${ex.emptyState}`}>
              <p className="text-sm font-bold">No projects match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-5">
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
          className={`w-full min-w-0 p-5 sm:p-6 xl:sticky xl:top-4 xl:max-h-[calc(100vh-1.5rem)] xl:self-start xl:overflow-y-auto ${ex.surface}`}
        >
          <h2 className={`text-lg font-black sm:text-xl ${ex.heading}`}>Compare Projects</h2>
          <p className={`mb-4 text-sm ${ex.muted}`}>Select up to 4 projects</p>

          <div className="mb-5 max-h-56 space-y-2 overflow-y-auto">
            {allCards.map((card) => (
              <label
                key={card.projectId}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 ${
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
                <span className={`truncate text-sm font-semibold sm:text-base ${ex.body}`}>{card.title}</span>
              </label>
            ))}
          </div>

          {compareCards.length > 0 ? (
            <div className={`space-y-5 border-t pt-5 ${ex.borderSubtle}`}>
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
            <p className={`border-t pt-5 text-center text-sm ${ex.borderSubtle} ${ex.muted}`}>
              Select projects to compare
            </p>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={compareCards.length === 0}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={16} />
            Export Comparison
          </button>
        </aside>
      </div>

        </>
      )}

      {/* Footer legend */}
      <footer
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-4 sm:px-6 ${
          isDarkTheme ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'
        }`}
      >
        <div className={`flex flex-wrap items-center gap-4 text-sm font-bold ${ex.muted}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Green = Healthy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Amber = Watch
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Red = Critical
          </span>
        </div>
        <p className={`text-sm font-semibold ${ex.muted}`}>
          — = no module data yet · matches project full view · {user.name || 'PMC Head'}
        </p>
      </footer>
    </div>
  );
};

export default PMCHead360Dashboard;
