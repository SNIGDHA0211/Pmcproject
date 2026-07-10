/** Planned vs Actual — display types mapped from backend (no frontend calculations). */

export type PvaPartyType = 'SCL' | 'CONTRACTOR';

export type PvaVarianceStatus = 'ON_TRACK' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE' | string;

export interface PvaRecord {
  id?: string | number;
  projectName: string;
  month: number;
  year: number;
  /** Backend field: planned_type */
  partyType: PvaPartyType | string;
  contractorId?: number | null;
  contractorName?: string | null;
  plannedValue: number;
  actualValue: number;
  collection: number;
  difference: number;
  achievementPct: number;
  collectionPct: number;
  variancePct: number;
  varianceStatus: PvaVarianceStatus;
  reason?: string;
  remarks?: string;
}

export interface PvaDashboardKpis {
  totalPlannedValue: number;
  totalActualValue: number;
  totalCollection: number;
  totalDifference: number;
  overallAchievementPct: number;
  overallCollectionPct: number;
  updatedProjects: number;
  pendingProjects: number;
  totalProjects?: number;
  projectsOnTrack?: number;
  projectsMinorVariance?: number;
  projectsMajorVariance?: number;
}

export interface PvaProjectBundle {
  projectName: string;
  month: number;
  year: number;
  scl: PvaRecord | null;
  /** Backend-computed sum of contractor records — never sum on frontend. */
  contractorSummary: PvaRecord | null;
  contractors: PvaRecord[];
}

export interface PvaTrendPoint {
  month: number;
  monthLabel: string;
  sclPlanned: number;
  sclActual: number;
  sclCollection: number;
  sclVariancePct: number;
  contractorPlanned: number;
  contractorActual: number;
  contractorCollection: number;
  contractorVariancePct: number;
}

export interface PvaTrendResponse {
  projectName: string;
  year: number;
  points: PvaTrendPoint[];
}

/** Request body for POST /planned-vs-actual/ (UPSERT). */
export interface PvaCreatePayload {
  project_name: string;
  month: number;
  year: number;
  /** Backend field name — SCL | CONTRACTOR */
  planned_type: PvaPartyType;
  planned_value: number;
  actual_value: number;
  collection: number;
  reason_for_difference?: string;
  /** Alias; mapped to reason_for_difference on save. */
  reason?: string;
  remarks?: string;
  /** Required when planned_type = CONTRACTOR */
  contractor_id?: number;
  contractor_name?: string;
}

/** Partial body for PATCH /planned-vs-actual/{id}/ */
export type PvaPatchPayload = Partial<
  Pick<
    PvaCreatePayload,
    | 'planned_value'
    | 'actual_value'
    | 'collection'
    | 'reason_for_difference'
    | 'reason'
    | 'remarks'
  >
>;

export type PvaExportFormat = 'csv' | 'excel' | 'pdf';

export interface PvaPendingProjects {
  month: number;
  year: number;
  pendingProjects: string[];
  count: number;
}
