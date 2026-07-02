import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Joyride, Step, STATUS, ACTIONS, EVENTS, EventData } from 'react-joyride';
import { Icons } from '../Icons';
import type { SubTab } from '../FinancialManagement';

interface TourStep extends Step {
  tab?: SubTab;
}

interface FinancialManagementTourProps {
  onClose?: () => void;
  onTourStateChange?: (isActive: boolean) => void;
  currentTab?: SubTab;
  onRequestTabChange?: (tab: SubTab) => void;
}

// Static steps - never recreated (extended with custom `tab` for auto-switching)
const FINANCIAL_TOUR_STEPS: TourStep[] = [
  // 1. PAGE INTRODUCTION
  {
    target: '.fm-header',
    title: 'Financial Management',
    content: 'Central hub for Team Leaders to record and monitor all key financial metrics. Provides single source of truth for progress, cost, revenue, cash positions, contract analysis, and performance monitoring.',
    placement: 'bottom',
    skipBeacon: true,
  },

  // 2. TOP FILTER CONTROLS
  {
    target: '.fin-project-dropdown',
    title: 'Project Dropdown',
    content: 'Select the active project. All financial data, charts, and forms below update for the chosen project and reporting period.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.fin-month-dropdown',
    title: 'Month Selector',
    content: 'Choose the reporting month. All metrics and EVM calculations are tracked and compared on a monthly basis.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.fin-year-field',
    title: 'Year Field',
    content: 'Set the reporting year. Combined with month for precise period filtering across all financial modules.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.fin-logged-user',
    title: 'Logged In As',
    content: 'Displays your authenticated role (Team Leader, Site Engineer, etc.). This role is automatically sent with every save for audit compliance.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.fin-submitted-user',
    title: 'Submitted By',
    content: 'Auto-populated from your login (name/email). Every submission records who created or last updated the record.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.fin-refresh-btn',
    title: 'Refresh Data Button',
    content: 'Reloads the latest data from the backend for the selected project + period. Use after saving or when data may have changed.',
    placement: 'bottom',
    skipBeacon: true,
  },

  // 3. NAVIGATION TABS (each gets its own step)
  {
    target: '.project-progress-tab',
    title: 'Physical Progress Tab',
    content: 'Track monthly and cumulative planned vs actual progress percentages. Includes S-Curve visualization and status comparison cards.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'progress',
  },

  // PROJECT PROGRESS FIELDS - must come immediately after Progress Tab
  {
    target: '.progress-month-field',
    title: 'Progress Month',
    content: 'Enter the period in YYYY-MM-DD format. This anchors all progress percentages for the reporting cycle.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'progress',
  },
  {
    target: '.monthly-plan-field',
    title: 'Monthly Plan %',
    content: 'Target planned progress percentage for this specific month (used for S-curve planning).',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'progress',
  },
  {
    target: '.monthly-actual-field',
    title: 'Monthly Actual %',
    content: 'Actual progress achieved in the month. Compare against plan to identify schedule variances early.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'progress',
  },
  {
    target: '.cumulative-plan-field',
    title: 'Cumulative Plan %',
    content: 'Total planned progress from project start through the end of this month.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'progress',
  },
  {
    target: '.cumulative-actual-field',
    title: 'Cumulative Actual %',
    content: 'Total actual progress achieved from project start through this month.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'progress',
  },
  {
    target: '.progress-save-btn',
    title: 'Save / Update Button',
    content: 'Persists the progress data to the backend. Supports both create and update operations for the current period.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'progress',
  },
  {
    target: '.progress-refresh-btn',
    title: 'Refresh Button',
    content: 'Reloads latest progress data from server for the selected project and month.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'progress',
  },
  {
    target: '.progress-chart',
    title: 'S-Curve / Progress Trend Chart',
    content: 'Visual line chart comparing cumulative planned vs actual progress. Essential for spotting trends and forecasting completion.',
    placement: 'top',
    skipBeacon: true,
    tab: 'progress',
  },
  {
    target: '.progress-status-card',
    title: 'Physical Progress Status Card',
    content: 'At-a-glance comparison of Monthly and Cumulative Planned vs Actual percentages for quick performance assessment.',
    placement: 'top',
    skipBeacon: true,
    tab: 'progress',
  },

  {
    target: '.contract-performance-tab',
    title: 'Contract Performance Tab',
    content: 'Monitor Billed Value and Actual Receipt Value with calculated variance and performance percentage.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'contract',
  },
  {
    target: '.cost-performance-tab',
    title: 'Financial Progress Tab',
    content: 'Full Earned Value Management: BCWS, BCWP, ACWP, FCST, BAC plus CPI, CV, SV, EAC, VAC metrics.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'cost',
  },
  {
    target: '.budget-cost-tab',
    title: 'Budget vs Cost Tab',
    content: 'Compare Budget at Completion (BAC) against BCWP and ACWP. Key KPIs: CPI, EAC, ETC, VAC, CV.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'budget',
  },
  {
    target: '.invoicing-tab',
    title: 'Invoicing Tab',
    content: 'Track Gross Billed, Gross Certified Billed, Difference, and Certification Efficiency from the API.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'invoicing',
  },
  {
    target: '.contract-values-tab',
    title: 'Contract Values Tab',
    content: 'Original Contract Value + Approved/Pending Variation Orders. Shows Revised Contract Value and approval percentages.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'contracts',
  },
  // CONTRACT PERFORMANCE SECTION
  {
    target: '.billed-value-field',
    title: 'Billed Value',
    content: 'Total billed value used as the baseline for receipt performance.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'contract',
  },
  {
    target: '.actual-receipt-value-field',
    title: 'Actual Receipt Value',
    content: 'Actual amount received against the billed value.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'contract',
  },
  {
    target: '.performance-percent-card',
    title: 'Performance Percentage',
    content: 'Actual Receipt Value divided by Billed Value, expressed as a percentage.',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'contract',
  },
  {
    target: '.variance-card',
    title: 'Variance',
    content: 'Difference between Billed Value and Actual Receipt Value.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.variance-percent-card',
    title: 'Variance Percentage',
    content: 'Variance divided by Billed Value, expressed as a percentage.',
    placement: 'bottom',
    skipBeacon: true,
  },

  // COST PERFORMANCE (EVM)
  {
    target: '.bcws-field',
    title: 'BCWS (Budgeted Cost of Work Scheduled)',
    content: 'Planned value of work that should have been accomplished by now (time-phased budget).',
    placement: 'bottom',
    skipBeacon: true,
    tab: 'cost',
  },
  {
    target: '.bcwp-field',
    title: 'BCWP (Budgeted Cost of Work Performed)',
    content: 'Earned Value – the budgeted cost of work that has actually been completed.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.acwp-field',
    title: 'ACWP (Actual Cost of Work Performed)',
    content: 'Actual costs incurred for the work performed to date.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.fcst-field',
    title: 'FCST (Forecast)',
    content: 'Latest cost forecast for the project.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.bac-field',
    title: 'BAC (Budget at Completion)',
    content: 'Total approved budget for the entire project.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.cpi-card',
    title: 'CPI (Cost Performance Index)',
    content: 'BCWP ÷ ACWP. >1.0 = under budget, <1.0 = over budget. Critical EVM health metric.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.cv-card',
    title: 'CV (Cost Variance)',
    content: 'BCWP − ACWP. Positive = under budget.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.sv-card',
    title: 'SV (Schedule Variance)',
    content: 'BCWP − BCWS. Positive = ahead of schedule.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.eac-card',
    title: 'EAC (Estimate at Completion)',
    content: 'Forecast of total cost at project completion based on current performance.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.vac-card',
    title: 'VAC (Variance at Completion)',
    content: 'BAC − EAC. Expected final cost variance.',
    placement: 'bottom',
    skipBeacon: true,
  },

  // BUDGET VS COST
  {
    target: '.budget-bac-field',
    title: 'BAC',
    content: 'Budget at Completion for this view.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.budget-bcwp-field',
    title: 'BCWP',
    content: 'Earned value in the budget vs cost analysis.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.budget-acwp-field',
    title: 'ACWP',
    content: 'Actual cost in the budget vs cost comparison.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.budget-cpi-card',
    title: 'CPI (Budget View)',
    content: 'Cost Performance Index calculated from the budget perspective.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.budget-eac-card',
    title: 'EAC',
    content: 'Estimate at Completion from budget analysis.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.budget-etc-card',
    title: 'ETC (Estimate to Complete)',
    content: 'Remaining budget required to finish the project.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.budget-vac-card',
    title: 'VAC',
    content: 'Variance at Completion in budget terms.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.budget-cv-card',
    title: 'CV (Budget View)',
    content: 'Cost Variance from the budget vs cost module.',
    placement: 'bottom',
    skipBeacon: true,
  },

  // INVOICING
  {
    target: '.gross-billed-field',
    title: 'Gross Billed',
    content: 'Total amount billed including VAT/taxes.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.net-billed-field',
    title: 'Gross Certified Billed',
    content: 'Billed amount excluding taxes. The real revenue figure before tax.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.net-collected-field',
    title: 'Difference',
    content: 'Actual cash received against invoices (ex-VAT).',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.net-due-card',
    title: 'Certification Efficiency',
    content: 'Returned by the API. Read-only certification efficiency percentage.',
    placement: 'bottom',
    skipBeacon: true,
  },

  // CONTRACT VALUES
  {
    target: '.original-contract-field',
    title: 'Original Contract Value',
    content: 'The initial contract amount before any variations.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.approved-vo-field',
    title: 'Excess Value',
    content: 'Additional contract value above the original contract value.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.pending-vo-field',
    title: 'Saving',
    content: 'Cost savings applied against the contract value.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.revised-contract-card',
    title: 'Revised Contract Value',
    content: 'Current contract value returned by the API (Original Contract Value + Excess Value − Saving).',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.approved-vo-percent-card',
    title: 'Contract Value Growth',
    content: 'Growth percentage returned by the API for revised contract value vs original contract value.',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.contract-status-card',
    title: 'Contract Status Card',
    content: 'Summary status derived from contract value changes and pending variations.',
    placement: 'top',
    skipBeacon: true,
  },

  // FINAL COMPLETION STEP - always stable (the floating Restart button)
  {
    target: '.restart-tour-btn',
    title: 'Tour Complete',
    content: 'The Financial Management walkthrough is now complete. You can restart the tour anytime from here.',
    placement: 'top',
    skipBeacon: true,
  },
];

