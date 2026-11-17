/**
 * Comprehensive Multi-School & Multi-Branch Enterprise Data Seeder
 * Generates and seeds realistic, compliant data for all 3 school branches across all SMS features:
 * - Branch 1: Siliguri Main Campus (CBSE, Code: DPS-SLG-01, West Bengal)
 * - Branch 2: Kolkata Central Campus (ICSE, Code: DPS-KOL-02, West Bengal)
 * - Branch 3: Bangalore South Branch (CBSE, Code: DPS-BLR-03, Karnataka)
 * 
 * Features Covered:
 * 1. Campuses & Branches (Affiliations, Curriculums, Principals, Receipt Prefixes)
 * 2. Academic Setup (Academic Years 2025-2026, 2026-2027, Classes 1-10, Sections A & B, Regional & Core Subjects)
 * 3. Faculty & Teachers (Employee IDs, Qualifications, Specializations, Designations, Salaries, Bank Details & IFSC)
 * 4. Students & Admissions (Admission numbers, Roll numbers, DOBs, Blood groups, Addresses, Full Parent Linkages)
 * 5. Student Daily Attendance Register (Present, Absent, Late records for current month)
 * 6. Examinations & Student Grades (Periodic Assessment 1, Mid-Term 2026, Theory & Practical Marks, Letter Grades)
 * 7. Fee Structures & Payment Receipts (Tuition, Transport, Lab, Annual fees with branch-specific receipt numbers)
 * 8. Human Resources (HRMS) (Staff directory, Salary breakdown, Monthly payrolls & salary slips, Daily staff attendance, Leave requests)
 * 9. Events & Calendar (Annual Sports Day, Science & AI Fair, Cultural Fest, PTM conferences)
 * 10. Teacher-Parent Direct Communication (Message threads, meeting requests, student progress notes)
 * 11. System Notifications (Fee due alerts, upcoming exams, holiday announcements, leave approvals)
 * 12. School Gallery (Campus albums, high-res photos, sports meets, cultural evenings)
 */

import { supabase } from './supabase';
import {
  DEFAULT_SCHOOLS,
  saveStoredSchools,
  getSchoolSecurityContext,
  getEffectiveSchoolId
} from './api';

// -------------------------------------------------------------
// 1. DATA DEFINITIONS PER BRANCH
// -------------------------------------------------------------

export const SEEDED_ACADEMIC_YEARS = [
  { id: 1, name: '2025-2026', start_date: '2025-04-01', end_date: '2026-03-31', is_current: false, status: 'completed' },
  { id: 2, name: '2026-2027', start_date: '2026-04-01', end_date: '2027-03-31', is_current: true, status: 'active' },
];

export const BRANCH_CONFIGS = [
  {
    id: 1,
    name: 'Delhi Public School, Siliguri Main Campus',
    shortName: 'DPS Siliguri',
    code: 'DPS-SLG-01',
    affiliationNumber: 'CBSE/AFF/WB/2021/33401',
    curriculum: 'CBSE',
    establishedYear: 2012,
    principalName: 'Dr. Anirban Mukherjee, Ph.D.',
    email: 'principal.siliguri@school.com',
    phone: '+91 353 2548901',
    address: 'Pradhan Nagar, Hill Cart Road',
    city: 'Siliguri',
    state: 'West Bengal',
    postalCode: '734001',
    receiptPrefix: 'REC-SLG-',
    primaryColor: '#2563EB',
    logo: 'preset:🏫',
    status: 'active',
    studentCount: 840,
    facultyCount: 54,
  },
  {
    id: 2,
    name: 'Delhi Public School, Kolkata Central Campus',
    shortName: 'DPS Kolkata',
    code: 'DPS-KOL-02',
    affiliationNumber: 'CISCE/WB/2019/5521',
    curriculum: 'ICSE',
    establishedYear: 2016,
    principalName: "Sister Margaret D'Souza, M.Ed.",
    email: 'principal.kolkata@school.com',
    phone: '+91 33 22894100',
    address: '48 Park Street, Central District',
    city: 'Kolkata',
    state: 'West Bengal',
    postalCode: '700016',
    receiptPrefix: 'REC-KOL-',
    primaryColor: '#7C3AED',
    logo: 'preset:🏛️',
    status: 'active',
    studentCount: 920,
    facultyCount: 62,
  },
  {
    id: 3,
    name: 'Delhi Public School, Bangalore South Campus',
    shortName: 'DPS Bangalore South',
    code: 'DPS-BLR-03',
    affiliationNumber: 'CBSE/AFF/KT/2022/44108',
    curriculum: 'CBSE',
    establishedYear: 2020,
    principalName: 'Dr. R. K. Venkatesh, M.Sc., Ph.D.',
    email: 'principal.bangalore@school.com',
    phone: '+91 80 41258900',
    address: '12th Main, 4th Block, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560034',
    receiptPrefix: 'REC-BLR-',
    primaryColor: '#059669',
    logo: 'preset:🎓',
    status: 'active',
    studentCount: 710,
    facultyCount: 48,
  },
];

// Classes 1 to 10
export const SEEDED_CLASSES = [
  { numeric_name: '1', name: 'Class 1', order: 1, description: 'Primary Grade 1' },
  { numeric_name: '2', name: 'Class 2', order: 2, description: 'Primary Grade 2' },
  { numeric_name: '3', name: 'Class 3', order: 3, description: 'Primary Grade 3' },
  { numeric_name: '4', name: 'Class 4', order: 4, description: 'Primary Grade 4' },
  { numeric_name: '5', name: 'Class 5', order: 5, description: 'Upper Primary Grade 5' },
  { numeric_name: '6', name: 'Class 6', order: 6, description: 'Middle School Grade 6' },
  { numeric_name: '7', name: 'Class 7', order: 7, description: 'Middle School Grade 7' },
  { numeric_name: '8', name: 'Class 8', order: 8, description: 'Middle School Grade 8' },
  { numeric_name: '9', name: 'Class 9', order: 9, description: 'Secondary Grade 9' },
  { numeric_name: '10', name: 'Class 10', order: 10, description: 'Secondary Board Grade 10' },
];

export const SEEDED_SECTIONS = [
  { name: 'A', capacity: 40 },
  { name: 'B', capacity: 40 },
];

