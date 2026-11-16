/**
 * User Roles & Permissions Definitions and Helpers
 */

export const SYSTEM_ROLES = [
  {
    id: 'super-admin',
    name: 'Super Admin',
    badge: '👑 Super Admin',
    description: 'Full root access to all systems, settings, and modules',
    color: 'purple',
    badgeVariant: 'purple',
  },
  {
    id: 'admin',
    name: 'Admin',
    badge: '🛡️ Admin',
    description: 'School institutional administrator with management permissions',
    color: 'blue',
    badgeVariant: 'primary',
  },
  {
    id: 'teacher',
    name: 'Teacher',
    badge: '👨‍🏫 Teacher',
    description: 'Academic faculty with access to assigned classes and students',
    color: 'indigo',
    badgeVariant: 'info',
  },
  {
    id: 'student',
    name: 'Student',
    badge: '👨‍🎓 Student',
    description: 'Enrolled student with view access to grades, attendance, and homework',
    color: 'emerald',
    badgeVariant: 'success',
  },
  {
    id: 'parent',
    name: 'Parent',
    badge: '👨‍👩‍👧 Parent',
    description: 'Parent / Guardian with visibility into ward academic progress & fees',
    color: 'teal',
    badgeVariant: 'teal',
  },
  {
    id: 'finance',
    name: 'Finance / Accounts',
    badge: '💳 Finance',
    description: 'Accounting & finance staff managing fees, transactions, and receipts',
    color: 'amber',
    badgeVariant: 'warning',
  },
  {
    id: 'back-office',
    name: 'Back Office',
    badge: '🏢 Back Office',
    description: 'Administrative clerks managing admissions, records, and data operations',
    color: 'cyan',
    badgeVariant: 'cyan',
  },
  {
    id: 'general',
    name: 'General Staff',
    badge: '👤 General',
    description: 'General support staff with basic student directory and class overview access',
    color: 'gray',
    badgeVariant: 'default',
  },
];

