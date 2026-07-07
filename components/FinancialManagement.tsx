import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme, getThemeClasses } from '../utils/theme';
import { Icons } from './Icons';
import {
  normalizeContractValueRecord,
  normalizeContractPerformanceRecord,
  calculateContractPerformance,
  normalizeInvoicingRecord,
  unwrapList,
  savePlannedEarnedByPeriod,
  saveProjectProgressForPeriod,
  saveCostPerformanceForPeriod,
  saveBudgetPerformanceForPeriod,
  saveContractValueRecord,
  saveInvoicingRecord,
  saveContractPerformanceRecord,
  normalizePlannedEarnedByPeriod,
} from '../services/api';
import { extractRecordId, formatFinancialMonthYear } from '../utils/financialPeriod';
import PlannedEarnedValueFormSection, { type PlannedEarnedPartyFormValues } from './PlannedEarnedValueFormSection';
import { ContractPerformanceRecord, ContractValueRecord, ContractValueType, getInvoiceTypeLabel, InvoicingRecord, InvoiceType, Project, User } from '../types';
import FinancialManagementTour from './tours/FinancialManagementTour';
import FinancialManagementSkeleton from './financial/FinancialManagementSkeleton';
import FinancialManagementLoadingOverlay from './financial/FinancialManagementLoadingOverlay';
import FinancialSaveNotification, {
  type FinancialSaveNotificationItem,
} from './financial/FinancialSaveNotification';
import FinancialToolbar from './financial/FinancialToolbar';
import FinancialSegmentedTabs from './financial/FinancialSegmentedTabs';
import FinancialQuickUpdateCard, {
  FinancialFormGrid,
  financialFieldInput,
  financialFieldLabel,
} from './financial/FinancialQuickUpdateCard';
import FinancialTabAnalytics from './financial/FinancialTabAnalytics';
import { useFinancialManagementData } from '../hooks/useFinancialManagementData';
import type { FinancialDataSnapshot } from '../types/financialManagementCache';
import {
  financialCacheMatchesPeriod,
  getFinancialCacheEntry,
  patchFinancialCacheEntry,
} from '../utils/financialDataCache';
import { MONTH_OPTIONS } from '../utils/healthSafety';
import { fetchProjectProgressTrend } from '../services/financialDataService';
import { deriveFinancialExecutiveMetrics } from '../utils/financialDashboardMetrics';
import { contractorMasterApi } from '../services/contractorManagementApi';
import type { ContractorMasterRecord } from '../types/contractorManagement';
import { loadContractorFinancialBuckets } from '../utils/financialContractorForms';
import FinancialCashflowSection from './financial/FinancialCashflowSection';

interface FinancialManagementProps {
  projects?: Project[];
  currentUser?: User;
  onSaveSuccess?: () => void;
  initialSubTab?: SubTab;
  /** When opened from an alert, pre-select this project */
  initialProjectId?: string | null;
  /** When true (navigated from Projects edit), only the initial section tab is selectable */
  lockToInitialSection?: boolean;
  /** Tab id to return to (e.g. team_projects) when opened from Contractor Management */
  returnTab?: string | null;
  onReturnToProject?: () => void;
  /** Billing engineers see finance/money tabs only */
  variant?: FinancialManagementVariant;
}

export const FINANCIAL_SUB_TABS = [
  'progress',
  'cashflow',
  'earned_value',
  'contract',
  'cost',
  'budget',
  'invoicing',
  'contracts',
] as const;

/** Money / finance tabs shown to Billing Site Engineers (no physical progress). */
export const BILLING_FINANCIAL_SUB_TABS = [
  'cashflow',
  'earned_value',
  'contract',
  'cost',
  'budget',
  'invoicing',
  'contracts',
] as const;

export type SubTab = (typeof FINANCIAL_SUB_TABS)[number];

export type FinancialManagementVariant = 'default' | 'billing';

const TAB_SUCCESS_BANNERS: Record<SubTab, string> = {
  progress: '✓ Physical Progress Updated Successfully',
  cashflow: '✓ Cashflow Updated Successfully',
  earned_value: '✓ Planned vs Actual Value Updated Successfully',
  contract: '✓ Contract Performance Updated Successfully',
  cost: '✓ Financial Progress Updated Successfully',
  budget: '✓ Budget Performance Updated Successfully',
  invoicing: '✓ Invoicing Updated Successfully',
  contracts: '✓ Contract Values Updated Successfully',
};

/** Maps legacy / unknown section keys (e.g. removed cashflow tab) to a valid tab */
export function normalizeFinancialSubTab(tab?: string): SubTab {
  if (tab && (FINANCIAL_SUB_TABS as readonly string[]).includes(tab)) {
    return tab as SubTab;
  }
  return 'progress';
}

