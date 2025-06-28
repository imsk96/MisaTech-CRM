// public/js/pages/dashboard.js
async function renderDashboardPage(container) {
    container.innerHTML = `<p>Loading dashboard...</p>`;

    try {
        const [leads, bills, visits, dispatches] = await Promise.all([
            fetchData('leads'),
            fetchData('billing'),
            fetchData('visits'),
            fetchData('dispatches')
        ]);

        const dueBills = bills.filter(b => !b.is_paid).length;

        container.innerHTML = `
            <div class="page-header"><h2>Dashboard</h2></div>
            <div class="dashboard-cards">
                <div class="card" onclick="navigateTo('leads')">
                    <h3>Total Leads</h3>
                    <p>${leads.length}</p>
                </div>
                <div class="card" onclick="navigateTo('visits')">
                    <h3>Scheduled Visits</h3>
                    <p>${visits.length}</p>
                </div>
                <div class="card" onclick="navigateTo('dispatches')">
                    <h3>Pending Dispatches</h3>
                    <p>${dispatches.filter(d => d.status === 'Pending').length}</p>
                </div>
                <div class="card" onclick="navigateTo('billing')">
                    <h3>Due Bills</h3>
                    <p>${dueBills}</p>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<p>Error loading dashboard: ${error.message}</p>`;
    }
}