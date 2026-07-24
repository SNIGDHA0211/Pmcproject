import type { ProjectDatesRecord } from '../services/api';
import type { BottleneckItem } from './bottleneck';
import type { ProjectHealthTone } from './projectDashboardMetrics';
import type { PMCExecutiveTab } from '../components/pmcHead/PMCHeadExecutiveShell';

export type InsightTone = 'positive' | 'negative' | 'neutral' | 'watch';
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export type ExecutiveAiSummary = {
  headline: string;
  healthLine: string;
  delayReasons: string[];
  majorRisks: string[];
  recommendedActions: string[];
  tone: ProjectHealthTone;
};

export type ActionableKpi = {
  id: string;
  label: string;
  value: string;
  trend: string;
  impact: string;
  status: 'critical' | 'watch' | 'good' | 'neutral';
  tab: PMCExecutiveTab;
  anchor?: string;
};

export type AiInsightItem = {
  id: string;
  category: 'positive' | 'negative' | 'bottleneck' | 'stagnant' | 'change';
  title: string;
  detail: string;
  tone: InsightTone;
};

export type PriorityAction = {
  id: string;
  title: string;
  reason: string;
  urgency: UrgencyLevel;
  tab: PMCExecutiveTab;
  actionLabel: string;
};

export type ProjectForecastInsight = {
  onTimeProbabilityPct: number;
  expectedCompletionLabel: string;
  forecastDelayDays: number;
  confidencePct: number;
  narrative: string;
};

export type RiskHeatCategory =
  | 'Schedule'
  | 'Financial'
  | 'Safety'
  | 'Quality'
  | 'Resources'
  | 'Compliance';

export type RiskHeatCell = {
  category: RiskHeatCategory;
  level: 0 | 1 | 2 | 3; // 0 none → 3 critical
  count: number;
  label: string;
};

export type DelayContributor = {
  id: string;
  label: string;
  days: number;
  impactPct: number;
  tab: PMCExecutiveTab;
};

export type ChangeTimelineItem = {
  id: string;
  direction: 'improved' | 'regressed' | 'unchanged';
  title: string;
  detail: string;
};

export type AiRecommendation = {
  id: string;
  action: string;
  expectedImpact: string;
  priority: UrgencyLevel;
  confidencePct: number;
  tab: PMCExecutiveTab;
};

export type ExecutiveDecisionPack = {
  summary: ExecutiveAiSummary;
  kpis: ActionableKpi[];
  insights: AiInsightItem[];
  priorities: PriorityAction[];
  forecast: ProjectForecastInsight;
  riskHeat: RiskHeatCell[];
  delayContributors: DelayContributor[];
  changes: ChangeTimelineItem[];
  recommendations: AiRecommendation[];
  briefMarkdown: string;
};

