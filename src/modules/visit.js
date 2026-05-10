/**
 * Visit Module - Customer Visit Tracking
 * Handles visit records for sales/service visits
 */

import { authManager } from '../lib/auth.js';
import { approvalEngine } from './approvals.js';
import { syncEngine } from './sync.js';
import { toast, formatDate, generateId } from '../utils/helpers.js';

const MODULE_NAME = 'visit';

// Column mapping for Google Sheets
const COLUMN_MAPPING = {
  id: 'A',
  visit_number: 'B',
  visitor_name: 'C',
  customer_name: 'D',
  customer_phone: 'E',
  customer_email: 'F',
  visit_purpose: 'G',
  visit_type: 'H',
  status: 'I',
  scheduled_date: 'J',
  actual_date: 'K',
  address: 'L',
  notes: 'M',
  follow_up_required: 'N',
  follow_up_date: 'O',
  outcome: 'P',
  created_at: 'Q',
  updated_at: 'R'
};

let visits = [];

/**
 * Initialize Visit module
 */
export function init() {
  loadVisits();
}

/**
 * Load visits from storage
 */
async function loadVisits() {
  try {
    // Try to load from integration first (Google Sheets)
    const syncedData = await syncEngine.pullData(MODULE_NAME, COLUMN_MAPPING);
    
    if (syncedData && syncedData.length > 0) {
      visits = syncedData;
    } else {
      // Fallback to local storage for demo
      const stored = localStorage.getItem(`visits_${authManager.getCompanyId()}`);
      visits = stored ? JSON.parse(stored) : [];
    }
  } catch (error) {
    console.error('Failed to load visits:', error);
    visits = [];
  }
}

/**
 * Save visits to local storage (fallback)
 */
function saveToLocal() {
  localStorage.setItem(`visits_${authManager.getCompanyId()}`, JSON.stringify(visits));
}

/**
 * Get all visits
 */
export function getAllVisits() {
  return [...visits];
}

/**
 * Get visit by ID
 */
export function getVisitById(id) {
  return visits.find(v => v.id === id);
}

/**
 * Create new visit (requires approval)
 */
