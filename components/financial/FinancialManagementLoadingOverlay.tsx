import React from 'react';
import { useTheme } from '../../utils/theme';
import { InlineLoader } from '../WorkspaceStatusPanels';

interface FinancialManagementLoadingOverlayProps {
  message?: string;
}

const FinancialManagementLoadingOverlay: React.FC<FinancialManagementLoadingOverlayProps> = ({
  message = 'Loading financial data',
}) => {
  const { isDarkTheme } = useTheme();

  return (
    <div
      className={`financial-loading-overlay loading spinner absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl backdrop-blur-[2px] ${
        isDarkTheme ? 'bg-slate-950/70' : 'bg-white/75'
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <InlineLoader label={message} />
    </div>
  );
};

export default FinancialManagementLoadingOverlay;
