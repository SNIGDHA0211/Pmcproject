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
}: Props) {
  const tc = getThemeClasses(isDarkTheme);
  const selectClass = `w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium outline-none transition-colors ${tc.input} ${tc.textPrimary}`;

  return (
    <div
      className={`border-b px-4 py-3 sm:px-6 ${tc.border} ${isDarkTheme ? "bg-white/[0.02]" : "bg-white"}`}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="grid grid-cols-2 gap-2 flex-1 min-w-0 sm:max-w-xs lg:max-w-sm">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className={selectClass}
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
            className={selectClass}
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
          className={`flex w-full overflow-hidden rounded-xl border flex-shrink-0 sm:w-auto ${isDarkTheme ? "border-white/20" : "border-slate-300"}`}
        >
          {(["cumulative", "monthly"] as const).map((v, i) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex-1 sm:flex-none sm:min-w-[7rem] py-2 px-3 text-xs font-bold transition-colors capitalize ${
                i > 0 ? `border-l ${isDarkTheme ? "border-white/20" : "border-slate-300"}` : ""
              } ${
                view !== v
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
