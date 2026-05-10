/**
 * Utility Functions
 * Common helpers used throughout the application
 */

import { TOAST_TYPES } from './constants.js';

/**
 * Generate a unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date for input fields
 */
export function formatDateForInput(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

/**
 * Format currency
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if value is empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Get initials from name
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(phone) {
  const regex = /^[\d\s\-\+\(\)]{10,}$/;
  return regex.test(phone);
}

/**
 * Truncate text
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Group array by key
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

/**
 * Sort array by key
 */
export function sortBy(array, key, ascending = true) {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Parse JSON safely
 */
export function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * Stringify JSON safely
 */
export function safeJsonStringify(obj, defaultValue = '{}') {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
}

/**
 * Download file
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Toast notification system
 */
class ToastManager {
  constructor() {
    this.container = null;
  }

  ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show(message, type = TOAST_TYPES.INFO, duration = 4000) {
    this.ensureContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = this.getIcon(type);
    toast.innerHTML = `
      <span>${icon}</span>
      <span>${sanitizeString(message)}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  success(message) {
    this.show(message, TOAST_TYPES.SUCCESS);
  }

  error(message) {
    this.show(message, TOAST_TYPES.ERROR);
  }

  warning(message) {
    this.show(message, TOAST_TYPES.WARNING);
  }

  info(message) {
    this.show(message, TOAST_TYPES.INFO);
  }

  getIcon(type) {
    const icons = {
      [TOAST_TYPES.SUCCESS]: '✓',
      [TOAST_TYPES.ERROR]: '✕',
      [TOAST_TYPES.WARNING]: '⚠',
      [TOAST_TYPES.INFO]: 'ℹ'
    };
    return icons[type] || 'ℹ';
  }
}

export const toast = new ToastManager();

/**
 * Loading state manager
 */
class LoadingManager {
  constructor() {
    this.overlay = null;
    this.count = 0;
  }

  show() {
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'loading-overlay';
      this.overlay.innerHTML = '<div class="loading-spinner"></div>';
      document.body.appendChild(this.overlay);
    }
    this.count++;
    this.overlay.style.display = 'flex';
  }

  hide() {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0 && this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  async wrap(promise) {
    this.show();
    try {
      return await promise;
    } finally {
      this.hide();
    }
  }
}

export const loading = new LoadingManager();

/**
 * Event emitter for simple pub/sub
 */
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }

  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}
