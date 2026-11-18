/**
 * Report Data Engine
 * Generates structured datasets, columns, KPI summaries, and export utilities
 * for all 22 institutional reports across 6 school management categories.
 */

export const REPORT_CATEGORIES = [
  {
    id: 'student',
    name: 'Student Reports',
    icon: '👨‍🎓',
    color: 'blue',
    description: 'Enrollment, academic performance, attendance records, and student fee status',
    reports: [
      { id: 'student-list', name: 'Student List Report', description: 'Complete directory of all enrolled students with class, section, contact, and parent details' },
      { id: 'student-performance', name: 'Student Performance Report', description: 'Term-wise academic scores, percentages, CGPA/GPA, and distinction rankings' },
      { id: 'student-attendance', name: 'Student Attendance Report', description: 'Comprehensive student attendance register, working days, present percentage, and compliance' },
      { id: 'student-fee', name: 'Student Fee Report', description: 'Individual fee account status, invoices, payments recorded, and outstanding balances' },
    ],
  },
  {
    id: 'teacher',
    name: 'Teacher Reports',
    icon: '👨‍🏫',
    color: 'emerald',
    description: 'Faculty roster, teaching workload allocation, and faculty attendance',
    reports: [
      { id: 'teacher-list', name: 'Teacher List Report', description: 'Faculty roster with employee IDs, designation, department, qualifications, and contact details' },
      { id: 'teacher-workload', name: 'Teacher Workload Report', description: 'Teaching periods assigned per week, assigned classes, subjects, and substitution capacity' },
      { id: 'teacher-attendance', name: 'Teacher Attendance Report', description: 'Faculty attendance logs, present rates, casual/sick leave tracking, and on-duty days' },
    ],
  },
  {
    id: 'academic',
    name: 'Academic Reports',
    icon: '📚',
    color: 'purple',
    description: 'Class performance index, subject-wise evaluations, exam results, and grade distributions',
    reports: [
      { id: 'class-performance', name: 'Class Performance Report', description: 'Class-by-class academic benchmark comparison, class averages, pass rates, and distinctions' },
      { id: 'subject-analysis', name: 'Subject-wise Analysis', description: 'Performance and evaluation metrics grouped by academic subject and department' },
      { id: 'exam-results', name: 'Exam Results Report', description: 'Detailed student scorecards, examination totals, percentages, letter grades, and merit ranks' },
      { id: 'grade-distribution', name: 'Grade Distribution Report', description: 'Institution-wide breakdown of grades across A+, A, B+, B, C, D, and remedial F levels' },
    ],
  },
  {
    id: 'attendance',
    name: 'Attendance Reports',
    icon: '📊',
    color: 'amber',
    description: 'Daily roll call, monthly attendance rates, low attendance alerts, and attendance trends',
    reports: [
      { id: 'daily-attendance', name: 'Daily Attendance Report', description: 'Today\'s live roll call statistics across all classes with present, absent, and late counts' },
      { id: 'monthly-attendance', name: 'Monthly Attendance Report', description: 'Month-by-month student and faculty attendance trends with seasonal fluctuations' },
      { id: 'low-attendance', name: 'Low Attendance Alert', description: 'Critical alert roster of students falling below the mandatory 75% attendance threshold' },
      { id: 'attendance-trends', name: 'Attendance Trends', description: 'Day-of-the-week attendance trends, weekly averages, and punctuality analysis' },
    ],
  },
  {
    id: 'financial',
    name: 'Financial Reports',
    icon: '💰',
    color: 'indigo',
    description: 'Fee collection ledger, pending balances, overdue defaulters, and revenue breakdown',
    reports: [
      { id: 'fee-collection', name: 'Fee Collection Report', description: 'Chronological payment receipt ledger with payment modes (UPI, Cash, Card, Net Banking)' },
      { id: 'pending-fees', name: 'Pending Fees Report', description: 'Detailed inventory of outstanding dues, overdue amounts, and due dates across classes' },
      { id: 'fee-defaulters', name: 'Fee Defaulters Report', description: 'Critical overdue accounts (>60 days) with parent contact information and reminder notice stage' },
      { id: 'revenue-analysis', name: 'Revenue Analysis', description: 'Revenue stream breakdown across Tuition, Transport, Lab, Library, and Annual Development fees' },
    ],
  },
  {
    id: 'assignment',
    name: 'Assignment Reports',
    icon: '📝',
    color: 'rose',
    description: 'Homework and project submission compliance, overdue assignments, and grading evaluations',
    reports: [
      { id: 'assignment-submission', name: 'Assignment Submission Report', description: 'Submission completion rates per assignment with on-time vs late delivery metrics' },
      { id: 'pending-assignments', name: 'Pending Assignments', description: 'List of overdue homework and pending student submissions requiring teacher follow-up' },
      { id: 'assignment-performance', name: 'Assignment Performance', description: 'Average scores and teacher feedback across homework tasks and laboratory assignments' },
    ],
  },
];

// Helper to format currency in Indian Rupees
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Seed student names & realistic mock data fallback
const DEFAULT_STUDENTS = [
  { roll: '101', adm: 'ADM2026001', name: 'Aarav Sharma', class: 'Class 10', section: 'A', gender: 'Male', dob: '2010-04-12', parent: 'Rajesh Sharma', phone: '+91 98765 22001', admDate: '2024-04-01', status: 'Active' },
  { roll: '102', adm: 'ADM2026002', name: 'Ananya Patel', class: 'Class 10', section: 'A', gender: 'Female', dob: '2010-06-25', parent: 'Kirit Patel', phone: '+91 98765 22003', admDate: '2024-04-01', status: 'Active' },
  { roll: '103', adm: 'ADM2026003', name: 'Vihaan Deshmukh', class: 'Class 10', section: 'A', gender: 'Male', dob: '2010-08-14', parent: 'Anand Deshmukh', phone: '+91 98765 22005', admDate: '2024-04-02', status: 'Active' },
  { roll: '104', adm: 'ADM2026004', name: 'Ishaan Verma', class: 'Class 10', section: 'B', gender: 'Male', dob: '2010-02-18', parent: 'Sunil Verma', phone: '+91 98765 22007', admDate: '2024-04-02', status: 'Active' },
  { roll: '105', adm: 'ADM2026005', name: 'Diya Iyer', class: 'Class 10', section: 'B', gender: 'Female', dob: '2010-09-30', parent: 'Ramanathan Iyer', phone: '+91 98765 22009', admDate: '2024-04-03', status: 'Active' },
  { roll: '106', adm: 'ADM2026006', name: 'Rohan Gupta', class: 'Class 9', section: 'A', gender: 'Male', dob: '2011-05-19', parent: 'Manoj Gupta', phone: '+91 98765 22011', admDate: '2024-04-03', status: 'Active' },
  { roll: '107', adm: 'ADM2026007', name: 'Saanvi Kulkarni', class: 'Class 9', section: 'A', gender: 'Female', dob: '2011-07-22', parent: 'Sanjay Kulkarni', phone: '+91 98765 22013', admDate: '2024-04-04', status: 'Active' },
  { roll: '108', adm: 'ADM2026008', name: 'Kabir Sen', class: 'Class 9', section: 'B', gender: 'Male', dob: '2011-03-11', parent: 'Subhash Sen', phone: '+91 98765 22015', admDate: '2024-04-04', status: 'Active' },
  { roll: '109', adm: 'ADM2026009', name: 'Myra Das', class: 'Class 8', section: 'A', gender: 'Female', dob: '2012-10-08', parent: 'Debashis Das', phone: '+91 98765 22017', admDate: '2024-04-05', status: 'Active' },
  { roll: '110', adm: 'ADM2026010', name: 'Arjun Reddy', class: 'Class 8', section: 'B', gender: 'Male', dob: '2012-01-16', parent: 'Venkatesh Reddy', phone: '+91 98765 22019', admDate: '2024-04-05', status: 'Active' },
  { roll: '111', adm: 'ADM2026011', name: 'Zara Khan', class: 'Class 7', section: 'A', gender: 'Female', dob: '2013-11-20', parent: 'Farhan Khan', phone: '+91 98765 22021', admDate: '2024-04-06', status: 'Active' },
  { roll: '112', adm: 'ADM2026012', name: 'Devendra Joshi', class: 'Class 7', section: 'B', gender: 'Male', dob: '2013-08-04', parent: 'Girish Joshi', phone: '+91 98765 22023', admDate: '2024-04-06', status: 'Active' },
];

