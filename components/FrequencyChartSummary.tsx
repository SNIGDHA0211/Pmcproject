import type { FrequencyChartSummary as T } from "../types";

interface Props {
  summary: T;
  isDarkTheme: boolean;
}

function safeN(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function FrequencyChartSummary({ summary, isDarkTheme }: Props) {
  const raw = summary as unknown as Record<string, unknown>;

  const testsRequired      = safeN(raw.testsRequired      ?? raw.tests_required);
  const testsConducted     = safeN(raw.testsConducted      ?? raw.tests_conducted);
  const shortfall          = safeN(raw.shortfall);
  const testsPassed        = safeN(raw.testsPassed         ?? raw.tests_passed);
  const testsFailed        = safeN(raw.testsFailed         ?? raw.tests_failed);

  const cards = [
    { label: "Tests Required",  value: testsRequired,  icon: "📋", accent: isDarkTheme ? "text-blue-400"    : "text-blue-600",    bg: isDarkTheme ? "bg-blue-950/40 border-blue-800/50"    : "bg-blue-50 border-blue-100"    },
    { label: "Tests Conducted", value: testsConducted, icon: "✅", accent: isDarkTheme ? "text-emerald-400" : "text-emerald-600", bg: isDarkTheme ? "bg-emerald-950/40 border-emerald-800/50": "bg-emerald-50 border-emerald-100"},
    { label: "Shortfall",       value: shortfall,      icon: shortfall > 0 ? "⚠️" : "✔️",
      accent: shortfall > 0 ? (isDarkTheme ? "text-amber-400" : "text-amber-600") : (isDarkTheme ? "text-slate-400" : "text-slate-500"),
      bg:     shortfall > 0 ? (isDarkTheme ? "bg-amber-950/40 border-amber-800/50" : "bg-amber-50 border-amber-100") : (isDarkTheme ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"),
    },
    { label: "Tests Passed",    value: testsPassed,    icon: "🎯", accent: isDarkTheme ? "text-green-400"   : "text-green-600",   bg: isDarkTheme ? "bg-green-950/40 border-green-800/50"  : "bg-green-50 border-green-100"  },
    { label: "Tests Failed",    value: testsFailed,    icon: testsFailed > 0 ? "❌" : "—",
      accent: testsFailed > 0 ? (isDarkTheme ? "text-rose-400" : "text-rose-600") : (isDarkTheme ? "text-slate-400" : "text-slate-500"),
      bg:     testsFailed > 0 ? (isDarkTheme ? "bg-rose-950/40 border-rose-800/50" : "bg-rose-50 border-rose-100") : (isDarkTheme ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100"),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-2xl border p-3 sm:p-4 ${card.bg}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                {card.label}
              </p>
              <p className={`text-xl sm:text-2xl font-black leading-none ${card.accent}`}>
                {(card.value ?? 0).toLocaleString()}
              </p>
            </div>
            <span className="text-lg sm:text-xl flex-shrink-0">{card.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
