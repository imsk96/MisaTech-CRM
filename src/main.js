/**
 * Main Application Entry Point
 */

import { authManager } from './lib/auth.js';
import { syncEngine } from './modules/sync.js';
import { approvalEngine } from './modules/approvals.js';
import { leadsModule, renderLeadsPage, setupLeadsPage } from './modules/leads.js';
import { tasksModule, renderTasksPage, setupTasksPage } from './modules/tasks.js';
import { init as initDispatch, renderDispatchPage, setupDispatchPage } from './modules/dispatch.js';
import { init as initVisit, renderVisitPage, setupVisitPage } from './modules/visit.js';
import { init as initQuotation, renderQuotationPage, setupQuotationPage } from './modules/quotation.js';
import { settingsModule, renderSettingsPage, setupSettingsPage } from './modules/settings.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './lib/supabase.js';
import { STORAGE_KEYS } from './utils/constants.js';
import { toast } from './utils/helpers.js';

// Initialize application
async function initApp() {
  // Initialize Supabase
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('Supabase credentials not configured. Using demo mode.');
  }

  authManager.init(SUPABASE_URL, SUPABASE_ANON_KEY);
  syncEngine.init(window.supabase);
  approvalEngine.init(window.supabase);
  leadsModule.init();
  tasksModule.init();
  initDispatch();
  initVisit();
  initQuotation();
  settingsModule.init();

  // Check authentication state
  const isAuthenticated = await authManager.checkSession();

  // Route based on auth state and current path
  routeApplication(isAuthenticated);

  // Setup theme
  setupTheme();
}

/**
 * Route application based on auth state
 */
function routeApplication(isAuthenticated) {
  const path = window.location.pathname;

  if (!isAuthenticated) {
    // Not authenticated - show auth page
    if (path !== '/auth.html' && path !== '/signup.html') {
      loadAuthPage();
    }
  } else {
    // Authenticated - show app or redirect from auth pages
    if (path === '/auth.html' || path === '/signup.html') {
      window.location.href = '/';
    } else {
      loadApp();
    }
  }
}

/**
 * Load authentication page
 */
function loadAuthPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="auth-logo">CRM</div>
          <h1 class="auth-title">Welcome Back</h1>
          <p class="auth-subtitle">Sign in to your account</p>
        </div>
        
        <form id="signInForm" class="mt-3">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="email" class="form-input" placeholder="you@company.com" required />
          </div>
          
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="password" class="form-input" placeholder="••••••••" required />
          </div>
          
          <button type="submit" class="btn btn-primary w-full mt-2">
            Sign In
          </button>
        </form>
        
        <div class="text-center mt-3">
          <p class="text-sm text-muted">
            Don't have an account? 
            <a href="/signup.html" style="color: var(--accent-primary);">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  `;

  // Handle sign in form
  document.getElementById('signInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const result = await authManager.signIn(email, password);
    
    if (result.success) {
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  });
}

/**
 * Load signup page
 */
export function loadSignupPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="auth-logo">CRM</div>
          <h1 class="auth-title">Create Account</h1>
          <p class="auth-subtitle">Start your free trial today</p>
        </div>
        
        <form id="signUpForm" class="mt-3">
          <div class="form-group">
            <label class="form-label">Company Name</label>
            <input type="text" id="companyName" class="form-input" placeholder="Acme Inc." required />
          </div>
          
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="email" class="form-input" placeholder="you@company.com" required />
          </div>
          
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="password" class="form-input" placeholder="••••••••" minlength="6" required />
          </div>
          
          <button type="submit" class="btn btn-primary w-full mt-2">
            Create Account
          </button>
        </form>
        
        <div class="text-center mt-3">
          <p class="text-sm text-muted">
            Already have an account? 
            <a href="/auth.html" style="color: var(--accent-primary);">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `;

  // Handle sign up form
  document.getElementById('signUpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const companyName = document.getElementById('companyName').value;

    const result = await authManager.signUp(email, password, companyName);
    
    if (result.success) {
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  });
}

/**
 * Load main application layout
 */
function loadApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-layout">
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">CRM</div>
          <span class="sidebar-title">Multi-Tenant CRM</span>
        </div>
        
        <nav>
          <ul class="nav-menu" id="navMenu">
            <li class="nav-item">
              <a href="/" class="nav-link active" data-page="dashboard">
                📊 Dashboard
              </a>
            </li>
            <li class="nav-item">
              <a href="/leads.html" class="nav-link" data-page="leads">
                🎯 Leads
              </a>
            </li>
            <li class="nav-item">
              <a href="/dispatch.html" class="nav-link" data-page="dispatch">
                🚚 Dispatch
              </a>
            </li>
            <li class="nav-item">
              <a href="/visit.html" class="nav-link" data-page="visit">
                📍 Visit
              </a>
            </li>
            <li class="nav-item">
              <a href="/task.html" class="nav-link" data-page="task">
                ✅ Task
              </a>
            </li>
            <li class="nav-item">
              <a href="/quotation.html" class="nav-link" data-page="quotation">
                📝 Quotation
              </a>
            </li>
            <li class="nav-item">
              <a href="/products.html" class="nav-link" data-page="products">
                📦 Products
              </a>
            </li>
            <li class="nav-item admin-only hidden">
              <a href="/approvals.html" class="nav-link" data-page="approvals">
                ⚡ Approvals
              </a>
            </li>
            <li class="nav-item">
              <a href="/settings.html" class="nav-link" data-page="settings">
                ⚙️ Settings
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Topbar -->
        <header class="topbar">
          <div class="topbar-left">
            <button class="btn btn-secondary btn-sm" id="menuToggle" style="display: none;">
              ☰
            </button>
            <h2 class="text-xl font-semibold" id="pageTitle">Dashboard</h2>
          </div>
          
          <div class="topbar-right">
            <button class="btn btn-secondary btn-sm" id="themeToggle">
              🌙
            </button>
            <div class="user-avatar" id="userAvatar" title="${authManager.currentUser?.email || ''}">
              ${authManager.getUserInitials()}
            </div>
            <button class="btn btn-secondary btn-sm" id="signOutBtn">
              Sign Out
            </button>
          </div>
        </header>

        <!-- Content Area -->
        <div class="content-area" id="contentArea">
          <!-- Page content will be loaded here -->
        </div>
      </main>
    </div>
  `;

  // Setup event listeners
  setupNavigation();
  setupSignOut();
  setupThemeToggle();
  setupMobileMenu();
  updateAdminLinks();

  // Load dashboard by default
  loadDashboard();
}

/**
 * Setup navigation
 */
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active state
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Load page
      const page = link.dataset.page;
      loadPage(page);
    });
  });
}

/**
 * Load page based on name
 */
function loadPage(pageName) {
  const pageTitle = document.getElementById('pageTitle');
  const contentArea = document.getElementById('contentArea');

  switch (pageName) {
    case 'dashboard':
      pageTitle.textContent = 'Dashboard';
      loadDashboard();
      break;
    case 'leads':
      pageTitle.textContent = 'Leads';
      loadLeads();
      break;
    case 'dispatch':
      pageTitle.textContent = 'Dispatch';
      loadDispatch();
      break;
    case 'visit':
      pageTitle.textContent = 'Visit';
      loadVisit();
      break;
    case 'task':
      pageTitle.textContent = 'Task';
      loadTask();
      break;
    case 'quotation':
      pageTitle.textContent = 'Quotation';
      loadQuotation();
      break;
    case 'products':
      pageTitle.textContent = 'Products';
      loadProducts();
      break;
    case 'approvals':
      pageTitle.textContent = 'Approvals';
      loadApprovals();
      break;
    case 'settings':
      pageTitle.textContent = 'Settings';
      loadSettings();
      break;
    default:
      loadDashboard();
  }
}

/**
 * Setup sign out
 */
function setupSignOut() {
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    await authManager.signOut();
    window.location.href = '/auth.html';
  });
}

/**
 * Setup theme toggle
 */
function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  const currentTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

/**
 * Setup mobile menu
 */
function setupMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');

  // Show menu toggle on mobile
  if (window.innerWidth <= 768) {
    menuToggle.style.display = 'block';
  }

  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      menuToggle.style.display = 'none';
      sidebar.classList.remove('open');
    } else {
      menuToggle.style.display = 'block';
    }
  });
}

/**
 * Update admin-only links visibility
 */
function updateAdminLinks() {
  if (authManager.isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.classList.remove('hidden');
    });
  }
}

/**
 * Setup theme from storage
 */
function setupTheme() {
  const currentTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
}

// Page loader functions (placeholders - will be implemented in separate modules)
async function loadDashboard() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Total Leads</span>
          <div class="stat-icon blue">🎯</div>
        </div>
        <div class="stat-value" id="totalLeads">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Pending Approvals</span>
          <div class="stat-icon yellow">⚡</div>
        </div>
        <div class="stat-value" id="pendingApprovals">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Active Tasks</span>
          <div class="stat-icon green">✅</div>
        </div>
        <div class="stat-value" id="activeTasks">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Sync Status</span>
          <div class="stat-icon red">🔄</div>
        </div>
        <div class="stat-value" id="syncStatus">-</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Recent Activity</h3>
      </div>
      <div id="recentActivity">
        <p class="text-muted text-center">Loading...</p>
      </div>
    </div>
  `;

  // Load stats
  loadDashboardStats();
}

