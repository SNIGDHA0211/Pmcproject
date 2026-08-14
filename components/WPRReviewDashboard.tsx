import React, { useState, useEffect, useMemo } from "react";
import { Icons } from "./Icons";
import { Project, User, UserRole } from "../types";
import { wprApi } from "../services/api";
import { ProgressBar } from "./wpr/ProgressBar";
import {
  TaskStatusBadge,
  PerformanceBadge,
  WorkflowStatusBadge,
} from "./wpr/StatusBadge";
import DprReviewKpiCards from "./dprReview/DprReviewKpiCards";
import {
  statusCardClass,
  getStatusFieldTone,
  type StatusCardTone,
} from "../utils/dprReviewDisplay";
import {
  getWprSummaryCountColors,
  getWprTy,
} from "../utils/wprReviewTypography";
import TutorialVideosPanel from "./tutorialVideos/TutorialVideosPanel";
import TutorialWatchButton from "./tutorialVideos/TutorialWatchButton";
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
  normalizeWprResponse,
  type WprRecordLike,
} from "./wpr/wprUtils";

export type WPRActivityRow = WprActivityLike;
export type WPRWeekData = WprWeekLike;
export type WPRRecord = WprRecordLike;

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
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return strVal(v);
  if (Array.isArray(v))
    return v
      .map((x) => summaryValueDisplay(x))
      .filter(Boolean)
      .join(", ");
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    return entries
      .map(([k, val]) => `${humanizeKey(k)}: ${summaryValueDisplay(val)}`)
      .filter((s) => s.length > 0)
      .join(" · ");
  }
  return String(v);
}

function parseProjectSummary(
  ps: WPRRecord["project_summary"],
): ProjectSummaryParsed | null {
  if (ps == null) return null;
  let o: Record<string, unknown> | null = null;
  if (typeof ps === "string") {
    const t = ps.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p))
        o = p as Record<string, unknown>;
      else
        return {
          overall_completion: null,
          status: "",
          extraRows: [{ key: "Summary", value: t }],
        };
    } catch {
      return {
        overall_completion: null,
        status: "",
        extraRows: [{ key: "Summary", value: t }],
      };
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
  const overall_completion =
    rawCompletion !== undefined ? numFromUnknown(rawCompletion) : null;
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

function wprStatusFieldTone(key: string): StatusCardTone {
  switch (key) {
    case "issues":
      return "critical";
    case "incidents":
      return "pending";
    case "quality_status":
      return "good";
    case "billing_status":
      return getStatusFieldTone("bill_status");
    case "drawing_status":
      return getStatusFieldTone("gfc_status");
    case "remarks":
    default:
      return "neutral";
  }
}

function wprBackendRole(role?: UserRole): string | undefined {
  if (role === UserRole.PMC_HEAD || role === UserRole.PMC_HEAD_OFFICE) return "PMC Head";
  if (role === UserRole.TEAM_LEAD) return "Team Leader";
  // Backend may still expect Coordinator group for PMC Manager
  if (role === UserRole.COORDINATOR) return "Coordinator";
  if (role === UserRole.BILLING_SITE_ENGINEER) return "Billing Site Engineer";
  return undefined;
}

interface WPRReviewDashboardProps {
  projects?: Project[];
  currentUser?: User | null;
  selectedProjectId?: string | null;
}

function wprErrorMessage(e: unknown): string {
  const ax = e as { response?: { data?: unknown }; message?: string };
  const d = ax?.response?.data;
  if (typeof d === "string" && d.trim()) return d;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    const detail = o.detail ?? o.message ?? o.error;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length && typeof detail[0] === "string")
      return detail.join(" ");
  }
  return ax?.message || "Failed to load WPR data. Check API / network.";
}

function isWprAggregationError(e: unknown): boolean {
  const msg = wprErrorMessage(e).toLowerCase();
  return (
    msg.includes("aggregat") ||
    msg.includes("error occurred while") ||
    msg.includes("internal server")
  );
}

function extractWprPayload(responseData: unknown): unknown {
  if (responseData == null || typeof responseData !== "object") return responseData;
  const envelope = responseData as Record<string, unknown>;
  const err = envelope.error ?? envelope.detail ?? envelope.message;
  if (typeof err === "string" && err.trim()) {
    throw new Error(err);
  }
  return envelope.results ?? envelope.data ?? responseData;
}

