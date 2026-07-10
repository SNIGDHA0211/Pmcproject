import type {
  CorrespondenceMonthlyPeriod,
  CorrespondencePartyMetrics,
  CorrespondenceProjectSummary,
} from '../types';
import type { CorrespondenceDashboardResponse } from '../services/api';
import { normalizeCorrespondenceDashboardParty } from '../services/api';
import type { PMCExecutiveTab } from '../components/pmcHead/PMCHeadExecutiveShell';

/** Scroll anchor ids: `tl-section-*` (team lead) / `exec-section-*` (PMC head). */
export type ExecutiveOverviewAnchor =
  | 'correspondence'
  | 'drawings'
  | 'hse'
  | 'quality'
  | 'progress'
  | 'financial'
  | 'planned-vs-actual'
  | 'contract-values'
  | 'invoicing'
  | 'manpower'
  | 'schedule'
  | 'risk'
  | 'equipment';

export type TeamLeaderOverviewSection =
  | 'contractor'
  | 'financial'
  | 'compliance'
  | 'correspondence'
  | 'drawings'
  | 'people'
  | 'risk'
  | 'charts';

export type ExecutiveCorrespondencePartyStats = {
  received: number;
  delivered: number;
  pending: number;
  onTime: number;
  late: number;
  efficiency: number;
};

export type ExecutiveCorrespondenceStats = {
  client: ExecutiveCorrespondencePartyStats;
  contractor: ExecutiveCorrespondencePartyStats;
};

function partyFromMetrics(
  metrics: CorrespondencePartyMetrics,
): ExecutiveCorrespondencePartyStats {
  return {
    received: metrics.correspondenceReceived ?? 0,
    delivered: metrics.correspondenceDelivered ?? 0,
    pending: metrics.pendingCorrespondence ?? 0,
    onTime: metrics.onTimeDelivered ?? 0,
    late: metrics.lateDeliveries ?? 0,
    efficiency: Math.min(100, Math.max(0, metrics.deliveryEfficiency ?? 0)),
  };
}

function buildExecutiveCorrespondenceStatsFromParties(
  client: CorrespondencePartyMetrics,
  contractor: CorrespondencePartyMetrics,
): ExecutiveCorrespondenceStats | null {
  const clientStats = partyFromMetrics(client);
  const contractorStats = partyFromMetrics(contractor);

  const hasData =
    clientStats.received +
      clientStats.delivered +
      clientStats.pending +
      clientStats.onTime +
      clientStats.late +
      contractorStats.received +
      contractorStats.delivered +
      contractorStats.pending +
      contractorStats.onTime +
      contractorStats.late >
    0;

  return hasData ? { client: clientStats, contractor: contractorStats } : null;
}

export function buildExecutiveCorrespondenceStatsFromDashboard(
  dashboard: CorrespondenceDashboardResponse | null | undefined,
): ExecutiveCorrespondenceStats | null {
  if (!dashboard?.client || !dashboard?.contractor) return null;

  return buildExecutiveCorrespondenceStatsFromParties(
    normalizeCorrespondenceDashboardParty(dashboard.client),
    normalizeCorrespondenceDashboardParty(dashboard.contractor),
  );
}

export function buildExecutiveCorrespondenceStats(
  period: CorrespondenceMonthlyPeriod | null,
  summary: CorrespondenceProjectSummary | null,
): ExecutiveCorrespondenceStats | null {
  const source = period ?? summary;
  if (!source?.client || !source?.contractor) return null;

  return buildExecutiveCorrespondenceStatsFromParties(source.client, source.contractor);
}

export function resolveExecutiveCorrespondenceStats(options: {
  dashboard?: CorrespondenceDashboardResponse | null;
  cumulativePeriod?: CorrespondenceMonthlyPeriod | null;
  period?: CorrespondenceMonthlyPeriod | null;
  summary?: CorrespondenceProjectSummary | null;
}): ExecutiveCorrespondenceStats | null {
  return (
    buildExecutiveCorrespondenceStatsFromDashboard(options.dashboard) ??
    buildExecutiveCorrespondenceStats(options.cumulativePeriod ?? null, null) ??
    buildExecutiveCorrespondenceStats(options.period ?? null, options.summary ?? null)
  );
}

