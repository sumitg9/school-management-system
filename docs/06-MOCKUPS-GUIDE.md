# School Management System - Mockups Guide

## Overview
This document provides an overview of all UI mockups created for the School Management System. All mockups are built with HTML and Tailwind CSS.

---

## 📁 Mockup Folder Structure

```
mockups/
├── index.html                          # Mockup navigation/index page
├── auth/
│   ├── login.html                      # Login page
│   ├── register.html                   # Registration page
│   ├── forgot-password.html            # Forgot password page
│   ├── reset-password.html             # Reset password page
│   └── two-factor.html                 # Two-factor authentication page
├── admin/
│   ├── dashboard.html                  # Admin dashboard
│   ├── users/
│   │   ├── list.html                   # User list
│   │   ├── create.html                 # Create user
│   │   └── edit.html                   # Edit user
│   ├── students/
│   │   ├── list.html                   # Student list
│   │   ├── create.html                 # Student admission
│   │   ├── edit.html                   # Edit student
│   │   ├── profile.html                # Student profile view
│   │   ├── promote.html                # Student promotion
│   │   └── id-card.html                # Student ID card
│   ├── teachers/
│   │   ├── list.html                   # Teacher list
│   │   ├── create.html                 # Create teacher
│   │   ├── edit.html                   # Edit teacher
│   │   ├── profile.html                # Teacher profile view
│   │   └── assign-subjects.html        # Assign subjects to teacher
│   ├── academic/
│   │   ├── classes.html                # Class management
│   │   ├── sections.html               # Section management
│   │   ├── subjects.html               # Subject management
│   │   ├── academic-years.html         # Academic year management
│   │   └── departments.html            # Department management
│   ├── attendance/
│   │   ├── mark-attendance.html        # Mark attendance
│   │   ├── view-attendance.html        # View attendance
│   │   └── reports.html                # Attendance reports
│   ├── timetable/
│   │   ├── create.html                 # Create timetable
│   │   ├── view.html                   # View timetable
│   │   └── substitution.html           # Period substitution
│   ├── examinations/
│   │   ├── exam-types.html             # Exam types
│   │   ├── create-exam.html            # Create exam
│   │   ├── schedule.html               # Exam schedule
│   │   ├── marks-entry.html            # Marks entry
│   │   ├── results.html                # View results
│   │   └── report-card.html            # Report card
│   ├── assignments/
│   │   ├── list.html                   # Assignment list
│   │   ├── create.html                 # Create assignment
│   │   └── submissions.html            # View submissions
│   ├── fees/
│   │   ├── fee-structure.html          # Fee structure
│   │   ├── collect-fee.html            # Collect fee
│   │   ├── receipts.html               # Fee receipts
│   │   ├── defaulters.html             # Fee defaulters
│   │   └── reports.html                # Fee reports
│   ├── library/
│   │   ├── books.html                  # Book management
│   │   ├── issue-return.html           # Issue/return books
│   │   └── reports.html                # Library reports
│   ├── transport/
│   │   ├── buses.html                  # Bus management
│   │   ├── routes.html                 # Route management
│   │   └── assign-students.html        # Assign students to routes
│   ├── communication/
│   │   ├── messages.html               # Internal messaging
│   │   ├── announcements.html          # Announcements
│   │   └── notifications.html          # Notifications
│   ├── events/
│   │   ├── list.html                   # Event list
│   │   ├── create.html                 # Create event
│   │   └── participants.html           # Event participants
│   ├── certificates/
│   │   ├── templates.html              # Certificate templates
│   │   └── generate.html               # Generate certificates
│   ├── reports/
│   │   ├── dashboard.html              # Reports dashboard
│   │   ├── student-performance.html    # Student performance
│   │   ├── attendance-report.html      # Attendance report
│   │   └── custom-report.html          # Custom report builder
│   └── settings/
│       ├── school-profile.html         # School profile
│       ├── academic-settings.html      # Academic settings
│       ├── roles-permissions.html      # Roles & permissions
│       └── system-settings.html        # System settings
├── teacher/
│   ├── dashboard.html                  # Teacher dashboard
│   ├── profile.html                    # Teacher profile
│   ├── classes.html                    # My classes
│   ├── timetable.html                  # My timetable
│   ├── attendance/
│   │   ├── mark.html                   # Mark attendance
│   │   └── view.html                   # View attendance
│   ├── examinations/
│   │   ├── schedule.html               # Exam schedule
│   │   ├── marks-entry.html            # Enter marks
│   │   └── performance.html            # Student performance
│   ├── assignments/
│   │   ├── list.html                   # My assignments
│   │   ├── create.html                 # Create assignment
│   │   └── submissions.html            # View submissions
│   ├── students/
│   │   ├── list.html                   # Student list
│   │   └── performance.html            # Student performance
│   ├── communication/
│   │   ├── messages.html               # Messages
│   │   └── announcements.html          # Announcements
│   └── leave/
│       ├── apply.html                  # Apply for leave
│       └── history.html                # Leave history
├── student/
│   ├── dashboard.html                  # Student dashboard
│   ├── profile.html                    # Student profile
│   ├── attendance.html                 # My attendance
│   ├── timetable.html                  # My timetable
│   ├── examinations/
│   │   ├── schedule.html               # Exam schedule
│   │   ├── results.html                # My results
│   │   └── report-card.html            # Report card
│   ├── assignments/
│   │   ├── list.html                   # My assignments
│   │   ├── view.html                   # View assignment
│   │   └── submit.html                 # Submit assignment
│   ├── fees/
│   │   ├── status.html                 # Fee status
│   │   ├── payment.html                # Make payment
│   │   └── receipts.html               # Payment receipts
│   ├── library/
│   │   ├── search.html                 # Search books
│   │   ├── issued-books.html           # My issued books
│   │   └── reservations.html           # My reservations
│   ├── communication/
│   │   ├── messages.html               # Messages
│   │   └── announcements.html          # Announcements
│   └── events/
│       ├── calendar.html               # Event calendar
│       └── registered.html             # My registered events
├── parent/
│   ├── dashboard.html                  # Parent dashboard
│   ├── children.html                   # Children list
│   ├── child-profile.html              # Child profile
│   ├── attendance.html                 # Child attendance
│   ├── performance.html                # Child performance
│   ├── assignments.html                # Child assignments
│   ├── fees/
│   │   ├── status.html                 # Fee status
│   │   ├── payment.html                # Make payment
│   │   └── history.html                # Payment history
│   ├── timetable.html                  # Child timetable
│   ├── communication/
│   │   ├── messages.html               # Messages
│   │   └── teachers.html               # Teacher contacts
│   └── events/
│       └── calendar.html               # Event calendar
├── accountant/
│   ├── dashboard.html                  # Accountant dashboard
│   ├── fee-structure.html              # Fee structure
│   ├── collect-fee.html                # Collect fee
│   ├── receipts.html                   # Fee receipts
│   ├── defaulters.html                 # Fee defaulters
│   ├── discounts.html                  # Manage discounts
│   └── reports/
│       ├── collection.html             # Collection reports
│       ├── outstanding.html            # Outstanding fees
│       └── analysis.html               # Financial analysis
├── librarian/
│   ├── dashboard.html                  # Librarian dashboard
│   ├── books/
│   │   ├── list.html                   # Book list
│   │   ├── add.html                    # Add book
│   │   └── edit.html                   # Edit book
│   ├── issue-return.html               # Issue/return books
│   ├── reservations.html               # Book reservations
│   ├── fines.html                      # Fine management
│   └── reports/
│       ├── inventory.html              # Inventory report
│       └── overdue.html                # Overdue books
└── components/
    ├── header.html                     # Header component
    ├── sidebar.html                    # Sidebar component
    ├── footer.html                     # Footer component
    ├── breadcrumb.html                 # Breadcrumb component
    ├── table.html                      # Table component
    ├── modal.html                      # Modal component
    ├── card.html                       # Card component
    ├── form-elements.html              # Form elements
    ├── buttons.html                    # Button styles
    ├── alerts.html                     # Alert components
    └── charts.html                     # Chart components
```

