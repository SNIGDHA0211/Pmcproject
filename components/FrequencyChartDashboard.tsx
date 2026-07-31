import React, { useState, useEffect, useCallback } from "react";
import { frequencyChartApi, getApiErrorMessage } from "../services/api";
import type {
  FrequencyChartClientReportData,
  FrequencyChartSummary,
  FrequencyChartView,
  FrequencyChartRegisterRow,
  Project,
} from "../types";
import {
  DASHBOARD_STATUS_CARD_PADDING,
  DASHBOARD_STATUS_CARD_TITLE_CLASS,
  getThemeClasses,
  useTheme,
} from "../utils/theme";
import { dashboardChartShellBorder } from "../utils/dashboardCharts";
import { downloadFrequencyChartExcel, triggerExcelBlobDownload } from "../utils/frequencyChartExport";
import { ModalPortal } from "./ModalPortal";
import FrequencyChartSummaryPanel from "./FrequencyChartSummary";
import FrequencyChartTable from "./FrequencyChartTable";
import FrequencyChartFilters from "./FrequencyChartFilters";
import FrequencyChartRegisterModal from "./FrequencyChartRegisterModal";
import DashboardCardTopAccent from "./DashboardCardTopAccent";
import { FullScreenCard, FullScreenHeaderToolbar } from "./FullScreenCard";
import { Icons } from "./Icons";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { isAbortError } from "../utils/isAbortError";

interface Props {
  project: Project;
  selectedContractorName?: string | null;
  syncContractorFromDashboard?: boolean;
  layout?: 'default' | 'embedded';
  /** Open the test register table by default (useful on QAQC dashboard). */
  defaultShowTable?: boolean;
  /** When provided, shows a "Testing Photos" button that redirects to the Testing Photos page. */
  onOpenTestingPhotos?: () => void;
}

function safeN(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function normaliseSummary(raw: unknown): FrequencyChartSummary {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    testsRequired: safeN(
      s.required ?? s.testsRequired ?? s.tests_required,
    ),
    testsConducted: safeN(
      s.conducted ?? s.testsConducted ?? s.tests_conducted,
    ),
    shortfall: safeN(s.shortfall),
    testsPassed: safeN(s.passed ?? s.testsPassed ?? s.tests_passed),
    testsFailed: safeN(s.failed ?? s.testsFailed ?? s.tests_failed),
    qualityPerformance: safeN(s.qualityPerformance ?? s.quality_performance),
    passRate: safeN(s.passRate ?? s.pass_rate),
    failRate: safeN(s.failRate ?? s.fail_rate),
  };
}

function normaliseRow(row: unknown): FrequencyChartRegisterRow {
  const r = (row ?? {}) as Record<string, unknown>;
  const requiredTests = safeN(
    r.required_tests ??
      r.requiredTests ??
      r.required_tests_upto_date ??
      r.requiredTestsUptoDate,
  );
  const conductedTests = safeN(
    r.conducted_tests ??
      r.conductedTests ??
      r.total_tests_conducted ??
      r.totalTestsConducted,
  );
  const passedTests = safeN(r.passed_tests ?? r.passedTests);
  const failedTests = safeN(
    r.failed_tests ?? r.failedTests ?? Math.max(conductedTests - passedTests, 0),
  );
  const shortfall = safeN(
    r.shortfall ?? Math.max(requiredTests - conductedTests, 0),
  );
  const statusRaw = r.status != null ? String(r.status).trim() : "";
  const status =
    statusRaw ||
    (shortfall > 0
      ? "Shortfall"
      : failedTests > 0
        ? "Completed With Failures"
        : "Completed");

  return {
    id: r.id as number | undefined,
    srNo: safeN(r.sr_no ?? r.srNo),
    itemDescription: String(r.item_description ?? r.itemDescription ?? ""),
    typeOfTest: String(r.type_of_test ?? r.typeOfTest ?? ""),
    frequencyOfTest: String(r.frequency_of_test ?? r.frequencyOfTest ?? ""),
    unit: String(r.unit ?? ""),
    qtyPreviousBill: safeN(r.qty_previous_bill ?? r.qtyPreviousBill),
    qtyThisBill: safeN(r.qty_this_bill ?? r.qtyThisBill),
    totalQty: safeN(r.total_qty ?? r.totalQty),
    requiredTestsPreviousBill: safeN(
      r.required_tests_previous_bill ?? r.requiredTestsPreviousBill,
    ),
    requiredTestsThisBill: safeN(
      r.required_tests_this_bill ?? r.requiredTestsThisBill,
    ),
    requiredTestsUptoDate: safeN(
      r.required_tests_upto_date ?? r.requiredTestsUptoDate,
    ),
    fieldLabPreviousBill: safeN(
      r.field_lab_previous_bill ?? r.fieldLabPreviousBill,
    ),
    fieldLabThisBill: safeN(r.field_lab_this_bill ?? r.fieldLabThisBill),
    thirdPartyPreviousBill: safeN(
      r.third_party_previous_bill ?? r.thirdPartyPreviousBill,
    ),
    thirdPartyThisBill: safeN(
      r.third_party_this_bill ?? r.thirdPartyThisBill,
    ),
    totalTestsConducted: safeN(
      r.total_tests_conducted ?? r.totalTestsConducted,
    ),
    requiredTests,
    conductedTests,
    passedTests,
    failedTests,
    shortfall,
    status,
    remarks: String(r.remarks ?? ""),
    month: safeN(r.month),
    year: safeN(r.year),
    projectName: String(r.project_name ?? r.projectName ?? ""),
    activityName: (r.activity_name ?? r.activityName ?? null) as string | null,
    contractorName: (r.contractor_name ?? r.contractorName ?? null) as
      | string
      | null,
  };
}

