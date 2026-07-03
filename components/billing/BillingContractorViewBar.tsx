import React from 'react';
import { HardHat } from 'lucide-react';
import type { ContractorMasterRecord } from '../../types/contractorManagement';
import CmContractorSelector from '../contractor/ui/CmContractorSelector';
import { getBillingTheme } from '../../utils/billingDashboardTheme';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface BillingContractorViewBarProps {
  contractors: ContractorMasterRecord[];
  selectedViewId: number | null;
  onViewChange: (id: number | null) => void;
  className?: string;
}

const BillingContractorViewBar: React.FC<BillingContractorViewBarProps> = ({
  contractors,
  selectedViewId,
  onViewChange,
  className = '',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const billing = getBillingTheme(isDarkTheme, themeClasses);

  if (contractors.length === 0) {
    return (
      <div
        className={`${billing.card} !py-3 text-xs font-semibold ${isDarkTheme ? 'text-amber-200' : 'text-amber-800'} ${className}`}
      >
        No contractors on this project yet. Cumulative portfolio totals will appear when contractor data is available.
      </div>
    );
  }

  return (
    <div className={`${billing.card} !p-3 sm:!p-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={billing.sectionIcon}>
            <HardHat size={18} strokeWidth={2.25} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={billing.sectionTitle}>Contractor view</p>
            <p className={billing.sectionSubtitle}>
              Choose cumulative (all contractors) or a single contractor for both cards below.
            </p>
          </div>
        </div>
        <CmContractorSelector
          contractors={contractors}
          value={selectedViewId}
          onChange={onViewChange}
          includeCumulativeOption
          showNumbering={false}
          label="View"
          className="w-full sm:w-[260px] sm:shrink-0"
        />
      </div>
    </div>
  );
};

export default BillingContractorViewBar;
