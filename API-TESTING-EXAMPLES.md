# 🔌 API Testing Examples

Complete examples for testing all API endpoints using cURL.

---

## 🔐 Authentication

### 1. Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@school.com",
    "password": "password"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 2,
      "name": "Admin User",
      "email": "admin@school.com",
      "roles": ["admin"],
      "permissions": [...]
    },
    "token": "1|xxxxxxxxxxxxx"
  }
}
```

### 2. Get Current User
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Logout
```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Change Password
```bash
curl -X POST http://localhost:8000/api/v1/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "password",
    "new_password": "newpassword123",
    "new_password_confirmation": "newpassword123"
  }'
```

---

## 📅 Academic Years

### 1. Get All Academic Years
```bash
curl -X GET http://localhost:8000/api/v1/academic-years \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Current Academic Year
```bash
curl -X GET http://localhost:8000/api/v1/academic-years/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Create Academic Year
```bash
curl -X POST http://localhost:8000/api/v1/academic-years \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2025-2026",
    "start_date": "2025-04-01",
    "end_date": "2026-03-31",
    "is_current": true,
    "description": "Academic Year 2025-2026"
  }'
```

### 4. Set as Current
```bash
curl -X POST http://localhost:8000/api/v1/academic-years/1/set-current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 👨‍🎓 Students

### 1. Get All Students
```bash
curl -X GET "http://localhost:8000/api/v1/students?per_page=20&page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Students with Filters
```bash
curl -X GET "http://localhost:8000/api/v1/students?class_id=1&section_id=1&status=active&search=john" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Student Statistics
```bash
curl -X GET http://localhost:8000/api/v1/students/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Get Single Student
```bash
curl -X GET http://localhost:8000/api/v1/students/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Create Student
```bash
curl -X POST http://localhost:8000/api/v1/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "academic_year_id": 1,
    "class_id": 1,
    "section_id": 1,
    "admission_number": "STU2025001",
    "admission_date": "2025-01-15",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "2010-05-15",
    "gender": "male",
    "blood_group": "O+",
    "email": "john.doe@example.com",
    "phone": "1234567890",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "postal_code": "10001",
    "status": "active"
  }'
```

### 6. Update Student
```bash
curl -X PUT http://localhost:8000/api/v1/students/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "status": "active"
  }'
```

### 7. Delete Student
```bash
curl -X DELETE http://localhost:8000/api/v1/students/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 👨‍🏫 Teachers

### 1. Get All Teachers
```bash
curl -X GET http://localhost:8000/api/v1/teachers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Teacher Statistics
```bash
curl -X GET http://localhost:8000/api/v1/teachers/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Create Teacher
```bash
curl -X POST http://localhost:8000/api/v1/teachers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "TCH2025001",
    "first_name": "Jane",
    "last_name": "Smith",
    "date_of_birth": "1985-03-20",
    "gender": "female",
    "email": "jane.smith@school.com",
    "phone": "1234567890",
    "qualification": "M.Ed",
    "department": "Mathematics",
    "designation": "Senior Teacher",
    "joining_date": "2020-06-01",
    "employment_type": "permanent",
    "salary": 50000,
    "status": "active"
  }'
```

---

## 📚 Classes, Sections & Subjects

### 1. Get All Classes
```bash
curl -X GET http://localhost:8000/api/v1/classes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Create Class
```bash
curl -X POST http://localhost:8000/api/v1/classes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Class 10",
    "code": "CLS10",
    "order": 10,
    "description": "Tenth Grade"
  }'
```

### 3. Assign Subjects to Class
```bash
curl -X POST http://localhost:8000/api/v1/classes/1/assign-subjects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjects": [
      {
        "subject_id": 1,
        "is_elective": false,
        "total_marks": 100,
        "passing_marks": 40
      },
      {
        "subject_id": 2,
        "is_elective": true,
        "total_marks": 100,
        "passing_marks": 40
      }
    ]
  }'
```

### 4. Create Section
```bash
curl -X POST http://localhost:8000/api/v1/sections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1,
    "name": "Section A",
    "capacity": 40,
    "current_strength": 0
  }'
```

### 5. Create Subject
```bash
curl -X POST http://localhost:8000/api/v1/subjects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mathematics",
    "code": "MATH101",
    "type": "theory",
    "description": "Advanced Mathematics"
  }'
