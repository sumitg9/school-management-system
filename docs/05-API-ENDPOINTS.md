# School Management System - API Endpoints

## Overview
This document defines all RESTful API endpoints for the School Management System.

**Base URL:** `http://localhost:8000/api/v1`

**Authentication:** Bearer Token (Laravel Sanctum)

**Response Format:** JSON

---

## 📋 API Conventions

### Request Headers
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

### Standard Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {
    "current_page": 1,
    "total_pages": 10,
    "per_page": 20,
    "total": 200
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "field_name": ["Error description"]
  }
}
```

### HTTP Status Codes
- `200` - OK (Success)
- `201` - Created
- `204` - No Content (Delete success)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity (Validation Error)
- `500` - Internal Server Error

---

## 🔐 AUTHENTICATION

### Register
```
POST /auth/register
```
**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "role": "student"
}
```

### Login
```
POST /auth/login
```
**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {},
    "token": "1|abc123...",
    "roles": ["student"],
    "permissions": []
  }
}
```

### Logout
```
POST /auth/logout
```

### Forgot Password
```
POST /auth/forgot-password
```
**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### Reset Password
```
POST /auth/reset-password
```
**Request Body:**
```json
{
  "email": "john@example.com",
  "token": "reset_token",
  "password": "newpassword123",
  "password_confirmation": "newpassword123"
}
```

### Get Authenticated User
```
GET /auth/user
```

### Update Profile
```
PUT /auth/profile
```

### Change Password
```
POST /auth/change-password
```

---

## 👥 USER MANAGEMENT

### List Users
```
GET /users?page=1&per_page=20&role=student&status=active&search=john
```

### Get User
```
GET /users/{id}
```

### Create User
```
POST /users
```
**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "status": "active",
  "roles": [1, 2]
}
```

### Update User
```
PUT /users/{id}
```

### Delete User
```
DELETE /users/{id}
```

### Assign Roles
```
POST /users/{id}/roles
```
**Request Body:**
```json
{
  "roles": [1, 2, 3]
}
```

### Get User Roles
```
GET /users/{id}/roles
```

### Get User Permissions
```
GET /users/{id}/permissions
```

---

## 🎓 STUDENT MANAGEMENT

### List Students
```
GET /students?page=1&per_page=20&class_id=1&section_id=1&status=active&search=john
```

### Get Student
```
GET /students/{id}
```

### Create Student
```
POST /students
```
**Request Body:**
```json
{
  "admission_number": "STU2024001",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "2010-05-15",
  "gender": "male",
  "class_id": 1,
  "section_id": 1,
  "academic_year_id": 1,
  "email": "john@example.com",
  "phone": "1234567890",
  "blood_group": "O+",
  "religion": "Christianity",
  "nationality": "Indian",
  "admission_date": "2024-04-01",
  "photo": "base64_encoded_image",
  "address": {
    "current": {
      "address_line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "postal_code": "10001"
    }
  },
  "parents": [
    {
      "first_name": "Robert",
      "last_name": "Doe",
      "relation": "father",
      "phone": "9876543210",
      "email": "robert@example.com"
    }
  ]
}
```

### Update Student
```
PUT /students/{id}
```

### Delete Student
```
DELETE /students/{id}
```

### Promote Student
```
POST /students/{id}/promote
```
**Request Body:**
```json
{
  "to_class_id": 2,
  "to_section_id": 1,
  "to_academic_year_id": 2,
  "remarks": "Promoted based on performance"
}
```

### Generate Student ID Card
```
GET /students/{id}/id-card
```

### Upload Student Document
```
POST /students/{id}/documents
```

### Get Student Documents
```
GET /students/{id}/documents
```

### Bulk Import Students
```
POST /students/import
```
**Request Body:** (multipart/form-data)
```
file: students.xlsx
```

### Export Students
```
GET /students/export?format=excel&class_id=1
```

### Get Student Attendance
```
GET /students/{id}/attendance?from_date=2024-01-01&to_date=2024-12-31
```

### Get Student Exams
```
GET /students/{id}/exams?academic_year_id=1
```

### Get Student Fees
```
GET /students/{id}/fees?academic_year_id=1
```

---

## 👨‍🏫 TEACHER MANAGEMENT

