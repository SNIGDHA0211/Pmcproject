import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Joyride, Step, STATUS, ACTIONS, EVENTS, EventData } from 'react-joyride';

/** Tour targets must match class names on the Team Leader Projects dashboard. */
const PROJECTS_TOUR_STEPS: Step[] = [
  {
    target: 'body',
    content:
      'This walkthrough explains the key project analytics and performance dashboards used for monitoring project health.',
    title: 'Projects Analytics Walkthrough',
    placement: 'center',
    skipBeacon: true,
  },
  {
    target: '.project-dates-group',
    content:
      'SCL and Contractor project timelines with start, contract finish, forecast finish, EOT dates, durations, current delay, and schedule health.',
    title: 'Project Dates (SCL & Contractor)',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.contract-values-group',
    content:
      'Track Original Contract Value, Excess Value, Revised Contract Value, and Saving for SCL and Contractor.',
    title: 'Contract Values',
    placement: 'right',
    offset: 24,
    skipBeacon: true,
    floatingOptions: {
      flipOptions: false,
      shiftOptions: { padding: 16 },
    },
  },
  {
    target: '.invoicing-group',
    content: 'Monitor Gross Billed, Gross Certified Billed, Difference, and Certification Efficiency for billing and cash flow.',
    title: 'Invoicing & Cash Flow',
    placement: 'left',
    offset: 24,
    skipBeacon: true,
    floatingOptions: {
      flipOptions: false,
      shiftOptions: { padding: 16 },
    },
  },
  {
    target: '.hse-status-card',
    content:
      'Safety metrics: Fatalities, Significant, Major, Minor, and Near Miss. Expand the card for monthly and YTD detail.',
    title: 'Health & Safety Status',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.planned-earned-value-tour-group',
    content:
      'SCL and Contractor Planned vs Actual Value only. Use the info (i) button for formulas, expand for full-screen view, and edit to update in Financial Management.',
    title: 'Planned vs Actual Value',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.internal-cost-card',
    content:
      'BCWP, Actual Cost, and Cost Variance with Cost Performance Index. Info (i), expand, and edit buttons are in the top-right of this card.',
    title: 'Internal Cost Performance',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.contract-performance-card',
    content:
      'Billed Value vs Actual Receipt Value and collection performance. Use info, expand, and edit in the card header.',
    title: 'Contract Performance',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.quality-status-card',
    content:
      'Monthly quality KPIs: tests required, conducted, shortfall, pass/fail, performance gauge, and trend chart.',
    title: 'Project Quality Status',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.drawings-card',
    content: 'Drawing submission and approval KPIs with monthly trend.',
    title: 'Drawings Summary',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '.progress-curve-card',
    content: 'S-Curve showing planned vs actual progress (monthly and cumulative).',
    title: 'Physical Progress S-Curve',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '.manpower-histogram-card',
    content: 'Planned vs Actual manpower distribution for workforce planning.',
    title: 'Manpower Histogram',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '.po-delivery-card',
    content:
      'Client and contractor correspondence — received, delivered, pending, and delivery efficiency.',
    title: 'Correspondence & Delivery Status',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '.cost-performance-card',
    content: 'BCWS, BCWP, ACWP, and Forecast — financial progress and EVM forecasting.',
    title: 'Financial Progress & Forecasting',
    placement: 'top',
    skipBeacon: true,
  },
  {
    target: '.project-logs-card',
    content: 'Issues, Concerns, Risks, and Actions for proactive risk management.',
    title: 'Project Logs & Risk Management',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.budget-cost-card',
    content: 'BAC, EAC, ETC, and Cost Variance for budget forecasting.',
    title: 'Budget vs Cost Forecasting',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.machinery-log-card',
    content: 'Site machinery log from site engineers — equipment tracking and status.',
    title: 'Site Machinery Log',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.project-equipment-card',
    content: 'Planned vs Actual equipment and utilization.',
    title: 'Project Equipment',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: '.site-photos-card',
    content: 'Site photography and visual progress evidence for reporting and claims.',
    title: 'Site Photos',
    placement: 'bottom',
    skipBeacon: true,
  },
  {
    target: 'body',
    content:
      'You have completed the Projects Analytics walkthrough. Use Analytics Walkthrough anytime to run it again.',
    title: 'Walkthrough Complete',
    placement: 'center',
    skipBeacon: true,
  },
];

interface ProjectsDashboardTourProps {
  onClose?: () => void;
  onRequestCloseSidebar?: () => void;
  onTourStateChange?: (isActive: boolean) => void;
  projectLogsRef?: React.RefObject<HTMLDivElement | null>;
  machineryLogRef?: React.RefObject<HTMLDivElement | null>;
  projectEquipmentRef?: React.RefObject<HTMLDivElement | null>;
}

