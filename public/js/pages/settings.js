// public/js/pages/settings.js

function renderSettingsPage(user) {
    // User object me signup ke waqt trigger se daali hui details hain
    const apiKey = user.user_metadata.api_key;
    const companyName = user.user_metadata.company_name;

    // Netlify ka live URL automatically lein
    const netlifyBaseUrl = window.location.origin;
    const pushApiUrl = `${netlifyBaseUrl}/.netlify/functions/indiamart-push?apiKey=${apiKey}`;

    return `
        <div class="page-header">
            <h2>Settings</h2>
        </div>
        <h3>Company Details</h3>
        <p><strong>Company Name:</strong> ${companyName}</p>
        <p><strong>Admin Email:</strong> ${user.email}</p>
        
        <hr style="margin: 20px 0; border-color: var(--border-color);">

        <h3>IndiaMART Push API URL</h3>
        <p>Neeche di gayi URL ko copy karke apne IndiaMART Seller Panel ke Push API section me paste karein:</p>
        <div style="background: #222; padding: 15px; border-radius: 5px; margin-top: 10px; word-wrap: break-word;">
            <code>${pushApiUrl}</code>
        </div>
        <button onclick="navigator.clipboard.writeText('${pushApiUrl}'); alert('URL Copied!')" style="margin-top: 10px;">Copy URL</button>

        <hr style="margin: 20px 0; border-color: var(--border-color);">
        <h3>Data Management</h3>
        <p>Leads data that is older than 30 days will be deleted automatically to keep your account fast.</p>
        <button onclick="navigateTo('leads')">Export Leads Now</button>
    `;
}