```

---

## 📊 Attendance

### 1. Mark Attendance (Bulk)
```bash
curl -X POST http://localhost:8000/api/v1/attendance/mark \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1,
    "section_id": 1,
    "date": "2025-10-11",
    "attendance": [
      {
        "student_id": 1,
        "status": "present"
      },
      {
        "student_id": 2,
        "status": "absent"
      },
      {
        "student_id": 3,
        "status": "late"
      }
    ]
  }'
```

### 2. Get Attendance by Date
```bash
curl -X GET "http://localhost:8000/api/v1/attendance/by-date?class_id=1&section_id=1&date=2025-10-11" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Attendance Statistics
```bash
curl -X GET "http://localhost:8000/api/v1/attendance/statistics?student_id=1&start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Exams & Grades

### 1. Create Exam
```bash
curl -X POST http://localhost:8000/api/v1/exams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "academic_year_id": 1,
    "name": "Mid-term Examination",
    "type": "mid-term",
    "start_date": "2025-11-01",
    "end_date": "2025-11-15",
    "description": "Mid-term exams for all classes"
  }'
```

### 2. Create Exam Schedule
```bash
curl -X POST http://localhost:8000/api/v1/exams/1/schedule \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedules": [
      {
        "class_id": 1,
        "section_id": 1,
        "subject_id": 1,
        "exam_date": "2025-11-01",
        "start_time": "09:00:00",
        "end_time": "12:00:00",
        "total_marks": 100,
        "passing_marks": 40,
        "room_number": "101"
      }
    ]
  }'
```

### 3. Enter Grades
```bash
curl -X POST http://localhost:8000/api/v1/grades/enter \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exam_schedule_id": 1,
    "grades": [
      {
        "student_id": 1,
        "marks_obtained": 85
      },
      {
        "student_id": 2,
        "marks_obtained": 92
      }
    ]
  }'
```

### 4. Get Report Card
```bash
curl -X GET "http://localhost:8000/api/v1/grades/report-card/1?exam_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 💰 Fees

### 1. Create Fee Structure
```bash
curl -X POST http://localhost:8000/api/v1/fee-structures \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "academic_year_id": 1,
    "class_id": 1,
    "fee_type": "tuition",
    "amount": 5000,
    "due_date": "2025-11-30",
    "description": "Monthly tuition fee"
  }'
```

### 2. Collect Payment
```bash
curl -X POST http://localhost:8000/api/v1/fee-payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "fee_structure_id": 1,
    "amount": 5000,
    "discount": 0,
    "fine": 0,
    "payment_date": "2025-10-11",
    "payment_method": "cash",
    "remarks": "October fee payment"
  }'
```

### 3. Get Fee Statistics
```bash
curl -X GET "http://localhost:8000/api/v1/fee-payments/statistics?academic_year_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Get Student Fees
```bash
curl -X GET http://localhost:8000/api/v1/fee-payments/student/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 Assignments

### 1. Create Assignment
```bash
curl -X POST http://localhost:8000/api/v1/assignments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class_id": 1,
    "section_id": 1,
    "subject_id": 1,
    "teacher_id": 1,
    "title": "Chapter 1 Exercises",
    "description": "Complete all exercises from Chapter 1",
    "assigned_date": "2025-10-11",
    "due_date": "2025-10-18",
    "total_marks": 20
  }'
```

### 2. Submit Assignment
```bash
curl -X POST http://localhost:8000/api/v1/assignments/1/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "submission_text": "I have completed all exercises.",
    "attachment": "path/to/file.pdf"
  }'
```

### 3. Grade Submission
```bash
curl -X POST http://localhost:8000/api/v1/assignment-submissions/1/grade \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marks_obtained": 18,
    "feedback": "Excellent work! Keep it up."
  }'
```

### 4. Get Assignment Submissions
```bash
curl -X GET http://localhost:8000/api/v1/assignments/1/submissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Get Student Assignments
```bash
curl -X GET http://localhost:8000/api/v1/assignments/student/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📌 Tips

1. **Save the token** from login response and use it in all subsequent requests
2. **Replace YOUR_TOKEN** with the actual token in all examples
3. **Use Postman** or **Insomnia** for easier API testing
4. **Check response status codes**:
   - 200: Success
   - 201: Created
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 500: Server Error

---

**For more information, see QUICK-START-TESTING.md**

