/**
 * Leads Module - Complete CRUD with Approval Flow
 * All operations go through approval engine before syncing to Google Sheets
 */

import { authManager } from '../lib/auth.js';
import { approvalEngine } from './approvals.js';
import { toast, generateId, formatDate } from '../utils/helpers.js';

export const leadsModule = {
  moduleName: 'leads',
  
  // Column mapping for Google Sheets
  columnMapping: {
    id: 'A',
    lead_name: 'B',
    company: 'C',
    email: 'D',
    phone: 'E',
    source: 'F',
    status: 'G',
    assigned_to: 'H',
    notes: 'I',
    created_at: 'J',
    updated_at: 'K'
  },

  /**
   * Initialize leads module
   */
  init() {
    console.log('Leads module initialized');
  },

  /**
   * Get all leads (from external storage via sync engine)
   */
  async getAll() {
    try {
      // In production, this would fetch from Google Sheets via sync engine
      // For now, we'll check if there's cached data or return empty
      const stored = localStorage.getItem(`leads_${authManager.currentUser.company_id}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get leads:', error);
      return [];
    }
  },

  /**
   * Get single lead by ID
   */
  async getById(id) {
    const leads = await this.getAll();
    return leads.find(lead => lead.id === id);
  },

  /**
   * Create new lead (requires approval)
   */
  async create(leadData) {
    const lead = {
      id: generateId(),
      lead_name: leadData.lead_name || '',
      company: leadData.company || '',
      email: leadData.email || '',
      phone: leadData.phone || '',
      source: leadData.source || 'website',
      status: leadData.status || 'new',
      assigned_to: leadData.assigned_to || authManager.currentUser.id,
      notes: leadData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Submit for approval
    const result = await approvalEngine.submitForApproval({
      module_name: this.moduleName,
      action_type: 'create',
      payload: lead,
      metadata: {
        sheet_tab: 'Leads',
        columns: this.columnMapping
      }
    });

    if (result.success) {
      toast('Lead submitted for approval', 'success');
      
      // Optimistically add to local cache
      await this._addToCache(lead);
    }

    return result;
  },

  /**
   * Update existing lead (requires approval)
   */
  async update(id, updates) {
    const lead = await this.getById(id);
    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    const updatedLead = {
      ...lead,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Submit for approval
    const result = await approvalEngine.submitForApproval({
      module_name: this.moduleName,
      action_type: 'update',
      payload: updatedLead,
      metadata: {
        sheet_tab: 'Leads',
        columns: this.columnMapping,
        match_field: 'id',
        match_value: id
      }
    });

    if (result.success) {
      toast('Update submitted for approval', 'success');
      
      // Optimistically update local cache
      await this._updateCache(updatedLead);
    }

    return result;
  },

  /**
   * Delete lead (requires approval)
   */
  async delete(id) {
    const lead = await this.getById(id);
    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    // Submit for approval
    const result = await approvalEngine.submitForApproval({
      module_name: this.moduleName,
      action_type: 'delete',
      payload: { id },
      metadata: {
        sheet_tab: 'Leads',
        columns: this.columnMapping,
        match_field: 'id',
        match_value: id
      }
    });

    if (result.success) {
      toast('Delete submitted for approval', 'success');
      
      // Optimistically remove from local cache
      await this._removeFromCache(id);
    }

    return result;
  },

  /**
   * Bulk import leads (requires approval)
   */
  async bulkImport(leadsArray) {
    const leads = leadsArray.map(data => ({
      id: generateId(),
      lead_name: data.lead_name || '',
      company: data.company || '',
      email: data.email || '',
      phone: data.phone || '',
      source: data.source || 'import',
      status: data.status || 'new',
      assigned_to: data.assigned_to || authManager.currentUser.id,
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Submit for approval
    const result = await approvalEngine.submitForApproval({
      module_name: this.moduleName,
      action_type: 'bulk_create',
      payload: { leads },
      metadata: {
        sheet_tab: 'Leads',
        columns: this.columnMapping
      }
    });

    if (result.success) {
      toast(`${leads.length} leads submitted for approval`, 'success');
    }

    return result;
  },

  /**
   * Change lead status (quick action, requires approval)
   */
  async changeStatus(id, newStatus) {
    return await this.update(id, { status: newStatus });
  },

  /**
   * Assign lead to user (requires approval)
   */
  async assign(id, userId) {
    return await this.update(id, { assigned_to: userId });
  },

  /**
   * Local cache helpers (for offline/demo mode)
   */
  async _addToCache(lead) {
    const leads = await this.getAll();
    leads.push(lead);
    localStorage.setItem(`leads_${authManager.currentUser.company_id}`, JSON.stringify(leads));
  },

  async _updateCache(updatedLead) {
    const leads = await this.getAll();
    const index = leads.findIndex(l => l.id === updatedLead.id);
    if (index !== -1) {
      leads[index] = updatedLead;
      localStorage.setItem(`leads_${authManager.currentUser.company_id}`, JSON.stringify(leads));
    }
  },

  async _removeFromCache(id) {
    const leads = await this.getAll();
    const filtered = leads.filter(l => l.id !== id);
    localStorage.setItem(`leads_${authManager.currentUser.company_id}`, JSON.stringify(filtered));
  },

  /**
   * Clear local cache
   */
  clearCache() {
    localStorage.removeItem(`leads_${authManager.currentUser.company_id}`);
  },

  /**
   * Get leads by status
   */
  async getByStatus(status) {
    const leads = await this.getAll();
    return leads.filter(lead => lead.status === status);
  },

  /**
   * Get leads assigned to current user
   */
  async getMyLeads() {
    const leads = await this.getAll();
    return leads.filter(lead => lead.assigned_to === authManager.currentUser.id);
  },

  /**
   * Search leads
   */
  async search(query) {
    const leads = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return leads.filter(lead => 
      lead.lead_name.toLowerCase().includes(lowerQuery) ||
      lead.company.toLowerCase().includes(lowerQuery) ||
      lead.email.toLowerCase().includes(lowerQuery) ||
      lead.phone.includes(query)
    );
  }
};

/**
 * UI Renderer for Leads Page
 */
export function renderLeadsPage() {
  return `
    <div class="module-container">
      <!-- Action Bar -->
      <div class="action-bar">
        <div class="search-box">
          <input type="text" id="leadsSearch" class="form-input" placeholder="🔍 Search leads..." />
        </div>
        <div class="action-buttons">
          <button class="btn btn-secondary" id="exportLeadsBtn">
            📤 Export
          </button>
          <button class="btn btn-primary" id="addLeadBtn">
            ➕ Add Lead
          </button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-tabs">
        <button class="filter-tab active" data-filter="all">All</button>
        <button class="filter-tab" data-filter="new">New</button>
        <button class="filter-tab" data-filter="contacted">Contacted</button>
        <button class="filter-tab" data-filter="qualified">Qualified</button>
        <button class="filter-tab" data-filter="converted">Converted</button>
        <button class="filter-tab" data-filter="lost">Lost</button>
      </div>

      <!-- Leads Table -->
      <div class="card">
        <div class="table-container">
          <table class="data-table" id="leadsTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="leadsTableBody">
              <tr>
                <td colspan="9" class="text-center text-muted">Loading leads...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div class="modal" id="leadModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modalTitle">Add New Lead</h3>
            <button class="modal-close" id="closeModal">&times;</button>
          </div>
          <form id="leadForm">
            <input type="hidden" id="leadId" />
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Lead Name *</label>
                <input type="text" id="leadName" class="form-input" required />
              </div>
              <div class="form-group">
                <label class="form-label">Company</label>
                <input type="text" id="leadCompany" class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" id="leadEmail" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="tel" id="leadPhone" class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Source</label>
                <select id="leadSource" class="form-input">
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social Media</option>
                  <option value="email">Email Campaign</option>
                  <option value="event">Event</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select id="leadStatus" class="form-input">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Notes</label>
              <textarea id="leadNotes" class="form-input" rows="3"></textarea>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
              <button type="submit" class="btn btn-primary">Submit for Approval</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup leads page event listeners and load data
 */
export async function setupLeadsPage() {
  const leads = await leadsModule.getAll();
  renderLeadsTable(leads);

  // Search functionality
  document.getElementById('leadsSearch').addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length >= 2) {
      const results = await leadsModule.search(query);
      renderLeadsTable(results);
    } else {
      renderLeadsTable(leads);
    }
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', async (e) => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      const filter = e.target.dataset.filter;
      let filteredLeads;
      
      if (filter === 'all') {
        filteredLeads = await leadsModule.getAll();
      } else {
        filteredLeads = await leadsModule.getByStatus(filter);
      }
      
      renderLeadsTable(filteredLeads);
    });
  });

  // Add lead button
  document.getElementById('addLeadBtn').addEventListener('click', () => {
    openLeadModal();
  });

  // Modal close
  document.getElementById('closeModal').addEventListener('click', closeLeadModal);
  document.getElementById('cancelBtn').addEventListener('click', closeLeadModal);

  // Form submit
  document.getElementById('leadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLeadSubmit();
  });

  // Export button
  document.getElementById('exportLeadsBtn').addEventListener('click', () => {
    exportLeadsToCSV(leads);
  });
}