---

## 🎨 Design Guidelines

### Color Scheme
- **Primary:** Blue (#3B82F6)
- **Secondary:** Indigo (#6366F1)
- **Success:** Green (#10B981)
- **Warning:** Yellow (#F59E0B)
- **Danger:** Red (#EF4444)
- **Info:** Cyan (#06B6D4)
- **Dark:** Gray-900 (#111827)
- **Light:** Gray-100 (#F3F4F6)

### Typography
- **Font Family:** Inter, system-ui, sans-serif
- **Headings:** Font-weight 600-700
- **Body:** Font-weight 400
- **Small Text:** Font-size 0.875rem

### Spacing
- Use Tailwind's spacing scale (4px increments)
- Consistent padding and margins
- Card padding: p-6
- Section spacing: mb-6 or mb-8

### Components
- **Cards:** Rounded corners (rounded-lg), shadow (shadow-md)
- **Buttons:** Rounded (rounded-md), appropriate padding
- **Forms:** Consistent input styling, proper labels
- **Tables:** Striped rows, hover effects
- **Modals:** Centered, backdrop blur

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Collapsible sidebar on mobile
- Responsive tables (horizontal scroll or card view)

---

## 📱 Responsive Breakpoints

```css
/* Mobile: < 640px */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */
```

### Mobile Considerations
- Hamburger menu for navigation
- Stacked form layouts
- Touch-friendly button sizes (min 44x44px)
- Simplified tables or card views

---

## 🧩 Reusable Components

### Layout Components
1. **Header** - Logo, user menu, notifications
2. **Sidebar** - Navigation menu (collapsible)
3. **Footer** - Copyright, links
4. **Breadcrumb** - Navigation trail

### UI Components
1. **Cards** - Content containers
2. **Tables** - Data display with sorting, filtering
3. **Forms** - Input fields, selects, checkboxes
4. **Buttons** - Primary, secondary, danger, etc.
5. **Modals** - Dialogs and popups
6. **Alerts** - Success, error, warning, info messages
7. **Badges** - Status indicators
8. **Tabs** - Content organization
9. **Pagination** - Page navigation
10. **Charts** - Data visualization

---

## 🔧 Tailwind CSS Setup

All mockups use Tailwind CSS via CDN for simplicity:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title - School Management System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <!-- Content here -->
</body>
</html>
```

---

## 📝 Mockup Features

Each mockup includes:
- ✅ Fully responsive design
- ✅ Tailwind CSS styling
- ✅ Font Awesome icons
- ✅ Interactive elements (hover states, etc.)
- ✅ Proper semantic HTML
- ✅ Accessibility considerations
- ✅ Consistent branding
- ✅ Sample data for demonstration

---

## 🚀 Next Steps

After mockup creation:
1. Review mockups with stakeholders
2. Gather feedback and iterate
3. Finalize design system
4. Convert mockups to React components
5. Integrate with backend API

---

*Last Updated: 2025-10-11*

