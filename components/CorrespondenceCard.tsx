import React, { useEffect, useMemo, useState } from "react";
import type {
  CorrespondenceDocument,
  CorrespondenceMonthlyPeriod,
  CorrespondenceProjectSummary,
} from "../types";
import DashboardCardTopAccent from "./DashboardCardTopAccent";
import { Icons } from "./Icons";
import {
  CardActionToolbar,
  FormulaInfoButton,
} from "./FormulaInfoButton";
import CorrespondenceMonthSelector from "./CorrespondenceMonthSelector";
import CorrespondencePartyDashboard from "./CorrespondencePartyDashboard";
import CorrespondenceDocumentsTable from "./CorrespondenceDocumentsTable";
import CorrespondenceSclDeliveredPanel, {
  type SclDeliveredFormValues,
} from "./CorrespondenceSclDeliveredPanel";
import CorrespondenceMonthlyForm, {
  type CorrespondencePartyCountsFormValues,
} from "./CorrespondenceMonthlyForm";
import CorrespondenceDocumentForm, {
  type CorrespondenceDocumentFormValues,
} from "./CorrespondenceDocumentForm";
import {
  aggregateCorrespondenceCumulativePeriod,
  filterCorrespondenceDocumentsByView,
  isSclOutboundDocument,
  normalizeCorrespondenceCategory,
  normalizeCorrespondenceRecipientType,
} from "../utils/correspondence";
import {
  correspondenceExportFilename,
  downloadCorrespondenceExcel,
} from "../utils/correspondenceExport";
import {
  getThemeClasses,
  useTheme,
} from "../utils/theme";
import {
  correspondenceDocumentsApi,
  emptyCorrespondenceSclDelivered,
  normalizeCorrespondenceDashboardParty,
  normalizeCorrespondenceSclDelivered,
  unwrapCorrespondenceSclDeliveredResponse,
  type CorrespondenceDashboardResponse,
  type CorrespondenceSclDelivered,
} from "../services/api";

const emptyPartyMetrics = () => ({
  correspondenceReceived: 0,
  correspondenceDelivered: 0,
  correspondenceRecord: 0,
  onTimeDelivered: 0,
  lateDeliveries: 0,
  pendingCorrespondence: 0,
  deliveryEfficiency: 0,
});

interface CorrespondenceCardProps {
  projectName?: string;
  period: CorrespondenceMonthlyPeriod | null;
  projectSummary: CorrespondenceProjectSummary | null;
  yearPeriods: CorrespondenceMonthlyPeriod[];
  documents: CorrespondenceDocument[];
  selectedMonth: number;
  selectedYear: number;
  isLoading?: boolean;
  error?: string | null;
  isSaving?: boolean;
  formError?: string | null;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onSaveDocument: (
    values: CorrespondenceDocumentFormValues,
    document?: CorrespondenceDocument | null,
  ) => Promise<boolean> | boolean;
  onDeleteDocument?: (
    document: CorrespondenceDocument,
  ) => Promise<boolean> | boolean;
}

const DOCUMENTS_PREVIEW = 3;

