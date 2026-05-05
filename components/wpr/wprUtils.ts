/** Shared WPR presentation logic (no React). */

export type WprActivityLike = Record<string, unknown> & {
  id?: number;
  date?: string;
  activity?: string;
  description?: string;
  deliverables?: string;
  target_achieved?: number;
  progress?: number;
  remarks?: string;
  status?: string;
};

export type ActivityTaskStatus = "completed" | "in_progress" | "pending";

export type EnrichedActivity = {
  id: number | string;
  activity: string;
  progress: number;
  status: ActivityTaskStatus;
  daysTaken: number | null;
  completionDate: string;
  raw: WprActivityLike;
};

export type WprWeekLike = Record<string, unknown> & {
  start_date?: string;
  end_date?: string;
  date_from?: string;
  date_to?: string;
  deliverables?: unknown;
  deliverables_this_week?: unknown;
  weekly_deliverables?: unknown;
  completed_deliverables?: unknown;
  deliverables_list?: unknown;
  pending_work?: unknown[];
  activities?: WprActivityLike[];
};

export function strVal(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

export function numFromUnknown(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/%/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function coerceObjectRecord(item: unknown): Record<string, unknown> | null {
  if (item == null) return null;
  if (typeof item === "object" && !Array.isArray(item)) return item as Record<string, unknown>;
  if (typeof item === "string") {
    const t = item.trim();
    if (!t) return null;
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try {
        const p = JSON.parse(t) as unknown;
        if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>;
      } catch {
        /* fall through */
      }
    }
    return { description: t };
  }
  return { description: String(item) };
}

export function activitiesFromWeek(week: WprWeekLike | null): WprActivityLike[] {
  if (!week) return [];
  const raw = week.activities;
  if (Array.isArray(raw) && raw.length > 0) return raw as WprActivityLike[];

  const pending = week.pending_work;
  if (!Array.isArray(pending) || pending.length === 0) return [];

  return pending.map((item, idx) => {
    const o = coerceObjectRecord(item);
    if (!o) {
      return { id: idx, activity: strVal(item), date: "", deliverables: "", progress: 0, remarks: "" };
    }
    const activity =
      strVal(o.activity) ||
      strVal(o.name) ||
      strVal(o.title) ||
      strVal(o.task) ||
      strVal(o.description);
    const deliverables =
      strVal(o.deliverable) || strVal(o.deliverables) || strVal(o.deliverable_name);
    const date = strVal(o.last_updated) || strVal(o.date) || strVal(o.updated_at);
    const progress = numFromUnknown(o.progress ?? o.target_achieved ?? o.target ?? o.percent);
    const remarks = strVal(o.next_plan) || strVal(o.remarks) || strVal(o.remark) || strVal(o.notes);
    const status = strVal(o.status);
    return {
      ...o,
      id: (typeof o.id === "number" ? o.id : idx) as number,
      date,
      activity,
      deliverables,
      target_achieved: progress,
      progress,
      remarks,
      ...(status ? { status } : {}),
    } as WprActivityLike;
  });
}

export function deriveActivityStatus(progress: number, explicitStatus?: string): ActivityTaskStatus {
  const p = Math.min(100, Math.max(0, numFromUnknown(progress)));
  const s = (explicitStatus || "").toLowerCase();
  if (/\bcomplete(d)?\b/.test(s) && !/incomplete/.test(s)) return "completed";
  if (/\bpending\b/.test(s) || /\bnot\s*started\b/.test(s) || /\bhold\b/.test(s)) return "pending";
  if (/\bprogress\b/.test(s) || /\bin\s*progress\b/.test(s)) return "in_progress";
  if (p >= 100) return "completed";
  if (p > 0) return "in_progress";
  return "pending";
}

export function activityProgressPct(row: WprActivityLike): number {
  const t = row.target_achieved ?? row.progress;
  return numFromUnknown(t);
}

export function daysTakenFromRow(row: WprActivityLike): number | null {
  const direct = numFromUnknown(row.days_taken ?? row.duration_days ?? row.duration);
  if (direct > 0) return Math.round(direct);

  const start = strVal(row.start_date ?? row.started_at ?? row.planned_start);
  const end = strVal(row.completion_date ?? row.completed_at ?? row.end_date ?? row.actual_end);
  if (start && end) {
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      return Math.max(0, Math.round((b - a) / 86400000));
    }
  }
  return null;
}

