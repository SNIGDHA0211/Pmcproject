import { createContext, useContext, type ReactNode } from 'react';
import {
  DASHBOARD_CARD_TITLE_CLASS,
  DASHBOARD_GROUP_CARD_TITLE_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
  DASHBOARD_FINANCIAL_GROUP_TITLE_CLASS,
  DASHBOARD_FINANCIAL_GROUP_SUBTITLE_CLASS,
  DASHBOARD_FINANCIAL_KPI_LABEL_CLASS,
  DASHBOARD_STATUS_CARD_TITLE_CLASS,
  DASHBOARD_STATUS_CARD_PADDING,
  DASHBOARD_METRIC_KPI_LABEL_CLASS,
} from './theme';

export type ProjectsDashboardTypo = {
  sectionTitle: (isDark: boolean) => string;
  cardTitle: string;
  groupCardTitle: (isDark: boolean) => string;
  label: string;
  labelBold: string;
  body: string;
  bodyBold: string;
  muted: string;
  caption: string;
  micro: string;
  microBold: string;
  badge: string;
  metricLabel: string;
  metricValue: string;
  performancePct: string;
  performanceLabel: string;
  helper: string;
  progressPct: string;
  kpiTitle: string;
  kpiValue: string;
  kpiSub: string;
  headerEyebrow: string;
  headerTitle: string;
  headerWeekday: string;
  button: string;
  buttonSm: string;
  fullScreenTitle: string;
  chartSubtitle: string;
  tableHeader: string;
  tableCell: string;
  totalsLabel: string;
  totalsValue: string;
  empty: string;
  error: string;
  sectionHeader: string;
  sectionSubtitle: string;
  donutLabel: string;
  donutItem: string;
  compactValue: string;
  embeddedSectionTitle: string;
  gaugeValue: string;
  financialGroupTitle: string;
  financialGroupSubtitle: (isDark: boolean) => string;
  financialKpiLabel: string;
  statusCardTitle: string;
  metricKpiLabel: string;
};

const DEFAULT_TYPO: ProjectsDashboardTypo = {
  sectionTitle: DASHBOARD_SECTION_TITLE_CLASS,
  cardTitle: DASHBOARD_CARD_TITLE_CLASS,
  groupCardTitle: DASHBOARD_GROUP_CARD_TITLE_CLASS,
  label: 'pmc-type-label',
  labelBold: 'pmc-type-label',
  body: 'text-[0.94rem] font-medium',
  bodyBold: 'text-[1.05rem] font-semibold',
  muted: 'text-[0.94rem] font-medium',
  caption: 'pmc-type-caption',
  micro: 'pmc-type-micro font-medium normal-case tracking-normal',
  microBold: 'pmc-type-micro',
  badge: 'pmc-type-micro',
  metricLabel: 'pmc-type-eyebrow leading-snug',
  metricValue: 'pmc-type-kpi mt-1 tabular-nums',
  performancePct: 'pmc-type-kpi tabular-nums',
  performanceLabel: 'pmc-type-eyebrow mt-2',
  helper: 'pmc-type-helper font-semibold',
  progressPct: 'pmc-type-caption tabular-nums',
  kpiTitle: 'pmc-type-eyebrow',
  kpiValue: 'pmc-type-kpi',
  kpiSub: 'pmc-type-caption',
  headerEyebrow: 'pmc-type-eyebrow',
  headerTitle: 'pmc-type-h1',
  headerWeekday: 'pmc-type-caption uppercase',
  button: 'pmc-type-button',
  buttonSm: 'pmc-type-button',
  fullScreenTitle: DASHBOARD_CARD_TITLE_CLASS,
  chartSubtitle: 'pmc-type-caption uppercase',
  tableHeader: 'pmc-type-table-head',
  tableCell: 'pmc-type-table-cell',
  totalsLabel: 'pmc-type-caption uppercase',
  totalsValue: 'pmc-type-kpi text-[1.35rem]',
  empty: 'pmc-type-caption uppercase',
  error: 'pmc-type-caption font-semibold text-red-500',
  sectionHeader: 'pmc-type-card-title',
  sectionSubtitle: 'pmc-type-caption uppercase',
  donutLabel: 'pmc-type-eyebrow',
  donutItem: 'pmc-type-caption font-bold',
  compactValue: 'pmc-type-kpi text-[1.35rem] tabular-nums sm:text-[1.5rem]',
  embeddedSectionTitle: 'pmc-type-eyebrow truncate text-rose-500',
  gaugeValue: 'pmc-type-kpi tabular-nums text-slate-900',
  financialGroupTitle: DASHBOARD_FINANCIAL_GROUP_TITLE_CLASS,
  financialGroupSubtitle: DASHBOARD_FINANCIAL_GROUP_SUBTITLE_CLASS,
  financialKpiLabel: DASHBOARD_FINANCIAL_KPI_LABEL_CLASS,
  statusCardTitle: DASHBOARD_STATUS_CARD_TITLE_CLASS,
  metricKpiLabel: DASHBOARD_METRIC_KPI_LABEL_CLASS,
};