const CorrespondenceCardHeader: React.FC<{
  projectName: string;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  onAddDocument?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  view?: "monthly" | "cumulative";
  onViewChange?: (view: "monthly" | "cumulative") => void;
}> = ({
  projectName,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onAddDocument,
  onExport,
  isExporting = false,
  view,
  onViewChange,
}) => {
    const { isDarkTheme } = useTheme();
    const themeClasses = getThemeClasses(isDarkTheme);

    return (
      <div
        className={`flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b pb-2.5 pt-0.5 sm:gap-x-2.5 ${themeClasses.border}`}
      >
        <div className="mr-auto flex min-w-0 items-center gap-2">
          <span
            className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg sm:h-8 sm:w-8 ${isDarkTheme
              ? "bg-blue-500/20 text-blue-300"
              : "bg-blue-100 text-blue-700"
              }`}
          >
            <Icons.Comment size={14} />
          </span>
          <h3 className="min-w-0 truncate text-sm font-semibold tracking-tight text-blue-600 sm:text-base lg:text-lg">
            <span className="lg:hidden">Correspondence</span>
            <span className="hidden lg:inline">Correspondence &amp; Delivery Stat.</span>
          </h3>
        </div>

        {view && onViewChange && (
          <div
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-lg p-0.5 text-xs font-semibold sm:text-sm ${isDarkTheme ? "bg-white/5" : "bg-slate-100"
              }`}
          >
            {(["cumulative", "monthly"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={`rounded-md px-2.5 py-1 transition-all sm:px-3 sm:py-1.5 ${view === v
                  ? "bg-blue-600 font-bold text-white shadow-sm"
                  : isDarkTheme
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                {v === "monthly" ? "Monthly" : "Cumulative"}
              </button>
            ))}
          </div>
        )}

        <div className="w-full min-w-[10.5rem] max-w-[13rem] shrink-0 min-[480px]:w-auto">
          <CorrespondenceMonthSelector
            compact
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={onMonthChange}
            onYearChange={onYearChange}
          />
        </div>

        <CardActionToolbar className="shrink-0">
          <FormulaInfoButton
            title="Correspondence & Delivery Status Formula"
            calculatedFields={[
              "correspondenceDelivered",
              "onTimeDelivered",
              "lateDeliveries",
              "pendingCorrespondence",
              "deliveryEfficiency",
            ]}
            formulas={[
              "Delivered = On Time + Late Deliveries",
              "Received = Delivered + Pending",
              "Delivery Efficiency = (On Time / Delivered) × 100",
            ]}
            statusRules={[
              "On Time: delivered on or before deadline",
              "Late Deliveries: delivered after deadline",
              "Pending: not yet delivered",
            ]}
          />
        </CardActionToolbar>

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            disabled={!projectName || isExporting}
            className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold shadow-sm transition-colors sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm ${
              isDarkTheme
                ? "border-white/15 bg-white/10 text-white hover:bg-white/15 disabled:opacity-50"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            }`}
          >
            <Icons.Download size={14} className={isExporting ? "animate-pulse" : ""} />
            <span className="hidden min-[400px]:inline">{isExporting ? "Exporting…" : "Export Excel"}</span>
            <span className="min-[400px]:hidden">{isExporting ? "…" : "Export"}</span>
          </button>
        )}

        {onAddDocument && (
          <button
            type="button"
            onClick={onAddDocument}
            disabled={!projectName}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
          >
            <Icons.Add size={14} />
            <span className="hidden min-[400px]:inline">Add Document</span>
            <span className="min-[400px]:hidden">Add</span>
          </button>
        )}
      </div>
    );
  };

