import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { Icons } from "./Icons";
import { ModalPortal } from "./ModalPortal";
import {
  BOTTLENECK_ASSIGNEES,
  BOTTLENECK_TABS,
  bottleneckTypeConfig,
  countOpenByType,
  createBottleneckItem,
  exportBottleneckExcel,
  priorityDotClass,
  prioritySelectClass,
  prioritySelectClassDark,
  statusSelectClass,
  statusSelectClassDark,
  type BottleneckItem,
  type BottleneckPriority,
  type BottleneckStatus,
  type BottleneckTab,
  type BottleneckType,
} from "../utils/bottleneck";
import { useProjectsDashboardTypo } from "../utils/projectsDashboardTypography";
import {
  DASHBOARD_CARD_TITLE_CLASS,
  DASHBOARD_CORRESPONDENCE_TABLE_HEADER_CLASS,
  DASHBOARD_METRIC_SECONDARY_VALUE_CLASS,
  DASHBOARD_STATUS_METRIC_LABEL_CLASS,
  getThemeClasses,
  useTheme,
} from "../utils/theme";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const PREVIEW_LIMIT = 2;

const TYPE_ICONS: Record<
  BottleneckType,
  React.FC<{ size?: number; className?: string }>
> = {
  ISSUE: AlertTriangle,
  CONCERN: AlertCircle,
  RISK: Shield,
  ACTION: ClipboardList,
};

type SaveFeedback = { type: "success" | "error"; message: string };

interface BottleneckSectionProps {
  items: BottleneckItem[];
  onChange: (items: BottleneckItem[]) => void;
  onSave: () => Promise<boolean> | boolean;
  isSaving?: boolean;
  disabled?: boolean;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  embedMode?: boolean;
}

