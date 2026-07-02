export type BgEntryType = 'SCL' | 'CONTRACTOR';

export type BgEntryStatus = 'UPDATED' | 'YET_TO_UPDATE' | 'NOT_UPDATED';

export interface BGEntry {
  id: number;
  bg_type: BgEntryType;
  bg_name: string;
  due_date: string;
  updated_date: string | null;
  status: BgEntryStatus;
  remarks: string;
  contractor_name?: string;
}

export interface BGSummary {
  total_bg: number;
  updated: number;
  yet_to_update: number;
  not_updated: number;
  compliance_percentage: number;
}

export interface BgStatusBundle {
  contractor_bg: BGEntry[];
  scl_bg: BGEntry[];
  bg_summary: BGSummary | null;
}

export interface CreateBGPayload {
  bg_type: BgEntryType;
  bg_name: string;
  due_date: string;
  updated_date?: string | null;
  remarks?: string;
  /** @deprecated Prefer contractor_id from Contractor Master */
  contractor_name?: string;
  contractor_id?: number;
}

export interface UpdateBGPayload {
  bg_name?: string;
  due_date?: string;
  updated_date?: string | null;
  remarks?: string;
}