### List Teachers
```
GET /teachers?page=1&per_page=20&department_id=1&status=active&search=jane
```

### Get Teacher
```
GET /teachers/{id}
```

### Create Teacher
```
POST /teachers
```
**Request Body:**
```json
{
  "employee_id": "EMP2024001",
  "first_name": "Jane",
  "last_name": "Smith",
  "date_of_birth": "1985-03-20",
  "gender": "female",
  "department_id": 1,
  "email": "jane@example.com",
  "phone": "1234567890",
  "joining_date": "2024-01-01",
  "qualification": "M.Ed",
  "designation": "Senior Teacher",
  "employment_type": "permanent",
  "photo": "base64_encoded_image"
}
```

### Update Teacher
```
PUT /teachers/{id}
```

### Delete Teacher
```
DELETE /teachers/{id}
```

### Assign Subjects
```
POST /teachers/{id}/subjects
```
**Request Body:**
```json
{
  "assignments": [
    {
      "subject_id": 1,
      "class_id": 1,
      "section_id": 1,
      "academic_year_id": 1
    }
  ]
}
```

### Get Teacher Subjects
```
GET /teachers/{id}/subjects?academic_year_id=1
```

### Get Teacher Timetable
```
GET /teachers/{id}/timetable?academic_year_id=1
```

### Get Teacher Attendance
```
GET /teachers/{id}/attendance?from_date=2024-01-01&to_date=2024-12-31
```

---

## 📚 ACADEMIC MANAGEMENT

### Academic Years

#### List Academic Years
```
GET /academic-years
```

#### Create Academic Year
```
POST /academic-years
```
**Request Body:**
```json
{
  "name": "2024-2025",
  "start_date": "2024-04-01",
  "end_date": "2025-03-31",
  "is_current": true
}
```

#### Update Academic Year
```
PUT /academic-years/{id}
```

#### Delete Academic Year
```
DELETE /academic-years/{id}
```

### Classes

#### List Classes
```
GET /classes
```

#### Create Class
```
POST /classes
```
**Request Body:**
```json
{
  "name": "Class 10",
  "numeric_value": 10,
  "capacity": 50,
  "description": "Secondary level"
}
```

#### Update Class
```
PUT /classes/{id}
```

#### Delete Class
```
DELETE /classes/{id}
```

### Sections

#### List Sections
```
GET /sections?class_id=1
```

#### Create Section
```
POST /sections
```

#### Update Section
```
PUT /sections/{id}
```

#### Delete Section
```
DELETE /sections/{id}
```

### Subjects

#### List Subjects
```
GET /subjects
```

#### Create Subject
```
POST /subjects
```

#### Update Subject
```
PUT /subjects/{id}
```

#### Delete Subject
```
DELETE /subjects/{id}
```

#### Assign Subject to Class
```
POST /class-subjects
```
**Request Body:**
```json
{
  "class_id": 1,
  "subject_id": 1,
  "is_mandatory": true,
  "theory_marks": 80,
  "practical_marks": 20,
  "pass_marks": 40
}
```

## 📊 ATTENDANCE MANAGEMENT

### Student Attendance

#### Mark Attendance
```
POST /attendance/students
```
**Request Body:**
```json
{
  "class_id": 1,
  "section_id": 1,
  "date": "2024-10-11",
  "attendance": [
    {
      "student_id": 1,
      "status": "present"
    },
    {
      "student_id": 2,
      "status": "absent",
      "remarks": "Sick"
    }
  ]
}
```

#### Get Attendance
```
GET /attendance/students?class_id=1&section_id=1&date=2024-10-11
```

#### Update Attendance
```
PUT /attendance/students/{id}
```

#### Get Attendance Report
```
GET /attendance/students/report?class_id=1&from_date=2024-01-01&to_date=2024-12-31
```

### Teacher Attendance

#### Mark Teacher Attendance
```
POST /attendance/teachers
```

#### Get Teacher Attendance
```
GET /attendance/teachers?date=2024-10-11
```

### Leave Applications

#### List Leave Applications
```
GET /leave-applications?user_type=student&status=pending
```

#### Create Leave Application
```
POST /leave-applications
```
**Request Body:**
```json
{
  "leave_type": "sick",
  "from_date": "2024-10-15",
  "to_date": "2024-10-17",
  "reason": "Medical emergency"
}
```

