/**
 * Dispatch Module - Field Service Management
 * Handles dispatch records for field technicians/agents
 */

import { authManager } from '../lib/auth.js';
import { approvalEngine } from './approvals.js';
import { syncEngine } from './sync.js';
import { toast, formatDate, generateId } from '../utils/helpers.js';

const MODULE_NAME = 'dispatch';

// Column mapping for Google Sheets
const COLUMN_MAPPING = {
  id: 'A',
  dispatch_number: 'B',
  technician_name: 'C',
  customer_name: 'D',
  customer_phone: 'E',
  service_type: 'F',
  priority: 'G',
  status: 'H',
  scheduled_date: 'I',
  address: 'J',
  notes: 'K',
  created_at: 'L',
  updated_at: 'M'
};

let dispatches = [];

/**
 * Initialize Dispatch module
 */
export function init() {
  loadDispatches();
}

/**
 * Load dispatches from storage
 */
async function loadDispatches() {
  try {
    // Try to load from integration first (Google Sheets)
    const syncedData = await syncEngine.pullData(MODULE_NAME, COLUMN_MAPPING);
    
    if (syncedData && syncedData.length > 0) {
      dispatches = syncedData;
    } else {
      // Fallback to local storage for demo
      const stored = localStorage.getItem(`dispatches_${authManager.getCompanyId()}`);
      dispatches = stored ? JSON.parse(stored) : [];
    }
  } catch (error) {
    console.error('Failed to load dispatches:', error);
    dispatches = [];
  }
}

/**
 * Save dispatches to local storage (fallback)
 */
function saveToLocal() {
  localStorage.setItem(`dispatches_${authManager.getCompanyId()}`, JSON.stringify(dispatches));
}

/**
 * Get all dispatches
 */
export function getAllDispatches() {
  return [...dispatches];
}

/**
 * Get dispatch by ID
 */
export function getDispatchById(id) {
  return dispatches.find(d => d.id === id);
}

/**
 * Create new dispatch (requires approval)
 */
