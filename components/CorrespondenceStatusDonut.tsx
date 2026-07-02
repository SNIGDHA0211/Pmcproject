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
    label: "Late Deliveries",
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
        name: segment.label,
        value: toCount(breakdown[segment.key]),
        color: segment.color,
      })).filter((item) => item.value > 0),
    [breakdown],
  );

  const dense = compact || split;
  const total = toCount(breakdown.received);

  return (
    <div
      className={`flex h-full min-h-[9.5rem] flex-col rounded-lg border px-3 py-2.5 sm:min-h-[10rem] sm:px-3.5 sm:py-3 ${
        isDarkTheme
          ? "border-white/10 bg-white/[0.03]"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <p
        className={`shrink-0 text-sm font-semibold uppercase tracking-wide sm:text-base ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
      >
        Status Breakdown
      </p>

      <div className="mt-2 flex min-h-0 flex-1 flex-col justify-center gap-3 min-[300px]:grid min-[300px]:grid-cols-[auto_minmax(0,1fr)] min-[300px]:items-center min-[300px]:gap-x-3 sm:gap-x-4">
        {/* Donut */}
        <div className="mx-auto flex shrink-0 items-center justify-center min-[300px]:mx-0">
          <div
            className={`relative ${
              dense
                ? "size-[5.75rem] sm:size-[6.25rem]"
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
                  className={`text-[11px] font-semibold uppercase sm:text-xs ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
                >
                  Total
                </p>
                <p
                  className={`text-lg font-black tabular-nums sm:text-xl ${themeClasses.textPrimary}`}
                >
                  {total.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex w-full min-w-0 flex-col justify-center gap-2 sm:gap-2.5">
          {SEGMENTS.map((segment) => {
            const count = toCount(breakdown[segment.key]);
            const pct = total > 0 ? (count / total) * 100 : 0;

            return (
              <div
                key={segment.key}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-0.5"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full sm:h-3.5 sm:w-3.5"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden
                />
                <span
                  className={`min-w-0 text-sm font-semibold leading-snug sm:text-base ${themeClasses.textPrimary}`}
                >
                  {segment.label}
                </span>
                <span
                  className={`shrink-0 text-sm font-bold tabular-nums sm:text-base ${themeClasses.textPrimary}`}
                >
                  {count}
                </span>
                <span
                  className={`shrink-0 min-w-[2.75rem] text-right text-sm tabular-nums sm:text-base ${DASHBOARD_METRIC_SECONDARY_VALUE_CLASS(isDarkTheme)}`}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CorrespondenceStatusDonut);
