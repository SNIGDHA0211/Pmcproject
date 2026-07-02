import React, { useState, useEffect } from 'react';

interface PlantMachineryTourProps {
  onClose?: () => void;
  onTourStateChange?: (isActive: boolean) => void;
}

const PLANT_TOUR_STEPS = [
  {
    title: "Plant & Machinery",
    description: "This module is used to manage and monitor site plant machinery inventory and equipment deployment.",
    target: ".pm-header"
  },
  {
    title: "Project Selector",
    description: "Select the active construction project for which machinery inventory is being updated.",
    target: ".pm-project-selector"
  },
  {
    title: "Report Date",
    description: "This date determines the reporting period for machinery availability and deployment records.",
    target: ".pm-report-date"
  },
  {
    title: "Machinery Inventory Table",
    description: "This table contains all registered site machinery and plant equipment available for the selected project.",
    target: ".pm-machinery-table"
  },
  {
    title: "Particular Column",
    description: "This column displays the equipment or machinery name such as cranes, hydras, boom lifts, piling rigs, and transport vehicles.",
    target: ".pm-particular-column"
  },
  {
    title: "Quantity Field",
    description: "Enter the currently available quantity of each machinery item deployed on-site.",
    target: ".pm-quantity-field"
  },
  {
    title: "Remarks Section",
    description: "Use remarks to record machinery condition, maintenance notes, breakdowns, or operational comments.",
    target: ".pm-remarks-field"
  },
  {
    title: "Submit Quantity Selection",
    description: "Submit the updated machinery quantity selections and remarks to save the site inventory report.",
    target: ".pm-submit-button"
  }
];

const PlantMachineryTour: React.FC<PlantMachineryTourProps> = ({ onClose, onTourStateChange }) => {
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = () => {
    setCurrentStep(0);
    setShowTour(true);
    onTourStateChange?.(true);
  };

  const nextStep = () => {
    if (currentStep < PLANT_TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      closeTour();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const closeTour = () => {
    setShowTour(false);
    setCurrentStep(0);
    onTourStateChange?.(false);
    onClose?.();
  };

  // Smart scroll + highlight (same engine as working tours)
  useEffect(() => {
    if (!showTour) return;

    const step = PLANT_TOUR_STEPS[currentStep];
    const targetEl = document.querySelector(step.target) as HTMLElement | null;

    // Clear previous highlights
    document.querySelectorAll('.active-tour-target').forEach(el =>
      el.classList.remove('active-tour-target')
    );

    if (targetEl) {
      targetEl.classList.add('active-tour-target');

      // Smart scrolling for large tables vs small fields
      const rect = targetEl.getBoundingClientRect();
      const isLargeSection = rect.height > window.innerHeight * 0.7;

      setTimeout(() => {
        if (isLargeSection) {
          window.scrollTo({
            top: window.scrollY + rect.top - 120,
            behavior: 'smooth'
          });
        } else {
          targetEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 120);
    }
  }, [currentStep, showTour]);

  if (!showTour) return null;

  const step = PLANT_TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / PLANT_TOUR_STEPS.length) * 100;

  return (
    <>
      {/* Professional Dark Overlay */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[9990]"
        onClick={closeTour}
      />

      {/* Custom Popup - Same style as Dashboard / Financial */}
      <div
        className="fixed top-[120px] right-10 w-[380px] bg-white rounded-2xl p-6 shadow-2xl border z-[99999]"
        style={{
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        }}
      >
        <h3 className="text-lg font-black mb-2">{step.title}</h3>
        <p className="text-sm text-slate-700 leading-relaxed mb-5">
          {step.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span>{currentStep + 1} of {PLANT_TOUR_STEPS.length}</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={closeTour}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Skip Tour
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={previousStep}
                className="px-4 py-1.5 text-sm font-semibold border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-5 py-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              {currentStep === PLANT_TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Professional Highlight Style - Same as working tours */}
      <style>{`
        .active-tour-target {
          position: relative;
          z-index: 80;
          isolation: isolate;
          border-radius: 24px;
          transition: all 0.3s ease;
          box-shadow:
            0 0 0 4px rgba(99,102,241,0.45),
            0 0 35px rgba(99,102,241,0.18);
        }
      `}</style>
    </>
  );
};

export default PlantMachineryTour;