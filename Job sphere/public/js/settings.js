// Settings Page

const BASE_PATH = '/job-sphere';
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function () {
    await checkAuthentication();

    // Event listeners
    document.getElementById('dark-mode-toggle').addEventListener('change', toggleDarkMode);
    document.getElementById('notifications-toggle').addEventListener('change', toggleNotifications);
    document.getElementById('logout-btn').addEventListener('click', logout);
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

        // Display user info
        document.getElementById('account-username').textContent = currentUser.username;
        document.getElementById('account-email').textContent = currentUser.email;

        // Set toggle states
        document.getElementById('dark-mode-toggle').checked = currentUser.dark_mode || false;
        document.getElementById('notifications-toggle').checked = currentUser.notifications_enabled !== false;

        // Apply dark mode immediately if enabled
        if (currentUser.dark_mode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
    }
}

// Toggle dark mode
async function toggleDarkMode() {
    const darkMode = document.getElementById('dark-mode-toggle').checked;

    console.log('Dark mode toggle clicked:', darkMode);

    try {
        const response = await fetch(`${BASE_PATH}/api/settings/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dark_mode: darkMode })
        });

        const result = await response.json();

        console.log('Settings update response:', result);

        if (result.success) {
            // Apply dark mode immediately to current page
            if (darkMode) {
                console.log('Adding dark-mode class');
                document.body.classList.add('dark-mode');
            } else {
                console.log('Removing dark-mode class');
                document.body.classList.remove('dark-mode');
            }

            // Verify class was added
            console.log('Body classes:', document.body.className);

            showMessage('Theme updated successfully!', 'success');
        } else {
            // Revert checkbox if failed
            document.getElementById('dark-mode-toggle').checked = !darkMode;
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Dark mode error:', error);
        // Revert checkbox if failed
        document.getElementById('dark-mode-toggle').checked = !darkMode;
        showMessage('An error occurred. Please try again.', 'error');
    }
}

// Toggle notifications
async function toggleNotifications() {
    const notifications = document.getElementById('notifications-toggle').checked;

    try {
        const response = await fetch(`${BASE_PATH}/api/settings/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notifications_enabled: notifications })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Notification settings updated! Refresh Home page to see changes.', 'success');
        } else {
            // Revert checkbox if failed
            document.getElementById('notifications-toggle').checked = !notifications;
            showMessage(result.message, 'error');
        }
    } catch (error) {
        // Revert checkbox if failed
        document.getElementById('notifications-toggle').checked = !notifications;
        showMessage('An error occurred. Please try again.', 'error');
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