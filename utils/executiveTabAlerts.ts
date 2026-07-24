import type { ProjectDatesRecord } from '../services/api';
import type { BottleneckItem } from './bottleneck';
import type { ProjectHealthTone } from './projectDashboardMetrics';

export type ExecutiveAlertTab =
  | 'overview'
  | 'schedule'
  | 'money'
  | 'people'
  | 'risk'
  | 'compliance';

export type TabLookHereItem = {
  id: string;
  label: string;
  hint: string;
  /** DOM id to scroll/highlight (e.g. exec-section-schedule) */
  sectionId?: string;
  /** When on Overview, switch to this tab first */
  goToTab?: ExecutiveAlertTab;
  severity: 'critical' | 'warning';
};

export type ExecutiveTabAlert = {
  count: number;
  severity: 'critical' | 'warning' | 'info';
  lookHere: TabLookHereItem[];
};

export type ExecutiveTabAlertsMap = Record<ExecutiveAlertTab, ExecutiveTabAlert>;

type BuildArgs = {
  healthTone: ProjectHealthTone;
  sclDates: ProjectDatesRecord | null;
  contractorDates: ProjectDatesRecord | null;
  openIssuesCount: number;
  bottleneckItems: BottleneckItem[];
  drawingApprovalPct: number | null;
  correspondencePending: number;
  /** Gauge 0–100; values &lt; 100 mean CPI &lt; 1 */
  cpiPct: number | null;
  hseStatus: string | null | undefined;
  delayDays: number | null;
  criticalRisks: number;
};

const empty = (): ExecutiveTabAlert => ({ count: 0, severity: 'info', lookHere: [] });

function delayOf(d: ProjectDatesRecord | null | undefined): number {
  return Math.max(0, Number(d?.delay_days ?? d?.current_delay ?? 0) || 0);
}

/**
 * Counts important issues per executive tab and builds “look here” cues
 * so leadership sees badges on nav, then lands on the right blocks.
 */