const CorrespondenceCard: React.FC<CorrespondenceCardProps> = ({
  projectName = "",
  period,
  yearPeriods,
  documents,
  selectedMonth,
  selectedYear,
  isLoading = false,
  error,
  isSaving = false,
  formError,
  onMonthChange,
  onYearChange,
  onSaveDocument,
  onDeleteDocument,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [editType, setEditType] = useState<"CLIENT" | "CONTRACTOR">("CLIENT");
  const [documentScope, setDocumentScope] = useState<"party" | "scl">("party");
  const [editingDocument, setEditingDocument] =
    useState<CorrespondenceDocument | null>(null);

  // Dashboard API state
  const [view, setView] = useState<"monthly" | "cumulative">("cumulative");
  const [dashboardData, setDashboardData] =
    useState<CorrespondenceDashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [sclDelivered, setSclDelivered] = useState<CorrespondenceSclDelivered>(
    () => emptyCorrespondenceSclDelivered(),
  );
  const [sclLoading, setSclLoading] = useState(false);
  const [sclSaving, setSclSaving] = useState(false);
  const [isCountsModalOpen, setIsCountsModalOpen] = useState(false);
  const [countsSaving, setCountsSaving] = useState(false);
  const [countsFormError, setCountsFormError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const applyDashboardResponse = (data: CorrespondenceDashboardResponse | null) => {
    setDashboardData(data ?? null);
    if (data?.scl_delivered_correspondence) {
      setSclDelivered(
        normalizeCorrespondenceSclDelivered(data.scl_delivered_correspondence),
      );
    }
  };

  const refreshCorrespondenceDashboard = async () => {
    if (!projectName) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const res = await correspondenceDocumentsApi.getDashboard({
        project_name: projectName,
        month: selectedMonth,
        year: selectedYear,
        view,
      });
      const data = (res.data as { data?: CorrespondenceDashboardResponse })?.data ?? res.data;
      applyDashboardResponse((data as CorrespondenceDashboardResponse) ?? null);
    } catch (err) {
      console.warn("[CorrespondenceCard] Dashboard refresh failed:", err);
      setDashboardError(null);
    } finally {
      setDashboardLoading(false);
    }
  };

  const refreshSclDelivered = async () => {
    if (!projectName) return;
    setSclLoading(true);
    try {
      const res = await correspondenceDocumentsApi.getSclDelivered({
        project_name: projectName,
        month: selectedMonth,
        year: selectedYear,
        view,
      });
      setSclDelivered(unwrapCorrespondenceSclDeliveredResponse(res.data));
    } catch (err) {
      console.warn("[CorrespondenceCard] SCL refresh failed:", err);
      setSclDelivered(emptyCorrespondenceSclDelivered());
    } finally {
      setSclLoading(false);
    }
  };

  const refreshAllCorrespondenceData = async () => {
    await Promise.all([refreshCorrespondenceDashboard(), refreshSclDelivered()]);
  };

  const savePartyCounts = async (
    values: CorrespondencePartyCountsFormValues,
  ): Promise<boolean> => {
    if (!projectName) return false;
    setCountsSaving(true);
    setCountsFormError(null);
    try {
      await correspondenceDocumentsApi.saveDashboard({
        project_name: projectName,
        month: selectedMonth,
        year: selectedYear,
        view,
        ...values,
      });
      await refreshAllCorrespondenceData();
      return true;
    } catch (error) {
      console.error("[CorrespondenceCard] Party counts save failed:", error);
      setCountsFormError("Failed to save correspondence counts.");
      return false;
    } finally {
      setCountsSaving(false);
    }
  };

  const saveSclDelivered = async (values: SclDeliveredFormValues) => {
    if (!projectName) return;
    setSclSaving(true);
    try {
      await correspondenceDocumentsApi.saveSclDelivered({
        project_name: projectName,
        month: selectedMonth,
        year: selectedYear,
        view,
        ...values,
      });
      await refreshAllCorrespondenceData();
    } catch (error) {
      console.error("[CorrespondenceCard] SCL save failed:", error);
    } finally {
      setSclSaving(false);
    }
  };

  useEffect(() => {
    setView("cumulative");
  }, [projectName]);

  // Fetch from the new dashboard endpoint whenever project/month/year/view changes
  useEffect(() => {
    if (!projectName) {
      setDashboardData(null);
      return;
    }
    let cancelled = false;
    setDashboardLoading(true);
    setDashboardError(null);
    setDashboardData(null);
    correspondenceDocumentsApi
      .getDashboard({
        project_name: projectName,
        month: selectedMonth,
        year: selectedYear,
        view,
      })
      .then((res) => {
        if (cancelled) return;
        const data = (res.data as { data?: CorrespondenceDashboardResponse })?.data ?? res.data;
        applyDashboardResponse((data as CorrespondenceDashboardResponse) ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(
          "[CorrespondenceCard] Dashboard fetch failed, falling back to props:",
          err,
        );
        setDashboardData(null);
        setDashboardError(null); // silent fallback
      })
      .finally(() => {
        if (!cancelled) setDashboardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectName, selectedMonth, selectedYear, view]);

  useEffect(() => {
    if (!projectName) {
      setSclDelivered(emptyCorrespondenceSclDelivered());
      return;
    }
    let cancelled = false;
    setSclLoading(true);
    correspondenceDocumentsApi
      .getSclDelivered({
        project_name: projectName,
        month: selectedMonth,
        year: selectedYear,
        view,
      })
      .then((res) => {
        if (cancelled) return;
        setSclDelivered(unwrapCorrespondenceSclDeliveredResponse(res.data));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[CorrespondenceCard] SCL fetch failed:", err);
        setSclDelivered(emptyCorrespondenceSclDelivered());
      })
      .finally(() => {
        if (!cancelled) setSclLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectName, selectedMonth, selectedYear, view]);

  useEffect(() => {
    setShowAllDocuments(false);
  }, [projectName, selectedMonth, selectedYear, view]);

  // Build effective period — prefer dashboard API data, fall back to props by view
  const effectivePeriod = useMemo<CorrespondenceMonthlyPeriod>(() => {
    if (dashboardData && (!dashboardData.view || dashboardData.view === view)) {
      return {
        projectName,
        month: selectedMonth,
        year: selectedYear,
        client: normalizeCorrespondenceDashboardParty(dashboardData.client),
        contractor: normalizeCorrespondenceDashboardParty(dashboardData.contractor),
      };
    }

    if (view === "cumulative") {
      const cumulative = aggregateCorrespondenceCumulativePeriod(
        yearPeriods,
        selectedMonth,
        selectedYear,
        projectName,
      );
      if (cumulative) return cumulative;
    }

    return (
      period ?? {
        projectName,
        month: selectedMonth,
        year: selectedYear,
        client: emptyPartyMetrics(),
        contractor: emptyPartyMetrics(),
      }
    );
  }, [
    dashboardData,
    period,
    projectName,
    selectedMonth,
    selectedYear,
    view,
    yearPeriods,
  ]);

  // Documents — prefer dashboard recent_documents, fall back to props
  const effectiveDocuments = useMemo<CorrespondenceDocument[]>(() => {
    if (dashboardData?.recent_documents?.length) {
      return dashboardData.recent_documents.map((d) => ({
        id: d.id,
        projectName: d.project_name,
        month: d.month,
        year: d.year,
        correspondenceType: d.correspondence_type as "CLIENT" | "CONTRACTOR",
        correspondenceCategory: normalizeCorrespondenceCategory(d.correspondence_category),
        srNo: d.sr_no,
        description: d.description,
        receivedDate: d.received_date,
        deliveredDate: d.delivered_date ?? null,
        deadlineDate: d.deadline_date ?? null,
        deliveredStatus: d.delivered_status,
        flowDirection: d.flow_direction,
        sender: d.sender,
        recipientType:
          normalizeCorrespondenceRecipientType(d.recipient_type) || null,
        status: d.delivered_status,
      }));
    }
    return documents;
  }, [dashboardData, documents]);

  const isCardLoading = isLoading || dashboardLoading || sclLoading;

  const periodDocuments = useMemo(
    () =>
      filterCorrespondenceDocumentsByView(effectiveDocuments, {
        month: selectedMonth,
        year: selectedYear,
        view,
        projectName: projectName || undefined,
      }),
    [effectiveDocuments, selectedMonth, selectedYear, projectName, view],
  );

  const sortedPeriodDocuments = useMemo(
    () =>
      [...periodDocuments].sort(
        (a, b) =>
          (b.receivedDate || "").localeCompare(a.receivedDate || "") ||
          b.srNo - a.srNo,
      ),
    [periodDocuments],
  );

  const openAdd = (type: "CLIENT" | "CONTRACTOR" = "CLIENT") => {
    setEditingDocument(null);
    setEditType(type);
    setDocumentScope("party");
    setIsModalOpen(true);
  };

  const openAddSclDocument = () => {
    setEditingDocument(null);
    setDocumentScope("scl");
    setIsModalOpen(true);
  };

  const openEditDocument = (document: CorrespondenceDocument) => {
    setEditingDocument(document);
    setEditType(document.correspondenceType);
    setDocumentScope(isSclOutboundDocument(document) ? "scl" : "party");
    setIsModalOpen(true);
  };

  const handleExportExcel = async () => {
    if (!projectName) return;
    setIsExporting(true);
    try {
      await downloadCorrespondenceExcel(
        {
          projectName,
          month: selectedMonth,
          year: selectedYear,
          view,
          period: effectivePeriod,
          documents: sortedPeriodDocuments,
          scl: sclDelivered,
        },
        correspondenceExportFilename(projectName, selectedYear, selectedMonth, view),
      );
    } catch (error) {
      console.error("[CorrespondenceCard] Excel export failed:", error);
      window.alert("Failed to export correspondence report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const headerProps = {
    projectName,
    selectedMonth,
    selectedYear,
    onMonthChange,
    onYearChange,
    onAddDocument: () => openAdd("CLIENT"),
    onExport: handleExportExcel,
    isExporting,
    view,
    onViewChange: setView,
  };

  const renderPartyDashboards = (split = true) => {
    if (isCardLoading) {
      return (
        <div
          className={`grid gap-2 lg:grid-cols-2 lg:gap-3 ${split ? "grid-cols-1" : "grid-cols-1"}`}
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className={`h-40 animate-pulse rounded-lg ${themeClasses.bgSecondary}`}
            />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex min-h-[160px] items-center justify-center text-sm font-bold text-rose-500">
          {error}
        </div>
      );
    }

    if (!projectName) {
      return (
        <div className="flex min-h-[120px] items-center justify-center text-center">
          <p
            className={`text-sm font-bold uppercase tracking-widest ${themeClasses.textMuted}`}
          >
            Select a project to view correspondence.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2 min-[1100px]:grid-cols-2 min-[1100px]:gap-3">
        <CorrespondencePartyDashboard
          partyLabel="Client"
          correspondenceType="CLIENT"
          metrics={effectivePeriod.client}
          documents={periodDocuments}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          compact
          split
        />
        <CorrespondencePartyDashboard
          partyLabel="Contractor"
          correspondenceType="CONTRACTOR"
          metrics={effectivePeriod.contractor}
          documents={periodDocuments}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          compact
          split
        />
      </div>
    );
  };

  const renderDocuments = () => {
    const total = sortedPeriodDocuments.length;
    const isPreview = !showAllDocuments && total > DOCUMENTS_PREVIEW;

    return (
      <div
        className={`space-y-2 rounded-lg border p-2.5 sm:p-3 ${isDarkTheme
          ? "border-white/10 bg-slate-900/30"
          : "border-slate-200 bg-white shadow-sm"
          }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4
            className={`text-xs font-bold uppercase tracking-wide sm:text-sm ${isDarkTheme ? "text-blue-400" : "text-blue-600"}`}
          >
            Documents ({total})
          </h4>
          {total > DOCUMENTS_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllDocuments((open) => !open)}
              className={`shrink-0 text-xs font-bold sm:text-sm ${isDarkTheme
                ? "text-blue-400 hover:text-blue-300"
                : "text-blue-600 hover:text-blue-700"
                } hover:underline`}
            >
              {showAllDocuments ? "Show Less" : `View All (${total}) →`}
            </button>
          )}
        </div>
        <CorrespondenceDocumentsTable
          variant="dashboard"
          showTypeColumn
          compact
          documents={sortedPeriodDocuments}
          maxRows={isPreview ? DOCUMENTS_PREVIEW : undefined}
          totalCount={isPreview ? total : undefined}
          isLoading={isCardLoading}
          onEdit={openEditDocument}
          onDelete={onDeleteDocument}
        />
      </div>
    );
  };

  const renderCardBody = () => (
    <div className="space-y-2 sm:space-y-2.5">
      {projectName && !error && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setCountsFormError(null);
              setIsCountsModalOpen(true);
            }}
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
          >
            Edit Correspondence
          </button>
        </div>
      )}
      {renderPartyDashboards(true)}
      {projectName && !error && (
        <CorrespondenceSclDeliveredPanel
          scl={sclDelivered}
          isSaving={sclSaving}
          onSave={saveSclDelivered}
          onAddDocument={openAddSclDocument}
        />
      )}
      {projectName && !error && renderDocuments()}
    </div>
  );

  return (
    <>
      <div
        className={`po-delivery-card joyride-target-stable correspondence-card relative flex w-full min-w-0 flex-col rounded-2xl border px-3 py-3 sm:px-4 sm:py-3.5 transition-shadow hover:shadow-md ${isDarkTheme
          ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
          : "border-slate-200 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)]"
          }`}
      >
        <DashboardCardTopAccent />
        <CorrespondenceCardHeader {...headerProps} />
        <div className="mt-2 min-h-0 overflow-x-hidden sm:mt-2.5">{renderCardBody()}</div>
      </div>

      {isModalOpen && (
        <CorrespondenceDocumentForm
          projectName={projectName}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          initialType={editType}
          initialScope={documentScope}
          document={editingDocument}
          documents={documents}
          isSaving={isSaving}
          error={formError}
          onClose={() => {
            setIsModalOpen(false);
            setEditingDocument(null);
          }}
          onSubmit={async (values) => {
            const saved = await onSaveDocument(values, editingDocument);
            if (saved) {
              await refreshAllCorrespondenceData();
            }
            return saved;
          }}
        />
      )}

      {isCountsModalOpen && (
        <CorrespondenceMonthlyForm
          projectName={projectName}
          period={effectivePeriod}
          isSaving={countsSaving}
          error={countsFormError}
          onClose={() => setIsCountsModalOpen(false)}
          onSubmit={savePartyCounts}
        />
      )}
    </>
  );
};

export default React.memo(CorrespondenceCard);
