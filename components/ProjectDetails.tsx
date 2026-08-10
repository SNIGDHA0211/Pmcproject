
import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, User, UserRole, Document, Task } from '../types';
import { Icons } from './Icons';
import { STATUS_COLORS, WORKFLOW_STEPS } from '../constants';
import { formatINR } from '../utils/format';
import ProjectModal from './ProjectModal';
import ManageExecutionTeamModal from './ManageExecutionTeamModal';
import MilestoneModal from './MilestoneModal';
import ReportGenerator from './ReportGenerator';
import { projectApi, operationsApi, getApiErrorMessage } from '../services/api';
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
import CompleteProjectDialog, {
  type CompleteProjectConfirmPayload,
} from './CompleteProjectDialog';
import CompleteBillingDialog from './CompleteBillingDialog';
import DashboardToastStack, { type DashboardToastItem } from './DashboardToastStack';
import ProjectEotSection from './projectEot/ProjectEotSection';
import UserAvatar from './UserAvatar';
import {
  buildExecutionTeamRoster,
  countAssignedExecutionTeam,
  type ExecutionTeamMember,
} from '../utils/executionTeam';
import { loadUserDirectory, type DirectoryUser } from '../utils/userDirectory';
import {
  buildProjectAuditTrail,
  extractDocumentationFileUrl,
  mapTasksFromApi,
  mapVaultDocumentsFromApi,
} from '../utils/projectDetailsTabData';
import { fetchProjectProgressChart } from '../services/financialDataService';
import type { AuditLog } from '../types';
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
  const [userDirectory, setUserDirectory] = useState<DirectoryUser[]>([]);
  const [vaultDocs, setVaultDocs] = useState<Document[]>([]);
  const [siteTasks, setSiteTasks] = useState<Task[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditLog[]>([]);
  const [documentationUrl, setDocumentationUrl] = useState<string | undefined>(
    project.documentationFileUrl,
  );
  const [siteProgressPct, setSiteProgressPct] = useState<number | null>(null);
  const [tabDataLoading, setTabDataLoading] = useState(true);
  const [tabDataError, setTabDataError] = useState('');
  const [vaultLoading, setVaultLoading] = useState(false);
  const [siteLoading, setSiteLoading] = useState(false);

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
  const isTeamLead = currentUser.role === UserRole.TEAM_LEAD;
  const isPMCHead = isPmcHeadEquivalent(currentUser);
  const isCompleted = isProjectCompleted(project);
  const canMarkComplete = canCompleteProject(currentUser) && !isCompleted;
  const canMarkBillingComplete =
    canCompleteProject(currentUser) && canCompleteProjectBilling(project);
  const hasTeamLead = project.teamLeadId && project.teamLeadId !== '';
  const canManageExecutionTeam = isPMCHead && !isCompleted;
  // Team lead can always add site engineers (they can reassign)
  const canAddSiteEngineers = isTeamLead && !isCompleted;

  useEffect(() => {
    let cancelled = false;
    void loadUserDirectory()
      .then((dir) => {
        if (!cancelled) setUserDirectory(dir);
      })
      .catch(() => {
        if (!cancelled) setUserDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTabApis = async () => {
      setTabDataLoading(true);
      setVaultLoading(true);
      setSiteLoading(true);
      setTabDataError('');
      setDocumentationUrl(project.documentationFileUrl);
      setAuditTrail(
        buildProjectAuditTrail({
          projectId: project.id,
          projectTitle: project.title,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          completedAt: project.completedAt,
          completedBy: project.completedBy,
          teamLeadName: project.teamLeadName,
          siteEngineerNames: project.siteEngineerNames,
          existing: project.auditLogs,
        }),
      );

      try {
        const [docsResult, detailResult, tasksByProject, tasksAll, progressPoints] =
          await Promise.all([
            projectApi.getProjectDocuments().catch((err) => {
              console.error('[ProjectDetails] documents API failed', err);
              return null;
            }),
            projectApi.getProject(project.id).catch((err) => {
              console.error('[ProjectDetails] project detail API failed', err);
              return null;
            }),
            operationsApi.getTasks(undefined, { projectId: project.id }).catch(() => null),
            operationsApi.getTasks().catch(() => null),
            fetchProjectProgressChart(project.apiName || project.title).catch(() => []),
          ]);

        if (cancelled) return;

        const detailData =
          detailResult && detailResult.data && typeof detailResult.data === 'object'
            ? (detailResult.data as Record<string, unknown>)
            : null;

        const docUrl =
          extractDocumentationFileUrl(detailData) || project.documentationFileUrl;
        setDocumentationUrl(docUrl);

        const fromList = docsResult
          ? mapVaultDocumentsFromApi(
              docsResult.data,
              project.id,
              project.title,
              project.apiName,
            )
          : [];
        setVaultDocs(fromList);

        const taskPayload = tasksByProject?.data ?? tasksAll?.data;
        const mappedTasks = taskPayload
          ? mapTasksFromApi(taskPayload, project.id, project.title, project.apiName)
          : [];
        // Prefer project-scoped list; if project_id filter returned empty but
        // unfiltered call had matches, use those.
        if (mappedTasks.length > 0) {
          setSiteTasks(mappedTasks);
        } else if (tasksAll?.data) {
          setSiteTasks(
            mapTasksFromApi(tasksAll.data, project.id, project.title, project.apiName),
          );
        } else {
          setSiteTasks(project.tasks ?? []);
        }

        const last =
          Array.isArray(progressPoints) && progressPoints.length > 0
            ? progressPoints[progressPoints.length - 1]
            : null;
        const actual = last
          ? Number(last.cumulativeActual ?? last.actual ?? NaN)
          : NaN;
        setSiteProgressPct(Number.isFinite(actual) ? actual : null);

        setAuditTrail(
          buildProjectAuditTrail({
            projectId: project.id,
            projectTitle: project.title,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            completedAt: project.completedAt,
            completedBy: project.completedBy,
            teamLeadName: project.teamLeadName,
            siteEngineerNames: project.siteEngineerNames,
            existing: project.auditLogs,
            detail: detailData,
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setTabDataError(
            getApiErrorMessage(err, 'Unable to load project section data from the server.'),
          );
          setSiteTasks(project.tasks ?? []);
          setVaultDocs(project.documents ?? []);
        }
      } finally {
        if (!cancelled) {
          setTabDataLoading(false);
          setVaultLoading(false);
          setSiteLoading(false);
        }
      }
    };

    void loadTabApis();
    return () => {
      cancelled = true;
    };
  }, [
    project.id,
    project.title,
    project.apiName,
    project.createdAt,
    project.updatedAt,
    project.completedAt,
    project.completedBy,
    project.teamLeadName,
    project.documentationFileUrl,
    // Primitive deps avoid re-fetch loops from array identity
    (project.siteEngineerNames ?? []).join('|'),
    (project.auditLogs ?? []).length,
  ]);

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

  const handleMilestoneSubmit = (taskData: Partial<Task>) => {
    onAddTask(project.id, taskData);
    setIsMilestoneModalOpen(false);
  };

  const executionRoster = buildExecutionTeamRoster(project, userDirectory);
  const assignedCount = countAssignedExecutionTeam(executionRoster);
  const assignedTeam: User[] = executionRoster
    .filter((m) => m.assigned && m.userId)
    .map((m) => ({
      id: m.userId!,
      name: m.name,
      role:
        m.key === 'team_lead'
          ? UserRole.TEAM_LEAD
          : m.key === 'coordinator'
            ? UserRole.COORDINATOR
            : m.key === 'pmc_head'
              ? UserRole.PMC_HEAD
              : m.key === 'billing'
                ? UserRole.BILLING_SITE_ENGINEER
                : m.key === 'qaqc'
                  ? UserRole.QAQC_SITE_ENGINEER
                  : m.key === 'hse'
                    ? UserRole.HSE_SITE_ENGINEER
                    : UserRole.SITE_ENGINEER,
      email: '',
    }));

  const roleSlotTone = (member: ExecutionTeamMember) => {
    if (!member.assigned) {
      return isDarkTheme
        ? 'border-dashed border-white/15 bg-transparent'
        : 'border-dashed border-slate-200 bg-slate-50/50';
    }
    return isDarkTheme
      ? 'border-white/10 bg-white/[0.04]'
      : 'border-slate-200 bg-white';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in slide-in-from-right duration-300 sm:space-y-6">
      <DashboardToastStack toasts={toasts} />

      {/* Navigation */}
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${themeClasses.textSecondary} hover:text-indigo-500`}
      >
        <Icons.ChevronRight className="rotate-180" size={18} />
        Back to Portfolio
      </button>

      {isCompleted && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            isDarkTheme
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          role="status"
        >
          {getProjectCompletionBillingLabel(project)}. This project is read-only for
          operational records.
        </div>
      )}

      {/* Project overview card */}
      <section
        className={`relative overflow-hidden rounded-2xl border shadow-sm ${themeClasses.glassCard} ${themeClasses.border}`}
      >
        <div className="relative z-10 space-y-5 p-4 sm:p-6 lg:p-7">
          {/* Identity */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${STATUS_COLORS[project.status]}`}
                >
                  {getProjectStatusLabel(project)}
                </span>
                {project.location ? (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${themeClasses.textSecondary}`}
                  >
                    <Icons.MapPin size={13} className="opacity-70" />
                    {project.location}
                  </span>
                ) : null}
              </div>

              <h1
                className={`text-xl font-black leading-tight tracking-tight break-words sm:text-2xl lg:text-3xl ${themeClasses.textPrimary}`}
              >
                {project.title}
              </h1>

              {project.description ? (
                <p
                  className={`mt-2 max-w-3xl text-sm leading-relaxed ${
                    isDarkTheme ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {project.description}
                </p>
              ) : null}
            </div>

            <div
              className={`w-full rounded-2xl px-4 py-3 sm:px-5 sm:py-4 lg:w-auto lg:min-w-[11.5rem] lg:shrink-0 lg:text-right ${
                isDarkTheme ? 'bg-white/5' : 'bg-indigo-50'
              }`}
            >
              <p
                className={`text-[10px] font-black uppercase tracking-[0.12em] ${themeClasses.textSecondary}`}
              >
                Contract value
              </p>
              <p
                className={`mt-1 text-2xl font-black tabular-nums sm:text-3xl ${
                  isCompleted
                    ? isDarkTheme
                      ? 'text-emerald-400'
                      : 'text-emerald-600'
                    : isDarkTheme
                      ? 'text-indigo-300'
                      : 'text-indigo-600'
                }`}
              >
                {formatINR(project.budget)}
              </p>
            </div>
          </div>

          {/* Key facts */}
          <div
            className={`grid grid-cols-2 gap-3 rounded-2xl border p-3 sm:gap-4 sm:p-4 md:grid-cols-4 ${
              isDarkTheme ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'
            }`}
          >
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                Client
              </p>
              <p className={`mt-1 truncate text-sm font-bold ${themeClasses.textPrimary}`} title={project.client || 'Not set'}>
                {project.client?.trim() || 'Not set'}
              </p>
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                Team leader
              </p>
              <p className={`mt-1 truncate text-sm font-bold ${themeClasses.textPrimary}`}>
                {project.teamLeadName?.trim() ||
                  (hasTeamLead ? `User #${project.teamLeadId}` : 'Not assigned')}
              </p>
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                Start date
              </p>
              <p className={`mt-1 truncate text-sm font-bold ${themeClasses.textPrimary}`}>
                {project.commencementDate?.trim() || '—'}
              </p>
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                Duration
              </p>
              <p className={`mt-1 truncate text-sm font-bold ${themeClasses.textPrimary}`}>
                {project.duration?.trim() || '—'}
              </p>
            </div>
          </div>

          {isCompleted && (
            <div
              className={`grid grid-cols-1 gap-3 rounded-2xl border p-3 sm:grid-cols-2 lg:grid-cols-3 sm:p-4 ${
                isDarkTheme
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-emerald-100 bg-emerald-50/60'
              }`}
            >
              <div>
                <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                  Completed at
                </p>
                <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
                  {formatCompletionDate(project.completedAt)}
                </p>
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                  Completed by
                </p>
                <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
                  {project.completedBy || '—'}
                </p>
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                  Billing
                </p>
                <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
                  {getProjectCompletionBillingLabel(project)}
                </p>
              </div>
              {project.completionNotes ? (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                    Completion notes
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${themeClasses.textPrimary}`}>
                    {project.completionNotes}
                  </p>
                </div>
              ) : null}
              {project.billingCompletedAt || project.billingCompletedBy || project.billingCompletionNotes ? (
                <>
                  {project.billingCompletedAt ? (
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                        Billing completed at
                      </p>
                      <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
                        {formatCompletionDate(project.billingCompletedAt)}
                      </p>
                    </div>
                  ) : null}
                  {project.billingCompletedBy ? (
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                        Billing completed by
                      </p>
                      <p className={`mt-1 text-sm font-bold ${themeClasses.textPrimary}`}>
                        {project.billingCompletedBy}
                      </p>
                    </div>
                  ) : null}
                  {project.billingCompletionNotes ? (
                    <div className="sm:col-span-2">
                      <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                        Billing notes
                      </p>
                      <p className={`mt-1 text-sm font-semibold ${themeClasses.textPrimary}`}>
                        {project.billingCompletionNotes}
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          )}

          {/* Assigned team preview */}
          {assignedCount > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <p className={`text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                On this project
              </p>
              <div className="flex -space-x-2">
                {executionRoster
                  .filter((m) => m.assigned)
                  .slice(0, 8)
                  .map((m) => (
                    <div
                      key={m.rowId}
                      title={`${m.name} · ${m.roleLabel}`}
                      className={`rounded-full border-2 shadow-sm ${
                        isDarkTheme ? 'border-[#0b1d36]' : 'border-white'
                      }`}
                    >
                      <UserAvatar
                        name={m.name}
                        isDarkTheme={isDarkTheme}
                        className="h-8 w-8 rounded-full"
                        iconSize={14}
                      />
                    </div>
                  ))}
              </div>
              <span className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
                {assignedCount} people assigned
              </span>
            </div>
          )}

          {/* Actions — grouped so clients know what each control is for */}
          <div
            className={`border-t pt-4 ${isDarkTheme ? 'border-white/10' : 'border-slate-100'}`}
          >
            <div className="flex flex-col gap-3">
              {/* PMC / Manager actions */}
              {(canManageExecutionTeam ||
                isPmcHeadEquivalent(currentUser) ||
                canMarkComplete ||
                canMarkBillingComplete ||
                !isCompleted) && (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.12em] sm:mr-1 sm:w-20 shrink-0 ${themeClasses.textSecondary}`}
                  >
                    Actions
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {canManageExecutionTeam && (
                      <button
                        type="button"
                        onClick={() => setShowAssignmentModal(true)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                          isDarkTheme
                            ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25'
                            : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        <Icons.User size={14} />
                        Manage Team
                      </button>
                    )}

                    {isPmcHeadEquivalent(currentUser) && (
                      <button
                        type="button"
                        onClick={() => setIsReportGeneratorOpen(true)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                          isDarkTheme
                            ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                        }`}
                      >
                        <Icons.Document size={14} />
                        DPR Report
                      </button>
                    )}

                    {canMarkComplete && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompleteError(null);
                          setCompleteDialogOpen(true);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                          isDarkTheme
                            ? 'border-emerald-500/40 bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/30'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <Icons.Approve size={14} />
                        Mark Completed
                      </button>
                    )}

                    {canMarkBillingComplete && (
                      <button
                        type="button"
                        onClick={() => {
                          setBillingError(null);
                          setBillingDialogOpen(true);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                          isDarkTheme
                            ? 'border-sky-500/40 bg-sky-600/15 text-sky-300 hover:bg-sky-600/30'
                            : 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                        }`}
                      >
                        <Icons.Approve size={14} />
                        Complete Billing
                      </button>
                    )}

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                          isDarkTheme
                            ? 'border-white/10 text-slate-300 hover:bg-white/5'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        aria-label="Edit project details"
                      >
                        <Icons.Edit size={14} />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Team Lead — field staffing */}
              {canAddSiteEngineers && (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.12em] sm:mr-1 sm:w-20 shrink-0 ${themeClasses.textSecondary}`}
                  >
                    Staffing
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {/* Site Engineer */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSiteEngineerDropdown((o) => !o);
                          setShowBillingEngineerDropdown(false);
                          setShowQAQCEngineerDropdown(false);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                          isDarkTheme
                            ? 'border-emerald-500/40 bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/30'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        <Icons.User size={14} />
                        Site Engineer
                        {project.siteEngineerIds.length > 0
                          ? ` (${project.siteEngineerIds.length})`
                          : ''}
                      </button>
                      {showSiteEngineerDropdown && (
                        <div
                          className={`absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-xl ${
                            isDarkTheme
                              ? 'border-white/10 bg-slate-900'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`border-b p-3 ${themeClasses.border}`}>
                            <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>
                              Add site engineer
                            </p>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {availableSiteEngineers.map((se) => (
                              <button
                                key={se.id}
                                type="button"
                                onClick={() => setSelectedSiteEngineerId(se.id)}
                                className={`w-full px-4 py-3 text-left transition-all ${
                                  selectedSiteEngineerId === se.id
                                    ? isDarkTheme
                                      ? 'bg-emerald-600/20'
                                      : 'bg-emerald-50'
                                    : themeClasses.bgHover
                                }`}
                              >
                                <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>
                                  {se.name}
                                </p>
                              </button>
                            ))}
                          </div>
                          {availableSiteEngineers.length === 0 && (
                            <div className={`p-4 text-center text-sm ${themeClasses.textMuted}`}>
                              No site engineers available
                            </div>
                          )}
                          {selectedSiteEngineerId && (
                            <div className={`border-t p-3 ${themeClasses.border}`}>
                              <button
                                type="button"
                                onClick={handleAddSiteEngineer}
                                disabled={isAddingSiteEngineer}
                                className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {isAddingSiteEngineer ? 'Adding…' : 'Confirm add'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Billing */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowBillingEngineerDropdown((o) => !o);
                          setShowSiteEngineerDropdown(false);
                          setShowQAQCEngineerDropdown(false);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                          isDarkTheme
                            ? 'border-amber-500/40 bg-amber-600/15 text-amber-300 hover:bg-amber-600/30'
                            : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        <Icons.User size={14} />
                        Billing Engineer
                        {project.billingEngineerId ? ' ✓' : ''}
                      </button>
                      {showBillingEngineerDropdown && (
                        <div
                          className={`absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-xl ${
                            isDarkTheme
                              ? 'border-white/10 bg-slate-900'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`border-b p-3 ${themeClasses.border}`}>
                            <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>
                              Assign billing engineer
                            </p>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {availableBillingEngineers.map((se) => (
                              <button
                                key={se.id}
                                type="button"
                                onClick={() => setSelectedBillingEngineerId(se.id)}
                                className={`w-full px-4 py-3 text-left transition-all ${
                                  selectedBillingEngineerId === se.id
                                    ? isDarkTheme
                                      ? 'bg-amber-600/20'
                                      : 'bg-amber-50'
                                    : themeClasses.bgHover
                                }`}
                              >
                                <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>
                                  {se.name}
                                </p>
                              </button>
                            ))}
                          </div>
                          {availableBillingEngineers.length === 0 && (
                            <div className={`p-4 text-center text-sm ${themeClasses.textMuted}`}>
                              No billing engineers available
                            </div>
                          )}
                          {selectedBillingEngineerId && (
                            <div className={`border-t p-3 ${themeClasses.border}`}>
                              <button
                                type="button"
                                onClick={handleAddBillingEngineer}
                                disabled={isAddingBillingEngineer}
                                className="w-full rounded-lg bg-amber-600 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                              >
                                {isAddingBillingEngineer ? 'Adding…' : 'Confirm assign'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* QAQC */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowQAQCEngineerDropdown((o) => !o);
                          setShowSiteEngineerDropdown(false);
                          setShowBillingEngineerDropdown(false);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${
                          isDarkTheme
                            ? 'border-violet-500/40 bg-violet-600/15 text-violet-300 hover:bg-violet-600/30'
                            : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                        }`}
                      >
                        <Icons.User size={14} />
                        QAQC Engineer
                        {project.qaqcEngineerId ? ' ✓' : ''}
                      </button>
                      {showQAQCEngineerDropdown && (
                        <div
                          className={`absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-xl sm:left-auto sm:right-0 ${
                            isDarkTheme
                              ? 'border-white/10 bg-slate-900'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className={`border-b p-3 ${themeClasses.border}`}>
                            <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>
                              Assign QAQC engineer
                            </p>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {availableQAQCEngineers.map((se) => (
                              <button
                                key={se.id}
                                type="button"
                                onClick={() => setSelectedQAQCEngineerId(se.id)}
                                className={`w-full px-4 py-3 text-left transition-all ${
                                  selectedQAQCEngineerId === se.id
                                    ? isDarkTheme
                                      ? 'bg-violet-600/20'
                                      : 'bg-violet-50'
                                    : themeClasses.bgHover
                                }`}
                              >
                                <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>
                                  {se.name}
                                </p>
                              </button>
                            ))}
                          </div>
                          {availableQAQCEngineers.length === 0 && (
                            <div className={`p-4 text-center text-sm ${themeClasses.textMuted}`}>
                              No QAQC engineers available
                            </div>
                          )}
                          {selectedQAQCEngineerId && (
                            <div className={`border-t p-3 ${themeClasses.border}`}>
                              <button
                                type="button"
                                onClick={handleAddQAQCEngineer}
                                disabled={isAddingQAQCEngineer}
                                className="w-full rounded-lg bg-violet-600 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                              >
                                {isAddingQAQCEngineer ? 'Adding…' : 'Confirm assign'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isCompleted && (
          <div
            className={`pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl ${
              isDarkTheme ? 'bg-emerald-500/10' : 'bg-emerald-500/5'
            }`}
          />
        )}
      </section>

      <ProjectEotSection
        projectName={project.title}
        role={currentUser.role}
      />
      {/* Workflow Tabs */}
      <div
        className={`-mx-1 flex gap-1 overflow-x-auto border-b px-1 ${themeClasses.border}`}
        style={{ scrollbarWidth: 'none' }}
      >
        {[
          { id: 'workflow', label: 'Workflow', shortLabel: 'Workflow', icon: Icons.History },
          { id: 'docs', label: 'Vault', shortLabel: 'Vault', icon: Icons.Document },
          { id: 'tasks', label: 'Site Execution', shortLabel: 'Site', icon: Icons.Task },
          { id: 'audit', label: 'Audit Trail', shortLabel: 'Audit', icon: Icons.Comment },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-bold transition-all sm:gap-2 sm:px-4 sm:py-4 sm:text-sm ${
              activeTab === tab.id
                ? isDarkTheme
                  ? 'text-indigo-400'
                  : 'text-indigo-600'
                : `${themeClasses.textSecondary} hover:text-contrast`
            }`}
          >
            <tab.icon size={16} className="shrink-0" />
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {activeTab === tab.id && (
              <div
                className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full sm:left-3 sm:right-3 sm:h-1 ${
                  isDarkTheme ? 'bg-indigo-400' : 'bg-indigo-600'
                }`}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 pb-16 sm:gap-5 sm:pb-20">
        {/* Tab panels — always full width (no empty side column) */}
        <div className="min-w-0 w-full">
          {activeTab === 'audit' && (
            <div className={`${themeClasses.glassCard} rounded-2xl border p-4 sm:p-6 ${themeClasses.border}`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
                <h3 className={`flex items-center gap-2 font-bold ${themeClasses.textPrimary}`}>
                  <Icons.Comment size={20} className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} />
                  Audit Trail
                </h3>
                {tabDataLoading && (
                  <span className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>
                    Syncing…
                  </span>
                )}
              </div>
              {tabDataError ? (
                <p className="mb-3 text-sm font-semibold text-rose-500">{tabDataError}</p>
              ) : null}
              {auditTrail.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {auditTrail.map((log) => (
                    <div
                      key={log.id}
                      className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4 ${themeClasses.bgSecondary} ${themeClasses.border}`}
                    >
                      <div className={`shrink-0 rounded-lg p-2 ${isDarkTheme ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Icons.History size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>{log.action}</p>
                        <p className={`text-xs font-medium ${themeClasses.textSecondary}`}>
                          {log.details || `By ${log.performedBy}`}
                        </p>
                      </div>
                      <div className="sm:shrink-0 sm:text-right">
                        <p className={`text-[10px] font-bold uppercase ${themeClasses.textSecondary}`}>Timestamp</p>
                        <p className={`text-xs font-bold ${themeClasses.textPrimary}`}>
                          {Number.isNaN(new Date(log.timestamp).getTime())
                            ? log.timestamp
                            : new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`rounded-2xl border border-dashed py-12 text-center ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                  <Icons.Comment size={32} className={`mx-auto mb-2 ${isDarkTheme ? 'text-white/20' : 'text-gray-300'}`} />
                  <p className={`text-sm font-bold uppercase ${themeClasses.textSecondary}`}>No audit records</p>
                  <p className={`mt-1 text-xs ${themeClasses.textMuted}`}>
                    Events appear after project create, team assignment, or completion.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className={`${themeClasses.glassCard} rounded-2xl border p-4 sm:p-6 ${themeClasses.border}`}>
              <h3 className={`mb-5 flex items-center gap-2 text-sm font-bold sm:mb-6 sm:text-base ${themeClasses.textPrimary}`}>
                <Icons.ArrowRight size={20} className={`shrink-0 ${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`} />
                Approval Workflow State
              </h3>

              {/* Mobile: vertical timeline */}
              <div className="relative md:hidden">
                <div
                  className={`absolute bottom-3 top-3 left-[1.125rem] w-[2px] ${
                    isDarkTheme ? 'bg-white/5' : 'bg-gray-100'
                  }`}
                />
                <div className="space-y-5">
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const isStepCompleted =
                      WORKFLOW_STEPS.indexOf(project.status) >= idx &&
                      project.status !== ProjectStatus.REJECTED;
                    const isCurrent = project.status === step;
                    return (
                      <div
                        key={step}
                        className={`relative flex items-center gap-3 ${
                          isStepCompleted ? 'opacity-100' : 'opacity-40'
                        }`}
                      >
                        <div
                          className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm shadow-sm ${
                            isCurrent
                              ? `bg-indigo-600 text-white ring-4 ${
                                  isDarkTheme ? 'ring-indigo-500/10' : 'ring-indigo-100'
                                }`
                              : isStepCompleted
                                ? isDarkTheme
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-emerald-50 text-emerald-600'
                                : isDarkTheme
                                  ? 'bg-slate-800/90 text-white/40'
                                  : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {isStepCompleted && !isCurrent ? (
                            <Icons.Approve size={18} />
                          ) : (
                            <span className="font-bold">{idx + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold uppercase tracking-tight ${themeClasses.textPrimary}`}>
                            {step.replace('_', ' ')}
                          </p>
                          <p className={`text-[11px] font-medium ${themeClasses.textSecondary}`}>
                            {isCurrent
                              ? 'Awaiting your action'
                              : isStepCompleted
                                ? 'Verification completed'
                                : 'Pending previous stage'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop / tablet: horizontal steps fill full width */}
              <div className="hidden md:block">
                <div className="relative flex items-start justify-between gap-1 lg:gap-2">
                  <div
                    className={`absolute left-[8%] right-[8%] top-5 h-[2px] ${
                      isDarkTheme ? 'bg-white/10' : 'bg-slate-200'
                    }`}
                    aria-hidden
                  />
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const isStepCompleted =
                      WORKFLOW_STEPS.indexOf(project.status) >= idx &&
                      project.status !== ProjectStatus.REJECTED;
                    const isCurrent = project.status === step;
                    return (
                      <div
                        key={step}
                        className={`relative z-10 flex min-w-0 flex-1 flex-col items-center px-0.5 text-center sm:px-1 ${
                          isStepCompleted ? 'opacity-100' : 'opacity-45'
                        }`}
                      >
                        <div
                          className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full text-sm shadow-sm ${
                            isCurrent
                              ? `bg-indigo-600 text-white ring-4 ${
                                  isDarkTheme ? 'ring-indigo-500/15' : 'ring-indigo-100'
                                }`
                              : isStepCompleted
                                ? isDarkTheme
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-emerald-50 text-emerald-600'
                                : isDarkTheme
                                  ? 'bg-slate-800 text-white/40'
                                  : 'border border-slate-200 bg-white text-slate-400'
                          }`}
                        >
                          {isStepCompleted && !isCurrent ? (
                            <Icons.Approve size={20} />
                          ) : (
                            <span className="font-bold">{idx + 1}</span>
                          )}
                        </div>
                        <p
                          className={`max-w-[6.5rem] text-[10px] font-black uppercase leading-tight tracking-wide lg:max-w-none lg:text-[11px] ${themeClasses.textPrimary}`}
                        >
                          {step.replace('_', ' ')}
                        </p>
                        <p className={`mt-1 max-w-[7rem] text-[10px] font-medium leading-snug ${themeClasses.textSecondary}`}>
                          {isCurrent
                            ? 'Awaiting action'
                            : isStepCompleted
                              ? 'Completed'
                              : 'Pending'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className={`${themeClasses.glassCard} rounded-2xl border p-4 sm:p-6 ${themeClasses.border}`}>
              <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className={`font-bold ${themeClasses.textPrimary}`}>Document Vault</h3>
                  <p className={`mt-0.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                    Files linked to this project from the documents API
                  </p>
                </div>
                <span className={`text-[10px] font-black uppercase ${themeClasses.textMuted}`}>
                  {vaultLoading ? 'Loading…' : `${vaultDocs.length + (documentationUrl ? 1 : 0)} file(s)`}
                </span>
              </div>

              {documentationUrl ? (
                <div className={`mb-6 rounded-xl border p-3 transition-all group sm:p-4 ${themeClasses.bgSecondary} ${themeClasses.border} ${isDarkTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${isDarkTheme ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Icons.Document size={24} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>Project Documentation</p>
                        <p className={`text-xs font-medium tracking-tight ${themeClasses.textSecondary}`}>
                          From project record • Click to open
                        </p>
                      </div>
                    </div>
                    <a
                      href={documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-indigo-500"
                    >
                      <Icons.Download size={16} />
                      View
                    </a>
                  </div>
                </div>
              ) : null}

              {vaultLoading ? (
                <div className={`rounded-2xl border border-dashed py-10 text-center ${themeClasses.border}`}>
                  <Icons.Loader size={22} className={`mx-auto mb-2 animate-spin ${themeClasses.textSecondary}`} />
                  <p className={`text-sm font-semibold ${themeClasses.textSecondary}`}>Loading vault documents…</p>
                </div>
              ) : vaultDocs.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {vaultDocs.map((doc) => (
                    <div key={doc.id} className={`rounded-xl border p-4 transition-all group ${themeClasses.border} ${isDarkTheme ? 'hover:border-indigo-400/30 hover:bg-slate-800/95' : 'hover:border-indigo-200 hover:bg-gray-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${isDarkTheme ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Icons.Document size={24} />
                          </div>
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-bold transition-colors ${themeClasses.textPrimary} group-hover:text-indigo-400`}>{doc.name}</p>
                            <p className={`mt-0.5 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>{doc.type}</p>
                          </div>
                        </div>
                        {doc.url && doc.url !== '#' ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`shrink-0 rounded-lg p-2 transition-all ${themeClasses.textSecondary} hover:bg-indigo-500/10 hover:text-indigo-400`}
                          >
                            <Icons.Download size={18} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !documentationUrl ? (
                <div className={`rounded-2xl border border-dashed py-12 text-center ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                  <Icons.Document size={32} className={`mx-auto mb-2 ${isDarkTheme ? 'text-white/20' : 'text-gray-300'}`} />
                  <p className={`text-sm font-bold uppercase ${themeClasses.textSecondary}`}>No documents for this project</p>
                  <p className={`mt-1 text-xs ${themeClasses.textMuted}`}>
                    Upload docs at project init, or they will appear from `/projects-data/projects/documents/`.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className={`${themeClasses.glassCard} rounded-2xl border p-4 sm:p-6 ${themeClasses.border}`}>
              <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className={`flex items-center gap-2 font-bold ${themeClasses.textPrimary}`}>
                    <Icons.Task size={20} className={isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'} />
                    Site Execution
                  </h3>
                  <p className={`mt-0.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                    Live progress and site tasks for this project
                  </p>
                </div>
                {currentUser.role === UserRole.TEAM_LEAD && !isCompleted && (
                  <button
                    onClick={() => setIsMilestoneModalOpen(true)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-black uppercase text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500"
                  >
                    Add Milestone
                  </button>
                )}
              </div>

              <div
                className={`mb-5 rounded-xl border p-4 ${themeClasses.bgSecondary} ${themeClasses.border}`}
              >
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                      Physical progress
                    </p>
                    <p className={`mt-1 text-2xl font-black tabular-nums ${themeClasses.textPrimary}`}>
                      {siteLoading
                        ? '…'
                        : siteProgressPct == null
                          ? '—'
                          : `${siteProgressPct.toFixed(1)}%`}
                    </p>
                  </div>
                  <p className={`text-[10px] font-semibold ${themeClasses.textMuted}`}>
                    From project-progress API
                  </p>
                </div>
                <div className={`mt-3 h-2 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{
                      width: `${
                        siteProgressPct == null
                          ? 0
                          : Math.min(100, Math.max(0, siteProgressPct))
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {siteLoading ? (
                  <div className={`rounded-2xl border border-dashed py-10 text-center ${themeClasses.border}`}>
                    <Icons.Loader size={22} className={`mx-auto mb-2 animate-spin ${themeClasses.textSecondary}`} />
                    <p className={`text-sm font-semibold ${themeClasses.textSecondary}`}>Loading site tasks…</p>
                  </div>
                ) : (
                  <>
                    {siteTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`rounded-2xl border p-4 transition-all group sm:p-5 ${themeClasses.bgSecondary} ${themeClasses.border} ${isDarkTheme ? 'hover:border-indigo-500/30' : 'hover:border-indigo-200'}`}
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                task.status === 'COMPLETED'
                                  ? 'bg-emerald-500'
                                  : task.status === 'IN_PROGRESS'
                                    ? 'bg-indigo-500'
                                    : isDarkTheme
                                      ? 'bg-white/10'
                                      : 'bg-gray-200'
                              }`}
                            />
                            <p className={`truncate text-sm font-bold uppercase tracking-tight ${themeClasses.textPrimary}`}>
                              {task.title}
                            </p>
                          </div>
                          <span className={`text-[10px] font-black uppercase ${themeClasses.textSecondary}`}>
                            {task.dueDate}
                          </span>
                        </div>
                        {task.description ? (
                          <p className={`mb-4 line-clamp-2 text-xs ${themeClasses.textSecondary}`}>
                            {task.description}
                          </p>
                        ) : null}
                        <div
                          className={`flex items-center justify-between border-t pt-4 ${
                            isDarkTheme ? 'border-white/5' : 'border-gray-100'
                          }`}
                        >
                          <span className={`text-[10px] font-semibold ${themeClasses.textSecondary}`}>
                            {task.assignedTo ? `Assigned: ${task.assignedTo}` : 'Unassigned'}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                              task.status === 'COMPLETED'
                                ? isDarkTheme
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-emerald-50 text-emerald-600'
                                : task.status === 'IN_PROGRESS'
                                  ? isDarkTheme
                                    ? 'bg-indigo-500/10 text-indigo-400'
                                    : 'bg-indigo-50 text-indigo-600'
                                  : isDarkTheme
                                    ? 'bg-slate-800/90 text-white/40'
                                    : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {siteTasks.length === 0 && (
                      <div className="py-10 text-center">
                        <Icons.Task
                          size={48}
                          className={`mx-auto mb-4 ${isDarkTheme ? 'text-white/5' : 'text-gray-200'}`}
                        />
                        <p className={`text-sm font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                          No site tasks found
                        </p>
                        <p className={`mt-1 text-xs ${themeClasses.textMuted}`}>
                          Tasks load from `/operations/tasks/` when available for this project.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Execution Team — full width under tabs (fills screen, no cramped sidebar) */}
        <section className={`${themeClasses.glassCard} rounded-2xl border p-4 shadow-sm sm:p-6 ${themeClasses.border}`}>
          <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`text-sm font-black uppercase tracking-widest ${themeClasses.textPrimary}`}>
                  Execution Team
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums ${
                    assignedCount > 0
                      ? isDarkTheme
                        ? 'bg-indigo-500/20 text-indigo-200'
                        : 'bg-indigo-50 text-indigo-700'
                      : isDarkTheme
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {assignedCount} filled
                </span>
              </div>
              <p className={`mt-1 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
                People responsible for delivering this project
              </p>
            </div>
            {canManageExecutionTeam ? (
              <button
                type="button"
                onClick={() => setShowAssignmentModal(true)}
                className={`w-full shrink-0 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide transition-all sm:w-auto ${
                  isDarkTheme
                    ? 'bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Manage Team
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {executionRoster.map((member) => (
              <div
                key={member.rowId}
                className={`flex min-w-0 items-center gap-3 rounded-xl border p-3.5 transition-all ${roleSlotTone(member)}`}
              >
                <UserAvatar
                  name={member.name}
                  isDarkTheme={isDarkTheme}
                  className="h-10 w-10 shrink-0 rounded-xl"
                  iconSize={16}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-bold ${
                      member.assigned ? themeClasses.textPrimary : themeClasses.textSecondary
                    }`}
                  >
                    {member.name}
                  </p>
                  <p className={`truncate text-[10px] font-black uppercase tracking-wide ${themeClasses.textSecondary}`}>
                    {member.roleLabel}
                  </p>
                  <p className={`mt-0.5 truncate text-[10px] font-semibold ${themeClasses.textSecondary}`}>
                    {member.roleHint}
                  </p>
                </div>
                {!member.assigned && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                      isDarkTheme
                        ? 'bg-white/5 text-slate-400'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    Vacant
                  </span>
                )}
              </div>
            ))}
          </div>

          {isCompleted && !canManageExecutionTeam ? (
            <p className={`mt-4 text-center text-[10px] font-semibold ${themeClasses.textSecondary}`}>
              Team locked — project is completed
            </p>
          ) : null}
        </section>
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

      <ManageExecutionTeamModal
        open={showAssignmentModal}
        project={project}
        onClose={() => setShowAssignmentModal(false)}
        onSaved={() => {
          showToast('Team updated. Refreshing project…', 'success');
          onRefresh?.();
        }}
      />

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
