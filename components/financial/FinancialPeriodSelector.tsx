import React from 'react';
import HealthSafetyMonthSelector from '../HealthSafetyMonthSelector';

interface FinancialPeriodSelectorProps {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

/** Month/year picker for Financial Management period-based sections */
const FinancialPeriodSelector: React.FC<FinancialPeriodSelectorProps> = (props) => (
  <HealthSafetyMonthSelector prominent {...props} />
);

export default React.memo(FinancialPeriodSelector);
