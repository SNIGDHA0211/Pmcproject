import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, UserRole, Project, MonthlyScope, MonthlyScopeCategory, MonthlyScopeSubcategory, MonthlyScopeFilters } from '../types';
import { monthlyScopeApi, unwrapList } from '../services/api';
import { useTheme, getThemeClasses } from '../utils/theme';
import { Icons } from './Icons';
import ScopeTable from './ScopeTable';
import ScopeForm from './ScopeForm';
import ScopeFilters from './ScopeFilters';
import { websocketService, NotificationData } from '../services/websocket';
import { countDelayedScopes } from '../utils/scopeSchedule';
import { formatReportDate, formatReportMonth } from '../utils/csvReport';
import { downloadSectionsExcel } from '../utils/projectReportExcel';
import {
  applyMonthlyScopeFilters,
  buildMonthlyScopeQueryParams,
  normalizeScopeStatus,
} from '../utils/monthlyScopeFilters';
import { userMatchesAssignee } from '../utils/roleProjectAssignments';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { isAbortError } from '../utils/isAbortError';

interface MonthlyScopePageProps {
  user: User;
  projects: Project[];
}

/** Projects this user may manage on Monthly Scope (assigned only). */
function projectsAssignedToMonthlyScopeUser(projects: Project[], user: User): Project[] {
  if (user.role === UserRole.TEAM_LEAD) {
    return projects.filter(
      (project) =>
        Boolean(project.teamLeadId) && userMatchesAssignee(user, project.teamLeadId),
    );
  }
  return projects;
}

// Tour step type updated to support nullable refs (for both page elements and form controls)
interface TourStep {
  title: string;
  description: string;
  target?: React.RefObject<HTMLElement | null> | null;
  id?: string;
  section?: string;
}

