import React, { useState, useEffect, useMemo } from "react";
import { Icons } from "./Icons";
import { Project } from "../types";
import { wprApi } from "../services/api";
import { ProgressBar } from "./wpr/ProgressBar";
import { TaskStatusBadge, PerformanceBadge, WorkflowStatusBadge } from "./wpr/StatusBadge";
import { SummaryCard } from "./wpr/SummaryCard";
import { useTheme, getThemeClasses } from "../utils/theme";
import {
  strVal,
  numFromUnknown,
  activitiesFromWeek,
  enrichActivities,
  countByTaskStatus,
  performanceFromAvg,
  trendFromAvgs,
  trendIcon,
  trendText,
  parseDeliverablesThisWeek,
  pendingWorkIsUrgent,
  averageProgress,
  coerceObjectRecord,
  deriveActivityStatus,
  type WprActivityLike,
  type WprWeekLike,
} from "./wpr/wprUtils";

export type WPRActivityRow = WprActivityLike;
export type WPRWeekData = WprWeekLike;

export type WPRRecord = {
  id?: string | number;
  project_name: string;
  period?: string;
  weeks: WPRWeekData[];
  project_summary?: string | Record<string, unknown>;
};

const MONTHS: { value: number; label: string }[] = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function yearOptions(): number[] {
  const y = new Date().getFullYear();
  return [y - 2, y - 1, y, y + 1, y + 2];
}

function normalizeRecord(o: Record<string, unknown>): WPRRecord | null {
  const pn = o.project_name;
  if (typeof pn !== "string" || !pn.trim()) return null;
  const weeks = o.weeks;
  return {
    id: o.id as string | number | undefined,
    project_name: pn,
    period: typeof o.period === "string" ? o.period : undefined,
    weeks: Array.isArray(weeks) ? (weeks as WPRWeekData[]) : [],
    project_summary: o.project_summary as WPRRecord["project_summary"],
  };
}

function normalizeWprResponse(data: unknown): WPRRecord[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    return data
      .map((item) =>
        item && typeof item === "object" ? normalizeRecord(item as Record<string, unknown>) : null
      )
      .filter((r): r is WPRRecord => r != null);
  }
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.results)) {
      return normalizeWprResponse(o.results);
    }
    const single = normalizeRecord(o);
    if (single) return [single];
  }
  return [];
}

function weekLabel(week: WPRWeekData, index: number): string {
  const l = strVal(week.week_label);
  if (l) return l;
  const w = week.week ?? week.week_number;
  if (w !== undefined && w !== "") return `Week ${w}`;
  return `Week ${index + 1}`;
}

function weekDateRange(week: WPRWeekData): string {
  const a = strVal(week.start_date) || strVal(week.date_from);
  const b = strVal(week.end_date) || strVal(week.date_to);
  if (a && b) return `${a} – ${b}`;
  return a || b || "—";
}

function formatDateSafe(dateString: string) {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-GB");
  } catch {
    return dateString;
  }
}

function humanizeKey(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ProjectSummaryParsed = {
  overall_completion: number | null;
  status: string;
  extraRows: { key: string; value: string }[];
};

function summaryValueDisplay(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return strVal(v);
  if (Array.isArray(v))
    return v.map((x) => summaryValueDisplay(x)).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    return entries
      .map(([k, val]) => `${humanizeKey(k)}: ${summaryValueDisplay(val)}`)
      .filter((s) => s.length > 0)
      .join(" · ");
  }
  return String(v);
}

function parseProjectSummary(ps: WPRRecord["project_summary"]): ProjectSummaryParsed | null {
  if (ps == null) return null;
  let o: Record<string, unknown> | null = null;
  if (typeof ps === "string") {
    const t = ps.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) o = p as Record<string, unknown>;
      else return { overall_completion: null, status: "", extraRows: [{ key: "Summary", value: t }] };
    } catch {
      return { overall_completion: null, status: "", extraRows: [{ key: "Summary", value: t }] };
    }
  } else if (typeof ps === "object" && !Array.isArray(ps)) {
    o = ps as Record<string, unknown>;
  } else {
    return null;
  }
  if (!o) return null;

  const completionKeys = [
    "overall_completion",
    "completion",
    "overall_progress",
    "percent_complete",
  ] as const;
  let rawCompletion: unknown;
  for (const k of completionKeys) {
    if (k in o && o[k] !== undefined && o[k] !== null && o[k] !== "") {
      rawCompletion = o[k];
      break;
    }
  }
  const overall_completion = rawCompletion !== undefined ? numFromUnknown(rawCompletion) : null;
  const status = strVal(o.status) || strVal(o.overall_status) || "";
  const skip = new Set<string>([...completionKeys, "status", "overall_status"]);
  const extraRows: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (skip.has(k)) continue;
    if (v == null || v === "") continue;
    const line = summaryValueDisplay(v);
    if (line) extraRows.push({ key: humanizeKey(k), value: line });
  }
  return {
    overall_completion,
    status,
    extraRows,
  };
}

