import React from 'react';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
import type { ContractorDashboardTab, ContractorMasterRecord } from '../../../types/contractorManagement';
import { useCmTheme } from '../enterpriseTheme';
import CmButton from './CmButton';
import CmContractorSelector from './CmContractorSelector';
import CmModuleTabs, { type CmTabItem } from './CmModuleTabs';

export interface CmDashboardHeaderProps {
  projectTitle: string;
  activeTab: ContractorDashboardTab;
  tabs: CmTabItem[];
  onTabChange: (tab: ContractorDashboardTab) => void;
  contractors: ContractorMasterRecord[];
  selectedContractorId: number | null;
  onContractorChange: (id: number) => void;
  onAddContractor: () => void;
  onRefresh: () => void;
  loading?: boolean;
  lastUpdated?: Date | null;
  error?: string | null;
}

const CmDashboardHeader: React.FC<CmDashboardHeaderProps> = ({
  projectTitle,
  activeTab,
  tabs,
  onTabChange,
  contractors,
  selectedContractorId,
  onContractorChange,
  onAddContractor,
  onRefresh,
  loading = false,
  lastUpdated,
  error,
}) => {
  const theme = useCmTheme();
  const activeLabel = tabs.find((t) => t.id === activeTab)?.label ?? 'Overview';

  return (
    <header className={theme.shell}>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Top row: title block + actions */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={theme.badge}>Contractor Management</span>
              {lastUpdated && (
                <time className={theme.timestamp} dateTime={lastUpdated.toISOString()}>
                  Updated {lastUpdated.toLocaleTimeString()}
                </time>
              )}
            </div>
            <h1 className={`mt-2 ${theme.title}`}>{projectTitle}</h1>
            <p className={`mt-1 ${theme.breadcrumb}`}>
              Dashboard <ChevronRight size={12} aria-hidden />
              <span className={theme.breadcrumbActive}>{activeLabel}</span>
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end lg:w-auto lg:shrink-0">
            <CmContractorSelector
              contractors={contractors}
              value={selectedContractorId}
              onChange={onContractorChange}
              className="w-full sm:w-[240px] sm:shrink-0"
            />
            <div className="flex gap-2">
              <CmButton variant="secondary" icon={Plus} onClick={onAddContractor} className="flex-1 sm:flex-none">
                Add Contractor
              </CmButton>
              <CmButton
                variant="primary"
                icon={RefreshCw}
                loading={loading}
                onClick={onRefresh}
                className="flex-1 sm:flex-none"
              >
                Refresh
              </CmButton>
            </div>
          </div>
        </div>

        {error && (
          <div className={theme.errorBanner} role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-b-2xl">
        <CmModuleTabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
      </div>
    </header>
  );
};

export default CmDashboardHeader;
