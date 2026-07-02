import React from 'react';
import { useCmTheme } from '../enterpriseTheme';

interface CmCumulativeViewFieldProps {
  className?: string;
}

/** Read-only field showing cumulative (all contractors) financial view. */
const CmCumulativeViewField: React.FC<CmCumulativeViewFieldProps> = ({ className = '' }) => {
  const theme = useCmTheme();

  return (
    <div className={`w-full ${className}`}>
      <span className={theme.select.label}>View</span>
      <div
        className={`${theme.select.input} flex w-full cursor-default items-center text-left opacity-100`}
        aria-label="Cumulative all contractors view"
      >
        <span className="truncate">Cumulative (All Contractors)</span>
      </div>
    </div>
  );
};

export default CmCumulativeViewField;
