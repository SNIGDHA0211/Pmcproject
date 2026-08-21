import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { Project, MonthlyScope, MonthlyScopeCategory, MonthlyScopeSubcategory } from '../types';
import { authApi, dprApi, monthlyScopeApi } from '../services/api';
import { useTheme, getThemeClasses } from '../utils/theme';
import {
  readScopeCumulativeQuantity,
  readScopeExecutedQuantity,
  readScopePlannedQuantity,
  readScopeProgressPercent,
  readScopeRemainingQuantity,
  resolveScopeRemainingQuantity,
  toScopeNumber,
} from '../utils/scopeProgressFields';
import { formatUserFacingError } from '../utils/formErrors';

interface ScopeActivity {
  id: string;
  category: string;
  subcategory: string;
  scopeId: string;
  scope?: MonthlyScope;
  executedQuantity: number;
  nextDayPlannedWork: string;
  remarks: string;
  // Display fields — populated from backend scope/activity, never locally recalculated
  plannedQuantity?: number;
  unit?: string;
  cumulativeQuantity?: number;
  remainingQuantity?: number;
  progressPercentage?: number;
}

/** Bind readonly qty/progress fields from a monthly-scope (or nested scope) API object. */
function bindScopeProgressFields(
  scope: MonthlyScope | Record<string, unknown> | null | undefined,
  overrides?: Partial<
    Pick<
      ScopeActivity,
      | 'executedQuantity'
      | 'cumulativeQuantity'
      | 'progressPercentage'
      | 'remainingQuantity'
      | 'plannedQuantity'
      | 'unit'
    >
  >,
): Pick<
  ScopeActivity,
  | 'plannedQuantity'
  | 'unit'
  | 'cumulativeQuantity'
  | 'remainingQuantity'
  | 'progressPercentage'
> {
  const planned = overrides?.plannedQuantity ?? readScopePlannedQuantity(scope);
  const cumulative =
    overrides?.cumulativeQuantity ?? readScopeCumulativeQuantity(scope) ?? 0;
  const progress =
    overrides?.progressPercentage ?? readScopeProgressPercent(scope) ?? 0;
  const remaining =
    overrides?.remainingQuantity != null
      ? resolveScopeRemainingQuantity(
          { remaining_quantity: overrides.remainingQuantity },
          planned,
          cumulative,
        )
      : resolveScopeRemainingQuantity(scope, planned, cumulative);
  const unitFromScope =
    scope && typeof scope === 'object' && typeof (scope as { unit?: unknown }).unit === 'string'
      ? String((scope as { unit: string }).unit)
      : undefined;

  return {
    plannedQuantity: planned,
    unit: overrides?.unit ?? unitFromScope,
    cumulativeQuantity: cumulative,
    remainingQuantity: remaining,
    progressPercentage: progress,
  };
}

interface DPRSubmissionFormProps {
  onClose: () => void;
  onSubmit: (dprData: any) => void;
  assignedProjects: Project[];
  existingDPR?: any; // Add prop for pre-filling data
}

/** Safe id from API fields that may be number, nested object, or null. */
function nestedEntityId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    return id == null ? '' : String(id);
  }
  return String(value);
}

/** Create/patch responses nest id under dpr_id / dpr.id — top-level id is often missing. */
function resolveDprIdFromResponse(
  data: unknown,
  fallbackId?: string | number | null,
): string {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const nested = [obj.dpr, obj.data, obj.record, obj.result].find(
      (item) => item && typeof item === 'object' && !Array.isArray(item),
    ) as Record<string, unknown> | undefined;
    const candidates = [
      obj.id,
      obj.dpr_id,
      nested?.id,
      nested?.dpr_id,
    ];
    for (const c of candidates) {
      if (c != null && String(c).trim() !== '') return String(c);
    }
  }
  if (fallbackId != null && String(fallbackId).trim() !== '') return String(fallbackId);
  return '';
}

function resolveDprStatusFromResponse(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as Record<string, unknown>;
  const nested = [obj.dpr, obj.data, obj.record].find(
    (item) => item && typeof item === 'object' && !Array.isArray(item),
  ) as Record<string, unknown> | undefined;
  return String(obj.status ?? nested?.status ?? '').trim();
}

