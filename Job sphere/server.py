#!/usr/bin/env python3
"""
Job Sphere - Pure Python HTTP Server

"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
import hashlib
import hmac
import secrets
import re
from datetime import datetime, timedelta
import requests
import mimetypes

# Configuration
PORT = 8000
BASE_PATH = "/job-sphere"
DATA_DIR = "data"
PUBLIC_DIR = "public"

# API Keys
JSEARCH_API_KEY = "b67870aca3msh83fd55e7e7d4f38p1549d2jsn7576024d3977"
JSEARCH_HOST = "jsearch.p.rapidapi.com"
ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api"

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize data files


def init_data_files():
    files = {
        'users.json': [],
        'sessions.json': {},
        'reset_codes.json': {},
        'api_counter.json': {'count': 0, 'last_reset': datetime.now().isoformat()}
    }
    for filename, default_data in files.items():
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            with open(filepath, 'w') as f:
                json.dump(default_data, f)


init_data_files()

# Functions to be used


def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except:
        return {} if filename in ['sessions.json', 'reset_codes.json'] else []


def save_json(filename, data):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def generate_session_token():
    return secrets.token_urlsafe(32)


def generate_reset_code():
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def validate_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character(e.g: @, %)"
    return True, "Valid"


def get_user_from_session(session_token):
    if not session_token:
        return None
    sessions = load_json('sessions.json')
    user_id = sessions.get(session_token)
    if not user_id:
        return None
    users = load_json('users.json')
    for user in users:
        if user['id'] == user_id:
            return user
    return None

# API Functions


def fetch_jsearch_jobs(query, location=""):
    try:
        search_query = query
        if location:
            search_query += f" in {location}"

        url = "https://jsearch.p.rapidapi.com/search"
        params = {
            "query": search_query,
            "page": "1",
            "num_pages": "1"
        }
        headers = {
            "x-rapidapi-key": JSEARCH_API_KEY,
            "x-rapidapi-host": JSEARCH_HOST
        }

        response = requests.get(url, headers=headers,
                                params=params, timeout=10)
        response.raise_for_status()

        # Increasing the counter as the user searches for job
        counter = load_json('api_counter.json')
        counter['count'] += 1
        save_json('api_counter.json', counter)

        data = response.json()
        jobs = []

        if 'data' in data:
            for job in data['data']:
                jobs.append({
                    'id': job.get('job_id', ''),
                    'title': job.get('job_title', 'N/A'),
                    'company': job.get('employer_name', 'N/A'),
                    'location': job.get('job_city', job.get('job_country', 'Remote')),
                    'description': (job.get('job_description', 'No description')[:300] + '...'),
                    'salary': job.get('job_salary', 'Not specified'),
                    'employment_type': job.get('job_employment_type', 'N/A'),
                    'posted_date': job.get('job_posted_at_datetime_utc', 'N/A'),
                    'apply_link': job.get('job_apply_link', '#'),
                    'source': 'JSearch'
                })
        return jobs
    except Exception as e:
        print(f"JSearch error: {e}")
        return []


def fetch_arbeitnow_jobs(query="", location=""):
    try:
        response = requests.get(ARBEITNOW_API_URL, timeout=10)
        response.raise_for_status()
        data = response.json()

        jobs = []
        if 'data' in data:
            for job in data['data']:
                title = job.get('title', '').lower()
                job_location = job.get('location', '').lower()

                if query and query.lower() not in title:
                    continue
                if location and location.lower() not in job_location:
                    continue

                jobs.append({
                    'id': job.get('slug', ''),
                    'title': job.get('title', 'N/A'),
                    'company': job.get('company_name', 'N/A'),
                    'location': job.get('location', 'Remote'),
                    'description': (job.get('description', 'No description')[:300] + '...'),
                    'salary': 'Not specified',
                    'employment_type': job.get('job_types', ['N/A'])[0] if job.get('job_types') else 'N/A',
                    'posted_date': job.get('created_at', 'N/A'),
                    'apply_link': job.get('url', '#'),
                    'source': 'Arbeitnow'
                })
        return jobs
    except Exception as e:
        print(f"Arbeitnow error: {e}")
        return []


class JobSphereHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Remove BASE_PATH prefix
        if path.startswith(BASE_PATH):
            path = path[len(BASE_PATH):]

        if path == '' or path == '/':
            path = '/login.html'

        # Serve static files
        if path.startswith('/css/') or path.startswith('/js/') or path.endswith('.html'):
            self.serve_file(path)

        # API endpoints
        elif path == '/api/check-session':
            self.check_session()
        elif path == '/api/stats':
            self.get_stats()
        elif path == '/api/recommended-jobs':
            self.handle_recommended_jobs()
        else:
            self.send_error(404)

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Remove BASE_PATH prefix
        if path.startswith(BASE_PATH):
            path = path[len(BASE_PATH):]

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')

        try:
            data = json.loads(body) if body else {}
        except:
            data = {}

        # Route to handlers
        if path == '/api/signup':
            self.handle_signup(data)
        elif path == '/api/login':
            self.handle_login(data)
        elif path == '/api/logout':
            self.handle_logout()
        elif path == '/api/forgot-password':
            self.handle_forgot_password(data)
        elif path == '/api/reset-password':
            self.handle_reset_password(data)
        elif path == '/api/search':
            self.handle_search(data)
        elif path == '/api/profile/update':
            self.handle_profile_update(data)
        elif path == '/api/settings/update':
            self.handle_settings_update(data)
        elif path == '/api/recommended-jobs':
            self.handle_recommended_jobs()
        else:
            self.send_error(404)

    def serve_file(self, path):
        # Remove leading slash
        if path.startswith('/'):
            path = path[1:]

        filepath = os.path.join(PUBLIC_DIR, path)

        if not os.path.exists(filepath):
            self.send_error(404)
            return

        # Get mime type
        mime_type, _ = mimetypes.guess_type(filepath)
        if mime_type is None:
            mime_type = 'text/plain'

        self.send_response(200)
        self.send_header('Content-type', mime_type)
        self.end_headers()

        with open(filepath, 'rb') as f:
            self.wfile.write(f.read())

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def get_session_token(self):
        cookie = self.headers.get('Cookie')
        print(f"Received Cookie header: {cookie}")
        if cookie:
            for item in cookie.split(';'):
                item = item.strip()
                if item.startswith('session_token='):
                    token = item.split('=')[1]
                    print(f"Found session token: {token[:10]}...")
                    return token
        print("No session token found in cookies")
        return None

    def set_session_cookie(self, token):
        # Set cookie that works with the BASE_PATH
        expires = datetime.now() + timedelta(days=7)
        expires_str = expires.strftime('%a, %d %b %Y %H:%M:%S GMT')
        # Use root path and SameSite=Lax for better compatibility
        cookie = f'session_token={token}; Path=/; SameSite=Lax; Expires={expires_str}'
        self.send_header('Set-Cookie', cookie)
        print(
            f"Setting cookie: session_token={token[:10]}... Path=/ Expires={expires_str[:20]}")

    def clear_session_cookie(self):
        self.send_header(
            'Set-Cookie', f'session_token=; Path=/; SameSite=Lax; Max-Age=0')

    def check_session(self):
        token = self.get_session_token()
        print(f"Checking session, token: {token[:10] if token else 'None'}...")
        user = get_user_from_session(token)

        if user:
            print(f"Session valid for user: {user['username']}")
            self.send_json({
                'authenticated': True,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'dark_mode': user.get('dark_mode', False),
                    'notifications_enabled': user.get('notifications_enabled', True)
                }
            })
        else:
            print("No valid session found")
            self.send_json({'authenticated': False})

    def handle_signup(self, data):
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')

        # Validate
        if not username or not email or not password:
            self.send_json(
                {'success': False, 'message': 'All fields required'}, 400)
            return

        is_valid, msg = validate_password(password)
        if not is_valid:
            self.send_json({'success': False, 'message': msg}, 400)
            return

        users = load_json('users.json')

        # Check if exists
        for user in users:
            if user['username'] == username:
                self.send_json(
                    {'success': False, 'message': 'Username already exists'}, 400)
                return
            if user['email'] == email:
                self.send_json(
                    {'success': False, 'message': 'Email already registered'}, 400)
                return

        # Create user
        new_user = {
            'id': len(users) + 1,
            'username': username,
            'email': email,
            'password': hash_password(password),
            'created_at': datetime.now().isoformat(),
            'preferred_job_titles': '',
            'preferred_locations': '',
            'preferred_job_types': '',
            'dark_mode': False,
            'notifications_enabled': True
        }

        users.append(new_user)
        save_json('users.json', users)

        # Create session
        token = generate_session_token()
        sessions = load_json('sessions.json')
        sessions[token] = new_user['id']
        save_json('sessions.json', sessions)

        self.send_response(200)
        self.set_session_cookie(token)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(
            {'success': True, 'message': 'Account created'}).encode())

    def handle_login(self, data):
        username = data.get('username', '').strip()
        password = data.get('password', '')

        print(f"Login attempt for username: {username}")

        users = load_json('users.json')
        print(f"Loaded {len(users)} users from users.json")

        for user in users:
            print(f"Checking user: {user['username']}")
            if user['username'] == username:
                print(f"Found username match, checking password...")
                password_hash = hash_password(password)
                print(f"Password hash: {password_hash[:20]}...")
                print(f"Stored hash: {user['password'][:20]}...")

                if user['password'] == password_hash:
                    # Create session
                    token = generate_session_token()
                    sessions = load_json('sessions.json')
                    sessions[token] = user['id']
                    save_json('sessions.json', sessions)

                    print(
                        f"Login successful for {username}, token: {token[:10]}...")
                    print(f"Session saved, total sessions: {len(sessions)}")

                    self.send_response(200)
                    self.set_session_cookie(token)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(
                        {'success': True, 'message': 'Login successful'}).encode())
                    return
                else:
                    print(f"Password mismatch!")

        print(
            f"Login failed for {username} - user not found or password incorrect")
        self.send_json(
            {'success': False, 'message': 'Invalid credentials'}, 401)

    def handle_logout(self):
        token = self.get_session_token()
        if token:
            sessions = load_json('sessions.json')
            if token in sessions:
                del sessions[token]
                save_json('sessions.json', sessions)

        self.send_response(200)
        self.clear_session_cookie()
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'success': True}).encode())

    def handle_forgot_password(self, data):
        email = data.get('email', '').strip()
        users = load_json('users.json')

        user_found = False
        for user in users:
            if user['email'] == email:
                user_found = True
                break

        if not user_found:
            self.send_json(
                {'success': False, 'message': 'Email not found'}, 404)
            return

        code = generate_reset_code()
        reset_codes = load_json('reset_codes.json')
        reset_codes[email] = {
            'code': code,
            'expires': (datetime.now() + timedelta(minutes=15)).isoformat()
        }
        save_json('reset_codes.json', reset_codes)

        print(f"Reset code for {email}: {code}")

        self.send_json(
            {'success': True, 'message': 'Reset code sent', 'dev_code': code})

    def handle_reset_password(self, data):
        email = data.get('email', '')
        code = data.get('code', '')
        new_password = data.get('new_password', '')

        is_valid, msg = validate_password(new_password)
        if not is_valid:
            self.send_json({'success': False, 'message': msg}, 400)
            return

        reset_codes = load_json('reset_codes.json')

        if email not in reset_codes:
            self.send_json({'success': False, 'message': 'Invalid code'}, 400)
            return

        reset_data = reset_codes[email]
        if reset_data['code'] != code:
            self.send_json({'success': False, 'message': 'Invalid code'}, 400)
            return

        if datetime.now() > datetime.fromisoformat(reset_data['expires']):
            del reset_codes[email]
            save_json('reset_codes.json', reset_codes)
            self.send_json({'success': False, 'message': 'Code expired'}, 400)
            return

        users = load_json('users.json')
        for user in users:
            if user['email'] == email:
                user['password'] = hash_password(new_password)
                break

        save_json('users.json', users)
        del reset_codes[email]
        save_json('reset_codes.json', reset_codes)

        self.send_json(
            {'success': True, 'message': 'Password reset successful'})

    def handle_search(self, data):
        token = self.get_session_token()
        user = get_user_from_session(token)

        if not user:
            self.send_json(
                {'success': False, 'message': 'Not authenticated'}, 401)
            return

        query = data.get('query', '')
        location = data.get('location', '')
        source = data.get('source', 'all')

        jobs = []

        if source in ['all', 'arbeitnow']:
            jobs.extend(fetch_arbeitnow_jobs(query, location))

        if source in ['all', 'jsearch']:
            counter = load_json('api_counter.json')
            if counter['count'] < 200:
                jobs.extend(fetch_jsearch_jobs(query, location))

        self.send_json({
            'success': True,
            'jobs': jobs,
            'total_results': len(jobs)
        })

    def handle_profile_update(self, data):
        token = self.get_session_token()
        user = get_user_from_session(token)

        if not user:
            self.send_json(
                {'success': False, 'message': 'Not authenticated'}, 401)
            return

        users = load_json('users.json')

        for u in users:
            if u['id'] == user['id']:
                if 'username' in data:
                    u['username'] = data['username']
                if 'email' in data:
                    u['email'] = data['email']
                if 'password' in data and data['password']:
                    is_valid, msg = validate_password(data['password'])
                    if not is_valid:
                        self.send_json({'success': False, 'message': msg}, 400)
                        return
                    u['password'] = hash_password(data['password'])
                if 'preferred_job_titles' in data:
                    u['preferred_job_titles'] = ','.join(
                        data['preferred_job_titles'])
                if 'preferred_locations' in data:
                    u['preferred_locations'] = ','.join(
                        data['preferred_locations'])
                if 'preferred_job_types' in data:
                    u['preferred_job_types'] = ','.join(
                        data['preferred_job_types'])
                break

        save_json('users.json', users)
        self.send_json({'success': True, 'message': 'Profile updated'})

    def handle_settings_update(self, data):
        token = self.get_session_token()
        user = get_user_from_session(token)

        if not user:
            self.send_json(
                {'success': False, 'message': 'Not authenticated'}, 401)
            return

        users = load_json('users.json')

        for u in users:
            if u['id'] == user['id']:
                if 'dark_mode' in data:
                    u['dark_mode'] = data['dark_mode']
                if 'notifications_enabled' in data:
                    u['notifications_enabled'] = data['notifications_enabled']
                break

        save_json('users.json', users)
        self.send_json({'success': True, 'message': 'Settings updated'})

    def handle_recommended_jobs(self):
        token = self.get_session_token()
        user = get_user_from_session(token)

        if not user:
            self.send_json(
                {'success': False, 'message': 'Not authenticated'}, 401)
            return

        titles = [t.strip() for t in user.get(
            'preferred_job_titles', '').split(',') if t.strip()]
        locations = [l.strip() for l in user.get(
            'preferred_locations', '').split(',') if l.strip()]

        if not titles:
            self.send_json({'success': True, 'jobs': [],
                           'message': 'Set preferences first'})
            return

        all_jobs = []
        for title in titles[:2]:
            for location in (locations[:1] if locations else ['']):
                jobs = fetch_arbeitnow_jobs(title, location)
                all_jobs.extend(jobs)

        # Remove duplicates
        seen = set()
        unique_jobs = []
        for job in all_jobs:
            key = (job['title'], job['company'])
            if key not in seen:
                seen.add(key)
                unique_jobs.append(job)

        self.send_json({'success': True, 'jobs': unique_jobs[:10]})

    def get_stats(self):
        counter = load_json('api_counter.json')
        self.send_json({
            'used': counter['count'],
            'remaining': 200 - counter['count'],
            'total': 200
        })

    def log_message(self, format, *args):
        # Custom logging
        print(f"{self.address_string()} - {format % args}")


def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, JobSphereHandler)
    print(
        f"Job Sphere Server running on http://localhost:{PORT}{BASE_PATH}/")
    print(f"Serving files from: {PUBLIC_DIR}")
    print(f"Data stored in: {DATA_DIR}")
    print("\nPress Ctrl+C to stop the server\n")
    httpd.serve_forever()


if __name__ == '__main__':
    try:
        run_server()
    except KeyboardInterrupt:
        print("\n\nThank you!!!! \nServer stopped.....")