#### Approve/Reject Leave
```
POST /leave-applications/{id}/approve
```
**Request Body:**
```json
{
  "status": "approved",
  "remarks": "Approved"
}
```

---

## 📅 TIMETABLE MANAGEMENT

### List Timetables
```
GET /timetables?class_id=1&section_id=1&academic_year_id=1
```

### Get Timetable
```
GET /timetables/{id}
```

### Create Timetable
```
POST /timetables
```
**Request Body:**
```json
{
  "class_id": 1,
  "section_id": 1,
  "academic_year_id": 1,
  "name": "Regular Timetable",
  "effective_from": "2024-04-01",
  "periods": [
    {
      "day_of_week": "monday",
      "period_number": 1,
      "subject_id": 1,
      "teacher_id": 1,
      "start_time": "09:00",
      "end_time": "09:45",
      "room_number": "101"
    }
  ]
}
```

### Update Timetable
```
PUT /timetables/{id}
```

### Delete Timetable
```
DELETE /timetables/{id}
```

### Create Period Substitution
```
POST /period-substitutions
```
**Request Body:**
```json
{
  "timetable_period_id": 1,
  "original_teacher_id": 1,
  "substitute_teacher_id": 2,
  "date": "2024-10-15",
  "reason": "Teacher on leave"
}
```

### Get Teacher Timetable
```
GET /timetables/teacher/{teacher_id}?academic_year_id=1
```

---

## 📝 EXAMINATION MANAGEMENT

### Exam Types

#### List Exam Types
```
GET /exam-types
```

#### Create Exam Type
```
POST /exam-types
```

### Exams

#### List Exams
```
GET /exams?academic_year_id=1
```

#### Create Exam
```
POST /exams
```
**Request Body:**
```json
{
  "exam_type_id": 1,
  "academic_year_id": 1,
  "name": "Mid-Term Exam 2024",
  "start_date": "2024-09-01",
  "end_date": "2024-09-15",
  "result_publish_date": "2024-09-30"
}
```

#### Update Exam
```
PUT /exams/{id}
```

#### Delete Exam
```
DELETE /exams/{id}
```

### Exam Schedules

#### Create Exam Schedule
```
POST /exam-schedules
```
**Request Body:**
```json
{
  "exam_id": 1,
  "class_id": 1,
  "subject_id": 1,
  "exam_date": "2024-09-05",
  "start_time": "10:00",
  "end_time": "12:00",
  "room_number": "Hall A",
  "total_marks": 100,
  "pass_marks": 40
}
```

#### Get Exam Schedule
```
GET /exam-schedules?exam_id=1&class_id=1
```

### Marks Entry

#### Enter Marks
```
POST /exam-marks
```
**Request Body:**
```json
{
  "exam_schedule_id": 1,
  "marks": [
    {
      "student_id": 1,
      "theory_marks": 75,
      "practical_marks": 18,
      "total_marks": 93,
      "grade": "A+"
    }
  ]
}
```

#### Update Marks
```
PUT /exam-marks/{id}
```

#### Get Student Marks
```
GET /students/{id}/marks?exam_id=1
```

### Results

#### Publish Results
```
POST /exams/{id}/publish-results
```

#### Get Result
```
GET /students/{id}/results?exam_id=1
```

#### Generate Report Card
```
GET /students/{id}/report-card?exam_id=1&format=pdf
```

#### Generate Bulk Report Cards
```
POST /exams/{id}/report-cards/bulk
```
**Request Body:**
```json
{
  "class_id": 1,
  "section_id": 1
}
```

---

## 📖 ASSIGNMENT & HOMEWORK

### List Assignments
```
GET /assignments?class_id=1&section_id=1&subject_id=1&status=active
```

### Get Assignment
```
GET /assignments/{id}
```

### Create Assignment
```
POST /assignments
```
**Request Body:**
```json
{
  "class_id": 1,
  "section_id": 1,
  "subject_id": 1,
  "title": "Chapter 5 Exercises",
  "description": "Complete all exercises from chapter 5",
  "assignment_date": "2024-10-11",
  "due_date": "2024-10-18",
  "total_marks": 20,
  "attachment": "base64_encoded_file"
}
```

### Update Assignment
```
PUT /assignments/{id}
```

