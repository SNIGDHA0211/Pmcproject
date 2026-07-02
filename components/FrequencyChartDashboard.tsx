import React, { useState, useEffect, useCallback } from "react";
import { frequencyChartApi, getApiErrorMessage } from "../services/api";
import type {
  FrequencyChartClientReportData,
  FrequencyChartSummary,
  FrequencyChartView,
  FrequencyChartRegisterRow,
  Project,
} from "../types";
import { getThemeClasses, useTheme } from "../utils/theme";
import { downloadFrequencyChartExcel, triggerExcelBlobDownload } from "../utils/frequencyChartExport";
import { ModalPortal } from "./ModalPortal";
import FrequencyChartSummaryPanel from "./FrequencyChartSummary";
import FrequencyChartTable from "./FrequencyChartTable";
import FrequencyChartFilters from "./FrequencyChartFilters";
import FrequencyChartRegisterModal from "./FrequencyChartRegisterModal";
import { Icons } from "./Icons";

interface Props {
  project: Project;
  selectedContractorName?: string | null;
  syncContractorFromDashboard?: boolean;
}

function safeN(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function normaliseSummary(raw: unknown): FrequencyChartSummary {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    testsRequired:      safeN(s.testsRequired      ?? s.tests_required),
    testsConducted:     safeN(s.testsConducted      ?? s.tests_conducted),
    shortfall:          safeN(s.shortfall),
    testsPassed:        safeN(s.testsPassed         ?? s.tests_passed),
    testsFailed:        safeN(s.testsFailed         ?? s.tests_failed),
    qualityPerformance: safeN(s.qualityPerformance  ?? s.quality_performance),
    passRate:           safeN(s.passRate            ?? s.pass_rate),
    failRate:           safeN(s.failRate            ?? s.fail_rate),
  };
}

function normaliseRow(row: unknown): any {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id:                       r.id,
    srNo:                     safeN(r.sr_no              ?? r.srNo),
    itemDescription:          String(r.item_description  ?? r.itemDescription  ?? ""),
    typeOfTest:               String(r.type_of_test      ?? r.typeOfTest       ?? ""),
    frequencyOfTest:          String(r.frequency_of_test ?? r.frequencyOfTest  ?? ""),
    unit:                     String(r.unit ?? ""),
    qtyPreviousBill:          safeN(r.qty_previous_bill         ?? r.qtyPreviousBill),
    qtyThisBill:              safeN(r.qty_this_bill             ?? r.qtyThisBill),
    totalQty:                 safeN(r.total_qty                 ?? r.totalQty),
    requiredTestsPreviousBill:safeN(r.required_tests_previous_bill ?? r.requiredTestsPreviousBill),
    requiredTestsThisBill:    safeN(r.required_tests_this_bill  ?? r.requiredTestsThisBill),
    requiredTestsUptoDate:    safeN(r.required_tests_upto_date  ?? r.requiredTestsUptoDate),
    fieldLabPreviousBill:     safeN(r.field_lab_previous_bill   ?? r.fieldLabPreviousBill),
    fieldLabThisBill:         safeN(r.field_lab_this_bill       ?? r.fieldLabThisBill),
    thirdPartyPreviousBill:   safeN(r.third_party_previous_bill ?? r.thirdPartyPreviousBill),
    thirdPartyThisBill:       safeN(r.third_party_this_bill     ?? r.thirdPartyThisBill),
    totalTestsConducted:      safeN(r.total_tests_conducted     ?? r.totalTestsConducted),
    remarks:                  String(r.remarks ?? ""),
    month:                    safeN(r.month),
    year:                     safeN(r.year),
    projectName:              String(r.project_name ?? r.projectName ?? ""),
    activityName:             (r.activity_name  ?? r.activityName  ?? null) as string | null,
    contractorName:           (r.contractor_name ?? r.contractorName ?? null) as string | null,
  };
}

