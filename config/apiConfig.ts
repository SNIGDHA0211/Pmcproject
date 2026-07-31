/**
 * API Configuration
 *
 * Centralized configuration for all API endpoints.
 * For production deploys, set VITE_API_BASE_URL (and optionally VITE_WS_BASE_URL) in the host environment.
 */
// https://pms-backend-production-4438.up.railway.apps  this is for local testing with devtunnels (adjust port as needed)
// https://pms-backend-production-4438.up.railway.appp  this is the production backend URL (Railway)

const DEFAULT_MAIN_API_BASE_URL = 'https://pms-backend-production-4438.up.railway.app/api';
const DEFAULT_WS_BASE_URL = 'wss://pms-backend-production-4438.up.railway.app';

const trimTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');

const firstEnvUrl = (...candidates: (string | undefined)[]): string | undefined => {
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimTrailingSlashes(trimmed);
  }
  return undefined;
};

export const API_CONFIG = {
  MAIN_API_BASE_URL:
    firstEnvUrl(import.meta.env.VITE_MAIN_API_BASE_URL, import.meta.env.VITE_API_BASE_URL) ??
    DEFAULT_MAIN_API_BASE_URL,

  DPR_API_BASE_URL:
    firstEnvUrl(
      import.meta.env.VITE_DPR_API_BASE_URL,
      import.meta.env.VITE_API_BASE_URL,
      import.meta.env.VITE_MAIN_API_BASE_URL
    ) ?? DEFAULT_MAIN_API_BASE_URL,
};

export const WS_CONFIG = {
  BASE_URL: firstEnvUrl(import.meta.env.VITE_WS_BASE_URL) ?? DEFAULT_WS_BASE_URL,
};

/**
 * API Endpoints
 * 
 * Define all API endpoint paths here for easy management
 */
