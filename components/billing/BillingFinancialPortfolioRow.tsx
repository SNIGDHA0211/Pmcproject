import React from 'react';
import CmFinancialDashboardRow from '../contractor/CmFinancialDashboardRow';
import { useContractorManagementDashboard } from '../../hooks/useContractorManagementDashboard';
import { getBillingTheme } from '../../utils/billingDashboardTheme';
import { getThemeClasses, useTheme } from '../../utils/theme';
import BillingContractorViewBar from './BillingContractorViewBar';

interface BillingFinancialPortfolioRowProps {
  projectName: string;
  refreshKey?: number;
  onNavigateFinancial?: (section: 'contracts' | 'invoicing') => void;
}

const BillingFinancialPortfolioRow: React.FC<BillingFinancialPortfolioRowProps> = ({
  projectName,
  refreshKey = 0,
  onNavigateFinancial,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const billing = getBillingTheme(isDarkTheme, themeClasses);
  const cm = useContractorManagementDashboard(projectName, refreshKey);

  const contractorLabel = cm.selectedMaster?.contractor_name ?? 'Contractor';

  return (
    <section className="space-y-3" aria-label="Contract values and invoicing">
      <BillingContractorViewBar
        contractors={cm.masters}
        selectedViewId={cm.selectedContractorMasterId}
        onViewChange={cm.setSelectedContractorMasterId}
      />

      {cm.error && (
        <div
          className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${isDarkTheme ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
          role="alert"
        >
          {cm.error}
        </div>
      )}

      {cm.loading && !cm.contractValues && !cm.invoicing ? (
        <div className={`${billing.card} flex min-h-[200px] items-center justify-center`}>
          <div className={billing.spinner} aria-label="Loading contract values and invoicing" />
        </div>
      ) : cm.contractValues && cm.invoicing ? (
        <CmFinancialDashboardRow
          contractValues={cm.contractValues}
          invoicing={cm.invoicing}
          contractors={cm.masters}
          selectedContractorMasterId={cm.selectedContractorMasterId}
          contractorDisplayName={contractorLabel}
          selectedContractorContractValues={cm.selectedContractorContractValues}
          selectedContractorInvoicing={cm.selectedContractorInvoicing}
          loadingSelectedContractorFinancial={cm.loadingSelectedContractorFinancial}
          onNavigateFinancial={onNavigateFinancial}
        />
      ) : (
        <div className={billing.emptyState}>
          No contract values or invoicing data available for this project yet.
        </div>
      )}
    </section>
  );
};

export default BillingFinancialPortfolioRow;
