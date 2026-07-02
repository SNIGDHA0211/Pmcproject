import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Joyride, Step, STATUS, ACTIONS, EVENTS, EventData } from 'react-joyride';

export interface TeamLeaderSidebarTourHandle {
  startTour: () => void;
}

interface TeamLeaderSidebarTourProps {
  onRequestOpenSidebar?: () => void;
  onTourStateChange?: (isActive: boolean) => void;
  onCollapseSidebarAfterProjects?: () => void;
  isTourRunning?: boolean;
}

const TeamLeaderSidebarTour = forwardRef<TeamLeaderSidebarTourHandle, TeamLeaderSidebarTourProps>(
  (
    {
      onRequestOpenSidebar,
      onTourStateChange,
      onCollapseSidebarAfterProjects,
      isTourRunning: globalIsTourRunning = false,
    },
    ref
  ) => {
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [isStarting, setIsStarting] = useState(false);
    const [tourActive, setTourActive] = useState(false);

    const endedRef = useRef(false);

    const steps: Step[] = [
      {
        target: 'body',
        content:
          'Welcome to the PMC Enterprise Command System. This guided tour will walk you through the Team Leader sidebar navigation and its powerful modules.',
        title: '👋 Welcome, Team Leader!',
        placement: 'center',
        overlayClickAction: false,
      },
      {
        target: '.projects-menu',
        content:
          'Manage and monitor all project-related information from this section. After this step the sidebar will collapse to give you full view of the Projects dashboard.',
        title: 'Projects',
        placement: 'right',
      },
      {
        target: '.commercials-menu',
        content: 'Access commercial details, project costing, and billing information.',
        title: 'Commercials',
        placement: 'right',
      },
      {
        target: '.site-progress-menu',
        content: 'Track construction progress, daily activities, and completion updates.',
        title: 'Site Progress',
        placement: 'right',
      },
      {
        target: '.monthly-scope-menu',
        content: 'Assign and manage monthly work scope for site engineers.',
        title: 'Monthly Scope',
        placement: 'right',
      },
      {
        target: '.manpower-menu',
        content: 'Manage planned vs actual manpower and workforce analytics.',
        title: 'Manpower Management',
        placement: 'right',
      },
      {
        target: '.financial-menu',
        content: 'Track financial records, expenses, cash flow, and cost performance.',
        title: 'Financial Management',
        placement: 'right',
      },
      {
        target: '.plant-menu',
        content: 'Monitor machinery records, equipment usage, and maintenance tracking.',
        title: 'Plant Machinery',
        placement: 'right',
      },
      {
        target: '.hse-menu',
        content: 'Manage safety compliance, inspections, and HSE reports.',
        title: 'HSE (Safety)',
        placement: 'right',
      },
      {
        target: '.portfolio-menu',
        content: 'View company-wide project portfolio and analytics.',
        title: 'Portfolio',
        placement: 'right',
      },
      {
        target: '.dpr-menu',
        content: 'Review Daily Progress Reports and monitor submissions.',
        title: 'DPR Review',
        placement: 'right',
      },
      {
        target: '.wpr-menu',
        content: 'Review Weekly Progress Reports and monitor submissions.',
        title: 'WPR Review',
        placement: 'right',
      },
      {
        target: '.vault-menu',
        content: 'Access the company document vault and important files.',
        title: 'Vault',
        placement: 'right',
      },
      {
        target: '.profile-menu',
        content: 'Access user profile, account settings, and logout options.',
        title: 'Profile Section',
        placement: 'right',
      },
      {
        target: 'body',
        content:
          'You are now ready to use the PMC Enterprise Command System. Use the Help button in the top bar anytime to restart this tour.',
        title: '🎉 Tour Complete',
        placement: 'center',
        overlayClickAction: false,
      },
    ];

    const cleanupJoyrideDOM = useCallback(() => {
      document.body.style.overflow = 'auto';
      document.body.style.pointerEvents = '';
      document.documentElement.style.overflow = 'auto';
    }, []);

    const resetJoyrideCompletely = useCallback(() => {
      setRun(false);
      setStepIndex(0);
      cleanupJoyrideDOM();
    }, [cleanupJoyrideDOM]);

    const finishTour = useCallback(() => {
      if (endedRef.current) return;
      endedRef.current = true;
      localStorage.setItem('teamLeaderTourCompleted', 'true');
      resetJoyrideCompletely();
      setTourActive(false);
      onTourStateChange?.(false);
      onCollapseSidebarAfterProjects?.();
    }, [resetJoyrideCompletely, onTourStateChange, onCollapseSidebarAfterProjects]);

    const handleJoyrideEvent = useCallback(
      (data: EventData) => {
        const { status, type, index, action } = data;

        if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
          const delta = action === ACTIONS.PREV ? -1 : 1;
          const newIndex = Math.max(0, Math.min(index + delta, steps.length - 1));
          setStepIndex(newIndex);
        }

        if (type === EVENTS.TARGET_NOT_FOUND) {
          onRequestOpenSidebar?.();
          setTimeout(() => {
            setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
          }, 250);
        }

        const isEndState =
          status === STATUS.FINISHED ||
          status === STATUS.SKIPPED ||
          action === ACTIONS.CLOSE ||
          action === ACTIONS.STOP;

        if (isEndState) {
          finishTour();
          return;
        }

        if (type === EVENTS.TOUR_END) {
          finishTour();
          return;
        }

        if (type === EVENTS.STEP_AFTER && index >= steps.length - 1) {
          setTimeout(() => {
            finishTour();
          }, 80);
        }
      },
      [steps.length, onRequestOpenSidebar, finishTour]
    );

    const startTour = useCallback(() => {
      if (isStarting || globalIsTourRunning) return;

      endedRef.current = false;
      resetJoyrideCompletely();
      setIsStarting(true);
      setTourActive(true);
      onTourStateChange?.(true);
      onRequestOpenSidebar?.();

      setTimeout(() => {
        requestAnimationFrame(() => {
          if (!document.querySelector('.projects-menu')) {
            onRequestOpenSidebar?.();
          }
          setRun(true);
          setIsStarting(false);
        });
      }, 1000);
    }, [isStarting, globalIsTourRunning, resetJoyrideCompletely, onTourStateChange, onRequestOpenSidebar]);

    useImperativeHandle(ref, () => ({ startTour }), [startTour]);

    useEffect(() => {
      return () => {
        cleanupJoyrideDOM();
        setTourActive(false);
        onTourStateChange?.(false);
      };
    }, [cleanupJoyrideDOM, onTourStateChange]);

    return (
      <>
        <style>{`
          .react-joyride__beacon,
          [data-test-id='button-beacon'] {
            display: none !important;
          }
        `}</style>
        <Joyride
          key={run ? 'running' : 'stopped'}
          steps={steps}
          run={run}
          stepIndex={stepIndex}
          continuous
          scrollToFirstStep
          onEvent={handleJoyrideEvent}
          options={{
            spotlightRadius: 14,
            primaryColor: '#4f46e5',
            backgroundColor: '#ffffff',
            textColor: '#1e293b',
            arrowColor: '#4f46e5',
            zIndex: 100010,
            showProgress: true,
            buttons: ['back', 'close', 'primary', 'skip'],
            scrollOffset: 80,
            blockTargetInteraction: false,
            overlayClickAction: false,
            skipScroll: false,
            offset: 10,
          }}
          floatingOptions={{
            strategy: 'fixed' as const,
            autoUpdate: {
              ancestorScroll: true,
              elementResize: true,
              animationFrame: true,
            },
            flipOptions: { padding: 14 },
            shiftOptions: { padding: 14 },
          }}
          styles={{
            tooltip: {
              borderRadius: '16px',
              padding: '18px',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              fontFamily: 'inherit',
              maxWidth: 'min(360px, calc(100vw - 32px))',
              width: 'auto',
            },
            tooltipTitle: {
              fontSize: '14.5px',
              fontWeight: 800,
              color: '#1e293b',
              marginBottom: '6px',
            },
            tooltipContent: {
              fontSize: '12.5px',
              lineHeight: '1.5',
              color: '#475569',
            },
            buttonPrimary: {
              backgroundColor: '#4f46e5',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              padding: '8px 16px',
              color: '#ffffff',
            },
            buttonBack: {
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 600,
              marginRight: '6px',
            },
            buttonSkip: {
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
            },
            overlay: {
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
            },
          }}
          locale={{
            back: 'Back',
            close: 'Close',
            last: 'Finish',
            next: 'Next',
            skip: 'Skip',
          }}
        />
      </>
    );
  }
);

TeamLeaderSidebarTour.displayName = 'TeamLeaderSidebarTour';

export default TeamLeaderSidebarTour;
