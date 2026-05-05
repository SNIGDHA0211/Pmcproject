import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS, getApiBaseUrl } from '../config/apiConfig';

/** DRF list responses are often `{ count, next, previous, results }` instead of a bare array. */
export function unwrapList<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Use API configuration from centralized config file
const API_BASE_URL = getApiBaseUrl('main');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication interceptor to add Basic auth to requests
api.interceptors.request.use(
  (config) => {
    const auth = localStorage.getItem('basicAuth');
    if (auth) {
      config.headers.Authorization = `Basic ${auth}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API for login (doesn't require auth header)
export const authApi = {
  login: (credentials: any) => {
    const auth = btoa(`${credentials.username}:${credentials.password}`);
    return api.get(API_ENDPOINTS.AUTH.LOGIN, {
      headers: { Authorization: `Basic ${auth}` }
    });
  },
  getUserProfile: () => api.get(API_ENDPOINTS.AUTH.PROFILE),
};

export const projectApi = {
  getProjects: () => api.get(API_ENDPOINTS.PROJECTS.LIST),
  getProject: (id: string) => api.get(API_ENDPOINTS.PROJECTS.DETAIL(id)),
  createProject: (data: any) => {
    return api.post(API_ENDPOINTS.PROJECTS.LIST, data);
  },
  getSites: (projectId?: string) => {
    const url = projectId ? `${API_ENDPOINTS.PROJECTS.SITES}?project_id=${projectId}` : API_ENDPOINTS.PROJECTS.SITES;
    return api.get(url);
  },
  getProjectDocuments: () => api.get(API_ENDPOINTS.PROJECTS.DOCUMENTS),
  importDashboardData: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(API_ENDPOINTS.PROJECTS.IMPORT_DASHBOARD(projectId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getDashboardData: (projectId: string) => {
    return api.get(API_ENDPOINTS.PROJECTS.DASHBOARD_DATA(projectId));
  },
  getAvailableUsers: (role?: string) => {
    const url = role ? `${API_ENDPOINTS.PROJECTS.AVAILABLE_USERS}?role=${role}` : API_ENDPOINTS.PROJECTS.AVAILABLE_USERS;
    return api.get(url);
  },
  assignTeamLead: (projectId: string, userId: number) => {
    return api.post(API_ENDPOINTS.PROJECTS.ASSIGN_TEAM_LEAD(projectId), { user_id: userId });
  },
  assignCoordinator: (projectId: string, userId: number) => {
    return api.post(API_ENDPOINTS.PROJECTS.ASSIGN_COORDINATOR(projectId), { user_id: userId });
  },
  addSiteEngineers: (projectId: string, userIds: number[]) => {
    return api.post(API_ENDPOINTS.PROJECTS.ADD_SITE_ENGINEERS(projectId), { user_ids: userIds });
  },
  addBillingSiteEngineer: (projectId: string, userId: number) => {
    return api.post(API_ENDPOINTS.PROJECTS.ADD_BILLING_ENGINEER(projectId), { user_id: userId });
  },
  addQAQCSiteEngineer: (projectId: string, userId: number) => {
    return api.post(API_ENDPOINTS.PROJECTS.ADD_QAQC_ENGINEER(projectId), { user_id: userId });
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
    const url = siteId ? `${API_ENDPOINTS.OPERATIONS.TASKS}?site_id=${siteId}` : API_ENDPOINTS.OPERATIONS.TASKS;
    return api.get(url);
  },
  getReports: (taskId?: string) => {
    const url = taskId ? `${API_ENDPOINTS.OPERATIONS.REPORTS}?task_id=${taskId}` : API_ENDPOINTS.OPERATIONS.REPORTS;
    return api.get(url);
  },
  getSubmittedDocuments: (status?: string, projectId?: string) => {
    let url = API_ENDPOINTS.OPERATIONS.SUBMITTED_DOCUMENTS;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (projectId) params.append('project_id', projectId);
    if (params.toString()) url += `?${params.toString()}`;
    return api.get(url);
  },
  submitReport: async (reportData: any) => {
    const response = await api.post(API_ENDPOINTS.OPERATIONS.REPORTS, reportData);
    return response;
  },
  approveReport: (reportId: string) => api.post(API_ENDPOINTS.OPERATIONS.APPROVE_REPORT(reportId)),
  rejectReport: (reportId: string, reason: string) => api.post(API_ENDPOINTS.OPERATIONS.REJECT_REPORT(reportId), { reason }),
};

// Separate axios instance for DPR API (uses different base URL from config)
const dprApiInstance = axios.create({
  baseURL: getApiBaseUrl('dpr'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication interceptor to DPR API instance
dprApiInstance.interceptors.request.use(
  (config) => {
    const auth = localStorage.getItem('basicAuth');
    if (auth) {
      config.headers.Authorization = `Basic ${auth}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const dprApi = {
  // Get all DPRs with optional filtering
  getDPRs: (params?: { project_name?: string; date?: string; date_from?: string; date_to?: string; page?: number }) => {
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
    return dprApiInstance.post(`/dpr/${id}/approve_team_lead/`, { role: 'Team Leader' });
  },
  // Coordinator approves DPR
  approveCoordinator: (id: string | number) => {
    return dprApiInstance.post(`/dpr/${id}/approve_coordinator/`, { role: 'Coordinator' });
  },
  // PMC Head approves DPR
  approvePMCHead: (id: string | number) => {
    return dprApiInstance.post(`/dpr/${id}/approve_pmc_head/`, { role: 'PMC Head' });
  },
  // Reject DPR with reason
  rejectDPR: (id: string | number, rejectionReason: string) => {
    return dprApiInstance.post(`/dpr/${id}/reject/`, { rejection_reason: rejectionReason });
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
  /** Backend requires `project_name` (see GET /wpr/ in Swagger). Optional: month, year, week. */
  getWPRs: (params: { project_name: string; month?: number; year?: number; week?: number }) =>
    api.get(API_ENDPOINTS.WPR.LIST, { params }),
};

// Health & Safety API (no auth)
export const healthSafetyApi = {
  // POST to /api/health-safety/status/ with project name to get status
  getStatusByProject: (projectName: string) => api.post(API_ENDPOINTS.HEALTH_SAFETY.STATUS, { project: projectName }),
  getReports: (params?: { project?: string; project_name?: string }) => api.get(API_ENDPOINTS.HEALTH_SAFETY.REPORTS, { params }),
};

// Project Progress API (no auth)
export const projectProgressApi = {
  getProjectProgress: (params?: { project_name?: string; role?: string }) => api.get(API_ENDPOINTS.PROJECT_PROGRESS.LIST, { params: { ...params, role: 'Billing Site Engineer' } }),
  getProjectProgressDetail: (id: string | number) => api.get(API_ENDPOINTS.PROJECT_PROGRESS.DETAIL(id)),
};

// Manpower API (no auth)
export const manpowerApi = {
  getManpower: (params?: { project?: string; project_name?: string }) => api.get(API_ENDPOINTS.MANPOWER.LIST, { params }),
  getManpowerDetail: (id: string | number) => api.get(API_ENDPOINTS.MANPOWER.DETAIL(id)),
  getManpowerDashboard: (projectName: string) => api.get(API_ENDPOINTS.MANPOWER.DASHBOARD, { params: { project_name: projectName } }),
};

// Equipment API (no auth)
export const equipmentApi = {
  getEquipment: (params?: { project?: string; project_name?: string }) => api.get(API_ENDPOINTS.EQUIPMENT.LIST, { params }),
  getEquipmentDetail: (id: string | number) => api.get(API_ENDPOINTS.EQUIPMENT.DETAIL(id)),
};

// Cashflow API (no auth)
export const cashflowApi = {
  getCashflow: (params?: { project_name?: string }) => api.get(API_ENDPOINTS.CASHFLOW.LIST, { params }),
  getCashflowDetail: (id: string | number) => api.get(API_ENDPOINTS.CASHFLOW.DETAIL(id)),
  createCashflow: (data: any) => api.post(API_ENDPOINTS.CASHFLOW.CREATE, data),
  updateCashflow: (id: string | number, data: any) => api.patch(API_ENDPOINTS.CASHFLOW.UPDATE(id), data),
  deleteCashflow: (id: string | number) => api.delete(API_ENDPOINTS.CASHFLOW.DELETE(id)),
};

// Contracts API (no auth)
export const contractsApi = {
  getContracts: (params?: { project_name?: string; role?: string }) => api.get(API_ENDPOINTS.CONTRACTS.LIST, { params }),
  getContractDetail: (id: string | number) => api.get(API_ENDPOINTS.CONTRACTS.DETAIL(id)),
  getContractsSummary: () => api.get(API_ENDPOINTS.CONTRACTS.SUMMARY),
};

// Invoicing API (no auth)
export const invoicingApi = {
  getInvoicing: (params?: { project_name?: string; role?: string }) => api.get(API_ENDPOINTS.INVOICING.LIST, { params }),
  getInvoicingDetail: (id: string | number) => api.get(API_ENDPOINTS.INVOICING.DETAIL(id)),
};

// Cost Performance API (no auth)
export const costPerformanceApi = {
  getCostPerformance: (params?: { project_name?: string }) => api.get(API_ENDPOINTS.COST_PERFORMANCE.LIST, { params }),
  getCostPerformanceDetail: (id: string | number) => api.get(API_ENDPOINTS.COST_PERFORMANCE.DETAIL(id)),
  getCostPerformanceDashboard: (projectName: string) => api.get(API_ENDPOINTS.COST_PERFORMANCE.DASHBOARD, { params: { project_name: projectName } }),
};

// Contract Performance API (no auth)
export const contractPerformanceApi = {
  getContractPerformance: (params?: { project_name?: string; role?: string }) => api.get(API_ENDPOINTS.CONTRACT_PERFORMANCE.LIST, { params }),
  getContractPerformanceDetail: (id: string | number) => api.get(API_ENDPOINTS.CONTRACT_PERFORMANCE.DETAIL(id)),
};

// Budget Performance API (no auth)
export const budgetPerformanceApi = {
  getBudgetPerformance: (params?: { project_name?: string }) => api.get(API_ENDPOINTS.BUDGET_PERFORMANCE.LIST, { params }),
  getBudgetPerformanceDetail: (id: string | number) => api.get(API_ENDPOINTS.BUDGET_PERFORMANCE.DETAIL(id)),
};

// Notification API
export const notificationApi = {
  sendNotification: (type: string, params: Record<string, any>) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, { type, ...params });
  },
  // Convenience methods for specific notifications
  sendProjectCreatedNotification: (projectId: string | number) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, { type: 'project_created', project_id: projectId });
  },
  sendTeamLeadAssignedNotification: (projectId: string | number, userId: number) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, { type: 'project_assigned', project_id: projectId, user_id: userId });
  },
  sendSiteEngineerAssignedNotification: (projectId: string | number, userId: number, roleType?: string) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, { type: 'site_engineer_assigned', project_id: projectId, user_id: userId });
  },
  sendDPRSubmittedNotification: (dprId: string | number) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, { type: 'dpr_submitted', dpr_id: dprId });
  },
  sendDPRApprovedNotification: (dprId: string | number) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, { type: 'dpr_approved', dpr_id: dprId });
  },
  sendDPRRejectedNotification: (dprId: string | number) => {
    return api.post(API_ENDPOINTS.NOTIFICATIONS.CH_NOTIFICATION, { type: 'dpr_rejected', dpr_id: dprId });
  },
};
export default api;
