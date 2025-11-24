// Display Logic for Job Sphere

const BASE_PATH = '/job-sphere';

// Global variables
let allJobs = [];
let filteredJobs = [];
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function () {
    await checkAuthentication();
    updateAPICounter();
    await loadRecommendedJobs();

    // Event listeners
    document.getElementById('search-btn').addEventListener('click', searchJobs);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('sort-by').addEventListener('change', sortJobs);
    document.getElementById('filter-type').addEventListener('change', filterJobs);
    document.getElementById('filter-company').addEventListener('input', filterJobs);

    // Enter key to search
    document.getElementById('job-query').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') searchJobs();
    });
    document.getElementById('job-location').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') searchJobs();
    });
});

// Check if user is authenticated
async function checkAuthentication() {
    try {
        const response = await fetch(`${BASE_PATH}/api/check-session`);
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = 'login.html';
            return;
        }

        currentUser = data.user;
        document.getElementById('user-name').textContent = currentUser.username;

        // Apply dark mode if enabled
        if (currentUser.dark_mode) {
            document.body.classList.add('dark-mode');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
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

// Update API usage counter
async function updateAPICounter() {
    try {
        const response = await fetch(`${BASE_PATH}/api/stats`);
        const data = await response.json();

        const counterText = document.getElementById('counter-text');
        const percentage = (data.used / data.total) * 100;

        let color = '#4CAF50';
        if (percentage > 75) color = '#ff9800';
        if (percentage > 90) color = '#f44336';

        counterText.innerHTML = `
            API Calls: <span style="color: ${color}; font-weight: bold;">${data.remaining}</span> / ${data.total} remaining this month
        `;
    } catch (error) {
        console.error('Error fetching API stats:', error);
    }
}

// Load recommended jobs
async function loadRecommendedJobs() {
    // Check if notifications are enabled
    if (!currentUser || !currentUser.notifications_enabled) {
        console.log('Notifications disabled, skipping recommendations');
        return;
    }

    try {
        const response = await fetch(`${BASE_PATH}/api/recommended-jobs`);

        const data = await response.json();

        console.log('Recommended jobs response:', data);

        if (data.success && data.jobs && data.jobs.length > 0) {
            const section = document.getElementById('recommended-jobs-section');
            const container = document.getElementById('recommended-jobs-container');

            container.innerHTML = '';
            data.jobs.forEach((job, index) => {
                const jobCard = createJobCard(job, index);
                container.appendChild(jobCard);
            });

            section.style.display = 'block';
        } else {
            console.log('No recommended jobs:', data.message || 'Empty preferences');
        }
    } catch (error) {
        console.error('Error loading recommended jobs:', error);
    }
}

// Search for jobs
async function searchJobs() {
    const query = document.getElementById('job-query').value.trim();
    const location = document.getElementById('job-location').value.trim();
    const source = document.getElementById('job-source').value;

    if (!query) {
        showError('Please enter a job title or keyword');
        return;
    }

    document.getElementById('loading').style.display = 'block';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('results-container').innerHTML = '';
    document.getElementById('controls').style.display = 'none';

    try {
        const response = await fetch(`${BASE_PATH}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, location, source })
        });

        const data = await response.json();
        document.getElementById('loading').style.display = 'none';

        if (data.success) {
            allJobs = data.jobs;
            filteredJobs = [...allJobs];

            if (allJobs.length === 0) {
                showError('No jobs found. Try different keywords or location.');
            } else {
                displayJobs(filteredJobs);
                document.getElementById('controls').style.display = 'block';
                updateResultsCount();
            }

            if (data.message) {
                showError(data.message);
            }
        } else {
            showError(data.message || 'An error occurred while searching');
        }

        updateAPICounter();

    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        showError('Network error. Please check your connection.');
        console.error('Search error:', error);
    }
}

// Display jobs
function displayJobs(jobs) {
    const container = document.getElementById('results-container');
    container.innerHTML = '';

    if (jobs.length === 0) {
        container.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">No jobs match your filters.</p>';
        return;
    }

    jobs.forEach((job, index) => {
        const jobCard = createJobCard(job, index);
        container.appendChild(jobCard);
    });
}

// Cards for jobs to be displayed
function createJobCard(job, index) {
    const card = document.createElement('div');
    card.className = 'job-card';

    card.innerHTML = `
        <div class="job-source">${escapeHtml(job.source)}</div>
        <h3 class="job-title">${escapeHtml(job.title)}</h3>
        <div class="job-company">${escapeHtml(job.company)}</div>
        <div class="job-location">${escapeHtml(job.location)}</div>

        <div class="job-details">
            <span class="job-detail-item"> 📅${formatDate(job.posted_date)}</span>
            <span class="job-detail-item">👜${escapeHtml(job.employment_type)}</span>
            ${job.salary !== 'Not specified' ? `<span class="job-detail-item"> 💎 ${escapeHtml(job.salary)}</span>` : ''}
        </div>

        <div class="job-description">${escapeHtml(job.description)}</div>

        <div class="job-actions">
            <a href="${escapeHtml(job.apply_link)}" target="_blank" class="apply-btn">Apply Now</a>
        </div>
    `;

    return card;
}

// Format date
function formatDate(dateString) {
    if (!dateString || dateString === 'N/A') return 'Recently';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    } catch (error) {
        return 'Recently';
    }
}

// Sort jobs
function sortJobs() {
    const sortBy = document.getElementById('sort-by').value;

    if (!sortBy) {
        filteredJobs = [...allJobs];
    } else {
        filteredJobs.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.posted_date) - new Date(a.posted_date);
                case 'date-asc':
                    return new Date(a.posted_date) - new Date(b.posted_date);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
    }

    filterJobs();
}

// Filter jobs
function filterJobs() {
    const typeFilter = document.getElementById('filter-type').value.toLowerCase();
    const companyFilter = document.getElementById('filter-company').value.toLowerCase();

    filteredJobs = allJobs.filter(job => {
        const matchesType = !typeFilter || job.employment_type.toLowerCase().includes(typeFilter);
        const matchesCompany = !companyFilter || job.company.toLowerCase().includes(companyFilter);
        return matchesType && matchesCompany;
    });

    const sortBy = document.getElementById('sort-by').value;
    if (sortBy) {
        sortJobs();
        return;
    }

    displayJobs(filteredJobs);
    updateResultsCount();
}

// Update results count
function updateResultsCount() {
    const count = filteredJobs.length;
    const total = allJobs.length;
    document.getElementById('results-count').textContent =
        count === total ? `${count} jobs found` : `${count} of ${total} jobs`;
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}