/**
 * Render leads table
 */
function renderLeadsTable(leads) {
  const tbody = document.getElementById('leadsTableBody');
  
  if (leads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No leads found</td></tr>';
    return;
  }

  tbody.innerHTML = leads.map(lead => `
    <tr>
      <td><strong>${escapeHtml(lead.lead_name)}</strong></td>
      <td>${escapeHtml(lead.company || '-')}</td>
      <td>${lead.email || '-'}</td>
      <td>${lead.phone || '-'}</td>
      <td><span class="badge badge-info">${lead.source}</span></td>
      <td>${getStatusBadge(lead.status)}</td>
      <td>${lead.assigned_to === authManager.currentUser.id ? '<span class="badge badge-success">Me</span>' : 'Other'}</td>
      <td><small>${formatDate(lead.created_at)}</small></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="window.editLead('${lead.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="window.deleteLead('${lead.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Status badge helper
 */
function getStatusBadge(status) {
  const badges = {
    new: '<span class="badge badge-info">New</span>',
    contacted: '<span class="badge badge-warning">Contacted</span>',
    qualified: '<span class="badge badge-success">Qualified</span>',
    converted: '<span class="badge badge-primary">Converted</span>',
    lost: '<span class="badge badge-danger">Lost</span>'
  };
  return badges[status] || `<span class="badge">${status}</span>`;
}

/**
 * Open lead modal
 */
function openLeadModal(lead = null) {
  const modal = document.getElementById('leadModal');
  const title = document.getElementById('modalTitle');
  
  if (lead) {
    title.textContent = 'Edit Lead';
    document.getElementById('leadId').value = lead.id;
    document.getElementById('leadName').value = lead.lead_name;
    document.getElementById('leadCompany').value = lead.company || '';
    document.getElementById('leadEmail').value = lead.email || '';
    document.getElementById('leadPhone').value = lead.phone || '';
    document.getElementById('leadSource').value = lead.source;
    document.getElementById('leadStatus').value = lead.status;
    document.getElementById('leadNotes').value = lead.notes || '';
  } else {
    title.textContent = 'Add New Lead';
    document.getElementById('leadForm').reset();
    document.getElementById('leadId').value = '';
  }
  
  modal.classList.add('active');
}

/**
 * Close lead modal
 */
function closeLeadModal() {
  document.getElementById('leadModal').classList.remove('active');
}

/**
 * Handle lead form submission
 */
async function handleLeadSubmit() {
  const id = document.getElementById('leadId').value;
  const leadData = {
    lead_name: document.getElementById('leadName').value,
    company: document.getElementById('leadCompany').value,
    email: document.getElementById('leadEmail').value,
    phone: document.getElementById('leadPhone').value,
    source: document.getElementById('leadSource').value,
    status: document.getElementById('leadStatus').value,
    notes: document.getElementById('leadNotes').value
  };

  let result;
  if (id) {
    result = await leadsModule.update(id, leadData);
  } else {
    result = await leadsModule.create(leadData);
  }

  if (result.success) {
    closeLeadModal();
    const leads = await leadsModule.getAll();
    renderLeadsTable(leads);
  }
}

/**
 * Edit lead (global function for onclick handlers)
 */
export async function editLead(id) {
  const lead = await leadsModule.getById(id);
  if (lead) {
    openLeadModal(lead);
  }
}

/**
 * Delete lead (global function for onclick handlers)
 */
export async function deleteLead(id) {
  if (confirm('Are you sure you want to delete this lead? This action requires admin approval.')) {
    const result = await leadsModule.delete(id);
    if (result.success) {
      const leads = await leadsModule.getAll();
      renderLeadsTable(leads);
    }
  }
}

/**
 * Export leads to CSV
 */
function exportLeadsToCSV(leads) {
  const headers = ['ID', 'Name', 'Company', 'Email', 'Phone', 'Source', 'Status', 'Assigned To', 'Created At'];
  const csvContent = [
    headers.join(','),
    ...leads.map(lead => [
      lead.id,
      `"${lead.lead_name}"`,
      `"${lead.company || ''}"`,
      lead.email,
      lead.phone,
      lead.source,
      lead.status,
      lead.assigned_to,
      lead.created_at
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  toast('Leads exported successfully', 'success');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally available
window.editLead = editLead;
window.deleteLead = deleteLead;
