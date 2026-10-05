import React from 'react';
import type { SubTab } from '../FinancialManagement';

export interface FinancialTabItem {
  key: SubTab;
  label: string;
  className?: string;
}

interface FinancialSegmentedTabsProps {
  tabs: FinancialTabItem[];
  activeTab: SubTab;
  onChange: (tab: SubTab) => void;
  lockToInitialSection?: boolean;
  isDarkTheme: boolean;
  themeClasses: Record<string, string>;
}

const FinancialSegmentedTabs: React.FC<FinancialSegmentedTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  lockToInitialSection,
  isDarkTheme,
  themeClasses,
}) => (
  <div className="space-y-2">
    {lockToInitialSection && (
      <p className={`text-[11px] font-medium ${themeClasses.textMuted}`}>
        Opened from Projects — only the selected section is editable.
      </p>
    )}
    <div
      className={`flex flex-wrap gap-1.5 rounded-2xl p-1.5 border transition-all ${
        isDarkTheme
          ? 'bg-slate-900/80 border-slate-800 shadow-inner'
          : 'bg-slate-100/80 border-slate-200/80 shadow-inner'
      }`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const isDisabled = lockToInitialSection && !isActive;
        const tourClass =
          tab.key === 'progress'
            ? 'project-progress-tab'
            : tab.key === 'contract'
              ? 'contract-performance-tab'
              : tab.key === 'cost'
                ? 'cost-performance-tab'
                : tab.key === 'budget'
                  ? 'budget-cost-tab'
                  : tab.key === 'invoicing'
                    ? 'invoicing-tab'
                    : tab.key === 'contracts'
                      ? 'contract-values-tab'
                      : '';

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(tab.key)}
            title={isDisabled ? 'Use Financial Management in the menu to switch sections' : undefined}
            className={`financial-tab-${tab.key} ${tourClass} ${tab.className ?? ''} h-10 shrink-0 rounded-xl px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              isActive
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-500/50 scale-[1.02]'
                : isDisabled
                  ? 'cursor-not-allowed opacity-40 text-slate-400'
                  : isDarkTheme
                    ? 'text-slate-400 hover:bg-white/10 hover:text-slate-100'
                    : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default FinancialSegmentedTabs;
