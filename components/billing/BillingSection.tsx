import React from 'react';
import { getBillingTheme } from '../../utils/billingDashboardTheme';
import { getThemeClasses, useTheme } from '../../utils/theme';

interface BillingSectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const BillingSection: React.FC<BillingSectionProps> = ({
  icon,
  title,
  subtitle,
  actions,
  children,
  className = '',
  noPadding = false,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const billing = getBillingTheme(isDarkTheme, themeClasses);

  return (
    <section className={`${billing.card} ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={billing.sectionIcon}>{icon}</span>
          <div className="min-w-0">
            <h3 className={billing.sectionTitle}>{title}</h3>
            {subtitle ? <p className={billing.sectionSubtitle}>{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className={noPadding ? undefined : 'space-y-4'}>{children}</div>
    </section>
  );
};

export default BillingSection;