const FinancialManagementTour: React.FC<FinancialManagementTourProps> = ({
  onClose,
  onTourStateChange,
  currentTab,
  onRequestTabChange,
}) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const [showStepRecoveryBanner, setShowStepRecoveryBanner] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const initializedRef = useRef(false);
  const endedRef = useRef(false);
  const isProcessingStepRef = useRef(false);
  const pendingRecoveryRef = useRef(false);
  const lastTabRef = useRef<SubTab | null>(null);

  // Stable options (exact same as Projects Dashboard)
  const joyrideConfigOptions = useMemo(() => ({
    primaryColor: '#3b82f6',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    arrowColor: '#3b82f6',
    zIndex: 100010,
    showProgress: true,
    buttons: ['back', 'close', 'primary', 'skip'] as ['back', 'close', 'primary', 'skip'],
    spotlightPadding: 8,
    spotlightRadius: 12,
    blockTargetInteraction: false,
    overlayClickAction: false as false,
    skipScroll: false,
    // Strong protections now handled in handleStepNavigation + validateStepTarget + final step completion logic
  }), []);

  const joyrideFloatingOptions = useMemo(() => ({
    strategy: 'fixed' as const,
    autoUpdate: {
      ancestorScroll: true,
      elementResize: true,
      animationFrame: true,
      layoutShift: true,
    },
    flipOptions: { padding: 12 },
    shiftOptions: { padding: 12 },
  }), []);

  const joyrideStyles = useMemo(() => ({
    tooltip: {
      borderRadius: '16px',
      padding: '16px 18px',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      maxWidth: 'min(360px, calc(100vw - 40px))',
      fontSize: '13px',
      lineHeight: '1.4',
    },
    tooltipTitle: {
      fontSize: '14px',
      fontWeight: 800,
      marginBottom: '4px',
    },
    tooltipContent: {
      fontSize: '12.5px',
    },
    buttonNext: {
      fontSize: '12px',
      padding: '6px 12px',
      backgroundColor: '#2563eb',
    },
    buttonBack: { fontSize: '12px' },
    buttonSkip: { fontSize: '11px' },
  }), []);

  // Auto-start on first visit (production pattern)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const completed = localStorage.getItem('financialManagementTourCompleted') === 'true';
    if (!completed) {
      console.log('[FinancialTour] Auto-starting on first visit');
      setIsStarting(true);
      setTourActive(true);
      onTourStateChange?.(true);
      setTimeout(() => {
        setRun(true);
        setIsStarting(false);
      }, 600);
    }
  }, [onTourStateChange]);

  // Handle tab changes from parent - resume tour smoothly
  useEffect(() => {
    if (!run || !currentTab || currentTab === lastTabRef.current) return;
    lastTabRef.current = currentTab;

    // After parent changed tab, give DOM time to render then force Joyride to re-evaluate current step
    const timer = setTimeout(() => {
      if (run) {
        // Slight nudge to re-render tooltip at correct position
        setStepIndex(prev => prev);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [currentTab, run]);

  // Retry counts to prevent infinite loops on missing targets
  const retryCounts = useRef<Record<number, number>>({});

  const validateStepTarget = (step: any) => {
    if (!step?.target) return false;
    const element = document.querySelector(step.target as string);
    return !!element;
  };

  const finishTour = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;

    localStorage.setItem('financialManagementTourCompleted', 'true');
    setRun(false);
    setStepIndex(0);
    setTourActive(false);
    setShowStepRecoveryBanner(false);
    pendingRecoveryRef.current = false;
    onTourStateChange?.(false);
    onClose?.();
  }, [onClose, onTourStateChange]);

  const goToStep = useCallback((nextIndex: number) => {
    const step = FINANCIAL_TOUR_STEPS[nextIndex];

    if (!step) {
      finishTour();
      return;
    }

    // Switch tabs if needed - wait for DOM rendering
    if (step.tab && step.tab !== currentTab && onRequestTabChange) {
      onRequestTabChange(step.tab);

      setTimeout(() => {
        const exists = validateStepTarget(step);

        if (exists) {
          const targetEl = document.querySelector(step.target as string);
          if (targetEl) {
            targetEl.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });
          }

          setTimeout(() => {
            setStepIndex(nextIndex);
          }, 400);
        } else {
          console.warn("Target missing after tab switch:", step.target);
          retryStep(nextIndex);
        }
      }, 1200);

      return;
    }

    // Validate target
    const exists = validateStepTarget(step);

    if (!exists) {
      console.warn("Target missing:", step.target);
      retryStep(nextIndex);
      return;
    }

    const targetEl = document.querySelector(step.target as string);
    if (targetEl) {
      targetEl.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    setTimeout(() => {
      setStepIndex(nextIndex);
    }, 300);
  }, [currentTab, onRequestTabChange, finishTour]);

  const retryStep = useCallback((stepIndexToRetry: number) => {
    retryCounts.current[stepIndexToRetry] =
      (retryCounts.current[stepIndexToRetry] || 0) + 1;

    // Prevent infinite retries - max 3 attempts
    if (retryCounts.current[stepIndexToRetry] > 3) {
      console.warn("Skipping permanently missing step after retries:", stepIndexToRetry);
      goToStep(stepIndexToRetry + 1);
      return;
    }

    setTimeout(() => {
      goToStep(stepIndexToRetry);
    }, 800);
  }, [goToStep]);

  const handleJoyrideCallback = useCallback((data: EventData) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finishTour();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const nextIndex =
        action === ACTIONS.PREV
          ? index - 1
          : index + 1;

      goToStep(nextIndex);
    }
  }, [goToStep, finishTour]);

  // Public start method (called from parent button)
  const startTour = useCallback(() => {
    if (isStarting) return;
    localStorage.removeItem('financialManagementTourCompleted');
    endedRef.current = false;
    setIsStarting(true);
    setTourActive(true);
    onTourStateChange?.(true);
    setStepIndex(0);
    setShowStepRecoveryBanner(false);
    pendingRecoveryRef.current = false;

    setTimeout(() => {
      setRun(true);
      setIsStarting(false);
    }, 350);
  }, [isStarting, onTourStateChange]);

  // Expose startTour for parent if needed (via ref or direct call pattern already handled in parent)
  // In this implementation the parent button directly sets showTour + localStorage remove

  return (
    <>
      <Joyride
        run={run}
        stepIndex={stepIndex}
        steps={FINANCIAL_TOUR_STEPS}
        continuous
        scrollToFirstStep
        onEvent={handleJoyrideCallback}
        styles={joyrideStyles}
        options={joyrideConfigOptions}
        floatingOptions={joyrideFloatingOptions}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip',
        }}
      />

      {/* Recovery banner removed - tab switching now handles DOM readiness reliably */}

    </>
  );
};

export default FinancialManagementTour;
