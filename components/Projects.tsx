import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ContractPerformanceRecord, ContractValueRecord, ContractValueType, InvoicingRecord, InvoiceType, Project, ProjectEquipmentRecord, ProjectQualityStatusRecord, UserRole, ProjectStatus } from '../types';
import type {
  CorrespondenceDocument,
  CorrespondenceMonthlyPeriod,
  CorrespondenceProjectSummary,
  CorrespondenceRecipientType,
} from '../types';
import DashboardCardTopAccent from './DashboardCardTopAccent';
import { Icons } from './Icons';
import { FullScreenCard, FullScreenHeaderToolbar, useFullScreenExpand } from './FullScreenCard';
import DashboardChartShell from './DashboardChartShell';
import { SitePhotosCard } from './SitePhotosCard';
import { formatINR } from '../utils/format';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import axios from 'axios';
import { fetchProjectProgressChart } from '../services/financialDataService';
import { buildExecutiveProgressCurveData } from '../utils/projectProgress';
import { computeProjectDashboardMetrics } from '../utils/projectDashboardMetrics';
import { projectApi, costPerformanceApi, budgetPerformanceApi, manpowerApi, cashflowApi, healthSafetyApi, invoicingApi, contractValuesApi, contractPerformanceApi, projectLogsApi, drawingRegisterApi, projectQualityApi, projectEquipmentApi, correspondenceApi, correspondenceDocumentsApi, getApiErrorMessage, normalizeContractPerformanceRecord, normalizeContractValueRecord, normalizeInvoicingRecord, normalizeProjectEquipmentRecord, normalizeProjectQualityStatusRecord, normalizeManpowerRecord, unwrapList, toNum, plannedEarnedValueApi, normalizePlannedEarnedByPeriod, type PlannedEarnedByPeriodResponse, normalizeHSERecord, type HSERecord, normalizeHealthSafetyDashboard, normalizeHealthSafetyYtdSummary, saveHealthSafetyRecord, fetchHealthSafetyYearRecords, fetchHealthSafetyDashboardFallback, type HealthSafetyDashboardData, projectDatesApi, normalizeProjectDatesByProject, mergeBgBundleIntoProjectDatesBundle, type ProjectDatesByProject, type ProjectDateType, type ProjectDatesRecord, mergeQualityRecordsByPeriod, fetchQualityYearRecords, saveProjectQualityRecord, saveDrawingRecord, normalizeCorrespondenceMonthlyPeriod, collectCorrespondenceDocuments, mergeCorrespondenceDocumentLists, mergeCorrespondencePeriods, fetchCorrespondenceYearPeriods, saveCorrespondenceDocument, deleteCorrespondenceDocument, type CorrespondenceDashboardResponse } from '../services/api';
import type { BgStatusBundle } from '../types/bgStatus';
import type { QualityFormValues } from './QualityMonthlyForm';
import type { DrawingFormValues } from './DrawingMonthlyForm';
import type { DrawingMonthlyRecord, DrawingProjectSummary } from '../types';
import DrawingRegisterCard from './DrawingRegisterCard';
import { useTheme, getThemeClasses } from '../utils/theme';
import {
  ProjectsDashboardTypographyProvider,
  useProjectsDashboardTypo,
} from '../utils/projectsDashboardTypography';
import { type BgManageScope } from './ProjectDatesCard';
import ProjectDatesBgStatusModal, { type BgModalScope } from './ProjectDatesBgStatusModal';
import {
  contractorLabel,
  getContractorsList,
  maxContractorDelay,
  resolveSelectedContractor,
  applyContractorNameToBundle,
  preserveContractorNames,
} from '../utils/projectDatesMulti';
import ContractorManagementDashboard from './contractor/ContractorManagementDashboard';
import { contractorMasterApi } from '../services/contractorManagementApi';
import type { ContractorMasterRecord, ProjectDatesApiRecord } from '../types/contractorManagement';
import { pickRecordForContractor } from '../utils/contractorFinancialRecords';
import {
  contractorDisplayName,
  plannedValueSectionTitle,
} from '../utils/dashboardContractorLabels';
import FrequencyChartDashboard from './FrequencyChartDashboard';
import BottleneckSection from './BottleneckSection';
import DashboardToastStack from './DashboardToastStack';
import {
  parseBottleneckFromProjectLogEntries,
  serializeBottleneckToProjectLogEntries,
  type BottleneckItem,
} from '../utils/bottleneck';
import ProjectEquipmentCard, { type EquipmentFormValues } from './ProjectEquipmentCard';
import CorrespondenceCard from './CorrespondenceCard';
import type { CorrespondenceDocumentFormValues } from './CorrespondenceDocumentForm';
import HealthSafetyCard from './HealthSafetyCard';
import {
  healthSafetyPayloadFromForm,
  type HealthSafetyFormValues,
} from './HealthSafetyMonthlyForm';
import {
  canEditHealthSafetyForProject,
  canViewHealthSafetyForProject,
} from '../utils/healthSafetyAccess';
import type { SubTab } from './FinancialManagement';
import MachinerySubmissionsTL from './MachinerySubmissionsTL';
import ProjectsDashboardTour from './tours/ProjectsDashboardTour';
import { ModalPortal } from './ModalPortal';
import { CardHeaderActions, CardEditButton, FormulaInfoButton } from './FormulaInfoButton';
import { DASHBOARD_FORMULAS } from '../utils/dashboardFormulas';
import PerformanceHighlightCard, {
  getCostPerformanceStatus,
  getCollectionPerformanceStatus,
  KPI_METRIC_COLORS,
} from './PerformanceHighlightCard';
import { PlannedEarnedValueGroupCard } from './PlannedEarnedValueCard';
import { plannedVsActualApi } from '../services/plannedVsActualApi';
import { pvaBundleToPlannedEarnedPeriod } from '../utils/pvaDashboardAdapter';
import PMCHeadExecutiveShell, {
  type PMCExecutiveTab,
} from './pmcHead/PMCHeadExecutiveShell';
import {
  buildPmcHeadDropdownProjects,
  getKnownExecutiveProjectStubs,
  getHseExecutiveProjectStubs,
} from '../utils/pmcHeadExecutiveProjects';
import { isPmcHeadEquivalent } from '../utils/pmcRoleAccess';
import {
  resolveExecutiveCorrespondenceStats,
  scrollToOverviewSection,
  teamLeaderSectionElementId,
  type ExecutiveOverviewAnchor,
} from '../utils/executiveOverviewNavigation';
import { aggregateCorrespondenceCumulativePeriod } from '../utils/correspondence';
import { PMCExecutiveDetailFrame } from './pmcHead/PMCExecutiveDetailFrame';
import PMCHeadScheduleSection, { PMCExecutivePanel } from './pmcHead/PMCHeadScheduleSection';
import PMCHeadMoneySection from './pmcHead/PMCHeadMoneySection';
import PMCHeadMoneyKpiSection from './pmcHead/PMCHeadMoneyKpiSection';
import { mapBgEntriesApi } from '../utils/contractorDashboardMappers';
import PMCHeadPeopleSection from './pmcHead/PMCHeadPeopleSection';
import PMCHeadRiskSection from './pmcHead/PMCHeadRiskSection';
import { getPmcExecutiveTheme } from '../utils/pmcExecutiveTheme';
import { ExecutiveChartWithLegend } from './charts/ChartLegendFooter';
import TeamLeaderOverviewShell, {
  type TeamLeaderOverviewSection,
  type TeamLeaderOverviewMetrics,
} from './teamLeader/TeamLeaderOverviewShell';
import type { ExecutiveDecisionItem, ExecutivePvaVelocityData } from './pmcHead/PMCExecutiveOverviewPanel';
import {
  buildTeamLeaderOverviewCachePayload,
  readTeamLeaderOverviewCache,
  writeTeamLeaderOverviewCache,
  type TeamLeaderOverviewCachePayload,
} from '../utils/teamLeaderOverviewCache';
import {
  buildProjectDatesSectionCacheFromBundle,
  projectDatesBundleFromCache,
  readProjectDatesSectionCache,
  writeProjectDatesSectionCache,
  type ProjectDatesSectionCachePayload,
} from '../utils/projectDatesSectionCache';
import ProjectDashboardSummary from './ProjectDashboardSummary';
import { formatIndianCurrencyCompact } from '../utils/format';
import { buildExecutiveContractSnapshot } from '../utils/executiveContractSnapshot';
import { buildExecutiveQualitySnapshot } from '../utils/executiveQualitySnapshot';
import { validateCorrespondenceDocumentInput } from '../utils/correspondence';
import {
  downloadProjectReportXlsx,
  type ProjectReportExportInput,
} from '../utils/projectReportExport';
import { formatReportTodayDate } from '../utils/csvReport';
import { mergeHealthSafetyRecords, resolveHealthSafetyYtdSummary, toIncidentMetrics } from '../utils/healthSafety';
import {
  chartActiveDot,
  chartAxisStroke,
  chartAxisTick,
  chartGridStroke,
  chartLegendProps,
  chartBarLegendProps,
  chartBarPlotMarginExecutive,
  chartLineBarMargin,
  chartPlotMarginExecutive,
  chartTooltipStyle,
  chartXAxisMonthProps,
  chartXAxisMonthPropsExecutive,
  DASHBOARD_CHART_MIN_HEIGHT,
  DASHBOARD_CHART_MIN_HEIGHT_BAR,
  DASHBOARD_CHART_MIN_HEIGHT_EXPANDED,
  DASHBOARD_CHART_SHELL_PADDING,
  dashboardChartShellBorder,
  formatChartCountAxisTick,
  formatChartCurrencyAxisTick,
} from '../utils/dashboardCharts';

interface ProjectsProps {
  projects: Project[];
  currentUser: { id: string; role: UserRole };
  onViewProject: (id: string) => void;
  onNavigate?: (
    tab: string | { tab: string; section?: SubTab; returnTab?: string; projectId?: string },
  ) => void;
  selectedProjectId?: string | null;
  financialDataVersion?: number;
  onTourStateChange?: (isActive: boolean) => void;
  teamLeaderView?: 'overview' | 'full';
  onTeamLeaderViewChange?: (view: 'overview' | 'full') => void;
  teamLeaderScrollSection?: TeamLeaderOverviewSection | null;
  onTeamLeaderScrollSectionConsumed?: () => void;
}

