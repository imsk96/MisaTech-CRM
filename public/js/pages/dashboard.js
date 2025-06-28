// public/js/pages/dashboard.js

async function renderDashboardPage(container) {
    // Purani leads dhoondho jo agle 7 din me delete ho sakti hain
    // Hum Supabase me Cron Job set karenge jo 30 din se purani leads delete karega
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() - 23); // 23 din purani = 7 din me delete hogi

    const { data, error } = await supabase
        .from('leads')
        .select('id, created_at')
        .lt('created_at', alertDate.toISOString());

    let alertHtml = '';
    if (data && data.length > 0) {
        alertHtml = `
            <div class="alert alert-warning">
                <strong>Data Deletion Alert!</strong> You have ${data.length} leads that are over 3 weeks old and will be deleted soon. Please <a onclick="navigateTo('leads')">go to the Leads page</a> to export your data.
            </div>
        `;
    }

    container.innerHTML = `
        <div class="page-header">
            <h2>Dashboard</h2>
        </div>
        ${alertHtml}
        <p>Welcome to your CRM Dashboard!</p>
        <p>You can see a summary of your business here. This will be updated with charts and stats in the future.</p>
    `;
}