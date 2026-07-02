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
      className={`flex flex-wrap gap-1 rounded-xl p-1 ${
        isDarkTheme ? 'bg-white/5' : 'bg-[#F1F5F9]'
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
            className={`financial-tab-${tab.key} ${tourClass} ${tab.className ?? ''} h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-[#4F46E5] text-white shadow-sm'
                : isDisabled
                  ? 'cursor-not-allowed opacity-40 text-[#94A3B8]'
                  : isDarkTheme
                    ? 'text-slate-400 hover:bg-white/10 hover:text-white'
                    : 'bg-transparent text-[#64748B] hover:bg-white hover:text-[#0F172A]'
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
