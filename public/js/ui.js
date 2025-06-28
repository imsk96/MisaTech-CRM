// public/js/ui.js

function renderAppShell() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <aside class="sidebar glass-card">
            <h1>SaaS CRM</h1>
            <ul class="nav-menu">
                <li class="nav-item" data-page="dashboard">Dashboard</li>
                <li class="nav-item" data-page="leads">Leads</li>
                <li class="nav-item" data-page="billing">Billing</li>
                <li class="nav-item" data-page="settings">Settings</li>
            </ul>
            <button id="logout-btn" class="logout-btn">Logout</button>
        </aside>
        <div class="main-content glass-card">
            <div id="page-content">
                <!-- Page content will be loaded here -->
            </div>
        </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut();
        // Auth state change handler will automatically render login UI
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.target.getAttribute('data-page');
            navigateTo(page);
        });
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