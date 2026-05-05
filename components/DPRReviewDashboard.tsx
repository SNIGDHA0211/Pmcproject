import React, { useState, useEffect, useCallback } from "react";
import { Icons } from "./Icons";
import { MOCK_DPRS } from "../services/mockData";
import { User, UserRole, Project } from "../types";
import DPRSubmissionForm from "./DPRSubmissionForm";
import { useTheme, getThemeClasses } from "../utils/theme";

// Types for the new DPR system
interface DPRActivity {
    id: number;
    date: string;
    activity: string;
    deliverables: string;
    target_achieved: number | string | null;
    next_day_plan: string;
    remarks: string;
}

interface DailyProgressReport {
    id: number;
    project_name: string;
    job_no: string;
    report_date: string;
    unresolved_issues: string;
    pending_letters: string;
    quality_status: string;
    next_day_incident: string;
    bill_status: string;
    gfc_status: string;
    issued_by: string;
    designation: string;
    created_at: string;
    updated_at: string;
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

const DPRReviewDashboard: React.FC<DPRReviewDashboardProps> = ({
    api,
    user,
    projects = [],
    onApprove,
    onReject
}) => {
    const { isDarkTheme } = useTheme();
    const themeClasses = getThemeClasses(isDarkTheme);
    const [reports, setReports] = useState<DailyProgressReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedReport, setSelectedReport] = useState<DailyProgressReport | null>(null);
    const [filters, setFilters] = useState({
        project_name: "",
        date: "",
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showSubmissionForm, setShowSubmissionForm] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const toSafeNumber = (value: unknown) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const normalizeReport = (report: any): DailyProgressReport => {
        const normalizedActivities = Array.isArray(report?.activities)
            ? report.activities.map((activity: any) => ({
                ...activity,
                target_achieved: toSafeNumber(activity?.target_achieved),
            }))
            : [];

        return {
            ...report,
            activities: normalizedActivities,
        };
    };

  // Handle search on Enter key press
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setFilters(prev => ({ ...prev, project_name: searchTerm }));
    }
  };

    // Fetch DPRs from API
    useEffect(() => {
        fetchDPRs();
    }, [filters]);

    const fetchDPRs = async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = {};
            if (filters.project_name) params.project_name = filters.project_name;
            if (filters.date) params.date = filters.date;

            let response;
            if (typeof api.getDPRs === 'function') {
                response = await api.getDPRs(params);
            } else {
                response = await api.get("/dpr/", { params });
            }

            const data = response.data.results || response.data;
            const fetchedReports = (Array.isArray(data) ? data : []).map(normalizeReport);
            setReports(fetchedReports);
            setError(null);

            // Update selected report if it exists in the new data
            if (selectedReport) {
                const updatedSelected = fetchedReports.find(r => r.id.toString() === selectedReport.id.toString());
                if (updatedSelected) {
                    setSelectedReport(updatedSelected);
                }
            } else if (fetchedReports.length > 0) {
                // Auto-select first report if none selected
                setSelectedReport(fetchedReports[0]);
            }
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

            // Filter mock data based on search criteria
            if (filters.project_name) {
                mockReports = mockReports.filter(report =>
                    report.project_name.toLowerCase().includes(filters.project_name!.toLowerCase())
                );
            }
            if (filters.date) {
                mockReports = mockReports.filter(report =>
                    report.report_date === filters.date
                );
            }

            setReports(mockReports);

            // Auto-select first report if none selected
            if (!selectedReport && mockReports.length > 0) {
                setSelectedReport(mockReports[0]);
            }

            // Set a warning message instead of error
            setError("Backend unavailable - showing mock data for demonstration");
        } finally {
            setLoading(false);
        }
    };

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
        if (user.role === UserRole.COORDINATOR && (status === 'pending_coordinator')) return true;
        if (user.role === UserRole.PMC_HEAD && (status === 'pending_pmc_head')) return true;

        return false;
    };

    const getStatusMessage = (status?: string) => {
        if (!status) return 'Awaiting Submission by Site Engineer';
        
        const s = status.toLowerCase();
        if (s === 'approved') return 'Final Approval Completed';
        if (s === 'rejected') return 'DPR Rejected - Re-submission Required';
        if (s === 'draft') return 'Draft - Not Submitted by Site Engineer';
        if (s === 'pending_team_lead' || s === 'pending' || s === 'submitted') return 'Awaiting Team Leader Approval';
        if (s === 'pending_coordinator') return 'Awaiting Coordinator Approval';
        if (s === 'pending_pmc_head') return 'Awaiting PMC Head Approval';
        
        // Dynamic fallback
        return `Awaiting ${s.replace('pending_', '').replace(/_/g, ' ')} Approval`;
    };

    const handleApprove = async () => {
        if (selectedReport && onApprove) {
            try {
                await onApprove(selectedReport.id.toString());
                setSuccessMessage("DPR Approved Successfully");
                setTimeout(() => setSuccessMessage(null), 3000);
                // Refresh data to update status and hide buttons
                fetchDPRs();
            } catch (err) {
                // Error handled in App.tsx
            }
        }
    };

    const handleReject = async () => {
        if (selectedReport && onReject && rejectReason.trim()) {
            try {
                await onReject(selectedReport.id.toString(), rejectReason);
                setShowRejectModal(false);
                setRejectReason("");
                setSuccessMessage("DPR Rejected Successfully");
                setTimeout(() => setSuccessMessage(null), 3000);
                // Refresh data to update status and hide buttons
                fetchDPRs();
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
                fetchDPRs();
            } catch (err: any) {
                console.error("Failed to submit draft:", err);
                alert(err.response?.data?.error || "Failed to submit DPR. Please try again.");
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center">
                    <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDarkTheme ? 'border-white' : 'border-indigo-600'} mx-auto mb-4`}></div>
                    <p className={`${themeClasses.textMuted} text-sm`}>Loading DPRs...</p>
                </div>
            </div>
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
        <div className="flex flex-col w-full">
            {/* Header */}
            <div className="flex-shrink-0 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className={`text-2xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                            DPR Review Dashboard
                        </h2>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                            Daily Progress Reports Review & Approval
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
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
                    <div className="flex flex-col min-w-[200px] flex-1 max-w-[320px]">
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>
                            Project Name
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Filter by project..."
                                className={`flex-1 px-3 py-2 border rounded-lg text-xs font-semibold outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-white/20' : 'focus:ring-indigo-500/20'}`}
                            />
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, project_name: searchTerm }))}
                                className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all ${themeClasses.buttonSecondary} ${themeClasses.border} ${themeClasses.bgHover}`}
                            >
                                Search
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col min-w-[140px] w-[160px]">
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>
                            Date
                        </label>
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${isDarkTheme ? 'focus:ring-white/20' : 'focus:ring-indigo-500/20'}`}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setFilters({ project_name: "", date: "" });
                            setSearchTerm("");
                        }}
                        className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all self-end ${themeClasses.buttonSecondary} ${themeClasses.border} ${themeClasses.bgHover}`}
                    >
                        Clear Filters
                    </button>
                    <div className="flex flex-col min-w-[200px] flex-1 max-w-md">
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>
                            Select DPR
                        </label>
                        <select
                            value={selectedReport ? String(selectedReport.id) : ""}
                            onChange={(e) => {
                                const id = e.target.value;
                                const next = reports.find((r) => String(r.id) === id);
                                if (next) setSelectedReport(next);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold outline-none focus:ring-2 ${themeClasses.input} ${themeClasses.border} ${themeClasses.textPrimary} ${isDarkTheme ? 'focus:ring-white/20' : 'focus:ring-indigo-500/20'}`}
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

            {/* Main Content — DPR details (left) + Approval Actions (right) */}
            <div className={`flex gap-6 items-stretch ${isExpanded ? 'flex-col' : 'flex-row'}`}>
                {/* DPR detail panel */}
                <div className={`flex-1 rounded-2xl flex flex-col min-w-0 ${themeClasses.glassCard} ${themeClasses.border}`}>
                    {selectedReport ? (
                        <>
                            {/* DPR Header */}
                            <div className={`flex-shrink-0 p-6 border-b ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className={`text-xl font-black truncate ${themeClasses.textPrimary}`}>
                                                {selectedReport.project_name}
                                            </h3>
                                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-black uppercase">
                                                {selectedReport.job_no}
                                            </span>
                                        </div>
                                        <div className={`flex items-center gap-4 text-sm ${themeClasses.textSecondary}`}>
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
                            <div className="p-6 space-y-6">
                                {/* Summary Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedReport.unresolved_issues && (
                                        <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                            <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                                                Unresolved Issues
                                            </label>
                                            <p className={`text-sm leading-relaxed ${themeClasses.textPrimary}`}>
                                                {selectedReport.unresolved_issues}
                                            </p>
                                        </div>
                                    )}
                                    {selectedReport.pending_letters && (
                                        <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                            <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                                                Pending Letters
                                            </label>
                                            <p className={`text-sm leading-relaxed ${themeClasses.textPrimary}`}>
                                                {selectedReport.pending_letters}
                                            </p>
                                        </div>
                                    )}
                                    {selectedReport.quality_status && (
                                        <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                            <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                                                Quality Status
                                            </label>
                                            <p className={`text-sm leading-relaxed ${themeClasses.textPrimary}`}>
                                                {selectedReport.quality_status}
                                            </p>
                                        </div>
                                    )}
                                    {selectedReport.bill_status && (
                                        <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                            <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                                                Bill Status
                                            </label>
                                            <p className={`text-sm leading-relaxed ${themeClasses.textPrimary}`}>
                                                {selectedReport.bill_status}
                                            </p>
                                        </div>
                                    )}
                                    {selectedReport.gfc_status && (
                                        <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                            <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                                                GFC Status
                                            </label>
                                            <p className={`text-sm leading-relaxed ${themeClasses.textPrimary}`}>
                                                {selectedReport.gfc_status}
                                            </p>
                                        </div>
                                    )}
                                    {selectedReport.next_day_incident && (
                                        <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                            <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                                                Next Day Incident
                                            </label>
                                            <p className={`text-sm leading-relaxed ${themeClasses.textPrimary}`}>
                                                {selectedReport.next_day_incident}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Activities Table */}
                                {selectedReport.activities && selectedReport.activities.length > 0 && (
                                    <div>
                                        <h4 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${themeClasses.textSecondary}`}>
                                            <Icons.Activity size={16} />
                                            Activities ({selectedReport.activities.length})
                                        </h4>
                                        <div className={`overflow-x-auto rounded-xl border ${themeClasses.border}`}>
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className={`${themeClasses.bgSecondary} border-b ${themeClasses.border}`}>
                                                        <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                                                            Date
                                                        </th>
                                                        <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                                                            Activity
                                                        </th>
                                                        <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                                                            Deliverables
                                                        </th>
                                                        <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right ${themeClasses.textSecondary}`}>
                                                            Target %
                                                        </th>
                                                        <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                                                            Next Day Plan
                                                        </th>
                                                        <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                                                            Remarks
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y ${themeClasses.border}`}>
                                                    {selectedReport.activities.map((activity) => {
                                                        const targetAchieved = toSafeNumber(activity.target_achieved);
                                                        return (
                                                        <tr key={activity.id} className={`${themeClasses.bgHover} transition-colors`}>
                                                            <td className={`px-4 py-3 text-xs font-semibold ${themeClasses.textPrimary}`}>
                                                                {formatDate(activity.date)}
                                                            </td>
                                                            <td className={`px-4 py-3 text-xs ${themeClasses.textPrimary}`}>
                                                                {activity.activity}
                                                            </td>
                                                            <td className={`px-4 py-3 text-xs ${themeClasses.textSecondary}`}>
                                                                {activity.deliverables || "-"}
                                                            </td>
                                                            <td className={`px-4 py-3 text-xs font-black text-right ${themeClasses.textPrimary}`}>
                                                                <span className={`px-2 py-1 rounded ${targetAchieved >= 80
                                                                    ? 'bg-emerald-500/20 text-emerald-500'
                                                                    : targetAchieved >= 50
                                                                        ? 'bg-amber-500/20 text-amber-500'
                                                                        : 'bg-rose-500/20 text-rose-500'
                                                                    }`}>
                                                                    {targetAchieved.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                            <td className={`px-4 py-3 text-xs ${themeClasses.textSecondary}`}>
                                                                {activity.next_day_plan || "-"}
                                                            </td>
                                                            <td className={`px-4 py-3 text-xs ${themeClasses.textSecondary}`}>
                                                                {activity.remarks || "-"}
                                                            </td>
                                                        </tr>
                                                    );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* No Activities Message */}
                                {(!selectedReport.activities || selectedReport.activities.length === 0) && (
                                    <div className="text-center py-12">
                                        <Icons.Activity className={`mx-auto mb-4 ${isDarkTheme ? 'text-white/20' : 'text-gray-300'}`} size={48} />
                                        <p className={`${themeClasses.textPrimary} font-bold`}>No activities recorded</p>
                                        <p className={`${themeClasses.textMuted} text-xs mt-2`}>
                                            This DPR does not have any activities logged yet.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <Icons.Document className="mx-auto mb-4 text-white/20" size={64} />
                                <p className="text-white/60 font-bold text-lg">Select a DPR</p>
                                <p className="text-white/40 text-sm mt-2">
                                    Choose a report from the Select DPR dropdown above
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Approval Actions panel */}
                {!isExpanded && (
                    <div className={`w-80 flex-shrink-0 flex flex-col ${themeClasses.glassCard} ${themeClasses.border} rounded-2xl`}>
                        {selectedReport ? (
                            <>
                                {/* Approval Header */}
                                <div className={`p-4 border-b ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                                    <h4 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${themeClasses.textSecondary}`}>
                                        <Icons.Approve size={16} />
                                        Approval Actions
                                    </h4>
                                </div>

                                {/* Approval Content */}
                                <div className="p-4 space-y-4">
                                    {/* Consolidated Status */}
                                    <div className={`p-4 rounded-xl border text-center ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                                            Workflow Status
                                        </label>
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tight ${
                                                selectedReport.status?.toUpperCase() === "APPROVED"
                                                    ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                                    : selectedReport.status?.toUpperCase() === "REJECTED"
                                                        ? "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                                                        : "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                                }`}>
                                                {getStatusMessage(selectedReport.status)}
                                            </span>
                                            
                                            {/* Role-specific helper text */}
                                            {canUserReview() && (
                                                <p className="text-[10px] text-emerald-500 font-bold uppercase animate-pulse">
                                                    Action Required by You
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Report Info */}
                                    <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                        <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${themeClasses.textSecondary}`}>
                                            Report Details
                                        </label>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className={`${themeClasses.textMuted}`}>Job No:</span>
                                                <span className={`font-bold ${themeClasses.textPrimary}`}>{selectedReport.job_no}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className={`${themeClasses.textMuted}`}>Date:</span>
                                                <span className={`font-bold ${themeClasses.textPrimary}`}>{formatDate(selectedReport.report_date)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className={`${themeClasses.textMuted}`}>Activities:</span>
                                                <span className={`font-bold ${themeClasses.textPrimary}`}>{selectedReport.activities?.length || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rejection Feedback Panel */}
                                    {(selectedReport.status?.toLowerCase() === 'rejected' || selectedReport.status?.toLowerCase() === 'dpr rejected') && (
                                        <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/30">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2 flex items-center gap-2">
                                                <Icons.AlertCircle size={12} />
                                                Rejection Feedback
                                            </label>
                                            <div className="space-y-2">
                                                <p className={`text-sm italic leading-relaxed ${isDarkTheme ? 'text-rose-200' : 'text-rose-700'}`}>
                                                    "{selectedReport.rejection_reason || 'No specific reason provided.'}"
                                                </p>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest text-right ${isDarkTheme ? 'text-rose-400/70' : 'text-rose-600/70'}`}>
                                                    — Rejected by {selectedReport.rejected_by_username || 'Reviewer'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary Stats */}
                                    {selectedReport.activities && selectedReport.activities.length > 0 && (
                                        <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                            <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${themeClasses.textSecondary}`}>
                                                Progress Summary
                                            </label>
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className={`${themeClasses.textMuted}`}>Avg. Target</span>
                                                        <span className={`font-bold ${themeClasses.textPrimary}`}>
                                                            {(selectedReport.activities.reduce((sum, act) => sum + toSafeNumber(act.target_achieved), 0) / selectedReport.activities.length).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className={`w-full rounded-full h-2 ${isDarkTheme ? 'bg-white/10' : 'bg-gray-200'}`}>
                                                        <div
                                                            className="bg-indigo-500 h-2 rounded-full transition-all"
                                                            style={{
                                                                width: `${selectedReport.activities.reduce((sum, act) => sum + toSafeNumber(act.target_achieved), 0) / selectedReport.activities.length}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                        <p className="text-lg font-black text-emerald-500">
                                                            {selectedReport.activities.filter(a => toSafeNumber(a.target_achieved) >= 80).length}
                                                        </p>
                                                        <p className={`text-[9px] uppercase ${themeClasses.textMuted}`}>Good</p>
                                                    </div>
                                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                                        <p className="text-lg font-black text-amber-500">
                                                            {selectedReport.activities.filter(a => toSafeNumber(a.target_achieved) >= 50 && toSafeNumber(a.target_achieved) < 80).length}
                                                        </p>
                                                        <p className={`text-[9px] uppercase ${themeClasses.textMuted}`}>Medium</p>
                                                    </div>
                                                    <div className="p-2 bg-rose-500/10 rounded-lg">
                                                        <p className="text-lg font-black text-rose-500">
                                                            {selectedReport.activities.filter(a => toSafeNumber(a.target_achieved) < 50).length}
                                                        </p>
                                                        <p className={`text-[9px] uppercase ${themeClasses.textMuted}`}>Low</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Approval Actions */}
                                <div className={`p-4 border-t ${themeClasses.border} ${themeClasses.bgSecondary} space-y-3`}>
                                    {canUserReview() ? (
                                        <>
                                            <button
                                                onClick={handleApprove}
                                                className="w-full py-3 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Icons.Approve size={16} />
                                                Approve Report
                                            </button>
                                            <button
                                                onClick={() => setShowRejectModal(true)}
                                                className="w-full py-3 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-500 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Icons.Reject size={16} />
                                                Reject Report
                                            </button>
                                        </>
                                    ) : user?.role === UserRole.SITE_ENGINEER && (selectedReport.status?.toLowerCase() === 'rejected' || selectedReport.status?.toLowerCase() === 'dpr rejected') ? (
                                        <button
                                            onClick={() => setShowSubmissionForm(true)}
                                            className="w-full py-3 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                                        >
                                            <Icons.Document size={16} />
                                            Edit & Resubmit
                                        </button>
                                    ) : user?.role === UserRole.SITE_ENGINEER && selectedReport.status?.toLowerCase() === 'draft' ? (
                                        <button
                                            onClick={handleSubmitDraft}
                                            className="w-full py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                        >
                                            <Icons.Upload size={16} />
                                            Submit for Review
                                        </button>
                                    ) : (
                                        <div className={`text-center py-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                            <Icons.AlertCircle className={`mx-auto mb-2 ${themeClasses.textMuted}`} size={24} />
                                            <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${themeClasses.textMuted}`}>
                                                Approval Flow Status
                                            </p>
                                            <p className={`text-sm font-black uppercase tracking-tight ${
                                                selectedReport.status?.toUpperCase() === 'APPROVED' ? 'text-emerald-500' : 
                                                selectedReport.status?.toUpperCase() === 'REJECTED' ? 'text-rose-500' : 'text-amber-500'
                                            }`}>
                                                {getStatusMessage(selectedReport.status)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center p-8 py-16">
                                <div className="text-center">
                                    <Icons.Approve className={`mx-auto mb-4 ${isDarkTheme ? 'text-white/20' : 'text-gray-300'}`} size={48} />
                                    <p className={`${themeClasses.textPrimary} font-bold`}>No Report Selected</p>
                                    <p className={`${themeClasses.textMuted} text-sm mt-2`}>
                                        Select a DPR to view approval options
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className={`${themeClasses.glassCard} w-full max-w-md rounded-2xl p-6 animate-in zoom-in-95 duration-200 border ${themeClasses.border}`}>
                        <div className="w-12 h-12 bg-rose-500/15 text-rose-500 rounded-xl flex items-center justify-center mb-4 border border-rose-500/30">
                            <Icons.Reject size={24} />
                        </div>
                        <h3 className={`text-xl font-black mb-2 uppercase tracking-tight ${themeClasses.textPrimary}`}>
                            Reject Report
                        </h3>
                        <p className={`font-bold text-sm mb-4 leading-relaxed ${themeClasses.textSecondary}`}>
                            Provide specific feedback for the Site Engineer.
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
                                Reject & Send
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DPR Submission Form Modal */}
            {showSubmissionForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-5xl my-8">
                        <DPRSubmissionForm
                            onClose={() => setShowSubmissionForm(false)}
                            onSubmit={(data) => {
                                setShowSubmissionForm(false);
                                setSuccessMessage(selectedReport?.status?.toLowerCase() === 'rejected' ? "DPR Updated & Resubmitted Successfully" : "DPR Created & Submitted Successfully");
                                setTimeout(() => setSuccessMessage(null), 3000);
                                fetchDPRs();
                            }}
                            assignedProjects={projects}
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
        </div>
    );
};

export default DPRReviewDashboard;