const WPRReviewDashboard: React.FC<WPRReviewDashboardProps> = ({
  projects = [],
  currentUser = null,
  selectedProjectId = null,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const wprTy = useMemo(() => getWprTy(isDarkTheme), [isDarkTheme]);
  const summaryColors = useMemo(
    () => getWprSummaryCountColors(isDarkTheme),
    [isDarkTheme],
  );
  const backendRole = useMemo(
    () => wprBackendRole(currentUser?.role),
    [currentUser?.role],
  );

  const accessibleProjects = useMemo(() => {
    if (currentUser?.role !== UserRole.TEAM_LEAD) return projects;
    const assigned = projects.filter(
      (project) =>
        project.teamLeadId &&
        (project.teamLeadId === currentUser.id ||
          (currentUser.username &&
            project.teamLeadId === currentUser.username)),
    );
    return assigned.length > 0 ? assigned : projects;
  }, [projects, currentUser?.role, currentUser?.id, currentUser?.username]);

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

  const filterSelectClass = `wpr-review-select dpr-review-select w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 disabled:opacity-50 ${wprTy.filterInput} ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${isDarkTheme ? "focus:ring-white/20" : "focus:ring-indigo-500/20"}`;

  const projectOptions = useMemo(() => {
    const names = new Set<string>();
    for (const project of accessibleProjects) {
      const title = project.title?.trim();
      if (title) names.add(title);
    }
    for (const record of records) {
      const name = record.project_name?.trim();
      if (name) names.add(name);
    }
    const active = filters.project_name?.trim();
    if (active) names.add(active);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [accessibleProjects, records, filters.project_name]);

  const effectiveProjectName = useMemo(() => {
    const selected = filters.project_name.trim();
    if (selected) return selected;
    if (selectedProjectId) {
      const fromHeader = accessibleProjects
        .find((project) => project.id === selectedProjectId)
        ?.title?.trim();
      if (fromHeader) return fromHeader;
    }
    return projectOptions[0] || accessibleProjects[0]?.title?.trim() || "";
  }, [
    filters.project_name,
    selectedProjectId,
    accessibleProjects,
    projectOptions,
  ]);

  useEffect(() => {
    if (filters.project_name.trim() || accessibleProjects.length === 0) return;
    const fromHeader = selectedProjectId
      ? accessibleProjects
          .find((project) => project.id === selectedProjectId)
          ?.title?.trim()
      : "";
    const defaultName =
      fromHeader ||
      accessibleProjects[0]?.title?.trim() ||
      projectOptions[0] ||
      "";
    if (defaultName) {
      setFilters({ project_name: defaultName });
    }
  }, [
    accessibleProjects,
    selectedProjectId,
    projectOptions,
    filters.project_name,
  ]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!effectiveProjectName) {
        setLoading(false);
        setRecords([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const buildParams = (includeRole: boolean) => {
          const params: {
            project_name: string;
            month?: number;
            year?: number;
            week?: number;
            role?: string;
          } = {
            project_name: effectiveProjectName,
          };
          if (includeRole && backendRole) params.role = backendRole;
          if (apiMonth != null) {
            params.month = apiMonth;
            params.year = apiYear;
          }
          if (apiWeek != null) params.week = apiWeek;
          return params;
        };

        let response;
        try {
          response = await wprApi.getWPRs(buildParams(true));
        } catch (firstError: unknown) {
          if (backendRole && isWprAggregationError(firstError)) {
            response = await wprApi.getWPRs(buildParams(false));
          } else {
            throw firstError;
          }
        }

        const raw = extractWprPayload(response.data);
        const list = normalizeWprResponse(raw, effectiveProjectName);
        if (cancelled) return;
        setRecords(list);
        setSelectedRecordIndex(0);
        setSelectedWeekIndex(0);
        if (list.length === 0) {
          setError(null);
        }
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
  }, [effectiveProjectName, apiMonth, apiYear, apiWeek, backendRole]);

  const selectedRecord = records[selectedRecordIndex] ?? null;
  const weeks = selectedRecord?.weeks ?? [];
  const week = weeks[selectedWeekIndex] ?? null;

  useEffect(() => {
    if (selectedWeekIndex >= weeks.length) setSelectedWeekIndex(0);
  }, [weeks.length, selectedWeekIndex]);

  const activityRows = useMemo(() => activitiesFromWeek(week), [week]);
  const enrichedActivities = useMemo(
    () => enrichActivities(activityRows),
    [activityRows],
  );

  const avgTarget = useMemo(
    () => averageProgress(enrichedActivities),
    [enrichedActivities],
  );

  const statusCounts = useMemo(
    () => countByTaskStatus(enrichedActivities),
    [enrichedActivities],
  );

  const performanceLabel = useMemo(
    () => performanceFromAvg(avgTarget),
    [avgTarget],
  );

  const prevWeekAvg = useMemo(() => {
    if (selectedWeekIndex <= 0) return null as number | null;
    const prev = weeks[selectedWeekIndex - 1] ?? null;
    if (!prev) return null;
    return averageProgress(enrichActivities(activitiesFromWeek(prev)));
  }, [weeks, selectedWeekIndex]);

  const trend = useMemo(
    () => trendFromAvgs(avgTarget, prevWeekAvg),
    [avgTarget, prevWeekAvg],
  );

  const parsedProjectSummary = useMemo(
    () => parseProjectSummary(selectedRecord?.project_summary),
    [selectedRecord?.project_summary],
  );

  const deliverablesList = useMemo(
    () => parseDeliverablesThisWeek(week),
    [week],
  );

  const displayWorkflowStatus =
    strVal(week?.status) || strVal(parsedProjectSummary?.status) || "—";

  if (loading) {
    return (
      <div className="flex min-w-0 items-center justify-center px-4 py-16 sm:py-24">
        <div className="text-center">
          <div
            className={`mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 ${isDarkTheme ? "border-white" : "border-indigo-600"}`}
          />
          <p className={wprTy.helperText}>Loading WPRs...</p>
        </div>
      </div>
    );
  }

  const totalActivities =
    week &&
    (week.total_activities != null &&
    String(week.total_activities).trim() !== ""
      ? Number(week.total_activities)
      : enrichedActivities.length);

  const projectSelectValue = effectiveProjectName;

  return (
    <div
      className={`wpr-review-dashboard flex min-w-0 w-full flex-col overflow-x-hidden ${
        isDarkTheme
          ? "wpr-review-dashboard--dark"
          : "wpr-review-dashboard--light"
      }`}
    >
      {/* Header */}
      <div className="mb-4 flex-shrink-0 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className={wprTy.pageTitle}>WPR Review Dashboard</h2>
            <p className={`mt-1 ${wprTy.pageSubtitle}`}>
              Weekly progress reports — review and summary
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
            <TutorialWatchButton section="wpr_review" variant="panel" isDark={isDarkTheme} />
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all sm:w-auto ${themeClasses.buttonSecondary} ${themeClasses.border}`}
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
        </div>

        {/* Filters */}
        <div
          className={`mt-4 rounded-2xl border p-4 sm:p-5 ${themeClasses.bgSecondary} ${themeClasses.border}`}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 sm:col-span-2 lg:col-span-2">
              <label className={wprTy.filterLabel}>Project Name</label>
              <select
                value={projectSelectValue}
                onChange={(e) => setFilters({ project_name: e.target.value })}
                disabled={projectOptions.length === 0}
                className={filterSelectClass}
              >
                {projectOptions.length === 0 ? (
                  <option value="">No projects available</option>
                ) : (
                  projectOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="min-w-0">
              <label className={wprTy.filterLabel}>Month</label>
              <select
                value={apiMonth === null ? "" : String(apiMonth)}
                onChange={(e) => {
                  const v = e.target.value;
                  setApiMonth(v === "" ? null : Number(v));
                }}
                className={filterSelectClass}
              >
                <option value="">All months</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className={wprTy.filterLabel}>Year</label>
              <select
                value={String(apiYear)}
                onChange={(e) => setApiYear(Number(e.target.value))}
                disabled={apiMonth === null}
                className={filterSelectClass}
              >
                {yearOptions().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className={wprTy.filterLabel}>Week</label>
              <select
                value={apiWeek === null ? "" : String(apiWeek)}
                onChange={(e) => {
                  const v = e.target.value;
                  setApiWeek(v === "" ? null : Number(v));
                }}
                className={filterSelectClass}
              >
                <option value="">All weeks</option>
                {Array.from({ length: 52 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Week {n}
                  </option>
                ))}
              </select>
            </div>

            {records.length > 1 && (
              <div className="min-w-0 sm:col-span-2">
                <label className={wprTy.filterLabel}>Select WPR</label>
                <select
                  value={String(selectedRecordIndex)}
                  onChange={(e) => {
                    setSelectedRecordIndex(Number(e.target.value));
                    setSelectedWeekIndex(0);
                  }}
                  className={filterSelectClass}
                >
                  {records.map((r, i) => (
                    <option key={r.id ?? `${r.project_name}-${i}`} value={i}>
                      {r.project_name}
                      {r.period ? ` · ${r.period}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {weeks.length > 1 && selectedRecord && (
              <div className="min-w-0 sm:col-span-2">
                <label className={wprTy.filterLabel}>View period in report</label>
                <select
                  value={String(selectedWeekIndex)}
                  onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
                  className={filterSelectClass}
                >
                  {weeks.map((w, i) => (
                    <option key={i} value={i}>
                      {weekLabel(w, i)} · {weekDateRange(w)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="button"
                onClick={() => {
                  setFilters({
                    project_name:
                      projectOptions[0] ?? accessibleProjects[0]?.title ?? "",
                  });
                  setApiMonth(null);
                  setApiYear(new Date().getFullYear());
                  setApiWeek(null);
                }}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all sm:w-auto ${themeClasses.buttonSecondary} ${themeClasses.border} ${themeClasses.bgHover}`}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div
            className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm font-semibold ${isDarkTheme ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700"}`}
          >
            <Icons.AlertCircle className="mt-0.5 flex-shrink-0" size={20} />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        ) : null}
      </div>

      {/* Main content */}
      <div
        className={`grid items-start gap-4 sm:gap-6 ${
          isExpanded
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]"
        }`}
      >
        <div
          className={`flex min-w-0 flex-1 flex-col rounded-2xl ${themeClasses.glassCard} ${themeClasses.border}`}
        >
          {selectedRecord && week ? (
            <>
              <div
                className={`flex-shrink-0 border-b p-4 sm:p-6 ${themeClasses.border} ${themeClasses.bgSecondary}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                      <h3 className={`break-words ${wprTy.cardHeading}`}>
                        {selectedRecord.project_name}
                      </h3>
                      {selectedRecord.period ? (
                        <span className={wprTy.jobBadge}>
                          {selectedRecord.period}
                        </span>
                      ) : null}
                    </div>
                    <div
                      className={`mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 ${wprTy.helperText}`}
                    >
                      <span className="flex items-center gap-2">
                        <Icons.Calendar size={14} />
                        {weekLabel(week, selectedWeekIndex)} ·{" "}
                        {weekDateRange(week)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Icons.Activity size={14} />
                        {totalActivities} Activities
                      </span>
                      <span className="flex items-center gap-2">
                        <PerformanceBadge label={performanceLabel} />
                      </span>
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{trendIcon(trend)}</span>
                        {trendText(trend)}
                      </span>
                    </div>
                  </div>
                  <WorkflowStatusBadge
                    label={displayWorkflowStatus}
                    tone={workflowToneFromStatus(displayWorkflowStatus)}
                  />
                </div>
              </div>

              <div className="space-y-4 p-3 sm:p-4 md:p-5">
                {enrichedActivities.length > 0 && (
                  <DprReviewKpiCards
                    total={enrichedActivities.length}
                    completed={statusCounts.completed}
                    inProgress={statusCounts.in_progress}
                    delayed={statusCounts.pending}
                    fourthLabel="Pending"
                  />
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(
                    [
                      {
                        key: "issues",
                        label: "Issues",
                        value: strVal(week.issues),
                      },
                      {
                        key: "remarks",
                        label: "Remarks",
                        value: strVal(week.remarks),
                      },
                      {
                        key: "quality_status",
                        label: "Quality Status",
                        value: strVal(week.quality_status),
                      },
                      {
                        key: "billing_status",
                        label: "Billing Status",
                        value: strVal(week.billing_status),
                      },
                      {
                        key: "drawing_status",
                        label: "Drawing Status",
                        value: strVal(week.drawing_status),
                      },
                      {
                        key: "incidents",
                        label: "Incidents",
                        value: strVal(week.incidents),
                      },
                    ] as const
                  )
                    .filter((field) => field.value)
                    .map((field) => (
                      <div
                        key={field.key}
                        className={`rounded-xl border p-3 ${statusCardClass(wprStatusFieldTone(field.key), isDarkTheme)}`}
                      >
                        <label className={`mb-1.5 block ${wprTy.metaLabel}`}>
                          {field.label}
                        </label>
                        <p className={wprTy.statusCardValue}>{field.value}</p>
                      </div>
                    ))}
                </div>

                {Array.isArray(week.pending_work) &&
                  week.pending_work.length > 0 && (
                    <section>
                      <h4
                        className={`mb-4 flex items-center gap-2 ${wprTy.sectionTitle}`}
                      >
                        <Icons.Task size={20} className={wprTy.iconMuted} />
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
                            ? numFromUnknown(
                                o.progress ??
                                  o.target_achieved ??
                                  o.target ??
                                  o.percent,
                              )
                            : 0;
                          const updatedRaw =
                            o &&
                            (strVal(o.last_updated) ||
                              strVal(o.date) ||
                              strVal(o.updated_at));
                          const nextPlan =
                            o &&
                            (strVal(o.next_plan) ||
                              strVal(o.remarks) ||
                              strVal(o.remark) ||
                              strVal(o.notes));
                          const fallback = !o
                            ? strVal(item)
                            : strVal(o.description);
                          const showTitle = title || fallback;
                          const status = deriveActivityStatus(
                            progress,
                            strVal(o?.status),
                          );
                          const urgent =
                            o && updatedRaw
                              ? pendingWorkIsUrgent(progress, updatedRaw)
                              : progress < 25;

                          if (
                            !showTitle &&
                            !deliverable &&
                            !updatedRaw &&
                            !nextPlan &&
                            progress === 0
                          ) {
                            return null;
                          }

                          return (
                            <div
                              key={idx}
                              className={`space-y-3 rounded-xl border p-4 transition-all ${
                                urgent
                                  ? isDarkTheme
                                    ? "border-amber-500/45 bg-amber-500/5 ring-1 ring-amber-500/20"
                                    : "border-amber-200 bg-amber-50 ring-1 ring-amber-100"
                                  : `${statusCardClass("neutral", isDarkTheme)}`
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                {showTitle ? (
                                  <p className={wprTy.statusCardValue}>
                                    {showTitle}
                                  </p>
                                ) : null}
                                <TaskStatusBadge status={status} />
                              </div>
                              {deliverable ? (
                                <div>
                                  <span className={wprTy.metaLabel}>
                                    Deliverable
                                  </span>
                                  <p
                                    className={`mt-0.5 ${wprTy.tableSecondary}`}
                                  >
                                    {deliverable}
                                  </p>
                                </div>
                              ) : null}
                              <div>
                                <div
                                  className={`mb-1 flex justify-between ${wprTy.metaLabel}`}
                                >
                                  <span>Progress</span>
                                  <span className={wprTy.detailValue}>
                                    {progress.toFixed(0)}%
                                  </span>
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
                                <p className={wprTy.helperText}>
                                  <span className={wprTy.metaLabel}>
                                    Last updated{" "}
                                  </span>
                                  {formatDateSafe(updatedRaw)}
                                </p>
                              ) : null}
                              {nextPlan ? (
                                <div>
                                  <span className={wprTy.metaLabel}>
                                    Next plan
                                  </span>
                                  <p
                                    className={`mt-0.5 leading-relaxed ${wprTy.tableSecondary}`}
                                  >
                                    {nextPlan}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                <section className="space-y-4">
                  <h4
                    className={`mb-4 flex items-center gap-2 ${wprTy.sectionTitle}`}
                  >
                    <Icons.Approve size={20} className={wprTy.iconMuted} />
                    Deliverables This Week
                  </h4>
                  {deliverablesList.length > 0 ? (
                    <ul
                      className={`overflow-hidden divide-y rounded-xl border ${themeClasses.border} ${themeClasses.bgSecondary} ${isDarkTheme ? "divide-white/10" : "divide-slate-100"}`}
                    >
                      {deliverablesList.map((line, i) => (
                        <li
                          key={`${i}-${line}`}
                          className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors ${wprTy.tablePrimary} ${isDarkTheme ? "hover:bg-white/[0.06]" : "hover:bg-slate-50"}`}
                        >
                          <Icons.Approve
                            size={18}
                            className={`${isDarkTheme ? "text-emerald-400/90" : "text-emerald-600"} mt-0.5 shrink-0`}
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div
                      className={`rounded-xl border border-dashed px-4 py-8 text-center ${themeClasses.border} ${themeClasses.bgSecondary}`}
                    >
                      <p className={wprTy.helperText}>
                        No completed deliverables
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center px-4 py-12 sm:py-16">
              <div className="max-w-md text-center">
                <Icons.Document
                  className={`mx-auto mb-4 ${wprTy.emptyStateIcon}`}
                  size={56}
                />
                <p className={wprTy.emptyStateTitle}>No WPR data</p>
                <p className={`mx-auto mt-2 ${wprTy.emptyStateHint}`}>
                  {!effectiveProjectName
                    ? "GET /api/wpr/ requires project_name. Add projects in Portfolio or pick a project above."
                    : records.length === 0
                      ? `No report returned for “${effectiveProjectName}”. Check spelling or backend data.`
                      : "Select a week or adjust filters."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          className={`wpr-approval-panel flex w-full flex-shrink-0 flex-col rounded-2xl ${
            isExpanded ? "" : "lg:sticky lg:top-4 xl:w-80"
          } ${themeClasses.glassCard} ${themeClasses.border}`}
        >
            {selectedRecord && week ? (
              <>
                <div
                  className={`border-b p-4 ${themeClasses.border} ${themeClasses.bgSecondary}`}
                >
                  <h4
                    className={`flex items-center gap-2 ${wprTy.cardHeading}`}
                  >
                    <Icons.Approve size={16} className="text-indigo-500" />
                    WPR Summary
                  </h4>
                </div>
                <div className="space-y-4 p-4">
                  <div
                    className={`rounded-xl border p-3 text-center ${themeClasses.bgSecondary} ${themeClasses.border}`}
                  >
                    <label className={`mb-2 block ${wprTy.panelSectionTitle}`}>
                      Workflow Status
                    </label>
                    <WorkflowStatusBadge
                      label={displayWorkflowStatus}
                      tone={workflowToneFromStatus(displayWorkflowStatus)}
                    />
                  </div>

                  <div
                    className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}
                  >
                    <label className={`mb-2 block ${wprTy.panelSectionTitle}`}>
                      Report Details
                    </label>
                    <div className="space-y-3">
                      {[
                        {
                          label: "Project",
                          value: selectedRecord.project_name,
                        },
                        {
                          label: "Period",
                          value: selectedRecord.period || "—",
                        },
                        {
                          label: "Week",
                          value: weekLabel(week, selectedWeekIndex),
                        },
                        { label: "Date range", value: weekDateRange(week) },
                        {
                          label: "Activities",
                          value: String(enrichedActivities.length),
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex justify-between gap-3"
                        >
                          <span className={wprTy.detailLabel}>{row.label}</span>
                          <span className={`text-right ${wprTy.detailValue}`}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {enrichedActivities.length > 0 && (
                    <div
                      className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}
                    >
                      <label
                        className={`mb-2 block ${wprTy.panelSectionTitle}`}
                      >
                        Progress Summary
                      </label>
                      <div className="mb-3">
                        <div className="mb-1 flex justify-between">
                          <span className={wprTy.detailLabel}>
                            Avg. progress
                          </span>
                          <span className={wprTy.detailValue}>
                            {avgTarget.toFixed(1)}%
                          </span>
                        </div>
                        <ProgressBar
                          value={avgTarget}
                          barClassName="bg-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div
                          className={`rounded-lg p-2.5 ${isDarkTheme ? "bg-emerald-950" : "bg-emerald-50"}`}
                        >
                          <p
                            className={`${wprTy.summaryCount} ${summaryColors.completed}`}
                          >
                            {statusCounts.completed}
                          </p>
                          <p className={wprTy.summaryLabel}>Completed</p>
                        </div>
                        <div
                          className={`rounded-lg p-2.5 ${isDarkTheme ? "bg-amber-950" : "bg-amber-50"}`}
                        >
                          <p
                            className={`${wprTy.summaryCount} ${summaryColors.inProgress}`}
                          >
                            {statusCounts.in_progress}
                          </p>
                          <p className={wprTy.summaryLabel}>In Progress</p>
                        </div>
                        <div
                          className={`rounded-lg p-2.5 ${isDarkTheme ? "bg-rose-950" : "bg-rose-50"}`}
                        >
                          <p
                            className={`${wprTy.summaryCount} ${summaryColors.delayed}`}
                          >
                            {statusCounts.pending}
                          </p>
                          <p className={wprTy.summaryLabel}>Pending</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}
                  >
                    <label className={`mb-2 block ${wprTy.panelSectionTitle}`}>
                      Performance
                    </label>
                    <div className="flex flex-col items-center gap-2">
                      <PerformanceBadge label={performanceLabel} />
                      <p className={`text-center ${wprTy.helperText}`}>
                        Based on average activity progress for this period.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}
                  >
                    <label className={`mb-2 block ${wprTy.panelSectionTitle}`}>
                      Trend
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden>
                        {trendIcon(trend)}
                      </span>
                      <div>
                        <p className={wprTy.detailValue}>{trendText(trend)}</p>
                        <p className={`mt-0.5 ${wprTy.helperText}`}>
                          Compared to the previous week in this report.
                        </p>
                      </div>
                    </div>
                  </div>

                  {parsedProjectSummary &&
                  (parsedProjectSummary.overall_completion !== null ||
                    parsedProjectSummary.status ||
                    parsedProjectSummary.extraRows.length > 0) ? (
                    <div
                      className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}
                    >
                      <label
                        className={`mb-2 block ${wprTy.panelSectionTitle}`}
                      >
                        Project Summary
                      </label>
                      {parsedProjectSummary.overall_completion !== null ? (
                        <div className="mb-3">
                          <div className="mb-1 flex justify-between">
                            <span className={wprTy.detailLabel}>
                              Overall progress
                            </span>
                            <span className={wprTy.detailValue}>
                              {parsedProjectSummary.overall_completion.toFixed(
                                0,
                              )}
                              %
                            </span>
                          </div>
                          <ProgressBar
                            value={parsedProjectSummary.overall_completion}
                            barClassName="bg-emerald-500/90"
                          />
                        </div>
                      ) : null}
                      {parsedProjectSummary.status ? (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={wprTy.metaLabel}>Status</span>
                          <WorkflowStatusBadge
                            label={parsedProjectSummary.status}
                            tone={workflowToneFromStatus(
                              parsedProjectSummary.status,
                            )}
                          />
                        </div>
                      ) : null}
                      {parsedProjectSummary.extraRows.length > 0 ? (
                        <dl
                          className={`space-y-2 border-t pt-3 ${isDarkTheme ? "border-white/10" : "border-slate-100"}`}
                        >
                          {parsedProjectSummary.extraRows.map((r) => (
                            <div
                              key={r.key}
                              className="flex justify-between gap-3"
                            >
                              <dt className={`${wprTy.detailLabel} shrink-0`}>
                                {r.key}
                              </dt>
                              <dd
                                className={`text-right leading-snug ${wprTy.detailValue}`}
                              >
                                {r.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center p-6 py-12 sm:p-8 sm:py-16">
                <div className="text-center">
                  <Icons.Approve
                    className={`mx-auto mb-4 ${wprTy.emptyStateIcon}`}
                    size={48}
                  />
                  <p className={wprTy.cardHeading}>No Report Selected</p>
                  <p className={`mt-2 ${wprTy.helperText}`}>
                    Load a WPR to see summary
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      <TutorialVideosPanel section="wpr_review" />
    </div>
  );
};

export default WPRReviewDashboard;
