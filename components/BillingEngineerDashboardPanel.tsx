import React, { useMemo } from 'react';
import { DollarSign, LayoutDashboard, TrendingUp } from 'lucide-react';
import { getBillingTheme } from '../utils/billingDashboardTheme';
import { getThemeClasses, useTheme } from '../utils/theme';
import BillingFinanceDashboardCards, {
  type BillingFinancialSection,
} from './billing/BillingFinanceDashboardCards';

export interface BillingProjectOption {
  id: string;
  title: string;
}

interface BillingEngineerDashboardPanelProps {
  projectName: string | null;
  assignedProjects: BillingProjectOption[];
  onProjectChange: (projectTitle: string) => void;
  onNavigateFinancial?: (section: BillingFinancialSection) => void;
  financialDataVersion?: number;
}

const BillingEngineerDashboardPanel: React.FC<BillingEngineerDashboardPanelProps> = ({
  projectName,
  assignedProjects,
  onProjectChange,
  onNavigateFinancial,
  financialDataVersion = 0,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const billing = getBillingTheme(isDarkTheme, themeClasses);

  const cardBase = isDarkTheme
    ? 'pmc-ov-card rounded-2xl pmc360-glass-panel-dark'
    : 'pmc-ov-card rounded-2xl pmc360-glass-panel-light';

  const projectOptions = useMemo(() => {
    const map = new Map<string, BillingProjectOption>();
    for (const p of assignedProjects) {
      if (p.title) map.set(p.title, p);
    }
    if (projectName && !map.has(projectName)) {
      map.set(projectName, { id: projectName, title: projectName });
    }
    return [...map.values()];
  }, [assignedProjects, projectName]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header
        className={`p-4 sm:p-5 ${cardBase}`}
        style={{ '--ov-accent': '#10b981', '--ov-delay': '0ms' } as React.CSSProperties}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #1e3a5f 130%)' }}
            >
              <DollarSign size={22} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-black uppercase tracking-wider sm:text-lg ${themeClasses.textPrimary}`}>
                  Billing Engineer Dashboard
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  EVM &amp; Commercials
                </span>
              </div>
              <p className={`text-[11px] font-medium ${themeClasses.textMuted}`}>
                Commercial tracking · Cashflow forecasting · Contractor billing analytics
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            <label className={`text-[10px] font-black uppercase tracking-wider ${themeClasses.textMuted}`}>Active Project</label>
            {projectOptions.length > 0 ? (
              <select
                value={projectName ?? ''}
                onChange={(e) => onProjectChange(e.target.value)}
                className={`w-full sm:min-w-[240px] rounded-xl border px-3.5 py-2 text-xs font-bold outline-none shadow-sm transition-all ${themeClasses.input}`}
              >
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.title}>
                    {p.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`rounded-xl border px-3 py-2 text-xs font-bold ${billing.innerCard} ${themeClasses.textSecondary}`}>
                No project assigned
              </span>
            )}
          </div>
        </div>
      </header>

      {projectName ? (
        <BillingFinanceDashboardCards
          projectName={projectName}
          refreshKey={financialDataVersion}
          onNavigateFinancial={onNavigateFinancial}
        />
      ) : (
        <div className={`${cardBase} p-12 text-center`} style={{ '--ov-accent': '#64748b' } as React.CSSProperties}>
          <p className={`text-sm font-semibold ${themeClasses.textSecondary}`}>
            Select a project to view financial cards
          </p>
        </div>
      )}
    </div>
  );
};

export default BillingEngineerDashboardPanel;
