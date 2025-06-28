// public/js/main.js

// App ka state store karne ke liye
const AppState = {
    currentPage: null,
    currentUser: null,
};

// Jab user login hota hai to auth.js se yeh function call hota hai
async function initializeApp() {
    const { data: { user } } = await getCurrentUser();
    AppState.currentUser = user;
    
    renderAppShell();
    navigateTo('dashboard'); // Login ke baad default page
}

// Pages ke content ko load aur render karne ke liye router
function navigateTo(page) {
    const pageContent = document.getElementById('page-content');
    if (!pageContent) {
        console.error("Page content container not found!");
        return;
    }

    // Har page ki ek `render...Page` function hogi
    switch (page) {
        case 'dashboard':
            renderDashboardPage(pageContent); // Async function
            break;
        case 'leads':
            renderLeadsPage(pageContent); // Async function
            break;
        case 'billing':
            renderBillingPage(pageContent); // Async function
            break;
        case 'settings':
            // Settings page sync hai, isliye seedhe innerHTML me daal sakte hain
            pageContent.innerHTML = renderSettingsPage(AppState.currentUser);
            break;
        default:
            pageContent.innerHTML = `<h2>Page Not Found</h2>`;
    }
    setActiveNav(page);
    AppState.currentPage = page;
}