const DEFAULT_TEACHERS = [
  { empId: 'EMP-101', name: 'Dr. Rameshwar Sharma', dept: 'Mathematics', role: 'Head of Mathematics (PGT)', qual: 'Ph.D., M.Sc., B.Ed.', phone: '+91 98765 43210', email: 'rameshwar.sharma@school.edu', periods: 28 },
  { empId: 'EMP-102', name: 'Mrs. Sunita Verma', dept: 'English Literature', role: 'Senior PGT English', qual: 'M.A. English, B.Ed.', phone: '+91 98765 43211', email: 'sunita.verma@school.edu', periods: 26 },
  { empId: 'EMP-103', name: 'Mr. Arvind Singh', dept: 'Science & Physics', role: 'PGT Physics', qual: 'M.Sc. Physics, B.Ed.', phone: '+91 98765 43212', email: 'arvind.singh@school.edu', periods: 28 },
  { empId: 'EMP-104', name: 'Dr. Priya Mehta', dept: 'Chemistry', role: 'PGT Chemistry', qual: 'Ph.D., M.Sc. Chemistry', phone: '+91 98765 43213', email: 'priya.mehta@school.edu', periods: 26 },
  { empId: 'EMP-105', name: 'Mr. Vikas Joshi', dept: 'Social Studies', role: 'TGT History & Civics', qual: 'M.A. History, B.Ed.', phone: '+91 98765 43214', email: 'vikas.joshi@school.edu', periods: 24 },
  { empId: 'EMP-106', name: 'Ms. Neha Gupta', dept: 'Computer Science', role: 'HOD Computer Science', qual: 'M.C.A., B.Tech.', phone: '+91 98765 43215', email: 'neha.gupta@school.edu', periods: 26 },
  { empId: 'EMP-107', name: 'Mr. Mohsin Khan', dept: 'Physical Education', role: 'Director of Sports & P.E.', qual: 'M.P.Ed., NIS Coach', phone: '+91 98765 43216', email: 'mohsin.khan@school.edu', periods: 22 },
  { empId: 'EMP-108', name: 'Mrs. Kavita Gupta', dept: 'Hindi Literature', role: 'Senior TGT Hindi', qual: 'M.A. Hindi, B.Ed.', phone: '+91 98765 43217', email: 'kavita.gupta@school.edu', periods: 24 },
  { empId: 'EMP-109', name: 'Mr. Tanmoy Das', dept: 'Social Studies', role: 'TGT Geography', qual: 'M.Sc. Geography, B.Ed.', phone: '+91 98765 43218', email: 'tanmoy.das@school.edu', periods: 24 },
  { empId: 'EMP-110', name: 'Ms. Pallavi Rao', dept: 'Visual Arts', role: 'Art & Craft Instructor', qual: 'B.F.A., Diploma Fine Arts', phone: '+91 98765 43219', email: 'pallavi.rao@school.edu', periods: 20 },
  { empId: 'EMP-111', name: 'Dr. Deepak Patel', dept: 'Biology', role: 'PGT Biology', qual: 'Ph.D., M.Sc. Zoology', phone: '+91 98765 43220', email: 'deepak.patel@school.edu', periods: 26 },
  { empId: 'EMP-112', name: 'Mr. Radhakrishnan Iyer', dept: 'Performing Arts', role: 'Music & Cultural Director', qual: 'Sangeet Visharad', phone: '+91 98765 43221', email: 'r.iyer@school.edu', periods: 18 },
];

/**
 * Main Report Generator Engine
 */
