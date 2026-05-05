# API Configuration Guide

This directory contains centralized API configuration for the application.

## File: `apiConfig.ts`

This file manages all API endpoints and base URLs in one place.

### How to Change API URLs

#### Option 1: Direct Configuration (Recommended for Quick Changes)

Edit the `API_CONFIG` object in `apiConfig.ts`:

```typescript
export const API_CONFIG = {
  MAIN_API_BASE_URL: '/api',
  DPR_API_BASE_URL: 'https://fv5k8l3m-8000.inc1.devtunnels.ms/api',
  // Add your new API here
  NEW_API_BASE_URL: 'http://your-api-url.com/api',
};
```

#### Option 2: Environment-Based Configuration

Change the `ENVIRONMENT.CURRENT` value:

```typescript
export const ENVIRONMENT = {
  CURRENT: 'development', // Change to 'staging' or 'production'
  // ...
};
```

Then update the environment configs:

```typescript
CONFIGS: {
  development: {
    MAIN_API: '/api',
    DPR_API: 'https://fv5k8l3m-8000.inc1.devtunnels.ms/api',
  },
  // Add your environments here
}
```

### Adding a New API

1. **Add the base URL to `API_CONFIG`:**

```typescript
export const API_CONFIG = {
  // ... existing configs
  NEW_API_BASE_URL: 'http://new-api.com/api',
};
```

2. **Add endpoints to `API_ENDPOINTS`:**

```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints
  NEW_API: {
    LIST: '/new-api/items/',
    DETAIL: (id: string) => `/new-api/items/${id}/`,
    CREATE: '/new-api/items/',
  },
};
```

3. **Create axios instance in `services/api.ts`:**

```typescript
const newApiInstance = axios.create({
  baseURL: getApiBaseUrl('new'), // or use API_CONFIG.NEW_API_BASE_URL directly
  headers: {
    'Content-Type': 'application/json',
  },
});

export const newApi = {
  getItems: () => newApiInstance.get(API_ENDPOINTS.NEW_API.LIST),
  getItem: (id: string) => newApiInstance.get(API_ENDPOINTS.NEW_API.DETAIL(id)),
  createItem: (data: any) => newApiInstance.post(API_ENDPOINTS.NEW_API.CREATE, data),
};
```

### Current API Endpoints

- **Main API**: Used for authentication, projects, operations
- **DPR API**: Used for Daily Progress Reports (`https://fv5k8l3m-8000.inc1.devtunnels.ms/api`)

### Quick Reference

**To change DPR API URL:**
1. Open `config/apiConfig.ts`
2. Find `DPR_API_BASE_URL` in `API_CONFIG` or `DPR_API` in `ENVIRONMENT.CONFIGS`
3. Update the URL
4. Save the file

**To add a new API:**
1. Add base URL to `API_CONFIG`
2. Add endpoints to `API_ENDPOINTS`
3. Create axios instance in `services/api.ts`
4. Export API methods