async function loadDashboardStats() {
  try {
    const stats = await approvalEngine.getStats();
    
    const pendingEl = document.getElementById('pendingApprovals');
    if (pendingEl) {
      pendingEl.textContent = stats.pending;
    }

    const syncEl = document.getElementById('syncStatus');
    if (syncEl) {
      syncEl.textContent = `${stats.synced}/${stats.approved}`;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Placeholder functions for other pages
async function loadLeads() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = renderLeadsPage();
  await setupLeadsPage();
}

function loadDispatch() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = renderDispatchPage();
  setupDispatchPage();
}

function loadVisit() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = renderVisitPage();
  setupVisitPage();
}

async function loadTask() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = renderTasksPage();
  await setupTasksPage();
}

function loadQuotation() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = renderQuotationPage();
  setupQuotationPage();
}

function loadProducts() {
  document.getElementById('contentArea').innerHTML = '<div class="card"><p>Products module - Coming soon</p></div>';
}

async function loadApprovals() {
  if (!authManager.isAdmin()) {
    document.getElementById('contentArea').innerHTML = `
      <div class="card">
        <p class="text-danger">Access denied. Admin privileges required.</p>
      </div>
    `;
    return;
  }

  const approvals = await approvalEngine.getPendingApprovals();
  
  let html = '';
  if (approvals.length === 0) {
    html = '<p class="text-muted text-center">No pending approvals</p>';
  } else {
    approvals.forEach(approval => {
      const payload = JSON.parse(approval.payload || '{}');
      html += `
        <div class="approval-card">
          <div class="approval-header">
            <div>
              <strong>${approval.module_name}</strong>
              <span class="badge badge-warning">${approval.action_type}</span>
            </div>
            <small class="text-muted">${new Date(approval.created_at).toLocaleString()}</small>
          </div>
          <div class="payload-preview">${JSON.stringify(payload, null, 2)}</div>
          <div class="approval-actions">
            <button class="btn btn-success btn-sm" onclick="window.approveAction('${approval.id}')">✓ Approve</button>
            <button class="btn btn-danger btn-sm" onclick="window.rejectAction('${approval.id}')">✗ Reject</button>
          </div>
        </div>
      `;
    });
  }

  document.getElementById('contentArea').innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Pending Approvals (${approvals.length})</h3>
      </div>
      <div class="card-body">
        ${html}
      </div>
    </div>
  `;
}

async function loadSettings() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = renderSettingsPage();
  await setupSettingsPage();
}

// Global approval handlers
window.approveAction = async (id) => {
  await approvalEngine.approve(id);
  loadApprovals();
};

window.rejectAction = async (id) => {
  await approvalEngine.reject(id);
  loadApprovals();
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
