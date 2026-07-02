import React from 'react';
import type { CmModuleAccent } from '../enterpriseTheme';
import { useCmTheme } from '../enterpriseTheme';

export interface CmSectionPanelProps {
  title: string;
  subtitle?: string;
  accent?: CmModuleAccent;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const CmSectionPanel: React.FC<CmSectionPanelProps> = ({
  title,
  subtitle,
  accent,
  actions,
  children,
  className = '',
}) => {
  const theme = useCmTheme();

  return (
    <section className={`${theme.panel} ${className}`}>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5 ${
          accent
            ? `border-l-4 ${theme.moduleAccents[accent]} ${theme.isDark ? 'border-b-white/10' : 'border-b-slate-100'}`
            : theme.isDark
              ? `border-b-white/10 ${theme.tc.bgSecondary}`
              : 'border-b-slate-100 bg-slate-50/70'
        }`}
      >
        <div className="min-w-0">
          <h2 className={`text-base font-bold ${theme.tc.textPrimary}`}>{title}</h2>
          {subtitle && <p className={`mt-0.5 text-xs ${theme.tc.textMuted}`}>{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
};

export default CmSectionPanel;
