import React, { useMemo } from 'react';

import { getDprKpiValueColors, getDprTy } from '../../utils/dprReviewTypography';

import { getThemeClasses, useTheme } from '../../utils/theme';



interface DprReviewKpiCardsProps {
  total: number;
  completed: number;
  inProgress: number;
  delayed: number;
  /** Defaults to "Delayed" — use "Pending" for WPR */
  fourthLabel?: string;
}



const DprReviewKpiCards: React.FC<DprReviewKpiCardsProps> = ({

  total,

  completed,

  inProgress,

  delayed,

  fourthLabel = 'Delayed',

}) => {

  const { isDarkTheme } = useTheme();

  const themeClasses = getThemeClasses(isDarkTheme);

  const dprTy = useMemo(() => getDprTy(isDarkTheme), [isDarkTheme]);

  const valueColors = useMemo(() => getDprKpiValueColors(isDarkTheme), [isDarkTheme]);



  const cards = [

    { label: 'Activities', value: total, valueColor: valueColors.activities },

    { label: 'Completed', value: completed, valueColor: valueColors.completed },

    { label: 'In Progress', value: inProgress, valueColor: valueColors.inProgress },

    { label: fourthLabel, value: delayed, valueColor: valueColors.delayed },

  ];



  return (

    <div className="dpr-kpi-summary grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">

      {cards.map((card) => (

        <div

          key={card.label}

          className={`rounded-xl border px-3 py-2.5 ${themeClasses.border} ${

            isDarkTheme ? themeClasses.glassCard : 'bg-white shadow-sm'

          }`}

        >

          <p className={dprTy.kpiLabel}>{card.label}</p>

          <p className={`mt-1 ${dprTy.kpiValue(card.valueColor)}`}>{card.value}</p>

        </div>

      ))}

    </div>

  );

};



export default DprReviewKpiCards;