export const generateReportData = ({
  reportId,
  classId = '',
  className = '',
  sectionName = '',
  dateRange = 'academic-year',
  search = '',
  liveData = {},
}) => {
  const effectiveStudents = (liveData.students && liveData.students.length > 0)
    ? liveData.students.map((s, idx) => ({
        roll: s.roll_number || `${101 + idx}`,
        adm: s.admission_number || `ADM2026${String(idx + 1).padStart(3, '0')}`,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || `Student ${idx + 1}`,
        class: s.class?.name || (s.class_id ? `Class ${s.class_id}` : 'Class 10'),
        section: s.section?.name || 'A',
        gender: s.gender ? (s.gender.toLowerCase().startsWith('m') ? 'Male' : 'Female') : (idx % 2 === 0 ? 'Male' : 'Female'),
        dob: s.date_of_birth || '2010-05-15',
        parent: s.father_name || s.guardian_name || 'Guardian',
        phone: s.phone || s.father_phone || '+91 98765 00000',
        admDate: s.admission_date || '2024-04-01',
        status: s.status || 'Active',
      }))
    : DEFAULT_STUDENTS;

  const effectiveTeachers = (liveData.teachers && liveData.teachers.length > 0)
    ? liveData.teachers.map((t, idx) => ({
        empId: t.employee_id || `EMP-${101 + idx}`,
        name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.user?.name || `Teacher ${idx + 1}`,
        dept: t.specialization || 'General',
        role: t.designation || 'Faculty',
        qual: t.qualification || 'M.A., B.Ed.',
        phone: t.phone || '+91 98765 43210',
        email: t.email || t.user?.email || `faculty${idx + 1}@school.edu`,
        periods: 24 + (idx % 5) * 2,
      }))
    : DEFAULT_TEACHERS;

  // Filter student dataset by class/section if specified
  const filteredStudents = effectiveStudents.filter(s => {
    if (className && s.class !== className) return false;
    if (sectionName && s.section !== sectionName) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q) || s.adm.toLowerCase().includes(q);
    }
    return true;
  });

  switch (reportId) {
    // =========================================================================
    // 1. STUDENT REPORTS
    // =========================================================================
    case 'student-list': {
      const columns = [
        { key: 'roll', label: 'Roll No', align: 'center' },
        { key: 'adm', label: 'Admission No', align: 'center' },
        { key: 'name', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class & Section', align: 'center' },
        { key: 'gender', label: 'Gender', align: 'center' },
        { key: 'dob', label: 'Date of Birth', align: 'center' },
        { key: 'parent', label: 'Parent / Guardian', align: 'left' },
        { key: 'phone', label: 'Contact Phone', align: 'center' },
        { key: 'admDate', label: 'Admission Date', align: 'center' },
        { key: 'status', label: 'Status', format: 'badge', align: 'center' },
      ];

      const data = filteredStudents.map(s => ({
        ...s,
        classSection: `${s.class} - ${s.section}`,
        statusBadge: s.status === 'Active' ? 'green' : 'gray',
      }));

      const maleCount = data.filter(s => s.gender === 'Male').length;
      const femaleCount = data.filter(s => s.gender === 'Female').length;

      const summary = [
        { label: 'Total Enrolled', value: data.length, color: 'blue', icon: '👨‍🎓' },
        { label: 'Male Students', value: maleCount, color: 'emerald', icon: '👦' },
        { label: 'Female Students', value: femaleCount, color: 'purple', icon: '👧' },
        { label: 'Active Rate', value: '100%', color: 'indigo', icon: '✓' },
      ];

      return {
        title: 'Student Directory & Enrollment List',
        subtitle: `Complete roster of active enrolled students (${className || 'All Classes'})`,
        columns,
        data,
        summary,
      };
    }

    case 'student-performance': {
      const columns = [
        { key: 'roll', label: 'Roll No', align: 'center' },
        { key: 'name', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'subjectsCount', label: 'Subjects', align: 'center' },
        { key: 'totalMarks', label: 'Total Scored', align: 'center' },
        { key: 'maxMarks', label: 'Max Marks', align: 'center' },
        { key: 'percentage', label: 'Aggregate %', format: 'progress', align: 'center' },
        { key: 'cgpa', label: 'CGPA', align: 'center' },
        { key: 'division', label: 'Academic Standing', format: 'badge', align: 'center' },
        { key: 'rank', label: 'Rank', align: 'center' },
      ];

      // Generate realistic deterministic marks based on index
      const data = filteredStudents.map((s, idx) => {
        const baseScore = 480 - (idx * 13) % 110;
        const maxScore = 500;
        const pct = ((baseScore / maxScore) * 100).toFixed(1);
        const cgpa = (pct / 9.5).toFixed(1);
        const division = pct >= 85 ? 'Distinction' : pct >= 65 ? 'First Class' : pct >= 50 ? 'Second Class' : 'Pass';
        return {
          roll: s.roll,
          name: s.name,
          classSection: `${s.class}-${s.section}`,
          subjectsCount: 5,
          totalMarks: baseScore,
          maxMarks: maxScore,
          percentage: `${pct}%`,
          numericPct: parseFloat(pct),
          cgpa: `${cgpa} / 10`,
          division,
          rank: `#${idx + 1}`,
          statusBadge: pct >= 85 ? 'emerald' : pct >= 65 ? 'blue' : 'amber',
        };
      }).sort((a, b) => b.numericPct - a.numericPct)
        .map((row, rankIdx) => ({ ...row, rank: `#${rankIdx + 1}` }));

      const avgPct = data.length > 0 ? (data.reduce((acc, curr) => acc + curr.numericPct, 0) / data.length).toFixed(1) : 0;
      const distinctionCount = data.filter(d => d.division === 'Distinction').length;

      const summary = [
        { label: 'Students Evaluated', value: data.length, color: 'blue', icon: '📝' },
        { label: 'Class Average', value: `${avgPct}%`, color: 'emerald', icon: '📈' },
        { label: 'Distinctions (>=85%)', value: distinctionCount, color: 'purple', icon: '⭐' },
        { label: 'Overall Pass Rate', value: '100%', color: 'indigo', icon: '🎯' },
      ];

      return {
        title: 'Student Academic Performance Evaluation',
        subtitle: 'Term evaluation, aggregate scores, CGPA index, and merit ranking',
        columns,
        data,
        summary,
      };
    }

    case 'student-attendance': {
      const columns = [
        { key: 'roll', label: 'Roll No', align: 'center' },
        { key: 'name', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'workingDays', label: 'Total Days', align: 'center' },
        { key: 'presentDays', label: 'Days Present', align: 'center' },
        { key: 'absentDays', label: 'Days Absent', align: 'center' },
        { key: 'lateDays', label: 'Late Marked', align: 'center' },
        { key: 'attendanceRate', label: 'Attendance %', format: 'progress', align: 'center' },
        { key: 'status', label: 'Compliance Status', format: 'badge', align: 'center' },
      ];

      const totalDays = 180;
      const data = filteredStudents.map((s, idx) => {
        // distribute attendance percentages realistically
        const absentDays = idx === 3 ? 34 : idx === 7 ? 28 : (idx * 3) % 18;
        const presentDays = totalDays - absentDays;
        const lateDays = (idx * 2) % 5;
        const pct = ((presentDays / totalDays) * 100).toFixed(1);
        const isCompliant = pct >= 75;
        return {
          roll: s.roll,
          name: s.name,
          classSection: `${s.class}-${s.section}`,
          workingDays: totalDays,
          presentDays,
          absentDays,
          lateDays,
          attendanceRate: `${pct}%`,
          numericRate: parseFloat(pct),
          status: isCompliant ? (pct >= 90 ? 'Exemplary' : 'Satisfactory') : 'Critical Warning',
          statusBadge: pct >= 90 ? 'emerald' : isCompliant ? 'blue' : 'rose',
        };
      });

      const avgRate = data.length > 0 ? (data.reduce((acc, curr) => acc + curr.numericRate, 0) / data.length).toFixed(1) : 0;
      const atRisk = data.filter(d => d.numericRate < 75).length;

      const summary = [
        { label: 'Registered Students', value: data.length, color: 'blue', icon: '👥' },
        { label: 'Average Attendance', value: `${avgRate}%`, color: 'emerald', icon: '📊' },
        { label: 'Exemplary (>=90%)', value: data.filter(d => d.numericRate >= 90).length, color: 'purple', icon: '🌟' },
        { label: 'At-Risk (<75%)', value: atRisk, color: 'rose', icon: '⚠️' },
      ];

      return {
        title: 'Student Annual Attendance Register',
        subtitle: 'Comprehensive working day counts, present rates, and statutory 75% compliance',
        columns,
        data,
        summary,
      };
    }

    case 'student-fee': {
      const columns = [
        { key: 'adm', label: 'Admission No', align: 'center' },
        { key: 'name', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'totalInvoiced', label: 'Total Invoiced', align: 'right' },
        { key: 'totalPaid', label: 'Total Paid', align: 'right' },
        { key: 'balanceDue', label: 'Outstanding Dues', align: 'right' },
        { key: 'lastReceipt', label: 'Last Receipt Date', align: 'center' },
        { key: 'status', label: 'Account Status', format: 'badge', align: 'center' },
      ];

      const data = filteredStudents.map((s, idx) => {
        const invoiced = 45000;
        let paid = invoiced;
        let status = 'Fully Paid';
        if (idx === 1 || idx === 6) {
          paid = 30000;
          status = 'Partial Dues';
        } else if (idx === 3 || idx === 8) {
          paid = 15000;
          status = 'Overdue';
        }
        const balance = invoiced - paid;
        return {
          adm: s.adm,
          name: s.name,
          classSection: `${s.class}-${s.section}`,
          totalInvoiced: formatCurrency(invoiced),
          totalPaid: formatCurrency(paid),
          balanceDue: formatCurrency(balance),
          numericBalance: balance,
          numericPaid: paid,
          numericInvoiced: invoiced,
          lastReceipt: '2024-05-10',
          status,
          statusBadge: status === 'Fully Paid' ? 'emerald' : status === 'Partial Dues' ? 'amber' : 'rose',
        };
      });

      const totalInv = data.reduce((acc, c) => acc + c.numericInvoiced, 0);
      const totalCol = data.reduce((acc, c) => acc + c.numericPaid, 0);
      const totalDue = data.reduce((acc, c) => acc + c.numericBalance, 0);

      const summary = [
        { label: 'Total Invoiced', value: formatCurrency(totalInv), color: 'blue', icon: '📑' },
        { label: 'Total Collected', value: formatCurrency(totalCol), color: 'emerald', icon: '💰' },
        { label: 'Outstanding Balance', value: formatCurrency(totalDue), color: 'rose', icon: '⏳' },
        { label: 'Recovery Rate', value: `${((totalCol / (totalInv || 1)) * 100).toFixed(1)}%`, color: 'purple', icon: '✓' },
      ];

      return {
        title: 'Student Fee Ledger & Dues Report',
        subtitle: 'Invoiced tuition balances, payments realized, and collection tracking',
        columns,
        data,
        summary,
      };
    }

    // =========================================================================
    // 2. TEACHER REPORTS
    // =========================================================================
    case 'teacher-list': {
      const columns = [
        { key: 'empId', label: 'Employee ID', align: 'center' },
        { key: 'name', label: 'Faculty Name', align: 'left' },
        { key: 'role', label: 'Designation', align: 'left' },
        { key: 'dept', label: 'Department / Subject', align: 'left' },
        { key: 'qual', label: 'Qualifications', align: 'left' },
        { key: 'phone', label: 'Contact Phone', align: 'center' },
        { key: 'email', label: 'Institutional Email', align: 'left' },
        { key: 'status', label: 'Employment Status', format: 'badge', align: 'center' },
      ];

      const data = effectiveTeachers.map(t => ({
        ...t,
        status: 'Active Full-Time',
        statusBadge: 'emerald',
      }));

      const summary = [
        { label: 'Total Faculty', value: data.length, color: 'blue', icon: '👨‍🏫' },
        { label: 'Academic Depts', value: 8, color: 'emerald', icon: '🏛️' },
        { label: 'Ph.D. / Doctorate Holders', value: 4, color: 'purple', icon: '🎓' },
        { label: 'Full-Time Ratio', value: '100%', color: 'indigo', icon: '✓' },
      ];

      return {
        title: 'Faculty & Educator Master Roster',
        subtitle: 'Comprehensive teacher directory with qualifications, departments, and roles',
        columns,
        data,
        summary,
      };
    }

    case 'teacher-workload': {
      const columns = [
        { key: 'empId', label: 'Employee ID', align: 'center' },
        { key: 'name', label: 'Faculty Name', align: 'left' },
        { key: 'dept', label: 'Department', align: 'left' },
        { key: 'assignedClasses', label: 'Classes Taught', align: 'center' },
        { key: 'weeklyPeriods', label: 'Weekly Periods', align: 'center' },
        { key: 'substitutionCount', label: 'Substitutions Covered', align: 'center' },
        { key: 'totalHours', label: 'Total Weekly Hours', align: 'center' },
        { key: 'workloadStatus', label: 'Workload Index', format: 'badge', align: 'center' },
      ];

      const data = effectiveTeachers.map((t, idx) => {
        const weeklyP = t.periods || 26;
        const sub = (idx % 3);
        const total = weeklyP + sub;
        const status = total > 28 ? 'Heavy' : total >= 24 ? 'Optimal' : 'Light';
        return {
          empId: t.empId,
          name: t.name,
          dept: t.dept,
          assignedClasses: idx % 2 === 0 ? 'Class 9, 10' : 'Class 7, 8, 9',
          weeklyPeriods: `${weeklyP} periods`,
          substitutionCount: `${sub} periods`,
          totalHours: `${(total * 0.75).toFixed(1)} hrs`,
          workloadStatus: status,
          statusBadge: status === 'Optimal' ? 'emerald' : status === 'Heavy' ? 'amber' : 'blue',
        };
      });

      const avgPeriods = (data.reduce((acc, curr) => acc + parseInt(curr.weeklyPeriods), 0) / data.length).toFixed(1);

      const summary = [
        { label: 'Faculty Evaluated', value: data.length, color: 'blue', icon: '👨‍🏫' },
        { label: 'Average Periods/Wk', value: `${avgPeriods}`, color: 'emerald', icon: '⏰' },
        { label: 'Optimal Load Ratio', value: '75%', color: 'purple', icon: '⚖️' },
        { label: 'Substitutions Covered', value: 14, color: 'indigo', icon: '⇄' },
      ];

      return {
        title: 'Teacher Teaching Workload & Allocation Report',
        subtitle: 'Weekly period distribution, classroom assignments, and teaching hours',
        columns,
        data,
        summary,
      };
    }

    case 'teacher-attendance': {
      const columns = [
        { key: 'empId', label: 'Employee ID', align: 'center' },
        { key: 'name', label: 'Faculty Name', align: 'left' },
        { key: 'dept', label: 'Department', align: 'left' },
        { key: 'workingDays', label: 'Working Days', align: 'center' },
        { key: 'presentDays', label: 'Days Present', align: 'center' },
        { key: 'casualLeave', label: 'Casual Leave', align: 'center' },
        { key: 'sickLeave', label: 'Sick Leave', align: 'center' },
        { key: 'onDuty', label: 'On-Duty (OD)', align: 'center' },
        { key: 'attendanceRate', label: 'Present Rate', format: 'progress', align: 'center' },
        { key: 'status', label: 'Attendance Standing', format: 'badge', align: 'center' },
      ];

      const totalDays = 220;
      const data = effectiveTeachers.map((t, idx) => {
        const casual = (idx % 4) + 1;
        const sick = idx === 2 ? 4 : (idx % 3);
        const od = idx % 2 === 0 ? 2 : 0;
        const absent = casual + sick;
        const present = totalDays - absent;
        const pct = ((present / totalDays) * 100).toFixed(1);
        return {
          empId: t.empId,
          name: t.name,
          dept: t.dept,
          workingDays: totalDays,
          presentDays: present,
          casualLeave: casual,
          sickLeave: sick,
          onDuty: od,
          attendanceRate: `${pct}%`,
          status: pct >= 97 ? 'Perfect' : pct >= 94 ? 'Good' : 'Satisfactory',
          statusBadge: pct >= 97 ? 'emerald' : pct >= 94 ? 'blue' : 'amber',
        };
      });

      const summary = [
        { label: 'Total Faculty Staff', value: data.length, color: 'blue', icon: '👥' },
        { label: 'Faculty Present Rate', value: '96.8%', color: 'emerald', icon: '📊' },
        { label: 'Perfect Attendance', value: 5, color: 'purple', icon: '🌟' },
        { label: 'Approved OD Leaves', value: 16, color: 'indigo', icon: '📑' },
      ];

      return {
        title: 'Faculty Attendance & Leave Register',
        subtitle: 'Working days, leave utilization, on-duty deputation, and attendance ratios',
        columns,
        data,
        summary,
      };
    }

    // =========================================================================
    // 3. ACADEMIC REPORTS
    // =========================================================================
    case 'class-performance': {
      const columns = [
        { key: 'className', label: 'Class & Section', align: 'left' },
        { key: 'classTeacher', label: 'Class Teacher', align: 'left' },
        { key: 'enrolled', label: 'Students', align: 'center' },
        { key: 'averageMarks', label: 'Class Average', format: 'progress', align: 'center' },
        { key: 'highestMarks', label: 'Top Score', align: 'center' },
        { key: 'passPercentage', label: 'Pass Rate', align: 'center' },
        { key: 'distinctionCount', label: 'Distinctions', align: 'center' },
        { key: 'topSubject', label: 'Strongest Subject', align: 'left' },
        { key: 'benchmark', label: 'Class Rating', format: 'badge', align: 'center' },
      ];

      const classesList = [
        { className: 'Class 10 - Section A', teacher: 'Dr. Rameshwar Sharma', enrolled: 42, avg: 84.6, high: 98.4, pass: '100%', dist: 18, subj: 'Mathematics', rating: 'Outstanding' },
        { className: 'Class 10 - Section B', teacher: 'Mrs. Sunita Verma', enrolled: 40, avg: 81.2, high: 96.0, pass: '97.5%', dist: 14, subj: 'English Lit.', rating: 'Excellent' },
        { className: 'Class 9 - Section A', teacher: 'Mr. Arvind Singh', enrolled: 44, avg: 79.5, high: 95.2, pass: '95.5%', dist: 12, subj: 'Science/Physics', rating: 'Very Good' },
        { className: 'Class 9 - Section B', teacher: 'Dr. Priya Mehta', enrolled: 41, avg: 77.8, high: 94.0, pass: '95.1%', dist: 10, subj: 'Chemistry', rating: 'Good' },
        { className: 'Class 8 - Section A', teacher: 'Ms. Neha Gupta', enrolled: 38, avg: 82.4, high: 97.0, pass: '100%', dist: 15, subj: 'Computer Science', rating: 'Excellent' },
        { className: 'Class 8 - Section B', teacher: 'Mr. Vikas Joshi', enrolled: 39, avg: 76.2, high: 91.5, pass: '92.3%', dist: 8, subj: 'History & Civics', rating: 'Good' },
        { className: 'Class 7 - Section A', teacher: 'Mrs. Kavita Gupta', enrolled: 36, avg: 83.1, high: 96.5, pass: '100%', dist: 13, subj: 'Hindi Literature', rating: 'Excellent' },
        { className: 'Class 7 - Section B', teacher: 'Mr. Tanmoy Das', enrolled: 37, avg: 78.4, high: 93.0, pass: '94.6%', dist: 9, subj: 'Geography', rating: 'Good' },
      ];

      const data = classesList.map(c => ({
        ...c,
        averageMarks: `${c.avg}%`,
        highestMarks: `${c.high}%`,
        benchmark: c.rating,
        statusBadge: c.rating === 'Outstanding' ? 'purple' : c.rating === 'Excellent' ? 'emerald' : 'blue',
      }));

      const summary = [
        { label: 'Classes Benchmark', value: data.length, color: 'blue', icon: '🏫' },
        { label: 'Institution Average', value: '80.4%', color: 'emerald', icon: '📊' },
        { label: 'Overall Pass Rate', value: '96.9%', color: 'purple', icon: '🎯' },
        { label: 'Total Distinctions', value: 99, color: 'indigo', icon: '⭐' },
      ];

      return {
        title: 'Class-Wise Academic Performance Benchmark',
        subtitle: 'Comparative evaluation across classes, academic averages, and distinction distribution',
        columns,
        data,
        summary,
      };
    }

    case 'subject-analysis': {
      const columns = [
        { key: 'code', label: 'Subject Code', align: 'center' },
        { key: 'name', label: 'Subject Title', align: 'left' },
        { key: 'dept', label: 'Department', align: 'left' },
        { key: 'hod', label: 'Subject Lead', align: 'left' },
        { key: 'tested', label: 'Students Tested', align: 'center' },
        { key: 'average', label: 'Average Marks', format: 'progress', align: 'center' },
        { key: 'highest', label: 'Top Mark', align: 'center' },
        { key: 'passRate', label: 'Pass Rate', align: 'center' },
        { key: 'aPlusCount', label: 'Grade A+ Count', align: 'center' },
      ];

      const subjectsList = [
        { code: 'MTH-101', name: 'Mathematics', dept: 'Science & Math', hod: 'Dr. Rameshwar Sharma', tested: 317, avg: 83.2, high: 100, pass: '97.2%', aPlus: 68 },
        { code: 'ENG-101', name: 'English Literature', dept: 'Languages', hod: 'Mrs. Sunita Verma', tested: 317, avg: 85.0, high: 98, pass: '99.1%', aPlus: 84 },
        { code: 'PHY-101', name: 'Physics & General Science', dept: 'Science & Math', hod: 'Mr. Arvind Singh', tested: 317, avg: 79.4, high: 99, pass: '95.6%', aPlus: 52 },
        { code: 'CHM-101', name: 'Chemistry', dept: 'Science & Math', hod: 'Dr. Priya Mehta', tested: 167, avg: 78.1, high: 97, pass: '94.8%', aPlus: 38 },
        { code: 'BIO-101', name: 'Biology & Life Sciences', dept: 'Science & Math', hod: 'Dr. Deepak Patel', tested: 167, avg: 82.5, high: 99, pass: '97.6%', aPlus: 46 },
        { code: 'CMP-101', name: 'Computer Science & AI', dept: 'Information Tech.', hod: 'Ms. Neha Gupta', tested: 317, avg: 88.6, high: 100, pass: '100%', aPlus: 112 },
        { code: 'HIN-101', name: 'Hindi Literature', dept: 'Languages', hod: 'Mrs. Kavita Gupta', tested: 317, avg: 81.3, high: 96, pass: '98.4%', aPlus: 61 },
        { code: 'SST-101', name: 'Social Studies & Civics', dept: 'Humanities', hod: 'Mr. Vikas Joshi', tested: 317, avg: 76.8, high: 95, pass: '93.7%', aPlus: 34 },
      ];

      const data = subjectsList.map(s => ({
        ...s,
        average: `${s.avg}%`,
        highest: `${s.high}/100`,
        aPlusCount: `${s.aPlus} (${((s.aPlus / s.tested) * 100).toFixed(1)}%)`,
      }));

      const summary = [
        { label: 'Subjects Evaluated', value: data.length, color: 'blue', icon: '📚' },
        { label: 'Top Scoring Subject', value: 'Computer Science (88.6%)', color: 'emerald', icon: '💻' },
        { label: 'Average Pass Rate', value: '97.1%', color: 'purple', icon: '🎯' },
        { label: 'Grade A+ Awarded', value: 495, color: 'indigo', icon: '⭐' },
      ];

      return {
        title: 'Subject-Wise Academic Performance Analysis',
        subtitle: 'Subject departmental averages, highest scores, pass ratios, and grade counts',
        columns,
        data,
        summary,
      };
    }

    case 'exam-results': {
      const columns = [
        { key: 'roll', label: 'Roll No', align: 'center' },
        { key: 'name', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'examTitle', label: 'Exam Session', align: 'center' },
        { key: 'scored', label: 'Marks Scored', align: 'center' },
        { key: 'maxMarks', label: 'Max Marks', align: 'center' },
        { key: 'percentage', label: 'Percentage', format: 'progress', align: 'center' },
        { key: 'grade', label: 'Grade', format: 'badge', align: 'center' },
        { key: 'rank', label: 'Merit Rank', align: 'center' },
      ];

      const data = filteredStudents.map((s, idx) => {
        const scored = 475 - (idx * 11) % 95;
        const max = 500;
        const pct = ((scored / max) * 100).toFixed(1);
        const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : 'C';
        return {
          roll: s.roll,
          name: s.name,
          classSection: `${s.class}-${s.section}`,
          examTitle: 'Term 1 Mid-Term Examination',
          scored,
          maxMarks: max,
          percentage: `${pct}%`,
          numericPct: parseFloat(pct),
          grade,
          rank: `#${idx + 1}`,
          statusBadge: grade === 'A+' ? 'purple' : grade === 'A' ? 'emerald' : grade === 'B+' ? 'blue' : 'amber',
        };
      }).sort((a, b) => b.numericPct - a.numericPct)
        .map((row, rankIdx) => ({ ...row, rank: `#${rankIdx + 1}` }));

      const summary = [
        { label: 'Candidates Appeared', value: data.length, color: 'blue', icon: '📝' },
        { label: 'Passing Candidates', value: data.length, color: 'emerald', icon: '✓' },
        { label: 'Grade A+ Performers', value: data.filter(d => d.grade === 'A+').length, color: 'purple', icon: '🌟' },
        { label: 'Session Average', value: '82.6%', color: 'indigo', icon: '📈' },
      ];

      return {
        title: 'Comprehensive Examination Marksheet & Results',
        subtitle: 'Term examination result ledger, grade determination, and institutional merit ranking',
        columns,
        data,
        summary,
      };
    }

    case 'grade-distribution': {
      const columns = [
        { key: 'grade', label: 'Letter Grade', format: 'badge', align: 'center' },
        { key: 'scoreRange', label: 'Marks Score Range', align: 'center' },
        { key: 'gradePoint', label: 'Grade Point', align: 'center' },
        { key: 'studentCount', label: 'Students Count', align: 'center' },
        { key: 'cohortPct', label: 'Percentage of Cohort', format: 'progress', align: 'center' },
        { key: 'standing', label: 'Academic Standing', align: 'left' },
        { key: 'action', label: 'Academic Recommendation', align: 'left' },
      ];

      const distributions = [
        { grade: 'A+', scoreRange: '90% - 100%', gradePoint: '10.0', count: 72, pct: '22.7%', standing: 'Outstanding Excellence', action: 'Nominate for Academic Honors & Olympiads', badge: 'purple' },
        { grade: 'A', scoreRange: '80% - 89%', gradePoint: '9.0', count: 114, pct: '36.0%', standing: 'Very Good Performance', action: 'Advanced learning coursework', badge: 'emerald' },
        { grade: 'B+', scoreRange: '70% - 79%', gradePoint: '8.0', count: 78, pct: '24.6%', standing: 'Good Competency', action: 'Targeted practice in weaker subjects', badge: 'blue' },
        { grade: 'B', scoreRange: '60% - 69%', gradePoint: '7.0', count: 36, pct: '11.4%', standing: 'Above Average', action: 'Weekly remedial study groups', badge: 'cyan' },
        { grade: 'C', scoreRange: '50% - 59%', gradePoint: '6.0', count: 14, pct: '4.4%', standing: 'Average Passing', action: 'Personalized mentoring sessions', badge: 'amber' },
        { grade: 'D', scoreRange: '40% - 49%', gradePoint: '5.0', count: 3, pct: '0.9%', standing: 'Needs Improvement', action: 'Mandatory remedial tutorial', badge: 'orange' },
        { grade: 'F', scoreRange: 'Below 40%', gradePoint: '0.0', count: 0, pct: '0.0%', standing: 'Remedial / Retest Required', action: 'Parent conference & remediation plan', badge: 'rose' },
      ];

      const data = distributions.map(d => ({
        grade: d.grade,
        scoreRange: d.scoreRange,
        gradePoint: d.gradePoint,
        studentCount: d.count,
        cohortPct: d.pct,
        standing: d.standing,
        action: d.action,
        statusBadge: d.badge,
      }));

      const summary = [
        { label: 'Cohort Size Evaluated', value: 317, color: 'blue', icon: '👥' },
        { label: 'Distinction Ratio (A+/A)', value: '58.7%', color: 'emerald', icon: '🌟' },
        { label: 'Average Grade Point', value: '8.6 / 10', color: 'purple', icon: '📊' },
        { label: 'Remedial Need (<50%)', value: '0.9%', color: 'amber', icon: '⚠️' },
      ];

      return {
        title: 'Institutional Grade Distribution & Bell Curve Analysis',
        subtitle: 'Cohort percentage spread across academic grading tiers and intervention requirements',
        columns,
        data,
        summary,
      };
    }

    // =========================================================================
    // 4. ATTENDANCE REPORTS
    // =========================================================================
    case 'daily-attendance': {
      const columns = [
        { key: 'className', label: 'Class & Section', align: 'left' },
        { key: 'classTeacher', label: 'Class Teacher', align: 'left' },
        { key: 'totalStrength', label: 'Total Enrolled', align: 'center' },
        { key: 'present', label: 'Present Today', align: 'center' },
        { key: 'absent', label: 'Absent Today', align: 'center' },
        { key: 'late', label: 'Late Marked', align: 'center' },
        { key: 'onLeave', label: 'Approved Leave', align: 'center' },
        { key: 'rate', label: 'Today\'s Attendance %', format: 'progress', align: 'center' },
        { key: 'status', label: 'Roll Call Status', format: 'badge', align: 'center' },
      ];

      const classRoll = [
        { className: 'Class 10 - Section A', teacher: 'Dr. Rameshwar Sharma', total: 42, p: 40, a: 1, l: 1, leave: 0, badge: 'emerald' },
        { className: 'Class 10 - Section B', teacher: 'Mrs. Sunita Verma', total: 40, p: 38, a: 2, l: 0, leave: 0, badge: 'emerald' },
        { className: 'Class 9 - Section A', teacher: 'Mr. Arvind Singh', total: 44, p: 42, a: 1, l: 2, leave: 1, badge: 'emerald' },
        { className: 'Class 9 - Section B', teacher: 'Dr. Priya Mehta', total: 41, p: 39, a: 1, l: 1, leave: 1, badge: 'emerald' },
        { className: 'Class 8 - Section A', teacher: 'Ms. Neha Gupta', total: 38, p: 38, a: 0, l: 0, leave: 0, badge: 'purple' },
        { className: 'Class 8 - Section B', teacher: 'Mr. Vikas Joshi', total: 39, p: 36, a: 2, l: 1, leave: 1, badge: 'emerald' },
        { className: 'Class 7 - Section A', teacher: 'Mrs. Kavita Gupta', total: 36, p: 35, a: 1, l: 0, leave: 0, badge: 'emerald' },
        { className: 'Class 7 - Section B', teacher: 'Mr. Tanmoy Das', total: 37, p: 34, a: 2, l: 2, leave: 1, badge: 'blue' },
      ];

      const data = classRoll.map(c => {
        const rate = ((c.p / c.total) * 100).toFixed(1);
        return {
          className: c.className,
          classTeacher: c.teacher,
          totalStrength: c.total,
          present: c.p,
          absent: c.a,
          late: c.l,
          onLeave: c.leave,
          rate: `${rate}%`,
          status: c.a === 0 ? '100% Full Attendance' : 'Completed & Verified',
          statusBadge: c.badge,
        };
      });

      const totalStudents = classRoll.reduce((acc, c) => acc + c.total, 0);
      const totalPresent = classRoll.reduce((acc, c) => acc + c.p, 0);
      const totalAbsent = classRoll.reduce((acc, c) => acc + c.a, 0);

      const summary = [
        { label: 'Campus Attendance Today', value: `${((totalPresent / totalStudents) * 100).toFixed(1)}%`, color: 'emerald', icon: '📊' },
        { label: 'Total Present Today', value: `${totalPresent} / ${totalStudents}`, color: 'blue', icon: '✓' },
        { label: 'Total Absentees Today', value: totalAbsent, color: 'rose', icon: '⚠️' },
        { label: 'Perfect Classrooms', value: 1, color: 'purple', icon: '🌟' },
      ];

      return {
        title: 'Daily Campus Roll Call & Attendance Report',
        subtitle: `Real-time daily roll call snapshot for today (${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })})`,
        columns,
        data,
        summary,
      };
    }

    case 'monthly-attendance': {
      const columns = [
        { key: 'month', label: 'Calendar Month', align: 'left' },
        { key: 'schoolDays', label: 'School Days', align: 'center' },
        { key: 'studentRate', label: 'Student Attendance %', format: 'progress', align: 'center' },
        { key: 'staffRate', label: 'Faculty Attendance %', align: 'center' },
        { key: 'peakDay', label: 'Peak Attendance Date', align: 'center' },
        { key: 'lowestDay', label: 'Lowest Attendance Date', align: 'center' },
        { key: 'trend', label: 'Monthly Trend', format: 'badge', align: 'center' },
      ];

      const months = [
        { month: 'April 2024 (Session Start)', days: 22, studentRate: '96.2%', staffRate: '98.5%', peak: '12 April (98.9%)', low: '29 April (92.4%)', trend: 'Peak Intake', badge: 'emerald' },
        { month: 'May 2024', days: 20, studentRate: '94.8%', staffRate: '97.2%', peak: '03 May (97.5%)', low: '18 May (91.1%)', trend: 'Stable', badge: 'blue' },
        { month: 'July 2024 (Post Vacation)', days: 24, studentRate: '93.5%', staffRate: '96.8%', peak: '08 July (96.4%)', low: '22 July (89.2%)', trend: 'Monsoon Dip', badge: 'amber' },
        { month: 'August 2024', days: 22, studentRate: '95.1%', staffRate: '97.4%', peak: '14 August (98.2%)', low: '28 August (93.0%)', trend: 'Improving', badge: 'emerald' },
        { month: 'September 2024 (Midterms)', days: 23, studentRate: '97.4%', staffRate: '99.0%', peak: '16 September (99.1%)', low: '02 September (94.5%)', trend: 'High Punctuality', badge: 'purple' },
        { month: 'October 2024', days: 19, studentRate: '94.0%', staffRate: '96.5%', peak: '07 October (96.8%)', low: '24 October (88.6%)', trend: 'Festival Break', badge: 'amber' },
      ];

      const data = months.map(m => ({
        ...m,
        statusBadge: m.badge,
      }));

      const summary = [
        { label: 'Evaluation Period', value: '6 Months', color: 'blue', icon: '📅' },
        { label: 'Cumulative Student Rate', value: '95.2%', color: 'emerald', icon: '📈' },
        { label: 'Cumulative Faculty Rate', value: '97.6%', color: 'purple', icon: '👨‍🏫' },
        { label: 'Peak Month', value: 'September (97.4%)', color: 'indigo', icon: '🌟' },
      ];

      return {
        title: 'Monthly Attendance Trend & Pattern Analysis',
        subtitle: 'Month-over-month student and faculty attendance comparisons across sessions',
        columns,
        data,
        summary,
      };
    }

    case 'low-attendance': {
      const columns = [
        { key: 'roll', label: 'Roll No', align: 'center' },
        { key: 'name', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'totalDays', label: 'Working Days', align: 'center' },
        { key: 'absentDays', label: 'Total Absences', align: 'center' },
        { key: 'attendanceRate', label: 'Attendance %', format: 'progress', align: 'center' },
        { key: 'parent', label: 'Parent / Guardian', align: 'left' },
        { key: 'phone', label: 'Parent Phone', align: 'center' },
        { key: 'noticeStatus', label: 'Statutory Action Stage', format: 'badge', align: 'center' },
      ];

      // Flag students with attendance < 75%
      const flagged = [
        { roll: '104', name: 'Ishaan Verma', classSection: 'Class 10 - B', total: 180, absent: 48, rate: '73.3%', parent: 'Sunil Verma', phone: '+91 98765 22007', stage: 'Warning Notice 1 Issued', badge: 'amber' },
        { roll: '108', name: 'Kabir Sen', classSection: 'Class 9 - B', total: 180, absent: 52, rate: '71.1%', parent: 'Subhash Sen', phone: '+91 98765 22015', stage: 'Warning Notice 2 Dispatched', badge: 'orange' },
        { roll: '112', name: 'Devendra Joshi', classSection: 'Class 7 - B', total: 180, absent: 64, rate: '64.4%', parent: 'Girish Joshi', phone: '+91 98765 22023', stage: 'Parent Meeting Scheduled', badge: 'rose' },
      ];

      const data = flagged.map(f => ({
        roll: f.roll,
        name: f.name,
        classSection: f.classSection,
        totalDays: f.total,
        absentDays: f.absent,
        attendanceRate: f.rate,
        parent: f.parent,
        phone: f.phone,
        noticeStatus: f.stage,
        statusBadge: f.badge,
      }));

      const summary = [
        { label: 'Defaulters (<75%)', value: data.length, color: 'rose', icon: '⚠️' },
        { label: 'Critical (<65%)', value: 1, color: 'orange', icon: '🚨' },
        { label: 'Parent Conferences', value: 1, color: 'blue', icon: '📞' },
        { label: 'Statutory Requirement', value: '75.0% Min', color: 'indigo', icon: '⚖️' },
      ];

      return {
        title: 'Low Attendance Alert & Statutory Warning Roster',
        subtitle: 'Students falling below the mandatory CBSE / state 75% attendance threshold',
        columns,
        data,
        summary,
      };
    }

    case 'attendance-trends': {
      const columns = [
        { key: 'day', label: 'Day of Week', align: 'left' },
        { key: 'studentAttendance', label: 'Average Present %', format: 'progress', align: 'center' },
        { key: 'lateArrivals', label: 'Late Arrival Rate', align: 'center' },
        { key: 'bestSection', label: 'Top Performing Class', align: 'left' },
        { key: 'behaviorIndex', label: 'Punctuality Index', format: 'badge', align: 'center' },
      ];

      const days = [
        { day: 'Monday', studentAttendance: '93.8%', lateArrivals: '4.2%', best: 'Class 10 - Section A (98.2%)', index: 'Good', badge: 'blue' },
        { day: 'Tuesday', studentAttendance: '96.4%', lateArrivals: '2.1%', best: 'Class 8 - Section A (98.8%)', index: 'High Punctuality', badge: 'emerald' },
        { day: 'Wednesday', studentAttendance: '96.9%', lateArrivals: '1.8%', best: 'Class 7 - Section A (99.0%)', index: 'Peak Attendance', badge: 'purple' },
        { day: 'Thursday', studentAttendance: '95.5%', lateArrivals: '2.4%', best: 'Class 10 - Section B (97.4%)', index: 'Very Good', badge: 'emerald' },
        { day: 'Friday', studentAttendance: '94.2%', lateArrivals: '3.1%', best: 'Class 9 - Section A (96.5%)', index: 'Good', badge: 'blue' },
        { day: 'Saturday', studentAttendance: '91.8%', lateArrivals: '5.6%', best: 'Class 8 - Section B (94.2%)', index: 'Weekend Dip', badge: 'amber' },
      ];

      const data = days.map(d => ({
        ...d,
        behaviorIndex: d.index,
        statusBadge: d.badge,
      }));

      const summary = [
        { label: 'Best Attended Day', value: 'Wednesday (96.9%)', color: 'purple', icon: '🌟' },
        { label: 'Lowest Attendance Day', value: 'Saturday (91.8%)', color: 'amber', icon: '📉' },
        { label: 'Avg Weekly Attendance', value: '94.8%', color: 'emerald', icon: '📊' },
        { label: 'Average Late Arrivals', value: '3.2%', color: 'blue', icon: '⏰' },
      ];

      return {
        title: 'Weekly Attendance Trends & Roll-Call Patterns',
        subtitle: 'Analysis of day-of-the-week attendance trends, arrival punctuality, and anomalies',
        columns,
        data,
        summary,
      };
    }

    // =========================================================================
    // 5. FINANCIAL REPORTS
    // =========================================================================
    case 'fee-collection': {
      const columns = [
        { key: 'receiptNo', label: 'Receipt ID', align: 'center' },
        { key: 'date', label: 'Payment Date', align: 'center' },
        { key: 'studentName', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'feeHead', label: 'Fee Category', align: 'left' },
        { key: 'amount', label: 'Amount Collected', align: 'right' },
        { key: 'mode', label: 'Payment Mode', format: 'badge', align: 'center' },
        { key: 'cashier', label: 'Authorized By', align: 'left' },
      ];

      const payments = (liveData.feePayments && liveData.feePayments.length > 0)
        ? liveData.feePayments.map((p, idx) => ({
            receiptNo: p.receipt_number || `REC-2024-${String(1001 + idx)}`,
            date: p.payment_date || '2024-05-12',
            studentName: p.student?.first_name ? `${p.student.first_name} ${p.student.last_name || ''}`.trim() : (DEFAULT_STUDENTS[idx % DEFAULT_STUDENTS.length]?.name || 'Student'),
            classSection: p.student?.class?.name || 'Class 10-A',
            feeHead: p.fee_structure?.name || (idx % 2 === 0 ? 'Term 1 Tuition Fee' : 'Annual Development Fee'),
            amount: formatCurrency(p.amount || 25000),
            rawAmount: Number(p.amount || 25000),
            mode: p.payment_method || (idx % 3 === 0 ? 'UPI' : idx % 3 === 1 ? 'Net Banking' : 'Cash'),
            cashier: 'Accounts Desk 1',
          }))
        : [
            { receiptNo: 'REC-2024-1001', date: '2024-05-12', studentName: 'Aarav Sharma', classSection: 'Class 10-A', feeHead: 'Term 1 Tuition Fee', amount: formatCurrency(25000), rawAmount: 25000, mode: 'UPI', cashier: 'Accounts Desk 1' },
            { receiptNo: 'REC-2024-1002', date: '2024-05-12', studentName: 'Ananya Patel', classSection: 'Class 10-A', feeHead: 'Term 1 Tuition Fee', amount: formatCurrency(25000), rawAmount: 25000, mode: 'Net Banking', cashier: 'Accounts Desk 2' },
            { receiptNo: 'REC-2024-1003', date: '2024-05-11', studentName: 'Vihaan Deshmukh', classSection: 'Class 10-A', feeHead: 'Science Lab & Tech Fee', amount: formatCurrency(8000), rawAmount: 8000, mode: 'Credit Card', cashier: 'Accounts Desk 1' },
            { receiptNo: 'REC-2024-1004', date: '2024-05-10', studentName: 'Rohan Gupta', classSection: 'Class 9-A', feeHead: 'Annual Development Fee', amount: formatCurrency(15000), rawAmount: 15000, mode: 'Cash', cashier: 'Fee Counter 1' },
            { receiptNo: 'REC-2024-1005', date: '2024-05-10', studentName: 'Saanvi Kulkarni', classSection: 'Class 9-A', feeHead: 'Term 1 Tuition Fee', amount: formatCurrency(22500), rawAmount: 22500, mode: 'UPI', cashier: 'Accounts Desk 1' },
            { receiptNo: 'REC-2024-1006', date: '2024-05-09', studentName: 'Myra Das', classSection: 'Class 8-A', feeHead: 'School Transport Fee', amount: formatCurrency(12000), rawAmount: 12000, mode: 'Net Banking', cashier: 'Accounts Desk 2' },
            { receiptNo: 'REC-2024-1007', date: '2024-05-08', studentName: 'Arjun Reddy', classSection: 'Class 8-B', feeHead: 'Term 1 Tuition Fee', amount: formatCurrency(20000), rawAmount: 20000, mode: 'UPI', cashier: 'Accounts Desk 1' },
            { receiptNo: 'REC-2024-1008', date: '2024-05-08', studentName: 'Zara Khan', classSection: 'Class 7-A', feeHead: 'Term 1 Tuition Fee', amount: formatCurrency(18500), rawAmount: 18500, mode: 'Cash', cashier: 'Fee Counter 1' },
          ];

      const data = payments.map(p => ({
        ...p,
        statusBadge: p.mode === 'UPI' ? 'emerald' : p.mode === 'Net Banking' ? 'purple' : p.mode === 'Cash' ? 'amber' : 'blue',
      }));

      const totalCollection = data.reduce((acc, c) => acc + c.rawAmount, 0);
      const upiTotal = data.filter(d => d.mode === 'UPI').reduce((acc, c) => acc + c.rawAmount, 0);

      const summary = [
        { label: 'Total Inflow Realized', value: formatCurrency(totalCollection), color: 'emerald', icon: '💰' },
        { label: 'Transactions Processed', value: data.length, color: 'blue', icon: '🧾' },
        { label: 'UPI Digital Payments', value: formatCurrency(upiTotal), color: 'purple', icon: '📱' },
        { label: 'Cash Counter Inflow', value: formatCurrency(data.filter(d => d.mode === 'Cash').reduce((acc, c) => acc + c.rawAmount, 0)), color: 'amber', icon: '💵' },
      ];

      return {
        title: 'Fee Collection & Daily Cash Ledger Report',
        subtitle: 'Chronological payment receipt register with payment modes and authorization records',
        columns,
        data,
        summary,
      };
    }

    case 'pending-fees': {
      const columns = [
        { key: 'adm', label: 'Admission No', align: 'center' },
        { key: 'studentName', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'feeType', label: 'Fee Category', align: 'left' },
        { key: 'totalPayable', label: 'Invoiced Amount', align: 'right' },
        { key: 'paidSoFar', label: 'Amount Paid', align: 'right' },
        { key: 'dueAmount', label: 'Balance Outstanding', align: 'right' },
        { key: 'dueDate', label: 'Due Date', align: 'center' },
        { key: 'aging', label: 'Overdue Aging', format: 'badge', align: 'center' },
      ];

      const pending = [
        { adm: 'ADM2026004', studentName: 'Ishaan Verma', classSection: 'Class 10-B', feeType: 'Term 1 Tuition Fee', inv: 35000, paid: 15000, due: 20000, dueDate: '2024-04-15', aging: '31-60 Days Overdue', badge: 'amber' },
        { adm: 'ADM2026008', studentName: 'Kabir Sen', classSection: 'Class 9-B', feeType: 'Term 1 Tuition Fee', inv: 32000, paid: 10000, due: 22000, dueDate: '2024-04-15', aging: '31-60 Days Overdue', badge: 'amber' },
        { adm: 'ADM2026012', studentName: 'Devendra Joshi', classSection: 'Class 7-B', feeType: 'Annual Composite Fee', inv: 28000, paid: 0, due: 28000, dueDate: '2024-03-31', aging: '60+ Days Critical', badge: 'rose' },
        { adm: 'ADM2026002', studentName: 'Ananya Patel', classSection: 'Class 10-A', feeType: 'School Bus Transport', inv: 12000, paid: 6000, due: 6000, dueDate: '2024-05-15', aging: '0-30 Days Current', badge: 'blue' },
      ];

      const data = pending.map(p => ({
        ...p,
        totalPayable: formatCurrency(p.inv),
        paidSoFar: formatCurrency(p.paid),
        dueAmount: formatCurrency(p.due),
        rawDue: p.due,
        statusBadge: p.badge,
      }));

      const totalOverdue = data.reduce((acc, c) => acc + c.rawDue, 0);

      const summary = [
        { label: 'Total Receivables Due', value: formatCurrency(totalOverdue), color: 'rose', icon: '⏳' },
        { label: 'Pending Student Invoices', value: data.length, color: 'amber', icon: '📑' },
        { label: 'Critical Overdue (>60d)', value: formatCurrency(28000), color: 'orange', icon: '🚨' },
        { label: 'Average Outstanding', value: formatCurrency(Math.round(totalOverdue / (data.length || 1))), color: 'purple', icon: '⚖️' },
      ];

      return {
        title: 'Outstanding & Pending Fees Receivable Report',
        subtitle: 'Inventory of uncollected student dues, aging brackets, and payment due schedules',
        columns,
        data,
        summary,
      };
    }

    case 'fee-defaulters': {
      const columns = [
        { key: 'adm', label: 'Admission No', align: 'center' },
        { key: 'studentName', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'overdueAmount', label: 'Total Arrears', align: 'right' },
        { key: 'duration', label: 'Default Duration', align: 'center' },
        { key: 'parent', label: 'Father / Guardian', align: 'left' },
        { key: 'phone', label: 'Contact Phone', align: 'center' },
        { key: 'noticeStage', label: 'Notice Status', format: 'badge', align: 'center' },
      ];

      const defaulters = [
        { adm: 'ADM2026012', studentName: 'Devendra Joshi', classSection: 'Class 7-B', amount: 28000, duration: '75 Days Overdue', parent: 'Girish Joshi', phone: '+91 98765 22023', stage: 'Final Notice Sent', badge: 'rose' },
        { adm: 'ADM2026008', studentName: 'Kabir Sen', classSection: 'Class 9-B', amount: 22000, duration: '48 Days Overdue', parent: 'Subhash Sen', phone: '+91 98765 22015', stage: 'Reminder Notice 2', badge: 'orange' },
        { adm: 'ADM2026004', studentName: 'Ishaan Verma', classSection: 'Class 10-B', amount: 20000, duration: '45 Days Overdue', parent: 'Sunil Verma', phone: '+91 98765 22007', stage: 'Reminder Notice 1', badge: 'amber' },
      ];

      const data = defaulters.map(d => ({
        ...d,
        overdueAmount: formatCurrency(d.amount),
        rawAmount: d.amount,
        statusBadge: d.badge,
      }));

      const totalDefaulterAmount = data.reduce((acc, c) => acc + c.rawAmount, 0);

      const summary = [
        { label: 'Critical Defaulters', value: data.length, color: 'rose', icon: '🚨' },
        { label: 'Total Defaulted Arrears', value: formatCurrency(totalDefaulterAmount), color: 'orange', icon: '💸' },
        { label: 'Final Notices Dispatched', value: 1, color: 'purple', icon: '📬' },
        { label: 'Action Recovery Rate', value: '45.0%', color: 'blue', icon: '🔄' },
      ];

      return {
        title: 'Fee Defaulters & Arrears Collection Escalation',
        subtitle: 'High-risk non-payment accounts (>45 days overdue) with contact details and notice escalation',
        columns,
        data,
        summary,
      };
    }

    case 'revenue-analysis': {
      const columns = [
        { key: 'stream', label: 'Revenue Stream / Head', align: 'left' },
        { key: 'budgeted', label: 'Annual Budget Target', align: 'right' },
        { key: 'collected', label: 'Realized Revenue', align: 'right' },
        { key: 'variance', label: 'Outstanding Balance', align: 'right' },
        { key: 'efficiency', label: 'Collection Efficiency', format: 'progress', align: 'center' },
        { key: 'growth', label: 'Growth vs Last Year', format: 'badge', align: 'center' },
      ];

      const streams = [
        { stream: 'Core Tuition Fees', budget: 14200000, collected: 13150000, growth: '+12.4%', badge: 'emerald' },
        { stream: 'Campus Transport Services', budget: 3200000, collected: 2950000, growth: '+8.6%', badge: 'emerald' },
        { stream: 'Science & Computer Lab Fees', budget: 1800000, collected: 1720000, growth: '+15.2%', badge: 'emerald' },
        { stream: 'Admission & Enrollment Fees', budget: 1200000, collected: 1200000, growth: '+18.0%', badge: 'purple' },
        { stream: 'Examination & Certification', budget: 950000, collected: 890000, growth: '+6.1%', badge: 'blue' },
        { stream: 'Library, Sports & Co-Curricular', budget: 850000, collected: 790000, growth: '+9.5%', badge: 'blue' },
      ];

      const data = streams.map(s => {
        const eff = ((s.collected / s.budget) * 100).toFixed(1);
        const variance = s.budget - s.collected;
        return {
          stream: s.stream,
          budgeted: formatCurrency(s.budget),
          collected: formatCurrency(s.collected),
          variance: formatCurrency(variance),
          rawBudget: s.budget,
          rawCollected: s.collected,
          efficiency: `${eff}%`,
          growth: s.growth,
          statusBadge: s.badge,
        };
      });

      const totalBudget = data.reduce((acc, c) => acc + c.rawBudget, 0);
      const totalCollected = data.reduce((acc, c) => acc + c.rawCollected, 0);

      const summary = [
        { label: 'Total Annual Revenue', value: formatCurrency(totalCollected), color: 'emerald', icon: '💰' },
        { label: 'Budget Target', value: formatCurrency(totalBudget), color: 'blue', icon: '🎯' },
        { label: 'Overall Efficiency', value: `${((totalCollected / totalBudget) * 100).toFixed(1)}%`, color: 'purple', icon: '📈' },
        { label: 'YoY Growth Rate', value: '+11.8%', color: 'indigo', icon: '🚀' },
      ];

      return {
        title: 'Institutional Revenue & Budget Realization Analysis',
        subtitle: 'Comprehensive financial stream breakdown, collection efficiency, and budget comparison',
        columns,
        data,
        summary,
      };
    }

    // =========================================================================
    // 6. ASSIGNMENT REPORTS
    // =========================================================================
    case 'assignment-submission': {
      const columns = [
        { key: 'title', label: 'Assignment Title', align: 'left' },
        { key: 'subject', label: 'Subject', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'teacher', label: 'Educator', align: 'left' },
        { key: 'dueDate', label: 'Due Date', align: 'center' },
        { key: 'assignedCount', label: 'Assigned', align: 'center' },
        { key: 'submittedCount', label: 'Submitted', align: 'center' },
        { key: 'rate', label: 'Submission Rate %', format: 'progress', align: 'center' },
        { key: 'status', label: 'Delivery Status', format: 'badge', align: 'center' },
      ];

      const assignments = [
        { title: 'Quadratic Equations Practice Set', subject: 'Mathematics', classSection: 'Class 10-A', teacher: 'Dr. Rameshwar Sharma', dueDate: '2024-05-18', assigned: 42, submitted: 40, badge: 'emerald' },
        { title: 'Shakespearean Sonnet Critical Essay', subject: 'English Lit.', classSection: 'Class 10-B', teacher: 'Mrs. Sunita Verma', dueDate: '2024-05-16', assigned: 40, submitted: 37, badge: 'emerald' },
        { title: 'Electromagnetic Induction Lab Log', subject: 'Physics', classSection: 'Class 10-A', teacher: 'Mr. Arvind Singh', dueDate: '2024-05-15', assigned: 42, submitted: 41, badge: 'purple' },
        { title: 'Organic Carbon Compounds Worksheet', subject: 'Chemistry', classSection: 'Class 9-A', teacher: 'Dr. Priya Mehta', dueDate: '2024-05-14', assigned: 44, submitted: 38, badge: 'blue' },
        { title: 'Python Recursion & Algorithmic Logic', subject: 'Computer Science', classSection: 'Class 9-B', teacher: 'Ms. Neha Gupta', dueDate: '2024-05-12', assigned: 41, submitted: 41, badge: 'purple' },
        { title: 'Indian Independence Movement Timeline', subject: 'History', classSection: 'Class 8-A', teacher: 'Mr. Vikas Joshi', dueDate: '2024-05-10', assigned: 38, submitted: 34, badge: 'amber' },
      ];

      const data = assignments.map(a => {
        const rate = ((a.submitted / a.assigned) * 100).toFixed(1);
        return {
          ...a,
          rate: `${rate}%`,
          status: a.submitted === a.assigned ? '100% Complete' : `${a.assigned - a.submitted} Pending`,
          statusBadge: a.badge,
        };
      });

      const totalAssigned = assignments.reduce((acc, c) => acc + c.assigned, 0);
      const totalSubmitted = assignments.reduce((acc, c) => acc + c.submitted, 0);

      const summary = [
        { label: 'Active Tasks Tracked', value: data.length, color: 'blue', icon: '📝' },
        { label: 'Overall Completion Rate', value: `${((totalSubmitted / totalAssigned) * 100).toFixed(1)}%`, color: 'emerald', icon: '📊' },
        { label: 'Total Submissions', value: `${totalSubmitted} / ${totalAssigned}`, color: 'purple', icon: '✓' },
        { label: 'Fully Completed Tasks', value: 2, color: 'indigo', icon: '🌟' },
      ];

      return {
        title: 'Assignment & Homework Submission Compliance',
        subtitle: 'Student homework completion ratios, delivery punctuality, and submission tracking',
        columns,
        data,
        summary,
      };
    }

    case 'pending-assignments': {
      const columns = [
        { key: 'title', label: 'Assignment Title', align: 'left' },
        { key: 'subject', label: 'Subject', align: 'left' },
        { key: 'studentName', label: 'Student Name', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'dueDate', label: 'Due Date', align: 'center' },
        { key: 'daysLate', label: 'Days Overdue', align: 'center' },
        { key: 'teacher', label: 'Assigned Teacher', align: 'left' },
        { key: 'status', label: 'Escalation Status', format: 'badge', align: 'center' },
      ];

      const pending = [
        { title: 'Indian Independence Movement Timeline', subject: 'History', studentName: 'Arjun Reddy', classSection: 'Class 8-B', dueDate: '2024-05-10', daysLate: '8 days', teacher: 'Mr. Vikas Joshi', status: 'Late Penalty Applicable', badge: 'rose' },
        { title: 'Organic Carbon Compounds Worksheet', subject: 'Chemistry', studentName: 'Kabir Sen', classSection: 'Class 9-B', dueDate: '2024-05-14', daysLate: '4 days', teacher: 'Dr. Priya Mehta', status: 'Reminder Sent to Student', badge: 'amber' },
        { title: 'Shakespearean Sonnet Critical Essay', subject: 'English Lit.', studentName: 'Ishaan Verma', classSection: 'Class 10-B', dueDate: '2024-05-16', daysLate: '2 days', teacher: 'Mrs. Sunita Verma', status: 'Grace Period Active', badge: 'blue' },
      ];

      const data = pending.map(p => ({
        ...p,
        statusBadge: p.badge,
      }));

      const summary = [
        { label: 'Pending Submissions', value: data.length, color: 'rose', icon: '⏳' },
        { label: 'Critical Overdue (>5d)', value: 1, color: 'orange', icon: '⚠️' },
        { label: 'Grace Period Submissions', value: 1, color: 'blue', icon: '⏰' },
        { label: 'Follow-Up Notices', value: 2, color: 'purple', icon: '📬' },
      ];

      return {
        title: 'Pending & Overdue Homework Assignments',
        subtitle: 'Student submissions past deadline requiring educator intervention and grading follow-up',
        columns,
        data,
        summary,
      };
    }

    case 'assignment-performance': {
      const columns = [
        { key: 'title', label: 'Assignment Title', align: 'left' },
        { key: 'subject', label: 'Subject', align: 'left' },
        { key: 'classSection', label: 'Class', align: 'center' },
        { key: 'maxScore', label: 'Max Marks', align: 'center' },
        { key: 'avgScore', label: 'Average Score', format: 'progress', align: 'center' },
        { key: 'highScore', label: 'Top Score', align: 'center' },
        { key: 'lowScore', label: 'Lowest Score', align: 'center' },
        { key: 'evaluatedCount', label: 'Evaluated', align: 'center' },
        { key: 'quality', label: 'Cohort Quality', format: 'badge', align: 'center' },
      ];

      const evaluations = [
        { title: 'Quadratic Equations Practice Set', subject: 'Mathematics', classSection: 'Class 10-A', max: 50, avg: 43.5, high: 50, low: 28, count: '40 / 40 (100%)', quality: 'Exemplary', badge: 'purple' },
        { title: 'Shakespearean Sonnet Critical Essay', subject: 'English Lit.', classSection: 'Class 10-B', max: 50, avg: 41.2, high: 49, low: 31, count: '37 / 37 (100%)', quality: 'Very Good', badge: 'emerald' },
        { title: 'Electromagnetic Induction Lab Log', subject: 'Physics', classSection: 'Class 10-A', max: 25, avg: 22.8, high: 25, low: 17, count: '41 / 41 (100%)', quality: 'Excellent', badge: 'emerald' },
        { title: 'Python Recursion & Algorithmic Logic', subject: 'Computer Science', classSection: 'Class 9-B', max: 50, avg: 46.2, high: 50, low: 35, count: '41 / 41 (100%)', quality: 'Outstanding', badge: 'purple' },
        { title: 'Organic Carbon Compounds Worksheet', subject: 'Chemistry', classSection: 'Class 9-A', max: 30, avg: 23.4, high: 30, low: 15, count: '38 / 38 (100%)', quality: 'Good', badge: 'blue' },
      ];

      const data = evaluations.map(e => ({
        title: e.title,
        subject: e.subject,
        classSection: e.classSection,
        maxScore: e.max,
        avgScore: `${((e.avg / e.max) * 100).toFixed(1)}% (${e.avg}/${e.max})`,
        highScore: `${e.high}/${e.max}`,
        lowScore: `${e.low}/${e.max}`,
        evaluatedCount: e.count,
        quality: e.quality,
        statusBadge: e.badge,
      }));

      const summary = [
        { label: 'Tasks Evaluated', value: data.length, color: 'blue', icon: '📋' },
        { label: 'Mean Cohort Score', value: '86.4%', color: 'emerald', icon: '📈' },
        { label: 'Evaluation Completion', value: '100%', color: 'purple', icon: '✓' },
        { label: 'Top Scoring Subject', value: 'Computer Science (92.4%)', color: 'indigo', icon: '⭐' },
      ];

      return {
        title: 'Assignment Quality & Scoring Performance Evaluation',
        subtitle: 'Average student marks, score ranges, and educator evaluations across assignments',
        columns,
        data,
        summary,
      };
    }

    default: {
      return {
        title: 'General Institutional Report',
        subtitle: 'Standard reporting dataset',
        columns: [
          { key: 'id', label: 'Record ID', align: 'center' },
          { key: 'name', label: 'Name', align: 'left' },
          { key: 'status', label: 'Status', format: 'badge', align: 'center' },
        ],
        data: [
          { id: '1', name: 'Standard Record 1', status: 'Active', statusBadge: 'emerald' },
          { id: '2', name: 'Standard Record 2', status: 'Active', statusBadge: 'emerald' },
        ],
        summary: [
          { label: 'Total Records', value: 2, color: 'blue', icon: '📊' },
        ],
      };
    }
  }
};

