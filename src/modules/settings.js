/**
 * Settings Module - Google Sheets & Excel Integration Configuration
 * Manage external storage connections and column mappings
 */

import { authManager } from '../lib/auth.js';
import { toast } from '../utils/helpers.js';
import { syncEngine } from './sync.js';

export const settingsModule = {
  /**
   * Initialize settings module
   */
  init() {
    console.log('Settings module initialized');
  },

  /**
   * Get integration config for current company
   */
  async getIntegration(type = 'google_sheets') {
    try {
      const { data, error } = await window.supabase
        .from('integrations')
        .select('*')
        .eq('company_id', authManager.currentUser.company_id)
        .eq('type', type)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get integration:', error);
      return null;
    }
  },

  /**
   * Save integration config
   */
  async saveIntegration(config) {
    try {
      const existing = await this.getIntegration(config.type);

      if (existing) {
        const { error } = await window.supabase
          .from('integrations')
          .update({
            access_token: config.access_token,
            refresh_token: config.refresh_token,
            sheet_id: config.sheet_id,
            mapping_json: JSON.stringify(config.mapping),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast('Integration updated successfully', 'success');
      } else {
        const { error } = await window.supabase
          .from('integrations')
          .insert([{
            company_id: authManager.currentUser.company_id,
            type: config.type,
            access_token: config.access_token || '',
            refresh_token: config.refresh_token || '',
            sheet_id: config.sheet_id || '',
            mapping_json: JSON.stringify(config.mapping || {}),
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
        toast('Integration saved successfully', 'success');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to save integration:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Test Google Sheets connection
   */
  async testGoogleSheetsConnection(sheetId, accessToken) {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Connection failed');
      }

      const data = await response.json();
      return {
        success: true,
        spreadsheetName: data.properties?.title
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Get Google Sheets list
   */
  async getGoogleSheetsList(accessToken) {
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&fields=files(id,name)',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch spreadsheets');
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Failed to get sheets list:', error);
      return [];
    }
  },

  /**
   * Create new Google Sheet for CRM
   */
  async createGoogleSheet(accessToken, title = 'CRM Data') {
    try {
      const response = await fetch(
        'https://sheets.googleapis.com/v4/spreadsheets',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: { title }
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create spreadsheet');
      }

      const data = await response.json();
      return {
        success: true,
        spreadsheetId: data.spreadsheetId,
        spreadsheetUrl: data.spreadsheetUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Setup default sheet tabs for CRM modules
   */
  async setupSheetTabs(accessToken, spreadsheetId) {
    const tabs = [
      { name: 'Leads', headers: ['ID', 'Lead Name', 'Company', 'Email', 'Phone', 'Source', 'Status', 'Assigned To', 'Notes', 'Created At', 'Updated At'] },
      { name: 'Tasks', headers: ['ID', 'Title', 'Description', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Completed At', 'Related Module', 'Related ID', 'Created By', 'Created At', 'Updated At'] },
      { name: 'Dispatch', headers: ['ID', 'Dispatch Number', 'Customer', 'Address', 'Date', 'Status', 'Driver', 'Vehicle', 'Notes', 'Created At'] },
      { name: 'Visits', headers: ['ID', 'Lead ID', 'Customer', 'Date', 'Time', 'Purpose', 'Notes', 'Follow Up', 'Status', 'Created At'] },
      { name: 'Quotations', headers: ['ID', 'Quote Number', 'Customer', 'Total', 'Status', 'Valid Until', 'Items', 'Created At', 'Updated At'] },
      { name: 'Products', headers: ['ID', 'SKU', 'Name', 'Description', 'Price', 'Cost', 'Stock', 'Category', 'Created At', 'Updated At'] }
    ];

    try {
      // Create all tabs in one batch request
      const requests = tabs.map(tab => ({
        addSheet: {
          properties: {
            title: tab.name
          }
        }
      }));

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create tabs');
      }

      // Add headers to each tab
      for (const tab of tabs) {
        await this._addHeadersToTab(accessToken, spreadsheetId, tab.name, tab.headers);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Add headers to a sheet tab
   */
  async _addHeadersToTab(accessToken, spreadsheetId, tabName, headers) {
    try {
      // First, get the sheet ID for this tab
      const sheetInfoResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const sheetInfo = await sheetInfoResponse.json();
      const sheet = sheetInfo.sheets.find(s => s.properties.title === tabName);
      
      if (!sheet) {
        throw new Error(`Tab "${tabName}" not found`);
      }

      const sheetId = sheet.properties.sheetId;

      // Add headers to row 1
      const values = [headers];
      const range = `${tabName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`;

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        }
      );

      // Make header row bold
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [{
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: { bold: true },
                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
                  }
                },
                fields: 'userEnteredFormat.textFormat,userEnteredFormat.backgroundColor'
              }
            }]
          })
        }
      );
    } catch (error) {
      console.error(`Failed to add headers to ${tabName}:`, error);
    }
  },

  /**
   * Get sync logs
   */
  async getSyncLogs(limit = 50) {
    try {
      const { data, error } = await window.supabase
        .from('sync_logs')
        .select('*')
        .eq('company_id', authManager.currentUser.company_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get sync logs:', error);
      return [];
    }
  },

  /**
   * Clear all cached data
   */
  clearCache() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('leads_') || key.startsWith('tasks_') || 
          key.startsWith('dispatch_') || key.startsWith('visits_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    toast('Cache cleared successfully', 'success');
  }
};

/**
 * UI Renderer for Settings Page
 */
export function renderSettingsPage() {
  return `
    <div class="module-container">
      <!-- Google Sheets Integration -->
      <div class="card mb-4">
        <div class="card-header">
          <h3 class="card-title">📊 Google Sheets Integration</h3>
        </div>
        <div class="card-body">
          <div id="googleSheetsStatus">
            <p class="text-muted">Checking connection status...</p>
          </div>
          
          <div id="googleSheetsConfig" style="display: none;">
            <div class="form-group">
              <label class="form-label">Spreadsheet ID</label>
              <div class="input-with-button">
                <input type="text" id="sheetId" class="form-input" readonly />
                <a id="openSheetBtn" href="#" target="_blank" class="btn btn-secondary">Open Sheet</a>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Access Token</label>
              <input type="password" id="accessToken" class="form-input" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Refresh Token</label>
              <input type="password" id="refreshToken" class="form-input" />
            </div>

            <div class="action-buttons mt-3">
              <button class="btn btn-primary" id="testConnectionBtn">Test Connection</button>
              <button class="btn btn-secondary" id="saveIntegrationBtn">Save Configuration</button>
            </div>
          </div>

          <div id="googleSheetsConnect" style="display: none;">
            <p class="text-muted mb-3">Connect your Google account to enable external storage:</p>
            <button class="btn btn-primary" id="connectGoogleBtn">
              🔗 Connect Google Account
            </button>
            <p class="text-sm text-muted mt-2">
              Or enter credentials manually below
            </p>
            <div class="form-group mt-3">
              <label class="form-label">Manual Access Token</label>
              <input type="text" id="manualAccessToken" class="form-input" placeholder="Paste your access token" />
            </div>
            <div class="form-group mt-2">
              <label class="form-label">Manual Refresh Token</label>
              <input type="text" id="manualRefreshToken" class="form-input" placeholder="Paste your refresh token" />
            </div>
            <button class="btn btn-secondary mt-2" id="useManualCredentialsBtn">Use Manual Credentials</button>
          </div>
        </div>
      </div>

      <!-- Column Mapping -->
      <div class="card mb-4">
        <div class="card-header">
          <h3 class="card-title">🗺️ Column Mapping</h3>
        </div>
        <div class="card-body">
          <p class="text-muted mb-3">Configure how your data maps to Google Sheets columns</p>
          
          <div class="mapping-tabs">
            <button class="mapping-tab active" data-module="leads">Leads</button>
            <button class="mapping-tab" data-module="tasks">Tasks</button>
            <button class="mapping-tab" data-module="dispatch">Dispatch</button>
          </div>

          <div id="mappingEditor" class="mt-3">
            <p class="text-center text-muted">Select a module to configure mapping</p>
          </div>
        </div>
      </div>

      <!-- Sync Logs -->
      <div class="card mb-4">
        <div class="card-header">
          <h3 class="card-title">📜 Sync Logs</h3>
          <button class="btn btn-secondary btn-sm" id="refreshLogsBtn">↻ Refresh</button>
        </div>
        <div class="card-body">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Response</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody id="syncLogsBody">
                <tr>
                  <td colspan="5" class="text-center text-muted">Loading sync logs...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Cache Management -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">💾 Cache Management</h3>
        </div>
        <div class="card-body">
          <p class="text-muted mb-3">Clear locally cached data to force fresh sync from external storage</p>
          <button class="btn btn-danger" id="clearCacheBtn">🗑️ Clear All Cache</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup settings page
 */
export async function setupSettingsPage() {
  // Load Google Sheets integration status
  await loadGoogleSheetsStatus();

  // Test connection button
  document.getElementById('testConnectionBtn')?.addEventListener('click', async () => {
    const sheetId = document.getElementById('sheetId').value;
    const accessToken = document.getElementById('accessToken').value;
    
    if (!sheetId || !accessToken) {
      toast('Please enter both Spreadsheet ID and Access Token', 'error');
      return;
    }

    const result = await settingsModule.testGoogleSheetsConnection(sheetId, accessToken);
    
    if (result.success) {
      toast(`Connected to: ${result.spreadsheetName}`, 'success');
    } else {
      toast(`Connection failed: ${result.error}`, 'error');
    }
  });

  // Save integration button
  document.getElementById('saveIntegrationBtn')?.addEventListener('click', async () => {
    const config = {
      type: 'google_sheets',
      sheet_id: document.getElementById('sheetId').value,
      access_token: document.getElementById('accessToken').value,
      refresh_token: document.getElementById('refreshToken').value,
      mapping: getDefaultMapping()
    };

    const result = await settingsModule.saveIntegration(config);
    
    if (result.success) {
      loadGoogleSheetsStatus();
    }
  });

  // Use manual credentials
  document.getElementById('useManualCredentialsBtn')?.addEventListener('click', () => {
    const accessToken = document.getElementById('manualAccessToken').value;
    const refreshToken = document.getElementById('manualRefreshToken').value;
    
    if (accessToken) {
      document.getElementById('accessToken').value = accessToken;
      document.getElementById('refreshToken').value = refreshToken;
      document.getElementById('googleSheetsConnect').style.display = 'none';
      document.getElementById('googleSheetsConfig').style.display = 'block';
      toast('Credentials loaded. Click "Test Connection" to verify.', 'info');
    } else {
      toast('Please enter an access token', 'error');
    }
  });

  // Refresh logs
  document.getElementById('refreshLogsBtn')?.addEventListener('click', loadSyncLogs);

  // Clear cache
  document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all cached data?')) {
      settingsModule.clearCache();
    }
  });

  // Mapping tabs
  document.querySelectorAll('.mapping-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.mapping-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      loadMappingEditor(e.target.dataset.module);
    });
  });

  // Initial logs load
  loadSyncLogs();
}

/**
 * Load Google Sheets status
 */
async function loadGoogleSheetsStatus() {
  const container = document.getElementById('googleSheetsStatus');
  const configDiv = document.getElementById('googleSheetsConfig');
  const connectDiv = document.getElementById('googleSheetsConnect');
  
  const integration = await settingsModule.getIntegration('google_sheets');
  
  if (integration && integration.sheet_id) {
    container.style.display = 'none';
    connectDiv.style.display = 'none';
    configDiv.style.display = 'block';
    
    document.getElementById('sheetId').value = integration.sheet_id;
    document.getElementById('accessToken').value = integration.access_token || '';
    document.getElementById('refreshToken').value = integration.refresh_token || '';
    document.getElementById('openSheetBtn').href = `https://docs.google.com/spreadsheets/d/${integration.sheet_id}`;
  } else {
    container.innerHTML = '<p class="text-warning">⚠️ Not connected to Google Sheets</p>';
    configDiv.style.display = 'none';
    connectDiv.style.display = 'block';
  }
}

/**
 * Load sync logs
 */
async function loadSyncLogs() {
  const logs = await settingsModule.getSyncLogs();
  const tbody = document.getElementById('syncLogsBody');
  
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No sync logs yet</td></tr>';
    return;
  }
  
  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>${log.module}</td>
      <td>${log.action}</td>
      <td><span class="badge badge-${log.status === 'success' ? 'success' : 'danger'}">${log.status}</span></td>
      <td><small>${truncate(log.response || '-', 50)}</small></td>
      <td><small>${new Date(log.created_at).toLocaleString()}</small></td>
    </tr>
  `).join('');
}

/**
 * Load mapping editor for a module
 */
function loadMappingEditor(module) {
  const mappings = {
    leads: {
      id: 'A', lead_name: 'B', company: 'C', email: 'D', phone: 'E', 
      source: 'F', status: 'G', assigned_to: 'H', notes: 'I', 
      created_at: 'J', updated_at: 'K'
    },
    tasks: {
      id: 'A', title: 'B', description: 'C', status: 'D', priority: 'E',
      assigned_to: 'F', due_date: 'G', completed_at: 'H', related_module: 'I',
      related_id: 'J', created_by: 'K', created_at: 'L', updated_at: 'M'
    },
    dispatch: {
      id: 'A', dispatch_number: 'B', customer: 'C', address: 'D',
      date: 'E', status: 'F', driver: 'G', vehicle: 'H', notes: 'I', created_at: 'J'
    }
  };

  const mapping = mappings[module] || {};
  const container = document.getElementById('mappingEditor');
  
  container.innerHTML = `
    <h4>${module.charAt(0).toUpperCase() + module.slice(1)} Mapping</h4>
    <div class="mapping-grid">
      ${Object.entries(mapping).map(([field, column]) => `
        <div class="mapping-item">
          <label>${field}</label>
          <select class="form-input" data-field="${field}">
            ${generateColumnOptions(column)}
          </select>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-primary mt-3" onclick="toast('Mapping saved (demo mode)', 'success')">Save Mapping</button>
  `;
}

function generateColumnOptions(selected) {
  const columns = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return columns.map(col => 
    `<option value="${col}" ${col === selected ? 'selected' : ''}>Column ${col}</option>`
  ).join('');
}

function getDefaultMapping() {
  return {
    leads: { id: 'A', lead_name: 'B', company: 'C', email: 'D', phone: 'E', source: 'F', status: 'G', assigned_to: 'H', notes: 'I', created_at: 'J', updated_at: 'K' },
    tasks: { id: 'A', title: 'B', description: 'C', status: 'D', priority: 'E', assigned_to: 'F', due_date: 'G', completed_at: 'H', related_module: 'I', related_id: 'J', created_by: 'K', created_at: 'L', updated_at: 'M' }
  };
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len) + '...';
}
