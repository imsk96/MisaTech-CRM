/**
 * Application Constants and Configuration
 */

// Application settings
export const APP_CONFIG = {
  name: 'Multi-Tenant CRM',
  version: '1.0.0',
  externalStorageMode: true,
  approvalRequired: true
};

// Module definitions
export const MODULES = {
  DASHBOARD: 'dashboard',
  LEADS: 'leads',
  DISPATCH: 'dispatch',
  VISIT: 'visit',
  TASK: 'task',
  QUOTATION: 'quotation',
  PRODUCTS: 'products',
  SETTINGS: 'settings',
  APPROVALS: 'approvals'
};

// Role definitions
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff'
};

// Approval status
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Action types for approvals
export const ACTION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

// Integration types
export const INTEGRATION_TYPES = {
  GOOGLE_SHEETS: 'google_sheets',
  EXCEL: 'excel'
};

// Sync status
export const SYNC_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  RETRYING: 'retrying'
};

// Default column mappings for Google Sheets
export const DEFAULT_COLUMN_MAPPINGS = {
  leads: {
    lead_name: 'A',
    email: 'B',
    phone: 'C',
    company: 'D',
    status: 'E',
    source: 'F',
    assigned_to: 'G',
    created_at: 'H'
  },
  dispatch: {
    dispatch_id: 'A',
    customer_name: 'B',
    address: 'C',
    technician: 'D',
    scheduled_date: 'E',
    status: 'F',
    priority: 'G',
    notes: 'H'
  },
  visit: {
    visit_id: 'A',
    customer_name: 'B',
    visit_date: 'C',
    purpose: 'D',
    outcome: 'E',
    follow_up: 'F',
    visited_by: 'G'
  },
  task: {
    task_id: 'A',
    title: 'B',
    description: 'C',
    assigned_to: 'D',
    due_date: 'E',
    priority: 'F',
    status: 'G',
    completed_at: 'H'
  },
  quotation: {
    quote_id: 'A',
    customer_name: 'B',
    items: 'C',
    total_amount: 'D',
    status: 'E',
    valid_until: 'F',
    created_by: 'G'
  },
  products: {
    product_id: 'A',
    name: 'B',
    sku: 'C',
    price: 'D',
    stock: 'E',
    category: 'F',
    description: 'G'
  }
};

// UI Themes
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// API endpoints (for external services)
export const API_ENDPOINTS = {
  GOOGLE_OAUTH: 'https://accounts.google.com/o/oauth2/v2/auth',
  GOOGLE_TOKEN: 'https://oauth2.googleapis.com/token',
  GOOGLE_SHEETS: 'https://sheets.googleapis.com/v4/spreadsheets'
};

// Rate limiting
export const RATE_LIMITS = {
  GOOGLE_SHEETS: {
    requestsPerMinute: 100,
    requestsPerDay: 10000000
  },
  SYNC_RETRY: {
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffMultiplier: 2
  }
};

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'crm_theme',
  USER: 'crm_user',
  COMPANY: 'crm_company',
  INTEGRATION: 'crm_integration'
};
