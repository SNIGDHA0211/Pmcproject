
import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, User, UserRole, Document, Task } from '../types';
import { Icons } from './Icons';
import { STATUS_COLORS, WORKFLOW_STEPS } from '../constants';
import { formatINR } from '../utils/format';
import ProjectModal from './ProjectModal';
import AssignmentModal from './AssignmentModal';
import MilestoneModal from './MilestoneModal';
import ReportGenerator from './ReportGenerator';
import { MOCK_USERS } from '../services/mockData';
import { projectApi, getApiErrorMessage } from '../services/api';
import { useTheme, getThemeClasses } from '../utils/theme';
import { isPmcHeadEquivalent } from '../utils/pmcRoleAccess';
import { canCompleteProject } from '../utils/userManagementAccess';
import {
  canCompleteProjectBilling,
  extractCompletionFields,
  formatCompletionDate,
  getProjectCompletionBillingLabel,
  getProjectStatusLabel,
  isProjectCompleted,
} from '../utils/projectCompletion';
import ProjectSiteList from './ProjectSiteList';
import CompleteProjectDialog, {
  type CompleteProjectConfirmPayload,
} from './CompleteProjectDialog';
import CompleteBillingDialog from './CompleteBillingDialog';
import DashboardToastStack, { type DashboardToastItem } from './DashboardToastStack';
import ProjectEotSection from './projectEot/ProjectEotSection';
import axios from 'axios';

