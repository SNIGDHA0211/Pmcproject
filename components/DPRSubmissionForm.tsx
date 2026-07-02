import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Project, MonthlyScope, MonthlyScopeCategory, MonthlyScopeSubcategory } from '../types';
import { authApi, dprApi, monthlyScopeApi } from '../services/api';
import { useTheme, getThemeClasses } from '../utils/theme';

interface ScopeActivity {
  id: string;
  category: string;
  subcategory: string;
  scopeId: string;
  scope?: MonthlyScope;
  executedQuantity: number;
  nextDayPlannedWork: string;
  remarks: string;
  // Computed fields
  plannedQuantity?: number;
  unit?: string;
  cumulativeQuantity?: number;
  remainingQuantity?: number;
  progressPercentage?: number;
}

interface DPRSubmissionFormProps {
  onClose: () => void;
  onSubmit: (dprData: any) => void;
  assignedProjects: Project[];
  existingDPR?: any; // Add prop for pre-filling data
}

function DPRSubmissionForm({ onClose, onSubmit, assignedProjects, existingDPR }: DPRSubmissionFormProps) {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [selectedProjectId, setSelectedProjectId] = useState(assignedProjects[0]?.id || '');
  const [jobNo, setJobNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Activities state - now scope-based
  const [activities, setActivities] = useState<ScopeActivity[]>([
    {
      id: '1',
      category: '',
      subcategory: '',
      scopeId: '',
      executedQuantity: 0,
      nextDayPlannedWork: '',
      remarks: ''
    }
  ]);

  // Global scope data for all activities
  const [categories, setCategories] = useState<MonthlyScopeCategory[]>([]);
  const [availableScopes, setAvailableScopes] = useState<MonthlyScope[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingScopes, setLoadingScopes] = useState(false);
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

      // Map scope-based activities
      if (existingDPR.activities && existingDPR.activities.length > 0) {
        setActivities(existingDPR.activities.map((act: any, index: number) => ({
          id: act.id?.toString() || Date.now().toString() + index,
          category: act.category || '',
          subcategory: act.subcategory || '',
          scopeId: act.scope?.toString() || act.scope_id?.toString() || '',
          executedQuantity: act.executed_quantity || 0,
          nextDayPlannedWork: act.next_day_planned_work || '',
          remarks: act.remarks || '',
          // Scope data will be populated when scope is selected
          scope: act.scope || undefined
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

  const addActivity = () => {
    const newActivity: ScopeActivity = {
      id: Date.now().toString(),
      category: '',
      subcategory: '',
      scopeId: '',
      executedQuantity: 0,
      nextDayPlannedWork: '',
      remarks: ''
    };
    setActivities([...activities, newActivity]);
    // Auto-scroll to new activity
    setTimeout(() => {
      const element = document.getElementById(`activity-${newActivity.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const removeActivity = (id: string) => {
    if (activities.length > 1) {
      setActivities(activities.filter(act => act.id !== id));
    }
  };

  const updateActivity = (id: string, field: keyof ScopeActivity, value: any) => {
    setActivities(prev => prev.map(act => {
      if (act.id === id) {
        const updatedAct = { ...act, [field]: value };

        // If scopeId changed, fetch and populate scope data
        if (field === 'scopeId' && value) {
          const selectedScope = availableScopes.find(s => s.id.toString() === value);
          if (selectedScope) {
            updatedAct.scope = selectedScope;
            updatedAct.plannedQuantity = selectedScope.planned_quantity;
            updatedAct.unit = selectedScope.unit;
            const currentCum = (selectedScope.cumulative_quantity || 0);
            updatedAct.cumulativeQuantity = currentCum + (updatedAct.executedQuantity || 0);
            updatedAct.remainingQuantity = Math.max(0, (selectedScope.planned_quantity || 0) - (updatedAct.cumulativeQuantity || 0));
            updatedAct.progressPercentage = Math.min(100, ((updatedAct.cumulativeQuantity || 0) / (selectedScope.planned_quantity || 1)) * 100);
          }
        }

        // If executedQuantity changed, recalculate cumulative and remaining
        if (field === 'executedQuantity' && updatedAct.scope) {
          const currentCum = (updatedAct.scope.cumulative_quantity || 0);
          updatedAct.cumulativeQuantity = currentCum + (Number(value) || 0);
          updatedAct.remainingQuantity = Math.max(0, (updatedAct.scope.planned_quantity || 0) - (updatedAct.cumulativeQuantity || 0));
          updatedAct.progressPercentage = Math.min(100, ((updatedAct.cumulativeQuantity || 0) / (updatedAct.scope.planned_quantity || 1)) * 100);
        }

        return updatedAct;
      }
      return act;
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scope-related functions
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await monthlyScopeApi.getCategories();
      const categoriesData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchAvailableScopes = async () => {
    if (!selectedProjectId) return;

    setLoadingScopes(true);
    try {
      const response = await monthlyScopeApi.getMyScopes({
        project: selectedProjectId
      });
      const scopesData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setAvailableScopes(scopesData);
    } catch (error) {
      console.error('Failed to fetch available scopes:', error);
      setAvailableScopes([]);
    } finally {
      setLoadingScopes(false);
    }
  };

  // Get subcategories for a specific category
  const getSubcategoriesForCategory = (categoryId: string) => {
    const category = categories.find(c => c.id.toString() === categoryId);
    return category?.subcategories || [];
  };

  // Get categories that actually have scopes assigned to this project
  const getProjectCategories = () => {
    if (availableScopes.length === 0) return categories;
    
    // We want to show categories that have at least one scope in availableScopes
    const projectCategoryIds = new Set(availableScopes.map(s => 
      typeof s.category === 'object' ? (s.category as any).id?.toString() : s.category?.toString()
    ));

    const projectCategories = categories.filter(cat => projectCategoryIds.has(cat.id.toString()));
    
    // If we have scopes but their categories aren't in the master list, synthesize them
    if (projectCategories.length === 0 && availableScopes.length > 0) {
      const synthesized: MonthlyScopeCategory[] = [];
      availableScopes.forEach(s => {
        const id = typeof s.category === 'object' ? (s.category as any).id : s.category;
        const name = s.category_name || `Category ${id}`;
        if (id && !synthesized.some(c => c.id === id)) {
          synthesized.push({ id: Number(id), name, subcategories: [] });
        }
      });
      return synthesized;
    }
    
    return projectCategories.length > 0 ? projectCategories : categories;
  };

  // Get subcategories that actually have scopes assigned to this project and category
  const getProjectSubcategories = (categoryId: string) => {
    const allSubcats = getSubcategoriesForCategory(categoryId);
    if (availableScopes.length === 0) return allSubcats;

    const projectSubcatIds = new Set(availableScopes
      .filter(s => {
        const sCatId = typeof s.category === 'object' ? (s.category as any).id : s.category;
        return String(sCatId) === String(categoryId);
      })
      .map(s => typeof s.subcategory === 'object' ? (s.subcategory as any).id?.toString() : s.subcategory?.toString())
    );

    const projectSubcats = allSubcats.filter(sub => projectSubcatIds.has(sub.id.toString()));

    // Synthesize if missing from master list
    if (projectSubcats.length === 0) {
      const synthesized: MonthlyScopeSubcategory[] = [];
      availableScopes.forEach(s => {
        const sCatId = typeof s.category === 'object' ? (s.category as any).id : s.category;
        const id = typeof s.subcategory === 'object' ? (s.subcategory as any).id : s.subcategory;
        const name = s.subcategory_name || `Subcategory ${id}`;
        if (String(sCatId) === String(categoryId) && id && !synthesized.some(sub => sub.id === id)) {
          synthesized.push({ id: Number(id), name, category_id: Number(categoryId) });
        }
      });
      return synthesized.length > 0 ? synthesized : allSubcats;
    }

    return projectSubcats;
  };

  // Get scopes filtered by category and subcategory
  const getScopesForFilters = (categoryId?: string, subcategoryId?: string) => {
    return availableScopes.filter(scope => {
      // Handle both ID (number) and full object if returned by API
      const sCatId = typeof scope.category === 'object' ? (scope.category as any).id : scope.category;
      const sSubId = typeof scope.subcategory === 'object' ? (scope.subcategory as any).id : scope.subcategory;

      if (categoryId && String(sCatId) !== String(categoryId)) return false;
      if (subcategoryId && String(sSubId) !== String(subcategoryId)) return false;
      return true;
    });
  };

  // Effect to fetch categories and scopes on mount and when project changes
  useEffect(() => {
    fetchCategories();
    fetchAvailableScopes();
  }, [selectedProjectId]);

  const buildPayload = () => ({
    project: selectedProjectId,
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
    // Activities array with scope data
    activities: activities
      .filter(act => act.scopeId && act.executedQuantity > 0)
      .map(act => ({
        scope: Number(act.scopeId),
        executed_quantity: act.executedQuantity,
        remarks: act.remarks || "",
        next_day_planned_work: act.nextDayPlannedWork || ""
      }))
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }

    if (activities.length === 0) {
      alert('Please add at least one activity');
      return;
    }

    // Validate each activity
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      if (!activity.scopeId) {
        alert(`Activity ${i + 1}: Please select a scope`);
        return;
      }
      if (activity.executedQuantity <= 0) {
        alert(`Activity ${i + 1}: Please enter a valid executed quantity`);
        return;
      }
      if (activity.scope && activity.executedQuantity > (activity.scope.planned_quantity || 0) - (activity.scope.cumulative_quantity || 0)) {
        alert(`Activity ${i + 1}: Executed quantity cannot exceed remaining quantity`);
        return;
      }
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
        activities: activities.filter(act => act.scopeId && act.executedQuantity > 0),
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
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${
      isDarkTheme
        ? 'bg-black/60 backdrop-blur-md'
        : 'bg-white/5 backdrop-blur-sm'
    }`}>
      <div className={`w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh] ${themeClasses.glassCard} ${themeClasses.border}`}>
        {/* Header */}
        <div className={`p-8 ${themeClasses.border} flex items-center justify-between ${themeClasses.bgSecondary} sticky top-0 z-10`}>
          <div>
            <h3 className={`text-2xl font-black ${themeClasses.textPrimary} uppercase tracking-tight`}>Daily Progress Report</h3>
            <p className={`${themeClasses.textSecondary} font-bold text-xs tracking-tight uppercase`}>Site Execution Management System</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className={`px-4 py-2 ${themeClasses.textSecondary} font-black text-xs uppercase tracking-widest ${themeClasses.buttonSecondary} ${themeClasses.border} rounded-2xl hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSavingDraft ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={onClose}
              className={`p-3 ${themeClasses.buttonSecondary} ${themeClasses.textMuted} hover:text-rose-500 rounded-2xl transition-all shadow-sm`}
            >
              <Icons.Reject size={20} />
            </button>
          </div>
        </div>

        {/* Main Form Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <form id="dpr-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Project Information */}
            <div className={`${themeClasses.glassCard} p-6 rounded-2xl ${themeClasses.border}`}>
              <h4 className={`text-sm font-black ${themeClasses.textPrimary} uppercase tracking-widest mb-6`}>Project Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Project Name</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl font-bold text-sm ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                  >
                    {assignedProjects.map(p => (
                      <option key={p.id} value={p.id} className={isDarkTheme ? "bg-slate-900" : "bg-white"}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Job No</label>
                  <input
                    type="text"
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl font-bold text-sm ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                    placeholder="Enter Job Number"
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl font-bold text-sm ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Scope-Based Activities */}
            <div className={`${themeClasses.glassCard} p-6 rounded-2xl ${themeClasses.border}`}>
              <div className="flex items-center justify-between mb-6">
                <h4 className={`text-sm font-black ${themeClasses.textPrimary} uppercase tracking-widest`}>Scope-Based Activities</h4>
                <button
                  type="button"
                  onClick={addActivity}
                  className={`flex items-center gap-2 px-4 py-2 ${themeClasses.buttonPrimary} rounded-2xl text-xs font-black uppercase tracking-widest transition-all`}
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
                    className={`p-6 ${themeClasses.bgSecondary} ${themeClasses.border} rounded-2xl relative group hover:border-indigo-500/30 transition-all`}
                  >
                    {activities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeActivity(activity.id)}
                        className={`absolute top-4 right-4 p-2 ${themeClasses.buttonSecondary} ${themeClasses.textMuted} hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100`}
                      >
                        <Icons.Reject size={16} />
                      </button>
                    )}

                    {/* Activity Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-8 h-8 ${themeClasses.buttonPrimary} rounded-xl flex items-center justify-center text-sm font-black`}>
                        {index + 1}
                      </div>
                      <h5 className={`text-sm font-black ${themeClasses.textPrimary} uppercase tracking-widest`}>
                        Activity {index + 1}
                      </h5>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Category */}
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Category</label>
                        <select
                          value={activity.category}
                          onChange={(e) => updateActivity(activity.id, 'category', e.target.value)}
                          className={`w-full px-4 py-3 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                        >
                          <option value="">
                            {loadingCategories ? 'Loading...' : 'Select Category'}
                          </option>
                          {getProjectCategories().map(category => (
                            <option key={category.id} value={category.id} className={isDarkTheme ? "bg-slate-900" : "bg-white"}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Subcategory */}
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Subcategory</label>
                        <select
                          value={activity.subcategory}
                          onChange={(e) => updateActivity(activity.id, 'subcategory', e.target.value)}
                          disabled={!activity.category}
                          className={`w-full px-4 py-3 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50`}
                        >
                          <option value="">
                            {!activity.category
                              ? 'Select category first'
                              : getProjectSubcategories(activity.category).length === 0
                                ? 'No subcategories available'
                                : 'Select Subcategory'
                            }
                          </option>
                          {getProjectSubcategories(activity.category).map(subcategory => (
                            <option key={subcategory.id} value={subcategory.id} className={isDarkTheme ? "bg-slate-900" : "bg-white"}>
                              {subcategory.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Scope */}
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Scope</label>
                        <select
                          value={activity.scopeId}
                          onChange={(e) => updateActivity(activity.id, 'scopeId', e.target.value)}
                          disabled={!activity.category || !activity.subcategory}
                          className={`w-full px-4 py-3 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50`}
                        >
                          <option value="">
                            {loadingScopes
                              ? 'Loading Scopes...'
                              : !activity.category || !activity.subcategory
                                ? 'Select category and subcategory first'
                                : getScopesForFilters(activity.category, activity.subcategory).length === 0
                                  ? 'No scopes available'
                                  : 'Select Scope'
                            }
                          </option>
                          {getScopesForFilters(activity.category, activity.subcategory).map(scope => (
                            <option key={scope.id} value={scope.id} className={isDarkTheme ? "bg-slate-900" : "bg-white"}>
                              {scope.description || `Scope ${scope.id}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Executed Quantity */}
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Executed Quantity</label>
                        <input
                          type="number"
                          value={activity.executedQuantity}
                          onChange={(e) => updateActivity(activity.id, 'executedQuantity', Math.max(0, Number(e.target.value)))}
                          min="0"
                          className={`w-full px-4 py-3 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                          placeholder="Enter executed quantity"
                        />
                      </div>

                      {/* Planned Quantity (readonly) */}
                      {activity.scope && (
                        <div className="space-y-2">
                          <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Planned Quantity</label>
                          <input
                            type="number"
                            value={activity.scope.planned_quantity || ''}
                            readOnly
                            className={`w-full px-4 py-3 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textMuted} cursor-not-allowed`}
                          />
                        </div>
                      )}

                      {/* Progress Info */}
                      {activity.scope && (
                        <>
                          <div className="space-y-2">
                            <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Cumulative Qty</label>
                            <input
                              type="number"
                              value={activity.cumulativeQuantity || 0}
                              readOnly
                              className={`w-full px-4 py-3 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textMuted} cursor-not-allowed`}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Progress %</label>
                            <input
                              type="number"
                              value={activity.progressPercentage ? Math.round(activity.progressPercentage * 100) / 100 : 0}
                              readOnly
                              className={`w-full px-4 py-3 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textMuted} cursor-not-allowed`}
                            />
                          </div>
                        </>
                      )}

                      {/* Next Day Planned Work */}
                      <div className="space-y-2 md:col-span-2">
                        <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Next Day Planned Work</label>
                        <input
                          type="text"
                          value={activity.nextDayPlannedWork}
                          onChange={(e) => updateActivity(activity.id, 'nextDayPlannedWork', e.target.value)}
                          className={`w-full px-4 py-3 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                          placeholder="Next day work plan"
                        />
                      </div>

                      {/* Remarks */}
                      <div className="space-y-2 md:col-span-3">
                        <label className={`text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest`}>Remarks</label>
                        <textarea
                          value={activity.remarks}
                          onChange={(e) => updateActivity(activity.id, 'remarks', e.target.value)}
                          rows={2}
                          className={`w-full px-4 py-3 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none`}
                          placeholder="Enter remarks"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Additional Details */}
            <div className={`${themeClasses.glassCard} p-6 rounded-2xl ${themeClasses.border}`}>
              <h4 className={`text-sm font-black ${themeClasses.textPrimary} uppercase tracking-widest mb-6`}>Additional Details</h4>

              <div className="space-y-6">
                <div>
                  <label className={`block text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest mb-2`}>Unresolved Issues</label>
                  <textarea
                    value={unresolvedIssues}
                    onChange={(e) => setUnresolvedIssues(e.target.value)}
                    rows={3}
                    className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none`}
                    placeholder="Describe any unresolved issues..."
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest mb-2`}>
                    Pending Letters
                    <span className={`text-[9px] font-normal ${themeClasses.textMuted} ml-2 normal-case`}>
                      (Any letters remaining unanswered - client/contractor with reference)
                    </span>
                  </label>
                  <textarea
                    value={pendingLetters}
                    onChange={(e) => setPendingLetters(e.target.value)}
                    rows={3}
                    className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none`}
                    placeholder="List pending letters with references..."
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest mb-2`}>Quality Status</label>
                  <textarea
                    value={qualityStatus}
                    onChange={(e) => setQualityStatus(e.target.value)}
                    rows={3}
                    className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none`}
                    placeholder="Describe quality status (e.g. All quality checks passed. Material samples tested and approved.)"
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest mb-2`}>Important Incidents (Next Day)</label>
                  <textarea
                    value={importantIncidents}
                    onChange={(e) => setImportantIncidents(e.target.value)}
                    rows={3}
                    className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none`}
                    placeholder="Describe important incidents for next day..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest mb-2`}>Billing Status</label>
                    <input
                      type="text"
                      value={billingStatus}
                      onChange={(e) => setBillingStatus(e.target.value)}
                      className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                      placeholder="Enter billing status"
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest mb-2`}>GFC Drawings Status</label>
                    <input
                      type="text"
                      value={gfcStatus}
                      onChange={(e) => setGfcStatus(e.target.value)}
                      className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                      placeholder="Enter GFC drawings status"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Footer */}
            <div className={`${themeClasses.glassCard} p-6 rounded-2xl ${themeClasses.border}`}>
              <h4 className={`text-sm font-black ${themeClasses.textPrimary} uppercase tracking-widest mb-6`}>Signature & Authorization</h4>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest mb-2`}>Issued By</label>
                    <input
                      type="text"
                      value={issuedBy}
                      onChange={(e) => setIssuedBy(e.target.value)}
                      className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest mb-2`}>Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className={`w-full px-5 py-4 ${themeClasses.input} rounded-2xl text-sm font-bold ${themeClasses.textPrimary} outline-none focus:ring-4 focus:ring-indigo-500/10`}
                      placeholder="Enter designation"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className={`p-8 ${themeClasses.border} ${themeClasses.bgSecondary} flex items-center justify-between`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`px-8 py-4 ${themeClasses.textSecondary} font-black text-xs uppercase tracking-widest rounded-2xl ${themeClasses.buttonSecondary} transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="dpr-form"
            disabled={isSubmitting}
            className={`px-12 py-4 ${themeClasses.buttonPrimary} font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit DPR'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DPRSubmissionForm;