export const PERMISSION_MODULES = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: '🏠',
    description: 'School performance statistics and daily dashboard',
    permissions: [
      { id: 'view-dashboard', label: 'View Dashboard', description: 'Access dashboard analytics and stats cards' },
    ],
  },
  {
    id: 'students',
    name: 'Students Management',
    icon: '👨‍🎓',
    description: 'Student admission, student profiles, and parent relations',
    permissions: [
      { id: 'view-students', label: 'View Students', description: 'Browse student list and view student profiles' },
      { id: 'create-students', label: 'Add Students', description: 'Admit and register new students' },
      { id: 'edit-students', label: 'Edit Students', description: 'Update student profiles, roll numbers, and parents' },
      { id: 'delete-students', label: 'Delete Students', description: 'Delete or archive student records' },
    ],
  },
  {
    id: 'teachers',
    name: 'Teachers & Faculty',
    icon: '👨‍🏫',
    description: 'Faculty directory, employee details, and departments',
    permissions: [
      { id: 'view-teachers', label: 'View Teachers', description: 'Browse teachers list and view qualifications' },
      { id: 'create-teachers', label: 'Add Teachers', description: 'Onboard and hire new faculty members' },
      { id: 'edit-teachers', label: 'Edit Teachers', description: 'Update teacher designations, salaries, and notes' },
      { id: 'delete-teachers', label: 'Delete Teachers', description: 'Delete or terminate teacher profiles' },
    ],
  },
  {
    id: 'classes',
    name: 'Classes & Sections',
    icon: '📚',
    description: 'Academic class levels, sections, and subjects',
    permissions: [
      { id: 'view-classes', label: 'View Classes', description: 'Browse classes, sections, and subject mappings' },
      { id: 'create-classes', label: 'Create Classes', description: 'Add new classes, sections, or subjects' },
      { id: 'edit-classes', label: 'Edit Classes', description: 'Modify class names, numeric ordering, or sections' },
      { id: 'delete-classes', label: 'Delete Classes', description: 'Delete classes, sections, or subjects' },
    ],
  },
  {
    id: 'attendance',
    name: 'Attendance',
    icon: '📊',
    description: 'Daily student attendance register and reporting',
    permissions: [
      { id: 'view-attendance', label: 'View Attendance', description: 'View attendance registers and history' },
      { id: 'mark-attendance', label: 'Mark Attendance', description: 'Take attendance for classes/sections' },
      { id: 'edit-attendance', label: 'Edit Attendance', description: 'Modify past attendance entries' },
    ],
  },
  {
    id: 'exams',
    name: 'Exams & Grades',
    icon: '📝',
    description: 'Examinations, test scheduling, grading, and report cards',
    permissions: [
      { id: 'view-exams', label: 'View Exams', description: 'Inspect exam timetables and schedules' },
      { id: 'create-exams', label: 'Create Exams', description: 'Create and schedule examinations' },
      { id: 'view-grades', label: 'View Grades', description: 'View student marks and report cards' },
      { id: 'enter-grades', label: 'Enter / Edit Marks', description: 'Grade students and submit assessment marks' },
    ],
  },
  {
    id: 'fees',
    name: 'Fees & Payments',
    icon: '💵',
    description: 'Fee structures, monthly collections, discounts, and receipts',
    permissions: [
      { id: 'view-fees', label: 'View Fees', description: 'View fee structures and payment history' },
      { id: 'create-fees', label: 'Manage Fee Structures', description: 'Create and update fee structures & rates' },
      { id: 'collect-fees', label: 'Collect Payments', description: 'Collect student fees and print official receipts' },
    ],
  },
  {
    id: 'assignments',
    name: 'Assignments & Homework',
    icon: '📋',
    description: 'Class assignments, homework submissions, and evaluations',
    permissions: [
      { id: 'view-assignments', label: 'View Assignments', description: 'View assignments and deadlines' },
      { id: 'create-assignments', label: 'Create Assignments', description: 'Post new assignments for classes' },
      { id: 'grade-assignments', label: 'Grade Submissions', description: 'Review student work and award marks' },
      { id: 'submit-assignments', label: 'Submit Work', description: 'Submit answers and upload assignment files' },
    ],
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    icon: '📈',
    description: 'School-wide analytics, attendance trends, and financial reports',
    permissions: [
      { id: 'view-reports', label: 'View Reports', description: 'Access standard analytical reports' },
      { id: 'generate-reports', label: 'Export Reports', description: 'Export PDF and spreadsheet data' },
    ],
  },
  {
    id: 'tools',
    name: 'Bulk Operations & Tools',
    icon: '🔧',
    description: 'CSV bulk imports and system batch actions',
    permissions: [
      { id: 'manage-tools', label: 'Bulk Operations', description: 'Perform bulk imports of students, teachers, marks' },
    ],
  },
  {
    id: 'settings',
    name: 'Admin Settings',
    icon: '⚙️',
    description: 'System configurations, age criteria, fee policies, and permissions',
    permissions: [
      { id: 'manage-settings', label: 'Manage Settings', description: 'Edit school settings, localization, and policies' },
      { id: 'manage-permissions', label: 'Manage Permissions', description: 'Edit user role permissions matrix' },
    ],
  },
  {
    id: 'users',
    name: 'User Management',
    icon: '👥',
    description: 'System user accounts, credentials, and role assignments',
    permissions: [
      { id: 'view-users', label: 'View Users', description: 'Browse and inspect system user directory' },
      { id: 'manage-users', label: 'Manage Users', description: 'Create users, assign roles, edit details, and delete users' },
    ],
  },
  {
    id: 'gallery',
    name: 'School Gallery',
    icon: '🖼️',
    description: 'School event albums, sports days, cultural fests, and campus photos',
    permissions: [
      { id: 'view-gallery', label: 'View Gallery', description: 'Browse and view school photos, events, and albums' },
      { id: 'manage-gallery', label: 'Manage Gallery', description: 'Upload, edit, and delete photos and album collections' },
    ],
  },
  {
    id: 'communication',
    name: 'Teacher-Parent Communication',
    icon: '💬',
    description: 'Direct messaging, student academic progress updates, and meeting requests between teachers and parents',
    permissions: [
      { id: 'view-communication', label: 'View Messages', description: 'Browse conversation threads and read messages' },
      { id: 'manage-communication', label: 'Send & Manage Messages', description: 'Initiate conversations, send replies, and schedule PTMs' },
    ],
  },
  {
    id: 'events',
    name: 'Events & Calendar',
    icon: '📅',
    description: 'School events, athletic tournaments, academic schedule, PTM conferences, and institutional calendar',
    permissions: [
      { id: 'view-events', label: 'View Events & Calendar', description: 'Browse school calendar, upcoming events, and schedules' },
      { id: 'manage-events', label: 'Manage Events', description: 'Create, schedule, edit, and delete school events and calendar entries' },
    ],
  },
  {
    id: 'hrms',
    name: 'Human Resources (HRMS)',
    icon: '👔',
    description: 'Faculty and staff directory, leave management, staff attendance, payroll processing, and salary slips',
    permissions: [
      { id: 'view-hrms', label: 'View HRMS & Staff', description: 'Browse staff directory, personal leave status, and payslips' },
      { id: 'manage-hrms', label: 'Manage HRMS & Payroll', description: 'Manage staff profiles, approve/reject leaves, mark staff attendance, and process payroll' },
    ],
  },
];