export const API_ENDPOINTS = {
  // Authentication (JWT)
  AUTH: {
    LOGIN: '/token/',
    REFRESH: '/auth/refresh/',
    LOGOUT: '/auth/logout/',
    PROFILE: '/accounts/me/',
  },

  // Projects
  PROJECTS: {
    LIST: '/projects-data/projects/',
    OVERVIEW: '/projects/overview/',
    DETAIL: (id: string) => `/projects-data/projects/${id}/`,
    SITES: '/projects-data/sites/',
    DOCUMENTS: '/projects-data/projects/documents/',
    IMPORT_DASHBOARD: (id: string) => `/projects-data/projects/${id}/import-dashboard-data/`,
    DASHBOARD_DATA: (id: string) => `/projects-data/projects/${id}/dashboard-data/`,
    AVAILABLE_USERS: '/projects-data/projects/available-users/',
    UPDATE: (id: string) => `/projects-data/projects/${id}/`,
    PATCH: (id: string) => `/projects-data/projects/${id}/`,
    ASSIGN_TEAM_LEAD: (id: string) => `/projects-data/projects/${id}/assign-team-lead/`,
    ASSIGN_COORDINATOR: (id: string) => `/projects-data/projects/${id}/assign-coordinator/`,
    ADD_SITE_ENGINEERS: (id: string) => `/projects-data/projects/${id}/add-site-engineers/`,
    ADD_BILLING_ENGINEER: (id: string) => `/projects-data/projects/${id}/add-billing-site-engineer/`,
    ADD_QAQC_ENGINEER: (id: string) => `/projects-data/projects/${id}/add-qaqc-site-engineer/`,
    // Project Initialization API (PMC Head)
    INIT_PROJECT: '/projects/init/',
    INIT_LIST: '/projects/init-list/',
  },

  // Project Logs (Issues & Concerns + Risks & Actions)
  PROJECT_LOGS: {
    DETAIL: (projectId: string) => `/project-logs/${projectId}/`,
  },

  // Operations
  OPERATIONS: {
    TASKS: '/operations/tasks/',
    REPORTS: '/operations/reports/',
    SUBMITTED_DOCUMENTS: '/operations/reports/submitted_documents/',
    APPROVE_REPORT: (id: string) => `/operations/reports/${id}/approve/`,
    REJECT_REPORT: (id: string) => `/operations/reports/${id}/reject/`,
  },

  // DPR (Daily Progress Reports)
  DPR: {
    LIST: '/dpr/',
    DETAIL: (id: string | number) => `/dpr/${id}/`,
    CREATE: '/dpr/',
    UPDATE: (id: string | number) => `/dpr/${id}/`,
    PATCH: (id: string | number) => `/dpr/${id}/`,
    DELETE: (id: string | number) => `/dpr/${id}/`,
    ACTIVITIES: (id: string | number) => `/dpr/${id}/activities/`,
  },

  // WPR (Weekly Progress Reports)
  WPR: {
    LIST: '/wpr/',
  },

  // Health, Safety & Environment (HSE)
  HEALTH_SAFETY: {
    LIST: '/health-safety/',
    DETAIL: (id: string | number) => `/health-safety/${id}/`,
    PROJECT: (projectName: string) => `/health-safety/project/${encodeURIComponent(projectName)}/`,
    BY_MONTH_YEAR: (projectName: string, month: number, year: number) =>
      `/health-safety/project/${encodeURIComponent(projectName)}/month/${month}/year/${year}/`,
    YEAR_SUMMARY: (projectName: string, year: number) =>
      `/health-safety/project/${encodeURIComponent(projectName)}/year/${year}/summary/`,
    DASHBOARD: (projectName: string) =>
      `/health-safety/project/${encodeURIComponent(projectName)}/dashboard/`,
  },

  // Project Progress
  PROJECT_PROGRESS: {
    LIST: '/project-progress/',
    DETAIL: (id: string | number) => `/project-progress/${id}/`,
  },

  // Monthly Construction Progress
  CONSTRUCTION_PROGRESS: {
    LIST: '/construction-progress/',
    DETAIL: (id: string | number) => `/construction-progress/${id}/`,
    PROJECT: (projectName: string) => `/construction-progress/project/${encodeURIComponent(projectName)}/`,
    MONTH: (progressMonth: string) => `/construction-progress/month/${encodeURIComponent(progressMonth)}/`,
  },

  // Manpower
  MANPOWER: {
    LIST: '/manpower/',
    DETAIL: (id: string | number) => `/manpower/${id}/`,
    DASHBOARD: '/manpower/dashboard/',
    CREATE: '/manpower/',
    UPDATE: (id: string | number) => `/manpower/${id}/`,
    DELETE: (id: string | number) => `/manpower/${id}/`,
  },

  // Equipment
  EQUIPMENT: {
    LIST: '/equipment/',
    DETAIL: (id: string | number) => `/equipment/${id}/`,
  },

  // Project Equipment
  PROJECT_EQUIPMENT: {
    LIST: '/project-equipment/',
    DETAIL: (id: string | number) => `/project-equipment/${id}/`,
    PROJECT: (projectName: string) => `/project-equipment/project/${encodeURIComponent(projectName)}/`,
    MONTH: (equipmentMonth: string) => `/project-equipment/month/${encodeURIComponent(equipmentMonth)}/`,
  },

  // Correspondence (monthly client / contractor)
  CORRESPONDENCE: {
    LIST: '/correspondence/',
    DETAIL: (id: string | number) => `/correspondence/${id}/`,
    BY_MONTH_YEAR: (projectName: string, month: number, year: number) =>
      `/correspondence/project/${encodeURIComponent(projectName)}/month/${month}/year/${year}/`,
    PROJECT_SUMMARY: (projectName: string) =>
      `/correspondence/project/${encodeURIComponent(projectName)}/summary/`,
    YEAR_SUMMARY: (projectName: string, year: number) =>
      `/correspondence/project/${encodeURIComponent(projectName)}/year/${year}/summary/`,
    /** @deprecated Use BY_MONTH_YEAR */
    PROJECT: (projectName: string) => `/correspondence/project/${encodeURIComponent(projectName)}/`,
  },

  // Correspondence Documents (new dashboard API)
  CORRESPONDENCE_DOCUMENTS: {
    LIST: '/correspondence-documents/',
    DETAIL: (id: string | number) => `/correspondence-documents/${id}/`,
    DASHBOARD: '/correspondence-documents/dashboard/',
    SCL_DELIVERED: '/correspondence-documents/scl-delivered-correspondence/',
    ATTACHMENTS: (id: string | number) => `/correspondence-documents/${id}/attachments/`,
    ATTACHMENT_DETAIL: (id: string | number) =>
      `/correspondence-documents/attachments/${id}/`,
    ATTACHMENT_DOWNLOAD: (id: string | number) =>
      `/correspondence-documents/attachments/${id}/download/`,
  },

  // Machinery master catalog
  MACHINERY_MASTER: {
    LIST: '/machinery-master/',
    DETAIL: (id: string | number) => `/machinery-master/${id}/`,
    CREATE: '/machinery-master/',
  },

  // Plant & Machinery Inventory (new backend endpoints)
  PLANT_MACHINERY: {
    LIST: '/plant-machinery/',
    DETAIL: (id: string | number) => `/plant-machinery/${id}/`,
    CREATE: '/plant-machinery/',
    UPDATE: (id: string | number) => `/plant-machinery/${id}/`,
    PATCH: (id: string | number) => `/plant-machinery/${id}/`,
    DELETE: (id: string | number) => `/plant-machinery/${id}/`,
    ADD_ITEMS: (id: string | number) => `/plant-machinery/${id}/items/`,
    ITEMS_LIST: '/items/',
    ITEM_DETAIL: (id: string | number) => `/items/${id}/`,
  },

  // Cashflow
  CASHFLOW: {
    LIST: '/cashflow/',
    DETAIL: (id: string | number) => `/cashflow/${id}/`,
    CREATE: '/cashflow/',
    UPDATE: (id: string | number) => `/cashflow/${id}/`,
    DELETE: (id: string | number) => `/cashflow/${id}/`,
  },

  // Contract Values
  CONTRACT_VALUES: {
    LIST: '/contract-values/',
    DETAIL: (id: string | number) => `/contract-values/${id}/`,
    PATCH: (id: string | number) => `/contract-values/${id}/`,
    PROJECT_DASHBOARD: (projectName: string) =>
      `/contract-values/project/${encodeURIComponent(projectName)}/`,
    BY_TYPE: (projectName: string, contractType: string) =>
      `/contract-values/project/${encodeURIComponent(projectName)}/type/${contractType}/`,
  },

  // Invoicing
  INVOICING: {
    LIST: '/invoicing/',
    DETAIL: (id: string | number) => `/invoicing/${id}/`,
    PATCH: (id: string | number) => `/invoicing/${id}/`,
    PROJECT_DASHBOARD: (projectName: string) =>
      `/invoicing/project/${encodeURIComponent(projectName)}/`,
    BY_TYPE: (projectName: string, invoiceType: string) =>
      `/invoicing/project/${encodeURIComponent(projectName)}/type/${invoiceType}/`,
  },

  // Contractor Master
  CONTRACTOR_MASTER: {
    LIST: (projectName: string) =>
      `/projects/${encodeURIComponent(projectName)}/contractors/`,
    CREATE: (projectName: string) =>
      `/projects/${encodeURIComponent(projectName)}/contractors/`,
    DETAIL: (id: string | number) => `/projects/contractors/${id}/`,
  },

  // Cost Performance
  COST_PERFORMANCE: {
    LIST: '/cost-performance/',
    DETAIL: (id: string | number) => `/cost-performance/${id}/`,
    PATCH: (id: string | number) => `/cost-performance/${id}/`,
    DASHBOARD: '/cost-performance/dashboard/',
    BY_MONTH_YEAR: (projectName: string, month: number, year: number) =>
      `/cost-performance/project/${encodeURIComponent(projectName)}/month/${month}/year/${year}/`,
  },

  // Contract Performance
  CONTRACT_PERFORMANCE: {
    LIST: '/contract-performance/',
    DETAIL: (id: string | number) => `/contract-performance/${id}/`,
    PATCH: (id: string | number) => `/contract-performance/${id}/`,
  },

  // Project Quality (monthly)
  PROJECT_QUALITY: {
    LIST: '/project-quality/',
    DETAIL: (id: string | number) => `/project-quality/${id}/`,
    BY_MONTH_YEAR: (projectName: string, month: number, year: number) =>
      `/project-quality/project/${encodeURIComponent(projectName)}/month/${month}/year/${year}/`,
    YEAR_SUMMARY: (projectName: string, year: number) =>
      `/project-quality/project/${encodeURIComponent(projectName)}/year/${year}/summary/`,
  },

  /** @deprecated Use PROJECT_QUALITY */
  PROJECT_QUALITY_STATUS: {
    LIST: '/project-quality/',
    DETAIL: (id: string | number) => `/project-quality/${id}/`,
    PROJECT: (projectName: string) => `/project-quality/project/${encodeURIComponent(projectName)}/`,
  },

  // Drawings (monthly summary)
  DRAWINGS: {
    LIST: '/drawings/',
    DETAIL: (id: string | number) => `/drawings/${id}/`,
    BY_MONTH_YEAR: (projectName: string, month: number, year: number) =>
      `/drawings/project/${encodeURIComponent(projectName)}/month/${month}/year/${year}/`,
    PROJECT_SUMMARY: (projectName: string) =>
      `/drawings/project/${encodeURIComponent(projectName)}/summary/`,
    YEAR_SUMMARY: (projectName: string, year: number) =>
      `/drawings/project/${encodeURIComponent(projectName)}/year/${year}/summary/`,
    /** @deprecated Use LIST + BY_MONTH_YEAR */
    CREATE: '/drawings/',
    UPDATE: (id: string | number) => `/drawings/${id}/`,
    PATCH: (id: string | number) => `/drawings/${id}/`,
    DELETE: (id: string | number) => `/drawings/${id}/`,
    PROJECT: (projectName: string) => `/drawings/project/${encodeURIComponent(projectName)}/`,
    // Drawing Register (per-drawing rows)
    REGISTER_CLIENT_REPORT: '/drawings/summary/',
    REGISTER_LIST: '/drawings/register/',
    REGISTER_CREATE: '/drawings/register/',
    REGISTER_DETAIL: (id: string | number) => `/drawings/register/${id}/`,
    REGISTER_UPDATE: (id: string | number) => `/drawings/register/${id}/`,
    REGISTER_DELETE: (id: string | number) => `/drawings/register/${id}/`,
  },

  // Budget Performance
  BUDGET_PERFORMANCE: {
    LIST: '/budget-performance/',
    DETAIL: (id: string | number) => `/budget-performance/${id}/`,
  },

  // Planned vs Actual Value (legacy planned-earned-value API)
  PLANNED_EARNED_VALUE: {
    LIST: '/planned-earned-value/',
    DETAIL: (id: string | number) => `/planned-earned-value/${id}/`,
    PROJECT: (projectName: string) => `/planned-earned-value/project/${encodeURIComponent(projectName)}/`,
    BY_MONTH_YEAR: (projectName: string, month: number, year: number) =>
      `/planned-earned-value/project/${encodeURIComponent(projectName)}/month/${month}/year/${year}/`,
  },

  /**
   * Planned vs Actual — /api/planned-vs-actual/
   * Legacy alias: /api/planned-earned-value/ (same endpoints).
   * All financial metrics come from the backend.
   */
  PLANNED_VS_ACTUAL: {
    LIST: '/planned-vs-actual/',
    DETAIL: (id: string | number) => `/planned-vs-actual/${id}/`,
    DASHBOARD: '/planned-vs-actual/dashboard/',
    PENDING: '/planned-vs-actual/pending/',
    PROJECT: (projectName: string) =>
      `/planned-vs-actual/project/${encodeURIComponent(projectName)}/`,
    BY_TYPE: (projectName: string, plannedType: string) =>
      `/planned-vs-actual/project/${encodeURIComponent(projectName)}/type/${plannedType}/`,
    TREND: (projectName: string) =>
      `/planned-vs-actual/project/${encodeURIComponent(projectName)}/trend/`,
  },

  // Project Dates
  PROJECT_DATES: {
    LIST: '/project-dates/',
    DETAIL: (id: string | number) => `/project-dates/${id}/`,
    PROJECT: (projectName: string) =>
      `/project-dates/project/${encodeURIComponent(projectName)}/`,

    BG_STATUS: (projectName: string) =>
      `/project-dates/project/${encodeURIComponent(projectName)}/bg-status/`,
    BG_STATUS_DETAIL: (id: string | number) => `/project-dates/bg-status/${id}/`,
  },




  // Site Images (Cloudinary-backed)
  SITE_IMAGES: {
    LIST: '/site-images/',
    CREATE: '/site-images/',
    DETAIL: (id: string | number) => `/site-images/${id}/`,
    DELETE: (id: string | number) => `/site-images/${id}/`,
    BY_PROJECT_MONTH_YEAR: (projectName: string, month: number, year: number) =>
      `/site-images/project/${encodeURIComponent(projectName)}/month/${month}/year/${year}/`,
  },

  // Notifications
  NOTIFICATIONS: {
    CH_NOTIFICATION: '/notifications/ch-notification/',
  },

  // Alerts (billing updates → team leader)
  ALERTS: {
    LIST: '/alerts/',
    DETAIL: (id: string | number) => `/alerts/${id}/`,
  },

  // Frequency Chart (Material Testing)
  FREQUENCY_CHART: {
    CLIENT_REPORT: '/frequency-chart/',
    REGISTER_LIST: '/frequency-chart/register/',
    REGISTER_DETAIL: (id: string | number) => `/frequency-chart/register/${id}/`,
    REGISTER_CREATE: '/frequency-chart/register/',
    REGISTER_UPDATE: (id: string | number) => `/frequency-chart/register/${id}/`,
    REGISTER_DELETE: (id: string | number) => `/frequency-chart/register/${id}/`,
  },

  // Testing Documents / Photos (QAQC material test evidence)
  TESTING_DOCUMENTS: {
    LIST: '/testing-documents/',
    DETAIL: (id: string | number) => `/testing-documents/${id}/`,
    DOWNLOAD: (id: string | number) => `/testing-documents/${id}/download/`,
  },

  // Project Feedback (issues raised on projects)
  PROJECT_FEEDBACK: {
    LIST: '/project-feedback/',
    DETAIL: (id: string | number) => `/project-feedback/${id}/`,
    STATUS: (id: string | number) => `/project-feedback/${id}/status/`,
  },

  // HO User Management (Head Office / CEO / PMC Head / superuser)
  USERS: {
    LIST: '/users/',
    DETAIL: (id: string | number) => `/users/${id}/`,
    CHANGE_PASSWORD: (id: string | number) => `/users/${id}/change-password/`,
    RESET_PASSWORD: (id: string | number) => `/users/${id}/reset-password/`,
    ASSIGN_PROJECTS: (id: string | number) => `/users/${id}/assign-projects/`,
    STATUS: (id: string | number) => `/users/${id}/status/`,
  },

  MEETING_DOCUMENTS: {
    LIST: '/meeting-documents/',
    DASHBOARD: '/meeting-documents/dashboard/',
    DETAIL: (id: string | number) => `/meeting-documents/${id}/`,
    DOWNLOAD: (id: string | number) => `/meeting-documents/${id}/download/`,
    BY_PROJECT: (projectName: string) =>
      `/meeting-documents/project/${encodeURIComponent(projectName)}/`,
  },
};

