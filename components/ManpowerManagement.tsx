import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Joyride, Step, STATUS, ACTIONS, EVENTS, EventData } from 'react-joyride';
import { useTheme, getThemeClasses } from '../utils/theme';
import { Icons } from './Icons';
import { manpowerApi, unwrapList, normalizeManpowerRecord } from '../services/api';
import { Project, User, UserRole } from '../types';
import { formatReportPercent, formatReportTodayDate } from '../utils/csvReport';
import { downloadSectionsExcel } from '../utils/projectReportExcel';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface ManpowerRecord {
  id: number;
  project_name: string;
  month_year: string;
  planned_manpower: number;
  actual_manpower: number;
  working_hours_per_day?: number;
  working_days_per_month?: number;
  manpower_efficiency?: number;
  created_at?: string;
}

interface ManpowerManagementProps {
  projects?: Project[];
  currentUser?: User;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const TABLE_HEADERS = ['Sr', 'Project', 'Month-Year', 'Planned', 'Actual', 'Difference', 'Efficiency', 'Actions'] as const;

function normalizeProjectKey(name: string): string {
  return name.trim().toLowerCase();
}

function isTeamLeadAssignedToProject(project: Project, user: User): boolean {
  if (!project.teamLeadId) return false;
  return (
    project.teamLeadId === user.id ||
    (!!user.username && project.teamLeadId === user.username)
  );
}

function parseEfficiencyPercent(efficiency: number | null | undefined): number | null {
  if (efficiency == null || !Number.isFinite(efficiency)) return null;
  return efficiency <= 1 ? efficiency * 100 : efficiency;
}

function getEfficiencyVisual(pct: number, isDarkTheme: boolean) {
  if (pct >= 100) {
    return {
      text: isDarkTheme ? 'text-emerald-400' : 'text-[#16A34A]',
      bar: isDarkTheme ? 'bg-emerald-500' : 'bg-[#22C55E]',
    };
  }
  if (pct >= 80) {
    return {
      text: isDarkTheme ? 'text-blue-400' : 'text-[#2563EB]',
      bar: isDarkTheme ? 'bg-blue-500' : 'bg-[#3B82F6]',
    };
  }
  if (pct >= 60) {
    return {
      text: isDarkTheme ? 'text-amber-400' : 'text-[#D97706]',
      bar: isDarkTheme ? 'bg-amber-500' : 'bg-[#F59E0B]',
    };
  }
  return {
    text: isDarkTheme ? 'text-rose-400' : 'text-[#DC2626]',
    bar: isDarkTheme ? 'bg-rose-500' : 'bg-[#EF4444]',
  };
}

const ManpowerEfficiencyCell: React.FC<{
  efficiency: number | null | undefined;
  isDarkTheme: boolean;
}> = ({ efficiency, isDarkTheme }) => {
  const pct = parseEfficiencyPercent(efficiency);
  if (pct == null) {
    return (
      <span className={`text-sm font-medium ${isDarkTheme ? 'text-slate-500' : 'text-[#64748B]'}`}>
        —
      </span>
    );
  }
  const visual = getEfficiencyVisual(pct, isDarkTheme);
  const clamped = Math.min(Math.max(pct, 0), 100);

  return (
    <div className="flex min-w-[88px] flex-col items-center gap-1.5">
      <span className={`text-sm font-semibold tabular-nums ${visual.text}`}>{pct.toFixed(1)}%</span>
      <div
        className={`h-1.5 w-full max-w-[72px] overflow-hidden rounded-full ${
          isDarkTheme ? 'bg-slate-700' : 'bg-[#E2E8F0]'
        }`}
        role="presentation"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${visual.bar}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

const ManpowerDiffChip: React.FC<{ diff: number; isDarkTheme: boolean }> = ({ diff, isDarkTheme }) => {
  const positive = diff > 0;
  const negative = diff < 0;
  const chipClass = positive
    ? isDarkTheme
      ? 'bg-emerald-500/20 text-emerald-400'
      : 'bg-[#DCFCE7] text-[#16A34A]'
    : negative
      ? isDarkTheme
        ? 'bg-rose-500/20 text-rose-400'
        : 'bg-[#FEE2E2] text-[#DC2626]'
      : isDarkTheme
        ? 'bg-slate-500/20 text-slate-400'
        : 'bg-slate-100 text-[#64748B]';

  return (
    <span
      className={`inline-flex h-6 min-w-[52px] items-center justify-center rounded-full px-2.5 text-[13px] font-bold tabular-nums ${chipClass}`}
    >
      {diff > 0 ? '+' : ''}
      {diff}
    </span>
  );
};

const ManpowerManagement: React.FC<ManpowerManagementProps> = ({ projects = [], currentUser }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  // Data state
  const [records, setRecords] = useState<ManpowerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    project_name: "",
    month: "Jan",
    year: new Date().getFullYear().toString(),
    planned_manpower: "0",
    actual_manpower: "0",
    remarks: "", // UI only (not sent to backend)
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterYear, setFilterYear] = useState("All");

  // Toast notifications
  const [toasts, setToasts] = useState<
    Array<{ id: number; message: string; type: "success" | "error" }>
  >([]);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    project: string;
    monthYear: string;
  } | null>(null);

  // === MANPOWER TOUR - REUSING EXACT DASHBOARD WALKTHROUGH ARCHITECTURE (react-joyride + stable engine) ===
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const [showStepRecoveryBanner, setShowStepRecoveryBanner] = useState(false);

  const initializedRef = useRef(false);
  const endedRef = useRef(false);
  const isProcessingStepRef = useRef(false);

  // Stable refs (kept for potential future direct access; joyride primarily uses CSS selectors for 1:1 parity with Dashboard)
  const heroRef = useRef<HTMLDivElement>(null);
  const totalPlannedRef = useRef<HTMLDivElement>(null);
  const totalActualRef = useRef<HTMLDivElement>(null);
  const netDiffRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);
  const projectNameRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const plannedManpowerRef = useRef<HTMLDivElement>(null);
  const actualManpowerRef = useRef<HTMLDivElement>(null);
  const differenceRef = useRef<HTMLDivElement>(null);
  const remarksRef = useRef<HTMLDivElement>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const resetBtnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const monthFilterRef = useRef<HTMLSelectElement>(null);
  const yearFilterRef = useRef<HTMLSelectElement>(null);
  const clearFiltersRef = useRef<HTMLButtonElement>(null);
  const recordsTableRef = useRef<HTMLDivElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  // EXACT same step engine architecture as ProjectsDashboardTour (react-joyride + stable deterministic sequencing)
  const MANPOWER_TOUR_STEPS: Step[] = [
    {
      target: ".manpower-header",
      title: "Monthly Manpower Management",
      content:
        "This workspace helps Team Leaders manage planned versus actual manpower deployment across projects.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-total-planned-card",
      title: "Total Planned",
      content:
        "This card shows the total planned workforce across all projects for the selected period.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-total-actual-card",
      title: "Total Actual",
      content:
        "This displays the actual manpower currently deployed on the ground.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-net-difference-card",
      title: "Net Difference",
      content:
        "This compares planned versus actual manpower to identify shortages or excess workforce.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-form-section",
      title: "Add New Manpower Record",
      content: "Use this form to add monthly manpower deployment records.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: ".manpower-project-name-field",
      title: "Project Name",
      content:
        "Select or enter the project for which manpower is being tracked.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-month-field",
      title: "Month",
      content: "Choose the execution month for this manpower record.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-year-field",
      title: "Year",
      content: "Select the execution year for the manpower deployment.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-planned-field",
      title: "Monthly Planned Manpower",
      content: "Enter the planned manpower allocation for the selected month.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-actual-field",
      title: "Actual Manpower",
      content: "Enter the actual manpower deployed on site.",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-difference-field",
      title: "Difference (Auto-calculated)",
      content:
        "This field automatically calculates the manpower variance (Actual minus Planned).",
      placement: "bottom",
      skipBeacon: true,
    },
    {
      target: ".manpower-remarks-field",
      title: "Remarks",
      content:
        "Use remarks to document deployment notes or special observations.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: ".manpower-save-btn",
      title: "Save Record",
      content: "Click here to save the manpower deployment record.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: ".manpower-filters-section",
      title: "Search & Filters",
      content:
        "Use filters to quickly locate manpower records by project, month, or year.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: ".manpower-records-table",
      title: "Manpower Records Table",
      content:
        "This table displays all manpower deployment records with planned, actual, efficiency, and variance metrics.",
      placement: "top",
      skipBeacon: true,
    },
    {
      target: ".manpower-edit-action",
      title: "Edit Record",
      content: "Use Edit to update existing manpower records.",
      placement: "left",
      skipBeacon: true,
    },
    {
      target: ".manpower-delete-action",
      title: "Delete Record",
      content: "Delete removes manpower records permanently from the system.",
      placement: "left",
      skipBeacon: true,
    },
    {
      target: "body",
      title: "Walkthrough Complete",
      content: "You have completed the Manpower Management walkthrough.",
      placement: "center",
      skipBeacon: true,
    },
  ];

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Live difference calculation
  const planned = parseInt(formData.planned_manpower) || 0;
  const actual = parseInt(formData.actual_manpower) || 0;
  const difference = actual - planned;

