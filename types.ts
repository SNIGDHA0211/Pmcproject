
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
  username?: string;
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
  /** Backend alert fields */
  moduleName?: string;
  projectName?: string;
  actionType?: string;
  notificationType?: string;
  createdAt?: string;
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

export type ContractValueType = 'SCL' | 'Contractor';

export interface ContractValueRecord {
  id?: string | number;
  projectName: string;
  contractType: ContractValueType;
  /** When multiple contractors exist on the project */
  contractorName?: string;
  contractorId?: number;
  originalContractValue: number;
  /** API: excess_value */
  approvedVO: number;
  /** API: revised_value */
  revisedContractValue: number;
  /** API: saving */
  potentialPendingVO: number;
  /** API: growth_percentage */
  growthPercentage?: number;
  approvedVOPercentage?: number;
  status?: string;
}

export type InvoiceType = 'PMC' | 'Contractor';

/** UI label for invoice type; API still uses `PMC` as invoice_type. */
export const getInvoiceTypeLabel = (invoiceType: InvoiceType): string =>
  invoiceType === 'PMC' ? 'SCL' : invoiceType;

export interface InvoicingRecord {
  id?: string | number;
  projectName: string;
  invoiceType: InvoiceType;
  /** When multiple contractors exist on the project */
  contractorName?: string;
  contractorId?: number;
  /** API: gross_billed */
  grossBilled: number;
  /** API: gross_certified_billed */
  netBilledWithoutVAT: number;
  /** API: difference */
  netCollected: number;
  /** API: certification_efficiency (displayed as %) */
  collectionPercentage?: number;
  /** @deprecated legacy API field */
  netDue?: number;
}

export interface ContractPerformanceRecord {
  id?: string | number;
  projectName?: string;
  billedValue: number;
  actualReceiptValue: number;
  variance: number;
  performancePercentage: number;
  variancePercentage: number;
}

export interface ProjectQualityStatusRecord {
  id?: string | number;
  projectName: string;
  month: number;
  year: number;
  testsRequired: number;
  testsConducted: number;
  shortfall: number;
  testsPassed: number;
  testsFailed: number;
  qualityPerformance: number;
}

export interface DrawingMonthlyRecord {
  id?: string | number;
  projectName: string;
  month: number;
  year: number;
  submittedDrawings: number;
  approvedDrawings: number;
  variance: number;
  approvalRate: number;
}

export interface DrawingProjectSummary {
  submittedDrawings: number;
  approvedDrawings: number;
  variance: number;
  approvalRate: number;
}

// ─── Drawing Register (per-drawing client report) ────────────────────────────

export type DrawingWorkflowAction =
  | 'SUBMITTED'
  | 'CONSULTANT_COMMENTED'
  | 'RESUBMITTED'
  | 'APPROVED';

export interface DrawingWorkflowEvent {
  id?: number;
  action: DrawingWorkflowAction;
  eventDate: string;
  notes?: string;
  createdAt?: string;
}

export interface DrawingRegisterRow {
  id?: number;
  srNo?: number;
  projectName: string;
  drawingName: string;
  contractorName?: string | null;
  revision?: number | null;
  remarks?: string;
  submittedDate?: string | null;
  consultantCommentsDate?: string | null;
  resubmittedDate?: string | null;
  approvedDate?: string | null;
  workflowEvents?: DrawingWorkflowEvent[];
  clientRow?: DrawingClientReportRow;
  createdAt?: string;
  updatedAt?: string;
}

export interface DrawingClientReportRow {
  srNo: number;
  designAndDrawing: string;
  submissionByContractor?: string | null;
  consultantCommentsDate?: string | null;
  resubmissionDate?: string | null;
  approvedByConsultant?: string | null;
  remarks?: string;
  id?: number;
  revision?: number | null;
  contractorName?: string | null;
  projectName: string;
}

export interface DrawingClientReportSummary {
  submittedDrawings: number;
  approvedDrawings: number;
  variance: number;
  approvalRate: number;
}

export interface DrawingClientReportData {
  view: 'monthly' | 'cumulative';
  fromDate: string;
  toDate: string;
  month: number;
  year: number;
  projectName: string;
  summary: DrawingClientReportSummary;
  rows: DrawingClientReportRow[];
}

// ─── Frequency Chart (material testing) ──────────────────────────────────────

export type FrequencyChartView = 'monthly' | 'cumulative';

export interface FrequencyChartSummary {
  testsRequired: number;
  testsConducted: number;
  shortfall: number;
  testsPassed: number;
  testsFailed: number;
  qualityPerformance: number;
  passRate: number;
  failRate: number;
}

