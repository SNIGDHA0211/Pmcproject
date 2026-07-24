import React from 'react';

/** Default blue–indigo strip matching Project Dates card */
export const DASHBOARD_CARD_TOP_ACCENT_CLASS =
  'dashboard-card-top-accent pointer-events-none absolute inset-x-0 top-0 z-10 h-1 rounded-t-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500';

/** Muted navy strip for executive / PMC Head panels */
export const DASHBOARD_CARD_TOP_ACCENT_EXECUTIVE_CLASS =
  'dashboard-card-top-accent pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 rounded-t-2xl bg-[#1e3a5f]/70';

type AccentVariant = 'default' | 'executive';

const DashboardCardTopAccent: React.FC<{ className?: string; variant?: AccentVariant }> = ({
  className = '',
  variant = 'default',
}) => (
  <div
    className={[
      variant === 'executive' ? DASHBOARD_CARD_TOP_ACCENT_EXECUTIVE_CLASS : DASHBOARD_CARD_TOP_ACCENT_CLASS,
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    aria-hidden
  />
);

export default DashboardCardTopAccent;