export const DEFAULT_ROLE_PERMISSIONS = {
  'super-admin': [
    'view-dashboard',
    'view-students', 'create-students', 'edit-students', 'delete-students',
    'view-teachers', 'create-teachers', 'edit-teachers', 'delete-teachers',
    'view-classes', 'create-classes', 'edit-classes', 'delete-classes',
    'view-attendance', 'mark-attendance', 'edit-attendance',
    'view-exams', 'create-exams', 'view-grades', 'enter-grades',
    'view-fees', 'create-fees', 'collect-fees',
    'view-assignments', 'create-assignments', 'grade-assignments', 'submit-assignments',
    'view-reports', 'generate-reports',
    'manage-tools',
    'manage-settings', 'manage-permissions',
    'view-users', 'manage-users',
    'view-gallery', 'manage-gallery',
    'view-communication', 'manage-communication',
    'view-events', 'manage-events',
    'view-hrms', 'manage-hrms',
  ],
  'admin': [
    'view-dashboard',
    'view-students', 'create-students', 'edit-students', 'delete-students',
    'view-teachers', 'create-teachers', 'edit-teachers', 'delete-teachers',
    'view-classes', 'create-classes', 'edit-classes', 'delete-classes',
    'view-attendance', 'mark-attendance', 'edit-attendance',
    'view-exams', 'create-exams', 'view-grades', 'enter-grades',
    'view-fees', 'create-fees', 'collect-fees',
    'view-assignments', 'create-assignments', 'grade-assignments',
    'view-reports', 'generate-reports',
    'manage-tools',
    'manage-settings', 'manage-permissions',
    'view-gallery', 'manage-gallery',
    'view-communication', 'manage-communication',
    'view-events', 'manage-events',
    'view-hrms', 'manage-hrms',
  ],
  'teacher': [
    'view-dashboard',
    'view-students',
    'view-classes',
    'view-attendance', 'mark-attendance', 'edit-attendance',
    'view-exams', 'view-grades', 'enter-grades',
    'view-assignments', 'create-assignments', 'grade-assignments',
    'view-reports',
    'view-gallery',
    'view-communication', 'manage-communication',
    'view-events', 'manage-events',
    'view-hrms',
  ],
  'student': [
    'view-dashboard',
    'view-attendance',
    'view-exams', 'view-grades',
    'view-fees',
    'view-assignments', 'submit-assignments',
    'view-gallery',
    'view-events',
  ],
  'parent': [
    'view-dashboard',
    'view-students',
    'view-attendance',
    'view-exams', 'view-grades',
    'view-fees',
    'view-assignments',
    'view-gallery',
    'view-communication', 'manage-communication',
    'view-events',
  ],
  'finance': [
    'view-dashboard',
    'view-students',
    'view-fees', 'create-fees', 'collect-fees',
    'view-reports', 'generate-reports',
    'view-gallery',
    'view-events',
    'view-hrms', 'manage-hrms',
  ],
  'back-office': [
    'view-dashboard',
    'view-students', 'create-students', 'edit-students',
    'view-teachers',
    'view-classes',
    'view-attendance',
    'view-reports',
    'manage-tools',
    'view-gallery',
    'view-events', 'manage-events',
    'view-hrms',
  ],
  'general': [
    'view-dashboard',
    'view-students',
    'view-classes',
    'view-gallery',
    'view-events',
    'view-hrms',
  ],
};

/**
 * Normalizes a role string to system key
 */
export const normalizeRole = (rawRole) => {
  if (!rawRole) return 'general';
  const clean = String(rawRole).toLowerCase().trim().replace(/\s+/g, '-');
  if (clean === 'accountant') return 'finance';
  if (clean === 'staff') return 'general';
  if (clean === 'librarian' || clean === 'receptionist') return 'back-office';
  const found = SYSTEM_ROLES.find(r => r.id === clean);
  return found ? found.id : clean;
};

/**
 * Strict system constraint check:
 * Returns true if a permission is forbidden for students (e.g. edit, delete, create, manage, mark, enter, collect, root)
 */
export const isRestrictedForStudent = (permissionId) => {
  if (!permissionId) return false;
  return (
    permissionId.startsWith('edit-') ||
    permissionId.startsWith('delete-') ||
    permissionId.startsWith('create-') ||
    permissionId.startsWith('manage-') ||
    permissionId.startsWith('mark-') ||
    permissionId.startsWith('enter-') ||
    permissionId.startsWith('collect-') ||
    permissionId === '*'
  );
};

/**
 * Checks if a given role has a specific permission based on configured permissions
 */
export const hasRolePermission = (configuredMatrix, role, permissionId) => {
  if (!role || !permissionId) return false;
  const normalized = normalizeRole(role);
  if (normalized === 'super-admin') return true;

  // Strict system constraint: students are strictly forbidden from having any edit, delete, create, mark, or manage permissions
  if (normalized === 'student') {
    if (isRestrictedForStudent(permissionId)) return false;
  }

  const matrix = configuredMatrix && typeof configuredMatrix === 'object'
    ? configuredMatrix
    : DEFAULT_ROLE_PERMISSIONS;

  const rolePerms = matrix[normalized] || DEFAULT_ROLE_PERMISSIONS[normalized] || [];
  return rolePerms.includes(permissionId) || rolePerms.includes('*');
};

/**
 * Merges configured matrix with system defaults so newly added permissions are preserved
 */
export const mergeRolePermissions = (customMatrix) => {
  const merged = { ...DEFAULT_ROLE_PERMISSIONS };
  if (!customMatrix || typeof customMatrix !== 'object') {
    return merged;
  }

  SYSTEM_ROLES.forEach(r => {
    if (Array.isArray(customMatrix[r.id])) {
      merged[r.id] = [...customMatrix[r.id]];
    }
  });

  return merged;
};

