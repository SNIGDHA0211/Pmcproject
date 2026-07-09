import React from "react";
import type {
  CorrespondenceSclDelivered,
  CorrespondenceSclPartyCounts,
} from "../services/api";
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from "../utils/theme";

interface CorrespondenceSclDeliveredPanelProps {
  scl: CorrespondenceSclDelivered;
  onAddDocument?: () => void;
}

const ROWS: {
  key: keyof Pick<
    CorrespondenceSclDelivered,
    "client" | "contractor" | "other_agency" | "totals"
  >;
  label: string;
  accent: string;
}[] = [
  { key: "client", label: "Client", accent: "text-blue-600" },
  { key: "contractor", label: "Contractor", accent: "text-violet-600" },
  { key: "other_agency", label: "Other Agency", accent: "text-slate-600" },
  { key: "totals", label: "Total", accent: "text-emerald-600" },
];

const fmt = (n: number) => n.toLocaleString("en-IN");

const CorrespondenceSclDeliveredPanel: React.FC<
  CorrespondenceSclDeliveredPanelProps
> = ({ scl, onAddDocument }) => {
  const { isDarkTheme } = useTheme();

  const renderCount = (
    tone: "received" | "delivered" | "record" | "pending",
    party: CorrespondenceSclPartyCounts,
    isTotal = false,
  ) => {
    const n =
      tone === "received"
        ? party.received
        : tone === "delivered"
          ? party.delivered
          : tone === "record"
            ? party.record
            : party.pending;
    const color =
      tone === "received"
        ? isDarkTheme
          ? "text-slate-200"
          : "text-slate-800"
        : tone === "delivered"
          ? isDarkTheme
            ? "text-emerald-400"
            : "text-emerald-600"
          : tone === "record"
            ? isDarkTheme
              ? "text-slate-300"
              : "text-slate-700"
            : isDarkTheme
              ? "text-amber-400"
              : "text-amber-600";
    return (
      <span
        className={`font-black tabular-nums ${isTotal ? "text-base sm:text-lg" : "text-sm sm:text-base"} ${color}`}
      >
        {fmt(n)}
      </span>
    );
  };

  return (
    <div
      className={`rounded-lg border px-2.5 py-2 sm:px-3 sm:py-2.5 ${
        isDarkTheme
          ? "border-white/10 bg-white/[0.03]"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4
          className={`text-[10px] font-bold uppercase tracking-widest sm:text-xs ${
            isDarkTheme ? "text-slate-400" : "text-slate-500"
          }`}
        >
          SCL Delivered Correspondence
        </h4>
        {onAddDocument && (
          <button
            type="button"
            onClick={onAddDocument}
            className="rounded-md border border-blue-600 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 sm:text-sm dark:hover:bg-blue-500/10"
          >
            Add Document
          </button>
        )}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[400px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className={isDarkTheme ? "text-slate-400" : "text-slate-500"}>
              <th className="pb-2 pr-2 font-semibold uppercase tracking-wide">Party</th>
              <th className="pb-2 px-2 text-center font-semibold uppercase tracking-wide">Received</th>
              <th className="pb-2 px-2 text-center font-semibold uppercase tracking-wide">Delivered</th>
              <th className="pb-2 px-2 text-center font-semibold uppercase tracking-wide">Record</th>
              <th className="pb-2 pl-2 text-center font-semibold uppercase tracking-wide">Pending</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const party = scl[row.key];
              const isTotal = row.key === "totals";
              return (
                <tr
                  key={row.key}
                  className={`border-t ${isDarkTheme ? "border-white/10" : "border-slate-100"}`}
                >
                  <td
                    className={`py-2 pr-2 font-semibold ${isTotal ? "font-bold" : ""} ${
                      isDarkTheme ? row.accent.replace("600", "400") : row.accent
                    }`}
                  >
                    {row.label}
                  </td>
                  <td className="px-2 py-2 text-center">{renderCount("received", party, isTotal)}</td>
                  <td className="px-2 py-2 text-center">{renderCount("delivered", party, isTotal)}</td>
                  <td className="px-2 py-2 text-center">{renderCount("record", party, isTotal)}</td>
                  <td className="py-2 pl-2 text-center">{renderCount("pending", party, isTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:hidden">
        {ROWS.map((row) => {
          const party = scl[row.key];
          const isTotal = row.key === "totals";
          return (
            <div
              key={row.key}
              className={`rounded-md border px-2.5 py-2 ${
                isDarkTheme ? "border-white/10 bg-white/[0.02]" : "border-slate-100 bg-slate-50"
              }`}
            >
              <p
                className={`mb-1.5 text-xs font-bold uppercase tracking-wide ${
                  isDarkTheme ? row.accent.replace("600", "400") : row.accent
                }`}
              >
                {row.label}
              </p>
              <div className="grid grid-cols-4 gap-1 text-center">
                {(
                  [
                    ["Received", "received"],
                    ["Delivered", "delivered"],
                    ["Record", "record"],
                    ["Pending", "pending"],
                  ] as const
                ).map(([label, tone]) => (
                  <div key={tone}>
                    <p
                      className={`text-[9px] font-semibold uppercase ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
                    >
                      {label}
                    </p>
                    <div className="mt-0.5">{renderCount(tone, party, isTotal)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(CorrespondenceSclDeliveredPanel);
