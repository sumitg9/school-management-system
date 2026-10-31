# 🚀 Quick Start Testing Guide

This guide will help you quickly test the School Management System that has been implemented.

---

## ✅ Prerequisites

Make sure you have:
- ✅ PHP 8.1+ installed
- ✅ Composer installed
- ✅ Node.js 18+ installed
- ✅ MySQL 8.0+ installed and running
- ✅ Git installed

---

## 📦 Step 1: Database Setup

### Create Database
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE school_management;

# Exit MySQL
exit;
```

### Configure Environment
```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env file and update database credentials:
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=school_management
DB_USERNAME=root
DB_PASSWORD=your_password
```

---

## 🔧 Step 2: Backend Setup

```bash
cd backend

# Install dependencies (if not already done)
composer install

# Generate application key (if not already done)
php artisan key:generate

# Run migrations
php artisan migrate

# Run seeders
php artisan db:seed

# Start Laravel server
php artisan serve
```

**Expected Output:**
```
✅ Server running at: http://localhost:8000
```

---

## 🎨 Step 3: Frontend Setup

Open a **new terminal** window:

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

# Start development server
npm run dev
```

**Expected Output:**
```
✅ Local: http://localhost:5173
```

---

## 🧪 Step 4: Test the Application

### Test 1: Login Page
1. Open browser and go to: **http://localhost:5173/login**
2. You should see a beautiful login page with gradient background

### Test 2: Quick Login (Recommended)
Click one of the "Quick Login" buttons:
- **Admin** - Full access
- **Teacher** - Teacher access
- **Student** - Student access
- **Parent** - Parent access

### Test 3: Manual Login
Use any of these credentials:

**Super Admin:**
```
Email: superadmin@school.com
Password: password
```

**Admin:**
```
Email: admin@school.com
Password: password
```

**Teacher:**
```
Email: teacher@school.com
Password: password
```

**Student:**
```
Email: student@school.com
Password: password
```

**Parent:**
```
Email: parent@school.com
Password: password
```

**Accountant:**
```
Email: accountant@school.com
Password: password
```

### Test 4: Dashboard
After login, you should:
- ✅ Be redirected to the dashboard
- ✅ See your name in the top-right corner
- ✅ See your role displayed
- ✅ See stats cards
- ✅ See sidebar navigation

### Test 5: Logout
- Click on your profile in the top-right corner
- You should be logged out and redirected to login page

---

## 🔍 Step 5: Test API Endpoints

### Using cURL

**Test Login:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.com",
    "password": "password"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {...},
    "token": "1|xxxxxxxxxxxxx",
    "roles": ["admin"],
    "permissions": [...]
  }
}
```

**Test Get Students (with token):**
```bash
# Replace YOUR_TOKEN with the token from login response
curl -X GET http://localhost:8000/api/v1/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Test Get Current Academic Year:**
```bash
curl -X GET http://localhost:8000/api/v1/academic-years/current \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📊 Step 6: Verify Database

```bash
# Login to MySQL
mysql -u root -p school_management

# Check tables
SHOW TABLES;

# Check users
SELECT id, name, email FROM users;

# Check roles
SELECT * FROM roles;

# Check permissions count
SELECT COUNT(*) FROM permissions;

# Exit
exit;
```

**Expected Results:**
- ✅ 18+ tables created
- ✅ 6 users created
- ✅ 8 roles created
- ✅ 70+ permissions created

---

## 🎯 Step 7: Test All API Endpoints

### Authentication Endpoints
```bash
# Login
POST /api/v1/auth/login

# Logout
POST /api/v1/auth/logout

# Get current user
GET /api/v1/auth/me

# Change password
POST /api/v1/auth/change-password
```

### Academic Year Endpoints
```bash
# Get all academic years
GET /api/v1/academic-years

# Get current academic year
GET /api/v1/academic-years/current

# Create academic year
POST /api/v1/academic-years

# Update academic year
PUT /api/v1/academic-years/{id}

# Delete academic year
DELETE /api/v1/academic-years/{id}
```

### Student Endpoints
```bash
# Get all students
GET /api/v1/students