function normaliseReport(raw: unknown): FrequencyChartClientReportData {
  const d = (raw ?? {}) as Record<string, unknown>;
  return {
    view:        (d.view ?? "cumulative") as FrequencyChartView,
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
  layout = 'default',
  defaultShowTable = false,
  onOpenTestingPhotos,
}: Props) {
  const isEmbedded = layout === 'embedded';
  const { isDarkTheme } = useTheme();
  const tc = getThemeClasses(isDarkTheme);

  const now = new Date();
  const [selectedMonth,    setSelectedMonth]    = useState(now.getMonth() + 1);
  const [selectedYear,     setSelectedYear]     = useState(now.getFullYear());
  const [view,             setView]             = useState<FrequencyChartView>("cumulative");
  const [activityFilter,   setActivityFilter]   = useState("");
  const [testTypeFilter,   setTestTypeFilter]   = useState("");
  const [contractorFilter, setContractorFilter] = useState("");
  const [searchQuery,      setSearchQuery]      = useState("");

  // Debounce text filters so rapid typing does not fire one API call per keystroke.
  const debouncedActivity = useDebouncedValue(activityFilter.trim());
  const debouncedTestType = useDebouncedValue(testTypeFilter.trim());
  const debouncedContractor = useDebouncedValue(contractorFilter.trim());
  const debouncedSearch = useDebouncedValue(searchQuery.trim());

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
  const [showTestTable, setShowTestTable] = useState(defaultShowTable);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!project?.title) return;
    setLoading(true);
    setError(null);
    try {
      const res = await frequencyChartApi.getClientReport({
        projectName:  project.title,
        month:        selectedMonth,
        year:         selectedYear,
        view,
        ...(debouncedActivity   && { activity:   debouncedActivity }),
        ...(debouncedTestType   && { testType:   debouncedTestType }),
        ...(debouncedContractor && { contractor: debouncedContractor }),
        ...(debouncedSearch      && { search:     debouncedSearch }),
        signal,
      });
      if (signal?.aborted) return;
      const env = res.data as Record<string, unknown>;
      if (env.success === false) {
        setError(String(env.message ?? "Failed to load data"));
        setReportData(null);
        return;
      }
      setReportData(normaliseReport(env.data ?? env));
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      setError(getApiErrorMessage(err, "Unable to load frequency chart data"));
      setReportData(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [project?.title, selectedMonth, selectedYear, view, debouncedActivity, debouncedTestType, debouncedContractor, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  async function handleExportExcel() {
    const exportParams = {
      projectName: project.title,
      month: selectedMonth,
      year: selectedYear,
      view,
      ...(debouncedActivity && { activity: debouncedActivity }),
      ...(debouncedTestType && { testType: debouncedTestType }),
      ...(debouncedContractor && { contractor: debouncedContractor }),
      ...(debouncedSearch && { search: debouncedSearch }),
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

  const shellBorder = dashboardChartShellBorder(isDarkTheme);
  const cardSurface = isDarkTheme
    ? `${tc.glassCard} ${tc.border} shadow-sm`
    : 'border-slate-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-1 ring-slate-100';

  const actionBtnBase = `inline-flex items-center justify-center gap-1 rounded-lg font-bold transition-colors ${
    isEmbedded ? 'h-8 px-2.5 text-[11px]' : 'rounded-xl px-3 py-2 text-xs'
  }`;

  return (
    <FullScreenCard
      title="Material Testing Frequency Chart"
      expandSize="fullWidth"
      className="exec-section-quality joyride-target-stable flex h-full min-h-[28rem] min-w-0 flex-col"
    >
      <div
        className={`relative flex h-full min-h-[28rem] w-full flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-lg ${cardSurface} ${
          isEmbedded ? 'px-4 py-3' : DASHBOARD_STATUS_CARD_PADDING
        }`}
      >
        <DashboardCardTopAccent />

        {/* ── Header (matches Manpower / HSE dashboard cards) ── */}
        <div className={`flex shrink-0 flex-col ${isEmbedded ? 'gap-0' : 'gap-2.5'} pt-0.5`}>
          <div
            className={`flex shrink-0 flex-col border-b ${
              isEmbedded ? 'gap-2 pb-2.5' : 'gap-2.5 pb-3'
            } ${tc.border}`}
          >
            <div className={`flex items-start justify-between gap-2 ${isEmbedded ? '' : 'flex-wrap gap-3'}`}>
              <div className={`flex min-w-0 flex-1 items-center ${isEmbedded ? 'gap-2' : 'gap-3'}`}>
                <h2
                  className={`${DASHBOARD_STATUS_CARD_TITLE_CLASS} ${
                    isEmbedded ? 'text-xs sm:text-sm' : ''
                  }`}
                >
                  Material Testing Frequency Chart
                </h2>
              </div>

              <div
                className={`flex shrink-0 flex-wrap items-center justify-end ${
                  isEmbedded ? 'max-w-[62%] gap-1' : 'gap-1.5 sm:gap-2'
                }`}
              >
                {onOpenTestingPhotos && (
                  <button
                    type="button"
                    onClick={onOpenTestingPhotos}
                    className={`${actionBtnBase} bg-violet-600 text-white hover:bg-violet-700`}
                    title="Open Testing Photos for this project"
                  >
                    <Icons.Upload size={isEmbedded ? 12 : 14} />
                    <span className="whitespace-nowrap">Testing Photos</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditRow(null);
                    setModalOpen(true);
                  }}
                  className={`${actionBtnBase} bg-indigo-600 text-white hover:bg-indigo-700`}
                  title="Add test record"
                >
                  <Icons.Add size={isEmbedded ? 12 : 14} />
                  <span className="whitespace-nowrap">Add Record</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={loading || !reportData || reportData.rows.length === 0}
                  className={`${actionBtnBase} bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40`}
                  title="Download Excel workbook"
                >
                  <Icons.Download size={isEmbedded ? 12 : 14} />
                  <span className="whitespace-nowrap">{isEmbedded ? 'Excel' : 'Export Excel'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  disabled={loading}
                  title="Refresh"
                  className={`${actionBtnBase} border ${tc.border} ${tc.textSecondary} ${
                    isEmbedded ? 'w-8 px-0' : ''
                  } ${isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                >
                  <Icons.History size={14} className={loading ? 'animate-spin' : ''} />
                  {!isEmbedded && <span>Refresh</span>}
                </button>

                <FullScreenHeaderToolbar />
              </div>
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
            compact={isEmbedded}
          />
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className={`flex min-h-0 flex-1 flex-col ${isEmbedded ? 'mt-2.5' : 'mt-3 space-y-4'}`}>

          {error && (
            <div className={`rounded-xl px-4 py-3 border ${isDarkTheme ? "bg-rose-950/40 border-rose-800 text-rose-300" : "bg-red-50 border-red-200 text-red-700"}`}>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {loading && (
            <div className={`flex flex-1 items-center justify-center ${isEmbedded ? 'py-10' : 'py-16'}`}>
              <div className={`animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent ${isEmbedded ? 'h-9 w-9' : 'h-10 w-10'}`} />
            </div>
          )}

          {!loading && !error && reportData && reportData.rows.length > 0 && (
            <div
              className={`flex min-h-0 flex-1 flex-col rounded-xl border ${shellBorder} ${
                isEmbedded
                  ? isDarkTheme
                    ? 'bg-white/[0.02] p-3'
                    : 'bg-slate-50/80 p-3'
                  : isDarkTheme
                    ? 'bg-white/[0.02] p-3 sm:p-4'
                    : 'bg-slate-50/60 p-3 sm:p-4'
              }`}
            >
              <FrequencyChartSummaryPanel
                summary={reportData.summary}
                isDarkTheme={isDarkTheme}
                compact={isEmbedded}
              />

              <div
                className={`mt-auto flex items-center justify-between gap-2 ${
                  isEmbedded ? `border-t pt-2.5 ${isDarkTheme ? 'border-white/10' : 'border-slate-200/80'}` : 'pt-3'
                }`}
              >
                <p className={`min-w-0 truncate font-medium ${tc.textSecondary} ${isEmbedded ? 'text-[11px]' : 'text-xs'}`}>
                  {reportData.rows.length} test record{reportData.rows.length !== 1 ? 's' : ''} · {periodLabel}
                </p>
                <button
                  type="button"
                  onClick={() => setShowTestTable((v) => !v)}
                  className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border font-bold transition-colors ${
                    isEmbedded ? 'h-8 px-2.5 text-[11px]' : 'rounded-xl px-3 py-2 text-xs'
                  } ${tc.border} ${showTestTable ? (isDarkTheme ? 'bg-indigo-950/50 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200') : (isDarkTheme ? 'text-white/70 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')}`}
                >
                  {showTestTable ? <Icons.EyeOff size={isEmbedded ? 13 : 14} /> : <Icons.Eye size={isEmbedded ? 13 : 14} />}
                  <span className="whitespace-nowrap">{showTestTable ? 'Hide Data' : 'Show Data'}</span>
                  <Icons.ChevronDown size={isEmbedded ? 13 : 14} className={`transition-transform ${showTestTable ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {!loading && !error && reportData && reportData.rows.length > 0 && showTestTable && (
            <div className={isEmbedded ? 'mt-2 min-h-0 flex-1 overflow-auto' : 'mt-4'}>
              <FrequencyChartTable
                rows={reportData.rows as any}
                view={reportData.view}
                projectName={project.title}
                isDarkTheme={isDarkTheme}
                onRefresh={loadData}
                onEdit={(row) => { setEditRow(row as any); setModalOpen(true); }}
                onDelete={(id, label) => setDeleteConfirm({ id, label })}
              />
            </div>
          )}

          {!loading && !error && reportData && reportData.rows.length === 0 && (
            <div
              className={`flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed text-center ${
                isEmbedded ? 'px-4 py-8' : 'p-10'
              } ${isDarkTheme ? 'border-white/10' : 'border-gray-200'}`}
            >
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
            onSaved={(message) => {
              setModalOpen(false);
              setEditRow(null);
              showToast(message, "success");
              void loadData();
            }}
          />
        )}

        {toast && (
          <div
            className={`pointer-events-none fixed bottom-6 left-1/2 z-[260] -translate-x-1/2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* ── Delete Confirm ──────────────────────────────────────── */}
        {deleteConfirm && (
          <ModalPortal open>
            <div className="fixed inset-0 z-[100040] flex items-center justify-center bg-black/50 p-4">
              <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${tc.bgPrimary} ${tc.border}`}>
                <h3 className={`text-sm font-black ${tc.textPrimary}`}>Delete Record</h3>
                <p className={`mt-2 text-sm ${tc.textSecondary}`}>
                  Delete “{deleteConfirm.label}”?
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold ${tc.buttonSecondary} ${tc.border}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(deleteConfirm.id)}
                    disabled={deleting}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-60"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}
      </div>
    </FullScreenCard>
  );
}
