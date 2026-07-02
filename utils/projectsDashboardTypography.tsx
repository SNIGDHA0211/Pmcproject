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
  label: 'text-[10px] font-black uppercase tracking-wide sm:text-xs',
  labelBold: 'text-[11px] font-bold uppercase tracking-wide sm:text-xs',
  body: 'text-[10px] font-bold',
  bodyBold: 'text-sm font-bold',
  muted: 'text-sm',
  caption: 'text-[9px] font-semibold',
  micro: 'text-[8px] font-medium',
  microBold: 'text-[8px] font-bold uppercase tracking-wide',
  badge: 'text-[10px] font-bold uppercase tracking-wide',
  metricLabel: 'text-[8px] font-semibold uppercase tracking-wider leading-snug',
  metricValue: 'text-[13px] font-bold mt-1 leading-tight tabular-nums',
  performancePct: 'text-[28px] font-bold leading-none tabular-nums',
  performanceLabel: 'text-[9px] font-semibold uppercase tracking-wide mt-2',
  helper: 'text-[10px] font-bold',
  progressPct: 'text-[9px] font-semibold tabular-nums',
  kpiTitle: 'text-[9px] font-black uppercase tracking-[0.06em]',
  kpiValue: 'text-lg font-bold leading-tight',
  kpiSub: 'text-[10px] font-semibold',
  headerEyebrow: 'text-[9px] font-black uppercase tracking-wide',
  headerTitle: 'text-sm font-bold uppercase leading-tight tracking-tight sm:text-base md:text-lg lg:text-xl',
  headerWeekday: 'text-[9px] font-bold uppercase tracking-wide',
  button: 'text-xs font-black uppercase tracking-wide',
  buttonSm: 'text-[10px] font-black uppercase tracking-wide',
  fullScreenTitle: DASHBOARD_CARD_TITLE_CLASS,
  chartSubtitle: 'text-[10px] font-black uppercase',
  tableHeader: 'text-[8px] font-semibold uppercase tracking-wide',
  tableCell: 'text-[9px]',
  totalsLabel: 'text-[8px] font-medium uppercase tracking-wide',
  totalsValue: 'text-base font-semibold',
  empty: 'text-xs font-semibold uppercase tracking-wide',
  error: 'text-xs font-semibold text-red-500',
  sectionHeader: 'text-sm font-black uppercase tracking-wide',
  sectionSubtitle: 'text-[10px] font-bold uppercase tracking-wide',
  donutLabel: 'text-xs font-black uppercase',
  donutItem: 'text-[10px] font-bold',
  compactValue: 'text-base font-bold tabular-nums leading-tight sm:text-lg',
  embeddedSectionTitle: 'truncate text-[10px] font-black uppercase tracking-widest text-rose-500',
  gaugeValue: 'text-xl font-black leading-none tabular-nums text-slate-900 sm:text-2xl',
  financialGroupTitle: DASHBOARD_FINANCIAL_GROUP_TITLE_CLASS,
  financialGroupSubtitle: DASHBOARD_FINANCIAL_GROUP_SUBTITLE_CLASS,
  financialKpiLabel: DASHBOARD_FINANCIAL_KPI_LABEL_CLASS,
  statusCardTitle: DASHBOARD_STATUS_CARD_TITLE_CLASS,
  metricKpiLabel: DASHBOARD_METRIC_KPI_LABEL_CLASS,
};

/** Uniform larger scale for Team Leader Projects dashboard (Project Dates excluded). */
const COMFORTABLE_TYPO: ProjectsDashboardTypo = {
  sectionTitle: (_isDark: boolean) =>
    'min-w-0 text-sm font-black uppercase leading-snug tracking-wide text-blue-600 line-clamp-2 sm:text-base lg:text-lg',
  cardTitle: DASHBOARD_CARD_TITLE_CLASS,
  groupCardTitle: DASHBOARD_GROUP_CARD_TITLE_CLASS,
  label: 'text-sm font-black uppercase tracking-wide',
  labelBold: 'text-sm font-bold uppercase tracking-wide',
  body: 'text-xs font-bold',
  bodyBold: 'text-sm font-bold',
  muted: 'text-sm',
  caption: 'text-xs font-semibold',
  micro: 'text-[10px] font-medium',
  microBold: 'text-[10px] font-bold uppercase tracking-wide',
  badge: 'text-xs font-bold uppercase tracking-wide',
  metricLabel: 'text-[10px] font-semibold uppercase tracking-wider leading-snug',
  metricValue: 'text-sm font-bold mt-1 leading-tight tabular-nums',
  performancePct: 'text-[2rem] font-bold leading-none tabular-nums sm:text-4xl',
  performanceLabel: 'text-xs font-semibold uppercase tracking-wide mt-2',
  helper: 'text-xs font-bold',
  progressPct: 'text-[10px] font-semibold tabular-nums',
  kpiTitle: 'text-xs font-black uppercase tracking-[0.06em]',
  kpiValue: 'text-xl font-bold leading-tight',
  kpiSub: 'text-xs font-semibold',
  headerEyebrow: 'text-[10px] font-black uppercase tracking-wide',
  headerTitle: 'text-base font-bold uppercase leading-tight tracking-tight sm:text-lg lg:text-xl',
  headerWeekday: 'text-[10px] font-bold uppercase tracking-wide',
  button: 'text-sm font-black uppercase tracking-wide',
  buttonSm: 'text-xs font-black uppercase tracking-wide',
  fullScreenTitle: DASHBOARD_CARD_TITLE_CLASS,
  chartSubtitle: 'text-xs font-black uppercase',
  tableHeader: 'text-[10px] font-semibold uppercase tracking-wide',
  tableCell: 'text-xs',
  totalsLabel: 'text-[10px] font-medium uppercase tracking-wide',
  totalsValue: 'text-lg font-semibold',
  empty: 'text-sm font-semibold uppercase tracking-wide',
  error: 'text-sm font-semibold text-red-500',
  sectionHeader: 'text-base font-black uppercase tracking-wide',
  sectionSubtitle: 'text-xs font-bold uppercase tracking-wide',
  donutLabel: 'text-sm font-black uppercase',
  donutItem: 'text-xs font-bold',
  compactValue: 'text-lg font-bold tabular-nums leading-tight sm:text-xl',
  embeddedSectionTitle: 'truncate text-xs font-bold uppercase tracking-widest text-rose-500',
  gaugeValue: 'text-2xl font-black leading-none tabular-nums text-slate-900 sm:text-3xl',
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
