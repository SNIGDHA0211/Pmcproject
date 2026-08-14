import { UserRole } from '../types';

export const HEADER_SEARCH_JUMP_EVENT = 'pmc-header-search-jump';

export type HeaderSearchJump = {
  tab: string;
  execTab?: 'overview' | 'schedule' | 'money' | 'people' | 'risk' | 'compliance';
  anchor?:
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
  sectionId?: string;
  financialSubTab?: string;
};

export type HeaderSearchDeepLink = {
  id: string;
  label: string;
  section: string;
  hint: string;
  keywords: string[];
  requiresTab: string;
  jump: HeaderSearchJump;
  icon: string;
  /** If set, only these roles see the hit (still must have requiresTab in their nav). */
  roles?: UserRole[];
};

let pendingJump: HeaderSearchJump | null = null;
let pendingExecJump: HeaderSearchJump | null = null;

export function queueHeaderSearchJump(jump: HeaderSearchJump): void {
  pendingJump = jump;
  pendingExecJump = jump.execTab || jump.sectionId ? jump : null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HEADER_SEARCH_JUMP_EVENT, { detail: jump }));
  }
}

export function peekHeaderSearchJump(): HeaderSearchJump | null {
  return pendingJump;
}

export function consumeHeaderSearchJump(): HeaderSearchJump | null {
  const jump = pendingJump;
  pendingJump = null;
  return jump;
}

export function takePendingExecSearchJump(): HeaderSearchJump | null {
  const jump = pendingExecJump;
  pendingExecJump = null;
  return jump;
}

