/**
 * Tasks Module - Complete CRUD with Approval Flow
 * Task management with assignments, priorities, and due dates
 */

import { authManager } from '../lib/auth.js';
import { approvalEngine } from './approvals.js';
import { toast, generateId, formatDate } from '../utils/helpers.js';

export const tasksModule = {
  moduleName: 'tasks',
  
  // Column mapping for Google Sheets
  columnMapping: {
    id: 'A',
    title: 'B',
    description: 'C',
    status: 'D',
    priority: 'E',
    assigned_to: 'F',
    due_date: 'G',
    completed_at: 'H',
    related_module: 'I',
    related_id: 'J',
    created_by: 'K',
    created_at: 'L',
    updated_at: 'M'
  },

  /**
   * Initialize tasks module
   */
  init() {
    console.log('Tasks module initialized');
  },

  /**
   * Get all tasks
   */
  async getAll() {
    try {
      const stored = localStorage.getItem(`tasks_${authManager.currentUser.company_id}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get tasks:', error);
      return [];
    }
  },

  /**
   * Get single task by ID
   */
  async getById(id) {
    const tasks = await this.getAll();
    return tasks.find(task => task.id === id);
  },

  /**
   * Create new task (requires approval)
   */
  async create(taskData) {
    const task = {
      id: generateId(),
      title: taskData.title || '',
      description: taskData.description || '',
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      assigned_to: taskData.assigned_to || authManager.currentUser.id,
      due_date: taskData.due_date || null,
      completed_at: null,
      related_module: taskData.related_module || null,
      related_id: taskData.related_id || null,
      created_by: authManager.currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await approvalEngine.submitForApproval({
      module_name: this.moduleName,
      action_type: 'create',
      payload: task,
      metadata: {
        sheet_tab: 'Tasks',
        columns: this.columnMapping
      }
    });

    if (result.success) {
      toast('Task submitted for approval', 'success');
      await this._addToCache(task);
    }

    return result;
  },

  /**
   * Update existing task (requires approval)
   */
  async update(id, updates) {
    const task = await this.getById(id);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const updatedTask = {
      ...task,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Auto-set completed_at when status changes to completed
    if (updates.status === 'completed' && !task.completed_at) {
      updatedTask.completed_at = new Date().toISOString();
    }

    const result = await approvalEngine.submitForApproval({
      module_name: this.moduleName,
      action_type: 'update',
      payload: updatedTask,
      metadata: {
        sheet_tab: 'Tasks',
        columns: this.columnMapping,
        match_field: 'id',
        match_value: id
      }
    });

    if (result.success) {
      toast('Update submitted for approval', 'success');
      await this._updateCache(updatedTask);
    }

    return result;
  },

  /**
   * Delete task (requires approval)
   */
  async delete(id) {
    const task = await this.getById(id);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const result = await approvalEngine.submitForApproval({
      module_name: this.moduleName,
      action_type: 'delete',
      payload: { id },
      metadata: {
        sheet_tab: 'Tasks',
        columns: this.columnMapping,
        match_field: 'id',
        match_value: id
      }
    });

    if (result.success) {
      toast('Delete submitted for approval', 'success');
      await this._removeFromCache(id);
    }

    return result;
  },

  /**
   * Complete task (requires approval)
   */
  async complete(id) {
    return await this.update(id, { status: 'completed' });
  },

  /**
   * Reopen task (requires approval)
   */
  async reopen(id) {
    return await this.update(id, { 
      status: 'pending',
      completed_at: null
    });
  },

  /**
   * Assign task to user (requires approval)
   */
  async assign(id, userId) {
    return await this.update(id, { assigned_to: userId });
  },

  /**
   * Change task priority (requires approval)
   */
  async setPriority(id, priority) {
    return await this.update(id, { priority });
  },

  /**
   * Get tasks by status
   */
  async getByStatus(status) {
    const tasks = await this.getAll();
    return tasks.filter(task => task.status === status);
  },

  /**
   * Get tasks by priority
   */
  async getByPriority(priority) {
    const tasks = await this.getAll();
    return tasks.filter(task => task.priority === priority);
  },

  /**
   * Get tasks assigned to current user
   */
  async getMyTasks() {
    const tasks = await this.getAll();
    return tasks.filter(task => task.assigned_to === authManager.currentUser.id);
  },

  /**
   * Get overdue tasks
   */
  async getOverdue() {
    const tasks = await this.getAll();
    const now = new Date();
    return tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) < now && 
      task.status !== 'completed'
    );
  },

  /**
   * Get tasks due today
   */
  async getDueToday() {
    const tasks = await this.getAll();
    const today = new Date().toDateString();
    return tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date).toDateString() === today &&
      task.status !== 'completed'
    );
  },

  /**
   * Search tasks
   */
  async search(query) {
    const tasks = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Cache helpers
   */
  async _addToCache(task) {
    const tasks = await this.getAll();
    tasks.push(task);
    localStorage.setItem(`tasks_${authManager.currentUser.company_id}`, JSON.stringify(tasks));
  },

  async _updateCache(updatedTask) {
    const tasks = await this.getAll();
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = updatedTask;
      localStorage.setItem(`tasks_${authManager.currentUser.company_id}`, JSON.stringify(tasks));
    }
  },

  async _removeFromCache(id) {
    const tasks = await this.getAll();
    const filtered = tasks.filter(t => t.id !== id);
    localStorage.setItem(`tasks_${authManager.currentUser.company_id}`, JSON.stringify(filtered));
  },

  clearCache() {
    localStorage.removeItem(`tasks_${authManager.currentUser.company_id}`);
  }
};

/**
 * UI Renderer for Tasks Page
 */
export function renderTasksPage() {
  return `
    <div class="module-container">
      <!-- Action Bar -->
      <div class="action-bar">
        <div class="search-box">
          <input type="text" id="tasksSearch" class="form-input" placeholder="🔍 Search tasks..." />
        </div>
        <div class="action-buttons">
          <button class="btn btn-secondary" id="filterOverdueBtn">
            ⚠️ Overdue
          </button>
          <button class="btn btn-primary" id="addTaskBtn">
            ➕ Add Task
          </button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="filter-tabs">
        <button class="filter-tab active" data-filter="all">All</button>
        <button class="filter-tab" data-filter="pending">Pending</button>
        <button class="filter-tab" data-filter="in_progress">In Progress</button>
        <button class="filter-tab" data-filter="completed">Completed</button>
        <button class="filter-tab" data-filter="cancelled">Cancelled</button>
      </div>

      <!-- Priority Filter -->
      <div class="priority-filter">
        <span>Show:</span>
        <button class="priority-btn active" data-priority="all">All</button>
        <button class="priority-btn" data-priority="high">🔴 High</button>
        <button class="priority-btn" data-priority="medium">🟡 Medium</button>
        <button class="priority-btn" data-priority="low">🟢 Low</button>
      </div>

      <!-- Tasks List -->
      <div class="tasks-grid" id="tasksGrid">
        <p class="text-center text-muted">Loading tasks...</p>
      </div>

      <!-- Add/Edit Modal -->
      <div class="modal" id="taskModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modalTitle">Add New Task</h3>
            <button class="modal-close" id="closeModal">&times;</button>
          </div>
          <form id="taskForm">
            <input type="hidden" id="taskId" />
            
            <div class="form-group">
              <label class="form-label">Title *</label>
              <input type="text" id="taskTitle" class="form-input" required />
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea id="taskDescription" class="form-input" rows="3"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Priority</label>
                <select id="taskPriority" class="form-input">
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <select id="taskStatus" class="form-input">
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" id="taskDueDate" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Related Module</label>
                <select id="taskRelatedModule" class="form-input">
                  <option value="">None</option>
                  <option value="leads">Leads</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="visit">Visit</option>
                  <option value="quotation">Quotation</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Related ID (optional)</label>
              <input type="text" id="taskRelatedId" class="form-input" placeholder="e.g., lead ID" />
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
 * Setup tasks page
 */
export async function setupTasksPage() {
  const tasks = await tasksModule.getAll();
  renderTasksGrid(tasks);

  // Search
  document.getElementById('tasksSearch').addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length >= 2) {
      const results = await tasksModule.search(query);
      renderTasksGrid(results);
    } else {
      renderTasksGrid(tasks);
    }
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', async (e) => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      const filter = e.target.dataset.filter;
      let filteredTasks;
      
      if (filter === 'all') {
        filteredTasks = await tasksModule.getAll();
      } else {
        filteredTasks = await tasksModule.getByStatus(filter);
      }
      
      renderTasksGrid(filteredTasks);
    });
  });

  // Priority filter
  document.querySelectorAll('.priority-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const priority = e.target.dataset.priority;
      let filteredTasks;
      
      if (priority === 'all') {
        filteredTasks = await tasksModule.getAll();
      } else {
        filteredTasks = await tasksModule.getByPriority(priority);
      }
      
      renderTasksGrid(filteredTasks);
    });
  });

  // Overdue filter
  document.getElementById('filterOverdueBtn').addEventListener('click', async () => {
    const overdue = await tasksModule.getOverdue();
    renderTasksGrid(overdue);
  });

  // Add task button
  document.getElementById('addTaskBtn').addEventListener('click', () => {
    openTaskModal();
  });

  // Modal close
  document.getElementById('closeModal').addEventListener('click', closeTaskModal);
  document.getElementById('cancelBtn').addEventListener('click', closeTaskModal);

  // Form submit
  document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleTaskSubmit();
  });
}