interface ProjectDetailsProps {
  project: Project;
  currentUser: User;
  onUpdateStatus: (projectId: string, newStatus: ProjectStatus, comment?: string) => void;
  onUpdateProject: (projectId: string, updatedData: Partial<Project>, newDocs: Partial<Document>[]) => void;
  onAssignTeam: (projectId: string, leadId: string, coordIds: string[]) => void;
  onAddTask: (projectId: string, task: Partial<Task>) => void;
  onBack: () => void;
  onRefresh?: () => void;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, currentUser, onUpdateStatus, onUpdateProject, onAssignTeam, onAddTask, onBack, onRefresh }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [activeTab, setActiveTab] = useState<'workflow' | 'docs' | 'tasks' | 'audit'>('workflow');
  const [comment, setComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isReportGeneratorOpen, setIsReportGeneratorOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompletingBilling, setIsCompletingBilling] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<DashboardToastItem[]>([]);

  // State for Coordinator assigning Team Lead
  const [availableTeamLeads, setAvailableTeamLeads] = useState<User[]>([]);
  const [selectedTeamLeadId, setSelectedTeamLeadId] = useState<string>('');
  const [isAssigningTeamLead, setIsAssigningTeamLead] = useState(false);
  const [showTeamLeadDropdown, setShowTeamLeadDropdown] = useState(false);

  // State for Team Lead adding Site Engineers - three separate types
  const [availableSiteEngineers, setAvailableSiteEngineers] = useState<User[]>([]);
  const [availableBillingEngineers, setAvailableBillingEngineers] = useState<User[]>([]);
  const [availableQAQCEngineers, setAvailableQAQCEngineers] = useState<User[]>([]);
  const [selectedSiteEngineerId, setSelectedSiteEngineerId] = useState<string>('');
  const [selectedBillingEngineerId, setSelectedBillingEngineerId] = useState<string>('');
  const [selectedQAQCEngineerId, setSelectedQAQCEngineerId] = useState<string>('');
  const [isAddingSiteEngineer, setIsAddingSiteEngineer] = useState(false);
  const [isAddingBillingEngineer, setIsAddingBillingEngineer] = useState(false);
  const [isAddingQAQCEngineer, setIsAddingQAQCEngineer] = useState(false);
  const [showSiteEngineerDropdown, setShowSiteEngineerDropdown] = useState(false);
  const [showBillingEngineerDropdown, setShowBillingEngineerDropdown] = useState(false);
  const [showQAQCEngineerDropdown, setShowQAQCEngineerDropdown] = useState(false);

  // Check if current user is PMC Manager / Head
  const isCoordinator = currentUser.role === UserRole.COORDINATOR;
  const isTeamLead = currentUser.role === UserRole.TEAM_LEAD;
  const isPMCHead = isPmcHeadEquivalent(currentUser);
  const isCompleted = isProjectCompleted(project);
  const canMarkComplete = canCompleteProject(currentUser) && !isCompleted;
  const canMarkBillingComplete =
    canCompleteProject(currentUser) && canCompleteProjectBilling(project);
  const hasTeamLead = project.teamLeadId && project.teamLeadId !== '';
  const hasSiteEngineers = project.siteEngineerIds && project.siteEngineerIds.length > 0;
  // PMC Manager / Head can assign team lead
  const canAssignTeamLead = isPMCHead && !isCompleted;
  // Team lead can always add site engineers (they can reassign)
  const canAddSiteEngineers = isTeamLead && !isCompleted;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const handleConfirmComplete = async (payload: CompleteProjectConfirmPayload) => {
    if (isCompleting || isCompleted) return;
    setIsCompleting(true);
    setCompleteError(null);
    try {
      const body: {
        billing_status: 'Pending' | 'Completed';
        completion_notes?: string;
        billing_completion_notes?: string;
      } = {
        billing_status: payload.billingStatus,
      };
      if (payload.completionNotes) body.completion_notes = payload.completionNotes;
      if (
        payload.billingStatus === 'Completed' &&
        payload.billingCompletionNotes
      ) {
        body.billing_completion_notes = payload.billingCompletionNotes;
      }

      const response = await projectApi.completeProject(project.id, body);
      const data =
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : {};
      const message =
        typeof data.message === 'string' && data.message.trim()
          ? data.message
          : 'Project marked as completed successfully.';

      const nested =
        data.data && typeof data.data === 'object'
          ? (data.data as Record<string, unknown>)
          : data.project && typeof data.project === 'object'
            ? (data.project as Record<string, unknown>)
            : data;
      const completion = extractCompletionFields(nested);

      onUpdateProject(
        project.id,
        {
          status: ProjectStatus.APPROVED,
          completedAt: completion.completedAt || new Date().toISOString(),
          completedBy:
            completion.completedBy ||
            currentUser.name ||
            currentUser.username ||
            currentUser.id,
          completionNotes:
            completion.completionNotes ??
            (payload.completionNotes || null),
          billingStatus:
            completion.billingStatus ?? payload.billingStatus ?? 'Pending',
          billingCompletedAt: completion.billingCompletedAt ?? null,
          billingCompletedBy: completion.billingCompletedBy ?? null,
          billingCompletionNotes:
            completion.billingCompletionNotes ??
            (payload.billingCompletionNotes || null),
        },
        [],
      );

      setCompleteDialogOpen(false);
      showToast(message, 'success');
      onRefresh?.();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const msg = 'You do not have permission to mark this project as completed.';
        setCompleteError(msg);
        showToast(msg, 'error');
        return;
      }
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const msg = getApiErrorMessage(
          err,
          'Unable to complete project. Check billing status and try again.',
        );
        setCompleteError(msg);
        showToast(msg, 'error');
        return;
      }
      const msg = getApiErrorMessage(err, 'Failed to mark project as completed.');
      setCompleteError(msg);
      showToast(msg, 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleConfirmBillingComplete = async (billingCompletionNotes: string) => {
    if (isCompletingBilling || !canMarkBillingComplete) return;
    setIsCompletingBilling(true);
    setBillingError(null);
    try {
      const body =
        billingCompletionNotes.trim().length > 0
          ? { billing_completion_notes: billingCompletionNotes.trim() }
          : {};
      const response = await projectApi.completeProjectBilling(project.id, body);
      const data =
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : {};
      const message =
        typeof data.message === 'string' && data.message.trim()
          ? data.message
          : 'Billing marked as completed successfully.';
      const nested =
        data.data && typeof data.data === 'object'
          ? (data.data as Record<string, unknown>)
          : data;
      const completion = extractCompletionFields(nested);

      onUpdateProject(
        project.id,
        {
          billingStatus: completion.billingStatus ?? 'Completed',
          billingCompletedAt:
            completion.billingCompletedAt || new Date().toISOString(),
          billingCompletedBy:
            completion.billingCompletedBy ||
            currentUser.name ||
            currentUser.username ||
            currentUser.id,
          billingCompletionNotes:
            completion.billingCompletionNotes ??
            (billingCompletionNotes.trim() || null),
        },
        [],
      );

      setBillingDialogOpen(false);
      showToast(message, 'success');
      onRefresh?.();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        const msg = 'You do not have permission to complete billing.';
        setBillingError(msg);
        showToast(msg, 'error');
        return;
      }
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        const msg = getApiErrorMessage(
          err,
          'Billing can only be completed after the project is marked completed.',
        );
        setBillingError(msg);
        showToast(msg, 'error');
        return;
      }
      const msg = getApiErrorMessage(err, 'Failed to mark billing as completed.');
      setBillingError(msg);
      showToast(msg, 'error');
    } finally {
      setIsCompletingBilling(false);
    }
  };

  // Fetch available team leads when coordinator views project
  useEffect(() => {
    if (canAssignTeamLead) {
      projectApi.getAvailableUsers('Team Leader')
        .then(res => {
          const users = res.data.map((u: any) => ({
            id: u.id.toString(),
            name: u.name,
            role: UserRole.TEAM_LEAD,
            email: u.email || ''
          }));
          setAvailableTeamLeads(users);
        })
        .catch(err => console.error('Failed to fetch team leads:', err));
    }
  }, [canAssignTeamLead]);

  // Fetch available site engineers when team lead views project
  useEffect(() => {
    if (canAddSiteEngineers) {
      // Fetch regular Site Engineers
      projectApi.getAvailableUsers('Site Engineer')
        .then(res => {
          const users = res.data.map((u: any) => ({
            id: u.id.toString(),
            name: u.name,
            role: UserRole.SITE_ENGINEER,
            email: u.email || ''
          }));
          // Filter out already assigned site engineers
          const available = users.filter((u: User) => !project.siteEngineerIds.includes(u.id));
          setAvailableSiteEngineers(available);
        })
        .catch(err => console.error('Failed to fetch site engineers:', err));

      // Fetch Billing Site Engineers
      projectApi.getAvailableUsers('Billing Site Engineer')
        .then(res => {
          const users = res.data.map((u: any) => ({
            id: u.id.toString(),
            name: u.name,
            role: UserRole.SITE_ENGINEER,
            email: u.email || ''
          }));
          // Filter out already assigned billing engineer
          const available = users.filter((u: User) => project.billingEngineerId !== u.id);
          setAvailableBillingEngineers(available);
        })
        .catch(err => console.error('Failed to fetch billing engineers:', err));

      // Fetch QAQC Site Engineers
      projectApi.getAvailableUsers('QAQC Site Engineer')
        .then(res => {
          const users = res.data.map((u: any) => ({
            id: u.id.toString(),
            name: u.name,
            role: UserRole.SITE_ENGINEER,
            email: u.email || ''
          }));
          // Filter out already assigned QAQC engineer
          const available = users.filter((u: User) => project.qaqcEngineerId !== u.id);
          setAvailableQAQCEngineers(available);
        })
        .catch(err => console.error('Failed to fetch QAQC engineers:', err));
    }
  }, [canAddSiteEngineers, project.siteEngineerIds, project.billingEngineerId, project.qaqcEngineerId]);

  const handleAssignTeamLead = async () => {
    if (!selectedTeamLeadId) return;
    setIsAssigningTeamLead(true);
    try {
      await projectApi.assignTeamLead(project.id, parseInt(selectedTeamLeadId));
      alert('Team Lead assigned successfully!');
      setShowTeamLeadDropdown(false);
      setSelectedTeamLeadId('');
      // Refresh the project data
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to assign team lead');
    } finally {
      setIsAssigningTeamLead(false);
    }
  };

  const handleAddSiteEngineer = async () => {
    if (!selectedSiteEngineerId) return;
    setIsAddingSiteEngineer(true);
    try {
      await projectApi.addSiteEngineers(project.id, [parseInt(selectedSiteEngineerId)]);
      alert('Site Engineer added successfully!');
      setShowSiteEngineerDropdown(false);
      setSelectedSiteEngineerId('');
      // Refresh the project data
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add site engineer');
    } finally {
      setIsAddingSiteEngineer(false);
    }
  };

  const handleAddBillingEngineer = async () => {
    if (!selectedBillingEngineerId) return;
    setIsAddingBillingEngineer(true);
    try {
      await projectApi.addBillingSiteEngineer(project.id, parseInt(selectedBillingEngineerId));
      alert('Billing Site Engineer added successfully!');
      setShowBillingEngineerDropdown(false);
      setSelectedBillingEngineerId('');
      // Refresh the project data
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add billing site engineer');
    } finally {
      setIsAddingBillingEngineer(false);
    }
  };

  const handleAddQAQCEngineer = async () => {
    if (!selectedQAQCEngineerId) return;
    setIsAddingQAQCEngineer(true);
    try {
      await projectApi.addQAQCSiteEngineer(project.id, parseInt(selectedQAQCEngineerId));
      alert('QAQC Site Engineer added successfully!');
      setShowQAQCEngineerDropdown(false);
      setSelectedQAQCEngineerId('');
      // Refresh the project data
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add QAQC site engineer');
    } finally {
      setIsAddingQAQCEngineer(false);
    }
  };

  const canApprove = (status: ProjectStatus) => {
    if (isPmcHeadEquivalent(currentUser) && status === ProjectStatus.REVIEWED) return true;
    if (currentUser.role === UserRole.TEAM_LEAD && status === ProjectStatus.SUBMITTED) return true;
    return false;
  };

  const getActionLabel = (status: ProjectStatus) => {
    if (status === ProjectStatus.SUBMITTED) return 'Review Submission';
    if (status === ProjectStatus.REVIEWED) return 'Approve Project';
    if (status === ProjectStatus.CREATED) return 'Assign Lead';
    if (status === ProjectStatus.ASSIGNED) return 'Start Project';
    if (status === ProjectStatus.IN_PROGRESS) return 'Submit for Review';
    return 'Progress Workflow';
  };

  const nextStatusMap: Partial<Record<ProjectStatus, ProjectStatus>> = {
    [ProjectStatus.CREATED]: ProjectStatus.ASSIGNED,
    [ProjectStatus.ASSIGNED]: ProjectStatus.IN_PROGRESS,
    [ProjectStatus.IN_PROGRESS]: ProjectStatus.SUBMITTED,
    [ProjectStatus.SUBMITTED]: ProjectStatus.REVIEWED,
    [ProjectStatus.REVIEWED]: ProjectStatus.APPROVED,
  };

  const handleProgress = () => {
    if (project.status === ProjectStatus.CREATED) {
      setShowAssignmentModal(true);
      return;
    }
    const next = nextStatusMap[project.status];
    if (next) onUpdateStatus(project.id, next);
  };

  const handleReject = () => {
    onUpdateStatus(project.id, ProjectStatus.REJECTED, comment);
    setShowRejectModal(false);
    setComment('');
  };

  const handleEditSubmit = (updatedData: Partial<Project>, newDocs: Partial<Document>[]) => {
    onUpdateProject(project.id, updatedData, newDocs);
    setIsEditModalOpen(false);
  };

  const handleTeamAssignment = (leadId: string, coordIds: string[]) => {
    onAssignTeam(project.id, leadId, coordIds);
    setShowAssignmentModal(false);
  };

  const handleMilestoneSubmit = (taskData: Partial<Task>) => {
    onAddTask(project.id, taskData);
    setIsMilestoneModalOpen(false);
  };

  // Helper to find assigned user details - use dynamic data from API
  const assignedTeam: User[] = [];

  // Add PMC Head if available
  if ((project as any).pmc_head_name) {
    assignedTeam.push({
      id: project.pmcHeadId || 'pmc',
      name: (project as any).pmc_head_name,
      role: UserRole.PMC_HEAD,
      email: '',
      avatar: `https://picsum.photos/seed/pmc/100`
    });
  }

  // Add Team Lead if available
  if ((project as any).team_lead_name) {
    assignedTeam.push({
      id: project.teamLeadId || 'tl',
      name: (project as any).team_lead_name,
      role: UserRole.TEAM_LEAD,
      email: '',
      avatar: `https://picsum.photos/seed/tl/100`
    });
  }

  // Add Coordinators if available
  if ((project as any).coordinator_names && Array.isArray((project as any).coordinator_names)) {
    (project as any).coordinator_names.forEach((name: string, index: number) => {
      assignedTeam.push({
        id: project.coordinatorIds?.[index] || `coord-${index}`,
        name: name,
        role: UserRole.COORDINATOR,
        email: '',
        avatar: `https://picsum.photos/seed/coord${index}/100`
      });
    });
  }

  // Add Site Engineers if available
  if ((project as any).site_engineer_names && Array.isArray((project as any).site_engineer_names)) {
    (project as any).site_engineer_names.forEach((name: string, index: number) => {
      assignedTeam.push({
        id: project.siteEngineerIds?.[index] || `se-${index}`,
        name: name,
        role: UserRole.SITE_ENGINEER,
        email: '',
        avatar: `https://picsum.photos/seed/se${index}/100`
      });
    });
  }

  // Add Billing Engineer if available
  if ((project as any).billing_engineer_name) {
    assignedTeam.push({
      id: project.billingEngineerId || 'billing',
      name: (project as any).billing_engineer_name,
      role: UserRole.SITE_ENGINEER,
      email: '',
      avatar: `https://picsum.photos/seed/billing/100`
    });
  }

  // Add QAQC Engineer if available
  if ((project as any).qaqc_engineer_name) {
    assignedTeam.push({
      id: project.qaqcEngineerId || 'qaqc',
      name: (project as any).qaqc_engineer_name,
      role: UserRole.SITE_ENGINEER,
      email: '',
      avatar: `https://picsum.photos/seed/qaqc/100`
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in slide-in-from-right duration-300 sm:space-y-6">
      <DashboardToastStack toasts={toasts} />
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${themeClasses.textSecondary} hover:text-indigo-400`}>
          <Icons.ChevronRight className="rotate-180" size={18} />
          Back to Portfolio
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {/* Coordinator: Assign Team Lead Button */}
          {canAssignTeamLead && (
            <div className="relative">
              <button
                onClick={() => setShowTeamLeadDropdown(!showTeamLeadDropdown)}
                className={`px-4 py-2 flex items-center gap-2 font-black border rounded-lg transition-all text-[10px] uppercase tracking-widest ${
                  isDarkTheme 
                    ? 'text-white border-indigo-500/50 bg-indigo-600/20 hover:bg-indigo-600/40' 
                    : 'text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                }`}
              >
                <Icons.User size={14} />
                {hasTeamLead ? 'Reassign Team Lead' : 'Assign Team Lead'}
              </button>
              {showTeamLeadDropdown && (
                <div className={`absolute right-0 top-full mt-2 w-64 border rounded-xl shadow-xl z-50 ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className={`p-3 border-b ${themeClasses.border}`}>
                    <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>Select Team Lead</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {availableTeamLeads.map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => setSelectedTeamLeadId(lead.id)}
                        className={`w-full text-left px-4 py-3 transition-all ${
                          selectedTeamLeadId === lead.id 
                            ? (isDarkTheme ? 'bg-indigo-600/20' : 'bg-indigo-50') 
                            : themeClasses.bgHover
                        }`}
                      >
                        <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>{lead.name}</p>
                        <p className={`text-xs ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`}>Team Lead</p>
                      </button>
                    ))}
                  </div>
                  {availableTeamLeads.length === 0 && (
                    <div className={`p-4 text-center text-sm ${themeClasses.textMuted}`}>
                      No team leads available
                    </div>
                  )}
                  {selectedTeamLeadId && (
                    <div className={`p-3 border-t ${themeClasses.border}`}>
                      <button
                        onClick={handleAssignTeamLead}
                        disabled={isAssigningTeamLead}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50"
                      >
                        {isAssigningTeamLead ? 'Assigning...' : 'Confirm Assignment'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Team Lead: Add Site Engineers - Three Separate Buttons */}
          {canAddSiteEngineers && (
            <>
              {/* Regular Site Engineer Button */}
              <div className="relative">
                <button
                  onClick={() => setShowSiteEngineerDropdown(!showSiteEngineerDropdown)}
                  className={`px-4 py-2 flex items-center gap-2 font-black border rounded-lg transition-all text-[10px] uppercase tracking-widest ${
                    isDarkTheme 
                      ? 'text-white border-emerald-500/50 bg-emerald-600/20 hover:bg-emerald-600/40' 
                      : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  <Icons.User size={14} />
                  Add Site Engineer {project.siteEngineerIds.length > 0 ? `(${project.siteEngineerIds.length})` : ''}
                </button>
                {showSiteEngineerDropdown && (
                  <div className={`absolute right-0 top-full mt-2 w-64 border rounded-xl shadow-xl z-50 ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className={`p-3 border-b ${themeClasses.border}`}>
                      <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>Select Site Engineer</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {availableSiteEngineers.map(se => (
                        <button
                          key={se.id}
                          onClick={() => {
                            setSelectedSiteEngineerId(se.id);
                          }}
                          className={`w-full text-left px-4 py-3 transition-all ${
                            selectedSiteEngineerId === se.id 
                              ? (isDarkTheme ? 'bg-emerald-600/20' : 'bg-emerald-50') 
                              : themeClasses.bgHover
                          }`}
                        >
                          <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>{se.name}</p>
                          <p className={`text-xs ${isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'}`}>Site Engineer</p>
                        </button>
                      ))}
                    </div>
                    {availableSiteEngineers.length === 0 && (
                      <div className={`p-4 text-center text-sm ${themeClasses.textMuted}`}>
                        No site engineers available
                      </div>
                    )}
                    {selectedSiteEngineerId && (
                      <div className={`p-3 border-t ${themeClasses.border}`}>
                        <button
                          onClick={handleAddSiteEngineer}
                          disabled={isAddingSiteEngineer}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50"
                        >
                          {isAddingSiteEngineer ? 'Adding...' : 'Add Site Engineer'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Billing Site Engineer Button */}
              <div className="relative">
                <button
                  onClick={() => setShowBillingEngineerDropdown(!showBillingEngineerDropdown)}
                  className={`px-4 py-2 flex items-center gap-2 font-black border rounded-lg transition-all text-[10px] uppercase tracking-widest ${
                    isDarkTheme 
                      ? 'text-white border-amber-500/50 bg-amber-600/20 hover:bg-amber-600/40' 
                      : 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  <Icons.User size={14} />
                  Add Billing Engineer {project.billingEngineerId ? '(1)' : ''}
                </button>
                {showBillingEngineerDropdown && (
                  <div className={`absolute right-0 top-full mt-2 w-64 border rounded-xl shadow-xl z-50 ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className={`p-3 border-b ${themeClasses.border}`}>
                      <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>Select Billing Site Engineer</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {availableBillingEngineers.map(se => (
                        <button
                          key={se.id}
                          onClick={() => {
                            setSelectedBillingEngineerId(se.id);
                          }}
                          className={`w-full text-left px-4 py-3 transition-all ${
                            selectedBillingEngineerId === se.id 
                              ? (isDarkTheme ? 'bg-amber-600/20' : 'bg-amber-50') 
                              : themeClasses.bgHover
                          }`}
                        >
                          <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>{se.name}</p>
                          <p className={`text-xs ${isDarkTheme ? 'text-amber-400' : 'text-amber-600'}`}>Billing Site Engineer</p>
                        </button>
                      ))}
                    </div>
                    {availableBillingEngineers.length === 0 && (
                      <div className={`p-4 text-center text-sm ${themeClasses.textMuted}`}>
                        No billing engineers available
                      </div>
                    )}
                    {selectedBillingEngineerId && (
                      <div className={`p-3 border-t ${themeClasses.border}`}>
                        <button
                          onClick={handleAddBillingEngineer}
                          disabled={isAddingBillingEngineer}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50"
                        >
                          {isAddingBillingEngineer ? 'Adding...' : 'Add Billing Engineer'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* QAQC Site Engineer Button */}
              <div className="relative">
                <button
                  onClick={() => setShowQAQCEngineerDropdown(!showQAQCEngineerDropdown)}
                  className={`px-4 py-2 flex items-center gap-2 font-black border rounded-lg transition-all text-[10px] uppercase tracking-widest ${
                    isDarkTheme 
                      ? 'text-white border-purple-500/50 bg-purple-600/20 hover:bg-purple-600/40' 
                      : 'text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100'
                  }`}
                >
                  <Icons.User size={14} />
                  Add QAQC Engineer {project.qaqcEngineerId ? '(1)' : ''}
                </button>
                {showQAQCEngineerDropdown && (
                  <div className={`absolute right-0 top-full mt-2 w-64 border rounded-xl shadow-xl z-50 ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className={`p-3 border-b ${themeClasses.border}`}>
                      <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>Select QAQC Site Engineer</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {availableQAQCEngineers.map(se => (
                        <button
                          key={se.id}
                          onClick={() => {
                            setSelectedQAQCEngineerId(se.id);
                          }}
                          className={`w-full text-left px-4 py-3 transition-all ${
                            selectedQAQCEngineerId === se.id 
                              ? (isDarkTheme ? 'bg-purple-600/20' : 'bg-purple-50') 
                              : themeClasses.bgHover
                          }`}
                        >
                          <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>{se.name}</p>
                          <p className={`text-xs ${isDarkTheme ? 'text-purple-400' : 'text-purple-600'}`}>QAQC Site Engineer</p>
                        </button>
                      ))}
                    </div>
                    {availableQAQCEngineers.length === 0 && (
                      <div className={`p-4 text-center text-sm ${themeClasses.textMuted}`}>
                        No QAQC engineers available
                      </div>
                    )}
                    {selectedQAQCEngineerId && (
                      <div className={`p-3 border-t ${themeClasses.border}`}>
                        <button
                          onClick={handleAddQAQCEngineer}
                          disabled={isAddingQAQCEngineer}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50"
                        >
                          {isAddingQAQCEngineer ? 'Adding...' : 'Add QAQC Engineer'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {isPmcHeadEquivalent(currentUser) && (
            <button
              onClick={() => setIsReportGeneratorOpen(true)}
              className={`px-4 py-2 flex items-center gap-2 font-black border rounded-lg transition-all text-[10px] uppercase tracking-widest ${
                isDarkTheme 
                  ? 'text-contrast border-white/10 bg-slate-800/90 hover:bg-slate-800' 
                  : 'text-gray-700 border-gray-200 bg-white hover:bg-gray-50 shadow-sm'
              }`}
            >
              <Icons.Document size={14} />
              Generate DPR Report
            </button>
          )}
          {canMarkComplete && (
            <button
              type="button"
              onClick={() => {
                setCompleteError(null);
                setCompleteDialogOpen(true);
              }}
              className={`px-4 py-2 flex items-center gap-2 font-black border rounded-lg transition-all text-[10px] uppercase tracking-widest ${
                isDarkTheme
                  ? 'text-emerald-300 border-emerald-500/40 bg-emerald-600/15 hover:bg-emerald-600/30'
                  : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <Icons.Approve size={14} />
              Mark as Completed
            </button>
          )}
          {canMarkBillingComplete && (
            <button
              type="button"
              onClick={() => {
                setBillingError(null);
                setBillingDialogOpen(true);
              }}
              className={`px-4 py-2 flex items-center gap-2 font-black border rounded-lg transition-all text-[10px] uppercase tracking-widest ${
                isDarkTheme
                  ? 'text-sky-300 border-sky-500/40 bg-sky-600/15 hover:bg-sky-600/30'
                  : 'text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100'
              }`}
            >
              <Icons.Approve size={14} />
              Complete Billing
            </button>
          )}
          {!isCompleted && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className={`p-2 transition-all rounded-lg ${isDarkTheme ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              aria-label="Edit project"
            >
              <Icons.Add size={20} />
            </button>
          )}
        </div>
      </div>

      {isCompleted && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            isDarkTheme
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          role="status"
        >
          {getProjectCompletionBillingLabel(project)}. This project is read-only
          for operational records.
        </div>
      )}

   {/* Hero Header */}
<div
  className={`
    ${themeClasses.glassCard}
    ${themeClasses.border}
    rounded-2xl
    border
    p-4
    sm:p-6
    lg:p-8
    shadow-sm
    relative
    overflow-hidden
  `}
>
  <div className="relative z-10">

    {/* Top Row */}
    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">

      {/* Left */}
      <div className="min-w-0 flex-1">

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className={`
              px-3
              py-1
              rounded-full
              text-xs
              font-bold
              uppercase
              border
              ${STATUS_COLORS[project.status]}
            `}
          >
            {getProjectStatusLabel(project)}
          </span>

          <span
            className={`text-xs sm:text-sm font-semibold ${themeClasses.textSecondary}`}
          >
            {project.location}
          </span>
        </div>

        <h1
          className={`
            text-2xl
            sm:text-3xl
            lg:text-4xl
            font-extrabold
            break-words
            ${themeClasses.textPrimary}
          `}
        >
          {project.title}
        </h1>

        {project.description && (
          <p
            className={`
              mt-3
              text-sm
              sm:text-base
              leading-relaxed
              max-w-3xl
              ${
                isDarkTheme
                  ? "text-contrast/70"
                  : "text-gray-600"
              }
            `}
          >
            {project.description}
          </p>
        )}
      </div>

      {/* Contract Value */}
      <div
        className={`
          shrink-0
          rounded-2xl
          px-5
          py-4
          min-w-[180px]
          text-left
          xl:text-right
          ${
            isDarkTheme
              ? "bg-slate-800/50"
              : "bg-indigo-50"
          }
        `}
      >
        <p
          className={`
            text-xs
            font-bold
            uppercase
            tracking-wide
            ${themeClasses.textSecondary}
          `}
        >
          Contract Value
        </p>

        <h2
          className={`
            mt-1
            text-2xl
            sm:text-3xl
            font-bold
            ${
              isCompleted
                ? isDarkTheme
                  ? "text-emerald-400"
                  : "text-emerald-600"
                : isDarkTheme
                  ? "text-indigo-400"
                  : "text-indigo-600"
            }
          `}
        >
          {formatINR(project.budget)}
        </h2>
      </div>
    </div>

    {/* Bottom Section */}
    <div
      className="
        mt-6
        grid
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        gap-5
      "
    >

      {/* Client */}
      <div>
        <p
          className={`
            text-[11px]
            font-bold
            uppercase
            tracking-wide
            ${themeClasses.textSecondary}
          `}
        >
          Client
        </p>

        <p
          className={`
            mt-1
            text-sm
            sm:text-base
            font-bold
            ${themeClasses.textPrimary}
          `}
        >
          {project.client || "N/A"}
        </p>
      </div>

      {/* Report Status */}
      <div>
        <p
          className={`
            text-[11px]
            font-bold
            uppercase
            tracking-wide
            ${themeClasses.textSecondary}
          `}
        >
          Report Status
        </p>

        <p
          className={`
            mt-1
            text-sm
            sm:text-base
            font-bold
            ${
              isCompleted
                ? isDarkTheme
                  ? "text-emerald-400"
                  : "text-emerald-600"
                : themeClasses.textPrimary
            }
          `}
        >
          {isCompleted
            ? "Asset Handover Ready"
            : "In Progress Cycle"}
        </p>
      </div>

      {isCompleted && (
        <>
          <div>
            <p
              className={`text-[11px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
            >
              Completed At
            </p>
            <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
              {formatCompletionDate(project.completedAt)}
            </p>
          </div>
          <div>
            <p
              className={`text-[11px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
            >
              Completed By
            </p>
            <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
              {project.completedBy || '—'}
            </p>
          </div>
          {project.completionNotes ? (
            <div className="sm:col-span-2 lg:col-span-1">
              <p
                className={`text-[11px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
              >
                Completion Notes
              </p>
              <p className={`mt-1 text-sm font-semibold ${themeClasses.textPrimary}`}>
                {project.completionNotes}
              </p>
            </div>
          ) : null}
          <div>
            <p
              className={`text-[11px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
            >
              Billing Status
            </p>
            <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
              {getProjectCompletionBillingLabel(project)}
            </p>
          </div>
          {project.billingCompletedAt ? (
            <div>
              <p
                className={`text-[11px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
              >
                Billing Completed At
              </p>
              <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
                {formatCompletionDate(project.billingCompletedAt)}
              </p>
            </div>
          ) : null}
          {project.billingCompletedBy ? (
            <div>
              <p
                className={`text-[11px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
              >
                Billing Completed By
              </p>
              <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
                {project.billingCompletedBy}
              </p>
            </div>
          ) : null}
          {project.billingCompletionNotes ? (
            <div className="sm:col-span-2 lg:col-span-1">
              <p
                className={`text-[11px] font-bold uppercase tracking-wide ${themeClasses.textSecondary}`}
              >
                Billing Notes
              </p>
              <p className={`mt-1 text-sm font-semibold ${themeClasses.textPrimary}`}>
                {project.billingCompletionNotes}
              </p>
            </div>
          ) : null}
        </>
      )}

      {/* Team */}
      {assignedTeam.length > 0 && (
        <div>
          <p
            className={`
              text-[11px]
              font-bold
              uppercase
              tracking-wide
              mb-2
              ${themeClasses.textSecondary}
            `}
          >
            Assigned Team
          </p>

          <div className="flex -space-x-2">
            {assignedTeam.map((u, i) => (
              <img
                key={u?.id || i}
                src={
                  u?.avatar ||
                  `https://picsum.photos/seed/${i}/100`
                }
                alt="team"
                title={u?.name}
                className={`
                  w-8 h-8
                  sm:w-10 sm:h-10
                  rounded-full
                  border-2
                  shadow-sm
                  ${
                    isDarkTheme
                      ? "border-slate-900"
                      : "border-white"
                  }
                `}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  </div>

  {isCompleted && (
    <div
      className={`
        absolute
        top-0
        right-0
        w-40
        h-40
        rounded-full
        blur-3xl
        ${
          isDarkTheme
            ? "bg-emerald-500/10"
            : "bg-emerald-500/5"
        }
      `}
    />
  )}
</div>

      {/* Site List — delete uses site_id from sites API (not Init List / Portfolio) */}
      <ProjectSiteList
        projectId={project.id}
        currentUser={currentUser}
        readOnly={isCompleted}
      />

      <ProjectEotSection
        projectName={project.title}
        role={currentUser.role}
      />

      {/* Workflow Tabs */}
      <div className={`flex overflow-x-auto border-b ${themeClasses.border}`} style={{ scrollbarWidth: 'none' }}>
        {[
          { id: 'workflow', label: 'Workflow', icon: Icons.History },
          { id: 'docs', label: 'Vault', icon: Icons.Document },
          { id: 'tasks', label: 'Site Execution', icon: Icons.Task },
          { id: 'audit', label: 'Audit Trail', icon: Icons.Comment },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex shrink-0 items-center gap-2 py-3 px-3 text-sm font-bold transition-all relative sm:py-4 sm:px-2 ${
              activeTab === tab.id
                ? (isDarkTheme ? 'text-indigo-400' : 'text-indigo-600')
                : `${themeClasses.textSecondary} hover:text-contrast`
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full sm:h-1 ${isDarkTheme ? 'bg-indigo-400' : 'bg-indigo-600'}`} />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 pb-16 sm:gap-6 lg:grid-cols-3 lg:gap-8 lg:pb-20">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'audit' && (
            <div className={`${themeClasses.glassCard} p-6 rounded-2xl border ${themeClasses.border}`}>
              <h3 className={`font-bold mb-6 flex items-center gap-2 ${themeClasses.textPrimary}`}>
                <Icons.Comment size={20} className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} />
                Audit Trail
              </h3>
              {project.auditLogs && project.auditLogs.length > 0 ? (
                <div className="space-y-4">
                  {project.auditLogs.map((log) => (
                    <div key={log.id} className={`flex items-start gap-4 p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                      <div className={`p-2 rounded-lg ${isDarkTheme ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Icons.History size={18} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${themeClasses.textPrimary}`}>{log.action}</p>
                        <p className={`text-xs font-medium ${themeClasses.textSecondary}`}>{log.details}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>Timestamp</p>
                        <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`py-12 text-center rounded-2xl border border-dashed ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                  <Icons.Comment size={32} className={`mx-auto mb-2 ${isDarkTheme ? 'text-white/20' : 'text-gray-300'}`} />
                  <p className={`text-sm font-bold uppercase ${themeClasses.textSecondary}`}>No audit records</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div className={`${themeClasses.glassCard} p-6 rounded-2xl border ${themeClasses.border}`}>
                <h3 className={`font-bold mb-6 flex items-center gap-2 ${themeClasses.textPrimary}`}>
                  <Icons.ArrowRight size={20} className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} />
                  Approval Workflow State
                </h3>
                <div className="relative">
                  <div className={`absolute left-6 top-0 bottom-0 w-[2px] ${isDarkTheme ? 'bg-white/5' : 'bg-gray-100'}`}></div>
                  <div className="space-y-8">
                    {WORKFLOW_STEPS.map((step, idx) => {
                      const isStepCompleted = WORKFLOW_STEPS.indexOf(project.status) >= idx && project.status !== ProjectStatus.REJECTED;
                      const isCurrent = project.status === step;
                      return (
                        <div key={step} className={`relative flex gap-6 items-center ${isStepCompleted ? 'opacity-100' : 'opacity-40'}`}>
                          <div className={`z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${
                            isCurrent 
                              ? `bg-indigo-600 text-white scale-110 shadow-indigo-500/20 ring-4 ${isDarkTheme ? 'ring-indigo-500/10' : 'ring-indigo-100'}` 
                              : isStepCompleted 
                                ? (isDarkTheme ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600') 
                                : (isDarkTheme ? 'bg-slate-800/90 text-white/40' : 'bg-gray-100 text-gray-400')
                            }`}>
                            {isStepCompleted && !isCurrent ? <Icons.Approve size={24} /> : <span className="font-bold">{idx + 1}</span>}
                          </div>
                          <div>
                            <p className={`font-bold uppercase tracking-tight text-sm ${themeClasses.textPrimary}`}>
                              {step.replace('_', ' ')}
                            </p>
                            <p className={`text-xs font-medium ${themeClasses.textSecondary}`}>
                              {isCurrent ? 'Awaiting your action' : isStepCompleted ? 'Verification completed' : 'Pending previous stage'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className={`${themeClasses.glassCard} p-6 rounded-2xl border ${themeClasses.border}`}>
              <div className="flex items-center justify-between mb-8">
                <h3 className={`font-bold ${themeClasses.textPrimary}`}>Document Vault</h3>
                {!isCompleted && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 transition-all disabled:opacity-50">
                    <Icons.Upload size={16} />
                    Upload New
                  </button>
                )}
              </div>

              {/* Show actual uploaded document if available */}
              {project.hasDocumentation && (project as any).documentationFileUrl ? (
                <div className={`mb-6 p-4 rounded-xl border group transition-all ${themeClasses.bgSecondary} ${themeClasses.border} ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDarkTheme ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Icons.Document size={24} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${themeClasses.textPrimary}`}>Project Documentation</p>
                      <p className={`text-xs font-medium tracking-tight ${themeClasses.textSecondary}`}>
                        Uploaded during project creation • Click to view
                      </p>
                    </div>
                    <a
                      href={(project as any).documentationFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-500 transition-all"
                    >
                      <Icons.Download size={16} />
                      View
                    </a>
                  </div>
                </div>
              ) : null}

              {project.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.documents.map((doc) => (
                    <div key={doc.id} className={`p-4 rounded-xl border transition-all group ${themeClasses.border} ${isDarkTheme ? 'hover:border-indigo-400/30 hover:bg-slate-800/95' : 'hover:border-indigo-200 hover:bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDarkTheme ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Icons.Document size="24" />
                          </div>
                          <div>
                            <p className={`font-bold transition-colors text-sm ${themeClasses.textPrimary} group-hover:text-indigo-400`}>{doc.name}</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${themeClasses.textSecondary}`}>{doc.type}</p>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-2 transition-all rounded-lg ${themeClasses.textSecondary} hover:text-indigo-400 hover:bg-indigo-500/10`}
                        >
                          <Icons.Download size={18} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Icons.Document size={48} className={`mx-auto mb-4 ${isDarkTheme ? 'text-white/5' : 'text-gray-200'}`} />
                  <p className={`text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>No documents in vault</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className={`${themeClasses.glassCard} p-6 rounded-2xl border ${themeClasses.border}`}>
              <div className="flex items-center justify-between mb-8">
                <h3 className={`font-bold flex items-center gap-2 ${themeClasses.textPrimary}`}>
                  <Icons.Task size={20} className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} />
                  Execution Milestones
                </h3>
                {currentUser.role === UserRole.TEAM_LEAD && !isCompleted && (
                  <button
                    onClick={() => setIsMilestoneModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase rounded-lg hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Add Milestone
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {project.tasks.map(task => (
                  <div key={task.id} className={`p-5 rounded-2xl border transition-all group ${themeClasses.bgSecondary} ${themeClasses.border} ${isDarkTheme ? 'hover:border-indigo-500/30' : 'hover:border-indigo-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' :
                          task.status === 'IN_PROGRESS' ? 'bg-indigo-500' : (isDarkTheme ? 'bg-white/10' : 'bg-gray-200')
                          }`}></div>
                        <p className={`font-bold text-sm uppercase tracking-tight ${themeClasses.textPrimary}`}>{task.title}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>{task.dueDate}</span>
                    </div>
                    <p className={`text-xs mb-4 line-clamp-2 ${themeClasses.textSecondary}`}>{task.description}</p>
                    <div className={`flex items-center justify-between pt-4 border-t ${isDarkTheme ? 'border-white/5' : 'border-gray-100'}`}>
                      <div className="flex -space-x-2">
                        {(task.assignedTo ? [task.assignedTo] : []).map((userId: string, i: number) => (
                          <div key={i} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-[8px] font-black uppercase ${isDarkTheme ? 'bg-indigo-500/20 border-slate-900 text-indigo-400' : 'bg-indigo-50 border-white text-indigo-600'}`}>
                            {MOCK_USERS.find(u => u.id === userId)?.name?.charAt(0)}
                          </div>
                        ))}
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${task.status === 'COMPLETED' ? (isDarkTheme ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') :
                        task.status === 'IN_PROGRESS' ? (isDarkTheme ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDarkTheme ? 'bg-slate-800/90 text-white/40' : 'bg-gray-100 text-gray-400')
                        }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
                {project.tasks.length === 0 && (
                  <div className="text-center py-12">
                    <Icons.Task size={48} className={`mx-auto mb-4 ${isDarkTheme ? 'text-white/5' : 'text-gray-200'}`} />
                    <p className={`text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>No milestones tracked yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className={`${themeClasses.glassCard} p-6 rounded-2xl border ${themeClasses.border} shadow-sm`}>
            <h3 className={`text-sm font-black uppercase mb-6 tracking-widest ${themeClasses.textPrimary}`}>Execution Team</h3>
            <div className="space-y-4">
              {assignedTeam.map(member => (
                <div key={member.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${themeClasses.bgSecondary} ${themeClasses.border} ${isDarkTheme ? 'hover:border-indigo-500/30' : 'hover:border-indigo-200'}`}>
                  <img src={member.avatar} className="w-10 h-10 rounded-lg object-cover" alt={member.name} />
                  <div>
                    <p className={`text-xs font-black uppercase ${themeClasses.textPrimary}`}>{member.name}</p>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>{member.role.replace('_', ' ')}</p>
                  </div>
                </div>
              ))}
              {assignedTeam.length === 0 && (
                <div className="text-center py-4">
                  <p className={`text-xs font-bold ${themeClasses.textSecondary}`}>No team members assigned</p>
                </div>
              )}
            </div>
            {isPmcHeadEquivalent(currentUser) && (
              <button
                onClick={() => setShowAssignmentModal(true)}
                className={`w-full mt-6 py-3 border text-xs font-black uppercase rounded-xl transition-all ${isDarkTheme ? 'bg-slate-800/95 border-white/10 text-contrast hover:bg-slate-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
              >
                Manage Team
              </button>
            )}
          </div>

          <div className={`${themeClasses.glassCard} p-6 rounded-2xl border ${themeClasses.border} shadow-sm`}>
            <h3 className={`text-sm font-black uppercase mb-4 tracking-widest ${themeClasses.textPrimary}`}>Project Analytics</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>Time Elapsed</p>
                <p className={`text-xl font-black ${themeClasses.textPrimary}`}>24 Days</p>
              </div>
              <div className={`p-4 rounded-xl border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${themeClasses.textSecondary}`}>DPR Compliance</p>
                <p className={`text-xl font-black ${isDarkTheme ? 'text-emerald-400' : 'text-emerald-600'}`}>98.2%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isReportGeneratorOpen && (
        <ReportGenerator
          project={project}
          user={currentUser}
          onClose={() => setIsReportGeneratorOpen(false)}
        />
      )}

      {showRejectModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4 transition-all duration-300 ${
          isDarkTheme ? 'bg-black/90' : 'bg-slate-900/40'
        }`}>
          <div className={`w-full max-w-md rounded-[2rem] shadow-2xl p-10 border animate-in zoom-in-95 duration-200 ${isDarkTheme ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-200'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border ${isDarkTheme ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
              <Icons.Reject size={32} />
            </div>
            <h3 className={`text-3xl font-black mb-2 uppercase tracking-tight ${themeClasses.textPrimary}`}>Reject Workflow</h3>
            <p className={`font-bold text-sm tracking-tight mb-8 leading-relaxed ${themeClasses.textSecondary}`}>
              Please provide a reason for rejecting this project stage. This will be recorded in the audit trail.
            </p>
            <textarea
              className={`w-full h-40 p-5 rounded-2xl focus:ring-4 outline-none transition-all font-medium text-sm ${themeClasses.input} ${themeClasses.textPrimary} ${themeClasses.placeholder} ${isDarkTheme ? 'focus:ring-rose-500/20 focus:border-rose-500/40' : 'focus:ring-rose-100 focus:border-rose-300'}`}
              placeholder="Reason for rejection..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setComment('');
                }}
                className={`flex-1 px-4 py-4 font-black text-xs uppercase border rounded-2xl transition-all ${isDarkTheme ? 'bg-slate-800/95 border-white/10 text-contrast hover:bg-slate-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!comment.trim()}
                className="flex-1 px-4 py-4 bg-rose-600 text-white font-black text-xs uppercase rounded-2xl hover:bg-rose-500 transition-all disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <ProjectModal
          initialData={project}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
        />
      )}

      {showAssignmentModal && (
        <AssignmentModal
          users={MOCK_USERS}
          onClose={() => setShowAssignmentModal(false)}
          onConfirm={handleTeamAssignment}
        />
      )}

      {isMilestoneModalOpen && (
        <MilestoneModal
          teamMembers={assignedTeam}
          onClose={() => setIsMilestoneModalOpen(false)}
          onSubmit={handleMilestoneSubmit}
        />
      )}

      <CompleteProjectDialog
        open={completeDialogOpen}
        projectName={project.title}
        onCancel={() => {
          if (isCompleting) return;
          setCompleteDialogOpen(false);
          setCompleteError(null);
        }}
        onConfirm={(payload) => void handleConfirmComplete(payload)}
        isSubmitting={isCompleting}
        errorMessage={completeError}
      />

      <CompleteBillingDialog
        open={billingDialogOpen}
        projectName={project.title}
        onCancel={() => {
          if (isCompletingBilling) return;
          setBillingDialogOpen(false);
          setBillingError(null);
        }}
        onConfirm={(notes) => void handleConfirmBillingComplete(notes)}
        isSubmitting={isCompletingBilling}
        errorMessage={billingError}
      />
    </div>
  );
};

export default ProjectDetails;