/** Subsections that live inside a sidebar tab — filtered by the caller’s visible nav. */
export const HEADER_SEARCH_DEEP_LINKS: HeaderSearchDeepLink[] = [
  {
    id: 'dl-drawing-register',
    label: 'Drawing Register',
    section: 'Projects',
    hint: 'Drawing approval register under Compliance',
    keywords: ['drawing', 'drawings', 'register', 'approval', 'gfc', 'shop drawing'],
    requiresTab: 'team_projects',
    jump: {
      tab: 'team_projects',
      execTab: 'compliance',
      anchor: 'drawings',
      sectionId: 'exec-section-drawings',
    },
    icon: 'ClipboardList',
  },
  {
    id: 'dl-correspondence',
    label: 'Correspondence',
    section: 'Projects',
    hint: 'Client and contractor letters, pending, and delivery',
    keywords: ['correspondence', 'letters', 'pending correspondence', 'client letter'],
    requiresTab: 'team_projects',
    jump: {
      tab: 'team_projects',
      execTab: 'compliance',
      anchor: 'correspondence',
      sectionId: 'exec-section-correspondence',
    },
    icon: 'Comment',
  },
  {
    id: 'dl-quality',
    label: 'Quality',
    section: 'Projects',
    hint: 'NCR, quality performance, and QA/QC status',
    keywords: ['quality', 'ncr', 'qaqc', 'qa qc', 'inspection'],
    requiresTab: 'team_projects',
    jump: {
      tab: 'team_projects',
      execTab: 'compliance',
      anchor: 'quality',
      sectionId: 'exec-section-quality',
    },
    icon: 'Safety',
  },
  {
    id: 'dl-compliance',
    label: 'Compliance',
    section: 'Projects',
    hint: 'Drawings, correspondence, quality, and statutory checks',
    keywords: ['compliance', 'statutory', 'bg', 'bank guarantee'],
    requiresTab: 'team_projects',
    jump: { tab: 'team_projects', execTab: 'compliance', sectionId: 'exec-section-drawings' },
    icon: 'Safety',
  },
  {
    id: 'dl-schedule',
    label: 'Schedule & Dates',
    section: 'Projects',
    hint: 'Contract dates, delay, EOT, and programme',
    keywords: ['schedule', 'dates', 'delay', 'eot', 'programme', 'program'],
    requiresTab: 'team_projects',
    jump: { tab: 'team_projects', execTab: 'schedule', sectionId: 'exec-section-schedule' },
    icon: 'Calendar',
  },
  {
    id: 'dl-project-finance',
    label: 'Project Financial',
    section: 'Projects',
    hint: 'CPI, cash, contract, and earned value on the project',
    keywords: ['money', 'cpi', 'evm', 'project finance', 'cost'],
    requiresTab: 'team_projects',
    jump: { tab: 'team_projects', execTab: 'money', anchor: 'financial', sectionId: 'exec-section-financial' },
    icon: 'Finance',
  },
  {
    id: 'dl-planned-vs-actual',
    label: 'Planned vs Actual',
    section: 'Projects',
    hint: 'Planned, earned, and actual progress on the project',
    keywords: ['planned vs actual', 'pva', 'earned value', 's curve'],
    requiresTab: 'team_projects',
    jump: {
      tab: 'team_projects',
      execTab: 'money',
      anchor: 'planned-vs-actual',
      sectionId: 'exec-section-planned-vs-actual',
    },
    icon: 'Performance',
  },
  {
    id: 'dl-people-site',
    label: 'People & Site',
    section: 'Projects',
    hint: 'Manpower, plant, and site resources',
    keywords: ['people', 'manpower', 'labour', 'labor', 'equipment', 'plant'],
    requiresTab: 'team_projects',
    jump: { tab: 'team_projects', execTab: 'people', anchor: 'manpower', sectionId: 'exec-section-manpower' },
    icon: 'Labor',
  },
  {
    id: 'dl-risk',
    label: 'Risk & Bottlenecks',
    section: 'Projects',
    hint: 'Open risks, issues, and HSE posture',
    keywords: ['risk', 'bottleneck', 'issue log', 'hse', 'safety'],
    requiresTab: 'team_projects',
    jump: { tab: 'team_projects', execTab: 'risk', sectionId: 'exec-section-risk' },
    icon: 'Issue',
  },
  {
    id: 'dl-hse',
    label: 'Health & Safety',
    section: 'Projects',
    hint: 'HSE scorecard and incidents on the project',
    keywords: ['hse', 'health', 'safety', 'incident', 'accident'],
    requiresTab: 'team_projects',
    jump: { tab: 'team_projects', execTab: 'risk', anchor: 'hse', sectionId: 'exec-section-risk' },
    icon: 'Safety',
  },
  {
    id: 'dl-fin-progress',
    label: 'Physical Progress',
    section: 'Finance',
    hint: 'Financial module — physical progress tab',
    keywords: ['physical progress', 'progress tab'],
    requiresTab: 'financial_management',
    jump: { tab: 'financial_management', financialSubTab: 'progress' },
    icon: 'Execution',
  },
  {
    id: 'dl-fin-cashflow',
    label: 'Cashflow',
    section: 'Finance',
    hint: 'Inflow, outflow, and cash position',
    keywords: ['cashflow', 'cash flow', 'inflow', 'outflow'],
    requiresTab: 'financial_management',
    jump: { tab: 'financial_management', financialSubTab: 'cashflow' },
    icon: 'DollarSign',
  },
  {
    id: 'dl-fin-evm',
    label: 'Earned Value',
    section: 'Finance',
    hint: 'Planned vs actual and EVM in Financial Management',
    keywords: ['earned value', 'evm', 'spi', 'cpi'],
    requiresTab: 'financial_management',
    jump: { tab: 'financial_management', financialSubTab: 'earned_value' },
    icon: 'Performance',
  },
  {
    id: 'dl-fin-contract',
    label: 'Contract Performance',
    section: 'Finance',
    hint: 'Contract performance measures',
    keywords: ['contract performance'],
    requiresTab: 'financial_management',
    jump: { tab: 'financial_management', financialSubTab: 'contract' },
    icon: 'Document',
  },
  {
    id: 'dl-fin-cost',
    label: 'Cost Performance',
    section: 'Finance',
    hint: 'Cost performance and financial progress',
    keywords: ['cost performance', 'financial progress'],
    requiresTab: 'financial_management',
    jump: { tab: 'financial_management', financialSubTab: 'cost' },
    icon: 'Finance',
  },
  {
    id: 'dl-fin-budget',
    label: 'Budget Performance',
    section: 'Finance',
    hint: 'Budget vs actual utilisation',
    keywords: ['budget', 'utilisation', 'utilization'],
    requiresTab: 'financial_management',
    jump: { tab: 'financial_management', financialSubTab: 'budget' },
    icon: 'Finance',
  },
  {
    id: 'dl-fin-invoicing',
    label: 'Invoicing',
    section: 'Finance',
    hint: 'RA bills and invoice register',
    keywords: ['invoice', 'invoicing', 'ra bill', 'billing'],
    requiresTab: 'financial_management',
    jump: { tab: 'financial_management', financialSubTab: 'invoicing' },
    icon: 'Document',
  },
  {
    id: 'dl-fin-contracts',
    label: 'Contract Values',
    section: 'Finance',
    hint: 'Contract value register',
    keywords: ['contract value', 'contract values'],
    requiresTab: 'financial_management',
    jump: { tab: 'financial_management', financialSubTab: 'contracts' },
    icon: 'Briefcase',
  },
  {
    id: 'dl-qaqc-quality',
    label: 'Quality & testing',
    section: 'Command',
    hint: 'QAQC dashboard — scopes, material testing, quality',
    keywords: ['quality', 'testing', 'ncr', 'qaqc', 'material testing'],
    requiresTab: 'my_scopes',
    jump: { tab: 'my_scopes' },
    icon: 'Safety',
    roles: [UserRole.QAQC_SITE_ENGINEER],
  },
  {
    id: 'dl-hse-dashboard',
    label: 'HSE dashboard',
    section: 'Command',
    hint: 'Health, safety, and assigned HSE scopes',
    keywords: ['hse', 'safety', 'incident', 'health'],
    requiresTab: 'my_scopes',
    jump: { tab: 'my_scopes' },
    icon: 'Safety',
    roles: [UserRole.HSE_SITE_ENGINEER],
  },
  {
    id: 'dl-billing-dashboard',
    label: 'Billing dashboard',
    section: 'Command',
    hint: 'Billing scopes and assigned commercial work',
    keywords: ['billing', 'invoice', 'ra bill', 'scope'],
    requiresTab: 'my_scopes',
    jump: { tab: 'my_scopes' },
    icon: 'Finance',
    roles: [UserRole.BILLING_SITE_ENGINEER],
  },
];
