import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  API_CONFIG,
  API_ENDPOINTS,
  getApiBaseUrl,
  normalizeApiUrl,
} from "../config/apiConfig";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "../utils/authStorage";
import {
  extractRecordId,
  formatFinancialMonthYear,
  formatProgressMonthDate,
  pickBudgetPerformanceRecord,
  pickCostPerformanceRecord,
  pickProjectProgressRecord,
} from "../utils/financialPeriod";
import {
  normalizeBgEntry,
  normalizeBgStatusBundle,
} from "../utils/bgStatusDisplay";
import { normalizeCorrespondenceCategory, normalizeCorrespondenceRecipientType } from "../utils/correspondence";
import { pickRecordForContractor } from "../utils/contractorFinancialRecords";
import type {
  ConstructionProgressRecord,
  ContractPerformanceRecord,
  ContractValueRecord,
  ContractValueType,
  CorrespondenceDocument,
  CorrespondenceMonthlyPeriod,
  CorrespondenceMonthlyRecord,
  CorrespondencePartyMetrics,
  CorrespondenceProjectSummary,
  CorrespondenceRecord,
  CorrespondenceType,
  CorrespondenceCategory,
  CorrespondenceRecipientType,
  DrawingClientReportData,
  DrawingClientReportRow,
  DrawingRegisterRow,
  DrawingMonthlyRecord,
  DrawingProjectSummary,
  DrawingWorkflowAction,
  DrawingWorkflowEvent,
  InvoicingRecord,
  InvoiceType,
  MachineryMaster,
  ProjectEquipmentRecord,
  ProjectQualityStatusRecord,
  SiteImageRecord,
} from "../types";

export { normalizeApiUrl };

/** DRF list responses are often `{ count, next, previous, results }` instead of a bare array.
 *  Some endpoints wrap further: `{ success, message, data: { count, results } }` */
export function unwrapList<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    // Handle { success, data: { results: [...] } } envelope
    if (obj.data && typeof obj.data === "object") {
      const inner = obj.data as Record<string, unknown>;
      if (Array.isArray(inner.results)) return inner.results as T[];
      if (Array.isArray(inner)) return inner as T[];
    }
    // Handle flat { count, results: [...] }
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}

export function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Return a useful DRF/Axios error message for card and form error states. */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Unable to complete the request.",
): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response)
    return "Unable to connect to the server. Please try again.";

  const data = error.response.data;
  if (typeof data === "string" && data.trim()) {
    return /<(?:!doctype|html)\b/i.test(data) ? fallback : data;
  }
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    const directMessage = body.detail ?? body.message ?? body.error;
    if (typeof directMessage === "string" && directMessage.trim())
      return directMessage;

    const validation = Object.entries(body).find(
      ([, value]) =>
        typeof value === "string" || (Array.isArray(value) && value.length > 0),
    );
    if (validation) {
      const [field, value] = validation;
      const message = Array.isArray(value) ? value.join(" ") : String(value);
      return `${field}: ${message}`;
    }
  }

  return fallback;
}

const isApiDebugEnabled =
  (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ?? false;

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let unauthorizedHandler: (() => void) | null = null;
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function isAuthBypassUrl(url?: string): boolean {
  if (!url) return false;
  return (
    url.includes(API_ENDPOINTS.AUTH.LOGIN) ||
    url.includes(API_ENDPOINTS.AUTH.REFRESH) ||
    url.includes(API_ENDPOINTS.AUTH.LOGOUT) ||
    url.includes("/auth/login/")
  );
}

function processRefreshQueue(
  error: unknown,
  token: string | null = null,
): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error ?? new Error("Unable to refresh access token."));
    } else {
      resolve(token);
    }
  });
  refreshQueue = [];
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error("No refresh token available.");
  }

  const response = await axios.post(
    `${getApiBaseUrl("main")}${API_ENDPOINTS.AUTH.REFRESH}`,
    { refresh },
    { headers: { "Content-Type": "application/json" } },
  );

  const access = response.data?.access as string | undefined;
  if (!access) {
    throw new Error("Refresh response did not include an access token.");
  }

  setAccessToken(access);
  if (response.data?.refresh) {
    setRefreshToken(response.data.refresh);
  }

  return access;
}

function configureApiInstance(instance: AxiosInstance): void {
  instance.interceptors.request.use(
    (config) => {
      if (!isAuthBypassUrl(config.url)) {
        const accessToken = getAccessToken();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }

      if (config.url) {
        config.url = normalizeApiUrl(config.url);
      }

      if (isApiDebugEnabled) {
        console.debug(
          "[API request]",
          config.method?.toUpperCase(),
          instance.getUri(config),
          {
            data:
              config.url?.includes("/token/") || config.url?.includes("/auth/")
                ? "[redacted]"
                : config.data,
          },
        );
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    (response) => {
      if (isApiDebugEnabled) {
        console.debug(
          "[API response]",
          response.status,
          instance.getUri(response.config),
          response.data,
        );
      }
      return response;
    },
    async (error) => {
      if (isApiDebugEnabled) {
        const requestUrl = error.config
          ? instance.getUri(error.config)
          : undefined;
        console.error(
          "[API error]",
          error.response?.status,
          requestUrl,
          error.response?.data || error.message,
        );
      }

      const originalRequest = error.config as
        | RetryableRequestConfig
        | undefined;
      const status = error.response?.status;

      if (
        status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        isAuthBypassUrl(originalRequest.url)
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              originalRequest.headers = originalRequest.headers ?? {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(instance(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken();
        processRefreshQueue(null, newAccessToken);
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return instance(originalRequest);
      } catch (refreshError) {
        processRefreshQueue(refreshError, null);
        clearAuthStorage();
        unauthorizedHandler?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
}

// Use API configuration from centralized config file
const API_BASE_URL = getApiBaseUrl("main");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

configureApiInstance(api);

export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    api.post(API_ENDPOINTS.AUTH.LOGIN, credentials),

  refresh: (refresh: string) =>
    api.post(API_ENDPOINTS.AUTH.REFRESH, { refresh }),

  logout: (refresh: string) => api.post(API_ENDPOINTS.AUTH.LOGOUT, { refresh }),

  getUserProfile: () => api.get(API_ENDPOINTS.AUTH.PROFILE),
};

export const projectApi = {
  getProjects: () => api.get(API_ENDPOINTS.PROJECTS.LIST),
  getProject: (id: string) => api.get(API_ENDPOINTS.PROJECTS.DETAIL(id)),
  createProject: (data: any) => {
    return api.post(API_ENDPOINTS.PROJECTS.LIST, data);
  },
  getSites: (projectId?: string) => {
    const url = projectId
      ? `${API_ENDPOINTS.PROJECTS.SITES}?project_id=${projectId}`
      : API_ENDPOINTS.PROJECTS.SITES;
    return api.get(url);
  },
  getProjectDocuments: () => api.get(API_ENDPOINTS.PROJECTS.DOCUMENTS),
  importDashboardData: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(
      API_ENDPOINTS.PROJECTS.IMPORT_DASHBOARD(projectId),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  },
  getDashboardData: (projectId: string) => {
    return api.get(API_ENDPOINTS.PROJECTS.DASHBOARD_DATA(projectId));
  },
  patchProject: (projectId: string, data: any) => {
    return api.patch(API_ENDPOINTS.PROJECTS.PATCH(projectId), data);
  },
  updateProject: (projectId: string, data: any) => {
    return api.put(API_ENDPOINTS.PROJECTS.UPDATE(projectId), data);
  },
  getAvailableUsers: (role?: string) => {
    const url = role
      ? `${API_ENDPOINTS.PROJECTS.AVAILABLE_USERS}?role=${role}`
      : API_ENDPOINTS.PROJECTS.AVAILABLE_USERS;
    return api.get(url);
  },
  assignTeamLead: (projectId: string, userId: number) => {
    return api.post(API_ENDPOINTS.PROJECTS.ASSIGN_TEAM_LEAD(projectId), {
      user_id: userId,
    });
  },
  assignCoordinator: (projectId: string, userId: number) => {
    return api.post(API_ENDPOINTS.PROJECTS.ASSIGN_COORDINATOR(projectId), {
      user_id: userId,
    });
  },
  addSiteEngineers: (projectId: string, userIds: number[]) => {
    return api.post(API_ENDPOINTS.PROJECTS.ADD_SITE_ENGINEERS(projectId), {
      user_ids: userIds,
    });
  },
  addBillingSiteEngineer: (projectId: string, userId: number) => {
    return api.post(API_ENDPOINTS.PROJECTS.ADD_BILLING_ENGINEER(projectId), {
      user_id: userId,
    });
  },
  addQAQCSiteEngineer: (projectId: string, userId: number) => {
    return api.post(API_ENDPOINTS.PROJECTS.ADD_QAQC_ENGINEER(projectId), {
      user_id: userId,
    });
  },
  // Project Initialization API (PMC Head)
  initProject: (projectData: any) => {
    return api.post(API_ENDPOINTS.PROJECTS.INIT_PROJECT, projectData);
  },
  getInitProjects: () => {
    return api.get(API_ENDPOINTS.PROJECTS.INIT_LIST);
  },
};

export const operationsApi = {
  getTasks: (siteId?: string) => {
    const url = siteId
      ? `${API_ENDPOINTS.OPERATIONS.TASKS}?site_id=${siteId}`
      : API_ENDPOINTS.OPERATIONS.TASKS;
    return api.get(url);
  },
  getReports: (taskId?: string) => {
    const url = taskId
      ? `${API_ENDPOINTS.OPERATIONS.REPORTS}?task_id=${taskId}`
      : API_ENDPOINTS.OPERATIONS.REPORTS;
    return api.get(url);
  },
  getSubmittedDocuments: (status?: string, projectId?: string) => {
    let url = API_ENDPOINTS.OPERATIONS.SUBMITTED_DOCUMENTS;
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (projectId) params.append("project_id", projectId);
    if (params.toString()) url += `?${params.toString()}`;
    return api.get(url);
  },
  submitReport: async (reportData: any) => {
    const response = await api.post(
      API_ENDPOINTS.OPERATIONS.REPORTS,
      reportData,
    );
    return response;
  },
  approveReport: (reportId: string) =>
    api.post(API_ENDPOINTS.OPERATIONS.APPROVE_REPORT(reportId)),
  rejectReport: (reportId: string, reason: string) =>
    api.post(API_ENDPOINTS.OPERATIONS.REJECT_REPORT(reportId), { reason }),
};

// Separate axios instance for DPR API (uses different base URL from config)
const dprApiInstance = axios.create({
  baseURL: getApiBaseUrl("dpr"),
  headers: {
    "Content-Type": "application/json",
  },
});

configureApiInstance(dprApiInstance);

export const dprApi = {
  // Get all DPRs with optional filtering
  getDPRs: (params?: {
    project_name?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
  }) => {
    return dprApiInstance.get(API_ENDPOINTS.DPR.LIST, { params });
  },
  // Get single DPR by ID
  getDPR: (id: string | number) => {
    return dprApiInstance.get(API_ENDPOINTS.DPR.DETAIL(id));
  },
  // Create new DPR with nested activities
  createDPR: (data: any) => {
    return dprApiInstance.post(API_ENDPOINTS.DPR.CREATE, data);
  },
  // Update DPR
  updateDPR: (id: string | number, data: any) => {
    return dprApiInstance.put(API_ENDPOINTS.DPR.UPDATE(id), data);
  },
  // Partial update DPR
  patchDPR: (id: string | number, data: any) => {
    return dprApiInstance.patch(API_ENDPOINTS.DPR.PATCH(id), data);
  },
  // Delete DPR
  deleteDPR: (id: string | number) => {
    return dprApiInstance.delete(API_ENDPOINTS.DPR.DELETE(id));
  },
  // Get activities for a specific DPR
  getDPRActivities: (id: string | number) => {
    return dprApiInstance.get(API_ENDPOINTS.DPR.ACTIVITIES(id));
  },
  // Submit DPR for approval
  submitDPR: (id: string | number, role: string) => {
    return dprApiInstance.post(`/dpr/${id}/submit/`, { role });
  },
  // Team Lead approves DPR
  approveTeamLead: (id: string | number) => {
    return dprApiInstance.post(`/dpr/${id}/approve_team_lead/`, {
      role: "Team Leader",
    });
  },
  // Coordinator approves DPR
  approveCoordinator: (id: string | number) => {
    return dprApiInstance.post(`/dpr/${id}/approve_coordinator/`, {
      role: "Coordinator",
    });
  },
  // PMC Head approves DPR
  approvePMCHead: (id: string | number) => {
    return dprApiInstance.post(`/dpr/${id}/approve_pmc_head/`, {
      role: "PMC Head",
    });
  },
  // Reject DPR with reason
  rejectDPR: (id: string | number, rejectionReason: string) => {
    return dprApiInstance.post(`/dpr/${id}/reject/`, {
      rejection_reason: rejectionReason,
    });
  },
  // Get DPRs pending approval for a specific role
  getPendingApproval: (role: string) => {
    return dprApiInstance.get(`/dpr/pending_approval/?role=${role}`);
  },
  // Get rejected DPRs for a specific role
  getRejected: (role: string) => {
    return dprApiInstance.get(`/dpr/rejected/?role=${role}`);
  },
};

export const wprApi = {
  /** Backend requires `project_name` (see GET /wpr/ in Swagger). Optional: month, year, week, role. */
  getWPRs: (params: {
    project_name: string;
    month?: number;
    year?: number;
    week?: number;
    role?: string;
  }) => api.get(API_ENDPOINTS.WPR.LIST, { params }),
};

export const monthlyScopeApi = {
  getScopes: (params?: any) => {
    console.log("Fetching scopes with params:", params);
    const url = "/monthly-scope/";
    console.log("Final scopes URL:", url);
    return api.get(url, { params });
  },
  getScope: (id: number) => api.get(`/monthly-scope/${id}/`),
  createScope: (data: any) => api.post("/monthly-scope/", data),
  updateScope: (id: number, data: any) =>
    api.put(`/monthly-scope/${id}/`, data),
  deleteScope: (id: number) => api.delete(`/monthly-scope/${id}/`),
  getCategories: () => {
    console.log("Fetching categories from API");
    const url = "/monthly-scope/categories/";
    console.log("Final categories URL:", url);
    return api.get(url);
  },
  getSubcategories: (categoryId: number) =>
    api.get(`/monthly-scope/subcategories/?category_id=${categoryId}`),
  getMyScopes: (params?: any) => {
    const url = "/monthly-scope/my-scopes/";
    console.log("Final my scopes URL:", url);
    return api.get(url, { params });
  },
};

// ─── Health, Safety & Environment (HSE) ──────────────────────────────────────

export interface HSERecord {
  id?: number;
  projectName: string;
  month?: number;
  year?: number;
  fatalities: number;
  significant: number;
  major: number;
  minor: number;
  nearMiss: number;
  totalManhours: number;
  lossOfManhours: number;
  status?: string;
}

export interface HealthSafetyYtdSummary {
  year: number;
  fatalities: number;
  significant: number;
  major: number;
  minor: number;
  nearMiss: number;
  totalManhours?: number;
  lossOfManhours?: number;
}

export interface HealthSafetyDashboardData {
  currentMonth: HSERecord | null;
  ytdSummary: HealthSafetyYtdSummary | null;
  monthlyRecords: HSERecord[];
  selectedMonth?: number;
  selectedYear?: number;
}

export type HealthSafetyCreatePayload = Pick<
  HSERecord,
  | "projectName"
  | "month"
  | "year"
  | "fatalities"
  | "significant"
  | "major"
  | "minor"
  | "nearMiss"
  | "totalManhours"
  | "lossOfManhours"
> & {
  month: number;
  year: number;
};

export type HSEPayload = Omit<HSERecord, "id">;

export function normalizeHSERecord(row: any, projectName = ""): HSERecord {
  if (!row || typeof row !== "object") {
    return {
      projectName,
      fatalities: 0,
      significant: 0,
      major: 0,
      minor: 0,
      nearMiss: 0,
      totalManhours: 0,
      lossOfManhours: 0,
    };
  }

  const source = row.record ?? row.monthly_record ?? row.monthlyRecord ?? row;

  return {
    id: source?.id ?? source?.pk ?? source?.record_id ?? source?.recordId,
    projectName: source?.projectName ?? source?.project_name ?? projectName,
    month: source?.month != null ? toNum(source.month) : undefined,
    year: source?.year != null ? toNum(source.year) : undefined,
    fatalities: toNum(source?.fatalities),
    significant: toNum(source?.significant),
    major: toNum(source?.major),
    minor: toNum(source?.minor),
    nearMiss: toNum(source?.nearMiss ?? source?.near_miss),
    totalManhours: toNum(source?.totalManhours ?? source?.total_manhours),
    lossOfManhours: toNum(source?.lossOfManhours ?? source?.loss_of_manhours),
    status: source?.status ?? "",
  };
}

export function normalizeHealthSafetyYtdSummary(
  row: any,
  year?: number,
): HealthSafetyYtdSummary {
  return {
    year: toNum(row?.year ?? year),
    fatalities: toNum(
      row?.fatalities ?? row?.total_fatalities ?? row?.totalFatalities,
    ),
    significant: toNum(
      row?.significant ?? row?.total_significant ?? row?.totalSignificant,
    ),
    major: toNum(row?.major ?? row?.total_major ?? row?.totalMajor),
    minor: toNum(row?.minor ?? row?.total_minor ?? row?.totalMinor),
    nearMiss: toNum(
      row?.nearMiss ??
      row?.near_miss ??
      row?.total_near_miss ??
      row?.totalNearMiss,
    ),
    totalManhours: toNum(row?.totalManhours ?? row?.total_manhours),
    lossOfManhours: toNum(row?.lossOfManhours ?? row?.loss_of_manhours),
  };
}

function unwrapApiData(data: unknown): unknown {
  if (
    data &&
    typeof data === "object" &&
    "data" in (data as Record<string, unknown>)
  ) {
    return (data as Record<string, unknown>).data;
  }
  return data;
}

export function normalizeHealthSafetyDashboard(
  raw: unknown,
  projectName = "",
): HealthSafetyDashboardData {
  const data = unwrapApiData(raw) as Record<string, unknown> | null | undefined;
  if (!data || typeof data !== "object") {
    return { currentMonth: null, ytdSummary: null, monthlyRecords: [] };
  }

  const currentMonthRaw =
    data.currentMonth ??
    data.current_month ??
    data.monthlyRecord ??
    data.monthly_record ??
    data.selectedMonthRecord ??
    data.selected_month_record;

  const ytdRaw =
    data.ytdSummary ??
    data.ytd_summary ??
    data.yearToDateSummary ??
    data.year_to_date_summary ??
    data.summary;

  const monthlyRaw =
    data.monthlyRecords ??
    data.monthly_records ??
    data.records ??
    data.monthlyData ??
    data.monthly_data ??
    data.trend ??
    [];

  const year =
    toNum(data.selectedYear ?? data.selected_year ?? data.year) ||
    new Date().getFullYear();
  const month =
    toNum(data.selectedMonth ?? data.selected_month ?? data.month) ||
    new Date().getMonth() + 1;

  const monthlyRecords = unwrapList<any>(monthlyRaw)
    .map((row) => normalizeHSERecord(row, projectName))
    .filter((row) => row.month && row.year)
    .sort((a, b) => a.year! - b.year! || a.month! - b.month!);

  const currentMonth = currentMonthRaw
    ? normalizeHSERecord(currentMonthRaw, projectName)
    : (monthlyRecords.find((row) => row.month === month && row.year === year) ??
      monthlyRecords[monthlyRecords.length - 1] ??
      null);

  const ytdSummary = ytdRaw
    ? normalizeHealthSafetyYtdSummary(ytdRaw, currentMonth?.year ?? year)
    : null;

  return {
    currentMonth,
    ytdSummary,
    monthlyRecords,
    selectedMonth: month,
    selectedYear: year,
  };
}

function toHealthSafetyPayload(data: HealthSafetyCreatePayload) {
  return {
    project_name: data.projectName,
    month: data.month,
    year: data.year,
    fatalities: data.fatalities,
    significant: data.significant,
    major: data.major,
    minor: data.minor,
    near_miss: data.nearMiss,
    total_manhours: data.totalManhours,
    loss_of_manhours: data.lossOfManhours,
  };
}

// Health & Safety API
export const healthSafetyApi = {
  /** GET /api/health-safety/?project_name=... */
  getAll: (params?: {
    project_name?: string;
    page?: number;
    page_size?: number;
  }) => api.get(API_ENDPOINTS.HEALTH_SAFETY.LIST, { params }),

  /** GET /api/health-safety/{id}/ */
  getById: (id: string | number) =>
    api.get(API_ENDPOINTS.HEALTH_SAFETY.DETAIL(id)),

  /** GET /api/health-safety/project/{projectName}/ */
  getByProject: (projectName: string) =>
    api.get(API_ENDPOINTS.HEALTH_SAFETY.PROJECT(projectName)),

  /** GET /api/health-safety/project/{projectName}/month/{month}/year/{year}/ */
  getByProjectMonthYear: (projectName: string, month: number, year: number) =>
    api.get(
      API_ENDPOINTS.HEALTH_SAFETY.BY_MONTH_YEAR(projectName, month, year),
    ),

  /** GET /api/health-safety/project/{projectName}/year/{year}/summary/ */
  getYearSummary: (projectName: string, year: number) =>
    api.get(API_ENDPOINTS.HEALTH_SAFETY.YEAR_SUMMARY(projectName, year)),

  /** GET /api/health-safety/project/{projectName}/dashboard/ */
  getDashboard: (projectName: string) =>
    api.get(API_ENDPOINTS.HEALTH_SAFETY.DASHBOARD(projectName)),

  /** POST /api/health-safety/ */
  create: (data: HealthSafetyCreatePayload) =>
    api.post(API_ENDPOINTS.HEALTH_SAFETY.LIST, toHealthSafetyPayload(data)),

  /** PUT /api/health-safety/{id}/ */
  update: (id: string | number, data: HealthSafetyCreatePayload) =>
    api.put(
      API_ENDPOINTS.HEALTH_SAFETY.DETAIL(id),
      toHealthSafetyPayload(data),
    ),

  /** PATCH /api/health-safety/{id}/ */
  patch: (id: string | number, data: Partial<HealthSafetyCreatePayload>) =>
    api.patch(API_ENDPOINTS.HEALTH_SAFETY.DETAIL(id), {
      ...(data.projectName !== undefined && { project_name: data.projectName }),
      ...(data.month !== undefined && { month: data.month }),
      ...(data.year !== undefined && { year: data.year }),
      ...(data.fatalities !== undefined && { fatalities: data.fatalities }),
      ...(data.significant !== undefined && { significant: data.significant }),
      ...(data.major !== undefined && { major: data.major }),
      ...(data.minor !== undefined && { minor: data.minor }),
      ...(data.nearMiss !== undefined && { near_miss: data.nearMiss }),
      ...(data.totalManhours !== undefined && {
        total_manhours: data.totalManhours,
      }),
      ...(data.lossOfManhours !== undefined && {
        loss_of_manhours: data.lossOfManhours,
      }),
    }),

  /** DELETE /api/health-safety/{id}/ */
  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.HEALTH_SAFETY.DETAIL(id)),

  // Legacy aliases kept for backward compatibility
  /** @deprecated Use getAll({ project_name }) instead */
  getReports: (params?: { project?: string; project_name?: string }) =>
    api.get(API_ENDPOINTS.HEALTH_SAFETY.LIST, { params }),
  /** @deprecated Use getByProject() instead */
  getStatusByProject: (projectName: string) =>
    api.get(API_ENDPOINTS.HEALTH_SAFETY.PROJECT(projectName)),
};

export function findHealthSafetyRecordByPeriod(
  records: HSERecord[] | null | undefined,
  month: number,
  year: number,
): HSERecord | null {
  const targetMonth = toNum(month);
  const targetYear = toNum(year);
  return (
    records?.find(
      (row) =>
        toNum(row.month) === targetMonth && toNum(row.year) === targetYear,
    ) ?? null
  );
}

function unwrapHealthSafetyRow(
  data: unknown,
  projectName = "",
): HSERecord | null {
  if (!data) return null;
  const unwrapped = unwrapApiData(data);
  if (Array.isArray(unwrapped)) {
    return unwrapped.length > 0
      ? normalizeHSERecord(unwrapped[0], projectName)
      : null;
  }
  if (unwrapped && typeof unwrapped === "object") {
    const obj = unwrapped as Record<string, unknown>;
    if (obj.success === false) return null;
    return normalizeHSERecord(unwrapped, projectName);
  }
  return null;
}

function throwIfHealthSafetyFailure(data: unknown, status = 400): void {
  if (!data || typeof data !== "object") return;
  const body = data as Record<string, unknown>;
  if (body.success !== false) return;

  throw axios.AxiosError.from(
    typeof body.message === "string"
      ? body.message
      : "Failed to save HSE record",
    axios.AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    {
      data: body,
      status,
      statusText: "Bad Request",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    },
  );
}

function mergeHealthSafetyRecordsByPeriod(records: HSERecord[]): HSERecord[] {
  const map = new Map<string, HSERecord>();
  records.forEach((row) => {
    const month = toNum(row.month);
    const recordYear = toNum(row.year);
    if (month < 1 || month > 12 || !recordYear) return;
    map.set(`${recordYear}-${month}`, { ...row, month, year: recordYear });
  });
  return Array.from(map.values()).sort(
    (a, b) => a.year! - b.year! || a.month! - b.month!,
  );
}

function collectHealthSafetyRowsFromPayload(
  payload: unknown,
  projectName: string,
): HSERecord[] {
  if (!payload) return [];
  const unwrapped = unwrapApiData(payload) ?? payload;
  return unwrapList<any>(unwrapped).map((row) =>
    normalizeHSERecord(row, projectName),
  );
}

async function listHealthSafetyRecordsForProject(
  projectName: string,
): Promise<HSERecord[]> {
  const response = await healthSafetyApi.getAll({ project_name: projectName });
  throwIfHealthSafetyFailure(response.data, response.status);
  return collectHealthSafetyRowsFromPayload(response.data, projectName);
}

/** Load all monthly HSE rows for a project/year (for trend charts). Never throws — returns [] on failure. */
export async function fetchHealthSafetyYearRecords(
  projectName: string,
  year: number,
): Promise<HSERecord[]> {
  try {
    const listRes = await healthSafetyApi.getAll({ project_name: projectName });
    const body = listRes.data as Record<string, unknown> | undefined;
    if (body?.success === false) return [];
    return mergeHealthSafetyRecordsByPeriod(
      collectHealthSafetyRowsFromPayload(listRes.data, projectName).filter(
        (row) =>
          toNum(row.year) === year &&
          toNum(row.month) >= 1 &&
          toNum(row.month) <= 12,
      ),
    );
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      console.warn("[HSE] List fetch for trend failed:", error);
    }
    return [];
  }
}

/** Fallback when dashboard endpoint is missing — uses list API only. */
export async function fetchHealthSafetyDashboardFallback(
  projectName: string,
  month: number,
  year: number,
): Promise<HealthSafetyDashboardData> {
  const yearRecords = await fetchHealthSafetyYearRecords(projectName, year);

  const currentMonth =
    yearRecords.find(
      (row) => toNum(row.month) === month && toNum(row.year) === year,
    ) ?? null;

  const ytdSummary = normalizeHealthSafetyYtdSummary(null, year);

  return {
    currentMonth,
    ytdSummary,
    monthlyRecords: mergeHealthSafetyRecordsByPeriod(
      currentMonth ? [...yearRecords, currentMonth] : yearRecords,
    ),
    selectedMonth: month,
    selectedYear: year,
  };
}

export async function fetchHealthSafetyRecordByPeriod(
  projectName: string,
  month: number,
  year: number,
): Promise<HSERecord | null> {
  try {
    const records = await listHealthSafetyRecordsForProject(projectName);
    return findHealthSafetyRecordByPeriod(records, month, year);
  } catch {
    return null;
  }
}

async function resolveHealthSafetyRecordForPeriod(
  projectName: string,
  month: number,
  year: number,
  options?: { record?: HSERecord | null; knownRecords?: HSERecord[] },
): Promise<HSERecord | null> {
  const targetMonth = toNum(month);
  const targetYear = toNum(year);

  const candidates: HSERecord[] = [];
  if (options?.record) candidates.push(options.record);
  const fromKnown = findHealthSafetyRecordByPeriod(
    options?.knownRecords,
    targetMonth,
    targetYear,
  );
  if (fromKnown) candidates.push(fromKnown);

  const matchedCandidate = candidates.find(
    (row) =>
      toNum(row.month) === targetMonth &&
      toNum(row.year) === targetYear &&
      row.id != null,
  );
  if (matchedCandidate?.id) return matchedCandidate;

  const fetched = await fetchHealthSafetyRecordByPeriod(
    projectName,
    targetMonth,
    targetYear,
  );
  if (fetched?.id) return fetched;

  if (matchedCandidate) return matchedCandidate;
  return fetched;
}

async function updateHealthSafetyRecord(
  id: string | number,
  payload: HealthSafetyCreatePayload,
): Promise<HSERecord> {
  try {
    const response = await healthSafetyApi.update(id, payload);
    throwIfHealthSafetyFailure(response.data, response.status);
    return normalizeHSERecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const response = await healthSafetyApi.patch(id, payload);
    throwIfHealthSafetyFailure(response.data, response.status);
    return normalizeHSERecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  }
}

function isDuplicateHealthSafetyError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response?.data) return false;
  const data = error.response.data;
  const parts: string[] = [];
  if (typeof data === "string") parts.push(data);
  else if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    if (typeof body.message === "string") parts.push(body.message);
    if (typeof body.errors === "string") parts.push(body.errors);
    if (body.errors && typeof body.errors === "object") {
      parts.push(JSON.stringify(body.errors));
    }
    if (Array.isArray(body.__all__)) parts.push(body.__all__.join(" "));
    parts.push(getApiErrorMessage(error, ""));
  }
  const combined = parts.join(" ").toLowerCase();
  return combined.includes("already exists") || combined.includes("unique");
}

/** Create when no record exists for project/month/year; otherwise update via PUT/PATCH. */
export async function saveHealthSafetyRecord(
  payload: HealthSafetyCreatePayload,
  options?: { record?: HSERecord | null; knownRecords?: HSERecord[] },
): Promise<HSERecord> {
  const existing = await resolveHealthSafetyRecordForPeriod(
    payload.projectName,
    payload.month,
    payload.year,
    options,
  );

  if (existing?.id) {
    return updateHealthSafetyRecord(existing.id, payload);
  }

  try {
    const response = await healthSafetyApi.create(payload);
    throwIfHealthSafetyFailure(response.data, response.status);
    return normalizeHSERecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  } catch (error) {
    if (!isDuplicateHealthSafetyError(error)) throw error;

    const fetched = await fetchHealthSafetyRecordByPeriod(
      payload.projectName,
      payload.month,
      payload.year,
    );
    if (!fetched?.id) throw error;
    return updateHealthSafetyRecord(fetched.id, payload);
  }
}

// Project Progress API (no auth)
export const projectProgressApi = {
  getProjectProgress: (params?: { project_name?: string; role?: string }) =>
    api.get(API_ENDPOINTS.PROJECT_PROGRESS.LIST, { params }),
  getProjectProgressDetail: (id: string | number) =>
    api.get(API_ENDPOINTS.PROJECT_PROGRESS.DETAIL(id)),
  createProjectProgress: (data: any) =>
    api.post(API_ENDPOINTS.PROJECT_PROGRESS.LIST, data),
  updateProjectProgress: (id: string | number, data: any) =>
    api.put(API_ENDPOINTS.PROJECT_PROGRESS.DETAIL(id), data),
  patchProjectProgress: (id: string | number, data: any) =>
    api.patch(API_ENDPOINTS.PROJECT_PROGRESS.DETAIL(id), data),
};

export type ConstructionProgressPayload = Pick<
  ConstructionProgressRecord,
  | "projectName"
  | "progressMonth"
  | "plannedProgress"
  | "actualProgress"
  | "remarks"
>;

export function normalizeConstructionProgressRecord(
  row: any,
  projectName = "",
): ConstructionProgressRecord {
  return {
    id: row?.id,
    projectName: row?.projectName ?? row?.project_name ?? projectName,
    progressMonth: row?.progressMonth ?? row?.progress_month ?? "",
    plannedProgress: toNum(row?.plannedProgress ?? row?.planned_progress),
    actualProgress: toNum(row?.actualProgress ?? row?.actual_progress),
    variance: toNum(row?.variance),
    performancePercentage: toNum(
      row?.performancePercentage ?? row?.performance_percentage,
    ),
    remarks: row?.remarks ?? "",
  };
}

const toConstructionProgressPayload = (data: ConstructionProgressPayload) => ({
  project_name: data.projectName,
  progress_month: data.progressMonth,
  planned_progress: data.plannedProgress,
  actual_progress: data.actualProgress,
  remarks: data.remarks ?? "",
});

export const constructionProgressApi = {
  getAll: (params?: {
    project_name?: string;
    progress_month?: string;
    year?: string | number;
    page?: number;
    page_size?: number;
  }) => api.get(API_ENDPOINTS.CONSTRUCTION_PROGRESS.LIST, { params }),
  getById: (id: string | number) =>
    api.get(API_ENDPOINTS.CONSTRUCTION_PROGRESS.DETAIL(id)),
  getByProject: (projectName: string) =>
    api.get(API_ENDPOINTS.CONSTRUCTION_PROGRESS.PROJECT(projectName)),
  getByMonth: (progressMonth: string) =>
    api.get(API_ENDPOINTS.CONSTRUCTION_PROGRESS.MONTH(progressMonth)),
  create: (data: ConstructionProgressPayload) =>
    api.post(
      API_ENDPOINTS.CONSTRUCTION_PROGRESS.LIST,
      toConstructionProgressPayload(data),
    ),
  update: (id: string | number, data: ConstructionProgressPayload) =>
    api.put(
      API_ENDPOINTS.CONSTRUCTION_PROGRESS.DETAIL(id),
      toConstructionProgressPayload(data),
    ),
  patch: (id: string | number, data: Partial<ConstructionProgressPayload>) =>
    api.patch(API_ENDPOINTS.CONSTRUCTION_PROGRESS.DETAIL(id), {
      ...(data.projectName !== undefined && { project_name: data.projectName }),
      ...(data.progressMonth !== undefined && {
        progress_month: data.progressMonth,
      }),
      ...(data.plannedProgress !== undefined && {
        planned_progress: data.plannedProgress,
      }),
      ...(data.actualProgress !== undefined && {
        actual_progress: data.actualProgress,
      }),
      ...(data.remarks !== undefined && { remarks: data.remarks }),
    }),
  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.CONSTRUCTION_PROGRESS.DETAIL(id)),
};

// Manpower API (no auth)
export type ManpowerWriteInput = {
  project_name: string;
  month?: string;
  year?: string | number;
  month_year?: string;
  planned_manpower?: number;
  monthly_planned_manpower?: number;
  actual_manpower: number;
  working_hours_per_day?: number;
  working_days_per_month?: number;
};

export type ManpowerApiPayload = {
  project_name: string;
  month: string;
  year: number;
  monthly_planned_manpower: number;
  actual_manpower: number;
  working_hours_per_day?: number;
  working_days_per_month?: number;
};

export function buildManpowerApiPayload(data: ManpowerWriteInput): ManpowerApiPayload {
  let month = data.month?.trim();
  let year =
    data.year != null && data.year !== ''
      ? Number(data.year)
      : undefined;

  if ((!month || year == null || !Number.isFinite(year)) && data.month_year) {
    const [monthPart, yearPart] = data.month_year.split('-');
    month = month || monthPart?.trim();
    if (year == null || !Number.isFinite(year)) {
      year = yearPart ? parseInt(yearPart, 10) : undefined;
    }
  }

  const planned =
    data.monthly_planned_manpower ?? data.planned_manpower ?? 0;

  if (!month || year == null || !Number.isFinite(year)) {
    throw new Error('Month and year are required for manpower records.');
  }

  return {
    project_name: data.project_name.trim(),
    month,
    year,
    monthly_planned_manpower: planned,
    actual_manpower: data.actual_manpower,
    working_hours_per_day: data.working_hours_per_day ?? 8,
    working_days_per_month: data.working_days_per_month ?? 26,
  };
}

export function normalizeManpowerRecord(row: any) {
  const month =
    row?.month ??
    (typeof row?.month_year === 'string' ? row.month_year.split('-')[0] : '');
  const yearRaw =
    row?.year ??
    (typeof row?.month_year === 'string' ? row.month_year.split('-')[1] : '');
  const year = yearRaw != null && yearRaw !== '' ? String(yearRaw) : '';
  const month_year =
    row?.month_year ?? (month && year ? `${month}-${year}` : '');

  return {
    id: row?.id,
    project_name: row?.project_name ?? row?.projectName ?? '',
    month_year,
    planned_manpower: toNum(row?.planned_manpower ?? row?.monthly_planned_manpower),
    actual_manpower: toNum(row?.actual_manpower),
    working_hours_per_day: toNum(row?.working_hours_per_day) || undefined,
    working_days_per_month: toNum(row?.working_days_per_month) || undefined,
    manpower_efficiency: row?.manpower_efficiency,
    created_at: row?.created_at,
  };
}

export const manpowerApi = {
  getManpower: (params?: any) =>
    api.get(API_ENDPOINTS.MANPOWER.LIST, { params }),
  getManpowerDetail: (id: string | number) =>
    api.get(API_ENDPOINTS.MANPOWER.DETAIL(id)),
  getManpowerDashboard: (projectName: string) =>
    api.get(API_ENDPOINTS.MANPOWER.DASHBOARD, {
      params: { project_name: projectName },
    }),
  createManpower: (data: ManpowerWriteInput) =>
    api.post(API_ENDPOINTS.MANPOWER.CREATE, buildManpowerApiPayload(data)),
  updateManpower: (id: string | number, data: ManpowerWriteInput) =>
    api.put(API_ENDPOINTS.MANPOWER.UPDATE(id), buildManpowerApiPayload(data)),
  patchManpower: (id: string | number, data: ManpowerWriteInput) =>
    api.patch(API_ENDPOINTS.MANPOWER.UPDATE(id), buildManpowerApiPayload(data)),
  deleteManpower: (id: string | number) =>
    api.delete(API_ENDPOINTS.MANPOWER.DELETE(id)),
};

// Equipment API (no auth)
export const equipmentApi = {
  getEquipment: (params?: { project?: string; project_name?: string }) =>
    api.get(API_ENDPOINTS.EQUIPMENT.LIST, { params }),
  getEquipmentDetail: (id: string | number) =>
    api.get(API_ENDPOINTS.EQUIPMENT.DETAIL(id)),
};

export type ProjectEquipmentPayload = Pick<
  ProjectEquipmentRecord,
  | "projectName"
  | "equipmentMonth"
  | "plannedEquipment"
  | "actualEquipment"
  | "remarks"
>;

export function normalizeProjectEquipmentRecord(
  row: any,
  projectName = "",
): ProjectEquipmentRecord {
  return {
    id: row?.id,
    projectName: row?.projectName ?? row?.project_name ?? projectName,
    equipmentMonth: row?.equipmentMonth ?? row?.equipment_month ?? "",
    plannedEquipment: toNum(row?.plannedEquipment ?? row?.planned_equipment),
    actualEquipment: toNum(row?.actualEquipment ?? row?.actual_equipment),
    variance: toNum(row?.variance),
    performancePercentage: toNum(
      row?.performancePercentage ?? row?.performance_percentage,
    ),
    equipmentStatus: row?.equipmentStatus ?? row?.equipment_status ?? "",
    remarks: row?.remarks ?? "",
  };
}

export const projectEquipmentApi = {
  getAll: (params?: {
    projectName?: string;
    equipmentMonth?: string;
    year?: string | number;
    page?: number;
    page_size?: number;
  }) => api.get(API_ENDPOINTS.PROJECT_EQUIPMENT.LIST, { params }),
  getById: (id: string | number) =>
    api.get(API_ENDPOINTS.PROJECT_EQUIPMENT.DETAIL(id)),
  getByProject: (projectName: string) =>
    api.get(API_ENDPOINTS.PROJECT_EQUIPMENT.PROJECT(projectName)),
  getByMonth: (equipmentMonth: string) =>
    api.get(API_ENDPOINTS.PROJECT_EQUIPMENT.MONTH(equipmentMonth)),
  create: (data: ProjectEquipmentPayload) =>
    api.post(API_ENDPOINTS.PROJECT_EQUIPMENT.LIST, data),
  update: (id: string | number, data: ProjectEquipmentPayload) =>
    api.put(API_ENDPOINTS.PROJECT_EQUIPMENT.DETAIL(id), data),
  patch: (id: string | number, data: Partial<ProjectEquipmentPayload>) =>
    api.patch(API_ENDPOINTS.PROJECT_EQUIPMENT.DETAIL(id), data),
  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.PROJECT_EQUIPMENT.DETAIL(id)),
};

