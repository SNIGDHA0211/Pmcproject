import React from 'react';
import type { ContractorDashboardTab } from '../../../types/contractorManagement';
import { useCmTheme } from '../enterpriseTheme';

export interface CmContentContainerProps {
  tabId: ContractorDashboardTab;
  children: React.ReactNode;
  className?: string;
}

const CmContentContainer: React.FC<CmContentContainerProps> = ({ tabId, children, className = '' }) => {
  const theme = useCmTheme();

  return (
    <div
      id={`cm-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`cm-tab-${tabId}`}
      className={`${theme.content} ${className}`}
    >
      {children}
    </div>
  );
};

export default CmContentContainer;
