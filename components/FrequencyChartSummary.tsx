import React from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  XCircle,
} from "lucide-react";
import type { FrequencyChartSummary as T } from "../types";
import "./qaqcWorkspace.css";

interface Props {
  summary: T;
  isDarkTheme: boolean;
  compact?: boolean;
}

function safeN(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function FrequencyChartSummary({ summary, isDarkTheme, compact = false }: Props) {
  const raw = summary as unknown as Record<string, unknown>;

  // Prefer new backend keys (required/conducted/passed/failed); keep legacy aliases.
  const testsRequired = safeN(
    raw.required ?? raw.testsRequired ?? raw.tests_required,
  );
  const testsConducted = safeN(
    raw.conducted ?? raw.testsConducted ?? raw.tests_conducted,
  );
  const shortfall = safeN(raw.shortfall);
  const testsPassed = safeN(
    raw.passed ?? raw.testsPassed ?? raw.tests_passed,
  );
  const testsFailed = safeN(
    raw.failed ?? raw.testsFailed ?? raw.tests_failed,
  );

  const pct = (part: number, whole: number) =>
    whole > 0 ? Math.min(100, Math.max(0, Math.round((part / whole) * 100))) : 0;
  const conductedPct = pct(testsConducted, testsRequired);
  const passRate = pct(testsPassed, testsConducted);
  const failRate = pct(testsFailed, testsConducted);
  const shortfallPct = pct(shortfall, testsRequired);
  const muted = "#94a3b8";

  const cards: {
    label: string;
    fullLabel: string;
    value: number;
    icon: React.ElementType;
    color: string;
    barPct: number;
    note: string;
    alert?: boolean;
  }[] = [
    {
      label: "Required",
      fullLabel: "Tests Required",
      value: testsRequired,
      icon: ClipboardList,
      color: "#3b82f6",
      barPct: testsRequired > 0 ? 100 : 0,
      note: "Planned for this period",
    },
    {
      label: "Conducted",
      fullLabel: "Tests Conducted",
      value: testsConducted,
      icon: FlaskConical,
      color: "#10b981",
      barPct: conductedPct,
      note: `${conductedPct}% of required`,
    },
    {
      label: "Passed",
      fullLabel: "Tests Passed",
      value: testsPassed,
      icon: BadgeCheck,
      color: "#22c55e",
      barPct: passRate,
      note: `${passRate}% pass rate`,
    },
    {
      label: "Failed",
      fullLabel: "Tests Failed",
      value: testsFailed,
      icon: XCircle,
      color: testsFailed > 0 ? "#f43f5e" : muted,
      barPct: failRate,
      note: testsFailed > 0 ? `${failRate}% of conducted` : "No failures",
      alert: testsFailed > 0,
    },
    {
      label: "Shortfall",
      fullLabel: "Shortfall",
      value: shortfall,
      icon: shortfall > 0 ? AlertTriangle : CheckCircle2,
      color: shortfall > 0 ? "#f59e0b" : "#8b5cf6",
      barPct: shortfall > 0 ? shortfallPct : 0,
      note: shortfall > 0 ? `${shortfallPct}% still pending` : "On target",
      alert: shortfall > 0,
    },
  ];

  return (
    <div
      className={`grid gap-2 ${
        compact
          ? "grid-cols-5"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3"
      }`}
    >
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.fullLabel}
            className={`pmc-qa-sum ${card.alert ? "is-alert" : ""} rounded-xl border ${
              compact ? "p-2.5" : "rounded-2xl p-3 sm:p-4"
            } ${isDarkTheme ? "border-white/10" : "border-slate-200/80"}`}
            style={
              {
                "--qa-tile": card.color,
                "--qa-i": index,
                background: isDarkTheme
                  ? `linear-gradient(150deg, color-mix(in srgb, ${card.color} 12%, rgba(255,255,255,0.03)), rgba(255,255,255,0.015))`
                  : `linear-gradient(150deg, color-mix(in srgb, ${card.color} 8%, #fff), #fff)`,
              } as React.CSSProperties
            }
            title={card.fullLabel}
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-1">
                <p
                  className={`${
                    compact ? "text-[8px] leading-tight" : "text-[9px] sm:text-[10px] mb-1"
                  } font-black uppercase tracking-wide ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}
                >
                  {compact ? card.label : card.fullLabel}
                </p>
                <span
                  className={`pmc-qa-sum-icon ${compact ? "h-5 w-5" : "h-7 w-7"}`}
                  aria-hidden="true"
                >
                  <Icon size={compact ? 11 : 15} strokeWidth={2.3} />
                </span>
              </div>
              <p
                className={`${
                  compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
                } font-black leading-none tabular-nums`}
                style={{ color: card.color }}
              >
                {(card.value ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="pmc-qa-sum-track" aria-hidden="true">
              <div className="pmc-qa-sum-fill" style={{ width: `${card.barPct}%` }} />
            </div>
            {!compact && (
              <p className={`pmc-qa-sum-note ${isDarkTheme ? "text-slate-300" : "text-slate-600"}`}>
                {card.note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
