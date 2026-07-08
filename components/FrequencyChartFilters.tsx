import type { FrequencyChartView } from "../types";
import { getThemeClasses } from "../utils/theme";

interface Props {
  isDarkTheme: boolean;
  selectedMonth: number;
  setSelectedMonth: (v: number) => void;
  selectedYear: number;
  setSelectedYear: (v: number) => void;
  view: FrequencyChartView;
  setView: (v: FrequencyChartView) => void;
  activityFilter: string;
  setActivityFilter: (v: string) => void;
  testTypeFilter: string;
  setTestTypeFilter: (v: string) => void;
  contractorFilter: string;
  setContractorFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  compact?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - i);

export default function FrequencyChartFilters({
  isDarkTheme,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  view,
  setView,
  compact = false,
}: Props) {
  const tc = getThemeClasses(isDarkTheme);
  const selectClass = `w-full rounded-lg px-2.5 py-2 text-xs font-medium outline-none transition-colors ${tc.input} ${tc.textPrimary}`;
  const selectClassDefault = `w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium outline-none transition-colors ${tc.input} ${tc.textPrimary}`;

  return (
    <div
      className={`shrink-0 border-b ${compact ? 'px-3 py-2' : 'px-4 py-3 sm:px-6'} ${tc.border} ${isDarkTheme ? "bg-white/[0.02]" : "bg-white"}`}
    >
      <div className={`flex items-center gap-2.5 ${compact ? '' : 'flex-col sm:flex-row sm:items-center sm:gap-3'}`}>
        <div
          className={`grid shrink-0 grid-cols-2 gap-2 ${
            compact ? 'w-[11.5rem]' : 'w-full min-w-0 sm:max-w-xs lg:max-w-sm'
          }`}
        >
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className={compact ? selectClass : selectClassDefault}
            aria-label="Select month"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={compact ? selectClass : selectClassDefault}
            aria-label="Select year"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div
          className={`flex shrink-0 overflow-hidden rounded-lg border ${
            compact ? 'ml-auto' : 'w-full sm:ml-0 sm:w-auto'
          } ${isDarkTheme ? "border-white/20" : "border-slate-300"}`}
        >
          {(["cumulative", "monthly"] as const).map((v, i) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`whitespace-nowrap px-3.5 py-2 text-xs font-bold capitalize transition-colors ${
                compact ? 'min-w-[5.25rem]' : 'min-w-[7rem] py-2'
              } ${
                i > 0 ? `border-l ${isDarkTheme ? "border-white/20" : "border-slate-300"}` : ""
              } ${
                view === v
                  ? "bg-indigo-600 text-white"
                  : isDarkTheme
                    ? "text-white/60 hover:bg-white/10"
                    : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
