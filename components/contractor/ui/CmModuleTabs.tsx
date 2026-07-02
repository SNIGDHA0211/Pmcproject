import React, { useCallback, useRef } from 'react';
import type { ContractorDashboardTab } from '../../../types/contractorManagement';
import { useCmTheme } from '../enterpriseTheme';

export interface CmTabItem {
  id: ContractorDashboardTab;
  label: string;
  short: string;
}

export interface CmModuleTabsProps {
  tabs: CmTabItem[];
  activeTab: ContractorDashboardTab;
  onChange: (tab: ContractorDashboardTab) => void;
}

const CmModuleTabs: React.FC<CmModuleTabsProps> = ({ tabs, activeTab, onChange }) => {
  const theme = useCmTheme();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let next = index;
      if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;

      e.preventDefault();
      const tab = tabs[next];
      tabRefs.current[tab.id]?.focus();
      onChange(tab.id);
    },
    [onChange, tabs],
  );

  return (
    <nav className={theme.tabs.bar} role="tablist" aria-label="Contractor management sections">
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={`cm-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`cm-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`${theme.tabs.base} ${isActive ? theme.tabs.active : theme.tabs.inactive}`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
            {isActive && (
              <span
                className="absolute inset-x-3 -bottom-1.5 h-0.5 rounded-full bg-indigo-500 transition-all duration-300"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default CmModuleTabs;
