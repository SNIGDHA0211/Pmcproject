import React from 'react';
import { getThemeClasses, useTheme } from '../../utils/theme';

export interface MachineryKpiCardsProps {
  totalMachinery: number;
  activeMachinery: number;
  totalQuantity: number;
  categoriesUsed: number;
}

const MachineryKpiCards: React.FC<MachineryKpiCardsProps> = ({
  totalMachinery,
  activeMachinery,
  totalQuantity,
  categoriesUsed,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);

  const cards = [
    { label: 'Total Machinery', value: totalMachinery },
    { label: 'Active Machinery', value: activeMachinery },
    { label: 'Total Quantity', value: totalQuantity },
    { label: 'Categories Used', value: categoriesUsed },
  ];

  return (
    <div className="pm-kpi-summary grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border px-3 py-2 ${
            isDarkTheme ? `${themeClasses.border} ${themeClasses.glassCard}` : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${themeClasses.textMuted}`}>
            {card.label}
          </p>
          <p className={`mt-0.5 text-xl font-bold tabular-nums ${themeClasses.textPrimary}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default MachineryKpiCards;