export async function createVisit(data) {
  const visit = {
    id: generateId('VISIT'),
    visit_number: `VISIT-${Date.now()}`,
    visitor_name: data.visitor_name || '',
    customer_name: data.customer_name || '',
    customer_phone: data.customer_phone || '',
    customer_email: data.customer_email || '',
    visit_purpose: data.visit_purpose || '',
    visit_type: data.visit_type || 'sales',
    status: data.status || 'scheduled',
    scheduled_date: data.scheduled_date || '',
    actual_date: data.actual_date || '',
    address: data.address || '',
    notes: data.notes || '',
    follow_up_required: data.follow_up_required || false,
    follow_up_date: data.follow_up_date || '',
    outcome: data.outcome || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Submit for approval
  const result = await approvalEngine.submitForApproval({
    module_name: MODULE_NAME,
    action_type: 'create',
    payload: JSON.stringify(visit),
    metadata: {
      visit_number: visit.visit_number,
      customer: visit.customer_name
    }
  });

  if (result.success) {
    // Optimistically add to local list
    visits.push(visit);
    saveToLocal();
    toast('Visit submitted for approval', 'success');
  }

  return result;
}

/**
 * Update visit (requires approval)
 */
export async function updateVisit(id, updates) {
  const existing = getVisitById(id);
  
  if (!existing) {
    return { success: false, error: 'Visit not found' };
  }

  const updated = {
    ...existing,
    ...updates,
    id: existing.id,
    updated_at: new Date().toISOString()
  };

  // Submit for approval
  const result = await approvalEngine.submitForApproval({
    module_name: MODULE_NAME,
    action_type: 'update',
    payload: JSON.stringify(updated),
    metadata: {
      visit_id: id,
      changes: Object.keys(updates)
    }
  });

  if (result.success) {
    // Optimistically update local list
    const index = visits.findIndex(v => v.id === id);
    if (index !== -1) {
      visits[index] = updated;
      saveToLocal();
    }
    toast('Update submitted for approval', 'success');
  }

  return result;
}

/**
 * Delete visit (requires approval)
 */
export async function deleteVisit(id) {
  const existing = getVisitById(id);
  
  if (!existing) {
    return { success: false, error: 'Visit not found' };
  }

  // Submit for approval
  const result = await approvalEngine.submitForApproval({
    module_name: MODULE_NAME,
    action_type: 'delete',
    payload: JSON.stringify({ id }),
    metadata: {
      visit_id: id,
      visit_number: existing.visit_number
    }
  });

  if (result.success) {
    // Optimistically remove from local list
    visits = visits.filter(v => v.id !== id);
    saveToLocal();
    toast('Delete submitted for approval', 'success');
  }

  return result;
}

/**
 * Execute approved action (called by approval engine)
 */
export async function executeAction(action) {
  const payload = JSON.parse(action.payload);

  switch (action.action_type) {
    case 'create':
      await syncEngine.pushToSheet(MODULE_NAME, payload, COLUMN_MAPPING, 'create');
      break;

    case 'update':
      await syncEngine.pushToSheet(MODULE_NAME, payload, COLUMN_MAPPING, 'update');
      break;

    case 'delete':
      await syncEngine.pushToSheet(MODULE_NAME, payload, COLUMN_MAPPING, 'delete');
      break;
  }

  return { success: true };
}

/**
 * Filter visits by status
 */
export function filterByStatus(status) {
  return visits.filter(v => v.status === status);
}

/**
 * Filter visits by type
 */
export function filterByType(type) {
  return visits.filter(v => v.visit_type === type);
}

/**
 * Get upcoming visits
 */
export function getUpcomingVisits() {
  const now = new Date();
  return visits.filter(v => {
    if (!v.scheduled_date) return false;
    const visitDate = new Date(v.scheduled_date);
    return visitDate >= now && v.status === 'scheduled';
  });
}

/**
 * Get visits requiring follow-up
 */
export function getFollowUpVisits() {
  return visits.filter(v => v.follow_up_required && v.status === 'completed');
}

/**
 * Render visit page HTML
 */
export function renderVisitPage() {
  const user = authManager.getCurrentUser();

  return `
    <div class="module-container">
      <!-- Action Bar -->
      <div class="action-bar">
        <div class="search-box">
          <input type="text" id="visitSearch" class="form-input" placeholder="🔍 Search visits..." />
        </div>
        <div class="action-buttons">
          <select id="typeFilter" class="form-input">
            <option value="">All Types</option>
            <option value="sales">Sales</option>
            <option value="service">Service</option>
            <option value="support">Support</option>
            <option value="meeting">Meeting</option>
          </select>
          ${user ? `
            <button class="btn btn-primary" onclick="window.showVisitModal()">
              + New Visit
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="mini-stat">
          <span class="mini-stat-value">${visits.length}</span>
          <span class="mini-stat-label">Total</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">${getUpcomingVisits().length}</span>
          <span class="mini-stat-label">Upcoming</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">${filterByStatus('completed').length}</span>
          <span class="mini-stat-label">Completed</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">${getFollowUpVisits().length}</span>
          <span class="mini-stat-label">Follow-up</span>
        </div>
      </div>

      <!-- Visit Table -->
      <div class="card">
        <div class="card-body no-padding">
          <div class="table-responsive">
            <table class="data-table" id="visitTable">
              <thead>
                <tr>
                  <th>Visit #</th>
                  <th>Visitor</th>
                  <th>Customer</th>
                  <th>Purpose</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Scheduled Date</th>
                  <th>Follow-up</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="visitTableBody">
                ${renderVisitRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Visit Modal -->
    <div id="visitModal" class="modal" style="display: none;">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3 class="modal-title" id="modalTitle">New Visit</h3>
          <button class="modal-close" onclick="window.closeVisitModal()">&times;</button>
        </div>
        <form id="visitForm">
          <input type="hidden" id="visitId" />
          
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Visitor Name *</label>
              <input type="text" id="visitorName" class="form-input" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Customer Name *</label>
              <input type="text" id="customerName" class="form-input" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Customer Phone</label>
              <input type="tel" id="customerPhone" class="form-input" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Customer Email</label>
              <input type="email" id="customerEmail" class="form-input" />
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Visit Purpose *</label>
              <input type="text" id="visitPurpose" class="form-input" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Visit Type *</label>
              <select id="visitType" class="form-input" required>
                <option value="sales">Sales</option>
                <option value="service">Service</option>
                <option value="support">Support</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="visitStatus" class="form-input">
                <option value="scheduled" selected>Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Scheduled Date *</label>
              <input type="datetime-local" id="scheduledDate" class="form-input" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Actual Date</label>
              <input type="datetime-local" id="actualDate" class="form-input" />
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Address *</label>
              <textarea id="address" class="form-input" rows="2" required></textarea>
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Notes</label>
              <textarea id="notes" class="form-input" rows="2"></textarea>
            </div>
            
            <div class="form-group">
              <label class="form-label">Follow-up Required?</label>
              <select id="followUpRequired" class="form-input">
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Follow-up Date</label>
              <input type="date" id="followUpDate" class="form-input" />
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Outcome</label>
              <textarea id="outcome" class="form-input" rows="2" placeholder="Visit outcome and results"></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.closeVisitModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveVisitBtn">
              Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Render table rows
 */
function renderVisitRows(filterText = '', typeFilter = '') {
  let filtered = [...visits];

  if (filterText) {
    filtered = filtered.filter(v => 
      v.visit_number.toLowerCase().includes(filterText.toLowerCase()) ||
      v.visitor_name.toLowerCase().includes(filterText.toLowerCase()) ||
      v.customer_name.toLowerCase().includes(filterText.toLowerCase())
    );
  }

  if (typeFilter) {
    filtered = filtered.filter(v => v.visit_type === typeFilter);
  }

  if (filtered.length === 0) {
    return '<tr><td colspan="9" class="text-center text-muted">No visits found</td></tr>';
  }

  return filtered.map(v => `
    <tr>
      <td><strong>${v.visit_number}</strong></td>
      <td>${v.visitor_name}</td>
      <td>${v.customer_name}<br/><small class="text-muted">${v.customer_phone || ''}</small></td>
      <td>${v.visit_purpose}</td>
      <td>${getTypeBadge(v.visit_type)}</td>
      <td>${getStatusBadge(v.status)}</td>
      <td>${formatDate(v.scheduled_date)}</td>
      <td>${v.follow_up_required ? '✅ ' + formatDate(v.follow_up_date) : '—'}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="window.editVisit('${v.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="window.deleteVisit('${v.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Setup visit page event listeners
 */
export async function setupVisitPage() {
  await loadVisits();
  renderVisitTable();

  // Search handler
  document.getElementById('visitSearch')?.addEventListener('input', (e) => {
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    document.getElementById('visitTableBody').innerHTML = 
      renderVisitRows(e.target.value, typeFilter);
  });

  // Type filter handler
  document.getElementById('typeFilter')?.addEventListener('change', (e) => {
    const searchText = document.getElementById('visitSearch')?.value || '';
    document.getElementById('visitTableBody').innerHTML = 
      renderVisitRows(searchText, e.target.value);
  });

  // Form submit handler
  document.getElementById('visitForm')?.addEventListener('submit', handleFormSubmit);

  // Expose functions globally
  window.showVisitModal = showVisitModal;
  window.closeVisitModal = closeVisitModal;
  window.editVisit = editVisit;
  window.deleteVisit = deleteVisitGlobal;
}

/**
 * Render visit table
 */
function renderVisitTable() {
  const body = document.getElementById('visitTableBody');
  if (body) {
    body.innerHTML = renderVisitRows();
  }
}

/**
 * Show visit modal (create mode)
 */
function showVisitModal() {
  document.getElementById('modalTitle').textContent = 'New Visit';
  document.getElementById('visitId').value = '';
  document.getElementById('visitForm').reset();
  document.getElementById('saveVisitBtn').textContent = 'Submit for Approval';
  document.getElementById('visitModal').style.display = 'flex';
}

/**
 * Close visit modal
 */
function closeVisitModal() {
  document.getElementById('visitModal').style.display = 'none';
}

/**
 * Edit visit
 */
async function editVisit(id) {
  const visit = getVisitById(id);
  if (!visit) return;

  document.getElementById('modalTitle').textContent = 'Edit Visit';
  document.getElementById('visitId').value = visit.id;
  document.getElementById('visitorName').value = visit.visitor_name;
  document.getElementById('customerName').value = visit.customer_name;
  document.getElementById('customerPhone').value = visit.customer_phone || '';
  document.getElementById('customerEmail').value = visit.customer_email || '';
  document.getElementById('visitPurpose').value = visit.visit_purpose;
  document.getElementById('visitType').value = visit.visit_type;
  document.getElementById('visitStatus').value = visit.status;
  document.getElementById('scheduledDate').value = visit.scheduled_date ? 
    new Date(visit.scheduled_date).toISOString().slice(0, 16) : '';
  document.getElementById('actualDate').value = visit.actual_date ? 
    new Date(visit.actual_date).toISOString().slice(0, 16) : '';
  document.getElementById('address').value = visit.address;
  document.getElementById('notes').value = visit.notes;
  document.getElementById('followUpRequired').value = String(visit.follow_up_required);
  document.getElementById('followUpDate').value = visit.follow_up_date || '';
  document.getElementById('outcome').value = visit.outcome || '';
  document.getElementById('saveVisitBtn').textContent = 'Submit Update for Approval';
  
  document.getElementById('visitModal').style.display = 'flex';
}

/**
 * Handle form submit
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('visitId').value;
  const data = {
    visitor_name: document.getElementById('visitorName').value,
    customer_name: document.getElementById('customerName').value,
    customer_phone: document.getElementById('customerPhone').value,
    customer_email: document.getElementById('customerEmail').value,
    visit_purpose: document.getElementById('visitPurpose').value,
    visit_type: document.getElementById('visitType').value,
    status: document.getElementById('visitStatus').value,
    scheduled_date: document.getElementById('scheduledDate').value,
    actual_date: document.getElementById('actualDate').value,
    address: document.getElementById('address').value,
    notes: document.getElementById('notes').value,
    follow_up_required: document.getElementById('followUpRequired').value === 'true',
    follow_up_date: document.getElementById('followUpDate').value,
    outcome: document.getElementById('outcome').value
  };

  let result;
  if (id) {
    result = await updateVisit(id, data);
  } else {
    result = await createVisit(data);
  }

  if (result.success) {
    closeVisitModal();
    await loadVisits();
    renderVisitTable();
  }
}

/**
 * Delete visit (global handler)
 */
async function deleteVisitGlobal(id) {
  if (!confirm('Are you sure you want to delete this visit? This requires admin approval.')) {
    return;
  }

  const result = await deleteVisit(id);
  
  if (result.success) {
    await loadVisits();
    renderVisitTable();
  }
}

// Utility functions
function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getTypeBadge(type) {
  const colors = {
    sales: 'badge-primary',
    service: 'badge-info',
    support: 'badge-success',
    meeting: 'badge-warning'
  };
  return `<span class="badge ${colors[type] || 'badge-secondary'}">${capitalizeFirst(type)}</span>`;
}

function getStatusBadge(status) {
  const colors = {
    scheduled: 'badge-info',
    in_progress: 'badge-warning',
    completed: 'badge-success',
    cancelled: 'badge-secondary'
  };
  return `<span class="badge ${colors[status] || 'badge-secondary'}">${capitalizeFirst(status.replace('_', ' '))}</span>`;
}

// Export for global access
window.visitModule = {
  createVisit,
  updateVisit,
  deleteVisit,
  getAllVisits,
  getVisitById
};
