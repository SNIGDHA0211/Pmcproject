import React, { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { CorrespondenceStatusBreakdown } from "../utils/correspondence";
import {
  DASHBOARD_METRIC_SECONDARY_VALUE_CLASS,
  DASHBOARD_STATUS_METRIC_LABEL_CLASS,
  getThemeClasses,
  useTheme,
} from "../utils/theme";

interface CorrespondenceStatusDonutProps {
  breakdown: CorrespondenceStatusBreakdown;
  compact?: boolean;
  split?: boolean;
}

const SEGMENTS = [
  { key: "onTime" as const, label: "On Time", color: "#22c55e" },
  {
    key: "lateDeliveries" as const,
    label: "Late",
    fullLabel: "Late Deliveries",
    color: "#ef4444",
  },
  { key: "pending" as const, label: "Pending", color: "#f59e0b" },
];

function toCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const CorrespondenceStatusDonut: React.FC<CorrespondenceStatusDonutProps> = ({
  breakdown,
  compact = false,
  split = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const chartData = useMemo(
    () =>
      SEGMENTS.map((segment) => ({
        name: segment.fullLabel ?? segment.label,
        value: toCount(breakdown[segment.key]),
        color: segment.color,
      })).filter((item) => item.value > 0),
    [breakdown],
  );

  const dense = compact || split;
  const total = toCount(breakdown.received);

  return (
    <div
      className={`flex h-full min-h-[9.5rem] flex-col overflow-hidden rounded-xl border px-3 py-2.5 sm:min-h-[10rem] sm:px-3.5 sm:py-3 ${
        isDarkTheme
          ? "border-white/10 bg-slate-950/35"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <p
        className={`shrink-0 text-sm font-semibold uppercase tracking-wide sm:text-base ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
      >
        Status Breakdown
      </p>

      <div className="mt-2 flex min-h-0 flex-1 flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Donut */}
        <div className="mx-auto flex shrink-0 items-center justify-center sm:mx-0">
          <div
            className={`relative ${
              dense
                ? "size-[5.5rem] sm:size-[6rem]"
                : "size-[6.5rem] sm:size-[7.25rem]"
            }`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                <Pie
                  data={
                    chartData.length > 0
                      ? chartData
                      : [{ name: "Empty", value: 1, color: "#e2e8f0" }]
                  }
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius="56%"
                  outerRadius="84%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {(chartData.length > 0
                    ? chartData
                    : [{ name: "Empty", value: 1, color: "#e2e8f0" }]
                  ).map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center leading-tight">
                <p
                  className={`text-[10px] font-semibold uppercase sm:text-[11px] ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
                >
                  Total
                </p>
                <p
                  className={`text-base font-black tabular-nums sm:text-lg ${themeClasses.textPrimary}`}
                >
                  {total.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend — stacked rows so label / count / % never overlap */}
        <ul className="flex w-full min-w-0 flex-1 flex-col justify-center gap-1.5 sm:gap-2">
          {SEGMENTS.map((segment) => {
            const count = toCount(breakdown[segment.key]);
            const pct = total > 0 ? (count / total) * 100 : 0;
            const displayLabel = dense
              ? segment.label
              : (segment.fullLabel ?? segment.label);

            return (
              <li
                key={segment.key}
                className="flex min-w-0 items-center gap-2"
                title={`${segment.fullLabel ?? segment.label}: ${count} (${pct.toFixed(1)}%)`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden
                />
                <span
                  className={`min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm ${themeClasses.textPrimary}`}
                >
                  {displayLabel}
                </span>
                <span
                  className={`shrink-0 text-xs font-bold tabular-nums sm:text-sm ${themeClasses.textPrimary}`}
                >
                  {count}
                </span>
                <span
                  className={`w-12 shrink-0 text-right text-xs tabular-nums sm:w-14 sm:text-sm ${DASHBOARD_METRIC_SECONDARY_VALUE_CLASS(isDarkTheme)}`}
                >
                  {pct.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default React.memo(CorrespondenceStatusDonut);
