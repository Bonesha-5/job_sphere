// Authentication Logic for Job Sphere

const BASE_PATH = '/job-sphere';

// Check if we're on login page
if (window.location.pathname.includes('login.html')) {
    initLoginPage();
}

// Check if we're on signup page
if (window.location.pathname.includes('signup.html')) {
    initSignupPage();
}

// LOGIN PAGE

function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const forgotLink = document.getElementById('forgot-link');
    const backToLogin1 = document.getElementById('back-to-login-1');
    const backToLogin2 = document.getElementById('back-to-login-2');

    loginForm.addEventListener('submit', handleLogin);
    forgotLink.addEventListener('click', showForgotPassword);
    backToLogin1.addEventListener('click', showLogin);
    backToLogin2.addEventListener('click', showLogin);

    const forgotForm = document.getElementById('forgot-form');
    forgotForm.addEventListener('submit', handleForgotPassword);

    const resetForm = document.getElementById('reset-form');
    const newPasswordInput = document.getElementById('new-password');
    resetForm.addEventListener('submit', handleResetPassword);
    newPasswordInput.addEventListener('input', validateResetPassword);
}

function showLogin() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('forgot-section').style.display = 'none';
    document.getElementById('reset-section').style.display = 'none';
}

function showForgotPassword(e) {
    e.preventDefault();
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('forgot-section').style.display = 'block';
    document.getElementById('reset-section').style.display = 'none';
}

function showResetPassword() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('forgot-section').style.display = 'none';
    document.getElementById('reset-section').style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');

    try {
        const response = await fetch(`${BASE_PATH}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = 'index.html';
        } else {
            errorDiv.textContent = data.message;
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    }
}

let resetEmail = '';

async function handleForgotPassword(e) {
    e.preventDefault();

    resetEmail = document.getElementById('forgot-email').value;
    const messageDiv = document.getElementById('forgot-message');

    try {
        const response = await fetch(`${BASE_PATH}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetEmail })
        });

        const data = await response.json();

        if (data.success) {
            messageDiv.textContent = `Reset code sent! Code: ${data.dev_code} (Check console/terminal)`;
            messageDiv.className = 'success-message';
            messageDiv.style.display = 'block';

            console.log('Password Reset Code:', data.dev_code);

            setTimeout(() => {
                showResetPassword();
            }, 3000);
        } else {
            messageDiv.textContent = data.message;
            messageDiv.className = 'error-message';
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.className = 'error-message';
        messageDiv.style.display = 'block';
    }
}

function validateResetPassword() {
    const password = document.getElementById('new-password').value;
    const resetBtn = document.getElementById('reset-btn');

    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    updateRequirement('reset-req-length', hasLength);
    updateRequirement('reset-req-uppercase', hasUppercase);
    updateRequirement('reset-req-lowercase', hasLowercase);
    updateRequirement('reset-req-number', hasNumber);
    updateRequirement('reset-req-special', hasSpecial);

    const allValid = hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    resetBtn.disabled = !allValid;

    return allValid;
}

async function handleResetPassword(e) {
    e.preventDefault();

    const code = document.getElementById('reset-code').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    const messageDiv = document.getElementById('reset-message');

    if (!validateResetPassword()) {
        messageDiv.textContent = 'Password does not meet requirements';
        messageDiv.className = 'error-message';
        messageDiv.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        messageDiv.textContent = 'Passwords do not match';
        messageDiv.className = 'error-message';
        messageDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${BASE_PATH}/api/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: resetEmail,
                code: code,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            messageDiv.textContent = 'Password reset successful! Redirecting to login...';
            messageDiv.className = 'success-message';
            messageDiv.style.display = 'block';

            setTimeout(() => {
                showLogin();
            }, 2000);
        } else {
            messageDiv.textContent = data.message;
            messageDiv.className = 'error-message';
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        messageDiv.textContent = 'Network error. Please try again.';
        messageDiv.className = 'error-message';
        messageDiv.style.display = 'block';
    }
}

// SIGNUP PAGE

function initSignupPage() {
    const signupForm = document.getElementById('signup-form');
    const passwordInput = document.getElementById('password');

    signupForm.addEventListener('submit', handleSignup);
    passwordInput.addEventListener('input', validateSignupPassword);
}

function validateSignupPassword() {
    const password = document.getElementById('password').value;
    const signupBtn = document.getElementById('signup-btn');

    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    updateRequirement('req-length', hasLength);
    updateRequirement('req-uppercase', hasUppercase);
    updateRequirement('req-lowercase', hasLowercase);
    updateRequirement('req-number', hasNumber);
    updateRequirement('req-special', hasSpecial);

    const allValid = hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    signupBtn.disabled = !allValid;

    return allValid;
}

async function handleSignup(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('error-message');

    if (!validateSignupPassword()) {
        errorDiv.textContent = 'Password does not meet requirements';
        errorDiv.style.display = 'block';
        return;
    }

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${BASE_PATH}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = 'index.html';
        } else {
            errorDiv.textContent = data.message;
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    }
}

// SHARED FUNCTIONS

function updateRequirement(id, isValid) {
    const element = document.getElementById(id);
    if (!element) return;

    if (isValid) {
        element.classList.add('valid');
        element.textContent = element.textContent.replace('✗', '✓');
    } else {
        element.classList.remove('valid');
        element.textContent = element.textContent.replace('✓', '✗');
    }
}