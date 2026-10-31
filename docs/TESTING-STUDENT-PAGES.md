# 🧪 Testing Student Management Pages - Step by Step Guide

This guide will walk you through testing all the student management features.

---

## 🚀 Prerequisites

Make sure both servers are running:

**Terminal 1 - Backend:**
```bash
cd backend
php artisan serve
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 📝 Test Checklist

### ✅ Step 1: Login
1. Open browser: http://localhost:5173
2. Click "Quick Login as Admin"
3. You should be redirected to the dashboard

**Expected Result:**
- ✅ Dashboard loads with stats cards
- ✅ Sidebar shows navigation menu
- ✅ Your name appears in top-right corner

---

### ✅ Step 2: Navigate to Students
1. Click "Students" in the sidebar (👨‍🎓 icon)
2. You should see the student list page

**Expected Result:**
- ✅ URL changes to `/students`
- ✅ Page title shows "Students"
- ✅ Filter section visible at top
- ✅ Data table visible (may be empty initially)
- ✅ "Add Student" button visible in top-right

---

### ✅ Step 3: Create a Student

1. Click "Add Student" button
2. You should see the student form

**Expected Result:**
- ✅ URL changes to `/students/create`
- ✅ Form has multiple sections
- ✅ Academic Year dropdown is pre-filled with current year
- ✅ All required fields marked with red asterisk (*)

**Fill in the form:**

**Academic Information:**
- Academic Year: (should be pre-selected)
- Class: Select any class (e.g., "Class 10")
- Section: Select any section (e.g., "Section A")
- Admission Number: `STU2025001`
- Admission Date: `2025-01-15`
- Status: Active

**Personal Information:**
- First Name: `John`
- Last Name: `Doe`
- Date of Birth: `2010-05-15`
- Gender: Male
- Blood Group: O+

**Contact Information:**
- Email: `john.doe@example.com`
- Phone: `1234567890`
- Address: `123 Main Street`
- City: `New York`
- State: `NY`
- Country: `USA`
- Postal Code: `10001`

**Parent Information:**
- Father's Name: `Robert Doe`
- Father's Phone: `9876543210`
- Mother's Name: `Jane Doe`
- Mother's Phone: `9876543211`

3. Click "Create Student"

**Expected Result:**
- ✅ Loading state shows "Saving..."
- ✅ Success toast notification appears
- ✅ Redirected to `/students` list page
- ✅ New student appears in the table

---

### ✅ Step 4: View Student List

**Expected Result:**
- ✅ Student table shows the newly created student
- ✅ Student row displays:
  - Admission number
  - Avatar with initials (JD)
  - Full name and email
  - Class and section
  - Phone number
  - Gender
  - Status badge (green for active)
  - Three action buttons (view, edit, delete)

---

### ✅ Step 5: Test Filters

**Test Search:**
1. Type "john" in the search box
2. Press Enter or wait for auto-search

**Expected Result:**
- ✅ Table filters to show only matching students
- ✅ Pagination updates if needed

**Test Class Filter:**
1. Select a class from the "All Classes" dropdown
2. Section dropdown should become enabled
3. Table filters to show only students in that class

**Expected Result:**
- ✅ Section dropdown populates with sections for selected class
- ✅ Table shows filtered results

**Test Clear Filters:**
1. Click "Clear Filters" button

**Expected Result:**
- ✅ All filters reset to default
- ✅ Full student list shows again

---

### ✅ Step 6: View Student Details

1. Click the eye icon (👁️) on any student row
2. You should see the student detail page

**Expected Result:**
- ✅ URL changes to `/students/{id}`
- ✅ Student header card shows:
  - Large avatar with initials
  - Full name and email
  - Status badge
  - Admission number, class, section, academic year
- ✅ Four tabs visible: Profile, Academic, Attendance, Fees
- ✅ Profile tab is active by default
- ✅ Information cards show:
  - Personal Information
  - Contact Information
  - Father's Information
  - Mother's Information
  - Additional Information
- ✅ "Edit" button visible in top-right
- ✅ Back arrow button works

**Test Tabs:**
1. Click "Academic" tab
2. Click "Attendance" tab
3. Click "Fees" tab

**Expected Result:**
- ✅ Tab switches with visual indication
- ✅ Placeholder content shows for non-profile tabs

---

### ✅ Step 7: Edit Student

**From Detail Page:**
1. Click "Edit" button

**OR From List Page:**
1. Click the pencil icon (✏️) on any student row

**Expected Result:**
- ✅ URL changes to `/students/{id}/edit`
- ✅ Form loads with existing student data
- ✅ All fields are pre-filled
- ✅ Page title shows "Edit Student"
- ✅ Button text shows "Update Student"

**Make Changes:**
1. Change phone number to `5555555555`
2. Change status to "Inactive"
3. Click "Update Student"

**Expected Result:**
- ✅ Loading state shows "Saving..."
- ✅ Success toast notification appears
- ✅ Redirected to `/students` list page
- ✅ Changes reflected in the table
- ✅ Status badge changes color (yellow for inactive)

---

### ✅ Step 8: Delete Student

1. Click the trash icon (🗑️) on any student row
2. Confirmation dialog appears

**Expected Result:**
- ✅ Browser confirmation dialog shows
- ✅ Message: "Are you sure you want to delete this student?"

3. Click "OK" to confirm

**Expected Result:**
- ✅ Success toast notification appears
- ✅ Student removed from table
- ✅ Table updates immediately

---

### ✅ Step 9: Test Pagination

**If you have more than 20 students:**

1. Scroll to bottom of table
2. You should see pagination controls

**Expected Result:**
- ✅ Shows "Showing X to Y of Z results"
- ✅ Page numbers visible
- ✅ Previous/Next buttons visible
- ✅ Current page highlighted in blue
- ✅ Clicking page number loads that page
- ✅ Previous button disabled on first page
- ✅ Next button disabled on last page

---

### ✅ Step 10: Test Responsive Design

**Desktop (default):**
- ✅ Sidebar fully expanded
- ✅ Table shows all columns
- ✅ Form fields in 3 columns

**Tablet (resize browser to ~768px):**
- ✅ Sidebar still visible
- ✅ Table scrolls horizontally if needed
- ✅ Form fields in 2 columns

**Mobile (resize browser to ~375px):**
- ✅ Sidebar collapses to icons only
- ✅ Table scrolls horizontally
- ✅ Form fields in 1 column
- ✅ Filters stack vertically

---

### ✅ Step 11: Test Navigation

**Test Sidebar:**
1. Click "Dashboard" in sidebar
2. Should navigate to dashboard
3. Click "Students" again
4. Should return to student list

**Test Back Button:**
1. From student detail page, click back arrow
2. Should return to student list
3. From student form, click back arrow
4. Should return to student list

**Test Browser Back/Forward:**
1. Use browser back button
2. Should navigate to previous page
3. Use browser forward button
4. Should navigate forward

**Expected Result:**
- ✅ All navigation works correctly
- ✅ Active menu item highlighted
- ✅ No page refresh (SPA behavior)

---

### ✅ Step 12: Test Error Handling

**Test Required Fields:**
1. Go to create student form
2. Leave required fields empty
3. Try to submit

**Expected Result:**
- ✅ Browser validation prevents submission
- ✅ Required fields highlighted

**Test Invalid Email:**
1. Enter invalid email format
2. Try to submit

**Expected Result:**
- ✅ Email validation error shows

**Test API Error (if backend is down):**
1. Stop the backend server
2. Try to load student list

**Expected Result:**
- ✅ Error toast notification appears
- ✅ Empty state or error message shows

---

### ✅ Step 13: Test Loading States

**Test List Loading:**
1. Refresh the student list page
2. Watch for loading spinner

**Expected Result:**
- ✅ Loading spinner shows while fetching data
- ✅ Spinner disappears when data loads

**Test Form Loading (Edit):**
1. Navigate to edit student
2. Watch for loading spinner

**Expected Result:**
- ✅ Loading spinner shows while fetching student data
- ✅ Form appears when data loads

**Test Submit Loading:**
1. Fill in create/edit form
2. Click submit
3. Watch button text

**Expected Result:**
- ✅ Button text changes to "Saving..."
- ✅ Button is disabled during save
- ✅ Button re-enables after save

---

## 🎯 Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ Smooth transitions
- ✅ Fast loading times
- ✅ Correct data display
- ✅ Proper error handling
- ✅ Responsive design working
- ✅ All CRUD operations functional

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to fetch students"
**Solution:** Make sure backend server is running on port 8000

### Issue: "No classes/sections in dropdown"
**Solution:** Make sure you have seeded the database with test data

### Issue: "Cannot create student"
**Solution:** Check that all required fields are filled and valid

### Issue: "Page not found"
**Solution:** Make sure you're using the correct URL structure

### Issue: "Styles not loading"
**Solution:** Make sure Tailwind CSS is properly configured

---

## 📊 Test Data

If you need more test data, you can create multiple students with these variations:

**Student 1:**
- Name: John Doe
- Class: 10
- Section: A
- Status: Active

**Student 2:**
- Name: Jane Smith
- Class: 10
- Section: B
- Status: Active

**Student 3:**
- Name: Bob Johnson
- Class: 9
- Section: A
- Status: Inactive

**Student 4:**
- Name: Alice Williams
- Class: 9
- Section: B
- Status: Active

This will help test:
- Multiple pages (pagination)
- Different classes
- Different sections
- Different statuses
- Filtering and searching

---

## ✅ Final Checklist

- [ ] Login works
- [ ] Dashboard loads
- [ ] Student list displays
- [ ] Filters work (search, class, section, status)
- [ ] Pagination works
- [ ] Create student works
- [ ] View student details works
- [ ] Edit student works
- [ ] Delete student works
- [ ] Navigation works (sidebar, back buttons)
- [ ] Loading states show
- [ ] Error handling works
- [ ] Toast notifications appear
- [ ] Responsive design works
- [ ] No console errors

---

**If all tests pass, the student management module is working perfectly! 🎉**

---

*Testing Guide - October 11, 2025*

