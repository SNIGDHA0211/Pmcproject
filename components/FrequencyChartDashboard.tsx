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
  layout?: 'default' | 'embedded';
  /** Open the test register table by default (useful on QAQC dashboard). */
  defaultShowTable?: boolean;
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
    <div className={`flex h-full min-h-[22rem] w-full flex-col overflow-hidden rounded-2xl border shadow-md ${tc.bgPrimary} ${tc.border}`}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className={`flex shrink-0 items-center gap-2 border-b ${
          isEmbedded ? 'px-3 py-2.5' : 'flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4'
        } ${tc.border} ${isDarkTheme ? 'bg-white/5' : 'bg-gradient-to-r from-indigo-50 to-purple-50'}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
          <h2
            className={`truncate font-semibold tracking-tight ${tc.textPrimary} ${
              isEmbedded ? 'text-sm sm:text-[15px]' : 'text-base sm:text-lg'
            }`}
          >
            Material Testing Frequency Chart
          </h2>
        </div>

        <div
          className={`flex shrink-0 items-center ${
            isEmbedded ? 'gap-1.5' : 'w-full flex-wrap gap-1.5 sm:w-auto'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setEditRow(null);
              setModalOpen(true);
            }}
            className={`inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 font-bold text-white transition-colors hover:bg-indigo-700 ${
              isEmbedded ? 'h-8 px-2.5 text-[11px]' : 'rounded-xl px-3 py-2 text-xs'
            }`}
            title="Add test record"
          >
            <Icons.Add size={isEmbedded ? 12 : 14} />
            <span className="whitespace-nowrap">Add Record</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading || !reportData || reportData.rows.length === 0}
            className={`inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 ${
              isEmbedded ? 'h-8 px-2.5 text-[11px]' : 'rounded-xl px-3 py-2 text-xs'
            }`}
            title="Download Excel workbook"
          >
            <Icons.Download size={isEmbedded ? 12 : 14} />
            <span className="whitespace-nowrap">{isEmbedded ? 'Excel' : 'Export Excel'}</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Refresh"
            className={`inline-flex items-center justify-center rounded-lg border font-bold transition-colors disabled:opacity-40 ${tc.border} ${tc.textSecondary} ${
              isEmbedded ? 'h-8 w-8' : 'gap-1 rounded-xl px-3 py-2 text-xs'
            } ${isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
          >
            <Icons.History size={isEmbedded ? 14 : 14} className={loading ? 'animate-spin' : ''} />
            {!isEmbedded && <span>Refresh</span>}
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
        compact={isEmbedded}
      />

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className={`flex min-h-0 flex-1 flex-col ${isEmbedded ? 'p-3' : 'space-y-4 p-4 sm:p-6'}`}>

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
            className={`flex min-h-0 flex-1 flex-col rounded-xl border ${
              isEmbedded
                ? isDarkTheme
                  ? 'border-white/10 bg-white/[0.02] p-3'
                  : 'border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-3 shadow-inner'
                : 'border-transparent p-0'
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
          <div className={`rounded-xl border-2 border-dashed text-center ${isEmbedded ? 'p-6' : 'p-10'} ${isDarkTheme ? "border-white/10" : "border-gray-200"}`}>
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
