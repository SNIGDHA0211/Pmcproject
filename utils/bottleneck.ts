import {
  formatReportCell,
  formatReportDate,
  formatReportTodayDate,
} from './csvReport';

export type BottleneckType = 'ISSUE' | 'CONCERN' | 'RISK' | 'ACTION';
export type BottleneckPriority = 'High' | 'Medium' | 'Low';
export type BottleneckStatus = 'Open' | 'In Progress' | 'Closed';
export type BottleneckTab = 'ALL' | BottleneckType;

export interface BottleneckItem {
  id: string;
  type: BottleneckType;
  description: string;
  priority: BottleneckPriority;
  status: BottleneckStatus;
  assignedTo: string;
  dueDate: string;
}

export const BOTTLENECK_TABS: { id: BottleneckTab; label: string }[] = [
  { id: 'ALL', label: 'ALL' },
  { id: 'ISSUE', label: 'ISSUES' },
  { id: 'CONCERN', label: 'CONCERNS' },
  { id: 'RISK', label: 'RISKS' },
  { id: 'ACTION', label: 'ACTIONS' },
];

export const BOTTLENECK_ASSIGNEES = [
  'Rahul Sharma',
  'Priya Patel',
  'Amit Kumar',
  'Site Engineer',
  'Project Manager',
];

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `bn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function createBottleneckItem(
  type: BottleneckType,
  partial?: Partial<BottleneckItem>
): BottleneckItem {
  return {
    id: newId(),
    type,
    description: '',
    priority: 'Medium',
    status: 'Open',
    assignedTo: '',
    dueDate: '',
    ...partial,
  };
}

export function parseBottleneckFromProjectLogEntries(entries: unknown[]): BottleneckItem[] {
  if (!Array.isArray(entries)) return [];

  type LogEntry = { entry_type?: string; left_text?: string; right_text?: string; row_order?: number };
  const logEntries = entries as LogEntry[];

  const dashboard = logEntries.find((e) => e.entry_type === 'bottleneck_dashboard');

  if (dashboard?.left_text) {
    try {
      const parsed = JSON.parse(dashboard.left_text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((row) => ({
          id: row.id || newId(),
          type: row.type || 'ISSUE',
          description: row.description || '',
          priority: row.priority || 'Medium',
          status: row.status || 'Open',
          assignedTo: row.assignedTo || '',
          dueDate: row.dueDate || '',
        }));
      }
    } catch {
      /* fall through to legacy */
    }
  }

  const issues = Array.from({ length: 13 }, () => ({ issue: '', concern: '' }));
  const risks = Array.from({ length: 13 }, () => ({ risk: '', action: '' }));

  for (const e of logEntries) {
    const idx = (e.row_order || 1) - 1;
    if (idx < 0 || idx > 12) continue;
    if (e.entry_type === 'issue_concern') {
      issues[idx] = { issue: e.left_text || '', concern: e.right_text || '' };
    } else if (e.entry_type === 'risk_action') {
      risks[idx] = { risk: e.left_text || '', action: e.right_text || '' };
    }
  }

  const items: BottleneckItem[] = [];
  issues.forEach((row) => {
    if (row.issue.trim()) {
      items.push(createBottleneckItem('ISSUE', { description: row.issue.trim() }));
    }
    if (row.concern.trim()) {
      items.push(createBottleneckItem('CONCERN', { description: row.concern.trim() }));
    }
  });
  risks.forEach((row) => {
    if (row.risk.trim()) {
      items.push(createBottleneckItem('RISK', { description: row.risk.trim() }));
    }
    if (row.action.trim()) {
      items.push(createBottleneckItem('ACTION', { description: row.action.trim() }));
    }
  });

  return items;
}

export function serializeBottleneckToProjectLogEntries(items: BottleneckItem[]) {
  return [
    {
      entry_type: 'bottleneck_dashboard',
      left_text: JSON.stringify(items),
      right_text: '',
      row_order: 1,
    },
  ];
}

export function countOpenByType(items: BottleneckItem[], type: BottleneckType): number {
  return items.filter(
    (item) => item.type === type && item.status !== 'Closed' && item.description.trim()
  ).length;
}

export async function exportBottleneckExcel(items: BottleneckItem[]): Promise<void> {
  const { downloadSectionsExcel } = await import('./projectReportExcel');
  await downloadSectionsExcel(
    [
      {
        title: 'BOTTLENECK REGISTER',
        headers: ['Type', 'Description', 'Priority', 'Status', 'Assigned To', 'Due Date'],
        rows: items
          .filter((item) => item.description.trim())
          .map((item) => [
            item.type,
            item.description,
            item.priority,
            item.status,
            formatReportCell(item.assignedTo),
            formatReportDate(item.dueDate),
          ]),
      },
    ],
    `bottleneck-export-${formatReportTodayDate().replace(/-/g, '')}.xlsx`,
    'Bottleneck Register'
  );
}

/** @deprecated Use exportBottleneckExcel */
export function exportBottleneckCsv(items: BottleneckItem[]): void {
  void exportBottleneckExcel(items);
}

export const bottleneckTypeConfig: Record<
  BottleneckType,
  { label: string; iconBg: string; iconColor: string; pill: string; border: string; summaryBg: string }
> = {
  ISSUE: {
    label: 'Issue',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    pill: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-b-rose-500',
    summaryBg: 'bg-rose-50/60',
  },
  CONCERN: {
    label: 'Concern',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    pill: 'bg-orange-50 text-orange-700 border-orange-200',
    border: 'border-b-orange-500',
    summaryBg: 'bg-orange-50/60',
  },
  RISK: {
    label: 'Risk',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    border: 'border-b-amber-500',
    summaryBg: 'bg-amber-50/60',
  },
  ACTION: {
    label: 'Action',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-b-emerald-500',
    summaryBg: 'bg-emerald-50/60',
  },
};

export const priorityDotClass: Record<BottleneckPriority, string> = {
  High: 'bg-rose-500',
  Medium: 'bg-orange-500',
  Low: 'bg-emerald-500',
};

export const statusPillClass: Record<BottleneckStatus, string> = {
  Open: 'bg-rose-50 text-rose-700 border-rose-200',
  'In Progress': 'bg-orange-50 text-orange-700 border-orange-200',
  Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/** Semantic styling for status dropdowns (selected value) */
export const statusSelectClass: Record<BottleneckStatus, string> = {
  Open: 'border-rose-200 bg-rose-50 text-rose-700',
  'In Progress': 'border-orange-200 bg-orange-50 text-orange-700',
  Closed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export const statusSelectClassDark: Record<BottleneckStatus, string> = {
  Open: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  'In Progress': 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  Closed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

/** Semantic styling for priority dropdowns (selected value) */
export const prioritySelectClass: Record<BottleneckPriority, string> = {
  High: 'border-rose-200 bg-rose-50/70 text-rose-700',
  Medium: 'border-orange-200 bg-orange-50/70 text-orange-700',
  Low: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
};

export const prioritySelectClassDark: Record<BottleneckPriority, string> = {
  High: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  Medium: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  Low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};
