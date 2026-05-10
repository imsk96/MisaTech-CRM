/**
 * Sync Engine - CRITICAL COMPONENT
 * Handles all data synchronization between Supabase and external storage
 * (Google Sheets / Excel)
 */

import { APPROVAL_STATUS, SYNC_STATUS, INTEGRATION_TYPES, RATE_LIMITS } from '../utils/constants.js';
import { toast, safeJsonParse, safeJsonStringify } from '../utils/helpers.js';

class SyncEngine {
  constructor() {
    this.supabase = null;
    this.isSyncing = false;
    this.syncQueue = [];
    this.retryCounts = new Map();
    this.rateLimitTracker = {
      count: 0,
      resetTime: Date.now() + 60000
    };
  }

  /**
   * Initialize sync engine with Supabase client
   */
  init(supabaseClient) {
    this.supabase = supabaseClient;
    return this;
  }

  /**
   * Process approved actions and sync to external storage
   */
  async processApproval(approvalId) {
    try {
      // Fetch approval details
      const approvals = await this.supabase
        .from('approvals')
        .select('*')
        .eq('id', approvalId)
        .single();

      const approval = Array.isArray(approvals) ? approvals[0] : approvals;

      if (!approval) {
        throw new Error('Approval not found');
      }

      if (approval.status !== APPROVAL_STATUS.APPROVED) {
        throw new Error('Approval not in approved status');
      }

      // Check if already synced
      if (approval.synced) {
        console.log('Approval already synced');
        return { success: true, message: 'Already synced' };
      }

      // Get integration config
      const integrations = await this.supabase
        .from('integrations')
        .select('*')
        .eq('company_id', approval.company_id)
        .eq('type', INTEGRATION_TYPES.GOOGLE_SHEETS)
        .single();

      const integration = Array.isArray(integrations) ? integrations[0] : integrations;

      if (!integration) {
        throw new Error('No Google Sheets integration configured');
      }

      // Execute sync based on action type
      let result;
      switch (approval.action_type) {
        case 'create':
          result = await this.executeCreate(approval, integration);
          break;
        case 'update':
          result = await this.executeUpdate(approval, integration);
          break;
        case 'delete':
          result = await this.executeDelete(approval, integration);
          break;
        default:
          throw new Error(`Unknown action type: ${approval.action_type}`);
      }

      // Update approval as synced
      await this.supabase
        .from('approvals')
        .update({ 
          synced: true,
          synced_at: new Date().toISOString()
        })
        .eq('id', approvalId);

      // Log sync success
      await this.logSync(approval.company_id, approval.module_name, approval.action_type, SYNC_STATUS.SUCCESS, result);

      toast.success(`${approval.module_name} synced successfully`);
      return { success: true, result };

    } catch (error) {
      console.error('Sync error:', error);
      
      // Log sync failure
      await this.logSync(
        approval?.company_id || 'unknown',
        approval?.module_name || 'unknown',
        approval?.action_type || 'unknown',
        SYNC_STATUS.FAILED,
        { error: error.message }
      );

      toast.error(`Sync failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute CREATE operation on external storage
   */
  async executeCreate(approval, integration) {
    const payload = safeJsonParse(approval.payload);
    
    switch (integration.type) {
      case INTEGRATION_TYPES.GOOGLE_SHEETS:
        return await this.googleSheetsCreate(payload, integration, approval.module_name);
      case INTEGRATION_TYPES.EXCEL:
        return await this.excelCreate(payload, integration, approval.module_name);
      default:
        throw new Error(`Unsupported integration type: ${integration.type}`);
    }
  }

  /**
   * Execute UPDATE operation on external storage
   */
  async executeUpdate(approval, integration) {
    const payload = safeJsonParse(approval.payload);
    
    switch (integration.type) {
      case INTEGRATION_TYPES.GOOGLE_SHEETS:
        return await this.googleSheetsUpdate(payload, integration, approval.module_name);
      case INTEGRATION_TYPES.EXCEL:
        return await this.excelUpdate(payload, integration, approval.module_name);
      default:
        throw new Error(`Unsupported integration type: ${integration.type}`);
    }
  }

  /**
   * Execute DELETE operation on external storage
   */
  async executeDelete(approval, integration) {
    const payload = safeJsonParse(approval.payload);
    
    switch (integration.type) {
      case INTEGRATION_TYPES.GOOGLE_SHEETS:
        return await this.googleSheetsDelete(payload, integration, approval.module_name);
      case INTEGRATION_TYPES.EXCEL:
        return await this.excelDelete(payload, integration, approval.module_name);
      default:
        throw new Error(`Unsupported integration type: ${integration.type}`);
    }
  }

  /**
   * Google Sheets - Create row
   */
  async googleSheetsCreate(payload, integration, moduleName) {
    await this.checkRateLimit();

    const sheetId = integration.sheet_id;
    const mapping = safeJsonParse(integration.mapping_json || '{}');
    const columnMapping = mapping[moduleName] || {};
    
    // Build row values based on column mapping
    const rowValues = this.buildRowValues(payload, columnMapping);

    const range = `${moduleName}!A:Z`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [rowValues]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google Sheets API error');
    }

    return await response.json();
  }

  /**
   * Google Sheets - Update row
   */
  async googleSheetsUpdate(payload, integration, moduleName) {
    await this.checkRateLimit();

    const sheetId = integration.sheet_id;
    const mapping = safeJsonParse(integration.mapping_json || '{}');
    const columnMapping = mapping[moduleName] || {};
    
    // Need row_id to identify which row to update
    if (!payload.row_id) {
      throw new Error('row_id required for update operation');
    }

    const rowValues = this.buildRowValues(payload, columnMapping);
    const range = `${moduleName}!${payload.row_id}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [rowValues]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google Sheets API error');
    }

    return await response.json();
  }

  /**
   * Google Sheets - Delete row
   */
  async googleSheetsDelete(payload, integration, moduleName) {
    await this.checkRateLimit();

    if (!payload.row_id) {
      throw new Error('row_id required for delete operation');
    }

    const sheetId = integration.sheet_id;
    const rowIndex = parseInt(payload.row_id.replace(/\D/g, '')) - 1;

    // Use batchClear to clear the row
    const range = `${moduleName}!${payload.row_id}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${integration.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google Sheets API error');
    }

    return { deleted: true, row_id: payload.row_id };
  }

  /**
   * Excel - Create (simulated - stores in Supabase for Excel file uploads)
   */
  async excelCreate(payload, integration, moduleName) {
    // For Excel, we store the data in Supabase as the "file" is uploaded
    // This is a simplified implementation
    const tableName = `excel_${moduleName}`;
    
    try {
      const result = await this.supabase.from(tableName).insert({
        ...payload,
        company_id: integration.company_id,
        created_at: new Date().toISOString()
      });
      return result;
    } catch (error) {
      // Fallback: store in a generic table
      const result = await this.supabase.from('excel_data').insert({
        company_id: integration.company_id,
        module: moduleName,
        data: payload,
        created_at: new Date().toISOString()
      });
      return result;
    }
  }

  /**
   * Excel - Update
   */
  async excelUpdate(payload, integration, moduleName) {
    if (!payload.id) {
      throw new Error('id required for update operation');
    }

    const { id, ...updateData } = payload;
    
    try {
      const tableName = `excel_${moduleName}`;
      const result = await this.supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id);
      return result;
    } catch (error) {
      const result = await this.supabase
        .from('excel_data')
        .update({ data: updateData })
        .eq('id', id);
      return result;
    }
  }

  /**
   * Excel - Delete
   */
  async excelDelete(payload, integration, moduleName) {
    if (!payload.id) {
      throw new Error('id required for delete operation');
    }

    try {
      const tableName = `excel_${moduleName}`;
      const result = await this.supabase
        .from(tableName)
        .delete()
        .eq('id', payload.id);
      return result;
    } catch (error) {
      const result = await this.supabase
        .from('excel_data')
        .delete()
        .eq('id', payload.id);
      return result;
    }
  }

  /**
   * Build row values from payload and column mapping
   */
  buildRowValues(payload, columnMapping) {
    // Create array with 26 columns (A-Z)
    const rowValues = new Array(26).fill('');

    Object.entries(columnMapping).forEach(([field, column]) => {
      const colIndex = column.charCodeAt(0) - 'A'.charCodeAt(0);
      if (colIndex >= 0 && colIndex < 26) {
        rowValues[colIndex] = payload[field] || '';
      }
    });

    return rowValues;
  }

  /**
   * Check rate limit for Google Sheets API
   */
  async checkRateLimit() {
    const now = Date.now();
    
    if (now > this.rateLimitTracker.resetTime) {
      this.rateLimitTracker.count = 0;
      this.rateLimitTracker.resetTime = now + 60000;
    }

    if (this.rateLimitTracker.count >= RATE_LIMITS.GOOGLE_SHEETS.requestsPerMinute) {
      const waitTime = this.rateLimitTracker.resetTime - now;
      toast.warning(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.rateLimitTracker.count++;
  }

  /**
   * Log sync operation
   */
  async logSync(companyId, module, action, status, response) {
    try {
      await this.supabase.from('sync_logs').insert({
        company_id: companyId,
        module: module,
        action: action,
        status: status,
        response: safeJsonStringify(response),
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log sync:', error);
    }
  }

  /**
   * Process entire sync queue
   */
  async processQueue() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    this.isSyncing = true;

    try {
      while (this.syncQueue.length > 0) {
        const approvalId = this.syncQueue.shift();
        await this.processApproval(approvalId);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Add item to sync queue
   */
  addToQueue(approvalId) {
    this.syncQueue.push(approvalId);
    if (!this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Read data from external storage (for displaying in UI)
   */
  async readData(moduleName, companyId) {
    try {
      // Get integration config
      const integrations = await this.supabase
        .from('integrations')
        .select('*')
        .eq('company_id', companyId)
        .eq('type', INTEGRATION_TYPES.GOOGLE_SHEETS)
        .single();

      const integration = Array.isArray(integrations) ? integrations[0] : integrations;

      if (!integration) {
        // No integration - return empty or fallback to local data
        return { data: [], source: 'none' };
      }

      if (integration.type === INTEGRATION_TYPES.GOOGLE_SHEETS) {
        return await this.googleSheetsRead(moduleName, integration);
      } else if (integration.type === INTEGRATION_TYPES.EXCEL) {
        return await this.excelRead(moduleName, integration);
      }

      return { data: [], source: 'unknown' };
    } catch (error) {
      console.error('Read error:', error);
      return { data: [], source: 'error', error: error.message };
    }
  }

  /**
   * Google Sheets - Read data
   */
  async googleSheetsRead(moduleName, integration) {
    await this.checkRateLimit();

    const sheetId = integration.sheet_id;
    const range = `${moduleName}!A:Z`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google Sheets API error');
    }

    const result = await response.json();
    const values = result.values || [];

    // Convert to objects using header row
    if (values.length === 0) {
      return { data: [], source: 'google_sheets' };
    }

    const headers = values[0];
    const data = values.slice(1).map((row, index) => {
      const obj = { row_id: String.fromCharCode(65) + (index + 2) }; // A2, A3, etc.
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });

    return { data, source: 'google_sheets' };
  }

  /**
   * Excel - Read data
   */
  async excelRead(moduleName, integration) {
    // For Excel, read from Supabase storage
    try {
      const tableName = `excel_${moduleName}`;
      const data = await this.supabase
        .from(tableName)
        .select('*')
        .eq('company_id', integration.company_id);
      
      return { data: data || [], source: 'excel' };
    } catch (error) {
      const data = await this.supabase
        .from('excel_data')
        .select('*')
        .eq('company_id', integration.company_id)
        .eq('module', moduleName);
      
      return { data: (data || []).map(d => d.data), source: 'excel' };
    }
  }
}

// Export singleton instance
export const syncEngine = new SyncEngine();
export default syncEngine;