const ProjectsDashboardTour: React.FC<ProjectsDashboardTourProps> = ({
  onClose,
  onRequestCloseSidebar,
  onTourStateChange,
  projectLogsRef,
  machineryLogRef,
  projectEquipmentRef,
}) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const endedRef = useRef(false);
  const retryCounts = useRef<Record<number, number>>({});

  const joyrideStyles = useMemo(
    () => ({
      tooltip: {
        borderRadius: '16px',
        padding: '18px',
        maxWidth: 'min(380px, calc(100vw - 40px))',
      },
      tooltipTitle: { fontSize: '14px', fontWeight: 800 },
      tooltipContent: { fontSize: '12.5px', lineHeight: 1.45 },
    }),
    []
  );

  const finishTour = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    localStorage.setItem('projectsDashboardTourCompleted', 'true');
    setRun(false);
    setStepIndex(0);
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    onTourStateChange?.(false);
    onClose?.();
  }, [onClose, onTourStateChange]);

  const resolveTargetElement = useCallback(
    (target: string): HTMLElement | null => {
      if (target === 'body') return document.body;
      if (target.includes('project-logs') && projectLogsRef?.current) return projectLogsRef.current;
      if (target.includes('machinery-log') && machineryLogRef?.current) return machineryLogRef.current;
      if (target.includes('project-equipment') && projectEquipmentRef?.current) {
        return projectEquipmentRef.current;
      }
      return document.querySelector(target) as HTMLElement | null;
    },
    [projectLogsRef, machineryLogRef, projectEquipmentRef]
  );

  const validateStepTarget = useCallback(
    (step: Step) => {
      const target = step.target as string;
      if (target === 'body') return true;
      return !!resolveTargetElement(target);
    },
    [resolveTargetElement]
  );

  const scrollTargetIntoView = useCallback((target: string) => {
    const el = resolveTargetElement(target);
    if (el && target !== 'body') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    return el;
  }, [resolveTargetElement]);

  const goToStep = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0) {
        setStepIndex(0);
        return;
      }
      if (nextIndex >= PROJECTS_TOUR_STEPS.length) {
        finishTour();
        return;
      }

      const step = PROJECTS_TOUR_STEPS[nextIndex];
      const target = step.target as string;

      if (!validateStepTarget(step)) {
        retryCounts.current[nextIndex] = (retryCounts.current[nextIndex] || 0) + 1;
        if (retryCounts.current[nextIndex] > 4) {
          console.warn('[ProjectsTour] Skipping missing target after retries:', target);
          goToStep(nextIndex + 1);
          return;
        }
        setTimeout(() => goToStep(nextIndex), 600);
        return;
      }

      retryCounts.current[nextIndex] = 0;
      scrollTargetIntoView(target);
      setTimeout(() => setStepIndex(nextIndex), target === 'body' ? 80 : 420);
    },
    [finishTour, scrollTargetIntoView, validateStepTarget]
  );

  const handleJoyrideCallback = useCallback(
    (data: EventData) => {
      const { action, index, status, type } = data;

      if (
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED ||
        action === ACTIONS.CLOSE ||
        action === ACTIONS.STOP
      ) {
        finishTour();
        return;
      }

      if (type === EVENTS.TOUR_END) {
        finishTour();
        return;
      }

      if (type === EVENTS.STEP_AFTER) {
        const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
        goToStep(nextIndex);
        return;
      }

      if (type === EVENTS.TARGET_NOT_FOUND) {
        const target = PROJECTS_TOUR_STEPS[index]?.target as string;
        scrollTargetIntoView(target);
        setTimeout(() => {
          if (validateStepTarget(PROJECTS_TOUR_STEPS[index])) {
            setStepIndex(index);
          } else {
            goToStep(index + 1);
          }
        }, 500);
      }
    },
    [finishTour, goToStep, scrollTargetIntoView, validateStepTarget]
  );

  useEffect(() => {
    endedRef.current = false;
    retryCounts.current = {};
    onTourStateChange?.(true);
    onRequestCloseSidebar?.();
    window.scrollTo({ top: 0, behavior: 'auto' });

    const timer = window.setTimeout(() => {
      setRun(true);
      setStepIndex(0);
    }, 450);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, [onRequestCloseSidebar, onTourStateChange]);

  useEffect(() => {
    return () => {
      onTourStateChange?.(false);
    };
  }, [onTourStateChange]);

  const joyride = (
    <Joyride
      steps={PROJECTS_TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep={false}
      onEvent={handleJoyrideCallback}
      styles={joyrideStyles}
      options={{
        zIndex: 100010,
        primaryColor: '#4f46e5',
        arrowColor: '#4f46e5',
        spotlightPadding: 12,
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip tour',
      }}
      floatingOptions={{
        middleware: [],
      }}
    />
  );

  return createPortal(joyride, document.body);
};

export default React.memo(ProjectsDashboardTour);
