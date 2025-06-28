// public/js/auth.js

// Jab bhi page load hoga, yeh check karega ki user login hai ya nahi
document.addEventListener('DOMContentLoaded', () => {
    handleAuthStateChange();
});

function handleAuthStateChange() {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            // User logged in hai -> App shuru karo
            initializeApp();
        } else {
            // User logged out hai -> Login screen dikhao
            renderLoginUI();
        }
    });
}

function renderLoginUI() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <div class="login-container">
            <div id="auth-form" class="login-box glass-card">
                <!-- Login/Signup form yahan render hoga -->
            </div>
        </div>
    `;
    showLoginForm();
}

function showLoginForm() {
    document.getElementById('auth-form').innerHTML = `
        <h2>Login to CRM</h2>
        <form id="login-form">
            <div class="input-group">
                <input type="email" id="login-email" required autocomplete="email">
                <label>Email</label>
            </div>
            <div class="input-group">
                <input type="password" id="login-password" required autocomplete="current-password">
                <label>Password</label>
            </div>
            <button type="submit">Login</button>
        </form>
        <p class="toggle-form" onclick="showSignupForm()">Don't have an account? Sign Up</p>
    `;
    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

function showSignupForm() {
    document.getElementById('auth-form').innerHTML = `
        <h2>Create Account</h2>
        <form id="signup-form">
            <div class="input-group">
                <input type="text" id="signup-company" required>
                <label>Company Name</label>
            </div>
            <div class="input-group">
                <input type="email" id="signup-email" required autocomplete="email">
                <label>Email</label>
            </div>
            <div class="input-group">
                <input type="password" id="signup-password" required autocomplete="new-password">
                <label>Password</label>
            </div>
            <button type="submit">Sign Up</button>
        </form>
        <p class="toggle-form" onclick="showLoginForm()">Already have an account? Login</p>
    `;
    document.getElementById('signup-form').addEventListener('submit', handleSignup);
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await signIn(email, password);
        // Auth state change handler baaki kaam karega
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const companyName = document.getElementById('signup-company').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    try {
        await signUp(email, password, companyName);
        alert('Signup successful! Please check your email to verify your account.');
        showLoginForm();
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}