### Delete Assignment
```
DELETE /assignments/{id}
```

### Submit Assignment
```
POST /assignments/{id}/submit
```
**Request Body:**
```json
{
  "submission_text": "My submission content",
  "attachment": "base64_encoded_file"
}
```

### Grade Assignment
```
POST /assignment-submissions/{id}/grade
```
**Request Body:**
```json
{
  "marks_obtained": 18,
  "feedback": "Good work! Minor improvements needed."
}
```

### Get Assignment Submissions
```
GET /assignments/{id}/submissions
```

### Get Student Submissions
```
GET /students/{id}/submissions?subject_id=1
```

---

## 💰 FEE MANAGEMENT

### Fee Types

#### List Fee Types
```
GET /fee-types
```

#### Create Fee Type
```
POST /fee-types
```

### Fee Structures

#### List Fee Structures
```
GET /fee-structures?class_id=1&academic_year_id=1
```

#### Create Fee Structure
```
POST /fee-structures
```
**Request Body:**
```json
{
  "class_id": 1,
  "academic_year_id": 1,
  "fee_type_id": 1,
  "amount": 5000,
  "due_date": "2024-04-30",
  "is_mandatory": true
}
```

### Student Fees

#### Get Student Fees
```
GET /students/{id}/fees?academic_year_id=1
```

#### Assign Fees to Student
```
POST /student-fees
```

#### Get Fee Details
```
GET /student-fees/{id}
```

### Fee Payments

#### Collect Fee Payment
```
POST /fee-payments
```
**Request Body:**
```json
{
  "student_fee_id": 1,
  "student_id": 1,
  "amount": 5000,
  "payment_date": "2024-10-11",
  "payment_method": "cash",
  "transaction_id": "TXN123456",
  "remarks": "Full payment"
}
```

#### Get Payment Receipt
```
GET /fee-payments/{id}/receipt?format=pdf
```

#### Get Payment History
```
GET /students/{id}/payment-history
```

### Fee Discounts

#### Apply Discount
```
POST /student-fee-discounts
```
**Request Body:**
```json
{
  "student_fee_id": 1,
  "fee_discount_id": 1,
  "discount_amount": 500,
  "reason": "Merit scholarship"
}
```

### Fee Reports

#### Fee Collection Report
```
GET /reports/fee-collection?from_date=2024-01-01&to_date=2024-12-31&class_id=1
```

#### Fee Defaulters Report
```
GET /reports/fee-defaulters?academic_year_id=1
```

#### Send Fee Reminders
```
POST /fee-reminders/send
```
**Request Body:**
```json
{
  "student_ids": [1, 2, 3],
  "message": "Your fee payment is overdue"
}
```

---

## 📚 LIBRARY MANAGEMENT

### Books

#### List Books
```
GET /books?search=physics&category=science&status=active
```

#### Get Book
```
GET /books/{id}
```

#### Create Book
```
POST /books
```
**Request Body:**
```json
{
  "isbn": "978-3-16-148410-0",
  "title": "Physics Fundamentals",
  "author": "John Smith",
  "publisher": "ABC Publishers",
  "publication_year": 2023,
  "category": "Science",
  "total_copies": 10,
  "price": 500,
  "location": "Shelf A-12"
}
```

#### Update Book
```
PUT /books/{id}
```

#### Delete Book
```
DELETE /books/{id}
```

### Book Issues

#### Issue Book
```
POST /book-issues
```
**Request Body:**
```json
{
  "book_id": 1,
  "user_id": 1,
  "user_type": "student",
  "issue_date": "2024-10-11",
  "due_date": "2024-10-25"
}
```

#### Return Book
```
POST /book-issues/{id}/return
```
**Request Body:**
```json
{
  "return_date": "2024-10-24",
  "fine_amount": 0
}
```

#### Get Issued Books
```
GET /book-issues?user_id=1&user_type=student&status=issued
```

#### Get Overdue Books
```
GET /book-issues/overdue
```

### Book Reservations

#### Reserve Book
```
POST /book-reservations
```

#### Get Reservations
```
GET /book-reservations?user_id=1
```

### Library Reports

#### Book Inventory Report
```
GET /reports/library/inventory
```

#### Issue/Return Report
```
GET /reports/library/issues?from_date=2024-01-01&to_date=2024-12-31
```