export async function createDispatch(data) {
  const dispatch = {
    id: generateId('DISP'),
    dispatch_number: `DISP-${Date.now()}`,
    technician_name: data.technician_name || '',
    customer_name: data.customer_name || '',
    customer_phone: data.customer_phone || '',
    service_type: data.service_type || '',
    priority: data.priority || 'medium',
    status: data.status || 'pending',
    scheduled_date: data.scheduled_date || '',
    address: data.address || '',
    notes: data.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Submit for approval
  const result = await approvalEngine.submitForApproval({
    module_name: MODULE_NAME,
    action_type: 'create',
    payload: JSON.stringify(dispatch),
    metadata: {
      dispatch_number: dispatch.dispatch_number,
      technician: dispatch.technician_name
    }
  });

  if (result.success) {
    // Optimistically add to local list
    dispatches.push(dispatch);
    saveToLocal();
    toast('Dispatch submitted for approval', 'success');
  }

  return result;
}

/**
 * Update dispatch (requires approval)
 */
export async function updateDispatch(id, updates) {
  const existing = getDispatchById(id);
  
  if (!existing) {
    return { success: false, error: 'Dispatch not found' };
  }

  const updated = {
    ...existing,
    ...updates,
    id: existing.id, // Ensure ID doesn't change
    updated_at: new Date().toISOString()
  };

  // Submit for approval
  const result = await approvalEngine.submitForApproval({
    module_name: MODULE_NAME,
    action_type: 'update',
    payload: JSON.stringify(updated),
    metadata: {
      dispatch_id: id,
      changes: Object.keys(updates)
    }
  });

  if (result.success) {
    // Optimistically update local list
    const index = dispatches.findIndex(d => d.id === id);
    if (index !== -1) {
      dispatches[index] = updated;
      saveToLocal();
    }
    toast('Update submitted for approval', 'success');
  }

  return result;
}

/**
 * Delete dispatch (requires approval)
 */
export async function deleteDispatch(id) {
  const existing = getDispatchById(id);
  
  if (!existing) {
    return { success: false, error: 'Dispatch not found' };
  }

  // Submit for approval
  const result = await approvalEngine.submitForApproval({
    module_name: MODULE_NAME,
    action_type: 'delete',
    payload: JSON.stringify({ id }),
    metadata: {
      dispatch_id: id,
      dispatch_number: existing.dispatch_number
    }
  });

  if (result.success) {
    // Optimistically remove from local list
    dispatches = dispatches.filter(d => d.id !== id);
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
      // Sync to external storage
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
 * Filter dispatches by status
 */
export function filterByStatus(status) {
  return dispatches.filter(d => d.status === status);
}

/**
 * Filter dispatches by technician
 */
export function filterByTechnician(technicianName) {
  return dispatches.filter(d => 
    d.technician_name.toLowerCase().includes(technicianName.toLowerCase())
  );
}

/**
 * Get pending dispatches
 */
export function getPendingDispatches() {
  return dispatches.filter(d => d.status === 'pending');
}

/**
 * Get today's dispatches
 */
export function getTodayDispatches() {
  const today = new Date().toISOString().split('T')[0];
  return dispatches.filter(d => d.scheduled_date?.startsWith(today));
}

/**
 * Render dispatch page HTML
 */
export function renderDispatchPage() {
  const user = authManager.getCurrentUser();
  const isAdmin = authManager.isAdmin();

  return `
    <div class="module-container">
      <!-- Action Bar -->
      <div class="action-bar">
        <div class="search-box">
          <input type="text" id="dispatchSearch" class="form-input" placeholder="🔍 Search dispatches..." />
        </div>
        <div class="action-buttons">
          <select id="statusFilter" class="form-input">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          ${user ? `
            <button class="btn btn-primary" onclick="window.showDispatchModal()">
              + New Dispatch
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="mini-stat">
          <span class="mini-stat-value">${dispatches.length}</span>
          <span class="mini-stat-label">Total</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">${getPendingDispatches().length}</span>
          <span class="mini-stat-label">Pending</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">${filterByStatus('in_progress').length}</span>
          <span class="mini-stat-label">In Progress</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">${filterByStatus('completed').length}</span>
          <span class="mini-stat-label">Completed</span>
        </div>
      </div>

      <!-- Dispatch Table -->
      <div class="card">
        <div class="card-body no-padding">
          <div class="table-responsive">
            <table class="data-table" id="dispatchTable">
              <thead>
                <tr>
                  <th>Dispatch #</th>
                  <th>Technician</th>
                  <th>Customer</th>
                  <th>Service Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Scheduled Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="dispatchTableBody">
                ${renderDispatchRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Dispatch Modal -->
    <div id="dispatchModal" class="modal" style="display: none;">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3 class="modal-title" id="modalTitle">New Dispatch</h3>
          <button class="modal-close" onclick="window.closeDispatchModal()">&times;</button>
        </div>
        <form id="dispatchForm">
          <input type="hidden" id="dispatchId" />
          
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Technician Name *</label>
              <input type="text" id="technicianName" class="form-input" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Customer Name *</label>
              <input type="text" id="customerName" class="form-input" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Customer Phone *</label>
              <input type="tel" id="customerPhone" class="form-input" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Service Type *</label>
              <select id="serviceType" class="form-input" required>
                <option value="">Select...</option>
                <option value="installation">Installation</option>
                <option value="repair">Repair</option>
                <option value="maintenance">Maintenance</option>
                <option value="inspection">Inspection</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select id="priority" class="form-input">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="status" class="form-input">
                <option value="pending" selected>Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Scheduled Date *</label>
              <input type="datetime-local" id="scheduledDate" class="form-input" required />
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Address *</label>
              <textarea id="address" class="form-input" rows="2" required></textarea>
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Notes</label>
              <textarea id="notes" class="form-input" rows="3"></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.closeDispatchModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveDispatchBtn">
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
function renderDispatchRows(filterText = '', statusFilter = '') {
  let filtered = [...dispatches];

  if (filterText) {
    filtered = filtered.filter(d => 
      d.dispatch_number.toLowerCase().includes(filterText.toLowerCase()) ||
      d.technician_name.toLowerCase().includes(filterText.toLowerCase()) ||
      d.customer_name.toLowerCase().includes(filterText.toLowerCase())
    );
  }

  if (statusFilter) {
    filtered = filtered.filter(d => d.status === statusFilter);
  }

  if (filtered.length === 0) {
    return '<tr><td colspan="8" class="text-center text-muted">No dispatches found</td></tr>';
  }

  return filtered.map(d => `
    <tr>
      <td><strong>${d.dispatch_number}</strong></td>
      <td>${d.technician_name}</td>
      <td>${d.customer_name}<br/><small class="text-muted">${d.customer_phone}</small></td>
      <td>${capitalizeFirst(d.service_type)}</td>
      <td>${getPriorityBadge(d.priority)}</td>
      <td>${getStatusBadge(d.status)}</td>
      <td>${formatDate(d.scheduled_date)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="window.editDispatch('${d.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="window.deleteDispatch('${d.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Setup dispatch page event listeners
 */
export async function setupDispatchPage() {
  await loadDispatches();
  renderDispatchTable();

  // Search handler
  document.getElementById('dispatchSearch')?.addEventListener('input', (e) => {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    document.getElementById('dispatchTableBody').innerHTML = 
      renderDispatchRows(e.target.value, statusFilter);
  });

  // Status filter handler
  document.getElementById('statusFilter')?.addEventListener('change', (e) => {
    const searchText = document.getElementById('dispatchSearch')?.value || '';
    document.getElementById('dispatchTableBody').innerHTML = 
      renderDispatchRows(searchText, e.target.value);
  });

  // Form submit handler
  document.getElementById('dispatchForm')?.addEventListener('submit', handleFormSubmit);

  // Expose functions globally for modal
  window.showDispatchModal = showDispatchModal;
  window.closeDispatchModal = closeDispatchModal;
  window.editDispatch = editDispatch;
  window.deleteDispatch = deleteDispatchGlobal;
}

/**
 * Render dispatch table
 */
function renderDispatchTable() {
  const body = document.getElementById('dispatchTableBody');
  if (body) {
    body.innerHTML = renderDispatchRows();
  }
}

/**
 * Show dispatch modal (create mode)
 */
function showDispatchModal() {
  document.getElementById('modalTitle').textContent = 'New Dispatch';
  document.getElementById('dispatchId').value = '';
  document.getElementById('dispatchForm').reset();
  document.getElementById('saveDispatchBtn').textContent = 'Submit for Approval';
  document.getElementById('dispatchModal').style.display = 'flex';
}

/**
 * Close dispatch modal
 */
function closeDispatchModal() {
  document.getElementById('dispatchModal').style.display = 'none';
}

/**
 * Edit dispatch
 */
async function editDispatch(id) {
  const dispatch = getDispatchById(id);
  if (!dispatch) return;

  document.getElementById('modalTitle').textContent = 'Edit Dispatch';
  document.getElementById('dispatchId').value = dispatch.id;
  document.getElementById('technicianName').value = dispatch.technician_name;
  document.getElementById('customerName').value = dispatch.customer_name;
  document.getElementById('customerPhone').value = dispatch.customer_phone;
  document.getElementById('serviceType').value = dispatch.service_type;
  document.getElementById('priority').value = dispatch.priority;
  document.getElementById('status').value = dispatch.status;
  document.getElementById('scheduledDate').value = dispatch.scheduled_date ? 
    new Date(dispatch.scheduled_date).toISOString().slice(0, 16) : '';
  document.getElementById('address').value = dispatch.address;
  document.getElementById('notes').value = dispatch.notes;
  document.getElementById('saveDispatchBtn').textContent = 'Submit Update for Approval';
  
  document.getElementById('dispatchModal').style.display = 'flex';
}

/**
 * Handle form submit
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('dispatchId').value;
  const data = {
    technician_name: document.getElementById('technicianName').value,
    customer_name: document.getElementById('customerName').value,
    customer_phone: document.getElementById('customerPhone').value,
    service_type: document.getElementById('serviceType').value,
    priority: document.getElementById('priority').value,
    status: document.getElementById('status').value,
    scheduled_date: document.getElementById('scheduledDate').value,
    address: document.getElementById('address').value,
    notes: document.getElementById('notes').value
  };

  let result;
  if (id) {
    result = await updateDispatch(id, data);
  } else {
    result = await createDispatch(data);
  }

  if (result.success) {
    closeDispatchModal();
    await loadDispatches();
    renderDispatchTable();
  }
}

/**
 * Delete dispatch (global handler)
 */
async function deleteDispatchGlobal(id) {
  if (!confirm('Are you sure you want to delete this dispatch? This requires admin approval.')) {
    return;
  }

  const result = await deleteDispatch(id);
  
  if (result.success) {
    await loadDispatches();
    renderDispatchTable();
  }
}

// Utility functions
function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getPriorityBadge(priority) {
  const colors = {
    low: 'badge-secondary',
    medium: 'badge-info',
    high: 'badge-warning',
    urgent: 'badge-danger'
  };
  return `<span class="badge ${colors[priority] || 'badge-secondary'}">${capitalizeFirst(priority)}</span>`;
}

function getStatusBadge(status) {
  const colors = {
    pending: 'badge-warning',
    scheduled: 'badge-info',
    in_progress: 'badge-primary',
    completed: 'badge-success',
    cancelled: 'badge-secondary'
  };
  return `<span class="badge ${colors[status] || 'badge-secondary'}">${capitalizeFirst(status.replace('_', ' '))}</span>`;
}

// Export for global access
window.dispatchModule = {
  createDispatch,
  updateDispatch,
  deleteDispatch,
  getAllDispatches,
  getDispatchById
};