export function buildExecutiveTabAlerts(args: BuildArgs): ExecutiveTabAlertsMap {
  const map: ExecutiveTabAlertsMap = {
    overview: empty(),
    schedule: empty(),
    money: empty(),
    people: empty(),
    risk: empty(),
    compliance: empty(),
  };

  const sclDelay = delayOf(args.sclDates);
  const contractorDelay = delayOf(args.contractorDates);
  const highPriorityOpen = args.bottleneckItems.filter(
    (b) => b.status !== 'Closed' && b.priority === 'High' && b.description.trim(),
  );
  const openRisks = args.bottleneckItems.filter(
    (b) => b.type === 'RISK' && b.status !== 'Closed' && b.description.trim(),
  );
  const hseCritical = String(args.hseStatus ?? '').toUpperCase() === 'CRITICAL';
  const drawingsLow =
    args.drawingApprovalPct != null &&
    Number.isFinite(args.drawingApprovalPct) &&
    args.drawingApprovalPct < 75;
  const cpi =
    args.cpiPct != null && Number.isFinite(args.cpiPct) && args.cpiPct > 0
      ? args.cpiPct / 100
      : null;
  const cpiLow = cpi != null && cpi < 1;
  const hasOpenIssues = args.openIssuesCount > 0;
  const scheduleDelay = Math.max(sclDelay, contractorDelay, args.delayDays ?? 0);

  // —— Schedule ——
  if (sclDelay > 0) {
    map.schedule.lookHere.push({
      id: 'scl-delay',
      label: 'SCL delay',
      hint: `${sclDelay} day${sclDelay === 1 ? '' : 's'}`,
      sectionId: 'exec-section-schedule',
      severity: 'critical',
    });
  }
  if (contractorDelay > 0) {
    map.schedule.lookHere.push({
      id: 'contractor-delay',
      label: 'Contractor delay',
      hint: `${contractorDelay} day${contractorDelay === 1 ? '' : 's'}`,
      sectionId: 'exec-section-schedule',
      severity: 'critical',
    });
  }
  if (scheduleDelay > 0 && map.schedule.lookHere.length === 0) {
    map.schedule.lookHere.push({
      id: 'project-delay',
      label: 'Project delay',
      hint: `${scheduleDelay} days`,
      sectionId: 'exec-section-schedule',
      severity: 'critical',
    });
  }

  // —— Risk (includes HSE for PMC Head) ——
  if (hseCritical) {
    map.risk.lookHere.push({
      id: 'hse',
      label: 'HSE',
      hint: 'Critical',
      sectionId: 'exec-section-risk',
      severity: 'critical',
    });
  }
  if (args.criticalRisks > 0 || openRisks.length > 0) {
    const n = Math.max(args.criticalRisks, openRisks.length);
    map.risk.lookHere.push({
      id: 'critical-risks',
      label: 'Risks',
      hint: `${n} open`,
      sectionId: 'exec-section-risk',
      severity: 'critical',
    });
  }
  if (highPriorityOpen.length > 0) {
    map.risk.lookHere.push({
      id: 'high-priority',
      label: 'High priority',
      hint: `${highPriorityOpen.length} open`,
      sectionId: 'exec-section-risk',
      severity: 'warning',
    });
  } else if (hasOpenIssues && map.risk.lookHere.length === 0) {
    map.risk.lookHere.push({
      id: 'open-issues',
      label: 'Open issues',
      hint: `${args.openIssuesCount}`,
      sectionId: 'exec-section-risk',
      severity: 'warning',
    });
  }

  // —— Compliance ——
  if (drawingsLow) {
    map.compliance.lookHere.push({
      id: 'drawings',
      label: 'Drawings',
      hint: `${Math.round(args.drawingApprovalPct!)}% approved`,
      sectionId: 'exec-section-drawings',
      severity: 'warning',
    });
  }
  if (args.correspondencePending > 0) {
    map.compliance.lookHere.push({
      id: 'correspondence',
      label: 'Correspondence',
      hint: `${args.correspondencePending} pending`,
      sectionId: 'exec-section-correspondence',
      severity: 'warning',
    });
  }

  // —— Money ——
  if (cpiLow) {
    map.money.lookHere.push({
      id: 'cpi',
      label: 'CPI',
      hint: cpi!.toFixed(2),
      sectionId: 'exec-section-financial',
      severity: 'critical',
    });
  }

  // —— Overview roll-up ——
  if (args.healthTone === 'bad' || args.healthTone === 'warn') {
    map.overview.lookHere.push({
      id: 'health',
      label: 'Health',
      hint: args.healthTone === 'bad' ? 'Critical' : 'At risk',
      goToTab: scheduleDelay > 0 ? 'schedule' : args.criticalRisks > 0 ? 'risk' : 'overview',
      severity: args.healthTone === 'bad' ? 'critical' : 'warning',
    });
  }
  if (scheduleDelay > 0) {
    map.overview.lookHere.push({
      id: 'ov-delay',
      label: 'Schedule',
      hint: `${scheduleDelay} days delay`,
      goToTab: 'schedule',
      sectionId: 'exec-section-schedule',
      severity: 'critical',
    });
  }
  if (args.criticalRisks > 0 || highPriorityOpen.length >= 2) {
    map.overview.lookHere.push({
      id: 'ov-risk',
      label: 'Risk',
      hint: `${Math.max(args.criticalRisks, highPriorityOpen.length)} items`,
      goToTab: 'risk',
      sectionId: 'exec-section-risk',
      severity: 'critical',
    });
  }
  if (cpiLow) {
    map.overview.lookHere.push({
      id: 'ov-cpi',
      label: 'Financial',
      hint: `CPI ${cpi!.toFixed(2)}`,
      goToTab: 'money',
      sectionId: 'exec-section-financial',
      severity: 'warning',
    });
  }
  if (hseCritical) {
    map.overview.lookHere.push({
      id: 'ov-hse',
      label: 'HSE',
      hint: 'Critical',
      goToTab: 'risk',
      sectionId: 'exec-section-risk',
      severity: 'critical',
    });
  }
  if (drawingsLow) {
    map.overview.lookHere.push({
      id: 'ov-drawings',
      label: 'Compliance',
      hint: `Drawings ${Math.round(args.drawingApprovalPct!)}%`,
      goToTab: 'compliance',
      sectionId: 'exec-section-drawings',
      severity: 'warning',
    });
  }

  (Object.keys(map) as ExecutiveAlertTab[]).forEach((tab) => {
    const items = map[tab].lookHere;
    map[tab].count = items.length;
    map[tab].severity = items.some((i) => i.severity === 'critical')
      ? 'critical'
      : items.length > 0
        ? 'warning'
        : 'info';
  });

  return map;
}

/** Briefly highlight a section so the user can see where to look. */
export function flashExecutiveSection(sectionId: string): void {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.classList.add('pmc-look-here-flash');
  window.setTimeout(() => el.classList.remove('pmc-look-here-flash'), 2600);
}