export function completionDateFromRow(row: WprActivityLike): string {
  return strVal(
    row.completion_date ?? row.completed_at ?? row.actual_completion ?? row.end_date
  );
}

export function enrichActivity(row: WprActivityLike, idx: number): EnrichedActivity {
  const progress = activityProgressPct(row);
  const status = deriveActivityStatus(progress, strVal(row.status));
  return {
    id: row.id ?? idx,
    activity: strVal(row.activity) || strVal(row.description) || "—",
    progress,
    status,
    daysTaken: daysTakenFromRow(row),
    completionDate: completionDateFromRow(row),
    raw: row,
  };
}

export function enrichActivities(rows: WprActivityLike[]): EnrichedActivity[] {
  return rows.map((r, i) => enrichActivity(r, i));
}

export type StatusCounts = { completed: number; in_progress: number; pending: number };

export function countByTaskStatus(rows: EnrichedActivity[]): StatusCounts {
  const acc: StatusCounts = { completed: 0, in_progress: 0, pending: 0 };
  for (const r of rows) {
    acc[r.status] += 1;
  }
  return acc;
}

export type PerformanceLabel = "Excellent" | "Good" | "Poor";

export function performanceFromAvg(avg: number): PerformanceLabel {
  if (avg >= 85) return "Excellent";
  if (avg >= 50) return "Good";
  return "Poor";
}

export type TrendLabel = "improving" | "declining" | "stable" | "na";

export function trendFromAvgs(current: number, previous: number | null): TrendLabel {
  if (previous == null || !Number.isFinite(previous)) return "na";
  const delta = current - previous;
  if (Math.abs(delta) < 3) return "stable";
  return delta > 0 ? "improving" : "declining";
}

export function trendIcon(t: TrendLabel): string {
  switch (t) {
    case "improving":
      return "⬆️";
    case "declining":
      return "⬇️";
    case "stable":
      return "➖";
    default:
      return "—";
  }
}

export function trendText(t: TrendLabel): string {
  switch (t) {
    case "improving":
      return "Improving";
    case "declining":
      return "Declining";
    case "stable":
      return "Stable";
    default:
      return "N/A";
  }
}

function parseDeliverablesUnknown(v: unknown, out: string[]) {
  if (v == null) return;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return;
    if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
      try {
        const p = JSON.parse(t) as unknown;
        parseDeliverablesUnknown(p, out);
        return;
      } catch {
        /* treat as plain text */
      }
    }
    t.split(/\n|;|,/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => out.push(s));
    return;
  }
  if (Array.isArray(v)) {
    for (const item of v) {
      if (typeof item === "string") {
        if (item.trim()) out.push(item.trim());
      } else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const label =
          strVal(o.name) ||
          strVal(o.title) ||
          strVal(o.description) ||
          strVal(o.item);
        if (label) out.push(label);
      }
    }
    return;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const list = o.items ?? o.list ?? o.deliverables;
    if (list) parseDeliverablesUnknown(list, out);
    else {
      const label = strVal(o.name ?? o.title ?? o.description);
      if (label) out.push(label);
    }
  }
}

/** Completed / planned deliverables for the week from API-shaped fields. */
export function parseDeliverablesThisWeek(week: WprWeekLike | null): string[] {
  if (!week) return [];
  const out: string[] = [];
  const keys = [
    week.deliverables_this_week,
    week.weekly_deliverables,
    week.completed_deliverables,
    week.deliverables_list,
    week.deliverables,
  ];
  for (const k of keys) {
    if (k !== undefined) parseDeliverablesUnknown(k, out);
  }
  return [...new Set(out)];
}

/** Highlight when progress is low or last update is older than `staleDays`. */
export function pendingWorkIsUrgent(
  progressPct: number,
  lastUpdatedIso: string,
  staleDays = 7
): boolean {
  const low = progressPct < 25;
  if (!lastUpdatedIso.trim()) return low;
  const t = new Date(lastUpdatedIso).getTime();
  if (!Number.isFinite(t)) return low;
  const ageMs = Date.now() - t;
  const stale = ageMs > staleDays * 86400000;
  return low || stale;
}

export function averageProgress(rows: EnrichedActivity[]): number {
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + r.progress, 0) / rows.length;
}