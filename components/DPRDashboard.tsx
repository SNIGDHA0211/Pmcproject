import React, { useState, useEffect } from "react";
import { Icons } from "./Icons";

// Types for the new DPR system
interface DPRActivity {
  id: number;
  date: string;
  activity: string;
  deliverables: string;
  target_achieved: number;
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
}

interface DPRDashboardProps {
  api: any; // API instance from services/api.ts
}

const DPRDashboard: React.FC<DPRDashboardProps> = ({ api }) => {
  const [reports, setReports] = useState<DailyProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState({
    project_name: "",
    date: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

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

      setReports(response.data.results || response.data);
    } catch (err: any) {
      console.error("Failed to fetch DPRs:", err);
      setError(err.response?.data?.detail || "Failed to load DPRs");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (reportId: number) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedReports(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB");
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60 text-sm">Loading DPRs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <Icons.AlertCircle className="mx-auto mb-4 text-rose-500" size={48} />
        <p className="text-rose-400 font-bold">{error}</p>
        <button
          onClick={fetchDPRs}
          className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-contrast uppercase tracking-tight">
            Daily Progress Reports
          </h2>
          <p className="muted text-[10px] font-black uppercase tracking-widest">
            Dashboard View
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card bg-white/50 rounded-2xl p-6 border border-white/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest muted mb-2">
              Project Name
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Filter by project..."
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold text-contrast placeholder-white/40 outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                    onClick={() => setFilters(prev => ({ ...prev, project_name: searchTerm }))}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold text-contrast transition-all"
                >
                    Search
                </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest muted mb-2">
              Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold text-contrast outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ project_name: "", date: "" });
                setSearchTerm("");
              }}
              className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold text-contrast transition-all"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Icons.Document className="mx-auto mb-4 text-white/20" size={48} />
          <p className="text-white/60 font-bold">No DPRs found</p>
          <p className="text-white/40 text-sm mt-2">
            {filters.project_name || filters.date
              ? "Try adjusting your filters"
              : "Create your first DPR"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="glass-card bg-white/50 rounded-2xl overflow-hidden border border-white/50"
            >
              {/* Report Header */}
              <div
                className="p-6 cursor-pointer hover:bg-white/10 transition-all"
                onClick={() => toggleExpand(report.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-black text-contrast">
                        {report.project_name}
                      </h3>
                      <span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase text-contrast">
                        {report.job_no}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-white/70">
                      <span className="flex items-center gap-2">
                        <Icons.Calendar size={14} />
                        {formatDate(report.report_date)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Icons.User size={14} />
                        {report.issued_by} ({report.designation})
                      </span>
                      <span className="flex items-center gap-2">
                        <Icons.Activity size={14} />
                        {report.activities?.length || 0} Activities
                      </span>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white/10 rounded-xl transition-all">
                    <Icons.ChevronDown
                      size={20}
                      className={`transition-transform ${
                        expandedReports.has(report.id) ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedReports.has(report.id) && (
                <div className="border-t border-white/20 p-6 space-y-6 animate-in slide-in-from-top-2">
                  {/* Summary Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.unresolved_issues && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest muted mb-1 block">
                          Unresolved Issues
                        </label>
                        <p className="text-sm text-contrast">{report.unresolved_issues}</p>
                      </div>
                    )}
                    {report.pending_letters && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest muted mb-1 block">
                          Pending Letters
                        </label>
                        <p className="text-sm text-contrast">{report.pending_letters}</p>
                      </div>
                    )}
                    {report.quality_status && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest muted mb-1 block">
                          Quality Status
                        </label>
                        <p className="text-sm text-contrast">{report.quality_status}</p>
                      </div>
                    )}
                    {report.bill_status && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest muted mb-1 block">
                          Bill Status
                        </label>
                        <p className="text-sm text-contrast">{report.bill_status}</p>
                      </div>
                    )}
                    {report.gfc_status && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest muted mb-1 block">
                          GFC Status
                        </label>
                        <p className="text-sm text-contrast">{report.gfc_status}</p>
                      </div>
                    )}
                    {report.next_day_incident && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest muted mb-1 block">
                          Next Day Incident
                        </label>
                        <p className="text-sm text-contrast">{report.next_day_incident}</p>
                      </div>
                    )}
                  </div>

                  {/* Activities Table */}
                  {report.activities && report.activities.length > 0 && (
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest muted mb-4">
                        Activities
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-white/10 border-b border-white/20">
                              <th className="px-4 py-3 text-[10px] font-black muted uppercase tracking-widest">
                                Date
                              </th>
                              <th className="px-4 py-3 text-[10px] font-black muted uppercase tracking-widest">
                                Activity
                              </th>
                              <th className="px-4 py-3 text-[10px] font-black muted uppercase tracking-widest">
                                Deliverables
                              </th>
                              <th className="px-4 py-3 text-[10px] font-black muted uppercase tracking-widest text-right">
                                Target %
                              </th>
                              <th className="px-4 py-3 text-[10px] font-black muted uppercase tracking-widest">
                                Next Day Plan
                              </th>
                              <th className="px-4 py-3 text-[10px] font-black muted uppercase tracking-widest">
                                Remarks
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {report.activities.map((activity) => (
                              <tr key={activity.id} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-xs font-semibold text-contrast">
                                  {formatDate(activity.date)}
                                </td>
                                <td className="px-4 py-3 text-xs text-contrast">
                                  {activity.activity}
                                </td>
                                <td className="px-4 py-3 text-xs text-white/70">
                                  {activity.deliverables || "-"}
                                </td>
                                <td className="px-4 py-3 text-xs font-black text-contrast text-right">
                                  {activity.target_achieved.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3 text-xs text-white/70">
                                  {activity.next_day_plan || "-"}
                                </td>
                                <td className="px-4 py-3 text-xs text-white/70">
                                  {activity.remarks || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DPRDashboard;