  const labelClass = `block text-[13px] font-semibold tracking-[0.3px] mb-2 ${
    isDarkTheme ? themeClasses.textSecondary : 'text-[#475569]'
  }`;
  const inputClass = `w-full h-12 px-4 rounded-xl text-base font-medium leading-none outline-none border transition-colors focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${
    isDarkTheme
      ? `${themeClasses.input} ${themeClasses.border}`
      : 'border-[#E2E8F0] bg-white text-[#1E293B] placeholder:text-[15px] placeholder:font-normal placeholder:text-[#94A3B8]'
  }`;
  const secondaryBtnClass = `inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 focus-visible:ring-offset-2 disabled:opacity-60 ${
    isDarkTheme
      ? `${themeClasses.border} ${themeClasses.buttonSecondary}`
      : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50'
  }`;
  const cardSurface = `${themeClasses.glassCard} ${
    isDarkTheme ? themeClasses.border : 'border-[#E2E8F0]'
  }`;
  const diffValueColor =
    difference > 0
      ? isDarkTheme
        ? 'text-emerald-400'
        : 'text-[#10B981]'
      : difference < 0
        ? isDarkTheme
          ? 'text-rose-400'
          : 'text-[#EF4444]'
        : isDarkTheme
          ? 'text-slate-400'
          : 'text-[#64748B]';
  const diffBgClass =
    difference > 0
      ? isDarkTheme
        ? 'bg-emerald-500/10 border-emerald-500/20'
        : 'bg-emerald-50 border-emerald-100'
      : difference < 0
        ? isDarkTheme
          ? 'bg-rose-500/10 border-rose-500/20'
          : 'bg-rose-50 border-rose-100'
        : isDarkTheme
          ? 'bg-slate-500/10 border-slate-500/20'
          : 'bg-slate-50 border-[#E2E8F0]';

  const isTeamLead = currentUser?.role === UserRole.TEAM_LEAD;
  const isSiteEngineer = currentUser?.role === UserRole.SITE_ENGINEER;

  const accessibleProjects = useMemo(() => {
    if (!currentUser) return projects;
    if (isTeamLead) {
      return projects.filter((project) =>
        isTeamLeadAssignedToProject(project, currentUser),
      );
    }
    if (isSiteEngineer) {
      return projects.filter((p) => p.siteEngineerIds.includes(currentUser.id));
    }
    return projects;
  }, [projects, isTeamLead, isSiteEngineer, currentUser]);

  const assignedProjectNames = useMemo(
    () =>
      accessibleProjects
        .map((project) => project.title?.trim())
        .filter((title): title is string => Boolean(title)),
    [accessibleProjects],
  );

  const singleAssignedProjectName =
    accessibleProjects.length === 1
      ? accessibleProjects[0]?.title?.trim() || ''
      : '';