/**
 * Environment-based configuration
 */
export const ENVIRONMENT = {
  CURRENT: 'development',
  CONFIGS: {
    development: {
      MAIN_API: 'https://pms-backend-production-4438.up.railway.app/api',
      DPR_API: 'https://pms-backend-production-4438.up.railway.app/api',
    },
    staging: {
      MAIN_API: 'http://staging.example.com/api',
      DPR_API: 'http://staging.example.com/api',
    },
    production: {
      MAIN_API: 'https://pms-backend-production-4438.up.railway.app/api',
      DPR_API: 'https://pms-backend-production-4438.up.railway.app/api',
    },
  },
};

/**
 * Get API base URL based on environment or direct config
 */
export const getApiBaseUrl = (apiType: 'main' | 'dpr' = 'main'): string => {
  return apiType === 'dpr' ? API_CONFIG.DPR_API_BASE_URL : API_CONFIG.MAIN_API_BASE_URL;
};

/** Normalize endpoint URLs for Django REST Framework routes with `APPEND_SLASH=True`. */
export const normalizeApiUrl = (url: string): string => {
  if (!url) return url;

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(url)) {
    const parsedUrl = new URL(url);
    parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '')}/`;
    return parsedUrl.toString();
  }

  const suffixIndex = url.search(/[?#]/);
  const path = suffixIndex === -1 ? url : url.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : url.slice(suffixIndex);
  const normalizedPath = path.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  return normalizedPath === '/' ? `/${suffix}` : `${normalizedPath}/${suffix}`;
};

/**
 * Helper function to build full API URL
 */
export const buildApiUrl = (endpoint: string, apiType: 'main' | 'dpr' = 'main'): string => {
  const baseUrl = getApiBaseUrl(apiType);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return normalizeApiUrl(`${baseUrl}/${cleanEndpoint}`);
};