# Get student statistics
GET /api/v1/students/statistics

# Get single student
GET /api/v1/students/{id}

# Create student
POST /api/v1/students

# Update student
PUT /api/v1/students/{id}

# Delete student
DELETE /api/v1/students/{id}
```

### Teacher Endpoints
```bash
# Get all teachers
GET /api/v1/teachers

# Get teacher statistics
GET /api/v1/teachers/statistics

# Create teacher
POST /api/v1/teachers

# Update teacher
PUT /api/v1/teachers/{id}

# Delete teacher
DELETE /api/v1/teachers/{id}
```

### Attendance Endpoints
```bash
# Mark attendance
POST /api/v1/attendance/mark

# Get attendance by date
GET /api/v1/attendance/by-date

# Get attendance statistics
GET /api/v1/attendance/statistics
```

### Exam & Grade Endpoints
```bash
# Get all exams
GET /api/v1/exams

# Create exam schedule
POST /api/v1/exams/{id}/schedule

# Enter grades
POST /api/v1/grades/enter

# Get report card
GET /api/v1/grades/report-card/{studentId}
```

### Fee Endpoints
```bash
# Get fee structures
GET /api/v1/fee-structures

# Get fee payments
GET /api/v1/fee-payments

# Collect payment
POST /api/v1/fee-payments

# Get fee statistics
GET /api/v1/fee-payments/statistics
```

### Assignment Endpoints
```bash
# Get all assignments
GET /api/v1/assignments

# Create assignment
POST /api/v1/assignments

# Submit assignment
POST /api/v1/assignments/{id}/submit

# Grade submission
POST /api/v1/assignment-submissions/{id}/grade

# Get student assignments
GET /api/v1/assignments/student/{studentId}
```

---

## ✅ Success Checklist

After testing, you should have:

- [x] Backend server running on port 8000
- [x] Frontend server running on port 5173
- [x] Database with 18+ tables
- [x] 6 test users created
- [x] 8 roles and 70+ permissions
- [x] Login working correctly
- [x] Dashboard displaying user info
- [x] Logout working correctly
- [x] API endpoints responding correctly
- [x] Token authentication working

---

## 🐛 Troubleshooting

### Backend Issues

**Issue: Migration errors**
```bash
# Reset database
php artisan migrate:fresh --seed
```

**Issue: Permission errors**
```bash
# Fix storage permissions
chmod -R 775 storage bootstrap/cache
```

**Issue: Port 8000 already in use**
```bash
# Use different port
php artisan serve --port=8001
# Update frontend .env: VITE_API_URL=http://localhost:8001/api/v1
```

### Frontend Issues

**Issue: Port 5173 already in use**
```bash
# Kill process on port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5173 | xargs kill -9
```

**Issue: API connection errors**
```bash
# Check .env file
cat frontend/.env

# Should contain:
VITE_API_URL=http://localhost:8000/api/v1
```

**Issue: CORS errors**
```bash
# Update backend config/cors.php
# Make sure 'allowed_origins' includes 'http://localhost:5173'
```

### Database Issues

**Issue: Connection refused**
```bash
# Check MySQL is running
# Windows:
net start MySQL80

# Linux:
sudo systemctl start mysql

# Mac:
brew services start mysql
```

**Issue: Access denied**
```bash
# Reset MySQL password or update .env with correct credentials
```

---

## 📝 Notes

- All default passwords are `password` (change in production!)
- The application uses Laravel Sanctum for API authentication
- Tokens are stored in localStorage
- Protected routes redirect to login if not authenticated
- API responses follow a standard format: `{ success, message, data }`

---

## 🎉 Next Steps

Once testing is complete, you can:
1. Create more frontend pages (student list, teacher list, etc.)
2. Add more test data using seeders
3. Implement file upload functionality
4. Add charts and analytics
5. Create reports and exports
6. Add real-time notifications

---

**Happy Testing! 🚀**

*For more information, see FINAL-IMPLEMENTATION-SUMMARY.md*

