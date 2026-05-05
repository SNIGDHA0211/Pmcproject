import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Project } from '../types';
import { authApi, dprApi } from '../services/api';

interface ActivityRow {
  id: string;
  date: string;
  activity: string;
  deliverables: string;
  targetAchieved: number;
  nextDayPlan: string;
  remarks: string;
}

interface DPRSubmissionFormProps {
  onClose: () => void;
  onSubmit: (dprData: any) => void;
  assignedProjects: Project[];
  existingDPR?: any; // Add prop for pre-filling data
}

const DPRSubmissionForm: React.FC<DPRSubmissionFormProps> = ({ onClose, onSubmit, assignedProjects, existingDPR }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(assignedProjects[0]?.id || '');
  const [jobNo, setJobNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activities, setActivities] = useState<ActivityRow[]>([
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      activity: '',
      deliverables: '',
      targetAchieved: 0,
      nextDayPlan: '',
      remarks: ''
    }
  ]);
  const [unresolvedIssues, setUnresolvedIssues] = useState('');
  const [pendingLetters, setPendingLetters] = useState('');
  const [qualityStatus, setQualityStatus] = useState('');
  const [importantIncidents, setImportantIncidents] = useState('');
  const [billingStatus, setBillingStatus] = useState('');
  const [gfcStatus, setGfcStatus] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [designation, setDesignation] = useState('');

  // Pre-fill form if existingDPR is provided
  useEffect(() => {
    if (existingDPR) {
      // Find matching project ID based on project name
      const matchedProject = assignedProjects.find(p => p.title === existingDPR.project_name);
      if (matchedProject) setSelectedProjectId(matchedProject.id);
      
      setJobNo(existingDPR.job_no || '');
      
      // Format date correctly
      if (existingDPR.report_date) {
        try {
          // Handle DD/MM/YYYY format from mock data or YYYY-MM-DD from backend
          if (existingDPR.report_date.includes('/')) {
            const [day, month, year] = existingDPR.report_date.split('/');
            setDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
          } else {
            setDate(existingDPR.report_date);
          }
        } catch (e) {
          console.error("Error parsing date:", e);
        }
      }

      setUnresolvedIssues(existingDPR.unresolved_issues || '');
      setPendingLetters(existingDPR.pending_letters || '');
      setQualityStatus(existingDPR.quality_status || '');
      setImportantIncidents(existingDPR.next_day_incident || '');
      setBillingStatus(existingDPR.bill_status || '');
      setGfcStatus(existingDPR.gfc_status || '');
      setIssuedBy(existingDPR.issued_by || '');
      setDesignation(existingDPR.designation || '');

      // Map activities
      if (existingDPR.activities && existingDPR.activities.length > 0) {
        setActivities(existingDPR.activities.map((act: any, index: number) => ({
          id: act.id?.toString() || Date.now().toString() + index,
          date: act.date || date,
          activity: act.activity || '',
          deliverables: act.deliverables || '',
          targetAchieved: act.target_achieved || 0,
          nextDayPlan: act.next_day_plan || '',
          remarks: act.remarks || ''
        })));
      }
    }
  }, [existingDPR, assignedProjects]);

  const selectedProject = assignedProjects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    if (issuedBy.trim() && designation.trim()) return;

    const prefillUser = async () => {
      try {
        const response = await authApi.getUserProfile();
        const user = response.data || {};
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        const resolvedName = fullName || user.username || '';
        const resolvedRole = user.primary_role || (Array.isArray(user.groups) ? user.groups[0] : '') || 'Site Engineer';

        if (!issuedBy.trim() && resolvedName) setIssuedBy(resolvedName);
        if (!designation.trim() && resolvedRole) setDesignation(resolvedRole);
      } catch (err) {
        // Keep form usable even if profile prefill fails.
      }
    };

    prefillUser();
  }, []);

  // Update activity dates when main date changes
  useEffect(() => {
    setActivities(prev => prev.map(act => ({ ...act, date })));
  }, [date]);

  const addActivityRow = () => {
    const newRow: ActivityRow = {
      id: Date.now().toString(),
      date,
      activity: '',
      deliverables: '',
      targetAchieved: 0,
      nextDayPlan: '',
      remarks: ''
    };
    setActivities([...activities, newRow]);
    // Auto-scroll to new row
    setTimeout(() => {
      const element = document.getElementById(`activity-${newRow.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const removeActivityRow = (id: string) => {
    if (activities.length > 1) {
      setActivities(activities.filter(act => act.id !== id));
    }
  };

  const updateActivity = (id: string, field: keyof ActivityRow, value: any) => {
    setActivities(prev => prev.map(act => 
      act.id === id ? { ...act, [field]: value } : act
    ));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildPayload = () => ({
    project: Number(selectedProjectId),
    project_name: selectedProject?.title || '',
    job_no: jobNo || "",
    report_date: date,
    unresolved_issues: unresolvedIssues || "",
    pending_letters: pendingLetters || "",
    quality_status: qualityStatus || "",
    next_day_incident: importantIncidents || "",
    bill_status: billingStatus || "",
    gfc_status: gfcStatus || "",
    issued_by: issuedBy.trim(),
    designation: designation.trim(),
    activities: activities
      .filter(act => act.activity.trim())
      .map(act => ({
        date: act.date,
        activity: act.activity,
        deliverables: act.deliverables || "",
        target_achieved: (Number(act.targetAchieved) || 0).toFixed(2),
        next_day_plan: act.nextDayPlan || "",
        remarks: act.remarks || ""
      }))
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }
    
    if (activities.length === 0 || activities.every(act => !act.activity.trim())) {
      alert('Please add at least one activity');
      return;
    }
    if (!issuedBy.trim()) {
      alert('Please enter Issued By');
      return;
    }
    if (!designation.trim()) {
      alert('Please enter Designation');
      return;
    }

    setIsSubmitting(true);

    try {
      const dprPayload = buildPayload();

      // Submit to DPR API endpoint
      let response;
      if (existingDPR && existingDPR.id) {
        // Update existing DPR
        response = await dprApi.patchDPR(existingDPR.id, dprPayload);
        // Re-submit to workflow
        await dprApi.submitDPR(existingDPR.id, 'Site Engineer');
        console.log('DPR updated and resubmitted successfully:', response.data);
      } else {
        // Create new DPR
        response = await dprApi.createDPR(dprPayload);
        // After creating, submit it to the workflow
        if (response.data && response.data.id) {
          await dprApi.submitDPR(response.data.id, 'Site Engineer');
        }
        console.log('DPR created and submitted successfully:', response.data);
      }
      
      const submissionData = {
        projectId: selectedProjectId,
        projectName: selectedProject?.title,
        jobNo,
        date: new Date(date).toLocaleDateString('en-GB'),
        activities: activities.filter(act => act.activity.trim()),
        unresolvedIssues,
        pendingLetters,
        qualityStatus,
        importantIncidents,
        billingStatus,
        gfcStatus,
        issuedBy,
        designation,
        status: 'PENDING'
      };

      alert('DPR submitted successfully!');
      window.dispatchEvent(
        new CustomEvent('pmc:notification', {
          detail: {
            type: 'dpr_submitted',
            title: 'DPR Submitted',
            message: `DPR submitted for "${selectedProject?.title || ''}" by ${issuedBy.trim()}.`,
            timestamp: new Date().toISOString(),
            data: {
              project_id: selectedProjectId,
              dpr_id: response?.data?.id,
            },
          },
        })
      );
      onSubmit(submissionData);
      onClose();
    } catch (error: any) {
      console.error('DPR Submission Error:', error);
      const errorMessage = error.response?.data 
        ? (typeof error.response.data === 'string' 
            ? error.response.data 
            : Object.entries(error.response.data)
                .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
                .join("\n"))
        : error.message || "Failed to submit DPR. Please check your network connection.";
      
      alert(`Failed to submit DPR.\n\n${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const handleSaveDraft = async () => {
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }

    setIsSavingDraft(true);

    try {
      const draftPayload = buildPayload();

      if (existingDPR && existingDPR.id) {
        await dprApi.patchDPR(existingDPR.id, draftPayload);
      } else {
        await dprApi.createDPR(draftPayload);
      }

      alert('Draft saved successfully!');
      onClose();
    } catch (error: any) {
      console.error('Draft Save Error:', error);
      const errorMessage = error.response?.data
        ? (typeof error.response.data === 'string'
            ? error.response.data
            : Object.entries(error.response.data)
                .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
                .join("\n"))
        : error.message || "Failed to save draft.";
      alert(`Failed to save draft.\n\n${errorMessage}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] border border-white/10">
        {/* Header */}
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5 sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-black text-contrast uppercase tracking-tight">Daily Progress Report</h3>
            <p className="muted font-bold text-xs tracking-tight uppercase">Site Execution Management System</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className="px-4 py-2 muted font-black text-xs uppercase tracking-widest bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingDraft ? 'Saving...' : 'Save as Draft'}
            </button>
            <button 
              onClick={onClose} 
              className="p-3 bg-white/5 border border-white/10 text-white/40 hover:text-rose-500 rounded-2xl transition-all shadow-sm"
            >
              <Icons.Reject size={20} />
            </button>
          </div>
        </div>

        {/* Main Form Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <form id="dpr-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Header Info */}
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <h4 className="text-sm font-black text-contrast uppercase tracking-widest mb-6">Project Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Project Name</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                  >
                    {assignedProjects.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900">{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Job No</label>
                  <input
                    type="text"
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="Enter Job Number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Activities - Card Based */}
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black text-contrast uppercase tracking-widest">Activities & Progress</h4>
                <button
                  type="button"
                  onClick={addActivityRow}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  <Icons.Add size={16} />
                  Add Activity
                </button>
              </div>
              
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    id={`activity-${activity.id}`}
                    className="p-6 bg-white/5 border border-white/10 rounded-2xl relative group hover:border-indigo-500/30 transition-all"
                  >
                    {activities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeActivityRow(activity.id)}
                        className="absolute top-4 right-4 p-2 bg-white/5 border border-white/10 text-white/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Icons.Reject size={16} />
                      </button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Date</label>
                        <input
                          type="date"
                          value={activity.date}
                          onChange={(e) => updateActivity(activity.id, 'date', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Target Achieved %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={activity.targetAchieved || ''}
                          onChange={(e) => updateActivity(activity.id, 'targetAchieved', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Activity</label>
                        <input
                          type="text"
                          value={activity.activity}
                          onChange={(e) => updateActivity(activity.id, 'activity', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                          placeholder="Enter activity description"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Deliverables</label>
                        <input
                          type="text"
                          value={activity.deliverables}
                          onChange={(e) => updateActivity(activity.id, 'deliverables', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                          placeholder="Enter deliverables"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Next Day Planned Work</label>
                        <input
                          type="text"
                          value={activity.nextDayPlan}
                          onChange={(e) => updateActivity(activity.id, 'nextDayPlan', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                          placeholder="Next day work plan"
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Remarks</label>
                        <input
                          type="text"
                          value={activity.remarks}
                          onChange={(e) => updateActivity(activity.id, 'remarks', e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                          placeholder="Remarks"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Additional Details */}
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <h4 className="text-sm font-black text-contrast uppercase tracking-widest mb-6">Additional Details</h4>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Unresolved Issues</label>
                  <textarea
                    value={unresolvedIssues}
                    onChange={(e) => setUnresolvedIssues(e.target.value)}
                    rows={3}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none"
                    placeholder="Describe any unresolved issues..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                    Pending Letters
                    <span className="text-[9px] font-normal text-white/30 ml-2 normal-case">
                      (Any letters remaining unanswered - client/contractor with reference)
                    </span>
                  </label>
                  <textarea
                    value={pendingLetters}
                    onChange={(e) => setPendingLetters(e.target.value)}
                    rows={3}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none"
                    placeholder="List pending letters with references..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Quality Status</label>
                  <textarea
                    value={qualityStatus}
                    onChange={(e) => setQualityStatus(e.target.value)}
                    rows={3}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none"
                    placeholder="Describe quality status (e.g. All quality checks passed. Material samples tested and approved.)"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Important Incidents (Next Day)</label>
                  <textarea
                    value={importantIncidents}
                    onChange={(e) => setImportantIncidents(e.target.value)}
                    rows={3}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none"
                    placeholder="Describe important incidents for next day..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Billing Status</label>
                    <input
                      type="text"
                      value={billingStatus}
                      onChange={(e) => setBillingStatus(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="Enter billing status"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">GFC Drawings Status</label>
                    <input
                      type="text"
                      value={gfcStatus}
                      onChange={(e) => setGfcStatus(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="Enter GFC drawings status"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Footer */}
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <h4 className="text-sm font-black text-contrast uppercase tracking-widest mb-6">Signature & Authorization</h4>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Issued By</label>
                    <input
                      type="text"
                      value={issuedBy}
                      onChange={(e) => setIssuedBy(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-contrast outline-none focus:ring-4 focus:ring-indigo-500/10"
                      placeholder="Enter designation"
                    />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-8 py-4 muted font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="dpr-form"
            disabled={isSubmitting}
            className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-contrast font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit DPR'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DPRSubmissionForm;
