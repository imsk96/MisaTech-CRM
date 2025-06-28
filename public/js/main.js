// public/js/main.js

const AppState = {
    currentPage: null,
    currentUser: null,
};

async function initializeApp() {
    const { data: { user } } = await getCurrentUser();
    AppState.currentUser = user;
    
    renderAppShell();
    navigateTo('dashboard');
}

function navigateTo(page) {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) return;

    switch (page) {
        case 'dashboard':
            renderDashboardPage(pageContent);
            break;
        case 'leads':
            renderLeadsPage(pageContent);
            break;
        case 'visits':
            renderVisitsPage(pageContent);
            break;
        case 'dispatches':
            renderDispatchesPage(pageContent);
            break;
        case 'billing':
            renderBillingPage(pageContent);
            break;
        case 'staff':
            renderStaffPage(pageContent);
            break;
        case 'settings':
            pageContent.innerHTML = renderSettingsPage(AppState.currentUser);
            break;
        default:
            pageContent.innerHTML = `<h2>Page Not Found</h2>`;
    }
    setActiveNav(page);
    AppState.currentPage = page;
}