const CONTRACT_VALUE_TYPES: ContractValueType[] = ['SCL', 'Contractor'];
const INVOICE_TYPES: InvoiceType[] = ['PMC', 'Contractor'];
// Donut Chart Component
const DonutChart: React.FC<{
  data: { name: string; value: number; color: string }[];
  label: string;
  size?: number;
  showLabels?: boolean;
}> = ({ data, label, size = 150, showLabels = true }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.4}
            outerRadius={size * 0.5}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      {showLabels && (
        <>
          <div className="text-center mt-2">
            <p className={`${typo.donutLabel} ${themeClasses.textPrimary}`}>{label}</p>
            {data.map((item, idx) => (
              <p key={idx} className={`${typo.donutItem} ${themeClasses.textSecondary}`}>
                {item.name}: {item.value.toFixed(2)}%
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function useExpandedChartMetrics() {
  const { isExpanded } = useFullScreenExpand();
  return {
    minHeight: isExpanded ? DASHBOARD_CHART_MIN_HEIGHT_EXPANDED : DASHBOARD_CHART_MIN_HEIGHT,
    tickFontSize: isExpanded ? 13 : 12,
    legendFontSize: isExpanded ? 12 : 11,
    isExpanded,
  };
}

const FinancialProgressChartPlot: React.FC<{
  isDarkTheme: boolean;
  data: { month: string; bcws: number; bcwp: number; acwp: number; fcst: number }[];
  hideLegend?: boolean;
}> = ({ isDarkTheme, data, hideLegend = false }) => {
  const chart = useExpandedChartMetrics();
  const axisTick = chartAxisTick(isDarkTheme, chart.tickFontSize);
  const margin = hideLegend ? chartPlotMarginExecutive : chartLineBarMargin(chart.isExpanded);
  const xAxisProps = hideLegend ? chartXAxisMonthPropsExecutive : chartXAxisMonthProps;

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={chart.minHeight}>
      <LineChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="4 6" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
        <XAxis
          dataKey="month"
          tick={axisTick}
          axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
          tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
          {...xAxisProps}
        />
        <YAxis
          width={58}
          tick={axisTick}
          tickFormatter={formatChartCurrencyAxisTick}
          axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
          tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
        />
        <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
        {!hideLegend && <Legend {...chartLegendProps(chart.legendFontSize, isDarkTheme)} />}
        <Line type="monotone" dataKey="bcws" stroke="#4f46e5" strokeWidth={2} name="BCWS" dot={false} activeDot={chartActiveDot} />
        <Line type="monotone" dataKey="bcwp" stroke="#f59e0b" strokeWidth={2} name="BCWP" dot={false} activeDot={chartActiveDot} />
        <Line type="monotone" dataKey="acwp" stroke="#ef4444" strokeWidth={2} name="ACWP" dot={false} activeDot={chartActiveDot} />
        <Line
          type="monotone"
          dataKey="fcst"
          stroke="#10b981"
          strokeWidth={2}
          strokeDasharray="6 4"
          name="FCST"
          dot={false}
          activeDot={chartActiveDot}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const FinancialProgressChartCard: React.FC<{
  isDarkTheme: boolean;
  isLoading: boolean;
  data: { month: string; bcws: number; bcwp: number; acwp: number; fcst: number }[];
  onEdit?: () => void;
}> = ({ isDarkTheme, isLoading, data, onEdit }) => (
  <FullScreenCard
    title="Financial Progress"
    expandSize="fullWidth"
    className="cost-performance-card joyride-target-stable min-h-0"
    onEdit={onEdit}
    editTitle="Edit in Financial Management"
  >
    <DashboardChartShell
      title="FINANCIAL PROGRESS"
      headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.projectCostPerformance} />}
      isLoading={isLoading}
      loadingMessage="Loading financial progress data..."
      hasData={data.length > 0}
      emptyMessage="No financial progress data available for this project"
    >
      <FinancialProgressChartPlot isDarkTheme={isDarkTheme} data={data} />
    </DashboardChartShell>
  </FullScreenCard>
);

const ManpowerHistogramChartPlot: React.FC<{
  isDarkTheme: boolean;
  data: { month: string; planned: number; actual: number }[];
  hideLegend?: boolean;
}> = ({ isDarkTheme, data, hideLegend = false }) => {
  const chart = useExpandedChartMetrics();
  const axisTick = chartAxisTick(isDarkTheme, chart.tickFontSize);
  const plotHeight = chart.isExpanded ? chart.minHeight : DASHBOARD_CHART_MIN_HEIGHT_BAR;
  const xAxisProps = hideLegend ? chartXAxisMonthPropsExecutive : chartXAxisMonthProps;

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={plotHeight}>
      <BarChart
        data={data}
        margin={chartBarPlotMarginExecutive}
        barCategoryGap="22%"
        barGap={6}
      >
        <defs>
          <linearGradient id="plannedBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="actualBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eab308" stopOpacity={1} />
            <stop offset="100%" stopColor="#eab308" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
        <XAxis
          dataKey="month"
          tick={axisTick}
          axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
          tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
          {...xAxisProps}
        />
        <YAxis
          width={44}
          tick={axisTick}
          tickFormatter={formatChartCountAxisTick}
          axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
          tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
        />
        <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
        {!hideLegend && <Legend {...chartBarLegendProps(chart.legendFontSize, isDarkTheme)} />}
        <Bar
          dataKey="planned"
          fill="url(#plannedBarGradient)"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          name="Planned"
        />
        <Bar
          dataKey="actual"
          fill="url(#actualBarGradient)"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
          name="Actual"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const ManpowerHistogramChartCard: React.FC<{
  isDarkTheme: boolean;
  data: { month: string; planned: number; actual: number }[];
  onEdit?: () => void;
}> = ({ isDarkTheme, data, onEdit }) => (
  <FullScreenCard
    title="Project Manpower Histogram"
    expandSize="fullWidth"
    className="manpower-histogram-card joyride-target-stable min-h-0"
    onEdit={onEdit}
    editTitle="Edit in Manpower Management"
  >
    <DashboardChartShell
      title="PROJECT MANPOWER HISTOGRAM"
      chartMinHeight={DASHBOARD_CHART_MIN_HEIGHT_BAR}
      hasData={data.length > 0}
      emptyMessage="No manpower data available for this project"
      loadingMessage="Loading manpower data..."
    >
      <ExecutiveChartWithLegend
        height={DASHBOARD_CHART_MIN_HEIGHT_BAR}
        legend={[
          { label: 'Planned', color: '#f59e0b' },
          { label: 'Actual', color: '#eab308' },
        ]}
      >
        <ManpowerHistogramChartPlot isDarkTheme={isDarkTheme} data={data} hideLegend />
      </ExecutiveChartWithLegend>
    </DashboardChartShell>
  </FullScreenCard>
);

const DashboardSectionHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <h2 className={`${typo.sectionHeader} ${themeClasses.textPrimary}`}>{title}</h2>
      <p className={`${typo.sectionSubtitle} ${themeClasses.textMuted}`}>{subtitle}</p>
    </div>
  );
};

const Projects: React.FC<ProjectsProps> = ({
  projects,
  currentUser,
  onViewProject,
  onNavigate,
  selectedProjectId: globalSelectedProjectId,
  financialDataVersion,
  onTourStateChange,
  teamLeaderView = 'overview',
  onTeamLeaderViewChange,
  teamLeaderScrollSection = null,
  onTeamLeaderScrollSectionConsumed,
}) => {
  // Dedicated stable refs for critical final walkthrough steps (Project Logs, Machinery, Equipment)
  const projectLogsRef = useRef<HTMLDivElement>(null);
  const machineryLogRef = useRef<HTMLDivElement>(null);
  const projectEquipmentRef = useRef<HTMLDivElement>(null);
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const typo = useProjectsDashboardTypo();
  const isPmcTeamLead = currentUser.role === UserRole.TEAM_LEAD;
  const isPMCHead = isPmcHeadEquivalent(currentUser);
  const allProjects = useMemo(() => {
    if (!isPMCHead) return projects;
    return buildPmcHeadDropdownProjects(
      projects,
      getKnownExecutiveProjectStubs(projects),
      getHseExecutiveProjectStubs(projects),
    );
  }, [isPMCHead, projects]);
  const [execTab, setExecTab] = useState<PMCExecutiveTab>('overview');
  const [tlOverviewCache, setTlOverviewCache] = useState<TeamLeaderOverviewCachePayload | null>(null);
  const tlOverviewCacheSavedRef = useRef<string | null>(null);

  const getBackendRole = (role: UserRole): string | undefined => {
    if (role === UserRole.PMC_HEAD) return 'PMC Head';
    // Head Office uses same API role filter as PMC Head for identical data
    if (role === UserRole.PMC_HEAD_OFFICE) return 'PMC Head';
    if (role === UserRole.CEO) return 'CEO';
    if (role === UserRole.TEAM_LEAD) return 'Team Leader';
    if (role === UserRole.BILLING_SITE_ENGINEER) return 'Billing Site Engineer';
    // Backend group may still be Coordinator; UI label is PMC Manager
    if (role === UserRole.COORDINATOR) return 'Coordinator';
    return undefined;
  };

  const pickBestRow = <T,>(rows: T[], score: (row: any) => number): T | null => {
    if (!rows || rows.length === 0) return null;
    let best = rows[0];
    let bestScore = score(best);
    for (let i = 1; i < rows.length; i++) {
      const s = score(rows[i]);
      if (s > bestScore) {
        best = rows[i];
        bestScore = s;
      }
    }
    return best;
  };

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    globalSelectedProjectId || (allProjects.length > 0 ? allProjects[0].id : '')
  );

  // Sync with global state from header
  useEffect(() => {
    if (globalSelectedProjectId) {
      setSelectedProjectId(globalSelectedProjectId);
    }
  }, [globalSelectedProjectId]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [projectDatesBundle, setProjectDatesBundle] = useState<ProjectDatesByProject | null>(null);
  const [projectDatesSectionCache, setProjectDatesSectionCache] =
    useState<ProjectDatesSectionCachePayload | null>(null);
  const [isLoadingProjectDates, setIsLoadingProjectDates] = useState(false);
  const [projectDatesError, setProjectDatesError] = useState<string | null>(null);
  const [isProjectDatesModalOpen, setIsProjectDatesModalOpen] = useState(false);
  const [projectDatesModalMode, setProjectDatesModalMode] = useState<
    'edit_scl' | 'edit_contractor' | 'add_contractor'
  >('edit_scl');
  const [editingContractorRecord, setEditingContractorRecord] = useState<ProjectDatesRecord | null>(
    null,
  );
  const [editingSclId, setEditingSclId] = useState<number | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [projectDatesForm, setProjectDatesForm] = useState({
    contractor_id: null as number | null,
    project_start: '',
    contract_finish: '',
    forecast_finish: '',
    eot_date: '',
  });
  const [contractorMasters, setContractorMasters] = useState<ContractorMasterRecord[]>([]);
  const [contractorDashboardRevision, setContractorDashboardRevision] = useState(0);
  const [isSavingProjectDates, setIsSavingProjectDates] = useState(false);
  const [projectDatesFormError, setProjectDatesFormError] = useState<string | null>(null);
  const [newContractorMasterName, setNewContractorMasterName] = useState('');
  const [isCreatingContractorMaster, setIsCreatingContractorMaster] = useState(false);
  // BG Status modal state
  const [isBgStatusModalOpen, setIsBgStatusModalOpen] = useState(false);
  const [bgModalScope, setBgModalScope] = useState<BgModalScope>({ mode: 'all' });
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  // Analytics Walkthrough Tour state
  const [showProjectsAnalyticsTour, setShowProjectsAnalyticsTour] = useState(false);

  const startAnalyticsTour = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onTourStateChange?.(true);
    setShowProjectsAnalyticsTour(true);
  }, [onTourStateChange]);

  const handleCloseAnalyticsTour = useCallback(() => {
    console.log("[Projects] Closing Analytics Walkthrough");
    onTourStateChange?.(false);
    setShowProjectsAnalyticsTour(false);
  }, [onTourStateChange]);
  const [costPerformanceData, setCostPerformanceData] = useState<any[]>([]);
  const [isLoadingCostPerformance, setIsLoadingCostPerformance] = useState(false);
  const [equipmentDataState, setEquipmentDataState] = useState<ProjectEquipmentRecord[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [equipmentFormError, setEquipmentFormError] = useState<string | null>(null);
  const [isSavingEquipment, setIsSavingEquipment] = useState(false);
  const [correspondencePeriod, setCorrespondencePeriod] = useState<CorrespondenceMonthlyPeriod | null>(null);
  const [correspondenceProjectSummary, setCorrespondenceProjectSummary] = useState<CorrespondenceProjectSummary | null>(null);
  const [correspondenceDashboard, setCorrespondenceDashboard] = useState<CorrespondenceDashboardResponse | null>(null);
  const [correspondenceYearPeriods, setCorrespondenceYearPeriods] = useState<CorrespondenceMonthlyPeriod[]>([]);
  const [correspondenceDocuments, setCorrespondenceDocuments] = useState<CorrespondenceDocument[]>([]);
  const [correspondenceSelectedMonth, setCorrespondenceSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [correspondenceSelectedYear, setCorrespondenceSelectedYear] = useState(() => new Date().getFullYear());
  const [isLoadingCorrespondence, setIsLoadingCorrespondence] = useState(false);
  const [correspondenceError, setCorrespondenceError] = useState<string | null>(null);
  const [correspondenceFormError, setCorrespondenceFormError] = useState<string | null>(null);
  const [isSavingCorrespondence, setIsSavingCorrespondence] = useState(false);
  const [budgetPerformanceData, setBudgetPerformanceData] = useState<any>(null);
  const [isLoadingBudgetPerformance, setIsLoadingBudgetPerformance] = useState(false);
  const [manpowerDataState, setManpowerDataState] = useState<any[]>([]);
  const [isLoadingManpower, setIsLoadingManpower] = useState(false);
  const [cashflowDataState, setCashflowDataState] = useState<any[]>([]);
  const [isLoadingCashflow, setIsLoadingCashflow] = useState(false);
  const [drawingMonthlyRecord, setDrawingMonthlyRecord] = useState<DrawingMonthlyRecord | null>(null);
  const [drawingProjectSummary, setDrawingProjectSummary] = useState<DrawingProjectSummary | null>(null);
  const [drawingYearRecords, setDrawingYearRecords] = useState<DrawingMonthlyRecord[]>([]);
  const [drawingSelectedMonth, setDrawingSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [drawingSelectedYear, setDrawingSelectedYear] = useState(() => new Date().getFullYear());
  const [isLoadingDrawings, setIsLoadingDrawings] = useState(false);
  const [drawingsError, setDrawingsError] = useState<string | null>(null);
  const [isSavingDrawings, setIsSavingDrawings] = useState(false);
  const [drawingsFormError, setDrawingsFormError] = useState<string | null>(null);
  const [healthSafetyDashboard, setHealthSafetyDashboard] = useState<HealthSafetyDashboardData | null>(null);
  const [healthSafetySelectedMonth, setHealthSafetySelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [healthSafetySelectedYear, setHealthSafetySelectedYear] = useState(() => new Date().getFullYear());
  const healthSafetyPeriodRef = useRef({
    month: healthSafetySelectedMonth,
    year: healthSafetySelectedYear,
  });
  healthSafetyPeriodRef.current = {
    month: healthSafetySelectedMonth,
    year: healthSafetySelectedYear,
  };
  const [isLoadingHealthSafety, setIsLoadingHealthSafety] = useState(false);
  const [healthSafetyError, setHealthSafetyError] = useState<string | null>(null);
  const [isSavingHealthSafety, setIsSavingHealthSafety] = useState(false);
  const [healthSafetyFormError, setHealthSafetyFormError] = useState<string | null>(null);
  const [projectProgressData, setProjectProgressData] = useState<any[]>([]);
  const [isLoadingProjectProgress, setIsLoadingProjectProgress] = useState(false);
  const [invoicingData, setInvoicingData] = useState<Record<InvoiceType, InvoicingRecord | null>>({
    PMC: null,
    Contractor: null,
  });
  const [isLoadingInvoicing, setIsLoadingInvoicing] = useState(false);
  const [invoicingErrors, setInvoicingErrors] = useState<Record<InvoiceType, string | null>>({
    PMC: null,
    Contractor: null,
  });
  const [contractValuesData, setContractValuesData] = useState<Record<ContractValueType, ContractValueRecord | null>>({
    SCL: null,
    Contractor: null,
  });
  const [isLoadingContractValues, setIsLoadingContractValues] = useState(false);
  const [contractValuesErrors, setContractValuesErrors] = useState<Record<ContractValueType, string | null>>({
    SCL: null,
    Contractor: null,
  });
  const [contractorContractValuesList, setContractorContractValuesList] = useState<ContractValueRecord[]>([]);
  const [contractorInvoicingList, setContractorInvoicingList] = useState<InvoicingRecord[]>([]);
  const [contractPerformanceData, setContractPerformanceData] = useState<ContractPerformanceRecord | null>(null);
  const [isLoadingContractPerformance, setIsLoadingContractPerformance] = useState(false);
  const [contractPerformanceError, setContractPerformanceError] = useState<string | null>(null);
  const [plannedEarnedByPeriod, setPlannedEarnedByPeriod] = useState<PlannedEarnedByPeriodResponse | null>(null);
  const [isLoadingPlannedEarned, setIsLoadingPlannedEarned] = useState(false);
  const [plannedEarnedError, setPlannedEarnedError] = useState<string | null>(null);
  const [pvaVelocityTrend, setPvaVelocityTrend] = useState<ExecutivePvaVelocityData | null>(null);
  const [qualityMonthlyRecord, setQualityMonthlyRecord] = useState<ProjectQualityStatusRecord | null>(null);
  const [qualityYearRecords, setQualityYearRecords] = useState<ProjectQualityStatusRecord[]>([]);
  const [qualitySelectedMonth, setQualitySelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [qualitySelectedYear, setQualitySelectedYear] = useState(() => new Date().getFullYear());
  const [isLoadingQualityStatus, setIsLoadingQualityStatus] = useState(false);
  const [qualityStatusError, setQualityStatusError] = useState<string | null>(null);
  const [isSavingQualityStatus, setIsSavingQualityStatus] = useState(false);
  const [qualityStatusFormError, setQualityStatusFormError] = useState<string | null>(null);
  const [isSavingProjectLogs, setIsSavingProjectLogs] = useState(false);

  const [bottleneckItems, setBottleneckItems] = useState<BottleneckItem[]>([]);

  const saveProjectLogs = async (): Promise<boolean> => {
    if (!selectedProjectId) {
      showToast('Select a project before saving bottleneck records.', 'error');
      return false;
    }

    const entries = serializeBottleneckToProjectLogEntries(bottleneckItems);
    const recordCount = bottleneckItems.filter((item) => item.description.trim()).length;

    setIsSavingProjectLogs(true);
    try {
      await projectLogsApi.updateProjectLogs(selectedProjectId, { entries });
      const successMessage =
        recordCount === 0
          ? 'Bottleneck saved successfully. No active records in this save.'
          : `Bottleneck saved successfully. ${recordCount} record${recordCount === 1 ? '' : 's'} saved.`;
      showToast(successMessage);
      return true;
    } catch (error) {
      console.error('Failed to save bottleneck:', error);
      showToast(getApiErrorMessage(error, 'Failed to save bottleneck records. Please try again.'), 'error');
      return false;
    } finally {
      setIsSavingProjectLogs(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const selectedProject = allProjects.find(p => p.id === selectedProjectId) || allProjects[0] || null;

  const hseCanView = useMemo(
    () => canViewHealthSafetyForProject(currentUser, selectedProject),
    [currentUser, selectedProject],
  );

  const hseCanEdit = useMemo(
    () => canEditHealthSafetyForProject(currentUser, selectedProject),
    [currentUser, selectedProject],
  );

  const fetchHealthSafetyDashboard = useCallback(async () => {
    if (!selectedProject?.title || !hseCanView) {
      setHealthSafetyDashboard(null);
      setHealthSafetyError(null);
      return;
    }

    setIsLoadingHealthSafety(true);
    setHealthSafetyError(null);
    try {
      const { month, year } = healthSafetyPeriodRef.current;
      let dashboard: HealthSafetyDashboardData;

      try {
        const response = await healthSafetyApi.getDashboard(selectedProject.title);
        const body = response.data as Record<string, unknown> | undefined;
        if (body?.success === false) {
          throw new Error(typeof body.message === 'string' ? body.message : 'Dashboard unavailable');
        }
        dashboard = normalizeHealthSafetyDashboard(response.data, selectedProject.title);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 405) {
          dashboard = await fetchHealthSafetyDashboardFallback(selectedProject.title, month, year);
        } else {
          throw error;
        }
      }

      const resolvedYear = year;

      let yearRecords: HSERecord[] = [];
      try {
        yearRecords = await fetchHealthSafetyYearRecords(selectedProject.title, resolvedYear);
      } catch (yearError) {
        console.warn('[HSE] Year records fetch failed:', yearError);
      }

      const monthlyRecords = mergeHealthSafetyRecords(
        [...dashboard.monthlyRecords, ...yearRecords],
        dashboard.currentMonth
      );
      setHealthSafetyDashboard({
        ...dashboard,
        monthlyRecords,
        ytdSummary: resolveHealthSafetyYtdSummary(
          dashboard.ytdSummary,
          monthlyRecords,
          resolvedYear
        ),
        selectedMonth: month,
        selectedYear: year,
      });
      setHealthSafetyError(null);
    } catch (error) {
      console.error('Error fetching health & safety dashboard:', error);
      setHealthSafetyDashboard({ currentMonth: null, ytdSummary: null, monthlyRecords: [] });
      setHealthSafetyError(getApiErrorMessage(error, 'Unable to load Health & Safety data'));
    } finally {
      setIsLoadingHealthSafety(false);
    }
  }, [selectedProject?.title, hseCanView]);

  const fetchHealthSafetyForPeriod = useCallback(async (month: number, year: number) => {
    if (!selectedProject?.title || !hseCanView) return;

    setIsLoadingHealthSafety(true);
    setHealthSafetyError(null);
    try {
      const yearRecords = await fetchHealthSafetyYearRecords(selectedProject.title, year);

      const monthlyRecord =
        yearRecords.find((row) => toNum(row.month) === month && toNum(row.year) === year) ?? null;

      const ytdSummary = resolveHealthSafetyYtdSummary(null, yearRecords, year);

      setHealthSafetyDashboard((prev) => {
        const monthlyRecords = mergeHealthSafetyRecords(
          [...(prev?.monthlyRecords ?? []), ...yearRecords],
          monthlyRecord
        );
        const resolvedYtd = resolveHealthSafetyYtdSummary(
          ytdSummary ?? prev?.ytdSummary ?? null,
          monthlyRecords,
          year
        );
        return {
          currentMonth: monthlyRecord,
          ytdSummary: resolvedYtd,
          monthlyRecords,
          selectedMonth: month,
          selectedYear: year,
        };
      });
      setHealthSafetyError(null);
    } catch (error) {
      console.error('Error fetching health & safety period data:', error);
      setHealthSafetyError(getApiErrorMessage(error, 'Unable to load Health & Safety data'));
    } finally {
      setIsLoadingHealthSafety(false);
    }
  }, [selectedProject?.title, hseCanView]);

  const handleSaveHealthSafety = async (
    values: HealthSafetyFormValues,
    record?: HSERecord | null
  ): Promise<boolean> => {
    if (!selectedProject?.title) {
      setHealthSafetyFormError('Select a project before saving Health & Safety data.');
      return false;
    }
    if (!hseCanEdit) {
      setHealthSafetyFormError('You do not have permission to edit Health & Safety for this project.');
      return false;
    }

    setIsSavingHealthSafety(true);
    setHealthSafetyFormError(null);
    try {
      const payload = healthSafetyPayloadFromForm(selectedProject.title, values);

      const saved = await saveHealthSafetyRecord(payload, {
        record,
        knownRecords: [
          ...(healthSafetyDashboard?.monthlyRecords ?? []),
          ...(healthSafetyDashboard?.currentMonth ? [healthSafetyDashboard.currentMonth] : []),
        ],
      });

      setHealthSafetySelectedMonth(saved.month ?? values.month);
      setHealthSafetySelectedYear(saved.year ?? values.year);
      showToast('Health & Safety data saved successfully!');
      await fetchHealthSafetyDashboard();
      return true;
    } catch (error) {
      console.error('Failed to save HSE data:', error);
      setHealthSafetyFormError(getApiErrorMessage(error, 'Failed to save Health & Safety data.'));
      return false;
    } finally {
      setIsSavingHealthSafety(false);
    }
  };

  const toDateInputValue = (value: string | null | undefined): string => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  };

  const projectContractors = useMemo(
    () => getContractorsList(projectDatesBundle),
    [projectDatesBundle],
  );

  useEffect(() => {
    if (!projectContractors.length) {
      setSelectedContractorId(null);
      return;
    }
    if (
      selectedContractorId == null ||
      !projectContractors.some((c) => c.id === selectedContractorId)
    ) {
      setSelectedContractorId(projectContractors[0]?.id ?? null);
    }
  }, [projectContractors, selectedContractorId]);

  const bumpContractorDashboard = useCallback(() => {
    setContractorDashboardRevision((n) => n + 1);
  }, []);

  // Keep contractor Full Overview financial cards in sync after Financial Management saves.
  useEffect(() => {
    if (!financialDataVersion) return;
    setContractorDashboardRevision((n) => n + 1);
  }, [financialDataVersion]);

  useEffect(() => {
    if (!selectedProject?.title) {
      setContractorMasters([]);
      return;
    }
    void contractorMasterApi
      .list(selectedProject.title)
      .then(setContractorMasters)
      .catch(() => setContractorMasters([]));
  }, [selectedProject?.title, contractorDashboardRevision]);

  const loadProjectDatesFormScl = (record?: ProjectDatesRecord | ProjectDatesApiRecord | null) => {
    const scl = record ?? projectDatesBundle?.scl ?? null;
    setProjectDatesModalMode('edit_scl');
    setEditingContractorRecord(null);
    setEditingSclId(scl?.id ?? null);
    setProjectDatesForm({
      contractor_id: null,
      project_start: toDateInputValue(scl?.project_start),
      contract_finish: toDateInputValue(scl?.contract_finish),
      forecast_finish: toDateInputValue(scl?.forecast_finish),
      eot_date: toDateInputValue(scl?.eot_date),
    });
    setProjectDatesFormError(null);
  };

  const loadProjectDatesFormContractor = (
    record: ProjectDatesRecord | ProjectDatesApiRecord | null,
    mode: 'edit_contractor' | 'add_contractor',
  ) => {
    setProjectDatesModalMode(mode);
    setEditingContractorRecord(record as ProjectDatesRecord | null);
    setEditingSclId(null);
    const scheduledIds = new Set(
      (projectDatesBundle?.contractors ?? []).flatMap((c) => {
        const id = (c as ProjectDatesApiRecord).contractor?.id;
        if (id != null) return [id];
        const master = contractorMasters.find((m) => m.contractor_name === c.contractor_name);
        return master ? [master.id] : [];
      }),
    );
    const firstAvailableMaster =
      contractorMasters.find((m) => m.status === 'ACTIVE' && !scheduledIds.has(m.id)) ??
      contractorMasters.find((m) => m.status === 'ACTIVE') ??
      null;
    setProjectDatesForm({
      contractor_id:
        (record as ProjectDatesApiRecord | null)?.contractor?.id ??
        (mode === 'add_contractor' ? (firstAvailableMaster?.id ?? null) : null),
      project_start: toDateInputValue(record?.project_start),
      contract_finish: toDateInputValue(record?.contract_finish),
      forecast_finish: toDateInputValue(record?.forecast_finish),
      eot_date: toDateInputValue(record?.eot_date),
    });
    setProjectDatesFormError(null);
  };

  const openEditSclModal = (sclOverride?: ProjectDatesApiRecord | null) => {
    loadProjectDatesFormScl(sclOverride ?? projectDatesBundle?.scl ?? null);
    setIsProjectDatesModalOpen(true);
  };

  const openEditContractorModal = (record: ProjectDatesRecord | ProjectDatesApiRecord) => {
    loadProjectDatesFormContractor(record, 'edit_contractor');
    setIsProjectDatesModalOpen(true);
  };

  const openAddContractorModal = () => {
    setNewContractorMasterName('');
    loadProjectDatesFormContractor(null, 'add_contractor');
    setIsProjectDatesModalOpen(true);
  };

  const handleCreateContractorMaster = async () => {
    if (!selectedProject?.title || !newContractorMasterName.trim()) {
      setProjectDatesFormError('Enter a contractor name.');
      return;
    }

    setIsCreatingContractorMaster(true);
    setProjectDatesFormError(null);
    try {
      const record = await contractorMasterApi.create(selectedProject.title, {
        contractor_name: newContractorMasterName.trim(),
      });
      if (!record) {
        setProjectDatesFormError('Failed to add contractor to master.');
        return;
      }
      setContractorMasters((prev) => [...prev.filter((m) => m.id !== record.id), record]);
      setProjectDatesForm((prev) => ({ ...prev, contractor_id: record.id }));
      setNewContractorMasterName('');
      bumpContractorDashboard();
      showToast(`Contractor "${record.contractor_name}" added to master`);
    } catch (error) {
      setProjectDatesFormError(getApiErrorMessage(error, 'Failed to add contractor to master.'));
    } finally {
      setIsCreatingContractorMaster(false);
    }
  };

  const availableContractorMasters = useMemo(
    () =>
      contractorMasters
        .filter((m) => m.status === 'ACTIVE')
        .filter((m) => {
          if (projectDatesModalMode !== 'add_contractor') return true;
          const scheduled = (projectDatesBundle?.contractors ?? []).some((c) => {
            const cid = (c as ProjectDatesApiRecord).contractor?.id;
            return cid === m.id || c.contractor_name === m.contractor_name;
          });
          return !scheduled;
        }),
    [contractorMasters, projectDatesBundle?.contractors, projectDatesModalMode],
  );

  const isAddingSclDates = projectDatesModalMode === 'edit_scl' && editingSclId == null;

  const fetchProjectDatesData = useCallback(async () => {
    if (!selectedProject?.title) {
      setProjectDatesBundle(null);
      setProjectDatesError(null);
      return;
    }

    if (
      teamLeaderView === 'overview' &&
      selectedProject.id &&
      readTeamLeaderOverviewCache(currentUser.id, selectedProject.id)
    ) {
      const datesCached = readProjectDatesSectionCache(currentUser.id, selectedProject.id);
      if (datesCached) {
        setProjectDatesBundle(projectDatesBundleFromCache(datesCached));
        setProjectDatesSectionCache(datesCached);
        if (datesCached.selectedContractorId) {
          setSelectedContractorId(datesCached.selectedContractorId);
        }
      }
      setIsLoadingProjectDates(false);
      setProjectDatesError(null);
      return;
    }

    setIsLoadingProjectDates(true);
    setProjectDatesError(null);
    try {
      const response = await projectDatesApi.getByProject(selectedProject.title);
      let bundle = normalizeProjectDatesByProject(response.data, selectedProject.title);

      try {
        const bgResponse = await projectDatesApi.getBgStatusBundle(selectedProject.title);
        if (bgResponse.data) {
          bundle = mergeBgBundleIntoProjectDatesBundle(bundle, bgResponse.data);
        }
      } catch (bgError) {
        const bgNotFound =
          (axios.isAxiosError(bgError) && bgError.response?.status === 404) ||
          /not found|no bg/i.test(getApiErrorMessage(bgError, ''));
        if (!bgNotFound) {
          console.warn('BG status fetch failed:', bgError);
        }
      }

      setProjectDatesBundle((prev) => preserveContractorNames(bundle, prev));

      if (selectedProject?.id) {
        const payload = buildProjectDatesSectionCacheFromBundle({
          projectId: selectedProject.id,
          projectName: selectedProject.title,
          bundle,
          selectedContractorId,
        });
        writeProjectDatesSectionCache(currentUser.id, payload);
        setProjectDatesSectionCache(payload);
      }
    } catch (error) {
      console.error('Error fetching project dates:', error);
      const message = getApiErrorMessage(error, 'Unable to load project dates.');
      const isNotFound =
        (axios.isAxiosError(error) && error.response?.status === 404) ||
        /not found|no project dates/i.test(message);

      setProjectDatesBundle({
        project_name: selectedProject.title,
        scl: null,
        contractor: null,
        contractors: [],
      });
      setProjectDatesError(isNotFound ? null : message);
    } finally {
      setIsLoadingProjectDates(false);
    }
  }, [selectedProject?.title, selectedProject?.id, selectedContractorId, currentUser.id, teamLeaderView]);

  useEffect(() => {
    if (!selectedProject?.id) {
      setProjectDatesSectionCache(null);
      return;
    }

    const cached = readProjectDatesSectionCache(currentUser.id, selectedProject.id);
    setProjectDatesSectionCache(cached);
    if (cached) {
      setProjectDatesBundle(projectDatesBundleFromCache(cached));
      if (cached.selectedContractorId) {
        setSelectedContractorId(cached.selectedContractorId);
      }
    }
  }, [selectedProject?.id, currentUser.id]);

  const handleProjectDatesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject?.title) return;

    const { project_start, contract_finish, forecast_finish, eot_date, contractor_id } =
      projectDatesForm;
    if (!project_start || !contract_finish || !forecast_finish || !eot_date) {
      setProjectDatesFormError('All four dates are required.');
      return;
    }

    const isScl = projectDatesModalMode === 'edit_scl';
    if (!isScl && contractor_id == null) {
      setProjectDatesFormError('Select a contractor from Contractor Master.');
      return;
    }

    const selectedMaster = contractorMasters.find((m) => m.id === contractor_id);

    const payload = {
      project_name: selectedProject.title,
      date_type: (isScl ? 'SCL' : 'CONTRACTOR') as ProjectDateType,
      project_start,
      contract_finish,
      forecast_finish,
      eot_date,
      ...(!isScl && contractor_id != null ? { contractor_id } : {}),
    };

    const existing = isScl
      ? projectDatesBundle?.scl ?? (editingSclId ? { id: editingSclId } : null)
      : projectDatesModalMode === 'add_contractor'
        ? null
        : editingContractorRecord ??
        projectContractors.find((c) => c.id === selectedContractorId) ??
        null;

    setIsSavingProjectDates(true);
    setProjectDatesFormError(null);
    try {
      let savedContractorId: number | undefined;

      if (existing?.id) {
        await projectDatesApi.patch(existing.id, payload);
        savedContractorId = existing.id;
      } else {
        const res = await projectDatesApi.create(payload);
        const body = (res.data as { data?: { id?: number } })?.data ?? res.data;
        savedContractorId = (body as { id?: number })?.id;
      }

      await fetchProjectDatesData();
      bumpContractorDashboard();

      if (!isScl && selectedMaster && savedContractorId) {
        setProjectDatesBundle((prev) =>
          prev
            ? applyContractorNameToBundle(
              prev,
              savedContractorId!,
              selectedMaster.contractor_name,
            )
            : prev,
        );
        setSelectedContractorId(savedContractorId);
      }

      showToast(
        projectDatesModalMode === 'add_contractor'
          ? `Schedule added for "${selectedMaster?.contractor_name ?? 'contractor'}"`
          : 'Project dates saved successfully',
      );
      setIsProjectDatesModalOpen(false);
    } catch (error) {
      console.error('Failed to save project dates:', error);
      const message = getApiErrorMessage(error, 'Failed to save project dates.');
      setProjectDatesFormError(message);
      showToast(message, 'error');
    } finally {
      setIsSavingProjectDates(false);
    }
  };

  const handleDeleteContractor = async (record: ProjectDatesRecord) => {
    if (!record.id) return;
    const name = contractorLabel(record);
    if (!window.confirm(`Delete contractor schedule for "${name}"?`)) return;
    try {
      await projectDatesApi.delete(record.id);
      await fetchProjectDatesData();
      bumpContractorDashboard();
      showToast('Contractor schedule deleted.');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to delete contractor schedule.');
      showToast(message, 'error');
    }
  };

  const openBgStatusModal = (scope: BgManageScope = 'all') => {
    if (scope === 'all') {
      setBgModalScope({ mode: 'all' });
    } else if (scope === 'SCL') {
      setBgModalScope({ mode: 'SCL' });
    } else {
      setBgModalScope({ mode: 'CONTRACTOR', contractorName: scope.contractorName });
    }
    setIsBgStatusModalOpen(true);
  };

  const handleBgStatusSaved = (savedBundle: BgStatusBundle) => {
    setProjectDatesBundle((prev) =>
      prev ? mergeBgBundleIntoProjectDatesBundle(prev, savedBundle) : prev,
    );
    bumpContractorDashboard();
    showToast('BG Status updated successfully!');
  };

  const fetchDrawingsForPeriod = useCallback(async (month: number, year: number) => {
    if (!selectedProject?.title) {
      setDrawingMonthlyRecord(null);
      setDrawingProjectSummary(null);
      setDrawingYearRecords([]);
      setDrawingsError(null);
      return;
    }

    setIsLoadingDrawings(true);
    setDrawingsError(null);
    try {
      const res = await drawingRegisterApi.getClientReport({
        projectName: selectedProject.title,
        month,
        year,
        view: 'monthly',
      });
      const report = res.data;
      const summary = report.summary;

      const projectSummary: DrawingProjectSummary = {
        submittedDrawings: summary.submittedDrawings,
        approvedDrawings: summary.approvedDrawings,
        variance: summary.variance,
        approvalRate: summary.approvalRate,
      };

      const monthlyRecord: DrawingMonthlyRecord = {
        projectName: selectedProject.title,
        month,
        year,
        submittedDrawings: summary.submittedDrawings,
        approvedDrawings: summary.approvedDrawings,
        variance: summary.variance,
        approvalRate: summary.approvalRate,
      };

      setDrawingMonthlyRecord(monthlyRecord);
      setDrawingProjectSummary(projectSummary);
      setDrawingYearRecords([monthlyRecord]);
    } catch (error) {
      console.error('Error fetching drawing register summary:', error);
      setDrawingMonthlyRecord(null);
      setDrawingProjectSummary(null);
      setDrawingYearRecords([]);
      setDrawingsError(null);
    } finally {
      setIsLoadingDrawings(false);
    }
  }, [selectedProject?.title]);

  const handleSaveDrawings = async (
    values: DrawingFormValues,
    record?: DrawingMonthlyRecord | null
  ): Promise<boolean> => {
    if (!selectedProject?.title) {
      setDrawingsFormError('Select a project before saving drawings.');
      return false;
    }

    setIsSavingDrawings(true);
    setDrawingsFormError(null);
    try {
      const saved = await saveDrawingRecord(
        {
          projectName: selectedProject.title,
          month: values.month,
          year: values.year,
          submittedDrawings: values.submittedDrawings,
          approvedDrawings: values.approvedDrawings,
        },
        { record, knownRecords: drawingYearRecords }
      );

      setDrawingSelectedMonth(saved.month);
      setDrawingSelectedYear(saved.year);
      showToast('Drawing summary saved successfully!');
      await fetchDrawingsForPeriod(saved.month, saved.year);
      return true;
    } catch (error) {
      console.error('Failed to save drawing summary:', error);
      setDrawingsFormError(getApiErrorMessage(error, 'Failed to save drawing summary.'));
      return false;
    } finally {
      setIsSavingDrawings(false);
    }
  };

  const handleDrawingMonthChange = (month: number) => {
    setDrawingSelectedMonth(month);
  };

  const handleDrawingYearChange = (year: number) => {
    setDrawingSelectedYear(year);
  };

  const fetchQualityForPeriod = useCallback(async (month: number, year: number) => {
    if (!selectedProject?.title) {
      setQualityMonthlyRecord(null);
      setQualityYearRecords([]);
      setQualityStatusError(null);
      return;
    }

    setIsLoadingQualityStatus(true);
    setQualityStatusError(null);
    try {
      const [monthlyRes, yearRecordsFromApi] = await Promise.all([
        projectQualityApi.getByProjectMonthYear(selectedProject.title, month, year).catch((error) => {
          if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
          throw error;
        }),
        fetchQualityYearRecords(selectedProject.title, year),
      ]);

      const monthlyRecord = monthlyRes
        ? normalizeProjectQualityStatusRecord(monthlyRes.data?.data ?? monthlyRes.data, selectedProject.title)
        : null;

      let yearRecords = yearRecordsFromApi;
      if (monthlyRecord) {
        yearRecords = mergeQualityRecordsByPeriod([...yearRecords, monthlyRecord]);
      }

      setQualityMonthlyRecord(monthlyRecord);
      setQualityYearRecords(yearRecords);
    } catch (error) {
      console.error('Error fetching project quality data:', error);
      setQualityMonthlyRecord(null);
      setQualityYearRecords([]);
      setQualityStatusError(getApiErrorMessage(error, 'Unable to load project quality status'));
    } finally {
      setIsLoadingQualityStatus(false);
    }
  }, [selectedProject?.title]);

  const handleSaveQualityStatus = async (
    values: QualityFormValues,
    record?: ProjectQualityStatusRecord | null
  ): Promise<boolean> => {
    if (!selectedProject?.title) {
      setQualityStatusFormError('Select a project before saving quality status.');
      return false;
    }

    setIsSavingQualityStatus(true);
    setQualityStatusFormError(null);
    try {
      const saved = await saveProjectQualityRecord(
        {
          projectName: selectedProject.title,
          month: values.month,
          year: values.year,
          testsRequired: values.testsRequired,
          testsConducted: values.testsConducted,
          testsPassed: values.testsPassed,
          testsFailed: values.testsFailed,
        },
        { record, knownRecords: qualityYearRecords }
      );

      setQualitySelectedMonth(saved.month);
      setQualitySelectedYear(saved.year);
      showToast('Project quality status saved successfully!');
      await fetchQualityForPeriod(saved.month, saved.year);
      return true;
    } catch (error) {
      console.error('Failed to save project quality status:', error);
      setQualityStatusFormError(getApiErrorMessage(error, 'Failed to save project quality status.'));
      return false;
    } finally {
      setIsSavingQualityStatus(false);
    }
  };

  const handleQualityMonthChange = (month: number) => {
    setQualitySelectedMonth(month);
  };

  const handleQualityYearChange = (year: number) => {
    setQualitySelectedYear(year);
  };

  useEffect(() => {
    if (selectedProjectId) {
      projectApi.getDashboardData(selectedProjectId)
        .then(response => {
          setDashboardData(response.data);
        })
        .catch(error => {
          // Dashboard data doesn't exist yet, that's okay
          setDashboardData(null);
        });
      setIsProjectDatesModalOpen(false);
      setProjectDatesFormError(null);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (allProjects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(allProjects[0].id);
    }
  }, [allProjects, selectedProjectId]);

  // Fetch cost performance data when selected project changes
  useEffect(() => {
    const fetchCostPerformanceData = async () => {
      if (!selectedProject?.title) {
        setCostPerformanceData([]);
        return;
      }

      setIsLoadingCostPerformance(true);
      try {
        const role = getBackendRole(currentUser.role);
        const response = await costPerformanceApi.getCostPerformance({
          project_name: selectedProject.title,
          ...(role ? { role } : {}),
        });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Transform API data to match chart format
          const transformedData = rows.map((item: any) => ({
            month: item.month_year,
            bcws: toNum(item.bcws),
            bcwp: toNum(item.bcwp),
            acwp: toNum(item.acwp),
            fcst: toNum(item.fcst),
          }));
          setCostPerformanceData(transformedData);
        } else {
          setCostPerformanceData([]);
        }
      } catch (error) {
        console.error('Error fetching cost performance data:', error);
        setCostPerformanceData([]);
      } finally {
        setIsLoadingCostPerformance(false);
      }
    };

    fetchCostPerformanceData();
  }, [selectedProject?.title, currentUser.role, financialDataVersion]);

  const fetchEquipmentData = useCallback(async () => {
    if (!selectedProject?.title) {
      setEquipmentDataState([]);
      setEquipmentError(null);
      return;
    }

    setIsLoadingEquipment(true);
    setEquipmentError(null);
    try {
      const response = await projectEquipmentApi.getByProject(selectedProject.title);
      let rows = unwrapList<any>(response.data);
      if (rows.length === 0 && Array.isArray(response.data?.data)) {
        rows = response.data.data;
      }
      const normalized = rows
        .map((row) => normalizeProjectEquipmentRecord(row, selectedProject.title))
        .filter((row) => row.equipmentMonth)
        .sort((a, b) => a.equipmentMonth.localeCompare(b.equipmentMonth));
      setEquipmentDataState(normalized);
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        setEquipmentDataState([]);
        setEquipmentError(null);
      } else {
        console.error('Error fetching project equipment data:', error);
        setEquipmentDataState([]);
        setEquipmentError(getApiErrorMessage(error, 'Unable to load project equipment'));
      }
    } finally {
      setIsLoadingEquipment(false);
    }
  }, [selectedProject?.title]);

  useEffect(() => {
    fetchEquipmentData();
  }, [fetchEquipmentData, financialDataVersion]);

  const handleSaveEquipment = async (
    values: EquipmentFormValues,
    record?: ProjectEquipmentRecord | null
  ): Promise<boolean> => {
    if (!selectedProject?.title) {
      setEquipmentFormError('Select a project before saving equipment.');
      return false;
    }

    const duplicate = equipmentDataState.some((item) =>
      item.equipmentMonth.slice(0, 7) === values.equipmentMonth &&
      String(item.id ?? '') !== String(record?.id ?? '')
    );
    if (duplicate) {
      setEquipmentFormError('A project equipment entry already exists for this project and month.');
      return false;
    }

    setIsSavingEquipment(true);
    setEquipmentFormError(null);
    try {
      const payload = {
        projectName: selectedProject.title,
        equipmentMonth: values.equipmentMonth,
        plannedEquipment: values.plannedEquipment,
        actualEquipment: values.actualEquipment,
        remarks: values.remarks,
      };
      const response = record?.id
        ? await projectEquipmentApi.update(record.id, payload)
        : await projectEquipmentApi.create(payload);
      const saved = normalizeProjectEquipmentRecord(response.data?.data ?? response.data, selectedProject.title);
      setEquipmentDataState((prev) => {
        const withoutSaved = prev.filter((item) => String(item.id ?? item.equipmentMonth) !== String(saved.id ?? saved.equipmentMonth));
        return [...withoutSaved, saved].sort((a, b) => a.equipmentMonth.localeCompare(b.equipmentMonth));
      });
      showToast('Project equipment saved successfully!');
      await fetchEquipmentData();
      return true;
    } catch (error) {
      console.error('Failed to save project equipment:', error);
      setEquipmentFormError(getApiErrorMessage(error, 'Failed to save project equipment.'));
      return false;
    } finally {
      setIsSavingEquipment(false);
    }
  };

  const handleDeleteEquipment = async (record: ProjectEquipmentRecord): Promise<boolean> => {
    if (!record.id) {
      setEquipmentFormError('Unable to delete equipment without a record id.');
      return false;
    }

    setEquipmentFormError(null);
    try {
      await projectEquipmentApi.delete(record.id);
      setEquipmentDataState((prev) => prev.filter((item) => String(item.id) !== String(record.id)));
      showToast('Project equipment deleted successfully!');
      await fetchEquipmentData();
      return true;
    } catch (error) {
      console.error('Failed to delete project equipment:', error);
      setEquipmentFormError(getApiErrorMessage(error, 'Failed to delete project equipment.'));
      showToast(getApiErrorMessage(error, 'Failed to delete project equipment.'), 'error');
      return false;
    }
  };

  const fetchCorrespondenceForPeriod = useCallback(async (month: number, year: number) => {
    if (!selectedProject?.title) {
      setCorrespondencePeriod(null);
      setCorrespondenceProjectSummary(null);
      setCorrespondenceDashboard(null);
      setCorrespondenceYearPeriods([]);
      setCorrespondenceDocuments([]);
      setCorrespondenceError(null);
      return;
    }

    setIsLoadingCorrespondence(true);
    setCorrespondenceError(null);
    try {
      const [listRes, yearPeriodsFromApi, dashboardRes] = await Promise.all([
        correspondenceApi.getAll({ project_name: selectedProject.title, month, year }).catch((error) => {
          if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
          throw error;
        }),
        fetchCorrespondenceYearPeriods(selectedProject.title, year),
        correspondenceDocumentsApi.getDashboard({
          project_name: selectedProject.title,
          month,
          year,
          view: 'cumulative',
        }).catch((error) => {
          console.warn('[Projects] Correspondence dashboard fetch failed:', error);
          return null;
        }),
      ]);

      const monthlyBody = listRes?.data?.data ?? listRes?.data;
      const period = listRes
        ? normalizeCorrespondenceMonthlyPeriod(monthlyBody, selectedProject.title)
        : null;

      const projectSummary = period
        ? { client: period.client, contractor: period.contractor }
        : null;

      let yearPeriods = yearPeriodsFromApi;
      if (period) {
        yearPeriods = mergeCorrespondencePeriods([...yearPeriods, { ...period, month, year }]);
      }

      const documents = mergeCorrespondenceDocumentLists(
        collectCorrespondenceDocuments(listRes?.data, monthlyBody, selectedProject.title, month, year),
        []
      );

      const dashboardPayload = dashboardRes?.data as { data?: CorrespondenceDashboardResponse } | CorrespondenceDashboardResponse | undefined;
      const dashboard =
        (dashboardPayload && 'data' in dashboardPayload && dashboardPayload.data
          ? dashboardPayload.data
          : (dashboardPayload as CorrespondenceDashboardResponse | undefined)) ?? null;

      setCorrespondencePeriod(period ? { ...period, month, year } : null);
      setCorrespondenceProjectSummary(projectSummary);
      setCorrespondenceDashboard(dashboard);
      setCorrespondenceYearPeriods(yearPeriods);
      setCorrespondenceDocuments(documents);
    } catch (error) {
      console.error('Error fetching correspondence:', error);
      setCorrespondencePeriod(null);
      setCorrespondenceProjectSummary(null);
      setCorrespondenceDashboard(null);
      setCorrespondenceYearPeriods([]);
      setCorrespondenceDocuments([]);
      setCorrespondenceError(getApiErrorMessage(error, 'Unable to load correspondence status'));
    } finally {
      setIsLoadingCorrespondence(false);
    }
  }, [selectedProject?.title]);

  const handleSaveCorrespondenceDocument = async (
    values: CorrespondenceDocumentFormValues,
    document?: CorrespondenceDocument | null
  ): Promise<CorrespondenceDocument | null> => {
    if (!selectedProject?.title) {
      setCorrespondenceFormError('Select a project before saving correspondence.');
      return null;
    }

    const validationMessage = validateCorrespondenceDocumentInput(values);
    if (validationMessage) {
      setCorrespondenceFormError(validationMessage);
      return null;
    }

    setIsSavingCorrespondence(true);
    setCorrespondenceFormError(null);
    try {
      const saved = await saveCorrespondenceDocument(
        {
          projectName: selectedProject.title,
          month: values.month,
          year: values.year,
          correspondenceCategory: values.correspondenceCategory,
          description: values.description.trim(),
          receivedDate: values.receivedDate,
          deliveredDate:
            values.correspondenceCategory === 'DELIVERY'
              ? values.deliveredDate || null
              : null,
          ...(values.documentScope === 'scl'
            ? { recipientType: values.recipientType as CorrespondenceRecipientType }
            : {
              correspondenceType: values.correspondenceType,
              srNo: values.srNo,
            }),
        },
        { document }
      );

      if (values.month !== correspondenceSelectedMonth) {
        setCorrespondenceSelectedMonth(values.month);
      }
      if (values.year !== correspondenceSelectedYear) {
        setCorrespondenceSelectedYear(values.year);
      }

      showToast(document ? 'Correspondence document updated.' : 'Correspondence document saved.');
      await fetchCorrespondenceForPeriod(values.month, values.year);
      return saved;
    } catch (error) {
      console.error('Failed to save correspondence document:', error);
      setCorrespondenceFormError(getApiErrorMessage(error, 'Failed to save correspondence document.'));
      return null;
    } finally {
      setIsSavingCorrespondence(false);
    }
  };

  const handleDeleteCorrespondenceDocument = async (document: CorrespondenceDocument): Promise<boolean> => {
    if (document.id == null) return false;
    if (!window.confirm('Delete this correspondence document?')) return false;

    setIsSavingCorrespondence(true);
    setCorrespondenceFormError(null);
    try {
      await deleteCorrespondenceDocument(document.id);
      showToast('Correspondence document deleted.');
      await fetchCorrespondenceForPeriod(correspondenceSelectedMonth, correspondenceSelectedYear);
      return true;
    } catch (error) {
      console.error('Failed to delete correspondence document:', error);
      setCorrespondenceFormError(getApiErrorMessage(error, 'Failed to delete correspondence document.'));
      return false;
    } finally {
      setIsSavingCorrespondence(false);
    }
  };

  const handleCorrespondenceMonthChange = (month: number) => {
    setCorrespondenceSelectedMonth(month);
  };

  const handleCorrespondenceYearChange = (year: number) => {
    setCorrespondenceSelectedYear(year);
  };

  useEffect(() => {
    fetchCorrespondenceForPeriod(correspondenceSelectedMonth, correspondenceSelectedYear);
  }, [
    fetchCorrespondenceForPeriod,
    correspondenceSelectedMonth,
    correspondenceSelectedYear,
    financialDataVersion,
  ]);

  // Drawing register data is loaded by DrawingRegisterCard — no legacy /drawings/project/ calls.
  // useEffect(() => {
  //   fetchDrawingsForPeriod(drawingSelectedMonth, drawingSelectedYear);
  // }, [fetchDrawingsForPeriod, drawingSelectedMonth, drawingSelectedYear, financialDataVersion]);

  useEffect(() => {
    fetchQualityForPeriod(qualitySelectedMonth, qualitySelectedYear);
  }, [fetchQualityForPeriod, qualitySelectedMonth, qualitySelectedYear, financialDataVersion]);

  // Fetch budget performance data when selected project changes
  useEffect(() => {
    const fetchBudgetPerformanceData = async () => {
      if (!selectedProject?.title) {
        setBudgetPerformanceData(null);
        return;
      }

      setIsLoadingBudgetPerformance(true);
      try {
        const role = getBackendRole(currentUser.role);
        const response = await budgetPerformanceApi.getBudgetPerformance({
          project_name: selectedProject.title,
          ...(role ? { role } : {}),
        });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          const best = pickBestRow(rows, (r) =>
            toNum(r?.bac) + toNum(r?.eac) + toNum(r?.etg) + Math.abs(toNum(r?.vac)) + Math.abs(toNum(r?.cv))
          );
          setBudgetPerformanceData(best);
        } else {
          setBudgetPerformanceData(null);
        }
      } catch (error) {
        console.error('Error fetching budget performance data:', error);
        setBudgetPerformanceData(null);
      } finally {
        setIsLoadingBudgetPerformance(false);
      }
    };

    fetchBudgetPerformanceData();
  }, [selectedProject?.title, currentUser.role, financialDataVersion]);

  // Fetch manpower data when selected project changes
  useEffect(() => {
    const fetchManpowerData = async () => {
      if (!selectedProject?.title) {
        setManpowerDataState([]);
        return;
      }

      setIsLoadingManpower(true);
      try {
        const response = await manpowerApi.getManpower({ project_name: selectedProject.title });
        const rows = unwrapList<any>(response.data).map(normalizeManpowerRecord);
        if (rows.length > 0) {
          // planned_manpower aliases monthly_planned_manpower from backend via normalizeManpowerRecord
          const transformedData = rows
            .map((item) => ({
              month: item.month_year,
              month_year: item.month_year,
              planned: item.planned_manpower,
              actual: item.actual_manpower,
              planned_manpower: item.planned_manpower,
              actual_manpower: item.actual_manpower,
            }))
            .sort((a, b) => {
              const dateA = new Date(`1-${a.month}`);
              const dateB = new Date(`1-${b.month}`);
              return dateA.getTime() - dateB.getTime();
            });
          setManpowerDataState(transformedData);
        } else {
          setManpowerDataState([]);
        }
      } catch (error) {
        console.error('Error fetching manpower data:', error);
        setManpowerDataState([]);
      } finally {
        setIsLoadingManpower(false);
      }
    };

    fetchManpowerData();
  }, [selectedProject?.title]);

  // Fetch cashflow data when selected project changes
  useEffect(() => {
    const fetchCashflowData = async () => {
      if (!selectedProject?.title) {
        setCashflowDataState([]);
        return;
      }

      setIsLoadingCashflow(true);
      try {
        const role = getBackendRole(currentUser.role);
        const response = await cashflowApi.getCashflow({
          project_name: selectedProject.title,
          ...(role ? { role } : {}),
        });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          // Transform API data to match chart format
          const transformedData = rows.map((item: any) => ({
            month: item.month_year,
            cashIn: item.cash_in_monthly_actual,
            cashOut: item.cash_out_monthly_actual,
            cumPlanIn: item.cash_in_cumulative_plan,
            cumPlanOut: item.cash_out_cumulative_plan,
            cumActualIn: item.cash_in_cumulative_actual,
            cumActualOut: item.cash_out_cumulative_actual
          }));
          setCashflowDataState(transformedData);
        } else {
          setCashflowDataState([]);
        }
      } catch (error) {
        console.error('Error fetching cashflow data:', error);
        setCashflowDataState([]);
      } finally {
        setIsLoadingCashflow(false);
      }
    };

    fetchCashflowData();
  }, [selectedProject?.title, currentUser.role, financialDataVersion]);

  // Fetch health & safety dashboard when selected project changes (not on month/year change)
  useEffect(() => {
    fetchHealthSafetyDashboard();
  }, [fetchHealthSafetyDashboard, financialDataVersion]);

  const handleHealthSafetyMonthChange = (month: number) => {
    const year = healthSafetyPeriodRef.current.year;
    healthSafetyPeriodRef.current = { month, year };
    setHealthSafetySelectedMonth(month);
    fetchHealthSafetyForPeriod(month, year);
  };

  const handleHealthSafetyYearChange = (year: number) => {
    const month = healthSafetyPeriodRef.current.month;
    healthSafetyPeriodRef.current = { month, year };
    setHealthSafetySelectedYear(year);
    fetchHealthSafetyForPeriod(month, year);
  };

  useEffect(() => {
    fetchProjectDatesData();
  }, [fetchProjectDatesData]);

  // Fetch project progress data when selected project changes
  useEffect(() => {
    const fetchProjectProgressData = async () => {
      if (!selectedProject?.title) {
        setProjectProgressData([]);
        return;
      }

      if (
        teamLeaderView === 'overview' &&
        selectedProject.id &&
        readTeamLeaderOverviewCache(currentUser.id, selectedProject.id)
      ) {
        setIsLoadingProjectProgress(false);
        return;
      }

      setIsLoadingProjectProgress(true);
      try {
        const role = getBackendRole(currentUser.role);
        const chartData = await fetchProjectProgressChart(selectedProject.title, role);
        setProjectProgressData(chartData);
      } catch (error) {
        console.error('Error fetching project progress data:', error);
        setProjectProgressData([]);
      } finally {
        setIsLoadingProjectProgress(false);
      }
    };

    fetchProjectProgressData();
  }, [
    selectedProject?.title,
    selectedProject?.id,
    currentUser.role,
    currentUser.id,
    financialDataVersion,
    teamLeaderView,
  ]);

  // Fetch invoicing records independently for each supported invoice type.
  useEffect(() => {
    const fetchInvoicingData = async () => {
      if (!selectedProject?.title) {
        setInvoicingData({ PMC: null, Contractor: null });
        setInvoicingErrors({ PMC: null, Contractor: null });
        setContractorInvoicingList([]);
        return;
      }

      setIsLoadingInvoicing(true);
      try {
        const results = await Promise.allSettled(
          INVOICE_TYPES.map(invoiceType =>
            invoicingApi.getInvoicing({
              projectName: selectedProject.title,
              invoiceType,
            })
          )
        );
        const nextData = { PMC: null, Contractor: null } as Record<InvoiceType, InvoicingRecord | null>;
        const nextErrors = { PMC: null, Contractor: null } as Record<InvoiceType, string | null>;

        results.forEach((result, index) => {
          const invoiceType = INVOICE_TYPES[index];
          if (result.status === 'fulfilled') {
            const rows = unwrapList<any>(result.value.data);
            if (invoiceType === 'Contractor') {
              const normalized = rows.map((row) =>
                normalizeInvoicingRecord(row, selectedProject.title, invoiceType),
              );
              setContractorInvoicingList(normalized);
              nextData[invoiceType] = normalized[0] ?? null;
            } else {
              const row = rows[0];
              nextData[invoiceType] = row
                ? normalizeInvoicingRecord(row, selectedProject.title, invoiceType)
                : null;
            }
          } else {
            console.error(`Error fetching ${invoiceType} invoicing data:`, result.reason);
            nextErrors[invoiceType] = getApiErrorMessage(result.reason, 'Unable to load invoicing data');
          }
        });
        setInvoicingData(nextData);
        setInvoicingErrors(nextErrors);
      } catch (error) {
        console.error('Error fetching invoicing records:', error);
        setInvoicingData({ PMC: null, Contractor: null });
        setInvoicingErrors({
          PMC: getApiErrorMessage(error, 'Unable to load invoicing data'),
          Contractor: getApiErrorMessage(error, 'Unable to load invoicing data'),
        });
      } finally {
        setIsLoadingInvoicing(false);
      }
    };

    fetchInvoicingData();
  }, [selectedProject?.title, financialDataVersion]);

  // Fetch contract values independently for each supported contract type.
  useEffect(() => {
    const fetchContractValuesData = async () => {
      if (!selectedProject?.title) {
        setContractValuesData({ SCL: null, Contractor: null });
        setContractValuesErrors({ SCL: null, Contractor: null });
        setContractorContractValuesList([]);
        return;
      }

      setIsLoadingContractValues(true);
      try {
        const results = await Promise.allSettled(
          CONTRACT_VALUE_TYPES.map(contractType =>
            contractValuesApi.getContractValues({
              projectName: selectedProject.title,
              contractType,
            })
          )
        );

        const nextData = { SCL: null, Contractor: null } as Record<ContractValueType, ContractValueRecord | null>;
        const nextErrors = { SCL: null, Contractor: null } as Record<ContractValueType, string | null>;
        results.forEach((result, index) => {
          const contractType = CONTRACT_VALUE_TYPES[index];
          if (result.status === 'fulfilled') {
            const rows = unwrapList<any>(result.value.data);
            if (contractType === 'Contractor') {
              const normalized = rows.map((row) =>
                normalizeContractValueRecord(row, selectedProject.title, contractType),
              );
              setContractorContractValuesList(normalized);
              nextData[contractType] = normalized[0] ?? null;
            } else {
              const row = rows[0];
              nextData[contractType] = row
                ? normalizeContractValueRecord(row, selectedProject.title, contractType)
                : null;
            }
          } else {
            console.error(`Error fetching ${contractType} contract values:`, result.reason);
            nextErrors[contractType] = getApiErrorMessage(result.reason, 'Unable to load contract values');
          }
        });
        setContractValuesData(nextData);
        setContractValuesErrors(nextErrors);
      } finally {
        setIsLoadingContractValues(false);
      }
    };

    fetchContractValuesData();
  }, [selectedProject?.title, financialDataVersion]);

  // Fetch contract performance data when selected project changes
  useEffect(() => {
    const fetchContractPerformanceData = async () => {
      if (!selectedProject?.title) {
        setContractPerformanceData(null);
        setContractPerformanceError(null);
        return;
      }

      setIsLoadingContractPerformance(true);
      setContractPerformanceError(null);
      try {
        const role = getBackendRole(currentUser.role);
        const response = await contractPerformanceApi.getContractPerformance({
          project_name: selectedProject.title,
          ...(role ? { role } : {}),
        });
        const rows = unwrapList<any>(response.data);
        if (rows.length > 0) {
          const latestPerformance = pickBestRow(rows, (r) =>
            toNum(r?.billedValue ?? r?.billed_value) +
            toNum(r?.actualReceiptValue ?? r?.actual_receipt_value)
          ) as any;
          setContractPerformanceData(normalizeContractPerformanceRecord(latestPerformance));
        } else {
          setContractPerformanceData(null);
        }
      } catch (error) {
        console.error('Error fetching contract performance data:', error);
        setContractPerformanceData(null);
        setContractPerformanceError(getApiErrorMessage(error, 'Unable to load contract performance'));
      } finally {
        setIsLoadingContractPerformance(false);
      }
    };

    fetchContractPerformanceData();
  }, [selectedProject?.title, currentUser.role, financialDataVersion]);

  // Fetch Planned vs Actual Value (SCL + Contractor) for selected project and period
  useEffect(() => {
    const fetchPlannedEarnedValueData = async () => {
      if (!selectedProject?.title) {
        setPlannedEarnedByPeriod(null);
        setPlannedEarnedError(null);
        setPvaVelocityTrend(null);
        return;
      }

      const projectName = selectedProject.title;
      const month = healthSafetySelectedMonth;
      const year = healthSafetySelectedYear;

      setIsLoadingPlannedEarned(true);
      setPlannedEarnedError(null);
      try {
        // Prefer refactored Planned vs Actual API (backend-computed metrics).
        try {
          const [bundle, trend] = await Promise.all([
            plannedVsActualApi.getByProject(projectName, { month, year }),
            plannedVsActualApi.getTrend(projectName, { year }).catch(() => null),
          ]);
          setPlannedEarnedByPeriod(pvaBundleToPlannedEarnedPeriod(bundle));

          const points = trend?.points ?? [];
          const sclMonths = points
            .filter((p) => p.sclPlanned || p.sclActual || p.sclCollection)
            .map((p) => ({
              month: p.monthLabel || String(p.month),
              planned: p.sclPlanned,
              actual: p.sclActual,
              collection: p.sclCollection,
            }));
          const contractorMonths = points
            .filter((p) => p.contractorPlanned || p.contractorActual || p.contractorCollection)
            .map((p) => ({
              month: p.monthLabel || String(p.month),
              planned: p.contractorPlanned,
              actual: p.contractorActual,
              collection: p.contractorCollection,
            }));

          setPvaVelocityTrend({
            year: trend?.year ?? year,
            sclMonths,
            contractorMonths,
            current: {
              scl: bundle.scl
                ? {
                    planned: bundle.scl.plannedValue,
                    actual: bundle.scl.actualValue,
                    collection: bundle.scl.collection,
                  }
                : null,
              contractor: bundle.contractorSummary
                ? {
                    planned: bundle.contractorSummary.plannedValue,
                    actual: bundle.contractorSummary.actualValue,
                    collection: bundle.contractorSummary.collection,
                  }
                : null,
            },
          });
          return;
        } catch (pvaError) {
          const pvaStatus = (pvaError as { response?: { status?: number } })?.response?.status;
          if (pvaStatus && pvaStatus !== 404) {
            throw pvaError;
          }
        }

        // Fallback to legacy planned-earned-value endpoint when new API is unavailable.
        const response = await plannedEarnedValueApi.getByProjectMonthYear(projectName, month, year);
        const period = normalizePlannedEarnedByPeriod(response.data, projectName);
        setPlannedEarnedByPeriod(period);
        setPvaVelocityTrend({
          year,
          sclMonths: [],
          contractorMonths: [],
          current: {
            scl: period.scl
              ? {
                  planned: period.scl.plannedValue,
                  actual: period.scl.earnedValue,
                  collection: period.scl.collection ?? 0,
                }
              : null,
            contractor: period.contractor
              ? {
                  planned: period.contractor.plannedValue,
                  actual: period.contractor.earnedValue,
                  collection: period.contractor.collection ?? 0,
                }
              : null,
          },
        });
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setPlannedEarnedByPeriod({
            projectName,
            month,
            year,
            scl: null,
            contractor: null,
          });
          setPvaVelocityTrend(null);
        } else {
          console.error('Error fetching planned vs actual value:', error);
          setPlannedEarnedByPeriod(null);
          setPvaVelocityTrend(null);
          setPlannedEarnedError(getApiErrorMessage(error, 'Unable to load Planned vs Actual Value'));
        }
      } finally {
        setIsLoadingPlannedEarned(false);
      }
    };
    fetchPlannedEarnedValueData();
  }, [selectedProject?.title, healthSafetySelectedMonth, healthSafetySelectedYear, financialDataVersion]);

  // Fetch Project Logs (Issues/Concerns + Risks/Actions) when selected project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setBottleneckItems([]);
      return;
    }

    projectLogsApi.getProjectLogs(selectedProjectId)
      .then(response => {
        const data = response.data || {};
        const entries: unknown[] = data.entries || [];
        setBottleneckItems(parseBottleneckFromProjectLogEntries(entries));
      })
      .catch(() => {
        setBottleneckItems([]);
      });
  }, [selectedProjectId]);

  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const hasImportedSclValues = Boolean(
    dashboardData?.original_contract_value ||
    dashboardData?.excess_value ||
    dashboardData?.approved_vo ||
    dashboardData?.revised_contract_value ||
    dashboardData?.revised_value ||
    dashboardData?.saving ||
    dashboardData?.pending_vo
  );
  const importedSclContractValue: ContractValueRecord | null = hasImportedSclValues ? {
    projectName: selectedProject?.title || '',
    contractType: 'SCL',
    originalContractValue: toNum(dashboardData?.original_contract_value),
    approvedVO: toNum(dashboardData?.excess_value ?? dashboardData?.approved_vo),
    revisedContractValue: toNum(dashboardData?.revised_value ?? dashboardData?.revised_contract_value),
    potentialPendingVO: toNum(dashboardData?.saving ?? dashboardData?.pending_vo),
    cosExtraItem: toNum(
      (dashboardData as { cos?: unknown; Cos?: unknown; cosExtraItem?: unknown; cos_extra_item?: unknown } | null | undefined)
        ?.cos ??
        (dashboardData as { Cos?: unknown } | null | undefined)?.Cos ??
        (dashboardData as { cosExtraItem?: unknown } | null | undefined)?.cosExtraItem ??
        (dashboardData as { cos_extra_item?: unknown } | null | undefined)?.cos_extra_item,
    ),
    growthPercentage: toNum(dashboardData?.growth_percentage),
  } : null;
  const sclContractValue = contractValuesData.SCL || importedSclContractValue;

  const hasImportedPmcInvoicing = Boolean(
    dashboardData?.gross_billed ||
    dashboardData?.gross_certified_billed ||
    dashboardData?.difference ||
    dashboardData?.certification_efficiency ||
    dashboardData?.net_billed ||
    dashboardData?.net_collected
  );
  const importedPmcInvoicing: InvoicingRecord | null = hasImportedPmcInvoicing ? normalizeInvoicingRecord({
    gross_billed: dashboardData?.gross_billed,
    gross_certified_billed: dashboardData?.gross_certified_billed ?? dashboardData?.net_billed,
    difference: dashboardData?.difference ?? dashboardData?.net_collected,
    certification_efficiency: dashboardData?.certification_efficiency,
  }, selectedProject?.title || '', 'PMC') : null;
  const pmcInvoicing = invoicingData.PMC || importedPmcInvoicing;

  // Safety stats from health & safety dashboard or legacy dashboard import
  const currentHealthSafetyRecord = healthSafetyDashboard?.currentMonth
    ?? healthSafetyDashboard?.monthlyRecords.find(
      (row) => row.month === healthSafetySelectedMonth && row.year === healthSafetySelectedYear
    )
    ?? null;

  const safetyStats = currentHealthSafetyRecord ? {
    fatalities: currentHealthSafetyRecord.fatalities || 0,
    significant: currentHealthSafetyRecord.significant || 0,
    major: currentHealthSafetyRecord.major || 0,
    minor: currentHealthSafetyRecord.minor || 0,
    nearMiss: currentHealthSafetyRecord.nearMiss || 0,
    totalManhours: currentHealthSafetyRecord.totalManhours || currentHealthSafetyRecord.manHoursWorked || 0,
    lossOfManhours: currentHealthSafetyRecord.lossOfManhours || 0,
    averageDailyManpower: currentHealthSafetyRecord.averageDailyManpower || 0,
    workingDays: currentHealthSafetyRecord.workingDays || 0,
    manDaysWorked: currentHealthSafetyRecord.manDaysWorked || 0,
    manHoursWorked: currentHealthSafetyRecord.manHoursWorked || 0,
    reportableAccidentLti: currentHealthSafetyRecord.reportableAccidentLti || 0,
    dangerousOccurrences: currentHealthSafetyRecord.dangerousOccurrences || 0,
    firstAidCases: currentHealthSafetyRecord.firstAidCases || 0,
    medicalTreatmentCases: currentHealthSafetyRecord.medicalTreatmentCases || 0,
    utilityDamage: currentHealthSafetyRecord.utilityDamage || 0,
    internalTrainingCount: currentHealthSafetyRecord.internalTrainingCount || 0,
    internalTrainingHours: currentHealthSafetyRecord.internalTrainingHours || 0,
    externalTrainingCount: currentHealthSafetyRecord.externalTrainingCount || 0,
    externalTrainingHours: currentHealthSafetyRecord.externalTrainingHours || 0,
    mockDrills: currentHealthSafetyRecord.mockDrills || 0,
    medicalCheckupWorkers: currentHealthSafetyRecord.medicalCheckupWorkers || 0,
    medicalCheckupStaff: currentHealthSafetyRecord.medicalCheckupStaff || 0,
    medicalCheckupTotal: currentHealthSafetyRecord.medicalCheckupTotal || 0,
  } : {
    fatalities: dashboardData?.fatalities || 0,
    significant: dashboardData?.significant || 0,
    major: dashboardData?.major || 0,
    minor: dashboardData?.minor || 0,
    nearMiss: dashboardData?.near_miss || 0,
    totalManhours: dashboardData?.total_manhours || 0,
    lossOfManhours: dashboardData?.loss_of_manhours || 0
  };

  const lastCostRow =
    costPerformanceData.length > 0 ? costPerformanceData[costPerformanceData.length - 1] : null;

  const pevScl = plannedEarnedByPeriod?.scl;
  const plannedValue =
    pevScl?.plannedValue ??
    toNum(dashboardData?.planned_value) ??
    toNum(lastCostRow?.bcws);
  const earnedValue =
    pevScl?.earnedValue ??
    toNum(dashboardData?.earned_value);
  const variance = pevScl?.variance ?? earnedValue - plannedValue;
  const earnedPercentOfPlanned =
    pevScl?.performancePercentage ?? (plannedValue > 0 ? (earnedValue / plannedValue) * 100 : 0);
  const variancePercent = plannedValue > 0 ? ((earnedValue - plannedValue) / plannedValue) * 100 : 0;

  const bcwp = toNum(dashboardData?.bcwp) || toNum(lastCostRow?.bcwp);
  const ac = toNum(dashboardData?.ac) || toNum(lastCostRow?.acwp);
  const costVariance = bcwp - ac;
  const costVariancePercent = bcwp > 0 ? ((bcwp - ac) / bcwp) * 100 : 0;

  const billedValue = contractPerformanceData?.billedValue ?? 0;
  const actualReceiptValue = contractPerformanceData?.actualReceiptValue ?? 0;
  const receiptVariance = contractPerformanceData?.variance ?? 0;
  const performancePercentage = contractPerformanceData?.performancePercentage ?? 0;
  const receiptVariancePercentage = contractPerformanceData?.variancePercentage ?? 0;

  const pctOf = (num: number, den: number) =>
    den > 0 && Number.isFinite(num) && Number.isFinite(den) ? (num / den) * 100 : 0;

  const bcwpPctOfPlanned = pctOf(bcwp, plannedValue);
  const acPctOfPlanned = pctOf(ac, plannedValue);
  const cpiGaugePct = pctOf(bcwp, ac);

  // Progress S-Curve data from API or empty array
  const progressSCurveData = projectProgressData.length > 0 ? projectProgressData : [];

  const dashboardMetrics = computeProjectDashboardMetrics({
    progressChart: progressSCurveData,
    projectDatesBundle: projectDatesBundle ?? null,
    costPerformanceRows: costPerformanceData,
    manpowerRows: manpowerDataState.map((row) => ({
      planned: toNum(row.planned),
      actual: toNum(row.actual),
    })),
    hseMetrics: toIncidentMetrics(currentHealthSafetyRecord ?? safetyStats),
    hasHseData: Boolean(
      currentHealthSafetyRecord || healthSafetyDashboard?.ytdSummary || dashboardData,
    ),
    bottleneckItems,
    drawingApprovalRate: drawingProjectSummary?.approvalRate ?? null,
    hasDrawingData: Boolean(drawingProjectSummary),
    dashboardData: (dashboardData as Record<string, unknown>) ?? null,
    plannedEarnedScl: pevScl
      ? {
        plannedValue: toNum(pevScl.plannedValue),
        earnedValue: toNum(pevScl.earnedValue),
        performancePercentage: pevScl.performancePercentage,
      }
      : null,
    dprCount: 0,
  });

  const summaryDelayDays = dashboardMetrics.delayDays ?? 0;
  const overallProgressPct = dashboardMetrics.overallProgressPct;

  const progressSparkline = progressSCurveData
    .slice(-8)
    .map((p: { cumulativeActual?: number; actual?: number }) =>
      Number(p.cumulativeActual ?? p.actual ?? 0)
    );

  const executiveProgressTrend = useMemo(
    () => buildExecutiveProgressCurveData(progressSCurveData, 10),
    [progressSCurveData],
  );

  const executiveManpowerTrend = useMemo(
    () =>
      manpowerDataState.slice(-8).map((row: { month?: string; month_year?: string; planned?: number; actual?: number; planned_manpower?: number; actual_manpower?: number }) => ({
        month: String(row.month ?? row.month_year ?? ''),
        planned: Number(row.planned ?? row.planned_manpower ?? 0),
        actual: Number(row.actual ?? row.actual_manpower ?? 0),
      })),
    [manpowerDataState],
  );

  const executiveCostPerformanceTrend = useMemo(
    () =>
      costPerformanceData.slice(-8).map((row: { month?: string; month_year?: string; bcws?: number; bcwp?: number; acwp?: number; fcst?: number }) => ({
        month: String(row.month ?? row.month_year ?? ''),
        bcws: Number(row.bcws ?? 0),
        bcwp: Number(row.bcwp ?? 0),
        acwp: Number(row.acwp ?? 0),
        fcst: Number(row.fcst ?? 0),
      })),
    [costPerformanceData],
  );

  const executiveContractSnapshot = useMemo(
    () =>
      buildExecutiveContractSnapshot(
        sclContractValue,
        pmcInvoicing,
        bcwp,
        ac,
        costVariance,
        cpiGaugePct,
      ),
    [sclContractValue, pmcInvoicing, bcwp, ac, costVariance, cpiGaugePct],
  );

  const executiveQualityPct = qualityMonthlyRecord?.qualityPerformance;
  const executiveQualitySnapshot = useMemo(
    () => buildExecutiveQualitySnapshot(qualityMonthlyRecord),
    [qualityMonthlyRecord],
  );

  const executiveCorrespondenceStats = useMemo(() => {
    const cumulativePeriod = selectedProject?.title
      ? aggregateCorrespondenceCumulativePeriod(
          correspondenceYearPeriods,
          correspondenceSelectedMonth,
          correspondenceSelectedYear,
          selectedProject.title,
        )
      : null;

    return resolveExecutiveCorrespondenceStats({
      dashboard: correspondenceDashboard,
      cumulativePeriod,
      period: correspondencePeriod,
      summary: correspondenceProjectSummary,
    });
  }, [
    correspondenceDashboard,
    correspondencePeriod,
    correspondenceProjectSummary,
    correspondenceYearPeriods,
    correspondenceSelectedMonth,
    correspondenceSelectedYear,
    selectedProject?.title,
  ]);

  const handleExecutiveNavigate = useCallback((tab: PMCExecutiveTab, anchor?: ExecutiveOverviewAnchor) => {
    let targetTab = tab;
    let targetAnchor = anchor;

    if (anchor === 'hse') {
      targetTab = 'risk';
      targetAnchor = 'risk';
    } else if (anchor === 'quality') {
      targetTab = 'compliance';
    }

    setExecTab(targetTab);
    if (targetAnchor) {
      scrollToOverviewSection(targetAnchor, 'pmc-head');
    }
  }, []);

  let progressDeltaLabel: string | undefined;
  if (progressSCurveData.length >= 2) {
    const prev = progressSCurveData[progressSCurveData.length - 2];
    const last = progressSCurveData[progressSCurveData.length - 1];
    const prevVal = Number(prev.cumulativeActual ?? prev.actual ?? 0);
    const lastVal = Number(last.cumulativeActual ?? last.actual ?? 0);
    const delta = lastVal - prevVal;
    if (Math.abs(delta) >= 0.1) {
      progressDeltaLabel = `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(0)}% vs last month`;
    }
  }

  const criticalRisksCount = dashboardMetrics.criticalRisks;
  const drawingApprovalPct = dashboardMetrics.drawingApprovalPct;
  const projectHealthSummary = dashboardMetrics.projectHealth;

  const sclDelayDays = Math.abs(
    toNum(projectDatesBundle?.scl?.current_delay ?? projectDatesBundle?.scl?.delay_days),
  );
  const contractorDelayDays = maxContractorDelay(projectContractors);
  const selectedContractorRecord = resolveSelectedContractor(
    projectContractors,
    selectedContractorId,
  );
  const selectedContractorName = contractorDisplayName(contractorLabel(selectedContractorRecord));

  const selectedContractorContractValue = useMemo(
    () =>
      pickRecordForContractor(contractorContractValuesList, selectedContractorName) ??
      contractValuesData.Contractor,
    [contractorContractValuesList, selectedContractorName, contractValuesData.Contractor],
  );

  const selectedContractorInvoicing = useMemo(
    () =>
      pickRecordForContractor(contractorInvoicingList, selectedContractorName) ??
      invoicingData.Contractor,
    [contractorInvoicingList, selectedContractorName, invoicingData.Contractor],
  );

  const useGlobalContractorFilter = projectContractors.length > 0;
  const showTlOverview = isPmcTeamLead && teamLeaderView === 'overview';

  const executiveMetrics = {
    projectHealth: projectHealthSummary,
    overallProgressPct,
    progressDeltaLabel,
    summaryDelayDays,
    sclDelayDays,
    contractorDelayDays,
    criticalRisks: criticalRisksCount,
    healthSafetyLabel: dashboardMetrics.healthSafetyStatus.label,
    healthSafetySublabel: dashboardMetrics.healthSafetyStatus.sublabel,
    drawingApprovalPct,
    cpiPct: cpiGaugePct,
    contractValueLabel: sclContractValue?.revisedContractValue
      ? formatIndianCurrencyCompact(sclContractValue.revisedContractValue)
      : '—',
    openBottleneckCount: bottleneckItems.filter(
      (i) => i.status !== 'Closed' && i.description.trim(),
    ).length,
  };

  const tlOverviewMetrics: TeamLeaderOverviewMetrics = {
    projectHealth: executiveMetrics.projectHealth,
    overallProgressPct: executiveMetrics.overallProgressPct,
    progressDeltaLabel: executiveMetrics.progressDeltaLabel,
    summaryDelayDays: executiveMetrics.summaryDelayDays,
    sclDelayDays: executiveMetrics.sclDelayDays,
    contractorDelayDays: executiveMetrics.contractorDelayDays,
    criticalRisks: executiveMetrics.criticalRisks,
    healthSafetyLabel: executiveMetrics.healthSafetyLabel,
    drawingApprovalPct: executiveMetrics.drawingApprovalPct,
    cpiPct: executiveMetrics.cpiPct,
    contractValueLabel: executiveMetrics.contractValueLabel,
    openBottleneckCount: executiveMetrics.openBottleneckCount,
  };

  const overviewLiveReady =
    !isLoadingProjectProgress && !isLoadingProjectDates && Boolean(selectedProject);

  const resolvedOverviewCache = useMemo(() => {
    if (!showTlOverview || !selectedProject?.id || !currentUser.id) return null;
    if (tlOverviewCache?.projectId === selectedProject.id) return tlOverviewCache;
    return readTeamLeaderOverviewCache(currentUser.id, selectedProject.id);
  }, [showTlOverview, selectedProject?.id, currentUser.id, tlOverviewCache]);

  const tlOverviewDisplay = useMemo(() => {
    if (!showTlOverview || !selectedProject) return null;

    if (resolvedOverviewCache) {
      return {
        project: {
          ...selectedProject,
          title: resolvedOverviewCache.projectTitle || selectedProject.title,
          location: resolvedOverviewCache.projectLocation ?? selectedProject.location,
        },
        metrics: resolvedOverviewCache.metrics,
        progressTrend: resolvedOverviewCache.progressTrend,
        healthSafetySublabel: resolvedOverviewCache.healthSafetySublabel,
        sclDates: resolvedOverviewCache.sclDates,
        contractorDates: resolvedOverviewCache.contractorDates,
        decisionQueueOverride: resolvedOverviewCache.decisionQueue,
        openIssuesCountOverride: resolvedOverviewCache.openIssuesCount,
        isRefreshingLiveData: false,
      };
    }

    if (overviewLiveReady) {
      return {
        project: selectedProject,
        metrics: tlOverviewMetrics,
        progressTrend: executiveProgressTrend,
        healthSafetySublabel: dashboardMetrics.healthSafetyStatus.sublabel,
        sclDates: projectDatesBundle?.scl ?? null,
        contractorDates: selectedContractorRecord,
        decisionQueueOverride: undefined as ExecutiveDecisionItem[] | undefined,
        openIssuesCountOverride: undefined as number | undefined,
        isRefreshingLiveData: false,
      };
    }

    return {
      project: selectedProject,
      metrics: tlOverviewMetrics,
      progressTrend: executiveProgressTrend,
      healthSafetySublabel: dashboardMetrics.healthSafetyStatus.sublabel,
      sclDates: projectDatesBundle?.scl ?? null,
      contractorDates: selectedContractorRecord,
      decisionQueueOverride: undefined,
      openIssuesCountOverride: undefined,
      isRefreshingLiveData: true,
    };
  }, [
    showTlOverview,
    selectedProject,
    resolvedOverviewCache,
    overviewLiveReady,
    tlOverviewMetrics,
    executiveProgressTrend,
    dashboardMetrics.healthSafetyStatus.sublabel,
    projectDatesBundle?.scl,
    selectedContractorRecord,
  ]);

  useEffect(() => {
    if (!isPmcTeamLead || !selectedProject?.id) {
      setTlOverviewCache(null);
      return;
    }
    const cached = readTeamLeaderOverviewCache(currentUser.id, selectedProject.id);
    setTlOverviewCache(cached);
    if (!cached) {
      tlOverviewCacheSavedRef.current = null;
    }
  }, [isPmcTeamLead, selectedProject?.id, currentUser.id]);

  useEffect(() => {
    if (!overviewLiveReady || !showTlOverview || !selectedProject) return;
    if (projectProgressData.length === 0) return;

    const saveKey = `${selectedProject.id}:${executiveProgressTrend.length}:${tlOverviewMetrics.overallProgressPct}`;
    if (tlOverviewCacheSavedRef.current === saveKey) return;

    const payload = buildTeamLeaderOverviewCachePayload({
      projectId: selectedProject.id,
      projectTitle: selectedProject.title,
      projectLocation: selectedProject.location,
      metrics: tlOverviewMetrics,
      progressTrend: executiveProgressTrend,
      healthSafetySublabel: dashboardMetrics.healthSafetyStatus.sublabel,
      sclDates: projectDatesBundle?.scl ?? null,
      contractorDates: selectedContractorRecord,
      bottleneckItems,
    });

    writeTeamLeaderOverviewCache(currentUser.id, payload);
    setTlOverviewCache(payload);
    tlOverviewCacheSavedRef.current = saveKey;
  }, [
    overviewLiveReady,
    showTlOverview,
    selectedProject,
    tlOverviewMetrics,
    executiveProgressTrend,
    dashboardMetrics.healthSafetyStatus.sublabel,
    projectDatesBundle?.scl,
    selectedContractorRecord,
    bottleneckItems,
    currentUser.id,
    projectProgressData.length,
  ]);

  const tabVisible = (tab: PMCExecutiveTab) => !isPMCHead || execTab === tab;
  const showProjectSections =
    (isPMCHead ? execTab !== 'overview' : isPmcTeamLead ? teamLeaderView === 'full' : true);

  useEffect(() => {
    if (!isPmcTeamLead || teamLeaderView !== 'full' || !teamLeaderScrollSection) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`tl-section-${teamLeaderScrollSection}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onTeamLeaderScrollSectionConsumed?.();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [
    isPmcTeamLead,
    teamLeaderView,
    teamLeaderScrollSection,
    onTeamLeaderScrollSectionConsumed,
  ]);

  // Cash flow data from API or empty array



  const submittalData = [
    { category: 'Material A', planned: 800, actual: 720 },
    { category: 'Material B', planned: 600, actual: 540 }
  ];

  // Manpower data from API or empty array
  const manpowerData = manpowerDataState.length > 0 ? manpowerDataState : [];

  const manpowerDonutData = [
    { name: 'Planned', value: 75, color: '#4f46e5' },
    { name: 'Actual', value: 25, color: '#f59e0b' }
  ];

  const buildReportExportInput = (): ProjectReportExportInput | null => {
    if (!selectedProject) return null;

    const role = getBackendRole(currentUser.role);
    const bcws = toNum(lastCostRow?.bcws);

    return {
      project: selectedProject,
      reportDate: formatReportTodayDate(),
      machineryRole: role,
      projectDates: {
        scl: projectDatesBundle?.scl ?? null,
        contractor: selectedContractorRecord,
      },
      contractValues: {
        scl: sclContractValue,
        contractor: selectedContractorContractValue,
      },
      invoicing: {
        scl: pmcInvoicing,
        contractor: selectedContractorInvoicing,
      },
      plannedEarned: plannedEarnedByPeriod,
      internalCost: {
        bcws,
        bcwp,
        acwp: ac,
      },
      contractPerformance: contractPerformanceData,
      costPerformanceData,
      manpowerData: manpowerDataState,
      cashflowData: cashflowDataState,
      projectProgressData,
      budgetPerformanceData,
      safetyStats,
      healthSafetyDashboard,
      qualityMonthlyRecord,
      qualityYearRecords,
      drawingMonthlyRecord,
      drawingProjectSummary,
      drawingYearRecords,
      correspondence: {
        period: correspondencePeriod,
        summary: correspondenceProjectSummary,
      },
      equipmentData: equipmentDataState,
      bottleneckItems,
    };
  };

  const exportProjectDataExcel = async () => {
    const input = buildReportExportInput();
    if (!input) return;
    await downloadProjectReportXlsx(input);
  };

  if (allProjects.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] text-center p-8 rounded-[3rem] border ${themeClasses.glassCard} ${themeClasses.border}`}>
        <div className={`p-6 rounded-full mb-6 ${themeClasses.bgSecondary}`}>
          <Icons.Project className={`${themeClasses.textMuted}`} size={48} />
        </div>
        <h3 className={`text-xl font-black uppercase tracking-tighter mb-2 ${themeClasses.textPrimary}`}>
          No Projects Available
        </h3>
        <p className={`text-sm font-bold uppercase tracking-widest max-w-md ${themeClasses.textSecondary}`}>
          No projects found in the system. Please contact administrator.
        </p>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] text-center p-8 rounded-[3rem] border ${themeClasses.glassCard} ${themeClasses.border}`}>
        <div className={`p-6 rounded-full mb-6 ${themeClasses.bgSecondary}`}>
          <Icons.Project className={`${themeClasses.textMuted}`} size={48} />
        </div>
        <h3 className={`text-xl font-black uppercase tracking-tighter mb-2 ${themeClasses.textPrimary}`}>
          No Project Selected
        </h3>
        <p className={`text-sm font-bold uppercase tracking-widest max-w-md ${themeClasses.textSecondary}`}>
          Please select a project from the dropdown above.
        </p>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-[1680px] -mt-2 md:-mt-4 space-y-2 px-2 pb-2 sm:px-3 sm:pb-3 md:px-0 md:pb-0 animate-in fade-in duration-500 relative${isPMCHead ? ` ${getPmcExecutiveTheme(isDarkTheme).pageShell}` : ''}`}>
      <DashboardToastStack toasts={toasts} />

      {isPMCHead && (
        <PMCHeadExecutiveShell
          projects={allProjects}
          selectedProject={selectedProject}
          selectedProjectId={selectedProjectId}
          onProjectChange={(id) => {
            setSelectedProjectId(id);
            onViewProject(id);
          }}
          onExport={exportProjectDataExcel}
          activeTab={execTab}
          onTabChange={setExecTab}
          metrics={executiveMetrics}
          bottleneckItems={bottleneckItems}
          onJumpToTab={setExecTab}
          onNavigate={handleExecutiveNavigate}
          sclDates={projectDatesBundle?.scl ?? null}
          contractorDates={selectedContractorRecord}
          progressTrend={executiveProgressTrend}
          manpowerTrend={executiveManpowerTrend}
          costPerformanceTrend={executiveCostPerformanceTrend}
          qualityPerformancePct={executiveQualityPct}
          qualitySnapshot={executiveQualitySnapshot}
          correspondenceStats={executiveCorrespondenceStats}
          contractSnapshot={executiveContractSnapshot}
          pvaVelocity={pvaVelocityTrend}
        />
      )}

      {showTlOverview && tlOverviewDisplay && (
        <TeamLeaderOverviewShell
          project={tlOverviewDisplay.project}
          metrics={tlOverviewDisplay.metrics}
          progressTrend={tlOverviewDisplay.progressTrend}
          bottleneckItems={bottleneckItems}
          sclDates={tlOverviewDisplay.sclDates}
          contractorDates={tlOverviewDisplay.contractorDates}
          healthSafetySublabel={tlOverviewDisplay.healthSafetySublabel}
          decisionQueueOverride={tlOverviewDisplay.decisionQueueOverride}
          openIssuesCountOverride={tlOverviewDisplay.openIssuesCountOverride}
          isRefreshingLiveData={tlOverviewDisplay.isRefreshingLiveData}
          manpowerTrend={executiveManpowerTrend}
          costPerformanceTrend={executiveCostPerformanceTrend}
          qualityPerformancePct={executiveQualityPct}
          qualitySnapshot={executiveQualitySnapshot}
          correspondenceStats={executiveCorrespondenceStats}
          contractSnapshot={executiveContractSnapshot}
          pvaVelocity={pvaVelocityTrend}
          onExport={exportProjectDataExcel}
          onOpenFullView={(section) => {
            onTeamLeaderViewChange?.('full');
            if (section) {
              window.setTimeout(() => {
                const target = document.getElementById(teamLeaderSectionElementId(section));
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 150);
            }
          }}
        />
      )}

      {!isPMCHead && !showTlOverview && (
        <>
          {/* Header — responsive: stacked mobile → 2-row tablet → single row desktop */}
          <div className={`mt-1 overflow-hidden rounded-2xl border px-3 py-3 sm:px-4 sm:py-3.5 lg:px-5 ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 xl:gap-6">
              {/* Project + date cluster */}
              <div className="flex min-w-0 flex-1 flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:gap-4 xl:gap-6">
                {/* Project name */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${isDarkTheme ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Icons.Building size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`${typo.headerEyebrow} mb-0.5 leading-none ${themeClasses.textSecondary}`}>
                      Project Name
                    </p>
                    <h2 className={`${typo.headerTitle} line-clamp-2 break-words ${themeClasses.textPrimary} sm:line-clamp-1`}>
                      {selectedProject.title}
                    </h2>
                    {selectedProject.location && (
                      <p className={`mt-0.5 truncate text-[10px] font-semibold sm:text-xs ${themeClasses.textSecondary}`}>
                        {selectedProject.location}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className={`hidden min-[520px]:block h-9 w-px shrink-0 ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}
                  aria-hidden
                />

                {/* Report date */}
                <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3 min-[520px]:max-w-[min(100%,16rem)] lg:max-w-none">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${isDarkTheme ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Icons.Calendar size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className={`${typo.headerEyebrow} mb-0.5 leading-none ${themeClasses.textSecondary}`}>
                      Report Date
                    </p>
                    <div className="flex min-w-0 flex-col gap-0 min-[380px]:flex-row min-[380px]:flex-wrap min-[380px]:items-baseline min-[380px]:gap-x-2">
                      <h2 className={`${typo.headerTitle} ${themeClasses.textPrimary}`}>
                        {currentDate}
                      </h2>
                      <span className={`${typo.headerWeekday} ${themeClasses.textSecondary}`}>
                        {currentDay}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`h-px w-full shrink-0 min-[520px]:hidden ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}
                aria-hidden
              />

              <div
                className={`hidden min-[520px]:block h-9 w-px shrink-0 lg:hidden ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}
                aria-hidden
              />

              {/* Actions */}
              <div className="grid w-full grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:flex lg:w-auto lg:shrink-0 lg:items-center">
                <button
                  type="button"
                  onClick={exportProjectDataExcel}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 ${typo.button} transition-all lg:py-2 ${isDarkTheme
                    ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/40'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  title="Export management report as Excel workbook"
                >
                  <Icons.Download size={16} className="shrink-0" />
                  <span className="truncate">Export Excel</span>
                </button>

                {!showProjectsAnalyticsTour && (
                  <button
                    type="button"
                    onClick={() => {
                      startAnalyticsTour();
                    }}
                    className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2.5 ${typo.bodyBold} text-white shadow transition-all hover:from-indigo-700 hover:to-blue-700 active:scale-[0.985] lg:py-2`}
                  >
                    <Icons.Info size={16} className="shrink-0" />
                    <span className="truncate">Analytics Walkthrough</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <ProjectDashboardSummary
            projectHealth={projectHealthSummary}
            overallProgressPct={overallProgressPct}
            progressDeltaLabel={progressDeltaLabel}
            progressSparkline={progressSparkline}
            delayDays={summaryDelayDays}
            criticalRisks={criticalRisksCount}
            healthSafetyStatus={dashboardMetrics.healthSafetyStatus}
            drawingApprovalPct={drawingApprovalPct}
          />
        </>
      )}

      {showProjectSections && (
        <PMCExecutiveDetailFrame active={isPMCHead}>
          <>
            {isPMCHead && tabVisible('schedule') && (
              <div id="exec-section-schedule">
              <PMCHeadScheduleSection
                role={currentUser.role}
                projectName={selectedProject?.title}
                scl={projectDatesBundle?.scl ?? null}
                contractors={projectContractors}
                selectedContractorId={selectedContractorId}
                onSelectContractor={setSelectedContractorId}
                sclBgEntries={mapBgEntriesApi(projectDatesBundle?.scl_bg ?? [])}
                contractorBgEntries={mapBgEntriesApi(projectDatesBundle?.contractor_bg ?? [])}
                bgSummary={projectDatesBundle?.bg_summary ?? null}
                isLoading={isLoadingProjectDates && !projectDatesSectionCache}
                error={projectDatesError}
                onEditScl={openEditSclModal}
                onEditContractor={openEditContractorModal}
                onAddContractor={openAddContractorModal}
                onDeleteContractor={handleDeleteContractor}
                onManageBg={openBgStatusModal}
              >
                <PMCExecutivePanel title="Site Photos" subtitle="Latest on-site construction imagery">
                  <SitePhotosCard
                    embedded
                    className="w-full"
                    projectName={selectedProject?.title}
                    month={correspondenceSelectedMonth}
                    year={correspondenceSelectedYear}
                    onViewAll={() => onNavigate?.('site_photos')}
                  />
                </PMCExecutivePanel>
              </PMCHeadScheduleSection>
              </div>
            )}

            {isPMCHead && tabVisible('money') && (
              <div id="exec-section-financial">
              <PMCHeadMoneySection
                sclContractValue={sclContractValue}
                contractorContractValue={selectedContractorContractValue}
                contractorDisplayName={selectedContractorName}
                pmcInvoicing={pmcInvoicing}
                contractorInvoicing={selectedContractorInvoicing}
                isLoadingContractValues={isLoadingContractValues}
                sclContractError={contractValuesErrors.SCL}
                contractorContractError={contractValuesErrors.Contractor}
                isLoadingInvoicing={isLoadingInvoicing}
                pmcInvoicingError={invoicingErrors.PMC}
                contractorInvoicingError={invoicingErrors.Contractor}
              />
              </div>
            )}

            {!isPMCHead && selectedProject && (
              <div id="tl-section-contractor" className="exec-section-schedule">
              <ContractorManagementDashboard
                project={selectedProject}
                userId={currentUser.id}
                userRole={currentUser.role}
                dataRevision={contractorDashboardRevision}
                showProjectDates
                showFinancial
                onNavigateFinancial={(section) =>
                  onNavigate?.({ tab: 'financial_management', section, returnTab: 'team_projects' })
                }
                onEditSclDates={openEditSclModal}
                onEditContractorDates={openEditContractorModal}
                onAddContractorSchedule={openAddContractorModal}
                onDeleteContractorSchedule={handleDeleteContractor}
                onManageBg={() => openBgStatusModal('all')}
                onContractorCreated={(record) => {
                  bumpContractorDashboard();
                  showToast(`Contractor "${record.contractor_name}" added successfully`);
                }}
              />
              </div>
            )}

            <section id="tl-section-financial" className="exec-section-financial space-y-3.5">
              {tabVisible('money') && (
                isPMCHead ? (
                  <PMCHeadMoneyKpiSection
                    plannedEarnedByPeriod={plannedEarnedByPeriod}
                    isLoadingPlannedEarned={isLoadingPlannedEarned}
                    plannedEarnedError={plannedEarnedError}
                    cpiGaugePct={cpiGaugePct}
                    bcwp={bcwp}
                    ac={ac}
                    costVariance={costVariance}
                    contractPerformanceData={contractPerformanceData}
                    performancePercentage={performancePercentage}
                    isLoadingContractPerformance={isLoadingContractPerformance}
                    contractPerformanceError={contractPerformanceError}
                    billedValue={billedValue}
                    actualReceiptValue={actualReceiptValue}
                    receiptVariance={receiptVariance}
                    contractorDisplayName={selectedContractorName}
                  />
                ) : (
                <>
                  <div className="earned-value-kpi-row space-y-3">
                    <PlannedEarnedValueGroupCard
                      className="planned-earned-value-tour-group joyride-target-stable w-full min-h-[320px]"
                      sclData={plannedEarnedByPeriod?.scl ?? null}
                      contractorData={plannedEarnedByPeriod?.contractor ?? null}
                      contractorSectionTitle={plannedValueSectionTitle('Contractor', selectedContractorName)}
                      groupSubtitle="SCL & Contractor performance"
                      isLoading={isLoadingPlannedEarned}
                      sclError={plannedEarnedError}
                      contractorError={plannedEarnedError}
                      onEdit={() => onNavigate?.({ tab: 'financial_management', section: 'earned_value' })}
                      headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.plannedVsEarnedValue} />}
                    />

                    <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
                      <FullScreenCard
                        title="Internal Cost Performance"
                        className="internal-cost-card joyride-target-stable min-h-[320px]"
                        onEdit={() => onNavigate?.({ tab: 'financial_management', section: 'cost' })}
                        editTitle="Edit in Financial Management"
                      >
                        <PerformanceHighlightCard
                          className="h-full !min-h-[300px] !rounded-xl !border-0 !shadow-none"
                          title="INTERNAL COST PERFORMANCE"
                          icon={<Icons.Finance size={14} />}
                          performancePercent={cpiGaugePct}
                          performanceLabel="Cost Performance Index"
                          status={getCostPerformanceStatus(cpiGaugePct)}
                          showTbdOverlay
                          metrics={[
                            { label: 'BCWP', value: formatIndianCurrencyCompact(bcwp), valueClassName: KPI_METRIC_COLORS.primary },
                            { label: 'AC', value: formatIndianCurrencyCompact(ac), valueClassName: KPI_METRIC_COLORS.primary },
                            {
                              label: 'Variance',
                              value: formatIndianCurrencyCompact(costVariance, { showSign: true }),
                              valueClassName: costVariance >= 0 ? KPI_METRIC_COLORS.positive : KPI_METRIC_COLORS.negative,
                            },
                          ]}
                          headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.projectCostPerformance} />}
                        />
                      </FullScreenCard>

                      <FullScreenCard
                        title="Contract Performance"
                        className="contract-performance-card joyride-target-stable min-h-[320px]"
                        onEdit={() => onNavigate?.({ tab: 'financial_management', section: 'contract' })}
                        editTitle="Edit in Financial Management"
                      >
                        <PerformanceHighlightCard
                          className="h-full !min-h-[300px] !rounded-xl !border-0 !shadow-none"
                          title="CONTRACT PERFORMANCE"
                          icon={<Icons.Document size={14} />}
                          performancePercent={contractPerformanceData ? performancePercentage : 0}
                          performanceLabel="Collection Performance"
                          status={getCollectionPerformanceStatus(contractPerformanceData ? performancePercentage : 0)}
                          showTbdOverlay
                          isLoading={isLoadingContractPerformance}
                          error={contractPerformanceError}
                          emptyMessage="No contract performance data"
                          isEmpty={!isLoadingContractPerformance && !contractPerformanceError && !contractPerformanceData}
                          metrics={
                            contractPerformanceData
                              ? [
                                { label: 'Billed Value', value: formatIndianCurrencyCompact(billedValue), valueClassName: KPI_METRIC_COLORS.primary },
                                { label: 'Receipt Value', value: formatIndianCurrencyCompact(actualReceiptValue), valueClassName: KPI_METRIC_COLORS.primary },
                                {
                                  label: 'Variance',
                                  value: formatIndianCurrencyCompact(receiptVariance, { showSign: true }),
                                  valueClassName: receiptVariance >= 0 ? KPI_METRIC_COLORS.positive : KPI_METRIC_COLORS.negative,
                                },
                              ]
                              : [
                                { label: 'Billed Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
                                { label: 'Receipt Value', value: '—', valueClassName: KPI_METRIC_COLORS.primary },
                                { label: 'Variance', value: '—', valueClassName: KPI_METRIC_COLORS.muted },
                              ]
                          }
                          headerActions={<FormulaInfoButton {...DASHBOARD_FORMULAS.contractPerformance} />}
                        />
                      </FullScreenCard>
                    </div>
                  </div>
                </>
                )
              )}

              {tabVisible('risk') && (
                isPMCHead ? (
                  <div id="exec-section-risk">
                  <PMCHeadRiskSection
                    bottleneckItems={bottleneckItems}
                    onBottleneckChange={setBottleneckItems}
                    onBottleneckSave={saveProjectLogs}
                    isSavingBottleneck={isSavingProjectLogs}
                    bottleneckDisabled={!selectedProjectId}
                    projectLogsRef={projectLogsRef}
                    projectName={selectedProject?.title}
                    healthSafetyDashboard={healthSafetyDashboard}
                    healthSafetySelectedMonth={healthSafetySelectedMonth}
                    healthSafetySelectedYear={healthSafetySelectedYear}
                    isLoadingHealthSafety={isLoadingHealthSafety}
                    healthSafetyError={healthSafetyError}
                    isSavingHealthSafety={isSavingHealthSafety}
                    healthSafetyFormError={healthSafetyFormError}
                    onHealthSafetyMonthChange={handleHealthSafetyMonthChange}
                    onHealthSafetyYearChange={handleHealthSafetyYearChange}
                    onSaveHealthSafety={handleSaveHealthSafety}
                    qualityMonthlyRecord={qualityMonthlyRecord}
                    qualityYearRecords={qualityYearRecords}
                    qualitySelectedMonth={qualitySelectedMonth}
                    qualitySelectedYear={qualitySelectedYear}
                    isLoadingQualityStatus={isLoadingQualityStatus}
                    qualityStatusError={qualityStatusError}
                    isSavingQualityStatus={isSavingQualityStatus}
                    qualityStatusFormError={qualityStatusFormError}
                    onQualityMonthChange={handleQualityMonthChange}
                    onQualityYearChange={handleQualityYearChange}
                    onSaveQualityStatus={handleSaveQualityStatus}
                  />
                  </div>
                ) : selectedProject ? (
                  <div
                    id="tl-section-compliance"
                    className={`exec-section-hse grid grid-cols-1 items-stretch gap-4 ${
                      hseCanView ? 'lg:grid-cols-2 lg:min-h-[28rem]' : 'min-h-[28rem]'
                    }`}
                  >
                    {hseCanView && (
                      <div id="tl-section-hse" className="flex h-full min-h-[28rem] min-w-0 flex-col">
                        <HealthSafetyCard
                          projectName={selectedProject?.title}
                          dashboard={healthSafetyDashboard}
                          selectedMonth={healthSafetySelectedMonth}
                          selectedYear={healthSafetySelectedYear}
                          isLoading={isLoadingHealthSafety}
                          error={healthSafetyError}
                          isSaving={isSavingHealthSafety}
                          formError={healthSafetyFormError}
                          onMonthChange={handleHealthSafetyMonthChange}
                          onYearChange={handleHealthSafetyYearChange}
                          onSave={handleSaveHealthSafety}
                          canEdit={hseCanEdit}
                          pairLayout
                        />
                      </div>
                    )}

                    <div id="tl-section-quality" className="flex h-full min-h-[28rem] min-w-0 flex-col">
                      <FrequencyChartDashboard
                        project={selectedProject}
                        selectedContractorName={selectedContractorName}
                        syncContractorFromDashboard={useGlobalContractorFilter}
                        layout="embedded"
                        onOpenTestingPhotos={
                          isPmcTeamLead || isPMCHead
                            ? () =>
                              onNavigate?.({
                                tab: 'testing_photos',
                                projectId: selectedProject.id,
                              })
                            : undefined
                        }
                      />
                    </div>
                  </div>
                ) : null
              )}

              {tabVisible('compliance') && (
                <>
                  {/* Drawing Register — Client Report — full width (replaces old DrawingSummaryCard) */}
                  {selectedProject && (
                    <div id="exec-section-drawings" className="tl-section-drawings w-full min-w-0">
                      <DrawingRegisterCard
                        project={selectedProject}
                        selectedContractorName={selectedContractorName}
                        syncContractorFromDashboard={useGlobalContractorFilter}
                      />
                    </div>
                  )}

                  {/* Correspondence & Delivery Status — full width */}
                  <div id="exec-section-correspondence" className="tl-section-correspondence w-full min-w-0">
                    <CorrespondenceCard
                      projectName={selectedProject?.title}
                      period={correspondencePeriod}
                      projectSummary={correspondenceProjectSummary}
                      yearPeriods={correspondenceYearPeriods}
                      documents={correspondenceDocuments}
                      selectedMonth={correspondenceSelectedMonth}
                      selectedYear={correspondenceSelectedYear}
                      isLoading={isLoadingCorrespondence}
                      error={correspondenceError}
                      formError={correspondenceFormError}
                      isSaving={isSavingCorrespondence}
                      onMonthChange={handleCorrespondenceMonthChange}
                      onYearChange={handleCorrespondenceYearChange}
                      onSaveDocument={handleSaveCorrespondenceDocument}
                      onDeleteDocument={handleDeleteCorrespondenceDocument}
                    />
                  </div>

                  {isPMCHead && selectedProject && (
                    <div id="exec-section-quality" className="w-full min-w-0">
                      <FrequencyChartDashboard
                        project={selectedProject}
                        selectedContractorName={selectedContractorName}
                        syncContractorFromDashboard={useGlobalContractorFilter}
                        onOpenTestingPhotos={() =>
                          onNavigate?.({
                            tab: 'testing_photos',
                            projectId: selectedProject.id,
                          })
                        }
                      />
                    </div>
                  )}
                </>
              )}

              {tabVisible('schedule') && !isPMCHead && (
                  <div className="w-full min-w-0">
                    <SitePhotosCard
                      className="w-full"
                      projectName={selectedProject?.title}
                      month={correspondenceSelectedMonth}
                      year={correspondenceSelectedYear}
                      onViewAll={() => onNavigate?.('site_photos')}
                    />
                  </div>
              )}

              <ModalPortal open={isProjectDatesModalOpen}>
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
                  <div className={`w-full max-w-2xl rounded-3xl border p-6 shadow-2xl ${themeClasses.bgPrimary} ${themeClasses.border}`}>
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`text-xl font-black uppercase tracking-tight ${themeClasses.textPrimary}`}>
                          {projectDatesModalMode === 'add_contractor'
                            ? 'Add Contractor Schedule'
                            : projectDatesModalMode === 'edit_contractor'
                              ? 'Edit Contractor Schedule'
                              : isAddingSclDates
                                ? 'Add SCL Project Dates'
                                : 'Edit SCL Project Dates'}
                        </h3>
                        <p className={`mt-1 text-[11px] ${themeClasses.textSecondary}`}>
                          {isAddingSclDates || projectDatesModalMode === 'add_contractor'
                            ? 'Enter schedule dates. Delay and summary fields are calculated by the API after save.'
                            : 'Update schedule dates. Calculated fields refresh from the API after save.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsProjectDatesModalOpen(false)}
                        className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${isDarkTheme ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                      >
                        Close
                      </button>
                    </div>

                    <form onSubmit={handleProjectDatesSubmit} className="space-y-4">
                      {projectDatesModalMode !== 'edit_scl' && (
                        <div>
                          <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                            Contractor (from Master)
                          </label>
                          {projectDatesModalMode === 'edit_contractor' ? (
                            <div
                              className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold ${themeClasses.input} ${themeClasses.border} opacity-80`}
                            >
                              {contractorMasters.find((m) => m.id === projectDatesForm.contractor_id)
                                ?.contractor_name ??
                                editingContractorRecord?.contractor_name ??
                                '—'}
                            </div>
                          ) : availableContractorMasters.length > 0 ? (
                            <select
                              value={projectDatesForm.contractor_id ?? ''}
                              onChange={(e) =>
                                setProjectDatesForm((prev) => ({
                                  ...prev,
                                  contractor_id: Number(e.target.value),
                                }))
                              }
                              required
                              className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.border}`}
                            >
                              <option value="" disabled>
                                Select contractor
                              </option>
                              {availableContractorMasters.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.contractor_name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={`space-y-3 rounded-2xl border px-4 py-3 ${themeClasses.border} ${isDarkTheme ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                              <p className={`text-[11px] font-bold ${themeClasses.textSecondary}`}>
                                No contractors in master yet. Create one to attach a schedule.
                              </p>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                  type="text"
                                  value={newContractorMasterName}
                                  onChange={(e) => setNewContractorMasterName(e.target.value)}
                                  placeholder="Contractor name"
                                  className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.border}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleCreateContractorMaster()}
                                  disabled={isCreatingContractorMaster || !newContractorMasterName.trim()}
                                  className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 disabled:opacity-60"
                                >
                                  {isCreatingContractorMaster ? 'Adding…' : 'Add to Master'}
                                </button>
                              </div>
                            </div>
                          )}
                          {projectDatesModalMode === 'add_contractor' &&
                            availableContractorMasters.length === 0 &&
                            contractorMasters.some((m) => m.status === 'ACTIVE') && (
                              <p className="mt-2 text-[11px] font-bold text-amber-600">
                                All active contractors already have schedules. Add a new contractor to master first.
                              </p>
                            )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {([
                          ['project_start', 'Project Start'],
                          ['contract_finish', 'Contract Finish'],
                          ['forecast_finish', 'Forecast Finish'],
                          ['eot_date', 'EOT Date'],
                        ] as const).map(([field, label]) => (
                          <div key={field}>
                            <label className={`mb-1 block text-[10px] font-black uppercase tracking-widest ${themeClasses.textSecondary}`}>
                              {label}
                            </label>
                            <input
                              type="date"
                              value={projectDatesForm[field]}
                              onChange={(e) =>
                                setProjectDatesForm((prev) => ({ ...prev, [field]: e.target.value }))
                              }
                              required
                              className={`w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none ${themeClasses.input} ${themeClasses.border}`}
                            />
                          </div>
                        ))}
                      </div>

                      {projectDatesFormError && (
                        <p className="text-[11px] font-bold text-rose-500">{projectDatesFormError}</p>
                      )}

                      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setIsProjectDatesModalOpen(false)}
                          disabled={isSavingProjectDates}
                          className={`flex-1 rounded-2xl px-4 py-3 font-bold transition-colors ${isDarkTheme ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'}`}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingProjectDates}
                          className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                        >
                          {isSavingProjectDates
                            ? 'Saving...'
                            : projectDatesModalMode === 'add_contractor' || isAddingSclDates
                              ? 'Create Project Dates'
                              : 'Save Project Dates'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </ModalPortal>

              <ProjectDatesBgStatusModal
                open={isBgStatusModalOpen}
                projectName={selectedProject?.title ?? ''}
                scope={bgModalScope}
                contractorOptions={projectContractors.map((c) => contractorLabel(c))}
                initialBundle={
                  projectDatesBundle
                    ? {
                      contractor_bg: projectDatesBundle.contractor_bg ?? [],
                      scl_bg: projectDatesBundle.scl_bg ?? [],
                      bg_summary: projectDatesBundle.bg_summary ?? null,
                    }
                    : null
                }
                onClose={() => setIsBgStatusModalOpen(false)}
                onSaved={handleBgStatusSaved}
              />
            </section>

            <section id="tl-section-charts" className="exec-section-progress graphs-analytics-section space-y-3">
              {tabVisible('schedule') && (
                isPMCHead ? (
                  <PMCExecutivePanel title="Physical Progress Status" subtitle="Progress S-curve — executive view">
                    <div className="p-3 sm:p-4">
                      {isLoadingProjectProgress ? (
                        <div className="flex items-center justify-center" style={{ height: DASHBOARD_CHART_MIN_HEIGHT }}>
                          <div className={`${typo.muted} ${themeClasses.textMuted}`}>Loading physical progress data...</div>
                        </div>
                      ) : progressSCurveData.length > 0 ? (
                        <ExecutiveChartWithLegend
                          height={DASHBOARD_CHART_MIN_HEIGHT}
                          legend={[
                            { label: 'Monthly Planned', color: '#3B82F6' },
                            { label: 'Monthly Actual', color: '#10B981' },
                            { label: 'Cumulative Planned', color: '#F59E0B', variant: 'dashed' },
                            { label: 'Cumulative Actual', color: '#EF4444' },
                          ]}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progressSCurveData} margin={chartPlotMarginExecutive}>
                              <CartesianGrid strokeDasharray="4 6" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
                              <XAxis
                                dataKey="month"
                                tick={chartAxisTick(isDarkTheme, 12)}
                                axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
                                tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
                                {...chartXAxisMonthPropsExecutive}
                              />
                              <YAxis
                                width={40}
                                tick={chartAxisTick(isDarkTheme, 12)}
                                tickFormatter={(v) => `${v}%`}
                                domain={[0, 100]}
                                ticks={[0, 25, 50, 75, 100]}
                                allowDataOverflow
                                axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
                                tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
                              />
                              <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
                              <Line type="monotone" dataKey="monthlyPlanned" stroke="#3B82F6" strokeWidth={2} name="Monthly Planned" dot={false} activeDot={chartActiveDot} isAnimationActive={false} />
                              <Line type="monotone" dataKey="monthlyActual" stroke="#10B981" strokeWidth={2} name="Monthly Actual" dot={false} activeDot={chartActiveDot} isAnimationActive={false} />
                              <Line type="monotone" dataKey="planned" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="6 4" name="Cumulative Planned" dot={false} activeDot={chartActiveDot} isAnimationActive={false} />
                              <Line type="monotone" dataKey="actual" stroke="#EF4444" strokeWidth={2.5} name="Cumulative Actual" dot={false} activeDot={chartActiveDot} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </ExecutiveChartWithLegend>
                      ) : (
                        <div className="flex items-center justify-center" style={{ height: DASHBOARD_CHART_MIN_HEIGHT }}>
                          <div className={`${typo.muted} ${themeClasses.textMuted}`}>No physical progress data available for this project</div>
                        </div>
                      )}
                    </div>
                  </PMCExecutivePanel>
                ) : (
                  <FullScreenCard
                    title="Physical Progress Status"
                    className="progress-curve-card joyride-target-stable min-h-[420px]"
                    onEdit={() => onNavigate?.({ tab: 'financial_management', section: 'progress' })}
                    editTitle="Edit in Financial Management"
                  >
                    <div className={`relative flex h-full flex-col overflow-hidden rounded-xl border ${DASHBOARD_CHART_SHELL_PADDING} ${dashboardChartShellBorder(isDarkTheme)} ${themeClasses.glassCard}`}>
                      <DashboardCardTopAccent />
                      <div className={`mb-4 flex items-center justify-between gap-3 border-b pb-3.5 pt-0.5 ${themeClasses.border}`}>
                        <div className="min-w-0 flex-1">
                          <h3 className={typo.sectionTitle(isDarkTheme)}>PHYSICAL PROGRESS STATUS</h3>
                          <h4 className={`mt-2 ${typo.chartSubtitle} ${themeClasses.textSecondary}`}>PROGRESS S-CURVE</h4>
                        </div>
                        <FullScreenHeaderToolbar />
                      </div>
                      {isLoadingProjectProgress ? (
                        <div className="flex items-center justify-center" style={{ height: DASHBOARD_CHART_MIN_HEIGHT }}>
                          <div className={`${typo.muted} ${themeClasses.textMuted}`}>Loading physical progress data...</div>
                        </div>
                      ) : progressSCurveData.length > 0 ? (
                        <div className="min-h-0">
                          <ResponsiveContainer width="100%" height={DASHBOARD_CHART_MIN_HEIGHT}>
                            <LineChart data={progressSCurveData} margin={chartLineBarMargin(false)}>
                              <CartesianGrid strokeDasharray="4 6" stroke={chartGridStroke(isDarkTheme)} vertical={false} />
                              <XAxis
                                dataKey="month"
                                tick={chartAxisTick(isDarkTheme, 12)}
                                axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
                                tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
                                {...chartXAxisMonthProps}
                              />
                              <YAxis
                                width={40}
                                tick={chartAxisTick(isDarkTheme, 12)}
                                tickFormatter={(v) => `${v}%`}
                                domain={[0, 100]}
                                ticks={[0, 25, 50, 75, 100]}
                                allowDataOverflow
                                axisLine={{ stroke: chartAxisStroke(isDarkTheme) }}
                                tickLine={{ stroke: chartAxisStroke(isDarkTheme) }}
                              />
                              <Tooltip contentStyle={chartTooltipStyle(isDarkTheme)} />
                              <Legend {...chartLegendProps(11, isDarkTheme)} />
                              <Line type="monotone" dataKey="monthlyPlanned" stroke="#3B82F6" strokeWidth={2} name="Monthly Planned" dot={false} activeDot={chartActiveDot} isAnimationActive={false} />
                              <Line type="monotone" dataKey="monthlyActual" stroke="#10B981" strokeWidth={2} name="Monthly Actual" dot={false} activeDot={chartActiveDot} isAnimationActive={false} />
                              <Line type="monotone" dataKey="planned" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="6 4" name="Cumulative Planned" dot={false} activeDot={chartActiveDot} isAnimationActive={false} />
                              <Line type="monotone" dataKey="actual" stroke="#EF4444" strokeWidth={2.5} name="Cumulative Actual" dot={false} activeDot={chartActiveDot} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center" style={{ height: DASHBOARD_CHART_MIN_HEIGHT }}>
                          <div className={`${typo.muted} ${themeClasses.textMuted}`}>No physical progress data available for this project</div>
                        </div>
                      )}
                    </div>
                  </FullScreenCard>
                )
              )}

              {tabVisible('money') && (
                isPMCHead ? (
                  <PMCExecutivePanel title="Financial Progress" subtitle="BCWS, BCWP, ACWP & forecast trend">
                    <div className="p-3 sm:p-4 md:p-5">
                      {isLoadingCostPerformance ? (
                        <div className="flex items-center justify-center" style={{ height: DASHBOARD_CHART_MIN_HEIGHT }}>
                          <div className={`${typo.muted} ${themeClasses.textMuted}`}>Loading financial progress data...</div>
                        </div>
                      ) : costPerformanceData.length > 0 ? (
                        <ExecutiveChartWithLegend
                          height={DASHBOARD_CHART_MIN_HEIGHT}
                          legend={[
                            { label: 'BCWS', color: '#4f46e5' },
                            { label: 'BCWP', color: '#f59e0b' },
                            { label: 'ACWP', color: '#ef4444' },
                            { label: 'FCST', color: '#10b981', variant: 'dashed' },
                          ]}
                        >
                          <FinancialProgressChartPlot
                            isDarkTheme={isDarkTheme}
                            data={costPerformanceData}
                            hideLegend
                          />
                        </ExecutiveChartWithLegend>
                      ) : (
                        <div className="flex items-center justify-center" style={{ height: DASHBOARD_CHART_MIN_HEIGHT }}>
                          <div className={`${typo.muted} ${themeClasses.textMuted}`}>No financial progress data available for this project</div>
                        </div>
                      )}
                    </div>
                  </PMCExecutivePanel>
                ) : (
                  <FinancialProgressChartCard
                    isDarkTheme={isDarkTheme}
                    isLoading={isLoadingCostPerformance}
                    data={costPerformanceData}
                    onEdit={() => onNavigate?.({ tab: 'financial_management', section: 'cost' })}
                  />
                )
              )}

              {tabVisible('people') && (
                isPMCHead ? (
                  <div id="exec-section-manpower">
                  <PMCHeadPeopleSection
                    isDarkTheme={isDarkTheme}
                    manpowerData={manpowerData}
                    manpowerDonutData={manpowerDonutData}
                    projectName={selectedProject?.title}
                    projectId={selectedProjectId}
                    currentUser={currentUser}
                    onNavigate={(tab) => onNavigate?.(tab)}
                    onManpowerEdit={() => onNavigate?.('manpower_management')}
                    machineryLogRef={machineryLogRef}
                    projectEquipmentRef={projectEquipmentRef}
                    equipmentRecords={equipmentDataState}
                    isLoadingEquipment={isLoadingEquipment}
                    equipmentError={equipmentError}
                    equipmentFormError={equipmentFormError}
                    isSavingEquipment={isSavingEquipment}
                    onRefreshEquipment={fetchEquipmentData}
                    onSaveEquipment={handleSaveEquipment}
                    onDeleteEquipment={handleDeleteEquipment}
                  />
                  </div>
                ) : (
                  <div id="tl-section-people" className="exec-section-manpower space-y-3">
                    <ManpowerHistogramChartCard
                      isDarkTheme={isDarkTheme}
                      data={manpowerData}
                      onEdit={() => onNavigate?.('manpower_management')}
                    />

                    {!isPmcTeamLead && (
                      <>
                        {/* MANPOWER DONUT CHARTS */}
                        <div className={`relative overflow-hidden rounded-2xl border p-4 ${themeClasses.glassCard} ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                          <DashboardCardTopAccent />
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-1">
                            <div className="flex flex-col items-center">
                              <h4 className={`${typo.chartSubtitle} mb-2 ${themeClasses.textPrimary}`}>Total Manpower</h4>
                              <DonutChart data={manpowerDonutData} label="Total Manpower" size={90} showLabels={false} />
                            </div>
                            <div className="flex flex-col items-center">
                              <h4 className={`${typo.chartSubtitle} mb-2 ${themeClasses.textPrimary}`}>Total Direct & Indirect</h4>
                              <DonutChart data={manpowerDonutData} label="Total Direct & Indirect" size={90} showLabels={false} />
                            </div>
                            <div className="flex flex-col items-center">
                              <h4 className={`${typo.chartSubtitle} mb-2 ${themeClasses.textPrimary}`}>TCC Manpower</h4>
                              <DonutChart data={manpowerDonutData} label="TCC Manpower" size={90} showLabels={false} />
                            </div>
                          </div>
                        </div>

                        {/* PROJECT EQUIPMENT SUMMARY — backend /project-equipment/ only */}
                        <div className={`relative overflow-hidden rounded-2xl border p-0 ${themeClasses.glassCard} ${themeClasses.border}`}>
                          <DashboardCardTopAccent />
                          {isLoadingEquipment ? (
                            <p className={`px-4 py-6 text-center text-xs font-semibold ${themeClasses.textMuted}`}>
                              Loading equipment…
                            </p>
                          ) : equipmentDataState.length === 0 ? (
                            <p className={`px-4 py-6 text-center text-xs font-semibold ${themeClasses.textMuted}`}>
                              No equipment records from backend for this project.
                            </p>
                          ) : (
                            <table className={`w-full ${typo.tableCell} border-collapse`}>
                              <thead>
                                <tr className={isDarkTheme ? "bg-blue-900" : "bg-blue-600"}>
                                  <th className={`px-3 py-2.5 text-left font-black text-white uppercase border ${isDarkTheme ? 'border-white/20' : 'border-blue-400'}`}>Month</th>
                                  <th className={`px-3 py-2.5 text-center font-black text-white uppercase border ${isDarkTheme ? 'border-white/20' : 'border-blue-400'}`}>Planned</th>
                                  <th className={`px-3 py-2.5 text-center font-black text-white uppercase border ${isDarkTheme ? 'border-white/20' : 'border-blue-400'}`}>Actual</th>
                                  <th className={`px-3 py-2.5 text-center font-black text-white uppercase border ${isDarkTheme ? 'border-white/20' : 'border-blue-400'}`}>Variance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...equipmentDataState]
                                  .sort((a, b) => String(a.equipmentMonth).localeCompare(String(b.equipmentMonth)))
                                  .map((row) => {
                                    const planned = Number(row.plannedEquipment) || 0;
                                    const actual = Number(row.actualEquipment) || 0;
                                    const variance = Number.isFinite(row.variance)
                                      ? row.variance
                                      : actual - planned;
                                    return (
                                      <tr key={String(row.id ?? row.equipmentMonth)}>
                                        <td className={`px-3 py-2.5 font-black border ${themeClasses.textPrimary} ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                          {row.equipmentMonth}
                                        </td>
                                        <td className={`px-3 py-2.5 text-center tabular-nums border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                          {planned}
                                        </td>
                                        <td className={`px-3 py-2.5 text-center tabular-nums border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                          {actual}
                                        </td>
                                        <td className={`px-3 py-2.5 text-center font-bold tabular-nums border ${themeClasses.bgSecondary} ${themeClasses.border}`}>
                                          {variance > 0 ? `+${variance}` : variance}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan={4} className={`px-3 py-3 text-center ${isDarkTheme ? "bg-blue-900" : "bg-blue-600"}`}>
                                    <span className="text-sm font-black uppercase text-white tracking-wide">PROJECT EQUIPMENT</span>
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              )}
            </section>

            {tabVisible('risk') && !isPMCHead && (
              <section id="tl-section-risk" className="exec-section-risk space-y-2 pt-1">
                <BottleneckSection
                  cardRef={projectLogsRef}
                  items={bottleneckItems}
                  onChange={setBottleneckItems}
                  onSave={saveProjectLogs}
                  isSaving={isSavingProjectLogs}
                  disabled={!selectedProjectId}
                />
              </section>
            )}

            {(tabVisible('money') || (tabVisible('people') && !isPMCHead)) && (
              <section className="space-y-3">
                <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {tabVisible('money') && (
                    isPMCHead ? (
                      <PMCExecutivePanel
                        title="Budget vs Cost Performance"
                        subtitle="BAC, EAC, ETG & variance at completion"
                        className="col-span-full"
                      >
                        <div className="relative p-3 sm:p-4">
                          {isLoadingBudgetPerformance ? (
                            <div className="flex h-[140px] items-center justify-center">
                              <div className={`${themeClasses.textMuted} ${typo.muted}`}>Loading budget performance data...</div>
                            </div>
                          ) : budgetPerformanceData ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {[
                                { label: 'Budget at Completion', value: formatINR(budgetPerformanceData.bac), color: 'text-slate-800', icon: Icons.Finance },
                                { label: 'Estimate at Completion', value: formatINR(budgetPerformanceData.eac), color: 'text-amber-600', icon: Icons.Activity },
                                { label: 'Estimate to Go', value: formatINR(budgetPerformanceData.etg), color: 'text-slate-800', icon: Icons.ArrowRight },
                                { label: 'Variance at Completion', value: formatINR(budgetPerformanceData.vac), color: budgetPerformanceData.vac >= 0 ? 'text-emerald-600' : 'text-rose-600', icon: Icons.Performance },
                                { label: 'Variance to Date', value: formatINR(budgetPerformanceData.cv), color: budgetPerformanceData.cv >= 0 ? 'text-emerald-600' : 'text-rose-600', icon: Icons.Clock },
                              ].map((metric) => {
                                const MetricIcon = metric.icon;
                                return (
                                  <div key={metric.label} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <MetricIcon size={16} className="shrink-0 text-[#1e3a5f]" />
                                      <span className="text-xs font-bold text-slate-600 sm:text-sm">{metric.label}</span>
                                    </div>
                                    <span className={`shrink-0 text-sm font-black tabular-nums sm:text-base ${metric.color}`}>{metric.value}</span>
                                  </div>
                                );
                              })}
                              {(() => {
                                const cpi = toNum(budgetPerformanceData.bac) > 0 ? toNum(budgetPerformanceData.eac) / toNum(budgetPerformanceData.bac) : 0;
                                const isHealthy = cpi <= 1 && cpi > 0;
                                return (
                                  <div className={`rounded-xl border px-3.5 py-3 sm:col-span-2 lg:col-span-1 ${isHealthy ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-slate-600 sm:text-sm">Cost Performance Index</span>
                                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {isHealthy ? 'Healthy' : 'Watch'}
                                      </span>
                                    </div>
                                    <p className={`mt-2 text-2xl font-black ${isHealthy ? 'text-emerald-600' : 'text-amber-600'}`}>{cpi ? cpi.toFixed(2) : '—'}</p>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="flex h-[140px] items-center justify-center">
                              <div className={`${themeClasses.textMuted} ${typo.muted}`}>No budget performance data available for this project</div>
                            </div>
                          )}
                          {!isLoadingBudgetPerformance && (
                            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/50" aria-hidden>
                              <span className="text-2xl font-black uppercase tracking-[0.3em] text-white sm:text-3xl">TBD</span>
                            </div>
                          )}
                        </div>
                      </PMCExecutivePanel>
                    ) : (
                      <div className={`budget-cost-card joyride-target-stable relative flex min-h-[360px] flex-col overflow-hidden rounded-2xl border p-3 sm:min-h-[420px] sm:p-4 lg:min-h-[480px] transition-shadow hover:shadow-md ${themeClasses.glassCard} ${themeClasses.border} shadow-sm`}>
                        <DashboardCardTopAccent />
                        <div className={`mb-3 flex shrink-0 flex-col gap-2 border-b pb-2 pt-1 sm:flex-row sm:items-start sm:justify-between ${themeClasses.border}`}>
                          <h3 className={`${typo.sectionTitle(isDarkTheme)} min-w-0 flex-1`}>BUDGET VS COST PERFORMANCE</h3>
                          <CardHeaderActions className="shrink-0 self-end sm:self-auto">
                            <FormulaInfoButton {...DASHBOARD_FORMULAS.budgetVsCost} />
                            <CardEditButton
                              onClick={() => onNavigate?.({ tab: 'financial_management', section: 'budget' })}
                              title="Edit in Financial Management"
                            />
                          </CardHeaderActions>
                        </div>
                        <div className="relative min-h-0 flex-1 overflow-y-auto">
                          {isLoadingBudgetPerformance ? (
                            <div className="flex items-center justify-center h-[140px]">
                              <div className={`${themeClasses.textMuted} ${typo.muted}`}>Loading budget performance data...</div>
                            </div>
                          ) : budgetPerformanceData ? (
                            <div className="space-y-2">
                              {[
                                { label: 'Budget at Completion', value: formatINR(budgetPerformanceData.bac), color: themeClasses.textPrimary, icon: Icons.Finance },
                                { label: 'Estimate at Completion', value: formatINR(budgetPerformanceData.eac), color: 'text-amber-500', icon: Icons.Activity },
                                { label: 'Estimate to Go', value: formatINR(budgetPerformanceData.etg), color: themeClasses.textPrimary, icon: Icons.ArrowRight },
                                { label: 'Variance at Completion', value: formatINR(budgetPerformanceData.vac), color: budgetPerformanceData.vac >= 0 ? themeClasses.success : themeClasses.danger, icon: Icons.Performance },
                                { label: 'Variance to Date', value: formatINR(budgetPerformanceData.cv), color: budgetPerformanceData.cv >= 0 ? themeClasses.success : themeClasses.danger, icon: Icons.Clock },
                              ].map((metric) => {
                                const MetricIcon = metric.icon;
                                return (
                                  <div key={metric.label} className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2.5 ${themeClasses.border} ${themeClasses.bgSecondary}`}>
                                    <div className="flex min-w-0 items-center gap-2">
                                      <MetricIcon size={16} className={`shrink-0 ${isDarkTheme ? 'text-blue-300' : 'text-blue-600'}`} />
                                      <span className={`min-w-0 flex-1 text-xs font-bold leading-snug sm:text-sm ${themeClasses.textSecondary}`}>{metric.label}</span>
                                    </div>
                                    <span className={`shrink-0 text-sm font-semibold tabular-nums sm:text-base ${metric.color}`}>{metric.value}</span>
                                  </div>
                                );
                              })}
                              {(() => {
                                const cpi = toNum(budgetPerformanceData.bac) > 0 ? toNum(budgetPerformanceData.eac) / toNum(budgetPerformanceData.bac) : 0;
                                const isHealthy = cpi <= 1 && cpi > 0;
                                return (
                                  <div className={`mt-3 rounded-xl border px-3.5 py-3 ${themeClasses.border} ${isHealthy ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                    <div className="flex items-center justify-between">
                                      <span className={`${typo.labelBold} ${themeClasses.textSecondary}`}>Cost Performance Index</span>
                                      <span className={`rounded-full px-2.5 py-0.5 ${typo.badge} ${isHealthy ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
                                        {isHealthy ? 'Healthy' : 'Watch'}
                                      </span>
                                    </div>
                                    <p className={`mt-1.5 ${typo.compactValue} ${isHealthy ? 'text-emerald-500' : 'text-amber-500'}`}>{cpi ? cpi.toFixed(2) : '-'}</p>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-[140px]">
                              <div className={`${themeClasses.textMuted} ${typo.muted}`}>No budget performance data available for this project</div>
                            </div>
                          )}
                          {!isLoadingBudgetPerformance && (
                            <div
                              className="absolute inset-0 z-10 flex items-center justify-center rounded-b-2xl bg-black/55 pointer-events-none"
                              aria-hidden
                            >
                              <span className="text-3xl font-black uppercase tracking-[0.35em] text-white drop-shadow-sm">TBD</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}

                  {tabVisible('people') && !isPMCHead && (
                    <div ref={machineryLogRef} id="site-machinery-log" className="machinery-log-card joyride-target-stable min-h-[360px] sm:min-h-[420px] lg:min-h-[480px]">
                      <MachinerySubmissionsTL
                        projectName={selectedProject?.title}
                        projectId={selectedProjectId}
                        currentUser={currentUser}
                        onNavigate={(tab) => onNavigate?.(tab)}
                      />
                    </div>
                  )}

                  {tabVisible('people') && !isPMCHead && (
                    <div
                      ref={projectEquipmentRef}
                      id="project-equipment"
                      className="project-equipment-card joyride-target-stable min-h-[360px] sm:min-h-[420px] lg:min-h-[480px]"
                    >
                      <ProjectEquipmentCard
                        projectName={selectedProject?.title}
                        records={equipmentDataState}
                        isLoading={isLoadingEquipment}
                        error={equipmentError}
                        formError={equipmentFormError}
                        isSaving={isSavingEquipment}
                        onRefresh={fetchEquipmentData}
                        onSave={handleSaveEquipment}
                        onDelete={handleDeleteEquipment}
                      />
                      <div className="hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className={typo.sectionTitle(isDarkTheme)}>PROJECT EQUIPMENT</h3>
                          <span className={`${typo.caption} font-bold ${themeClasses.textMuted}`}>Summary</span>
                        </div>

                        {/* Compact Summary Row (KPI style) */}
                        <div className={`mb-2 grid grid-cols-4 gap-1.5 ${typo.micro}`}>
                          <div className={`rounded-lg border ${themeClasses.border} ${themeClasses.bgSecondary} px-2 py-1`}>
                            <div className={`${themeClasses.textMuted} font-bold tracking-wider`}>TOTAL</div>
                            <div className={`font-black tabular-nums ${themeClasses.textPrimary}`}>—</div>
                          </div>
                          <div className={`rounded-lg border ${themeClasses.border} ${themeClasses.bgSecondary} px-2 py-1`}>
                            <div className={`${themeClasses.textMuted} font-bold tracking-wider`}>PLANNED</div>
                            <div className={`font-black tabular-nums ${themeClasses.textPrimary}`}>—</div>
                          </div>
                          <div className={`rounded-lg border ${themeClasses.border} ${themeClasses.bgSecondary} px-2 py-1`}>
                            <div className={`${themeClasses.textMuted} font-bold tracking-wider`}>ACTUAL</div>
                            <div className={`font-black tabular-nums ${themeClasses.textPrimary}`}>—</div>
                          </div>
                          <div className={`rounded-lg border ${themeClasses.border} ${themeClasses.bgSecondary} px-2 py-1`}>
                            <div className={`${themeClasses.textMuted} font-bold tracking-wider`}>VARIANCE</div>
                            <div className={`font-black tabular-nums ${themeClasses.textPrimary}`}>—</div>
                          </div>
                        </div>

                        {/* Chart - Hero Section */}
                        <div className={`h-[150px] rounded-xl border ${themeClasses.border} ${isDarkTheme ? 'bg-white/5' : 'bg-gray-50/60'} px-1.5 py-2`}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={equipmentDataState}
                              barCategoryGap={16}
                              margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={isDarkTheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                              <XAxis
                                dataKey="category"
                                tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 7 }}
                                tickMargin={2}
                              />
                              <YAxis
                                width={28}
                                tick={{ fill: isDarkTheme ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 7 }}
                                tickMargin={-2}
                              />
                              <Tooltip contentStyle={{ background: isDarkTheme ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)', border: `1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '6px', fontSize: '10px' }} />
                              <Legend wrapperStyle={{ fontSize: '8px', marginTop: '2px' }} verticalAlign="bottom" height={20} />
                              <Bar dataKey="planned" fill="#4f46e5" radius={[3, 3, 0, 0]} name="Planned" />
                              <Bar dataKey="actual" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Actual" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Subtle Footer / Empty State Handling */}
                        {(!equipmentDataState || equipmentDataState.length === 0) && (
                          <div className="text-center mt-1.5">
                            <span className={`${typo.micro} tracking-wider ${themeClasses.textMuted}`}>No equipment data yet</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        </PMCExecutiveDetailFrame>
      )}

      {/* Projects Analytics Walkthrough - rendered at root level for proper overlay/portal behavior */}
      {showProjectsAnalyticsTour && (
        <ProjectsDashboardTour
          key={`projects-analytics-tour-${selectedProjectId ?? 'none'}`}
          onClose={handleCloseAnalyticsTour}
          onRequestCloseSidebar={() => {
            /* Team Leader sidebar stays visible on Projects view */
          }}
          onTourStateChange={onTourStateChange}
          projectLogsRef={projectLogsRef}
          machineryLogRef={machineryLogRef}
          projectEquipmentRef={projectEquipmentRef}
        />
      )}
    </div>
  );
};

const ProjectsWithTypography: React.FC<ProjectsProps> = (props) => (
  <ProjectsDashboardTypographyProvider>
    <Projects {...props} />
  </ProjectsDashboardTypographyProvider>
);

export default ProjectsWithTypography;