// ─── Correspondence (monthly client / contractor) ──────────────────────────

export type CorrespondenceCreatePayload = {
  projectName: string;
  month: number;
  year: number;
  correspondenceType: CorrespondenceType;
  correspondenceReceived: number;
  correspondenceDelivered: number;
};

export type CorrespondenceDocumentPayload = {
  projectName: string;
  month: number;
  year: number;
  correspondenceCategory: CorrespondenceCategory;
  description: string;
  receivedDate: string;
  deliveredDate?: string | null;
  correspondenceType?: CorrespondenceType;
  srNo?: number;
  recipientType?: CorrespondenceRecipientType;
};

/** @deprecated */
export type CorrespondencePayload = Pick<
  CorrespondenceRecord,
  "projectName" | "correspondenceReceived" | "correspondenceDelivered"
>;

export function normalizeCorrespondenceParty(
  row: any,
): CorrespondencePartyMetrics {
  const correspondenceReceived = toNum(
    row?.correspondence_received ?? row?.correspondenceReceived ?? row?.received,
  );
  const onTimeDelivered = toNum(
    row?.on_time_delivered ??
    row?.onTimeDelivered ??
    row?.on_time ??
    row?.delivered_on_time ??
    row?.correspondence_delivered_on_time,
  );
  const lateDeliveries = toNum(
    row?.late_deliveries ??
    row?.lateDeliveries ??
    row?.late_delivered ??
    row?.lateDelivered ??
    row?.delayed_correspondence ??
    row?.delayedCorrespondence,
  );
  const correspondenceDelivered = toNum(
    row?.correspondence_delivered ??
    row?.correspondenceDelivered ??
    row?.delivered_count ??
    row?.delivered,
  );
  const totalDelivered =
    correspondenceDelivered > 0
      ? correspondenceDelivered
      : onTimeDelivered + lateDeliveries;
  const pendingCorrespondence = toNum(
    row?.pending_correspondence ?? row?.pendingCorrespondence ?? row?.pending,
  );
  const correspondenceRecord = toNum(
    row?.record ?? row?.correspondence_record ?? row?.correspondenceRecord,
  );

  const resolvedOnTime =
    onTimeDelivered > 0
      ? onTimeDelivered
      : Math.max(0, totalDelivered - lateDeliveries);
  const resolvedLate =
    lateDeliveries > 0
      ? lateDeliveries
      : Math.max(0, totalDelivered - resolvedOnTime);

  let deliveryEfficiency = toNum(
    row?.delivery_efficiency ??
    row?.deliveryEfficiency ??
    row?.delivery_percentage ??
    row?.deliveryPercentage,
  );

  if (deliveryEfficiency <= 0 && totalDelivered > 0) {
    deliveryEfficiency = (resolvedOnTime / totalDelivered) * 100;
  }

  return {
    correspondenceReceived,
    correspondenceDelivered: totalDelivered,
    correspondenceRecord,
    onTimeDelivered: resolvedOnTime,
    lateDeliveries: resolvedLate,
    pendingCorrespondence,
    deliveryEfficiency,
  };
}

function normalizeCorrespondenceDate(value: unknown): string {
  if (value == null || value === "") return "";
  const text = String(value).trim();
  if (!text) return "";
  return text.length >= 10 ? text.slice(0, 10) : text;
}

export function isCorrespondenceDocumentRow(row: any): boolean {
  if (!row || typeof row !== "object") return false;
  if (row.description != null && String(row.description).trim() !== "")
    return true;
  if (row.sr_no != null || row.srNo != null || row.serial_number != null)
    return true;
  if (row.received_date != null || row.receivedDate != null) return true;
  if (row.delivered_date != null || row.deliveredDate != null) return true;
  if (row.delivery_date != null || row.deliveryDate != null) return true;
  if (row.deadline_date != null || row.deadlineDate != null) return true;
  if (row.status != null && String(row.status).trim() !== "") return true;
  return false;
}

export function isCorrespondenceMonthlyAggregateRow(row: any): boolean {
  if (!row || typeof row !== "object") return false;
  const hasCounts =
    row.correspondence_received != null ||
    row.correspondenceReceived != null ||
    row.correspondence_delivered != null ||
    row.correspondenceDelivered != null;
  return hasCounts && !isCorrespondenceDocumentRow(row);
}

export function normalizeCorrespondenceDocument(
  row: any,
  projectName = "",
): CorrespondenceDocument {
  const correspondenceType = String(
    row?.correspondence_type ?? row?.correspondenceType ?? "CLIENT",
  ).toUpperCase() as CorrespondenceType;

  const receivedDate = normalizeCorrespondenceDate(
    row?.received_date ?? row?.receivedDate,
  );
  const receivedDateObj = receivedDate
    ? new Date(`${receivedDate}T00:00:00`)
    : null;
  const monthFallback =
    receivedDateObj && !Number.isNaN(receivedDateObj.getTime())
      ? receivedDateObj.getMonth() + 1
      : new Date().getMonth() + 1;
  const yearFallback =
    receivedDateObj && !Number.isNaN(receivedDateObj.getTime())
      ? receivedDateObj.getFullYear()
      : new Date().getFullYear();

  return {
    id: row?.id ?? row?.pk,
    projectName: row?.projectName ?? row?.project_name ?? projectName,
    month: toNum(row?.month) || monthFallback,
    year: toNum(row?.year) || yearFallback,
    correspondenceType:
      correspondenceType === "CONTRACTOR" ? "CONTRACTOR" : "CLIENT",
    correspondenceCategory: normalizeCorrespondenceCategory(
      row?.correspondence_category ?? row?.correspondenceCategory,
    ),
    srNo: toNum(
      row?.sr_no ?? row?.srNo ?? row?.serial_number ?? row?.serialNumber,
    ),
    description: String(row?.description ?? "").trim(),
    receivedDate,
    deliveredDate:
      normalizeCorrespondenceDate(
        row?.delivered_date ??
        row?.deliveredDate ??
        row?.delivery_date ??
        row?.deliveryDate,
      ) || null,
    deadlineDate:
      normalizeCorrespondenceDate(row?.deadline_date ?? row?.deadlineDate) ||
      null,
    status: row?.status != null ? String(row.status).trim() : undefined,
    flowDirection: row?.flow_direction ?? row?.flowDirection,
    sender: row?.sender != null ? String(row.sender).trim() : undefined,
    recipientType:
      normalizeCorrespondenceRecipientType(
        row?.recipient_type ?? row?.recipientType,
      ) || null,
  };
}