## 🚌 TRANSPORT MANAGEMENT

### Buses

#### List Buses
```
GET /buses
```

#### Create Bus
```
POST /buses
```
**Request Body:**
```json
{
  "bus_number": "BUS-001",
  "registration_number": "DL-01-AB-1234",
  "model": "Tata LP 410",
  "capacity": 40,
  "driver_name": "John Driver",
  "driver_phone": "9876543210",
  "driver_license": "DL123456"
}
```

### Bus Routes

#### List Routes
```
GET /bus-routes
```

#### Create Route
```
POST /bus-routes
```
**Request Body:**
```json
{
  "bus_id": 1,
  "route_name": "North Route",
  "route_number": "R-001",
  "start_location": "School",
  "end_location": "North Area",
  "monthly_fee": 1000,
  "stops": [
    {
      "stop_name": "Main Square",
      "stop_order": 1,
      "pickup_time": "07:00",
      "drop_time": "15:30"
    }
  ]
}
```

### Student Transport

#### Assign Student to Route
```
POST /student-transport
```

#### Get Student Transport
```
GET /students/{id}/transport
```

---

## 💬 COMMUNICATION

### Messages

#### List Messages
```
GET /messages?type=inbox&is_read=false
```

#### Get Message
```
GET /messages/{id}
```

#### Send Message
```
POST /messages
```
**Request Body:**
```json
{
  "recipient_ids": [1, 2, 3],
  "subject": "Important Notice",
  "message": "Message content here",
  "attachment": "base64_encoded_file"
}
```

#### Mark as Read
```
POST /messages/{id}/read
```

#### Delete Message
```
DELETE /messages/{id}
```

### Announcements

#### List Announcements
```
GET /announcements?target_audience=students&status=published
```

#### Create Announcement
```
POST /announcements
```
**Request Body:**
```json
{
  "title": "School Holiday Notice",
  "content": "School will remain closed on...",
  "target_audience": "all",
  "priority": "high",
  "publish_date": "2024-10-11",
  "expiry_date": "2024-10-15"
}
```

#### Publish Announcement
```
POST /announcements/{id}/publish
```

### Notifications

#### List Notifications
```
GET /notifications?is_read=false
```

#### Mark Notification as Read
```
POST /notifications/{id}/read
```

#### Mark All as Read
```
POST /notifications/read-all
```

---

## 📅 EVENT MANAGEMENT

### List Events
```
GET /events?from_date=2024-01-01&to_date=2024-12-31&status=scheduled
```

### Get Event
```
GET /events/{id}
```

### Create Event
```
POST /events
```
**Request Body:**
```json
{
  "title": "Annual Sports Day",
  "description": "Annual sports competition",
  "event_type": "sports",
  "start_date": "2024-12-15",
  "end_date": "2024-12-15",
  "start_time": "09:00",
  "end_time": "17:00",
  "location": "School Ground",
  "max_participants": 500,
  "registration_required": true,
  "registration_deadline": "2024-12-10"
}
```

### Update Event
```
PUT /events/{id}
```

### Delete Event
```
DELETE /events/{id}
```

### Register for Event
```
POST /events/{id}/register
```

### Get Event Participants
```
GET /events/{id}/participants
```

---

## 📜 CERTIFICATE MANAGEMENT

### Certificate Templates

#### List Templates
```
GET /certificate-templates
```

#### Create Template
```
POST /certificate-templates
```

### Certificates

#### Generate Certificate
```
POST /certificates
```
**Request Body:**
```json
{
  "certificate_template_id": 1,
  "student_id": 1,
  "certificate_number": "CERT2024001",
  "issue_date": "2024-10-11",
  "certificate_data": {
    "student_name": "John Doe",
    "class": "10th",
    "year": "2024"
  }
}
```

#### Get Certificate
```
GET /certificates/{id}?format=pdf
```

#### Verify Certificate
```
GET /certificates/verify/{verification_code}
```

#### Bulk Generate Certificates
```
POST /certificates/bulk
```

---

## 📁 DOCUMENT MANAGEMENT

### List Documents
```
GET /documents?category=academic&access_level=public
```

### Upload Document
```
POST /documents
```
**Request Body:** (multipart/form-data)
```
title: Document Title
description: Document description
category: academic
file: document.pdf
access_level: private
```

