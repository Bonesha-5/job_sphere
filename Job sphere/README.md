# Job Sphere

A comprehensive job search aggregator built with **pure Python and vanilla JavaScript** - no frameworks, no Flask, just clean code!

## 🌟 Features

### Core Functionality
- **Multi-Source Job Search** - Aggregates jobs from JSearch (LinkedIn, Indeed, Glassdoor) and Arbeitnow (European & Remote jobs)
- **User Authentication** - Secure signup, login, and logout with session management
- **Password Security** - Strong password requirements with real-time validation
- **Password Reset** - Forgot password functionality with email codes
- **User Profiles** - Customizable job preferences (titles, locations, types)
- **Personalized Recommendations** - Get job suggestions based on your preferences
- **Dark/Light Mode** - Toggle between themes with persistent settings
- **Advanced Filtering** - Sort by date/title, filter by job type and company
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **API Usage Tracking** - Real-time counter for JSearch API calls (200/month limit)

### Technical Highlights
- **Pure Python HTTP Server** - No Flask or Django, just Python's `http.server`
- **JSON File Storage** - Lightweight data persistence without complex databases
- **Session Management** - Secure cookie-based authentication
- **RESTful API** - Clean API endpoints for all operations
- **Vanilla JavaScript** - No React, Vue, or jQuery - just pure JS
- **Modern CSS** - Responsive design with Flexbox and Grid
- **Security** - Password hashing with SHA-256, input validation, XSS protection

---

## Prerequisites

- Python 3.7 or higher
- Internet connection (for API calls)
- Modern web browser (Chrome, Firefox, Safari, Edge)

**No additional packages required!** This project uses only Python standard library.

---

##  Quick Start

### 1. Clone or Download

```bash
git clone <your-repo-url>
cd job-sphere
```

Or download and extract the ZIP file.

### 2. Verify Project Structure

```
job-sphere/
├── server.py
├── data/
│   ├── users.json
│   ├── sessions.json
│   ├── reset_codes.json
│   └── api_counter.json
├── public/
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── profile.html
│   ├── settings.html
│   ├── css/
│   │   ├── main.css
│   │   └── auth.css
│   └── js/
│       ├── main.js
│       ├── auth.js
│       ├── profile.js
│       └── settings.js
└── README.md
```

### 3. Start the Server

```bash
python3 server.py
```

You should see:
```
🌐 Job Sphere Server running on http://localhost:8000/job-sphere/
📁 Serving files from: public
💾 Data stored in: data

Press Ctrl+C to stop the server
```

### 4. Open in Browser

Navigate to: **http://localhost:8000/job-sphere/**

---

## 📖 User Guide

### First Time Setup