const TAB_TO_TL_SECTION: Partial<Record<PMCExecutiveTab, TeamLeaderOverviewSection>> = {
  overview: 'charts',
  schedule: 'contractor',
  money: 'financial',
  people: 'people',
  risk: 'risk',
  compliance: 'compliance',
};

const ANCHOR_TO_TL_SECTION: Partial<Record<ExecutiveOverviewAnchor, TeamLeaderOverviewSection>> = {
  correspondence: 'correspondence',
  drawings: 'drawings',
  hse: 'compliance',
  quality: 'compliance',
  progress: 'charts',
  financial: 'financial',
  'planned-vs-actual': 'financial',
  'contract-values': 'contractor',
  invoicing: 'contractor',
  manpower: 'people',
  schedule: 'contractor',
  risk: 'risk',
  equipment: 'people',
};

export function resolveTeamLeaderOverviewSection(
  tab: PMCExecutiveTab,
  anchor?: ExecutiveOverviewAnchor,
): TeamLeaderOverviewSection {
  if (anchor && ANCHOR_TO_TL_SECTION[anchor]) {
    return ANCHOR_TO_TL_SECTION[anchor]!;
  }
  return TAB_TO_TL_SECTION[tab] ?? 'charts';
}

const TL_SECTION_ELEMENT_IDS: Partial<Record<TeamLeaderOverviewSection, string>> = {
  correspondence: 'exec-section-correspondence',
  drawings: 'exec-section-drawings',
  contractor: 'tl-section-contractor',
  financial: 'tl-section-financial',
  compliance: 'tl-section-compliance',
  people: 'tl-section-people',
  risk: 'tl-section-risk',
  charts: 'tl-section-charts',
};

export function teamLeaderSectionElementId(section: TeamLeaderOverviewSection): string {
  return TL_SECTION_ELEMENT_IDS[section] ?? `tl-section-${section}`;
}

export function scrollToOverviewSection(
  anchor: ExecutiveOverviewAnchor,
  mode: 'team-lead' | 'pmc-head',
): void {
  const teamLeadIds: Partial<Record<ExecutiveOverviewAnchor, string>> = {
    correspondence: 'exec-section-correspondence',
    drawings: 'exec-section-drawings',
    hse: 'tl-section-hse',
    quality: 'tl-section-quality',
    progress: 'tl-section-charts',
    financial: 'tl-section-financial',
    'planned-vs-actual': 'exec-section-planned-vs-actual',
    'contract-values': 'tl-section-contract-values',
    invoicing: 'tl-section-invoicing',
    manpower: 'tl-section-people',
    schedule: 'tl-section-contractor',
    risk: 'tl-section-risk',
    equipment: 'tl-section-people',
  };

  const pmcHeadIds: Partial<Record<ExecutiveOverviewAnchor, string>> = {
    correspondence: 'exec-section-correspondence',
    drawings: 'exec-section-drawings',
    hse: 'exec-section-risk',
    quality: 'exec-section-quality',
    progress: 'tl-section-charts',
    financial: 'exec-section-financial',
    'planned-vs-actual': 'exec-section-planned-vs-actual',
    'contract-values': 'exec-section-contract-values',
    invoicing: 'exec-section-invoicing',
    manpower: 'exec-section-manpower',
    schedule: 'exec-section-schedule',
    risk: 'exec-section-risk',
    equipment: 'exec-section-manpower',
  };

  const elementId = (mode === 'team-lead' ? teamLeadIds : pmcHeadIds)[anchor];
  if (!elementId) return;

  window.setTimeout(() => {
    document.getElementById(elementId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, 180);
}