function normaliseReport(raw: unknown): FrequencyChartClientReportData {
  const d = (raw ?? {}) as Record<string, unknown>;
  return {
    view:        (d.view ?? "monthly") as FrequencyChartView,
    fromDate:    String(d.from_date ?? d.fromDate ?? ""),
    toDate:      String(d.to_date   ?? d.toDate   ?? ""),
    month:       safeN(d.month),
    year:        safeN(d.year),
    projectName: String(d.project_name ?? d.projectName ?? ""),
    summary:     normaliseSummary(d.summary),
    rows:        Array.isArray(d.rows) ? d.rows.map(normaliseRow) : [],
  } as FrequencyChartClientReportData;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function FrequencyChartDashboard({
  project,
  selectedContractorName = null,
  syncContractorFromDashboard = false,
}: Props) {
  const { isDarkTheme } = useTheme();
  const tc = getThemeClasses(isDarkTheme);

  const now = new Date();
  const [selectedMonth,    setSelectedMonth]    = useState(now.getMonth() + 1);
  const [selectedYear,     setSelectedYear]     = useState(now.getFullYear());
  const [view,             setView]             = useState<FrequencyChartView>("monthly");
  const [activityFilter,   setActivityFilter]   = useState("");
  const [testTypeFilter,   setTestTypeFilter]   = useState("");
  const [contractorFilter, setContractorFilter] = useState("");
  const [searchQuery,      setSearchQuery]      = useState("");

  useEffect(() => {
    if (!syncContractorFromDashboard) return;
    setContractorFilter(selectedContractorName?.trim() ?? "");
  }, [syncContractorFromDashboard, selectedContractorName]);

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [reportData, setReportData] = useState<FrequencyChartClientReportData | null>(null);

  // CRUD modal state
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editRow,     setEditRow]     = useState<FrequencyChartRegisterRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  const [showTestTable, setShowTestTable] = useState(true);

  const loadData = useCallback(async () => {
    if (!project?.title) return;
    setLoading(true);
    setError(null);
    try {
      const res = await frequencyChartApi.getClientReport({
        projectName:  project.title,
        month:        selectedMonth,
        year:         selectedYear,
        view,
        ...(activityFilter   && { activity:   activityFilter }),
        ...(testTypeFilter   && { testType:   testTypeFilter }),
        ...(contractorFilter && { contractor: contractorFilter }),
        ...(searchQuery      && { search:     searchQuery }),
      });
      const env = res.data as Record<string, unknown>;
      if (env.success === false) {
        setError(String(env.message ?? "Failed to load data"));
        return;
      }
      setReportData(normaliseReport(env.data ?? env));
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load frequency chart data"));
    } finally {
      setLoading(false);
    }
  }, [project?.title, selectedMonth, selectedYear, view, activityFilter, testTypeFilter, contractorFilter, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleExportExcel() {
    const exportParams = {
      projectName: project.title,
      month: selectedMonth,
      year: selectedYear,
      view,
      ...(activityFilter && { activity: activityFilter }),
      ...(testTypeFilter && { testType: testTypeFilter }),
      ...(contractorFilter && { contractor: contractorFilter }),
      ...(searchQuery && { search: searchQuery }),
    };
    const filename = `freq-chart-${project.title}-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.xlsx`;

    try {
      const res = await frequencyChartApi.exportExcel(exportParams);
      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([String(res.data ?? "")], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
      triggerExcelBlobDownload(blob, filename);
    } catch (err) {
      if (reportData?.rows?.length) {
        try {
          await downloadFrequencyChartExcel(reportData, filename);
          return;
        } catch (fallbackErr) {
          console.error("Frequency chart Excel fallback failed:", fallbackErr);
        }
      }
      alert(getApiErrorMessage(err, "Excel export failed"));
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await frequencyChartApi.deleteRegisterRow(id);
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      alert(getApiErrorMessage(err, "Delete failed"));
    } finally {
      setDeleting(false);
    }
  }

  const periodLabel = view === "cumulative"
    ? `Jan – ${MONTH_NAMES[(selectedMonth - 1) % 12]} ${selectedYear}`
    : `${MONTH_NAMES[(selectedMonth - 1) % 12]} ${selectedYear}`;

  return (
    <div className={`w-full rounded-2xl border shadow-md overflow-hidden ${tc.bgPrimary} ${tc.border}`}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b ${tc.border} ${isDarkTheme ? "bg-white/5" : "bg-gradient-to-r from-indigo-50 to-purple-50"}`}>
        <div className="min-w-0 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
          <h2 className={`text-sm sm:text-base font-semibold tracking-tight ${tc.textPrimary}`}>
            Material Testing Frequency Chart
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto flex-shrink-0">
          <button
            onClick={() => { setEditRow(null); setModalOpen(true); }}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            <Icons.Add size={14} />
            <span className="hidden sm:inline">Add Record</span>
            <span className="sm:hidden">Add</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={loading || !reportData || reportData.rows.length === 0}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Download Excel workbook"
          >
            <Icons.Download size={14} />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-40 transition-colors ${tc.border} ${tc.textSecondary} ${isDarkTheme ? "hover:bg-white/10" : "hover:bg-slate-100"}`}
          >
            <Icons.History size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <FrequencyChartFilters
        isDarkTheme={isDarkTheme}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        view={view}
        setView={setView}
        activityFilter={activityFilter}
        setActivityFilter={setActivityFilter}
        testTypeFilter={testTypeFilter}
        setTestTypeFilter={setTestTypeFilter}
        contractorFilter={contractorFilter}
        setContractorFilter={setContractorFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 space-y-4">

        {error && (
          <div className={`rounded-xl px-4 py-3 border ${isDarkTheme ? "bg-rose-950/40 border-rose-800 text-rose-300" : "bg-red-50 border-red-200 text-red-700"}`}>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent" />
          </div>
        )}

        {!loading && !error && reportData && reportData.rows.length > 0 && (
          <>
            <FrequencyChartSummaryPanel summary={reportData.summary} isDarkTheme={isDarkTheme} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className={`text-xs font-medium ${tc.textSecondary}`}>
                {reportData.rows.length} test record{reportData.rows.length !== 1 ? "s" : ""} · {periodLabel}
              </p>
              <button
                type="button"
                onClick={() => setShowTestTable((v) => !v)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors w-full sm:w-auto ${tc.border} ${showTestTable ? (isDarkTheme ? "bg-indigo-950/50 text-indigo-300 border-indigo-700/50" : "bg-indigo-50 text-indigo-700 border-indigo-200") : (isDarkTheme ? "text-white/70 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100")}`}
              >
                {showTestTable ? <Icons.EyeOff size={14} /> : <Icons.Eye size={14} />}
                {showTestTable ? "Hide Test Data" : "Show Test Data"}
                <Icons.ChevronDown size={14} className={`transition-transform ${showTestTable ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showTestTable && (
              <FrequencyChartTable
                rows={reportData.rows as any}
                view={reportData.view}
                projectName={project.title}
                isDarkTheme={isDarkTheme}
                onRefresh={loadData}
                onEdit={(row) => { setEditRow(row as any); setModalOpen(true); }}
                onDelete={(id, label) => setDeleteConfirm({ id, label })}
              />
            )}
          </>
        )}

        {!loading && !error && reportData && reportData.rows.length === 0 && (
          <div className={`rounded-xl border-2 border-dashed p-10 text-center ${isDarkTheme ? "border-white/10" : "border-gray-200"}`}>
            <p className={`text-sm font-medium ${tc.textSecondary}`}>No test records for {periodLabel}.</p>
            <button
              onClick={() => { setEditRow(null); setModalOpen(true); }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              <Icons.Add size={13} /> Add First Record
            </button>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────── */}
      {modalOpen && (
        <FrequencyChartRegisterModal
          projectName={project.title}
          month={selectedMonth}
          year={selectedYear}
          editRow={editRow}
          onClose={() => { setModalOpen(false); setEditRow(null); }}
          onSaved={() => { setModalOpen(false); setEditRow(null); loadData(); }}
        />
      )}

      {/* ── Delete Confirmation ─────────────────────────────────── */}
      {deleteConfirm && (
        <ModalPortal open>
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4">
            <div className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${tc.bgPrimary} ${tc.border}`}>
              <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${tc.textPrimary}`}>
                Delete Record?
              </h3>
              <p className={`text-sm mb-6 ${tc.textSecondary}`}>
                This will permanently delete <strong className={tc.textPrimary}>"{deleteConfirm.label}"</strong>.
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${isDarkTheme ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  disabled={deleting}
                  className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
