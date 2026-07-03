import React, { useMemo } from 'react';
import { LayoutDashboard } from 'lucide-react';
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
    <div className={billing.pageShell}>
      <header className={`${billing.card} !p-4 sm:!p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className={billing.sectionIcon}>
              <LayoutDashboard size={20} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h2 className={`text-base font-black uppercase tracking-widest sm:text-lg ${themeClasses.textPrimary}`}>
                Billing Engineer Dashboard
              </h2>
              <p className={billing.sectionSubtitle}>
                Financial overview · Project billing & performance
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            <label className={billing.label}>Active Project</label>
            {projectOptions.length > 0 ? (
              <select
                value={projectName ?? ''}
                onChange={(e) => onProjectChange(e.target.value)}
                className={`${billing.select} w-full sm:min-w-[220px]`}
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
        <div className={`${billing.card} py-12 text-center`}>
          <p className={`text-sm font-semibold ${themeClasses.textSecondary}`}>
            Select a project to view financial cards
          </p>
        </div>
      )}
    </div>
  );
};

export default BillingEngineerDashboardPanel;
