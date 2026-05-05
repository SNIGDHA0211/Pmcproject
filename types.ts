
export enum UserRole {
  PMC_HEAD = 'PMC_HEAD',
  CEO = 'CEO',
  COORDINATOR = 'COORDINATOR',
  TEAM_LEAD = 'TEAM_LEAD',
  SITE_ENGINEER = 'SITE_ENGINEER',
  BILLING_SITE_ENGINEER = 'BILLING_SITE_ENGINEER',
  QAQC_SITE_ENGINEER = 'QAQC_SITE_ENGINEER'
}

export enum ProjectStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'ALERT' | 'UPDATE';
  timestamp: string;
  isRead: boolean;
  senderName?: string;
}

export interface ProjectActivity {
  id: string;
  description: string;
  unit: string;
  totalScope: number;
  cumulativePrevious: number;
  category: 'Civil' | 'Electrical' | 'Finishing' | 'Utility' | 'Infrastructure';
}

export interface SafetyStats {
  fatalities: number;
  significant: number;
  major: number;
  minor: number;
  nearMiss: number;
  lossOfManhours: number;
  totalManhours: number;
}

export interface FinancialStats {
  originalValue: number;
  approvedVO: number;
  revisedValue: number;
  grossBilled: number;
  netCollected: number;
  netDue: number;
}

export interface PerformanceIndices {
  spi: number;
  cpi: number;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
}

export interface ProgressSnapshots {
  engineering: number;
  procurement: number;
  construction: number;
}

export interface Project {
  id: string;
  title: string;
  client: string;
  description: string;
  status: ProjectStatus;
  pmcHeadId: string;
  teamLeadId?: string;
  siteEngineerIds: string[];
  billingEngineerId?: string;
  qaqcEngineerId?: string;
  coordinatorIds: string[];
  createdAt: string;
  updatedAt: string;
  budget: number;
  location: string;
  activities: ProjectActivity[];
  documents: Document[];
  auditLogs: AuditLog[];
  tasks: Task[];
  safety?: SafetyStats;
  finances?: FinancialStats;
  performance?: PerformanceIndices;
  progress?: ProgressSnapshots;
  rejectionComments?: string;
  commencementDate?: string;
  duration?: string;
  salientFeatures?: string;
  siteStaffDetails?: string;
  hasDocumentation?: boolean;
  hasReminderAlerts?: boolean;
  hasBarGanttChart?: boolean;
  hasDPRFormat?: boolean;
  hasWPRFormat?: boolean;
  hasMPRFormat?: boolean;
  hasMIS?: boolean;
  hasISOChecklist?: boolean;
  hasTestFrequencyChart?: boolean;
  // Dashboard data fields
  plannedValue?: number;
  earnedValue?: number;
  actualCost?: number;
  grossBilled?: number;
  netBilled?: number;
  netCollected?: number;
  netDue?: number;
  totalManhours?: number;
  fatalities?: number;
  significant?: number;
  major?: number;
  minor?: number;
  nearMiss?: number;
}

export interface LaborLog {
  skilled: number;
  unskilled: number;
  operators: number;
  security: number;
}

export interface MachineryLog {
  name: string;
  count: number;
  status: 'Operational' | 'Breakdown' | 'Idle';
}

export interface DPRActivityInput {
  activityId: string;
  todayProgress: number;
  remarks?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string;
}

export interface DPR {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  labor?: LaborLog;
  machinery?: MachineryLog[];
  activityProgress?: DPRActivityInput[];
  workDescription?: string;
  manpower?: number;
  criticalIssues?: string;
  billingStatus?: string;
  status:
    | 'PENDING'
    | 'PENDING_COORDINATOR'
    | 'PENDING_PMC_HEAD'
    | 'APPROVED'
    | 'REJECTED';
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  version: number;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details: string;
  statusFrom?: ProjectStatus;
  statusTo?: ProjectStatus;
}

// Site Engineer Dashboard Types
export interface SiteEngineerProjectDetails {
  id: string;
  name: string;
  client_name: string;
  location: string;
  status: string;
  budget: number;
  commencement_date: string;
  duration: string;
}

export interface SiteEngineerHealthSafety {
  fatalities: number;
  significant: number;
  major: number;
  minor: number;
  near_miss: number;
  total_manhours: number;
  loss_of_manhours: number;
  status: string;
}

export interface SiteEngineerProgress {
  id: string;
  project: string;
  engineering: number;
  procurement: number;
  construction: number;
  overall_progress: number;
  status: string;
}

export interface SiteEngineerManpower {
  id: string;
  project: string;
  date: string;
  skilled: number;
  unskilled: number;
  operators: number;
  supervisors: number;
  total: number;
}

export interface SiteEngineerEquipment {
  id: string;
  project: string;
  name: string;
  category: string;
  quantity: number;
  operational: number;
  under_maintenance: number;
  idle: number;
}