1. **Create Account**
   - Click "Sign up" on the login page
   - Enter username, email, and password
   - Password must meet requirements:
     - At least 8 characters
     - One uppercase letter (A-Z)
     - One lowercase letter (a-z)
     - One number (0-9)
     - One special character (!@#$%^&*)
   - Click "Sign Up"

2. **Set Your Preferences**
   - Navigate to **Profile**
   - Enter preferred job titles (e.g., "Software Engineer, Data Analyst")
   - Enter preferred locations (e.g., "Remote, New York, Berlin")
   - Select job types (Full-time, Part-time, Contract, Internship)
   - Click "Save Preferences"

3. **Configure Settings**
   - Navigate to **Settings**
   - Toggle **Dark Mode** for dark theme
   - Enable **Notifications** to see recommended jobs on homepage
   - Settings save automatically

### Searching for Jobs

1. Go to **Home** page
2. Enter job title or keywords (e.g., "Python Developer")
3. Optionally enter location (e.g., "Remote")
4. Select source:
   - **All Sources** - Search both APIs
   - **Arbeitnow** - European & remote jobs only
   - **JSearch** - Global jobs (uses API quota)
5. Click **Search Jobs**

### Using Filters

- **Sort By**: Newest first, Oldest first, Title (A-Z), Title (Z-A)
- **Filter by Job Type**: Full-time, Part-time, Contract, Internship
- **Filter by Company**: Type company name to filter

### Recommended Jobs

If you've set preferences and enabled notifications:
- Homepage shows **"Recommended Jobs for You"** section
- Jobs match your preferred titles and locations
- Updated automatically based on your profile

### Password Reset

If you forget your password:
1. Click **"Forgot Password?"** on login page
2. Enter your email
3. Check terminal/console for 6-digit code
4. Enter code and set new password
5. New password must meet same requirements

---

## 🌐 Deployment

### Deploy to Web Servers

#### Prerequisites
- Two web servers (web01, web02)
- One load balancer (lb01)
- SSH access to all servers
- Nginx installed

#### Step 1: Upload Files to web01

```bash
# Create directory
ssh ubuntu@web01
mkdir -p /home/ubuntu/job-sphere
exit

# Upload from local machine
scp -r job-sphere/ ubuntu@web01:/home/ubuntu/

# Or use rsync
rsync -avz job-sphere/ ubuntu@web01:/home/ubuntu/job-sphere/
```

#### Step 2: Start Server on web01

```bash
ssh ubuntu@web01
cd /home/ubuntu/job-sphere

# Test run
python3 server.py

# Run in background (use screen or tmux)
screen -S job-sphere
python3 server.py
# Press Ctrl+A then D to detach

# Or use nohup
nohup python3 server.py > server.log 2>&1 &
```

#### Step 3: Configure Nginx on web01

```bash
sudo nano /etc/nginx/sites-available/job-sphere
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name _;

    location /job-sphere/ {
        proxy_pass http://127.0.0.1:8000/job-sphere/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/job-sphere /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Test: `curl http://localhost/job-sphere/`

#### Step 4: Repeat for web02

Repeat steps 1-3 on web02 with the same commands.

#### Step 5: Verify Load Balancer

Your HAProxy on lb01 should already be configured. If not, add:

```
backend web_servers
    balance roundrobin
    server web-01 <web01-ip>:80 check
    server web-02 <web02-ip>:80 check
```

Test: **https://bonesha.tech/job-sphere/**

---

## 🔧 Configuration

### API Keys

Edit `server.py` to update API keys:

```python
# Line 24-26
JSEARCH_API_KEY = "your-jsearch-api-key"
JSEARCH_HOST = "jsearch.p.rapidapi.com"
ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api"
```

### Port Configuration

Change the port number in `server.py`:

```python
# Line 19
PORT = 8000  # Change to desired port
```

### Base Path

To change the URL path from `/job-sphere/` to something else:

```python
# Line 20
BASE_PATH = "/job-sphere"  # Change to "/your-path"
```

---

## 🗄️ Data Storage

All data is stored in JSON files in the `data/` directory:

- **users.json** - User accounts and preferences
- **sessions.json** - Active user sessions
- **reset_codes.json** - Password reset codes (expire after 15 min)
- **api_counter.json** - JSearch API usage tracking

### Backup Data

```bash
# Create backup
cp -r data/ data_backup_$(date +%Y%m%d)

# Restore backup
cp -r data_backup_20251118/ data/
```

### Reset Data

```bash
# Clear all users (keep structure)
echo '[]' > data/users.json
echo '{}' > data/sessions.json
echo '{}' > data/reset_codes.json
```

---

## 🐛 Troubleshooting

### Server Won't Start

**Issue**: Port already in use
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process
kill -9 <PID>
```

**Issue**: Permission denied
```bash
# Give execute permission
chmod +x server.py
```

### Can't Access from Browser

**Check server is running:**
```bash
ps aux | grep server.py
```

**Check if port is open:**
```bash
curl http://localhost:8000/job-sphere/
```

**Check Nginx:**
```bash
sudo nginx -t
sudo systemctl status nginx
```

### API Not Working

**JSearch API limit reached:**
- Check console for "API limit reached" message
- Counter resets monthly
- Arbeitnow still works (unlimited)

**No jobs returned:**
- Try different search terms
- Check internet connection
- Verify API keys in `server.py`

### Login/Session Issues

**Can't login after signup:**
- Check `data/users.json` exists
- Verify password meets requirements
- Clear browser cookies

**Session expires immediately:**
- Check server time is correct
- Verify `data/sessions.json` is writable

### Password Reset Code Not Showing

The reset code is printed to the terminal/console where the server is running:

```bash
# On server, view logs
tail -f server.log

# Or check terminal where server.py is running
```

---

## Security

### Password Security
- Passwords hashed with SHA-256
- Minimum 8 characters with complexity requirements
- Session tokens are cryptographically secure (32 bytes)

### Session Management
- HttpOnly cookies prevent XSS attacks
- Sessions expire after 24 hours
- Session tokens stored server-side

### API Security
- API keys not exposed in frontend
- All sensitive data handled server-side
- Input validation on all endpoints

### Production Recommendations
- Use HTTPS (already configured with your SSL)
- Change secret keys in production
- Implement rate limiting
- Use PostgreSQL instead of JSON files
- Send password reset codes via email (not console)
- Add CSRF protection
- Implement account lockout after failed attempts

---

## 📊 API Usage

### JSearch API (RapidAPI)
- **Quota**: 200 requests/month
- **Coverage**: LinkedIn, Indeed, Glassdoor, ZipRecruiter
- **Documentation**: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

### Arbeitnow API
- **Quota**: Unlimited (free public API)
- **Coverage**: European and remote job listings
- **Documentation**: https://arbeitnow.com/api

### API Counter
- Tracks JSearch API usage
- Resets monthly
- View in homepage: "API Calls: X / 200 remaining"

---

## 🎨 Customization

### Change Colors

Edit `public/css/main.css`:

```css
/* Line 7-8: Change gradient colors */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Modify Job Card Layout

Edit `public/css/main.css` starting at line 200 (`.job-card` class)

### Add More Filters

1. Add filter UI in `public/index.html`
2. Update filter logic in `public/js/main.js`
3. No server changes needed!

---

## 📝 Development

### Adding New Features

1. **Add API endpoint** in `server.py`:
```python
elif path == '/api/your-endpoint':
    self.handle_your_endpoint(data)
```

2. **Create handler method**:
```python
def handle_your_endpoint(self, data):
    # Your logic here
    self.send_json({'success': True, 'data': result})
```

3. **Add frontend logic** in appropriate JS file

### Code Structure

- **server.py** - All backend logic
- **public/js/auth.js** - Login/signup
- **public/js/main.js** - Job search and display
- **public/js/profile.js** - Profile management
- **public/js/settings.js** - Settings management

---

## 🤝 Contributing

This project was created for an academic assignment. If you find bugs or have suggestions:

1. Document the issue
2. Propose a solution
3. Test thoroughly
4. Submit with clear explanation

---

## 📄 License

This project is created for educational purposes as part of a university assignment.

---

## 👤 Author

**Uwineza Bonesha Kevine**
Course: Web Infrastructure
Date: November 2025

---

## 🙏 Acknowledgments

- **JSearch API** by LetScrape - Job data aggregation
- **Arbeitnow API** - European and remote job listings
- **Python Standard Library** - HTTP server implementation
- **Instructor** - Project guidance and requirements

---

## 📞 Support

For issues or questions:
- Check **Troubleshooting** section
- Review server logs: `tail -f server.log`
- Verify all files are present
- Ensure Python 3.7+ is installed

---

## ✨ Key Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| User Authentication | ✅ | Secure signup/login/logout |
| Password Reset | ✅ | Email code verification |
| Job Search | ✅ | Multi-source aggregation |
| Filters & Sort | ✅ | Advanced filtering options |
| Recommendations | ✅ | Personalized job suggestions |
| Dark Mode | ✅ | Theme toggle |
| API Tracking | ✅ | Usage monitoring |
| Load Balancing | ✅ | HAProxy integration |
| Responsive | ✅ | Mobile-friendly design |
| No Dependencies | ✅ | Pure Python/JavaScript |

---

**Built with ❤️ using vanilla Python and JavaScript - no frameworks needed!**

🌐 **Live Demo**: https://bonesha.tech/job-sphere/