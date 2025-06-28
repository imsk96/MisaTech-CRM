// public/js/ui.js

function renderAppShell() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <aside class="sidebar glass-card">
            <h1>SaaS CRM</h1>
            <div class="theme-switcher">
                <span>Light</span>
                <label class="switch">
                    <input type="checkbox" id="theme-toggle-checkbox">
                    <span class="slider round"></span>
                </label>
                <span>Dark</span>
            </div>
            <ul class="nav-menu">
                <li class="nav-item" data-page="dashboard">Dashboard</li>
                <li class="nav-item" data-page="leads">Leads</li>
                <li class="nav-item" data-page="visits">Visits</li>
                <li class="nav-item" data-page="dispatches">Dispatches</li>
                <li class="nav-item" data-page="billing">Billing</li>
                <li class="nav-item" data-page="staff">Staff</li>
                <li class="nav-item" data-page="settings">Settings</li>
            </ul>
            <button id="logout-btn" class="logout-btn">Logout</button>
        </aside>
        <div class="main-content glass-card">
            <div id="page-content"></div>
            <div id="modal-container"></div>
        </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => signOut());

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            navigateTo(e.target.getAttribute('data-page'));
        });
    });

    setupThemeToggle();
}

function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle-checkbox');
    const body = document.body;

    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-theme');
        toggle.checked = false;
    } else {
        body.classList.remove('light-theme');
        toggle.checked = true;
    }

    toggle.addEventListener('change', () => {
        if (!toggle.checked) {
            body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        }
    });
}

function setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });
}

function renderModal(title, contentHTML) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-backdrop">
            <div class="modal-content glass-card">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <span class="close-modal" onclick="closeModal()">×</span>
                </div>
                <div class="modal-body">
                    ${contentHTML}
                </div>
            </div>
        </div>
    `;
}

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = '';
}

function showAlert(message, type = 'success') {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert-popup ${type}`;
    alertContainer.textContent = message;
    document.body.appendChild(alertContainer);
    setTimeout(() => {
        alertContainer.remove();
    }, 4000);
}