// public/js/pages/visits.js

async function renderVisitsPage(container) {
    container.innerHTML = `<p>Loading visits...</p>`;
    const [visits, staff] = await Promise.all([fetchData('visits'), fetchData('staff')]);
    const staffMap = new Map(staff.map(s => [s.id, s.name]));

    container.innerHTML = `
        <div class="page-header">
            <h2>Scheduled Visits (${visits.length})</h2>
            <button onclick='showManualVisitModal(${JSON.stringify(staff)})'>Schedule Manual Visit</button>
        </div>
        <div class="table-container">
            <table>
                <thead><tr><th>Party Name</th><th>Address</th><th>Scheduled For</th><th>Assigned To</th><th>Status</th></tr></thead>
                <tbody>
                    ${visits.map(visit => `
                        <tr>
                            <td>${visit.party_name}</td>
                            <td>${visit.visit_address || 'N/A'}</td>
                            <td>${new Date(visit.scheduled_for).toLocaleString()}</td>
                            <td>${staffMap.get(visit.assigned_to) || 'Unassigned'}</td>
                            <td>${visit.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showManualVisitModal(staffList) {
    const staffOptions = staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const formHTML = `
        <form id="manual-visit-form">
            <div class="input-group"><input type="text" name="party_name" required><label>Party Name</label></div>
            <div class="input-group"><input type="text" name="visit_address" required><label>Visit Address</label></div>
            <div class="input-group"><input type="datetime-local" name="scheduled_for" required><label>Schedule For</label></div>
            <select name="assigned_to" class="input-group"><option value="">Assign to Staff...</option>${staffOptions}</select>
            <button type="submit">Schedule Visit</button>
        </form>
    `;
    renderModal('Schedule Manual Visit', formHTML);
    document.getElementById('manual-visit-form').addEventListener('submit', handleManualVisitSubmit);
}

async function handleManualVisitSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const visitData = Object.fromEntries(formData.entries());
    try {
        await insertData('visits', visitData);
        showAlert('Visit scheduled successfully!');
        closeModal();
        navigateTo('visits');
    } catch (error) { showAlert('Error: ' + error.message, 'error'); }
}