const MonthlyScopePage: React.FC<MonthlyScopePageProps> = ({ user, projects }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const assignedProjects = useMemo(
    () => projectsAssignedToMonthlyScopeUser(projects, user),
    [projects, user],
  );

  // If assignment matching fails (backend sends id while frontend stores username, etc.)
  // fall back to all projects so the dropdown isn't blank.
  const accessibleProjects = assignedProjects.length > 0 ? assignedProjects : projects;

  const defaultProjectId = useMemo(() => {
    const first = accessibleProjects[0];
    if (!first?.id) return undefined;
    const id = Number(first.id);
    return Number.isFinite(id) ? id : undefined;
  }, [accessibleProjects]);

  const lockToAssignedProject = user.role === UserRole.TEAM_LEAD && assignedProjects.length > 0;

  const [scopes, setScopes] = useState<MonthlyScope[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingScope, setEditingScope] = useState<MonthlyScope | null>(null);
  const [filters, setFilters] = useState<MonthlyScopeFilters>({});
  const [categories, setCategories] = useState<MonthlyScopeCategory[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // === MINIMAL SAFE TOUR (as per final instructions) ===
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [popupPosition, setPopupPosition] = useState({ top: 120, left: window.innerWidth - 400 });
  const [arrowSide, setArrowSide] = useState<'left' | 'right'>('left');
  const [arrowTopOffset, setArrowTopOffset] = useState(0);

  // Modal states (safe, only via useEffect)
  const [createScopeOpen, setCreateScopeOpen] = useState(false);
  const [modalTourReady, setModalTourReady] = useState(false);

  // Refs for safe target highlighting only (no positioning)
  const filtersRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Modal field refs (for form walkthrough) - typed to match the actual DOM elements they are attached to in ScopeForm
  const projectFieldRef = useRef<HTMLSelectElement | null>(null);
  const monthFieldRef = useRef<HTMLInputElement | null>(null);
  const categoryFieldRef = useRef<HTMLElement | null>(null);
  const subcategoryFieldRef = useRef<HTMLDivElement | null>(null);
  const descriptionFieldRef = useRef<HTMLTextAreaElement | null>(null);
  const unitFieldRef = useRef<HTMLDivElement | null>(null);
  const quantityFieldRef = useRef<HTMLElement | null>(null);
  const sectionFieldRef = useRef<HTMLDivElement | null>(null);
  const locationFieldRef = useRef<HTMLDivElement | null>(null);
  const startDateFieldRef = useRef<HTMLDivElement | null>(null);
  const endDateFieldRef = useRef<HTMLDivElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  const steps: TourStep[] = [
    {
      title: "Welcome to Monthly Scope",
      description: "Manage and track monthly project scope activities.",
      target: null
    },
    {
      title: "Filters",
      description: "Use filters to search records by project, month, and status.",
      target: filtersRef
    },
    {
      title: "Search",
      description: "Quickly search scope entries in the filter toolbar.",
      target: filtersRef
    },
    {
      title: "Scope Table",
      description: "This table displays all monthly scope records.",
      target: tableRef
    },
    {
      id: "create-scope-trigger",
      title: "Create Scope",
      description: "Click here to create a new monthly scope activity.",
      target: createButtonRef
    },
    // Modal steps (only become active after modal is ready)
    {
      section: "modal",
      title: "Project Selection",
      description: "Choose the project for which this monthly scope activity is being created.",
      target: projectFieldRef
    },
    {
      section: "modal",
      title: "Month Selection",
      description: "Select the execution month for this planned work.",
      target: monthFieldRef
    },
    {
      section: "modal",
      title: "Category",
      description: "Choose the main work category such as Foundation, RCC, or Finishing.",
      target: categoryFieldRef
    },
    {
      section: "modal",
      title: "Subcategory",
      description: "Select the detailed work subcategory.",
      target: subcategoryFieldRef
    },
    {
      section: "modal",
      title: "Work Description",
      description: "Provide a clear description of the scope activity.",
      target: descriptionFieldRef
    },
    {
      section: "modal",
      title: "Planned Quantity",
      description: "Enter the planned execution quantity.",
      target: quantityFieldRef
    },
    {
      section: "modal",
      title: "Unit",
      description: "Specify the measurement unit (e.g. Nos, Sq.m, Cu.m).",
      target: unitFieldRef
    },
    {
      section: "modal",
      title: "Section",
      description: "Specify the project section or execution area.",
      target: sectionFieldRef
    },
    {
      section: "modal",
      title: "Location",
      description: "Enter the exact site or work location.",
      target: locationFieldRef
    },
    {
      section: "modal",
      title: "Start Date",
      description: "Set the planned start date for the activity.",
      target: startDateFieldRef
    },
    {
      section: "modal",
      title: "End Date",
      description: "Set the planned end date for the activity.",
      target: endDateFieldRef
    },
    {
      section: "modal",
      title: "Save Scope",
      description: "Click here to save and create the monthly scope activity.",
      target: saveButtonRef
    }
  ];

  // Safe highlight effect - only adds/removes class on active target
  // Also respects the modal gate so we don't try to highlight before the modal exists
  useEffect(() => {
    if (!showTour) return;

    const activeStep = steps[currentStep];
    const isModalStep = activeStep?.section === "modal";

    // Block highlighting modal targets until the modal is actually ready
    if (isModalStep && !modalTourReady) return;

    const element = activeStep?.target?.current;

    if (element) {
      element.classList.add('active-tour-target');

      return () => {
        element.classList.remove('active-tour-target');
      };
    }
  }, [currentStep, showTour, modalTourReady]);

  // Wait for modal to actually mount + key refs to exist (called from Next handler on trigger step)
  // This effect only sets modalTourReady when the modal is open (opened from Next button)
  useEffect(() => {
    if (!createScopeOpen) return;

    const timer = setTimeout(() => {
      const hasModalRefs =
        projectFieldRef.current &&
        monthFieldRef.current &&
        categoryFieldRef.current;

      if (hasModalRefs) {
        setModalTourReady(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [createScopeOpen]);

  // Dynamic popup positioning + callout arrow (target-aware, clamped)
  useEffect(() => {
    if (!showTour) return;

    const activeStep = steps[currentStep];
    const targetEl = activeStep?.target?.current;

    if (!targetEl) {
      setPopupPosition({ top: 120, left: window.innerWidth - 400 });
      setArrowSide('left');
      setArrowTopOffset(0);
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const popupWidth = 360;
    const gap = 24;
    const viewportPadding = 24;
    const popupHeight = 220;

    const targetCenterY = rect.top + rect.height / 2 + window.scrollY;

    let left;
    let side: 'left' | 'right' = 'left';

    if (rect.left < window.innerWidth / 2) {
      left = rect.right + gap;
      side = 'left';
    } else {
      left = rect.left - popupWidth - gap;
      side = 'right';
    }

    let top = targetCenterY - (popupHeight / 2);

    const popupCenterY = top + (popupHeight / 2);
    const arrowOffset = targetCenterY - popupCenterY;
    setArrowTopOffset(arrowOffset);

    if (left < viewportPadding) left = viewportPadding;
    if (left + popupWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - popupWidth - viewportPadding;
    }
    if (top < viewportPadding) top = viewportPadding;
    if (top + popupHeight > window.innerHeight + window.scrollY - viewportPadding) {
      top = window.innerHeight + window.scrollY - popupHeight - viewportPadding;
    }

    setPopupPosition({ top, left });
    setArrowSide(side);
  }, [currentStep, showTour]);

  // Default / lock to the Team Lead's assigned project only.
  useEffect(() => {
    if (!lockToAssignedProject || defaultProjectId == null) return;
    const current = filters.project != null ? Number(filters.project) : null;
    const stillValid =
      current != null &&
      accessibleProjects.some((p) => Number(p.id) === current);
    if (stillValid) return;
    setFilters((prev) => ({ ...prev, project: defaultProjectId }));
  }, [
    lockToAssignedProject,
    defaultProjectId,
    accessibleProjects,
    filters.project,
  ]);

  const handleFiltersChange = useCallback(
    (next: MonthlyScopeFilters) => {
      if (lockToAssignedProject && defaultProjectId != null) {
        setFilters({ ...next, project: defaultProjectId });
        return;
      }
      setFilters(next);
    },
    [lockToAssignedProject, defaultProjectId],
  );

  const serverFilters = useMemo(
    () => ({
      project: filters.project,
      month: filters.month,
      search: filters.search,
    }),
    [filters.project, filters.month, filters.search]
  );

  // Debounce search so typing does not hit the API on every keypress.
  const debouncedServerSearch = useDebouncedValue(String(serverFilters.search ?? '').trim());
  const effectiveServerFilters = useMemo(
    () => ({
      project: serverFilters.project,
      month: serverFilters.month,
      search: debouncedServerSearch,
    }),
    [serverFilters.project, serverFilters.month, debouncedServerSearch],
  );

  const fetchScopes = useCallback(async (isBackgroundRefresh = false, signal?: AbortSignal) => {
    if (isBackgroundRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await monthlyScopeApi.getScopes(
        buildMonthlyScopeQueryParams(effectiveServerFilters),
        { signal },
      );
      if (signal?.aborted) return;
      const list = unwrapList<MonthlyScope>(response.data);
      setScopes(list);
      setLastUpdated(new Date());
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) return;
      console.error('Failed to fetch scopes:', error);
      if (!isBackgroundRefresh) {
        setScopes([]);
      }
    } finally {
      if (signal?.aborted) return;
      if (isBackgroundRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [effectiveServerFilters]);

  // WebSocket message handler for real-time scope updates
  const handleWebSocketMessage = useCallback((data: NotificationData) => {
    console.log('MonthlyScopePage received WebSocket message:', data);

    // Check if this is a scope-related notification
    if (data.type && (
      data.type.toLowerCase().includes('scope') ||
      data.type.toLowerCase().includes('monthly_scope') ||
      data.message.toLowerCase().includes('scope')
    )) {
      console.log('Scope-related notification detected, refreshing data...');
      fetchScopes(true); // Background refresh
    }
  }, [fetchScopes]);

  // Tour is now fully manual — user starts it via button (no auto popup)

  const fetchCategories = async () => {
    try {
      const response = await monthlyScopeApi.getCategories();
      console.log('Categories API response:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data keys:', Object.keys(response.data || {}));

      // Handle both paginated and direct array responses
      let categoriesData = [];
      if (Array.isArray(response.data)) {
        categoriesData = response.data;
        console.log('Response is direct array');
      } else if (response.data && Array.isArray(response.data.results)) {
        categoriesData = response.data.results;
        console.log('Response is paginated, using results array');
      } else {
        console.warn('Unexpected response format:', response.data);
        categoriesData = [];
      }

      console.log('Final mapped categories:', categoriesData);
      console.log('Categories count:', categoriesData.length);

      setCategories(categoriesData);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      console.error('Error details:', error?.response?.data);
      setCategories([]);
      alert(`Failed to load categories. Please check your connection and try again. Error: ${error?.response?.data?.detail || error.message}`);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchScopes(false, controller.signal);
    return () => controller.abort();
  }, [effectiveServerFilters, fetchScopes]);

  // Categories are static for the page — do not refetch on every filter change.
  useEffect(() => {
    void fetchCategories();
  }, []);

  // WebSocket setup for real-time updates
  useEffect(() => {
    console.log('Setting up WebSocket listener for Monthly Scope page');

    // Add WebSocket message listener
    websocketService.onMessage(handleWebSocketMessage);

    // Handle visibility change (when user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh immediately when tab becomes visible
        console.log('Tab became visible, refreshing Monthly Scope data');
        fetchScopes(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      console.log('Removing WebSocket listener for Monthly Scope page');
      websocketService.removeMessageListener(handleWebSocketMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleWebSocketMessage, fetchScopes]);

  const handleSubmitScope = async (scopeData: any) => {
    try {
      if (editingScope) {
        await monthlyScopeApi.updateScope(editingScope.id, scopeData);
        setEditingScope(null);
      } else {
        await monthlyScopeApi.createScope(scopeData);
        alert('Scope created successfully and automatically assigned to project site engineers.');
      }
      fetchScopes();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to submit scope:', error);
      throw error;
    }
  };

  const handleDeleteScope = async (scope: MonthlyScope) => {
    if (window.confirm('Are you sure you want to delete this scope?')) {
      try {
        await monthlyScopeApi.deleteScope(scope.id);
        fetchScopes();
      } catch (error) {
        console.error('Failed to delete scope:', error);
      }
    }
  };

  const handleEditScope = (scope: MonthlyScope) => {
    setEditingScope(scope);
    setShowForm(true);
  };

  const filteredScopes = useMemo(
    () => applyMonthlyScopeFilters(scopes, filters),
    [scopes, filters]
  );

  const kpiStats = useMemo(() => {
    const total = filteredScopes.length;
    const inProgress = filteredScopes.filter(
      (s) => normalizeScopeStatus(s.status) === 'in_progress'
    ).length;
    const completed = filteredScopes.filter(
      (s) => normalizeScopeStatus(s.status) === 'completed'
    ).length;
    const pending = filteredScopes.filter(
      (s) => normalizeScopeStatus(s.status) === 'pending'
    ).length;
    const avgCompletion =
      total > 0
        ? filteredScopes.reduce((sum, s) => sum + (Number(s.progress_percentage) || 0), 0) / total
        : 0;
    const delayed = countDelayedScopes(filteredScopes);
    return { total, inProgress, completed, pending, avgCompletion, delayed };
  }, [filteredScopes]);

  const exportScopesToExcel = useCallback(async () => {
    if (filteredScopes.length === 0) return;
    await downloadSectionsExcel(
      [
        {
          title: 'MONTHLY SCOPES',
          headers: [
            'Project Name',
            'Month',
            'Category',
            'Subcategory',
            'Planned Quantity',
            'Unit',
            'Section',
            'Location',
            'Status',
            'Start Date',
            'End Date',
            'Created By',
          ],
          rows: filteredScopes.map((scope) => [
            scope.project_name || '',
            formatReportMonth(scope.month),
            scope.category_name || '',
            scope.subcategory_name || '',
            scope.planned_quantity,
            scope.unit,
            scope.section,
            scope.location,
            scope.status,
            formatReportDate(scope.start_date),
            formatReportDate(scope.end_date),
            scope.created_by_name || '',
          ]),
        },
      ],
      `monthly-scopes-${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Monthly Scopes'
    );
  }, [filteredScopes]);

  const kpiCardClass = `flex h-[110px] flex-col justify-between rounded-2xl border p-5 ${
    isDarkTheme
      ? `${themeClasses.glassCard} ${themeClasses.border}`
      : 'border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
  }`;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 relative pt-1">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="monthly-scope-header min-w-0">
          <h2
            className={`text-[36px] font-bold leading-tight tracking-tight ${
              isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]'
            }`}
          >
            Monthly Scope of Work
          </h2>
          <p
            className={`mt-2 text-[15px] font-medium ${
              isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
            }`}
          >
            Monitor project execution, progress tracking, and scope management
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isRefreshing && (
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                isDarkTheme
                  ? `${themeClasses.border} ${themeClasses.textSecondary}`
                  : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'
              }`}
            >
              <Icons.Clock size={14} className="animate-spin" />
              Refreshing...
            </span>
          )}
          {lastUpdated && (
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                isDarkTheme
                  ? `${themeClasses.border} ${themeClasses.textSecondary}`
                  : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'
              }`}
              title={lastUpdated.toLocaleString()}
            >
              Last updated{' '}
              {lastUpdated.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          )}
          <button
            ref={createButtonRef}
            onClick={() => setShowForm(true)}
            className={`monthly-scope-create-btn inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition-all ${
              isDarkTheme
                ? themeClasses.buttonPrimary
                : 'bg-gradient-to-r from-[#2563EB] to-[#4F46E5] shadow-md shadow-indigo-500/20 hover:from-[#1d4ed8] hover:to-[#4338ca]'
            }`}
          >
            <Icons.Add size={16} />
            Create Scope
          </button>

          {user.role === 'TEAM_LEAD' && (
            <button
              type="button"
              onClick={() => {
                setCurrentStep(0);
                setShowTour(true);
              }}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
                isDarkTheme
                  ? `${themeClasses.border} ${themeClasses.buttonSecondary}`
                  : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50'
              }`}
            >
              <Icons.Help size={16} />
              Start Tour
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total Scopes', value: kpiStats.total, color: isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]' },
          { label: 'In Progress', value: kpiStats.inProgress, color: isDarkTheme ? 'text-blue-400' : 'text-[#2563EB]' },
          { label: 'Completed', value: kpiStats.completed, color: isDarkTheme ? 'text-emerald-400' : 'text-[#16A34A]' },
          { label: 'Pending', value: kpiStats.pending, color: isDarkTheme ? 'text-amber-400' : 'text-[#D97706]' },
          {
            label: 'Avg Completion %',
            value: `${kpiStats.avgCompletion.toFixed(0)}%`,
            color: isDarkTheme ? themeClasses.textPrimary : 'text-[#0F172A]',
          },
          {
            label: 'Delayed Activities',
            value: kpiStats.delayed,
            color: isDarkTheme ? 'text-rose-400' : 'text-[#DC2626]',
          },
        ].map((kpi) => (
          <div key={kpi.label} className={kpiCardClass}>
            <span
              className={`text-xs font-semibold tracking-wide ${
                isDarkTheme ? themeClasses.textSecondary : 'text-[#64748B]'
              }`}
            >
              {kpi.label}
            </span>
            <span className={`text-[36px] font-bold leading-none tabular-nums ${kpi.color}`}>
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

        {/* Filters */}
        <div ref={filtersRef}>
          <ScopeFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            projects={accessibleProjects}
            themeClasses={themeClasses}
            isDarkTheme={isDarkTheme}
            onExportExcel={exportScopesToExcel}
            lockProject={lockToAssignedProject}
          />
        </div>

        {/* Table */}
        <div ref={tableRef}>
          <ScopeTable
            scopes={filteredScopes}
            loading={loading}
            onEdit={handleEditScope}
            onDelete={handleDeleteScope}
            themeClasses={themeClasses}
            isDarkTheme={isDarkTheme}
          />
        </div>

        {/* Form Modal */}
        {showForm && (
          <ScopeForm
            scope={editingScope}
            projects={accessibleProjects}
            categories={categories}
            onSubmit={handleSubmitScope}
            onClose={() => {
              setShowForm(false);
              setEditingScope(null);
              if (showTour) {
                setCreateScopeOpen(false);
                setModalTourReady(false);
              }
            }}
            themeClasses={themeClasses}
            // Pass modal refs for tour (only used during tour)
            projectRef={projectFieldRef}
            monthRef={monthFieldRef}
            categoryRef={categoryFieldRef}
            subcategoryRef={subcategoryFieldRef}
            descriptionRef={descriptionFieldRef}
            unitRef={unitFieldRef}
            quantityRef={quantityFieldRef}
            sectionRef={sectionFieldRef}
            locationRef={locationFieldRef}
            startDateRef={startDateFieldRef}
            endDateRef={endDateFieldRef}
            saveRef={saveButtonRef}
          />
        )}

        {/* Soft dim overlay - pointer-events none so it doesn't block anything */}
        {showTour && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.35)",
                zIndex: 9990,
                pointerEvents: "none",
              }}
            />
            {/* Safe highlight CSS (injected only during tour) */}
            <style>{`
              .active-tour-target {
                position: relative;
                z-index: 9999;
                border-radius: 16px;
                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.28);
                transition: box-shadow 0.25s ease;
              }
            `}</style>
          </>
        )}

        {/* === DYNAMIC TOUR POPUP with callout arrow === */}
        {showTour && (
          <div
            style={{
              position: 'fixed',
              top: popupPosition.top,
              left: popupPosition.left,
              width: '360px',
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              zIndex: 999999,
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb',
              transition: 'top 0.25s ease, left 0.25s ease'
            }}
          >
            {/* Callout arrow */}
            <div
              style={{
                position: 'absolute',
                top: `calc(50% + ${arrowTopOffset}px)`,
                ...(arrowSide === 'left' ? { left: '-9px' } : { right: '-9px' }),
                transform: arrowSide === 'left' 
                  ? 'translateY(-50%) rotate(45deg)' 
                  : 'translateY(-50%) rotate(225deg)',
                width: '18px',
                height: '18px',
                background: 'white',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                zIndex: -1
              }}
            />

            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>
              {steps[currentStep].title}
            </h2>

            <p style={{ color: "#555", lineHeight: 1.6, marginBottom: "24px", fontSize: "14px" }}>
              {steps[currentStep].description}
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => {
                  setShowTour(false);
                  setCreateScopeOpen(false);
                  setModalTourReady(false);
                  if (showForm) setShowForm(false);
                }}
                style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: "13px" }}
              >
                Skip
              </button>

              <div style={{ display: "flex", gap: "12px" }}>
                {currentStep > 0 && (
                  <button
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      background: "white",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    Back
                  </button>
                )}

                <button
                  onClick={() => {
                    const current = steps[currentStep];

                    // Special handling for Create Scope step: open modal, wait, then advance
                    if (current?.id === "create-scope-trigger") {
                      setCreateScopeOpen(true);

                      setTimeout(() => {
                        setModalTourReady(true);
                        setCurrentStep(prev => prev + 1);
                      }, 350);

                      return;
                    }

                    // Normal advancement for all other steps
                    if (currentStep < steps.length - 1) {
                      setCurrentStep(prev => prev + 1);
                    } else {
                      setShowTour(false);
                      setCreateScopeOpen(false);
                      setModalTourReady(false);
                      if (showForm) setShowForm(false);
                    }
                  }}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#4f46e5",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px"
                  }}
                >
                  {currentStep === steps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: "16px", fontSize: "13px", color: "#888", textAlign: "right" }}>
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
        )}

      </div>
    );
  };
  
  export default MonthlyScopePage;