function workflowToneFromStatus(status: string): "amber" | "emerald" | "slate" {
  const s = status.toLowerCase();
  if (/\bcomplete/.test(s) && !/in\s*complete/.test(s)) return "emerald";
  if (!s.trim()) return "slate";
  return "amber";
}

interface WPRReviewDashboardProps {
  projects?: Project[];
}

function wprErrorMessage(e: unknown): string {
  const ax = e as { response?: { data?: unknown }; message?: string };
  const d = ax?.response?.data;
  if (typeof d === "string" && d.trim()) return d;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    const detail = o.detail ?? o.message ?? o.error;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length && typeof detail[0] === "string") return detail.join(" ");
  }
  return ax?.message || "Failed to load WPR data. Check API / network.";
}

const WPRReviewDashboard: React.FC<WPRReviewDashboardProps> = ({ projects = [] }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [records, setRecords] = useState<WPRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [filters, setFilters] = useState({ project_name: "" });
  const [apiMonth, setApiMonth] = useState<number | null>(null);
  const [apiYear, setApiYear] = useState(() => new Date().getFullYear());
  const [apiWeek, setApiWeek] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const selectClass = `w-full px-3 py-2 rounded-lg text-xs font-semibold outline-none focus:ring-2 disabled:opacity-50 transition-all ${themeClasses.input} ${themeClasses.textPrimary} ${isDarkTheme ? 'focus:ring-white/20' : 'focus:ring-blue-500/20'}`;

  const projectNameForApi = useMemo(() => {
    const typed = filters.project_name.trim();
    if (typed) return typed;
    const first = projects[0]?.title?.trim();
    return first || "";
  }, [filters.project_name, projects]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!projectNameForApi) {
        setLoading(false);
        setRecords([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params: { project_name: string; month?: number; year?: number; week?: number } = {
          project_name: projectNameForApi,
        };
        if (apiMonth != null) {
          params.month = apiMonth;
          params.year = apiYear;
        }
        if (apiWeek != null) params.week = apiWeek;

        const response = await wprApi.getWPRs(params);
        const raw = response.data?.results ?? response.data;
        const list = normalizeWprResponse(raw);
        if (cancelled) return;
        setRecords(list);
        setSelectedRecordIndex(0);
        setSelectedWeekIndex(0);
      } catch (e: unknown) {
        if (cancelled) return;
        console.error("WPR fetch failed:", e);
        setRecords([]);
        setError(wprErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [projectNameForApi, apiMonth, apiYear, apiWeek]);

  const selectedRecord = records[selectedRecordIndex] ?? null;
  const weeks = selectedRecord?.weeks ?? [];
  const week = weeks[selectedWeekIndex] ?? null;

  useEffect(() => {
    if (selectedWeekIndex >= weeks.length) setSelectedWeekIndex(0);
  }, [weeks.length, selectedWeekIndex]);

  const activityRows = useMemo(() => activitiesFromWeek(week), [week]);
  const enrichedActivities = useMemo(() => enrichActivities(activityRows), [activityRows]);

  const avgTarget = useMemo(
    () => averageProgress(enrichedActivities),
    [enrichedActivities]
  );

  const statusCounts = useMemo(
    () => countByTaskStatus(enrichedActivities),
    [enrichedActivities]
  );

  const performanceLabel = useMemo(() => performanceFromAvg(avgTarget), [avgTarget]);

  const prevWeekAvg = useMemo(() => {
    if (selectedWeekIndex <= 0) return null as number | null;
    const prev = weeks[selectedWeekIndex - 1] ?? null;
    if (!prev) return null;
    return averageProgress(enrichActivities(activitiesFromWeek(prev)));
  }, [weeks, selectedWeekIndex]);

  const trend = useMemo(
    () => trendFromAvgs(avgTarget, prevWeekAvg),
    [avgTarget, prevWeekAvg]
  );

  const parsedProjectSummary = useMemo(
    () => parseProjectSummary(selectedRecord?.project_summary),
    [selectedRecord?.project_summary]
  );

  const deliverablesList = useMemo(() => parseDeliverablesThisWeek(week), [week]);

  const displayWorkflowStatus =
    strVal(week?.status) || strVal(parsedProjectSummary?.status) || "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${isDarkTheme ? 'border-white' : 'border-blue-600'}`}></div>
          <p className={`${themeClasses.textSecondary} text-sm`}>Loading WPRs...</p>
        </div>
      </div>
    );
  }

  const totalActivities =
    week &&
    (week.total_activities != null && String(week.total_activities).trim() !== ""
      ? Number(week.total_activities)
      : enrichedActivities.length);

  const projectSelectValue = (() => {
    const t = filters.project_name.trim();
    if (t && !projects.some((p) => p.title === t)) return t;
    if (t) return t;
    return projects[0]?.title ?? "";
  })();

  return (
    <div className="flex flex-col w-full gap-6 max-w-[1400px] mx-auto">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className={`text-2xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
              WPR Review Dashboard
            </h2>
            <p className={`${themeClasses.textSecondary} text-[10px] font-black uppercase tracking-widest`}>
              Weekly Progress Reports Review &amp; Summary
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
              isDarkTheme 
                ? "bg-white/10 hover:bg-white/15 border-white/20 text-contrast" 
                : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm"
            }`}
          >
            {isExpanded ? (
              <>
                <Icons.ChevronRight size={16} />
                Collapse View
              </>
            ) : (
              <>
                <Icons.Expand size={16} />
                Expand View
              </>
            )}
          </button>
        </div>

        <div className={`mt-4 p-4 rounded-xl border ${themeClasses.border} ${themeClasses.bgSecondary}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="flex flex-col min-w-0 lg:col-span-2">
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>
              Project
            </label>
            <select
              value={projectSelectValue}
              onChange={(e) => setFilters({ project_name: e.target.value })}
              disabled={projects.length === 0}
              className={selectClass}
            >
              {projects.length === 0 ? (
                <option value="">No projects in portfolio</option>
              ) : (
                <>
                  {filters.project_name.trim() !== "" &&
                    !projects.some((p) => p.title === filters.project_name) && (
                      <option value={filters.project_name.trim()}>{filters.project_name.trim()}</option>
                    )}
                  {projects.map((p) => (
                    <option key={p.id} value={p.title} className={isDarkTheme ? 'bg-[#0b1d36]' : 'bg-white'}>
                      {p.title}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="flex flex-col min-w-0">
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>
              Month
            </label>
            <select
              value={apiMonth === null ? "" : String(apiMonth)}
              onChange={(e) => {
                const v = e.target.value;
                setApiMonth(v === "" ? null : Number(v));
              }}
              className={selectClass}
            >
              <option value="" className={isDarkTheme ? 'bg-[#0b1d36]' : 'bg-white'}>All months</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value} className={isDarkTheme ? 'bg-[#0b1d36]' : 'bg-white'}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col min-w-0">
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>
              Year
            </label>
            <select
              value={String(apiYear)}
              onChange={(e) => setApiYear(Number(e.target.value))}
              disabled={apiMonth === null}
              className={selectClass}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y} className={isDarkTheme ? 'bg-[#0b1d36]' : 'bg-white'}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col min-w-0">
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>
              Week (API)
            </label>
            <select
              value={apiWeek === null ? "" : String(apiWeek)}
              onChange={(e) => {
                const v = e.target.value;
                setApiWeek(v === "" ? null : Number(v));
              }}
              className={selectClass}
            >
              <option value="" className={isDarkTheme ? 'bg-[#0b1d36]' : 'bg-white'}>All weeks</option>
              {Array.from({ length: 52 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} className={isDarkTheme ? 'bg-[#0b1d36]' : 'bg-white'}>
                  Week {n}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setFilters({ project_name: projects[0]?.title ?? "" });
              setApiMonth(null);
              setApiYear(new Date().getFullYear());
              setApiWeek(null);
            }}
            className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all ${
              isDarkTheme 
                ? "bg-white/10 hover:bg-white/20 border-white/20 text-contrast" 
                : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
            }`}
          >
            Clear Filters
          </button>

          {records.length > 1 && (
            <div className="flex flex-col min-w-0 sm:col-span-2 lg:col-span-3">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>
                Select WPR
              </label>
              <select
                value={String(selectedRecordIndex)}
                onChange={(e) => {
                  setSelectedRecordIndex(Number(e.target.value));
                  setSelectedWeekIndex(0);
                }}
                className={selectClass}
              >
                {records.map((r, i) => (
                  <option key={r.id ?? `${r.project_name}-${i}`} value={i} className={isDarkTheme ? 'bg-[#0b1d36]' : 'bg-white'}>
                    {r.project_name}
                    {r.period ? ` · ${r.period}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          </div>
        </div>

        {weeks.length > 1 && selectedRecord && (
          <div className="mt-3 flex flex-col min-w-[200px] max-w-lg">
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>
              View period in report
            </label>
            <select
              value={String(selectedWeekIndex)}
              onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
              className={selectClass}
            >
              {weeks.map((w, i) => (
                <option key={i} value={i} className={isDarkTheme ? 'bg-[#0b1d36]' : 'bg-white'}>
                  {weekLabel(w, i)} · {weekDateRange(w)}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedRecord && week ? (
          <div className={`mt-4 ${themeClasses.glassCard} rounded-2xl border ${themeClasses.border} p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4`}>
            <SummaryCard
              title="Week"
              padded={false}
              className="!bg-transparent !border-0 !p-0 hover:!bg-transparent hover:!border-transparent"
            >
              <p className={`text-lg font-black ${themeClasses.textPrimary}`}>{weekLabel(week, selectedWeekIndex)}</p>
              <p className={`text-[10px] ${isDarkTheme ? 'text-white/45' : 'text-gray-500'} font-bold uppercase tracking-wider mt-1`}>
                Reporting period
              </p>
            </SummaryCard>
            <SummaryCard
              title="Date range"
              padded={false}
              className="!bg-transparent !border-0 !p-0 hover:!bg-transparent hover:!border-transparent"
            >
              <p className={`text-sm font-bold flex items-center gap-2 ${themeClasses.textPrimary}`}>
                <Icons.Calendar size={16} className={`${isDarkTheme ? 'text-white/50' : 'text-gray-400'} shrink-0`} />
                {weekDateRange(week)}
              </p>
            </SummaryCard>
            <SummaryCard
              title="Status"
              padded={false}
              className="!bg-transparent !border-0 !p-0 hover:!bg-transparent hover:!border-transparent"
            >
              <WorkflowStatusBadge
                label={displayWorkflowStatus}
                tone={workflowToneFromStatus(displayWorkflowStatus)}
              />
            </SummaryCard>
            <SummaryCard
              title="Performance"
              padded={false}
              className="!bg-transparent !border-0 !p-0 hover:!bg-transparent hover:!border-transparent"
            >
              <PerformanceBadge label={performanceLabel} />
            </SummaryCard>
            <SummaryCard
              title="Trend"
              padded={false}
              className="!bg-transparent !border-0 !p-0 hover:!bg-transparent hover:!border-transparent"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {trendIcon(trend)}
                </span>
                <span className={`text-sm font-black ${themeClasses.textPrimary}`}>{trendText(trend)}</span>
              </div>
              {trend === "na" ? (
                <p className={`text-[10px] ${isDarkTheme ? 'text-white/40' : 'text-gray-500'} mt-1`}>vs previous week in report</p>
              ) : (
                <p className={`text-[10px] ${isDarkTheme ? 'text-white/40' : 'text-gray-500'} mt-1`}>vs previous week</p>
              )}
            </SummaryCard>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-bold flex items-start gap-3">
            <Icons.AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <div className={`flex gap-6 items-stretch ${isExpanded ? "flex-col" : "flex-col xl:flex-row"}`}>
        <div className={`flex-1 ${themeClasses.glassCard} rounded-2xl border ${themeClasses.border} flex flex-col min-w-0`}>
          {selectedRecord && week ? (
            <>
              <div className={`flex-shrink-0 p-6 border-b ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xl font-black truncate ${themeClasses.textPrimary}`}>{selectedRecord.project_name}</h3>
                    <div className={`flex items-center gap-3 mt-2 text-sm flex-wrap ${themeClasses.textSecondary}`}>
                      <span className="flex items-center gap-2">
                        <Icons.Activity size={14} />
                        {totalActivities} activities
                      </span>
                      {strVal(week.quality_status) ? (
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                          Quality: {strVal(week.quality_status)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(
                    [
                      ["Issues", strVal(week.issues)],
                      ["Remarks", strVal(week.remarks)],
                      ["Quality Status", strVal(week.quality_status)],
                      ["Billing Status", strVal(week.billing_status)],
                      ["Drawing Status", strVal(week.drawing_status)],
                      ["Incidents", strVal(week.incidents)],
                    ] as const
                  ).map(
                    ([label, val]) =>
                      val && (
                        <div
                          key={label}
                          className={`p-4 rounded-xl border transition-all ${themeClasses.bgSecondary} ${themeClasses.border} ${isDarkTheme ? 'hover:border-white/18 hover:bg-white/[0.07]' : 'hover:border-gray-300 hover:bg-gray-100/50'}`}
                        >
                          <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                            {label}
                          </label>
                          <p className={`text-sm leading-relaxed ${themeClasses.textPrimary}`}>{val}</p>
                        </div>
                      )
                  )}
                </div>

                {Array.isArray(week.pending_work) && week.pending_work.length > 0 && (
                  <section>
                    <h4 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${themeClasses.textSecondary}`}>
                      <Icons.Task size={16} />
                      Pending Work
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {week.pending_work.map((item, idx) => {
                        const o = coerceObjectRecord(item);
                        const title =
                          o &&
                          (strVal(o.activity) ||
                            strVal(o.name) ||
                            strVal(o.title) ||
                            strVal(o.task) ||
                            strVal(o.description));
                        const deliverable =
                          o &&
                          (strVal(o.deliverable) ||
                            strVal(o.deliverables) ||
                            strVal(o.deliverable_name));
                        const progress = o
                          ? numFromUnknown(o.progress ?? o.target_achieved ?? o.target ?? o.percent)
                          : 0;
                        const updatedRaw =
                          o &&
                          (strVal(o.last_updated) || strVal(o.date) || strVal(o.updated_at));
                        const nextPlan =
                          o &&
                          (strVal(o.next_plan) ||
                            strVal(o.remarks) ||
                            strVal(o.remark) ||
                            strVal(o.notes));
                        const fallback = !o ? strVal(item) : strVal(o.description);
                        const showTitle = title || fallback;
                        const status = deriveActivityStatus(
                          progress,
                          strVal(o?.status)
                        );
                        const urgent =
                          o && updatedRaw
                            ? pendingWorkIsUrgent(progress, updatedRaw)
                            : progress < 25;

                        if (!showTitle && !deliverable && !updatedRaw && !nextPlan && progress === 0) {
                          return null;
                        }

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border space-y-3 transition-all ${
                              urgent
                                ? isDarkTheme 
                                  ? "border-amber-500/45 bg-amber-500/5 ring-1 ring-amber-500/20" 
                                  : "border-amber-200 bg-amber-50 ring-1 ring-amber-100"
                                : `${themeClasses.border} ${themeClasses.bgSecondary} ${isDarkTheme ? 'hover:border-white/25 hover:bg-white/[0.06]' : 'hover:border-gray-300 hover:bg-gray-100/50'}`
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              {showTitle ? (
                                <p className={`text-sm font-black leading-snug ${themeClasses.textPrimary}`}>{showTitle}</p>
                              ) : null}
                              <TaskStatusBadge status={status} />
                            </div>
                            {deliverable ? (
                              <div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                                  Deliverable
                                </span>
                                <p className={`text-xs mt-0.5 ${isDarkTheme ? 'text-white/80' : 'text-gray-700'}`}>{deliverable}</p>
                              </div>
                            ) : null}
                            <div>
                              <div className={`flex justify-between text-[10px] font-bold mb-1 ${isDarkTheme ? 'text-white/50' : 'text-gray-500'}`}>
                                <span>Progress</span>
                                <span className={themeClasses.textPrimary}>{progress.toFixed(0)}%</span>
                              </div>
                              <ProgressBar
                                value={progress}
                                barClassName={
                                  progress >= 80
                                    ? "bg-emerald-500"
                                    : progress >= 40
                                      ? "bg-amber-400"
                                      : "bg-rose-400"
                                }
                              />
                            </div>
                            {updatedRaw ? (
                              <p className={`text-xs ${isDarkTheme ? 'text-white/55' : 'text-gray-500'}`}>
                                <span className={`font-black uppercase tracking-wider text-[10px] ${themeClasses.textSecondary}`}>
                                  Last updated{" "}
                                </span>
                                {formatDateSafe(updatedRaw)}
                              </p>
                            ) : null}
                            {nextPlan ? (
                              <div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                                  Next plan
                                </span>
                                <p className={`text-xs mt-0.5 leading-relaxed ${isDarkTheme ? 'text-white/70' : 'text-gray-600'}`}>{nextPlan}</p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="space-y-4">
                  <h4 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${themeClasses.textSecondary}`}>
                    <Icons.Approve size={16} />
                    Deliverables This Week
                  </h4>
                  {deliverablesList.length > 0 ? (
                    <ul className={`rounded-xl border divide-y overflow-hidden ${themeClasses.border} ${themeClasses.bgSecondary} ${isDarkTheme ? 'divide-white/10' : 'divide-gray-100'}`}>
                      {deliverablesList.map((line, i) => (
                        <li
                          key={`${i}-${line}`}
                          className={`px-4 py-3 text-sm flex items-start gap-3 transition-colors ${themeClasses.textPrimary} ${isDarkTheme ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-50'}`}
                        >
                          <Icons.Approve
                            size={18}
                            className={`${isDarkTheme ? 'text-emerald-400/90' : 'text-emerald-600'} shrink-0 mt-0.5`}
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={`rounded-xl border border-dashed px-4 py-8 text-center ${isDarkTheme ? 'border-white/15 bg-white/[0.03]' : 'border-gray-300 bg-gray-50'}`}>
                      <p className={`text-sm font-bold ${isDarkTheme ? 'text-white/45' : 'text-gray-500'}`}>No completed deliverables</p>
                    </div>
                  )}
                </section>

                {/* Activities section removed as requested */}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Icons.Document className={`mx-auto mb-4 ${isDarkTheme ? 'text-white/20' : 'text-gray-300'}`} size={64} />
                <p className={`font-bold text-lg ${themeClasses.textPrimary}`}>No WPR data</p>
                <p className={`text-sm mt-2 max-w-md mx-auto ${themeClasses.textSecondary}`}>
                  {!projectNameForApi
                    ? "GET /api/wpr/ requires project_name. Add projects in Portfolio or pick a project above."
                    : records.length === 0
                      ? `No report returned for “${projectNameForApi}”. Check spelling or backend data.`
                      : "Select a week or adjust filters."}
                </p>
              </div>
            </div>
          )}
        </div>

        {!isExpanded && (
          <div className={`w-full xl:w-80 flex-shrink-0 ${themeClasses.glassCard} rounded-2xl border ${themeClasses.border} flex flex-col`}>
            {selectedRecord && week ? (
              <>
                <div className={`p-4 border-b ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                  <h4 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${themeClasses.textSecondary}`}>
                    <Icons.Approve size={16} />
                    Summary Panel
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  <SummaryCard>
                    <div className="text-center">
                      <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                        Workflow Status
                      </label>
                      <WorkflowStatusBadge
                        label={displayWorkflowStatus}
                        tone={workflowToneFromStatus(displayWorkflowStatus)}
                      />
                    </div>
                  </SummaryCard>

                  <SummaryCard title="Report Details">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className={themeClasses.textSecondary}>Project</span>
                        <span className={`font-bold truncate max-w-[55%] text-right ${themeClasses.textPrimary}`}>
                          {selectedRecord.project_name}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className={themeClasses.textSecondary}>Period</span>
                        <span className={`font-bold ${themeClasses.textPrimary}`}>{selectedRecord.period || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className={themeClasses.textSecondary}>Week</span>
                        <span className={`font-bold ${themeClasses.textPrimary}`}>
                          {weekLabel(week, selectedWeekIndex)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className={themeClasses.textSecondary}>Activities</span>
                        <span className={`font-bold ${themeClasses.textPrimary}`}>{enrichedActivities.length}</span>
                      </div>
                    </div>
                  </SummaryCard>

                  {enrichedActivities.length > 0 && (
                    <SummaryCard title="Task status">
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={themeClasses.textSecondary}>Avg. progress</span>
                            <span className={`font-bold ${themeClasses.textPrimary}`}>{avgTarget.toFixed(1)}%</span>
                          </div>
                          <ProgressBar value={avgTarget} barClassName="bg-indigo-500" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className={`p-2.5 rounded-lg border transition-transform hover:scale-[1.02] ${isDarkTheme ? 'bg-emerald-500/10 border-emerald-500/15' : 'bg-emerald-50 border-emerald-100'}`}>
                            <p className={`text-lg font-black ${isDarkTheme ? 'text-emerald-300' : 'text-emerald-600'}`}>{statusCounts.completed}</p>
                            <p className={`text-[9px] uppercase font-bold ${themeClasses.textSecondary}`}>Completed</p>
                          </div>
                          <div className={`p-2.5 rounded-lg border transition-transform hover:scale-[1.02] ${isDarkTheme ? 'bg-amber-500/10 border-amber-500/15' : 'bg-amber-50 border-amber-100'}`}>
                            <p className={`text-lg font-black ${isDarkTheme ? 'text-amber-300' : 'text-amber-600'}`}>{statusCounts.in_progress}</p>
                            <p className={`text-[9px] uppercase font-bold ${themeClasses.textSecondary}`}>In progress</p>
                          </div>
                          <div className={`p-2.5 rounded-lg border transition-transform hover:scale-[1.02] ${isDarkTheme ? 'bg-rose-500/10 border-rose-500/15' : 'bg-rose-50 border-rose-100'}`}>
                            <p className={`text-lg font-black ${isDarkTheme ? 'text-rose-300' : 'text-rose-600'}`}>{statusCounts.pending}</p>
                            <p className={`text-[9px] uppercase font-bold ${themeClasses.textSecondary}`}>Pending</p>
                          </div>
                        </div>
                      </div>
                    </SummaryCard>
                  )}

                  <SummaryCard title="Performance">
                    <div className="flex flex-col items-center gap-2">
                      <PerformanceBadge label={performanceLabel} />
                      <p className={`text-[10px] text-center leading-relaxed ${themeClasses.textSecondary}`}>
                        Based on average activity progress for this period.
                      </p>
                    </div>
                  </SummaryCard>

                  <SummaryCard title="Trend">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden>
                        {trendIcon(trend)}
                      </span>
                      <div>
                        <p className={`text-sm font-black ${themeClasses.textPrimary}`}>{trendText(trend)}</p>
                        <p className={`text-[10px] mt-0.5 ${themeClasses.textSecondary}`}>
                          Compared to the previous week in this report.
                        </p>
                      </div>
                    </div>
                  </SummaryCard>

                  {parsedProjectSummary &&
                  (parsedProjectSummary.overall_completion !== null ||
                    parsedProjectSummary.status ||
                    parsedProjectSummary.extraRows.length > 0) ? (
                    <SummaryCard title="Project summary">
                      {parsedProjectSummary.overall_completion !== null ? (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={themeClasses.textSecondary}>Overall progress</span>
                            <span className={`font-bold ${themeClasses.textPrimary}`}>
                              {parsedProjectSummary.overall_completion.toFixed(0)}%
                            </span>
                          </div>
                          <ProgressBar
                            value={parsedProjectSummary.overall_completion}
                            barClassName="bg-emerald-500/90"
                          />
                        </div>
                      ) : null}
                      {parsedProjectSummary.status ? (
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                            Status
                          </span>
                          <WorkflowStatusBadge
                            label={parsedProjectSummary.status}
                            tone={workflowToneFromStatus(parsedProjectSummary.status)}
                          />
                        </div>
                      ) : null}
                      {parsedProjectSummary.extraRows.length > 0 ? (
                        <dl className={`space-y-2 text-xs border-t pt-3 ${isDarkTheme ? 'border-white/10' : 'border-gray-100'}`}>
                          {parsedProjectSummary.extraRows.map((r) => (
                            <div key={r.key} className="flex justify-between gap-3">
                              <dt className={`${themeClasses.textSecondary} shrink-0`}>{r.key}</dt>
                              <dd className={`font-semibold text-right leading-snug ${themeClasses.textPrimary}`}>
                                {r.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </SummaryCard>
                  ) : null}

                  {/* Filters applied summary removed as requested */}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center p-8 py-16">
                <div className="text-center">
                  <Icons.Approve className={`mx-auto mb-4 ${isDarkTheme ? 'text-white/20' : 'text-gray-300'}`} size={48} />
                  <p className={`font-bold ${themeClasses.textPrimary}`}>No data</p>
                  <p className={`text-xs mt-2 ${themeClasses.textSecondary}`}>Load a WPR to see summary</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WPRReviewDashboard;
