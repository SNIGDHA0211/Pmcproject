import React from 'react';

/** Blue–indigo gradient strip matching Project Dates card */
export const DASHBOARD_CARD_TOP_ACCENT_CLASS =
  'pointer-events-none absolute inset-x-0 top-0 z-10 h-1 rounded-t-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500';

const DashboardCardTopAccent: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={[DASHBOARD_CARD_TOP_ACCENT_CLASS, className].filter(Boolean).join(' ')} aria-hidden />
);

export default DashboardCardTopAccent;