/**
 * Universal Export to CSV / Excel
 */
export const exportReportToCSV = (reportName, columns, data) => {
  if (!data || data.length === 0) {
    throw new Error('No data records available to export.');
  }

  const cleanLabel = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
  const cleanVal = (val) => {
    if (val === null || val === undefined) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  };

  const headerRow = columns.map(c => cleanLabel(c.label)).join(',');
  const rows = data.map(row => 
    columns.map(c => cleanVal(row[c.key])).join(',')
  );

  const csvContent = '\uFEFF' + [headerRow, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = reportName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  link.setAttribute('download', `${safeName}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Master Institutional Export Bundle
 */
export const generateMasterSchoolExport = (liveData = {}) => {
  const sections = [
    '=========================================================================',
    'DELHI PUBLIC ACADEMY - MASTER INSTITUTIONAL REPORT',
    `Generated At: ${new Date().toLocaleString('en-IN')}`,
    'Academic Year: 2024-25 | Accreditation: CBSE Autonomous',
    '=========================================================================\r\n',
    'SECTION 1: ENROLLMENT & DEMOGRAPHICS SUMMARY',
    'Total Enrolled Students,317',
    'Active Male Students,164 (51.7%)',
    'Active Female Students,153 (48.3%)',
    'Student Punctuality Rate,95.2%\r\n',
    'SECTION 2: FACULTY & ACADEMIC STAFFING',
    'Total Teaching Faculty,24',
    'Doctorate & Senior PGTs,8',
    'Average Workload,25.6 Periods/Week',
    'Faculty Attendance Rate,96.8%\r\n',
    'SECTION 3: FINANCIAL REVENUE & FEE COLLECTIONS',
    'Annual Realized Revenue,₹2,27,00,000',
    'Annual Budget Target,₹2,40,00,000',
    'Collection Efficiency,94.6%',
    'Total Outstanding Arrears,₹13,00,000\r\n',
    'SECTION 4: ACADEMIC BENCHMARK & PASSING RATES',
    'Institution Academic GPA,8.6 / 10',
    'Board Passing Percentage,98.2%',
    'Distinction Honor Rate (>=85%),58.7%',
  ];

  const content = '\uFEFF' + sections.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Master_School_Report_Bundle_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

