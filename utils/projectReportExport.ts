import type { BottleneckItem, BottleneckType } from './bottleneck';
import type {
  ContractPerformanceRecord,
  ContractValueRecord,
  CorrespondenceMonthlyPeriod,
  CorrespondencePartyMetrics,
  CorrespondenceProjectSummary,
  DrawingMonthlyRecord,
  DrawingProjectSummary,
  InvoicingRecord,
  Project,
  ProjectEquipmentRecord,
  ProjectQualityStatusRecord,
  SafetyStats,
} from '../types';
import type {
  HealthSafetyDashboardData,
  HSERecord,
  PlannedEarnedByPeriodResponse,
  PlannedEarnedPartyMetrics,
  ProjectDatesRecord,
} from '../services/api';
import type { MachineryRow } from './machineryDashboard';
import { fetchLatestMachineryRows, parseMachineryQty } from './machineryDashboard';
import {
  REPORT_NA,
  composeCsvDocument,
  formatReportCell,
  formatReportCurrency,
  formatReportDate,
  formatReportIndex,
  formatReportMonth,
  formatReportPercent,
  formatReportTodayDate,
  monthYearLabel,
  type CsvReportSection,
} from './csvReport';
import {
  formatDelayDaysValue,
  formatElapsedDurationDays,
  formatEotDurationDays,
  formatForecastDurationDays,
  formatRemainingDurationDays,
  getScheduleStatus,
  normalizeBottleneckType,
  normalizeReportStatus,
} from './reportFormatting';
import {
  HSE_SCORECARD_EXPORT_HEADERS,
  hseScorecardRowForExport,
} from './healthSafetyScorecard';

function buildProjectDatesRow(
  dateType: string,
  record: ProjectDatesRecord | null | undefined
): unknown[] {
  if (!record) {
    return [
      dateType,
      REPORT_NA,
      REPORT_NA,
      REPORT_NA,
      REPORT_NA,
      REPORT_NA,
      REPORT_NA,
      REPORT_NA,
      REPORT_NA,
      REPORT_NA,
      REPORT_NA,
    ];
  }

  const delay = record.current_delay ?? record.delay_days;

  return [
    dateType,
    formatReportDate(record.project_start),
    formatReportDate(record.contract_finish),
    formatReportDate(record.forecast_finish),
    formatReportDate(record.eot_date),
    formatElapsedDurationDays(record.elapsed_duration),
    formatRemainingDurationDays(record.remaining_duration),
    formatForecastDurationDays(record.forecast_finish_duration),
    formatEotDurationDays(record.eot_duration),
    getScheduleStatus(delay),
    formatDelayDaysValue(delay),
  ];
}

function buildContractValueRow(
  type: string,
  record: ContractValueRecord | null | undefined
): unknown[] {
  if (!record) {
    return [type, REPORT_NA, REPORT_NA, REPORT_NA, REPORT_NA, REPORT_NA];
  }

  return [
    type,
    formatReportCurrency(record.originalContractValue),
    formatReportCurrency(record.approvedVO),
    formatReportCurrency(record.revisedContractValue),
    formatReportCurrency(record.potentialPendingVO),
    record.growthPercentage != null ? formatReportPercent(record.growthPercentage) : REPORT_NA,
  ];
}

function buildInvoicingRow(
  type: string,
  record: InvoicingRecord | null | undefined
): unknown[] {
  if (!record) {
    return [type, REPORT_NA, REPORT_NA, REPORT_NA, REPORT_NA];
  }

  return [
    type,
    formatReportCurrency(record.grossBilled),
    formatReportCurrency(record.netBilledWithoutVAT),
    formatReportCurrency(record.netCollected),
    record.collectionPercentage != null
      ? formatReportPercent(record.collectionPercentage)
      : REPORT_NA,
  ];
}

function buildPlannedActualRow(
  type: string,
  metrics: PlannedEarnedPartyMetrics | null | undefined
): unknown[] {
  if (!metrics) {
    return [type, REPORT_NA, REPORT_NA, REPORT_NA, REPORT_NA];
  }

  return [
    type,
    formatReportCurrency(metrics.plannedValue),
    formatReportCurrency(metrics.earnedValue),
    formatReportCurrency(metrics.variance),
    formatReportIndex(metrics.spi),
  ];
}