/** Uniform larger scale for Team Leader Projects dashboard (Project Dates excluded). */
const COMFORTABLE_TYPO: ProjectsDashboardTypo = {
  sectionTitle: (_isDark: boolean) =>
    'pmc-type-card-title min-w-0 text-blue-600 line-clamp-2',
  cardTitle: DASHBOARD_CARD_TITLE_CLASS,
  groupCardTitle: DASHBOARD_GROUP_CARD_TITLE_CLASS,
  label: 'pmc-type-label',
  labelBold: 'pmc-type-label',
  body: 'text-[0.94rem] font-medium',
  bodyBold: 'text-[1.05rem] font-semibold',
  muted: 'text-[1.05rem] font-medium',
  caption: 'pmc-type-caption',
  micro: 'pmc-type-micro font-medium normal-case tracking-normal',
  microBold: 'pmc-type-micro',
  badge: 'pmc-type-micro',
  metricLabel: 'pmc-type-eyebrow leading-snug',
  metricValue: 'pmc-type-kpi mt-1 tabular-nums',
  performancePct: 'pmc-type-kpi tabular-nums sm:text-[1.75rem]',
  performanceLabel: 'pmc-type-eyebrow mt-2',
  helper: 'pmc-type-helper font-semibold',
  progressPct: 'pmc-type-caption tabular-nums',
  kpiTitle: 'pmc-type-eyebrow',
  kpiValue: 'pmc-type-kpi sm:text-[1.75rem]',
  kpiSub: 'pmc-type-caption',
  headerEyebrow: 'pmc-type-eyebrow',
  headerTitle: 'pmc-type-h1',
  headerWeekday: 'pmc-type-caption uppercase',
  button: 'pmc-type-button',
  buttonSm: 'pmc-type-button',
  fullScreenTitle: DASHBOARD_CARD_TITLE_CLASS,
  chartSubtitle: 'pmc-type-caption uppercase',
  tableHeader: 'pmc-type-table-head',
  tableCell: 'pmc-type-table-cell',
  totalsLabel: 'pmc-type-caption uppercase',
  totalsValue: 'pmc-type-kpi',
  empty: 'pmc-type-caption uppercase',
  error: 'pmc-type-caption font-semibold text-red-500',
  sectionHeader: 'pmc-type-card-title',
  sectionSubtitle: 'pmc-type-caption uppercase',
  donutLabel: 'pmc-type-eyebrow',
  donutItem: 'pmc-type-caption font-bold',
  compactValue: 'pmc-type-kpi tabular-nums sm:text-[1.75rem]',
  embeddedSectionTitle: 'pmc-type-eyebrow truncate text-rose-500',
  gaugeValue: 'pmc-type-kpi tabular-nums text-slate-900',
  financialGroupTitle: DASHBOARD_FINANCIAL_GROUP_TITLE_CLASS,
  financialGroupSubtitle: DASHBOARD_FINANCIAL_GROUP_SUBTITLE_CLASS,
  financialKpiLabel: DASHBOARD_FINANCIAL_KPI_LABEL_CLASS,
  statusCardTitle: DASHBOARD_STATUS_CARD_TITLE_CLASS,
  metricKpiLabel: DASHBOARD_METRIC_KPI_LABEL_CLASS,
};

const ProjectsDashboardTypographyContext = createContext(false);

export const ProjectsDashboardTypographyProvider = ({ children }: { children: ReactNode }) => (
  <ProjectsDashboardTypographyContext.Provider value={true}>{children}</ProjectsDashboardTypographyContext.Provider>
);

export function useProjectsDashboardTypo(): ProjectsDashboardTypo {
  const comfortable = useContext(ProjectsDashboardTypographyContext);
  return comfortable ? COMFORTABLE_TYPO : DEFAULT_TYPO;
}
