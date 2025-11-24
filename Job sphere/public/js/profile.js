// Profile Management

const BASE_PATH = '/job-sphere';
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function () {
    await checkAuthentication();
    await loadUserProfile();

    // Event listeners
    document.getElementById('account-form').addEventListener('submit', updateAccount);
    document.getElementById('preferences-form').addEventListener('submit', updatePreferences);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('new-password').addEventListener('input', validateProfilePassword);
});

// Check authentication
async function checkAuthentication() {
    try {
        const response = await fetch(`${BASE_PATH}/api/check-session`);
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = 'login.html';
            return;
        }

        currentUser = data.user;

        // Apply dark mode
        if (currentUser.dark_mode) {
            document.body.classList.add('dark-mode');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
    }
}

// Load user profile data
async function loadUserProfile() {
    try {
        const response = await fetch(`${BASE_PATH}/api/check-session`);
        const data = await response.json();

        if (data.authenticated) {
            const user = data.user;

            // Populate account info
            document.getElementById('username').value = user.username;
            document.getElementById('email').value = user.email;

            // Try to load full user data to get preferences
            console.log('User data loaded:', user);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Validate profile password
function validateProfilePassword() {
    const password = document.getElementById('new-password').value;
    const requirementsDiv = document.getElementById('password-requirements');

    if (!password) {
        requirementsDiv.style.display = 'none';
        return true;
    }

    requirementsDiv.style.display = 'block';

    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    updateRequirement('prof-req-length', hasLength);
    updateRequirement('prof-req-uppercase', hasUppercase);
    updateRequirement('prof-req-lowercase', hasLowercase);
    updateRequirement('prof-req-number', hasNumber);
    updateRequirement('prof-req-special', hasSpecial);

    return hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

function updateRequirement(id, isValid) {
    const element = document.getElementById(id);
    if (isValid) {
        element.classList.add('valid');
        element.textContent = element.textContent.replace('✗', '✓');
    } else {
        element.classList.remove('valid');
        element.textContent = element.textContent.replace('✓', '✗');
    }
}

// Saving new account information
async function updateAccount(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('new-password').value;

    // Validate password if provided
    if (password && !validateProfilePassword()) {
        showMessage('Password does not meet requirements', 'error');
        return;
    }

    const data = { username, email };
    if (password) {
        data.password = password;
    }

    try {
        const response = await fetch(`${BASE_PATH}/api/profile/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Account updated successfully!', 'success');
            document.getElementById('new-password').value = '';
            document.getElementById('password-requirements').style.display = 'none';
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('An error occurred. Please try again.', 'error');
        console.error('Update error:', error);
    }
}

// Update preferences
async function updatePreferences(e) {
    e.preventDefault();

    const jobTitles = document.getElementById('job-titles').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

    const locations = document.getElementById('locations').value
        .split(',')
        .map(l => l.trim())
        .filter(l => l);

    const jobTypes = Array.from(document.querySelectorAll('input[name="job-type"]:checked'))
        .map(cb => cb.value);

    const data = {
        preferred_job_titles: jobTitles,
        preferred_locations: locations,
        preferred_job_types: jobTypes
    };

    console.log('Saving preferences:', data);

    try {
        const response = await fetch(`${BASE_PATH}/api/profile/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Preferences saved successfully! Enable notifications in Settings to see recommendations.', 'success');
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('An error occurred. Please try again.', 'error');
        console.error('Preferences error:', error);
    }
}

// Logout
async function logout(e) {
    e.preventDefault();
    try {
        await fetch(`${BASE_PATH}/api/logout`, { method: 'POST' });
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show message
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}