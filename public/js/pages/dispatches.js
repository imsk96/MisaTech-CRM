// public/js/pages/dispatches.js
async function renderDispatchesPage(container) {
    container.innerHTML = `<p>Loading dispatches...</p>`;
    const [dispatches, staff] = await Promise.all([fetchData('dispatches'), fetchData('staff')]);
    const staffMap = new Map(staff.map(s => [s.id, s.name]));

    container.innerHTML = `
        <div class="page-header">
            <h2>Scheduled Dispatches (${dispatches.length})</h2>
            <button id="manual-dispatch-btn">Add Manual Dispatch</button>
        </div>
        <div class="table-container">
            <table>
                <thead><tr><th>Party Name</th><th>Details</th><th>Scheduled For</th><th>Assigned To</th><th>Status</th></tr></thead>
                <tbody>
                    ${dispatches.map(dispatch => `
                        <tr>
                            <td>${dispatch.party_name}</td>
                            <td>${(dispatch.dispatch_details && dispatch.dispatch_details.details) || 'N/A'}</td>
                            <td>${new Date(dispatch.scheduled_for).toLocaleDateString()}</td>
                            <td>${staffMap.get(dispatch.assigned_to) || 'Unassigned'}</td>
                            <td>${dispatch.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('manual-dispatch-btn').addEventListener('click', () => showManualDispatchModal(staff));
}

function showManualDispatchModal(staffList) {
    const staffOptions = staffList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const formHTML = `<form id="manual-dispatch-form"><div class="input-group"><input type="text" name="party_name" required><label>Party Name</label></div><div class="input-group"><textarea name="dispatch_details" placeholder="Product, Quantity, etc."></textarea></div><div class="input-group"><input type="date" name="scheduled_for" required><label>Schedule For</label></div><select name="assigned_to" class="input-group"><option value="">Assign to Staff...</option>${staffOptions}</select><button type="submit">Schedule Dispatch</button></form>`;
    renderModal('Schedule Manual Dispatch', formHTML);
    document.getElementById('manual-dispatch-form').addEventListener('submit', handleManualDispatchSubmit);
}

async function handleManualDispatchSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    let dispatchData = Object.fromEntries(formData.entries());
    dispatchData.dispatch_details = { details: dispatchData.dispatch_details };
    if (dispatchData.assigned_to === "") dispatchData.assigned_to = null;
    try {
        await insertData('dispatches', dispatchData);
        showAlert('Dispatch scheduled successfully!');
        closeModal();
        navigateTo('dispatches');
    } catch (error) { showAlert('Error: ' + error.message, 'error'); }
}