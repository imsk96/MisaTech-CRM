// public/js/pages/leads.js

async function renderLeadsPage(container) {
    container.innerHTML = `<p>Loading leads...</p>`;
    // Hum staff ki list bhi fetch karenge taaki modal me dropdown dikha sakein
    const [leads, staff] = await Promise.all([
        fetchData('leads'),
        fetchData('staff')
    ]);
    
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
                                <button onclick='showScheduleVisitModal(${JSON.stringify(lead)}, ${JSON.stringify(staff)})'>Visit</button>
                                <button onclick='showScheduleDispatchModal(${JSON.stringify(lead)}, ${JSON.stringify(staff)})'>Dispatch</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('add-manual-lead-btn').addEventListener('click', () => showAddManualLeadModal(staff));
    
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

// --- MODAL FUNCTIONS FOR LEADS ---

function showAddManualLeadModal() {
    // ... yeh function pichhle version jaisa hi rahega ...
}

async function handleManualLeadSubmit(e) {
    // ... yeh function pichhle version jaisa hi rahega ...
}


// --- VISIT & DISPATCH SCHEDULING ---

function showScheduleVisitModal(lead, staffList) {
    const staffOptions = staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const formHTML = `
        <form id="schedule-visit-form" data-lead-id="${lead.id}">
            <div class="input-group">
                <input type="text" name="party_name" value="${lead.data.SENDERNAME || ''}" required>
                <label>Party Name</label>
            </div>
            <div class="input-group">
                <input type="text" name="visit_address" value="${lead.data.ENQ_CITY || ''}" required>
                <label>Visit Address</label>
            </div>
             <div class="input-group">
                <input type="datetime-local" name="scheduled_for" required>
                <label>Schedule For</label>
            </div>
            <select name="assigned_to">
                <option value="">Assign to Staff...</option>
                ${staffOptions}
            </select>
            <button type="submit">Schedule Visit</button>
        </form>
    `;
    renderModal('Schedule Visit', formHTML);
    document.getElementById('schedule-visit-form').addEventListener('submit', handleScheduleVisitSubmit);
}

async function handleScheduleVisitSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const visitData = Object.fromEntries(formData.entries());
    visitData.lead_id = form.dataset.leadId; // Lead ID ko data me add karein

    try {
        await insertData('visits', visitData);
        alert('Visit scheduled successfully!');
        closeModal();
        navigateTo('visits'); // Visit page par le jayein
    } catch (error) {
        alert('Error scheduling visit: ' + error.message);
    }
}

function showScheduleDispatchModal(lead, staffList) {
    // Note: Iska logic bilkul Visit jaisa hi hai, bas table ka naam alag hai
    const staffOptions = staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const formHTML = `
        <form id="schedule-dispatch-form" data-lead-id="${lead.id}">
            <div class="input-group">
                <input type="text" name="party_name" value="${lead.data.SENDERNAME || ''}" required>
                <label>Party Name</label>
            </div>
            <div class="input-group">
                <textarea name="dispatch_details" placeholder="Enter product name, quantity, etc.">${lead.data.PRODUCT_NAME || ''}</textarea>
                <label>Dispatch Details</label>
            </div>
             <div class="input-group">
                <input type="date" name="scheduled_for" required>
                <label>Schedule For</label>
            </div>
            <select name="assigned_to">
                <option value="">Assign to Staff...</option>
                ${staffOptions}
            </select>
            <button type="submit">Schedule Dispatch</button>
        </form>
    `;
    renderModal('Schedule Dispatch', formHTML);
    document.getElementById('schedule-dispatch-form').addEventListener('submit', handleScheduleDispatchSubmit);
}

async function handleScheduleDispatchSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    let dispatchData = Object.fromEntries(formData.entries());
    dispatchData.lead_id = form.dataset.leadId;
    
    // JSON data ko format karein
    dispatchData.dispatch_details = { details: dispatchData.dispatch_details };

    try {
        await insertData('dispatches', dispatchData);
        alert('Dispatch scheduled successfully!');
        closeModal();
        navigateTo('dispatches'); // Dispatch page par le jayein
    } catch (error) {
        alert('Error scheduling dispatch: ' + error.message);
    }
}