export function extractCorrespondenceDocuments(
  raw: unknown,
  projectName = "",
): CorrespondenceDocument[] {
  const body = unwrapApiData(raw);
  if (!body) return [];

  const collected: CorrespondenceDocument[] = [];

  const pushRows = (
    rows: unknown[],
    correspondenceType?: CorrespondenceType,
  ) => {
    rows.forEach((row) => {
      if (
        !row ||
        typeof row !== "object" ||
        isCorrespondenceMonthlyAggregateRow(row)
      )
        return;
      if (
        !isCorrespondenceDocumentRow(row) &&
        (row as { id?: unknown }).id == null
      )
        return;
      const payload =
        correspondenceType &&
          !(row as { correspondence_type?: string }).correspondence_type
          ? { ...(row as object), correspondence_type: correspondenceType }
          : row;
      collected.push(normalizeCorrespondenceDocument(payload, projectName));
    });
  };

  if (Array.isArray(body)) {
    pushRows(body);
    return collected;
  }

  if (typeof body !== "object") return [];

  const record = body as Record<string, unknown>;
  const nestedKeys = [
    "documents",
    "entries",
    "correspondence_documents",
    "correspondenceDocuments",
    "records",
    "items",
    "results",
  ] as const;

  for (const key of nestedKeys) {
    const nested = record[key];
    if (Array.isArray(nested)) pushRows(nested);
  }

  const clientDocs = record.client_documents ?? record.clientDocuments;
  const contractorDocs =
    record.contractor_documents ?? record.contractorDocuments;
  if (Array.isArray(clientDocs)) pushRows(clientDocs, "CLIENT");
  if (Array.isArray(contractorDocs)) pushRows(contractorDocs, "CONTRACTOR");

  pushRows(unwrapList(body));

  return collected;
}

export function mergeCorrespondenceDocumentLists(
  ...lists: CorrespondenceDocument[][]
): CorrespondenceDocument[] {
  const byId = new Map<string | number, CorrespondenceDocument>();
  const withoutId: CorrespondenceDocument[] = [];

  lists.flat().forEach((doc) => {
    if (doc.id != null) {
      byId.set(doc.id, doc);
      return;
    }
    const key = `${doc.correspondenceType}-${doc.srNo}-${doc.receivedDate}-${doc.month}-${doc.year}`;
    const existing = withoutId.findIndex(
      (row) =>
        `${row.correspondenceType}-${row.srNo}-${row.receivedDate}-${row.month}-${row.year}` ===
        key,
    );
    if (existing >= 0) withoutId[existing] = doc;
    else withoutId.push(doc);
  });

  return [...byId.values(), ...withoutId];
}

export function collectCorrespondenceDocuments(
  listRaw: unknown,
  monthlyRaw: unknown,
  projectName: string,
  month?: number,
  year?: number,
): CorrespondenceDocument[] {
  const merged = mergeCorrespondenceDocumentLists(
    extractCorrespondenceDocuments(listRaw, projectName),
    extractCorrespondenceDocuments(monthlyRaw, projectName),
  );

  if (!month || !year) return merged;

  return merged.filter(
    (doc) => toNum(doc.month) === month && toNum(doc.year) === year,
  );
}

function toCorrespondenceDocumentPayload(data: CorrespondenceDocumentPayload) {
  const payload: Record<string, unknown> = {
    project_name: data.projectName,
    month: data.month,
    year: data.year,
    correspondence_category: data.correspondenceCategory,
    description: data.description,
    received_date: data.receivedDate,
  };

  if (data.recipientType) {
    payload.recipient_type = data.recipientType;
  } else if (data.correspondenceType) {
    payload.correspondence_type = data.correspondenceType;
    if (data.srNo != null) {
      payload.sr_no = data.srNo;
    }
  }

  if (data.correspondenceCategory === "DELIVERY" && data.deliveredDate) {
    payload.delivered_date = data.deliveredDate;
  }

  return payload;
}

const emptyCorrespondenceParty = (): CorrespondencePartyMetrics => ({
  correspondenceReceived: 0,
  correspondenceDelivered: 0,
  correspondenceRecord: 0,
  onTimeDelivered: 0,
  lateDeliveries: 0,
  pendingCorrespondence: 0,
  deliveryEfficiency: 0,
});

export function normalizeCorrespondenceMonthlyPeriod(
  row: any,
  projectName = "",
): CorrespondenceMonthlyPeriod {
  const month = toNum(row?.month) || new Date().getMonth() + 1;
  const year = toNum(row?.year) || new Date().getFullYear();
  const clientRow = row?.client ?? row?.CLIENT ?? {};
  const contractorRow = row?.contractor ?? row?.CONTRACTOR ?? {};

  return {
    projectName: row?.projectName ?? row?.project_name ?? projectName,
    month,
    year,
    client:
      clientRow && typeof clientRow === "object"
        ? normalizeCorrespondenceParty(clientRow)
        : emptyCorrespondenceParty(),
    contractor:
      contractorRow && typeof contractorRow === "object"
        ? normalizeCorrespondenceParty(contractorRow)
        : emptyCorrespondenceParty(),
  };
}

export function normalizeCorrespondenceMonthlyRecord(
  row: any,
  projectName = "",
): CorrespondenceMonthlyRecord {
  const correspondenceType = String(
    row?.correspondence_type ?? row?.correspondenceType ?? "CLIENT",
  ).toUpperCase() as CorrespondenceType;
  const party = normalizeCorrespondenceParty(row);

  return {
    id: row?.id,
    projectName: row?.projectName ?? row?.project_name ?? projectName,
    month: toNum(row?.month) || new Date().getMonth() + 1,
    year: toNum(row?.year) || new Date().getFullYear(),
    correspondenceType:
      correspondenceType === "CONTRACTOR" ? "CONTRACTOR" : "CLIENT",
    correspondenceReceived: party.correspondenceReceived,
    correspondenceDelivered: party.correspondenceDelivered,
    correspondenceRecord: party.correspondenceRecord,
    onTimeDelivered: party.onTimeDelivered,
    lateDeliveries: party.lateDeliveries,
    pendingCorrespondence: party.pendingCorrespondence,
    deliveryEfficiency: party.deliveryEfficiency,
  };
}

export function normalizeCorrespondenceProjectSummary(
  row: any,
): CorrespondenceProjectSummary {
  const data = unwrapApiData(row) as Record<string, unknown> | null | undefined;
  if (!data || typeof data !== "object") {
    return {
      client: emptyCorrespondenceParty(),
      contractor: emptyCorrespondenceParty(),
    };
  }
  return {
    client: normalizeCorrespondenceParty(data.client ?? data.CLIENT ?? {}),
    contractor: normalizeCorrespondenceParty(
      data.contractor ?? data.CONTRACTOR ?? {},
    ),
  };
}

export function normalizeCorrespondenceRecord(
  row: any,
  projectName = "",
): CorrespondenceRecord {
  const monthly = normalizeCorrespondenceMonthlyRecord(row, projectName);
  return {
    id: monthly.id,
    projectName: monthly.projectName,
    correspondenceReceived: monthly.correspondenceReceived,
    correspondenceDelivered: monthly.correspondenceDelivered,
    pendingCorrespondence: monthly.pendingCorrespondence,
    deliveryPercentage: monthly.deliveryEfficiency,
    updatedAt:
      row?.updatedAt ?? row?.updated_at ?? row?.modified_at ?? row?.created_at,
  };
}

function toCorrespondencePayload(data: CorrespondenceCreatePayload) {
  return {
    project_name: data.projectName,
    month: data.month,
    year: data.year,
    correspondence_type: data.correspondenceType,
    correspondence_received: data.correspondenceReceived,
    correspondence_delivered: data.correspondenceDelivered,
  };
}

function throwIfCorrespondenceFailure(data: unknown, status = 400): void {
  if (!data || typeof data !== "object") return;
  const body = data as Record<string, unknown>;
  if (body.success !== false) return;

  throw axios.AxiosError.from(
    typeof body.message === "string"
      ? body.message
      : "Failed to save correspondence record",
    axios.AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    {
      data: body,
      status,
      statusText: "Bad Request",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    },
  );
}

function extractCorrespondencePeriodRows(raw: unknown): any[] {
  const data = unwrapApiData(raw);
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  const candidates = [
    obj.monthlyRecords,
    obj.monthly_records,
    obj.records,
    obj.months,
    obj.periods,
    obj.trend,
    obj.history,
    obj.data,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const list = unwrapList<any>(candidate);
    if (list.length > 0) return list;
  }

  if ("client" in obj || "contractor" in obj || "CLIENT" in obj) {
    return [obj];
  }

  return [];
}

