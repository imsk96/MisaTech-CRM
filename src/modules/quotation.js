/**
 * Quotation Builder Module - Create and Manage Quotations
 * Handles quotation creation with line items, pricing, and totals
 */

import { authManager } from '../lib/auth.js';
import { approvalEngine } from './approvals.js';
import { syncEngine } from './sync.js';
import { toast, formatDate, generateId, formatCurrency } from '../utils/helpers.js';

const MODULE_NAME = 'quotation';

// Column mapping for Google Sheets
const COLUMN_MAPPING = {
  id: 'A',
  quotation_number: 'B',
  customer_name: 'C',
  customer_email: 'D',
  customer_phone: 'E',
  customer_address: 'F',
  status: 'G',
  issue_date: 'H',
  expiry_date: 'I',
  subtotal: 'J',
  tax_rate: 'K',
  tax_amount: 'L',
  discount: 'M',
  total: 'N',
  notes: 'O',
  terms: 'P',
  items_json: 'Q',
  created_at: 'R',
  updated_at: 'S'
};

let quotations = [];

/**
 * Initialize Quotation module
 */
export function init() {
  loadQuotations();
}

/**
 * Load quotations from storage
 */
async function loadQuotations() {
  try {
    const syncedData = await syncEngine.pullData(MODULE_NAME, COLUMN_MAPPING);
    
    if (syncedData && syncedData.length > 0) {
      quotations = syncedData;
    } else {
      const stored = localStorage.getItem(`quotations_${authManager.getCompanyId()}`);
      quotations = stored ? JSON.parse(stored) : [];
    }
  } catch (error) {
    console.error('Failed to load quotations:', error);
    quotations = [];
  }
}

/**
 * Save quotations to local storage (fallback)
 */
function saveToLocal() {
  localStorage.setItem(`quotations_${authManager.getCompanyId()}`, JSON.stringify(quotations));
}

/**
 * Get all quotations
 */
export function getAllQuotations() {
  return [...quotations];
}

/**
 * Get quotation by ID
 */
export function getQuotationById(id) {
  return quotations.find(q => q.id === id);
}

/**
 * Calculate quotation totals
 */
function calculateTotals(items, taxRate, discount) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price);
  }, 0);
  
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;
  
  return { subtotal, taxAmount, total };
}

/**
 * Create new quotation (requires approval)
 */