// Branch-Specific Subjects
export const BRANCH_SUBJECTS = {
  1: [ // Siliguri (CBSE)
    { name: 'English Core', code: 'ENG-101', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Mathematics', code: 'MATH-101', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'General Science', code: 'SCI-101', type: 'both', total_marks: 100, passing_marks: 40 },
    { name: 'Social Studies', code: 'SST-101', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Hindi Course A', code: 'HIN-101', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Computer Applications', code: 'CA-101', type: 'both', total_marks: 100, passing_marks: 40 },
    { name: 'Bengali Second Language', code: 'BEN-101', type: 'theory', total_marks: 100, passing_marks: 40 },
  ],
  2: [ // Kolkata (ICSE)
    { name: 'English Language & Lit', code: 'ICSE-ENG', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Mathematics (ICSE)', code: 'ICSE-MATH', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Physics & Chemistry', code: 'ICSE-PHYCHEM', type: 'both', total_marks: 100, passing_marks: 40 },
    { name: 'Biology & Environmental Sci', code: 'ICSE-BIO', type: 'both', total_marks: 100, passing_marks: 40 },
    { name: 'History, Civics & Geography', code: 'ICSE-HCG', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Commercial Applications', code: 'ICSE-COMM', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Bengali Literature', code: 'ICSE-BEN', type: 'theory', total_marks: 100, passing_marks: 40 },
  ],
  3: [ // Bangalore (CBSE Tech Focus)
    { name: 'English Communicative', code: 'BLR-ENG', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Mathematics & Analytics', code: 'BLR-MATH', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Integrated Science', code: 'BLR-SCI', type: 'both', total_marks: 100, passing_marks: 40 },
    { name: 'Social Sciences', code: 'BLR-SST', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Kannada Language', code: 'BLR-KAN', type: 'theory', total_marks: 100, passing_marks: 40 },
    { name: 'Artificial Intelligence & Robotics', code: 'BLR-AI-ROBO', type: 'both', total_marks: 100, passing_marks: 40 },
    { name: 'Coding & Data Thinking', code: 'BLR-CODE', type: 'both', total_marks: 100, passing_marks: 40 },
  ]
};

// -------------------------------------------------------------
// 2. TEACHERS & FACULTY PER BRANCH (With Bank & Payroll Info)
// -------------------------------------------------------------
export const BRANCH_FACULTY = {
  1: [ // Siliguri Main Campus
    {
      first_name: 'Rajesh',
      last_name: 'Kumar',
      employee_id: 'EMP-SLG-01',
      email: 'rajesh.kumar@school.com',
      phone: '+91 98320 11001',
      gender: 'male',
      date_of_birth: '1982-05-14',
      joining_date: '2015-06-01',
      designation: 'HOD & Senior PGT Mathematics',
      department: 'Mathematics',
      qualification: 'M.Sc Mathematics, B.Ed',
      specialization: 'Calculus & Applied Geometry',
      experience_years: 12,
      employment_type: 'permanent',
      status: 'active',
      salary: 58000,
      bank_name: 'State Bank of India',
      bank_account_number: '31098455621',
      bank_ifsc: 'SBIN0000184',
      address: 'Sevoke Road, Near Planetarium',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734001',
    },
    {
      first_name: 'Sunita',
      last_name: 'Sen',
      employee_id: 'EMP-SLG-02',
      email: 'sunita.sen@school.com',
      phone: '+91 98320 11002',
      gender: 'female',
      date_of_birth: '1986-09-22',
      joining_date: '2017-07-15',
      designation: 'PGT Physics',
      department: 'Science',
      qualification: 'M.Sc Physics, B.Ed',
      specialization: 'Optics & Electromagnetism',
      experience_years: 9,
      employment_type: 'permanent',
      status: 'active',
      salary: 52000,
      bank_name: 'HDFC Bank',
      bank_account_number: '5010041289901',
      bank_ifsc: 'HDFC0000085',
      address: 'Hakim Para, Subhas Pally',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734001',
    },
    {
      first_name: 'Amitav',
      last_name: 'Roy',
      employee_id: 'EMP-SLG-03',
      email: 'amitav.roy@school.com',
      phone: '+91 98320 11003',
      gender: 'male',
      date_of_birth: '1989-11-05',
      joining_date: '2019-04-10',
      designation: 'TGT English Literature',
      department: 'English',
      qualification: 'M.A English, B.Ed',
      specialization: 'British Literature & Drama',
      experience_years: 7,
      employment_type: 'permanent',
      status: 'active',
      salary: 44000,
      bank_name: 'ICICI Bank',
      bank_account_number: '002101569842',
      bank_ifsc: 'ICIC0000021',
      address: 'Milan Pally, Ward 11',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734005',
    },
    {
      first_name: 'Priyanka',
      last_name: 'Sharma',
      employee_id: 'EMP-SLG-04',
      email: 'priyanka.sharma@school.com',
      phone: '+91 98320 11004',
      gender: 'female',
      date_of_birth: '1992-03-18',
      joining_date: '2021-08-01',
      designation: 'PGT Computer Science & AI',
      department: 'Computer Science',
      qualification: 'MCA, B.Tech',
      specialization: 'Python, SQL & Machine Learning',
      experience_years: 5,
      employment_type: 'permanent',
      status: 'active',
      salary: 47000,
      bank_name: 'Axis Bank',
      bank_account_number: '91501002345678',
      bank_ifsc: 'UTIB0000122',
      address: 'Deshbandhu Para, Ashram Road',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734004',
    },
    {
      first_name: 'Bikas',
      last_name: 'Chettri',
      employee_id: 'EMP-SLG-05',
      email: 'bikas.chettri@school.com',
      phone: '+91 98320 11005',
      gender: 'male',
      date_of_birth: '1985-07-30',
      joining_date: '2016-01-12',
      designation: 'Director of Physical Education',
      department: 'Sports',
      qualification: 'M.P.Ed, NIS Coach',
      specialization: 'Athletics, Football & High Altitude Training',
      experience_years: 11,
      employment_type: 'permanent',
      status: 'active',
      salary: 43000,
      bank_name: 'Punjab National Bank',
      bank_account_number: '142300010024589',
      bank_ifsc: 'PUNB0014200',
      address: 'Sukna Cantonment Road',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734009',
    },
  ],
  2: [ // Kolkata Central Campus
    {
      first_name: 'Debashis',
      last_name: 'Banerjee',
      employee_id: 'EMP-KOL-01',
      email: 'debashis.banerjee@school.com',
      phone: '+91 98300 22001',
      gender: 'male',
      date_of_birth: '1979-08-11',
      joining_date: '2016-04-01',
      designation: 'Vice Principal & HOD Mathematics',
      department: 'Mathematics',
      qualification: 'M.Sc Pure Math, B.Ed',
      specialization: 'ICSE Board Curriculum & Statistics',
      experience_years: 15,
      employment_type: 'permanent',
      status: 'active',
      salary: 64000,
      bank_name: 'State Bank of India',
      bank_account_number: '20045899124',
      bank_ifsc: 'SBIN0000001',
      address: '32 Southern Avenue, Keyatala',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700029',
    },
    {
      first_name: 'Sarmistha',
      last_name: 'Ghosh',
      employee_id: 'EMP-KOL-02',
      email: 'sarmistha.ghosh@school.com',
      phone: '+91 98300 22002',
      gender: 'female',
      date_of_birth: '1984-12-04',
      joining_date: '2018-06-15',
      designation: 'Senior Faculty Biology & EVS',
      department: 'Science',
      qualification: 'M.Sc Zoology, B.Ed',
      specialization: 'Microbiology & Genetics',
      experience_years: 10,
      employment_type: 'permanent',
      status: 'active',
      salary: 54000,
      bank_name: 'HDFC Bank',
      bank_account_number: '5010098452101',
      bank_ifsc: 'HDFC0000014',
      address: '14 Salt Lake Sector 1',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700064',
    },
    {
      first_name: 'Subrata',
      last_name: 'Bose',
      employee_id: 'EMP-KOL-03',
      email: 'subrata.bose@school.com',
      phone: '+91 98300 22003',
      gender: 'male',
      date_of_birth: '1987-04-19',
      joining_date: '2019-07-01',
      designation: 'TGT History & Civics',
      department: 'Social Science',
      qualification: 'M.A Modern History, B.Ed',
      specialization: 'World History & Indian Constitution',
      experience_years: 8,
      employment_type: 'permanent',
      status: 'active',
      salary: 46000,
      bank_name: 'Axis Bank',
      bank_account_number: '91701004581290',
      bank_ifsc: 'UTIB0000005',
      address: '78 Shyambazar Street',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700004',
    },
    {
      first_name: 'Rituparna',
      last_name: 'Chatterjee',
      employee_id: 'EMP-KOL-04',
      email: 'rituparna.chatterjee@school.com',
      phone: '+91 98300 22004',
      gender: 'female',
      date_of_birth: '1990-10-25',
      joining_date: '2020-03-01',
      designation: 'PGT English & Drama Coach',
      department: 'English',
      qualification: 'M.A English, PG Diploma Theatre',
      specialization: 'Shakespearean Studies & Oratory',
      experience_years: 6,
      employment_type: 'permanent',
      status: 'active',
      salary: 48000,
      bank_name: 'ICICI Bank',
      bank_account_number: '000601548792',
      bank_ifsc: 'ICIC0000006',
      address: '22 Hindustan Park, Gariahat',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700029',
    },
    {
      first_name: 'Kaushik',
      last_name: 'Ganguly',
      employee_id: 'EMP-KOL-05',
      email: 'kaushik.ganguly@school.com',
      phone: '+91 98300 22005',
      gender: 'male',
      date_of_birth: '1986-02-14',
      joining_date: '2017-11-20',
      designation: 'Physical Education & Head Cricket Coach',
      department: 'Sports',
      qualification: 'B.P.Ed, BCCI Level 1 Coach',
      specialization: 'Cricket, Swimming & Fitness',
      experience_years: 9,
      employment_type: 'permanent',
      status: 'active',
      salary: 45000,
      bank_name: 'Bank of Baroda',
      bank_account_number: '01420100029871',
      bank_ifsc: 'BARB0PARKST',
      address: '5 Ballygunge Circular Road',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700019',
    },
  ],
  3: [ // Bangalore South Campus
    {
      first_name: 'S. R.',
      last_name: 'Nagaraj',
      employee_id: 'EMP-BLR-01',
      email: 'sr.nagaraj@school.com',
      phone: '+91 98450 33001',
      gender: 'male',
      date_of_birth: '1980-03-12',
      joining_date: '2020-06-01',
      designation: 'HOD Computer Science & Robotics',
      department: 'Computer Science',
      qualification: 'M.Tech CSE, B.Ed',
      specialization: 'Artificial Intelligence, Python & Embedded IoT',
      experience_years: 14,
      employment_type: 'permanent',
      status: 'active',
      salary: 65000,
      bank_name: 'HDFC Bank',
      bank_account_number: '5010088991201',
      bank_ifsc: 'HDFC0000184',
      address: '88 HSR Layout Sector 2',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560102',
    },
    {
      first_name: 'Vidya',
      last_name: 'Krishnan',
      employee_id: 'EMP-BLR-02',
      email: 'vidya.krishnan@school.com',
      phone: '+91 98450 33002',
      gender: 'female',
      date_of_birth: '1985-06-28',
      joining_date: '2020-08-15',
      designation: 'PGT Physics & Applied Mathematics',
      department: 'Science',
      qualification: 'M.Sc Applied Physics, B.Ed',
      specialization: 'Astrophysics & Modern Mechanics',
      experience_years: 11,
      employment_type: 'permanent',
      status: 'active',
      salary: 56000,
      bank_name: 'State Bank of India',
      bank_account_number: '31289004561',
      bank_ifsc: 'SBIN0001811',
      address: '15 Indiranagar 100ft Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560038',
    },
    {
      first_name: 'Meenakshi',
      last_name: 'Sundaram',
      employee_id: 'EMP-BLR-03',
      email: 'meenakshi.sundaram@school.com',
      phone: '+91 98450 33003',
      gender: 'female',
      date_of_birth: '1988-01-15',
      joining_date: '2021-04-10',
      designation: 'Senior Faculty Chemistry & Biotech',
      department: 'Science',
      qualification: 'M.Sc Chemistry, M.Phil',
      specialization: 'Organic Chemistry & Biochemistry',
      experience_years: 8,
      employment_type: 'permanent',
      status: 'active',
      salary: 49000,
      bank_name: 'ICICI Bank',
      bank_account_number: '004701589124',
      bank_ifsc: 'ICIC0000047',
      address: '24 Jayanagar 4th Block',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560011',
    },
    {
      first_name: 'Arvind',
      last_name: 'Swamy',
      employee_id: 'EMP-BLR-04',
      email: 'arvind.swamy@school.com',
      phone: '+91 98450 33004',
      gender: 'male',
      date_of_birth: '1991-09-09',
      joining_date: '2021-10-01',
      designation: 'TGT Economics & Social Studies',
      department: 'Social Science',
      qualification: 'M.A Economics, B.Ed',
      specialization: 'Macroeconomics & Indian Economy',
      experience_years: 6,
      employment_type: 'permanent',
      status: 'active',
      salary: 45000,
      bank_name: 'Kotak Mahindra Bank',
      bank_account_number: '7812004589',
      bank_ifsc: 'KKBK0008054',
      address: '42 BTM Layout 2nd Stage',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560076',
    },
    {
      first_name: 'Deepa',
      last_name: 'Hegde',
      employee_id: 'EMP-BLR-05',
      email: 'deepa.hegde@school.com',
      phone: '+91 98450 33005',
      gender: 'female',
      date_of_birth: '1987-11-19',
      joining_date: '2020-07-01',
      designation: 'TGT Kannada & Cultural Coordinator',
      department: 'Languages',
      qualification: 'M.A Kannada, B.Ed',
      specialization: 'Kannada Literature & Folk Traditions',
      experience_years: 9,
      employment_type: 'permanent',
      status: 'active',
      salary: 44000,
      bank_name: 'Canara Bank',
      bank_account_number: '0412101089451',
      bank_ifsc: 'CNRB0000412',
      address: '109 Malleshwaram 8th Cross',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560003',
    },
  ]
};

// -------------------------------------------------------------
// 3. STUDENTS & PARENTS PER BRANCH
// -------------------------------------------------------------
export const BRANCH_STUDENTS = {
  1: [ // Siliguri Main Campus Students
    {
      first_name: 'Aarav',
      last_name: 'Sharma',
      admission_number: 'SLG-2026-001',
      roll_number: 101,
      class_order: 5,
      section_name: 'A',
      gender: 'male',
      date_of_birth: '2016-04-12',
      blood_group: 'B+',
      email: 'aarav.sharma@school.local',
      phone: '+91 98321 00101',
      address: 'Flat 302, Green Valley Apts, Sevoke Rd',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734001',
      father_name: 'Ramesh Sharma',
      father_phone: '+91 98321 55101',
      father_occupation: 'Senior Tea Estate Manager',
      mother_name: 'Sunita Sharma',
      mother_phone: '+91 98321 55102',
      mother_occupation: 'Govt High School Teacher',
      guardian_name: 'Ramesh Sharma',
      guardian_phone: '+91 98321 55101',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Sneha',
      last_name: 'Roy',
      admission_number: 'SLG-2026-002',
      roll_number: 102,
      class_order: 5,
      section_name: 'A',
      gender: 'female',
      date_of_birth: '2016-07-25',
      blood_group: 'O+',
      email: 'sneha.roy@school.local',
      phone: '+91 98321 00102',
      address: '18 Hakimpara, Ward No 15',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734001',
      father_name: 'Prabir Roy',
      father_phone: '+91 98321 55103',
      father_occupation: 'Advocate, District Court',
      mother_name: 'Anupama Roy',
      mother_phone: '+91 98321 55104',
      mother_occupation: 'Bank Officer (SBI)',
      guardian_name: 'Prabir Roy',
      guardian_phone: '+91 98321 55103',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Rohan',
      last_name: 'Das',
      admission_number: 'SLG-2026-003',
      roll_number: 103,
      class_order: 6,
      section_name: 'B',
      gender: 'male',
      date_of_birth: '2015-02-18',
      blood_group: 'A+',
      email: 'rohan.das@school.local',
      phone: '+91 98321 00103',
      address: '74 Subhas Pally, Hill Cart Rd',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734001',
      father_name: 'Debabrata Das',
      father_phone: '+91 98321 55105',
      father_occupation: 'Civil Engineer (PWD)',
      mother_name: 'Mitali Das',
      mother_phone: '+91 98321 55106',
      mother_occupation: 'Homemaker',
      guardian_name: 'Debabrata Das',
      guardian_phone: '+91 98321 55105',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Ananya',
      last_name: 'Sen',
      admission_number: 'SLG-2026-004',
      roll_number: 104,
      class_order: 7,
      section_name: 'A',
      gender: 'female',
      date_of_birth: '2014-09-10',
      blood_group: 'AB+',
      email: 'ananya.sen@school.local',
      phone: '+91 98321 00104',
      address: '25 Ashram Para, By-Lane 3',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734001',
      father_name: 'Dr. Subhash Sen',
      father_phone: '+91 98321 55107',
      father_occupation: 'Chief Medical Officer',
      mother_name: 'Dr. Rupa Sen',
      mother_phone: '+91 98321 55108',
      mother_occupation: 'Pediatrician',
      guardian_name: 'Dr. Subhash Sen',
      guardian_phone: '+91 98321 55107',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Pritam',
      last_name: 'Saha',
      admission_number: 'SLG-2026-005',
      roll_number: 105,
      class_order: 8,
      section_name: 'A',
      gender: 'male',
      date_of_birth: '2013-11-29',
      blood_group: 'B+',
      email: 'pritam.saha@school.local',
      phone: '+91 98321 00105',
      address: 'Bidhannagar Market Road',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734004',
      father_name: 'Biplab Saha',
      father_phone: '+91 98321 55109',
      father_occupation: 'Wholesale Merchant',
      mother_name: 'Jharna Saha',
      mother_phone: '+91 98321 55110',
      mother_occupation: 'Homemaker',
      guardian_name: 'Biplab Saha',
      guardian_phone: '+91 98321 55109',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Debolina',
      last_name: 'Guha',
      admission_number: 'SLG-2026-006',
      roll_number: 106,
      class_order: 9,
      section_name: 'B',
      gender: 'female',
      date_of_birth: '2012-05-15',
      blood_group: 'O-',
      email: 'debolina.guha@school.local',
      phone: '+91 98321 00106',
      address: 'Near City Centre, Matigara',
      city: 'Siliguri',
      state: 'West Bengal',
      postal_code: '734010',
      father_name: 'Satyajit Guha',
      father_phone: '+91 98321 55111',
      father_occupation: 'Regional Director (Telecom)',
      mother_name: 'Payel Guha',
      mother_phone: '+91 98321 55112',
      mother_occupation: 'College Lecturer',
      guardian_name: 'Satyajit Guha',
      guardian_phone: '+91 98321 55111',
      guardian_relation: 'Father',
    },
  ],
  2: [ // Kolkata Central Campus Students
    {
      first_name: 'Sourav',
      last_name: 'Ganguly',
      admission_number: 'KOL-2026-001',
      roll_number: 201,
      class_order: 5,
      section_name: 'A',
      gender: 'male',
      date_of_birth: '2016-03-14',
      blood_group: 'O+',
      email: 'sourav.ganguly@school.local',
      phone: '+91 98305 00201',
      address: '14B Dover Lane, Ballygunge',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700029',
      father_name: 'Chandranath Ganguly',
      father_phone: '+91 98305 66201',
      father_occupation: 'Chartered Accountant (Partner)',
      mother_name: 'Sharmila Ganguly',
      mother_phone: '+91 98305 66202',
      mother_occupation: 'Professor, Presidency University',
      guardian_name: 'Chandranath Ganguly',
      guardian_phone: '+91 98305 66201',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Priya',
      last_name: 'Mukherjee',
      admission_number: 'KOL-2026-002',
      roll_number: 202,
      class_order: 5,
      section_name: 'A',
      gender: 'female',
      date_of_birth: '2016-08-19',
      blood_group: 'A+',
      email: 'priya.mukherjee@school.local',
      phone: '+91 98305 00202',
      address: '52 Lake Gardens, South Kolkata',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700045',
      father_name: 'Tanmay Mukherjee',
      father_phone: '+91 98305 66203',
      father_occupation: 'Architectural Consultant',
      mother_name: 'Sreemati Mukherjee',
      mother_phone: '+91 98305 66204',
      mother_occupation: 'Senior Corporate Lawyer',
      guardian_name: 'Tanmay Mukherjee',
      guardian_phone: '+91 98305 66203',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Arindam',
      last_name: 'Ghosh',
      admission_number: 'KOL-2026-003',
      roll_number: 203,
      class_order: 6,
      section_name: 'A',
      gender: 'male',
      date_of_birth: '2015-06-22',
      blood_group: 'B+',
      email: 'arindam.ghosh@school.local',
      phone: '+91 98305 00203',
      address: 'Block CF, Sector 1, Salt Lake City',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700064',
      father_name: 'Kallol Ghosh',
      father_phone: '+91 98305 66205',
      father_occupation: 'VP Engineering (Wipro)',
      mother_name: 'Debjani Ghosh',
      mother_phone: '+91 98305 66206',
      mother_occupation: 'Journalist & Author',
      guardian_name: 'Kallol Ghosh',
      guardian_phone: '+91 98305 66205',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Sayantani',
      last_name: 'Bose',
      admission_number: 'KOL-2026-004',
      roll_number: 204,
      class_order: 7,
      section_name: 'B',
      gender: 'female',
      date_of_birth: '2014-04-05',
      blood_group: 'AB-',
      email: 'sayantani.bose@school.local',
      phone: '+91 98305 00204',
      address: '28 Rashbehari Avenue, Kalighat',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700026',
      father_name: 'Dipankar Bose',
      father_phone: '+91 98305 66207',
      father_occupation: 'Executive Director (WBIDC)',
      mother_name: 'Kakoli Bose',
      mother_phone: '+91 98305 66208',
      mother_occupation: 'Classical Musician & Educator',
      guardian_name: 'Dipankar Bose',
      guardian_phone: '+91 98305 66207',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Abhirup',
      last_name: 'Bhattacharya',
      admission_number: 'KOL-2026-005',
      roll_number: 205,
      class_order: 8,
      section_name: 'A',
      gender: 'male',
      date_of_birth: '2013-09-17',
      blood_group: 'O+',
      email: 'abhirup.bhattacharya@school.local',
      phone: '+91 98305 00205',
      address: '7 New Town Action Area 1',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700156',
      father_name: 'Aniruddha Bhattacharya',
      father_phone: '+91 98305 66209',
      father_occupation: 'Data Science Director (Cognizant)',
      mother_name: 'Barnali Bhattacharya',
      mother_phone: '+91 98305 66210',
      mother_occupation: 'Interior Designer',
      guardian_name: 'Aniruddha Bhattacharya',
      guardian_phone: '+91 98305 66209',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Sreemoyee',
      last_name: 'Mitra',
      admission_number: 'KOL-2026-006',
      roll_number: 206,
      class_order: 9,
      section_name: 'B',
      gender: 'female',
      date_of_birth: '2012-12-08',
      blood_group: 'B-',
      email: 'sreemoyee.mitra@school.local',
      phone: '+91 98305 00206',
      address: '10 Alipore Park Road',
      city: 'Kolkata',
      state: 'West Bengal',
      postal_code: '700027',
      father_name: 'Kaushik Mitra',
      father_phone: '+91 98305 66211',
      father_occupation: 'Senior Vice President (Tata Steel)',
      mother_name: 'Indrani Mitra',
      mother_phone: '+91 98305 66212',
      mother_occupation: 'Philanthropist & Trustee',
      guardian_name: 'Kaushik Mitra',
      guardian_phone: '+91 98305 66211',
      guardian_relation: 'Father',
    },
  ],
  3: [ // Bangalore South Campus Students
    {
      first_name: 'Aditi',
      last_name: 'Rao',
      admission_number: 'BLR-2026-001',
      roll_number: 301,
      class_order: 5,
      section_name: 'A',
      gender: 'female',
      date_of_birth: '2016-05-30',
      blood_group: 'O+',
      email: 'aditi.rao@school.local',
      phone: '+91 98455 00301',
      address: 'Villa 12, Palm Meadows, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560066',
      father_name: 'Srinivasa Rao',
      father_phone: '+91 98455 77301',
      father_occupation: 'Chief Technology Officer (Startup)',
      mother_name: 'Malini Rao',
      mother_phone: '+91 98455 77302',
      mother_occupation: 'Product VP (Google)',
      guardian_name: 'Srinivasa Rao',
      guardian_phone: '+91 98455 77301',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Varun',
      last_name: 'Reddy',
      admission_number: 'BLR-2026-002',
      roll_number: 302,
      class_order: 5,
      section_name: 'A',
      gender: 'male',
      date_of_birth: '2016-09-14',
      blood_group: 'B+',
      email: 'varun.reddy@school.local',
      phone: '+91 98455 00302',
      address: '45 Koramangala 3rd Block',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560034',
      father_name: 'C. V. Reddy',
      father_phone: '+91 98455 77303',
      father_occupation: 'Managing Director (Real Estate)',
      mother_name: 'Geetha Reddy',
      mother_phone: '+91 98455 77304',
      mother_occupation: 'Restaurateur',
      guardian_name: 'C. V. Reddy',
      guardian_phone: '+91 98455 77303',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Ananya',
      last_name: 'Hegde',
      admission_number: 'BLR-2026-003',
      roll_number: 303,
      class_order: 6,
      section_name: 'A',
      gender: 'female',
      date_of_birth: '2015-04-03',
      blood_group: 'A+',
      email: 'ananya.hegde@school.local',
      phone: '+91 98455 00303',
      address: '29 HSR Layout Sector 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560102',
      father_name: 'Mahesh Hegde',
      father_phone: '+91 98455 77305',
      father_occupation: 'Principal Architect (Amazon AWS)',
      mother_name: 'Vandana Hegde',
      mother_phone: '+91 98455 77306',
      mother_occupation: 'Senior Scientist (ISRO)',
      guardian_name: 'Mahesh Hegde',
      guardian_phone: '+91 98455 77305',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Karthik',
      last_name: 'Gowda',
      admission_number: 'BLR-2026-004',
      roll_number: 304,
      class_order: 7,
      section_name: 'B',
      gender: 'male',
      date_of_birth: '2014-07-21',
      blood_group: 'AB+',
      email: 'karthik.gowda@school.local',
      phone: '+91 98455 00304',
      address: '18 Jayanagar 7th Block',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560082',
      father_name: 'Pradeep Gowda',
      father_phone: '+91 98455 77307',
      father_occupation: 'Senior Director (Infosys)',
      mother_name: 'Bhavani Gowda',
      mother_phone: '+91 98455 77308',
      mother_occupation: 'Senior Medical Specialist',
      guardian_name: 'Pradeep Gowda',
      guardian_phone: '+91 98455 77307',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Rohan',
      last_name: 'Murthy',
      admission_number: 'BLR-2026-005',
      roll_number: 305,
      class_order: 8,
      section_name: 'A',
      gender: 'male',
      date_of_birth: '2013-10-11',
      blood_group: 'O+',
      email: 'rohan.murthy@school.local',
      phone: '+91 98455 00305',
      address: '56 Indiranagar Defence Colony',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560038',
      father_name: 'Kishore Murthy',
      father_phone: '+91 98455 77309',
      father_occupation: 'Venture Capital Partner',
      mother_name: 'Nandini Murthy',
      mother_phone: '+91 98455 77310',
      mother_occupation: 'Tech Entrepreneur',
      guardian_name: 'Kishore Murthy',
      guardian_phone: '+91 98455 77309',
      guardian_relation: 'Father',
    },
    {
      first_name: 'Shreya',
      last_name: 'Iyer',
      admission_number: 'BLR-2026-006',
      roll_number: 306,
      class_order: 9,
      section_name: 'B',
      gender: 'female',
      date_of_birth: '2012-08-27',
      blood_group: 'B+',
      email: 'shreya.iyer@school.local',
      phone: '+91 98455 00306',
      address: '71 Electronic City Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560100',
      father_name: 'Ganesh Iyer',
      father_phone: '+91 98455 77311',
      father_occupation: 'Engineering Lead (Qualcomm)',
      mother_name: 'Radhika Iyer',
      mother_phone: '+91 98455 77312',
      mother_occupation: 'Cybersecurity Consultant',
      guardian_name: 'Ganesh Iyer',
      guardian_phone: '+91 98455 77311',
      guardian_relation: 'Father',
    },
  ]
};

// -------------------------------------------------------------
// 4. HRMS STAFF & SALARY STRUCTURE PER BRANCH
// -------------------------------------------------------------
export const BRANCH_HRMS_STAFF = {
  1: [ // Siliguri Main Campus
    {
      id: 101,
      school_id: 1,
      employee_id: 'STAFF-SLG-01',
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@school.com',
      phone: '+91 98320 11001',
      department: 'Academics',
      designation: 'HOD & Senior PGT Mathematics',
      employment_type: 'Permanent Full-Time',
      joining_date: '2015-06-01',
      status: 'active',
      basic_pay: 58000,
      da: 17400,
      hra: 11600,
      special_allowance: 4000,
      pf_deduction: 6960,
      tax_deduction: 3200,
      professional_tax: 200,
      bank_name: 'State Bank of India',
      bank_account_number: '31098455621',
      bank_ifsc: 'SBIN0000184',
    },
    {
      id: 102,
      school_id: 1,
      employee_id: 'STAFF-SLG-02',
      name: 'Sunita Sen',
      email: 'sunita.sen@school.com',
      phone: '+91 98320 11002',
      department: 'Academics',
      designation: 'PGT Physics',
      employment_type: 'Permanent Full-Time',
      joining_date: '2017-07-15',
      status: 'active',
      basic_pay: 52000,
      da: 15600,
      hra: 10400,
      special_allowance: 3500,
      pf_deduction: 6240,
      tax_deduction: 2500,
      professional_tax: 200,
      bank_name: 'HDFC Bank',
      bank_account_number: '5010041289901',
      bank_ifsc: 'HDFC0000085',
    },
    {
      id: 103,
      school_id: 1,
      employee_id: 'STAFF-SLG-03',
      name: 'Tanmoy Das',
      email: 'tanmoy.das@school.com',
      phone: '+91 98320 11006',
      department: 'Finance & Accounts',
      designation: 'Senior Bursar & Cashier',
      employment_type: 'Permanent Full-Time',
      joining_date: '2016-09-01',
      status: 'active',
      basic_pay: 42000,
      da: 12600,
      hra: 8400,
      special_allowance: 3000,
      pf_deduction: 5040,
      tax_deduction: 1800,
      professional_tax: 200,
      bank_name: 'State Bank of India',
      bank_account_number: '30998124560',
      bank_ifsc: 'SBIN0000184',
    },
    {
      id: 104,
      school_id: 1,
      employee_id: 'STAFF-SLG-04',
      name: 'Bikas Chettri',
      email: 'bikas.chettri@school.com',
      phone: '+91 98320 11005',
      department: 'Sports & Athletics',
      designation: 'Director of Physical Education',
      employment_type: 'Permanent Full-Time',
      joining_date: '2016-01-12',
      status: 'active',
      basic_pay: 43000,
      da: 12900,
      hra: 8600,
      special_allowance: 3000,
      pf_deduction: 5160,
      tax_deduction: 1900,
      professional_tax: 200,
      bank_name: 'Punjab National Bank',
      bank_account_number: '142300010024589',
      bank_ifsc: 'PUNB0014200',
    },
    {
      id: 105,
      school_id: 1,
      employee_id: 'STAFF-SLG-05',
      name: 'Subir Karmakar',
      email: 'subir.karmakar@school.com',
      phone: '+91 98320 11007',
      department: 'IT Infrastructure',
      designation: 'System Administrator & Network Engineer',
      employment_type: 'Contractual',
      joining_date: '2022-03-01',
      status: 'active',
      basic_pay: 36000,
      da: 10800,
      hra: 7200,
      special_allowance: 4000,
      pf_deduction: 4320,
      tax_deduction: 1200,
      professional_tax: 200,
      bank_name: 'Axis Bank',
      bank_account_number: '91501008891244',
      bank_ifsc: 'UTIB0000122',
    },
  ],
  2: [ // Kolkata Central Campus
    {
      id: 201,
      school_id: 2,
      employee_id: 'STAFF-KOL-01',
      name: 'Debashis Banerjee',
      email: 'debashis.banerjee@school.com',
      phone: '+91 98300 22001',
      department: 'Academics',
      designation: 'Vice Principal & HOD Mathematics',
      employment_type: 'Permanent Full-Time',
      joining_date: '2016-04-01',
      status: 'active',
      basic_pay: 64000,
      da: 19200,
      hra: 12800,
      special_allowance: 5000,
      pf_deduction: 7680,
      tax_deduction: 4200,
      professional_tax: 200,
      bank_name: 'State Bank of India',
      bank_account_number: '20045899124',
      bank_ifsc: 'SBIN0000001',
    },
    {
      id: 202,
      school_id: 2,
      employee_id: 'STAFF-KOL-02',
      name: 'Sarmistha Ghosh',
      email: 'sarmistha.ghosh@school.com',
      phone: '+91 98300 22002',
      department: 'Academics',
      designation: 'Senior Faculty Biology & EVS',
      employment_type: 'Permanent Full-Time',
      joining_date: '2018-06-15',
      status: 'active',
      basic_pay: 54000,
      da: 16200,
      hra: 10800,
      special_allowance: 3800,
      pf_deduction: 6480,
      tax_deduction: 2800,
      professional_tax: 200,
      bank_name: 'HDFC Bank',
      bank_account_number: '5010098452101',
      bank_ifsc: 'HDFC0000014',
    },
    {
      id: 203,
      school_id: 2,
      employee_id: 'STAFF-KOL-03',
      name: 'Indranil Dutta',
      email: 'indranil.dutta@school.com',
      phone: '+91 98300 22006',
      department: 'Administration',
      designation: 'Chief Administrative Officer',
      employment_type: 'Permanent Full-Time',
      joining_date: '2017-02-01',
      status: 'active',
      basic_pay: 56000,
      da: 16800,
      hra: 11200,
      special_allowance: 4500,
      pf_deduction: 6720,
      tax_deduction: 3100,
      professional_tax: 200,
      bank_name: 'ICICI Bank',
      bank_account_number: '000601994512',
      bank_ifsc: 'ICIC0000006',
    },
    {
      id: 204,
      school_id: 2,
      employee_id: 'STAFF-KOL-04',
      name: 'Rituparna Chatterjee',
      email: 'rituparna.chatterjee@school.com',
      phone: '+91 98300 22004',
      department: 'Academics',
      designation: 'PGT English & Drama Coach',
      employment_type: 'Permanent Full-Time',
      joining_date: '2020-03-01',
      status: 'active',
      basic_pay: 48000,
      da: 14400,
      hra: 9600,
      special_allowance: 3200,
      pf_deduction: 5760,
      tax_deduction: 2200,
      professional_tax: 200,
      bank_name: 'ICICI Bank',
      bank_account_number: '000601548792',
      bank_ifsc: 'ICIC0000006',
    },
  ],
  3: [ // Bangalore South Campus
    {
      id: 301,
      school_id: 3,
      employee_id: 'STAFF-BLR-01',
      name: 'S. R. Nagaraj',
      email: 'sr.nagaraj@school.com',
      phone: '+91 98450 33001',
      department: 'Academics',
      designation: 'HOD Computer Science & Robotics',
      employment_type: 'Permanent Full-Time',
      joining_date: '2020-06-01',
      status: 'active',
      basic_pay: 65000,
      da: 19500,
      hra: 13000,
      special_allowance: 6000,
      pf_deduction: 7800,
      tax_deduction: 4500,
      professional_tax: 200,
      bank_name: 'HDFC Bank',
      bank_account_number: '5010088991201',
      bank_ifsc: 'HDFC0000184',
    },
    {
      id: 302,
      school_id: 3,
      employee_id: 'STAFF-BLR-02',
      name: 'Vidya Krishnan',
      email: 'vidya.krishnan@school.com',
      phone: '+91 98450 33002',
      department: 'Academics',
      designation: 'PGT Physics & Applied Mathematics',
      employment_type: 'Permanent Full-Time',
      joining_date: '2020-08-15',
      status: 'active',
      basic_pay: 56000,
      da: 16800,
      hra: 11200,
      special_allowance: 4000,
      pf_deduction: 6720,
      tax_deduction: 3000,
      professional_tax: 200,
      bank_name: 'State Bank of India',
      bank_account_number: '31289004561',
      bank_ifsc: 'SBIN0001811',
    },
    {
      id: 303,
      school_id: 3,
      employee_id: 'STAFF-BLR-03',
      name: 'Vinay Kumar',
      email: 'vinay.kumar@school.com',
      phone: '+91 98450 33006',
      department: 'Operations',
      designation: 'Campus Operations & Security Manager',
      employment_type: 'Permanent Full-Time',
      joining_date: '2021-01-10',
      status: 'active',
      basic_pay: 46000,
      da: 13800,
      hra: 9200,
      special_allowance: 3500,
      pf_deduction: 5520,
      tax_deduction: 2100,
      professional_tax: 200,
      bank_name: 'Kotak Mahindra Bank',
      bank_account_number: '7812009941',
      bank_ifsc: 'KKBK0008054',
    },
    {
      id: 304,
      school_id: 3,
      employee_id: 'STAFF-BLR-04',
      name: 'Arvind Swamy',
      email: 'arvind.swamy@school.com',
      phone: '+91 98450 33004',
      department: 'Academics',
      designation: 'TGT Economics & Social Studies',
      employment_type: 'Permanent Full-Time',
      joining_date: '2021-10-01',
      status: 'active',
      basic_pay: 45000,
      da: 13500,
      hra: 9000,
      special_allowance: 3000,
      pf_deduction: 5400,
      tax_deduction: 1900,
      professional_tax: 200,
      bank_name: 'Kotak Mahindra Bank',
      bank_account_number: '7812004589',
      bank_ifsc: 'KKBK0008054',
    },
  ]
};

// -------------------------------------------------------------
// 5. FEE STRUCTURES & PAYMENTS PER BRANCH
// -------------------------------------------------------------
export const BRANCH_FEE_STRUCTURES = {
  1: [ // Siliguri
    { name: 'Monthly Tuition Fee (Primary 1-5)', type: 'tuition', amount: 2800, frequency: 'monthly', description: 'Regular academic tuition charge for primary classes', is_mandatory: true },
    { name: 'Monthly Tuition Fee (Secondary 6-10)', type: 'tuition', amount: 3500, frequency: 'monthly', description: 'Academic tuition for middle & secondary sections', is_mandatory: true },
    { name: 'Computer & AI Lab Fee', type: 'other', amount: 600, frequency: 'monthly', description: 'Modern multimedia lab and IT access', is_mandatory: true },
    { name: 'School Bus Transport (Zone A & B)', type: 'transport', amount: 1400, frequency: 'monthly', description: 'Campus transit and air-conditioned bus service', is_mandatory: false },
    { name: 'Annual Development & Sports Fund', type: 'other', amount: 4500, frequency: 'one-time', description: 'Annual campus maintenance, library, sports & activities', is_mandatory: true },
  ],
  2: [ // Kolkata
    { name: 'Monthly Tuition Fee (Primary 1-5)', type: 'tuition', amount: 3200, frequency: 'monthly', description: 'ICSE curriculum regular tuition fee', is_mandatory: true },
    { name: 'Monthly Tuition Fee (Secondary 6-10)', type: 'tuition', amount: 4200, frequency: 'monthly', description: 'ICSE board secondary section tuition fee', is_mandatory: true },
    { name: 'Robotics & Maker Lab Fee', type: 'other', amount: 800, frequency: 'monthly', description: 'Practical lab materials, 3D printing & innovation hub', is_mandatory: true },
    { name: 'City Bus Transport Service', type: 'transport', amount: 1800, frequency: 'monthly', description: 'Dedicated transit covering Salt Lake, South & Central Kolkata', is_mandatory: false },
    { name: 'Annual Heritage & Cultural Activity Fee', type: 'other', amount: 5000, frequency: 'one-time', description: 'Annual cultural shows, theatre, drama & library dues', is_mandatory: true },
  ],
  3: [ // Bangalore
    { name: 'Monthly Tuition Fee (Primary 1-5)', type: 'tuition', amount: 3800, frequency: 'monthly', description: 'Advanced tech-integrated primary tuition charge', is_mandatory: true },
    { name: 'Monthly Tuition Fee (Secondary 6-10)', type: 'tuition', amount: 4800, frequency: 'monthly', description: 'Secondary grade curriculum and experiential learning', is_mandatory: true },
    { name: 'AI, Coding & Robotics Studio Fee', type: 'other', amount: 1200, frequency: 'monthly', description: 'High-performance lab, IoT boards and software licenses', is_mandatory: true },
    { name: 'Tech Campus Transport (GPS Monitored)', type: 'transport', amount: 2200, frequency: 'monthly', description: 'Electronic City, HSR, Koramangala & Whitefield bus route', is_mandatory: false },
    { name: 'Annual Innovation & Infrastructure Fee', type: 'other', amount: 6500, frequency: 'one-time', description: 'Annual campus tech infrastructure, sports arena & hackathons', is_mandatory: true },
  ]
};

// -------------------------------------------------------------
// 6. EVENTS & CALENDAR PER BRANCH
// -------------------------------------------------------------
export const BRANCH_EVENTS = {
  1: [ // Siliguri
    {
      id: 1001,
      school_id: 1,
      title: 'Kanchenjunga Annual Athletics & Sports Meet',
      description: 'Annual inter-house track & field championship, march past, and award ceremony presided by regional sports dignitaries.',
      category: 'Sports',
      event_type: 'Sports',
      start_date: '2026-11-28T09:00:00Z',
      end_date: '2026-11-29T16:30:00Z',
      location: 'Main Sports Complex & Football Oval, Siliguri Campus',
      target_audience: 'all',
      organizer: 'Bikas Chettri (Sports Dept)',
      status: 'upcoming',
      is_public: true,
      color: '#2563EB',
    },
    {
      id: 1002,
      school_id: 1,
      title: 'North Bengal Inter-School Science & AI Fair',
      description: 'Young inventors exhibition covering renewable hydro energy, organic tea agriculture robotics, and IoT disaster early warning systems.',
      category: 'Academic',
      event_type: 'Academic',
      start_date: '2026-12-15T10:00:00Z',
      end_date: '2026-12-16T17:00:00Z',
      location: 'Auditorium & STEM Lab Block',
      target_audience: 'students',
      organizer: 'Sunita Sen & Priyanka Sharma',
      status: 'upcoming',
      is_public: true,
      color: '#059669',
    },
    {
      id: 1003,
      school_id: 1,
      title: 'Term 1 Comprehensive PTM Conference',
      description: 'Parent-Teacher conference to discuss student academic performance, attendance records, and personal development.',
      category: 'PTM',
      event_type: 'PTM',
      start_date: '2026-10-18T08:30:00Z',
      end_date: '2026-10-18T14:00:00Z',
      location: 'Respective Classrooms (Grades 1 to 10)',
      target_audience: 'parents',
      organizer: 'Academic Coordination Committee',
      status: 'completed',
      is_public: false,
      color: '#7C3AED',
    },
  ],
  2: [ // Kolkata
    {
      id: 2001,
      school_id: 2,
      title: 'Rabindra Jayanti & Heritage Cultural Gala',
      description: 'Grand cultural celebration featuring Rabindrasangeet, traditional drama, classical recitals, and literary exhibitions.',
      category: 'Cultural',
      event_type: 'Cultural',
      start_date: '2026-05-09T10:00:00Z',
      end_date: '2026-05-09T18:00:00Z',
      location: 'Campus Open Air Amphitheatre, Park Street',
      target_audience: 'all',
      organizer: 'Rituparna Chatterjee & Fine Arts Guild',
      status: 'upcoming',
      is_public: true,
      color: '#7C3AED',
    },
    {
      id: 2002,
      school_id: 2,
      title: 'Inter-School Parliamentary Debate Championship',
      description: 'Annual prestigious debate tournament bringing top 16 Kolkata ICSE and CBSE institutions for fierce oratory rounds.',
      category: 'Academic',
      event_type: 'Academic',
      start_date: '2026-11-24T09:30:00Z',
      end_date: '2026-11-25T16:00:00Z',
      location: 'Central Conference Hall',
      target_audience: 'students',
      organizer: 'Subrata Bose (Social Sciences)',
      status: 'upcoming',
      is_public: true,
      color: '#2563EB',
    },
    {
      id: 2003,
      school_id: 2,
      title: 'ICSE Board Preparation & Parent Review Meet',
      description: 'Strategic orientation for Class 9 and 10 parents on syllabus milestones, practicals, internal assessments, and board answer presentation.',
      category: 'PTM',
      event_type: 'PTM',
      start_date: '2026-12-05T09:00:00Z',
      end_date: '2026-12-05T13:30:00Z',
      location: 'Audio-Visual Lecture Hall',
      target_audience: 'parents',
      organizer: 'Debashis Banerjee (Vice Principal)',
      status: 'upcoming',
      is_public: false,
      color: '#D97706',
    },
  ],
  3: [ // Bangalore
    {
      id: 3001,
      school_id: 3,
      title: 'Silicon Valley Junior Hackathon & AI Demo Day',
      description: '48-hour student coding sprint building automated assistive tech, computer vision apps, and generative AI models with mentor support.',
      category: 'Academic',
      event_type: 'Academic',
      start_date: '2026-12-08T08:00:00Z',
      end_date: '2026-12-09T19:00:00Z',
      location: 'Tinkering Lab & Tech Innovation Arena, Koramangala',
      target_audience: 'all',
      organizer: 'S. R. Nagaraj (HOD CSE & Robotics)',
      status: 'upcoming',
      is_public: true,
      color: '#059669',
    },
    {
      id: 3002,
      school_id: 3,
      title: 'South Zone Inter-School Badminton & Tennis Open',
      description: 'Championship tournament hosting over 40 school contingents across U-12, U-14, and U-16 categories on state-of-the-art synthetic courts.',
      category: 'Sports',
      event_type: 'Sports',
      start_date: '2026-11-21T08:30:00Z',
      end_date: '2026-11-23T17:30:00Z',
      location: 'Indoor Multi-Sport Arena',
      target_audience: 'all',
      organizer: 'Vinay Kumar & Sports Academy',
      status: 'upcoming',
      is_public: true,
      color: '#DC2626',
    },
    {
      id: 3003,
      school_id: 3,
      title: 'Innovation Portfolio Showcase & Parent Conference',
      description: 'Term review where students present their hands-on science models, coding projects, and academic portfolios directly to parents.',
      category: 'PTM',
      event_type: 'PTM',
      start_date: '2026-10-24T09:00:00Z',
      end_date: '2026-10-24T15:00:00Z',
      location: 'Primary & Secondary Courtyards',
      target_audience: 'parents',
      organizer: 'Dr. R. K. Venkatesh (Principal)',
      status: 'completed',
      is_public: false,
      color: '#4F46E5',
    },
  ]
};

// -------------------------------------------------------------
// 7. SYSTEM NOTIFICATIONS PER BRANCH
// -------------------------------------------------------------
export const BRANCH_NOTIFICATIONS = {
  1: [
    {
      id: 'notif_slg_1',
      school_id: 1,
      title: 'Kanchenjunga Sports Meet 2026 Athlete Trials',
      message: 'Trials for 100m, 400m, high jump, and relay teams start this Wednesday at 7:30 AM on the main athletics track.',
      type: 'event',
      target_role: 'student',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      is_read: false,
    },
    {
      id: 'notif_slg_2',
      school_id: 1,
      title: 'Fee Due Reminder: November Session Installment',
      message: 'Monthly tuition and bus fee for November 2026 is due by November 20th. Avoid late fine by clearing online via UPI / Net Banking.',
      type: 'fee',
      target_role: 'parent',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      is_read: false,
    },
    {
      id: 'notif_slg_3',
      school_id: 1,
      title: 'Staff Payroll Disbursed for October 2026',
      message: 'Monthly salaries and allowances have been credited to registered bank accounts. Payslips are now available in the HRMS portal.',
      type: 'hrms',
      target_role: 'teacher',
      created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
      is_read: true,
    },
  ],
  2: [
    {
      id: 'notif_kol_1',
      school_id: 2,
      title: 'Inter-School Debate Championship Roster Published',
      message: 'Selected speakers for the Kolkata ICSE Parliamentary Debate must report to Hall B for preparation sessions with Mrs. Chatterjee.',
      type: 'academic',
      target_role: 'student',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      is_read: false,
    },
    {
      id: 'notif_kol_2',
      school_id: 2,
      title: 'ICSE Mock Board Exam Schedule Released',
      message: 'Timetables for Class 10 mock assessments have been uploaded. Download the admit slip from the student examination portal.',
      type: 'exam',
      target_role: 'parent',
      created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
      is_read: false,
    },
  ],
  3: [
    {
      id: 'notif_blr_1',
      school_id: 3,
      title: 'AI & Robotics Hackathon Registration Open',
      message: 'Teams of 3 to 4 students from Classes 7 to 10 can now submit project briefs for the Silicon Valley Junior Hackathon.',
      type: 'event',
      target_role: 'student',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      is_read: false,
    },
    {
      id: 'notif_blr_2',
      school_id: 3,
      title: 'GPS Bus Tracking App Update (Bangalore Routes)',
      message: 'All school transit buses on Outer Ring Road, HSR, and Koramangala now feature live telemetry. Parents can track routes via portal.',
      type: 'transport',
      target_role: 'parent',
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      is_read: true,
    },
  ]
};

// -------------------------------------------------------------
// 8. MASTER SEEDER CONTROLLER
// -------------------------------------------------------------

/**
 * Seed all branches or selected branches with complete mock and persistent state
 * @param {Object} options
 * @param {Array<number>} options.branches - Array of school IDs to seed (defaults to [1, 2, 3])
 * @param {boolean} options.seedSupabase - Whether to attempt writing to Supabase tables
 * @param {boolean} options.seedLocal - Whether to populate localStorage mock caches
 * @param {Function} options.onProgress - Progress callback: (stepName, percent, details) => void
 * @returns {Promise<Object>} Summary of seeded entities
 */
export async function seedAllBranchesData(options = {}) {
  const branches = options.branches && options.branches.length > 0 ? options.branches : [1, 2, 3];
  const seedLocal = options.seedLocal !== false;
  const seedSupabase = options.seedSupabase === true;
  const onProgress = options.onProgress || (() => {});

  const summary = {
    schools: 0,
    academicYears: 2,
    classes: 0,
    sections: 0,
    subjects: 0,
    teachers: 0,
    students: 0,
    feeStructures: 0,
    feePayments: 0,
    hrmsStaff: 0,
    payrollRecords: 0,
    events: 0,
    notifications: 0,
  };

  try {
    // ---------------------------------------------------------
    // STEP 1: Seed Campuses & Branches (10%)
    // ---------------------------------------------------------
    onProgress('Campuses & Branches', 10, 'Initializing 3 enterprise campuses (Siliguri, Kolkata, Bangalore)...');
    if (seedLocal) {
      saveStoredSchools(BRANCH_CONFIGS);
      summary.schools = BRANCH_CONFIGS.length;
    }

    // ---------------------------------------------------------
    // STEP 2: Seed Academic Setup (Classes, Sections, Subjects) (25%)
    // ---------------------------------------------------------
    onProgress('Academic Structure', 25, 'Configuring classes 1-10, sections A/B, and curriculum subjects...');
    let totalClasses = 0;
    let totalSections = 0;
    let totalSubjects = 0;

    branches.forEach(bId => {
      totalClasses += SEEDED_CLASSES.length;
      totalSections += SEEDED_CLASSES.length * SEEDED_SECTIONS.length;
      totalSubjects += (BRANCH_SUBJECTS[bId] || []).length;
    });

    summary.classes = totalClasses;
    summary.sections = totalSections;
    summary.subjects = totalSubjects;

    // Cache seeded classes & sections locally
    if (seedLocal) {
      const seededClassesStore = [];
      let classCounter = 1;
      branches.forEach(bId => {
        SEEDED_CLASSES.forEach(c => {
          const clsId = (bId * 100) + c.order;
          seededClassesStore.push({
            id: clsId,
            school_id: bId,
            name: c.name,
            numeric_name: c.numeric_name,
            order: c.order,
            description: c.description,
            status: 'active',
            sections: SEEDED_SECTIONS.map((sec, idx) => ({
              id: (clsId * 10) + (idx + 1),
              class_id: clsId,
              name: sec.name,
              capacity: sec.capacity,
              current_strength: 32 + (idx * 3),
              status: 'active',
            }))
          });
        });
      });
      localStorage.setItem('sms_seeded_classes', JSON.stringify(seededClassesStore));
    }

    // ---------------------------------------------------------
    // STEP 3: Seed Faculty & Staff Members (40%)
    // ---------------------------------------------------------
    onProgress('Faculty & HRMS Staff', 40, 'Onboarding faculty with bank details, IFSC & compensation...');
    let totalTeachers = 0;
    const allHrmsStaff = [];

    branches.forEach(bId => {
      const teachers = BRANCH_FACULTY[bId] || [];
      totalTeachers += teachers.length;

      const hrms = BRANCH_HRMS_STAFF[bId] || [];
      allHrmsStaff.push(...hrms);
    });

    summary.teachers = totalTeachers;
    summary.hrmsStaff = allHrmsStaff.length;

    if (seedLocal) {
      localStorage.setItem('sms_hrms_staff', JSON.stringify(allHrmsStaff));
      localStorage.setItem('sms_seeded_teachers', JSON.stringify(
        branches.flatMap(bId => (BRANCH_FACULTY[bId] || []).map((t, idx) => ({
          ...t,
          id: (bId * 100) + (idx + 1),
          school_id: bId,
        })))
      ));
    }

    // ---------------------------------------------------------
    // STEP 4: Seed Students & Parent Relations (55%)
    // ---------------------------------------------------------
    onProgress('Students & Admissions', 55, 'Enrolling students, assigning admission numbers and parent linkages...');
    const allStudents = [];
    let studentIdCounter = 1;

    branches.forEach(bId => {
      const students = BRANCH_STUDENTS[bId] || [];
      students.forEach((st, idx) => {
        const studentId = (bId * 1000) + (idx + 1);
        allStudents.push({
          ...st,
          id: studentId,
          school_id: bId,
          academic_year_id: 2,
          class_id: (bId * 100) + st.class_order,
          section_id: (bId * 1000) + (st.class_order * 10) + (st.section_name === 'B' ? 2 : 1),
          status: 'active',
          admission_date: '2026-04-01',
          class: { name: `Class ${st.class_order}` },
          section: { name: st.section_name },
          user: {
            name: `${st.first_name} ${st.last_name}`,
            email: st.email,
            phone: st.phone,
            city: st.city,
            state: st.state,
          }
        });
      });
    });

    summary.students = allStudents.length;

    if (seedLocal) {
      localStorage.setItem('sms_seeded_students', JSON.stringify(allStudents));
    }

    // ---------------------------------------------------------
    // STEP 5: Seed Fee Structures & Payment Receipts (70%)
    // ---------------------------------------------------------
    onProgress('Fee Structures & Receipts', 70, 'Configuring tuition, lab, and transport fees with receipt numbers...');
    const allFeeStructures = [];
    const allFeePayments = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    branches.forEach(bId => {
      const branchCfg = BRANCH_CONFIGS.find(b => b.id === bId) || BRANCH_CONFIGS[0];
      const feeDefs = BRANCH_FEE_STRUCTURES[bId] || [];

      feeDefs.forEach((fDef, fIdx) => {
        const fId = (bId * 100) + (fIdx + 1);
        allFeeStructures.push({
          ...fDef,
          id: fId,
          school_id: bId,
          academic_year_id: 2,
          status: 'active',
        });
      });

      // Generate payment receipts for students
      const students = allStudents.filter(s => s.school_id === bId);
      students.forEach((st, sIdx) => {
        const receiptCode = `${branchCfg.receiptPrefix}2026${String(sIdx + 1).padStart(4, '0')}`;
        allFeePayments.push({
          id: (bId * 1000) + (sIdx + 1),
          school_id: bId,
          student_id: st.id,
          fee_structure_id: (bId * 100) + 1,
          amount: bId === 1 ? 2800 : (bId === 2 ? 3200 : 3800),
          discount: sIdx % 4 === 0 ? 300 : 0,
          fine: 0,
          total_amount: (bId === 1 ? 2800 : (bId === 2 ? 3200 : 3800)) - (sIdx % 4 === 0 ? 300 : 0),
          payment_date: '2026-10-10',
          payment_method: sIdx % 2 === 0 ? 'upi' : 'net_banking',
          transaction_id: `TXN${bId}2026${Math.floor(100000 + Math.random() * 900000)}`,
          receipt_number: receiptCode,
          remarks: 'Term tuition installment completed successfully',
          status: 'completed',
          student: {
            first_name: st.first_name,
            last_name: st.last_name,
            admission_number: st.admission_number,
            roll_number: st.roll_number,
            class: st.class,
            section: st.section,
          },
          fee_structure: {
            name: 'Monthly Tuition Fee',
            type: 'tuition',
          }
        });
      });
    });

    summary.feeStructures = allFeeStructures.length;
    summary.feePayments = allFeePayments.length;

    if (seedLocal) {
      localStorage.setItem('sms_seeded_fee_structures', JSON.stringify(allFeeStructures));
      localStorage.setItem('sms_seeded_fee_payments', JSON.stringify(allFeePayments));
    }

    // ---------------------------------------------------------
    // STEP 6: Seed Monthly Payroll Records & Leaves (85%)
    // ---------------------------------------------------------
    onProgress('HRMS Payroll & Leaves', 85, 'Generating monthly payslips and leave management records...');
    const allPayrollRecords = [];
    const months = ['2026-08', '2026-09', '2026-10'];
    let payrollCounter = 1;

    allHrmsStaff.forEach(staff => {
      months.forEach(m => {
        const gross = staff.basic_pay + staff.da + staff.hra + (staff.special_allowance || 0);
        const totalDeductions = (staff.pf_deduction || 0) + (staff.tax_deduction || 0) + (staff.professional_tax || 200);
        const net = gross - totalDeductions;

        allPayrollRecords.push({
          id: payrollCounter++,
          school_id: staff.school_id,
          staff_id: staff.id,
          employee_id: staff.employee_id,
          staff_name: staff.name,
          department: staff.department,
          designation: staff.designation,
          month: m,
          basic_pay: staff.basic_pay,
          da: staff.da,
          hra: staff.hra,
          special_allowance: staff.special_allowance || 0,
          gross_pay: gross,
          pf_deduction: staff.pf_deduction || 0,
          tax_deduction: staff.tax_deduction || 0,
          professional_tax: staff.professional_tax || 200,
          total_deductions: totalDeductions,
          net_pay: net,
          slip_number: `PAY-${staff.school_id}-${m.replace('-', '')}-${String(staff.id).padStart(3, '0')}`,
          status: 'paid',
          disbursement_date: `${m}-28`,
          payment_mode: 'Direct Bank Transfer',
          bank_name: staff.bank_name,
          bank_account_number: staff.bank_account_number,
          bank_ifsc: staff.bank_ifsc,
        });
      });
    });

    summary.payrollRecords = allPayrollRecords.length;

    if (seedLocal) {
      localStorage.setItem('sms_hrms_payroll', JSON.stringify(allPayrollRecords));

      // Seed realistic leaves
      const sampleLeaves = [
        {
          id: 1,
          school_id: 1,
          staff_id: 101,
          staff_name: 'Rajesh Kumar',
          leave_type: 'Casual Leave',
          start_date: '2026-11-20',
          end_date: '2026-11-21',
          days: 2,
          reason: 'Family wedding ceremony',
          status: 'approved',
          applied_on: '2026-11-10',
          approved_by: 'Dr. Anirban Mukherjee',
        },
        {
          id: 2,
          school_id: 2,
          staff_id: 201,
          staff_name: 'Debashis Banerjee',
          leave_type: 'Medical Leave',
          start_date: '2026-11-15',
          end_date: '2026-11-17',
          days: 3,
          reason: 'Seasonal viral fever',
          status: 'approved',
          applied_on: '2026-11-14',
          approved_by: "Sister Margaret D'Souza",
        },
        {
          id: 3,
          school_id: 3,
          staff_id: 301,
          staff_name: 'S. R. Nagaraj',
          leave_type: 'Earned Leave',
          start_date: '2026-12-24',
          end_date: '2026-12-28',
          days: 5,
          reason: 'Year-end tech conference attending',
          status: 'pending',
          applied_on: '2026-11-12',
          approved_by: null,
        },
      ];
      localStorage.setItem('sms_hrms_leaves', JSON.stringify(sampleLeaves));
    }

    // ---------------------------------------------------------
    // STEP 7: Seed Events, Calendar & Notifications (100%)
    // ---------------------------------------------------------
    onProgress('Events & Notifications', 95, 'Populating institutional events calendar and notifications...');
    const allEvents = [];
    const allNotifs = [];

    branches.forEach(bId => {
      allEvents.push(...(BRANCH_EVENTS[bId] || []));
      allNotifs.push(...(BRANCH_NOTIFICATIONS[bId] || []));
    });

    summary.events = allEvents.length;
    summary.notifications = allNotifs.length;

    if (seedLocal) {
      localStorage.setItem('sms_school_events', JSON.stringify(allEvents));
      localStorage.setItem('sms_notifications', JSON.stringify(allNotifs));
    }

    onProgress('Complete', 100, 'All branches and features seeded successfully!');

    // Trigger window event so active components re-render immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms-branch-changed'));
      window.dispatchEvent(new CustomEvent('sms-schools-updated'));
    }

    return {
      success: true,
      message: 'Comprehensive multi-branch dummy data seeded successfully across all features.',
      summary,
    };
  } catch (err) {
    console.error('Data seeder failed:', err);
    throw err;
  }
}

/**
 * Resets seeded caches back to default state
 */
export function clearAllBranchesData() {
  const keysToRemove = [
    'sms_seeded_classes',
    'sms_seeded_teachers',
    'sms_seeded_students',
    'sms_seeded_fee_structures',
    'sms_seeded_fee_payments',
    'sms_hrms_staff',
    'sms_hrms_payroll',
    'sms_hrms_leaves',
    'sms_school_events',
    'sms_notifications',
  ];

  keysToRemove.forEach(k => localStorage.removeItem(k));
  saveStoredSchools(DEFAULT_SCHOOLS);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sms-branch-changed'));
    window.dispatchEvent(new CustomEvent('sms-schools-updated'));
  }

  return { success: true, message: 'All seeded branch data cleared successfully.' };
}

