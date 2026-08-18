import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icons } from "./Icons";
import { WorkspaceLoadingPanel } from "./WorkspaceStatusPanels";
import { MOCK_DPRS } from "../services/mockData";
import { User, UserRole, Project } from "../types";
import DPRSubmissionForm from "./DPRSubmissionForm";
import { useTheme, getThemeClasses } from "../utils/theme";
import { monthlyScopeApi } from "../services/api";
import DprReviewKpiCards from "./dprReview/DprReviewKpiCards";
import { isPmcHeadEquivalent } from "../utils/pmcRoleAccess";
import TutorialVideosPanel from "./tutorialVideos/TutorialVideosPanel";
import TutorialWatchButton from "./tutorialVideos/TutorialWatchButton";
import {
    countActivityStats,
    formatDprDateTime,
    getProgressTone,
    getStatusFieldTone,
    statusCardClass,
    toSafeDprNumber,
} from "../utils/dprReviewDisplay";
import {
    getDprSummaryCountColors,
    getDprTy,
    formatActivityStatusLabel,
} from "../utils/dprReviewTypography";

// Types for the new DPR system
interface DPRActivity {
    id: number;
    scope?: any; // To handle nested scope data
    category_name?: string;
    subcategory_name?: string;
    scope_description?: string;
    description?: string;
    unit?: string;
    planned_quantity?: number | string;
    executed_quantity?: number | string;
    remaining_quantity?: number | string;
    cumulative_quantity?: number | string;
    previous_cumulative?: number | string;
    /** Backend progress percent (preferred) */
    progress?: number | string;
    progress_percentage?: number | string;
    section?: string;
    location?: string;
    status?: string;
    next_day_planned_work?: string;
    remarks?: string;
    target_achieved?: number | string | null;
}

interface DailyProgressReport {
    id: number;
    project?: number | string;
    project_name: string;
    job_no?: string;
    report_date: string;
    unresolved_issues?: string;
    pending_letters?: string;
    quality_status?: string;
    next_day_incident?: string;
    bill_status?: string;
    gfc_status?: string;
    issued_by?: string;
    designation?: string;
    created_at?: string;
    updated_at?: string;
    activities: DPRActivity[];
    status?: string;
    rejection_reason?: string;
    rejected_by_username?: string;
}

interface DPRReviewDashboardProps {
    api: any;
    user: User | null;
    projects?: Project[];
    onApprove?: (id: string) => void;
    onReject?: (id: string, reason: string) => void;
}

function normalizeProjectKey(name: string): string {
    return name.trim().toLowerCase();
}

function reportIdKey(value: unknown): string {
    if (value == null || value === '') return '';
    return String(value);
}

function unwrapCreatedDpr(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object') return null;
    const obj = payload as Record<string, unknown>;
    if (reportIdKey(obj.id)) return obj;
    const nested = [obj.data, obj.record, obj.dpr, obj.result].find(
        (item) => item && typeof item === 'object' && !Array.isArray(item),
    ) as Record<string, unknown> | undefined;
    if (nested && reportIdKey(nested.id)) return nested;
    return null;
}

function isTeamLeadAssignedToProject(project: Project, user: User): boolean {
    if (!project.teamLeadId) return false;
    return (
        project.teamLeadId === user.id ||
        (!!user.username && project.teamLeadId === user.username)
    );
}

