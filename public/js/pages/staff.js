// public/js/pages/staff.js
async function renderStaffPage(container) {
    container.innerHTML = `<p>Loading staff...</p>`;
    const staff = await fetchData('staff');

    container.innerHTML = `
        <div class="page-header">
            <h2>Manage Staff (${staff.length})</h2>
            <button id="add-staff-btn">Add Staff</button>
        </div>
        <div class="table-container">
            <table>
                <thead><tr><th>Name</th><th>Email</th><th>WhatsApp</th></tr></thead>
                <tbody>
                    ${staff.map(s => `
                        <tr>
                            <td>${s.name}</td>
                            <td>${s.email || 'N/A'}</td>
                            <td>${s.whatsapp_number || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('add-staff-btn').addEventListener('click', showAddStaffModal);
}

function showAddStaffModal() {
    const formHTML = `<form id="add-staff-form"><div class="input-group"><input type="text" name="name" required><label>Staff Name</label></div><div class="input-group"><input type="email" name="email"><label>Email (Optional)</label></div><div class="input-group"><input type="text" name="whatsapp_number"><label>WhatsApp Number (Optional)</label></div><button type="submit">Save Staff</button></form>`;
    renderModal('Add New Staff', formHTML);
    document.getElementById('add-staff-form').addEventListener('submit', handleAddStaffSubmit);
}

async function handleAddStaffSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const staffData = Object.fromEntries(formData.entries());
    try {
        await insertData('staff', staffData);
        showAlert('Staff added successfully!');
        closeModal();
        navigateTo('staff');
    } catch (error) { showAlert('Error: ' + error.message, 'error'); }
}