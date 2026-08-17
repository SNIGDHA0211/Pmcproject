import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, UserRole, MonthlyScope, MonthlyScopeFilters, type Project, type ProjectQualityStatusRecord } from '../types';
import {
  monthlyScopeApi,
  projectQualityApi,
  healthSafetyApi,
  normalizeHealthSafetyDashboard,
  fetchHealthSafetyDashboardFallback,
  unwrapList,
  normalizeProjectQualityStatusRecord,
  saveHealthSafetyRecord,
  getApiErrorMessage,
  type HealthSafetyDashboardData,
  type HSERecord,
} from '../services/api';
import { projectStore } from '../stores/projectStore';
import { useTheme, getThemeClasses } from '../utils/theme';
import { Icons } from './Icons';
import StatusBadge from './StatusBadge';
import QaqcScopeDashboardPanel from './QaqcScopeDashboardPanel';
import BillingEngineerDashboardPanel, { type BillingProjectOption } from './BillingEngineerDashboardPanel';
import type { BillingFinancialSection } from './billing/BillingFinanceDashboardCards';
import QaqcScopeUpdateModal, { buildScopeUpdatePayload } from './QaqcScopeUpdateModal';
import HealthSafetyMonthlyForm, {
  healthSafetyPayloadFromForm,
  type HealthSafetyFormValues,
} from './HealthSafetyMonthlyForm';
import { canEditHealthSafetyForProject } from '../utils/healthSafetyAccess';
import {
  formatScopeProgressFraction,
  readScopeCompletedQuantity,
  formatScopeQty,
} from '../utils/scopeProgressFields';
import DashboardToastStack, { type DashboardToastItem } from './DashboardToastStack';
import { websocketService, NotificationData } from '../services/websocket';
import {
  applyMonthlyScopeFilters,
  buildMonthlyScopeQueryParams,
} from '../utils/monthlyScopeFilters';
import { primaryProjectName } from '../utils/qaqcScopeAnalytics';
import { scopeProjectName } from '../utils/billingDashboardAnalytics';
import {
  assignedHseProjectsForUser,
  assignedProjectsFromList,
  mergeAssignedProjectOptions,
  type AssignedProjectOption,
} from '../utils/roleProjectAssignments';

interface MyScopesPageProps {
  user: User;
  projects?: Project[];
  onNavigateFinancial?: (section: BillingFinancialSection, projectId?: string) => void;
  onNavigateTestingPhotos?: (projectId?: string) => void;
  financialDataVersion?: number;
}

