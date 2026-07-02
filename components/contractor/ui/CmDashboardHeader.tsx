import React from 'react';
import { HardHat, Plus, RefreshCw } from 'lucide-react';
import type { ContractorMasterRecord } from '../../../types/contractorManagement';
import DashboardCardTopAccent from '../../DashboardCardTopAccent';
import { useCmTheme } from '../enterpriseTheme';
import CmButton from './CmButton';
import CmContractorSelector from './CmContractorSelector';

export interface CmDashboardHeaderProps {
  projectTitle: string;
  contractors: ContractorMasterRecord[];
  selectedViewId: number | null;
  onViewChange: (id: number | null) => void;
  onAddContractor: () => void;
  onRefresh: () => void;
  loading?: boolean;
  lastUpdated?: Date | null;
  error?: string | null;
}

const CmDashboardHeader: React.FC<CmDashboardHeaderProps> = ({
  projectTitle,
  contractors,
  selectedViewId,
  onViewChange,
  onAddContractor,
  onRefresh,
  loading = false,
  lastUpdated,
  error,
}) => {
  const theme = useCmTheme();

  return (
    <header className={theme.shell}>
      <DashboardCardTopAccent />
      <div className="px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
            <span className={theme.badge} aria-hidden>
              <HardHat size={18} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h1 className={theme.title}>Contractor Management</h1>
              <p className={`mt-0.5 truncate text-xs sm:text-sm ${theme.tc.textSecondary}`}>
                {projectTitle}
                {lastUpdated && (
                  <>
                    {' · '}
                    <time dateTime={lastUpdated.toISOString()}>
                      Updated {lastUpdated.toLocaleTimeString()}
                    </time>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end lg:w-auto lg:shrink-0">
            <CmContractorSelector
              contractors={contractors}
              value={selectedViewId}
              onChange={onViewChange}
              includeCumulativeOption
              showNumbering={false}
              label="View"
              className="w-full sm:w-[220px] sm:shrink-0 lg:w-[260px]"
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
          <div className={`${theme.errorBanner} mt-3`} role="alert">
            {error}
          </div>
        )}
      </div>
    </header>
  );
};

export default CmDashboardHeader;