  const matchesAssignedProject = useCallback(
    (projectName: string) => {
      if (!isTeamLead && !isSiteEngineer) return true;
      if (assignedProjectNames.length === 0) return false;
      const key = normalizeProjectKey(projectName);
      return assignedProjectNames.some(
        (name) => normalizeProjectKey(name) === key,
      );
    },
    [isTeamLead, isSiteEngineer, assignedProjectNames],
  );

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: { page_size: number; project_name?: string } = {
        page_size: 200,
      };
      if ((isTeamLead || isSiteEngineer) && singleAssignedProjectName) {
        params.project_name = singleAssignedProjectName;
      }
      const response = await manpowerApi.getManpower(params);
      const data = response.data;
      let list = unwrapList<any>(data).map(normalizeManpowerRecord) as ManpowerRecord[];
      if (isTeamLead || isSiteEngineer) {
        list = list.filter((record) =>
          matchesAssignedProject(record.project_name),
        );
      }
      const sorted = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
      setRecords(sorted);
    } catch (err: any) {
      console.error("Failed to fetch manpower:", err);
      setError("Failed to load manpower records. Please try again.");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [isTeamLead, isSiteEngineer, singleAssignedProjectName, matchesAssignedProject]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (!isTeamLead || !singleAssignedProjectName || editingId) return;
    setFormData((prev) =>
      prev.project_name === singleAssignedProjectName
        ? prev
        : { ...prev, project_name: singleAssignedProjectName },
    );
  }, [isTeamLead, singleAssignedProjectName, editingId]);

  // Tour highlight/positioning now handled by react-joyride (exact Dashboard architecture) — custom effects removed for 1:1 parity.

  // Filtered + searched records (search debounced to avoid re-filtering every keystroke)
  const debouncedSearchTerm = useDebouncedValue(searchTerm.trim().toLowerCase());
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (!matchesAssignedProject(rec.project_name)) return false;
      const matchesSearch =
        !debouncedSearchTerm ||
        rec.project_name.toLowerCase().includes(debouncedSearchTerm);
      const [recMonth, recYear] = rec.month_year.split("-");
      const matchesMonth = filterMonth === "All" || recMonth === filterMonth;
      const matchesYear = filterYear === "All" || recYear === filterYear;
      return matchesSearch && matchesMonth && matchesYear;
    });
  }, [records, debouncedSearchTerm, filterMonth, filterYear, matchesAssignedProject]);

  // Summary stats (on filtered)
  const totalPlanned = filteredRecords.reduce(
    (sum, r) => sum + (r.planned_manpower || 0),
    0,
  );
  const totalActual = filteredRecords.reduce(
    (sum, r) => sum + (r.actual_manpower || 0),
    0,
  );
  const totalDiff = totalActual - totalPlanned;

  // Project options for datalist
  const projectOptions =
    accessibleProjects.length > 0
      ? accessibleProjects.map((project) => project.title)
      : projects.map((project) => project.title);

  // Form handlers
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      project_name: isTeamLead && singleAssignedProjectName ? singleAssignedProjectName : "",
      month: "Jan",
      year: new Date().getFullYear().toString(),
      planned_manpower: "0",
      actual_manpower: "0",
      remarks: "",
    });
    setEditingId(null);
  };

  const handleEdit = (record: ManpowerRecord) => {
    const [month, year] = record.month_year.split("-");
    setFormData({
      project_name: record.project_name,
      month: MONTHS.includes(month) ? month : "Jan",
      year: year || new Date().getFullYear().toString(),
      planned_manpower: String(record.planned_manpower ?? 0),
      actual_manpower: String(record.actual_manpower ?? 0),
      remarks: "",
    });
    setEditingId(record.id);
    // scroll to form
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.project_name.trim()) {
      showToast("Project name is required", "error");
      return;
    }
    if (isTeamLead && !matchesAssignedProject(formData.project_name)) {
      showToast("You can only manage manpower for your assigned project", "error");
      return;
    }
    if (!formData.month || !formData.year) {
      showToast("Month and Year are required", "error");
      return;
    }
    const plannedNum = parseInt(formData.planned_manpower);
    const actualNum = parseInt(formData.actual_manpower);
    if (
      isNaN(plannedNum) ||
      plannedNum < 0 ||
      isNaN(actualNum) ||
      actualNum < 0
    ) {
      showToast(
        "Planned and Actual manpower must be non-negative numbers",
        "error",
      );
      return;
    }

    const payload = {
      project_name: formData.project_name.trim(),
      month: formData.month,
      year: parseInt(formData.year, 10),
      planned_manpower: plannedNum,
      actual_manpower: actualNum,
      working_hours_per_day: 8,
      working_days_per_month: 26,
    };

    setIsSubmitting(true);
    try {
      if (editingId) {
        await manpowerApi.updateManpower(editingId, payload);
        showToast("Manpower record updated successfully!");
      } else {
        await manpowerApi.createManpower(payload);
        showToast("Manpower record created successfully!");
      }
      resetForm();
      await fetchRecords();
    } catch (err: any) {
      const msg = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err.message || "Unknown error";
      showToast(`Save failed: ${msg}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await manpowerApi.deleteManpower(id);
      showToast("Record deleted successfully");
      setDeleteConfirm(null);
      await fetchRecords();
    } catch (err: any) {
      showToast("Failed to delete record", "error");
    }
  };

  const exportExcel = async () => {
    if (filteredRecords.length === 0) {
      showToast("No data to export", "error");
      return;
    }
    await downloadSectionsExcel(
      [
        {
          title: 'MANPOWER RECORDS',
          headers: ['Sr No', 'Project Name', 'Month-Year', 'Planned', 'Actual', 'Difference', 'Efficiency'],
          rows: filteredRecords.map((r, idx) => {
            const diff = (r.actual_manpower || 0) - (r.planned_manpower || 0);
            const eff =
              r.manpower_efficiency != null
                ? formatReportPercent(r.manpower_efficiency * 100, 1)
                : 'N/A';
            return [
              idx + 1,
              r.project_name,
              r.month_year,
              r.planned_manpower,
              r.actual_manpower,
              diff,
              eff,
            ];
          }),
        },
      ],
      `manpower_${formatReportTodayDate().replace(/-/g, '')}.xlsx`,
      'Manpower'
    );
    showToast('Excel exported');
  };

  // =====================================================
  // EXACT DASHBOARD WALKTHROUGH ENGINE (react-joyride)
  // Reused 1:1 for visual + behavioral parity
  // =====================================================

  const finishTour = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    localStorage.setItem("manpowerManagementTourCompleted", "true");
    setRun(false);
    setStepIndex(0);
    setTourActive(false);
    setShowStepRecoveryBanner(false);
    isProcessingStepRef.current = false;
    document.body.style.overflow = "auto";
    document.body.style.pointerEvents = "";
  }, []);

  // Comfortably visible check (prevents unnecessary scroll)
  // Top margin 100px, bottom margin 120px for professional framing
  const isTargetComfortablyVisible = useCallback((el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    return rect.top >= 100 && rect.bottom <= window.innerHeight - 120;
  }, []);

  // SMART auto-scroll:
  // - Small targets (buttons/fields/cards): center with scrollIntoView
  // - Large sections (table/form/filters): align top with ~120px navbar offset via window.scrollTo
  // Only scrolls when NOT already comfortably visible
  const scrollTargetIntoView = useCallback(
    async (selector: string) => {
      if (!selector || selector === "body") return;

      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;

      // Do not scroll if already well-framed in viewport
      if (isTargetComfortablyVisible(el)) {
        return;
      }

      const rect = el.getBoundingClientRect();
      const isLargeSection =
        rect.height > window.innerHeight * 0.5 ||
        selector === ".manpower-form-section" ||
        selector === ".manpower-filters-section" ||
        selector === ".manpower-records-table";

      if (isLargeSection) {
        // Large containers: scroll so the TOP of the section is just below the navbar
        // This prevents overshooting and keeps context visible
        const scrollTop = window.scrollY + rect.top - 120;
        window.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      } else {
        // Small elements: center them cleanly
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }

      // Wait for smooth scroll to settle before Joyride repositions tooltip + arrow
      await new Promise((resolve) => setTimeout(resolve, 550));
    },
    [isTargetComfortablyVisible],
  );

  const handleJoyrideEvent = useCallback(
    (data: EventData) => {
      const { status, type, index, action } = data as any;

      const isEndState =
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED ||
        action === ACTIONS.CLOSE ||
        action === ACTIONS.STOP;

      if (isEndState) {
        finishTour();
        return;
      }

      if (type === EVENTS.TOUR_END) {
        finishTour();
        return;
      }

      if (
        type === EVENTS.STEP_AFTER &&
        index >= MANPOWER_TOUR_STEPS.length - 1
      ) {
        finishTour();
        return;
      }

      // Deterministic NEXT with intelligent auto-scroll (fixes off-screen targets)
      if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
        const nextIdx = Math.min(index + 1, MANPOWER_TOUR_STEPS.length - 1);
        if (isProcessingStepRef.current) return;

        isProcessingStepRef.current = true;

        const nextTarget = MANPOWER_TOUR_STEPS[nextIdx]?.target as
          | string
          | undefined;

        // Fire-and-forget async scroll + advance (Joyride expects handler to return fast)
        (async () => {
          try {
            if (nextTarget && nextTarget !== "body") {
              await scrollTargetIntoView(nextTarget);
            }

            // Only after scroll settles (or if already visible) do we advance
            // This guarantees the target is in view before Joyride shows the tooltip
            setStepIndex(nextIdx);
            setShowStepRecoveryBanner(false);
          } catch (e) {
            // Fallback: still advance so tour doesn't get stuck
            setStepIndex(nextIdx);
          } finally {
            isProcessingStepRef.current = false;
          }
        })();
      }

      if (type === EVENTS.STEP_AFTER && action === ACTIONS.PREV) {
        const prevIdx = Math.max(index - 1, 0);
        const prevTarget = MANPOWER_TOUR_STEPS[prevIdx]?.target as
          | string
          | undefined;

        if (prevTarget && prevTarget !== "body") {
          // Scroll previous target into view so the popup doesn't appear disconnected
          scrollTargetIntoView(prevTarget); // fire-and-forget is acceptable for PREV
        }

        setStepIndex(prevIdx);
        setShowStepRecoveryBanner(false);
        isProcessingStepRef.current = false;
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        const targetSelector = MANPOWER_TOUR_STEPS[index]?.target as string;
        if (targetSelector && !isProcessingStepRef.current) {
          isProcessingStepRef.current = true;

          (async () => {
            try {
              if (targetSelector !== "body") {
                await scrollTargetIntoView(targetSelector);
              }
              const el = document.querySelector(targetSelector);
              if (el) {
                setStepIndex(index); // re-show after scroll
              } else {
                setShowStepRecoveryBanner(true);
              }
            } finally {
              isProcessingStepRef.current = false;
            }
          })();
        }
      }
    },
    [finishTour, scrollTargetIntoView],
  );

  // Exact same config objects as Dashboard for pixel-perfect visual match
  const joyrideConfigOptions = useMemo(
    () => ({
      primaryColor: "#4f46e5",
      backgroundColor: "#ffffff",
      textColor: "#1e293b",
      arrowColor: "#4f46e5",
      zIndex: 100010,
      showProgress: true,
      buttons: ["back", "close", "primary", "skip"] as [
        "back",
        "close",
        "primary",
        "skip",
      ],
      spotlightPadding: 8,
      spotlightRadius: 16,
      blockTargetInteraction: false,
      overlayClickAction: false as false,
      skipScroll: true,
      offset: 16,
    }),
    [],
  );

  const joyrideFloatingOptions = useMemo(
    () => ({
      strategy: "fixed" as const,
      autoUpdate: {
        ancestorScroll: true,
        elementResize: true,
        animationFrame: true,
        layoutShift: true,
      },
      flipOptions: { padding: 16 },
      shiftOptions: { padding: 16 },
    }),
    [],
  );

  const joyrideStyles = useMemo(
    () => ({
      tooltip: {
        borderRadius: "16px",
        padding: "18px",
        boxShadow:
          "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        maxWidth: "min(420px, calc(100vw - 40px))",
        fontSize: "13.5px",
        lineHeight: "1.5",
      },
      tooltipTitle: {
        fontSize: "15px",
        fontWeight: 800,
        marginBottom: "6px",
      },
      tooltipContent: {
        fontSize: "13px",
      },
      buttonNext: { fontSize: "12px", padding: "6px 14px" },
      buttonBack: { fontSize: "12px" },
      buttonSkip: { fontSize: "11px" },
    }),
    [],
  );

  // Auto-start disabled — tour only starts when user clicks "Start Tour" button

  // Stable CSS injection for spotlight consistency (Dashboard pattern)
  useEffect(() => {
    if (!tourActive) return;
    const styleId = "joyride-manpower-stable-styles";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      .manpower-total-planned-card,
      .manpower-total-actual-card,
      .manpower-net-difference-card,
      .manpower-form-section,
      .manpower-records-table {
        scroll-margin-top: 80px;
        scroll-margin-bottom: 80px;
      }
    `;
    return () => {
      const existing = document.getElementById(styleId);
      if (existing?.parentNode) existing.parentNode.removeChild(existing);
    };
  }, [tourActive]);

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-5 md:p-6 animate-in fade-in duration-500">
      {/* Toasts */}
      <div className="fixed top-4 right-3 left-3 z-50 flex flex-col items-end gap-2 sm:left-auto sm:max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-xl shadow-xl text-sm font-bold flex items-center gap-2 ${
              toast.type === "success"
                ? isDarkTheme
                  ? "bg-emerald-500/90 text-white"
                  : "bg-emerald-600 text-white"
                : isDarkTheme
                  ? "bg-rose-500/90 text-white"
                  : "bg-rose-600 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <Icons.Approve size={16} />
            ) : (
              <Icons.AlertCircle size={16} />
            )}
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div ref={heroRef} className="manpower-header min-w-0 flex-1">
          <h2
            className={`text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-[2.5rem] ${
              isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
            }`}
          >
            Monthly Manpower Management
          </h2>
          <p
            className={`mt-1.5 text-sm font-medium sm:mt-2 sm:text-base ${
              isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
            }`}
          >
            Team Leader • Add, view, edit and delete project manpower records
          </p>
        </div>
        <div
          className={`grid w-full gap-2 lg:w-auto lg:min-w-[28rem] ${
            isTeamLead
              ? 'grid-cols-1 min-[420px]:grid-cols-3'
              : 'grid-cols-1 min-[420px]:grid-cols-2'
          }`}
        >
          <button onClick={() => void exportExcel()} className={`${secondaryBtnClass} w-full`}>
            <Icons.Download size={16} /> Export Excel
          </button>
          <button onClick={fetchRecords} disabled={isLoading} className={`${secondaryBtnClass} w-full`}>
            <Icons.History size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>

          {isTeamLead && (
            <button
              onClick={() => {
                endedRef.current = false;
                setStepIndex(0);
                setTourActive(true);
                setShowStepRecoveryBanner(false);
                setRun(true);
              }}
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 ${
                isDarkTheme
                  ? 'bg-indigo-600 hover:bg-indigo-500'
                  : 'bg-gradient-to-r from-[#2563EB] to-[#4F46E5] hover:from-[#1d4ed8] hover:to-[#4338ca]'
              }`}
            >
              <Icons.Help size={16} /> Start Tour
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3 sm:gap-4 lg:gap-5">
  <div
    ref={totalPlannedRef}
    className={`${cardSurface} manpower-total-planned-card flex min-h-[88px] items-center justify-between gap-3 rounded-2xl p-4 transition-all hover:shadow-lg sm:min-h-[96px] sm:p-5 min-[400px]:col-span-1 lg:col-span-1`}
  >
    <div className="min-w-0 flex-1">
      <div className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${isDarkTheme ? themeClasses.textSecondary : "text-[#64748B]"}`}>
        Total Planned
      </div>
      <div className={`mt-1 text-2xl font-bold leading-none tabular-nums sm:text-3xl lg:text-4xl ${isDarkTheme ? themeClasses.textPrimary : "text-[#2563EB]"}`}>
        {totalPlanned.toLocaleString()}
      </div>
    </div>
    <div className={`shrink-0 rounded-xl p-2.5 sm:p-3 ${isDarkTheme ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-[#2563EB]"}`}>
      <Icons.User className="h-5 w-5 sm:h-6 sm:w-6" />
    </div>
  </div>

  {/* Total Actual */}
  <div
    ref={totalActualRef}
    className={`${cardSurface} manpower-total-actual-card flex min-h-[88px] items-center justify-between gap-3 rounded-2xl p-4 transition-all hover:shadow-lg sm:min-h-[96px] sm:p-5`}
  >
    <div className="min-w-0 flex-1">
      <div className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${isDarkTheme ? themeClasses.textSecondary : "text-[#64748B]"}`}>
        Total Actual
      </div>
      <div className={`mt-1 text-2xl font-bold leading-none tabular-nums sm:text-3xl lg:text-4xl ${isDarkTheme ? themeClasses.textPrimary : "text-[#10B981]"}`}>
        {totalActual.toLocaleString()}
      </div>
    </div>
    <div className={`shrink-0 rounded-xl p-2.5 sm:p-3 ${isDarkTheme ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-[#10B981]"}`}>
      <Icons.Activity className="h-5 w-5 sm:h-6 sm:w-6" />
    </div>
  </div>

  {/* Net Difference */}
  <div
    ref={netDiffRef}
    className={`${cardSurface} manpower-net-difference-card flex min-h-[88px] items-center justify-between gap-3 rounded-2xl p-4 transition-all hover:shadow-lg sm:min-h-[96px] sm:p-5 min-[400px]:col-span-2 lg:col-span-1`}
  >
    <div className="min-w-0 flex-1">
      <div className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${isDarkTheme ? themeClasses.textSecondary : "text-[#64748B]"}`}>
        Net Difference
      </div>
      <div className={`mt-1 text-2xl font-bold leading-none tabular-nums sm:text-3xl lg:text-4xl ${
        totalDiff > 0
          ? isDarkTheme ? "text-emerald-400" : "text-[#10B981]"
          : totalDiff < 0
            ? isDarkTheme ? "text-rose-400" : "text-[#EF4444]"
            : isDarkTheme ? themeClasses.textPrimary : "text-[#64748B]"
      }`}>
        {totalDiff >= 0 ? "+" : ""}{totalDiff.toLocaleString()}
      </div>
    </div>
    <div className={`shrink-0 rounded-xl p-2.5 sm:p-3 ${
      totalDiff > 0
        ? isDarkTheme ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-[#10B981]"
        : totalDiff < 0
          ? isDarkTheme ? "bg-rose-500/10 text-rose-400" : "bg-rose-50 text-[#EF4444]"
          : isDarkTheme ? "bg-slate-500/10 text-slate-400" : "bg-slate-50 text-[#64748B]"
    }`}>
      <Icons.Performance className="h-5 w-5 sm:h-6 sm:w-6" />
    </div>
  </div>

</div>

      {/* Add / Edit Form */}
      <div className={`${cardSurface} manpower-form-section overflow-hidden rounded-2xl`}>
        <div
          className={`flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5 ${
            isDarkTheme ? `${themeClasses.border} ${themeClasses.bgSecondary}` : 'border-[#E2E8F0] bg-slate-50/80'
          }`}
        >
          <div className="min-w-0">
            <h3
              className={`text-xl font-bold sm:text-2xl ${
                isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
              }`}
            >
              {editingId ? 'Edit Manpower Record' : 'Add New Manpower Record'}
            </h3>
            <p
              className={`mt-1 text-sm font-medium ${
                isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
              }`}
            >
              Project-wise monthly deployment
            </p>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className={`${secondaryBtnClass} w-full shrink-0 sm:w-auto`}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6">
          {/* Row 1: Project + Month + Year */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-6">
            {/* Project */}
            <div ref={projectNameRef} className="manpower-project-name-field">
              <label className={labelClass}>Project Name *</label>
              {isTeamLead && assignedProjectNames.length > 0 ? (
                <select
                  value={formData.project_name}
                  onChange={(e) => handleInputChange('project_name', e.target.value)}
                  className={inputClass}
                  required
                  disabled={Boolean(singleAssignedProjectName)}
                >
                  {assignedProjectNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    type="text"
                    list="project-list"
                    value={formData.project_name}
                    onChange={(e) => handleInputChange('project_name', e.target.value)}
                    placeholder="e.g. Thane Project"
                    className={inputClass}
                    required
                  />
                  <datalist id="project-list">
                    {projectOptions.map((p, i) => (
                      <option key={i} value={p} />
                    ))}
                  </datalist>
                </>
              )}
            </div>

            {/* Month */}
            <div ref={monthRef} className="manpower-month-field">
              <label className={labelClass}>Month *</label>
              <select
                value={formData.month}
                onChange={(e) => handleInputChange('month', e.target.value)}
                className={inputClass}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div ref={yearRef} className="manpower-year-field">
              <label className={labelClass}>Year *</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => handleInputChange("year", e.target.value)}
                min="2020"
                max="2035"
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Row 2: Planned + Actual + Difference */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-6">
            {/* Planned */}
            <div ref={plannedManpowerRef} className="manpower-planned-field">
              <label className={`${labelClass} ${!isDarkTheme ? 'text-[#2563EB]' : ''}`}>
                Monthly Planned Manpower *
              </label>
              <input
                type="number"
                min="0"
                value={formData.planned_manpower}
                onChange={(e) => handleInputChange('planned_manpower', e.target.value)}
                className={`${inputClass} ${!isDarkTheme ? 'focus:border-[#2563EB] focus:ring-[#2563EB]/20' : ''}`}
                required
              />
            </div>

            {/* Actual */}
            <div ref={actualManpowerRef} className="manpower-actual-field">
              <label className={`${labelClass} ${!isDarkTheme ? 'text-[#10B981]' : ''}`}>
                Actual Manpower *
              </label>
              <input
                type="number"
                min="0"
                value={formData.actual_manpower}
                onChange={(e) => handleInputChange('actual_manpower', e.target.value)}
                className={`${inputClass} ${!isDarkTheme ? 'focus:border-[#10B981] focus:ring-emerald-500/20' : ''}`}
                required
              />
            </div>

            {/* Live Difference */}
            <div ref={differenceRef} className="manpower-difference-field">
              <label className={labelClass}>Difference (Actual - Planned)</label>
              <div
                className={`h-12 px-4 flex items-center rounded-xl border text-xl font-bold ${diffBgClass} ${diffValueColor}`}
              >
                <span>
                  {difference >= 0 ? '+' : ''}
                  {difference}
                </span>
                <span
                  className={`ml-2 text-sm font-medium ${
                    isDarkTheme ? 'opacity-70' : 'text-[#64748B]'
                  }`}
                >
                  manpower
                </span>
              </div>
            </div>
          </div>

            {/* Remarks */}
            <div ref={remarksRef} className="manpower-remarks-field">
              <label className={labelClass}>Remarks (Optional)</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                rows={2}
                placeholder="Any notes about deployment..."
                className={`w-full min-h-[88px] px-4 py-3 rounded-xl text-base font-medium leading-relaxed outline-none border resize-y transition-colors focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${
                  isDarkTheme
                    ? `${themeClasses.input} ${themeClasses.border}`
                    : 'border-[#E2E8F0] bg-white text-[#1E293B] placeholder:text-[15px] placeholder:font-normal placeholder:text-[#94A3B8]'
                }`}
              />
            </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              ref={saveBtnRef}
              type="submit"
              disabled={isSubmitting}
              className={`manpower-save-btn flex-1 inline-flex h-14 items-center justify-center gap-2 rounded-[14px] text-base font-semibold text-white transition-all active:scale-[0.985] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 ${
                isDarkTheme
                  ? themeClasses.buttonPrimary
                  : 'bg-gradient-to-r from-[#2563EB] to-[#4F46E5] shadow-lg shadow-indigo-500/20 hover:from-[#1d4ed8] hover:to-[#4338ca]'
              }`}
            >
              {isSubmitting ? (
                <Icons.History className="animate-spin" size={18} />
              ) : editingId ? (
                <Icons.Edit size={18} />
              ) : (
                <Icons.Add size={18} />
              )}
              {editingId ? 'Update Record' : 'Save Record'}
            </button>
            <button ref={resetBtnRef} type="button" onClick={resetForm} className={`${secondaryBtnClass} sm:min-w-[140px]`}>
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div
        className={`${cardSurface} manpower-filters-section rounded-2xl p-4`}
      >
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
            isTeamLead && singleAssignedProjectName
              ? 'lg:grid-cols-3'
              : 'lg:grid-cols-4 lg:items-end'
          }`}
        >
          {!(isTeamLead && singleAssignedProjectName) && (
            <div className="min-w-0 sm:col-span-2 lg:col-span-2">
              <label className={labelClass}>Search Project</label>
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type project name..."
                  className={`${inputClass} pl-10`}
                />
                <Icons.Search
                  size={16}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                    isDarkTheme ? themeClasses.textMuted : 'text-[#94A3B8]'
                  }`}
                />
              </div>
            </div>
          )}
          <div className="min-w-0">
            <label className={labelClass}>Month</label>
            <select
              ref={monthFilterRef}
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Months</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className={labelClass}>Year</label>
            <select
              ref={yearFilterRef}
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className={inputClass}
            >
              <option value="All">All Years</option>
              {Array.from({ length: 8 }, (_, i) => (2026 - i).toString()).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              ref={clearFiltersRef}
              onClick={() => {
                setSearchTerm('');
                setFilterMonth('All');
                setFilterYear('All');
              }}
              className={`${secondaryBtnClass} w-full sm:w-auto`}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className={`overflow-hidden rounded-[20px] ${
          isDarkTheme
            ? `${themeClasses.glassCard} ${themeClasses.border}`
            : 'border border-[#E2E8F0] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
        }`}
      >
        <div
          className={`flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
            isDarkTheme ? `${themeClasses.border} ${themeClasses.bgSecondary}` : 'border-[#E2E8F0] bg-white'
          }`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <h3
              className={`text-xl font-bold sm:text-2xl ${
                isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
              }`}
            >
              Manpower Records
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                isDarkTheme
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'bg-[#EEF2FF] text-[#4F46E5]'
              }`}
            >
              {filteredRecords.length} Record{filteredRecords.length === 1 ? '' : 's'}
            </span>
            {records.length !== filteredRecords.length && (
              <span
                className={`text-xs font-medium ${
                  isDarkTheme ? themeClasses.textMuted : 'text-[#64748B]'
                }`}
              >
                ({records.length} total)
              </span>
            )}
          </div>
          {isLoading && (
            <div
              className={`flex items-center gap-2 text-sm font-medium ${
                isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
              }`}
            >
              <Icons.History className="animate-spin" size={14} /> Loading...
            </div>
          )}
        </div>

        {error && <div className="px-6 py-3 text-sm font-semibold text-rose-500">{error}</div>}

        {filteredRecords.length === 0 && !isLoading ? (
          <div className="px-4 py-12 text-center sm:p-16">
            <Icons.User size={48} className={`mx-auto mb-4 ${themeClasses.textMuted}`} />
            <p className={`text-lg font-bold ${themeClasses.textPrimary}`}>No manpower records found</p>
            <p className={`mt-1 text-sm ${themeClasses.textSecondary}`}>
              Adjust filters or add your first record above.
            </p>
          </div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="space-y-3 p-3 md:hidden">
            {filteredRecords.map((rec, index) => {
              const diff = (rec.actual_manpower || 0) - (rec.planned_manpower || 0);
              return (
                <div
                  key={rec.id}
                  className={`rounded-2xl border p-4 ${
                    isDarkTheme ? `${themeClasses.border} bg-white/[0.03]` : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${themeClasses.textMuted}`}>
                        #{index + 1} · {rec.month_year}
                      </p>
                      <p className={`mt-1 text-base font-bold leading-snug ${themeClasses.textPrimary}`}>
                        {rec.project_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(rec)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          isDarkTheme ? 'bg-white/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                        }`}
                        aria-label="Edit record"
                      >
                        <Icons.Edit size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirm({
                            id: rec.id,
                            project: rec.project_name,
                            monthYear: rec.month_year,
                          })
                        }
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          isDarkTheme ? 'bg-white/10 text-rose-400' : 'bg-rose-50 text-rose-600'
                        }`}
                        aria-label="Delete record"
                      >
                        <Icons.Reject size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className={`rounded-xl px-3 py-2 ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] font-semibold uppercase ${themeClasses.textMuted}`}>Planned</p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums">{rec.planned_manpower}</p>
                    </div>
                    <div className={`rounded-xl px-3 py-2 ${isDarkTheme ? 'bg-white/5' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] font-semibold uppercase ${themeClasses.textMuted}`}>Actual</p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums">{rec.actual_manpower}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <ManpowerDiffChip diff={diff} isDarkTheme={isDarkTheme} />
                    <ManpowerEfficiencyCell efficiency={rec.manpower_efficiency} isDarkTheme={isDarkTheme} />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            ref={recordsTableRef}
            className={`manpower-records-table hidden max-h-[min(70vh,720px)] overflow-auto md:block ${
              isDarkTheme ? '' : 'bg-white'
            }`}
          >
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead className="sticky top-0 z-20">
                <tr
                  className={`border-b ${
                    isDarkTheme
                      ? `${themeClasses.bgSecondary} ${themeClasses.border}`
                      : 'border-[#E2E8F0] bg-[#F8FAFC]'
                  }`}
                >
                  {TABLE_HEADERS.map((h) => {
                    const isSr = h === 'Sr';
                    const isProject = h === 'Project';
                    const isActions = h === 'Actions';
                    const isNumeric = h === 'Planned' || h === 'Actual' || h === 'Difference';
                    const stickyHeader = isSr
                      ? 'sticky left-0 z-30 min-w-[48px]'
                      : isProject
                        ? 'sticky left-12 z-30 min-w-[200px]'
                        : '';

                    return (
                      <th
                        key={h}
                        scope="col"
                        className={`px-4 py-2.5 text-xs font-bold uppercase tracking-[1px] ${
                          isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
                        } ${stickyHeader} ${
                          isDarkTheme
                            ? isSr || isProject
                              ? themeClasses.bgSecondary
                              : ''
                            : isSr || isProject
                              ? 'bg-[#F8FAFC]'
                              : ''
                        } ${isActions ? 'text-right' : ''} ${isNumeric || h === 'Efficiency' ? 'text-center' : ''}`}
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec, index) => {
                  const diff = (rec.actual_manpower || 0) - (rec.planned_manpower || 0);
                  const isEven = index % 2 === 1;
                  const rowSurface = isDarkTheme
                    ? isEven
                      ? 'bg-white/[0.03]'
                      : 'bg-transparent'
                    : isEven
                      ? 'bg-[#FAFBFC]'
                      : 'bg-white';
                  const stickySurface = isDarkTheme
                    ? isEven
                      ? 'bg-slate-900/95 group-hover:bg-slate-800/90'
                      : 'bg-slate-950/95 group-hover:bg-slate-800/90'
                    : isEven
                      ? 'bg-[#FAFBFC] group-hover:bg-[#F8FAFC]'
                      : 'bg-white group-hover:bg-[#F8FAFC]';

                  return (
                    <tr
                      key={rec.id}
                      className={`group border-b transition-colors duration-200 ease-in-out ${
                        isDarkTheme
                          ? 'border-white/5 hover:bg-white/[0.06]'
                          : 'border-[#F1F5F9] hover:bg-[#F8FAFC]'
                      } ${rowSurface}`}
                    >
                      <td
                        className={`sticky left-0 z-10 h-[60px] px-4 align-middle text-sm font-semibold tabular-nums ${
                          isDarkTheme ? 'text-slate-500' : 'text-[#64748B]'
                        } ${stickySurface}`}
                      >
                        {index + 1}
                      </td>
                      <td
                        className={`sticky left-12 z-10 h-[60px] min-w-[200px] max-w-[280px] px-4 align-middle ${stickySurface}`}
                      >
                        <span
                          className={`block truncate text-[15px] font-semibold ${
                            isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
                          }`}
                          title={rec.project_name}
                        >
                          {rec.project_name}
                        </span>
                      </td>
                      <td
                        className={`h-[60px] px-4 align-middle text-sm font-medium ${
                          isDarkTheme ? themeClasses.textSecondary : 'text-[#475569]'
                        }`}
                      >
                        {rec.month_year}
                      </td>
                      <td
                        className={`h-[60px] px-4 text-center align-middle text-base font-bold tabular-nums ${
                          isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
                        }`}
                      >
                        {rec.planned_manpower}
                      </td>
                      <td
                        className={`h-[60px] px-4 text-center align-middle text-base font-bold tabular-nums ${
                          isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
                        }`}
                      >
                        {rec.actual_manpower}
                      </td>
                      <td className="h-[60px] px-4 text-center align-middle">
                        <ManpowerDiffChip diff={diff} isDarkTheme={isDarkTheme} />
                      </td>
                      <td className="h-[60px] px-4 text-center align-middle">
                        <ManpowerEfficiencyCell
                          efficiency={rec.manpower_efficiency}
                          isDarkTheme={isDarkTheme}
                        />
                      </td>
                      <td className="h-[60px] px-4 text-right align-middle">
                        <div
                          className={`inline-flex items-center gap-0.5 rounded-lg border p-0.5 ${
                            isDarkTheme
                              ? `${themeClasses.border} bg-slate-800/50`
                              : 'border-[#E2E8F0] bg-white'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleEdit(rec)}
                            title="Edit record"
                            aria-label="Edit record"
                            className={`manpower-edit-action flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-200 ${
                              isDarkTheme
                                ? 'text-blue-400 hover:bg-blue-500/20'
                                : 'text-[#2563EB] hover:bg-[#DBEAFE]'
                            }`}
                          >
                            <Icons.Edit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                id: rec.id,
                                project: rec.project_name,
                                monthYear: rec.month_year,
                              })
                            }
                            title="Delete record"
                            aria-label="Delete record"
                            className={`manpower-delete-action flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-200 ${
                              isDarkTheme
                                ? 'text-rose-400 hover:bg-rose-500/20'
                                : 'text-[#DC2626] hover:bg-[#FEE2E2]'
                            }`}
                          >
                            <Icons.Close size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div
            className={`${themeClasses.glassCard} ${themeClasses.border} w-full max-w-md rounded-2xl p-5 sm:rounded-3xl sm:p-8`}
          >
            <div className="mb-4 flex items-start gap-3 sm:items-center sm:gap-4">
              <div className="shrink-0 rounded-2xl bg-rose-500/10 p-3 text-rose-500">
                <Icons.AlertCircle size={28} />
              </div>
              <div className="min-w-0">
                <h4
                  className={`text-lg font-black sm:text-xl ${themeClasses.textPrimary}`}
                >
                  Delete Record?
                </h4>
                <p className={`mt-1 text-sm ${themeClasses.textSecondary}`}>
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <p className={`mb-6 text-sm font-bold break-words ${themeClasses.textPrimary}`}>
              {deleteConfirm.project} — {deleteConfirm.monthYear}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 py-3 rounded-2xl font-black uppercase text-sm border ${themeClasses.border} ${themeClasses.buttonSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 py-3 rounded-2xl font-black uppercase text-sm bg-rose-600 hover:bg-rose-700 text-white"
              >
                DELETE FOREVER
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`text-center text-xs font-medium pt-2 ${
          isDarkTheme ? themeClasses.textMuted : 'text-[#64748B]'
        }`}
      >
        Data synced with backend • /api/manpower/
      </div>

      {/* ========== MANPOWER TOUR - EXACT DASHBOARD ARCHITECTURE (react-joyride) ========== */}
      <Joyride
        key={run ? "running" : "stopped"}
        steps={MANPOWER_TOUR_STEPS}
        run={run}
        stepIndex={stepIndex}
        continuous={true}
        scrollToFirstStep={false}
        onEvent={handleJoyrideEvent}
        styles={joyrideStyles}
        options={joyrideConfigOptions}
        floatingOptions={joyrideFloatingOptions}
        locale={{
          back: "Back",
          close: "Close",
          last: "Finish",
          next: "Next",
          skip: "Skip",
        }}
      />

      {/* Safe recovery banner (exact Dashboard pattern) */}
      {showStepRecoveryBanner && (
        <div
          className="fixed bottom-8 left-1/2 z-[100020] -translate-x-1/2 px-6 py-3 rounded-2xl border shadow-2xl text-sm font-bold flex items-center gap-3 bg-white/95 border-indigo-200 text-slate-800"
          style={{
            boxShadow:
              "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Waiting for next element to finish rendering...
          </div>
          <button
            onClick={() => {
              setShowStepRecoveryBanner(false);
              // Re-trigger by advancing the current step index (user can also click Next in the tooltip)
              setStepIndex((s) => s);
            }}
            className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      {/* ========== END MANPOWER TOUR ========== */}
    </div>
  );
};

export default ManpowerManagement;