const MyScopesPage: React.FC<MyScopesPageProps> = ({
  user,
  projects = [],
  onNavigateFinancial,
  onNavigateTestingPhotos,
  financialDataVersion = 0,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [scopes, setScopes] = useState<MonthlyScope[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<MonthlyScopeFilters>({});
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [qualityRecord, setQualityRecord] = useState<ProjectQualityStatusRecord | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [hseDashboard, setHseDashboard] = useState<HealthSafetyDashboardData | null>(null);
  const [hseLoading, setHseLoading] = useState(false);
  const [primaryProject, setPrimaryProject] = useState<string | null>(null);
  const [editingScope, setEditingScope] = useState<MonthlyScope | null>(null);
  const [isSavingScope, setIsSavingScope] = useState(false);
  const [scopeFormError, setScopeFormError] = useState<string | null>(null);
  const [hseFormOpen, setHseFormOpen] = useState(false);
  const [isSavingHse, setIsSavingHse] = useState(false);
  const [hseFormError, setHseFormError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<DashboardToastItem[]>([]);
  const toastIdRef = useRef(0);
  const [billingProjectSelection, setBillingProjectSelection] = useState<string | null>(null);
  const [billingAssignments, setBillingAssignments] = useState<AssignedProjectOption[]>([]);
  const [qaqcProjectSelection, setQaqcProjectSelection] = useState<string | null>(null);
  const [qaqcAssignments, setQaqcAssignments] = useState<AssignedProjectOption[]>([]);

  const isQaqcEngineer = user.role === UserRole.QAQC_SITE_ENGINEER;
  const isHseEngineer = user.role === UserRole.HSE_SITE_ENGINEER;
  const isBillingEngineer = user.role === UserRole.BILLING_SITE_ENGINEER;
  const isSiteEngineer = user.role === UserRole.SITE_ENGINEER;
  const showsHseDashboard = isHseEngineer;

  const assignedQaqcProjects = useMemo(
    () =>
      mergeAssignedProjectOptions(
        qaqcAssignments,
        assignedProjectsFromList(projects, user, 'qaqc'),
      ),
    [qaqcAssignments, projects, user],
  );

  const assignedHseProjects = useMemo(
    () => assignedHseProjectsForUser(projects, user),
    [projects, user],
  );

  const activeQaqcProject = useMemo(() => {
    if (isHseEngineer) {
      return qaqcProjectSelection ?? assignedHseProjects[0]?.title ?? null;
    }
    if (!isQaqcEngineer) return null;
    return (
      qaqcProjectSelection ??
      primaryProject ??
      primaryProjectName(scopes) ??
      assignedQaqcProjects[0]?.title ??
      null
    );
  }, [
    isQaqcEngineer,
    isHseEngineer,
    qaqcProjectSelection,
    primaryProject,
    scopes,
    assignedQaqcProjects,
    assignedHseProjects,
  ]);

  const assignedBillingProjects = useMemo(
    () =>
      mergeAssignedProjectOptions(
        billingAssignments,
        assignedProjectsFromList(projects, user, 'billing'),
      ),
    [billingAssignments, projects, user],
  );

  const activeBillingProject = useMemo(() => {
    if (!isBillingEngineer) return null;
    return (
      billingProjectSelection ??
      primaryProject ??
      scopeProjectName(scopes) ??
      assignedBillingProjects[0]?.title ??
      null
    );
  }, [
    isBillingEngineer,
    billingProjectSelection,
    primaryProject,
    scopes,
    assignedBillingProjects,
  ]);

  useEffect(() => {
    if ((!isQaqcEngineer && !isHseEngineer) || qaqcProjectSelection) return;
    const fromAssignment = isHseEngineer
      ? assignedHseProjects[0]?.title
      : assignedQaqcProjects[0]?.title;
    const fromScopes = isQaqcEngineer ? primaryProjectName(scopes) : null;
    if (fromAssignment) setQaqcProjectSelection(fromAssignment);
    else if (fromScopes) setQaqcProjectSelection(fromScopes);
  }, [
    isQaqcEngineer,
    isHseEngineer,
    assignedQaqcProjects,
    assignedHseProjects,
    scopes,
    qaqcProjectSelection,
  ]);

  useEffect(() => {
    if (!isBillingEngineer || billingProjectSelection) return;
    const fromAssignment = assignedBillingProjects[0]?.title;
    const fromScopes = scopeProjectName(scopes);
    if (fromAssignment) setBillingProjectSelection(fromAssignment);
    else if (fromScopes) setBillingProjectSelection(fromScopes);
  }, [isBillingEngineer, assignedBillingProjects, scopes, billingProjectSelection]);

  useEffect(() => {
    if (!isQaqcEngineer) return;
    if (projects.length > 0) {
      setQaqcAssignments(assignedProjectsFromList(projects, user, 'qaqc'));
      return;
    }
    void projectStore
      .loadProjects(false)
      .then((list) => {
        setQaqcAssignments(assignedProjectsFromList(list, user, 'qaqc'));
      })
      .catch(() => setQaqcAssignments([]));
  }, [isQaqcEngineer, projects, user]);

  useEffect(() => {
    if (!isBillingEngineer) return;
    if (projects.length > 0) {
      setBillingAssignments(assignedProjectsFromList(projects, user, 'billing'));
      return;
    }
    void projectStore
      .loadProjects(false)
      .then((list) => {
        setBillingAssignments(assignedProjectsFromList(list, user, 'billing'));
      })
      .catch(() => setBillingAssignments([]));
  }, [isBillingEngineer, projects, user]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const serverFilters = useMemo(
    () => ({
      project: filters.project,
      month: filters.month,
    }),
    [filters.project, filters.month]
  );

  const resolvedProject = useMemo(() => {
    if (isHseEngineer) {
      return activeQaqcProject ?? assignedHseProjects[0]?.title ?? null;
    }
    if (isQaqcEngineer) {
      return activeQaqcProject ?? primaryProject ?? primaryProjectName(scopes);
    }
    if (isBillingEngineer) {
      return activeBillingProject ?? primaryProject ?? scopeProjectName(scopes);
    }
    return primaryProject ?? primaryProjectName(scopes);
  }, [
    isQaqcEngineer,
    isHseEngineer,
    isBillingEngineer,
    activeQaqcProject,
    activeBillingProject,
    primaryProject,
    scopes,
    assignedHseProjects,
  ]);

  const canEditHse = useMemo(
    () =>
      canEditHealthSafetyForProject(user, null, {
        projectTitle: resolvedProject,
      }),
    [user, resolvedProject],
  );

  const qaqcSelectedProject = useMemo(() => {
    if (!isQaqcEngineer || !resolvedProject) return null;
    const fromList = projects.find(
      (p) => p.title.trim().toLowerCase() === resolvedProject.trim().toLowerCase(),
    );
    if (fromList) return fromList;

    const assigned = assignedQaqcProjects.find(
      (p) => p.title.trim().toLowerCase() === resolvedProject.trim().toLowerCase(),
    );
    if (!assigned) return null;

    return {
      id: assigned.id,
      title: assigned.title,
    } as Project;
  }, [isQaqcEngineer, resolvedProject, projects, assignedQaqcProjects]);

  const openHseForm = useCallback(() => {
    const project = resolvedProject;
    if (!project) {
      showToast('No project assigned to your account. Contact your Team Lead.', 'error');
      return;
    }
    if (!primaryProject) {
      setPrimaryProject(project);
    }
    setHseFormError(null);
    setHseFormOpen(true);
  }, [resolvedProject, primaryProject, showToast]);

  const loadQualitySnapshot = useCallback(async (projectName: string | null) => {
    if (!isQaqcEngineer || !projectName) {
      setQualityRecord(null);
      return;
    }
    const now = new Date();
    setQualityLoading(true);
    try {
      const res = await projectQualityApi.getByProjectMonthYear(
        projectName,
        now.getMonth() + 1,
        now.getFullYear(),
      );
      const raw = (res.data as { data?: unknown })?.data ?? res.data;
      const row = Array.isArray(raw) ? raw[0] : raw;
      setQualityRecord(
        row ? normalizeProjectQualityStatusRecord(row, projectName) : null,
      );
    } catch {
      setQualityRecord(null);
    } finally {
      setQualityLoading(false);
    }
  }, [isQaqcEngineer]);

  const loadHealthSafetyForProject = useCallback(async (projectName: string | null) => {
    if (!showsHseDashboard) {
      setHseDashboard(null);
      return;
    }
    if (!projectName) {
      setHseDashboard(null);
      return;
    }
    setPrimaryProject(projectName);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    setHseLoading(true);
    try {
      const res = await healthSafetyApi.getDashboard(projectName);
      setHseDashboard(normalizeHealthSafetyDashboard(res.data, projectName));
    } catch {
      try {
        const fallback = await fetchHealthSafetyDashboardFallback(projectName, month, year);
        setHseDashboard(fallback);
      } catch {
        setHseDashboard(null);
      }
    } finally {
      setHseLoading(false);
    }
  }, [showsHseDashboard]);

  const refreshHealthSafety = useCallback(async (project: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    setHseLoading(true);
    try {
      const res = await healthSafetyApi.getDashboard(project);
      setHseDashboard(normalizeHealthSafetyDashboard(res.data, project));
    } catch {
      try {
        const fallback = await fetchHealthSafetyDashboardFallback(project, month, year);
        setHseDashboard(fallback);
      } catch {
        setHseDashboard(null);
      }
    } finally {
      setHseLoading(false);
    }
  }, []);

  const handleSaveHse = async (
    values: HealthSafetyFormValues,
    record?: HSERecord | null,
  ): Promise<boolean> => {
    const project = resolvedProject;
    if (!project) {
      setHseFormError('No project assigned to your account. Contact your Team Lead.');
      return false;
    }
    setIsSavingHse(true);
    setHseFormError(null);
    try {
      await saveHealthSafetyRecord(
        healthSafetyPayloadFromForm(project, values),
        {
          record,
          knownRecords: [
            ...(hseDashboard?.monthlyRecords ?? []),
            ...(hseDashboard?.currentMonth ? [hseDashboard.currentMonth] : []),
          ],
        },
      );
      setHseFormOpen(false);
      showToast('Health & Safety data saved successfully.');
      await refreshHealthSafety(project);
      return true;
    } catch (error) {
      setHseFormError(getApiErrorMessage(error, 'Failed to save Health & Safety data.'));
      throw error;
    } finally {
      setIsSavingHse(false);
    }
  };

  const handleDeleteHse = async () => {
    const record = hseDashboard?.currentMonth;
    const project = resolvedProject;
    if (!record?.id || !project) return;
    if (!window.confirm('Delete this Health & Safety record?')) return;
    try {
      await healthSafetyApi.delete(record.id);
      showToast('Health & Safety record deleted.');
      await refreshHealthSafety(project);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to delete Health & Safety record.'), 'error');
    }
  };

  const fetchScopesForAssignedProjects = useCallback(
    async (assigned: AssignedProjectOption[]): Promise<MonthlyScope[]> => {
      if (!assigned.length) return [];
      const batches = await Promise.all(
        assigned.map(async (project) => {
          try {
            const projectId = Number(project.id);
            const res = await monthlyScopeApi.getScopes(
              Number.isFinite(projectId) && projectId > 0
                ? { project: projectId }
                : { project_name: project.title },
            );
            return unwrapList<MonthlyScope>(res.data);
          } catch {
            return [];
          }
        }),
      );
      const merged = batches.flat();
      const seen = new Set<number>();
      return merged.filter((scope) => {
        if (!scope.id || seen.has(scope.id)) return false;
        seen.add(scope.id);
        return true;
      });
    },
    [],
  );

  const fetchMyScopes = useCallback(async (isBackgroundRefresh = false) => {
    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await monthlyScopeApi.getMyScopes(buildMonthlyScopeQueryParams(serverFilters));
      let list = unwrapList<MonthlyScope>(response.data);

      if (!list.length) {
        const assigned = isQaqcEngineer
          ? assignedQaqcProjects
          : isBillingEngineer
            ? assignedBillingProjects
            : isSiteEngineer
              ? assignedProjectsFromList(projects, user, 'site')
              : [];
        if (assigned.length) {
          list = await fetchScopesForAssignedProjects(assigned);
        }
      }

      setScopes(list);

      const roleProject = isHseEngineer
        ? assignedHseProjects[0]?.title ?? activeQaqcProject
        : isQaqcEngineer
          ? activeQaqcProject
        : isBillingEngineer
          ? activeBillingProject
          : isSiteEngineer
            ? assignedProjectsFromList(projects, user, 'site')[0]?.title ?? null
            : null;

      const derivedProject =
        roleProject ??
        (isBillingEngineer ? scopeProjectName(list) : primaryProjectName(list));

      setPrimaryProject(derivedProject);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch my scopes:', error);
      if (!isBackgroundRefresh) {
        setScopes([]);
      }
    } finally {
      if (isBackgroundRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [
    serverFilters,
    isQaqcEngineer,
    isBillingEngineer,
    isSiteEngineer,
    assignedQaqcProjects,
    assignedBillingProjects,
    activeQaqcProject,
    activeBillingProject,
    projects,
    user,
    fetchScopesForAssignedProjects,
  ]);

  useEffect(() => {
    if (!activeQaqcProject) return;
    if (isQaqcEngineer) {
      void loadQualitySnapshot(activeQaqcProject);
    }
    if (isHseEngineer) {
      void loadHealthSafetyForProject(activeQaqcProject);
    }
  }, [
    isQaqcEngineer,
    isHseEngineer,
    activeQaqcProject,
    loadQualitySnapshot,
    loadHealthSafetyForProject,
  ]);

  const handleSaveScopeProgress = useCallback(async (values: {
    executed_quantity: number;
    status: MonthlyScope['status'];
    description: string;
  }): Promise<boolean> => {
    if (!editingScope) return false;
    setIsSavingScope(true);
    setScopeFormError(null);
    try {
      const payload = buildScopeUpdatePayload(editingScope, values);
      await monthlyScopeApi.updateScope(editingScope.id, payload);
      setEditingScope(null);
      showToast('Scope progress updated successfully.');
      await fetchMyScopes(true);
      return true;
    } catch (error) {
      setScopeFormError(getApiErrorMessage(error, 'Failed to update scope progress.'));
      return false;
    } finally {
      setIsSavingScope(false);
    }
  }, [editingScope, fetchMyScopes, showToast]);

  // WebSocket message handler for real-time scope updates
  const handleWebSocketMessage = useCallback((data: NotificationData) => {
    console.log('MyScopesPage received WebSocket message:', data);

    // Check if this is a scope-related notification
    if (data.type && (
      data.type.toLowerCase().includes('scope') ||
      data.type.toLowerCase().includes('monthly_scope') ||
      data.message.toLowerCase().includes('scope')
    )) {
      console.log('Scope-related notification detected, refreshing data...');
      fetchMyScopes(true); // Background refresh
    }
  }, [fetchMyScopes]);

  useEffect(() => {
    if (!isBillingEngineer) {
      fetchMyScopes();
    }
  }, [fetchMyScopes, isBillingEngineer]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.search, filters.month]);

  // WebSocket setup for real-time updates
  useEffect(() => {
    console.log('Setting up WebSocket listener for My Scopes page');

    // Add WebSocket message listener
    websocketService.onMessage(handleWebSocketMessage);

    // Handle visibility change (when user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh immediately when tab becomes visible
        console.log('Tab became visible, refreshing My Scopes data');
        fetchMyScopes(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleDprSaved = () => {
      fetchMyScopes(true);
    };
    window.addEventListener('pmc:dpr-saved', handleDprSaved);

    // Cleanup on unmount
    return () => {
      console.log('Removing WebSocket listener for My Scopes page');
      websocketService.removeMessageListener(handleWebSocketMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pmc:dpr-saved', handleDprSaved);
    };
  }, [handleWebSocketMessage, fetchMyScopes]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredScopes = useMemo(
    () => applyMonthlyScopeFilters(scopes, filters),
    [scopes, filters]
  );

  const sortedScopes = [...filteredScopes].sort((a, b) => {
    const aVal = (a as any)[sortField];
    const bVal = (b as any)[sortField];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedScopes = sortedScopes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(sortedScopes.length / pageSize);

  const pageTitle = isHseEngineer
    ? 'HSE Engineer Dashboard'
    : isQaqcEngineer
      ? 'QAQC Engineer Dashboard'
      : isBillingEngineer
        ? 'Billing Engineer Dashboard'
        : isSiteEngineer
          ? 'Monthly Scope'
          : 'My Assigned Scopes';
  const pageSubtitle = isHseEngineer
    ? 'Health & safety scorecard for your assigned projects'
    : isQaqcEngineer
      ? 'Scopes, material testing & quality for your assigned projects'
      : isBillingEngineer
        ? 'Financial overview & project performance'
        : isSiteEngineer
          ? 'Your assigned monthly scope items'
          : 'Scopes assigned to you';

  const showAssignedScopesSection = !isBillingEngineer && !isHseEngineer && !isQaqcEngineer;

  if (loading && showAssignedScopesSection) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
              {pageTitle}
            </h2>
            <p className={`text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
              {pageSubtitle}
            </p>
          </div>
        </div>
        <div className={`rounded-[2rem] overflow-hidden border ${themeClasses.glassCard} ${themeClasses.border}`}>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
            <p className={`mt-4 text-sm ${themeClasses.textSecondary}`}>Loading your assigned scopes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-5 animate-in fade-in duration-500 ${isQaqcEngineer ? 'max-w-[1600px]' : ''}`}>
      {/* Header */}
      <div
        className={`flex flex-wrap items-end justify-between gap-3 rounded-2xl border px-4 py-3.5 sm:px-5 ${
          isQaqcEngineer
            ? isDarkTheme
              ? 'border-indigo-500/20 bg-indigo-500/10'
              : 'border-indigo-100 bg-white shadow-sm'
            : ''
        } ${!isQaqcEngineer ? themeClasses.border : ''}`}
      >
        <div>
          <h2 className={`text-xl font-black tracking-tight sm:text-2xl ${themeClasses.textPrimary}`}>
            {pageTitle}
          </h2>
          <p className={`mt-0.5 text-[11px] font-semibold ${themeClasses.textSecondary}`}>
            {pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {showAssignedScopesSection && (
            <>
              <button
                onClick={() => fetchMyScopes(true)}
                disabled={isRefreshing}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${isRefreshing
                  ? 'opacity-50 cursor-not-allowed'
                  : themeClasses.buttonSecondary
                  } ${themeClasses.border}`}
                title="Refresh data (Real-time updates enabled)"
              >
                <Icons.Clock size={14} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              {lastUpdated && (
                <div className={`text-[11px] font-medium ${themeClasses.textSecondary}`}>
                  Updated {lastUpdated.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {(isQaqcEngineer || isHseEngineer) && (
        <QaqcScopeDashboardPanel
          scopes={isHseEngineer ? [] : scopes}
          projectName={resolvedProject}
          selectedProject={isQaqcEngineer ? qaqcSelectedProject : null}
          assignedProjects={isHseEngineer ? assignedHseProjects : assignedQaqcProjects}
          onProjectChange={setQaqcProjectSelection}
          qualityRecord={isHseEngineer ? null : qualityRecord}
          qualityLoading={isHseEngineer ? false : qualityLoading}
          showFrequencyChart={isQaqcEngineer}
          showHealthSafety={isHseEngineer}
          hseDashboard={isHseEngineer ? hseDashboard : null}
          hseLoading={isHseEngineer ? hseLoading : false}
          onEditHealthSafety={isHseEngineer && canEditHse ? openHseForm : undefined}
          onDeleteHealthSafety={isHseEngineer && canEditHse ? handleDeleteHse : undefined}
          canDeleteHealthSafety={isHseEngineer && canEditHse && Boolean(hseDashboard?.currentMonth?.id)}
          onNavigateTestingPhotos={
            isQaqcEngineer
              ? () => onNavigateTestingPhotos?.(qaqcSelectedProject?.id)
              : undefined
          }
        />
      )}

      {isBillingEngineer && (
        <BillingEngineerDashboardPanel
          projectName={activeBillingProject}
          assignedProjects={assignedBillingProjects}
          onProjectChange={setBillingProjectSelection}
          financialDataVersion={financialDataVersion}
          onNavigateFinancial={(section) => {
            const project = projects.find((p) => p.title === activeBillingProject);
            onNavigateFinancial?.(section, project?.id);
          }}
        />
      )}

      {showAssignedScopesSection && (
        <section
          className={`overflow-hidden rounded-2xl border ${
            isDarkTheme
              ? `${themeClasses.glassCard} ${themeClasses.border}`
              : 'border-slate-200/90 bg-white shadow-sm'
          }`}
        >
          <div
            className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 ${
              isDarkTheme ? 'border-white/10' : 'border-slate-100'
            }`}
          >
            <div>
              <h3 className={`text-sm font-black tracking-tight ${themeClasses.textPrimary}`}>
                Assigned Scopes
              </h3>
              {isQaqcEngineer && (
                <p className={`mt-0.5 text-[11px] font-medium ${themeClasses.textSecondary}`}>
                  Update executed quantity and status for your scopes
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className={`min-w-[160px] rounded-xl border ${themeClasses.input} ${themeClasses.border}`}>
              <label className={`mb-1 block px-3 pt-2 text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`}>
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters((prev) => {
                    const next = { ...prev };
                    if (e.target.value) {
                      next.status = e.target.value;
                    } else {
                      delete next.status;
                    }
                    return next;
                  })
                }
                className={`w-full rounded-xl border-0 bg-transparent px-3 pb-2 text-sm outline-none ${themeClasses.textPrimary}`}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className={`relative min-w-[220px] flex-1 rounded-xl border ${themeClasses.input} ${themeClasses.border}`}>
              <label className={`mb-1 block px-3 pt-2 text-[10px] font-bold uppercase tracking-wider ${themeClasses.textSecondary}`}>
                Search
              </label>
              <Icons.Search className={`absolute left-3 bottom-2.5 ${themeClasses.textMuted}`} size={16} />
              <input
                type="text"
                placeholder="Search scopes..."
                value={filters.search || ''}
                onChange={(e) =>
                  setFilters((prev) => {
                    const next = { ...prev };
                    const value = e.target.value.trim();
                    if (value) {
                      next.search = value;
                    } else {
                      delete next.search;
                    }
                    return next;
                  })
                }
                className={`w-full bg-transparent py-0 pl-9 pr-3 pb-2 text-sm outline-none ${themeClasses.textPrimary}`}
              />
            </div>
            {(filters.status || filters.search) && (
              <button
                type="button"
                onClick={() => setFilters((prev) => {
                  const next = { ...prev };
                  delete next.status;
                  delete next.search;
                  return next;
                })}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${themeClasses.buttonSecondary} ${themeClasses.border}`}
              >
                Clear filters
              </button>
            )}
          </div>

      {/* Scope list — cards on mobile, table on desktop */}
      <div className={`overflow-hidden rounded-xl border ${themeClasses.border} ${isDarkTheme ? 'bg-white/[0.02]' : 'bg-slate-50/50'}`}>
        <div className="space-y-3 p-4 lg:hidden">
          {paginatedScopes.length === 0 ? (
            <div className="py-8 text-center">
              <Icons.Task size={32} className={`mx-auto mb-2 ${themeClasses.textMuted}`} />
              <p className={`text-sm ${themeClasses.textSecondary}`}>No assigned scopes found</p>
            </div>
          ) : (
            paginatedScopes.map((scope) => (
              <div
                key={scope.id}
                className={`rounded-2xl border p-4 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${themeClasses.textPrimary}`}>{scope.project_name}</p>
                    <p className={`text-xs ${themeClasses.textSecondary}`}>
                      {new Date(scope.month).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <StatusBadge status={scope.status} isDarkTheme={isDarkTheme} compact />
                </div>
                <p className={`text-xs font-semibold ${themeClasses.textSecondary}`}>
                  {scope.category_name} · {scope.subcategory_name}
                </p>
                <p className={`mt-1 line-clamp-2 text-sm ${themeClasses.textPrimary}`}>{scope.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className={themeClasses.textSecondary}>Planned</span>
                    <p className={`font-bold tabular-nums ${themeClasses.textPrimary}`}>
                      {scope.planned_quantity} {scope.unit}
                    </p>
                  </div>
                  <div>
                    <span className={themeClasses.textSecondary}>Completed</span>
                    <p className="font-bold tabular-nums text-emerald-500">
                      {formatScopeQty(readScopeCompletedQuantity(scope), scope.unit)}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <div className={`h-1.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, Number(scope.progress ?? scope.progress_percentage ?? 0))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-emerald-500">{Number(scope.progress ?? scope.progress_percentage ?? 0)}% complete</p>
                </div>
                {isQaqcEngineer && (
                  <button
                    type="button"
                    onClick={() => {
                      setScopeFormError(null);
                      setEditingScope(scope);
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-indigo-500"
                  >
                    <Icons.Edit size={14} />
                    Update Progress
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                <th
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary} cursor-pointer hover:opacity-70`}
                  onClick={() => handleSort('project_name')}
                >
                  Project Name
                  {sortField === 'project_name' && (
                    <Icons.ChevronRight
                      size={12}
                      className={`inline ml-1 transition-transform ${sortDirection === 'desc' ? 'rotate-90' : '-rotate-90'}`}
                    />
                  )}
                </th>
                <th
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary} cursor-pointer hover:opacity-70`}
                  onClick={() => handleSort('month')}
                >
                  Month
                  {sortField === 'month' && (
                    <Icons.ChevronRight
                      size={12}
                      className={`inline ml-1 transition-transform ${sortDirection === 'desc' ? 'rotate-90' : '-rotate-90'}`}
                    />
                  )}
                </th>
                <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Category
                </th>
                <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Subcategory
                </th>
                <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Description
                </th>
                <th
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary} cursor-pointer hover:opacity-70`}
                  onClick={() => handleSort('planned_quantity')}
                >
                  Planned Qty
                  {sortField === 'planned_quantity' && (
                    <Icons.ChevronRight
                      size={12}
                      className={`inline ml-1 transition-transform ${sortDirection === 'desc' ? 'rotate-90' : '-rotate-90'}`}
                    />
                  )}
                </th>
                <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Unit
                </th>
                <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Section
                </th>
                <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Location
                </th>
                <th
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary} cursor-pointer hover:opacity-70`}
                  onClick={() => handleSort('status')}
                >
                  Status
                  {sortField === 'status' && (
                    <Icons.ChevronRight
                      size={12}
                      className={`inline ml-1 transition-transform ${sortDirection === 'desc' ? 'rotate-90' : '-rotate-90'}`}
                    />
                  )}
                </th>
                <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Start Date
                </th>
                <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  Progress
                </th>
                <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                  End Date
                </th>
                {isQaqcEngineer && (
                  <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className={`divide-y ${themeClasses.border}`}>
              {paginatedScopes.map((scope) => (
                <tr
                  key={scope.id}
                  className={`transition-all group ${themeClasses.bgHover}`}
                >
                  <td className={`px-6 py-4 text-sm font-medium ${themeClasses.textPrimary}`}>
                    {scope.project_name}
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    {new Date(scope.month).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    {scope.category_name}
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    {scope.subcategory_name}
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary} max-w-xs truncate`}>
                    {scope.description}
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    {scope.planned_quantity}
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    {scope.unit}
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    {scope.section}
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    {scope.location}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={scope.status} isDarkTheme={isDarkTheme} />
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    {new Date(scope.start_date).toLocaleDateString('en-GB')}
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    <div className="min-w-[120px] space-y-1">
                      <div className="text-xs font-semibold tabular-nums">
                        {formatScopeProgressFraction(scope)}
                      </div>
                      <div className={`h-1.5 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(100, Number(scope.progress ?? scope.progress_percentage ?? 0))}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs font-bold text-emerald-500">
                        {Number(scope.progress ?? scope.progress_percentage ?? 0)}%
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm ${themeClasses.textPrimary}`}>
                    {new Date(scope.end_date).toLocaleDateString('en-GB')}
                  </td>
                  {isQaqcEngineer && (
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setScopeFormError(null);
                          setEditingScope(scope);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${isDarkTheme
                          ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10'
                          : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                          }`}
                      >
                        <Icons.Edit size={12} />
                        Update
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`px-6 py-4 border-t ${themeClasses.border} flex items-center justify-between`}>
            <div className={`text-sm ${themeClasses.textSecondary}`}>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedScopes.length)} of {sortedScopes.length} scopes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-colors ${themeClasses.buttonSecondary} disabled:opacity-50`}
              >
                <Icons.ChevronRight size={16} className="rotate-180" />
              </button>
              <span className={`text-sm px-3 py-1 ${themeClasses.textPrimary}`}>
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-colors ${themeClasses.buttonSecondary} disabled:opacity-50`}
              >
                <Icons.ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {paginatedScopes.length === 0 && !loading && (
          <div className="hidden p-8 text-center lg:block">
            <Icons.Task size={32} className={`mx-auto mb-2 ${themeClasses.textMuted}`} />
            <p className={`text-sm ${themeClasses.textSecondary}`}>No assigned scopes found</p>
          </div>
        )}
      </div>
          </div>
        </section>
      )}

      <DashboardToastStack toasts={toasts} />

      {editingScope && (
        <QaqcScopeUpdateModal
          scope={editingScope}
          isSaving={isSavingScope}
          error={scopeFormError}
          onClose={() => {
            if (!isSavingScope) setEditingScope(null);
          }}
          onSubmit={handleSaveScopeProgress}
        />
      )}

      {hseFormOpen && resolvedProject && (
        <HealthSafetyMonthlyForm
          projectName={resolvedProject}
          record={hseDashboard?.currentMonth ?? null}
          existingRecords={hseDashboard?.monthlyRecords ?? []}
          isSaving={isSavingHse}
          error={hseFormError}
          onClose={() => {
            if (!isSavingHse) setHseFormOpen(false);
          }}
          onSubmit={handleSaveHse}
        />
      )}
    </div>
  );
};

export default MyScopesPage;