/**
 * Render tasks grid
 */
function renderTasksGrid(tasks) {
  const grid = document.getElementById('tasksGrid');
  
  if (tasks.length === 0) {
    grid.innerHTML = '<p class="text-center text-muted">No tasks found</p>';
    return;
  }

  grid.innerHTML = tasks.map(task => `
    <div class="task-card ${task.status}">
      <div class="task-header">
        <span class="priority-badge ${task.priority}">${getPriorityLabel(task.priority)}</span>
        <span class="status-badge ${task.status}">${getStatusLabel(task.status)}</span>
      </div>
      <h4 class="task-title">${escapeHtml(task.title)}</h4>
      <p class="task-description">${escapeHtml(task.description) || 'No description'}</p>
      <div class="task-meta">
        <div class="task-due">
          📅 ${task.due_date ? formatDate(task.due_date) : 'No due date'}
          ${isOverdue(task) ? '<span class="overdue-badge">OVERDUE</span>' : ''}
        </div>
        <div class="task-assigned">
          👤 ${task.assigned_to === authManager.currentUser.id ? 'Me' : 'Other'}
        </div>
      </div>
      <div class="task-actions">
        ${task.status !== 'completed' ? `
          <button class="btn btn-sm btn-success" onclick="window.completeTask('${task.id}')">✓ Complete</button>
        ` : `
          <button class="btn btn-sm btn-secondary" onclick="window.reopenTask('${task.id}')">↻ Reopen</button>
        `}
        <button class="btn btn-sm btn-secondary" onclick="window.editTask('${task.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="window.deleteTask('${task.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function getPriorityLabel(priority) {
  const labels = { high: 'High', medium: 'Medium', low: 'Low' };
  return labels[priority] || priority;
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return labels[status] || status;
}

function isOverdue(task) {
  if (!task.due_date || task.status === 'completed') return false;
  return new Date(task.due_date) < new Date();
}

/**
 * Modal functions
 */
function openTaskModal(task = null) {
  const modal = document.getElementById('taskModal');
  const title = document.getElementById('modalTitle');
  
  if (task) {
    title.textContent = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskDueDate').value = task.due_date ? task.due_date.split('T')[0] : '';
    document.getElementById('taskRelatedModule').value = task.related_module || '';
    document.getElementById('taskRelatedId').value = task.related_id || '';
  } else {
    title.textContent = 'Add New Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
  }
  
  modal.classList.add('active');
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('active');
}

async function handleTaskSubmit() {
  const id = document.getElementById('taskId').value;
  const taskData = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value,
    due_date: document.getElementById('taskDueDate').value || null,
    related_module: document.getElementById('taskRelatedModule').value || null,
    related_id: document.getElementById('taskRelatedId').value || null
  };

  let result;
  if (id) {
    result = await tasksModule.update(id, taskData);
  } else {
    result = await tasksModule.create(taskData);
  }

  if (result.success) {
    closeTaskModal();
    const tasks = await tasksModule.getAll();
    renderTasksGrid(tasks);
  }
}

// Global functions
export async function editTask(id) {
  const task = await tasksModule.getById(id);
  if (task) openTaskModal(task);
}

export async function deleteTask(id) {
  if (confirm('Delete this task?')) {
    await tasksModule.delete(id);
    const tasks = await tasksModule.getAll();
    renderTasksGrid(tasks);
  }
}

export async function completeTask(id) {
  await tasksModule.complete(id);
  const tasks = await tasksModule.getAll();
  renderTasksGrid(tasks);
}

export async function reopenTask(id) {
  await tasksModule.reopen(id);
  const tasks = await tasksModule.getAll();
  renderTasksGrid(tasks);
}

window.editTask = editTask;
window.deleteTask = deleteTask;
window.completeTask = completeTask;
window.reopenTask = reopenTask;

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