function buildCorrespondenceRow(
  type: string,
  metrics: CorrespondencePartyMetrics | null | undefined
): unknown[] {
  if (!metrics) {
    return [type, REPORT_NA, REPORT_NA, REPORT_NA, REPORT_NA, REPORT_NA];
  }

  return [
    type,
    formatReportCell(metrics.correspondenceReceived),
    formatReportCell(metrics.correspondenceDelivered),
    formatReportCell(metrics.pendingCorrespondence),
    formatReportCell(metrics.lateDeliveries),
    formatReportPercent(metrics.deliveryEfficiency),
  ];
}

function buildHseRow(record: HSERecord): unknown[] {
  return hseScorecardRowForExport(record);
}

function buildHseTrendRow(record: HSERecord): unknown[] {
  return [monthYearLabel(record.month, record.year), ...buildHseRow(record)];
}

function buildQualityRow(record: ProjectQualityStatusRecord): unknown[] {
  return [
    monthYearLabel(record.month, record.year),
    formatReportCell(record.testsRequired),
    formatReportCell(record.testsConducted),
    formatReportCell(record.shortfall),
    formatReportPercent(record.qualityPerformance),
  ];
}

function buildDrawingRow(record: DrawingMonthlyRecord): unknown[] {
  return [
    monthYearLabel(record.month, record.year),
    formatReportCell(record.submittedDrawings),
    formatReportCell(record.approvedDrawings),
    formatReportCell(record.variance),
    formatReportPercent(record.approvalRate),
  ];
}

function buildBottleneckRow(item: BottleneckItem): unknown[] {
  return [
    normalizeBottleneckType(item.type),
    item.description,
    normalizeReportStatus(item.priority),
    normalizeReportStatus(item.status),
    formatReportCell(item.assignedTo),
    formatReportDate(item.dueDate),
  ];
}

function countBottleneckByType(items: BottleneckItem[], type: BottleneckType): number {
  return items.filter((item) => item.type === type && item.description.trim()).length;
}

function resolveHseStats(
  healthSafetyDashboard: HealthSafetyDashboardData | null,
  safetyStats: ProjectReportExportInput['safetyStats'],
): HSERecord | null {
  const current = healthSafetyDashboard?.currentMonth;
  if (current) return current;
  if (!safetyStats) return null;
  return {
    projectName: '',
    fatalities: safetyStats.fatalities ?? 0,
    significant: safetyStats.significant ?? 0,
    major: safetyStats.major ?? 0,
    minor: safetyStats.minor ?? 0,
    nearMiss: safetyStats.nearMiss ?? 0,
    totalManhours: safetyStats.totalManhours ?? 0,
    lossOfManhours: safetyStats.lossOfManhours ?? 0,
    averageDailyManpower: safetyStats.averageDailyManpower ?? 0,
    workingDays: safetyStats.workingDays ?? 0,
    manDaysWorked: safetyStats.manDaysWorked ?? 0,
    manHoursWorked: safetyStats.manHoursWorked ?? 0,
    reportableAccidentLti: safetyStats.reportableAccidentLti ?? 0,
    dangerousOccurrences: safetyStats.dangerousOccurrences ?? 0,
    firstAidCases: safetyStats.firstAidCases ?? 0,
    medicalTreatmentCases: safetyStats.medicalTreatmentCases ?? 0,
    utilityDamage: safetyStats.utilityDamage ?? 0,
    internalTrainingCount: safetyStats.internalTrainingCount ?? 0,
    internalTrainingHours: safetyStats.internalTrainingHours ?? 0,
    externalTrainingCount: safetyStats.externalTrainingCount ?? 0,
    externalTrainingHours: safetyStats.externalTrainingHours ?? 0,
    mockDrills: safetyStats.mockDrills ?? 0,
    medicalCheckupWorkers: safetyStats.medicalCheckupWorkers ?? 0,
    medicalCheckupStaff: safetyStats.medicalCheckupStaff ?? 0,
    medicalCheckupTotal: safetyStats.medicalCheckupTotal ?? 0,
  };
}

