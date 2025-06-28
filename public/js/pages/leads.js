// public/js/pages/leads.js
async function renderLeadsPage(container) {
    container.innerHTML = `<p>Loading leads...</p>`;
    const leads = await fetchData('leads');
    
    container.innerHTML = `
        <div class="page-header">
            <h2>Leads (${leads.length})</h2>
            <div>
                <button id="export-leads-btn" style="margin-right: 10px;">Export to CSV</button>
                <button id="add-manual-lead-btn">Add Manual Lead</button>
            </div>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th><th>Mobile</th><th>Product</th><th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${leads.map(lead => `
                        <tr>
                            <td>${lead.data.SENDERNAME || 'N/A'}</td>
                            <td>${lead.data.MOB || 'N/A'}</td>
                            <td>${lead.data.PRODUCT_NAME || 'N/A'}</td>
                            <td><span class="status-${(lead.status || 'New').replace(/\s+/g, '-').toLowerCase()}">${lead.status || 'New'}</span></td>
                            <td>
                                <button onclick="alert('Schedule Visit for Lead ID: ${lead.id}')">Visit</button>
                                <button onclick="alert('Schedule Dispatch for Lead ID: ${lead.id}')">Dispatch</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('add-manual-lead-btn').addEventListener('click', showAddManualLeadModal);
    
    document.getElementById('export-leads-btn').addEventListener('click', () => {
        if(leads.length === 0) {
            alert("No leads to export!");
            return;
        }
        const leadsToExport = leads.map(l => ({...l.data, status: l.status, received_on: l.created_at}));
        const csv = Papa.unparse(leadsToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `leads-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function showAddManualLeadModal() {
    const formHTML = `
        <form id="manual-lead-form">
            <div class="input-group"><input type="text" name="SENDERNAME" required><label>Name</label></div>
            <div class="input-group"><input type="text" name="MOB" required><label>Mobile</label></div>
            <div class="input-group"><input type="text" name="PRODUCT_NAME"><label>Product/Service</label></div>
            <button type="submit">Save Lead</button>
        </form>
    `;
    renderModal('Add Manual Lead', formHTML);
    document.getElementById('manual-lead-form').addEventListener('submit', handleManualLeadSubmit);
}

async function handleManualLeadSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const leadData = Object.fromEntries(formData.entries());
    
    try {
        await insertData('leads', { data: leadData, status: 'New' });
        closeModal();
        navigateTo('leads');
    } catch (error) {
        alert('Error adding lead: ' + error.message);
    }
}