export interface FrequencyChartRegisterRow {
  id?: number;
  srNo: number;
  itemDescription: string;
  typeOfTest: string;
  frequencyOfTest?: string;
  unit: string;
  qtyPreviousBill: number;
  qtyThisBill: number;
  totalQty?: number;
  requiredTestsPreviousBill?: number;
  requiredTestsThisBill?: number;
  requiredTestsUptoDate?: number;
  fieldLabPreviousBill: number;
  fieldLabThisBill: number;
  thirdPartyPreviousBill: number;
  thirdPartyThisBill: number;
  totalTestsConducted?: number;
  remarks?: string;
  month: number;
  year: number;
  projectName: string;
  activityName?: string | null;
  contractorName?: string | null;
}

export interface FrequencyChartClientReportData {
  view: FrequencyChartView;
  fromDate: string;
  toDate: string;
  month: number;
  year: number;
  projectName: string;
  summary: FrequencyChartSummary;
  rows: FrequencyChartRegisterRow[];
}

export interface ConstructionProgressRecord {
  id?: string | number;
  projectName: string;
  progressMonth: string;
  plannedProgress: number;
  actualProgress: number;
  variance: number;
  performancePercentage: number;
  remarks?: string;
}

export interface ProjectEquipmentRecord {
  id?: string | number;
  projectName: string;
  equipmentMonth: string;
  plannedEquipment: number;
  actualEquipment: number;
  variance: number;
  performancePercentage: number;
  equipmentStatus: string;
  remarks?: string;
}

/** @deprecated Use CorrespondenceMonthlyRecord for monthly API */
export interface CorrespondenceRecord {
  id?: string | number;
  projectName: string;
  correspondenceReceived: number;
  correspondenceDelivered: number;
  pendingCorrespondence: number;
  deliveryPercentage: number;
  updatedAt?: string;
}

export type CorrespondenceType = 'CLIENT' | 'CONTRACTOR';

export type CorrespondenceCategory = 'DELIVERY' | 'RECORD';

export type CorrespondenceRecipientType = 'CLIENT' | 'CONTRACTOR' | 'OTHER_AGENCY';

export type CorrespondenceDocumentScope = 'party' | 'scl';

export interface CorrespondencePartyMetrics {
  correspondenceReceived: number;
  /** Total delivered documents (on time + late deliveries). */
  correspondenceDelivered: number;
  correspondenceRecord: number;
  onTimeDelivered: number;
  lateDeliveries: number;
  pendingCorrespondence: number;
  deliveryEfficiency: number;
}

export interface CorrespondenceMonthlyPeriod {
  projectName: string;
  month: number;
  year: number;
  client: CorrespondencePartyMetrics;
  contractor: CorrespondencePartyMetrics;
}

export interface CorrespondenceMonthlyRecord {
  id?: string | number;
  projectName: string;
  month: number;
  year: number;
  correspondenceType: CorrespondenceType;
  correspondenceReceived: number;
  correspondenceDelivered: number;
  correspondenceRecord: number;
  onTimeDelivered: number;
  lateDeliveries: number;
  pendingCorrespondence: number;
  deliveryEfficiency: number;
}

export interface CorrespondenceProjectSummary {
  client: CorrespondencePartyMetrics;
  contractor: CorrespondencePartyMetrics;
}

/** Line-item correspondence document (counts come from monthly dashboard API). */
export interface CorrespondenceDocument {
  id?: string | number;
  projectName: string;
  month: number;
  year: number;
  correspondenceType: CorrespondenceType;
  correspondenceCategory: CorrespondenceCategory;
  srNo: number;
  description: string;
  receivedDate: string;
  deliveredDate?: string | null;
  /** Read-only — calculated by backend */
  deadlineDate?: string | null;
  /** Read-only — calculated by backend */
  status?: string;
  /** New fields from correspondence-documents API */
  flowDirection?: string;
  sender?: string;
  recipientType?: CorrespondenceRecipientType | null;
  deliveredStatus?: string;
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
  teamLeadName?: string;
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

export interface MachineryMaster {
  id: string | number;
  name: string;
  unit: string;
  category: string;
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

// Monthly Scope Types
export interface MonthlyScopeCategory {
  id: number;
  name: string;
  subcategories: MonthlyScopeSubcategory[];
}

export interface MonthlyScopeSubcategory {
  id: number;
  name: string;
  category_id: number;
}

export interface MonthlyScope {
  id: number;
  project: number;
  project_name?: string;
  month: string;
  category: number;
  category_name?: string;
  subcategory: number;
  subcategory_name?: string;
  description: string;
  unit: string;
  planned_quantity: number;
  section: string;
  location: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  custom_category_name?: string;
  custom_subcategory_name?: string;
  // Progress tracking fields
  executed_quantity?: number;
  cumulative_quantity?: number;
  remaining_quantity?: number;
  progress_percentage?: number;
}

export interface MonthlyScopeFilters {
  project?: number;
  month?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface MonthlyScopeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MonthlyScope[];
}

export interface ForwardScopePayload {
  scope_ids: number[];
  site_engineers: number[];
}

export interface SiteImageRecord {
  id: string | number;
  projectName: string;
  month: number;
  year: number;
  imageUrl: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  uploadedBy?: string;
}
