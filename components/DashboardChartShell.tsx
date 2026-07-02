import React from 'react';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { useFullScreenCardActions, FullScreenHeaderToolbar, useFullScreenExpand } from './FullScreenCard';
import { getThemeClasses, useTheme } from '../utils/theme';
import { useProjectsDashboardTypo } from '../utils/projectsDashboardTypography';
import {
  DASHBOARD_CHART_MIN_HEIGHT,
  DASHBOARD_CHART_MIN_HEIGHT_EXPANDED,
  DASHBOARD_CHART_SHELL_PADDING,
  dashboardChartShellBorder,
} from '../utils/dashboardCharts';

type DashboardChartShellProps = {
  title: string;
  headerActions?: React.ReactNode;
  isLoading?: boolean;
  loadingMessage: string;
  hasData: boolean;
  emptyMessage: string;
  children: React.ReactNode;
  chartMinHeight?: number;
};

/**
 * Card chrome for dashboard line/bar charts. Grows to fill width/height in FullScreenCard expand view.
 */
const DashboardChartShell: React.FC<DashboardChartShellProps> = ({
  title,
  headerActions,
  isLoading = false,
  loadingMessage,
  hasData,
  emptyMessage,
  children,
  chartMinHeight = DASHBOARD_CHART_MIN_HEIGHT,
}) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const { isExpanded } = useFullScreenExpand();
  const fsActions = useFullScreenCardActions();

  const resolvedMinHeight = isExpanded ? DASHBOARD_CHART_MIN_HEIGHT_EXPANDED : chartMinHeight;
  const shellClass = isExpanded
    ? `relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border ${DASHBOARD_CHART_SHELL_PADDING} ${dashboardChartShellBorder(isDarkTheme)}`
    : `relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border ${DASHBOARD_CHART_SHELL_PADDING} ${dashboardChartShellBorder(isDarkTheme)}`;

  return (
    <div className={`${shellClass} ${themeClasses.glassCard}`}>
      <DashboardCardTopAccent />
      <div
        className={`mb-2 flex shrink-0 items-center justify-between gap-2 border-b pb-2 pt-0.5 sm:gap-3 ${themeClasses.border}`}
      >
        <h3 className={`min-w-0 flex-1 ${typo.sectionTitle(isDarkTheme)}`}>{title}</h3>
        {(headerActions || fsActions) && (
          <FullScreenHeaderToolbar>{headerActions}</FullScreenHeaderToolbar>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div
            className="flex flex-1 items-center justify-center"
            style={{ minHeight: resolvedMinHeight }}
          >
            <div className={`${typo.muted} ${themeClasses.textMuted}`}>{loadingMessage}</div>
          </div>
        ) : hasData ? (
          <div className="min-h-0 w-full flex-1" style={{ minHeight: resolvedMinHeight }}>
            {children}
          </div>
        ) : (
          <div
            className="flex flex-1 items-center justify-center"
            style={{ minHeight: resolvedMinHeight }}
          >
            <div className={`${typo.muted} ${themeClasses.textMuted}`}>{emptyMessage}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardChartShell;