export function normalizeBillingFinancialSubTab(tab?: string): SubTab {
  if (tab && (BILLING_FINANCIAL_SUB_TABS as readonly string[]).includes(tab)) {
    return tab as SubTab;
  }
  return 'cashflow';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CONTRACT_VALUE_TYPES: ContractValueType[] = ['SCL', 'Contractor'];
const INVOICE_TYPES: InvoiceType[] = ['PMC', 'Contractor'];
const PEV_PARTY_TYPES = ['SCL', 'CONTRACTOR'] as const;
type PevPartyLabel = (typeof PEV_PARTY_TYPES)[number];

const emptyPevPartyForm = (): PlannedEarnedPartyFormValues => ({
  planned_value: '',
  earned_value: '',
});

/** Display labels for Financial Progress (EVM) — API keys unchanged */
const COST_EVM_FIELD_LABELS: Record<string, string> = {
  month_year: 'Month / Year',
  bcws: 'Budgeted Cost of Work Scheduled',
  bcwp: 'Budgeted Cost of Work Performed',
  acwp: 'Actual Cost of Work Performed',
  fcst: 'Forecast at Completion',
  bac: 'Budget at Completion',
};

const COST_EVM_FORM_FIELDS = ['month_year', 'bcws', 'bcwp', 'acwp', 'fcst', 'bac'] as const;

/** Display metadata for Budget Performance — API keys unchanged */
const BUDGET_PERFORMANCE_FIELDS = ['bac', 'bcwp', 'acwp'] as const;

const BUDGET_PERFORMANCE_FIELD_META: Record<
  (typeof BUDGET_PERFORMANCE_FIELDS)[number],
  { label: string; abbrev: string; placeholder: string; tooltip: string }
> = {
  bac: {
    label: 'Budget at Completion',
    abbrev: 'BAC',
    placeholder: 'Enter total approved project budget',
    tooltip: 'Total approved budget for the project at completion (BAC).',
  },
  bcwp: {
    label: 'Budgeted Cost of Work Performed (Earned Value)',
    abbrev: 'BCWP',
    placeholder: 'Enter earned value achieved',
    tooltip: 'Earned value of work performed against the budget (BCWP).',
  },
  acwp: {
    label: 'Actual Cost of Work Performed',
    abbrev: 'ACWP',
    placeholder: 'Enter actual expenditure incurred',
    tooltip: 'Actual cost incurred for work performed (ACWP).',
  },
};

const emptyContractValue = (projectName: string, contractType: ContractValueType): ContractValueRecord => ({
  projectName,
  contractType,
  originalContractValue: 0,
  approvedVO: 0,
  revisedContractValue: 0,
  potentialPendingVO: 0,
});

const emptyInvoicingRecord = (projectName: string, invoiceType: InvoiceType): InvoicingRecord => ({
  projectName,
  invoiceType,
  grossBilled: 0,
  netBilledWithoutVAT: 0,
  netCollected: 0,
  netDue: 0,
  collectionPercentage: 0,
});

const emptyContractPerformance: ContractPerformanceRecord = {
  billedValue: 0,
  actualReceiptValue: 0,
  variance: 0,
  performancePercentage: 0,
  variancePercentage: 0,
};

const FinancialManagement: React.FC<FinancialManagementProps> = ({
  projects = [],
  currentUser,
  onSaveSuccess,
  initialSubTab = 'progress',
  initialProjectId = null,
  lockToInitialSection = false,
  returnTab = null,
  onReturnToProject,
  variant = 'default',
}) => {
  const isBillingVariant = variant === 'billing';
  const normalizeSubTab = isBillingVariant ? normalizeBillingFinancialSubTab : normalizeFinancialSubTab;
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const [activeSubTab, setActiveSubTab] = useState<SubTab>(() => normalizeSubTab(initialSubTab));
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [pevForms, setPevForms] = useState<Record<PevPartyLabel, PlannedEarnedPartyFormValues>>({
    SCL: emptyPevPartyForm(),
    CONTRACTOR: emptyPevPartyForm(),
  });
  const [pevErrors, setPevErrors] = useState<Record<PevPartyLabel, string | null>>({
    SCL: null,
    CONTRACTOR: null,
  });
  const [savingPev, setSavingPev] = useState<Record<PevPartyLabel, boolean>>({
    SCL: false,
    CONTRACTOR: false,
  });

  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [progressTrendData, setProgressTrendData] = useState<
    Array<{
      month: string;
      monthlyPlanned: number;
      monthlyActual: number;
      cumulativePlanned: number;
      cumulativeActual: number;
    }>
  >([]);
  const [isLoadingProgressTrend, setIsLoadingProgressTrend] = useState(false);
  const [saveNotifications, setSaveNotifications] = useState<FinancialSaveNotificationItem[]>([]);
  const [formSuccessBanner, setFormSuccessBanner] = useState<string | null>(null);
  const [pevSuccessParty, setPevSuccessParty] = useState<PevPartyLabel | null>(null);
  const formEntryRef = useRef<HTMLDivElement>(null);

  // Premium Enterprise Walkthrough state (exact Dashboard architecture)
  const [showTour, setShowTour] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  // Form states for each module (simplified)
  const [progressForm, setProgressForm] = useState<any>({});
  const [contractForm, setContractForm] = useState<ContractPerformanceRecord | null>(null);
  const [contractFormError, setContractFormError] = useState<string | null>(null);
  const [isSavingContractPerformance, setIsSavingContractPerformance] = useState(false);
  const [costForm, setCostForm] = useState<any>({});
  const [budgetForm, setBudgetForm] = useState<any>({});
  const [invoicingForms, setInvoicingForms] = useState<Record<InvoiceType, InvoicingRecord | null>>({
    PMC: null,
    Contractor: null,
  });
  const [invoicingErrors, setInvoicingErrors] = useState<Record<InvoiceType, string | null>>({
    PMC: null,
    Contractor: null,
  });
  const [savingInvoicing, setSavingInvoicing] = useState<Record<InvoiceType, boolean>>({
    PMC: false,
    Contractor: false,
  });
  const [contractValuesForms, setContractValuesForms] = useState<Record<ContractValueType, ContractValueRecord | null>>({
    SCL: null,
    Contractor: null,
  });
  const [contractValuesErrors, setContractValuesErrors] = useState<Record<ContractValueType, string | null>>({
    SCL: null,
    Contractor: null,
  });
  const [savingContractValues, setSavingContractValues] = useState<Record<ContractValueType, boolean>>({
    SCL: false,
    Contractor: false,
  });
  const [contractors, setContractors] = useState<ContractorMasterRecord[]>([]);
  const [selectedContractorMasterId, setSelectedContractorMasterId] = useState<number | null>(null);
  const [loadingContractorFinancial, setLoadingContractorFinancial] = useState(false);
  const dismissSaveNotification = useCallback((id: number) => {
    setSaveNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showSaveNotification = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      const id = Date.now();
      setSaveNotifications((prev) => [...prev, { id, type, message }]);
      const duration = type === 'success' ? 3500 : 5000;
      window.setTimeout(() => dismissSaveNotification(id), duration);
      if (type === 'success' && activeSubTab !== 'earned_value') {
        setPevSuccessParty(null);
        setFormSuccessBanner(TAB_SUCCESS_BANNERS[activeSubTab] ?? `✓ ${message}`);
        window.setTimeout(() => {
          setFormSuccessBanner(null);
          setPevSuccessParty(null);
        }, 4000);
      }
    },
    [dismissSaveNotification, activeSubTab]
  );

  const parseNumericValue = (value: any) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numeric = value.replace(/,/g, '').trim();
      return numeric === '' ? 0 : Number(numeric) || 0;
    }
    return 0;
  };

  const projectName = projects.find(p => p.id === selectedProject)?.title || selectedProject;
  const selectedMonthNumber = MONTHS.indexOf(selectedMonth) + 1;
  const selectedYearNumber = parseInt(selectedYear, 10) || new Date().getFullYear();

  const selectedContractor = useMemo(
    () => contractors.find((c) => c.id === selectedContractorMasterId) ?? null,
    [contractors, selectedContractorMasterId],
  );

  const activeContractors = useMemo(
    () => contractors.filter((c) => c.status === 'ACTIVE'),
    [contractors],
  );

  const invoicingTypesForDisplay = useMemo(
    () =>
      isBillingVariant
        ? (['Contractor', 'PMC'] as InvoiceType[])
        : INVOICE_TYPES,
    [isBillingVariant],
  );

  const contractValuesTypesForDisplay = useMemo(
    () =>
      isBillingVariant
        ? (['Contractor', 'SCL'] as ContractValueType[])
        : CONTRACT_VALUE_TYPES,
    [isBillingVariant],
  );

  const applyPlannedEarnedPeriod = (period: ReturnType<typeof normalizePlannedEarnedByPeriod>) => {
    setPevForms({
      SCL: {
        planned_value: period.scl?.plannedValue ?? '',
        earned_value: period.scl?.earnedValue ?? '',
      },
      CONTRACTOR: {
        planned_value: period.contractor?.plannedValue ?? '',
        earned_value: period.contractor?.earnedValue ?? '',
      },
    });
  };

  const applyFinancialSnapshot = useCallback((snapshot: FinancialDataSnapshot) => {
    setProgressForm(snapshot.progressForm);
    setPevForms(snapshot.pevForms);
    setPevErrors(snapshot.pevErrors);
    setContractForm(snapshot.contractForm);
    setContractFormError(snapshot.contractFormError);
    setCostForm(snapshot.costForm);
    setBudgetForm(snapshot.budgetForm);
    setInvoicingForms(snapshot.invoicingForms);
    setInvoicingErrors(snapshot.invoicingErrors);
    setContractValuesForms(snapshot.contractValuesForms);
    setContractValuesErrors(snapshot.contractValuesErrors);
  }, []);

  const patchFinancialCache = useCallback(
    (patch: Partial<FinancialDataSnapshot>) => {
      if (!projectName) return;
      patchFinancialCacheEntry(projectName, selectedMonthNumber, selectedYearNumber, patch);
    },
    [projectName, selectedMonthNumber, selectedYearNumber]
  );

  const updatePevField = (party: PevPartyLabel, field: keyof PlannedEarnedPartyFormValues, value: string) => {
    setPevForms((prev) => ({
      ...prev,
      [party]: { ...prev[party], [field]: value },
    }));
    setPevErrors((prev) => ({ ...prev, [party]: null }));
  };

  const buildPlannedEarnedPeriodPayload = () => ({
    projectName,
    month: selectedMonthNumber,
    year: selectedYearNumber,
    scl: {
      plannedValue: parseNumericValue(pevForms.SCL.planned_value),
      earnedValue: parseNumericValue(pevForms.SCL.earned_value),
    },
    contractor: {
      plannedValue: parseNumericValue(pevForms.CONTRACTOR.planned_value),
      earnedValue: parseNumericValue(pevForms.CONTRACTOR.earned_value),
    },
  });

  const handlePlannedEarnedSave = async (party: PevPartyLabel) => {
    if (!projectName) {
      showSaveNotification('Select a project before saving.', 'error');
      return;
    }

    setSavingPev((prev) => ({ ...prev, [party]: true }));
    setPevErrors((prev) => ({ ...prev, [party]: null }));
    try {
      const saved = await savePlannedEarnedByPeriod(buildPlannedEarnedPeriodPayload());
      applyPlannedEarnedPeriod(saved);
      patchFinancialCache({
        pevForms: {
          SCL: {
            planned_value: saved.scl?.plannedValue ?? '',
            earned_value: saved.scl?.earnedValue ?? '',
          },
          CONTRACTOR: {
            planned_value: saved.contractor?.plannedValue ?? '',
            earned_value: saved.contractor?.earnedValue ?? '',
          },
        },
        pevErrors: { SCL: null, CONTRACTOR: null },
      });
      const partyBanner =
        party === 'SCL'
          ? '✓ SCL Financial Values Updated Successfully'
          : '✓ Contractor Financial Values Updated Successfully';
      setPevSuccessParty(party);
      setFormSuccessBanner(partyBanner);
      window.setTimeout(() => {
        setFormSuccessBanner(null);
        setPevSuccessParty(null);
      }, 4000);
      showSaveNotification(
        `Planned vs Actual Value (${party}) saved for ${selectedMonth} ${selectedYear}.`
      );
      onSaveSuccess?.();
    } catch (err: unknown) {
      setPevErrors((prev) => ({ ...prev, [party]: getErrorMessage(err) }));
      showSaveNotification(`Save failed: ${getErrorMessage(err)}`, 'error');
    } finally {
      setSavingPev((prev) => ({ ...prev, [party]: false }));
    }
  };

  // Auto-select first project
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(initialProjectId || projects[0].id);
    }
  }, [projects, selectedProject, initialProjectId]);

  useEffect(() => {
    if (initialProjectId) {
      setSelectedProject(initialProjectId);
    }
  }, [initialProjectId]);

  // Update activeSubTab when initialSubTab changes
  useEffect(() => {
    setActiveSubTab(normalizeSubTab(initialSubTab));
  }, [initialSubTab, isBillingVariant]);

  // Derive role for backend submission (use authenticated user role)
  const userRole = currentUser?.role || '';
  const roleForSubmission =
    userRole === 'TEAM_LEAD' ? 'Team Leader' :
      userRole === 'BILLING_SITE_ENGINEER' ? 'Billing Site Engineer' :
        userRole === 'PMC_HEAD' ? 'PMC Head' :
          userRole; // fallback

  // Auto-generate created_by from logged-in user (required by backend)
  const createdBy =
    currentUser?.name ||
    currentUser?.username ||
    currentUser?.email ||
    "Unknown User";

  // Safe error message extractor - prevents rendering raw Django HTML tracebacks
  const getErrorMessage = (error: any): string => {
    const data = error?.response?.data;

    // Prevent showing full HTML error pages (Django debug mode)
    if (typeof data === "string") {
      if (data.includes("<!DOCTYPE html>") || data.includes("<html")) {
        return "Internal server error. Please try again later.";
      }
      return "Server error occurred";
    }

    if (data?.detail) {
      return data.detail;
    }

    if (typeof data === "object" && data !== null) {
      return Object.entries(data)
        .map(([field, messages]) => {
          const msgStr = Array.isArray(messages)
            ? messages.join(", ")
            : String(messages);
          return `${field}: ${msgStr}`;
        })
        .join(" | ");
    }

    return error?.message || "Something went wrong. Please try again.";
  };

  const { forceRefresh } = useFinancialManagementData({
    projectName,
    month: selectedMonthNumber,
    year: selectedYearNumber,
    roleForSubmission,
    applySnapshot: applyFinancialSnapshot,
    onInitialLoadingChange: setIsInitialLoading,
    onBackgroundRefreshingChange: setIsBackgroundRefreshing,
    onForceRefreshingChange: setIsForceRefreshing,
  });

  const handleFormReset = useCallback(() => {
    if (!projectName) return;
    const cached = getFinancialCacheEntry(projectName);
    if (cached && financialCacheMatchesPeriod(cached, selectedMonthNumber, selectedYearNumber)) {
      applyFinancialSnapshot(cached.snapshot);
      setFormSuccessBanner(null);
      return;
    }
    forceRefresh();
  }, [
    projectName,
    selectedMonthNumber,
    selectedYearNumber,
    applyFinancialSnapshot,
    forceRefresh,
  ]);

  useEffect(() => {
    if (!projectName) {
      setContractors([]);
      setSelectedContractorMasterId(null);
      return;
    }

    let cancelled = false;
    contractorMasterApi
      .list(projectName)
      .then((list) => {
        if (cancelled) return;
        const active = list.filter((c) => c.status === 'ACTIVE');
        setContractors(list);
        setSelectedContractorMasterId((prev) => {
          if (prev && active.some((c) => c.id === prev)) return prev;
          return active[0]?.id ?? null;
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load contractors for Financial Management:', err);
          setContractors([]);
          setSelectedContractorMasterId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectName]);

  useEffect(() => {
    if (
      !projectName ||
      !selectedContractor ||
      isInitialLoading ||
      isForceRefreshing
    ) {
      return;
    }

    let cancelled = false;
    setLoadingContractorFinancial(true);

    loadContractorFinancialBuckets(projectName, selectedContractor.contractor_name, selectedContractor.id)
      .then(({ contractValue, invoicing }) => {
        if (cancelled) return;

        const contractorName = selectedContractor.contractor_name;
        const contractorId = selectedContractor.id;

        setContractValuesForms((prev) => {
          const next = {
            ...prev,
            Contractor:
              contractValue ??
              ({
                ...emptyContractValue(projectName, 'Contractor'),
                contractorName,
                contractorId,
              } as ContractValueRecord),
          };
          patchFinancialCache({ contractValuesForms: next });
          return next;
        });

        setInvoicingForms((prev) => {
          const next = {
            ...prev,
            Contractor:
              invoicing ??
              ({
                ...emptyInvoicingRecord(projectName, 'Contractor'),
                contractorName,
                contractorId,
              } as InvoicingRecord),
          };
          patchFinancialCache({ invoicingForms: next });
          return next;
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load contractor financial records:', err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContractorFinancial(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    projectName,
    selectedContractor,
    isInitialLoading,
    isForceRefreshing,
    patchFinancialCache,
  ]);

  const handleTabChange = useCallback((tab: SubTab) => {
    if (lockToInitialSection && tab !== activeSubTab) return;
    setActiveSubTab(tab);
    setFormSuccessBanner(null);
    setPevSuccessParty(null);
    requestAnimationFrame(() => {
      formEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [lockToInitialSection, activeSubTab]);

  useEffect(() => {
    if (!projectName) return;
    requestAnimationFrame(() => {
      formEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [activeSubTab, projectName]);

  const selectedPeriodLabel =
    MONTH_OPTIONS.find((item) => item.value === selectedMonthNumber)?.label ?? selectedMonth;

  const handlePeriodMonthChange = (month: number) => {
    setSelectedMonth(MONTHS[month - 1] ?? MONTHS[0]);
  };

  const handlePeriodYearChange = (year: number) => {
    setSelectedYear(String(year));
  };

  useEffect(() => {
    if (!projectName || !roleForSubmission) {
      setProgressTrendData([]);
      return;
    }
    let cancelled = false;
    setIsLoadingProgressTrend(true);
    fetchProjectProgressTrend(projectName, roleForSubmission)
      .then((rows) => {
        if (!cancelled) setProgressTrendData(rows);
      })
      .catch(() => {
        if (!cancelled) setProgressTrendData([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProgressTrend(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectName, roleForSubmission, selectedMonthNumber, selectedYearNumber, isForceRefreshing]);

  const executiveMetrics = useMemo(
    () =>
      deriveFinancialExecutiveMetrics({
        progressForm,
        costForm,
        budgetForm,
        invoicingForms,
        contractValuesForms,
      }),
    [progressForm, costForm, budgetForm, invoicingForms, contractValuesForms]
  );

  const fieldLabel = financialFieldLabel(isDarkTheme, themeClasses);
  const fieldInput = financialFieldInput(isDarkTheme, themeClasses);
  const periodNote = `${selectedPeriodLabel} ${selectedYear}`;

  // Safe save helper — ONLY sends editable fields
  const createSafePayload = (formData: any, editableKeys: string[], extra?: any) => {
    const payload: any = {};
    editableKeys.forEach(key => {
      if (formData[key] !== undefined && formData[key] !== null && formData[key] !== '') {
        payload[key] = formData[key];
      }
    });
    return { ...payload, ...extra };
  };

  // Robust save helper — POST for new records, PUT/PATCH when a period record already exists
  const buildPeriodSavePayload = (
    formData: any,
    editableKeys: string[],
    extraPayload: Record<string, unknown>,
    cacheSection: 'progress' | 'cost' | 'budget'
  ) => {
    if (cacheSection === 'cost') {
      const costPayload: Record<string, unknown> = {
        month_year: formData.month_year ?? formatFinancialMonthYear(selectedMonthNumber, selectedYearNumber),
        bcws: parseNumericValue(formData.bcws),
        bcwp: parseNumericValue(formData.bcwp),
        acwp: parseNumericValue(formData.acwp),
        fcst: parseNumericValue(formData.fcst),
        bac: parseNumericValue(formData.bac),
        project_name: extraPayload.project_name,
        role: extraPayload.role,
      };
      if (!extractRecordId(formData)) {
        costPayload.created_by = extraPayload.created_by;
      }
      return costPayload;
    }

    return createSafePayload(formData, editableKeys, extraPayload);
  };

  const handleSafeSave = async (
    formData: any,
    editableKeys: string[],
    extraPayload: any = {},
    successMsg: string,
    cacheSection: 'progress' | 'cost' | 'budget'
  ) => {
    if (!projectName) {
      showSaveNotification('Select a project before saving.', 'error');
      return;
    }

    // Use authenticated user role (required for backend permission system)
    const finalRole = extraPayload.role || roleForSubmission;
    if (!finalRole) {
      showSaveNotification("User role is missing. Please re-login.", "error");
      return;
    }

    const payload = buildPeriodSavePayload(
      formData,
      editableKeys,
      {
        project_name: projectName,
        role: finalRole,
        created_by: createdBy,
        ...extraPayload,
      },
      cacheSection
    );

    try {
      const saveOptions = {
        projectName,
        month: selectedMonthNumber,
        year: selectedYearNumber,
        role: finalRole,
        existingId: extractRecordId(formData),
      };

      const response =
        cacheSection === 'progress'
          ? await saveProjectProgressForPeriod(payload, saveOptions)
          : cacheSection === 'cost'
            ? await saveCostPerformanceForPeriod(payload, saveOptions)
            : await saveBudgetPerformanceForPeriod(payload, saveOptions);

      const saved =
        (response?.data as { results?: Record<string, unknown>[] })?.results?.[0] ??
        (response?.data as { data?: Record<string, unknown> })?.data ??
        (response?.data as Record<string, unknown>) ??
        {};
      const nextForm = {
        ...formData,
        ...payload,
        ...saved,
        id: extractRecordId(saved) ?? extractRecordId(formData),
      };
      if (cacheSection === 'progress') {
        setProgressForm(nextForm);
        patchFinancialCache({ progressForm: nextForm });
      } else if (cacheSection === 'cost') {
        setCostForm(nextForm);
        patchFinancialCache({ costForm: nextForm });
      } else {
        setBudgetForm(nextForm);
        patchFinancialCache({ budgetForm: nextForm });
      }
      showSaveNotification(
        `${successMsg}${projectName ? ` · ${selectedMonth} ${selectedYear}` : ''}`
      );
      onSaveSuccess?.();
    } catch (err: any) {
      console.error("Financial Management save error:", err);
      const message = getErrorMessage(err);
      showSaveNotification(`Save failed: ${message}`, 'error');
    }
  };

  const updateContractValueField = (
    contractType: ContractValueType,
    key: keyof ContractValueRecord,
    value: string
  ) => {
    setContractValuesForms(prev => ({
      ...prev,
      [contractType]: {
        ...(prev[contractType] || emptyContractValue(projectName, contractType)),
        [key]: value,
      } as ContractValueRecord,
    }));
  };

  const handleContractValueContractorChange = (contractorId: number) => {
    const contractor = contractors.find((c) => c.id === contractorId) ?? null;
    if (!contractor) return;
    setSelectedContractorMasterId(contractorId);
    setContractValuesForms((prev) => ({
      ...prev,
      Contractor: {
        ...(prev.Contractor || emptyContractValue(projectName, 'Contractor')),
        contractorId: contractor.id,
        contractorName: contractor.contractor_name,
      },
    }));
    setContractValuesErrors((prev) => ({ ...prev, Contractor: null }));
  };

  const resolveContractorScopedRecordId = (
    form: { id?: string | number; contractorId?: number; contractorName?: string },
    contractor: ContractorMasterRecord | null,
  ): string | number | undefined => {
    if (!contractor) return form.id;
    if (form.contractorId != null && form.contractorId !== contractor.id) return undefined;
    const formName = form.contractorName?.trim().toLowerCase();
    const masterName = contractor.contractor_name.trim().toLowerCase();
    if (formName && formName !== masterName) return undefined;
    return form.id;
  };

  const handleContractValueSave = async (contractType: ContractValueType) => {
    if (!projectName) {
      showSaveNotification('Select a project before saving.', 'error');
      return;
    }
    if (contractType === 'Contractor' && !selectedContractor) {
      showSaveNotification('Select a contractor before saving contractor contract values.', 'error');
      return;
    }
    const form = contractValuesForms[contractType] || emptyContractValue(projectName, contractType);
    const contractorScope =
      contractType === 'Contractor' && selectedContractor
        ? {
          contractorId: selectedContractor.id,
          contractorName: selectedContractor.contractor_name,
        }
        : contractType === 'Contractor' && form.contractorId != null
          ? {
            contractorId: form.contractorId,
            contractorName: form.contractorName,
          }
          : null;
    const payload = {
      projectName,
      contractType,
      originalContractValue: parseNumericValue(form.originalContractValue),
      approvedVO: parseNumericValue(form.approvedVO),
      potentialPendingVO: parseNumericValue(form.potentialPendingVO),
      ...(contractorScope ?? {}),
    };

    setSavingContractValues(prev => ({ ...prev, [contractType]: true }));
    try {
      const response = await saveContractValueRecord(
        payload,
        contractType === 'Contractor'
          ? resolveContractorScopedRecordId(form, selectedContractor)
          : form.id,
      );
      const row = unwrapList<Record<string, unknown>>(response.data)[0];
      const savedRecord: ContractValueRecord = row
        ? normalizeContractValueRecord(row, projectName, contractType)
        : { ...form, ...payload, id: extractRecordId(row) ?? form.id };
      setContractValuesForms((prev) => {
        const next = { ...prev, [contractType]: savedRecord };
        setContractValuesErrors((errPrev) => {
          const nextErrors = { ...errPrev, [contractType]: null };
          patchFinancialCache({ contractValuesForms: next, contractValuesErrors: nextErrors });
          return nextErrors;
        });
        return next;
      });
      showSaveNotification(
        contractType === 'Contractor' && selectedContractor
          ? `Contract Values (Contractor: ${selectedContractor.contractor_name}) saved for ${projectName}.`
          : `Contract Values (${contractType}) saved for ${projectName}.`,
      );
      onSaveSuccess?.();
    } catch (err: any) {
      console.error(`Contract Values (${contractType}) save error:`, err);
      showSaveNotification(`Save failed: ${getErrorMessage(err)}`, 'error');
    } finally {
      setSavingContractValues(prev => ({ ...prev, [contractType]: false }));
    }
  };

  const updateContractPerformanceField = (
    key: 'billedValue' | 'actualReceiptValue',
    value: string
  ) => {
    setContractForm(prev => {
      const form = prev || emptyContractPerformance;
      const next = {
        ...form,
        [key]: parseNumericValue(value),
      };
      return {
        ...next,
        ...calculateContractPerformance(next.billedValue, next.actualReceiptValue),
      };
    });
    setContractFormError(null);
  };

  const handleContractPerformanceSave = async () => {
    if (!projectName) {
      showSaveNotification('Select a project before saving.', 'error');
      return;
    }
    const form = contractForm || emptyContractPerformance;
    const payload = {
      project_name: projectName,
      role: roleForSubmission,
      created_by: createdBy,
      billedValue: parseNumericValue(form.billedValue),
      actualReceiptValue: parseNumericValue(form.actualReceiptValue),
    };

    setIsSavingContractPerformance(true);
    try {
      const response = await saveContractPerformanceRecord(payload, form.id);
      const row = unwrapList<Record<string, unknown>>(response.data)[0];
      const savedRecord: ContractPerformanceRecord = row
        ? normalizeContractPerformanceRecord(row)
        : {
          ...form,
          ...calculateContractPerformance(payload.billedValue, payload.actualReceiptValue),
          id: extractRecordId(row) ?? form.id,
        };
      setContractForm(savedRecord);
      setContractFormError(null);
      patchFinancialCache({ contractForm: savedRecord, contractFormError: null });
      showSaveNotification(`Contract Performance saved for ${projectName}.`);
      onSaveSuccess?.();
    } catch (err: any) {
      console.error('Contract Performance save error:', err);
      showSaveNotification(`Save failed: ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsSavingContractPerformance(false);
    }
  };

  const updateInvoicingField = (
    invoiceType: InvoiceType,
    key: keyof InvoicingRecord,
    value: string
  ) => {
    setInvoicingForms(prev => ({
      ...prev,
      [invoiceType]: {
        ...(prev[invoiceType] || emptyInvoicingRecord(projectName, invoiceType)),
        [key]: value,
      } as InvoicingRecord,
    }));
  };

  const handleInvoicingContractorChange = (contractorId: number) => {
    const contractor = contractors.find((c) => c.id === contractorId) ?? null;
    if (!contractor) return;
    setSelectedContractorMasterId(contractorId);
    setInvoicingForms((prev) => ({
      ...prev,
      Contractor: {
        ...(prev.Contractor || emptyInvoicingRecord(projectName, 'Contractor')),
        contractorId: contractor.id,
        contractorName: contractor.contractor_name,
      },
    }));
    setInvoicingErrors((prev) => ({ ...prev, Contractor: null }));
  };

  const handleInvoicingSave = async (invoiceType: InvoiceType) => {
    if (!projectName) {
      showSaveNotification('Select a project before saving.', 'error');
      return;
    }
    if (invoiceType === 'Contractor' && !selectedContractor) {
      showSaveNotification('Select a contractor before saving contractor invoicing.', 'error');
      return;
    }
    const form = invoicingForms[invoiceType] || emptyInvoicingRecord(projectName, invoiceType);
    const contractorScope =
      invoiceType === 'Contractor' && selectedContractor
        ? {
          contractorId: selectedContractor.id,
          contractorName: selectedContractor.contractor_name,
        }
        : invoiceType === 'Contractor' && form.contractorId != null
          ? {
            contractorId: form.contractorId,
            contractorName: form.contractorName,
          }
          : null;
    const payload = {
      projectName,
      invoiceType,
      grossBilled: parseNumericValue(form.grossBilled),
      netBilledWithoutVAT: parseNumericValue(form.netBilledWithoutVAT),
      ...(contractorScope ?? {}),
    };

    setSavingInvoicing(prev => ({ ...prev, [invoiceType]: true }));
    try {
      const response = await saveInvoicingRecord(
        payload,
        invoiceType === 'Contractor'
          ? resolveContractorScopedRecordId(form, selectedContractor)
          : form.id,
      );
      const row = unwrapList<Record<string, unknown>>(response.data)[0];
      const savedRecord: InvoicingRecord = row
        ? normalizeInvoicingRecord(row, projectName, invoiceType)
        : { ...form, ...payload, id: extractRecordId(row) ?? form.id };
      setInvoicingForms((prev) => {
        const next = { ...prev, [invoiceType]: savedRecord };
        setInvoicingErrors((errPrev) => {
          const nextErrors = { ...errPrev, [invoiceType]: null };
          patchFinancialCache({ invoicingForms: next, invoicingErrors: nextErrors });
          return nextErrors;
        });
        return next;
      });
      showSaveNotification(
        invoiceType === 'Contractor' && selectedContractor
          ? `Contractor Invoicing (${selectedContractor.contractor_name}) saved for ${projectName}.`
          : `${getInvoiceTypeLabel(invoiceType)} Invoicing saved for ${projectName}.`,
      );
      onSaveSuccess?.();
    } catch (err: any) {
      console.error(`${invoiceType} Invoicing save error:`, err);
      showSaveNotification(`Save failed: ${getErrorMessage(err)}`, 'error');
    } finally {
      setSavingInvoicing(prev => ({ ...prev, [invoiceType]: false }));
    }
  };

  const subTabs = (
    [
      { key: 'progress' as const, label: 'Physical Progress' },
      { key: 'cashflow' as const, label: 'Cashflow' },
      { key: 'earned_value' as const, label: 'Planned vs Actual Value' },
      { key: 'contract' as const, label: 'Contract Performance' },
      { key: 'cost' as const, label: isBillingVariant ? 'Internal Cost Performance' : 'Financial Progress' },
      { key: 'budget' as const, label: 'Budget vs Cost' },
      { key: 'invoicing' as const, label: 'Invoicing' },
      { key: 'contracts' as const, label: 'Contract Values' },
    ] satisfies { key: SubTab; label: string }[]
  ).filter((tab) => {
    if (isBillingVariant) {
      return (BILLING_FINANCIAL_SUB_TABS as readonly string[]).includes(tab.key);
    }
    return tab.key !== 'cashflow';
  });
  const displayedContractForm = contractForm || emptyContractPerformance;
  const displayedContractMetrics = calculateContractPerformance(
    parseNumericValue(displayedContractForm.billedValue),
    parseNumericValue(displayedContractForm.actualReceiptValue)
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <FinancialSaveNotification items={saveNotifications} onDismiss={dismissSaveNotification} />

      <div className="financial-header financial-management-header fm-header">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={`text-2xl font-bold tracking-tight sm:text-3xl ${themeClasses.textPrimary}`}>
              Financial Management
            </h2>
            <p className={`mt-1 text-sm font-medium ${themeClasses.textSecondary}`}>
              {isBillingVariant
                ? 'Finance & money data entry for Billing Site Engineers'
                : 'Monthly data entry & updates for Team Leaders'}
            </p>
          </div>
          {returnTab && onReturnToProject && (
            <button
              type="button"
              onClick={onReturnToProject}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${themeClasses.border} ${isDarkTheme
                ? 'bg-white/5 text-white hover:bg-white/10'
                : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Icons.ChevronRight size={16} className="rotate-180" aria-hidden />
              Back to Project
            </button>
          )}
        </div>
      </div>

      <FinancialToolbar
        projects={projects.map((p) => ({ id: p.id, title: p.title }))}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        month={selectedMonthNumber}
        year={selectedYearNumber}
        onMonthChange={handlePeriodMonthChange}
        onYearChange={handlePeriodYearChange}
        roleForSubmission={roleForSubmission}
        createdBy={createdBy}
        onRefresh={forceRefresh}
        isRefreshing={isForceRefreshing}
        isLoading={isInitialLoading}
        onStartTour={() => {
          localStorage.removeItem('financialManagementTourCompleted');
          setShowTour(true);
        }}
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      />

      <FinancialSegmentedTabs
        tabs={subTabs}
        activeTab={activeSubTab}
        onChange={handleTabChange}
        lockToInitialSection={lockToInitialSection}
        isDarkTheme={isDarkTheme}
        themeClasses={themeClasses}
      />

      <div className="relative min-h-[360px] financial-tab-content">
        {isBackgroundRefreshing && projectName && (
          <div
            className={`absolute right-4 top-2 z-20 flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${themeClasses.border} ${themeClasses.glassCard}`}
            role="status"
            aria-live="polite"
          >
            <Icons.History size={12} className="animate-spin text-indigo-500" />
            Syncing…
          </div>
        )}

        {isInitialLoading && projectName ? (
          <>
            <FinancialManagementSkeleton />
            <FinancialManagementLoadingOverlay message="Loading financial data…" />
          </>
        ) : (
          <>
            {isForceRefreshing && projectName && (
              <FinancialManagementLoadingOverlay message="Refreshing financial data…" />
            )}
            {/* TAB 1: Physical Progress */}
            {activeSubTab === 'progress' && (
              <div className="space-y-5 financial-tab-content">
                <FinancialQuickUpdateCard
                  title="Update Physical Progress"
                  projectName={projectName}
                  periodLabel={periodNote}
                  successBanner={formSuccessBanner}
                  sectionRef={formEntryRef}
                  className="financial-progress-form"
                  onSave={() =>
                    handleSafeSave(
                      progressForm,
                      ['progress_month', 'monthly_plan', 'cumulative_plan', 'monthly_actual', 'cumulative_actual'],
                      { role: roleForSubmission },
                      'Physical progress saved successfully',
                      'progress'
                    )
                  }
                  onReset={handleFormReset}
                  onRefresh={forceRefresh}
                  refreshDisabled={isForceRefreshing}
                  footerNote={!progressForm?.id ? 'No saved record for this period — enter values and save.' : undefined}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                >
                  <FinancialFormGrid>
                    {[
                      { key: 'progress_month', label: 'Progress Month (YYYY-MM-DD)', tour: 'progress-month-field' },
                      { key: 'monthly_plan', label: 'Monthly Plan (%)', tour: 'monthly-plan-field' },
                      { key: 'monthly_actual', label: 'Monthly Actual (%)', tour: 'monthly-actual-field' },
                      { key: 'cumulative_plan', label: 'Cumulative Plan (%)', tour: 'cumulative-plan-field' },
                      { key: 'cumulative_actual', label: 'Cumulative Actual (%)', tour: 'cumulative-actual-field' },
                    ].map((field) => (
                      <div
                        key={field.key}
                        className={`financial-progress-${field.key.replace(/_/g, '-')} ${field.tour}`}
                      >
                        <label className={fieldLabel}>{field.label}</label>
                        <input
                          type="text"
                          value={String(progressForm[field.key] ?? '')}
                          onChange={(e) => setProgressForm({ ...progressForm, [field.key]: e.target.value })}
                          className={fieldInput}
                        />
                      </div>
                    ))}
                  </FinancialFormGrid>
                </FinancialQuickUpdateCard>

                <FinancialTabAnalytics
                  variant="progress"
                  metrics={executiveMetrics}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                  projectName={projectName}
                  progressTrendData={progressTrendData}
                  isLoadingProgressTrend={isLoadingProgressTrend}
                  monthlyPlan={parseNumericValue(progressForm.monthly_plan)}
                  monthlyActual={parseNumericValue(progressForm.monthly_actual)}
                  cumulativePlan={parseNumericValue(progressForm.cumulative_plan)}
                  cumulativeActual={parseNumericValue(progressForm.cumulative_actual)}
                />
              </div>
            )}

            {activeSubTab === 'cashflow' && projectName && (
              <FinancialCashflowSection
                projectName={projectName}
                month={selectedMonthNumber}
                year={selectedYearNumber}
                periodLabel={periodNote}
                formSuccessBanner={formSuccessBanner}
                onReset={handleFormReset}
                onRefresh={forceRefresh}
                isRefreshing={isForceRefreshing}
                onSaved={(message) => showSaveNotification(message, 'success')}
                onError={(message) => showSaveNotification(message, 'error')}
                isDarkTheme={isDarkTheme}
                themeClasses={themeClasses}
              />
            )}

            {/* TAB 1.5: Planned vs Actual Value — SCL & Contractor */}
            {activeSubTab === 'earned_value' && (
              <div className="space-y-8 financial-tab-content">
                <PlannedEarnedValueFormSection
                  party="SCL"
                  projectName={projectName}
                  periodLabel={periodNote}
                  values={pevForms.SCL}
                  error={pevErrors.SCL}
                  isSaving={savingPev.SCL}
                  successBanner={pevSuccessParty === 'SCL' ? formSuccessBanner : null}
                  sectionRef={formEntryRef}
                  onChange={(field, value) => updatePevField('SCL', field, value)}
                  onSave={() => handlePlannedEarnedSave('SCL')}
                  onReset={handleFormReset}
                  onRefresh={forceRefresh}
                  refreshDisabled={isForceRefreshing}
                />
                <PlannedEarnedValueFormSection
                  party="CONTRACTOR"
                  projectName={projectName}
                  periodLabel={periodNote}
                  values={pevForms.CONTRACTOR}
                  error={pevErrors.CONTRACTOR}
                  isSaving={savingPev.CONTRACTOR}
                  successBanner={pevSuccessParty === 'CONTRACTOR' ? formSuccessBanner : null}
                  onChange={(field, value) => updatePevField('CONTRACTOR', field, value)}
                  onSave={() => handlePlannedEarnedSave('CONTRACTOR')}
                  onReset={handleFormReset}
                  onRefresh={forceRefresh}
                  refreshDisabled={isForceRefreshing}
                />

                <FinancialTabAnalytics
                  variant="earned_value"
                  metrics={executiveMetrics}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                  projectName={projectName}
                />
              </div>
            )}

            {/* TAB 2: Contract Performance */}
            {activeSubTab === 'contract' && (
              <div className="space-y-5">
                <FinancialQuickUpdateCard
                  title="Update Contract Performance"
                  projectName={projectName}
                  periodLabel={periodNote}
                  successBanner={formSuccessBanner}
                  sectionRef={formEntryRef}
                  className="financial-contract-form"
                  onSave={handleContractPerformanceSave}
                  onReset={handleFormReset}
                  onRefresh={forceRefresh}
                  saving={isSavingContractPerformance}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                >
                  {contractFormError && (
                    <p className="mb-5 text-sm font-medium text-rose-500">{contractFormError}</p>
                  )}
                  <FinancialFormGrid>
                    {[
                      { key: 'billedValue' as const, label: 'Billed Value', cls: 'billed-value-field' },
                      { key: 'actualReceiptValue' as const, label: 'Actual Receipt Value', cls: 'actual-receipt-value-field' },
                    ].map((field) => (
                      <div key={field.key} className={`financial-contract-${field.key} ${field.cls}`}>
                        <label className={fieldLabel}>{field.label}</label>
                        <input
                          type="number"
                          min="0"
                          value={displayedContractForm[field.key]}
                          onChange={(e) => updateContractPerformanceField(field.key, e.target.value)}
                          className={fieldInput}
                        />
                      </div>
                    ))}
                  </FinancialFormGrid>
                </FinancialQuickUpdateCard>

                <FinancialTabAnalytics
                  variant="contract"
                  metrics={executiveMetrics}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                  projectName={projectName}
                  contractMetrics={displayedContractMetrics}
                />
              </div>
            )}

            {/* TAB 3: Financial Progress */}
            {activeSubTab === 'cost' && (
              <div className="space-y-5">
                <FinancialQuickUpdateCard
                  title="Update Financial Progress"
                  projectName={projectName}
                  periodLabel={periodNote}
                  successBanner={formSuccessBanner}
                  sectionRef={formEntryRef}
                  className="financial-cost-form"
                  onSave={() =>
                    handleSafeSave(
                      costForm,
                      [...COST_EVM_FORM_FIELDS],
                      { role: roleForSubmission },
                      'Financial progress saved',
                      'cost'
                    )
                  }
                  onReset={handleFormReset}
                  onRefresh={forceRefresh}
                  refreshDisabled={isForceRefreshing}
                  footerNote={
                    !costForm?.id ? 'No saved record for this period — enter EVM values and save.' : undefined
                  }
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                >
                  <FinancialFormGrid>
                    {COST_EVM_FORM_FIELDS.map((key) => (
                      <div key={key} className={`financial-cost-${key}`}>
                        <label className={fieldLabel} htmlFor={`cost-evm-${key}`}>
                          {COST_EVM_FIELD_LABELS[key]}
                        </label>
                        <input
                          id={`cost-evm-${key}`}
                          type="text"
                          value={String(costForm[key] ?? '')}
                          onChange={(e) => setCostForm({ ...costForm, [key]: e.target.value })}
                          className={fieldInput}
                        />
                      </div>
                    ))}
                  </FinancialFormGrid>
                </FinancialQuickUpdateCard>

                <FinancialTabAnalytics
                  variant="cost"
                  metrics={executiveMetrics}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                  projectName={projectName}
                  costForm={costForm}
                />
              </div>
            )}

            {/* TAB 4: Budget vs Cost Performance */}
            {activeSubTab === 'budget' && (
              <div className="space-y-5">
                <FinancialQuickUpdateCard
                  title="Update Budget vs Cost"
                  projectName={projectName}
                  periodLabel={periodNote}
                  successBanner={formSuccessBanner}
                  sectionRef={formEntryRef}
                  className="financial-budget-form"
                  onSave={() =>
                    handleSafeSave(
                      budgetForm,
                      [...BUDGET_PERFORMANCE_FIELDS],
                      { role: roleForSubmission },
                      'Budget Performance saved',
                      'budget'
                    )
                  }
                  onReset={handleFormReset}
                  onRefresh={forceRefresh}
                  refreshDisabled={isForceRefreshing}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                >
                  <FinancialFormGrid>
                    {BUDGET_PERFORMANCE_FIELDS.map((key) => {
                      const meta = BUDGET_PERFORMANCE_FIELD_META[key];
                      return (
                        <div key={key} className={`financial-budget-${key}`}>
                          <label className={fieldLabel} htmlFor={`budget-perf-${key}`} title={meta.tooltip}>
                            {meta.label} ({meta.abbrev})
                          </label>
                          <input
                            id={`budget-perf-${key}`}
                            type="text"
                            value={String(budgetForm[key] ?? '')}
                            onChange={(e) => setBudgetForm({ ...budgetForm, [key]: e.target.value })}
                            placeholder={meta.placeholder}
                            title={meta.tooltip}
                            aria-label={`${meta.label} (${meta.abbrev})`}
                            className={fieldInput}
                          />
                        </div>
                      );
                    })}
                  </FinancialFormGrid>
                </FinancialQuickUpdateCard>

                <FinancialTabAnalytics
                  variant="budget"
                  metrics={executiveMetrics}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                  projectName={projectName}
                  budgetForm={budgetForm}
                />
              </div>
            )}

            {/* TAB 5: Invoicing */}
            {activeSubTab === 'invoicing' && (
              <div className="space-y-5">
                {invoicingTypesForDisplay.map((invoiceType, index) => {
                  const form = invoicingForms[invoiceType] || emptyInvoicingRecord(projectName, invoiceType);
                  const certificationEfficiency = form.collectionPercentage ?? 0;

                  return (
                    <FinancialQuickUpdateCard
                      key={invoiceType}
                      title={`Update ${getInvoiceTypeLabel(invoiceType)} Invoicing`}
                      projectName={projectName}
                      periodLabel={periodNote}
                      successBanner={index === 0 ? formSuccessBanner : null}
                      sectionRef={index === 0 ? formEntryRef : undefined}
                      className="financial-invoicing-form"
                      onSave={() => handleInvoicingSave(invoiceType)}
                      onReset={handleFormReset}
                      onRefresh={forceRefresh}
                      saving={savingInvoicing[invoiceType]}
                      refreshDisabled={isForceRefreshing || (invoiceType === 'Contractor' && loadingContractorFinancial)}
                      saveLabel={`Save ${getInvoiceTypeLabel(invoiceType)}`}
                      footerNote={
                        invoiceType === 'Contractor' && selectedContractor
                          ? !form.id
                            ? `No saved record yet for ${selectedContractor.contractor_name}`
                            : `Editing invoicing for ${selectedContractor.contractor_name}`
                          : undefined
                      }
                      isDarkTheme={isDarkTheme}
                      themeClasses={themeClasses}
                    >
                      {invoicingErrors[invoiceType] && (
                        <p className="mb-5 text-sm font-medium text-rose-500">{invoicingErrors[invoiceType]}</p>
                      )}
                      {invoiceType === 'Contractor' && loadingContractorFinancial && (
                        <p className={`mb-4 text-xs ${themeClasses.textSecondary}`}>Loading contractor invoicing…</p>
                      )}
                      <div className="mb-5 grid grid-cols-2 gap-5">
                        <div className={`rounded-lg border p-3 ${isDarkTheme ? themeClasses.border : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}>
                          <p className="text-xs font-semibold text-[#64748B]">Net Collected</p>
                          <p className="text-base font-bold">{(form.netCollected ?? 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className={`rounded-lg border p-3 ${isDarkTheme ? themeClasses.border : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}>
                          <p className="text-xs font-semibold text-[#64748B]">Cert. Efficiency</p>
                          <p className="text-base font-bold text-[#16A34A]">{certificationEfficiency.toFixed(1)}%</p>
                        </div>
                      </div>
                      <FinancialFormGrid>
                        <div>
                          <label className={fieldLabel}>Invoice Type</label>
                          <select value={invoiceType} disabled className={`${fieldInput} opacity-80`}>
                            <option value={invoiceType}>{getInvoiceTypeLabel(invoiceType)}</option>
                          </select>
                        </div>
                        {invoiceType === 'Contractor' && (
                          <div className="financial-invoicing-contractor">
                            <label className={fieldLabel} htmlFor="invoicing-contractor-select">
                              Contractor
                            </label>
                            {activeContractors.length === 0 ? (
                              <p
                                className={`rounded-lg border px-3 py-2.5 text-xs ${isDarkTheme ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'
                                  }`}
                              >
                                No contractors on this project. Add one in Contractor Management first.
                              </p>
                            ) : (
                              <select
                                id="invoicing-contractor-select"
                                value={selectedContractorMasterId ?? ''}
                                onChange={(e) => handleInvoicingContractorChange(Number(e.target.value))}
                                className={fieldInput}
                              >
                                {activeContractors.map((contractor) => (
                                  <option key={contractor.id} value={contractor.id}>
                                    {contractor.contractor_name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                        {[
                          { key: 'grossBilled', label: 'Gross Billed' },
                          { key: 'netBilledWithoutVAT', label: 'Gross Certified Billed' },
                        ].map((field) => (
                          <div key={field.key}>
                            <label className={fieldLabel}>{field.label}</label>
                            <input
                              type="number"
                              min="0"
                              value={(form[field.key as keyof InvoicingRecord] as number) ?? ''}
                              onChange={(e) =>
                                updateInvoicingField(invoiceType, field.key as keyof InvoicingRecord, e.target.value)
                              }
                              className={fieldInput}
                            />
                          </div>
                        ))}
                      </FinancialFormGrid>
                    </FinancialQuickUpdateCard>
                  );
                })}

                <FinancialTabAnalytics
                  variant="invoicing"
                  metrics={executiveMetrics}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                  projectName={projectName}
                />
              </div>
            )}

            {/* TAB 6: Contract Values */}
            {activeSubTab === 'contracts' && (
              <div className="space-y-5">
                {contractValuesTypesForDisplay.map((contractType, index) => {
                  const form = contractValuesForms[contractType] || emptyContractValue(projectName, contractType);
                  const growthPercentage = form.growthPercentage ?? form.approvedVOPercentage ?? 0;
                  return (
                    <FinancialQuickUpdateCard
                      key={contractType}
                      title={`Update Contract Values (${contractType})`}
                      projectName={projectName}
                      periodLabel={periodNote}
                      successBanner={index === 0 ? formSuccessBanner : null}
                      sectionRef={index === 0 ? formEntryRef : undefined}
                      className="financial-contracts-form"
                      onSave={() => handleContractValueSave(contractType)}
                      onReset={handleFormReset}
                      onRefresh={forceRefresh}
                      saving={savingContractValues[contractType]}
                      refreshDisabled={isForceRefreshing || (contractType === 'Contractor' && loadingContractorFinancial)}
                      saveLabel={`Save ${contractType}`}
                      footerNote={
                        contractType === 'Contractor' && selectedContractor
                          ? !form.id
                            ? `No saved record yet for ${selectedContractor.contractor_name}`
                            : `Editing contract values for ${selectedContractor.contractor_name}`
                          : !form.id
                            ? `No saved ${contractType} record yet`
                            : undefined
                      }
                      isDarkTheme={isDarkTheme}
                      themeClasses={themeClasses}
                    >
                      {contractValuesErrors[contractType] && (
                        <p className="mb-5 text-sm font-medium text-rose-500">{contractValuesErrors[contractType]}</p>
                      )}
                      {contractType === 'Contractor' && loadingContractorFinancial && (
                        <p className={`mb-4 text-xs ${themeClasses.textSecondary}`}>Loading contractor contract values…</p>
                      )}
                      <FinancialFormGrid>
                        <div>
                          <label className={fieldLabel}>Contract Type</label>
                          <select value={contractType} disabled className={`${fieldInput} opacity-80`}>
                            <option value={contractType}>{contractType}</option>
                          </select>
                        </div>
                        {contractType === 'Contractor' && (
                          <div className="financial-contracts-contractor">
                            <label className={fieldLabel} htmlFor="contract-values-contractor-select">
                              Contractor
                            </label>
                            {activeContractors.length === 0 ? (
                              <p
                                className={`rounded-lg border px-3 py-2.5 text-xs ${isDarkTheme ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'
                                  }`}
                              >
                                No contractors on this project. Add one in Contractor Management first.
                              </p>
                            ) : (
                              <select
                                id="contract-values-contractor-select"
                                value={selectedContractorMasterId ?? ''}
                                onChange={(e) => handleContractValueContractorChange(Number(e.target.value))}
                                className={fieldInput}
                              >
                                {activeContractors.map((contractor) => (
                                  <option key={contractor.id} value={contractor.id}>
                                    {contractor.contractor_name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                        {[
                          {
                            key: 'originalContractValue',
                            label: 'Original Contract Value',
                            cls: contractType === 'SCL' ? 'original-contract-field' : '',
                          },
                          { key: 'approvedVO', label: 'Excess Value', cls: contractType === 'SCL' ? 'approved-vo-field' : '' },
                        ].map((field) => (
                          <div key={field.key} className={field.cls}>
                            <label className={fieldLabel}>{field.label}</label>
                            <input
                              type="number"
                              min="0"
                              value={(form[field.key as keyof ContractValueRecord] as number) ?? ''}
                              onChange={(e) =>
                                updateContractValueField(
                                  contractType,
                                  field.key as keyof ContractValueRecord,
                                  e.target.value
                                )
                              }
                              className={fieldInput}
                            />
                          </div>
                        ))}
                        <div className={contractType === 'SCL' ? 'revised-contract-card' : ''}>
                          <label className={fieldLabel}>Revised Contract Value</label>
                          <input
                            type="number"
                            value={form.revisedContractValue ?? ''}
                            readOnly
                            aria-label="Revised Contract Value from server"
                            className={`${fieldInput} cursor-not-allowed opacity-80`}
                          />
                        </div>
                        <div className={contractType === 'SCL' ? 'pending-vo-field' : ''}>
                          <label className={fieldLabel}>Saving</label>
                          <input
                            type="number"
                            min="0"
                            value={form.potentialPendingVO ?? ''}
                            onChange={(e) => updateContractValueField(contractType, 'potentialPendingVO', e.target.value)}
                            className={fieldInput}
                          />
                        </div>
                      </FinancialFormGrid>
                      {contractType === 'SCL' && (
                        <p
                          className={`approved-vo-percent-card mt-5 text-xs font-semibold ${themeClasses.textSecondary}`}
                        >
                          Contract value growth: {growthPercentage.toFixed(0)}%
                        </p>
                      )}
                    </FinancialQuickUpdateCard>
                  );
                })}

                <FinancialTabAnalytics
                  variant="contracts"
                  metrics={executiveMetrics}
                  isDarkTheme={isDarkTheme}
                  themeClasses={themeClasses}
                  projectName={projectName}
                />
              </div>
            )}

          </>
        )}
      </div>

      <p className={`pt-2 text-center text-xs font-medium ${themeClasses.textMuted}`}>
        Data synced via existing backend APIs · Select project and period to load records
      </p>

      {/* PREMIUM ENTERPRISE WALKTHROUGH — Exact same architecture, quality, and UX as Projects Dashboard */}
      {showTour && (
        <FinancialManagementTour
          onClose={() => setShowTour(false)}
          onTourStateChange={setTourActive}
          currentTab={activeSubTab}
          onRequestTabChange={(tab) => {
            if (!lockToInitialSection) setActiveSubTab(tab);
          }}
        />
      )}
    </div>
  );
};

export default FinancialManagement;