function resolveCorrespondenceMetrics(
  period: CorrespondenceMonthlyPeriod | null,
  summary: CorrespondenceProjectSummary | null
): { client: CorrespondencePartyMetrics | null; contractor: CorrespondencePartyMetrics | null } {
  if (period) {
    return { client: period.client, contractor: period.contractor };
  }
  if (summary) {
    return { client: summary.client, contractor: summary.contractor };
  }
  return { client: null, contractor: null };
}

export interface ProjectReportExportInput {
  project: Project;
  reportDate?: string;
  machineryRole?: string;
  projectDates: {
    scl: ProjectDatesRecord | null;
    contractor: ProjectDatesRecord | null;
  };
  contractValues: {
    scl: ContractValueRecord | null;
    contractor: ContractValueRecord | null;
  };
  invoicing: {
    scl: InvoicingRecord | null;
    contractor: InvoicingRecord | null;
  };
  plannedEarned: PlannedEarnedByPeriodResponse | null;
  internalCost: {
    bcws: number;
    bcwp: number;
    acwp: number;
  };
  contractPerformance: ContractPerformanceRecord | null;
  costPerformanceData: Array<{
    month?: string;
    bcws?: number;
    bcwp?: number;
    acwp?: number;
    fcst?: number;
  }>;
  manpowerData: Array<{ month?: string; planned?: number; actual?: number }>;
  cashflowData: Array<{
    month?: string;
    cashIn?: number;
    cashOut?: number;
    cumPlanIn?: number;
    cumPlanOut?: number;
    cumActualIn?: number;
    cumActualOut?: number;
  }>;
  projectProgressData: Array<{
    month?: string;
    monthlyPlanned?: number;
    monthlyActual?: number;
    planned?: number;
    actual?: number;
    cumulativePlanned?: number;
    cumulativeActual?: number;
  }>;
  budgetPerformanceData: {
    bac?: number;
    eac?: number;
    etg?: number;
    vac?: number;
    cv?: number;
  } | null;
  safetyStats: SafetyStats;
  healthSafetyDashboard: HealthSafetyDashboardData | null;
  qualityMonthlyRecord: ProjectQualityStatusRecord | null;
  qualityYearRecords: ProjectQualityStatusRecord[];
  drawingMonthlyRecord: DrawingMonthlyRecord | null;
  drawingProjectSummary: DrawingProjectSummary | null;
  drawingYearRecords: DrawingMonthlyRecord[];
  correspondence: {
    period: CorrespondenceMonthlyPeriod | null;
    summary: CorrespondenceProjectSummary | null;
  };
  equipmentData: ProjectEquipmentRecord[];
  bottleneckItems: BottleneckItem[];
  machineryRows?: MachineryRow[];
}