export async function createQuotation(data) {
  const items = data.items || [];
  const { subtotal, taxAmount, total } = calculateTotals(items, data.tax_rate || 0, data.discount || 0);
  
  const quotation = {
    id: generateId('QUOT'),
    quotation_number: `QUOT-${Date.now()}`,
    customer_name: data.customer_name || '',
    customer_email: data.customer_email || '',
    customer_phone: data.customer_phone || '',
    customer_address: data.customer_address || '',
    status: data.status || 'draft',
    issue_date: data.issue_date || new Date().toISOString().split('T')[0],
    expiry_date: data.expiry_date || '',
    subtotal: subtotal,
    tax_rate: data.tax_rate || 0,
    tax_amount: taxAmount,
    discount: data.discount || 0,
    total: total,
    notes: data.notes || '',
    terms: data.terms || '',
    items_json: JSON.stringify(items),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const result = await approvalEngine.submitForApproval({
    module_name: MODULE_NAME,
    action_type: 'create',
    payload: JSON.stringify(quotation),
    metadata: {
      quotation_number: quotation.quotation_number,
      customer: quotation.customer_name,
      total: quotation.total
    }
  });

  if (result.success) {
    quotations.push(quotation);
    saveToLocal();
    toast('Quotation submitted for approval', 'success');
  }

  return result;
}

/**
 * Update quotation (requires approval)
 */
export async function updateQuotation(id, updates) {
  const existing = getQuotationById(id);
  
  if (!existing) {
    return { success: false, error: 'Quotation not found' };
  }

  // Recalculate totals if items changed
  let updated = { ...existing, ...updates };
  if (updates.items || updates.tax_rate !== undefined || updates.discount !== undefined) {
    const items = updates.items || JSON.parse(existing.items_json || '[]');
    const { subtotal, taxAmount, total } = calculateTotals(
      items, 
      updates.tax_rate !== undefined ? updates.tax_rate : existing.tax_rate,
      updates.discount !== undefined ? updates.discount : existing.discount
    );
    updated.subtotal = subtotal;
    updated.tax_amount = taxAmount;
    updated.total = total;
    updated.items_json = JSON.stringify(items);
  }
  
  updated.id = existing.id;
  updated.updated_at = new Date().toISOString();

  const result = await approvalEngine.submitForApproval({
    module_name: MODULE_NAME,
    action_type: 'update',
    payload: JSON.stringify(updated),
    metadata: {
      quotation_id: id,
      changes: Object.keys(updates)
    }
  });

  if (result.success) {
    const index = quotations.findIndex(q => q.id === id);
    if (index !== -1) {
      quotations[index] = updated;
      saveToLocal();
    }
    toast('Update submitted for approval', 'success');
  }

  return result;
}

/**
 * Delete quotation (requires approval)
 */
export async function deleteQuotation(id) {
  const existing = getQuotationById(id);
  
  if (!existing) {
    return { success: false, error: 'Quotation not found' };
  }

  const result = await approvalEngine.submitForApproval({
    module_name: MODULE_NAME,
    action_type: 'delete',
    payload: JSON.stringify({ id }),
    metadata: {
      quotation_id: id,
      quotation_number: existing.quotation_number
    }
  });

  if (result.success) {
    quotations = quotations.filter(q => q.id !== id);
    saveToLocal();
    toast('Delete submitted for approval', 'success');
  }

  return result;
}

/**
 * Execute approved action
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
 * Filter quotations by status
 */
export function filterByStatus(status) {
  return quotations.filter(q => q.status === status);
}

/**
 * Get expired quotations
 */
export function getExpiredQuotations() {
  const today = new Date().toISOString().split('T')[0];
  return quotations.filter(q => q.expiry_date && q.expiry_date < today && q.status === 'pending');
}

/**
 * Render quotation page HTML
 */
export function renderQuotationPage() {
  const user = authManager.getCurrentUser();

  return `
    <div class="module-container">
      <!-- Action Bar -->
      <div class="action-bar">
        <div class="search-box">
          <input type="text" id="quotationSearch" class="form-input" placeholder="🔍 Search quotations..." />
        </div>
        <div class="action-buttons">
          <select id="statusFilter" class="form-input">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          ${user ? `
            <button class="btn btn-primary" onclick="window.showQuotationModal()">
              + New Quotation
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="mini-stat">
          <span class="mini-stat-value">${quotations.length}</span>
          <span class="mini-stat-label">Total</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">${filterByStatus('pending').length}</span>
          <span class="mini-stat-label">Pending</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">${filterByStatus('accepted').length}</span>
          <span class="mini-stat-label">Accepted</span>
        </div>
        <div class="mini-stat">
          <span class="mini-stat-value">${getExpiredQuotations().length}</span>
          <span class="mini-stat-label">Expired</span>
        </div>
      </div>

      <!-- Quotation Table -->
      <div class="card">
        <div class="card-body no-padding">
          <div class="table-responsive">
            <table class="data-table" id="quotationTable">
              <thead>
                <tr>
                  <th>Quotation #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="quotationTableBody">
                ${renderQuotationRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Quotation Modal -->
    <div id="quotationModal" class="modal" style="display: none;">
      <div class="modal-content modal-xl">
        <div class="modal-header">
          <h3 class="modal-title" id="modalTitle">New Quotation</h3>
          <button class="modal-close" onclick="window.closeQuotationModal()">&times;</button>
        </div>
        <form id="quotationForm">
          <input type="hidden" id="quotationId" />
          
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Customer Name *</label>
              <input type="text" id="customerName" class="form-input" required />
            </div>
            
            <div class="form-group">
              <label class="form-label">Customer Email</label>
              <input type="email" id="customerEmail" class="form-input" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Customer Phone</label>
              <input type="tel" id="customerPhone" class="form-input" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="quotationStatus" class="form-input">
                <option value="draft" selected>Draft</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Issue Date</label>
              <input type="date" id="issueDate" class="form-input" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Expiry Date</label>
              <input type="date" id="expiryDate" class="form-input" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Tax Rate (%)</label>
              <input type="number" id="taxRate" class="form-input" step="0.1" value="0" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Discount</label>
              <input type="number" id="discount" class="form-input" step="0.01" value="0" />
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Customer Address</label>
              <textarea id="customerAddress" class="form-input" rows="2"></textarea>
            </div>
          </div>

          <!-- Line Items -->
          <div class="mt-3">
            <div class="d-flex justify-between align-center mb-2">
              <h4 class="mb-0">Line Items</h4>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.addLineItem()">+ Add Item</button>
            </div>
            <div class="table-responsive">
              <table class="data-table" id="itemsTable">
                <thead>
                  <tr>
                    <th width="30%">Description</th>
                    <th width="15%">Quantity</th>
                    <th width="20%">Unit Price</th>
                    <th width="20%">Total</th>
                    <th width="15%">Actions</th>
                  </tr>
                </thead>
                <tbody id="itemsTableBody">
                </tbody>
              </table>
            </div>
          </div>

          <!-- Totals -->
          <div class="totals-section mt-3 p-3 bg-light rounded">
            <div class="d-flex justify-end">
              <div style="width: 300px;">
                <div class="d-flex justify-between mb-1">
                  <span>Subtotal:</span>
                  <strong id="subtotalDisplay">$0.00</strong>
                </div>
                <div class="d-flex justify-between mb-1">
                  <span>Tax:</span>
                  <strong id="taxDisplay">$0.00</strong>
                </div>
                <div class="d-flex justify-between mb-1">
                  <span>Discount:</span>
                  <strong id="discountDisplay">$0.00</strong>
                </div>
                <div class="d-flex justify-between pt-2 border-top">
                  <span>Total:</span>
                  <strong id="totalDisplay" class="text-primary">$0.00</strong>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-grid mt-3">
            <div class="form-group full-width">
              <label class="form-label">Notes</label>
              <textarea id="notes" class="form-input" rows="2"></textarea>
            </div>
            
            <div class="form-group full-width">
              <label class="form-label">Terms & Conditions</label>
              <textarea id="terms" class="form-input" rows="2"></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.closeQuotationModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveQuotationBtn">
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
function renderQuotationRows(filterText = '', statusFilter = '') {
  let filtered = [...quotations];

  if (filterText) {
    filtered = filtered.filter(q => 
      q.quotation_number.toLowerCase().includes(filterText.toLowerCase()) ||
      q.customer_name.toLowerCase().includes(filterText.toLowerCase())
    );
  }

  if (statusFilter) {
    filtered = filtered.filter(q => q.status === statusFilter);
  }

  if (filtered.length === 0) {
    return '<tr><td colspan="7" class="text-center text-muted">No quotations found</td></tr>';
  }

  return filtered.map(q => `
    <tr>
      <td><strong>${q.quotation_number}</strong></td>
      <td>${q.customer_name}<br/><small class="text-muted">${q.customer_email || ''}</small></td>
      <td>${getStatusBadge(q.status)}</td>
      <td>${formatDate(q.issue_date)}</td>
      <td>${formatDate(q.expiry_date)}</td>
      <td><strong>${formatCurrency(q.total)}</strong></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="window.editQuotation('${q.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="window.deleteQuotation('${q.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Setup quotation page
 */
export async function setupQuotationPage() {
  await loadQuotations();
  renderQuotationTable();

  document.getElementById('quotationSearch')?.addEventListener('input', (e) => {
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    document.getElementById('quotationTableBody').innerHTML = renderQuotationRows(e.target.value, statusFilter);
  });

  document.getElementById('statusFilter')?.addEventListener('change', (e) => {
    const searchText = document.getElementById('quotationSearch')?.value || '';
    document.getElementById('quotationTableBody').innerHTML = renderQuotationRows(searchText, e.target.value);
  });

  document.getElementById('quotationForm')?.addEventListener('submit', handleFormSubmit);
  document.getElementById('taxRate')?.addEventListener('input', updateTotals);
  document.getElementById('discount')?.addEventListener('input', updateTotals);

  window.showQuotationModal = showQuotationModal;
  window.closeQuotationModal = closeQuotationModal;
  window.editQuotation = editQuotation;
  window.deleteQuotation = deleteQuotationGlobal;
  window.addLineItem = addLineItem;
  window.removeLineItem = removeLineItem;
  window.updateLineItem = updateLineItem;
}

function renderQuotationTable() {
  const body = document.getElementById('quotationTableBody');
  if (body) body.innerHTML = renderQuotationRows();
}

function showQuotationModal() {
  document.getElementById('modalTitle').textContent = 'New Quotation';
  document.getElementById('quotationId').value = '';
  document.getElementById('quotationForm').reset();
  document.getElementById('issueDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('itemsTableBody').innerHTML = '';
  document.getElementById('saveQuotationBtn').textContent = 'Submit for Approval';
  document.getElementById('quotationModal').style.display = 'flex';
  updateTotals();
}

function closeQuotationModal() {
  document.getElementById('quotationModal').style.display = 'none';
}

let lineItems = [];

function addLineItem() {
  lineItems.push({ description: '', quantity: 1, unit_price: 0 });
  renderLineItems();
  updateTotals();
}

function removeLineItem(index) {
  lineItems.splice(index, 1);
  renderLineItems();
  updateTotals();
}

function updateLineItem(index, field, value) {
  lineItems[index][field] = field === 'description' ? value : parseFloat(value) || 0;
  renderLineItems();
  updateTotals();
}

function renderLineItems() {
  const tbody = document.getElementById('itemsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = lineItems.map((item, index) => `
    <tr>
      <td><input type="text" class="form-input" value="${item.description}" onchange="window.updateLineItem(${index}, 'description', this.value)" /></td>
      <td><input type="number" class="form-input" value="${item.quantity}" min="1" onchange="window.updateLineItem(${index}, 'quantity', this.value)" /></td>
      <td><input type="number" class="form-input" value="${item.unit_price}" min="0" step="0.01" onchange="window.updateLineItem(${index}, 'unit_price', this.value)" /></td>
      <td>${formatCurrency(item.quantity * item.unit_price)}</td>
      <td><button type="button" class="btn btn-sm btn-danger" onclick="window.removeLineItem(${index})">Remove</button></td>
    </tr>
  `).join('');
}

function updateTotals() {
  const taxRate = parseFloat(document.getElementById('taxRate')?.value) || 0;
  const discount = parseFloat(document.getElementById('discount')?.value) || 0;
  
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;
  
  document.getElementById('subtotalDisplay').textContent = formatCurrency(subtotal);
  document.getElementById('taxDisplay').textContent = formatCurrency(taxAmount);
  document.getElementById('discountDisplay').textContent = formatCurrency(discount);
  document.getElementById('totalDisplay').textContent = formatCurrency(total);
  
  return { subtotal, taxAmount, total };
}

async function editQuotation(id) {
  const quotation = getQuotationById(id);
  if (!quotation) return;

  document.getElementById('modalTitle').textContent = 'Edit Quotation';
  document.getElementById('quotationId').value = quotation.id;
  document.getElementById('customerName').value = quotation.customer_name;
  document.getElementById('customerEmail').value = quotation.customer_email || '';
  document.getElementById('customerPhone').value = quotation.customer_phone || '';
  document.getElementById('quotationStatus').value = quotation.status;
  document.getElementById('issueDate').value = quotation.issue_date || '';
  document.getElementById('expiryDate').value = quotation.expiry_date || '';
  document.getElementById('taxRate').value = quotation.tax_rate || 0;
  document.getElementById('discount').value = quotation.discount || 0;
  document.getElementById('customerAddress').value = quotation.customer_address || '';
  document.getElementById('notes').value = quotation.notes || '';
  document.getElementById('terms').value = quotation.terms || '';
  
  lineItems = quotation.items_json ? JSON.parse(quotation.items_json) : [];
  renderLineItems();
  updateTotals();
  
  document.getElementById('saveQuotationBtn').textContent = 'Submit Update for Approval';
  document.getElementById('quotationModal').style.display = 'flex';
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('quotationId').value;
  const data = {
    customer_name: document.getElementById('customerName').value,
    customer_email: document.getElementById('customerEmail').value,
    customer_phone: document.getElementById('customerPhone').value,
    customer_address: document.getElementById('customerAddress').value,
    status: document.getElementById('quotationStatus').value,
    issue_date: document.getElementById('issueDate').value,
    expiry_date: document.getElementById('expiryDate').value,
    tax_rate: parseFloat(document.getElementById('taxRate').value) || 0,
    discount: parseFloat(document.getElementById('discount').value) || 0,
    notes: document.getElementById('notes').value,
    terms: document.getElementById('terms').value,
    items: lineItems
  };

  let result;
  if (id) {
    result = await updateQuotation(id, data);
  } else {
    result = await createQuotation(data);
  }

  if (result.success) {
    closeQuotationModal();
    await loadQuotations();
    renderQuotationTable();
  }
}

async function deleteQuotationGlobal(id) {
  if (!confirm('Are you sure you want to delete this quotation? This requires admin approval.')) {
    return;
  }
  const result = await deleteQuotation(id);
  if (result.success) {
    await loadQuotations();
    renderQuotationTable();
  }
}

function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getStatusBadge(status) {
  const colors = {
    draft: 'badge-secondary',
    sent: 'badge-info',
    pending: 'badge-warning',
    accepted: 'badge-success',
    rejected: 'badge-danger',
    expired: 'badge-secondary'
  };
  return `<span class="badge ${colors[status] || 'badge-secondary'}">${capitalizeFirst(status)}</span>`;
}

window.quotationModule = {
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getAllQuotations,
  getQuotationById
};