const DPRReviewDashboard: React.FC<DPRReviewDashboardProps> = ({
    api,
    user,
    projects = [],
    onApprove,
    onReject
}) => {
    const { isDarkTheme } = useTheme();
    const themeClasses = getThemeClasses(isDarkTheme);
    const dprTy = useMemo(() => getDprTy(isDarkTheme), [isDarkTheme]);
    const summaryColors = useMemo(() => getDprSummaryCountColors(isDarkTheme), [isDarkTheme]);
    const [reports, setReports] = useState<DailyProgressReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedReport, setSelectedReport] = useState<DailyProgressReport | null>(null);
    const [filters, setFilters] = useState({
        project_name: "",
        date: "",
    });
    const [rejectReason, setRejectReason] = useState("");
    const [reviewComments, setReviewComments] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectModalMode, setRejectModalMode] = useState<"reject" | "revision">("reject");
    const [showSubmissionForm, setShowSubmissionForm] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, string>>({});

    const isTeamLead = user?.role === UserRole.TEAM_LEAD;

    const accessibleProjects = useMemo(() => {
        if (!isTeamLead || !user) return projects;
        return projects.filter((project) => isTeamLeadAssignedToProject(project, user));
    }, [projects, isTeamLead, user]);

    const assignedProjectNames = useMemo(
        () =>
            accessibleProjects
                .map((project) => project.title?.trim())
                .filter((title): title is string => Boolean(title)),
        [accessibleProjects],
    );

    const singleAssignedProjectName =
        accessibleProjects.length === 1
            ? accessibleProjects[0]?.title?.trim() || ""
            : "";

    const matchesAssignedProject = useCallback(
        (projectName: string) => {
            if (!isTeamLead) return true;
            if (assignedProjectNames.length === 0) return false;
            const key = normalizeProjectKey(projectName);
            return assignedProjectNames.some(
                (name) => normalizeProjectKey(name) === key,
            );
        },
        [isTeamLead, assignedProjectNames],
    );

    const effectiveProjectName = useMemo(() => {
        const selected = filters.project_name.trim();
        if (selected) return selected;
        if (isTeamLead) {
            return accessibleProjects[0]?.title?.trim() || "";
        }
        return "";
    }, [filters.project_name, isTeamLead, accessibleProjects]);

    useEffect(() => {
        if (!isTeamLead || filters.project_name.trim() || accessibleProjects.length === 0) {
            return;
        }
        const defaultName = accessibleProjects[0]?.title?.trim() || "";
        if (defaultName) {
            setFilters((prev) => ({ ...prev, project_name: defaultName }));
        }
    }, [isTeamLead, accessibleProjects, filters.project_name]);

    const activityStats = useMemo(
        () => (selectedReport?.activities?.length ? countActivityStats(selectedReport.activities) : null),
        [selectedReport?.activities, selectedReport?.id]
    );

    const projectOptions = useMemo(() => {
        const names = new Set<string>();
        const sourceProjects = isTeamLead ? accessibleProjects : projects;
        for (const project of sourceProjects) {
            const title = project.title?.trim();
            if (title) names.add(title);
        }
        if (!isTeamLead) {
            for (const report of reports) {
                const name = report.project_name?.trim();
                if (name) names.add(name);
            }
        }
        const active = filters.project_name?.trim();
        if (active) names.add(active);
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [isTeamLead, accessibleProjects, projects, reports, filters.project_name]);

    const toSafeNumber = toSafeDprNumber;

    const normalizeReport = (report: any): DailyProgressReport => {
        const normalizedActivities = Array.isArray(report?.activities)
            ? report.activities.map((activity: any) => {
                const scope = activity?.scope && typeof activity.scope === 'object' ? activity.scope : null;
                const progressRaw =
                    activity?.progress ??
                    activity?.progress_percentage ??
                    scope?.progress ??
                    scope?.progress_percentage;
                return {
                    ...activity,
                    executed_quantity: toSafeNumber(activity?.executed_quantity),
                    planned_quantity: toSafeNumber(
                        activity?.planned_quantity ?? scope?.planned_quantity,
                    ),
                    remaining_quantity: toSafeNumber(
                        activity?.remaining_quantity ?? scope?.remaining_quantity,
                    ),
                    cumulative_quantity: toSafeNumber(
                        activity?.cumulative_quantity ??
                            activity?.previous_cumulative ??
                            scope?.cumulative_quantity ??
                            scope?.previous_cumulative,
                    ),
                    // Keep raw backend progress; do not derive from executed/planned
                    progress: progressRaw == null || progressRaw === '' ? undefined : toSafeNumber(progressRaw),
                    progress_percentage:
                        progressRaw == null || progressRaw === ''
                            ? undefined
                            : toSafeNumber(progressRaw),
                    target_achieved: toSafeNumber(activity?.target_achieved),
                };
            })
            : [];

        const projectId = report.project || report.projectId || report.project_id;

        return {
            ...report,
            project: projectId,
            activities: normalizedActivities,
        };
    };

    const ActivityRow = ({
        activity,
        reportScopes,
        themeClasses,
        isDarkTheme,
    }: {
        activity: DPRActivity;
        reportScopes: any[];
        themeClasses: any;
        isDarkTheme: boolean;
    }) => {
        const [rowExpanded, setRowExpanded] = useState(false);

        const scopeId = (activity as any).scope_id || (activity as any).scope;
        const scopeDetail =
            typeof scopeId === "object" ? scopeId : reportScopes.find((s) => String(s.id) === String(scopeId));

        const plannedVal = toSafeNumber(activity.planned_quantity || scopeDetail?.planned_quantity);
        const executedVal = toSafeNumber(activity.executed_quantity);
        // Backend owns progress — never recompute as (executed/planned)*100
        const progressFromApi =
            (activity as any).progress ??
            activity.progress_percentage ??
            scopeDetail?.progress ??
            scopeDetail?.progress_percentage;
        const progressVal =
            progressFromApi == null || progressFromApi === ''
                ? 0
                : toSafeNumber(progressFromApi);
        const cumulativeVal = toSafeNumber(
            (activity as any).cumulative_quantity ??
                (activity as any).previous_cumulative ??
                scopeDetail?.cumulative_quantity ??
                scopeDetail?.previous_cumulative,
        );
        const progressTone = getProgressTone(progressVal, isDarkTheme);

        const data = {
            category: activity.category_name || scopeDetail?.category_name || "N/A",
            subcategory: activity.subcategory_name || scopeDetail?.subcategory_name || "N/A",
            scope:
                activity.scope_description ||
                scopeDetail?.description ||
                activity.description ||
                (scopeId ? `Scope #${typeof scopeId === "object" ? scopeId.id : scopeId}` : "N/A"),
            unit: activity.unit || scopeDetail?.unit || "N/A",
            executed: executedVal,
            planned: plannedVal,
            cumulative: cumulativeVal,
            progress: progressVal,
            status: activity.status || scopeDetail?.status || "Pending",
            remarks: activity.remarks || "—",
            nextDay: activity.next_day_planned_work || "—",
            siteNotes: [activity.section, activity.location].filter(Boolean).join(" · ") || scopeDetail?.section || "—",
            engineerComments: activity.remarks || "—",
            description: scopeDetail?.description || activity.scope_description || "—",
        };

        const getStatusColor = (status: string) => {
            const s = status.toLowerCase();
            if (s.includes("delay")) {
                return isDarkTheme
                    ? "border-rose-800 bg-rose-950 text-rose-300"
                    : "border-rose-200 bg-rose-50 text-rose-800";
            }
            if (s.includes("pending")) {
                return isDarkTheme
                    ? "border-amber-800 bg-amber-950 text-amber-300"
                    : "border-amber-200 bg-amber-50 text-amber-800";
            }
            if (s.includes("progress")) {
                return isDarkTheme
                    ? "border-indigo-800 bg-indigo-950 text-indigo-300"
                    : "border-indigo-200 bg-indigo-50 text-indigo-800";
            }
            if (s.includes("complete")) {
                return isDarkTheme
                    ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800";
            }
            return isDarkTheme
                ? "border-slate-600 bg-slate-800 text-slate-300"
                : "border-slate-200 bg-slate-50 text-slate-700";
        };

        return (
            <>
                <tr
                    onClick={() => setRowExpanded(!rowExpanded)}
                    className={`${themeClasses.bgHover} cursor-pointer border-b transition-all ${themeClasses.border}`}
                >
                    <td className="px-3 py-3">
                        <p className={dprTy.categoryLabel}>{data.category}</p>
                        <p className={`mt-1 ${dprTy.subcategoryName}`}>{data.subcategory}</p>
                    </td>
                    <td className="max-w-[280px] px-3 py-3">
                        <div className="flex items-start gap-2">
                            <Icons.ChevronRight
                                size={14}
                                className={`mt-1 shrink-0 transition-transform ${rowExpanded ? "rotate-90 text-indigo-600" : isDarkTheme ? "text-slate-400" : "text-slate-500"}`}
                            />
                            <div className="min-w-0">
                                <p className={`line-clamp-2 ${dprTy.tablePrimary}`} title={data.scope}>
                                    {data.scope}
                                </p>
                                <p className={`mt-0.5 line-clamp-1 ${dprTy.tableSecondary}`}>{data.subcategory}</p>
                            </div>
                        </div>
                    </td>
                    <td className="min-w-[88px] px-3 py-3">
                        <div className="flex flex-col gap-1.5">
                            <span className={dprTy.progressPercent(progressTone.text)}>
                                {Number(data.progress).toFixed(0)}%
                            </span>
                            <div className={`h-1 w-full overflow-hidden rounded-full ${isDarkTheme ? "bg-white/10" : "bg-slate-200"}`}>
                                <div
                                    className={`h-full rounded-full transition-all ${progressTone.bar}`}
                                    style={{ width: `${Math.min(100, Number(data.progress))}%` }}
                                />
                            </div>
                        </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 ${dprTy.statusBadge} ${getStatusColor(data.status)}`}>
                            {formatActivityStatusLabel(data.status)}
                        </span>
                    </td>
                </tr>
                {rowExpanded && (
                    <tr className={isDarkTheme ? "bg-indigo-500/5" : "bg-indigo-50/40"}>
                        <td colSpan={4} className="px-4 py-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {[
                                    { label: "Actual Quantity", value: `${data.executed} ${data.unit}` },
                                    { label: "Cumulative Quantity", value: `${data.cumulative} ${data.unit}` },
                                    { label: "Planned Quantity", value: `${data.planned} ${data.unit}` },
                                    { label: "Progress %", value: `${Number(data.progress).toFixed(2)}%` },
                                    { label: "Remarks", value: data.remarks },
                                    { label: "Site Notes", value: data.siteNotes },
                                    { label: "Engineer Comments", value: data.engineerComments },
                                    { label: "Related Photos", value: "No photos attached" },
                                ].map((item) => (
                                    <div key={item.label} className={`rounded-lg border p-2.5 ${themeClasses.border}`}>
                                        <p className={dprTy.expandedLabel}>{item.label}</p>
                                        <p className={`mt-1 ${dprTy.expandedValue}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </td>
                    </tr>
                )}
            </>
        );
    };

    const fetchDPRs = useCallback(async (options?: { silent?: boolean }) => {
        const silent = Boolean(options?.silent);
        if (!silent) {
            setLoading(true);
            setError(null);
        }
        try {
            const params: any = {
                page: 1,
                page_size: 50,
                ordering: '-id',
            };
            const projectFilter = isTeamLead ? effectiveProjectName : filters.project_name;
            if (projectFilter) params.project_name = projectFilter;
            if (filters.date) params.date = filters.date;

            let response;
            if (typeof api.getDPRs === 'function') {
                response = await api.getDPRs(params);
            } else {
                response = await api.get("/dpr/", { params });
            }

            const data = response.data.results || response.data;
            let fetchedReports = (Array.isArray(data) ? data : []).map((report) => {
                const normalized = normalizeReport(report);
                const overrideStatus = localStatusOverrides[String(normalized.id)];
                if (overrideStatus) {
                    return { ...normalized, status: overrideStatus };
                }
                return normalized;
            });
            if (isTeamLead) {
                fetchedReports = fetchedReports.filter((report) =>
                    matchesAssignedProject(report.project_name),
                );
            }
            setReports(fetchedReports);
            setError(null);

            setSelectedReport((current) => {
                if (current) {
                    const currentId = reportIdKey(current.id);
                    const updatedSelected = currentId
                        ? fetchedReports.find((report) => reportIdKey(report.id) === currentId)
                        : undefined;
                    return updatedSelected ?? fetchedReports[0] ?? null;
                }
                return fetchedReports[0] ?? null;
            });
        } catch (err: any) {
            console.error("Failed to fetch DPRs:", err);
            // Use mock data as fallback for development/testing
            console.log("Using mock DPR data as fallback");
            let mockReports: DailyProgressReport[] = MOCK_DPRS.map(dpr => ({
                id: parseInt(dpr.id.replace('dpr-', '')) || Math.floor(Math.random() * 1000),
                project_name: dpr.projectName,
                job_no: `JOB-${dpr.projectId.toUpperCase()}`,
                report_date: dpr.date,
                unresolved_issues: dpr.criticalIssues || '',
                pending_letters: '',
                quality_status: '',
                next_day_incident: '',
                bill_status: dpr.billingStatus || '',
                gfc_status: '',
                issued_by: dpr.submittedByName,
                designation: 'Site Engineer',
                created_at: dpr.submittedAt,
                updated_at: dpr.submittedAt,
                activities: dpr.activityProgress?.map(ap => ({
                    id: parseInt(ap.activityId.replace('a', '')) || Math.floor(Math.random() * 1000),
                    date: dpr.date,
                    activity: `Activity ${ap.activityId}`,
                    deliverables: ap.remarks || '',
                    target_achieved: ap.todayProgress,
                    next_day_plan: '',
                    remarks: ap.remarks || ''
                })) || [],
                status: dpr.status,
                rejection_reason: (dpr as any).rejectionReason,
                rejected_by_username: (dpr as any).rejectedByName
            }));

            const projectFilter = isTeamLead ? effectiveProjectName : filters.project_name;
            if (projectFilter) {
                mockReports = mockReports.filter(report =>
                    report.project_name.toLowerCase().includes(projectFilter.toLowerCase())
                );
            }
            if (isTeamLead) {
                mockReports = mockReports.filter((report) =>
                    matchesAssignedProject(report.project_name),
                );
            }
            if (filters.date) {
                mockReports = mockReports.filter(report =>
                    report.report_date === filters.date
                );
            }

            setReports(mockReports);
            setSelectedReport((current) => {
                if (current) {
                    const currentId = reportIdKey(current.id);
                    const updatedSelected = currentId
                        ? mockReports.find((report) => reportIdKey(report.id) === currentId)
                        : undefined;
                    return updatedSelected ?? mockReports[0] ?? null;
                }
                return mockReports[0] ?? null;
            });

            // Set a warning message instead of error
            setError("Backend unavailable - showing mock data for demonstration");
        } finally {
            setLoading(false);
        }
    }, [
        api,
        effectiveProjectName,
        filters.date,
        filters.project_name,
        isTeamLead,
        localStatusOverrides,
        matchesAssignedProject,
    ]);

    // Fetch DPRs from API
    useEffect(() => {
        void fetchDPRs();
    }, [fetchDPRs]);

    const [reportScopes, setReportScopes] = useState<any[]>([]);
    const [loadingScopes, setLoadingScopes] = useState(false);

    // Fetch scopes for the selected report's project to show full details
    useEffect(() => {
        const fetchReportScopes = async () => {
            if (!selectedReport?.project) {
                setReportScopes([]);
                return;
            }
            setLoadingScopes(true);
            try {
                const response = await monthlyScopeApi.getMyScopes({
                    project: selectedReport.project
                });
                const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
                setReportScopes(data);
            } catch (error) {
                console.error("Failed to fetch scopes for report details:", error);
            } finally {
                setLoadingScopes(false);
            }
        };
        fetchReportScopes();
    }, [selectedReport?.project, selectedReport?.id]);

    const getNextApprovalStatus = useCallback((): string => {
        if (user?.role === UserRole.TEAM_LEAD) return 'pending_coordinator';
        if (isPmcHeadEquivalent(user)) return 'approved';
        return 'approved';
    }, [user?.role]);

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString("en-GB");
        } catch {
            return dateString;
        }
    };

    const canUserReview = () => {
        if (!user || !selectedReport || !selectedReport.status) return false;

        const status = selectedReport.status.toLowerCase();

        // Check if it's the current user's turn to review
        if (user.role === UserRole.TEAM_LEAD && (status === 'pending_team_lead' || status === 'pending' || status === 'submitted')) return true;
        // PMC Manager has Head-level access — can clear coordinator + head queues
        if (isPmcHeadEquivalent(user) && (status === 'pending_coordinator' || status === 'pending_pmc_head')) return true;

        return false;
    };

    const getStatusMessage = (status?: string) => {
        if (!status) return 'Awaiting Submission by Site Engineer';
        
        const s = status.toLowerCase();
        if (s === 'approved') return 'Final Approval Completed';
        if (s === 'rejected') return 'DPR Rejected - Re-submission Required';
        if (s === 'draft') return 'Draft - Not Submitted by Site Engineer';
        if (s === 'pending_team_lead' || s === 'pending' || s === 'submitted') return 'Awaiting Team Leader Approval';
        if (s === 'pending_coordinator') return 'Awaiting PMC Manager Approval';
        if (s === 'pending_pmc_head') return 'Awaiting PMC Head Approval';
        
        // Dynamic fallback
        return `Awaiting ${s.replace('pending_', '').replace(/_/g, ' ')} Approval`;
    };

    const handleApprove = async () => {
        if (selectedReport && onApprove) {
            try {
                const reportId = reportIdKey(selectedReport.id);
                if (!reportId) return;
                const nextStatus = getNextApprovalStatus();
                await onApprove(reportId);
                setLocalStatusOverrides((prev) => ({
                    ...prev,
                    [reportId]: nextStatus,
                }));
                setSelectedReport((prev) =>
                    prev && String(prev.id) === reportId ? { ...prev, status: nextStatus } : prev
                );
                setReports((prev) =>
                    prev.map((report) =>
                        String(report.id) === reportId ? { ...report, status: nextStatus } : report
                    )
                );
                setSuccessMessage("DPR Approved Successfully");
                setTimeout(() => setSuccessMessage(null), 3000);
                // Refresh data to update status and hide buttons
                void fetchDPRs({ silent: true });
            } catch (err) {
                // Error handled in App.tsx
            }
        }
    };

    const openRejectModal = (mode: "reject" | "revision") => {
        setRejectModalMode(mode);
        setRejectReason(reviewComments);
        setShowRejectModal(true);
    };

    const handleRequestRevision = async () => {
        if (!reviewComments.trim()) {
            alert("Please enter review comments before requesting a revision.");
            return;
        }
        setRejectReason(reviewComments);
        if (selectedReport && onReject) {
            try {
                const reportId = reportIdKey(selectedReport.id);
                if (!reportId) return;
                await onReject(reportId, reviewComments);
                setLocalStatusOverrides((prev) => ({ ...prev, [reportId]: "rejected" }));
                setSelectedReport((prev) =>
                    prev && String(prev.id) === reportId ? { ...prev, status: "rejected" } : prev
                );
                setReports((prev) =>
                    prev.map((report) =>
                        String(report.id) === reportId ? { ...report, status: "rejected" } : report
                    )
                );
                setSuccessMessage("Revision Requested — DPR returned to Site Engineer");
                setTimeout(() => setSuccessMessage(null), 3000);
                void fetchDPRs({ silent: true });
            } catch {
                // handled in App.tsx
            }
        }
    };

    const handleReject = async () => {
        if (selectedReport && onReject && rejectReason.trim()) {
            try {
                const reportId = reportIdKey(selectedReport.id);
                if (!reportId) return;
                await onReject(reportId, rejectReason);
                setLocalStatusOverrides((prev) => ({
                    ...prev,
                    [reportId]: 'rejected',
                }));
                setSelectedReport((prev) =>
                    prev && String(prev.id) === reportId ? { ...prev, status: 'rejected' } : prev
                );
                setReports((prev) =>
                    prev.map((report) =>
                        String(report.id) === reportId ? { ...report, status: 'rejected' } : report
                    )
                );
                setShowRejectModal(false);
                setRejectReason("");
                setSuccessMessage("DPR Rejected Successfully");
                setTimeout(() => setSuccessMessage(null), 3000);
                // Refresh data to update status and hide buttons
                void fetchDPRs({ silent: true });
            } catch (err) {
                // Error handled in App.tsx
            }
        }
    };

    const handleSubmitDraft = async () => {
        if (selectedReport) {
            try {
                // Use the dprApi.submitDPR directly if available or handle it via a prop
                // For simplicity, we can use the api object passed via props
                await api.submitDPR(selectedReport.id, 'Site Engineer');
                setSuccessMessage("DPR Submitted for Approval");
                setTimeout(() => setSuccessMessage(null), 3000);
                void fetchDPRs({ silent: true });
            } catch (err: any) {
                console.error("Failed to submit draft:", err);
                alert(err.response?.data?.error || "Failed to submit DPR. Please try again.");
            }
        }
    };

    if (loading && reports.length === 0) {
        return (
            <WorkspaceLoadingPanel
                title="Loading DPRs"
                subtitle="Fetching daily progress reports for review. This only takes a moment."
            />
        );
    }

    if (error) {
        // Check if it's a warning (mock data) or actual error
        const isWarning = error.includes("mock data");
        return (
            <div className="flex items-center justify-center py-24">
                <div className={`${themeClasses.glassCard} rounded-2xl p-8 text-center max-w-md ${isWarning ? 'border-amber-500/30' : 'border-rose-500/30'}`}>
                    {isWarning ? (
                        <Icons.AlertCircle className="mx-auto mb-4 text-amber-500" size={48} />
                    ) : (
                        <Icons.AlertCircle className="mx-auto mb-4 text-rose-500" size={48} />
                    )}
                    <p className={`${isWarning ? themeClasses.warning : themeClasses.danger} font-bold mb-4`}>{error}</p>
                    <button
                        onClick={fetchDPRs}
                        className={`px-6 py-2 ${themeClasses.bgHover} border ${themeClasses.border} rounded-xl text-sm font-bold transition-all ${themeClasses.textPrimary}`}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`dpr-review-dashboard flex w-full flex-col ${
                isDarkTheme ? "dpr-review-dashboard--dark" : "dpr-review-dashboard--light"
            }`}
        >
            {/* Header */}
            <div className="mb-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className={dprTy.pageTitle}>DPR Review Dashboard</h2>
                        <p className={`mt-1 ${dprTy.pageSubtitle}`}>
                            Daily progress reports — review and approval
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <TutorialWatchButton section="dpr_review" variant="panel" isDark={isDarkTheme} />
                        {user?.role === UserRole.SITE_ENGINEER && (
                            <button
                                onClick={() => setShowSubmissionForm(true)}
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <Icons.Add size={16} />
                                Create New DPR
                            </button>
                        )}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold transition-all ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                        >
                            {isExpanded ? (
                                <>
                                    <Icons.ChevronRight size={16} />
                                    Collapse View
                                </>
                            ) : (
                                <>
                                    <Icons.Expand size={16} />
                                    Expand View
                                </>
                            )}
                        </button>
                    </div>
                </div>
                {/* Filters + DPR selector — horizontal row below title */}
                <div className={`mt-4 flex flex-wrap items-end gap-4 p-4 border-b ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                    <div className="flex min-w-[200px] max-w-[320px] flex-1 flex-col">
                        <label className={dprTy.filterLabel}>Project Name</label>
                        <select
                            value={filters.project_name}
                            onChange={(e) =>
                                setFilters((prev) => ({ ...prev, project_name: e.target.value }))
                            }
                            disabled={Boolean(isTeamLead && singleAssignedProjectName)}
                            className={`dpr-review-select w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${dprTy.filterInput} ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${isDarkTheme ? 'focus:ring-white/20' : 'focus:ring-indigo-500/20'}`}
                        >
                            {!isTeamLead && <option value="">All Projects</option>}
                            {projectOptions.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col min-w-[140px] w-[160px]">
                        <label className={dprTy.filterLabel}>Date</label>
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                            className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${dprTy.filterInput} ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${isDarkTheme ? 'focus:ring-white/20' : 'focus:ring-indigo-500/20'}`}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            setFilters({
                                project_name:
                                    isTeamLead && singleAssignedProjectName
                                        ? singleAssignedProjectName
                                        : "",
                                date: "",
                            })
                        }
                        className={`self-end rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${themeClasses.buttonSecondary} ${themeClasses.border} ${themeClasses.bgHover}`}
                    >
                        Clear Filters
                    </button>
                    <div className="flex min-w-[200px] max-w-md flex-1 flex-col">
                        <label className={dprTy.filterLabel}>Select DPR</label>
                        <select
                            value={selectedReport ? reportIdKey(selectedReport.id) : ""}
                            onChange={(e) => {
                                const id = e.target.value;
                                const next = reports.find((r) => String(r.id) === id);
                                if (next) setSelectedReport(next);
                            }}
                            className={`dpr-review-select w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${dprTy.filterInput} ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${isDarkTheme ? 'focus:ring-white/20' : 'focus:ring-indigo-500/20'}`}
                        >
                            <option value="">— Select DPR —</option>
                            {reports.map((report) => (
                                <option key={report.id} value={report.id}>
                                    {report.project_name} · {report.job_no} · {formatDate(report.report_date)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content — DPR details (left) + Approval panel (right) */}
            <div
                className={`grid items-start gap-6 ${
                    isExpanded ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]"
                }`}
            >
                {/* DPR detail panel */}
                <div className={`flex-1 rounded-2xl flex flex-col min-w-0 ${themeClasses.glassCard} ${themeClasses.border}`}>
                    {selectedReport ? (
                        <>
                            {/* DPR Header */}
                            <div className={`flex-shrink-0 p-6 border-b ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className={`truncate ${dprTy.cardHeading}`}>
                                                {selectedReport.project_name}
                                            </h3>
                                            <span className={dprTy.jobBadge}>
                                                {selectedReport.job_no}
                                            </span>
                                        </div>
                                        <div className={`mt-2 flex flex-wrap items-center gap-4 ${dprTy.helperText}`}>
                                            <span className="flex items-center gap-2">
                                                <Icons.Calendar size={14} />
                                                {formatDate(selectedReport.report_date)}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <Icons.User size={14} />
                                                {selectedReport.issued_by} ({selectedReport.designation})
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <Icons.Activity size={14} />
                                                {selectedReport.activities?.length || 0} Activities
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* DPR Content */}
                            <div className="space-y-4 p-4 md:p-5">
                                {activityStats && (
                                    <DprReviewKpiCards
                                        total={activityStats.total}
                                        completed={activityStats.completed}
                                        inProgress={activityStats.in_progress}
                                        delayed={activityStats.delayed}
                                    />
                                )}

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {(
                                        [
                                            { key: "quality_status", label: "Quality Status", value: selectedReport.quality_status },
                                            { key: "pending_letters", label: "Pending Letters", value: selectedReport.pending_letters },
                                            { key: "unresolved_issues", label: "Unresolved Issues", value: selectedReport.unresolved_issues },
                                            { key: "bill_status", label: "Bill Status", value: selectedReport.bill_status },
                                            { key: "gfc_status", label: "GFC Status", value: selectedReport.gfc_status },
                                            { key: "next_day_incident", label: "Next Day Incident", value: selectedReport.next_day_incident },
                                        ] as const
                                    )
                                        .filter((field) => field.value)
                                        .map((field) => {
                                            const tone = getStatusFieldTone(field.key);
                                            return (
                                                <div
                                                    key={field.key}
                                                    className={`rounded-xl border p-3 ${statusCardClass(tone, isDarkTheme)}`}
                                                >
                                                    <label className={`mb-1.5 block ${dprTy.metaLabel}`}>{field.label}</label>
                                                    <p className={dprTy.statusCardValue}>{field.value}</p>
                                                </div>
                                            );
                                        })}
                                </div>

                                {/* Activities Table */}
                                {selectedReport.activities && selectedReport.activities.length > 0 && (
                                    <div>
                                        <h4 className={`mb-4 flex items-center gap-2 ${dprTy.sectionTitle}`}>
                                            <Icons.Activity size={20} className={dprTy.iconMuted} />
                                            <span>Activities</span>
                                            <span className={`text-base font-semibold ${isDarkTheme ? "text-slate-400" : "text-slate-600"}`}>
                                                ({selectedReport.activities.length})
                                            </span>
                                        </h4>
                                        <div className={`overflow-x-auto rounded-xl border ${themeClasses.border}`}>
                                            <table className="w-full border-collapse text-left">
                                                <thead>
                                                    <tr className={`border-b ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                                                        <th className={`px-3 py-2.5 ${dprTy.tableHeader}`}>Category</th>
                                                        <th className={`px-3 py-2.5 ${dprTy.tableHeader}`}>Scope</th>
                                                        <th className={`px-3 py-2.5 ${dprTy.tableHeader}`}>Progress</th>
                                                        <th className={`px-3 py-2.5 text-right ${dprTy.tableHeader}`}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y ${themeClasses.border}`}>
                                                    {loadingScopes ? (
                                                        [1, 2, 3].map((i) => (
                                                            <tr key={i} className="animate-pulse">
                                                                <td colSpan={4} className="px-3 py-4">
                                                                    <div className={`h-6 w-full rounded-lg ${isDarkTheme ? "bg-white/5" : "bg-slate-100"}`} />
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        selectedReport.activities.map((activity) => (
                                                            <ActivityRow 
                                                                key={activity.id} 
                                                                activity={activity} 
                                                                reportScopes={reportScopes} 
                                                                themeClasses={themeClasses} 
                                                                isDarkTheme={isDarkTheme} 
                                                            />
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* No Activities Message */}
                                {(!selectedReport.activities || selectedReport.activities.length === 0) && (
                                    <div className="text-center py-12">
                                        <Icons.Activity className={`mx-auto mb-4 ${dprTy.emptyStateIcon}`} size={48} />
                                        <p className={dprTy.cardHeading}>No activities recorded</p>
                                        <p className={`mt-2 ${dprTy.helperText}`}>
                                            This DPR does not have any activities logged yet.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <Icons.Document className={`mx-auto mb-4 ${dprTy.emptyStateIcon}`} size={64} />
                                <p className={dprTy.emptyStateTitle}>Select a DPR</p>
                                <p className={`mt-2 ${dprTy.emptyStateHint}`}>
                                    Choose a report from the Select DPR dropdown above
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Approval panel — sticky on review */}
                <div
                    className={`dpr-approval-panel top-4 flex flex-col rounded-2xl lg:sticky ${themeClasses.glassCard} ${themeClasses.border}`}
                >
                    {selectedReport ? (
                        <>
                            <div className={`border-b p-4 ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                                <h4 className={`flex items-center gap-2 ${dprTy.cardHeading}`}>
                                    <Icons.Approve size={16} className="text-indigo-500" />
                                    DPR Review
                                </h4>
                            </div>

                            <div className="space-y-4 p-4">
                                <div>
                                    <label className={`mb-1.5 block ${dprTy.metaLabel}`}>Review Comments</label>
                                    <textarea
                                        value={reviewComments}
                                        onChange={(e) => setReviewComments(e.target.value)}
                                        rows={5}
                                        placeholder="Add review notes for the site engineer…"
                                        className={`${dprTy.textarea} ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${isDarkTheme ? "focus:ring-indigo-500/30" : "focus:ring-indigo-500/20"}`}
                                    />
                                </div>

                                {canUserReview() ? (
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={handleApprove}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white transition-all hover:bg-emerald-500"
                                        >
                                            <Icons.Approve size={16} />
                                            Approve DPR
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRequestRevision}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-semibold text-white transition-all hover:bg-amber-500"
                                        >
                                            <Icons.Document size={16} />
                                            Request Revision
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openRejectModal("reject")}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white transition-all hover:bg-rose-500"
                                        >
                                            <Icons.Reject size={16} />
                                            Reject DPR
                                        </button>
                                    </div>
                                ) : user?.role === UserRole.SITE_ENGINEER &&
                                  (selectedReport.status?.toLowerCase() === "rejected" ||
                                      selectedReport.status?.toLowerCase() === "dpr rejected") ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowSubmissionForm(true)}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-xs font-semibold text-white"
                                    >
                                        <Icons.Document size={16} />
                                        Edit & Resubmit
                                    </button>
                                ) : user?.role === UserRole.SITE_ENGINEER && selectedReport.status?.toLowerCase() === "draft" ? (
                                    <button
                                        type="button"
                                        onClick={handleSubmitDraft}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white"
                                    >
                                        <Icons.Upload size={16} />
                                        Submit for Review
                                    </button>
                                ) : null}

                                <div className={`rounded-xl border p-3 text-center ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                    <label className={`mb-2 block ${dprTy.panelSectionTitle}`}>Workflow Status</label>
                                    <span
                                        className={`inline-block rounded-full border px-3 py-1.5 ${dprTy.workflowStatus} ${
                                            selectedReport.status?.toUpperCase() === "APPROVED"
                                                ? isDarkTheme
                                                    ? "border-emerald-700 bg-emerald-950 text-emerald-300"
                                                    : "border-emerald-300 bg-emerald-50 text-emerald-800"
                                                : selectedReport.status?.toUpperCase() === "REJECTED"
                                                  ? isDarkTheme
                                                      ? "border-rose-700 bg-rose-950 text-rose-300"
                                                      : "border-rose-300 bg-rose-50 text-rose-800"
                                                  : isDarkTheme
                                                    ? "border-amber-700 bg-amber-950 text-amber-300"
                                                    : "border-amber-300 bg-amber-50 text-amber-800"
                                        }`}
                                    >
                                        {getStatusMessage(selectedReport.status)}
                                    </span>
                                    {canUserReview() && (
                                        <p className={`mt-2 text-sm font-semibold ${isDarkTheme ? "text-emerald-300" : "text-emerald-700"}`}>
                                            Action required
                                        </p>
                                    )}
                                </div>

                                <div className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                    <label className={`mb-2 block ${dprTy.panelSectionTitle}`}>Report Details</label>
                                    <div className="space-y-3">
                                        {[
                                            {
                                                label: "Submitted By",
                                                value: `${selectedReport.issued_by || "—"}${selectedReport.designation ? ` (${selectedReport.designation})` : ""}`,
                                            },
                                            { label: "Submission Time", value: formatDprDateTime(selectedReport.created_at) },
                                            { label: "Last Updated", value: formatDprDateTime(selectedReport.updated_at) },
                                            { label: "Report Date", value: formatDate(selectedReport.report_date) },
                                            { label: "Job No", value: selectedReport.job_no || "—" },
                                        ].map((row) => (
                                            <div key={row.label} className="flex justify-between gap-3">
                                                <span className={dprTy.detailLabel}>{row.label}</span>
                                                <span className={`text-right ${dprTy.detailValue}`}>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {(selectedReport.status?.toLowerCase() === "rejected" ||
                                    selectedReport.status?.toLowerCase() === "dpr rejected") && (
                                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                                        <label className={`mb-1 flex items-center gap-1 ${dprTy.panelSectionTitle} ${isDarkTheme ? "text-rose-400" : "text-rose-700"}`}>
                                            <Icons.AlertCircle size={12} />
                                            Rejection Feedback
                                        </label>
                                        <p className={`text-sm font-medium italic leading-relaxed ${isDarkTheme ? "text-rose-200" : "text-rose-800"}`}>
                                            &ldquo;{selectedReport.rejection_reason || "No specific reason provided."}&rdquo;
                                        </p>
                                    </div>
                                )}

                                {selectedReport.activities && selectedReport.activities.length > 0 && (
                                    <div className={`rounded-xl border p-3 ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                        <label className={`mb-2 block ${dprTy.panelSectionTitle}`}>Progress Summary</label>
                                        {activityStats && (
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className={`rounded-lg p-2.5 ${isDarkTheme ? "bg-emerald-950" : "bg-emerald-50"}`}>
                                                    <p className={`${dprTy.summaryCount} ${summaryColors.completed}`}>
                                                        {activityStats.completed}
                                                    </p>
                                                    <p className={dprTy.summaryLabel}>Completed</p>
                                                </div>
                                                <div className={`rounded-lg p-2.5 ${isDarkTheme ? "bg-amber-950" : "bg-amber-50"}`}>
                                                    <p className={`${dprTy.summaryCount} ${summaryColors.inProgress}`}>
                                                        {activityStats.in_progress}
                                                    </p>
                                                    <p className={dprTy.summaryLabel}>In Progress</p>
                                                </div>
                                                <div className={`rounded-lg p-2.5 ${isDarkTheme ? "bg-rose-950" : "bg-rose-50"}`}>
                                                    <p className={`${dprTy.summaryCount} ${summaryColors.delayed}`}>
                                                        {activityStats.delayed}
                                                    </p>
                                                    <p className={dprTy.summaryLabel}>Delayed</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center p-8 py-16">
                            <div className="text-center">
                                <Icons.Approve className={`mx-auto mb-4 ${dprTy.emptyStateIcon}`} size={48} />
                                <p className={dprTy.cardHeading}>No Report Selected</p>
                                <p className={`mt-2 ${dprTy.helperText}`}>Select a DPR to review</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 ${
                  isDarkTheme ? 'bg-black/60 backdrop-blur-md' : 'bg-white/5 backdrop-blur-sm'
                }`}>
                    <div className={`${themeClasses.glassCard} w-full max-w-md rounded-2xl p-6 animate-in zoom-in-95 duration-200 border ${themeClasses.border}`}>
                        <div className="w-12 h-12 bg-rose-500/15 text-rose-500 rounded-xl flex items-center justify-center mb-4 border border-rose-500/30">
                            <Icons.Reject size={24} />
                        </div>
                        <h3 className={`mb-2 ${dprTy.cardHeading}`}>
                            {rejectModalMode === "revision" ? "Request Revision" : "Reject DPR"}
                        </h3>
                        <p className={`mb-4 ${dprTy.helperText}`}>
                            {rejectModalMode === "revision"
                                ? "Confirm revision feedback for the Site Engineer."
                                : "Provide specific feedback for the Site Engineer."}
                        </p>
                        <textarea
                            className={`w-full h-32 p-4 rounded-xl focus:ring-4 outline-none transition-all font-medium text-sm ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-rose-500/20 focus:border-rose-500/40' : 'focus:ring-rose-500/10 focus:border-rose-500/30'}`}
                            placeholder="E.g. Daily excavation logs show 20 units, but report says 25. Please verify site attendance records..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason("");
                                }}
                                className={`flex-1 px-4 py-3 font-black text-xs uppercase border rounded-xl transition-colors ${themeClasses.buttonSecondary} ${themeClasses.border}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectReason.trim()}
                                className="flex-1 px-4 py-3 bg-rose-600 text-white font-black text-xs uppercase rounded-xl hover:bg-rose-500 transition-all disabled:opacity-50"
                            >
                                {rejectModalMode === "revision" ? "Send Revision Request" : "Reject & Send"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DPR Submission Form Modal */}
            {showSubmissionForm && (
                <div className={`fixed inset-0 z-[160] flex items-center justify-center p-4 overflow-y-auto ${
                  isDarkTheme ? 'bg-black/60 backdrop-blur-md' : 'bg-white/5 backdrop-blur-sm'
                }`}>
                    <div className="w-full max-w-5xl my-8">
                        <DPRSubmissionForm
                            onClose={() => setShowSubmissionForm(false)}
                            onSubmit={(data) => {
                                setShowSubmissionForm(false);
                                setSuccessMessage(selectedReport?.status?.toLowerCase() === 'rejected' ? "DPR Updated & Resubmitted Successfully" : "DPR Created & Submitted Successfully");
                                setTimeout(() => setSuccessMessage(null), 3000);
                                if (data?.report) {
                                    const created = unwrapCreatedDpr(data.report);
                                    if (created && reportIdKey(created.id)) {
                                        const normalized = normalizeReport(created);
                                        setReports((prev) => {
                                            const rest = prev.filter(
                                                (report) => reportIdKey(report.id) !== reportIdKey(normalized.id),
                                            );
                                            return [normalized, ...rest];
                                        });
                                        setSelectedReport(normalized);
                                    }
                                }
                                void fetchDPRs({ silent: true });
                            }}
                            assignedProjects={accessibleProjects}
                            existingDPR={selectedReport?.status?.toLowerCase() === 'rejected' ? selectedReport : undefined}
                        />
                    </div>
                </div>
            )}

            {/* Success Popup */}
            {successMessage && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/50 backdrop-blur-md">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <Icons.Approve size={18} />
                        </div>
                        <span className="font-black uppercase tracking-widest text-xs">
                            {successMessage}
                        </span>
                    </div>
                </div>
            )}

            <TutorialVideosPanel section="dpr_review" />
        </div>
    );
};

export default DPRReviewDashboard;
