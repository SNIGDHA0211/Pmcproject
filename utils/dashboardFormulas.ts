export const DIVISION_BY_ZERO_NOTE =
  'If the denominator is zero, percentage values default to 0.0 to avoid crashes.';

export interface DashboardFormulaSpec {
  title: string;
  apiEndpoint: string;
  calculatedFields?: string[];
  formulas: string[];
  statusRules?: string[];
  notes?: string[];
}

export const DASHBOARD_FORMULAS = {
  projectQualityStatus: {
    title: 'Project Quality Status Formula',
    apiEndpoint: '/api/project-quality/project/{projectName}/month/{month}/year/{year}/',
    calculatedFields: ['shortfall', 'qualityPerformance', 'completionRate'],
    formulas: [
      'shortfall = testsRequired - testsConducted',
      'qualityPerformance = (testsPassed / testsConducted) × 100',
      'completionRate = (testsConducted / testsRequired) × 100',
    ],
    statusRules: [
      'excellent: qualityPerformance 95–100%',
      'good: qualityPerformance 85–94%',
      'needs_attention: qualityPerformance 70–84%',
      'critical: qualityPerformance below 70%',
    ],
  },
  constructionProgress: {
    title: 'Construction Progress Formula',
    apiEndpoint: '/api/construction-progress/',
    calculatedFields: ['variance', 'performancePercentage'],
    formulas: [
      'variance = actualProgress - plannedProgress',
      'performancePercentage = (actualProgress / plannedProgress) × 100',
    ],
    notes: [
      'Negative variance means behind schedule.',
      'Positive variance means ahead of schedule.',
    ],
    statusRules: [
      'on_track: performancePercentage >= 100%',
      'slight_delay: performancePercentage >= 80%',
      'delayed: performancePercentage >= 60%',
      'critical: performancePercentage < 60%',
    ],
  },
  projectEquipment: {
    title: 'Project Equipment Formula',
    apiEndpoint: '/api/project-equipment/',
    calculatedFields: ['variance', 'performancePercentage'],
    formulas: [
      'variance = actualEquipment - plannedEquipment',
      'performancePercentage = (actualEquipment / plannedEquipment) × 100',
    ],
    notes: [
      'Negative variance means equipment shortfall.',
      'Positive variance means equipment surplus.',
    ],
    statusRules: [
      'fully_deployed: performancePercentage >= 100%',
      'near_target: performancePercentage >= 80%',
      'shortfall: performancePercentage >= 60%',
      'critical_shortfall: performancePercentage < 60%',
    ],
  },
  correspondence: {
    title: 'Correspondence & Delivery Status Formula',
    apiEndpoint: '/api/correspondence/project/{projectName}/month/{month}/year/{year}/',
    calculatedFields: [
      'correspondenceDelivered',
      'onTimeDelivered',
      'lateDeliveries',
      'pendingCorrespondence',
      'deliveryEfficiency',
    ],
    formulas: [
      'Delivered = On Time + Late Deliveries',
      'Received = Delivered + Pending',
      'Delivery Efficiency = (On Time / Delivered) × 100',
    ],
    statusRules: [
      'Excellent: delivery efficiency 95–100%',
      'Good: 85–94%',
      'Needs Attention: 70–84%',
      'Critical: below 70%',
    ],
  },
  budgetVsCost: {
    title: 'Budget vs Cost Performance Formula',
    apiEndpoint: '/api/budget-performance/',
    calculatedFields: ['cpi', 'eac', 'etg', 'vac', 'cv'],
    formulas: [
      'cpi = BCWP / ACWP',
      'eac = BAC / CPI',
      'etg = EAC - ACWP',
      'vac = BAC - EAC',
      'cv = BCWP - ACWP',
    ],
    notes: [
      'CPI > 1 means under budget.',
      'CPI < 1 means over budget.',
      'VAC positive means project may finish under budget.',
      'VAC negative means project may finish over budget.',
    ],
  },
  projectCostPerformance: {
    title: 'Financial Progress Formula',
    apiEndpoint: '/api/cost-performance/',
    calculatedFields: ['eac', 'cv', 'sv', 'cpi', 'vac'],
    formulas: [
      'eac = ACWP + FCST',
      'cv = BCWP - ACWP',
      'sv = BCWP - BCWS',
      'cpi = BCWP / ACWP',
      'vac = BAC - EAC',
    ],
    notes: [
      'CV negative means over budget.',
      'SV negative means behind schedule.',
      'CPI is null or 0-safe when ACWP is 0.',
      'VAC is calculated only if BAC is provided.',
    ],
  },
  contractPerformance: {
    title: 'Contract Performance Formula',
    apiEndpoint: '/api/contract-performance/',
    calculatedFields: ['variance', 'variancePercentage', 'performancePercentage', 'collectionEfficiency'],
    formulas: [
      'variance = billedValue - actualReceiptValue',
      'variancePercentage = (variance / billedValue) × 100',
      'performancePercentage = (actualReceiptValue / billedValue) × 100',
      'collectionEfficiency = actualReceiptValue / billedValue',
    ],
    statusRules: [
      'excellent: performancePercentage >= 100%',
      'good: performancePercentage >= 90%',
      'average: performancePercentage >= 75%',
      'poor: performancePercentage < 75%',
    ],
  },
  plannedVsEarnedValue: {
    title: 'Planned vs Actual Value Formula',
    apiEndpoint: '/api/planned-earned-value/project/{projectName}/month/{month}/year/{year}/',
    calculatedFields: ['variance', 'variancePercentage', 'performancePercentage', 'schedulePerformanceIndex'],
    formulas: [
      'variance = actualValue - plannedValue',
      'variancePercentage = (variance / plannedValue) × 100',
      'performancePercentage = (actualValue / plannedValue) × 100',
      'schedulePerformanceIndex = actualValue / plannedValue',
    ],
    statusRules: [
      'ahead: performancePercentage >= 100%',
      'on_track: performancePercentage >= 90%',
      'at_risk: performancePercentage >= 75%',
      'behind: performancePercentage < 75%',
    ],
  },
  cashFlow: {
    title: 'Cash Flow Formula',
    apiEndpoint: '/api/cashflow/',
    calculatedFields: [
      'cash_in_cumulative_plan',
      'cash_in_cumulative_actual',
      'cash_out_cumulative_plan',
      'cash_out_cumulative_actual',
      'actual_cost_cumulative',
    ],
    formulas: [
      'cash_in_cumulative_plan = sum of cash_in_monthly_plan up to selected month',
      'cash_in_cumulative_actual = sum of cash_in_monthly_actual up to selected month',
      'cash_out_cumulative_plan = sum of cash_out_monthly_plan up to selected month',
      'cash_out_cumulative_actual = sum of cash_out_monthly_actual up to selected month',
      'actual_cost_cumulative = sum of actual_cost_monthly up to selected month',
    ],
    notes: ['Rows are sorted chronologically before cumulative totals are calculated.'],
  },
  projectDates: {
    title: 'Project Dates Formula',
    apiEndpoint: '/api/project-dates/project/{projectName}/',
    calculatedFields: [
      'elapsed_duration',
      'remaining_duration',
      'forecast_finish_duration',
      'eot_duration',
      'delay_days',
      'eot_delay_days',
      'current_delay',
    ],
    formulas: [
      'scheduleHealth = remaining_duration > 0 ? clamp(100 - ((delay_days / elapsed_duration) * 100), 0, 100) : 0',
      'current_delay <= 0 → On Schedule',
      'current_delay > 0 → Overdue by current_delay Days',
    ],
    notes: ['Duration and delay values are calculated by the backend and displayed as returned.'],
  },
  healthSafety: {
    title: 'Health & Safety Status Formula',
    apiEndpoint: '/api/health-safety/',
    calculatedFields: ['totalIncidents', 'ltifr', 'incidentRate'],
    formulas: [
      'totalIncidents = fatalities + significant + major + minor + nearMiss',
      'ltifr = (lossOfManhours / totalManhours) × 1,000,000',
      'incidentRate = (totalIncidents / totalManhours) × 1,000,000',
    ],
  },
} satisfies Record<string, DashboardFormulaSpec>;
