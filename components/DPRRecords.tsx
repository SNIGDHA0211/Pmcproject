import React, { useState } from "react";
import { DPR, User, UserRole, Project } from "../types";
import { Icons } from "./Icons";
import DPRSubmissionForm from "./DPRSubmissionForm";
import { useTheme, getThemeClasses } from "../utils/theme";

interface DPRRecordsProps {
  dprs: DPR[];
  user: User;
  projects: Project[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onSubmitDPR: (data: {
    projectId: string;
    date: string;
    workDescription: string;
    manpower: number;
  }) => void;
}

const DPRRecords: React.FC<DPRRecordsProps> = ({
  dprs,
  user,
  projects,
  onApprove,
  onReject,
  onSubmitDPR,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDPR, setSelectedDPR] = useState<DPR | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isSubmitFormOpen, setIsSubmitFormOpen] = useState(false);

  const filteredDprs = dprs.filter(
    (d) =>
      d.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.workDescription ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRejectSubmit = () => {
    if (showRejectModal && rejectReason.trim()) {
      onReject(showRejectModal, rejectReason);
      setShowRejectModal(null);
      setRejectReason("");
    }
  };

  const assignedProjects = user.role === UserRole.SITE_ENGINEER
    ? projects
    : projects.filter((p) => p.siteEngineerIds.includes(user.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
            DPR Records
          </h2>
          <p className={`${themeClasses.textSecondary} font-bold text-sm`}>
            Daily Progress Reports tracking and management
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === UserRole.SITE_ENGINEER && (
            <button
              onClick={() => setIsSubmitFormOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 btn-primary rounded-xl text-sm font-black uppercase tracking-widest transition-all"
            >
              <Icons.Add size={18} /> Submit New DPR
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`flex items-center gap-2 px-6 py-2.5 border rounded-xl text-sm font-black transition-all ${themeClasses.buttonSecondary} ${themeClasses.border}`}
            >
              <Icons.Download size={16} className="text-indigo-300" /> Export
            </button>

            {showExportMenu && (
              <div className={`absolute right-0 mt-2 w-48 rounded-xl z-20 py-2 animate-in fade-in slide-in-from-top-2 ${themeClasses.glassCard}`}>
                <button className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-white/10 flex items-center gap-2 ${themeClasses.textSecondary}`}>
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>{" "}
                  Export All
                </button>
                <button className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-white/10 flex items-center gap-2 ${themeClasses.textSecondary}`}>
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>{" "}
                  Export All
                </button>
                <button className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-white/10 flex items-center gap-2 ${themeClasses.textSecondary}`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{" "}
                  Export Approved
                </button>
                <button className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-white/10 flex items-center gap-2 ${themeClasses.textSecondary}`}>
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>{" "}
                  Export Pending
                </button>
                <button className="w-full px-4 py-2 text-left text-xs font-bold muted hover:bg-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>{" "}
                  Export Pending
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`${themeClasses.glassCard} p-8 rounded-[3rem] shadow-2xl relative overflow-hidden ${themeClasses.border}`}>
        <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
          <div className="relative flex-1">
            <Icons.Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkTheme ? 'text-white/40' : 'text-gray-400'}`}
              size={18}
            />
            <input
              type="text"
              placeholder="Search DPR records by project or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${themeClasses.input} ${isDarkTheme ? 'focus:ring-white/10' : 'focus:ring-indigo-500/20'}`}
            />
          </div>
          <button className={`flex items-center gap-2 px-6 py-3 border rounded-xl text-sm font-black transition-all ${themeClasses.buttonSecondary} ${themeClasses.border} ${themeClasses.bgHover}`}>
            <Icons.Filter size={16} /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b bg-white/5 ${themeClasses.border}`}>
                <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest rounded-tl-xl ${themeClasses.textSecondary}`}>
                  Sr.
                </th>
                <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Date
                </th>
                <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Project Name
                </th>
                <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Description
                </th>
                <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center ${themeClasses.textSecondary}`}>
                  Manpower
                </th>
                <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center ${themeClasses.textSecondary}`}>
                  Status
                </th>
                <th className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest text-right rounded-tr-xl ${themeClasses.textSecondary}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkTheme ? 'divide-white/5' : 'divide-gray-200'}`}>
              {filteredDprs.length > 0 ? (
                filteredDprs.map((d, index) => (
                  <tr
                    key={d.id}
                    className={`group transition-colors animate-entrance ${themeClasses.bgHover}`}
                    style={{ animationDelay: `${index * 60}ms"` }}
                  >
                    <td className={`px-4 py-5 text-xs font-black ${themeClasses.textSecondary}`}>
                      {index + 1}
                    </td>
                    <td className={`px-4 py-5 text-sm font-bold ${themeClasses.textPrimary}`}>
                      {d.date}
                    </td>
                    <td className="px-4 py-5">
                      <p className={`text-sm font-black ${themeClasses.textPrimary}`}>
                        {d.projectName}
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-tighter ${themeClasses.textSecondary}`}>
                        Site ID: #{d.projectId.toUpperCase()}
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      <p className={`text-sm font-medium max-w-sm leading-relaxed ${themeClasses.textSecondary}`}>
                        {d.workDescription}
                      </p>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span className={`inline-block px-3 py-1 border rounded-lg text-sm font-black ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-gray-50'} ${themeClasses.textPrimary}`}>
                        {d.manpower}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${d.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : d.status === "REJECTED"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedDPR(d)}
                          className={`p-2 border rounded-lg transition-all ${themeClasses.border} ${isDarkTheme ? 'bg-white/5 text-contrast hover:bg-indigo-600 hover:text-white' : 'bg-gray-50 text-gray-700 hover:bg-indigo-600 hover:text-white'}`}
                        >
                          <Icons.Search size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center">
                    <Icons.Document
                      size={48}
                      className={`mx-auto mb-4 ${isDarkTheme ? 'text-white/5' : 'text-gray-200'}`}
                    />
                    <p className={`text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                      No DPR records found
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit & Tracking Detail Slide-over */}
      {selectedDPR && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className={`absolute inset-0 backdrop-blur-md ${isDarkTheme ? 'bg-black/80' : 'bg-black/60'}`}
            onClick={() => setSelectedDPR(null)}
          />
          <div className={`absolute inset-y-0 right-0 max-w-lg w-full shadow-2xl animate-in slide-in-from-right duration-500 ease-out ${isDarkTheme ? 'nav-dark border-l border-white/10' : 'bg-white border-l border-gray-200'}`}>
            <div className="h-full flex flex-col">
              <div className={`p-8 border-b bg-white/5 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full mb-3 inline-block ${isDarkTheme ? 'bg-white/10 text-indigo-300' : 'bg-indigo-100 text-indigo-800'}`}>
                      Tracking ID: {selectedDPR.id}
                    </span>
                    <h3 className={`text-2xl font-black uppercase leading-none ${themeClasses.textPrimary}`}>
                      Track DPR Status
                    </h3>
                    <p className={`text-sm font-bold mt-2 uppercase tracking-tight ${themeClasses.textSecondary}`}>
                      {selectedDPR.projectName} // {selectedDPR.date}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDPR(null)}
                    className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all ${themeClasses.border} ${isDarkTheme ? 'bg-white/10 border-white/15 text-white/60 hover:bg-white/15' : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Icons.Close size={20} />
                  </button>
                </div>
               </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* Description Box */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                      Work Specification
                    </h4>
                    <span className="text-[10px] font-black text-indigo-300 uppercase">
                      Verified Report
                    </span>
                  </div>
                  <div className={`p-6 rounded-2xl border relative group overflow-hidden ${themeClasses.border} ${isDarkTheme ? 'bg-white/6' : 'bg-gray-50'}`}>
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-600/80"></div>
                    <p className={`text-sm font-bold leading-relaxed italic ${isDarkTheme ? 'text-contrast/90' : 'text-gray-900'}`}>
                      "{selectedDPR.workDescription}"
                    </p>
                    <div className="mt-6 flex items-center gap-6">
                      <div className={`px-4 py-2 rounded-xl ${themeClasses.border} ${isDarkTheme ? 'bg-white/6' : 'bg-gray-100'}`}>
                        <p className={`text-[10px] font-black uppercase mb-1 ${themeClasses.textSecondary}`}>
                          Manpower
                        </p>
                        <p className={`text-xl font-black ${themeClasses.textPrimary}`}>
                          {selectedDPR.manpower} Units
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl ${themeClasses.border} ${isDarkTheme ? 'bg-white/6' : 'bg-gray-100'}`}>
                        <p className={`text-[10px] font-black uppercase mb-1 ${themeClasses.textSecondary}`}>
                          Submitted
                        </p>
                        <p className={`text-sm font-black ${themeClasses.textPrimary}`}>
                          {selectedDPR.submittedAt}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tracking History (Sequential Workflow) */}
                <div className="space-y-6">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    Live Approval Ledger
                  </h4>
                  <div className="relative pl-10 space-y-12">
                    {/* Vertical Line */}
                    <div className={`absolute left-[13px] top-2 bottom-2 w-[2px] ${isDarkTheme ? 'bg-white/15' : 'bg-gray-300'}`}></div>

                    {/* Stage 1: Submission */}
                    <div className="relative">
                      <div className="absolute -left-[36px] top-1 w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white ring-8 ring-white/5 shadow-lg">
                        <Icons.ArrowRight size={14} />
                      </div>
                      <div className={`p-4 rounded-2xl border ${themeClasses.border} ${isDarkTheme ? 'bg-white/6' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-sm font-black ${themeClasses.textPrimary}`}>
                            Submission Phase
                          </p>
                          <span className="text-[10px] font-black text-emerald-300 uppercase">
                            Success
                          </span>
                        </div>
                        <p className={`text-xs font-medium ${themeClasses.textSecondary}`}>
                          Site Engineer{" "}
                          <span className="text-indigo-300 font-black">
                            {selectedDPR.submittedByName}
                          </span>{" "}
                          finalized the daily report for project clearance.
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <Icons.Pending size={12} className={` ${isDarkTheme ? 'text-white/40' : 'text-gray-400'}`} />
                          <p className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>
                            {selectedDPR.submittedAt}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stage 2: Review */}
                    {selectedDPR.reviewedBy ? (
                      <div className="relative">
                        <div
                          className={`absolute -left-[36px] top-1 w-8 h-8 rounded-xl flex items-center justify-center text-white ring-8 ring-white/5 shadow-lg ${selectedDPR.status === "APPROVED"
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                            }`}
                        >
                          {selectedDPR.status === "APPROVED" ? (
                            <Icons.Approve size={14} />
                          ) : (
                            <Icons.Reject size={14} />
                          )}
                        </div>
                        <div className={`p-4 rounded-2xl border ${selectedDPR.status === "APPROVED"
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-rose-500/10 border-rose-500/30"
                          }`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className={`text-sm font-black ${themeClasses.textPrimary}`}>
                              {selectedDPR.status === "APPROVED"
                                ? "Verification Passed"
                                : "Verification Rejected"}
                            </p>
                            <span
                              className={`text-[10px] font-black uppercase ${selectedDPR.status === "APPROVED"
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                                }`}
                            >
                              Final Decision
                            </span>
                          </div>
                          <p className={`text-xs font-medium ${themeClasses.textSecondary}`}>
                            Reviewed by{" "}
                            <span className={`font-black ${themeClasses.textPrimary}`}>
                              {selectedDPR.reviewedByName}
                            </span>
                            . Status updated in organizational portfolio.
                          </p>

                          {selectedDPR.rejectionReason && (
                            <div className={`mt-4 p-4 border border-rose-500/30 rounded-xl border-l-4 border-l-rose-500/60 ${isDarkTheme ? 'bg-white/6' : 'bg-red-50'}`}>
                              <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-1">
                                Rejection Remarks
                              </p>
                              <p className={`text-xs font-bold italic leading-relaxed ${themeClasses.textPrimary}`}>
                                "{selectedDPR.rejectionReason}"
                              </p>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-2">
                            <Icons.History
                              size={12}
                              className={` ${isDarkTheme ? 'text-white/40' : 'text-gray-400'}`}
                            />
                            <p className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>
                              {selectedDPR.reviewedAt}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className={`absolute -left-[36px] top-1 w-8 h-8 rounded-xl border-2 flex items-center justify-center ring-8 shadow-sm ${isDarkTheme ? 'bg-white/10 border-white/20 text-white/40 ring-white/30' : 'bg-gray-100 border-gray-300 text-gray-400 ring-gray-200'}`}>
                          <Icons.Pending size={14} className="animate-pulse" />
                        </div>
                        <div className={`p-4 rounded-2xl border border-dashed ${themeClasses.border} ${isDarkTheme ? 'bg-white/6' : 'bg-gray-50'}`}>
                          <p className={`text-sm font-black ${isDarkTheme ? 'text-white/60' : 'text-gray-500'}`}>
                            Awaiting Team Lead Review
                          </p>
                          <p className={`text-xs font-medium mt-1 uppercase tracking-widest ${themeClasses.textSecondary}`}>
                            Pending Verification Step
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`p-8 border-t space-y-3 ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-gray-50'}`}>
                {/* Approve/Reject buttons for Team Lead, Coordinator, PMC Head */}
                {(user.role === UserRole.TEAM_LEAD || user.role === UserRole.COORDINATOR || user.role === UserRole.PMC_HEAD) &&
                  selectedDPR.status !== 'APPROVED' &&
                  selectedDPR.status !== 'REJECTED' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          onApprove(selectedDPR.id);
                          setSelectedDPR(null);
                        }}
                        className="flex-1 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-500 transition-all"
                      >
                        <Icons.Approve size={16} className="inline mr-2" />
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectModal(selectedDPR.id)}
                        className="flex-1 py-4 bg-rose-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-500 transition-all"
                      >
                        <Icons.Reject size={16} className="inline mr-2" />
                        Reject
                      </button>
                    </div>
                  )}
                <button
                  onClick={() => setSelectedDPR(null)}
                  className="w-full py-4 btn-primary rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Return to Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
            <div className={`fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm p-4 ${isDarkTheme ? 'bg-black/90' : 'bg-black/70'}`}>
          <div className={`${isDarkTheme ? 'glass-card' : 'glass-card-light'} w-full max-w-md rounded-[2rem] p-10 animate-in zoom-in-95 duration-200`}>
            <div className="w-16 h-16 bg-rose-500/15 text-rose-300 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/30">
              <Icons.Reject size={32} />
            </div>
            <h3 className={`text-3xl font-black mb-2 uppercase tracking-tight ${isDarkTheme ? 'text-contrast' : 'text-gray-900'}`}>
              Reject Report
            </h3>
            <p className={`font-bold text-sm tracking-tight mb-8 leading-relaxed ${isDarkTheme ? 'muted' : 'text-gray-600'}`}>
              Provide specific feedback for the Site Engineer. They must rectify
              and resubmit for approval.
            </p>
            <textarea
              className={`w-full h-40 p-5 rounded-2xl focus:ring-4 focus:ring-rose-500/20 focus:border-rose-500/40 outline-none transition-all font-medium text-sm ${isDarkTheme ? 'glass-input' : 'bg-gray-100 border border-gray-300'}`}
              placeholder="E.g. Daily excavation logs show 20 units, but report says 25. Please verify site attendance records..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                className={`flex-1 px-4 py-4 font-black text-xs uppercase rounded-2xl transition-colors ${isDarkTheme ? 'text-white/70 hover:bg-white/10 bg-white/10 border border-white/15' : 'text-gray-600 hover:bg-gray-100 bg-gray-100 border border-gray-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-4 bg-rose-600 text-white font-black text-xs uppercase rounded-2xl hover:bg-rose-500/90 transition-all disabled:opacity-50"
              >
                Reject & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubmitFormOpen && (
        <DPRSubmissionForm
          assignedProjects={assignedProjects}
          onClose={() => setIsSubmitFormOpen(false)}
          onSubmit={(data) => {
            onSubmitDPR(data);
            setIsSubmitFormOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default DPRRecords;
