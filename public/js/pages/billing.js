// public/js/pages/billing.js

async function renderBillingPage(container) {
    container.innerHTML = `<p>Loading bills...</p>`;
    const bills = await fetchData('billing');

    container.innerHTML = `
        <div class="page-header">
            <h2>Billing Reminders (${bills.length})</h2>
            <button onclick="alert('Add New Bill form will be shown here.')">Add New Bill</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Party Name</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${bills.map(bill => `
                        <tr class="${new Date(bill.due_date) < new Date() && !bill.is_paid ? 'overdue' : ''}">
                            <td>${bill.party_name}</td>
                            <td>₹${bill.amount}</td>
                            <td>${new Date(bill.due_date).toLocaleDateString()}</td>
                            <td>
                                <button onclick="sendWhatsAppReminder('${bill.party_name}', '${bill.amount}', '${new Date(bill.due_date).toLocaleDateString()}')">WhatsApp</button>
                                <button onclick="sendEmailReminder('${bill.party_name}', '${bill.amount}', '${new Date(bill.due_date).toLocaleDateString()}')">Email</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function sendWhatsAppReminder(party, amount, dueDate) {
    const message = encodeURIComponent(`Hello ${party}, this is a friendly reminder that your payment of ₹${amount} is due on ${dueDate}. Thank you.`);
    const phone = prompt("Please enter the party's WhatsApp number (with country code, e.g., 91xxxxxxxxxx):");
    if (phone) {
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    }
}

function sendEmailReminder(party, amount, dueDate) {
    const subject = encodeURIComponent(`Payment Reminder: Bill for ₹${amount}`);
    const body = encodeURIComponent(`Dear ${party},\n\nThis is a friendly reminder that your payment of ₹${amount} is due on ${dueDate}.\n\nPlease let us know if you have any questions.\n\nThank you.`);
    const email = prompt("Please enter the party's email address:");
    if (email) {
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    }
}