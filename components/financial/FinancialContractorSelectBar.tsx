import React from 'react';
import { HardHat } from 'lucide-react';
import type { ContractorMasterRecord } from '../../types/contractorManagement';
import CmContractorSelector from '../contractor/ui/CmContractorSelector';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface FinancialContractorSelectBarProps {
  contractors: ContractorMasterRecord[];
  selectedContractorId: number | null;
  onContractorChange: (id: number) => void;
  className?: string;
}

const FinancialContractorSelectBar: React.FC<FinancialContractorSelectBarProps> = ({
  contractors,
  selectedContractorId,
  onContractorChange,
  className = '',
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  if (contractors.length === 0) {
    return (
      <div
        className={`mb-5 rounded-lg border px-3 py-2.5 text-xs ${themeClasses.border} ${isDarkTheme ? 'bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'
          } ${className}`}
      >
        No contractors on this project. Add a contractor in Contractor Management first.
      </div>
    );
  }

  return (
    <div
      className={`mb-5 flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-4 ${isDarkTheme ? `${themeClasses.border} bg-white/[0.03]` : 'border-slate-200 bg-slate-50'
        } ${className}`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isDarkTheme ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
            }`}
        >
          <HardHat size={16} strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wide text-blue-600`}>Contractor</p>
          <p className={`mt-0.5 text-xs ${themeClasses.textSecondary}`}>
            Select which contractor&apos;s values to view or save below.
          </p>
        </div>
      </div>
      <CmContractorSelector
        contractors={contractors}
        value={selectedContractorId}
        onChange={(id) => {
          if (id != null) onContractorChange(id);
        }}
        className="w-full sm:w-[260px] sm:shrink-0"
      />
    </div>
  );
};

export default FinancialContractorSelectBar;