export function mergeCorrespondencePeriods(
  periods: CorrespondenceMonthlyPeriod[],
): CorrespondenceMonthlyPeriod[] {
  const byKey = new Map<string, CorrespondenceMonthlyPeriod>();

  for (const period of periods) {
    if (!period.month || !period.year) continue;
    const key = `${period.year}-${period.month}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, period);
      continue;
    }
    byKey.set(key, {
      ...existing,
      client: hasPartyData(period.client) ? period.client : existing.client,
      contractor: hasPartyData(period.contractor)
        ? period.contractor
        : existing.contractor,
    });
  }

  return Array.from(byKey.values()).sort(
    (a, b) => a.month - b.month || a.year - b.year,
  );
}

function hasPartyData(party: CorrespondencePartyMetrics): boolean {
  return (
    party.correspondenceReceived > 0 ||
    party.correspondenceDelivered > 0 ||
    party.pendingCorrespondence > 0 ||
    party.deliveryEfficiency > 0
  );
}

export function normalizeCorrespondenceYearSummary(
  raw: unknown,
  projectName: string,
  year: number,
): CorrespondenceMonthlyPeriod[] {
  return mergeCorrespondencePeriods(
    extractCorrespondencePeriodRows(raw)
      .map((row) => {
        const period = normalizeCorrespondenceMonthlyPeriod(row, projectName);
        return { ...period, year: period.year || year };
      })
      .filter((p) => p.year === year),
  );
}

function periodFromMonthlyRecords(
  records: CorrespondenceMonthlyRecord[],
  month: number,
  year: number,
  projectName: string,
): CorrespondenceMonthlyPeriod {
  const clientRecord = records.find(
    (r) =>
      r.month === month && r.year === year && r.correspondenceType === "CLIENT",
  );
  const contractorRecord = records.find(
    (r) =>
      r.month === month &&
      r.year === year &&
      r.correspondenceType === "CONTRACTOR",
  );

  const partyFromRecord = (
    record?: CorrespondenceMonthlyRecord,
  ): CorrespondencePartyMetrics =>
    record
      ? {
        correspondenceReceived: record.correspondenceReceived,
        correspondenceDelivered: record.correspondenceDelivered,
        correspondenceRecord: record.correspondenceRecord,
        onTimeDelivered: record.onTimeDelivered,
        lateDeliveries: record.lateDeliveries,
        pendingCorrespondence: record.pendingCorrespondence,
        deliveryEfficiency: record.deliveryEfficiency,
      }
      : emptyCorrespondenceParty();

  return {
    projectName,
    month,
    year,
    client: partyFromRecord(clientRecord),
    contractor: partyFromRecord(contractorRecord),
  };
}

export async function fetchCorrespondenceYearPeriods(
  projectName: string,
  year: number,
): Promise<CorrespondenceMonthlyPeriod[]> {
  try {
    const listRes = await correspondenceApi.getAll({
      project_name: projectName,
    });
    throwIfCorrespondenceFailure(listRes.data, listRes.status);
    const records = unwrapList<any>(unwrapApiData(listRes.data) ?? listRes.data)
      .filter(
        (row) =>
          !isCorrespondenceDocumentRow(row) &&
          !isCorrespondenceMonthlyAggregateRow(row),
      )
      .map((row) => normalizeCorrespondenceMonthlyRecord(row, projectName));
    const months = new Set<number>();
    records.filter((r) => r.year === year).forEach((r) => months.add(r.month));
    return mergeCorrespondencePeriods(
      Array.from(months).map((month) =>
        periodFromMonthlyRecords(records, month, year, projectName),
      ),
    );
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      console.warn("[Correspondence] List fetch for trend failed:", error);
    }
    return [];
  }
}

export const correspondenceApi = {
  getAll: (params?: {
    project_name?: string;
    projectName?: string;
    month?: number;
    year?: number;
    page?: number;
    page_size?: number;
  }) =>
    api.get(API_ENDPOINTS.CORRESPONDENCE.LIST, {
      params: {
        ...(params?.project_name ? { project_name: params.project_name } : {}),
        ...(params?.projectName ? { project_name: params.projectName } : {}),
        ...(params?.month ? { month: params.month } : {}),
        ...(params?.year ? { year: params.year } : {}),
        ...(params?.page ? { page: params.page } : {}),
        ...(params?.page_size ? { page_size: params.page_size } : {}),
      },
    }),

  getById: (id: string | number) =>
    api.get(API_ENDPOINTS.CORRESPONDENCE.DETAIL(id)),

  getByProjectMonthYear: (projectName: string, month: number, year: number) =>
    api.get(
      API_ENDPOINTS.CORRESPONDENCE.BY_MONTH_YEAR(projectName, month, year),
    ),

  getProjectSummary: (projectName: string) =>
    api.get(API_ENDPOINTS.CORRESPONDENCE.PROJECT_SUMMARY(projectName)),

  getYearSummary: (projectName: string, year: number) =>
    api.get(API_ENDPOINTS.CORRESPONDENCE.YEAR_SUMMARY(projectName, year)),

  create: (data: CorrespondenceCreatePayload) =>
    api.post(API_ENDPOINTS.CORRESPONDENCE.LIST, toCorrespondencePayload(data)),

  update: (id: string | number, data: CorrespondenceCreatePayload) =>
    api.put(
      API_ENDPOINTS.CORRESPONDENCE.DETAIL(id),
      toCorrespondencePayload(data),
    ),

  patch: (id: string | number, data: Partial<CorrespondenceCreatePayload>) =>
    api.patch(API_ENDPOINTS.CORRESPONDENCE.DETAIL(id), {
      ...(data.projectName !== undefined && { project_name: data.projectName }),
      ...(data.month !== undefined && { month: data.month }),
      ...(data.year !== undefined && { year: data.year }),
      ...(data.correspondenceType !== undefined && {
        correspondence_type: data.correspondenceType,
      }),
      ...(data.correspondenceReceived !== undefined && {
        correspondence_received: data.correspondenceReceived,
      }),
      ...(data.correspondenceDelivered !== undefined && {
        correspondence_delivered: data.correspondenceDelivered,
      }),
    }),

  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.CORRESPONDENCE.DETAIL(id)),

  createDocument: (data: CorrespondenceDocumentPayload) =>
    api.post(
      API_ENDPOINTS.CORRESPONDENCE.LIST,
      toCorrespondenceDocumentPayload(data),
    ),

  updateDocument: (id: string | number, data: CorrespondenceDocumentPayload) =>
    api.put(
      API_ENDPOINTS.CORRESPONDENCE.DETAIL(id),
      toCorrespondenceDocumentPayload(data),
    ),

  patchDocument: (id: string | number, data: CorrespondenceDocumentPayload) =>
    api.patch(
      API_ENDPOINTS.CORRESPONDENCE.DETAIL(id),
      toCorrespondenceDocumentPayload(data),
    ),

  /** @deprecated Use getByProjectMonthYear */
  getByProject: (projectName: string) =>
    api.get(API_ENDPOINTS.CORRESPONDENCE.PROJECT(projectName)),
};

export function findCorrespondenceRecordByPeriod(
  records: CorrespondenceMonthlyRecord[] | null | undefined,
  month: number,
  year: number,
  type: CorrespondenceType,
): CorrespondenceMonthlyRecord | null {
  return (
    records?.find(
      (row) =>
        toNum(row.month) === toNum(month) &&
        toNum(row.year) === toNum(year) &&
        row.correspondenceType === type,
    ) ?? null
  );
}

async function listCorrespondenceRecordsForProject(
  projectName: string,
): Promise<CorrespondenceMonthlyRecord[]> {
  const response = await correspondenceApi.getAll({
    project_name: projectName,
  });
  throwIfCorrespondenceFailure(response.data, response.status);
  return unwrapList<any>(response.data).map((row) =>
    normalizeCorrespondenceMonthlyRecord(row, projectName),
  );
}

export async function fetchCorrespondenceRecordByPeriod(
  projectName: string,
  month: number,
  year: number,
  type: CorrespondenceType,
): Promise<CorrespondenceMonthlyRecord | null> {
  try {
    const response = await correspondenceApi.getByProjectMonthYear(
      projectName,
      month,
      year,
    );
    throwIfCorrespondenceFailure(response.data, response.status);
    const period = normalizeCorrespondenceMonthlyPeriod(
      response.data?.data ?? response.data,
      projectName,
    );
    const party = type === "CONTRACTOR" ? period.contractor : period.client;
    if (hasPartyData(party)) {
      const fromList = await listCorrespondenceRecordsForProject(projectName);
      return findCorrespondenceRecordByPeriod(fromList, month, year, type);
    }
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    if (error.response?.status !== 404) {
      // fall through
    }
  }

  try {
    const records = await listCorrespondenceRecordsForProject(projectName);
    return findCorrespondenceRecordByPeriod(records, month, year, type);
  } catch {
    return null;
  }
}

function isDuplicateCorrespondenceError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const combined = getApiErrorMessage(error, "").toLowerCase();
  return combined.includes("already exists") || combined.includes("unique");
}

async function updateCorrespondenceRecord(
  id: string | number,
  payload: CorrespondenceCreatePayload,
): Promise<CorrespondenceMonthlyRecord> {
  try {
    const response = await correspondenceApi.update(id, payload);
    throwIfCorrespondenceFailure(response.data, response.status);
    return normalizeCorrespondenceMonthlyRecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const response = await correspondenceApi.patch(id, payload);
    throwIfCorrespondenceFailure(response.data, response.status);
    return normalizeCorrespondenceMonthlyRecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  }
}

export async function saveCorrespondenceRecord(
  payload: CorrespondenceCreatePayload,
  options?: {
    record?: CorrespondenceMonthlyRecord | null;
    knownRecords?: CorrespondenceMonthlyRecord[];
  },
): Promise<CorrespondenceMonthlyRecord> {
  const fromKnown = findCorrespondenceRecordByPeriod(
    options?.knownRecords,
    payload.month,
    payload.year,
    payload.correspondenceType,
  );
  const existing = fromKnown?.id
    ? fromKnown
    : options?.record?.id &&
      options.record.month === payload.month &&
      options.record.year === payload.year &&
      options.record.correspondenceType === payload.correspondenceType
      ? options.record
      : await fetchCorrespondenceRecordByPeriod(
        payload.projectName,
        payload.month,
        payload.year,
        payload.correspondenceType,
      );

  if (existing?.id) {
    return updateCorrespondenceRecord(existing.id, payload);
  }

  try {
    const response = await correspondenceApi.create(payload);
    throwIfCorrespondenceFailure(response.data, response.status);
    return normalizeCorrespondenceMonthlyRecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  } catch (error) {
    if (!isDuplicateCorrespondenceError(error)) throw error;
    const fetched = await fetchCorrespondenceRecordByPeriod(
      payload.projectName,
      payload.month,
      payload.year,
      payload.correspondenceType,
    );
    if (!fetched?.id) throw error;
    return updateCorrespondenceRecord(fetched.id, payload);
  }
}

async function updateCorrespondenceDocument(
  id: string | number,
  payload: CorrespondenceDocumentPayload,
): Promise<CorrespondenceDocument> {
  try {
    const response = await correspondenceApi.updateDocument(id, payload);
    throwIfCorrespondenceFailure(response.data, response.status);
    return normalizeCorrespondenceDocument(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const response = await correspondenceApi.patchDocument(id, payload);
    throwIfCorrespondenceFailure(response.data, response.status);
    return normalizeCorrespondenceDocument(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  }
}

export async function saveCorrespondenceDocument(
  payload: CorrespondenceDocumentPayload,
  options?: { document?: CorrespondenceDocument | null },
): Promise<CorrespondenceDocument> {
  if (options?.document?.id) {
    return updateCorrespondenceDocument(options.document.id, payload);
  }

  const response = await correspondenceApi.createDocument(payload);
  throwIfCorrespondenceFailure(response.data, response.status);
  return normalizeCorrespondenceDocument(
    response.data?.data ?? response.data,
    payload.projectName,
  );
}

export async function deleteCorrespondenceDocument(
  id: string | number,
): Promise<void> {
  const response = await correspondenceApi.delete(id);
  throwIfCorrespondenceFailure(response.data, response.status);
}

// ─── Correspondence Documents Dashboard API ────────────────────────────────

export interface CorrespondenceDashboardParty {
  received: number;
  delivered: number;
  record: number;
  pending: number;
  on_time: number;
  late_deliveries: number;
  delivery_efficiency: number;
  status_breakdown: {
    on_time: number;
    late_deliveries: number;
    pending: number;
  };
  correspondence_received: number;
  correspondence_delivered: number;
  pending_correspondence: number;
}

export interface CorrespondenceSclPartyCounts {
  received: number;
  delivered: number;
  record: number;
  pending: number;
}

export interface CorrespondenceSclDelivered {
  client: CorrespondenceSclPartyCounts;
  contractor: CorrespondenceSclPartyCounts;
  other_agency: CorrespondenceSclPartyCounts;
  totals: CorrespondenceSclPartyCounts;
  client_delivered?: number;
  contractor_delivered?: number;
  other_agency_delivered?: number;
  total?: number;
}

export interface CorrespondenceSclDeliveredRecord {
  id?: number;
  project_name: string;
  month: number;
  year: number;
  view: "monthly" | "cumulative";
  scl_delivered_correspondence: CorrespondenceSclDelivered;
}

export type CorrespondenceSclDeliveredSavePayload = {
  project_name: string;
  month: number;
  year: number;
  view: "monthly" | "cumulative";
  client_received: number;
  client_delivered: number;
  contractor_received: number;
  contractor_delivered: number;
  other_agency_received: number;
  other_agency_delivered: number;
};

export type CorrespondenceDashboardSavePayload = {
  project_name: string;
  month: number;
  year: number;
  view: "monthly" | "cumulative";
  client_received: number;
  client_delivered: number;
  contractor_received: number;
  contractor_delivered: number;
};

const EMPTY_SCL_PARTY: CorrespondenceSclPartyCounts = {
  received: 0,
  delivered: 0,
  record: 0,
  pending: 0,
};

function normalizeSclPartyCounts(row: unknown): CorrespondenceSclPartyCounts {
  if (row && typeof row === "object") {
    const party = row as Record<string, unknown>;
    return {
      received: toNum(party.received),
      delivered: toNum(party.delivered),
      record: toNum(party.record),
      pending: toNum(party.pending),
    };
  }
  const delivered = toNum(row);
  return { received: delivered, delivered, record: 0, pending: 0 };
}

export interface CorrespondenceDashboardDocument {
  id: number;
  project_name: string;
  month: number;
  year: number;
  correspondence_type: string;
  correspondence_category?: string;
  flow_direction: string;
  sender: string;
  recipient_type: string | null;
  sr_no: number;
  description: string;
  received_date: string;
  delivered_date: string | null;
  delivered_status: string;
  deadline_date: string | null;
}

export interface CorrespondenceDashboardResponse {
  view: "monthly" | "cumulative";
  from_date: string;
  to_date: string;
  project_name: string;
  month: number;
  year: number;
  client: CorrespondenceDashboardParty;
  contractor: CorrespondenceDashboardParty;
  scl_delivered_correspondence: CorrespondenceSclDelivered;
  recent_documents: CorrespondenceDashboardDocument[];
}

/** Map dashboard party payload (received/delivered/pending shorthand) to UI metrics. */
export function normalizeCorrespondenceDashboardParty(
  row: CorrespondenceDashboardParty | null | undefined,
): CorrespondencePartyMetrics {
  if (!row) {
    return {
      correspondenceReceived: 0,
      correspondenceDelivered: 0,
      correspondenceRecord: 0,
      onTimeDelivered: 0,
      lateDeliveries: 0,
      pendingCorrespondence: 0,
      deliveryEfficiency: 0,
    };
  }

  const statusBreakdown = row.status_breakdown;

  return normalizeCorrespondenceParty({
    correspondence_received: row.correspondence_received ?? row.received,
    correspondence_delivered: row.correspondence_delivered ?? row.delivered,
    record: row.record,
    pending_correspondence:
      row.pending_correspondence ?? row.pending ?? statusBreakdown?.pending,
    on_time_delivered: row.on_time ?? statusBreakdown?.on_time,
    late_deliveries: row.late_deliveries ?? statusBreakdown?.late_deliveries,
    delivery_efficiency: row.delivery_efficiency,
  });
}

export function emptyCorrespondenceSclDelivered(): CorrespondenceSclDelivered {
  return {
    client: { ...EMPTY_SCL_PARTY },
    contractor: { ...EMPTY_SCL_PARTY },
    other_agency: { ...EMPTY_SCL_PARTY },
    totals: { ...EMPTY_SCL_PARTY },
  };
}

export function normalizeCorrespondenceSclDelivered(
  row: CorrespondenceSclDelivered | null | undefined,
): CorrespondenceSclDelivered {
  if (!row) return emptyCorrespondenceSclDelivered();

  const client = normalizeSclPartyCounts(row.client);
  const contractor = normalizeSclPartyCounts(row.contractor);
  const other_agency = normalizeSclPartyCounts(row.other_agency);
  const totals = row.totals
    ? normalizeSclPartyCounts(row.totals)
    : {
      received: client.received + contractor.received + other_agency.received,
      delivered:
        client.delivered + contractor.delivered + other_agency.delivered,
      record: client.record + contractor.record + other_agency.record,
      pending: client.pending + contractor.pending + other_agency.pending,
    };

  return {
    client,
    contractor,
    other_agency,
    totals,
    client_delivered: toNum(row.client_delivered ?? client.delivered),
    contractor_delivered: toNum(
      row.contractor_delivered ?? contractor.delivered,
    ),
    other_agency_delivered: toNum(
      row.other_agency_delivered ?? other_agency.delivered,
    ),
    total: toNum(row.total ?? totals.delivered),
  };
}

export function unwrapCorrespondenceSclDeliveredResponse(
  payload: unknown,
): CorrespondenceSclDelivered {
  const body = (payload as { data?: unknown })?.data ?? payload;
  const record = body as CorrespondenceSclDeliveredRecord | CorrespondenceSclDelivered;
  if (record && typeof record === "object" && "scl_delivered_correspondence" in record) {
    return normalizeCorrespondenceSclDelivered(record.scl_delivered_correspondence);
  }
  return normalizeCorrespondenceSclDelivered(record as CorrespondenceSclDelivered);
}

export const correspondenceDocumentsApi = {
  getDashboard: (params: {
    project_name: string;
    month: number;
    year: number;
    view?: "monthly" | "cumulative";
  }) =>
    api.get<{ success: boolean; data: CorrespondenceDashboardResponse }>(
      API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.DASHBOARD,
      { params },
    ),

  getSclDelivered: (params: {
    project_name: string;
    month: number;
    year: number;
    view?: "monthly" | "cumulative";
  }) =>
    api.get<{ success: boolean; data: CorrespondenceSclDeliveredRecord }>(
      API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.SCL_DELIVERED,
      { params },
    ),

  saveSclDelivered: (data: CorrespondenceSclDeliveredSavePayload) =>
    api.post(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.SCL_DELIVERED, data),

  saveDashboard: (data: CorrespondenceDashboardSavePayload) =>
    api.post(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.DASHBOARD, data),

  getAll: (params?: {
    project_name?: string;
    month?: number;
    year?: number;
    page?: number;
    page_size?: number;
  }) => api.get(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.LIST, { params }),

  getById: (id: string | number) =>
    api.get(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.DETAIL(id)),

  create: (data: Record<string, unknown>) =>
    api.post(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.LIST, data),

  update: (id: string | number, data: Record<string, unknown>) =>
    api.put(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.DETAIL(id), data),

  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.CORRESPONDENCE_DOCUMENTS.DETAIL(id)),
};

// Machinery master catalog
export type MachineryMasterCreatePayload = {
  name: string;
  unit: string;
  category: string;
};

export function normalizeMachineryMaster(row: unknown): MachineryMaster | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = r.id ?? r.pk;
  if (id === undefined || id === null) return null;
  const name = String(
    r.machinery_name ?? r.machineryName ?? r.name ?? r.particular ?? "",
  ).trim();
  if (!name) return null;
  return {
    id: id as string | number,
    name,
    unit: String(r.unit ?? "No").trim() || "No",
    category:
      String(r.category ?? r.machinery_category ?? "").trim() || "General",
  };
}

export function normalizeMachineryMasterList(raw: unknown): MachineryMaster[] {
  const rows = unwrapList(raw);
  const fromNested = unwrapList(unwrapApiData(raw));
  const combined = rows.length > 0 ? rows : fromNested;
  return combined
    .map((row) => normalizeMachineryMaster(row))
    .filter((row): row is MachineryMaster => row != null);
}

export const machineryMasterApi = {
  getAll: (params?: { search?: string; page?: number; page_size?: number }) =>
    api.get(API_ENDPOINTS.MACHINERY_MASTER.LIST, { params }),

  create: (data: MachineryMasterCreatePayload) =>
    api.post(API_ENDPOINTS.MACHINERY_MASTER.CREATE, {
      machinery_name: data.name,
      name: data.name,
      unit: data.unit,
      category: data.category,
    }),

  getById: (id: string | number) =>
    api.get(API_ENDPOINTS.MACHINERY_MASTER.DETAIL(id)),
};

// Plant & Machinery Inventory API (no auth required)
export const plantMachineryApi = {
  // List reports (supports ?project_name=...&report_date=...&search=...&ordering=-report_date etc.)
  getReports: (params?: {
    search?: string;
    project_name?: string;
    report_date?: string;
    report_date_gte?: string;
    report_date_lte?: string;
    status?: string;
    role?: string;
    ordering?: string;
    page?: number;
  }) => api.get(API_ENDPOINTS.PLANT_MACHINERY.LIST, { params }),

  getReport: (id: string | number) =>
    api.get(API_ENDPOINTS.PLANT_MACHINERY.DETAIL(id)),

  // Create report with optional nested machinery_items: [{sr_no, particular, unit, qty, remark, status?}, ...]
  createReport: (data: {
    project_name: string;
    report_date: string;
    created_by?: string;
    machinery_items: Array<{
      sr_no: number;
      particular: string;
      unit: string;
      qty?: number;
      remark?: string;
      status?: "Working" | "Under Maintenance" | "Not Available";
    }>;
  }) => api.post(API_ENDPOINTS.PLANT_MACHINERY.CREATE, data),

  updateReport: (id: string | number, data: any) =>
    api.put(API_ENDPOINTS.PLANT_MACHINERY.UPDATE(id), data),
  patchReport: (id: string | number, data: any) =>
    api.patch(API_ENDPOINTS.PLANT_MACHINERY.PATCH(id), data),
  deleteReport: (id: string | number) =>
    api.delete(API_ENDPOINTS.PLANT_MACHINERY.DELETE(id)),

  // Standalone items
  getItems: (params?: any) =>
    api.get(API_ENDPOINTS.PLANT_MACHINERY.ITEMS_LIST, { params }),
  getItem: (id: string | number) =>
    api.get(API_ENDPOINTS.PLANT_MACHINERY.ITEM_DETAIL(id)),
  updateItem: (id: string | number, data: any) =>
    api.put(API_ENDPOINTS.PLANT_MACHINERY.ITEM_DETAIL(id), data),
  patchItem: (id: string | number, data: any) =>
    api.patch(API_ENDPOINTS.PLANT_MACHINERY.ITEM_DETAIL(id), data),
  deleteItem: (id: string | number) =>
    api.delete(API_ENDPOINTS.PLANT_MACHINERY.ITEM_DETAIL(id)),
};

export function normalizeSiteImageRecord(
  row: unknown,
  fallbackProject = "",
): SiteImageRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const rawId = r.id;
  if (rawId === undefined || rawId === null) return null;
  if (typeof rawId !== "string" && typeof rawId !== "number") return null;
  const id = rawId;

  const imageUrl =
    (typeof r.image_url === "string" && r.image_url) ||
    (typeof r.imageUrl === "string" && r.imageUrl) ||
    (typeof r.url === "string" && r.url) ||
    (typeof r.secure_url === "string" && r.secure_url) ||
    (typeof r.image === "string" && r.image) ||
    "";

  if (!imageUrl) return null;

  const thumbnail =
    (typeof r.thumbnail_url === "string" && r.thumbnail_url) ||
    (typeof r.thumbnailUrl === "string" && r.thumbnailUrl) ||
    (typeof r.thumbnail === "string" && r.thumbnail) ||
    undefined;

  const uploadedAt =
    (typeof r.uploaded_at === "string" && r.uploaded_at) ||
    (typeof r.uploadedAt === "string" && r.uploadedAt) ||
    (typeof r.created_at === "string" && r.created_at) ||
    (typeof r.createdAt === "string" && r.createdAt) ||
    (typeof r.upload_date === "string" && r.upload_date) ||
    "";

  const uploadedBy =
    (typeof r.uploaded_by === "string" && r.uploaded_by) ||
    (typeof r.uploadedBy === "string" && r.uploadedBy) ||
    (typeof r.user_name === "string" && r.user_name) ||
    (typeof r.uploaded_by_name === "string" && r.uploaded_by_name) ||
    undefined;

  return {
    id,
    projectName:
      (typeof r.project_name === "string" && r.project_name) ||
      (typeof r.projectName === "string" && r.projectName) ||
      fallbackProject,
    month: toNum(r.month) || 1,
    year: toNum(r.year) || new Date().getFullYear(),
    imageUrl,
    thumbnailUrl: thumbnail,
    uploadedAt,
    uploadedBy,
  };
}

export function normalizeSiteImageList(
  data: unknown,
  fallbackProject = "",
): SiteImageRecord[] {
  return unwrapList<unknown>(data)
    .map((row) => normalizeSiteImageRecord(row, fallbackProject))
    .filter((row): row is SiteImageRecord => Boolean(row));
}

export type SiteImageUploadPayload = {
  project_name: string;
  month: number;
  year: number;
  images: File[];
};

export const siteImagesApi = {
  getByProjectMonthYear: (projectName: string, month: number, year: number) =>
    api.get(
      API_ENDPOINTS.SITE_IMAGES.BY_PROJECT_MONTH_YEAR(projectName, month, year),
    ),

  upload: (
    payload: SiteImageUploadPayload,
    onUploadProgress?: (percent: number) => void,
  ) => {
    const formData = new FormData();
    formData.append("project_name", payload.project_name);
    formData.append("month", String(payload.month));
    formData.append("year", String(payload.year));
    payload.images.forEach((file) => {
      formData.append("images[]", file);
    });

    return api.post(API_ENDPOINTS.SITE_IMAGES.CREATE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
  },

  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.SITE_IMAGES.DELETE(id)),
};

/** Cashflow API — retained for Dashboard / Site Engineer; Financial Management tab removed (re-enable in FM when needed) */
export const cashflowApi = {
  getCashflow: (params?: { project_name?: string }) =>
    api.get(API_ENDPOINTS.CASHFLOW.LIST, { params }),
  getCashflowDetail: (id: string | number) =>
    api.get(API_ENDPOINTS.CASHFLOW.DETAIL(id)),
  createCashflow: (data: any) => api.post(API_ENDPOINTS.CASHFLOW.CREATE, data),
  updateCashflow: (id: string | number, data: any) =>
    api.put(API_ENDPOINTS.CASHFLOW.UPDATE(id), data),
  patchCashflow: (id: string | number, data: any) =>
    api.patch(API_ENDPOINTS.CASHFLOW.UPDATE(id), data),
  deleteCashflow: (id: string | number) =>
    api.delete(API_ENDPOINTS.CASHFLOW.DELETE(id)),
};

export type ContractValuePayload = Pick<
  ContractValueRecord,
  | "projectName"
  | "contractType"
  | "originalContractValue"
  | "approvedVO"
  | "potentialPendingVO"
  | "contractorName"
  | "contractorId"
>;

export function normalizeContractValueRecord(
  row: any,
  projectName: string,
  contractType: ContractValueType,
): ContractValueRecord {
  const originalContractValue = toNum(
    row?.originalContractValue ?? row?.original_contract_value,
  );
  const approvedVO = toNum(
    row?.excess_value ??
    row?.excessValue ??
    row?.approvedVO ??
    row?.approved_vo,
  );
  const potentialPendingVO = toNum(
    row?.saving ?? row?.potentialPendingVO ?? row?.pending_vo,
  );
  const revisedContractValue = toNum(
    row?.revised_value ??
    row?.revisedValue ??
    row?.revisedContractValue ??
    row?.revised_contract_value,
  );
  const growthPercentage = toNum(
    row?.growth_percentage ??
    row?.growthPercentage ??
    row?.approved_vo_percentage ??
    row?.approvedVOPercentage,
  );

  return {
    id: row?.id,
    projectName: row?.projectName || row?.project_name || projectName,
    contractType: row?.contractType || row?.contract_type || contractType,
    contractorName:
      String(row?.contractor_name ?? row?.contractorName ?? '').trim() || undefined,
    contractorId:
      row?.contractor_id ?? row?.contractorId ?? row?.contractor?.id ?? undefined,
    originalContractValue,
    approvedVO,
    revisedContractValue,
    potentialPendingVO,
    growthPercentage,
    approvedVOPercentage: growthPercentage,
    status: row?.status,
  };
}

/** Write payload using API field names; revised value is computed server-side. */
export function toContractValueApiBody(
  data: ContractValuePayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    project_name: data.projectName,
    contract_type: data.contractType,
    original_contract_value: data.originalContractValue,
    excess_value: data.approvedVO,
    saving: data.potentialPendingVO,
    // Legacy aliases for backends still accepting camelCase
    projectName: data.projectName,
    contractType: data.contractType,
    originalContractValue: data.originalContractValue,
    approvedVO: data.approvedVO,
    potentialPendingVO: data.potentialPendingVO,
  };

  if (data.contractType === 'Contractor') {
    if (data.contractorId != null) body.contractor_id = data.contractorId;
    if (data.contractorName) body.contractor_name = data.contractorName;
  }

  return body;
}

// Contract Values API: one endpoint serves each project/type pair.
export const contractValuesApi = {
  getContractValues: (params?: {
    projectName?: string;
    contractType?: ContractValueType;
    contractorName?: string;
    contractorId?: number;
  }) =>
    api.get(API_ENDPOINTS.CONTRACT_VALUES.LIST, {
      params: params
        ? {
          ...(params.projectName !== undefined && {
            project_name: params.projectName,
          }),
          ...(params.contractType !== undefined && {
            contract_type: params.contractType,
          }),
          ...(params.contractorName !== undefined && {
            contractor_name: params.contractorName,
          }),
          ...(params.contractorId !== undefined && {
            contractor_id: params.contractorId,
          }),
        }
        : undefined,
    }),
  getContractValue: (id: string | number) =>
    api.get(API_ENDPOINTS.CONTRACT_VALUES.DETAIL(id)),
  createContractValue: (data: ContractValuePayload) =>
    api.post(API_ENDPOINTS.CONTRACT_VALUES.LIST, toContractValueApiBody(data)),
  updateContractValue: (id: string | number, data: ContractValuePayload) =>
    api.put(
      API_ENDPOINTS.CONTRACT_VALUES.DETAIL(id),
      toContractValueApiBody(data),
    ),
  patchContractValue: (
    id: string | number,
    data: Partial<ContractValuePayload>,
  ) =>
    api.patch(
      API_ENDPOINTS.CONTRACT_VALUES.PATCH(id),
      toContractValueApiBody(data as ContractValuePayload),
    ),
  deleteContractValue: (id: string | number) =>
    api.delete(API_ENDPOINTS.CONTRACT_VALUES.DETAIL(id)),
};

export type InvoicingPayload = Pick<
  InvoicingRecord,
  | "projectName"
  | "invoiceType"
  | "grossBilled"
  | "netBilledWithoutVAT"
  | "contractorName"
  | "contractorId"
>;

export function normalizeInvoicingRecord(
  row: any,
  projectName: string,
  invoiceType: InvoiceType,
): InvoicingRecord {
  const grossBilled = toNum(row?.grossBilled ?? row?.gross_billed);
  const netBilledWithoutVAT = toNum(
    row?.gross_certified_billed ??
    row?.grossCertifiedBilled ??
    row?.netBilledWithoutVAT ??
    row?.net_billed_without_vat ??
    row?.net_billed,
  );
  const netCollected = toNum(
    row?.difference ?? row?.netCollected ?? row?.net_collected,
  );
  const certificationEfficiency = toNum(
    row?.certification_efficiency ??
    row?.certificationEfficiency ??
    row?.collection_percentage ??
    row?.collectionPercentage,
  );
  const rawNetDue = row?.netDue ?? row?.net_due;

  return {
    id: row?.id,
    projectName: row?.projectName || row?.project_name || projectName,
    invoiceType: row?.invoiceType || row?.invoice_type || invoiceType,
    contractorName:
      String(row?.contractor_name ?? row?.contractorName ?? '').trim() || undefined,
    contractorId:
      row?.contractor_id ?? row?.contractorId ?? row?.contractor?.id ?? undefined,
    grossBilled,
    netBilledWithoutVAT,
    netCollected,
    collectionPercentage: certificationEfficiency,
    netDue:
      rawNetDue === undefined || rawNetDue === null
        ? undefined
        : toNum(rawNetDue),
  };
}

export function toInvoicingApiBody(
  data: InvoicingPayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    project_name: data.projectName,
    invoice_type: data.invoiceType,
    gross_billed: data.grossBilled,
    gross_certified_billed: data.netBilledWithoutVAT,
    projectName: data.projectName,
    invoiceType: data.invoiceType,
    grossBilled: data.grossBilled,
    netBilledWithoutVAT: data.netBilledWithoutVAT,
  };

  if (data.invoiceType === 'Contractor') {
    if (data.contractorId != null) body.contractor_id = data.contractorId;
    if (data.contractorName) body.contractor_name = data.contractorName;
  }

  return body;
}

// Invoicing API: one endpoint serves each project/type pair.
export const invoicingApi = {
  getInvoicing: (params?: {
    projectName?: string;
    invoiceType?: InvoiceType;
    contractorName?: string;
    contractorId?: number;
  }) =>
    api.get(API_ENDPOINTS.INVOICING.LIST, {
      params: params
        ? {
          ...(params.projectName !== undefined && {
            project_name: params.projectName,
          }),
          ...(params.invoiceType !== undefined && {
            invoice_type: params.invoiceType,
          }),
          ...(params.contractorName !== undefined && {
            contractor_name: params.contractorName,
          }),
          ...(params.contractorId !== undefined && {
            contractor_id: params.contractorId,
          }),
        }
        : undefined,
    }),
  getInvoice: (id: string | number) =>
    api.get(API_ENDPOINTS.INVOICING.DETAIL(id)),
  createInvoicing: (data: InvoicingPayload) =>
    api.post(API_ENDPOINTS.INVOICING.LIST, toInvoicingApiBody(data)),
  updateInvoicing: (id: string | number, data: InvoicingPayload) =>
    api.put(API_ENDPOINTS.INVOICING.DETAIL(id), toInvoicingApiBody(data)),
  patchInvoicing: (id: string | number, data: Partial<InvoicingPayload>) =>
    api.patch(
      API_ENDPOINTS.INVOICING.PATCH(id),
      toInvoicingApiBody(data as InvoicingPayload),
    ),
  deleteInvoicing: (id: string | number) =>
    api.delete(API_ENDPOINTS.INVOICING.DETAIL(id)),
};

// Cost Performance API (no auth)
export const costPerformanceApi = {
  getCostPerformance: (params?: {
    project_name?: string;
    month_year?: string;
    role?: string;
    ordering?: string;
  }) => api.get(API_ENDPOINTS.COST_PERFORMANCE.LIST, { params }),
  getCostPerformanceDetail: (id: string | number) =>
    api.get(API_ENDPOINTS.COST_PERFORMANCE.DETAIL(id)),
  getCostPerformanceDashboard: (projectName: string) =>
    api.get(API_ENDPOINTS.COST_PERFORMANCE.DASHBOARD, {
      params: { project_name: projectName },
    }),
  getByProjectMonthYear: (projectName: string, month: number, year: number) =>
    api.get(
      API_ENDPOINTS.COST_PERFORMANCE.BY_MONTH_YEAR(projectName, month, year),
    ),
  createCostPerformance: (data: any) =>
    api.post(API_ENDPOINTS.COST_PERFORMANCE.LIST, data),
  /** Upsert when detail PUT/PATCH are unavailable — POST list with record id */
  upsertCostPerformance: (data: Record<string, unknown>) =>
    api.post(API_ENDPOINTS.COST_PERFORMANCE.LIST, data),
  updateCostPerformance: (id: string | number, data: any) =>
    api.put(API_ENDPOINTS.COST_PERFORMANCE.DETAIL(id), data),
  patchCostPerformance: (id: string | number, data: any) =>
    api.patch(API_ENDPOINTS.COST_PERFORMANCE.PATCH(id), data),
  updateByProjectMonthYear: (
    projectName: string,
    month: number,
    year: number,
    data: Record<string, unknown>,
  ) =>
    api.put(
      API_ENDPOINTS.COST_PERFORMANCE.BY_MONTH_YEAR(projectName, month, year),
      data,
    ),
  patchByProjectMonthYear: (
    projectName: string,
    month: number,
    year: number,
    data: Record<string, unknown>,
  ) =>
    api.patch(
      API_ENDPOINTS.COST_PERFORMANCE.BY_MONTH_YEAR(projectName, month, year),
      data,
    ),
};

export type ContractPerformancePayload = Pick<
  ContractPerformanceRecord,
  "billedValue" | "actualReceiptValue"
> & {
  project_name: string;
  role?: string;
  created_by?: string;
};

export function calculateContractPerformance(
  billedValue: number,
  actualReceiptValue: number,
): Pick<
  ContractPerformanceRecord,
  "variance" | "performancePercentage" | "variancePercentage"
> {
  const variance = billedValue - actualReceiptValue;
  return {
    variance,
    performancePercentage:
      billedValue > 0 ? (actualReceiptValue / billedValue) * 100 : 0,
    variancePercentage: billedValue > 0 ? (variance / billedValue) * 100 : 0,
  };
}

export function normalizeContractPerformanceRecord(
  row: any,
): ContractPerformanceRecord {
  const billedValue = toNum(row?.billedValue ?? row?.billed_value);
  const actualReceiptValue = toNum(
    row?.actualReceiptValue ?? row?.actual_receipt_value,
  );
  return {
    id: row?.id,
    projectName: row?.projectName ?? row?.project_name,
    billedValue,
    actualReceiptValue,
    ...calculateContractPerformance(billedValue, actualReceiptValue),
  };
}

// Contract Performance API (no auth)
export const contractPerformanceApi = {
  getContractPerformance: (params?: { project_name?: string; role?: string }) =>
    api.get(API_ENDPOINTS.CONTRACT_PERFORMANCE.LIST, { params }),
  getContractPerformanceDetail: (id: string | number) =>
    api.get(API_ENDPOINTS.CONTRACT_PERFORMANCE.DETAIL(id)),
  createContractPerformance: (data: ContractPerformancePayload) =>
    api.post(API_ENDPOINTS.CONTRACT_PERFORMANCE.LIST, data),
  updateContractPerformance: (
    id: string | number,
    data: ContractPerformancePayload,
  ) => api.put(API_ENDPOINTS.CONTRACT_PERFORMANCE.DETAIL(id), data),
  patchContractPerformance: (
    id: string | number,
    data: Partial<ContractPerformancePayload>,
  ) => api.patch(API_ENDPOINTS.CONTRACT_PERFORMANCE.PATCH(id), data),
  deleteContractPerformance: (id: string | number) =>
    api.delete(API_ENDPOINTS.CONTRACT_PERFORMANCE.DETAIL(id)),
};

export type ProjectQualityCreatePayload = Pick<
  ProjectQualityStatusRecord,
  | "projectName"
  | "month"
  | "year"
  | "testsRequired"
  | "testsConducted"
  | "testsPassed"
  | "testsFailed"
>;

export function normalizeProjectQualityStatusRecord(
  row: any,
  projectName = "",
): ProjectQualityStatusRecord {
  const testsRequired = toNum(row?.testsRequired ?? row?.tests_required);
  const testsConducted = toNum(
    row?.testsConducted ??
    row?.tests_conducted ??
    row?.total_tests_conducted ??
    row?.totalTestsConducted,
  );
  const testsPassed = toNum(
    row?.testsPassed ??
    row?.tests_passed ??
    row?.total_tests_passed ??
    row?.totalTestsPassed,
  );
  const testsFailed = toNum(row?.testsFailed ?? row?.tests_failed);
  const shortfallRaw = row?.shortfall;
  const shortfall =
    shortfallRaw != null && shortfallRaw !== ""
      ? toNum(shortfallRaw)
      : Math.max(0, testsRequired - testsConducted);

  const qualityPerformance = toNum(
    row?.qualityPerformance ??
    row?.quality_performance ??
    row?.performancePercentage ??
    row?.performance_percentage,
  );

  return {
    id: row?.id,
    projectName: row?.projectName ?? row?.project_name ?? projectName,
    month: toNum(row?.month) || new Date().getMonth() + 1,
    year: toNum(row?.year) || new Date().getFullYear(),
    testsRequired,
    testsConducted,
    shortfall,
    testsPassed,
    testsFailed: testsFailed || Math.max(0, testsConducted - testsPassed),
    qualityPerformance:
      qualityPerformance ||
      (testsConducted > 0 ? (testsPassed / testsConducted) * 100 : 0),
  };
}

function toProjectQualityPayload(data: ProjectQualityCreatePayload) {
  return {
    project_name: data.projectName,
    month: data.month,
    year: data.year,
    tests_required: data.testsRequired,
    tests_conducted: data.testsConducted,
    tests_passed: data.testsPassed,
    tests_failed: data.testsFailed,
  };
}

function unwrapQualityRow(
  data: unknown,
  projectName = "",
): ProjectQualityStatusRecord | null {
  if (!data) return null;
  const unwrapped = unwrapApiData(data);
  if (Array.isArray(unwrapped)) {
    return unwrapped.length > 0
      ? normalizeProjectQualityStatusRecord(unwrapped[0], projectName)
      : null;
  }
  if (unwrapped && typeof unwrapped === "object") {
    const obj = unwrapped as Record<string, unknown>;
    if (obj.success === false) return null;
    return normalizeProjectQualityStatusRecord(unwrapped, projectName);
  }
  return null;
}

function throwIfQualityFailure(data: unknown, status = 400): void {
  if (!data || typeof data !== "object") return;
  const body = data as Record<string, unknown>;
  if (body.success !== false) return;

  throw axios.AxiosError.from(
    typeof body.message === "string"
      ? body.message
      : "Failed to save quality record",
    axios.AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    {
      data: body,
      status,
      statusText: "Bad Request",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    },
  );
}

function extractQualityMonthlyRows(raw: unknown): any[] {
  const data = unwrapApiData(raw);
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  const candidates = [
    obj.monthlyRecords,
    obj.monthly_records,
    obj.records,
    obj.months,
    obj.monthly,
    obj.monthlyData,
    obj.monthly_data,
    obj.monthly_breakdown,
    obj.trend,
    obj.trend_data,
    obj.history,
    obj.summary,
    obj.data,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const list = unwrapList<any>(candidate);
    if (list.length > 0) return list;

    if (typeof candidate === "object" && !Array.isArray(candidate)) {
      const monthKeyed: any[] = [];
      for (const [key, value] of Object.entries(
        candidate as Record<string, unknown>,
      )) {
        const monthNum = Number(key);
        if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12)
          continue;
        if (!value || typeof value !== "object") continue;
        monthKeyed.push({
          ...(value as Record<string, unknown>),
          month: monthNum,
        });
      }
      if (monthKeyed.length > 0) return monthKeyed;
    }
  }

  if (
    "month" in obj ||
    "tests_required" in obj ||
    "testsRequired" in obj ||
    "tests_conducted" in obj
  ) {
    return [obj];
  }

  return [];
}

export function mergeQualityRecordsByPeriod(
  records: ProjectQualityStatusRecord[],
): ProjectQualityStatusRecord[] {
  const byPeriod = new Map<string, ProjectQualityStatusRecord>();
  for (const record of records) {
    if (!record.month) continue;
    const key = `${record.year}-${record.month}`;
    byPeriod.set(key, record);
  }
  return Array.from(byPeriod.values()).sort(
    (a, b) => a.month - b.month || a.year - b.year,
  );
}

export function normalizeQualityYearSummary(
  raw: unknown,
  projectName: string,
  year: number,
): ProjectQualityStatusRecord[] {
  const rows = extractQualityMonthlyRows(raw);
  return mergeQualityRecordsByPeriod(
    rows
      .map((row) => {
        const normalized = normalizeProjectQualityStatusRecord(
          row,
          projectName,
        );
        return { ...normalized, year: normalized.year || year };
      })
      .filter((row) => row.month >= 1 && row.month <= 12 && row.year === year),
  );
}

/** Year summary plus project list — all months with data for the overall trend chart. */
export async function fetchQualityYearRecords(
  projectName: string,
  year: number,
): Promise<ProjectQualityStatusRecord[]> {
  const collected: ProjectQualityStatusRecord[] = [];

  try {
    const summaryRes = await projectQualityApi.getYearSummary(
      projectName,
      year,
    );
    throwIfQualityFailure(summaryRes.data, summaryRes.status);
    collected.push(
      ...normalizeQualityYearSummary(
        summaryRes.data?.data ?? summaryRes.data,
        projectName,
        year,
      ),
    );
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      console.warn("[Quality] Year summary fetch failed:", error);
    }
  }

  try {
    const listRes = await projectQualityApi.getAll({
      project_name: projectName,
    });
    throwIfQualityFailure(listRes.data, listRes.status);
    const fromList = unwrapList<any>(listRes.data)
      .map((row) => normalizeProjectQualityStatusRecord(row, projectName))
      .filter(
        (row) => row.month >= 1 && row.month <= 12 && toNum(row.year) === year,
      );
    collected.push(...fromList);
  } catch (error) {
    console.warn("[Quality] List fetch for trend failed:", error);
  }

  return mergeQualityRecordsByPeriod(collected);
}

export const projectQualityApi = {
  getAll: (params?: {
    project_name?: string;
    page?: number;
    page_size?: number;
  }) => api.get(API_ENDPOINTS.PROJECT_QUALITY.LIST, { params }),

  getById: (id: string | number) =>
    api.get(API_ENDPOINTS.PROJECT_QUALITY.DETAIL(id)),

  getByProjectMonthYear: (projectName: string, month: number, year: number) =>
    api.get(
      API_ENDPOINTS.PROJECT_QUALITY.BY_MONTH_YEAR(projectName, month, year),
    ),

  getYearSummary: (projectName: string, year: number) =>
    api.get(API_ENDPOINTS.PROJECT_QUALITY.YEAR_SUMMARY(projectName, year)),

  create: (data: ProjectQualityCreatePayload) =>
    api.post(API_ENDPOINTS.PROJECT_QUALITY.LIST, toProjectQualityPayload(data)),

  update: (id: string | number, data: ProjectQualityCreatePayload) =>
    api.put(
      API_ENDPOINTS.PROJECT_QUALITY.DETAIL(id),
      toProjectQualityPayload(data),
    ),

  patch: (id: string | number, data: Partial<ProjectQualityCreatePayload>) =>
    api.patch(API_ENDPOINTS.PROJECT_QUALITY.DETAIL(id), {
      ...(data.projectName !== undefined && { project_name: data.projectName }),
      ...(data.month !== undefined && { month: data.month }),
      ...(data.year !== undefined && { year: data.year }),
      ...(data.testsRequired !== undefined && {
        tests_required: data.testsRequired,
      }),
      ...(data.testsConducted !== undefined && {
        tests_conducted: data.testsConducted,
      }),
      ...(data.testsPassed !== undefined && { tests_passed: data.testsPassed }),
      ...(data.testsFailed !== undefined && { tests_failed: data.testsFailed }),
    }),

  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.PROJECT_QUALITY.DETAIL(id)),
};

/** @deprecated Use projectQualityApi */
export const projectQualityStatusApi = projectQualityApi;

export function findQualityRecordByPeriod(
  records: ProjectQualityStatusRecord[] | null | undefined,
  month: number,
  year: number,
): ProjectQualityStatusRecord | null {
  return (
    records?.find(
      (row) =>
        toNum(row.month) === toNum(month) && toNum(row.year) === toNum(year),
    ) ?? null
  );
}

async function listQualityRecordsForProject(
  projectName: string,
): Promise<ProjectQualityStatusRecord[]> {
  const response = await projectQualityApi.getAll({
    project_name: projectName,
  });
  throwIfQualityFailure(response.data, response.status);
  return unwrapList<any>(response.data).map((row) =>
    normalizeProjectQualityStatusRecord(row, projectName),
  );
}

export async function fetchQualityRecordByPeriod(
  projectName: string,
  month: number,
  year: number,
): Promise<ProjectQualityStatusRecord | null> {
  try {
    const response = await projectQualityApi.getByProjectMonthYear(
      projectName,
      month,
      year,
    );
    throwIfQualityFailure(response.data, response.status);
    const record = unwrapQualityRow(response.data, projectName);
    if (record) return record;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) {
      if (axios.isAxiosError(error) && error.response?.status !== 404) {
        // fall through to list lookup
      } else if (!axios.isAxiosError(error)) {
        throw error;
      }
    }
  }

  try {
    const records = await listQualityRecordsForProject(projectName);
    return findQualityRecordByPeriod(records, month, year);
  } catch {
    return null;
  }
}

async function resolveQualityRecordForPeriod(
  projectName: string,
  month: number,
  year: number,
  options?: {
    record?: ProjectQualityStatusRecord | null;
    knownRecords?: ProjectQualityStatusRecord[];
  },
): Promise<ProjectQualityStatusRecord | null> {
  const fromKnown = findQualityRecordByPeriod(
    options?.knownRecords,
    month,
    year,
  );
  if (fromKnown?.id) return fromKnown;
  if (
    options?.record?.id &&
    options.record.month === month &&
    options.record.year === year
  ) {
    return options.record;
  }
  return fetchQualityRecordByPeriod(projectName, month, year);
}

function isDuplicateQualityError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response?.data) return false;
  const combined = getApiErrorMessage(error, "").toLowerCase();
  return combined.includes("already exists") || combined.includes("unique");
}

async function updateQualityRecord(
  id: string | number,
  payload: ProjectQualityCreatePayload,
): Promise<ProjectQualityStatusRecord> {
  try {
    const response = await projectQualityApi.update(id, payload);
    throwIfQualityFailure(response.data, response.status);
    return normalizeProjectQualityStatusRecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const response = await projectQualityApi.patch(id, payload);
    throwIfQualityFailure(response.data, response.status);
    return normalizeProjectQualityStatusRecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  }
}

export async function saveProjectQualityRecord(
  payload: ProjectQualityCreatePayload,
  options?: {
    record?: ProjectQualityStatusRecord | null;
    knownRecords?: ProjectQualityStatusRecord[];
  },
): Promise<ProjectQualityStatusRecord> {
  const existing = await resolveQualityRecordForPeriod(
    payload.projectName,
    payload.month,
    payload.year,
    options,
  );

  if (existing?.id) {
    return updateQualityRecord(existing.id, payload);
  }

  try {
    const response = await projectQualityApi.create(payload);
    throwIfQualityFailure(response.data, response.status);
    return normalizeProjectQualityStatusRecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  } catch (error) {
    if (!isDuplicateQualityError(error)) throw error;
    const fetched = await fetchQualityRecordByPeriod(
      payload.projectName,
      payload.month,
      payload.year,
    );
    if (!fetched?.id) throw error;
    return updateQualityRecord(fetched.id, payload);
  }
}

// ─── Drawings (monthly summary) ────────────────────────────────────────────

export type DrawingCreatePayload = Pick<
  DrawingMonthlyRecord,
  "projectName" | "month" | "year" | "submittedDrawings" | "approvedDrawings"
>;

export function normalizeDrawingMonthlyRecord(
  row: any,
  projectName = "",
): DrawingMonthlyRecord {
  const submittedDrawings = toNum(
    row?.submittedDrawings ??
    row?.submitted_drawings ??
    row?.totalSubmittedDrawings ??
    row?.total_submitted_drawings ??
    row?.totalDrawings ??
    row?.total_drawings,
  );
  const approvedDrawings = toNum(
    row?.approvedDrawings ?? row?.approved_drawings ?? row?.totalApproved,
  );
  const varianceRaw = row?.variance;
  const variance =
    varianceRaw != null && varianceRaw !== ""
      ? toNum(varianceRaw)
      : Math.max(0, submittedDrawings - approvedDrawings);
  const approvalRate = toNum(row?.approvalRate ?? row?.approval_rate);

  return {
    id: row?.id,
    projectName: row?.projectName ?? row?.project_name ?? projectName,
    month: toNum(row?.month) || new Date().getMonth() + 1,
    year: toNum(row?.year) || new Date().getFullYear(),
    submittedDrawings,
    approvedDrawings,
    variance,
    approvalRate:
      approvalRate ||
      (submittedDrawings > 0
        ? (approvedDrawings / submittedDrawings) * 100
        : 0),
  };
}

export function normalizeDrawingProjectSummary(
  row: any,
): DrawingProjectSummary {
  const submittedDrawings = toNum(
    row?.submittedDrawings ??
    row?.submitted_drawings ??
    row?.total_submitted_drawings,
  );
  const approvedDrawings = toNum(
    row?.approvedDrawings ?? row?.approved_drawings,
  );
  const variance =
    row?.variance != null && row?.variance !== ""
      ? toNum(row.variance)
      : Math.max(0, submittedDrawings - approvedDrawings);
  const approvalRate = toNum(row?.approvalRate ?? row?.approval_rate);

  return {
    submittedDrawings,
    approvedDrawings,
    variance,
    approvalRate:
      approvalRate ||
      (submittedDrawings > 0
        ? (approvedDrawings / submittedDrawings) * 100
        : 0),
  };
}

function toDrawingPayload(data: DrawingCreatePayload) {
  return {
    project_name: data.projectName,
    month: data.month,
    year: data.year,
    submitted_drawings: data.submittedDrawings,
    approved_drawings: data.approvedDrawings,
  };
}

function unwrapDrawingRow(
  data: unknown,
  projectName = "",
): DrawingMonthlyRecord | null {
  if (!data) return null;
  const unwrapped = unwrapApiData(data);
  if (Array.isArray(unwrapped)) {
    return unwrapped.length > 0
      ? normalizeDrawingMonthlyRecord(unwrapped[0], projectName)
      : null;
  }
  if (unwrapped && typeof unwrapped === "object") {
    const obj = unwrapped as Record<string, unknown>;
    if (obj.success === false) return null;
    return normalizeDrawingMonthlyRecord(unwrapped, projectName);
  }
  return null;
}

function throwIfDrawingFailure(data: unknown, status = 400): void {
  if (!data || typeof data !== "object") return;
  const body = data as Record<string, unknown>;
  if (body.success !== false) return;

  throw axios.AxiosError.from(
    typeof body.message === "string"
      ? body.message
      : "Failed to save drawing record",
    axios.AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    {
      data: body,
      status,
      statusText: "Bad Request",
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    },
  );
}

function extractDrawingMonthlyRows(raw: unknown): any[] {
  const data = unwrapApiData(raw);
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  const candidates = [
    obj.monthlyRecords,
    obj.monthly_records,
    obj.records,
    obj.months,
    obj.monthly,
    obj.monthlyData,
    obj.monthly_data,
    obj.monthly_breakdown,
    obj.trend,
    obj.trend_data,
    obj.history,
    obj.data,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const list = unwrapList<any>(candidate);
    if (list.length > 0) return list;

    if (typeof candidate === "object" && !Array.isArray(candidate)) {
      const monthKeyed: any[] = [];
      for (const [key, value] of Object.entries(
        candidate as Record<string, unknown>,
      )) {
        const monthNum = Number(key);
        if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12)
          continue;
        if (!value || typeof value !== "object") continue;
        monthKeyed.push({
          ...(value as Record<string, unknown>),
          month: monthNum,
        });
      }
      if (monthKeyed.length > 0) return monthKeyed as any[];
    }
  }

  if (
    "month" in obj ||
    "submitted_drawings" in obj ||
    "submittedDrawings" in obj
  ) {
    return [obj];
  }

  return [];
}

export function mergeDrawingRecordsByPeriod(
  records: DrawingMonthlyRecord[],
): DrawingMonthlyRecord[] {
  const byPeriod = new Map<string, DrawingMonthlyRecord>();
  for (const record of records) {
    if (!record.month) continue;
    const key = `${record.year}-${record.month}`;
    byPeriod.set(key, record);
  }
  return Array.from(byPeriod.values()).sort(
    (a, b) => a.month - b.month || a.year - b.year,
  );
}

export function normalizeDrawingYearSummary(
  raw: unknown,
  projectName: string,
  year: number,
): DrawingMonthlyRecord[] {
  const rows = extractDrawingMonthlyRows(raw);
  return mergeDrawingRecordsByPeriod(
    rows
      .map((row) => {
        const normalized = normalizeDrawingMonthlyRecord(row, projectName);
        return { ...normalized, year: normalized.year || year };
      })
      .filter((row) => row.month >= 1 && row.month <= 12 && row.year === year),
  );
}

/** Legacy monthly drawing trend — disabled (use drawingRegisterApi.getClientReport in UI). */
export async function fetchDrawingYearRecords(
  _projectName: string,
  _year: number,
): Promise<DrawingMonthlyRecord[]> {
  return [];
}

export const drawingsApi = {
  getAll: (params?: {
    project_name?: string;
    page?: number;
    page_size?: number;
  }) => api.get(API_ENDPOINTS.DRAWINGS.LIST, { params }),

  getById: (id: string | number) => api.get(API_ENDPOINTS.DRAWINGS.DETAIL(id)),

  getByProjectMonthYear: (projectName: string, month: number, year: number) =>
    api.get(API_ENDPOINTS.DRAWINGS.BY_MONTH_YEAR(projectName, month, year)),

  getProjectSummary: (projectName: string) =>
    api.get(API_ENDPOINTS.DRAWINGS.PROJECT_SUMMARY(projectName)),

  getYearSummary: (projectName: string, year: number) =>
    api.get(API_ENDPOINTS.DRAWINGS.YEAR_SUMMARY(projectName, year)),

  create: (data: DrawingCreatePayload) =>
    api.post(API_ENDPOINTS.DRAWINGS.LIST, toDrawingPayload(data)),

  update: (id: string | number, data: DrawingCreatePayload) =>
    api.put(API_ENDPOINTS.DRAWINGS.DETAIL(id), toDrawingPayload(data)),

  patch: (id: string | number, data: Partial<DrawingCreatePayload>) =>
    api.patch(API_ENDPOINTS.DRAWINGS.DETAIL(id), {
      ...(data.projectName !== undefined && { project_name: data.projectName }),
      ...(data.month !== undefined && { month: data.month }),
      ...(data.year !== undefined && { year: data.year }),
      ...(data.submittedDrawings !== undefined && {
        submitted_drawings: data.submittedDrawings,
      }),
      ...(data.approvedDrawings !== undefined && {
        approved_drawings: data.approvedDrawings,
      }),
    }),

  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.DRAWINGS.DETAIL(id)),

  /** @deprecated Use getAll */
  getDrawings: (params?: Record<string, unknown>) =>
    api.get(API_ENDPOINTS.DRAWINGS.LIST, { params }),
  /** @deprecated Use getById */
  getDrawing: (id: string | number) =>
    api.get(API_ENDPOINTS.DRAWINGS.DETAIL(id)),
  /** @deprecated Use create */
  createDrawing: (data: DrawingCreatePayload) =>
    api.post(API_ENDPOINTS.DRAWINGS.LIST, toDrawingPayload(data)),
  /** @deprecated Use update */
  updateDrawing: (id: string | number, data: DrawingCreatePayload) =>
    api.put(API_ENDPOINTS.DRAWINGS.DETAIL(id), toDrawingPayload(data)),
  /** @deprecated Use patch */
  patchDrawing: (id: string | number, data: Partial<DrawingCreatePayload>) =>
    api.patch(API_ENDPOINTS.DRAWINGS.DETAIL(id), {
      ...(data.projectName !== undefined && { project_name: data.projectName }),
      ...(data.month !== undefined && { month: data.month }),
      ...(data.year !== undefined && { year: data.year }),
      ...(data.submittedDrawings !== undefined && {
        submitted_drawings: data.submittedDrawings,
      }),
      ...(data.approvedDrawings !== undefined && {
        approved_drawings: data.approvedDrawings,
      }),
    }),
  /** @deprecated Use delete */
  deleteDrawing: (id: string | number) =>
    api.delete(API_ENDPOINTS.DRAWINGS.DETAIL(id)),
  /** @deprecated Use getByProjectMonthYear or getProjectSummary */
  getDrawingsByProject: (projectName: string) =>
    api.get(API_ENDPOINTS.DRAWINGS.PROJECT(projectName)),
};

export function findDrawingRecordByPeriod(
  records: DrawingMonthlyRecord[] | null | undefined,
  month: number,
  year: number,
): DrawingMonthlyRecord | null {
  return (
    records?.find(
      (row) =>
        toNum(row.month) === toNum(month) && toNum(row.year) === toNum(year),
    ) ?? null
  );
}

async function listDrawingRecordsForProject(
  projectName: string,
): Promise<DrawingMonthlyRecord[]> {
  const response = await drawingsApi.getAll({ project_name: projectName });
  throwIfDrawingFailure(response.data, response.status);
  return unwrapList<any>(response.data).map((row) =>
    normalizeDrawingMonthlyRecord(row, projectName),
  );
}

export async function fetchDrawingRecordByPeriod(
  projectName: string,
  month: number,
  year: number,
): Promise<DrawingMonthlyRecord | null> {
  try {
    const response = await drawingsApi.getByProjectMonthYear(
      projectName,
      month,
      year,
    );
    throwIfDrawingFailure(response.data, response.status);
    const record = unwrapDrawingRow(response.data, projectName);
    if (record) return record;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    if (error.response?.status !== 404) {
      // fall through to list lookup
    }
  }

  try {
    const records = await listDrawingRecordsForProject(projectName);
    return findDrawingRecordByPeriod(records, month, year);
  } catch {
    return null;
  }
}

function isDuplicateDrawingError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const combined = getApiErrorMessage(error, "").toLowerCase();
  return combined.includes("already exists") || combined.includes("unique");
}

async function updateDrawingRecord(
  id: string | number,
  payload: DrawingCreatePayload,
): Promise<DrawingMonthlyRecord> {
  try {
    const response = await drawingsApi.update(id, payload);
    throwIfDrawingFailure(response.data, response.status);
    return normalizeDrawingMonthlyRecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const response = await drawingsApi.patch(id, payload);
    throwIfDrawingFailure(response.data, response.status);
    return normalizeDrawingMonthlyRecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  }
}

export async function saveDrawingRecord(
  payload: DrawingCreatePayload,
  options?: {
    record?: DrawingMonthlyRecord | null;
    knownRecords?: DrawingMonthlyRecord[];
  },
): Promise<DrawingMonthlyRecord> {
  const fromKnown = findDrawingRecordByPeriod(
    options?.knownRecords,
    payload.month,
    payload.year,
  );
  const existing = fromKnown?.id
    ? fromKnown
    : options?.record?.id &&
      options.record.month === payload.month &&
      options.record.year === payload.year
      ? options.record
      : await fetchDrawingRecordByPeriod(
        payload.projectName,
        payload.month,
        payload.year,
      );

  if (existing?.id) {
    return updateDrawingRecord(existing.id, payload);
  }

  try {
    const response = await drawingsApi.create(payload);
    throwIfDrawingFailure(response.data, response.status);
    return normalizeDrawingMonthlyRecord(
      response.data?.data ?? response.data,
      payload.projectName,
    );
  } catch (error) {
    if (!isDuplicateDrawingError(error)) throw error;
    const fetched = await fetchDrawingRecordByPeriod(
      payload.projectName,
      payload.month,
      payload.year,
    );
    if (!fetched?.id) throw error;
    return updateDrawingRecord(fetched.id, payload);
  }
}

// Budget Performance API (no auth)
export const budgetPerformanceApi = {
  getBudgetPerformance: (params?: { project_name?: string }) =>
    api.get(API_ENDPOINTS.BUDGET_PERFORMANCE.LIST, { params }),
  getBudgetPerformanceDetail: (id: string | number) =>
    api.get(API_ENDPOINTS.BUDGET_PERFORMANCE.DETAIL(id)),
  createBudgetPerformance: (data: any) =>
    api.post(API_ENDPOINTS.BUDGET_PERFORMANCE.LIST, data),
  updateBudgetPerformance: (id: string | number, data: any) =>
    api.put(API_ENDPOINTS.BUDGET_PERFORMANCE.DETAIL(id), data),
  patchBudgetPerformance: (id: string | number, data: any) =>
    api.patch(API_ENDPOINTS.BUDGET_PERFORMANCE.DETAIL(id), data),
};

// ─── Financial Management save (POST create, PUT/PATCH update) ───────────────

function isDuplicateFinancialError(error: unknown): boolean {
  const err = error as { response?: { status?: number; data?: unknown } };
  if (err?.response?.status === 409) return true;
  const data = err?.response?.data;
  const combined = JSON.stringify(data ?? "").toLowerCase();
  return combined.includes("already exists") || combined.includes("unique");
}

function shouldFallbackToPatchAfterPut(status?: number): boolean {
  return status === 405 || status === 501;
}

function isMethodNotAllowedError(error: unknown): boolean {
  const err = error as { response?: { status?: number; data?: unknown } };
  if (err?.response?.status === 405) return true;
  const combined = JSON.stringify(err?.response?.data ?? "").toLowerCase();
  return combined.includes("not allowed") || combined.includes('method "');
}

function isMissingEndpointError(error: unknown): boolean {
  const err = error as { response?: { status?: number } };
  return err?.response?.status === 404;
}

async function updateCostPerformanceRecord(
  id: string | number,
  body: Record<string, unknown>,
  options: { projectName: string; month: number; year: number },
): Promise<{ data: unknown }> {
  const periodAttempts: Array<() => Promise<{ data: unknown }>> = [
    () =>
      costPerformanceApi.updateByProjectMonthYear(
        options.projectName,
        options.month,
        options.year,
        body,
      ),
    () =>
      costPerformanceApi.patchByProjectMonthYear(
        options.projectName,
        options.month,
        options.year,
        body,
      ),
    () => costPerformanceApi.updateCostPerformance(id, body),
    () => costPerformanceApi.patchCostPerformance(id, body),
  ];

  let lastError: unknown;
  for (const attempt of periodAttempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (isMethodNotAllowedError(error) || isMissingEndpointError(error))
        continue;
      throw error;
    }
  }

  // Backend detail routes are read-only (GET only) — upsert via POST list with id.
  try {
    return await costPerformanceApi.upsertCostPerformance({ ...body, id });
  } catch (postError) {
    throw postError ?? lastError;
  }
}

const COST_PERFORMANCE_NUMERIC_KEYS = [
  "bcws",
  "bcwp",
  "acwp",
  "fcst",
  "bac",
] as const;

export function normalizeCostPerformancePayload(
  payload: Record<string, unknown>,
  options?: { isUpdate?: boolean },
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...payload };
  delete body.id;
  delete body.cpi;
  delete body.eac;
  delete body.etg;
  delete body.vac;
  delete body.cv;

  if (options?.isUpdate) {
    delete body.created_by;
    delete body.created_at;
    delete body.createdAt;
  }

  for (const key of COST_PERFORMANCE_NUMERIC_KEYS) {
    if (body[key] === undefined || body[key] === null || body[key] === "")
      continue;
    const numeric = Number(String(body[key]).replace(/,/g, "").trim());
    body[key] = Number.isFinite(numeric) ? numeric : 0;
  }

  return body;
}

async function updateExistingFinancialRecord<T extends Record<string, unknown>>(
  id: string | number,
  payload: T,
  updateFn: (id: string | number, data: T) => Promise<{ data: unknown }>,
  patchFn?: (id: string | number, data: T) => Promise<{ data: unknown }>,
): Promise<{ data: unknown }> {
  try {
    return await updateFn(id, payload);
  } catch (putErr) {
    const putStatus = (putErr as { response?: { status?: number } })?.response
      ?.status;
    if (!patchFn || !shouldFallbackToPatchAfterPut(putStatus)) throw putErr;

    try {
      return await patchFn(id, payload);
    } catch (patchErr) {
      if (isMethodNotAllowedError(patchErr)) throw putErr;
      throw patchErr;
    }
  }
}

export async function resolveProjectProgressId(
  projectName: string,
  month: number,
  year: number,
  role?: string,
): Promise<string | number | undefined> {
  const params: Record<string, string> = { project_name: projectName };
  if (role?.trim()) params.role = role.trim();
  const response = await projectProgressApi.getProjectProgress(params);
  const rows = unwrapList<Record<string, unknown>>(response.data);
  const match = pickProjectProgressRecord(rows, month, year);
  return extractRecordId(match);
}

export async function saveProjectProgressForPeriod(
  payload: Record<string, unknown>,
  options: {
    projectName: string;
    month: number;
    year: number;
    role?: string;
    existingId?: string | number | null;
  },
): Promise<{ data: unknown }> {
  const body = {
    ...payload,
    project_name: options.projectName,
    progress_month:
      payload.progress_month ??
      formatProgressMonthDate(options.month, options.year),
    ...(options.role ? { role: options.role } : {}),
  };

  const existingId =
    options.existingId ??
    (await resolveProjectProgressId(
      options.projectName,
      options.month,
      options.year,
      options.role,
    ));

  if (existingId) {
    return updateExistingFinancialRecord(
      existingId,
      body,
      projectProgressApi.updateProjectProgress,
      projectProgressApi.patchProjectProgress,
    );
  }

  try {
    return await projectProgressApi.createProjectProgress(body);
  } catch (error) {
    if (!isDuplicateFinancialError(error)) throw error;
    const resolvedId = await resolveProjectProgressId(
      options.projectName,
      options.month,
      options.year,
      options.role,
    );
    if (!resolvedId) throw error;
    return updateExistingFinancialRecord(
      resolvedId,
      body,
      projectProgressApi.updateProjectProgress,
      projectProgressApi.patchProjectProgress,
    );
  }
}

export async function resolveCostPerformanceId(
  projectName: string,
  month: number,
  year: number,
  role?: string,
): Promise<string | number | undefined> {
  const monthYear = formatFinancialMonthYear(month, year);
  const attempts: Array<Record<string, string>> = [
    {
      project_name: projectName,
      month_year: monthYear,
      ...(role?.trim() ? { role: role.trim() } : {}),
    },
    { project_name: projectName, month_year: monthYear },
    {
      project_name: projectName,
      ...(role?.trim() ? { role: role.trim() } : {}),
    },
    { project_name: projectName },
  ];

  for (const params of attempts) {
    try {
      const response = await costPerformanceApi.getCostPerformance(params);
      const rows = unwrapList<Record<string, unknown>>(response.data);
      const match = pickCostPerformanceRecord(rows, month, year);
      const id = extractRecordId(match);
      if (id) return id;
    } catch {
      /* try next query shape */
    }
  }

  return undefined;
}

export async function saveCostPerformanceForPeriod(
  payload: Record<string, unknown>,
  options: {
    projectName: string;
    month: number;
    year: number;
    role?: string;
    existingId?: string | number | null;
  },
): Promise<{ data: unknown }> {
  const existingId =
    options.existingId ??
    (await resolveCostPerformanceId(
      options.projectName,
      options.month,
      options.year,
      options.role,
    ));

  const body = normalizeCostPerformancePayload(
    {
      ...payload,
      project_name: options.projectName,
      month_year:
        payload.month_year ??
        formatFinancialMonthYear(options.month, options.year),
      ...(options.role ? { role: options.role } : {}),
    },
    { isUpdate: Boolean(existingId) },
  );

  if (existingId) {
    return updateCostPerformanceRecord(existingId, body, {
      projectName: options.projectName,
      month: options.month,
      year: options.year,
    });
  }

  try {
    return await costPerformanceApi.createCostPerformance(body);
  } catch (error) {
    if (!isDuplicateFinancialError(error)) throw error;
    const resolvedId = await resolveCostPerformanceId(
      options.projectName,
      options.month,
      options.year,
      options.role,
    );
    if (!resolvedId) throw error;
    const updateBody = normalizeCostPerformancePayload(body, {
      isUpdate: true,
    });
    return updateCostPerformanceRecord(resolvedId, updateBody, {
      projectName: options.projectName,
      month: options.month,
      year: options.year,
    });
  }
}

export async function resolveBudgetPerformanceId(
  projectName: string,
  month: number,
  year: number,
  role?: string,
): Promise<string | number | undefined> {
  const params: Record<string, string> = { project_name: projectName };
  if (role?.trim()) params.role = role.trim();
  const response = await budgetPerformanceApi.getBudgetPerformance(params);
  const rows = unwrapList<Record<string, unknown>>(response.data);
  const match = pickBudgetPerformanceRecord(rows, month, year);
  return extractRecordId(match);
}

export async function saveBudgetPerformanceForPeriod(
  payload: Record<string, unknown>,
  options: {
    projectName: string;
    month: number;
    year: number;
    role?: string;
    existingId?: string | number | null;
  },
): Promise<{ data: unknown }> {
  const body = {
    ...payload,
    project_name: options.projectName,
    month_year:
      payload.month_year ??
      formatFinancialMonthYear(options.month, options.year),
    ...(options.role ? { role: options.role } : {}),
  };

  const existingId =
    options.existingId ??
    (await resolveBudgetPerformanceId(
      options.projectName,
      options.month,
      options.year,
      options.role,
    ));

  if (existingId) {
    return updateExistingFinancialRecord(
      existingId,
      body,
      budgetPerformanceApi.updateBudgetPerformance,
      budgetPerformanceApi.patchBudgetPerformance,
    );
  }

  try {
    return await budgetPerformanceApi.createBudgetPerformance(body);
  } catch (error) {
    if (!isDuplicateFinancialError(error)) throw error;
    const resolvedId = await resolveBudgetPerformanceId(
      options.projectName,
      options.month,
      options.year,
      options.role,
    );
    if (!resolvedId) throw error;
    return updateExistingFinancialRecord(
      resolvedId,
      body,
      budgetPerformanceApi.updateBudgetPerformance,
      budgetPerformanceApi.patchBudgetPerformance,
    );
  }
}

const CASHFLOW_NUMERIC_KEYS = [
  "cash_in_monthly_plan",
  "cash_in_monthly_actual",
  "cash_out_monthly_plan",
  "cash_out_monthly_actual",
  "actual_cost_monthly",
] as const;

export function normalizeCashflowPayload(
  payload: Record<string, unknown>,
  options?: { isUpdate?: boolean },
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...payload };
  delete body.id;

  if (options?.isUpdate) {
    delete body.created_by;
    delete body.created_at;
    delete body.createdAt;
    delete body.updated_at;
    delete body.updatedAt;
  }

  for (const key of CASHFLOW_NUMERIC_KEYS) {
    if (body[key] === undefined || body[key] === null || body[key] === "")
      continue;
    const numeric = Number(String(body[key]).replace(/,/g, "").trim());
    body[key] = Number.isFinite(numeric) ? numeric : 0;
  }

  return body;
}

export async function resolveCashflowId(
  projectName: string,
  month: number,
  year: number,
): Promise<string | number | undefined> {
  const response = await cashflowApi.getCashflow({ project_name: projectName });
  const rows = unwrapList<Record<string, unknown>>(response.data);
  const match = pickCostPerformanceRecord(rows, month, year);
  return extractRecordId(match);
}

async function resolveCashflowIdByMonthYear(
  projectName: string,
  monthYear: string,
): Promise<string | number | undefined> {
  const response = await cashflowApi.getCashflow({ project_name: projectName });
  const rows = unwrapList<Record<string, unknown>>(response.data);
  const target = monthYear.trim().toLowerCase();
  const match =
    rows.find(
      (row) =>
        String(row.month_year ?? row.monthYear ?? "")
          .trim()
          .toLowerCase() === target,
    ) ?? null;
  return extractRecordId(match);
}

export async function saveCashflowRecord(
  payload: Record<string, unknown>,
  existingId?: string | number | null,
  options?: { projectName?: string; month?: number; year?: number },
): Promise<{ data: unknown }> {
  const projectName = String(payload.project_name ?? options?.projectName ?? "");
  const body = normalizeCashflowPayload(payload, { isUpdate: !!existingId });

  const id =
    existingId ??
    (options?.month != null && options?.year != null
      ? await resolveCashflowId(projectName, options.month, options.year)
      : undefined);

  if (id) {
    return updateExistingFinancialRecord(
      id,
      body,
      cashflowApi.updateCashflow,
      cashflowApi.patchCashflow,
    );
  }

  try {
    return await cashflowApi.createCashflow(body);
  } catch (error) {
    if (!isDuplicateFinancialError(error)) throw error;
    const monthYear = String(body.month_year ?? "");
    const resolvedId =
      options?.month != null && options?.year != null
        ? await resolveCashflowId(projectName, options.month, options.year)
        : monthYear
          ? await resolveCashflowIdByMonthYear(projectName, monthYear)
          : undefined;
    if (!resolvedId) throw error;
    return updateExistingFinancialRecord(
      resolvedId,
      normalizeCashflowPayload(body, { isUpdate: true }),
      cashflowApi.updateCashflow,
      cashflowApi.patchCashflow,
    );
  }
}

export async function saveCashflowForPeriod(
  payload: Record<string, unknown>,
  options: {
    projectName: string;
    month: number;
    year: number;
    existingId?: string | number | null;
  },
): Promise<{ data: unknown }> {
  const body = {
    ...payload,
    project_name: options.projectName,
    month_year:
      payload.month_year ??
      formatFinancialMonthYear(options.month, options.year),
  };

  return saveCashflowRecord(body, options.existingId, {
    projectName: options.projectName,
    month: options.month,
    year: options.year,
  });
}

export async function resolveContractValueId(
  projectName: string,
  contractType: ContractValueType,
  contractorScope?: Pick<ContractValuePayload, "contractorName" | "contractorId">,
): Promise<string | number | undefined> {
  const response = await contractValuesApi.getContractValues({
    projectName,
    contractType,
    ...(contractorScope?.contractorName
      ? { contractorName: contractorScope.contractorName }
      : {}),
  });
  const rows = unwrapList<Record<string, unknown>>(response.data).map((row) =>
    normalizeContractValueRecord(row, projectName, contractType),
  );
  const picked =
    contractType === "Contractor" &&
      (contractorScope?.contractorName || contractorScope?.contractorId != null)
      ? pickRecordForContractor(
        rows,
        contractorScope.contractorName,
        contractorScope.contractorId,
      )
      : rows[0] ?? null;
  return extractRecordId(picked);
}

export async function saveContractValueRecord(
  payload: ContractValuePayload,
  existingId?: string | number | null,
): Promise<{ data: unknown }> {
  const contractorScope =
    payload.contractType === "Contractor"
      ? {
        contractorName: payload.contractorName,
        contractorId: payload.contractorId,
      }
      : undefined;
  const id =
    existingId ??
    (await resolveContractValueId(
      payload.projectName,
      payload.contractType,
      contractorScope,
    ));

  if (id) {
    return updateExistingFinancialRecord(
      id,
      toContractValueApiBody(payload) as Record<string, unknown>,
      (recordId) => contractValuesApi.updateContractValue(recordId, payload),
      (recordId) => contractValuesApi.patchContractValue(recordId, payload),
    );
  }

  try {
    return await contractValuesApi.createContractValue(payload);
  } catch (error) {
    if (!isDuplicateFinancialError(error)) throw error;
    const resolvedId = await resolveContractValueId(
      payload.projectName,
      payload.contractType,
      contractorScope,
    );
    if (!resolvedId) throw error;
    return updateExistingFinancialRecord(
      resolvedId,
      toContractValueApiBody(payload) as Record<string, unknown>,
      (recordId) => contractValuesApi.updateContractValue(recordId, payload),
      (recordId) => contractValuesApi.patchContractValue(recordId, payload),
    );
  }
}

export async function resolveInvoicingId(
  projectName: string,
  invoiceType: InvoiceType,
  contractorScope?: Pick<InvoicingPayload, "contractorName" | "contractorId">,
): Promise<string | number | undefined> {
  const response = await invoicingApi.getInvoicing({
    projectName,
    invoiceType,
    ...(contractorScope?.contractorName
      ? { contractorName: contractorScope.contractorName }
      : {}),
  });
  const rows = unwrapList<Record<string, unknown>>(response.data).map((row) =>
    normalizeInvoicingRecord(row, projectName, invoiceType),
  );
  const picked =
    invoiceType === "Contractor" &&
      (contractorScope?.contractorName || contractorScope?.contractorId != null)
      ? pickRecordForContractor(
        rows,
        contractorScope.contractorName,
        contractorScope.contractorId,
      )
      : rows[0] ?? null;
  return extractRecordId(picked);
}

export async function saveInvoicingRecord(
  payload: InvoicingPayload,
  existingId?: string | number | null,
): Promise<{ data: unknown }> {
  const contractorScope =
    payload.invoiceType === "Contractor"
      ? {
        contractorName: payload.contractorName,
        contractorId: payload.contractorId,
      }
      : undefined;
  const id =
    existingId ??
    (await resolveInvoicingId(
      payload.projectName,
      payload.invoiceType,
      contractorScope,
    ));

  if (id) {
    return updateExistingFinancialRecord(
      id,
      toInvoicingApiBody(payload) as Record<string, unknown>,
      (recordId) => invoicingApi.updateInvoicing(recordId, payload),
      (recordId) => invoicingApi.patchInvoicing(recordId, payload),
    );
  }

  try {
    return await invoicingApi.createInvoicing(payload);
  } catch (error) {
    if (!isDuplicateFinancialError(error)) throw error;
    const resolvedId = await resolveInvoicingId(
      payload.projectName,
      payload.invoiceType,
      contractorScope,
    );
    if (!resolvedId) throw error;
    return updateExistingFinancialRecord(
      resolvedId,
      toInvoicingApiBody(payload) as Record<string, unknown>,
      (recordId) => invoicingApi.updateInvoicing(recordId, payload),
      (recordId) => invoicingApi.patchInvoicing(recordId, payload),
    );
  }
}

export async function resolveContractPerformanceId(
  projectName: string,
  role?: string,
): Promise<string | number | undefined> {
  const params: Record<string, string> = { project_name: projectName };
  if (role?.trim()) params.role = role.trim();
  const response = await contractPerformanceApi.getContractPerformance(params);
  const row = unwrapList<Record<string, unknown>>(response.data)[0];
  return extractRecordId(row);
}

export async function saveContractPerformanceRecord(
  payload: ContractPerformancePayload,
  existingId?: string | number | null,
): Promise<{ data: unknown }> {
  const id =
    existingId ??
    (await resolveContractPerformanceId(payload.project_name, payload.role));

  if (id) {
    return updateExistingFinancialRecord(
      id,
      payload as unknown as Record<string, unknown>,
      (recordId) =>
        contractPerformanceApi.updateContractPerformance(recordId, payload),
      (recordId) =>
        contractPerformanceApi.patchContractPerformance(recordId, payload),
    );
  }

  try {
    return await contractPerformanceApi.createContractPerformance(payload);
  } catch (error) {
    if (!isDuplicateFinancialError(error)) throw error;
    const resolvedId = await resolveContractPerformanceId(
      payload.project_name,
      payload.role,
    );
    if (!resolvedId) throw error;
    return updateExistingFinancialRecord(
      resolvedId,
      payload as unknown as Record<string, unknown>,
      (recordId) =>
        contractPerformanceApi.updateContractPerformance(recordId, payload),
      (recordId) =>
        contractPerformanceApi.patchContractPerformance(recordId, payload),
    );
  }
}

// ─── Planned vs Actual Value (planned-earned-value API) ────────────────────

export interface PlannedEarnedValueRecord {
  id?: number;
  projectName: string;
  plannedValue: number;
  earnedValue: number;
  /** Auto-calculated by backend: earnedValue - plannedValue */
  variance?: number;
  variancePercentage?: number;
  performancePercentage?: number;
  schedulePerformanceIndex?: number;
  performanceStatus?: string;
}

export type PlannedEarnedValuePayload = Pick<
  PlannedEarnedValueRecord,
  "projectName" | "plannedValue" | "earnedValue"
>;

export function normalizePlannedEarnedValueRecord(
  row: any,
): PlannedEarnedValueRecord {
  return {
    id: row?.id,
    projectName: row?.projectName ?? row?.project_name ?? "",
    plannedValue: toNum(row?.plannedValue ?? row?.planned_value),
    earnedValue: toNum(row?.earnedValue ?? row?.earned_value),
    variance: toNum(row?.variance),
    variancePercentage: toNum(
      row?.variancePercentage ?? row?.variance_percentage,
    ),
    performancePercentage: toNum(
      row?.performancePercentage ?? row?.performance_percentage,
    ),
    schedulePerformanceIndex: toNum(
      row?.schedulePerformanceIndex ?? row?.schedule_performance_index,
    ),
    performanceStatus: row?.performanceStatus ?? row?.performance_status ?? "",
  };
}

export interface PlannedEarnedPartyMetrics {
  id?: number;
  plannedValue: number;
  earnedValue: number;
  variance: number;
  spi: number;
  performancePercentage: number;
}

export type PlannedEarnedPartyType = "scl" | "contractor";

export type PlannedEarnedPeriodPayload = {
  projectName: string;
  month: number;
  year: number;
  scl: Pick<PlannedEarnedPartyMetrics, "plannedValue" | "earnedValue">;
  contractor: Pick<PlannedEarnedPartyMetrics, "plannedValue" | "earnedValue">;
};

export interface PlannedEarnedByPeriodResponse {
  projectName: string;
  month: number;
  year: number;
  scl: PlannedEarnedPartyMetrics | null;
  contractor: PlannedEarnedPartyMetrics | null;
}

export function normalizePlannedEarnedPartyMetrics(
  row: any,
): PlannedEarnedPartyMetrics | null {
  if (!row || typeof row !== "object") return null;

  const plannedValue = toNum(row.plannedValue ?? row.planned_value);
  const earnedValue = toNum(row.earnedValue ?? row.earned_value);
  const hasValues =
    row.planned_value != null ||
    row.plannedValue != null ||
    row.earned_value != null ||
    row.earnedValue != null;

  if (!hasValues && plannedValue === 0 && earnedValue === 0) return null;

  const variance =
    row.variance != null ? toNum(row.variance) : earnedValue - plannedValue;
  const performancePercentage = toNum(
    row.performancePercentage ??
    row.performance_percentage ??
    (plannedValue > 0 ? (earnedValue / plannedValue) * 100 : 0),
  );
  const spi = toNum(
    row.spi ??
    row.schedule_performance_index ??
    (plannedValue > 0 ? earnedValue / plannedValue : 0),
  );

  return {
    id: row?.id ?? row?.pk,
    plannedValue,
    earnedValue,
    variance,
    spi,
    performancePercentage,
  };
}

function toPlannedEarnedPeriodPayload(data: PlannedEarnedPeriodPayload) {
  return {
    project_name: data.projectName,
    month: data.month,
    year: data.year,
    scl: {
      planned_value: data.scl.plannedValue,
      earned_value: data.scl.earnedValue,
    },
    contractor: {
      planned_value: data.contractor.plannedValue,
      earned_value: data.contractor.earnedValue,
    },
  };
}

export function normalizePlannedEarnedByPeriod(
  raw: unknown,
  projectName = "",
): PlannedEarnedByPeriodResponse {
  const data = (
    raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
      ? (raw as Record<string, unknown>).data
      : raw
  ) as Record<string, unknown> | null;

  if (!data || typeof data !== "object") {
    return {
      projectName,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      scl: null,
      contractor: null,
    };
  }

  return {
    projectName: String(data.projectName ?? data.project_name ?? projectName),
    month: toNum(data.month) || new Date().getMonth() + 1,
    year: toNum(data.year) || new Date().getFullYear(),
    scl: normalizePlannedEarnedPartyMetrics(data.scl),
    contractor: normalizePlannedEarnedPartyMetrics(data.contractor),
  };
}

// ─── Project Dates ───────────────────────────────────────────────────────────

export type ProjectDateType = "SCL" | "CONTRACTOR";

export type BgStatusCode = 'YET_TO_UPDATE' | 'UPDATED' | string;

export interface ProjectDatesBgStatus {
  contractor_bg_date: string | null;
  contractor_bg_due_date: string | null;
  contractor_bg_updated_date: string | null;
  contractor_bg_status: BgStatusCode | null;
  scl_bg_date: string | null;
  scl_bg_due_date: string | null;
  scl_bg_updated_date: string | null;
  scl_bg_status: BgStatusCode | null;
}

export interface ProjectDatesBgStatusPayload {
  contractor_bg_due_date?: string | null;
  contractor_bg_updated_date?: string | null;
  scl_bg_due_date?: string | null;
  scl_bg_updated_date?: string | null;
  /** Legacy alias — maps to updated date on the API */
  contractor_bg_date?: string | null;
  scl_bg_date?: string | null;
}

export interface ProjectDatesRecord {
  id?: number;
  project_name?: string;
  date_type?: ProjectDateType;
  contractor_name?: string;
  project_start: string | null;
  contract_finish: string | null;
  forecast_finish: string | null;
  eot_date: string | null;
  elapsed_duration: number;
  remaining_duration: number;
  forecast_finish_duration: number;
  eot_duration: number;
  delay_days: number;
  eot_delay_days: number;
  current_delay: number;
  bg_status?: ProjectDatesBgStatus | null;
}

export interface ProjectDatesByProject {
  project_name: string;
  scl: ProjectDatesRecord | null;
  /** @deprecated First contractor — use contractors[] */
  contractor: ProjectDatesRecord | null;
  contractors: ProjectDatesRecord[];
  /** @deprecated Legacy single-date BG shape */
  bg_status?: ProjectDatesBgStatus | null;
  contractor_bg?: import('../types/bgStatus').BGEntry[];
  scl_bg?: import('../types/bgStatus').BGEntry[];
  bg_summary?: import('../types/bgStatus').BGSummary | null;
}

export interface ProjectDatesPayload {
  project_name: string;
  date_type: ProjectDateType;
  /** @deprecated Prefer contractor_id from Contractor Master */
  contractor_name?: string;
  contractor_id?: number;
  project_start: string;
  contract_finish: string;
  forecast_finish: string;
  eot_date: string;
}

function parseBgDateField(
  row: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value);
  }
  return null;
}

function parseBgStatusField(
  row: Record<string, unknown>,
  ...keys: string[]
): BgStatusCode | null {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value);
  }
  return null;
}

export function normalizeProjectDatesBgStatus(
  raw: unknown,
): ProjectDatesBgStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const contractor_bg_due_date = parseBgDateField(
    row,
    "contractor_bg_due_date",
    "contractorBgDueDate",
  );
  const contractor_bg_updated_date = parseBgDateField(
    row,
    "contractor_bg_updated_date",
    "contractorBgUpdatedDate",
  );
  const contractor_bg_date = parseBgDateField(
    row,
    "contractor_bg_date",
    "contractorBgDate",
  );
  const scl_bg_due_date = parseBgDateField(row, "scl_bg_due_date", "sclBgDueDate");
  const scl_bg_updated_date = parseBgDateField(
    row,
    "scl_bg_updated_date",
    "sclBgUpdatedDate",
  );
  const scl_bg_date = parseBgDateField(row, "scl_bg_date", "sclBgDate");

  const contractor_bg_status = parseBgStatusField(
    row,
    "contractor_bg_status",
    "contractorBgStatus",
  );
  const scl_bg_status = parseBgStatusField(row, "scl_bg_status", "sclBgStatus");

  const hasData =
    contractor_bg_due_date ||
    contractor_bg_updated_date ||
    contractor_bg_date ||
    scl_bg_due_date ||
    scl_bg_updated_date ||
    scl_bg_date ||
    contractor_bg_status ||
    scl_bg_status;

  if (!hasData) return null;

  return {
    contractor_bg_date,
    contractor_bg_due_date,
    contractor_bg_updated_date:
      contractor_bg_updated_date ?? contractor_bg_date,
    contractor_bg_status,
    scl_bg_date,
    scl_bg_due_date,
    scl_bg_updated_date: scl_bg_updated_date ?? scl_bg_date,
    scl_bg_status,
  };
}

function attachBgStatusToRecord(
  record: ProjectDatesRecord | null,
  bgStatus: ProjectDatesBgStatus | null,
): ProjectDatesRecord | null {
  if (!record) return null;
  const recordBg = normalizeProjectDatesBgStatus(record.bg_status);
  const merged = recordBg ?? bgStatus;
  return merged ? { ...record, bg_status: merged } : record;
}

export function mergeBgBundleIntoProjectDatesBundle(
  bundle: ProjectDatesByProject,
  bgBundle: import('../types/bgStatus').BgStatusBundle,
): ProjectDatesByProject {
  return {
    ...bundle,
    contractor_bg: bgBundle.contractor_bg,
    scl_bg: bgBundle.scl_bg,
    bg_summary: bgBundle.bg_summary,
  };
}

export function mergeBgStatusIntoProjectDatesBundle(
  bundle: ProjectDatesByProject,
  bgStatus: ProjectDatesBgStatus | null,
): ProjectDatesByProject {
  if (!bgStatus) return bundle;
  return {
    ...bundle,
    bg_status: bgStatus,
    scl: attachBgStatusToRecord(bundle.scl, bgStatus),
    contractor: attachBgStatusToRecord(bundle.contractor, bgStatus),
  };
}

export function normalizeProjectDatesRecord(
  row: any,
): ProjectDatesRecord | null {
  if (!row || typeof row !== "object") return null;

  const bg_status = normalizeProjectDatesBgStatus(
    row?.bg_status ?? row?.bgStatus,
  );

  return {
    id: row?.id,
    project_name: row?.project_name ?? row?.projectName ?? "",
    date_type: row?.date_type ?? row?.dateType,
    contractor_name: String(row?.contractor_name ?? row?.contractorName ?? "").trim() || undefined,
    project_start: row?.project_start ?? row?.projectStart ?? null,
    contract_finish: row?.contract_finish ?? row?.contractFinish ?? null,
    forecast_finish: row?.forecast_finish ?? row?.forecastFinish ?? null,
    eot_date: row?.eot_date ?? row?.eotDate ?? null,
    elapsed_duration: toNum(row?.elapsed_duration ?? row?.elapsedDuration),
    remaining_duration: toNum(
      row?.remaining_duration ?? row?.remainingDuration,
    ),
    forecast_finish_duration: toNum(
      row?.forecast_finish_duration ?? row?.forecastFinishDuration,
    ),
    eot_duration: toNum(row?.eot_duration ?? row?.eotDuration),
    delay_days: toNum(row?.delay_days ?? row?.delayDays),
    eot_delay_days: toNum(row?.eot_delay_days ?? row?.eotDelayDays),
    current_delay: toNum(row?.current_delay ?? row?.currentDelay),
    ...(bg_status ? { bg_status } : {}),
  };
}

export function normalizeProjectDatesByProject(
  data: any,
  projectName: string,
): ProjectDatesByProject {
  const payload = data?.data ?? data;
  const bundleBg =
    normalizeProjectDatesBgStatus(payload?.bg_status ?? payload?.bgStatus) ??
    normalizeProjectDatesBgStatus(
      payload?.scl?.bg_status ?? payload?.scl?.bgStatus,
    ) ??
    normalizeProjectDatesBgStatus(
      payload?.contractor?.bg_status ?? payload?.contractor?.bgStatus,
    );

  const bgBundle = normalizeBgStatusBundle(payload);

  const contractorsRaw = Array.isArray(payload?.contractors) ? payload.contractors : [];
  let contractors = contractorsRaw
    .map((row: unknown) => normalizeProjectDatesRecord(row))
    .filter((row: ProjectDatesRecord | null): row is ProjectDatesRecord => row != null);

  const legacyContractor = normalizeProjectDatesRecord(payload?.contractor);
  if (
    legacyContractor &&
    !contractors.some((c: ProjectDatesRecord) => c.id && c.id === legacyContractor.id)
  ) {
    contractors.push(legacyContractor);
  }

  // Some APIs return a flat list of schedule rows instead of contractors[]
  const flatRows = Array.isArray(payload?.project_dates)
    ? payload.project_dates
    : Array.isArray(payload?.results)
      ? payload.results
      : [];
  for (const row of flatRows) {
    const record = normalizeProjectDatesRecord(row);
    if (
      record &&
      String(record.date_type ?? '').toUpperCase() === 'CONTRACTOR' &&
      !contractors.some((c: ProjectDatesRecord) => c.id && record.id && c.id === record.id)
    ) {
      contractors.push(record);
    }
  }

  const bundle: ProjectDatesByProject = {
    project_name: payload?.project_name ?? payload?.projectName ?? projectName,
    scl: normalizeProjectDatesRecord(payload?.scl),
    contractor: contractors[0] ?? legacyContractor,
    contractors,
    ...(bundleBg ? { bg_status: bundleBg } : {}),
    contractor_bg: bgBundle.contractor_bg,
    scl_bg: bgBundle.scl_bg,
    bg_summary: bgBundle.bg_summary,
  };

  return mergeBgStatusIntoProjectDatesBundle(bundle, bundleBg);
}

export const projectDatesApi = {
  /** GET /api/project-dates/project/{projectName}/ */
  getByProject: (projectName: string) =>
    api.get(API_ENDPOINTS.PROJECT_DATES.PROJECT(projectName)),

  /** GET /api/project-dates/project/{projectName}/bg-status/ — multi-entry BG module */
  getBgStatusBundle: async (projectName: string) => {
    const res = await api.get(API_ENDPOINTS.PROJECT_DATES.BG_STATUS(projectName));
    const raw = (res.data as Record<string, unknown>)?.data ?? res.data;
    return { ...res, data: normalizeBgStatusBundle(raw) };
  },

  /** @deprecated Use getBgStatusBundle — legacy single-status shape */
  getBgStatus: async (projectName: string) => {
    const res = await api.get(
      API_ENDPOINTS.PROJECT_DATES.BG_STATUS(projectName),
    );
    const raw = (res.data as Record<string, unknown>)?.data ?? res.data;
    return { ...res, data: normalizeProjectDatesBgStatus(raw) };
  },

  /** POST /api/project-dates/project/{projectName}/bg-status/ — create BG entry */
  createBgEntry: async (
    projectName: string,
    data: import('../types/bgStatus').CreateBGPayload,
  ) => {
    const res = await api.post(
      API_ENDPOINTS.PROJECT_DATES.BG_STATUS(projectName),
      data,
    );
    const raw = (res.data as Record<string, unknown>)?.data ?? res.data;
    return { ...res, data: normalizeBgEntry(raw) };
  },

  /** PATCH /api/project-dates/bg-status/{id}/ */
  patchBgEntry: async (
    id: string | number,
    data: import('../types/bgStatus').UpdateBGPayload,
  ) => {
    const res = await api.patch(
      API_ENDPOINTS.PROJECT_DATES.BG_STATUS_DETAIL(id),
      data,
    );
    const raw = (res.data as Record<string, unknown>)?.data ?? res.data;
    return { ...res, data: normalizeBgEntry(raw) };
  },

  /** DELETE /api/project-dates/bg-status/{id}/ */
  deleteBgEntry: (id: string | number) =>
    api.delete(API_ENDPOINTS.PROJECT_DATES.BG_STATUS_DETAIL(id)),

  /** @deprecated Legacy bulk save */
  saveBgStatus: async (projectName: string, data: ProjectDatesBgStatusPayload) => {
    const res = await api.post(
      API_ENDPOINTS.PROJECT_DATES.BG_STATUS(projectName),
      data,
    );
    const raw = (res.data as Record<string, unknown>)?.data ?? res.data;
    return { ...res, data: normalizeProjectDatesBgStatus(raw) };
  },

  /** @deprecated Legacy bulk update */
  updateBgStatus: async (projectName: string, data: ProjectDatesBgStatusPayload) => {
    const res = await api.patch(
      API_ENDPOINTS.PROJECT_DATES.BG_STATUS(projectName),
      data,
    );
    const raw = (res.data as Record<string, unknown>)?.data ?? res.data;
    return { ...res, data: normalizeProjectDatesBgStatus(raw) };
  },

  /** POST /api/project-dates/ */
  create: (data: ProjectDatesPayload) =>
    api.post(API_ENDPOINTS.PROJECT_DATES.LIST, data),

  /** PATCH /api/project-dates/{id}/ */
  patch: (id: string | number, data: Partial<ProjectDatesPayload>) =>
    api.patch(API_ENDPOINTS.PROJECT_DATES.DETAIL(id), data),

  /** DELETE /api/project-dates/{id}/ */
  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.PROJECT_DATES.DETAIL(id)),
};

export const plannedEarnedValueApi = {
  /** GET /api/planned-earned-value/?project_name=... */
  getAll: (params?: {
    project_name?: string;
    page?: number;
    page_size?: number;
  }) => api.get(API_ENDPOINTS.PLANNED_EARNED_VALUE.LIST, { params }),

  /** GET /api/planned-earned-value/{id}/ */
  getById: (id: string | number) =>
    api.get(API_ENDPOINTS.PLANNED_EARNED_VALUE.DETAIL(id)),

  /** GET /api/planned-earned-value/project/{projectName}/ */
  getByProject: (projectName: string) =>
    api.get(API_ENDPOINTS.PLANNED_EARNED_VALUE.PROJECT(projectName)),

  /** GET /api/planned-earned-value/project/{projectName}/month/{month}/year/{year}/ */
  getByProjectMonthYear: (projectName: string, month: number, year: number) =>
    api.get(
      API_ENDPOINTS.PLANNED_EARNED_VALUE.BY_MONTH_YEAR(
        projectName,
        month,
        year,
      ),
    ),

  /** POST /api/planned-earned-value/ */
  create: (data: PlannedEarnedValuePayload) =>
    api.post(API_ENDPOINTS.PLANNED_EARNED_VALUE.LIST, data),

  /** POST /api/planned-earned-value/ — SCL + Contractor for project/month/year */
  saveByPeriod: (data: PlannedEarnedPeriodPayload) =>
    api.post(
      API_ENDPOINTS.PLANNED_EARNED_VALUE.LIST,
      toPlannedEarnedPeriodPayload(data),
    ),

  /** PUT period bundle — project/month/year */
  updateByProjectMonthYear: (
    projectName: string,
    month: number,
    year: number,
    data: PlannedEarnedPeriodPayload,
  ) =>
    api.put(
      API_ENDPOINTS.PLANNED_EARNED_VALUE.BY_MONTH_YEAR(
        projectName,
        month,
        year,
      ),
      toPlannedEarnedPeriodPayload(data),
    ),

  /** PATCH period bundle — project/month/year */
  patchByProjectMonthYear: (
    projectName: string,
    month: number,
    year: number,
    data: PlannedEarnedPeriodPayload,
  ) =>
    api.patch(
      API_ENDPOINTS.PLANNED_EARNED_VALUE.BY_MONTH_YEAR(
        projectName,
        month,
        year,
      ),
      toPlannedEarnedPeriodPayload(data),
    ),

  /** PUT /api/planned-earned-value/{id}/ */
  update: (id: string | number, data: PlannedEarnedValuePayload) =>
    api.put(API_ENDPOINTS.PLANNED_EARNED_VALUE.DETAIL(id), data),

  /** PATCH /api/planned-earned-value/{id}/ */
  patch: (id: string | number, data: Partial<PlannedEarnedValuePayload>) =>
    api.patch(API_ENDPOINTS.PLANNED_EARNED_VALUE.DETAIL(id), data),

  /** DELETE /api/planned-earned-value/{id}/ */
  delete: (id: string | number) =>
    api.delete(API_ENDPOINTS.PLANNED_EARNED_VALUE.DETAIL(id)),
};

async function updatePlannedEarnedPeriodBundle(
  data: PlannedEarnedPeriodPayload,
): Promise<PlannedEarnedByPeriodResponse> {
  try {
    const response = await plannedEarnedValueApi.updateByProjectMonthYear(
      data.projectName,
      data.month,
      data.year,
      data,
    );
    return normalizePlannedEarnedByPeriod(response.data, data.projectName);
  } catch (putErr) {
    const putStatus = (putErr as { response?: { status?: number } })?.response
      ?.status;
    if (!shouldFallbackToPatchAfterPut(putStatus)) throw putErr;

    try {
      const response = await plannedEarnedValueApi.patchByProjectMonthYear(
        data.projectName,
        data.month,
        data.year,
        data,
      );
      return normalizePlannedEarnedByPeriod(response.data, data.projectName);
    } catch (patchErr) {
      if (isMethodNotAllowedError(patchErr)) throw putErr;
      throw patchErr;
    }
  }
}

async function updatePlannedEarnedPartyRecords(
  data: PlannedEarnedPeriodPayload,
  existing: PlannedEarnedByPeriodResponse,
): Promise<PlannedEarnedByPeriodResponse> {
  const updates: Array<{
    id: string | number;
    payload: PlannedEarnedValuePayload;
  }> = [];

  if (existing.scl?.id != null) {
    updates.push({
      id: existing.scl.id,
      payload: {
        projectName: data.projectName,
        plannedValue: data.scl.plannedValue,
        earnedValue: data.scl.earnedValue,
      },
    });
  }

  if (existing.contractor?.id != null) {
    updates.push({
      id: existing.contractor.id,
      payload: {
        projectName: data.projectName,
        plannedValue: data.contractor.plannedValue,
        earnedValue: data.contractor.earnedValue,
      },
    });
  }

  for (const { id, payload } of updates) {
    await updateExistingFinancialRecord(
      id,
      payload as unknown as Record<string, unknown>,
      (recordId) => plannedEarnedValueApi.update(recordId, payload),
      (recordId) => plannedEarnedValueApi.patch(recordId, payload),
    );
  }

  const refetch = await plannedEarnedValueApi.getByProjectMonthYear(
    data.projectName,
    data.month,
    data.year,
  );
  return normalizePlannedEarnedByPeriod(refetch.data, data.projectName);
}

async function resolvePlannedEarnedPeriod(
  data: PlannedEarnedPeriodPayload,
): Promise<PlannedEarnedByPeriodResponse | null> {
  try {
    const response = await plannedEarnedValueApi.getByProjectMonthYear(
      data.projectName,
      data.month,
      data.year,
    );
    return normalizePlannedEarnedByPeriod(response.data, data.projectName);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    if (status === 404) return null;
    throw error;
  }
}

export async function savePlannedEarnedByPeriod(
  data: PlannedEarnedPeriodPayload,
): Promise<PlannedEarnedByPeriodResponse> {
  const existing = await resolvePlannedEarnedPeriod(data);
  const hasExisting = Boolean(existing?.scl?.id || existing?.contractor?.id);

  if (hasExisting && existing) {
    try {
      return await updatePlannedEarnedPeriodBundle(data);
    } catch (bundleErr) {
      if (
        !isMethodNotAllowedError(bundleErr) &&
        !isMissingEndpointError(bundleErr)
      ) {
        throw bundleErr;
      }
      return updatePlannedEarnedPartyRecords(data, existing);
    }
  }

  try {
    const response = await plannedEarnedValueApi.saveByPeriod(data);
    return normalizePlannedEarnedByPeriod(response.data, data.projectName);
  } catch (error) {
    if (!isDuplicateFinancialError(error)) throw error;
    const resolved = (await resolvePlannedEarnedPeriod(data)) ?? existing;
    if (!resolved?.scl?.id && !resolved?.contractor?.id) throw error;
    try {
      return await updatePlannedEarnedPeriodBundle(data);
    } catch {
      return updatePlannedEarnedPartyRecords(data, resolved);
    }
  }
}

// ─── Drawing Register (per-drawing client report) ─────────────────────────────

function normalizeDrawingClientReportRow(row: unknown): DrawingClientReportRow {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    id: r.id != null ? toNum(r.id) : undefined,
    srNo: toNum(r.sr_no ?? r.srNo),
    designAndDrawing: String(
      r.design_and_drawing ??
      r.designAndDrawing ??
      r.drawing_name ??
      r.drawingName ??
      "",
    ),
    submissionByContractor: (r.submission_by_contractor ??
      r.submissionByContractor ??
      r.submitted_date ??
      r.submittedDate ??
      null) as string | null,
    consultantCommentsDate: (r.consultant_comments_date ??
      r.consultantCommentsDate ??
      null) as string | null,
    resubmissionDate: (r.resubmission_date ??
      r.resubmissionDate ??
      r.resubmitted_date ??
      r.resubmittedDate ??
      null) as string | null,
    approvedByConsultant: (r.approved_by_consultant ??
      r.approvedByConsultant ??
      r.approved_date ??
      r.approvedDate ??
      null) as string | null,
    remarks: String(r.remarks ?? ""),
    revision:
      r.revision != null && r.revision !== "" ? toNum(r.revision) : null,
    contractorName: (r.contractor_name ?? r.contractorName ?? null) as
      | string
      | null,
    projectName: String(r.project_name ?? r.projectName ?? ""),
  };
}

function buildDrawingClientReportSummary(
  rows: DrawingClientReportRow[],
): DrawingClientReportData["summary"] {
  const submittedDrawings = rows.length;
  const approvedDrawings = rows.filter((row) =>
    Boolean(row.approvedByConsultant),
  ).length;
  const variance = submittedDrawings - approvedDrawings;
  const approvalRate =
    submittedDrawings > 0
      ? Number(((approvedDrawings / submittedDrawings) * 100).toFixed(1))
      : 0;
  return { submittedDrawings, approvedDrawings, variance, approvalRate };
}

export type DrawingClientReportContext = {
  projectName?: string;
  month?: number;
  year?: number;
  view?: DrawingClientReportData["view"];
};

export function normalizeDrawingClientReport(
  raw: unknown,
  context: DrawingClientReportContext = {},
): DrawingClientReportData {
  const normalizeRows = (rows: unknown[]): DrawingClientReportRow[] =>
    rows.map((row, index) => {
      const normalized = normalizeDrawingClientReportRow(row);
      return {
        ...normalized,
        srNo: normalized.srNo > 0 ? normalized.srNo : index + 1,
        projectName: normalized.projectName || context.projectName || "",
      };
    });

  if (Array.isArray(raw)) {
    const rows = normalizeRows(raw);
    return {
      view: context.view ?? "monthly",
      fromDate: "",
      toDate: "",
      month: context.month ?? 0,
      year: context.year ?? 0,
      projectName: context.projectName ?? rows[0]?.projectName ?? "",
      summary: buildDrawingClientReportSummary(rows),
      rows,
    };
  }

  const d = (raw ?? {}) as Record<string, unknown>;
  const summaryRaw = (d.summary ?? {}) as Record<string, unknown>;
  const rowSource = Array.isArray(d.rows)
    ? d.rows
    : Array.isArray(d.results)
      ? d.results
      : Array.isArray(d.register_rows)
        ? d.register_rows
        : [];
  const rows = normalizeRows(rowSource);

  const submittedDrawings = toNum(
    summaryRaw.submitted_drawings ??
    summaryRaw.submittedDrawings ??
    rows.length,
  );
  const approvedDrawings = toNum(
    summaryRaw.approved_drawings ??
    summaryRaw.approvedDrawings ??
    rows.filter((row) => row.approvedByConsultant).length,
  );
  const variance = toNum(
    summaryRaw.variance ?? submittedDrawings - approvedDrawings,
  );
  const approvalRate =
    summaryRaw.approval_rate != null || summaryRaw.approvalRate != null
      ? toNum(summaryRaw.approval_rate ?? summaryRaw.approvalRate)
      : submittedDrawings > 0
        ? Number(((approvedDrawings / submittedDrawings) * 100).toFixed(1))
        : 0;

  return {
    view: (d.view ??
      context.view ??
      "monthly") as DrawingClientReportData["view"],
    fromDate: String(d.from_date ?? d.fromDate ?? ""),
    toDate: String(d.to_date ?? d.toDate ?? ""),
    month: toNum(d.month ?? context.month),
    year: toNum(d.year ?? context.year),
    projectName: String(
      d.project_name ??
      d.projectName ??
      context.projectName ??
      rows[0]?.projectName ??
      "",
    ),
    summary: { submittedDrawings, approvedDrawings, variance, approvalRate },
    rows,
  };
}

export type DrawingRegisterClientReportParams = {
  projectName: string;
  month: number;
  year: number;
  view: "monthly" | "cumulative";
  contractor?: string;
  status?: string;
  search?: string;
};

function drawingRegisterReportParams(
  params: DrawingRegisterClientReportParams,
  options?: { exportCsv?: boolean; exportExcel?: boolean },
): Record<string, string | number> {
  const exportFormat = options?.exportExcel
    ? "excel"
    : options?.exportCsv
      ? "csv"
      : undefined;
  return {
    format: "client",
    project_name: params.projectName,
    month: params.month,
    year: params.year,
    view: params.view,
    ...(exportFormat ? { export: exportFormat } : {}),
    ...(params.contractor ? { contractor: params.contractor } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.search ? { search: params.search } : {}),
  };
}

type DrawingRegisterRequestOptions = {
  exportCsv?: boolean;
  exportExcel?: boolean;
  responseType?: "json" | "blob";
};

async function fetchDrawingRegisterClientReport(
  params: DrawingRegisterClientReportParams,
  options?: DrawingRegisterRequestOptions,
) {
  const queryParams = drawingRegisterReportParams(params, options);
  const axiosConfig = {
    params: queryParams,
    ...(options?.responseType === "blob"
      ? { responseType: "blob" as const }
      : {}),
  };

  const endpoints = [
    API_ENDPOINTS.DRAWINGS.REGISTER_LIST,
    API_ENDPOINTS.DRAWINGS.REGISTER_CLIENT_REPORT,
  ];

  let lastError: unknown;
  for (const url of endpoints) {
    try {
      return await api.get(url, axiosConfig);
    } catch (error) {
      lastError = error;
      if (!axios.isAxiosError(error)) throw error;
      const status = error.response?.status;
      if (status !== 404 && status !== 405) throw error;
      console.warn(
        `[DrawingRegister] ${url} returned ${status}, trying alternate endpoint...`,
      );
    }
  }

  throw lastError ?? new Error("Failed to load drawing register");
}

export type DrawingRegisterCreatePayload = {
  projectName: string;
  drawingName: string;
  contractorName?: string;
  revision?: number;
  remarks?: string;
  submittedDate?: string;
  consultantCommentsDate?: string;
  resubmittedDate?: string;
  approvedDate?: string;
  workflowEvents?: { action: string; eventDate: string }[];
};

export type DrawingRegisterUpdatePayload = {
  remarks?: string;
  submittedDate?: string;
  consultantCommentsDate?: string;
  resubmittedDate?: string;
  approvedDate?: string;
  contractorName?: string;
  revision?: number;
};

function toDrawingRegisterCreateBody(
  data: DrawingRegisterCreatePayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    project_name: data.projectName,
    drawing_name: data.drawingName,
  };
  if (data.contractorName) body.contractor_name = data.contractorName;
  if (data.revision !== undefined) body.revision = data.revision;
  if (data.remarks) body.remarks = data.remarks;
  if (data.workflowEvents?.length) {
    body.workflow_events = data.workflowEvents.map((event) => ({
      action: event.action,
      event_date: event.eventDate,
    }));
  } else {
    if (data.submittedDate) body.submitted_date = data.submittedDate;
    if (data.consultantCommentsDate)
      body.consultant_comments_date = data.consultantCommentsDate;
    if (data.resubmittedDate) body.resubmitted_date = data.resubmittedDate;
    if (data.approvedDate) body.approved_date = data.approvedDate;
  }
  return body;
}

function toDrawingRegisterUpdateBody(
  data: DrawingRegisterUpdatePayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.remarks !== undefined) body.remarks = data.remarks;
  if (data.submittedDate !== undefined)
    body.submitted_date = data.submittedDate;
  if (data.consultantCommentsDate !== undefined)
    body.consultant_comments_date = data.consultantCommentsDate;
  if (data.resubmittedDate !== undefined)
    body.resubmitted_date = data.resubmittedDate;
  if (data.approvedDate !== undefined) body.approved_date = data.approvedDate;
  if (data.contractorName !== undefined)
    body.contractor_name = data.contractorName;
  if (data.revision !== undefined) body.revision = data.revision;
  return body;
}

export function normalizeDrawingRegisterRow(
  row: unknown,
  projectName = "",
): DrawingRegisterRow {
  const r = (row ?? {}) as Record<string, unknown>;
  const workflowRaw = r.workflow_events ?? r.workflowEvents;
  const workflowEvents: DrawingWorkflowEvent[] = Array.isArray(workflowRaw)
    ? workflowRaw.map((event) => {
      const e = (event ?? {}) as Record<string, unknown>;
      return {
        id: e.id != null ? toNum(e.id) : undefined,
        action: String(e.action ?? "") as DrawingWorkflowAction,
        eventDate: String(e.event_date ?? e.eventDate ?? ""),
        notes: e.notes != null ? String(e.notes) : undefined,
        createdAt:
          e.created_at != null
            ? String(e.created_at)
            : e.createdAt != null
              ? String(e.createdAt)
              : undefined,
      };
    })
    : [];

  const clientRowRaw = r.client_row ?? r.clientRow;
  const clientRow =
    clientRowRaw && typeof clientRowRaw === "object"
      ? normalizeDrawingClientReport({ rows: [clientRowRaw] }).rows[0]
      : undefined;

  return {
    id: r.id != null ? toNum(r.id) : undefined,
    srNo:
      r.sr_no != null || r.srNo != null ? toNum(r.sr_no ?? r.srNo) : undefined,
    projectName: String(r.project_name ?? r.projectName ?? projectName),
    drawingName: String(
      r.drawing_name ??
      r.drawingName ??
      r.design_and_drawing ??
      r.designAndDrawing ??
      "",
    ),
    contractorName: (r.contractor_name ?? r.contractorName ?? null) as
      | string
      | null,
    revision:
      r.revision != null && r.revision !== "" ? toNum(r.revision) : null,
    remarks: r.remarks != null ? String(r.remarks) : undefined,
    submittedDate: (r.submitted_date ?? r.submittedDate ?? null) as
      | string
      | null,
    consultantCommentsDate: (r.consultant_comments_date ??
      r.consultantCommentsDate ??
      null) as string | null,
    resubmittedDate: (r.resubmitted_date ?? r.resubmittedDate ?? null) as
      | string
      | null,
    approvedDate: (r.approved_date ?? r.approvedDate ?? null) as string | null,
    workflowEvents,
    clientRow,
    createdAt:
      r.created_at != null
        ? String(r.created_at)
        : r.createdAt != null
          ? String(r.createdAt)
          : undefined,
    updatedAt:
      r.updated_at != null
        ? String(r.updated_at)
        : r.updatedAt != null
          ? String(r.updatedAt)
          : undefined,
  };
}

export function normalizeDrawingRegisterList(
  raw: unknown,
  projectName = "",
): DrawingRegisterRow[] {
  if (Array.isArray(raw)) {
    return raw.map((row) => normalizeDrawingRegisterRow(row, projectName));
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.data && typeof obj.data === "object") {
      const inner = obj.data as Record<string, unknown>;
      if (Array.isArray(inner.results)) {
        return inner.results.map((row) =>
          normalizeDrawingRegisterRow(row, projectName),
        );
      }
    }
    if (Array.isArray(obj.results)) {
      return obj.results.map((row) =>
        normalizeDrawingRegisterRow(row, projectName),
      );
    }
  }
  return unwrapList(raw).map((row) =>
    normalizeDrawingRegisterRow(row, projectName),
  );
}

export function unwrapDrawingApiEnvelope<T>(
  raw: unknown,
  fallbackMessage = "Request failed",
): T {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.success === false) {
      throw new Error(String(obj.message ?? fallbackMessage));
    }
    if (obj.data !== undefined && obj.data !== null) {
      return obj.data as T;
    }
  }
  return raw as T;
}

export async function parseDrawingRegisterExportBlob(
  data: unknown,
): Promise<Blob> {
  const excelMime =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!(data instanceof Blob)) {
    return new Blob([String(data ?? "")], { type: excelMime });
  }
  const contentType = (data.type || "").toLowerCase();
  if (
    contentType.includes("application/json") ||
    (contentType.includes("text/") && data.size < 8192)
  ) {
    const text = await data.text();
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      throw new Error(
        String(parsed.message ?? parsed.detail ?? "Excel export failed"),
      );
    } catch (err) {
      if (err instanceof Error && err.message !== "Excel export failed")
        throw err;
      throw new Error(text || "Excel export failed");
    }
  }
  return data;
}

export async function parseDrawingRegisterCsvBlob(
  data: unknown,
): Promise<Blob> {
  if (!(data instanceof Blob)) {
    return new Blob([String(data ?? "")], { type: "text/csv" });
  }
  const contentType = (data.type || "").toLowerCase();
  if (contentType.includes("application/json")) {
    const text = await data.text();
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      throw new Error(
        String(parsed.message ?? parsed.detail ?? "CSV export failed"),
      );
    } catch (err) {
      if (err instanceof Error && err.message !== "CSV export failed")
        throw err;
      throw new Error(text || "CSV export failed");
    }
  }
  return data;
}

export const drawingRegisterApi = {
  /** Client report table — tries /drawings/summary/, /drawings/register/, then project summary */
  getClientReport: async (params: DrawingRegisterClientReportParams) => {
    const res = await fetchDrawingRegisterClientReport(params);
    const payload = unwrapDrawingApiEnvelope(
      res.data,
      "Failed to load drawing register",
    );
    return {
      ...res,
      data: normalizeDrawingClientReport(payload, {
        projectName: params.projectName,
        month: params.month,
        year: params.year,
        view: params.view,
      }),
    };
  },

  /** Excel export — GET with format=client&export=excel */
  exportExcel: async (params: DrawingRegisterClientReportParams) => {
    const res = await fetchDrawingRegisterClientReport(params, {
      exportExcel: true,
      responseType: "blob",
    });
    const blob = await parseDrawingRegisterExportBlob(res.data);
    return { ...res, data: blob };
  },

  /** @deprecated Prefer exportExcel — CSV export kept for compatibility */
  exportCSV: async (params: DrawingRegisterClientReportParams) => {
    const res = await fetchDrawingRegisterClientReport(params, {
      exportCsv: true,
      responseType: "blob",
    });
    const blob = await parseDrawingRegisterCsvBlob(res.data);
    return { ...res, data: blob };
  },

  /** Raw register rows — GET /drawings/register/?project_name=... */
  listRegisterRows: async (projectName: string) => {
    const res = await api.get(API_ENDPOINTS.DRAWINGS.REGISTER_LIST, {
      params: { project_name: projectName },
    });
    return {
      ...res,
      data: normalizeDrawingRegisterList(
        unwrapDrawingApiEnvelope(res.data, "Failed to load register rows"),
        projectName,
      ),
    };
  },

  createRegisterRow: async (data: DrawingRegisterCreatePayload) => {
    const res = await api.post(
      API_ENDPOINTS.DRAWINGS.REGISTER_CREATE,
      toDrawingRegisterCreateBody(data),
    );
    return {
      ...res,
      data: normalizeDrawingRegisterRow(
        unwrapDrawingApiEnvelope(res.data, "Failed to create drawing record"),
        data.projectName,
      ),
    };
  },

  updateRegisterRow: async (
    id: string | number,
    data: DrawingRegisterUpdatePayload,
  ) => {
    const res = await api.patch(
      API_ENDPOINTS.DRAWINGS.REGISTER_UPDATE(id),
      toDrawingRegisterUpdateBody(data),
    );
    return {
      ...res,
      data: normalizeDrawingRegisterRow(
        unwrapDrawingApiEnvelope(res.data, "Failed to update drawing record"),
      ),
    };
  },

  deleteRegisterRow: async (id: string | number) => {
    const res = await api.delete(API_ENDPOINTS.DRAWINGS.REGISTER_DELETE(id));
    if (res.data && typeof res.data === "object") {
      const obj = res.data as Record<string, unknown>;
      if (obj.success === false) {
        throw new Error(
          String(obj.message ?? "Failed to delete drawing record"),
        );
      }
    }
    return res;
  },

  getRegisterRow: async (id: string | number) => {
    const res = await api.get(API_ENDPOINTS.DRAWINGS.REGISTER_DETAIL(id));
    return {
      ...res,
      data: normalizeDrawingRegisterRow(
        unwrapDrawingApiEnvelope(res.data, "Failed to load drawing record"),
      ),
    };
  },
};

// ─── Frequency Chart (material testing) ──────────────────────────────────────

type FrequencyChartClientReportParams = {
  projectName: string;
  month: number;
  year: number;
  view: "monthly" | "cumulative";
  activity?: string;
  testType?: string;
  contractor?: string;
  search?: string;
};

function frequencyChartReportParams(
  params: FrequencyChartClientReportParams,
  options?: { exportExcel?: boolean },
): Record<string, string | number> {
  return {
    format: "client",
    project_name: params.projectName,
    month: params.month,
    year: params.year,
    view: params.view,
    ...(options?.exportExcel ? { export: "excel" } : {}),
    ...(params.activity ? { activity: params.activity } : {}),
    ...(params.testType ? { test_type: params.testType } : {}),
    ...(params.contractor ? { contractor: params.contractor } : {}),
    ...(params.search ? { search: params.search } : {}),
  };
}

type FrequencyChartCreatePayload = {
  projectName: string;
  month: number;
  year: number;
  itemDescription: string;
  typeOfTest: string;
  unit: string;
  qtyPreviousBill?: number;
  qtyThisBill?: number;
  fieldLabPreviousBill?: number;
  fieldLabThisBill?: number;
  thirdPartyPreviousBill?: number;
  thirdPartyThisBill?: number;
  remarks?: string;
  activityName?: string;
  contractorName?: string;
};

type FrequencyChartUpdatePayload = {
  qtyThisBill?: number;
  fieldLabThisBill?: number;
  thirdPartyThisBill?: number;
  remarks?: string;
  activityName?: string;
  contractorName?: string;
};

function toFrequencyChartCreateBody(
  data: FrequencyChartCreatePayload,
): Record<string, unknown> {
  return {
    project_name: data.projectName,
    month: data.month,
    year: data.year,
    item_description: data.itemDescription,
    type_of_test: data.typeOfTest,
    unit: data.unit,
    qty_previous_bill: data.qtyPreviousBill ?? 0,
    qty_this_bill: data.qtyThisBill ?? 0,
    field_lab_previous_bill: data.fieldLabPreviousBill ?? 0,
    field_lab_this_bill: data.fieldLabThisBill ?? 0,
    third_party_previous_bill: data.thirdPartyPreviousBill ?? 0,
    third_party_this_bill: data.thirdPartyThisBill ?? 0,
    ...(data.remarks ? { remarks: data.remarks } : {}),
    ...(data.activityName ? { activity_name: data.activityName } : {}),
    ...(data.contractorName ? { contractor_name: data.contractorName } : {}),
  };
}

function toFrequencyChartUpdateBody(
  data: FrequencyChartUpdatePayload,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.qtyThisBill !== undefined) body.qty_this_bill = data.qtyThisBill;
  if (data.fieldLabThisBill !== undefined)
    body.field_lab_this_bill = data.fieldLabThisBill;
  if (data.thirdPartyThisBill !== undefined)
    body.third_party_this_bill = data.thirdPartyThisBill;
  if (data.remarks !== undefined) body.remarks = data.remarks;
  if (data.activityName !== undefined) body.activity_name = data.activityName;
  if (data.contractorName !== undefined)
    body.contractor_name = data.contractorName;
  return body;
}

export async function parseFrequencyChartExportBlob(
  data: unknown,
): Promise<Blob> {
  const excelMime =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!(data instanceof Blob)) {
    return new Blob([String(data ?? "")], { type: excelMime });
  }
  const contentType = (data.type || "").toLowerCase();
  if (
    contentType.includes("application/json") ||
    (contentType.includes("text/") && data.size < 8192)
  ) {
    const text = await data.text();
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      throw new Error(
        String(parsed.message ?? parsed.detail ?? "Excel export failed"),
      );
    } catch (err) {
      if (err instanceof Error && err.message !== "Excel export failed")
        throw err;
      throw new Error(text || "Excel export failed");
    }
  }
  return data;
}

export const frequencyChartApi = {
  getClientReport: (params: FrequencyChartClientReportParams) =>
    api.get(API_ENDPOINTS.FREQUENCY_CHART.CLIENT_REPORT, {
      params: frequencyChartReportParams(params),
    }),

  /** Excel export — GET /frequency-chart/?format=client&export=excel&... */
  exportExcel: async (params: FrequencyChartClientReportParams) => {
    const res = await api.get(API_ENDPOINTS.FREQUENCY_CHART.CLIENT_REPORT, {
      params: frequencyChartReportParams(params, { exportExcel: true }),
      responseType: "blob",
    });
    const blob = await parseFrequencyChartExportBlob(res.data);
    return { ...res, data: blob };
  },

  createRegisterRow: (data: FrequencyChartCreatePayload) =>
    api.post(
      API_ENDPOINTS.FREQUENCY_CHART.REGISTER_CREATE,
      toFrequencyChartCreateBody(data),
    ),

  updateRegisterRow: (id: string | number, data: FrequencyChartUpdatePayload) =>
    api.patch(
      API_ENDPOINTS.FREQUENCY_CHART.REGISTER_UPDATE(id),
      toFrequencyChartUpdateBody(data),
    ),

  deleteRegisterRow: (id: string | number) =>
    api.delete(API_ENDPOINTS.FREQUENCY_CHART.REGISTER_DELETE(id)),
};

// Project Logs API (Issues/Concerns + Risks/Actions) — uses /project-logs/<project_id>/
export const projectLogsApi = {
  getProjectLogs: (projectId: string) =>
    api.get(API_ENDPOINTS.PROJECT_LOGS.DETAIL(projectId)),
  updateProjectLogs: (projectId: string, data: any) =>
    api.put(API_ENDPOINTS.PROJECT_LOGS.DETAIL(projectId), data),
  patchProjectLogs: (projectId: string, data: any) =>
    api.patch(API_ENDPOINTS.PROJECT_LOGS.DETAIL(projectId), data),
};

// Notification API
export const notificationApi = {
  sendNotification: (type: string, params: Record<string, any>) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, {
      type,
      ...params,
    });
  },
  // Convenience methods for specific notifications
  sendProjectCreatedNotification: (projectId: string | number) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, {
      type: "project_created",
      project_id: projectId,
    });
  },
  sendTeamLeadAssignedNotification: (
    projectId: string | number,
    userId: number,
  ) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, {
      type: "project_assigned",
      project_id: projectId,
      user_id: userId,
    });
  },
  sendSiteEngineerAssignedNotification: (
    projectId: string | number,
    userId: number,
    roleType?: string,
  ) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, {
      type: "site_engineer_assigned",
      project_id: projectId,
      user_id: userId,
    });
  },
  sendDPRSubmittedNotification: (dprId: string | number) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, {
      type: "dpr_submitted",
      dpr_id: dprId,
    });
  },
  sendDPRApprovedNotification: (dprId: string | number) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, {
      type: "dpr_approved",
      dpr_id: dprId,
    });
  },
  sendDPRRejectedNotification: (dprId: string | number) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, {
      type: "dpr_rejected",
      dpr_id: dprId,
    });
  },
};
export default api;