/** Backend: POST /dpr/{id}/submit/ is only for draft / rejected resubmit (not new create). */
function isDraftOrRejectedStatus(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase();
  return s === 'draft' || s.includes('reject');
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

      // Map scope-based activities — bind cumulative/progress from API, do not recompute
      if (existingDPR.activities && existingDPR.activities.length > 0) {
        setActivities(existingDPR.activities.map((act: any, index: number) => {
          const scopeObj =
            act.scope && typeof act.scope === 'object' ? act.scope : undefined;
          const progressFields = bindScopeProgressFields(scopeObj ?? act, {
            executedQuantity: readScopeExecutedQuantity(act),
            cumulativeQuantity:
              readScopeCumulativeQuantity(act) ??
              readScopeCumulativeQuantity(scopeObj) ??
              undefined,
            progressPercentage:
              readScopeProgressPercent(act) ??
              readScopeProgressPercent(scopeObj) ??
              undefined,
            remainingQuantity:
              readScopeRemainingQuantity(act) ??
              readScopeRemainingQuantity(scopeObj) ??
              undefined,
            plannedQuantity:
              readScopePlannedQuantity(act) ||
              readScopePlannedQuantity(scopeObj) ||
              undefined,
          });
          return {
            id: act.id?.toString() || Date.now().toString() + index,
            category: nestedEntityId(act.category || scopeObj?.category),
            subcategory: nestedEntityId(act.subcategory || scopeObj?.subcategory),
            scopeId:
              nestedEntityId(act.scope) ||
              nestedEntityId(act.scope_id) ||
              '',
            executedQuantity: toScopeNumber(act.executed_quantity),
            nextDayPlannedWork: act.next_day_planned_work || '',
            remarks: act.remarks || '',
            scope: scopeObj,
            ...progressFields,
          };
        }));
      }
    }
  }, [existingDPR, assignedProjects]);

  const selectedProject = assignedProjects.find(p => p && p.id === selectedProjectId);

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

  // Keep project selection valid when assigned list changes / loads.
  useEffect(() => {
    if (!assignedProjects.length) {
      setSelectedProjectId('');
      return;
    }
    const stillValid = assignedProjects.some((p) => p?.id === selectedProjectId);
    if (!stillValid) {
      setSelectedProjectId(assignedProjects[0]?.id || '');
    }
  }, [assignedProjects, selectedProjectId]);

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
    setFormError('');
    setFormSuccess('');
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== id) return act;
        const updatedAct: ScopeActivity = { ...act, [field]: value };

        // Selecting a scope: bind backend cumulative_quantity / progress as-is.
        if (field === 'scopeId' && value) {
          const selectedScope = availableScopes.find(
            (s) => s && String(s.id) === String(value),
          );
          if (selectedScope) {
            updatedAct.scope = selectedScope;
            Object.assign(updatedAct, bindScopeProgressFields(selectedScope));
          }
        }

        // Executed qty is user input only — do NOT recompute cumulative/progress locally.
        // Those fields stay bound to the last API scope payload until scopes are refetched.

        return updatedAct;
      }),
    );
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitStage, setSubmitStage] = useState('');
  const submitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Scope-related functions
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await monthlyScopeApi.getCategories();
      const categoriesData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setCategories((categoriesData || []).filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchAvailableScopes = async () => {
    if (!selectedProjectId) {
      setAvailableScopes([]);
      return;
    }

    setLoadingScopes(true);
    try {
      const response = await monthlyScopeApi.getMyScopes({
        project: selectedProjectId
      });
      const scopesData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setAvailableScopes((scopesData || []).filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch available scopes:', error);
      setAvailableScopes([]);
    } finally {
      setLoadingScopes(false);
    }
  };

  // Get subcategories for a specific category
  const getSubcategoriesForCategory = (categoryId: string) => {
    const category = categories.find(c => c && String(c.id) === String(categoryId));
    return category?.subcategories || [];
  };

  // Get categories that actually have scopes assigned to this project
  const getProjectCategories = () => {
    if (availableScopes.length === 0) return categories;
    
    // We want to show categories that have at least one scope in availableScopes
    const projectCategoryIds = new Set(
      availableScopes.map((s) => nestedEntityId(s?.category)).filter(Boolean),
    );

    const projectCategories = categories.filter(
      (cat) => cat && projectCategoryIds.has(String(cat.id)),
    );
    
    // If we have scopes but their categories aren't in the master list, synthesize them
    if (projectCategories.length === 0 && availableScopes.length > 0) {
      const synthesized: MonthlyScopeCategory[] = [];
      availableScopes.forEach(s => {
        const id = nestedEntityId(s?.category);
        const name = s.category_name || `Category ${id}`;
        if (id && !synthesized.some(c => String(c.id) === id)) {
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
      .filter(s => nestedEntityId(s?.category) === String(categoryId))
      .map(s => nestedEntityId(s?.subcategory))
      .filter(Boolean)
    );

    const projectSubcats = allSubcats.filter(
      (sub) => sub && projectSubcatIds.has(String(sub.id)),
    );

    // Synthesize if missing from master list
    if (projectSubcats.length === 0) {
      const synthesized: MonthlyScopeSubcategory[] = [];
      availableScopes.forEach(s => {
        const sCatId = nestedEntityId(s?.category);
        const id = nestedEntityId(s?.subcategory);
        const name = s.subcategory_name || `Subcategory ${id}`;
        if (sCatId === String(categoryId) && id && !synthesized.some(sub => String(sub.id) === id)) {
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
      if (!scope) return false;
      // Handle both ID (number) and full object if returned by API
      const sCatId = nestedEntityId(scope.category);
      const sSubId = nestedEntityId(scope.subcategory);

      if (categoryId && sCatId !== String(categoryId)) return false;
      if (subcategoryId && sSubId !== String(subcategoryId)) return false;
      return true;
    });
  };

  // Effect to fetch categories and scopes on mount and when project changes
  useEffect(() => {
    fetchCategories();
    fetchAvailableScopes();
  }, [selectedProjectId]);

  // When scopes load/refresh, re-bind cumulative/progress from API (never local formulas).
  useEffect(() => {
    if (!availableScopes.length) return;
    setActivities((prev) =>
      prev.map((act) => {
        if (!act.scopeId) return act;
        const selectedScope = availableScopes.find(
          (s) => s && String(s.id) === String(act.scopeId),
        );
        if (!selectedScope) return act;
        return {
          ...act,
          scope: selectedScope,
          category: act.category || nestedEntityId(selectedScope.category),
          subcategory: act.subcategory || nestedEntityId(selectedScope.subcategory),
          ...bindScopeProgressFields(selectedScope),
        };
      }),
    );
  }, [availableScopes]);

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
    setFormError('');
    setFormSuccess('');

    if (!selectedProjectId) {
      setFormError('Please select a project before submitting the DPR.');
      return;
    }

    if (activities.length === 0) {
      setFormError('Please add at least one activity with a scope and executed quantity.');
      return;
    }

    // Validate each activity with plain-language messages
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const label = `Activity ${i + 1}`;
      if (!activity.category) {
        setFormError(`${label}: select a Category.`);
        return;
      }
      if (!activity.subcategory) {
        setFormError(`${label}: select a Subcategory.`);
        return;
      }
      if (!activity.scopeId) {
        setFormError(`${label}: select a Scope.`);
        return;
      }
      if (!(activity.executedQuantity > 0)) {
        setFormError(
          `${label}: enter Executed Qty greater than 0 (how much work was done today).`,
        );
        return;
      }
      const planned =
        activity.plannedQuantity ??
        readScopePlannedQuantity(activity.scope) ??
        0;
      const cumulative =
        activity.cumulativeQuantity ??
        readScopeCumulativeQuantity(activity.scope) ??
        0;
      const remaining = resolveScopeRemainingQuantity(
        activity.scope ?? {
          remaining_quantity: activity.remainingQuantity,
          planned_quantity: planned,
          cumulative_quantity: cumulative,
        },
        planned,
        cumulative,
      );
      if (activity.executedQuantity > remaining + 1e-9) {
        setFormError(
          `${label}: Executed Qty (${activity.executedQuantity}) is more than remaining (${remaining}). Planned is ${planned}, already completed (cumulative) is ${cumulative}. Enter ${remaining} or less.`,
        );
        return;
      }
    }
    if (!issuedBy.trim()) {
      setFormError('Please enter Issued By (your name).');
      return;
    }
    if (!designation.trim()) {
      setFormError('Please enter Designation (your role, e.g. Site Engineer).');
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);
    setSubmitStage('Preparing DPR data…');

    // Simulated progress — crawls from 0 → 85% over ~18s, pauses to wait for API
    const startTime = Date.now();
    submitTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      let pct: number;
      let stage: string;
      if (elapsed < 2) {
        pct = Math.min(15, elapsed * 7.5);
        stage = 'Preparing DPR data…';
      } else if (elapsed < 6) {
        pct = 15 + (elapsed - 2) * 7.5;
        stage = 'Saving activities to server…';
      } else if (elapsed < 12) {
        pct = 45 + (elapsed - 6) * 5;
        stage = 'Processing on server…';
      } else {
        pct = Math.min(85, 75 + (elapsed - 12) * 1);
        stage = 'Waiting for confirmation…';
      }
      setSubmitProgress(Math.round(pct));
      setSubmitStage(stage);
    }, 250);

    try {
      const dprPayload = buildPayload();

      let response;
      let dprId = '';
      const priorStatus = existingDPR?.status;
      const needsResubmitApi = Boolean(
        existingDPR?.id && isDraftOrRejectedStatus(priorStatus),
      );

      if (existingDPR && existingDPR.id) {
        // Update existing row (rejected / draft / same-day merge).
        response = await dprApi.patchDPR(existingDPR.id, dprPayload);
        dprId = resolveDprIdFromResponse(response.data, existingDPR.id);
      } else {
        // New DPR — POST /api/dpr/ already queues initial submission email
        // when status becomes pending_team_lead. Do NOT call /submit/ or notify.
        response = await dprApi.createDPR(dprPayload);
        dprId = resolveDprIdFromResponse(response.data);
      }

      if (!dprId) {
        throw new Error(
          'DPR was saved but the server did not return an ID.',
        );
      }

      // Resubmit email path: draft / rejected only → POST /dpr/{id}/submit/
      if (needsResubmitApi) {
        setSubmitStage('Resubmitting for approval…');
        await dprApi.submitDPR(dprId, 'Site Engineer');
      }

      // API responded — immediately jump to 100%
      if (submitTimerRef.current) { clearInterval(submitTimerRef.current); submitTimerRef.current = null; }
      setSubmitProgress(100);
      setSubmitStage('DPR submitted successfully!');

      const nextStatus =
        resolveDprStatusFromResponse(response?.data) ||
        (needsResubmitApi ? 'pending_team_lead' : 'pending_team_lead');

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
        status: nextStatus || 'PENDING',
        report: response?.data ?? null,
        dprId,
      };

      setFormSuccess('DPR submitted successfully.');
      window.dispatchEvent(
        new CustomEvent('pmc:notification', {
          detail: {
            type: 'dpr_submitted',
            title: 'DPR Submitted',
            message: `DPR submitted for "${selectedProject?.title || ''}" by ${issuedBy.trim()}.`,
            timestamp: new Date().toISOString(),
            data: {
              project_id: selectedProjectId,
              dpr_id: dprId,
            },
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('pmc:dpr-saved', {
          detail: { projectId: selectedProjectId, dprId },
        }),
      );

      // Brief pause at 100% so user sees success before modal closes
      await new Promise((r) => setTimeout(r, 800));

      onSubmit(submissionData);
      onClose();
      void fetchAvailableScopes();
    } catch (error: unknown) {
      if (submitTimerRef.current) { clearInterval(submitTimerRef.current); submitTimerRef.current = null; }
      setSubmitProgress(0);
      setSubmitStage('');
      console.error('DPR Submission Error:', error);
      setFormError(
        formatUserFacingError(error, {
          fallback: 'Failed to submit DPR. Please check the form and try again.',
          context: 'DPR',
        }),
      );
    } finally {
      if (submitTimerRef.current) { clearInterval(submitTimerRef.current); submitTimerRef.current = null; }
      setIsSubmitting(false);
    }
  };

  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const handleSaveDraft = async () => {
    setFormError('');
    setFormSuccess('');

    if (!selectedProjectId) {
      setFormError('Please select a project before saving a draft.');
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

      setFormSuccess('Draft saved successfully.');
      onClose();
    } catch (error: unknown) {
      console.error('Draft Save Error:', error);
      setFormError(
        formatUserFacingError(error, {
          fallback: 'Failed to save draft. Please check the form and try again.',
          context: 'DPR draft',
        }),
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const labelCls = `block text-[10px] font-black ${themeClasses.textSecondary} uppercase tracking-widest mb-1.5`;
  const inputCls = `w-full px-3.5 py-2.5 ${themeClasses.input} ${themeClasses.border} rounded-xl text-sm font-semibold ${themeClasses.textPrimary} outline-none focus:ring-2 focus:ring-indigo-500/20 transition-shadow`;
  const sectionCls = `${themeClasses.border} rounded-2xl p-4 md:p-5 ${
    isDarkTheme ? 'bg-white/[0.03]' : 'bg-slate-50/80'
  }`;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 ${
        isDarkTheme ? 'bg-black/60 backdrop-blur-md' : 'bg-slate-900/25 backdrop-blur-sm'
      }`}
    >
      <div
        className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] ${themeClasses.glassCard} ${themeClasses.border}`}
      >
        {/* Submitting overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 rounded-2xl bg-black/60 backdrop-blur-sm">
            <div className="flex w-[340px] flex-col items-center gap-5 rounded-2xl border border-white/10 bg-slate-900/90 px-8 py-8 shadow-2xl">
              {submitProgress < 100 ? (
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <span className="absolute inset-0 animate-spin rounded-full border-4 border-white/10 border-t-indigo-400" />
                  <span className="text-sm font-black text-indigo-300">{submitProgress}%</span>
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                  <Icons.Approve size={28} className="text-emerald-400" />
                </div>
              )}

              <div className="w-full">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {submitProgress < 100 ? 'Submitting DPR' : 'Complete'}
                  </span>
                  <span className="text-sm font-black text-white">{submitProgress}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      submitProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${submitProgress}%` }}
                  />
                </div>
              </div>

              <p className="text-center text-xs font-semibold text-slate-400">{submitStage}</p>

              {submitProgress < 100 && (
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div
          className={`shrink-0 px-5 py-4 md:px-6 ${themeClasses.border} flex items-start justify-between gap-4 ${themeClasses.bgSecondary}`}
        >
          <div className="min-w-0">
            <h3 className={`text-lg md:text-xl font-black ${themeClasses.textPrimary} uppercase tracking-tight`}>
              Daily Progress Report
            </h3>
            <p className={`${themeClasses.textSecondary} font-semibold text-[11px] tracking-wide uppercase mt-0.5`}>
              Site Execution Management System
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 p-2 ${themeClasses.buttonSecondary} ${themeClasses.textMuted} hover:text-rose-500 rounded-xl transition-all`}
            aria-label="Close"
          >
            <Icons.Reject size={18} />
          </button>
        </div>

        {/* Main Form Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5">
          <form id="dpr-form" onSubmit={handleSubmit} className="space-y-4">
            {(formError || formSuccess) && (
              <div
                role="alert"
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  formError
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {formError || formSuccess}
              </div>
            )}
            {/* Section 1: Project Information */}
            <section className={sectionCls}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black ${themeClasses.buttonPrimary}`}
                >
                  1
                </span>
                <h4 className={`text-xs font-black ${themeClasses.textPrimary} uppercase tracking-widest`}>
                  Project Information
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    className={inputCls}
                  >
                    {assignedProjects.filter(Boolean).map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className={isDarkTheme ? 'bg-slate-900' : 'bg-white'}
                      >
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Job No</label>
                  <input
                    type="text"
                    value={jobNo}
                    onChange={(e) => setJobNo(e.target.value)}
                    className={inputCls}
                    placeholder="Enter job number"
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Scope-Based Activities */}
            <section className={sectionCls}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black ${themeClasses.buttonPrimary}`}
                  >
                    2
                  </span>
                  <h4 className={`text-xs font-black ${themeClasses.textPrimary} uppercase tracking-widest`}>
                    Scope-Based Activities
                  </h4>
                  <span className={`text-[10px] font-bold ${themeClasses.textMuted}`}>
                    ({activities.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addActivity}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${themeClasses.buttonPrimary} rounded-xl text-[10px] font-black uppercase tracking-widest transition-all`}
                >
                  <Icons.Add size={14} />
                  Add Activity
                </button>
              </div>

              <div className="space-y-3">
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    id={`activity-${activity.id}`}
                    className={`rounded-xl ${themeClasses.border} ${
                      isDarkTheme ? 'bg-black/20' : 'bg-white'
                    } p-3.5 md:p-4`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`h-7 w-7 shrink-0 ${themeClasses.buttonPrimary} rounded-lg flex items-center justify-center text-xs font-black`}
                        >
                          {index + 1}
                        </div>
                        <h5
                          className={`text-xs font-black ${themeClasses.textPrimary} uppercase tracking-widest truncate`}
                        >
                          Activity {index + 1}
                        </h5>
                      </div>
                      {activities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeActivity(activity.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${themeClasses.textMuted} hover:text-rose-500 hover:bg-rose-500/10 transition-all`}
                        >
                          <Icons.Reject size={14} />
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Row A — select cascade */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>
                          Category <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={activity.category}
                          onChange={(e) => updateActivity(activity.id, 'category', e.target.value)}
                          className={inputCls}
                        >
                          <option value="">
                            {loadingCategories ? 'Loading...' : 'Select category'}
                          </option>
                          {getProjectCategories().map((category) => (
                            <option
                              key={category.id}
                              value={category.id}
                              className={isDarkTheme ? 'bg-slate-900' : 'bg-white'}
                            >
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelCls}>
                          Subcategory <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={activity.subcategory}
                          onChange={(e) =>
                            updateActivity(activity.id, 'subcategory', e.target.value)
                          }
                          disabled={!activity.category}
                          className={`${inputCls} disabled:opacity-50`}
                        >
                          <option value="">
                            {!activity.category
                              ? 'Select category first'
                              : getProjectSubcategories(activity.category).length === 0
                                ? 'No subcategories available'
                                : 'Select subcategory'}
                          </option>
                          {getProjectSubcategories(activity.category).map((subcategory) => (
                            <option
                              key={subcategory.id}
                              value={subcategory.id}
                              className={isDarkTheme ? 'bg-slate-900' : 'bg-white'}
                            >
                              {subcategory.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-1">
                        <label className={labelCls}>
                          Scope <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={activity.scopeId}
                          onChange={(e) => updateActivity(activity.id, 'scopeId', e.target.value)}
                          disabled={!activity.category || !activity.subcategory}
                          className={`${inputCls} disabled:opacity-50`}
                        >
                          <option value="">
                            {loadingScopes
                              ? 'Loading scopes...'
                              : !activity.category || !activity.subcategory
                                ? 'Select category & subcategory first'
                                : getScopesForFilters(activity.category, activity.subcategory)
                                      .length === 0
                                  ? 'No scopes available'
                                  : 'Select scope'}
                          </option>
                          {getScopesForFilters(activity.category, activity.subcategory).map(
                            (scope) => (
                              <option
                                key={scope.id}
                                value={scope.id}
                                className={isDarkTheme ? 'bg-slate-900' : 'bg-white'}
                              >
                                {scope.description || `Scope ${scope.id}`}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Row B — quantities */}
                    <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className={labelCls}>
                          Executed Qty <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={activity.executedQuantity}
                          onChange={(e) =>
                            updateActivity(
                              activity.id,
                              'executedQuantity',
                              Math.max(0, Number(e.target.value)),
                            )
                          }
                          min="0"
                          className={inputCls}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Planned Qty</label>
                        <input
                          type="text"
                          value={
                            activity.scope
                              ? `${activity.scope.planned_quantity ?? '—'} ${activity.scope.unit || ''}`.trim()
                              : '—'
                          }
                          readOnly
                          className={`${inputCls} ${themeClasses.textMuted} cursor-default opacity-90`}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Cumulative Qty</label>
                        <input
                          type="text"
                          value={
                            activity.scopeId
                              ? String(
                                  activity.cumulativeQuantity ??
                                    readScopeCumulativeQuantity(activity.scope) ??
                                    0,
                                )
                              : '—'
                          }
                          readOnly
                          className={`${inputCls} ${themeClasses.textMuted} cursor-default opacity-90`}
                          title="From API cumulative_quantity"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Progress %</label>
                        <input
                          type="text"
                          value={
                            activity.scopeId
                              ? `${
                                  Math.round(
                                    (activity.progressPercentage ??
                                      readScopeProgressPercent(activity.scope) ??
                                      0) * 100,
                                  ) / 100
                                }%`
                              : '—'
                          }
                          readOnly
                          className={`${inputCls} ${themeClasses.textMuted} cursor-default opacity-90`}
                          title="From API progress / progress_percentage"
                        />
                      </div>
                    </div>

                    {/* Row C — notes */}
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Next Day Planned Work</label>
                        <input
                          type="text"
                          value={activity.nextDayPlannedWork}
                          onChange={(e) =>
                            updateActivity(activity.id, 'nextDayPlannedWork', e.target.value)
                          }
                          className={inputCls}
                          placeholder="Plan for tomorrow"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Remarks</label>
                        <input
                          type="text"
                          value={activity.remarks}
                          onChange={(e) => updateActivity(activity.id, 'remarks', e.target.value)}
                          className={inputCls}
                          placeholder="Optional remarks"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Additional Details */}
            <section className={sectionCls}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black ${themeClasses.buttonPrimary}`}
                >
                  3
                </span>
                <h4 className={`text-xs font-black ${themeClasses.textPrimary} uppercase tracking-widest`}>
                  Additional Details
                </h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Unresolved Issues</label>
                  <textarea
                    value={unresolvedIssues}
                    onChange={(e) => setUnresolvedIssues(e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none`}
                    placeholder="Describe unresolved issues..."
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Pending Letters
                    <span className={`ml-1 font-normal normal-case ${themeClasses.textMuted}`}>
                      (client/contractor refs)
                    </span>
                  </label>
                  <textarea
                    value={pendingLetters}
                    onChange={(e) => setPendingLetters(e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none`}
                    placeholder="Pending letters with references..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Quality Status</label>
                  <textarea
                    value={qualityStatus}
                    onChange={(e) => setQualityStatus(e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none`}
                    placeholder="Quality checks / material status..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Important Incidents (Next Day)</label>
                  <textarea
                    value={importantIncidents}
                    onChange={(e) => setImportantIncidents(e.target.value)}
                    rows={2}
                    className={`${inputCls} resize-none`}
                    placeholder="Incidents planned / expected tomorrow..."
                  />
                </div>
                <div>
                  <label className={labelCls}>Billing Status</label>
                  <input
                    type="text"
                    value={billingStatus}
                    onChange={(e) => setBillingStatus(e.target.value)}
                    className={inputCls}
                    placeholder="Enter billing status"
                  />
                </div>
                <div>
                  <label className={labelCls}>GFC Drawings Status</label>
                  <input
                    type="text"
                    value={gfcStatus}
                    onChange={(e) => setGfcStatus(e.target.value)}
                    className={inputCls}
                    placeholder="Enter GFC drawings status"
                  />
                </div>
              </div>
            </section>

            {/* Section 4: Signature */}
            <section className={sectionCls}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black ${themeClasses.buttonPrimary}`}
                >
                  4
                </span>
                <h4 className={`text-xs font-black ${themeClasses.textPrimary} uppercase tracking-widest`}>
                  Signature & Authorization
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    Issued By <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    className={inputCls}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className={inputCls}
                    placeholder="Enter designation"
                  />
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer Actions — all primary actions together */}
        <div
          className={`shrink-0 px-5 py-3.5 md:px-6 ${themeClasses.border} ${themeClasses.bgSecondary} flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isSavingDraft}
            className={`px-5 py-2.5 ${themeClasses.textSecondary} font-black text-[11px] uppercase tracking-widest rounded-xl ${themeClasses.buttonSecondary} transition-all disabled:opacity-50`}
          >
            Cancel
          </button>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className={`px-5 py-2.5 font-black text-[11px] uppercase tracking-widest rounded-xl ${themeClasses.buttonSecondary} ${themeClasses.border} ${themeClasses.textSecondary} transition-all disabled:opacity-50`}
            >
              {isSavingDraft ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="submit"
              form="dpr-form"
              disabled={isSubmitting || isSavingDraft}
              className={`px-6 py-2.5 ${themeClasses.buttonPrimary} font-black text-[11px] uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/15 transition-all disabled:opacity-50`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit DPR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DPRSubmissionForm;
