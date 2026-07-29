import { useState } from "react";
import type { FrequencyChartTestStatus, FrequencyChartView } from "../types";
import { getThemeClasses } from "../utils/theme";
import { Icons } from "./Icons";

interface RawRow {
  id?: unknown;
  srNo?: unknown; sr_no?: unknown;
  itemDescription?: unknown; item_description?: unknown;
  typeOfTest?: unknown; type_of_test?: unknown;
  frequencyOfTest?: unknown; frequency_of_test?: unknown;
  unit?: unknown;
  qtyPreviousBill?: unknown; qty_previous_bill?: unknown;
  qtyThisBill?: unknown; qty_this_bill?: unknown;
  totalQty?: unknown; total_qty?: unknown;
  requiredTestsUptoDate?: unknown; required_tests_upto_date?: unknown;
  totalTestsConducted?: unknown; total_tests_conducted?: unknown;
  requiredTests?: unknown; required_tests?: unknown;
  conductedTests?: unknown; conducted_tests?: unknown;
  passedTests?: unknown; passed_tests?: unknown;
  failedTests?: unknown; failed_tests?: unknown;
  shortfall?: unknown;
  status?: unknown;
  fieldLabPreviousBill?: unknown; field_lab_previous_bill?: unknown;
  fieldLabThisBill?: unknown; field_lab_this_bill?: unknown;
  thirdPartyPreviousBill?: unknown; third_party_previous_bill?: unknown;
  thirdPartyThisBill?: unknown; third_party_this_bill?: unknown;
  remarks?: unknown;
  activityName?: unknown; activity_name?: unknown;
  contractorName?: unknown; contractor_name?: unknown;
  month?: unknown;
  year?: unknown;
  projectName?: unknown; project_name?: unknown;
}

