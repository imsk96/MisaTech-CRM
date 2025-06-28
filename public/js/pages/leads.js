// public/js/pages/leads.js

async function renderLeadsPage(container) {
    container.innerHTML = `<p>Loading leads...</p>`;
    const leads = await fetchData('leads');
    
    container.innerHTML = `
        <div class="page-header">
            <h2>Leads (${leads.length})</h2>
            <button id="export-leads-btn">Export to CSV</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Product</th>
                        <th>City</th>
                        <th>Received On</th>
                    </tr>
                </thead>
                <tbody>
                    ${leads.map(lead => `
                        <tr>
                            <td>${lead.data.SENDERNAME || 'N/A'}</td>
                            <td>${lead.data.MOB || 'N/A'}</td>
                            <td>${lead.data.PRODUCT_NAME || 'N/A'}</td>
                            <td>${lead.data.ENQ_CITY || 'N/A'}</td>
                            <td>${new Date(lead.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('export-leads-btn').addEventListener('click', () => {
        if(leads.length === 0) {
            alert("No leads to export!");
            return;
        }
        // Sirf data property ko export karein
        const leadsToExport = leads.map(l => l.data);
        const csv = Papa.unparse(leadsToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "leads-export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}