const BottleneckSection: React.FC<BottleneckSectionProps> = ({
  items,
  onChange,
  onSave,
  isSaving = false,
  disabled = false,
  cardRef,
  embedMode = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();

  const [activeTab, setActiveTab] = useState<BottleneckTab>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | BottleneckStatus>(
    "ALL",
  );
  const [priorityFilter, setPriorityFilter] = useState<
    "ALL" | BottleneckPriority
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim().toLowerCase());
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);

  useEffect(() => {
    if (!isViewAllOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsViewAllOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isViewAllOpen]);

  const handleSave = async () => {
    setSaveFeedback(null);
    try {
      const ok = await onSave();
      if (ok) {
        const count = items.filter((item) => item.description.trim()).length;
        const message =
          count === 0
            ? "Bottleneck saved successfully. No active records in this save."
            : `Bottleneck saved successfully. ${count} record${count === 1 ? "" : "s"} saved.`;
        setSaveFeedback({ type: "success", message });
        window.setTimeout(() => setSaveFeedback(null), 5000);
      }
    } catch {
      setSaveFeedback({
        type: "error",
        message: "Failed to save bottleneck records. Please try again.",
      });
    }
  };

  const summary = useMemo(
    () => ({
      issues: countOpenByType(items, "ISSUE"),
      concerns: countOpenByType(items, "CONCERN"),
      risks: countOpenByType(items, "RISK"),
      actions: countOpenByType(items, "ACTION"),
    }),
    [items],
  );

  const footerStats = useMemo(() => {
    const withText = items.filter((i) => i.description.trim());
    return {
      total: withText.length,
      open: withText.filter((i) => i.status === "Open").length,
      inProgress: withText.filter((i) => i.status === "In Progress").length,
      closed: withText.filter((i) => i.status === "Closed").length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = debouncedSearchQuery;
    return items.filter((item) => {
      if (activeTab !== "ALL" && item.type !== activeTab) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && item.priority !== priorityFilter)
        return false;
      if (!q) return true;
      return (
        item.description.toLowerCase().includes(q) ||
        item.assignedTo.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
  }, [items, activeTab, statusFilter, priorityFilter, debouncedSearchQuery]);

  const filterContext = useMemo(() => {
    const withText = items.filter((i) => i.description.trim());
    const active = withText.filter((i) => i.status !== "Closed");
    const parts: string[] = [];
    if (activeTab !== "ALL") {
      parts.push(
        BOTTLENECK_TABS.find((t) => t.id === activeTab)?.label ?? activeTab,
      );
    }
    if (statusFilter !== "ALL") parts.push(statusFilter);
    if (priorityFilter !== "ALL") parts.push(`${priorityFilter} priority`);
    if (searchQuery.trim()) parts.push(`"${searchQuery.trim()}"`);
    return {
      totalRecords: withText.length,
      activeCount: active.length,
      filteredCount: filteredItems.length,
      summary: parts.length > 0 ? parts.join(" · ") : "All records",
    };
  }, [
    items,
    activeTab,
    statusFilter,
    priorityFilter,
    searchQuery,
    filteredItems.length,
  ]);

  const previewItems = useMemo(
    () => filteredItems.slice(-PREVIEW_LIMIT),
    [filteredItems],
  );
  const hasMoreThanPreview = filteredItems.length > PREVIEW_LIMIT;

  const updateItem = (id: string, patch: Partial<BottleneckItem>) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const addItem = (type: BottleneckType = "ISSUE") => {
    onChange([...items, createBottleneckItem(type)]);
  };

  const compactControlClass = `h-9 rounded-lg border px-2.5 outline-none transition-colors focus:ring-2 focus:ring-blue-500/30 ${
    isDarkTheme
      ? "border-white/10 bg-white/5 text-white placeholder:text-white/40"
      : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
  } ${typo.body}`;

  const selectClass = `${compactControlClass} cursor-pointer`;
  const filterControlClass = `h-9 rounded-lg border px-3 outline-none transition-colors focus:ring-2 focus:ring-blue-500/25 ${
    isDarkTheme
      ? "border-white/10 bg-white/5 text-white"
      : "border-slate-200 bg-white text-slate-800 shadow-sm"
  } ${typo.body}`;

  const tableHeaderClass = `px-3 py-2.5 text-xs font-semibold normal-case tracking-wide ${DASHBOARD_CORRESPONDENCE_TABLE_HEADER_CLASS(isDarkTheme)}`;

  const tableColGroup = (
    <colgroup>
      {/* Type */}
      <col style={{ width: "120px" }} />

      {/* Description */}
      <col style={{ width: "320px" }} />

      {/* Priority */}
      <col style={{ width: "140px" }} />

      {/* Status */}
      <col style={{ width: "140px" }} />

      {/* Assigned To */}
      <col style={{ width: "220px" }} />

      {/* Due Date */}
      <col style={{ width: "160px" }} />

      {/* Actions */}
      <col style={{ width: "120px" }} />
    </colgroup>
  );

  const renderRecordRows = (recordItems: BottleneckItem[]) => {
    if (recordItems.length === 0) {
      return (
        <tr>
          <td
            colSpan={7}
            className={`px-3 py-6 text-center ${typo.body} ${themeClasses.textMuted}`}
          >
            No records match your filters. Add a new item to get started.
          </td>
        </tr>
      );
    }

    return recordItems.map((item) => {
      const cfg = bottleneckTypeConfig[item.type];
      const TypeIcon = TYPE_ICONS[item.type];
      return (
        <tr
          key={item.id}
          className={`border-t ${isDarkTheme ? "border-white/10" : "border-slate-100"}`}
        >
          <td className="px-3 py-2 align-middle">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${typo.badge} ${cfg.pill}`}
            >
              <TypeIcon size={12} className={cfg.iconColor} />
              {cfg.label}
            </span>
          </td>
          <td className="px-3 py-2 align-middle">
            <textarea
              rows={2}
              value={item.description}
              onChange={(e) =>
                updateItem(item.id, { description: e.target.value })
              }
              disabled={disabled}
              placeholder="Enter description..."
              className={`${compactControlClass} min-h-[2.5rem] w-full resize-y py-1.5 leading-snug`}
            />
          </td>
          <td className="px-3 py-2 align-middle">
            <select
              value={item.priority}
              onChange={(e) =>
                updateItem(item.id, {
                  priority: e.target.value as BottleneckPriority,
                })
              }
              disabled={disabled}
              className={`${selectClass} w-full font-semibold ${
                isDarkTheme
                  ? prioritySelectClassDark[item.priority]
                  : prioritySelectClass[item.priority]
              }`}
            >
              {(["High", "Medium", "Low"] as const).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </td>
          <td className="px-3 py-2 align-middle">
            <select
              value={item.status}
              onChange={(e) =>
                updateItem(item.id, {
                  status: e.target.value as BottleneckStatus,
                })
              }
              disabled={disabled}
              className={`${selectClass} w-full font-semibold ${
                isDarkTheme
                  ? statusSelectClassDark[item.status]
                  : statusSelectClass[item.status]
              }`}
            >
              {(["Open", "In Progress", "Closed"] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </td>
          <td className="px-3 py-2 align-middle">
            <div className="relative">
              <User
                size={14}
                className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`}
              />
              <input
                list={`assignees-${item.id}`}
                value={item.assignedTo}
                onChange={(e) =>
                  updateItem(item.id, { assignedTo: e.target.value })
                }
                disabled={disabled}
                placeholder="Assignee"
                className={`${compactControlClass} w-full pl-8`}
              />
              <datalist id={`assignees-${item.id}`}>
                {BOTTLENECK_ASSIGNEES.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </td>
          <td className="px-3 py-2 align-middle">
            <input
              type="date"
              value={item.dueDate}
              onChange={(e) => updateItem(item.id, { dueDate: e.target.value })}
              disabled={disabled}
              className={`${compactControlClass} w-full`}
            />
          </td>
          <td className="px-3 py-2 align-middle">
            <div className="mx-auto flex w-fit items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={disabled || isSaving}
                title="Save bottleneck"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isDarkTheme
                    ? "text-blue-400 hover:bg-blue-500/10"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                <Save size={16} />
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={disabled}
                title="Delete row"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isDarkTheme
                    ? "text-rose-400 hover:bg-rose-500/10"
                    : "text-rose-600 hover:bg-rose-50"
                }`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  const renderTabsBar = () => (
    <div
      className={`flex flex-wrap gap-x-3 gap-y-0 overflow-x-auto border-b pb-0 pt-1.5 ${
        embedMode ? `${isDarkTheme ? 'border-white/10' : 'border-slate-100'} px-3` : `px-4 pt-2 sm:gap-x-5 sm:px-5 ${isDarkTheme ? 'border-white/10' : 'border-slate-200'}`
      }`}
      style={{ scrollbarWidth: "none" }}
    >
      {BOTTLENECK_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 pb-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors sm:text-xs ${
              isActive
                ? "border-b-2 border-blue-600 text-blue-600"
                : `${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)} hover:text-blue-600`
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  const renderFiltersRow = () => (
    <div className={embedMode ? 'py-2' : 'px-4 py-3 sm:px-5'}>
      <div
        className={`flex flex-col gap-2 rounded-xl border px-2.5 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 ${
          isDarkTheme
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white shadow-sm"
        }`}
      >
        {/* Record counts */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
          <span
            className={`text-xs font-semibold tabular-nums ${themeClasses.textPrimary}`}
          >
            {filterContext.filteredCount} record
            {filterContext.filteredCount === 1 ? "" : "s"}
          </span>
          <span
            className={`text-xs font-medium tabular-nums ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
          >
            {filterContext.activeCount} active
          </span>
          <span
            className={`text-xs font-medium tabular-nums ${DASHBOARD_METRIC_SECONDARY_VALUE_CLASS(isDarkTheme)}`}
          >
            {filterContext.totalRecords} total
          </span>
          <span
            className={`text-[10px] font-medium leading-snug ${DASHBOARD_METRIC_SECONDARY_VALUE_CLASS(isDarkTheme)}`}
          >
            {filterContext.summary}
          </span>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className={`${filterControlClass} flex-1 cursor-pointer sm:flex-none sm:min-w-[8.5rem]`}
            aria-label="Filter by status"
          >
            <option value="ALL">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as typeof priorityFilter)
            }
            className={`${filterControlClass} flex-1 cursor-pointer sm:flex-none sm:min-w-[8.5rem]`}
            aria-label="Filter by priority"
          >
            <option value="ALL">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-[14rem]">
            <Search
              size={14}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${themeClasses.textMuted}`}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={`${filterControlClass} w-full pl-9`}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNavSection = () => (
    <div className={embedMode ? (isDarkTheme ? 'bg-white/[0.03]' : 'bg-slate-50/50') : isDarkTheme ? 'bg-white/[0.02]' : 'bg-slate-50/50'}>
      {renderTabsBar()}
      <div className={embedMode ? 'px-3 pb-2' : ''}>{renderFiltersRow()}</div>
    </div>
  );

  const renderTable = (recordItems: BottleneckItem[], showAddRow: boolean) => (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1100px]">
        <table className="w-full min-w-[1220px] border-collapse text-left">
          {tableColGroup}

          <thead className={isDarkTheme ? "bg-white/[0.04]" : "bg-slate-50/80"}>
            <tr>
              {[
                "Type",
                "Description",
                "Priority",
                "Status",
                "Assigned To",
                "Due Date",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className={`${tableHeaderClass} ${
                    heading === "Actions" ? "text-center" : ""
                  }`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>{renderRecordRows(recordItems)}</tbody>
        </table>
      </div>

      {showAddRow && (
        <div className="mt-4">
          <button
            type="button"
            disabled={disabled}
            onClick={() => addItem(activeTab === "ALL" ? "ISSUE" : activeTab)}
            className={`inline-flex items-center gap-1 ${
              typo.bodyBold
            } text-blue-600 hover:underline disabled:opacity-50`}
          >
            <Plus size={14} />
            Add New Row
          </button>
        </div>
      )}
    </div>
  );

  const summaryCards = [
    {
      type: "ISSUE" as const,
      label: "Total Issues",
      sub: "Open Issues",
      count: summary.issues,
    },
    {
      type: "CONCERN" as const,
      label: "Total Concerns",
      sub: "Open Concerns",
      count: summary.concerns,
    },
    {
      type: "RISK" as const,
      label: "Total Risks",
      sub: "Open Risks",
      count: summary.risks,
    },
    {
      type: "ACTION" as const,
      label: "Total Actions",
      sub: "Open Actions",
      count: summary.actions,
    },
  ] as const;

  return (
    <div
      ref={cardRef}
      id="project-logs"
      className={
        embedMode
          ? 'project-logs-card bottleneck-card joyride-target-stable relative flex w-full flex-col'
          : `project-logs-card bottleneck-card joyride-target-stable relative flex w-full flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-md ${
              isDarkTheme
                ? `${themeClasses.glassCard} ${themeClasses.border} shadow-sm`
                : "border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.07)]"
            }`
      }
    >
      {embedMode ? (
        <div className={`flex flex-wrap items-center justify-end gap-2 border-b px-3 py-2 sm:px-4 ${isDarkTheme ? 'border-white/10' : 'border-slate-100'}`}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => addItem("ISSUE")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-blue-700 disabled:opacity-50 sm:text-xs"
          >
            <Plus size={14} />
            Add New
          </button>
          <button
            type="button"
            disabled={disabled || items.length === 0}
            onClick={() => void exportBottleneckExcel(items)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:text-xs"
          >
            <Upload size={14} strokeWidth={2.5} />
            Export
          </button>
        </div>
      ) : (
      <>
      {/* Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-3.5 ${
          isDarkTheme ? "border-b border-white/10" : "border-b border-slate-100"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${
              isDarkTheme
                ? "bg-blue-600 text-white"
                : "bg-blue-600 text-white shadow-sm"
            }`}
          >
            <Icons.Issue size={20} />
          </span>
          <h3 className={DASHBOARD_CARD_TITLE_CLASS}>The Bottleneck</h3>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => addItem("ISSUE")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50 sm:px-4 sm:py-2.5"
          >
            <span>Add New</span>
          </button>
          <button
            type="button"
            disabled={disabled || items.length === 0}
            onClick={() => void exportBottleneckExcel(items)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50 ${
              isDarkTheme
                ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
                : "border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            }`}
          >
            <Upload size={14} strokeWidth={2.5} />
            Export Excel
          </button>
        </div>
      </div>
      </>
      )}

      {saveFeedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mx-4 mt-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 sm:mx-5 ${
            saveFeedback.type === "success"
              ? isDarkTheme
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
              : isDarkTheme
                ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex min-w-0 items-start gap-2">
            {saveFeedback.type === "success" ? (
              <CheckCircle2
                size={20}
                className={`mt-0.5 shrink-0 ${isDarkTheme ? "text-emerald-400" : "text-emerald-600"}`}
                aria-hidden
              />
            ) : (
              <AlertCircle
                size={20}
                className={`mt-0.5 shrink-0 ${isDarkTheme ? "text-rose-400" : "text-rose-600"}`}
                aria-hidden
              />
            )}
            <p className={`${typo.bodyBold} leading-snug`}>
              {saveFeedback.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSaveFeedback(null)}
            className="shrink-0 rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100"
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!embedMode && (
      <div className="grid grid-cols-2 gap-2 px-4 py-3 sm:gap-2.5 sm:px-5 lg:grid-cols-4">
        {summaryCards.map(({ type, label, sub, count }) => {
          const cfg = bottleneckTypeConfig[type];
          const Icon = TYPE_ICONS[type];
          return (
            <div
              key={type}
              className={`flex min-h-[4rem] flex-col rounded-lg border border-b-[3px] px-2.5 py-2 ${cfg.border} sm:min-h-[4.25rem] ${
                isDarkTheme
                  ? "border-white/10 bg-white/[0.03]"
                  : `border-slate-200 ${cfg.summaryBg}`
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <p
                  className={`min-w-0 text-[9px] font-semibold uppercase leading-tight tracking-wide sm:text-[10px] ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
                >
                  {label}
                </p>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7 ${cfg.iconBg}`}
                >
                  <Icon size={13} className={cfg.iconColor} />
                </span>
              </div>
              <div className="mt-auto pt-1">
                <p
                  className={`font-black tabular-nums leading-none text-2xl sm:text-3xl ${cfg.iconColor}`}
                >
                  {count}
                </p>
                <p
                  className={`mt-0.5 text-[9px] font-medium sm:text-[10px] ${DASHBOARD_METRIC_SECONDARY_VALUE_CLASS(isDarkTheme)}`}
                >
                  {sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {renderNavSection()}

      <div
        className={`flex flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 ${
          isDarkTheme ? "border-white/10" : "border-slate-200"
        }`}
      >
        <h4
          className={`text-sm font-semibold uppercase tracking-wide ${
            isDarkTheme ? "text-blue-400" : "text-blue-600"
          }`}
        >
          Recent Records ({filteredItems.length})
        </h4>

        {filteredItems.length > 0 && (
          <button
            type="button"
            onClick={() => setIsViewAllOpen(true)}
            className="inline-flex w-fit items-center gap-1 text-xs font-bold uppercase tracking-wide text-blue-600 transition-colors hover:text-blue-700"
          >
            View All
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className={`w-full overflow-x-auto ${embedMode ? 'max-h-[220px] overflow-y-auto' : ''}`}>
        {renderTable(previewItems, false)}
      </div>

      <div
        className={`flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3 lg:flex-row ${
          isDarkTheme
            ? "border-t border-white/10 bg-white/[0.02]"
            : "border-t border-slate-100 bg-slate-50/60"
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${typo.caption}`}
        >
          <span
            className={`font-semibold tabular-nums ${themeClasses.textPrimary}`}
          >
            {footerStats.total} record{footerStats.total === 1 ? "" : "s"}
          </span>

          <span className="font-medium text-rose-600">
            {footerStats.open} open
          </span>

          <span className="font-medium text-orange-600">
            {footerStats.inProgress} in progress
          </span>

          <span
            className={`font-medium ${
              isDarkTheme ? "text-emerald-400" : "text-emerald-600"
            }`}
          >
            {footerStats.closed} closed
          </span>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={disabled || isSaving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:px-5 sm:py-2.5"
        >
          <Save size={14} />
          {isSaving
            ? "Saving..."
            : saveFeedback?.type === "success"
              ? "Saved"
              : "Save Changes"}
        </button>
      </div>

      <ModalPortal open={isViewAllOpen}>
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm"
          onClick={(e) =>
            e.target === e.currentTarget && setIsViewAllOpen(false)
          }
        >
          <div
            className={`flex max-h-[95vh] w-full max-w-[98vw] sm:max-w-4xl xl:max-w-7xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
              isDarkTheme
                ? `${themeClasses.glassCard} ${themeClasses.border}`
                : "border-slate-200 bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${themeClasses.border}`}
            >
              <div className="min-w-0">
                <h3 className={typo.cardTitle}>All Bottleneck Records</h3>

                <p className={`${typo.caption} ${themeClasses.textMuted}`}>
                  {filteredItems.length} record
                  {filteredItems.length === 1 ? "" : "s"} matching filters
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsViewAllOpen(false)}
                className={`self-start rounded-lg border p-2 sm:self-auto ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {renderNavSection()}
              {renderTable(filteredItems, true)}

              <div
                className={`flex flex-col gap-4 border-t px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between ${
                  isDarkTheme
                    ? "border-white/10 bg-white/[0.02]"
                    : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`${typo.labelBold} ${themeClasses.textMuted}`}
                  >
                    Priority Guide
                  </span>

                  {(["High", "Medium", "Low"] as const).map((p) => (
                    <span
                      key={p}
                      className={`inline-flex items-center gap-1.5 ${typo.caption}`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${priorityDotClass[p]}`}
                      />
                      {p}
                    </span>
                  ))}
                </div>

                <div
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${typo.body}`}
                >
                  <span className={themeClasses.textPrimary}>
                    <strong>Total:</strong> {footerStats.total}
                  </span>

                  <span className="text-rose-600">
                    <strong>Open:</strong> {footerStats.open}
                  </span>

                  <span className="text-orange-600">
                    <strong>In Progress:</strong> {footerStats.inProgress}
                  </span>

                  <span className="text-emerald-600">
                    <strong>Closed:</strong> {footerStats.closed}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:justify-end sm:px-5 ${
                isDarkTheme
                  ? "border-t border-white/10 bg-white/[0.02]"
                  : "border-t-2 border-slate-200/90 bg-slate-50/60"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsViewAllOpen(false)}
                className={`w-full rounded-xl px-4 py-2 sm:w-auto ${typo.buttonSm} font-bold ${themeClasses.buttonSecondary}`}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={disabled || isSaving}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 sm:w-auto ${typo.buttonSm} text-white transition-colors hover:bg-blue-700 disabled:opacity-50`}
              >
                <Save size={14} />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};

export default React.memo(BottleneckSection);