export function buildProjectReportSections(input: ProjectReportExportInput): CsvReportSection[] {
  const projectName = input.project.title;
  const location = input.project.location || REPORT_NA;
  const reportDate = input.reportDate ?? formatReportTodayDate();

  const costVariance = input.internalCost.bcwp - input.internalCost.acwp;
  const costPerformanceIndex =
    input.internalCost.acwp > 0 ? input.internalCost.bcwp / input.internalCost.acwp : NaN;

  const hseStats = resolveHseStats(input.healthSafetyDashboard, input.safetyStats);
  const correspondenceMetrics = resolveCorrespondenceMetrics(
    input.correspondence.period,
    input.correspondence.summary
  );

  const activeBottlenecks = input.bottleneckItems.filter((item) => item.description.trim());
  const machineryRows = input.machineryRows ?? [];

  return [
    {
      title: 'PROJECT INFORMATION',
      sheet: 'summary',
      headers: ['Project Name', 'Location', 'Report Date'],
      rows: [[projectName, location, reportDate]],
    },
    {
      title: 'PROJECT DATES',
      sheet: 'projectDates',
      headers: [
        'Date Type',
        'Start Date',
        'Contract Finish',
        'Forecast Finish',
        'EOT Date',
        'Elapsed Duration (Days)',
        'Remaining Duration (Days)',
        'Forecast Duration (Days)',
        'EOT Duration (Days)',
        'Schedule Status',
        'Delay Days',
      ],
      rows: [
        buildProjectDatesRow('SCL', input.projectDates.scl),
        buildProjectDatesRow('Contractor', input.projectDates.contractor),
      ],
    },
    {
      title: 'CONTRACT VALUES',
      sheet: 'contractValues',
      headers: [
        'Type',
        'Original Contract Value',
        'Excess Value',
        'Revised Contract  Value',
        'Saving',
        'Growth %',
      ],
      rows: [
        buildContractValueRow('SCL', input.contractValues.scl),
        buildContractValueRow('Contractor', input.contractValues.contractor),
      ],
    },
    {
      title: 'INVOICING INFORMATION',
      sheet: 'invoicing',
      headers: [
        'Type',
        'Gross Billed',
        'Gross Certified Billed',
        'Difference',
        'Certification Efficiency',
      ],
      rows: [
        buildInvoicingRow('SCL', input.invoicing.scl),
        buildInvoicingRow('Contractor', input.invoicing.contractor),
      ],
    },
    {
      title: 'PLANNED VS ACTUAL',
      sheet: 'financial',
      headers: ['Type', 'Planned Value', 'Actual Value', 'Variance', 'Performance Index'],
      rows: [
        buildPlannedActualRow('SCL', input.plannedEarned?.scl),
        buildPlannedActualRow('Contractor', input.plannedEarned?.contractor),
      ],
    },
    {
      title: 'INTERNAL COST PERFORMANCE',
      sheet: 'financial',
      headers: ['BCWS', 'BCWP', 'ACWP', 'Variance', 'Cost Performance Index'],
      rows: [
        [
          formatReportCurrency(input.internalCost.bcws),
          formatReportCurrency(input.internalCost.bcwp),
          formatReportCurrency(input.internalCost.acwp),
          formatReportCurrency(costVariance),
          formatReportIndex(costPerformanceIndex),
        ],
      ],
    },
    {
      title: 'CONTRACT PERFORMANCE',
      sheet: 'financial',
      headers: ['Billed Value', 'Receipt Value', 'Variance', 'Collection Performance'],
      rows: [
        [
          formatReportCurrency(input.contractPerformance?.billedValue),
          formatReportCurrency(input.contractPerformance?.actualReceiptValue),
          formatReportCurrency(input.contractPerformance?.variance),
          input.contractPerformance?.performancePercentage != null
            ? formatReportPercent(input.contractPerformance.performancePercentage)
            : REPORT_NA,
        ],
      ],
    },
    {
      title: 'COST PERFORMANCE TREND',
      sheet: 'financial',
      headers: ['Period', 'BCWS', 'BCWP', 'ACWP', 'Forecast'],
      rows: input.costPerformanceData.map((row) => [
        formatReportMonth(row.month),
        formatReportCurrency(row.bcws),
        formatReportCurrency(row.bcwp),
        formatReportCurrency(row.acwp),
        formatReportCurrency(row.fcst),
      ]),
    },
    {
      title: 'CASHFLOW',
      sheet: 'financial',
      headers: [
        'Period',
        'Cash In (Monthly Actual)',
        'Cash Out (Monthly Actual)',
        'Cumulative Plan In',
        'Cumulative Plan Out',
        'Cumulative Actual In',
        'Cumulative Actual Out',
      ],
      rows: input.cashflowData.map((row) => [
        formatReportMonth(row.month),
        formatReportCurrency(row.cashIn),
        formatReportCurrency(row.cashOut),
        formatReportCurrency(row.cumPlanIn),
        formatReportCurrency(row.cumPlanOut),
        formatReportCurrency(row.cumActualIn),
        formatReportCurrency(row.cumActualOut),
      ]),
    },
    {
      title: 'BUDGET PERFORMANCE',
      sheet: 'financial',
      headers: ['Metric', 'Value'],
      rows: input.budgetPerformanceData
        ? [
            ['Budget at Completion', formatReportCurrency(input.budgetPerformanceData.bac)],
            ['Estimate at Completion', formatReportCurrency(input.budgetPerformanceData.eac)],
            ['Estimate to Go', formatReportCurrency(input.budgetPerformanceData.etg)],
            ['Variance at Completion', formatReportCurrency(input.budgetPerformanceData.vac)],
            ['Variance to Date', formatReportCurrency(input.budgetPerformanceData.cv)],
          ]
        : [],
    },
    {
      title: 'MANPOWER HISTOGRAM',
      sheet: 'financial',
      headers: ['Period', 'Planned Manpower', 'Actual Manpower'],
      rows: input.manpowerData.map((row) => [
        formatReportMonth(row.month),
        formatReportCell(row.planned),
        formatReportCell(row.actual),
      ]),
    },
    {
      title: 'PHYSICAL PROGRESS S-CURVE',
      sheet: 'financial',
      headers: [
        'Period',
        'Monthly Planned %',
        'Monthly Actual %',
        'Cumulative Planned %',
        'Cumulative Actual %',
      ],
      rows: input.projectProgressData.map((row) => [
        formatReportMonth(row.month),
        formatReportPercent(row.monthlyPlanned),
        formatReportPercent(row.monthlyActual),
        formatReportPercent(row.cumulativePlanned ?? row.planned),
        formatReportPercent(row.cumulativeActual ?? row.actual),
      ]),
    },
    {
      title: 'HEALTH & SAFETY SCORECARD',
      sheet: 'healthSafety',
      headers: HSE_SCORECARD_EXPORT_HEADERS,
      rows: hseStats ? [buildHseRow(hseStats)] : [],
    },
    {
      title: 'HEALTH & SAFETY MONTHLY TREND',
      sheet: 'healthSafety',
      headers: ['Period', ...HSE_SCORECARD_EXPORT_HEADERS],
      rows: (input.healthSafetyDashboard?.monthlyRecords ?? []).map(buildHseTrendRow),
    },
    {
      title: 'QUALITY STATUS',
      sheet: 'quality',
      headers: ['Tests Required', 'Tests Conducted', 'Shortfall', 'Quality Performance'],
      rows: input.qualityMonthlyRecord
        ? [
            [
              formatReportCell(input.qualityMonthlyRecord.testsRequired),
              formatReportCell(input.qualityMonthlyRecord.testsConducted),
              formatReportCell(input.qualityMonthlyRecord.shortfall),
              formatReportPercent(input.qualityMonthlyRecord.qualityPerformance),
            ],
          ]
        : [],
    },
    {
      title: 'PROJECT QUALITY YEAR TREND',
      sheet: 'quality',
      headers: [
        'Period',
        'Tests Required',
        'Tests Conducted',
        'Shortfall',
        'Quality Performance',
      ],
      rows: input.qualityYearRecords.map((record) => [
        monthYearLabel(record.month, record.year),
        formatReportCell(record.testsRequired),
        formatReportCell(record.testsConducted),
        formatReportCell(record.shortfall),
        formatReportPercent(record.qualityPerformance),
      ]),
    },
    {
      title: 'DRAWINGS SUMMARY',
      sheet: 'drawings',
      headers: ['Submitted', 'Approved', 'Variance', 'Approval Rate'],
      rows: input.drawingProjectSummary
        ? [
            [
              formatReportCell(input.drawingProjectSummary.submittedDrawings),
              formatReportCell(input.drawingProjectSummary.approvedDrawings),
              formatReportCell(input.drawingProjectSummary.variance),
              formatReportPercent(input.drawingProjectSummary.approvalRate),
            ],
          ]
        : [],
    },
    {
      title: 'DRAWINGS MONTHLY STATUS',
      sheet: 'drawings',
      headers: ['Period', 'Submitted', 'Approved', 'Variance', 'Approval Rate'],
      rows: input.drawingMonthlyRecord ? [buildDrawingRow(input.drawingMonthlyRecord)] : [],
    },
    {
      title: 'DRAWINGS YEAR TREND',
      sheet: 'drawings',
      headers: ['Period', 'Submitted', 'Approved', 'Variance', 'Approval Rate'],
      rows: input.drawingYearRecords.map(buildDrawingRow),
    },
    {
      title: 'CORRESPONDENCE & DELIVERY',
      sheet: 'correspondence',
      headers: [
        'Type',
        'Received',
        'Delivered',
        'Pending',
        'Late Deliveries',
        'Delivery Efficiency',
      ],
      rows: [
        buildCorrespondenceRow('Client', correspondenceMetrics.client),
        buildCorrespondenceRow('Contractor', correspondenceMetrics.contractor),
      ],
    },
    {
      title: 'BOTTLENECK SUMMARY',
      sheet: 'bottleneck',
      headers: ['Total Issues', 'Total Concerns', 'Total Risks', 'Total Actions'],
      rows: [
        [
          formatReportCell(countBottleneckByType(activeBottlenecks, 'ISSUE')),
          formatReportCell(countBottleneckByType(activeBottlenecks, 'CONCERN')),
          formatReportCell(countBottleneckByType(activeBottlenecks, 'RISK')),
          formatReportCell(countBottleneckByType(activeBottlenecks, 'ACTION')),
        ],
      ],
    },
    {
      title: 'BOTTLENECK RECORDS',
      sheet: 'bottleneck',
      headers: ['Type', 'Description', 'Priority', 'Status', 'Assigned To', 'Due Date'],
      rows: activeBottlenecks.map(buildBottleneckRow),
    },
    {
      title: 'SITE MACHINERY',
      sheet: 'machinery',
      headers: ['Machine Name', 'Quantity', 'Status', 'Remarks'],
      rows: machineryRows.map((row) => [
        formatReportCell(row.particular),
        formatReportCell(parseMachineryQty(row.qty)),
        normalizeReportStatus(row.status),
        formatReportCell(row.remark),
      ]),
    },
    {
      title: 'PROJECT EQUIPMENT',
      sheet: 'equipment',
      headers: ['Month', 'Planned', 'Actual', 'Variance', 'Performance %'],
      rows: input.equipmentData.map((row) => [
        formatReportMonth(row.equipmentMonth),
        formatReportCell(row.plannedEquipment),
        formatReportCell(row.actualEquipment),
        formatReportCell(row.variance),
        formatReportPercent(row.performancePercentage),
      ]),
    },
  ];
}