### Download Document
```
GET /documents/{id}/download
```

### Delete Document
```
DELETE /documents/{id}
```

### Share Document
```
POST /documents/{id}/share
```
**Request Body:**
```json
{
  "user_ids": [1, 2, 3],
  "permission_type": "view"
}
```

---

## 📊 REPORTS & ANALYTICS

### Dashboard Statistics
```
GET /dashboard/stats
```
**Response:**
```json
{
  "total_students": 500,
  "total_teachers": 50,
  "total_classes": 12,
  "attendance_today": {
    "present": 450,
    "absent": 50
  },
  "fee_collection_today": 50000,
  "pending_fees": 100000
}
```

### Student Performance Report
```
GET /reports/student-performance?student_id=1&academic_year_id=1
```

### Attendance Report
```
GET /reports/attendance?class_id=1&from_date=2024-01-01&to_date=2024-12-31&format=pdf
```

### Fee Collection Report
```
GET /reports/fee-collection?from_date=2024-01-01&to_date=2024-12-31&format=excel
```

### Class-wise Analytics
```
GET /reports/class-analytics?class_id=1&academic_year_id=1
```

### Teacher Performance Report
```
GET /reports/teacher-performance?teacher_id=1&academic_year_id=1
```

### Custom Report
```
POST /reports/custom
```
**Request Body:**
```json
{
  "report_type": "student_list",
  "filters": {
    "class_id": 1,
    "section_id": 1,
    "status": "active"
  },
  "columns": ["name", "roll_number", "email", "phone"],
  "format": "excel"
}
```

---

## ⚙️ SETTINGS

### School Settings

#### Get School Settings
```
GET /settings/school
```

#### Update School Settings
```
PUT /settings/school
```

### System Settings

#### Get System Settings
```
GET /settings/system
```

#### Update System Setting
```
PUT /settings/system/{key}
```

### Roles & Permissions

#### List Roles
```
GET /roles
```

#### Create Role
```
POST /roles
```

#### Update Role
```
PUT /roles/{id}
```

#### List Permissions
```
GET /permissions
```

#### Assign Permissions to Role
```
POST /roles/{id}/permissions
```

---

## 📤 BULK OPERATIONS

### Bulk Student Promotion
```
POST /bulk/student-promotion
```
**Request Body:**
```json
{
  "from_class_id": 9,
  "from_section_id": 1,
  "to_class_id": 10,
  "to_section_id": 1,
  "academic_year_id": 2,
  "student_ids": [1, 2, 3, 4, 5]
}
```

### Bulk Fee Assignment
```
POST /bulk/fee-assignment
```

### Bulk SMS Send
```
POST /bulk/sms
```
**Request Body:**
```json
{
  "recipient_type": "students",
  "class_id": 1,
  "message": "Important notice..."
}
```

### Bulk Email Send
```
POST /bulk/email
```

---

## 🔍 SEARCH

### Global Search
```
GET /search?q=john&type=all
```
**Response:**
```json
{
  "students": [],
  "teachers": [],
  "parents": [],
  "books": []
}
```

### Advanced Search
```
POST /search/advanced
```
**Request Body:**
```json
{
  "entity": "students",
  "filters": {
    "class_id": 1,
    "gender": "male",
    "age_min": 15,
    "age_max": 17
  }
}
```

---

## 📋 PAGINATION & FILTERING

### Query Parameters

All list endpoints support the following query parameters:

- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20, max: 100)
- `sort_by` - Column to sort by
- `sort_order` - Sort order (asc/desc)
- `search` - Global search term
- `filters` - JSON encoded filters

**Example:**
```
GET /students?page=2&per_page=50&sort_by=name&sort_order=asc&search=john&filters={"class_id":1}
```

---

## 🔒 RATE LIMITING

API requests are rate-limited to prevent abuse:

- **Authenticated users:** 60 requests per minute
- **Unauthenticated users:** 10 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1634567890
```

---

## 📝 WEBHOOKS (Future Enhancement)

Webhook endpoints for external integrations:

```
POST /webhooks/payment-success
POST /webhooks/sms-delivery
POST /webhooks/email-delivery
```

---

*Last Updated: 2025-10-11*
*Total Endpoints: 150+*

