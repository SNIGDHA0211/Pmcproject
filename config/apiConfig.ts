/**
 * API Configuration
 * 
 * Centralized configuration for all API endpoints.
 * Update the base URLs here to change API endpoints across the application.
 */

export const API_CONFIG = {
  // Main API Base URL (pointing to backend Django server via devtunnels)

  MAIN_API_BASE_URL: 'https://pms-backend-production-4438.up.railway.app/api',

  // DPR API Base URL (same as main)
  DPR_API_BASE_URL: 'https://pms-backend-production-4438.up.railway.app/api',
};

export const WS_CONFIG = {
  BASE_URL: 'wss://p8hb1k73-8000.inc1.devtunnels.ms'
};

/**
 * API Endpoints
 * 
 * Define all API endpoint paths here for easy management
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/accounts/me/',
    PROFILE: '/accounts/me/',
  },

  // Projects
  PROJECTS: {
    LIST: '/projects-data/projects/',
    DETAIL: (id: string) => `/projects-data/projects/${id}/`,
    SITES: '/projects-data/sites/',
    DOCUMENTS: '/projects-data/projects/documents/',
    IMPORT_DASHBOARD: (id: string) => `/projects-data/projects/${id}/import-dashboard-data/`,
    DASHBOARD_DATA: (id: string) => `/projects-data/projects/${id}/dashboard-data/`,
    AVAILABLE_USERS: '/projects-data/projects/available-users/',
    ASSIGN_TEAM_LEAD: (id: string) => `/projects-data/projects/${id}/assign-team-lead/`,
    ASSIGN_COORDINATOR: (id: string) => `/projects-data/projects/${id}/assign-coordinator/`,
    ADD_SITE_ENGINEERS: (id: string) => `/projects-data/projects/${id}/add-site-engineers/`,
    ADD_BILLING_ENGINEER: (id: string) => `/projects-data/projects/${id}/add-billing-site-engineer/`,
    ADD_QAQC_ENGINEER: (id: string) => `/projects-data/projects/${id}/add-qaqc-site-engineer/`,
    // Project Initialization API (PMC Head)
    INIT_PROJECT: '/projects/init/',
    INIT_LIST: '/projects/init-list/',
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

  // Health & Safety
  HEALTH_SAFETY: {
    STATUS: '/health-safety/status/',
    REPORTS: '/health-safety/reports/',
  },

  // Project Progress
  PROJECT_PROGRESS: {
    LIST: '/project-progress/',
    DETAIL: (id: string | number) => `/project-progress/${id}/`,
  },

  // Manpower
  MANPOWER: {
    LIST: '/manpower/',
    DETAIL: (id: string | number) => `/manpower/${id}/`,
    DASHBOARD: '/manpower/dashboard/',
  },

  // Equipment
  EQUIPMENT: {
    LIST: '/equipment/',
    DETAIL: (id: string | number) => `/equipment/${id}/`,
  },

  // Cashflow
  CASHFLOW: {
    LIST: '/cashflow/',
    DETAIL: (id: string | number) => `/cashflow/${id}/`,
    CREATE: '/cashflow/',
    UPDATE: (id: string | number) => `/cashflow/${id}/`,
    DELETE: (id: string | number) => `/cashflow/${id}/`,
  },

  // Contracts
  CONTRACTS: {
    LIST: '/contracts/',
    DETAIL: (id: string | number) => `/contracts/${id}/`,
    SUMMARY: '/contracts/summary/',
  },

  // Invoicing
  INVOICING: {
    LIST: '/invoicing/',
    DETAIL: (id: string | number) => `/invoicing/${id}/`,
  },

  // Cost Performance
  COST_PERFORMANCE: {
    LIST: '/cost-performance/',
    DETAIL: (id: string | number) => `/cost-performance/${id}/`,
    DASHBOARD: '/cost-performance/dashboard/',
  },

  // Contract Performance
  CONTRACT_PERFORMANCE: {
    LIST: '/contract-performance/',
    DETAIL: (id: string | number) => `/contract-performance/${id}/`,
  },

  // Budget Performance
  BUDGET_PERFORMANCE: {
    LIST: '/budget-performance/',
    DETAIL: (id: string | number) => `/budget-performance/${id}/`,
  },


  // Notifications
  NOTIFICATIONS: {
    CH_NOTIFICATION: '/notifications/ch-notification/',
  },
};

/**
 * Environment-based configuration
 */
export const ENVIRONMENT = {
  CURRENT: 'development',
  CONFIGS: {
    development: {

      MAIN_API: 'https://pms-backend-production-4438.up.railway.app//api',
      DPR_API: 'https://pms-backend-production-4438.up.railway.app//api'
    },
    staging: {
      MAIN_API: 'http://staging.example.com/api',
      DPR_API: 'http://staging.example.com/api',
    },
    production: {
      MAIN_API: 'https://api.example.com/api',
      DPR_API: 'https://api.example.com/api',
    },
  },
};

/**
 * Get API base URL based on environment or direct config
 */
export const getApiBaseUrl = (apiType: 'main' | 'dpr' = 'main'): string => {
  return API_CONFIG.MAIN_API_BASE_URL;
};

/**
 * Helper function to build full API URL
 */
export const buildApiUrl = (endpoint: string, apiType: 'main' | 'dpr' = 'main'): string => {
  const baseUrl = getApiBaseUrl(apiType);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
};