export type ExecutiveDecisionInput = {
  projectTitle: string;
  projectHealth: { label: string; tone: ProjectHealthTone };
  overallProgressPct: number;
  progressDeltaLabel?: string;
  summaryDelayDays: number;
  sclDelayDays: number;
  contractorDelayDays: number;
  criticalRisks: number;
  openIssuesCount: number;
  openBottleneckCount: number;
  healthSafetyLabel: string;
  drawingApprovalPct: number;
  cpiPct: number;
  contractValueLabel: string;
  sclDates?: ProjectDatesRecord | null;
  contractorDates?: ProjectDatesRecord | null;
  bottleneckItems?: BottleneckItem[];
  qualityPct?: number | null;
  decisionQueueTitles?: string[];
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const delayAbs = (n: number) => Math.abs(Math.round(n));

function classifyBottleneckCategory(item: BottleneckItem): RiskHeatCategory {
  const text = `${item.type} ${item.description}`.toLowerCase();
  if (/safet|hse|incident|accident|ppe/.test(text)) return 'Safety';
  if (/cost|cpi|invoice|billing|cash|financial|payment/.test(text)) return 'Financial';
  if (/quality|ncr|test|defect|material/.test(text)) return 'Quality';
  if (/manpower|labour|labor|resource|equipment|plant|crew/.test(text)) return 'Resources';
  if (/drawing|compliance|approval|correspond|statutory|bg\b|guarantee/.test(text)) return 'Compliance';
  if (item.type === 'RISK' || item.type === 'ISSUE') return 'Schedule';
  return 'Schedule';
}

function heatLevel(count: number, forcedCritical = false): 0 | 1 | 2 | 3 {
  if (forcedCritical || count >= 3) return 3;
  if (count === 2) return 2;
  if (count === 1) return 1;
  return 0;
}

export function buildExecutiveDecisionPack(input: ExecutiveDecisionInput): ExecutiveDecisionPack {
  const sclDelay = delayAbs(input.sclDelayDays);
  const coDelay = delayAbs(input.contractorDelayDays);
  const summaryDelay = delayAbs(input.summaryDelayDays);
  const maxDelay = Math.max(sclDelay, coDelay, summaryDelay);
  const progress = Math.round(input.overallProgressPct);
  const cpi = input.cpiPct > 0 ? input.cpiPct / 100 : null;
  const openBn = input.openBottleneckCount;
  const openIssues = input.openIssuesCount;
  const drawing = Math.round(input.drawingApprovalPct);
  const hseCritical = input.healthSafetyLabel.toUpperCase() === 'CRITICAL';
  const tone = input.projectHealth.tone;

  const delayReasons: string[] = [];
  if (coDelay > 0) delayReasons.push(`Contractor schedule is ${coDelay} days behind baseline`);
  if (sclDelay > 0) delayReasons.push(`SCL milestone track is ${sclDelay} days behind`);
  if (drawing < 75) delayReasons.push(`Drawing approval at ${drawing}% is constraining field progress`);
  if (cpi != null && cpi < 1) delayReasons.push(`Cost performance index ${cpi.toFixed(2)} indicates cost overrun pressure`);
  if (delayReasons.length === 0) delayReasons.push('No material schedule delay drivers detected from current vitals');

  const majorRisks: string[] = [];
  if (input.criticalRisks > 0) majorRisks.push(`${input.criticalRisks} critical risk(s) open in the bottleneck register`);
  if (hseCritical) majorRisks.push(`HSE status flagged CRITICAL — ${input.healthSafetyLabel}`);
  if (openBn > 0) majorRisks.push(`${openBn} open bottleneck item(s) need leadership closure`);
  if (tone === 'bad') majorRisks.push('Overall project health is Critical — recovery plan required');
  if (majorRisks.length === 0) majorRisks.push('No elevated risk cluster in current register');

  const recommendedActions: string[] = [];
  if (maxDelay > 0) recommendedActions.push('Convene recovery workshop on critical path and EOT exposure');
  if (input.criticalRisks > 0 || openBn > 0) recommendedActions.push('Clear critical bottlenecks and assign named owners this week');
  if (drawing < 75) recommendedActions.push('Escalate drawing backlog with design authority for release dates');
  if (cpi != null && cpi < 1) recommendedActions.push('Review cost recovery levers and pending certifications');
  if (recommendedActions.length === 0) recommendedActions.push('Maintain fortnightly executive pulse — hold course');

  const summary: ExecutiveAiSummary = {
    headline:
      tone === 'bad'
        ? `${input.projectTitle} requires immediate executive intervention`
        : tone === 'warn'
          ? `${input.projectTitle} is at risk — focused recovery needed`
          : `${input.projectTitle} is broadly on track with residual watch items`,
    healthLine: `Health: ${input.projectHealth.label} · Progress ${progress}% · Peak delay ${maxDelay}d`,
    delayReasons,
    majorRisks,
    recommendedActions,
    tone,
  };

  const progressTrendLabel = input.progressDeltaLabel?.trim() || 'vs last review';
  const kpis: ActionableKpi[] = [
    {
      id: 'health',
      label: 'Project health',
      value: input.projectHealth.label,
      trend: tone === 'bad' ? 'Worsened vs baseline' : tone === 'warn' ? 'Watch vs last review' : 'Stable / healthy',
      impact: tone === 'bad' ? 'Board escalation likely' : tone === 'warn' ? 'Recovery plan needed' : 'No escalation trigger',
      status: tone === 'bad' ? 'critical' : tone === 'warn' ? 'watch' : 'good',
      tab: 'risk',
    },
    {
      id: 'progress',
      label: 'Physical progress',
      value: `${progress}%`,
      trend: progressTrendLabel,
      impact: progress < 50 ? 'Behind delivery narrative' : 'Supports completion story',
      status: progress < 40 ? 'critical' : progress < 70 ? 'watch' : 'good',
      tab: 'schedule',
      anchor: 'progress',
    },
    {
      id: 'co-delay',
      label: 'Contractor delay',
      value: `${coDelay}d`,
      trend: coDelay > 0 ? `+${coDelay}d vs contract path` : 'On / ahead of path',
      impact: coDelay > 90 ? 'High liquidated damages exposure' : coDelay > 0 ? 'EOT / claims pressure' : 'Low schedule claim risk',
      status: coDelay >= 90 ? 'critical' : coDelay > 0 ? 'watch' : 'good',
      tab: 'schedule',
      anchor: 'schedule',
    },
    {
      id: 'scl-delay',
      label: 'SCL delay',
      value: `${sclDelay}d`,
      trend: sclDelay > 0 ? `+${sclDelay}d vs SCL baseline` : 'Aligned to SCL baseline',
      impact: sclDelay > 0 ? 'Client milestone commitment at risk' : 'Client dates protected',
      status: sclDelay >= 90 ? 'critical' : sclDelay > 0 ? 'watch' : 'good',
      tab: 'schedule',
      anchor: 'schedule',
    },
    {
      id: 'risks',
      label: 'Critical risks',
      value: String(input.criticalRisks),
      trend: openIssues > 0 ? `${openIssues} open issues tracked` : 'Register clear',
      impact: input.criticalRisks > 0 ? 'Leadership decision queue active' : 'No critical decision backlog',
      status: input.criticalRisks > 0 ? 'critical' : openBn > 0 ? 'watch' : 'good',
      tab: 'risk',
      anchor: 'risk',
    },
    {
      id: 'drawings',
      label: 'Drawing approval',
      value: `${drawing}%`,
      trend: drawing < 75 ? 'Below governance threshold' : 'Within acceptance band',
      impact: drawing < 75 ? 'Site hold risk / rework' : 'Design release supporting site',
      status: drawing < 50 ? 'critical' : drawing < 75 ? 'watch' : 'good',
      tab: 'compliance',
      anchor: 'drawings',
    },
  ];

  const insights: AiInsightItem[] = [];
  if (progress >= 70 && tone !== 'bad') {
    insights.push({
      id: 'pos-progress',
      category: 'positive',
      title: 'Physical progress remains material',
      detail: `Cumulative progress at ${progress}% sustains delivery visibility for stakeholders.`,
      tone: 'positive',
    });
  }
  if (cpi != null && cpi >= 1) {
    insights.push({
      id: 'pos-cpi',
      category: 'positive',
      title: 'Cost performance index healthy',
      detail: `CPI ${cpi.toFixed(2)} indicates earned value keeping pace with cost.`,
      tone: 'positive',
    });
  }
  if (maxDelay > 0) {
    insights.push({
      id: 'neg-delay',
      category: 'negative',
      title: 'Schedule slippage dominates narrative',
      detail: `Peak delay of ${maxDelay} days is the primary executive concern this review.`,
      tone: 'negative',
    });
  }
  if (cpi != null && cpi < 1) {
    insights.push({
      id: 'neg-cpi',
      category: 'negative',
      title: 'Cost overrun pressure',
      detail: `CPI ${cpi.toFixed(2)} — review ACWP vs BCWP and pending certifications.`,
      tone: 'negative',
    });
  }
  if (openBn > 0) {
    insights.push({
      id: 'bn',
      category: 'bottleneck',
      title: 'Open bottlenecks blocking decisions',
      detail: `${openBn} open item(s) in register — prioritize Critical/High for this week's stand-up.`,
      tone: 'watch',
    });
  }
  if (drawing < 75) {
    insights.push({
      id: 'stagnant-drawings',
      category: 'stagnant',
      title: 'Drawing pipeline below threshold',
      detail: `Approval at ${drawing}% — stagnant releases will cascade into site idle time.`,
      tone: 'watch',
    });
  }
  if (input.progressDeltaLabel) {
    insights.push({
      id: 'change-progress',
      category: 'change',
      title: 'Progress delta since last review',
      detail: input.progressDeltaLabel,
      tone: /-|down|behind|drop/i.test(input.progressDeltaLabel) ? 'negative' : 'positive',
    });
  }
  if (insights.length === 0) {
    insights.push({
      id: 'steady',
      category: 'change',
      title: 'Stable period',
      detail: 'No sharp positive or negative swings detected from current vitals.',
      tone: 'neutral',
    });
  }

  const priorities: PriorityAction[] = [];
  if (tone === 'bad' || maxDelay >= 90) {
    priorities.push({
      id: 'p-recovery',
      title: 'Approve schedule recovery & EOT strategy',
      reason: `Peak delay ${maxDelay}d with health ${input.projectHealth.label}`,
      urgency: 'critical',
      tab: 'schedule',
      actionLabel: 'Open schedule',
    });
  }
  if (input.criticalRisks > 0) {
    priorities.push({
      id: 'p-risks',
      title: 'Close or escalate critical risks',
      reason: `${input.criticalRisks} critical risk(s) still open`,
      urgency: 'critical',
      tab: 'risk',
      actionLabel: 'Review risks',
    });
  }
  if (hseCritical) {
    priorities.push({
      id: 'p-hse',
      title: 'HSE intervention required',
      reason: input.healthSafetyLabel,
      urgency: 'critical',
      tab: 'risk',
      actionLabel: 'Open HSE',
    });
  }
  if (drawing < 75) {
    priorities.push({
      id: 'p-drawings',
      title: 'Unblock drawing approvals',
      reason: `Approval at ${drawing}%`,
      urgency: 'high',
      tab: 'compliance',
      actionLabel: 'View drawings',
    });
  }
  if (cpi != null && cpi < 1) {
    priorities.push({
      id: 'p-cost',
      title: 'Cost recovery & certification push',
      reason: `CPI ${cpi.toFixed(2)}`,
      urgency: 'high',
      tab: 'money',
      actionLabel: 'Open financial',
    });
  }
  (input.decisionQueueTitles ?? []).slice(0, 2).forEach((title, idx) => {
    if (!title || /no critical/i.test(title)) return;
    priorities.push({
      id: `p-q-${idx}`,
      title,
      reason: 'From leadership decision queue',
      urgency: 'medium',
      tab: 'risk',
      actionLabel: 'Act',
    });
  });
  if (priorities.length === 0) {
    priorities.push({
      id: 'p-clear',
      title: 'No urgent executive actions today',
      reason: 'Vitals within acceptable bands',
      urgency: 'low',
      tab: 'overview',
      actionLabel: 'Stay on overview',
    });
  }

  const forecastFinish =
    input.contractorDates?.forecast_finish ||
    input.sclDates?.forecast_finish ||
    input.contractorDates?.eot_date ||
    input.sclDates?.eot_date ||
    null;
  const contractFinish =
    input.contractorDates?.contract_finish || input.sclDates?.contract_finish || null;

  let forecastDelayDays = maxDelay;
  if (forecastFinish && contractFinish) {
    const f = new Date(forecastFinish).getTime();
    const c = new Date(contractFinish).getTime();
    if (!Number.isNaN(f) && !Number.isNaN(c)) {
      forecastDelayDays = Math.max(0, Math.round((f - c) / 86400000));
    }
  }

  // Rule-based on-time probability: start from 92, penalize delay / risks / CPI / drawings
  let onTime = 92;
  onTime -= Math.min(70, (maxDelay / 90) * 55);
  onTime -= Math.min(15, input.criticalRisks * 5);
  if (cpi != null && cpi < 1) onTime -= 8;
  if (drawing < 75) onTime -= 6;
  if (hseCritical) onTime -= 5;
  if (tone === 'bad') onTime -= 10;
  if (tone === 'good' && maxDelay === 0) onTime += 4;
  onTime = Math.round(clamp(onTime, 5, 96));

  let confidence = 78;
  if (input.sclDates && input.contractorDates) confidence += 8;
  if (progress > 0) confidence += 4;
  if (openBn === 0) confidence += 4;
  if (maxDelay > 365) confidence -= 10;
  confidence = Math.round(clamp(confidence, 45, 92));

  const forecast: ProjectForecastInsight = {
    onTimeProbabilityPct: onTime,
    expectedCompletionLabel: formatDate(forecastFinish),
    forecastDelayDays,
    confidencePct: confidence,
    narrative:
      onTime >= 70
        ? 'On-time completion remains plausible if current recovery holds.'
        : onTime >= 40
          ? 'On-time completion is unlikely without aggressive path compression.'
          : 'Forecast indicates high probability of further slippage — treat as recovery programme.',
  };

  const openItems = (input.bottleneckItems ?? []).filter(
    (i) => i.status !== 'Closed' && i.description.trim(),
  );
  const heatCounts: Record<RiskHeatCategory, number> = {
    Schedule: 0,
    Financial: 0,
    Safety: 0,
    Quality: 0,
    Resources: 0,
    Compliance: 0,
  };
  openItems.forEach((item) => {
    heatCounts[classifyBottleneckCategory(item)] += 1;
  });
  // Seed from vitals when register sparse
  if (maxDelay > 0) heatCounts.Schedule += maxDelay >= 90 ? 2 : 1;
  if (cpi != null && cpi < 1) heatCounts.Financial += 1;
  if (hseCritical) heatCounts.Safety += 2;
  if ((input.qualityPct ?? 100) < 85) heatCounts.Quality += 1;
  if (drawing < 75) heatCounts.Compliance += 1;

  const riskHeat: RiskHeatCell[] = (
    ['Schedule', 'Financial', 'Safety', 'Quality', 'Resources', 'Compliance'] as RiskHeatCategory[]
  ).map((category) => {
    const count = heatCounts[category];
    const level = heatLevel(
      count,
      (category === 'Safety' && hseCritical) || (category === 'Schedule' && maxDelay >= 90),
    );
    const labels = ['Clear', 'Watch', 'Elevated', 'Critical'] as const;
    return { category, level, count, label: labels[level] };
  });

  const delayTotal = Math.max(1, sclDelay + coDelay);
  const delayContributors: DelayContributor[] = [
    {
      id: 'co',
      label: 'Contractor path',
      days: coDelay,
      impactPct: Math.round((coDelay / delayTotal) * 100),
      tab: 'schedule',
    },
    {
      id: 'scl',
      label: 'SCL path',
      days: sclDelay,
      impactPct: Math.round((sclDelay / delayTotal) * 100),
      tab: 'schedule',
    },
  ];
  if (drawing < 75) {
    delayContributors.push({
      id: 'drawings',
      label: 'Drawing release lag',
      days: Math.round((75 - drawing) * 1.2),
      impactPct: Math.min(35, Math.round((75 - drawing) / 2)),
      tab: 'compliance',
    });
  }
  // Renormalize impact % to ~100 for display bars
  const impactSum = delayContributors.reduce((s, d) => s + d.impactPct, 0) || 1;
  delayContributors.forEach((d) => {
    d.impactPct = Math.round((d.impactPct / impactSum) * 100);
  });

  const changes: ChangeTimelineItem[] = [];
  if (input.progressDeltaLabel) {
    const worse = /-|down|behind|drop|loss/i.test(input.progressDeltaLabel);
    changes.push({
      id: 'c-progress',
      direction: worse ? 'regressed' : 'improved',
      title: 'Progress vs last review',
      detail: input.progressDeltaLabel,
    });
  }
  changes.push({
    id: 'c-delay',
    direction: maxDelay > 0 ? 'regressed' : 'improved',
    title: 'Schedule delay position',
    detail: maxDelay > 0 ? `Peak delay now ${maxDelay} days` : 'No active delay vs baseline',
  });
  changes.push({
    id: 'c-risk',
    direction: input.criticalRisks > 0 ? 'regressed' : openBn > 0 ? 'unchanged' : 'improved',
    title: 'Risk / bottleneck posture',
    detail:
      input.criticalRisks > 0
        ? `${input.criticalRisks} critical · ${openBn} open bottlenecks`
        : openBn > 0
          ? `${openBn} open bottlenecks · no criticals`
          : 'Risk register clear of criticals',
  });
  changes.push({
    id: 'c-drawings',
    direction: drawing < 75 ? 'regressed' : drawing >= 90 ? 'improved' : 'unchanged',
    title: 'Drawing governance',
    detail: `Approval ${drawing}%`,
  });

  const recommendations: AiRecommendation[] = [
    {
      id: 'r1',
      action: maxDelay > 0 ? 'Lock a 30-day critical-path recovery pack with contractor' : 'Preserve float with weekly look-ahead discipline',
      expectedImpact:
        maxDelay > 0
          ? `Potential recovery of ${Math.min(45, Math.round(maxDelay * 0.08))}–${Math.min(90, Math.round(maxDelay * 0.15))} delay days if executed`
          : 'Protect on-time probability',
      priority: maxDelay >= 90 ? 'critical' : maxDelay > 0 ? 'high' : 'medium',
      confidencePct: clamp(confidence - 5, 50, 90),
      tab: 'schedule',
    },
    {
      id: 'r2',
      action:
        input.criticalRisks > 0 || openBn > 0
          ? 'Run a decision clinic on open Critical/High bottlenecks'
          : 'Keep risk cadence — fortnightly register scrub',
      expectedImpact: 'Faster issue closure · reduced decision latency',
      priority: input.criticalRisks > 0 ? 'critical' : openBn > 0 ? 'high' : 'low',
      confidencePct: clamp(confidence, 55, 92),
      tab: 'risk',
    },
    {
      id: 'r3',
      action:
        drawing < 75
          ? 'Executive escalate drawing releases to design authority with dated commitments'
          : cpi != null && cpi < 1
            ? 'Accelerate certified billing and cost containment actions'
            : 'Publish a one-page executive brief for the next steering committee',
      expectedImpact:
        drawing < 75
          ? 'Unblocks site fronts · reduces idle crews'
          : cpi != null && cpi < 1
            ? 'Improves cash & CPI trajectory'
            : 'Aligns leadership narrative',
      priority: drawing < 75 || (cpi != null && cpi < 1) ? 'high' : 'medium',
      confidencePct: clamp(confidence - 2, 52, 90),
      tab: drawing < 75 ? 'compliance' : 'money',
    },
  ];

  const briefMarkdown = [
    `# Executive Brief — ${input.projectTitle}`,
    ``,
    `## Snapshot`,
    `- ${summary.headline}`,
    `- ${summary.healthLine}`,
    `- Forecast completion: ${forecast.expectedCompletionLabel} · On-time probability ${forecast.onTimeProbabilityPct}% (confidence ${forecast.confidencePct}%)`,
    ``,
    `## Delay drivers`,
    ...summary.delayReasons.map((r) => `- ${r}`),
    ``,
    `## Major risks`,
    ...summary.majorRisks.map((r) => `- ${r}`),
    ``,
    `## Recommended actions`,
    ...summary.recommendedActions.map((r) => `- ${r}`),
    ``,
    `## Today's priorities`,
    ...priorities.slice(0, 5).map((p) => `- [${p.urgency.toUpperCase()}] ${p.title} — ${p.reason}`),
    ``,
    `## AI recommendations`,
    ...recommendations.map(
      (r) =>
        `- ${r.action} (impact: ${r.expectedImpact}; priority: ${r.priority}; confidence: ${r.confidencePct}%)`,
    ),
    ``,
    `_Generated for leadership review — derived from live project vitals (rule-based executive intelligence)._`,
  ].join('\n');

  return {
    summary,
    kpis,
    insights,
    priorities: priorities.slice(0, 6),
    forecast,
    riskHeat,
    delayContributors,
    changes,
    recommendations,
    briefMarkdown,
  };
}