interface Props {
  rows: RawRow[];
  view: FrequencyChartView;
  projectName: string;
  isDarkTheme: boolean;
  onRefresh: () => void;
  onEdit: (row: RawRow) => void;
  onDelete: (id: number, label: string) => void;
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function s(v: unknown, fallback = "—"): string {
  const str = v != null ? String(v).trim() : "";
  return str || fallback;
}
function fmt(v: unknown): string {
  return n(v).toLocaleString();
}

function statusBadgeClass(status: string, isDark: boolean): string {
  const key = status.trim().toLowerCase();
  if (key === "completed") {
    return isDark ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-800";
  }
  if (key.includes("failure")) {
    return isDark ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-800";
  }
  if (key === "shortfall") {
    return isDark ? "bg-rose-900/50 text-rose-300" : "bg-red-100 text-red-700";
  }
  return isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700";
}

function resolveStatus(
  status: unknown,
  shortfall: number,
  failed: number,
): FrequencyChartTestStatus | string {
  if (status != null && String(status).trim()) return String(status).trim();
  if (shortfall > 0) return "Shortfall";
  if (failed > 0) return "Completed With Failures";
  return "Completed";
}

function norm(row: RawRow) {
  const requiredTests = n(
    row.required_tests ?? row.requiredTests ?? row.required_tests_upto_date ?? row.requiredTestsUptoDate,
  );
  const conductedTests = n(
    row.conducted_tests ?? row.conductedTests ?? row.total_tests_conducted ?? row.totalTestsConducted,
  );
  const passedTests = n(row.passed_tests ?? row.passedTests);
  const failedTests = n(
    row.failed_tests ??
      row.failedTests ??
      Math.max(conductedTests - passedTests, 0),
  );
  const shortfall = n(
    row.shortfall ?? Math.max(requiredTests - conductedTests, 0),
  );

  return {
    id: row.id,
    srNo: n(row.sr_no ?? row.srNo),
    itemDescription: s(row.item_description ?? row.itemDescription, ""),
    typeOfTest: s(row.type_of_test ?? row.typeOfTest, ""),
    frequencyOfTest: s(row.frequency_of_test ?? row.frequencyOfTest, ""),
    unit: s(row.unit, ""),
    qtyPreviousBill: n(row.qty_previous_bill ?? row.qtyPreviousBill),
    qtyThisBill: n(row.qty_this_bill ?? row.qtyThisBill),
    totalQty: n(row.total_qty ?? row.totalQty),
    requiredTestsUptoDate: n(row.required_tests_upto_date ?? row.requiredTestsUptoDate),
    totalTestsConducted: n(row.total_tests_conducted ?? row.totalTestsConducted),
    requiredTests,
    conductedTests,
    passedTests,
    failedTests,
    shortfall,
    status: resolveStatus(row.status, shortfall, failedTests),
    fieldLabPreviousBill: n(row.field_lab_previous_bill ?? row.fieldLabPreviousBill),
    fieldLabThisBill: n(row.field_lab_this_bill ?? row.fieldLabThisBill),
    thirdPartyPreviousBill: n(row.third_party_previous_bill ?? row.thirdPartyPreviousBill),
    thirdPartyThisBill: n(row.third_party_this_bill ?? row.thirdPartyThisBill),
    remarks: s(row.remarks, ""),
    activityName: row.activity_name ?? row.activityName ?? null,
    contractorName: row.contractor_name ?? row.contractorName ?? null,
  };
}

const TH = "px-3 py-3 text-[10px] font-black uppercase tracking-wider whitespace-nowrap";

export default function FrequencyChartTable({ rows, isDarkTheme, onEdit, onDelete }: Props) {
  const tc = getThemeClasses(isDarkTheme);
  const [expanded, setExpanded] = useState<number | null>(null);

  const normalised = rows.map(norm);

  if (normalised.length === 0) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${isDarkTheme ? "border-white/10 bg-white/5" : "border-dashed border-gray-200"}`}>
        <p className={`text-sm font-medium ${tc.textSecondary}`}>No records for the selected period.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDarkTheme ? "border-white/10" : "border-slate-200"}`}>
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <th className={`${TH} text-center w-12`}>Sr.</th>
              <th className={`${TH} text-left`}>Item Description</th>
              <th className={`${TH} text-left`}>Type of Test</th>
              <th className={`${TH} text-left`}>Frequency</th>
              <th className={`${TH} text-left w-16`}>Unit</th>
              <th className={`${TH} text-right`}>Total Qty</th>
              <th className={`${TH} text-right`}>Conducted</th>
              <th className={`${TH} text-right`}>Required Tests</th>
              <th className={`${TH} text-right`}>Conducted Tests</th>
              <th className={`${TH} text-right`}>Passed Tests</th>
              <th className={`${TH} text-right`}>Failed Tests</th>
              <th className={`${TH} text-right`}>Shortfall</th>
              <th className={`${TH} text-center`}>Status</th>
              <th className={`${TH} text-left`}>Remarks</th>
              <th className={`${TH} text-center w-20`}>Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkTheme ? "divide-white/10" : "divide-slate-100"}`}>
            {normalised.map((row, i) => (
              <tr
                key={String(row.id ?? i)}
                className={`transition-colors ${isDarkTheme ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
              >
                <td className={`px-3 py-3 text-center text-xs font-bold ${tc.textSecondary}`}>{row.srNo}</td>
                <td className={`px-3 py-3 font-semibold max-w-[180px] ${tc.textPrimary}`}>
                  <div className="truncate">{row.itemDescription}</div>
                </td>
                <td className={`px-3 py-3 ${tc.textSecondary}`}>{row.typeOfTest}</td>
                <td className={`px-3 py-3 text-xs ${tc.textMuted}`}>{row.frequencyOfTest}</td>
                <td className={`px-3 py-3 text-xs ${tc.textSecondary}`}>{row.unit}</td>
                <td className={`px-3 py-3 text-right font-semibold ${tc.textPrimary}`}>{fmt(row.totalQty)}</td>
                <td className="px-3 py-3 text-right font-bold text-emerald-600">
                  {row.totalTestsConducted || row.conductedTests}
                </td>
                <td className="px-3 py-3 text-right font-bold text-indigo-600">{row.requiredTests}</td>
                <td className="px-3 py-3 text-right font-bold text-emerald-600">{row.conductedTests}</td>
                <td className="px-3 py-3 text-right font-bold text-green-600">{row.passedTests}</td>
                <td className={`px-3 py-3 text-right font-bold ${row.failedTests > 0 ? "text-rose-600" : tc.textSecondary}`}>
                  {row.failedTests}
                </td>
                <td className={`px-3 py-3 text-right font-bold ${row.shortfall > 0 ? "text-amber-600" : tc.textSecondary}`}>
                  {row.shortfall}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClass(String(row.status), isDarkTheme)}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className={`px-3 py-3 text-xs max-w-[120px] ${tc.textMuted}`}>
                  <div className="truncate">{s(row.remarks)}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onEdit(rows[i])}
                      title="Edit"
                      className={`rounded-lg p-1.5 transition-colors ${isDarkTheme ? "hover:bg-white/10 text-blue-400" : "hover:bg-blue-50 text-blue-600"}`}
                    >
                      <Icons.Edit size={13} />
                    </button>
                    {row.id != null && (
                      <button
                        onClick={() => onDelete(Number(row.id), `${row.itemDescription} (#${row.srNo})`)}
                        title="Delete"
                        className={`rounded-lg p-1.5 transition-colors ${isDarkTheme ? "hover:bg-white/10 text-rose-400" : "hover:bg-red-50 text-rose-600"}`}
                      >
                        <Icons.Reject size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`lg:hidden divide-y ${isDarkTheme ? "divide-white/10" : "divide-slate-100"}`}>
        {normalised.map((row, i) => {
          const isOpen = expanded === row.srNo;
          return (
            <div key={String(row.id ?? i)} className={`p-4 ${isDarkTheme ? "bg-transparent" : "bg-white"}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <button
                  className="flex-1 text-left"
                  onClick={() => setExpanded(isOpen ? null : row.srNo)}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${isDarkTheme ? "bg-indigo-900 text-indigo-300" : "bg-indigo-100 text-indigo-700"}`}>
                      {row.srNo}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(String(row.status), isDarkTheme)}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <p className={`text-sm font-bold leading-tight ${tc.textPrimary}`}>{row.itemDescription}</p>
                  <p className={`text-xs mt-0.5 ${tc.textSecondary}`}>{row.typeOfTest}</p>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onEdit(rows[i])}
                    className={`rounded-xl p-2 transition-colors ${isDarkTheme ? "hover:bg-white/10 text-blue-400" : "hover:bg-blue-50 text-blue-600"}`}
                  >
                    <Icons.Edit size={14} />
                  </button>
                  {row.id != null && (
                    <button
                      onClick={() => onDelete(Number(row.id), `${row.itemDescription} (#${row.srNo})`)}
                      className={`rounded-xl p-2 transition-colors ${isDarkTheme ? "hover:bg-white/10 text-rose-400" : "hover:bg-red-50 text-rose-600"}`}
                    >
                      <Icons.Reject size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(isOpen ? null : row.srNo)}
                    className={`rounded-xl p-2 transition-colors ${isDarkTheme ? "text-white/40 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Required",
                    val: row.requiredTests,
                    color: isDarkTheme ? "bg-indigo-950/60 text-indigo-300" : "bg-indigo-50 text-indigo-700",
                  },
                  {
                    label: "Conducted",
                    val: row.conductedTests,
                    color: isDarkTheme ? "bg-emerald-950/60 text-emerald-300" : "bg-emerald-50 text-emerald-700",
                  },
                  {
                    label: "Shortfall",
                    val: row.shortfall,
                    color: isDarkTheme ? "bg-amber-950/60 text-amber-300" : "bg-amber-50 text-amber-700",
                  },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-xl px-2 py-2 text-center ${stat.color}`}>
                    <p className="text-[9px] font-black uppercase tracking-wider opacity-70 mb-0.5">{stat.label}</p>
                    <p className="text-lg font-black">{stat.val}</p>
                  </div>
                ))}
              </div>

              {isOpen && (
                <div className={`mt-3 pt-3 border-t space-y-3 ${isDarkTheme ? "border-white/10" : "border-slate-100"}`}>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["Passed Tests", row.passedTests],
                      ["Failed Tests", row.failedTests],
                      ["Frequency", row.frequencyOfTest],
                      ["Unit", row.unit],
                    ].map(([label, val]) => (
                      <div key={String(label)}>
                        <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${tc.textMuted}`}>{label}</p>
                        <p className={`text-sm font-semibold ${tc.textPrimary}`}>{s(val)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["Prev. Bill Qty", fmt(row.qtyPreviousBill)],
                      ["This Bill Qty", fmt(row.qtyThisBill)],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${tc.textMuted}`}>{label}</p>
                        <p className={`text-sm font-semibold ${tc.textPrimary}`}>{val}</p>
                      </div>
                    ))}
                  </div>

                  <div className={`rounded-xl p-3 ${isDarkTheme ? "bg-white/5" : "bg-slate-50"}`}>
                    <p className={`text-[9px] font-black uppercase tracking-wider mb-2 ${tc.textSecondary}`}>Test Breakdown</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      {[
                        ["Field/Lab Prev", row.fieldLabPreviousBill],
                        ["Field/Lab This", row.fieldLabThisBill],
                        ["3rd Party Prev", row.thirdPartyPreviousBill],
                        ["3rd Party This", row.thirdPartyThisBill],
                      ].map(([label, val]) => (
                        <div key={label as string} className="flex justify-between">
                          <span className={tc.textMuted}>{label}</span>
                          <span className={`font-bold ${tc.textPrimary}`}>{n(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {row.remarks && (
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${tc.textMuted}`}>Remarks</p>
                      <div className={`rounded-xl px-3 py-2 text-xs font-medium ${isDarkTheme ? "bg-amber-950/30 text-amber-300" : "bg-amber-50 text-amber-800"}`}>
                        {row.remarks}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