function reportFilenameBase(projectTitle: string): string {
  const safeName = (projectTitle || 'project').replace(/[^a-z0-9]/gi, '_');
  const stamp = formatReportTodayDate().replace(/-/g, '');
  return `TL_Project_${safeName}_ManagementReport_${stamp}`;
}

async function resolveMachineryRows(input: ProjectReportExportInput): Promise<MachineryRow[]> {
  return (
    input.machineryRows ??
    (await fetchLatestMachineryRows(input.project.title, input.machineryRole))
  );
}

export function buildProjectReportCsv(input: ProjectReportExportInput): string {
  return composeCsvDocument(buildProjectReportSections(input));
}

/** @deprecated Use downloadProjectReportXlsx */
export async function downloadProjectReportCsv(input: ProjectReportExportInput): Promise<void> {
  return downloadProjectReportXlsx(input);
}

/** @deprecated Use downloadProjectReportXlsx */
export async function downloadProjectReport(input: ProjectReportExportInput): Promise<void> {
  return downloadProjectReportXlsx(input);
}

export async function downloadProjectReportXlsx(input: ProjectReportExportInput): Promise<void> {
  const machineryRows = await resolveMachineryRows(input);
  const sections = buildProjectReportSections({ ...input, machineryRows });
  const filename = `${reportFilenameBase(input.project.title)}.xlsx`;
  const { downloadProjectReportExcel } = await import('./projectReportExcel');
  await downloadProjectReportExcel(sections, filename);
}

export async function prepareProjectReportExport(
  input: ProjectReportExportInput
): Promise<{ sections: CsvReportSection[]; machineryRows: MachineryRow[] }> {
  const machineryRows = await resolveMachineryRows(input);
  const sections = buildProjectReportSections({ ...input, machineryRows });
  return { sections, machineryRows };
}
