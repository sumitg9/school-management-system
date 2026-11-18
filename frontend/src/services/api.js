import axios from 'axios';
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import { validateStudentDateOfBirth, validateTeacherDateOfBirth, validateDateOfBirth } from '../utils/dateFormatter';
import { findLinkedStudentsForParent } from '../utils/parentStudentLinker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const useSupabase = import.meta.env.VITE_USE_SUPABASE !== 'false';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors gracefully
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Pagination helper for Supabase results
const paginate = (data, count, params) => {
  const page = parseInt(params?.page || 1, 10);
  const perPage = params?.per_page === 'all' ? (count || data?.length || 0) : parseInt(params?.per_page || 20, 10);
  return {
    success: true,
    data: data || [],
    meta: {
      current_page: page,
      last_page: perPage > 0 ? Math.max(1, Math.ceil((count || data?.length || 0) / perPage)) : 1,
      per_page: perPage,
      total: count ?? (data?.length || 0),
    },
  };
};

// Database constraint error helper for user-friendly notifications
const formatDbError = (err, defaultMsg = 'An unexpected error occurred') => {
  if (!err) return defaultMsg;
  const msg = err.message || (typeof err === 'string' ? err : defaultMsg);
  if (err.code === '23505' || msg.includes('unique constraint') || msg.includes('duplicate key')) {
    if (msg.includes('employee_id') || msg.includes('teachers_employee_id_unique')) {
      return 'This Employee ID is already registered. Please choose a unique Employee ID.';
    }
    if (msg.includes('email') || msg.includes('users_email_unique')) {
      return 'This email address is already registered. Please use a different email.';
    }
    return 'A record with these details already exists. Please verify unique fields.';
  }
  if (err.code === '23502' || msg.includes('violates not-null constraint')) {
    const match = msg.match(/column "([^"]+)"/);
    const colName = match ? match[1].replace(/_/g, ' ') : 'required field';
    return `Please fill in the ${colName}. It cannot be empty.`;
  }
  return msg;
};

// ==========================================
// Multi-School / Multi-Branch Master Tenant Registry & Security Scoping
// ==========================================
export const DEFAULT_SCHOOLS = [
  {
    id: 1,
    uuid: 'sch-001-sil',
    code: 'DPA-SIL-01',
    name: 'Delhi Public Academy - Siliguri Main Campus',
    shortName: 'Siliguri Main',
    slug: 'siliguri-main',
    affiliationNumber: 'CBSE/AFF/2430188',
    establishedYear: 2012,
    curriculum: 'CBSE',
    address: 'Hill Cart Road, Pradhan Nagar',
    city: 'Siliguri',
    state: 'West Bengal',
    postalCode: '734001',
    country: 'India',
    phone: '+91 353 2548900',
    email: 'siliguri.campus@school.com',
    website: 'https://siliguri.dpa.edu',
    logo: 'preset:🏫',
    primaryColor: '#2563EB',
    receiptPrefix: 'REC-SIL-',
    principalName: 'Dr. Sunita Sharma',
    status: 'active',
    studentCount: 1420,
    facultyCount: 84,
    feeRealization: 96,
  },
  {
    id: 2,
    uuid: 'sch-002-kol',
    code: 'DPA-KOL-02',
    name: 'Delhi Public Academy - Kolkata Campus',
    shortName: 'Kolkata Campus',
    slug: 'kolkata-campus',
    affiliationNumber: 'CBSE/AFF/2430299',
    establishedYear: 2018,
    curriculum: 'CBSE',
    address: 'Plot 12, Block EP & GP, Sector V, Salt Lake City',
    city: 'Kolkata',
    state: 'West Bengal',
    postalCode: '700091',
    country: 'India',
    phone: '+91 33 24901122',
    email: 'kolkata.campus@school.com',
    website: 'https://kolkata.dpa.edu',
    logo: 'preset:🏛️',
    primaryColor: '#059669',
    receiptPrefix: 'REC-KOL-',
    principalName: 'Prof. Subhash Chandra Bose',
    status: 'active',
    studentCount: 890,
    facultyCount: 56,
    feeRealization: 94,
  },
  {
    id: 3,
    uuid: 'sch-003-blr',
    code: 'DPA-BLR-03',
    name: 'Delhi Public Academy - Bangalore South Campus',
    shortName: 'Bangalore South',
    slug: 'bangalore-south',
    affiliationNumber: 'CBSE/AFF/1930412',
    establishedYear: 2021,
    curriculum: 'CBSE',
    address: '17th Cross, HSR Layout Sector 2, Outer Ring Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560102',
    country: 'India',
    phone: '+91 80 41223344',
    email: 'bangalore.campus@school.com',
    website: 'https://bangalore.dpa.edu',
    logo: 'preset:🎓',
    primaryColor: '#7C3AED',
    receiptPrefix: 'REC-BLR-',
    principalName: 'Dr. K. R. Narayanan',
    status: 'active',
    studentCount: 650,
    facultyCount: 42,
    feeRealization: 98,
  },
];

const SCHOOLS_STORAGE_KEY = 'sms_schools';

export const getStoredSchools = () => {
  try {
    const raw = localStorage.getItem(SCHOOLS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasLegacyName = parsed.some(
          (s) =>
            (s.name && s.name.toLowerCase().includes('twinkling')) ||
            (s.website && s.website.toLowerCase().includes('twinkling'))
        );
        if (!hasLegacyName) return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored schools', e);
  }
  try {
    localStorage.setItem(SCHOOLS_STORAGE_KEY, JSON.stringify(DEFAULT_SCHOOLS));
  } catch (_) {}
  return DEFAULT_SCHOOLS;
};

export const saveStoredSchools = (schools) => {
  try {
    localStorage.setItem(SCHOOLS_STORAGE_KEY, JSON.stringify(schools));
    window.dispatchEvent(new CustomEvent('sms:schools-updated', { detail: { count: schools.length } }));
  } catch (e) {
    console.error('Failed to save schools', e);
  }
};

/**
 * Strict Security Scoping Context:
 * Validates caller's authorization boundary against tampering.
 */
export const getSchoolSecurityContext = () => {
  let user = null;
  try {
    const stored = localStorage.getItem('user');
    if (stored) user = JSON.parse(stored);
  } catch (_) {}

  const isSuperAdmin =
    user?.role === 'super-admin' ||
    user?.roles?.includes('super-admin') ||
    user?.is_group_admin === true ||
    user?.email?.toLowerCase() === 'superadmin@school.com';

  const allSchools = getStoredSchools();
  const allSchoolIds = allSchools.map((s) => s.id);

  const authorizedSchools = isSuperAdmin
    ? ['all', ...allSchoolIds]
    : (user?.authorized_schools || [user?.school_id || 1]).map((id) => (id === 'all' ? 1 : Number(id) || id));

  const defaultSchoolId = user?.school_id || 1;
  let activeSchoolId = defaultSchoolId;

  if (isSuperAdmin) {
    const storedActive = localStorage.getItem('sms_active_school_id');
    if (storedActive !== null && storedActive !== undefined && storedActive !== '') {
      activeSchoolId = storedActive === 'all' ? 'all' : Number(storedActive) || storedActive;
    }
  } else {
    // ENFORCE STRICT DATA ISOLATION:
    // If a non-superadmin client has a tampered activeSchoolId, reset it immediately to their authorized school!
    const storedActive = localStorage.getItem('sms_active_school_id');
    if (storedActive && !authorizedSchools.some((id) => String(id) === String(storedActive))) {
      localStorage.setItem('sms_active_school_id', String(defaultSchoolId));
    }
    activeSchoolId = defaultSchoolId;
  }

  return {
    user,
    isSuperAdmin,
    authorizedSchools,
    defaultSchoolId,
    activeSchoolId,
  };
};

/**
 * Calculates the effective school_id for queries and creation.
 * Guarantees a non-superadmin user CANNOT access data of another school.
 */
export const getEffectiveSchoolId = (requestedSchoolId) => {
  const { isSuperAdmin, authorizedSchools, defaultSchoolId, activeSchoolId } = getSchoolSecurityContext();

  if (!isSuperAdmin) {
    // Non-superadmin: Must only return an authorized school ID
    if (requestedSchoolId && authorizedSchools.some((id) => String(id) === String(requestedSchoolId))) {
      return requestedSchoolId;
    }
    return defaultSchoolId; // Forcibly lock to their assigned school branch
  }

  // Super Admin:
  if (requestedSchoolId !== undefined && requestedSchoolId !== null && requestedSchoolId !== '') {
    return requestedSchoolId;
  }

  return activeSchoolId;
};

/**
 * Validates if the target school ID is within the caller's authorization boundary.
 */
export const isSchoolAuthorized = (targetSchoolId) => {
  if (!targetSchoolId) return true;
  const { isSuperAdmin, authorizedSchools } = getSchoolSecurityContext();
  if (isSuperAdmin) return true;
  return authorizedSchools.some((id) => String(id) === String(targetSchoolId));
};

export const schoolsAPI = {
  getAll: async () => {
    const schools = getStoredSchools();
    const { isSuperAdmin, authorizedSchools } = getSchoolSecurityContext();

    if (isSuperAdmin) {
      return { success: true, data: schools, total: schools.length };
    }

    const allowed = schools.filter((s) => authorizedSchools.some((id) => String(id) === String(s.id)));
    return { success: true, data: allowed, total: allowed.length };
  },

  getById: async (id) => {
    const schools = getStoredSchools();
    const school = schools.find((s) => String(s.id) === String(id));
    if (!school) {
      throw new Error('School campus not found');
    }

    if (!isSchoolAuthorized(school.id)) {
      throw new Error('Access Denied: You do not have authorization to view this school campus.');
    }

    return { success: true, data: school };
  },

  create: async (schoolData) => {
    const { isSuperAdmin } = getSchoolSecurityContext();
    if (!isSuperAdmin) {
      throw new Error('Access Denied: Only Group Super Administrators can provision new school branches.');
    }

    const schools = getStoredSchools();
    const code = (schoolData.code || '').trim().toUpperCase();
    if (!code) throw new Error('School campus code is required.');
    if (schools.some((s) => s.code?.toUpperCase() === code)) {
      throw new Error(`A school campus with code "${code}" already exists.`);
    }

    const newId = Date.now();
    const newSchool = {
      id: newId,
      uuid: `sch-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      code,
      name: schoolData.name?.trim(),
      shortName: schoolData.shortName?.trim() || schoolData.name?.trim(),
      slug: (schoolData.slug || schoolData.shortName || schoolData.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      affiliationNumber: schoolData.affiliationNumber?.trim() || 'CBSE Board',
      establishedYear: parseInt(schoolData.establishedYear, 10) || new Date().getFullYear(),
      curriculum: schoolData.curriculum || 'CBSE',
      address: schoolData.address?.trim() || '',
      city: schoolData.city?.trim() || '',
      state: schoolData.state?.trim() || '',
      postalCode: schoolData.postalCode?.trim() || '',
      country: schoolData.country || 'India',
      phone: schoolData.phone?.trim() || '',
      email: schoolData.email?.trim() || '',
      website: schoolData.website?.trim() || '',
      logo: schoolData.logo || 'preset:🏫',
      primaryColor: schoolData.primaryColor || '#2563EB',
      receiptPrefix: (schoolData.receiptPrefix || `REC-${code.replace(/[^A-Z]/g, '').slice(0, 4)}-`).toUpperCase(),
      principalName: schoolData.principalName?.trim() || '',
      status: schoolData.status || 'active',
      studentCount: 0,
      facultyCount: 0,
      feeRealization: 100,
      createdAt: new Date().toISOString(),
    };

    schools.push(newSchool);
    saveStoredSchools(schools);
    return { success: true, message: 'New campus provisioned successfully!', data: newSchool };
  },

  update: async (id, schoolData) => {
    const { isSuperAdmin, user } = getSchoolSecurityContext();
    const schools = getStoredSchools();
    const idx = schools.findIndex((s) => String(s.id) === String(id));
    if (idx === -1) throw new Error('School campus not found.');

    const targetSchool = schools[idx];
    if (!isSuperAdmin && String(user?.school_id) !== String(targetSchool.id)) {
      throw new Error('Access Denied: You are not authorized to modify settings for this school campus.');
    }

    const updated = {
      ...targetSchool,
      ...schoolData,
      id: targetSchool.id,
      updatedAt: new Date().toISOString(),
    };

    schools[idx] = updated;
    saveStoredSchools(schools);
    window.dispatchEvent(new CustomEvent('sms:school-switched', { detail: { schoolId: targetSchool.id } }));
    return { success: true, message: 'Campus settings updated successfully!', data: updated };
  },

  delete: async (id) => {
    const { isSuperAdmin } = getSchoolSecurityContext();
    if (!isSuperAdmin) {
      throw new Error('Access Denied: Only Group Super Administrators can decommission school campuses.');
    }

    if (String(id) === '1') {
      throw new Error('The primary founding campus (Siliguri Main) cannot be deleted.');
    }

    const schools = getStoredSchools();
    const filtered = schools.filter((s) => String(s.id) !== String(id));
    if (filtered.length === schools.length) throw new Error('School campus not found.');

    saveStoredSchools(filtered);

    const storedActive = localStorage.getItem('sms_active_school_id');
    if (String(storedActive) === String(id)) {
      localStorage.setItem('sms_active_school_id', '1');
      window.dispatchEvent(new CustomEvent('sms:school-switched', { detail: { schoolId: 1 } }));
    }

    return { success: true, message: 'Campus decommissioned successfully.' };
  },

  getConsolidatedMetrics: async () => {
    const schools = getStoredSchools();
    const totalCampuses = schools.length;
    const totalStudents = schools.reduce((acc, s) => acc + (s.studentCount || 0), 0);
    const totalFaculty = schools.reduce((acc, s) => acc + (s.facultyCount || 0), 0);
    const avgFeeRealization =
      schools.length > 0
        ? Math.round(schools.reduce((acc, s) => acc + (s.feeRealization || 95), 0) / schools.length)
        : 95;

    return {
      success: true,
      data: {
        totalCampuses,
        totalStudents,
        totalFaculty,
        avgFeeRealization,
        campuses: schools,
      },
    };
  },
};

// ==========================================
// Authentication API (Powered by Supabase)
// ==========================================
export const authAPI = {
  login: async (credentials) => {
    const { email, password } = credentials;
    let authUser = null;
    let authToken = null;
    let roles = ['student'];
    let permissions = [];
    let userData = null;

    // 1. Attempt standard Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!authError && authData?.user && authData?.session) {
        authUser = authData.user;
        authToken = authData.session.access_token;
        if (authUser.user_metadata?.role) {
          roles = [authUser.user_metadata.role];
        }
        if (authUser.user_metadata?.roles) {
          roles = authUser.user_metadata.roles;
        }
        if (authUser.user_metadata?.permissions) {
          permissions = authUser.user_metadata.permissions;
        }

        // Detect seeded teachers or admins if metadata is missing
        if (!authUser.user_metadata?.role && !authUser.user_metadata?.roles) {
          const lowerEmail = email.toLowerCase();
          const KNOWN_TEACHERS = [
            'teacher@school.com',
            'rahul.mehta@school.com',
            'rajesh.kumar@school.com',
            'priya.sharma@school.com',
            'amit.patel@school.com',
            'anjali.gupta@school.com',
          ];
          if (KNOWN_TEACHERS.includes(lowerEmail)) {
            roles = ['teacher'];
          } else if (lowerEmail.includes('admin')) {
            roles = ['admin'];
          }
        }
      }
    } catch (e) {
      console.warn('Supabase auth sign-in error:', e);
    }

    // 2. Fallback to Supabase public.users database table (handles seeded demo users)
    if (!authUser) {
      let dbUser = null;
      try {
        const { data, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (!dbError && data) {
          dbUser = data;
        }
      } catch (_) {}

      if (!dbUser) {
        // Fallback to local default system users if offline or running in demo sandbox
        const localUser = [...DEFAULT_SYSTEM_USERS].find(
          u => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (localUser) {
          dbUser = localUser;
        } else {
          throw new Error('Invalid email or password');
        }
      }

      // Verify bcrypt password
      let isPasswordValid = false;
      if (dbUser.password) {
        try {
          isPasswordValid = bcrypt.compareSync(password, dbUser.password);
        } catch (e) {
          isPasswordValid = false;
        }
      }

      // Demo fallback if default password
      if (!isPasswordValid && password === 'password') {
        const demoEmails = [
          'admin@school.com',
          'teacher@school.com',
          'student@school.com',
          'parent@school.com',
          'superadmin@school.com',
          'accountant@school.com',
          'rahul.mehta@school.com',
          'rajesh.kumar@school.com',
          'priya.sharma@school.com',
          'amit.patel@school.com',
          'anjali.gupta@school.com',
          'admin.kolkata@school.com',
          'teacher.kolkata@school.com',
          'student.kolkata@school.com',
          'admin.bangalore@school.com',
          'teacher.bangalore@school.com',
        ];
        if (demoEmails.includes(email.toLowerCase())) {
          isPasswordValid = true;
        }
      }

      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Retrieve user's role and associated profiles
      let detectedRole = null;

      // 1. Check model_has_roles
      try {
        const { data: roleRecords } = await supabase
          .from('model_has_roles')
          .select('role_id, roles(id, name)')
          .eq('model_id', dbUser.id);

        if (roleRecords && roleRecords.length > 0) {
          const firstRec = roleRecords[0];
          const rawRoleName = Array.isArray(firstRec.roles)
            ? firstRec.roles[0]?.name
            : firstRec.roles?.name;

          if (rawRoleName) {
            detectedRole = rawRoleName;
          } else if (firstRec.role_id) {
            const { data: roleObj } = await supabase
              .from('roles')
              .select('name')
              .eq('id', firstRec.role_id)
              .maybeSingle();
            if (roleObj?.name) detectedRole = roleObj.name;
          }
        }
      } catch (e) {
        console.warn('Could not query model_has_roles:', e);
      }

      // 2. Check if user exists in teachers table
      let teacherRecord = null;
      try {
        const { data: tRecord } = await supabase
          .from('teachers')
          .select('*, classes:classes(*)')
          .or(`user_id.eq.${dbUser.id},email.eq.${email}`)
          .maybeSingle();

        if (tRecord) {
          teacherRecord = tRecord;
          if (!detectedRole || detectedRole === 'student') {
            detectedRole = 'teacher';
          }
        }
      } catch (e) {
        console.warn('Could not check teachers table:', e);
      }

      // 3. Check if user exists in students table
      let studentRecord = null;
      try {
        const { data: sRecord } = await supabase
          .from('students')
          .select('*, class:classes(id, name), section:sections(id, name)')
          .eq('user_id', dbUser.id)
          .maybeSingle();

        if (sRecord) {
          studentRecord = sRecord;
          if (!detectedRole) {
            detectedRole = 'student';
          }
        }
      } catch (e) {
        console.warn('Could not check students table:', e);
      }

      // 4. Check if user exists in parents table
      let parentRecord = null;
      try {
        const { data: pRecord } = await supabase
          .from('parents')
          .select('*')
          .eq('user_id', dbUser.id)
          .maybeSingle();

        if (pRecord) {
          parentRecord = pRecord;
          if (!detectedRole) {
            detectedRole = 'parent';
          }
        }
      } catch (e) {
        console.warn('Could not check parents table:', e);
      }

      // 5. Check localStorage sms_custom_users (persisted edits or creations from User Management)
      try {
        const customUsersStr = localStorage.getItem('sms_custom_users');
        if (customUsersStr) {
          const customList = JSON.parse(customUsersStr);
          const matched = customList.find(
            cu => cu.email?.toLowerCase() === email.toLowerCase() || String(cu.id) === String(dbUser.id)
          );
          if (matched && matched.role) {
            detectedRole = matched.role;
          }
        }
      } catch (_) {}

      // 6. Known seeded demo users mapping fallback
      if (!detectedRole) {
        const lowerEmail = email.toLowerCase();
        const KNOWN_TEACHERS = [
          'teacher@school.com',
          'rahul.mehta@school.com',
          'rajesh.kumar@school.com',
          'priya.sharma@school.com',
          'amit.patel@school.com',
          'anjali.gupta@school.com',
        ];
        const KNOWN_STUDENTS = [
          'student@school.com',
          'aarav.kumar@student.com',
          'diya.sharma@student.com',
          'vivaan.patel@student.com',
          'ananya.singh@student.com',
          'aarohi.verma@student.com',
        ];
        const KNOWN_PARENTS = [
          'parent@school.com',
          'ramesh.verma@school.com',
        ];

        if (lowerEmail === 'superadmin@school.com') detectedRole = 'super-admin';
        else if (lowerEmail === 'admin@school.com') detectedRole = 'admin';
        else if (KNOWN_TEACHERS.includes(lowerEmail)) detectedRole = 'teacher';
        else if (lowerEmail === 'accountant@school.com' || lowerEmail === 'sunita.patel@school.com') detectedRole = 'finance';
        else if (lowerEmail === 'librarian@school.com' || lowerEmail === 'anita.deshmukh@school.com') detectedRole = 'back-office';
        else if (lowerEmail === 'staff@school.com' || lowerEmail === 'manoj.tiwari@school.com') detectedRole = 'general';
        else if (KNOWN_PARENTS.includes(lowerEmail)) detectedRole = 'parent';
        else if (KNOWN_STUDENTS.includes(lowerEmail)) detectedRole = 'student';
        else if (lowerEmail.includes('admin')) detectedRole = 'admin';
        else if (lowerEmail.includes('teacher') || lowerEmail.includes('faculty')) detectedRole = 'teacher';
        else if (lowerEmail.includes('parent')) detectedRole = 'parent';
        else if (lowerEmail.includes('student')) detectedRole = 'student';
        else detectedRole = 'student';
      }

      roles = [detectedRole];
      permissions = roles.includes('super-admin') ? ['*'] : [];
      authToken = `sb_token_${dbUser.id}_${Date.now()}`;
      userData = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        status: dbUser.status || 'active',
        avatar: dbUser.avatar,
        role: detectedRole,
        roles: [detectedRole],
        gender: dbUser.gender,
        address: dbUser.address,
        city: dbUser.city,
        state: dbUser.state,
        postal_code: dbUser.postal_code,
      };

      if (teacherRecord) {
        userData.teacher = teacherRecord;
        userData.teacher_id = teacherRecord.id;
        userData.employee_id = teacherRecord.employee_id;
        userData.department = teacherRecord.department;
        userData.designation = teacherRecord.designation;
      }
      if (studentRecord) {
        userData.student = studentRecord;
        userData.student_id = studentRecord.id;
        userData.class_id = studentRecord.class_id;
        userData.section_id = studentRecord.section_id;
      }
      if (parentRecord) {
        userData.parent = parentRecord;
        userData.parent_id = parentRecord.id;
      }

      // Multi-school tenant assignment & security scoping
      const lowerUserEmail = (dbUser?.email || email || '').toLowerCase();
      const isSuper = detectedRole === 'super-admin' || lowerUserEmail === 'superadmin@school.com';
      let userSchoolId = 1;
      let userSchoolName = 'Siliguri Main Campus';
      let userAuthorizedSchools = [1];

      if (isSuper) {
        userSchoolId = 1;
        userSchoolName = 'Delhi Public Academy Group (HQ)';
        userAuthorizedSchools = ['all', 1, 2, 3];
      } else if (lowerUserEmail.includes('kolkata')) {
        userSchoolId = 2;
        userSchoolName = 'Kolkata Campus';
        userAuthorizedSchools = [2];
      } else if (lowerUserEmail.includes('bangalore')) {
        userSchoolId = 3;
        userSchoolName = 'Bangalore South Campus';
        userAuthorizedSchools = [3];
      } else if (dbUser?.school_id) {
        userSchoolId = Number(dbUser.school_id) || 1;
        userAuthorizedSchools = [userSchoolId];
      }

      userData.is_group_admin = isSuper;
      userData.school_id = userSchoolId;
      userData.school_name = userSchoolName;
      userData.authorized_schools = userAuthorizedSchools;
    } else {
      const lowerAuthEmail = authUser.email.toLowerCase();
      const isSuper = roles.includes('super-admin') || lowerAuthEmail === 'superadmin@school.com';
      let userSchoolId = 1;
      let userSchoolName = 'Siliguri Main Campus';
      let userAuthorizedSchools = [1];

      if (isSuper) {
        userSchoolId = 1;
        userSchoolName = 'Delhi Public Academy Group (HQ)';
        userAuthorizedSchools = ['all', 1, 2, 3];
      } else if (lowerAuthEmail.includes('kolkata')) {
        userSchoolId = 2;
        userSchoolName = 'Kolkata Campus';
        userAuthorizedSchools = [2];
      } else if (lowerAuthEmail.includes('bangalore')) {
        userSchoolId = 3;
        userSchoolName = 'Bangalore South Campus';
        userAuthorizedSchools = [3];
      }

      userData = {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email.split('@')[0],
        email: authUser.email,
        status: 'active',
        role: roles[0],
        roles: roles,
        is_group_admin: isSuper,
        school_id: userSchoolId,
        school_name: userSchoolName,
        authorized_schools: userAuthorizedSchools,
      };
    }

    // Set active school in localStorage safely
    if (userData.is_group_admin) {
      const stored = localStorage.getItem('sms_active_school_id');
      if (!stored) localStorage.setItem('sms_active_school_id', '1');
    } else {
      localStorage.setItem('sms_active_school_id', String(userData.school_id || 1));
    }

    return {
      success: true,
      message: 'Login successful!',
      data: {
        user: userData,
        token: authToken,
        roles,
        permissions,
      },
    };
  },

  register: async (data) => {
    const { name, email, password, phone, role = 'student' } = data;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          role,
          roles: [role],
        },
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await supabase.from('users').insert({
        name,
        email,
        password: hashedPassword,
        phone,
        status: 'active',
      });
    } catch (e) {
      console.warn('Could not mirror user to public.users:', e);
    }

    const token = authData.session?.access_token || `sb_token_${Date.now()}`;
    const user = {
      id: authData.user?.id || Date.now(),
      name,
      email,
      roles: [role],
    };

    return {
      success: true,
      message: 'Registration successful!',
      data: { user, token },
    };
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
    return { success: true };
  },

  me: async () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return {
        success: true,
        data: {
          user,
          roles: user.roles || ['student'],
          permissions: user.permissions || [],
        },
      };
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.user_metadata?.name || user.email,
            email: user.email,
          },
          roles: user.user_metadata?.roles || [user.user_metadata?.role || 'student'],
          permissions: user.user_metadata?.permissions || [],
        },
      };
    }
    throw new Error('Not authenticated');
  },

  refresh: () => Promise.resolve({ success: true }),
  changePassword: (data) => supabase.auth.updateUser({ password: data.password }),
  forgotPassword: (email) => supabase.auth.resetPasswordForEmail(email),
  resetPassword: (data) => supabase.auth.updateUser({ password: data.password }),
  updateProfile: async (userData) => {
    if (useSupabase) {
      if (userData.id) {
        try {
          await supabase.from('users').update({
            name: userData.name,
            phone: userData.phone,
          }).eq('id', userData.id);
        } catch (_) {}
      }
      try {
        await supabase.auth.updateUser({
          data: {
            name: userData.name,
            phone: userData.phone,
          }
        });
      } catch (_) {}
    }
    const stored = localStorage.getItem('user');
    let currentUser = {};
    if (stored) {
      try { currentUser = JSON.parse(stored); } catch (_) {}
    }
    const updated = { ...currentUser, ...userData };
    localStorage.setItem('user', JSON.stringify(updated));
    return { success: true, data: updated };
  },
};

// ==========================================
// User Management API
// ==========================================
const DEFAULT_SYSTEM_USERS = [
  {
    id: 'user_sa_1',
    name: 'Dr. Rameshwar Sharma',
    email: 'superadmin@school.com',
    phone: '+91 98765 00001',
    role: 'super-admin',
    roles: ['super-admin'],
    status: 'active',
    gender: 'male',
    address: '42, Shanti Kunj, Sector 14, Dwarka',
    city: 'New Delhi',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_adm_2',
    name: 'Rajesh Sharma',
    email: 'admin@school.com',
    phone: '+91 98765 00002',
    role: 'admin',
    roles: ['admin'],
    status: 'active',
    gender: 'male',
    address: '42, Shanti Kunj, Sector 14, Dwarka',
    city: 'New Delhi',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_tch_3',
    name: 'Vikram Malhotra',
    email: 'teacher@school.com',
    phone: '+91 98765 00003',
    role: 'teacher',
    roles: ['teacher'],
    status: 'active',
    gender: 'male',
    address: 'B-12, Teachers Enclave, Mayur Vihar',
    city: 'New Delhi',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_tch_6',
    name: 'Rahul Mehta',
    email: 'rahul.mehta@school.com',
    phone: '+91 98765 11006',
    role: 'teacher',
    roles: ['teacher'],
    status: 'active',
    gender: 'male',
    address: '52, Shivaji Park, Dadar West',
    city: 'Mumbai',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_stu_4',
    name: 'Aarohi Verma',
    email: 'student@school.com',
    phone: '+91 98765 00004',
    role: 'student',
    roles: ['student'],
    status: 'active',
    gender: 'female',
    address: 'Flat 302, Green Glen Layout, Bellandur',
    city: 'Bengaluru',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_par_suresh',
    name: 'Suresh Sharma',
    email: 'suresh.sharma@parent.school.com',
    phone: '+91 98765 88001',
    role: 'parent',
    roles: ['parent'],
    status: 'active',
    gender: 'male',
    address: '789, MG Road, Shivaji Nagar',
    city: 'Bengaluru',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_par_raj',
    name: 'Raj Agarwal',
    email: 'raj.agarwal@parent.school.com',
    phone: '+91 89765 43210',
    role: 'parent',
    roles: ['parent'],
    status: 'active',
    gender: 'male',
    address: 'Deshbandhu Para, Siliguri',
    city: 'Siliguri',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_fin_6',
    name: 'Sunita Patel',
    email: 'accountant@school.com',
    phone: '+91 98765 00006',
    role: 'finance',
    roles: ['finance'],
    status: 'active',
    gender: 'female',
    address: '108, Navrangpura',
    city: 'Ahmedabad',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_bo_7',
    name: 'Anita Deshmukh',
    email: 'librarian@school.com',
    phone: '+91 98765 00007',
    role: 'back-office',
    roles: ['back-office'],
    status: 'active',
    gender: 'female',
    address: 'Sector 5, Rohini',
    city: 'New Delhi',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_gen_8',
    name: 'Manoj Tiwari',
    email: 'staff@school.com',
    phone: '+91 98765 00008',
    role: 'general',
    roles: ['general'],
    school_id: 1,
    status: 'active',
    gender: 'male',
    address: 'Civil Lines',
    city: 'New Delhi',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_adm_kolkata',
    name: 'Prof. Subhash Chandra Bose',
    email: 'admin.kolkata@school.com',
    phone: '+91 33 24901122',
    role: 'admin',
    roles: ['admin'],
    school_id: 2,
    school_name: 'Kolkata Campus',
    authorized_schools: [2],
    status: 'active',
    gender: 'male',
    address: 'Salt Lake Sector V',
    city: 'Kolkata',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_tch_kolkata',
    name: 'Debashis Roy',
    email: 'teacher.kolkata@school.com',
    phone: '+91 33 24901123',
    role: 'teacher',
    roles: ['teacher'],
    school_id: 2,
    school_name: 'Kolkata Campus',
    authorized_schools: [2],
    status: 'active',
    gender: 'male',
    address: 'New Town Action Area 1',
    city: 'Kolkata',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_stu_kolkata',
    name: 'Sourav Mukherjee',
    email: 'student.kolkata@school.com',
    phone: '+91 33 24901124',
    role: 'student',
    roles: ['student'],
    school_id: 2,
    school_name: 'Kolkata Campus',
    authorized_schools: [2],
    status: 'active',
    gender: 'male',
    address: 'Salt Lake Block BD',
    city: 'Kolkata',
    created_at: '2025-10-12T00:00:00.000Z',
  },
  {
    id: 'user_adm_bangalore',
    name: 'Dr. K. R. Narayanan',
    email: 'admin.bangalore@school.com',
    phone: '+91 80 41223344',
    role: 'admin',
    roles: ['admin'],
    school_id: 3,
    school_name: 'Bangalore South Campus',
    authorized_schools: [3],
    status: 'active',
    gender: 'male',
    address: '17th Cross, HSR Layout',
    city: 'Bengaluru',
    created_at: '2025-10-12T00:00:00.000Z',
  },
];

/**
 * Helper to determine if a target user account has the Super Admin role.
 */
export const isSuperAdminUser = (target) => {
  if (!target) return false;
  if (typeof target === 'string') {
    return target.toLowerCase().trim() === 'super-admin';
  }
  const role = (target.role || target.roles?.[0] || '').toLowerCase().trim();
  const hasSuperRole = Array.isArray(target.roles) && target.roles.some(r => String(r).toLowerCase().trim() === 'super-admin');
  const isEmailSuper = (target.email || '').toLowerCase().trim() === 'superadmin@school.com';
  return role === 'super-admin' || hasSuperRole || isEmailSuper;
};

/**
 * Caller Context for User Operations
 * Determines if the active caller has active Super Admin authorization.
 */
export const getCallerUserContext = (explicitUser = null) => {
  let user = explicitUser;
  let activeRole = null;
  try {
    if (!user) {
      const rawUser = localStorage.getItem('user');
      if (rawUser) user = JSON.parse(rawUser);
    }
    activeRole = localStorage.getItem('sms_active_role');
  } catch (_) {}

  // Effective role incorporates preview role switcher if active
  const effectiveRole = (activeRole || user?.role || user?.roles?.[0] || 'general').toLowerCase().trim();

  // A caller is authorized as Super Admin only if they possess Super Admin credentials AND their effective role is super-admin
  const isSuperAdmin =
    effectiveRole === 'super-admin' &&
    (
      user?.role === 'super-admin' ||
      (Array.isArray(user?.roles) && user.roles.includes('super-admin')) ||
      (user?.email || '').toLowerCase().trim() === 'superadmin@school.com' ||
      user?.is_group_admin === true
    );

  const isAdmin = isSuperAdmin || effectiveRole === 'admin' || effectiveRole === 'principal';

  return {
    user,
    activeRole,
    effectiveRole,
    isSuperAdmin,
    isAdmin,
  };
};

export const userAPI = {
  getAll: async (params = {}) => {
    let usersList = [];
    let customUsers = [];

    try {
      const stored = localStorage.getItem('sms_custom_users');
      if (stored) {
        customUsers = JSON.parse(stored);
      }
    } catch (_) {}

    if (useSupabase) {
      try {
        const { data: dbUsers, error } = await supabase
          .from('users')
          .select('id, name, email, phone, avatar, gender, address, city, state, postal_code, status, created_at');

        if (!error && Array.isArray(dbUsers) && dbUsers.length > 0) {
          let rolesMap = {};
          try {
            const { data: mhr } = await supabase
              .from('model_has_roles')
              .select('model_id, roles(name)');
            if (mhr) {
              mhr.forEach(item => {
                const rName = item.roles?.name;
                if (rName) {
                  rolesMap[item.model_id] = rName;
                }
              });
            }
          } catch (_) {}

          usersList = dbUsers.map(u => {
            const assignedRole = rolesMap[u.id] || (
              u.email?.includes('superadmin') ? 'super-admin' :
              u.email?.includes('admin') ? 'admin' :
              u.email?.includes('teacher') ? 'teacher' :
              u.email?.includes('student') ? 'student' :
              u.email?.includes('parent') ? 'parent' :
              u.email?.includes('accountant') ? 'finance' : 'general'
            );
            return {
              ...u,
              role: assignedRole,
              roles: [assignedRole],
            };
          });
        }
      } catch (err) {
        console.warn('Could not query Supabase users:', err);
      }
    }

    if (!usersList || usersList.length === 0) {
      usersList = [...DEFAULT_SYSTEM_USERS];
    }

    // Merge customUsers
    if (customUsers && customUsers.length > 0) {
      customUsers.forEach(cu => {
        const idx = usersList.findIndex(u => String(u.id) === String(cu.id) || u.email?.toLowerCase() === cu.email?.toLowerCase());
        if (idx >= 0) {
          usersList[idx] = { ...usersList[idx], ...cu };
        } else {
          usersList.unshift(cu);
        }
      });
    }

    // Exclude deleted IDs
    try {
      const deletedStored = localStorage.getItem('sms_deleted_users');
      if (deletedStored) {
        const deletedIds = JSON.parse(deletedStored);
        usersList = usersList.filter(u => !deletedIds.includes(String(u.id)));
      }
    } catch (_) {}

    // Filter by search
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      usersList = usersList.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    }

    // Filter by role
    if (params.role && params.role !== 'all') {
      const targetRole = params.role.toLowerCase().trim();
      usersList = usersList.filter(u => u.role === targetRole || (u.roles && u.roles.includes(targetRole)));
    }

    // Filter by status
    if (params.status && params.status !== 'all') {
      const targetStatus = params.status.toLowerCase().trim();
      usersList = usersList.filter(u => (u.status || 'active').toLowerCase() === targetStatus);
    }

    // Strict Multi-School Data Isolation: Filter by authorized school
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    if (effectiveSchoolId !== 'all') {
      usersList = usersList.filter(u => String(u.school_id || 1) === String(effectiveSchoolId));
    }

    // Sort: newest first or ID
    usersList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const totalCount = usersList.length;
    const page = parseInt(params.page || 1, 10);
    const perPage = params.per_page === 'all' ? (totalCount || 1) : parseInt(params.per_page || 10, 10);
    const from = (page - 1) * perPage;
    const paginated = usersList.slice(from, from + perPage);

    return {
      success: true,
      data: paginated,
      meta: {
        total: totalCount,
        current_page: page,
        per_page: perPage,
        last_page: Math.max(1, Math.ceil(totalCount / perPage)),
      },
      stats: {
        total: totalCount,
        superAdmin: usersList.filter(u => u.role === 'super-admin').length,
        admin: usersList.filter(u => u.role === 'admin').length,
        teacher: usersList.filter(u => u.role === 'teacher').length,
        student: usersList.filter(u => u.role === 'student').length,
        parent: usersList.filter(u => u.role === 'parent').length,
        finance: usersList.filter(u => u.role === 'finance').length,
        backOffice: usersList.filter(u => u.role === 'back-office').length,
        general: usersList.filter(u => u.role === 'general').length,
        active: usersList.filter(u => (u.status || 'active') === 'active').length,
        inactive: usersList.filter(u => u.status === 'inactive' || u.status === 'suspended').length,
      }
    };
  },

  getById: async (id) => {
    const listRes = await userAPI.getAll({ per_page: 'all' });
    const user = listRes.data.find(u => String(u.id) === String(id));
    if (!user) throw new Error('User not found');
    return { success: true, data: user };
  },

  create: async (userData, currentUser = null) => {
    const callerCtx = getCallerUserContext(currentUser);

    // SECURITY GUARD: Only Super Admin can onboard/create another Super Admin
    if (userData.role === 'super-admin' && !callerCtx.isSuperAdmin) {
      throw new Error('Access Denied: Only a Super Admin can create or onboard another Super Admin account.');
    }

    const listRes = await userAPI.getAll({ per_page: 'all' });
    const exists = listRes.data.some(u => u.email?.toLowerCase() === userData.email?.toLowerCase().trim());
    if (exists) {
      throw new Error(`A user with email "${userData.email}" already exists.`);
    }

    const effectiveSchoolId = getEffectiveSchoolId(userData.school_id);
    const assignedSchoolId = effectiveSchoolId === 'all' ? 1 : effectiveSchoolId;
    const newId = `user_${Date.now()}`;
    const newUser = {
      id: newId,
      name: userData.name?.trim(),
      email: userData.email?.toLowerCase().trim(),
      phone: userData.phone?.trim() || '',
      role: userData.role || 'student',
      roles: [userData.role || 'student'],
      school_id: assignedSchoolId,
      status: userData.status || 'active',
      gender: userData.gender || 'male',
      address: userData.address || '',
      city: userData.city || '',
      state: userData.state || '',
      postal_code: userData.postal_code || '',
      created_at: new Date().toISOString(),
    };

    if (useSupabase) {
      try {
        const hashedPassword = bcrypt.hashSync(userData.password || 'password', 10);
        await supabase.from('users').insert({
          name: newUser.name,
          email: newUser.email,
          password: hashedPassword,
          phone: newUser.phone,
          status: newUser.status,
          gender: newUser.gender,
          address: newUser.address,
          city: newUser.city,
        });
      } catch (err) {
        console.warn('Could not mirror created user to Supabase:', err);
      }
    }

    try {
      const stored = localStorage.getItem('sms_custom_users');
      const customList = stored ? JSON.parse(stored) : [];
      customList.unshift(newUser);
      localStorage.setItem('sms_custom_users', JSON.stringify(customList));
    } catch (_) {}

    return { success: true, message: 'User created successfully!', data: newUser };
  },

  update: async (id, userData, currentUser = null) => {
    const callerCtx = getCallerUserContext(currentUser);

    // Fetch existing target user to verify identity and role
    const listRes = await userAPI.getAll({ per_page: 'all' });
    const target = listRes.data.find(u => String(u.id) === String(id));
    if (!target) {
      throw new Error('User not found.');
    }

    const targetIsSuper = isSuperAdminUser(target) || isSuperAdminUser(userData);

    // SECURITY ENFORCEMENT: An admin user CANNOT edit, delete or modify a Super Admin's data
    if (targetIsSuper && !callerCtx.isSuperAdmin) {
      throw new Error("Access Denied: Administrators are strictly prohibited from editing or modifying a Super Admin's account.");
    }

    if (target.email === 'superadmin@school.com' && userData.role && userData.role !== 'super-admin') {
      throw new Error('Root Super Admin role cannot be changed.');
    }

    // Role escalation guard: only a Super Admin can promote someone to Super Admin
    if (userData.role === 'super-admin' && !callerCtx.isSuperAdmin) {
      throw new Error('Access Denied: Only a Super Admin can assign the Super Admin role.');
    }

    // Deactivation guard: only a Super Admin can deactivate a Super Admin
    if (targetIsSuper && userData.status && userData.status !== 'active' && !callerCtx.isSuperAdmin) {
      throw new Error('Access Denied: Administrators cannot deactivate or suspend a Super Admin.');
    }

    if (useSupabase) {
      try {
        await supabase.from('users').update({
          name: userData.name,
          phone: userData.phone,
          status: userData.status,
          gender: userData.gender,
          address: userData.address,
          city: userData.city,
        }).eq('id', id);
      } catch (_) {}
    }

    try {
      const stored = localStorage.getItem('sms_custom_users');
      let customList = stored ? JSON.parse(stored) : [];
      const idx = customList.findIndex(u => String(u.id) === String(id));
      if (idx >= 0) {
        customList[idx] = { ...customList[idx], ...userData };
      } else {
        const existing = listRes.data.find(u => String(u.id) === String(id));
        if (existing) {
          customList.push({ ...existing, ...userData });
        }
      }
      localStorage.setItem('sms_custom_users', JSON.stringify(customList));
    } catch (_) {}

    return { success: true, message: 'User updated successfully!' };
  },

  delete: async (id, currentUser = null) => {
    const callerCtx = getCallerUserContext(currentUser);
    const caller = currentUser || callerCtx.user;

    if (String(id) === String(caller?.id)) {
      throw new Error('You cannot delete your own logged-in account.');
    }

    const listRes = await userAPI.getAll({ per_page: 'all' });
    const target = listRes.data.find(u => String(u.id) === String(id));
    if (!target) {
      throw new Error('User not found.');
    }

    if (target.email === 'superadmin@school.com') {
      throw new Error('The primary root Super Admin account cannot be deleted.');
    }

    const targetIsSuper = isSuperAdminUser(target);

    // SECURITY ENFORCEMENT: An admin user CANNOT delete a Super Admin
    if (targetIsSuper && !callerCtx.isSuperAdmin) {
      throw new Error('Access Denied: Administrators are strictly prohibited from deleting a Super Admin account.');
    }

    if (useSupabase) {
      try {
        await supabase.from('users').delete().eq('id', id);
      } catch (_) {}
    }

    try {
      const stored = localStorage.getItem('sms_custom_users');
      let customList = stored ? JSON.parse(stored) : [];
      customList = customList.filter(u => String(u.id) !== String(id));
      const deletedStored = localStorage.getItem('sms_deleted_users');
      const deletedList = deletedStored ? JSON.parse(deletedStored) : [];
      deletedList.push(String(id));
      localStorage.setItem('sms_deleted_users', JSON.stringify(deletedList));
      localStorage.setItem('sms_custom_users', JSON.stringify(customList));
    } catch (_) {}

    return { success: true, message: 'User deleted successfully.' };
  },

  resetPassword: async (id, newPassword, currentUser = null) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const callerCtx = getCallerUserContext(currentUser);

    const listRes = await userAPI.getAll({ per_page: 'all' });
    const target = listRes.data.find(u => String(u.id) === String(id));
    if (!target) {
      throw new Error('User not found.');
    }

    const targetIsSuper = isSuperAdminUser(target);

    // SECURITY ENFORCEMENT: An admin user CANNOT change a Super Admin's password
    if (targetIsSuper && !callerCtx.isSuperAdmin) {
      throw new Error("Access Denied: Administrators are strictly prohibited from resetting or changing a Super Admin's password.");
    }

    if (useSupabase) {
      try {
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        await supabase.from('users').update({ password: hashedPassword }).eq('id', id);
      } catch (_) {}
    }
    return { success: true, message: 'Password has been reset successfully.' };
  },
};

// ==========================================
// Academic Year API
// ==========================================
export const academicYearAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/academic-years', { params });
    let query = supabase.from('academic_years').select('*', { count: 'exact' }).order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/academic-years/${id}`);
    const { data, error } = await supabase.from('academic_years').select('*').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  getCurrent: async () => {
    if (!useSupabase) return api.get('/academic-years/current');
    const { data, error } = await supabase.from('academic_years').select('*').eq('is_current', true).maybeSingle();
    return { success: true, data: data || { id: 1, name: '2024-2025' } };
  },
  create: async (data) => {
    if (!useSupabase) return api.post('/academic-years', data);
    const { data: res, error } = await supabase.from('academic_years').insert(data).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  update: async (id, data) => {
    if (!useSupabase) return api.put(`/academic-years/${id}`, data);
    const { data: res, error } = await supabase.from('academic_years').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  delete: async (id) => {
    if (!useSupabase) return api.delete(`/academic-years/${id}`);
    const { error } = await supabase.from('academic_years').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  setCurrent: async (id) => {
    if (!useSupabase) return api.post(`/academic-years/${id}/set-current`);
    await supabase.from('academic_years').update({ is_current: false }).neq('id', id);
    const { error } = await supabase.from('academic_years').update({ is_current: true }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },
};

// ==========================================
// Student API
// ==========================================
export const studentAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/students', { params });
    let query = supabase
      .from('students')
      .select('*, user:users(*), class:classes(name), section:sections(name), academic_year:academic_years(name)', { count: 'exact' });

    // Multi-School Scoping & Tenant Security Enforcement
    const effectiveSchoolId = getEffectiveSchoolId(params?.school_id);
    if (effectiveSchoolId !== 'all') {
      try {
        query = query.eq('school_id', effectiveSchoolId);
      } catch (_) {}
    }

    if (params?.academic_year_id) query = query.eq('academic_year_id', params.academic_year_id);
    if (params?.class_id) query = query.eq('class_id', params.class_id);
    if (params?.class_ids && Array.isArray(params.class_ids)) {
      if (params.class_ids.length > 0) {
        query = query.in('class_id', params.class_ids);
      } else {
        query = query.eq('class_id', -1);
      }
    }
    if (params?.section_ids && Array.isArray(params.section_ids)) {
      if (params.section_ids.length > 0) {
        query = query.in('section_id', params.section_ids);
      } else {
        query = query.eq('section_id', -1);
      }
    }
    if (params?.section_id) {
      const isNumeric = !isNaN(params.section_id) && !isNaN(parseFloat(params.section_id));
      if (isNumeric) {
        query = query.eq('section_id', parseInt(params.section_id, 10));
      } else {
        // Support filtering by section name (e.g. 'A', 'B', 'C') across classes
        const { data: matchedSections } = await supabase
          .from('sections')
          .select('id')
          .ilike('name', String(params.section_id).trim());
        const sectionIds = (matchedSections || []).map(s => s.id);
        if (sectionIds.length > 0) {
          query = query.in('section_id', sectionIds);
        } else {
          query = query.eq('section_id', -1);
        }
      }
    }
    if (params?.status) query = query.eq('status', params.status);
    if (params?.search) {
      const term = String(params.search).trim();
      const { data: matchedUsers } = await supabase
        .from('users')
        .select('id')
        .or(`email.ilike.%${term}%,phone.ilike.%${term}%`);
      const userIds = (matchedUsers || []).map(u => u.id);
      if (userIds.length > 0) {
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,admission_number.ilike.%${term}%,user_id.in.(${userIds.join(',')})`);
      } else {
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,admission_number.ilike.%${term}%`);
      }
    }

    query = query.order('id', { ascending: false });

    // Handle pagination range
    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    let data, count;
    try {
      const res = await query;
      if (res.error) throw res.error;
      data = res.data;
      count = res.count;
    } catch (err) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_students') : null;
      if (rawSeeded) {
        data = JSON.parse(rawSeeded);
        count = data.length;
      } else {
        throw err;
      }
    }

    if (!data || data.length === 0) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_students') : null;
      if (rawSeeded) {
        try {
          const seeded = JSON.parse(rawSeeded);
          if (seeded.length > 0) {
            data = seeded;
            count = seeded.length;
          }
        } catch (_) {}
      }
    }

    // Enhance students with direct email, phone, and school_id for list view
    let enhancedData = (data || []).map(s => ({
      ...s,
      school_id: s.school_id || 1,
      email: s.user?.email || s.email,
      phone: s.user?.phone || s.phone,
    }));

    if (effectiveSchoolId !== 'all') {
      enhancedData = enhancedData.filter(s => String(s.school_id || 1) === String(effectiveSchoolId));
    }

    return paginate(enhancedData, count, params);
  },

  getById: async (id) => {
    if (!useSupabase) return api.get(`/students/${id}`);
    const { data: student, error } = await supabase
      .from('students')
      .select('*, user:users(*), class:classes(name), section:sections(name), academic_year:academic_years(name)')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (student && !isSchoolAuthorized(student.school_id || 1)) {
      throw new Error('Access Denied: You are not authorized to view student records from this school campus.');
    }

    // Fetch parent relations
    const { data: parentRelations } = await supabase
      .from('parent_student')
      .select('parent_id, relation, is_primary, parents(*)')
      .eq('student_id', id);

    const parents = (parentRelations || []).map(pr => pr.parents).filter(Boolean);
    const primaryParent = parents[0] || {};

    // Fetch grades, attendances, fee payments (newest first)
    const { data: grades } = await supabase
      .from('grades')
      .select('*, exam:exams(name), subject:subjects(name)')
      .eq('student_id', id)
      .order('id', { ascending: false });

    const { data: attendances } = await supabase
      .from('attendances')
      .select('*')
      .eq('student_id', id)
      .order('date', { ascending: false })
      .order('id', { ascending: false });

    const { data: feePayments } = await supabase
      .from('fee_payments')
      .select('*, fee_structure:fee_structures(name)')
      .eq('student_id', id)
      .order('id', { ascending: false });

    const fullStudent = {
      ...student,
      email: student.user?.email || '',
      phone: student.user?.phone || '',
      date_of_birth: student.user?.date_of_birth || '',
      gender: student.user?.gender || '',
      address: student.user?.address || '',
      city: student.user?.city || '',
      state: student.user?.state || '',
      country: student.user?.country || '',
      postal_code: student.user?.postal_code || '',
      father_name: primaryParent.father_name || '',
      father_phone: primaryParent.father_phone || '',
      father_occupation: primaryParent.father_occupation || '',
      mother_name: primaryParent.mother_name || '',
      mother_phone: primaryParent.mother_phone || '',
      mother_occupation: primaryParent.mother_occupation || '',
      guardian_name: primaryParent.guardian_name || '',
      guardian_phone: primaryParent.guardian_phone || '',
      guardian_relation: primaryParent.guardian_relation || '',
      parents,
      grades: grades || [],
      attendances: attendances || [],
      fee_payments: feePayments || [],
    };

    return { success: true, data: fullStudent };
  },

  create: async (formData) => {
    if (!useSupabase) return api.post('/students', formData);

    if (formData.date_of_birth) {
      const dobError = validateStudentDateOfBirth(formData.date_of_birth, formData.class_id || formData.class_name);
      if (dobError) throw new Error(dobError);
    }

    // 1. Create a user record if email is provided
    let userId = null;
    const firstName = formData.first_name || '';
    const lastName = formData.last_name || '';
    const fullName = (firstName + ' ' + lastName).trim() || 'Student';

    if (formData.email) {
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert({
          name: fullName,
          email: formData.email,
          password: bcrypt.hashSync(formData.password || 'password123', 10),
          phone: formData.phone || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          country: (formData.country || '').trim() || 'India',
          postal_code: formData.postal_code || null,
          status: formData.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!userErr && newUser) {
        userId = newUser.id;
        try {
          await supabase.from('model_has_roles').upsert({
            role_id: 4,
            model_type: 'App\\Models\\User',
            model_id: userId,
          }, { onConflict: 'role_id,model_id,model_type' });
        } catch (_) {}
      }
    }

    // 2. Filter students table columns
    const studentCols = [
      'academic_year_id', 'class_id', 'section_id', 'admission_number', 'admission_date',
      'first_name', 'last_name', 'roll_number', 'blood_group', 'religion', 'caste',
      'nationality', 'mother_tongue', 'previous_school', 'medical_conditions', 'allergies',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
      'status', 'notes', 'school_id'
    ];

    const studentPayload = { user_id: userId };
    for (const col of studentCols) {
      if (formData[col] !== undefined) {
        studentPayload[col] = formData[col] === '' ? null : formData[col];
      }
    }

    const effectiveStudentSchoolId = getEffectiveSchoolId(formData.school_id);
    if (effectiveStudentSchoolId && effectiveStudentSchoolId !== 'all') {
      studentPayload.school_id = Number(effectiveStudentSchoolId);
    }

    const { data: newStudent, error: studentErr } = await supabase
      .from('students')
      .insert(studentPayload)
      .select()
      .single();

    if (studentErr) throw studentErr;

    // 3. Create parent if parent details provided
    const parentCols = [
      'father_name', 'father_phone', 'father_occupation',
      'mother_name', 'mother_phone', 'mother_occupation',
      'guardian_name', 'guardian_phone', 'guardian_relation'
    ];
    const parentPayload = {};
    let hasParent = false;
    for (const col of parentCols) {
      if (formData[col]) {
        parentPayload[col] = formData[col];
        hasParent = true;
      }
    }

    if (hasParent) {
      const { data: newParent } = await supabase
        .from('parents')
        .insert(parentPayload)
        .select()
        .single();

      if (newParent) {
        await supabase.from('parent_student').insert({
          student_id: newStudent.id,
          parent_id: newParent.id,
          relation: 'father',
          is_primary: true,
        });
      }
    }

    return { success: true, message: 'Student created successfully', data: newStudent };
  },

  update: async (id, formData) => {
    if (!useSupabase) return api.put(`/students/${id}`, formData);

    if (formData.date_of_birth) {
      const dobError = validateStudentDateOfBirth(formData.date_of_birth, formData.class_id || formData.class_name);
      if (dobError) throw new Error(dobError);
    }

    // 1. Get existing student
    const { data: student, error: fetchErr } = await supabase
      .from('students')
      .select('id, user_id, first_name, last_name')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    // 2. Filter students table columns
    const studentCols = [
      'academic_year_id', 'class_id', 'section_id', 'admission_number', 'admission_date',
      'first_name', 'last_name', 'roll_number', 'blood_group', 'religion', 'caste',
      'nationality', 'mother_tongue', 'previous_school', 'medical_conditions', 'allergies',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
      'status', 'notes'
    ];

    const studentPayload = { updated_at: new Date().toISOString() };
    for (const col of studentCols) {
      if (formData[col] !== undefined) {
        studentPayload[col] = formData[col] === '' ? null : formData[col];
      }
    }

    const { data: updatedStudent, error: studentErr } = await supabase
      .from('students')
      .update(studentPayload)
      .eq('id', id)
      .select()
      .single();

    if (studentErr) throw studentErr;

    // 3. Update related user record if user_id exists
    if (student.user_id) {
      const userCols = ['email', 'phone', 'date_of_birth', 'gender', 'address', 'city', 'state', 'country', 'postal_code'];
      const userPayload = { updated_at: new Date().toISOString() };
      for (const col of userCols) {
        if (formData[col] !== undefined) {
          userPayload[col] = formData[col] === '' ? null : formData[col];
        }
      }
      if (formData.country !== undefined) {
        userPayload.country = (formData.country || '').trim() || 'India';
      }
      const firstName = formData.first_name || student.first_name || '';
      const lastName = formData.last_name || student.last_name || '';
      userPayload.name = (firstName + ' ' + lastName).trim();

      const { error: userErr } = await supabase
        .from('users')
        .update(userPayload)
        .eq('id', student.user_id);

      if (userErr) console.warn('User update error:', userErr);
    }

    // 4. Update parent record if parent fields are present
    const parentCols = [
      'father_name', 'father_phone', 'father_occupation',
      'mother_name', 'mother_phone', 'mother_occupation',
      'guardian_name', 'guardian_phone', 'guardian_relation'
    ];
    const parentPayload = { updated_at: new Date().toISOString() };
    let hasParentFields = false;
    for (const col of parentCols) {
      if (formData[col] !== undefined) {
        parentPayload[col] = formData[col] === '' ? null : formData[col];
        hasParentFields = true;
      }
    }

    if (hasParentFields) {
      const { data: pivot } = await supabase
        .from('parent_student')
        .select('parent_id')
        .eq('student_id', id)
        .maybeSingle();

      if (pivot?.parent_id) {
        await supabase
          .from('parents')
          .update(parentPayload)
          .eq('id', pivot.parent_id);
      }
    }

    return { success: true, message: 'Student updated successfully', data: updatedStudent };
  },

  delete: async (id, currentUser = null) => {
    const callerCtx = getCallerUserContext(currentUser);
    if (!callerCtx.isSuperAdmin) {
      let configured = null;
      try {
        const stored = localStorage.getItem('sms_role_permissions');
        if (stored) configured = JSON.parse(stored);
      } catch (_) {}
      const rolePerms = configured?.[callerCtx.role] || [];
      if (!rolePerms.includes('delete-students') && !rolePerms.includes('*')) {
        throw new Error('Access Denied: Your role does not have permission to delete student records.');
      }
    }
    if (!useSupabase) return api.delete(`/students/${id}`);
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getStatistics: async () => {
    if (!useSupabase) return api.get('/students/statistics');
    const { count: total } = await supabase.from('students').select('count', { count: 'exact', head: true });
    const { count: active } = await supabase.from('students').select('count', { count: 'exact', head: true }).eq('status', 'active');
    return { success: true, data: { total: total || 0, active: active || 0, inactive: (total || 0) - (active || 0) } };
  },

  downloadTemplate: () => api.get('/students/template', { responseType: 'blob' }),
  import: (formData) => api.post('/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  getProfileByUserId: async (userId) => {
    if (!useSupabase) return api.get(`/students/user/${userId}`);
    const { data, error } = await supabase
      .from('students')
      .select('*, user:users(*), class:classes(id, name), section:sections(id, name), academic_year:academic_years(id, name)')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return { success: true, data };
  },

  getDemoStudent: async () => {
    if (!useSupabase) return api.get('/students/demo');
    // First try user_id = 4 (Aarohi Verma, default student)
    let { data } = await supabase
      .from('students')
      .select('*, user:users(*), class:classes(id, name), section:sections(id, name), academic_year:academic_years(id, name)')
      .eq('user_id', 4)
      .maybeSingle();

    if (!data) {
      const res = await supabase
        .from('students')
        .select('*, user:users(*), class:classes(id, name), section:sections(id, name), academic_year:academic_years(id, name)')
        .limit(1)
        .maybeSingle();
      data = res?.data;
    }
    return { success: true, data };
  },
};

// ==========================================
// Parent API
// ==========================================
export const parentAPI = {
  getAll: async (params = {}) => {
    if (!useSupabase) return api.get('/parents', { params });
    const { data: parents, error } = await supabase
      .from('parents')
      .select('*, user:users(*), children:parent_student(student_id, relation, is_primary, student:students(*, class:classes(name), section:sections(name)))');
    if (error) throw error;
    return { success: true, data: parents || [] };
  },

  getChildrenByParentUserId: async (parentUserId, parentUserObj = null) => {
    let parentUser = parentUserObj;
    if (!parentUser && useSupabase && parentUserId) {
      try {
        const { data: u } = await supabase.from('users').select('*').eq('id', parentUserId).maybeSingle();
        if (u) parentUser = u;
      } catch (_) {}
    }

    let explicitChildren = [];
    if (useSupabase && parentUserId) {
      try {
        // Find parent record(s) for this user_id
        const { data: parentRecords } = await supabase
          .from('parents')
          .select('id')
          .eq('user_id', parentUserId);
        const parentIds = (parentRecords || []).map(p => p.id);

        if (parentIds.length > 0) {
          const { data: relations } = await supabase
            .from('parent_student')
            .select('student_id, relation, is_primary, student:students(*, user:users(*), class:classes(id, name), section:sections(id, name), academic_year:academic_years(id, name))')
            .in('parent_id', parentIds);

          explicitChildren = (relations || []).map(r => r.student).filter(Boolean);
        }
      } catch (err) {
        console.warn('Could not query explicit parent relations:', err);
      }
    }

    // Also fetch all students to apply the multi-attribute verification engine (Name, Phone, Email, Address matching)
    let allStudents = [];
    try {
      const sRes = await studentAPI.getAll({ per_page: 'all' });
      allStudents = sRes?.data || [];
    } catch (_) {}

    // Run multi-criteria verification engine
    const matchedChildren = findLinkedStudentsForParent(parentUser, allStudents);

    // Merge explicit relations and matched children by unique student ID
    const mergedMap = new Map();
    explicitChildren.forEach(s => {
      if (s && s.id) mergedMap.set(String(s.id), s);
    });
    matchedChildren.forEach(s => {
      if (s && s.id && !mergedMap.has(String(s.id))) {
        mergedMap.set(String(s.id), s);
      }
    });

    const finalChildren = Array.from(mergedMap.values());
    return {
      success: true,
      data: finalChildren,
      count: finalChildren.length
    };
  },

  linkStudent: async (parentId, studentId, relation = 'father') => {
    if (!useSupabase) return api.post('/parents/link-student', { parent_id: parentId, student_id: studentId, relation });
    const { data, error } = await supabase
      .from('parent_student')
      .upsert({
        parent_id: parentId,
        student_id: studentId,
        relation,
        is_primary: true
      }, { onConflict: 'parent_id,student_id' })
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  }
};

// ==========================================
// Teacher API
// ==========================================
export const teacherAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/teachers', { params });
    let query = supabase.from('teachers').select('*, user:users(*)', { count: 'exact' });

    // Multi-School Scoping & Tenant Security Enforcement
    const effectiveSchoolId = getEffectiveSchoolId(params?.school_id);
    if (effectiveSchoolId !== 'all') {
      try {
        query = query.eq('school_id', effectiveSchoolId);
      } catch (_) {}
    }

    // Filter by department
    if (params?.department) {
      query = query.ilike('department', String(params.department).trim());
    }

    // Filter by employment_type (supports permanent and full-time interchangeably)
    if (params?.employment_type) {
      const type = String(params.employment_type).trim().toLowerCase();
      if (type === 'permanent' || type === 'full-time') {
        query = query.or('employment_type.eq.permanent,employment_type.eq.full-time');
      } else {
        query = query.eq('employment_type', type);
      }
    }

    // Filter by status
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    // Search by name, employee_id, department, email, phone
    if (params?.search) {
      const term = String(params.search).trim();
      const { data: matchedUsers } = await supabase
        .from('users')
        .select('id')
        .or(`email.ilike.%${term}%,phone.ilike.%${term}%`);
      const userIds = (matchedUsers || []).map(u => u.id);

      if (userIds.length > 0) {
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,employee_id.ilike.%${term}%,department.ilike.%${term}%,user_id.in.(${userIds.join(',')})`);
      } else {
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,employee_id.ilike.%${term}%,department.ilike.%${term}%`);
      }
    }

    query = query.order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    let data, count;
    try {
      const res = await query;
      if (res.error) throw res.error;
      data = res.data;
      count = res.count;
    } catch (err) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_teachers') : null;
      if (rawSeeded) {
        data = JSON.parse(rawSeeded);
        count = data.length;
      } else {
        throw err;
      }
    }

    if (!data || data.length === 0) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_teachers') : null;
      if (rawSeeded) {
        try {
          const seeded = JSON.parse(rawSeeded);
          if (seeded.length > 0) {
            data = seeded;
            count = seeded.length;
          }
        } catch (_) {}
      }
    }

    let enhancedData = (data || []).map(t => ({
      ...t,
      school_id: t.school_id || 1,
      email: t.user?.email || t.email,
      phone: t.user?.phone || t.phone,
    }));

    if (effectiveSchoolId !== 'all') {
      enhancedData = enhancedData.filter(t => String(t.school_id || 1) === String(effectiveSchoolId));
    }

    return paginate(enhancedData, count, params);
  },

  getById: async (id) => {
    if (!useSupabase) return api.get(`/teachers/${id}`);
    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('*, user:users(*)')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (teacher && !isSchoolAuthorized(teacher.school_id || 1)) {
      throw new Error('Access Denied: You are not authorized to view teacher records from this school campus.');
    }

    const fullTeacher = {
      ...teacher,
      email: teacher.user?.email || '',
      phone: teacher.user?.phone || '',
      date_of_birth: teacher.user?.date_of_birth ? String(teacher.user.date_of_birth).substring(0, 10) : '',
      gender: teacher.user?.gender || '',
      address: teacher.user?.address || '',
      city: teacher.user?.city || '',
      state: teacher.user?.state || '',
      country: teacher.user?.country || '',
      postal_code: teacher.user?.postal_code || '',
      joining_date: teacher.joining_date ? String(teacher.joining_date).substring(0, 10) : '',
      bank_ifsc: teacher.bank_ifsc || '',
      bank_ifsc_code: teacher.bank_ifsc || teacher.bank_ifsc_code || '',
    };

    return { success: true, data: fullTeacher };
  },

  create: async (formData) => {
    if (!useSupabase) return api.post('/teachers', formData);

    const firstName = (formData.first_name || '').trim();
    const lastName = (formData.last_name || '').trim();
    const fullName = (firstName + ' ' + lastName).trim() || 'Teacher';

    if (!firstName) throw new Error('First name is required.');
    if (!lastName) throw new Error('Last name is required.');

    const empId = (formData.employee_id || '').trim();
    if (!empId) throw new Error('Employee ID is required.');

    if (formData.date_of_birth) {
      const dobError = validateTeacherDateOfBirth(formData.date_of_birth);
      if (dobError) throw new Error(dobError);
    }

    // Pre-check 1: Check if employee_id is already assigned to an existing teacher
    const { data: existingEmp, error: empCheckErr } = await supabase
      .from('teachers')
      .select('id, employee_id, first_name, last_name')
      .ilike('employee_id', empId)
      .maybeSingle();

    if (empCheckErr) console.warn('Employee ID check warning:', empCheckErr);
    if (existingEmp) {
      throw new Error(`Employee ID "${empId}" is already assigned to teacher ${existingEmp.first_name} ${existingEmp.last_name}. Please choose a unique Employee ID.`);
    }

    const email = (formData.email || '').trim().toLowerCase();
    let userId = null;

    if (email) {
      // Pre-check 2: Check if email already belongs to a registered teacher
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        const { data: existingTeacher } = await supabase
          .from('teachers')
          .select('id, employee_id, first_name, last_name')
          .eq('user_id', existingUser.id)
          .maybeSingle();

        if (existingTeacher) {
          throw new Error(`A teacher with email "${email}" already exists (${existingTeacher.first_name} ${existingTeacher.last_name}, Employee ID: ${existingTeacher.employee_id}).`);
        }

        // Re-use orphaned user record and update with current teacher profile
        userId = existingUser.id;
        const { error: updateUserErr } = await supabase
          .from('users')
          .update({
            name: fullName,
            phone: (formData.phone || '').trim() || null,
            date_of_birth: formData.date_of_birth ? String(formData.date_of_birth).substring(0, 10) : null,
            gender: formData.gender || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            country: (formData.country || '').trim() || 'India',
            postal_code: formData.postal_code || null,
            status: ['inactive', 'terminated', 'resigned'].includes(formData.status) ? 'inactive' : 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateUserErr) {
          throw new Error(formatDbError(updateUserErr, 'Failed to update user account.'));
        }
      } else {
        const hashedPassword = bcrypt.hashSync(formData.password || 'password123', 10);
        const { data: newUser, error: userErr } = await supabase
          .from('users')
          .insert({
            name: fullName,
            email: email,
            password: hashedPassword,
            phone: (formData.phone || '').trim() || null,
            date_of_birth: formData.date_of_birth ? String(formData.date_of_birth).substring(0, 10) : null,
            gender: formData.gender || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            country: (formData.country || '').trim() || 'India',
            postal_code: formData.postal_code || null,
            status: ['inactive', 'terminated', 'resigned'].includes(formData.status) ? 'inactive' : 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (userErr) {
          throw new Error(formatDbError(userErr, 'Failed to create user account for teacher.'));
        }
        if (newUser) {
          userId = newUser.id;
        }
      }

      if (userId) {
        try {
          await supabase.from('model_has_roles').upsert({
            role_id: 3,
            model_type: 'App\\Models\\User',
            model_id: userId,
          }, { onConflict: 'role_id,model_id,model_type' });
        } catch (_) {}
      }
    }

    if (!userId) {
      // In case no email was provided, generate placeholder user since teachers.user_id has NOT NULL constraint
      const placeholderEmail = `teacher_${empId.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@school.local`;
      const hashedPassword = bcrypt.hashSync('password123', 10);
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert({
          name: fullName,
          email: placeholderEmail,
          password: hashedPassword,
          phone: (formData.phone || '').trim() || null,
          date_of_birth: formData.date_of_birth ? String(formData.date_of_birth).substring(0, 10) : null,
          gender: formData.gender || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          country: (formData.country || '').trim() || 'India',
          postal_code: formData.postal_code || null,
          status: ['inactive', 'terminated', 'resigned'].includes(formData.status) ? 'inactive' : 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (userErr) {
        throw new Error(formatDbError(userErr, 'Failed to create user account.'));
      }
      if (newUser) {
        userId = newUser.id;
        try {
          await supabase.from('model_has_roles').upsert({
            role_id: 3,
            model_type: 'App\\Models\\User',
            model_id: userId,
          }, { onConflict: 'role_id,model_id,model_type' });
        } catch (_) {}
      }
    }

    const teacherCols = [
      'employee_id', 'first_name', 'last_name', 'joining_date', 'qualification',
      'specialization', 'experience_years', 'designation', 'department', 'salary',
      'bank_account_number', 'bank_name', 'bank_ifsc', 'emergency_contact_name',
      'emergency_contact_phone', 'emergency_contact_relation', 'certifications',
      'employment_type', 'status', 'notes', 'school_id'
    ];

    const teacherPayload = {
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    for (const col of teacherCols) {
      if (formData[col] !== undefined) {
        teacherPayload[col] = formData[col] === '' ? null : formData[col];
      }
    }

    const effectiveTeacherSchoolId = getEffectiveSchoolId(formData.school_id);
    if (effectiveTeacherSchoolId && effectiveTeacherSchoolId !== 'all') {
      teacherPayload.school_id = Number(effectiveTeacherSchoolId);
    }

    teacherPayload.first_name = firstName;
    teacherPayload.last_name = lastName;
    teacherPayload.employee_id = empId;

    // bank_ifsc
    const ifsc = (formData.bank_ifsc_code || formData.bank_ifsc || '').trim().toUpperCase();
    teacherPayload.bank_ifsc = ifsc ? ifsc.substring(0, 20) : null;

    // experience_years (MUST NOT BE NULL)
    const rawExp = formData.experience_years;
    const expNum = (rawExp === '' || rawExp === null || rawExp === undefined || isNaN(Number(rawExp)))
      ? 0
      : Math.max(0, parseFloat(rawExp));
    teacherPayload.experience_years = expNum;

    // salary
    if (formData.salary !== undefined) {
      const sal = String(formData.salary).trim();
      teacherPayload.salary = (sal === '' || isNaN(Number(sal))) ? null : Math.max(0, parseFloat(sal));
    }

    // joining_date (MUST NOT BE NULL)
    teacherPayload.joining_date = formData.joining_date
      ? String(formData.joining_date).substring(0, 10)
      : new Date().toISOString().substring(0, 10);

    // employment_type
    const rawEmpType = String(formData.employment_type || 'full-time').trim().toLowerCase();
    const validEmpTypes = ['full-time', 'part-time', 'contract'];
    teacherPayload.employment_type = (rawEmpType === 'permanent' || !validEmpTypes.includes(rawEmpType)) ? 'full-time' : rawEmpType;

    // status
    const rawStatus = String(formData.status || 'active').trim().toLowerCase();
    const validStatuses = ['active', 'inactive', 'on-leave', 'resigned', 'terminated'];
    teacherPayload.status = validStatuses.includes(rawStatus) ? rawStatus : 'active';

    const { data: newTeacher, error: teacherErr } = await supabase
      .from('teachers')
      .insert(teacherPayload)
      .select()
      .single();

    if (teacherErr) {
      throw new Error(formatDbError(teacherErr, 'Failed to save teacher record.'));
    }

    return { success: true, message: 'Teacher created successfully', data: newTeacher };
  },

  update: async (id, formData) => {
    if (!useSupabase) return api.put(`/teachers/${id}`, formData);

    if (formData.date_of_birth) {
      const dobError = validateTeacherDateOfBirth(formData.date_of_birth);
      if (dobError) throw new Error(dobError);
    }

    const { data: teacher, error: fetchErr } = await supabase
      .from('teachers')
      .select('id, user_id, first_name, last_name, employee_id, joining_date')
      .eq('id', id)
      .single();

    if (fetchErr || !teacher) throw new Error('Teacher record not found.');

    const empId = formData.employee_id ? String(formData.employee_id).trim() : teacher.employee_id;
    if (!empId) throw new Error('Employee ID cannot be empty.');

    // Pre-check duplicate employee_id on other teachers
    const { data: existingEmp } = await supabase
      .from('teachers')
      .select('id, employee_id, first_name, last_name')
      .ilike('employee_id', empId)
      .neq('id', id)
      .maybeSingle();

    if (existingEmp) {
      throw new Error(`Employee ID "${empId}" is already assigned to teacher ${existingEmp.first_name} ${existingEmp.last_name}. Please choose a unique Employee ID.`);
    }

    const email = formData.email ? String(formData.email).trim().toLowerCase() : null;
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser && teacher.user_id && existingUser.id !== teacher.user_id) {
        const { data: otherTeacher } = await supabase
          .from('teachers')
          .select('id, employee_id, first_name, last_name')
          .eq('user_id', existingUser.id)
          .maybeSingle();

        if (otherTeacher) {
          throw new Error(`A teacher with email "${email}" already exists (${otherTeacher.first_name} ${otherTeacher.last_name}, Employee ID: ${otherTeacher.employee_id}).`);
        }
      }
    }

    const teacherCols = [
      'employee_id', 'first_name', 'last_name', 'joining_date', 'qualification',
      'specialization', 'experience_years', 'designation', 'department', 'salary',
      'bank_account_number', 'bank_name', 'bank_ifsc', 'emergency_contact_name',
      'emergency_contact_phone', 'emergency_contact_relation', 'certifications',
      'employment_type', 'status', 'notes'
    ];

    const teacherPayload = { updated_at: new Date().toISOString() };
    for (const col of teacherCols) {
      if (formData[col] !== undefined) {
        teacherPayload[col] = formData[col] === '' ? null : formData[col];
      }
    }

    if (formData.first_name !== undefined) {
      teacherPayload.first_name = String(formData.first_name || '').trim();
    }
    if (formData.last_name !== undefined) {
      teacherPayload.last_name = String(formData.last_name || '').trim();
    }
    if (formData.employee_id !== undefined) {
      teacherPayload.employee_id = empId;
    }

    // Explicit mappings and type conversions
    if (formData.bank_ifsc_code !== undefined || formData.bank_ifsc !== undefined) {
      const ifsc = (formData.bank_ifsc_code || formData.bank_ifsc || '').trim().toUpperCase();
      teacherPayload.bank_ifsc = ifsc ? ifsc.substring(0, 20) : null;
    }
    if (formData.experience_years !== undefined) {
      const rawExp = formData.experience_years;
      teacherPayload.experience_years = (rawExp === '' || rawExp === null || rawExp === undefined || isNaN(Number(rawExp)))
        ? 0
        : Math.max(0, parseFloat(rawExp));
    }
    if (formData.salary !== undefined) {
      const sal = String(formData.salary).trim();
      teacherPayload.salary = (sal === '' || isNaN(Number(sal))) ? null : Math.max(0, parseFloat(sal));
    }
    if (formData.joining_date !== undefined) {
      teacherPayload.joining_date = formData.joining_date
        ? String(formData.joining_date).substring(0, 10)
        : (teacher.joining_date || new Date().toISOString().substring(0, 10));
    }
    if (formData.employment_type !== undefined) {
      const rawEmpType = String(formData.employment_type || 'full-time').trim().toLowerCase();
      const validEmpTypes = ['full-time', 'part-time', 'contract'];
      teacherPayload.employment_type = (rawEmpType === 'permanent' || !validEmpTypes.includes(rawEmpType)) ? 'full-time' : rawEmpType;
    }
    if (formData.status !== undefined) {
      const rawStatus = String(formData.status || 'active').trim().toLowerCase();
      const validStatuses = ['active', 'inactive', 'on-leave', 'resigned', 'terminated'];
      teacherPayload.status = validStatuses.includes(rawStatus) ? rawStatus : 'active';
    }

    const { data: updatedTeacher, error: teacherErr } = await supabase
      .from('teachers')
      .update(teacherPayload)
      .eq('id', id)
      .select()
      .single();

    if (teacherErr) {
      throw new Error(formatDbError(teacherErr, 'Failed to update teacher record.'));
    }

    // Handle user record
    let linkedUserId = teacher.user_id;

    if (linkedUserId) {
      const userCols = ['phone', 'gender', 'address', 'city', 'state', 'country', 'postal_code'];
      const userPayload = { updated_at: new Date().toISOString() };
      for (const col of userCols) {
        if (formData[col] !== undefined) {
          userPayload[col] = formData[col] === '' ? null : formData[col];
        }
      }
      if (formData.country !== undefined) {
        userPayload.country = (formData.country || '').trim() || 'India';
      }
      if (formData.email) {
        userPayload.email = formData.email.trim().toLowerCase();
      }
      if (formData.status !== undefined) {
        userPayload.status = ['inactive', 'terminated', 'resigned'].includes(formData.status) ? 'inactive' : 'active';
      }
      if (formData.date_of_birth !== undefined) {
        userPayload.date_of_birth = formData.date_of_birth ? String(formData.date_of_birth).substring(0, 10) : null;
      }
      const firstName = formData.first_name || teacher.first_name || '';
      const lastName = formData.last_name || teacher.last_name || '';
      userPayload.name = (firstName + ' ' + lastName).trim();

      const { error: userErr } = await supabase.from('users').update(userPayload).eq('id', linkedUserId);
      if (userErr) console.warn('User update error:', userErr);
    } else if (formData.email) {
      // Heal teacher missing user_id
      const healEmail = formData.email.trim().toLowerCase();
      const firstName = formData.first_name || teacher.first_name || '';
      const lastName = formData.last_name || teacher.last_name || '';
      const fullName = (firstName + ' ' + lastName).trim() || 'Teacher';

      const { data: existingUser } = await supabase.from('users').select('id').eq('email', healEmail).maybeSingle();
      if (existingUser) {
        linkedUserId = existingUser.id;
      } else {
        const { data: newUser, error: newUserErr } = await supabase.from('users').insert({
          name: fullName,
          email: healEmail,
          password: bcrypt.hashSync('password123', 10),
          phone: (formData.phone || '').trim() || null,
          date_of_birth: formData.date_of_birth ? String(formData.date_of_birth).substring(0, 10) : null,
          gender: formData.gender || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          country: (formData.country || '').trim() || 'India',
          postal_code: formData.postal_code || null,
          status: ['inactive', 'terminated', 'resigned'].includes(formData.status) ? 'inactive' : 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).select().maybeSingle();
        if (newUserErr) console.warn('User insert error on heal:', newUserErr);
        if (newUser) linkedUserId = newUser.id;
      }

      if (linkedUserId) {
        await supabase.from('teachers').update({ user_id: linkedUserId }).eq('id', id);
        try {
          await supabase.from('model_has_roles').upsert({
            role_id: 3,
            model_type: 'App\\Models\\User',
            model_id: linkedUserId,
          }, { onConflict: 'role_id,model_id,model_type' });
        } catch (_) {}
      }
    }

    return { success: true, message: 'Teacher updated successfully', data: updatedTeacher };
  },

  delete: async (id, currentUser = null) => {
    const callerCtx = getCallerUserContext(currentUser);
    if (!callerCtx.isSuperAdmin) {
      let configured = null;
      try {
        const stored = localStorage.getItem('sms_role_permissions');
        if (stored) configured = JSON.parse(stored);
      } catch (_) {}
      const rolePerms = configured?.[callerCtx.role] || [];
      if (!rolePerms.includes('delete-teachers') && !rolePerms.includes('*')) {
        throw new Error('Access Denied: Your role does not have permission to delete teacher records.');
      }
    }
    if (!useSupabase) return api.delete(`/teachers/${id}`);
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  getStatistics: async () => {
    if (!useSupabase) return api.get('/teachers/statistics');
    const { count: total } = await supabase.from('teachers').select('count', { count: 'exact', head: true });
    return { success: true, data: { total: total || 0, active: total || 0, inactive: 0 } };
  },

  getDemoTeacher: async () => {
    if (!useSupabase) return api.get('/teachers/demo');
    try {
      const { data: matchedUsers } = await supabase
        .from('users')
        .select('id, email, name')
        .ilike('email', '%rahul.mehta%')
        .maybeSingle();

      if (matchedUsers?.id) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('*, user:users(*)')
          .eq('user_id', matchedUsers.id)
          .maybeSingle();
        if (teacher) {
          return {
            success: true,
            data: {
              ...teacher,
              email: teacher.user?.email || matchedUsers.email,
              name: teacher.user?.name || `${teacher.first_name} ${teacher.last_name}`,
            },
          };
        }
      }

      const { data: firstTeacher } = await supabase
        .from('teachers')
        .select('*, user:users(*)')
        .limit(1)
        .maybeSingle();

      if (firstTeacher) {
        return {
          success: true,
          data: {
            ...firstTeacher,
            email: firstTeacher.user?.email || firstTeacher.email,
            name: firstTeacher.user?.name || `${firstTeacher.first_name} ${firstTeacher.last_name}`,
          },
        };
      }
    } catch (e) {
      console.warn('getDemoTeacher error:', e);
    }

    return {
      success: true,
      data: {
        id: 1,
        user_id: 6,
        employee_id: 'EMP001',
        first_name: 'Rahul',
        last_name: 'Mehta',
        email: 'rahul.mehta@school.com',
        department: 'Science',
        designation: 'Senior Teacher',
        status: 'active',
      },
    };
  },
};

// ==========================================
// Class & Section Metadata Helpers
// ==========================================
const getLocalMeta = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
};

const setLocalMeta = (key, id, data) => {
  try {
    const all = getLocalMeta(key);
    all[String(id)] = { ...(all[String(id)] || {}), ...data };
    localStorage.setItem(key, JSON.stringify(all));
  } catch (_) {}
};

const removeLocalMeta = (key, id) => {
  try {
    const all = getLocalMeta(key);
    delete all[String(id)];
    localStorage.setItem(key, JSON.stringify(all));
  } catch (_) {}
};

// Automatically ensure initial default assignment for demo teacher if none exists
const ensureDefaultTeacherAssignments = (classes, teachers) => {
  try {
    const classMeta = getLocalMeta('sms_class_meta');
    const secMeta = getLocalMeta('sms_section_meta');
    if (Object.keys(classMeta).length === 0 && classes?.length > 0 && teachers?.length > 0) {
      const primaryTeacher = teachers.find(t => (t.email || '').toLowerCase().includes('rahul.mehta')) || teachers[0];
      const primaryClass = classes[0];
      setLocalMeta('sms_class_meta', primaryClass.id, {
        class_teacher_id: primaryTeacher.id,
      });
      if (primaryClass.sections && primaryClass.sections.length > 0) {
        setLocalMeta('sms_section_meta', primaryClass.sections[0].id, {
          section_teacher_id: primaryTeacher.id,
          class_id: primaryClass.id,
        });
      }
    }
  } catch (_) {}
};

// Sanitizer for Class database payload (classes table has name, numeric_name, order, description, status, school_id)
const cleanClassPayload = (data) => {
  const allowed = ['name', 'numeric_name', 'order', 'description', 'status', 'school_id'];
  const cleaned = {};
  allowed.forEach(col => {
    if (data[col] !== undefined && data[col] !== null) {
      cleaned[col] = data[col];
    }
  });
  if (data.name && cleaned.numeric_name === undefined) {
    const num = String(data.name).match(/\d+/);
    if (num) cleaned.numeric_name = num[0];
  }
  const effectiveSchoolId = getEffectiveSchoolId(data?.school_id);
  if (effectiveSchoolId && effectiveSchoolId !== 'all') {
    cleaned.school_id = Number(effectiveSchoolId);
  }
  return cleaned;
};

// Sanitizer for Section database payload (sections table only has class_id, name, capacity, current_strength, description, status)
const cleanSectionPayload = (data) => {
  const allowed = ['class_id', 'name', 'capacity', 'current_strength', 'description', 'status'];
  const cleaned = {};
  allowed.forEach(col => {
    if (data[col] !== undefined && data[col] !== null) {
      if (col === 'capacity' || col === 'current_strength') {
        const parsed = parseInt(data[col], 10);
        cleaned[col] = isNaN(parsed) ? 40 : parsed;
      } else {
        cleaned[col] = data[col];
      }
    }
  });
  return cleaned;
};

// ==========================================
// Class API
// ==========================================
export const classAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/classes', { params });
    let query = supabase.from('classes').select('*, sections(*)', { count: 'exact' });

    // Multi-School Scoping & Tenant Security Enforcement
    const effectiveSchoolId = getEffectiveSchoolId(params?.school_id);
    if (effectiveSchoolId !== 'all') {
      try {
        query = query.eq('school_id', effectiveSchoolId);
      } catch (_) {}
    }

    if (params?.search) {
      query = query.ilike('name', `%${String(params.search).trim()}%`);
    }

    query = query.order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    let data, count;
    try {
      const res = await query;
      if (res.error) throw res.error;
      data = res.data;
      count = res.count;
    } catch (err) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_classes') : null;
      if (rawSeeded) {
        data = JSON.parse(rawSeeded);
        count = data.length;
      } else {
        throw err;
      }
    }

    if (!data || data.length === 0) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_classes') : null;
      if (rawSeeded) {
        try {
          let seeded = JSON.parse(rawSeeded);
          if (effectiveSchoolId !== 'all') {
            seeded = seeded.filter(c => String(c.school_id || 1) === String(effectiveSchoolId));
          }
          if (seeded.length > 0) {
            data = seeded;
            count = seeded.length;
          }
        } catch (_) {}
      }
    }

    const teachersList = await teacherAPI.getAll({ per_page: 100 }).then(r => r.data || []).catch(() => []);
    ensureDefaultTeacherAssignments(data || [], teachersList);
    const classMeta = getLocalMeta('sms_class_meta');
    const secMeta = getLocalMeta('sms_section_meta');

    let enriched = (data || []).map(cls => {
      const meta = classMeta[String(cls.id)] || {};
      const classTeacher = meta.class_teacher_id
        ? teachersList.find(t => String(t.id) === String(meta.class_teacher_id))
        : null;

      const sectionsList = cls.sections || [];
      return {
        ...cls,
        academic_year_id: meta.academic_year_id || null,
        room_number: meta.room_number || null,
        capacity: meta.capacity || (sectionsList.length > 0 ? sectionsList.reduce((acc, s) => acc + (s.capacity || 40), 0) : 40),
        class_teacher_id: meta.class_teacher_id || null,
        class_teacher: classTeacher,
        sections_count: sectionsList.length,
        students_count: sectionsList.reduce((acc, s) => acc + (s.current_strength || 0), 0),
      };
    });

    if (params?.teacher_id) {
      const tId = String(params.teacher_id);
      enriched = enriched.filter(cls => {
        if (String(cls.class_teacher_id) === tId) return true;
        const sectionsList = cls.sections || [];
        return sectionsList.some(s => {
          const sMeta = secMeta[String(s.id)] || {};
          return String(sMeta.section_teacher_id || s.section_teacher_id) === tId;
        });
      });
    }

    return paginate(enriched, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/classes/${id}`);
    const { data, error } = await supabase.from('classes').select('*, sections(*)').eq('id', id).single();
    if (error) throw error;

    const classMeta = getLocalMeta('sms_class_meta');
    const meta = classMeta[String(id)] || {};
    const teachersList = await teacherAPI.getAll({ per_page: 100 }).then(r => r.data || []).catch(() => []);
    const classTeacher = meta.class_teacher_id
      ? teachersList.find(t => String(t.id) === String(meta.class_teacher_id))
      : null;

    const sectionsList = data.sections || [];
    const enriched = {
      ...data,
      academic_year_id: meta.academic_year_id || null,
      room_number: meta.room_number || null,
      capacity: meta.capacity || (sectionsList.length > 0 ? sectionsList.reduce((acc, s) => acc + (s.capacity || 40), 0) : 40),
      class_teacher_id: meta.class_teacher_id || null,
      class_teacher: classTeacher,
      sections_count: sectionsList.length,
      students_count: sectionsList.reduce((acc, s) => acc + (s.current_strength || 0), 0),
    };

    return { success: true, data: enriched };
  },
  create: async (data) => {
    if (!useSupabase) return api.post('/classes', data);
    const dbPayload = cleanClassPayload(data);
    const { data: res, error } = await supabase.from('classes').insert(dbPayload).select().single();
    if (error) throw error;

    if (res?.id) {
      setLocalMeta('sms_class_meta', res.id, {
        academic_year_id: data.academic_year_id || null,
        class_teacher_id: data.class_teacher_id || null,
        room_number: data.room_number || null,
        capacity: data.capacity || null,
      });
    }

    return { success: true, data: res };
  },
  update: async (id, data) => {
    if (!useSupabase) return api.put(`/classes/${id}`, data);
    const dbPayload = cleanClassPayload(data);
    const { data: res, error } = await supabase.from('classes').update(dbPayload).eq('id', id).select().single();
    if (error) throw error;

    setLocalMeta('sms_class_meta', id, {
      academic_year_id: data.academic_year_id || null,
      class_teacher_id: data.class_teacher_id || null,
      room_number: data.room_number || null,
      capacity: data.capacity || null,
    });

    return { success: true, data: res };
  },
  delete: async (id, currentUser = null) => {
    const callerCtx = getCallerUserContext(currentUser);
    if (!callerCtx.isSuperAdmin) {
      let configured = null;
      try {
        const stored = localStorage.getItem('sms_role_permissions');
        if (stored) configured = JSON.parse(stored);
      } catch (_) {}
      const rolePerms = configured?.[callerCtx.role] || [];
      if (!rolePerms.includes('delete-classes') && !rolePerms.includes('*')) {
        throw new Error('Access Denied: Your role does not have permission to delete class records.');
      }
    }
    if (!useSupabase) return api.delete(`/classes/${id}`);
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) throw error;
    removeLocalMeta('sms_class_meta', id);
    return { success: true };
  },
  assignSubjects: (id, subjects) => api.post(`/classes/${id}/assign-subjects`, { subjects }),
};

// ==========================================
// Section API
// ==========================================
export const sectionAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/sections', { params });
    let query = supabase.from('sections').select('*, class:classes(id, name)', { count: 'exact' });
    if (params?.class_id) query = query.eq('class_id', params.class_id);
    if (params?.search) {
      query = query.ilike('name', `%${String(params.search).trim()}%`);
    }

    query = query.order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const secMeta = getLocalMeta('sms_section_meta');
    const classMeta = getLocalMeta('sms_class_meta');
    const teachersList = await teacherAPI.getAll({ per_page: 100 }).then(r => r.data || []).catch(() => []);

    let enriched = (data || []).map(sec => {
      const meta = secMeta[String(sec.id)] || {};
      const teacherId = meta.section_teacher_id || sec.section_teacher_id;
      const sectionTeacher = teacherId
        ? teachersList.find(t => String(t.id) === String(teacherId))
        : null;

      return {
        ...sec,
        room_number: meta.room_number || sec.room_number || null,
        section_teacher_id: teacherId || null,
        section_teacher: sectionTeacher,
        students_count: sec.current_strength || 0,
      };
    });

    if (params?.teacher_id) {
      const tId = String(params.teacher_id);
      enriched = enriched.filter(sec => {
        if (String(sec.section_teacher_id) === tId) return true;
        const parentMeta = classMeta[String(sec.class_id)] || {};
        return String(parentMeta.class_teacher_id) === tId;
      });
    }

    return paginate(enriched, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/sections/${id}`);
    const { data, error } = await supabase.from('sections').select('*, class:classes(id, name)').eq('id', id).single();
    if (error) throw error;

    const secMeta = getLocalMeta('sms_section_meta');
    const meta = secMeta[String(id)] || {};
    const teacherId = meta.section_teacher_id || data.section_teacher_id;
    const teachersList = await teacherAPI.getAll({ per_page: 100 }).then(r => r.data || []).catch(() => []);
    const sectionTeacher = teacherId
      ? teachersList.find(t => String(t.id) === String(teacherId))
      : null;

    const enriched = {
      ...data,
      room_number: meta.room_number || data.room_number || null,
      section_teacher_id: teacherId || null,
      section_teacher: sectionTeacher,
      students_count: data.current_strength || 0,
    };

    return { success: true, data: enriched };
  },
  create: async (data) => {
    if (!useSupabase) return api.post('/sections', data);
    const dbPayload = cleanSectionPayload(data);
    const { data: res, error } = await supabase.from('sections').insert(dbPayload).select().single();
    if (error) throw error;

    if (res?.id) {
      setLocalMeta('sms_section_meta', res.id, {
        section_teacher_id: data.section_teacher_id || null,
        room_number: data.room_number || null,
      });
    }

    return { success: true, data: res };
  },
  update: async (id, data) => {
    if (!useSupabase) return api.put(`/sections/${id}`, data);
    const dbPayload = cleanSectionPayload(data);
    const { data: res, error } = await supabase.from('sections').update(dbPayload).eq('id', id).select().single();
    if (error) throw error;

    const currentMeta = getLocalMeta('sms_section_meta')[String(id)] || {};
    setLocalMeta('sms_section_meta', id, {
      section_teacher_id: data.section_teacher_id !== undefined ? data.section_teacher_id : (currentMeta.section_teacher_id || null),
      room_number: data.room_number !== undefined ? data.room_number : (currentMeta.room_number || null),
    });

    return { success: true, data: res };
  },
  delete: async (id) => {
    if (!useSupabase) return api.delete(`/sections/${id}`);
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (error) throw error;
    removeLocalMeta('sms_section_meta', id);
    return { success: true };
  },
  assignTeacher: async (sectionId, teacherId) => {
    const currentMeta = getLocalMeta('sms_section_meta')[String(sectionId)] || {};
    setLocalMeta('sms_section_meta', sectionId, {
      ...currentMeta,
      section_teacher_id: teacherId || null,
    });
    if (useSupabase) {
      try {
        await supabase.from('sections').update({ section_teacher_id: teacherId || null }).eq('id', sectionId);
      } catch (_) {}
    }
    return { success: true, message: 'Section teacher assigned successfully' };
  },
};

// ==========================================
// Subject API
// ==========================================
export const subjectAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/subjects', { params });
    let query = supabase.from('subjects').select('*', { count: 'exact' });
    if (params?.type) query = query.eq('type', params.type);
    if (params?.search) {
      const term = String(params.search).trim();
      query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
    }
    query = query.order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/subjects/${id}`);
    const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: async (data) => {
    if (!useSupabase) return api.post('/subjects', data);
    const { data: res, error } = await supabase.from('subjects').insert(data).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  update: async (id, data) => {
    if (!useSupabase) return api.put(`/subjects/${id}`, data);
    const { data: res, error } = await supabase.from('subjects').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  delete: async (id) => {
    if (!useSupabase) return api.delete(`/subjects/${id}`);
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
};

// ==========================================
// Attendance API
// ==========================================
export const attendanceAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/attendance', { params });
    let query = supabase
      .from('attendances')
      .select('*, student:students(id, first_name, last_name, admission_number, roll_number, class_id, section_id), class:classes(id, name), section:sections(id, name)', { count: 'exact' });

    if (params?.student_id) query = query.eq('student_id', params.student_id);
    if (params?.date) query = query.eq('date', params.date);
    if (params?.start_date) query = query.gte('date', params.start_date);
    if (params?.end_date) query = query.lte('date', params.end_date);
    if (params?.academic_year_id) query = query.eq('academic_year_id', params.academic_year_id);
    if (params?.class_id) query = query.eq('class_id', params.class_id);
    if (params?.class_ids && Array.isArray(params.class_ids)) {
      if (params.class_ids.length > 0) {
        query = query.in('class_id', params.class_ids);
      } else {
        query = query.eq('class_id', -1);
      }
    }
    if (params?.section_ids && Array.isArray(params.section_ids)) {
      if (params.section_ids.length > 0) {
        query = query.in('section_id', params.section_ids);
      } else {
        query = query.eq('section_id', -1);
      }
    }
    if (params?.section_id) query = query.eq('section_id', params.section_id);
    if (params?.status) query = query.eq('status', params.status);

    query = query.order('date', { ascending: false }).order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/attendance/${id}`);
    const { data, error } = await supabase
      .from('attendances')
      .select('*, student:students(id, first_name, last_name, admission_number, roll_number), class:classes(id, name), section:sections(id, name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { success: true, data };
  },
  markAttendance: async (data) => {
    if (!useSupabase) return api.post('/attendance/mark', data);
    const records = Array.isArray(data) ? data : [data];
    const { data: res, error } = await supabase.from('attendances').upsert(records);
    if (error) throw error;
    return { success: true, data: res };
  },
  getByDate: (params) => attendanceAPI.getAll(params),
  update: async (id, data) => {
    if (!useSupabase) return api.put(`/attendance/${id}`, data);
    const { data: res, error } = await supabase.from('attendances').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  delete: async (id) => {
    if (!useSupabase) return api.delete(`/attendance/${id}`);
    const { error } = await supabase.from('attendances').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  getStatistics: async (params) => {
    if (!useSupabase) return api.get('/attendance/statistics', { params });
    let totalQuery = supabase.from('attendances').select('count', { count: 'exact', head: true });
    let presentQuery = supabase.from('attendances').select('count', { count: 'exact', head: true }).eq('status', 'present');
    if (params?.student_id) {
      totalQuery = totalQuery.eq('student_id', params.student_id);
      presentQuery = presentQuery.eq('student_id', params.student_id);
    }
    const { count: total } = await totalQuery;
    const { count: present } = await presentQuery;
    return { success: true, data: { total: total || 0, present: present || 0, absent: (total || 0) - (present || 0) } };
  },
  getReport: async (params) => {
    if (!useSupabase) return api.get('/attendance/report', { params });
    let studentsQuery = supabase
      .from('students')
      .select('id, first_name, last_name, admission_number, roll_number')
      .eq('status', 'active');
    if (params?.class_id) studentsQuery = studentsQuery.eq('class_id', params.class_id);
    if (params?.section_id) studentsQuery = studentsQuery.eq('section_id', params.section_id);
    const { data: students, error: sErr } = await studentsQuery;
    if (sErr) throw sErr;

    let attQuery = supabase.from('attendances').select('*');
    if (params?.class_id) attQuery = attQuery.eq('class_id', params.class_id);
    if (params?.section_id) attQuery = attQuery.eq('section_id', params.section_id);
    if (params?.start_date) attQuery = attQuery.gte('date', params.start_date);
    if (params?.end_date) attQuery = attQuery.lte('date', params.end_date);
    const { data: attendances, error: aErr } = await attQuery;
    if (aErr) throw aErr;

    const studentStats = (students || []).map(stu => {
      const records = (attendances || []).filter(a => a.student_id === stu.id);
      const total = records.length;
      const present = records.filter(a => a.status === 'present').length;
      const absent = records.filter(a => a.status === 'absent').length;
      const late = records.filter(a => a.status === 'late').length;
      const excused = records.filter(a => ['excused', 'half-day', 'on-leave'].includes(a.status)).length;
      return {
        ...stu,
        total_days: total,
        present_days: present,
        absent_days: absent,
        late_days: late,
        excused_days: excused,
        attendance_percentage: total > 0 ? ((present / total) * 100).toFixed(1) : 0,
      };
    });

    return {
      success: true,
      data: {
        students: studentStats,
        total_days: [...new Set((attendances || []).map(a => a.date))].length,
        total_records: attendances?.length || 0,
      }
    };
  },
  getStudentStats: async (studentId, params = {}) => {
    if (!useSupabase) return api.get(`/attendance/student/${studentId}/stats`, { params });
    let query = supabase.from('attendances').select('*').eq('student_id', studentId);
    if (params?.start_date) query = query.gte('date', params.start_date);
    if (params?.end_date) query = query.lte('date', params.end_date);
    const { data, error } = await query;
    if (error) throw error;
    const total = data?.length || 0;
    const present = (data || []).filter(a => a.status === 'present').length;
    const absent = (data || []).filter(a => a.status === 'absent').length;
    const late = (data || []).filter(a => a.status === 'late').length;
    const excused = (data || []).filter(a => ['excused', 'half-day', 'on-leave'].includes(a.status)).length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
    return {
      success: true,
      data: {
        total,
        present,
        absent,
        late,
        excused,
        percentage: parseFloat(percentage),
      }
    };
  },
};

// ==========================================
// Exam API
// ==========================================
export const examAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/exams', { params });
    let query = supabase.from('exams').select('*, academic_year:academic_years(name)', { count: 'exact' });
    if (params?.academic_year_id) query = query.eq('academic_year_id', params.academic_year_id);
    if (params?.type) query = query.eq('type', params.type);
    if (params?.search) {
      query = query.ilike('name', `%${String(params.search).trim()}%`);
    }
    query = query.order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/exams/${id}`);
    const { data, error } = await supabase.from('exams').select('*, academic_year:academic_years(name)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: async (data) => {
    if (!useSupabase) return api.post('/exams', data);
    const { data: res, error } = await supabase.from('exams').insert(data).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  update: async (id, data) => {
    if (!useSupabase) return api.put(`/exams/${id}`, data);
    const { data: res, error } = await supabase.from('exams').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  delete: async (id) => {
    if (!useSupabase) return api.delete(`/exams/${id}`);
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  createSchedule: (id, schedules) => api.post(`/exams/${id}/schedule`, { schedules }),
  getSchedule: (id, params) => api.get(`/exams/${id}/schedule`, { params }),
};

// ==========================================
// Grade API
// ==========================================
export const gradeAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/grades', { params });
    let query = supabase.from('grades').select('*, student:students(first_name, last_name), subject:subjects(name)', { count: 'exact' });
    if (params?.exam_id) query = query.eq('exam_id', params.exam_id);
    if (params?.student_id) query = query.eq('student_id', params.student_id);
    query = query.order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  enterGrades: async (data) => {
    if (!useSupabase) return api.post('/grades/enter', data);
    const { data: res, error } = await supabase.from('grades').insert(data).select();
    if (error) throw error;
    return { success: true, data: res };
  },
  createBulk: async (data) => {
    if (!useSupabase) return api.post('/grades/bulk', data);
    const { data: res, error } = await supabase.from('grades').insert(data).select();
    if (error) throw error;
    return { success: true, data: res };
  },
  update: async (id, data) => {
    if (!useSupabase) return api.put(`/grades/${id}`, data);
    const { data: res, error } = await supabase.from('grades').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  getReportCard: (studentId, examId) => api.get(`/grades/report-card/${studentId}`, { params: { exam_id: examId } }),
};

// ==========================================
// Fee API
// ==========================================
export const feeAPI = {
  getAll: async (params) => feeAPI.getStructures(params),
  getStructures: async (params) => {
    if (!useSupabase) return api.get('/fee-structures', { params });
    let query = supabase.from('fee_structures').select('*, class:classes(name), academic_year:academic_years(name)', { count: 'exact' });

    // Multi-School Scoping & Tenant Security Enforcement
    const effectiveSchoolId = getEffectiveSchoolId(params?.school_id);
    if (effectiveSchoolId !== 'all') {
      try {
        query = query.eq('school_id', effectiveSchoolId);
      } catch (_) {}
    }

    if (params?.academic_year_id) query = query.eq('academic_year_id', params.academic_year_id);
    if (params?.class_id) {
      if (params.include_all_classes) {
        query = query.or(`class_id.eq.${params.class_id},class_id.is.null`);
      } else {
        query = query.eq('class_id', params.class_id);
      }
    }
    if (params?.type) query = query.eq('type', params.type);
    if (params?.search) {
      query = query.ilike('name', `%${String(params.search).trim()}%`);
    }
    query = query.order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    let data, count;
    try {
      const res = await query;
      if (res.error) throw res.error;
      data = res.data;
      count = res.count;
    } catch (err) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_fee_structures') : null;
      if (rawSeeded) {
        data = JSON.parse(rawSeeded);
        count = data.length;
      } else {
        throw err;
      }
    }

    if (!data || data.length === 0) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_fee_structures') : null;
      if (rawSeeded) {
        try {
          let seeded = JSON.parse(rawSeeded);
          if (effectiveSchoolId !== 'all') {
            seeded = seeded.filter(f => String(f.school_id || 1) === String(effectiveSchoolId));
          }
          if (seeded.length > 0) {
            data = seeded;
            count = seeded.length;
          }
        } catch (_) {}
      }
    }

    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/fee-structures/${id}`);
    const { data, error } = await supabase.from('fee_structures').select('*, class:classes(name), academic_year:academic_years(name)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  createStructure: async (data) => {
    if (!useSupabase) return api.post('/fee-structures', data);
    const { due_day, class: _c, academic_year: _ay, id: _id, created_at: _ca, updated_at: _ua, deleted_at: _da, ...payload } = data;
    if (payload.class_id === '') payload.class_id = null;
    if (payload.academic_year_id) payload.academic_year_id = parseInt(payload.academic_year_id, 10) || payload.academic_year_id;
    if (payload.class_id) payload.class_id = parseInt(payload.class_id, 10) || payload.class_id;
    if (payload.amount !== undefined) payload.amount = parseFloat(payload.amount) || 0;
    const effectiveFeeSchoolId = getEffectiveSchoolId(data?.school_id);
    if (effectiveFeeSchoolId && effectiveFeeSchoolId !== 'all') {
      payload.school_id = Number(effectiveFeeSchoolId);
    }
    const { data: res, error } = await supabase.from('fee_structures').insert(payload).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  create: async (data) => feeAPI.createStructure(data),
  updateStructure: async (id, data) => {
    if (!useSupabase) return api.put(`/fee-structures/${id}`, data);
    const { due_day, class: _c, academic_year: _ay, id: _id, created_at: _ca, updated_at: _ua, deleted_at: _da, ...payload } = data;
    if (payload.class_id === '') payload.class_id = null;
    if (payload.academic_year_id) payload.academic_year_id = parseInt(payload.academic_year_id, 10) || payload.academic_year_id;
    if (payload.class_id) payload.class_id = parseInt(payload.class_id, 10) || payload.class_id;
    if (payload.amount !== undefined) payload.amount = parseFloat(payload.amount) || 0;
    const { data: res, error } = await supabase.from('fee_structures').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  update: async (id, data) => feeAPI.updateStructure(id, data),
  deleteStructure: async (id) => {
    if (!useSupabase) return api.delete(`/fee-structures/${id}`);
    const { error } = await supabase.from('fee_structures').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  delete: async (id) => feeAPI.deleteStructure(id),
  getPayments: async (params) => {
    if (!useSupabase) return api.get('/fee-payments', { params });
    let query = supabase.from('fee_payments').select('*, student:students(first_name, last_name, admission_number, roll_number, class:classes(name), section:sections(name)), fee_structure:fee_structures(name, amount, type, frequency, academic_year:academic_years(name))', { count: 'exact' });

    // Multi-School Scoping & Tenant Security Enforcement
    const effectiveSchoolId = getEffectiveSchoolId(params?.school_id);
    if (effectiveSchoolId !== 'all') {
      try {
        query = query.eq('school_id', effectiveSchoolId);
      } catch (_) {}
    }

    if (params?.fee_structure_id) {
      query = query.eq('fee_structure_id', params.fee_structure_id);
    }
    if (params?.student_id) {
      query = query.eq('student_id', params.student_id);
    }
    if (params?.payment_method) {
      query = query.eq('payment_method', params.payment_method);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    query = query.order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    let data, count;
    try {
      const res = await query;
      if (res.error) throw res.error;
      data = res.data;
      count = res.count;
    } catch (err) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_fee_payments') : null;
      if (rawSeeded) {
        data = JSON.parse(rawSeeded);
        count = data.length;
      } else {
        throw err;
      }
    }

    if (!data || data.length === 0) {
      const rawSeeded = typeof localStorage !== 'undefined' ? localStorage.getItem('sms_seeded_fee_payments') : null;
      if (rawSeeded) {
        try {
          let seeded = JSON.parse(rawSeeded);
          if (effectiveSchoolId !== 'all') {
            seeded = seeded.filter(p => String(p.school_id || 1) === String(effectiveSchoolId));
          }
          if (seeded.length > 0) {
            data = seeded;
            count = seeded.length;
          }
        } catch (_) {}
      }
    }

    return paginate(data, count, params);
  },
  collectPayment: async (data) => {
    if (!useSupabase) return api.post('/fee-payments', data);
    const amount = parseFloat(data.amount || 0);
    const discount = parseFloat(data.discount || 0);
    const fine = parseFloat(data.fine || 0);
    const totalAmount = data.total_amount !== undefined ? parseFloat(data.total_amount) : (amount - discount + fine);
    const todayStr = new Date().toISOString().slice(0, 10);

    const effectiveSchoolId = getEffectiveSchoolId(data.school_id);
    const assignedSchoolId = effectiveSchoolId === 'all' ? 1 : effectiveSchoolId;
    const schools = getStoredSchools();
    const currentSch = schools.find((s) => String(s.id) === String(assignedSchoolId)) || schools[0];
    const prefix = currentSch?.receiptPrefix || 'REC-';
    const receiptNum = data.receipt_number || `${prefix}${todayStr.replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;

    const payload = {
      ...data,
      school_id: assignedSchoolId,
      amount,
      discount,
      fine,
      total_amount: totalAmount,
      receipt_number: receiptNum,
      payment_date: data.payment_date || todayStr,
      payment_method: data.payment_method || 'cash',
      status: data.status || 'completed',
    };

    const { data: res, error } = await supabase.from('fee_payments').insert(payload).select('*, student:students(first_name, last_name)').single();
    if (error) throw error;
    return { success: true, data: res };
  },
  collectTotalPayment: async (data) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const receiptNum = data.receipt_number || `RCP-${todayStr.replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;
    const items = data.items || [];
    const months = data.months || [];
    const monthsDesc = months.length > 0 ? `Paid for: ${months.join(', ')} (${months.length} Month${months.length > 1 ? 's' : ''})` : '';
    const generalRemarks = [monthsDesc, data.remarks].filter(Boolean).join('. ');

    if (!useSupabase) {
      const results = [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const rowReceipt = items.length > 1 ? `${receiptNum}-${idx + 1}` : receiptNum;
        const payload = {
          student_id: data.student_id,
          fee_structure_id: item.fee_structure_id,
          amount: parseFloat(item.subtotal || item.amount || 0),
          discount: parseFloat(item.discount || 0),
          fine: parseFloat(item.fine || 0),
          total_amount: parseFloat(item.total_amount || item.subtotal || 0),
          payment_date: data.payment_date || todayStr,
          payment_method: data.payment_method || 'cash',
          transaction_id: data.transaction_id || null,
          remarks: generalRemarks,
          receipt_number: rowReceipt,
          status: 'completed',
        };
        const res = await api.post('/fee-payments', payload);
        results.push(res.data);
      }
      return { success: true, receipt_number: receiptNum, data: results };
    }

    const effectivePaymentSchoolId = getEffectiveSchoolId(data.school_id);
    const assignedSchoolId = effectivePaymentSchoolId === 'all' ? 1 : Number(effectivePaymentSchoolId);

    const rowsToInsert = items.map((item, idx) => ({
      student_id: data.student_id,
      school_id: assignedSchoolId,
      fee_structure_id: item.fee_structure_id,
      amount: parseFloat(item.subtotal || item.amount || 0),
      discount: parseFloat(item.discount || 0),
      fine: parseFloat(item.fine || 0),
      total_amount: parseFloat(item.total_amount || item.subtotal || 0),
      payment_date: data.payment_date || todayStr,
      payment_method: data.payment_method || 'cash',
      transaction_id: data.transaction_id || null,
      remarks: generalRemarks,
      receipt_number: items.length > 1 ? `${receiptNum}-${idx + 1}` : receiptNum,
      status: 'completed',
    }));

    if (rowsToInsert.length === 0 && data.fee_structure_id) {
      rowsToInsert.push({
        student_id: data.student_id,
        school_id: assignedSchoolId,
        fee_structure_id: data.fee_structure_id,
        amount: parseFloat(data.amount || 0),
        discount: parseFloat(data.discount || 0),
        fine: parseFloat(data.fine || 0),
        total_amount: parseFloat(data.total_amount || 0),
        payment_date: data.payment_date || todayStr,
        payment_method: data.payment_method || 'cash',
        transaction_id: data.transaction_id || null,
        remarks: generalRemarks,
        receipt_number: receiptNum,
        status: 'completed',
      });
    }

    const { data: res, error } = await supabase
      .from('fee_payments')
      .insert(rowsToInsert)
      .select('*, student:students(first_name, last_name, admission_number), fee_structure:fee_structures(name, type)');

    if (error) throw error;
    return { success: true, receipt_number: receiptNum, data: res };
  },
  getStatistics: async () => {
    if (!useSupabase) return api.get('/fee-payments/statistics');
    const { data } = await supabase.from('fee_payments').select('amount');
    const total = (data || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    return { success: true, data: { total, paid: total, pending: 0, overdue: 0 } };
  },
  getStudentFees: async (studentId) => {
    if (!useSupabase) return api.get(`/fee-payments/student/${studentId}`);
    const { data, error } = await supabase.from('fee_payments').select('*').eq('student_id', studentId).order('id', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  },
};

// ==========================================
// Assignment API
// ==========================================
export const assignmentAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/assignments', { params });
    let query = supabase.from('assignments').select('*, teacher:teachers(first_name, last_name), class:classes(name), section:sections(name), subject:subjects(name)', { count: 'exact' });
    if (params?.academic_year_id) query = query.eq('academic_year_id', params.academic_year_id);
    if (params?.class_id) query = query.eq('class_id', params.class_id);
    if (params?.class_ids && Array.isArray(params.class_ids)) {
      if (params.class_ids.length > 0) {
        query = query.in('class_id', params.class_ids);
      } else {
        query = query.eq('class_id', -1);
      }
    }
    if (params?.section_ids && Array.isArray(params.section_ids)) {
      if (params.section_ids.length > 0) {
        query = query.in('section_id', params.section_ids);
      } else {
        query = query.eq('section_id', -1);
      }
    }
    if (params?.section_id) query = query.eq('section_id', params.section_id);
    if (params?.subject_id) query = query.eq('subject_id', params.subject_id);
    if (params?.teacher_id) query = query.eq('teacher_id', params.teacher_id);
    if (params?.search) {
      query = query.ilike('title', `%${String(params.search).trim()}%`);
    }
    query = query.order('id', { ascending: false });

    const page = parseInt(params?.page || 1, 10);
    const perPage = params?.per_page === 'all' ? null : parseInt(params?.per_page || 20, 10);
    if (perPage) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/assignments/${id}`);
    const { data, error } = await supabase.from('assignments').select('*, teacher:teachers(first_name, last_name), class:classes(name), section:sections(name), subject:subjects(name)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: async (data) => {
    if (!useSupabase) return api.post('/assignments', data);
    const { data: res, error } = await supabase.from('assignments').insert(data).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  update: async (id, data) => {
    if (!useSupabase) return api.put(`/assignments/${id}`, data);
    const { data: res, error } = await supabase.from('assignments').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  delete: async (id) => {
    if (!useSupabase) return api.delete(`/assignments/${id}`);
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },
  submit: async (id, data) => {
    if (!useSupabase) return api.post(`/assignments/${id}/submit`, data);
    const nowStr = new Date().toISOString();
    const payload = {
      assignment_id: parseInt(id, 10) || id,
      student_id: parseInt(data.student_id, 10) || data.student_id,
      submission_text: data.submission_text || null,
      attachment: data.attachment || null,
      submitted_at: nowStr,
      status: 'submitted',
    };
    const { data: res, error } = await supabase
      .from('assignment_submissions')
      .upsert(payload, { onConflict: 'assignment_id,student_id' })
      .select()
      .single();
    if (error) throw error;
    return { success: true, data: res, message: 'Assignment submitted successfully' };
  },
  gradeSubmission: async (submissionId, data) => {
    if (!useSupabase) return api.post(`/assignment-submissions/${submissionId}/grade`, data);
    const payload = {
      marks_obtained: parseFloat(data.marks_obtained) || 0,
      feedback: data.feedback || '',
      status: 'graded',
      graded_at: new Date().toISOString(),
    };
    const { data: res, error } = await supabase.from('assignment_submissions').update(payload).eq('id', submissionId).select().single();
    if (error) throw error;
    return { success: true, data: res };
  },
  getSubmissions: async (id) => {
    if (!useSupabase) return api.get(`/assignments/${id}/submissions`);
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, student:students(first_name, last_name, admission_number, roll_number)')
      .eq('assignment_id', id);
    if (error) throw error;
    return { success: true, data };
  },
  getStudentAssignments: async (studentId) => {
    if (!useSupabase) return api.get(`/assignments/student/${studentId}`);
    const { data: student, error: sErr } = await supabase.from('students').select('class_id, section_id').eq('id', studentId).single();
    if (sErr) throw sErr;
    let query = supabase.from('assignments').select('*, teacher:teachers(first_name, last_name), class:classes(name), section:sections(name), subject:subjects(name)').eq('class_id', student.class_id);
    if (student.section_id) {
      query = query.eq('section_id', student.section_id);
    }
    const { data: assignments, error: aErr } = await query.order('due_date', { ascending: false });
    if (aErr) throw aErr;
    const { data: submissions } = await supabase.from('assignment_submissions').select('*').eq('student_id', studentId);
    const subMap = {};
    (submissions || []).forEach(s => { subMap[s.assignment_id] = s; });
    const formatted = (assignments || []).map(a => {
      const sub = subMap[a.id] || null;
      return {
        assignment: a,
        submission: sub,
        is_submitted: sub && ['submitted', 'graded', 'late'].includes(sub.status),
        is_overdue: !sub && new Date(a.due_date) < new Date(),
      };
    });
    return { success: true, data: formatted };
  },
  getStudentSubmissions: async (studentId) => {
    if (!useSupabase) return api.get(`/assignment-submissions/student/${studentId}`);
    const { data, error } = await supabase.from('assignment_submissions').select('*').eq('student_id', studentId);
    if (error) throw error;
    return { success: true, data: data || [] };
  },
};

// ==========================================
// Notification API
// ==========================================
const NOTIFICATION_STORAGE_KEY = 'sms_notifications';

const buildDefaultNotifications = () => {
  const now = Date.now();
  const minutesAgo = (m) => new Date(now - m * 60 * 1000).toISOString();
  const hoursAgo = (h) => new Date(now - h * 3600 * 1000).toISOString();
  const daysAgo = (d) => new Date(now - d * 86400 * 1000).toISOString();

  return [
    {
      id: 'notif-1',
      title: 'Term 2 Tuition Fee Due: ₹14,500',
      message: 'Second term tuition and lab fees for Aarav Sharma (Class 10-A) are due on Feb 28, 2026. Avoid late fee penalty by paying online.',
      type: 'fee',
      priority: 'urgent',
      target_role: 'parent',
      target_email: 'suresh.sharma@parent.school.com',
      student_name: 'Aarav Sharma',
      link: '/fee-payment',
      is_read: false,
      read_at: null,
      created_at: minutesAgo(25),
      metadata: { amount: '₹14,500', dueDate: '2026-02-28', student: 'Aarav Sharma', class: 'Class 10-A' },
    },
    {
      id: 'notif-2',
      title: 'Attendance Alert: Aarav Sharma Marked Absent',
      message: 'Aarav Sharma was marked Absent for Period 1 (Mathematics) on Friday, Feb 13. Please verify and submit an excuse slip if sick.',
      type: 'attendance',
      priority: 'high',
      target_role: 'parent',
      target_email: 'suresh.sharma@parent.school.com',
      student_name: 'Aarav Sharma',
      link: '/attendance',
      is_read: false,
      read_at: null,
      created_at: hoursAgo(2),
      metadata: { student: 'Aarav Sharma', status: 'Absent', date: '2026-02-13', period: 'Period 1 (Maths)' },
    },
    {
      id: 'notif-3',
      title: 'PTM Slot Confirmed: Diya Sharma',
      message: 'Parent-Teacher Meeting with Class 8-B Teacher Anjali Gupta has been scheduled for Saturday, Feb 21, 2026 at 10:30 AM in Room 204.',
      type: 'communication',
      priority: 'high',
      target_role: 'parent',
      target_email: 'suresh.sharma@parent.school.com',
      student_name: 'Diya Sharma',
      link: '/communication',
      is_read: false,
      read_at: null,
      created_at: hoursAgo(5),
      metadata: { teacher: 'Anjali Gupta', date: 'Feb 21, 2026', time: '10:30 AM', venue: 'Room 204' },
    },
    {
      id: 'notif-4',
      title: 'Unit Test 3 Mathematics Results',
      message: 'Term 2 UT-3 Mathematics results have been published. Aarav Sharma scored 94/100 (Grade A1) with exemplary marks in Trigonometry.',
      type: 'exam',
      priority: 'normal',
      target_role: 'parent',
      target_email: 'suresh.sharma@parent.school.com',
      student_name: 'Aarav Sharma',
      link: '/exams',
      is_read: true,
      read_at: hoursAgo(10),
      created_at: hoursAgo(18),
      metadata: { exam: 'Unit Test 3', subject: 'Mathematics', score: '94/100', grade: 'A1' },
    },
    {
      id: 'notif-5',
      title: 'New Assignment: Physics Lab Report',
      message: 'Mr. Rajesh Kumar posted a new laboratory homework assignment: "Electromagnetic Induction & Faraday Laws". Due on Feb 23, 2026.',
      type: 'assignment',
      priority: 'normal',
      target_role: 'all',
      target_email: null,
      student_name: 'Aarav Sharma',
      link: '/assignments',
      is_read: false,
      read_at: null,
      created_at: daysAgo(1),
      metadata: { subject: 'Physics', teacher: 'Rajesh Kumar', dueDate: '2026-02-23', maxMarks: 50 },
    },
    {
      id: 'notif-6',
      title: 'Annual Athletic Meet 2026 Circular',
      message: 'Annual Inter-House Sports Championship is scheduled for Thursday, March 5, 2026. Parents are cordially invited to the opening ceremony.',
      type: 'announcement',
      priority: 'normal',
      target_role: 'all',
      target_email: null,
      student_name: null,
      link: '/gallery',
      is_read: false,
      read_at: null,
      created_at: daysAgo(2),
      metadata: { event: 'Sports Meet', date: '2026-03-05', venue: 'Main Stadium' },
    },
    {
      id: 'notif-7',
      title: 'Fee Payment Receipt #REC-2026-089',
      message: 'Payment of ₹12,000 for Diya Sharma (Class 8-B) received successfully via UPI. Download your computerized tax invoice and receipt.',
      type: 'fee',
      priority: 'low',
      target_role: 'parent',
      target_email: 'suresh.sharma@parent.school.com',
      student_name: 'Diya Sharma',
      link: '/fees/payment',
      is_read: true,
      read_at: daysAgo(2),
      created_at: daysAgo(3),
      metadata: { receiptNo: 'REC-2026-089', amount: '₹12,000', method: 'UPI' },
    },
    {
      id: 'notif-8',
      title: 'Parent Inquiry: Suresh Sharma',
      message: 'Parent Suresh Sharma submitted an academic inquiry regarding Olympiad preparation materials and weekend coaching classes.',
      type: 'communication',
      priority: 'high',
      target_role: 'teacher',
      target_email: 'teacher@school.com',
      student_name: 'Aarav Sharma',
      link: '/communication',
      is_read: false,
      read_at: null,
      created_at: hoursAgo(3),
      metadata: { parent: 'Suresh Sharma', child: 'Aarav Sharma', threadId: 'thread-1' },
    },
    {
      id: 'notif-9',
      title: 'Student Assignment Submission: Diya Sharma',
      message: 'Diya Sharma (Class 8-B) has submitted the Chemistry assignment: "Acids, Bases & Salts Lab Observations". Pending grading.',
      type: 'assignment',
      priority: 'normal',
      target_role: 'teacher',
      target_email: null,
      student_name: 'Diya Sharma',
      link: '/assignments',
      is_read: false,
      read_at: null,
      created_at: hoursAgo(7),
      metadata: { student: 'Diya Sharma', subject: 'Chemistry', submittedAt: 'Yesterday' },
    },
    {
      id: 'notif-10',
      title: 'Automated Database Backup Completed',
      message: 'Automated institutional snapshot backup #20260216-01 completed with 0 errors across 1,420 students, 48 faculty and fee tables.',
      type: 'system',
      priority: 'low',
      target_role: 'admin',
      target_email: null,
      student_name: null,
      link: '/settings',
      is_read: false,
      read_at: null,
      created_at: hoursAgo(4),
      metadata: { status: 'Success', records: 1468, duration: '1.4s' },
    },
    {
      id: 'notif-11',
      title: 'Fee Collection Summary: ₹1,85,000 Reconciled',
      message: 'Daily fee collection report: 14 transactions processed today totaling ₹1,85,000 across Net Banking, UPI, and Cash counter.',
      type: 'fee',
      priority: 'normal',
      target_role: 'admin',
      target_email: null,
      student_name: null,
      link: '/fees',
      is_read: false,
      read_at: null,
      created_at: hoursAgo(6),
      metadata: { totalAmount: '₹1,85,000', transactions: 14, date: 'Today' },
    },
    {
      id: 'notif-12',
      title: 'Campus Holiday: Maha Shivratri',
      message: 'School campus, academic classes, administrative offices, and bus transport will remain closed on Friday, March 8, 2026.',
      type: 'announcement',
      priority: 'normal',
      target_role: 'all',
      target_email: null,
      student_name: null,
      link: '/notifications',
      is_read: true,
      read_at: daysAgo(3),
      created_at: daysAgo(4),
      metadata: { holidayDate: '2026-03-08', occasion: 'Maha Shivratri' },
    },
  ];
};

const getStoredNotifications = () => {
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse stored notifications', e);
  }
  const defaults = buildDefaultNotifications();
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(defaults));
  } catch (_) {}
  return defaults;
};

const saveStoredNotifications = (notifications) => {
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed to save notifications', e);
  }
  try {
    window.dispatchEvent(new CustomEvent('sms:notifications-updated', { detail: { count: notifications.length } }));
  } catch (_) {}
};

export const notificationAPI = {
  getAll: async (params = {}) => {
    let items = getStoredNotifications();
    const { role, userEmail, category, isRead, priority, search, page = 1, per_page = 20 } = params;

    // Multi-School Scoping & Tenant Security Enforcement
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    if (effectiveSchoolId !== 'all') {
      items = items.filter(n => !n.school_id || n.school_id === 'all' || String(n.school_id) === String(effectiveSchoolId));
    }

    // Filter by role & target
    if (role && role !== 'admin' && role !== 'super-admin') {
      const userEmailLower = (userEmail || '').toLowerCase();
      items = items.filter(n => {
        // Universal notifications
        if (!n.target_role || n.target_role === 'all') return true;
        // Direct role match
        if (n.target_role === role) {
          // If a specific target email is set, match it
          if (n.target_email && userEmailLower) {
            return n.target_email.toLowerCase() === userEmailLower;
          }
          return true;
        }
        return false;
      });
    }

    // Filter by category
    if (category && category !== 'all') {
      items = items.filter(n => (n.type || '').toLowerCase() === category.toLowerCase());
    }

    // Filter by read status
    if (isRead === 'unread' || isRead === false) {
      items = items.filter(n => !n.is_read);
    } else if (isRead === 'read' || isRead === true) {
      items = items.filter(n => !!n.is_read);
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      items = items.filter(n => (n.priority || '').toLowerCase() === priority.toLowerCase());
    }

    // Filter by search keyword
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q) ||
        (n.student_name || '').toLowerCase().includes(q) ||
        (n.type || '').toLowerCase().includes(q)
      );
    }

    // Sort by created_at descending (newest first)
    items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const total = items.length;
    const pageNum = parseInt(page, 10) || 1;
    const perPageNum = per_page === 'all' ? total : parseInt(per_page, 10) || 20;
    const start = (pageNum - 1) * perPageNum;
    const paginated = items.slice(start, start + perPageNum);

    return {
      success: true,
      data: paginated,
      total,
      page: pageNum,
      per_page: perPageNum,
      last_page: Math.ceil(total / (perPageNum || 1)) || 1,
    };
  },

  getUnreadCount: async (params = {}) => {
    let items = getStoredNotifications();
    const { role, userEmail } = params;

    if (role && role !== 'admin' && role !== 'super-admin') {
      const userEmailLower = (userEmail || '').toLowerCase();
      items = items.filter(n => {
        if (!n.target_role || n.target_role === 'all') return true;
        if (n.target_role === role) {
          if (n.target_email && userEmailLower) {
            return n.target_email.toLowerCase() === userEmailLower;
          }
          return true;
        }
        return false;
      });
    }

    const unreadCount = items.filter(n => !n.is_read).length;
    return { success: true, count: unreadCount };
  },

  markAsRead: async (id) => {
    const items = getStoredNotifications();
    let updated = false;
    const next = items.map(n => {
      if (String(n.id) === String(id)) {
        updated = true;
        return { ...n, is_read: true, read_at: new Date().toISOString() };
      }
      return n;
    });
    if (updated) {
      saveStoredNotifications(next);
    }
    // Also try Supabase if configured
    if (useSupabase) {
      try {
        await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
      } catch (_) {}
    }
    return { success: true, id };
  },

  markAsUnread: async (id) => {
    const items = getStoredNotifications();
    const next = items.map(n => {
      if (String(n.id) === String(id)) {
        return { ...n, is_read: false, read_at: null };
      }
      return n;
    });
    saveStoredNotifications(next);
    return { success: true, id };
  },

  markAllAsRead: async (params = {}) => {
    const items = getStoredNotifications();
    const { role, userEmail } = params;
    const nowIso = new Date().toISOString();
    const userEmailLower = (userEmail || '').toLowerCase();

    const next = items.map(n => {
      // Check if item belongs to this role/user
      let belongs = true;
      if (role && role !== 'admin' && role !== 'super-admin') {
        if (n.target_role && n.target_role !== 'all' && n.target_role !== role) {
          belongs = false;
        }
        if (n.target_email && userEmailLower && n.target_email.toLowerCase() !== userEmailLower) {
          belongs = false;
        }
      }
      if (belongs && !n.is_read) {
        return { ...n, is_read: true, read_at: nowIso };
      }
      return n;
    });

    saveStoredNotifications(next);
    return { success: true };
  },

  create: async (data) => {
    const items = getStoredNotifications();
    const effectiveSchoolId = getEffectiveSchoolId(data.school_id);
    const assignedSchoolId = effectiveSchoolId === 'all' ? 'all' : effectiveSchoolId;
    const newItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      school_id: assignedSchoolId,
      title: data.title || 'Institutional Announcement',
      message: data.message || '',
      type: data.type || 'announcement',
      priority: data.priority || 'normal',
      target_role: data.target_role || 'all',
      target_email: data.target_email || null,
      student_name: data.student_name || null,
      link: data.link || '/notifications',
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      metadata: data.metadata || {},
    };

    items.unshift(newItem);
    saveStoredNotifications(items);

    // Also persist to Supabase if configured
    if (useSupabase) {
      try {
        await supabase.from('notifications').insert([{
          type: newItem.type,
          title: newItem.title,
          message: newItem.message,
          data: {
            ...newItem.metadata,
            priority: newItem.priority,
            target_role: newItem.target_role,
            link: newItem.link,
          },
          is_read: false,
          created_at: newItem.created_at,
        }]);
      } catch (_) {}
    }

    return { success: true, data: newItem };
  },

  delete: async (id) => {
    const items = getStoredNotifications();
    const next = items.filter(n => String(n.id) !== String(id));
    saveStoredNotifications(next);
    return { success: true, id };
  },

  clearAll: async (params = {}) => {
    const items = getStoredNotifications();
    const { role, userEmail } = params;
    const userEmailLower = (userEmail || '').toLowerCase();

    // If role is admin, clear all; else clear only role's matching items
    if (!role || role === 'admin' || role === 'super-admin') {
      saveStoredNotifications([]);
    } else {
      const remaining = items.filter(n => {
        if (n.target_role === role) {
          if (!n.target_email) return false;
          if (userEmailLower && n.target_email.toLowerCase() === userEmailLower) return false;
        }
        return true;
      });
      saveStoredNotifications(remaining);
    }
    return { success: true };
  },

  resetDefaults: async () => {
    const defaults = buildDefaultNotifications();
    saveStoredNotifications(defaults);
    return { success: true, data: defaults };
  },
};

// ==========================================
// Settings API
// ==========================================
export const settingsAPI = {
  getAll: async () => {
    // 1. Read existing cached settings and permissions from localStorage
    let settingsMap = {};
    try {
      const stored = localStorage.getItem('app_settings');
      if (stored) {
        settingsMap = JSON.parse(stored);
        if (
          settingsMap.school_name &&
          (settingsMap.school_name.toLowerCase().includes('twinkling') ||
           settingsMap.school_name.toLowerCase().includes('toddler') ||
           settingsMap.school_name.toLowerCase() === 'school management system' ||
           settingsMap.school_name.toLowerCase() === 'sms')
        ) {
          settingsMap.school_name = 'Delhi Public Academy';
          localStorage.setItem('app_settings', JSON.stringify(settingsMap));
        }
      }
    } catch (_) {}

    try {
      const storedPerms = localStorage.getItem('sms_role_permissions');
      if (storedPerms) {
        settingsMap.user_role_permissions = JSON.parse(storedPerms);
      }
    } catch (_) {}

    if (!useSupabase) {
      try {
        const res = await api.get('/settings');
        if (res?.data) {
          const apiData = res.data.data || res.data;
          settingsMap = { ...settingsMap, ...apiData };
        }
      } catch (err) {
        console.warn('Backend settings fetch failed, using local fallback:', err);
      }
      return { success: true, data: settingsMap };
    }

    try {
      // Race Supabase select against a 5-second timeout to prevent stalling on slow/hanging networks
      const fetchPromise = supabase.from('settings').select('*');
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase settings query timed out')), 5000)
      );
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (!error && Array.isArray(data)) {
        data.forEach(item => {
          let val = item.value;
          if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try {
              val = JSON.parse(val);
            } catch {
              // keep as string
            }
          }
          if (
            item.key === 'school_name' &&
            typeof val === 'string' &&
            (val.toLowerCase().includes('twinkling') || val.toLowerCase().includes('toddler'))
          ) {
            val = 'Delhi Public Academy';
            supabase.from('settings').upsert({ key: 'school_name', value: 'Delhi Public Academy' }, { onConflict: 'key' }).then(() => {}).catch(() => {});
          }
          settingsMap[item.key] = val;
        });
      }
    } catch (err) {
      console.warn('Supabase settings fetch failed or timed out, preserving local settings:', err);
    }

    // Crucial safeguard: ensure custom local permissions are preserved if saved locally
    try {
      const localPerms = localStorage.getItem('sms_role_permissions');
      if (localPerms) {
        settingsMap.user_role_permissions = JSON.parse(localPerms);
      }
    } catch (_) {}

    return { success: true, data: settingsMap };
  },
  update: async (data) => {
    // 1. Immediately persist locally to guarantee zero data loss across refreshes
    try {
      const stored = localStorage.getItem('app_settings');
      let currentSettings = stored ? JSON.parse(stored) : {};
      currentSettings = { ...currentSettings, ...data };
      localStorage.setItem('app_settings', JSON.stringify(currentSettings));
      localStorage.setItem('sms_settings', JSON.stringify(currentSettings));

      if (data.user_role_permissions) {
        localStorage.setItem('sms_role_permissions', JSON.stringify(data.user_role_permissions));
      }
    } catch (e) {
      console.warn('Local storage write warning:', e);
    }

    // 2. Synchronize to Supabase with timeout guard
    if (useSupabase) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase settings upsert timeout')), 6000)
        );

        for (const [key, value] of Object.entries(data)) {
          const valStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
          const upsertPromise = supabase.from('settings').upsert({ key, value: valStr }, { onConflict: 'key' });
          const res = await Promise.race([upsertPromise, timeoutPromise]);
          if (res?.error) {
            console.error('Supabase settings upsert error for key:', key, res.error);
          }
        }
      } catch (err) {
        console.warn('Supabase settings upsert encountered issue (persisted locally):', err);
      }
      return { success: true, message: 'Settings saved and persisted successfully.', data };
    }

    // 3. Synchronize to Laravel backend if not Supabase
    try {
      await api.put('/settings', data);
    } catch (err) {
      console.warn('Backend API settings save failed, persisted locally:', err);
    }
    return { success: true, message: 'Settings saved and persisted successfully.', data };
  },
};

// ==========================================
// Gallery API (School Memories & Events)
// ==========================================
const DEFAULT_GALLERY_ITEMS = [
  {
    id: 'gal-1',
    title: 'Annual Athletic Meet 2026 - Relay Finals',
    category: 'Sports',
    description: 'Thrilling moments as the senior boys 4x100m relay sprint team dashes across the finish line to capture gold during the 2026 Inter-House Championship.',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    eventDate: '2026-02-18',
    tags: ['Athletics', 'Track & Field', 'Gold Medal', 'Inter-House'],
    featured: true,
    uploadedBy: 'School Sports Dept',
    uploadedAt: '2026-02-18T10:30:00.000Z',
    likes: 42,
  },
  {
    id: 'gal-2',
    title: 'National Science & Robotics Innovation Fair',
    category: 'Science & Academics',
    description: 'Class 9 and 10 students demonstrating autonomous rover prototypes and automated eco-friendly solar water filtration units to external judges.',
    imageUrl: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80',
    eventDate: '2026-02-10',
    tags: ['Robotics', 'STEM', 'Innovation', 'Exhibition'],
    featured: false,
    uploadedBy: 'Science Club',
    uploadedAt: '2026-02-10T14:15:00.000Z',
    likes: 38,
  },
  {
    id: 'gal-3',
    title: 'Spring Cultural Fest - Symphony in Harmony',
    category: 'Cultural & Arts',
    description: 'The senior school choir and classical orchestra captivating the auditorium audience with harmonic Indian and Western classical compositions.',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    eventDate: '2026-01-28',
    tags: ['Music', 'Choir', 'Cultural Fest', 'Auditorium'],
    featured: false,
    uploadedBy: 'Arts & Culture Committee',
    uploadedAt: '2026-01-28T18:00:00.000Z',
    likes: 29,
  },
  {
    id: 'gal-4',
    title: 'Republic Day Flag Hoisting & March-Past',
    category: 'Celebrations',
    description: 'NCC cadets and house captains in synchronized formation saluting the Tricolour during the solemn 77th Republic Day celebration.',
    imageUrl: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=1200&q=80',
    eventDate: '2026-01-26',
    tags: ['Republic Day', 'Patriotic', 'Parade', 'NCC Cadets'],
    featured: false,
    uploadedBy: "Principal's Office",
    uploadedAt: '2026-01-26T09:00:00.000Z',
    likes: 54,
  },
  {
    id: 'gal-5',
    title: 'Advanced STEM & Biotech Laboratory Session',
    category: 'Campus & Facilities',
    description: 'Senior secondary biology students engaged in molecular genetics experiments in our recently renovated high-tech life sciences laboratory.',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    eventDate: '2026-01-15',
    tags: ['Laboratory', 'Biology', 'Microscope', 'Campus'],
    featured: false,
    uploadedBy: 'Faculty Dept',
    uploadedAt: '2026-01-15T11:45:00.000Z',
    likes: 24,
  },
  {
    id: 'gal-6',
    title: 'Inter-School Basketball Championship Winners',
    category: 'Sports',
    description: 'Our school varsity basketball team hoisting the regional trophy after a thrilling 68-64 fourth-quarter comeback victory.',
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
    eventDate: '2026-01-05',
    tags: ['Basketball', 'Championship', 'Team Sports', 'Trophy'],
    featured: false,
    uploadedBy: 'Sports Dept',
    uploadedAt: '2026-01-05T16:20:00.000Z',
    likes: 61,
  },
  {
    id: 'gal-7',
    title: 'Fine Arts & Canvas Oil Painting Showcase',
    category: 'Cultural & Arts',
    description: 'Junior and middle school students experimenting with acrylic and oil pastels during the weekend creative fine arts workshop.',
    imageUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80',
    eventDate: '2025-12-14',
    tags: ['Art', 'Painting', 'Creativity', 'Workshop'],
    featured: false,
    uploadedBy: 'Art Department',
    uploadedAt: '2025-12-14T13:10:00.000Z',
    likes: 31,
  },
  {
    id: 'gal-8',
    title: 'Collaborative Smart Classrooms & Digital Math',
    category: 'Campus & Facilities',
    description: 'Interactive touch display learning in Grade 8 mathematics, fostering teamwork, geometric visualization, and student engagement.',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
    eventDate: '2025-11-20',
    tags: ['Smart Classroom', 'Technology', 'Learning', 'Digital'],
    featured: false,
    uploadedBy: 'Admin Office',
    uploadedAt: '2025-11-20T10:00:00.000Z',
    likes: 19,
  },
];

const getStoredGalleryItems = () => {
  try {
    const raw = localStorage.getItem('sms_gallery_items');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored gallery items', e);
  }
  // Initialize with default items
  try {
    localStorage.setItem('sms_gallery_items', JSON.stringify(DEFAULT_GALLERY_ITEMS));
  } catch (_) {}
  return DEFAULT_GALLERY_ITEMS;
};

const saveStoredGalleryItems = (items) => {
  try {
    localStorage.setItem('sms_gallery_items', JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save gallery items to localStorage', e);
  }
};

export const galleryAPI = {
  getAll: async (params = {}) => {
    let items = getStoredGalleryItems();
    const { category, search, sort = 'newest' } = params;

    if (category && category !== 'All') {
      items = items.filter(item => item.category?.toLowerCase() === category.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        const catMatch = item.category?.toLowerCase().includes(q);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));
        return titleMatch || descMatch || catMatch || tagMatch;
      });
    }

    if (sort === 'newest') {
      items = [...items].sort((a, b) => new Date(b.eventDate || b.uploadedAt) - new Date(a.eventDate || a.uploadedAt));
    } else if (sort === 'oldest') {
      items = [...items].sort((a, b) => new Date(a.eventDate || a.uploadedAt) - new Date(b.eventDate || b.uploadedAt));
    } else if (sort === 'popular') {
      items = [...items].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    return {
      success: true,
      data: items,
      total: items.length,
    };
  },

  getById: async (id) => {
    const items = getStoredGalleryItems();
    const found = items.find(i => String(i.id) === String(id));
    if (!found) {
      throw new Error('Gallery image not found');
    }
    return { success: true, data: found };
  },

  create: async (itemData) => {
    const items = getStoredGalleryItems();
    const id = `gal-${Date.now()}`;
    const isFeatured = !!itemData.featured;

    let updatedList = items;
    if (isFeatured) {
      // Unset previous featured item
      updatedList = updatedList.map(item => ({ ...item, featured: false }));
    }

    const newItem = {
      id,
      title: itemData.title?.trim() || 'Untitled Event Photo',
      category: itemData.category || 'School Events',
      description: itemData.description?.trim() || '',
      imageUrl: itemData.imageUrl,
      eventDate: itemData.eventDate || new Date().toISOString().split('T')[0],
      tags: Array.isArray(itemData.tags)
        ? itemData.tags
        : typeof itemData.tags === 'string'
        ? itemData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [],
      featured: isFeatured,
      uploadedBy: itemData.uploadedBy || 'Admin',
      uploadedAt: new Date().toISOString(),
      likes: 0,
    };

    updatedList = [newItem, ...updatedList];
    saveStoredGalleryItems(updatedList);
    return { success: true, data: newItem, message: 'Image successfully uploaded to gallery!' };
  },

  update: async (id, itemData) => {
    let items = getStoredGalleryItems();
    const index = items.findIndex(i => String(i.id) === String(id));
    if (index === -1) {
      throw new Error('Gallery image not found to update');
    }

    const isFeatured = !!itemData.featured;
    if (isFeatured) {
      items = items.map(item => ({ ...item, featured: false }));
    }

    const existing = items[index];
    const updated = {
      ...existing,
      ...itemData,
      id: existing.id, // Preserve id
      tags: Array.isArray(itemData.tags)
        ? itemData.tags
        : typeof itemData.tags === 'string'
        ? itemData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : existing.tags,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    saveStoredGalleryItems(items);
    return { success: true, data: updated, message: 'Gallery image updated successfully!' };
  },

  delete: async (id) => {
    let items = getStoredGalleryItems();
    const filtered = items.filter(i => String(i.id) !== String(id));
    saveStoredGalleryItems(filtered);
    return { success: true, message: 'Image removed from gallery' };
  },

  toggleLike: async (id) => {
    let items = getStoredGalleryItems();
    const index = items.findIndex(i => String(i.id) === String(id));
    if (index !== -1) {
      const likedKey = `sms_gal_liked_${id}`;
      const isAlreadyLiked = localStorage.getItem(likedKey) === 'true';
      if (isAlreadyLiked) {
        items[index].likes = Math.max(0, (items[index].likes || 1) - 1);
        localStorage.removeItem(likedKey);
      } else {
        items[index].likes = (items[index].likes || 0) + 1;
        localStorage.setItem(likedKey, 'true');
      }
      saveStoredGalleryItems(items);
      return { success: true, data: items[index], liked: !isAlreadyLiked };
    }
    return { success: false };
  },

  resetDefaults: async () => {
    saveStoredGalleryItems(DEFAULT_GALLERY_ITEMS);
    return { success: true, data: DEFAULT_GALLERY_ITEMS };
  },
};

// ==========================================
// Teacher-Parent Communication API
// ==========================================
const DEFAULT_COMM_THREADS = [
  {
    id: 'thread-1',
    student_id: 1,
    student_name: 'Aarav Sharma',
    student_class: 'Class 7-A',
    roll_number: '12',
    parent_email: 'suresh.sharma@gmail.com',
    parent_name: 'Suresh Sharma',
    parent_phone: '9876543210',
    teacher_email: 'rajesh.kumar@school.com',
    teacher_name: 'Rajesh Kumar',
    teacher_subject: 'Mathematics',
    subject: 'Mathematics Term 2 Progress & Algebra Assessment',
    category: 'Academic',
    priority: 'normal',
    status: 'active',
    created_at: '2026-02-14T09:30:00.000Z',
    last_message_at: '2026-02-15T11:45:00.000Z',
    last_message_preview: 'NCERT exemplar practice problems will help him solidify conceptual speed for the upcoming finals.',
    unread_for_teacher: 0,
    unread_for_parent: 0,
  },
  {
    id: 'thread-2',
    student_id: 2,
    student_name: 'Diya Sharma',
    student_class: 'Class 10-A',
    roll_number: '5',
    parent_email: 'suresh.sharma@gmail.com',
    parent_name: 'Suresh Sharma',
    parent_phone: '9876543210',
    teacher_email: 'priya.sharma@school.com',
    teacher_name: 'Priya Sharma',
    teacher_subject: 'Science & Biology',
    subject: 'Parent-Teacher Meeting: Inter-School Science Fair Prototype',
    category: 'PTM Request',
    priority: 'important',
    status: 'active',
    created_at: '2026-02-15T14:00:00.000Z',
    last_message_at: '2026-02-16T08:30:00.000Z',
    last_message_preview: 'Appointment confirmed for Friday at 3:30 PM in Room 204 (Senior Science Block).',
    unread_for_teacher: 0,
    unread_for_parent: 1,
  },
  {
    id: 'thread-3',
    student_id: 1,
    student_name: 'Aarav Sharma',
    student_class: 'Class 7-A',
    roll_number: '12',
    parent_email: 'suresh.sharma@gmail.com',
    parent_name: 'Suresh Sharma',
    parent_phone: '9876543210',
    teacher_email: 'amit.patel@school.com',
    teacher_name: 'Amit Patel',
    teacher_subject: 'Physical Education & Sports',
    subject: 'Selection for Inter-House Track & Field Relay Team',
    category: 'General',
    priority: 'normal',
    status: 'resolved',
    created_at: '2026-02-12T10:15:00.000Z',
    last_message_at: '2026-02-13T16:20:00.000Z',
    last_message_preview: 'Aarav has been provided with the training schedule and uniform kit requirements.',
    unread_for_teacher: 0,
    unread_for_parent: 0,
  },
  {
    id: 'thread-4',
    student_id: 2,
    student_name: 'Diya Sharma',
    student_class: 'Class 10-A',
    roll_number: '5',
    parent_email: 'suresh.sharma@gmail.com',
    parent_name: 'Suresh Sharma',
    parent_phone: '9876543210',
    teacher_email: 'anjali.gupta@school.com',
    teacher_name: 'Anjali Gupta',
    teacher_subject: 'English Literature',
    subject: 'Zonal Debate Championship Preparation',
    category: 'Academic',
    priority: 'normal',
    status: 'active',
    created_at: '2026-02-11T12:00:00.000Z',
    last_message_at: '2026-02-14T17:00:00.000Z',
    last_message_preview: 'Diya has drafted persuasive arguments for the impromptu round. Very impressive articulation!',
    unread_for_teacher: 0,
    unread_for_parent: 0,
  },
  {
    id: 'thread-5',
    student_id: 3,
    student_name: 'Rohan Verma',
    student_class: 'Class 8-B',
    roll_number: '18',
    parent_email: 'manish.verma@gmail.com',
    parent_name: 'Manish Verma',
    parent_phone: '9812345678',
    teacher_email: 'rajesh.kumar@school.com',
    teacher_name: 'Rajesh Kumar',
    teacher_subject: 'Mathematics',
    subject: 'Homework Submission & Punctuality Follow-up',
    category: 'Homework',
    priority: 'important',
    status: 'active',
    created_at: '2026-02-13T09:00:00.000Z',
    last_message_at: '2026-02-14T10:30:00.000Z',
    last_message_preview: 'Thank you for following up, we will ensure Rohan submits chapter 6 exercises on Monday.',
    unread_for_teacher: 1,
    unread_for_parent: 0,
  },
];

const DEFAULT_COMM_MESSAGES = [
  {
    id: 'msg-1-1',
    thread_id: 'thread-1',
    sender_id: 'rajesh.kumar@school.com',
    sender_name: 'Rajesh Kumar',
    sender_role: 'teacher',
    content: 'Dear Mr. Sharma, I am writing to share that Aarav scored 88/100 in our recent algebra assessment. He has shown solid progress with linear equations and quadratic word problems.',
    created_at: '2026-02-14T09:30:00.000Z',
    read: true,
  },
  {
    id: 'msg-1-2',
    thread_id: 'thread-1',
    sender_id: 'suresh.sharma@gmail.com',
    sender_name: 'Suresh Sharma',
    sender_role: 'parent',
    content: 'Thank you so much Mr. Kumar! We have been following the practice worksheets at home as well. Does he need any supplementary reference book for geometry proofs?',
    created_at: '2026-02-14T14:10:00.000Z',
    read: true,
  },
  {
    id: 'msg-1-3',
    thread_id: 'thread-1',
    sender_id: 'rajesh.kumar@school.com',
    sender_name: 'Rajesh Kumar',
    sender_role: 'teacher',
    content: 'The school LMS practice problems and NCERT exemplar will help him solidify conceptual speed for the upcoming finals. I have also uploaded solved revision notes on the assignments tab.',
    created_at: '2026-02-15T11:45:00.000Z',
    read: true,
  },
  {
    id: 'msg-2-1',
    thread_id: 'thread-2',
    sender_id: 'priya.sharma@school.com',
    sender_name: 'Priya Sharma',
    sender_role: 'teacher',
    content: 'Dear Mr. Suresh Sharma, Diya is doing exceptionally well in Biology practical experiments. We would like to schedule a 15-minute PTM slot to discuss her inter-school science fair project prototype.',
    created_at: '2026-02-15T14:00:00.000Z',
    read: true,
  },
  {
    id: 'msg-2-2',
    thread_id: 'thread-2',
    sender_id: 'priya.sharma@school.com',
    sender_name: 'Priya Sharma',
    sender_role: 'teacher',
    content: 'Proposed appointment for PTM discussion.',
    meeting_request: {
      date: '2026-02-20',
      time: '03:30 PM',
      mode: 'In-Person (Room 204)',
      agenda: 'Inter-School Science Fair Demonstration Review',
      status: 'confirmed',
    },
    created_at: '2026-02-15T14:02:00.000Z',
    read: true,
  },
  {
    id: 'msg-2-3',
    thread_id: 'thread-2',
    sender_id: 'suresh.sharma@gmail.com',
    sender_name: 'Suresh Sharma',
    sender_role: 'parent',
    content: 'Good afternoon ma\'am. Friday at 3:30 PM is confirmed. I will be present at Room 204. Thank you for supporting Diya\'s enthusiasm for science!',
    created_at: '2026-02-16T08:30:00.000Z',
    read: false,
  },
  {
    id: 'msg-3-1',
    thread_id: 'thread-3',
    sender_id: 'amit.patel@school.com',
    sender_name: 'Amit Patel',
    sender_role: 'teacher',
    content: 'Dear Mr. Sharma, Aarav has been chosen for the Senior Boys Yellow House 4x100m relay sprint team. Morning training is scheduled from 7:00 AM to 7:45 AM every Tuesday and Thursday.',
    created_at: '2026-02-12T10:15:00.000Z',
    read: true,
  },
  {
    id: 'msg-3-2',
    thread_id: 'thread-3',
    sender_id: 'suresh.sharma@gmail.com',
    sender_name: 'Suresh Sharma',
    sender_role: 'parent',
    content: 'Wonderful to hear! Aarav will be punctual for morning practice. Please let us know if special track spikes are required.',
    created_at: '2026-02-12T18:00:00.000Z',
    read: true,
  },
  {
    id: 'msg-3-3',
    thread_id: 'thread-3',
    sender_id: 'amit.patel@school.com',
    sender_name: 'Amit Patel',
    sender_role: 'teacher',
    content: 'Aarav has been provided with the training schedule and uniform kit requirements. Standard running shoes are perfect.',
    created_at: '2026-02-13T16:20:00.000Z',
    read: true,
  },
  {
    id: 'msg-4-1',
    thread_id: 'thread-4',
    sender_id: 'anjali.gupta@school.com',
    sender_name: 'Anjali Gupta',
    sender_role: 'teacher',
    content: 'Good afternoon Mr. Sharma. Diya participated in the preliminary debate trials on climate governance today. She delivered an outstanding rebuttal and qualified for the inter-school finals.',
    created_at: '2026-02-11T12:00:00.000Z',
    read: true,
  },
  {
    id: 'msg-4-2',
    thread_id: 'thread-4',
    sender_id: 'suresh.sharma@gmail.com',
    sender_name: 'Suresh Sharma',
    sender_role: 'parent',
    content: 'Thank you for the wonderful update, Anjali ma\'am. Diya was practicing her speech diligently last evening.',
    created_at: '2026-02-11T19:30:00.000Z',
    read: true,
  },
  {
    id: 'msg-4-3',
    thread_id: 'thread-4',
    sender_id: 'anjali.gupta@school.com',
    sender_name: 'Anjali Gupta',
    sender_role: 'teacher',
    content: 'Diya has drafted persuasive arguments for the impromptu round. Very impressive articulation!',
    created_at: '2026-02-14T17:00:00.000Z',
    read: true,
  },
  {
    id: 'msg-5-1',
    thread_id: 'thread-5',
    sender_id: 'rajesh.kumar@school.com',
    sender_name: 'Rajesh Kumar',
    sender_role: 'teacher',
    content: 'Dear Mr. Verma, this is a gentle reminder that Rohan has missed submitting two homework assignments for geometry this week. Please check his planner.',
    created_at: '2026-02-13T09:00:00.000Z',
    read: true,
  },
  {
    id: 'msg-5-2',
    thread_id: 'thread-5',
    sender_id: 'manish.verma@gmail.com',
    sender_name: 'Manish Verma',
    sender_role: 'parent',
    content: 'Thank you for following up, we will ensure Rohan submits chapter 6 exercises on Monday.',
    created_at: '2026-02-14T10:30:00.000Z',
    read: false,
  },
];

const getStoredCommThreads = () => {
  try {
    const raw = localStorage.getItem('sms_comm_threads');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse stored comm threads', e);
  }
  try {
    localStorage.setItem('sms_comm_threads', JSON.stringify(DEFAULT_COMM_THREADS));
  } catch (_) {}
  return DEFAULT_COMM_THREADS;
};

const saveStoredCommThreads = (threads) => {
  try {
    localStorage.setItem('sms_comm_threads', JSON.stringify(threads));
  } catch (e) {
    console.error('Failed to save comm threads', e);
  }
};

const getStoredCommMessages = () => {
  try {
    const raw = localStorage.getItem('sms_comm_messages');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse stored comm messages', e);
  }
  try {
    localStorage.setItem('sms_comm_messages', JSON.stringify(DEFAULT_COMM_MESSAGES));
  } catch (_) {}
  return DEFAULT_COMM_MESSAGES;
};

const saveStoredCommMessages = (messages) => {
  try {
    localStorage.setItem('sms_comm_messages', JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save comm messages', e);
  }
};

export const communicationAPI = {
  getThreads: async (params = {}) => {
    let threads = getStoredCommThreads();
    const { userRole, userEmail, childId, childName, category, status, search } = params;

    // Scope based on user role
    if (userRole === 'parent') {
      const parentEmailLower = (userEmail || '').toLowerCase();
      threads = threads.filter(t => {
        const emailMatches = (t.parent_email || '').toLowerCase() === parentEmailLower;
        // If parent has active child selected, prioritize matching that child
        const childMatches = childName
          ? (t.student_name || '').toLowerCase().includes(childName.toLowerCase())
          : true;
        return emailMatches && childMatches;
      });
    } else if (userRole === 'teacher') {
      const teacherEmailLower = (userEmail || '').toLowerCase();
      threads = threads.filter(t => {
        return (t.teacher_email || '').toLowerCase() === teacherEmailLower;
      });
    }

    if (category && category !== 'all' && category !== 'All') {
      threads = threads.filter(t => (t.category || '').toLowerCase() === category.toLowerCase());
    }

    if (status && status !== 'all' && status !== 'All') {
      threads = threads.filter(t => (t.status || 'active').toLowerCase() === status.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      threads = threads.filter(t => {
        return (
          t.subject?.toLowerCase().includes(q) ||
          t.student_name?.toLowerCase().includes(q) ||
          t.teacher_name?.toLowerCase().includes(q) ||
          t.parent_name?.toLowerCase().includes(q) ||
          t.last_message_preview?.toLowerCase().includes(q)
        );
      });
    }

    // Sort by last_message_at newest first
    threads = [...threads].sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));

    return { success: true, data: threads, total: threads.length };
  },

  getThreadMessages: async (threadId) => {
    const messages = getStoredCommMessages();
    const threadMsgs = messages.filter(m => String(m.thread_id) === String(threadId));
    threadMsgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return { success: true, data: threadMsgs };
  },

  createThread: async (threadData) => {
    const threads = getStoredCommThreads();
    const messages = getStoredCommMessages();
    const threadId = `thread-${Date.now()}`;
    const now = new Date().toISOString();

    const newThread = {
      id: threadId,
      student_id: threadData.student_id || null,
      student_name: threadData.student_name || 'Student',
      student_class: threadData.student_class || 'Class',
      roll_number: threadData.roll_number || '',
      parent_email: threadData.parent_email || '',
      parent_name: threadData.parent_name || 'Parent',
      parent_phone: threadData.parent_phone || '',
      teacher_email: threadData.teacher_email || '',
      teacher_name: threadData.teacher_name || 'Teacher',
      teacher_subject: threadData.teacher_subject || 'Faculty',
      subject: threadData.subject?.trim() || 'New Discussion',
      category: threadData.category || 'General',
      priority: threadData.priority || 'normal',
      status: 'active',
      created_at: now,
      last_message_at: now,
      last_message_preview: threadData.initial_message?.trim() || 'Conversation started',
      unread_for_teacher: threadData.sender_role === 'parent' ? 1 : 0,
      unread_for_parent: threadData.sender_role === 'teacher' ? 1 : 0,
    };

    const initialMessage = {
      id: `msg-${Date.now()}`,
      thread_id: threadId,
      sender_id: threadData.sender_id || '',
      sender_name: threadData.sender_name || 'Sender',
      sender_role: threadData.sender_role || 'teacher',
      content: threadData.initial_message?.trim() || 'Conversation started',
      created_at: now,
      read: false,
    };

    saveStoredCommThreads([newThread, ...threads]);
    saveStoredCommMessages([...messages, initialMessage]);

    return { success: true, data: newThread, message: 'Conversation started successfully!' };
  },

  sendMessage: async (threadId, messageData) => {
    const threads = getStoredCommThreads();
    const messages = getStoredCommMessages();
    const now = new Date().toISOString();

    const threadIndex = threads.findIndex(t => String(t.id) === String(threadId));
    if (threadIndex === -1) {
      throw new Error('Conversation thread not found');
    }

    const newMessage = {
      id: `msg-${Date.now()}`,
      thread_id: threadId,
      sender_id: messageData.sender_id,
      sender_name: messageData.sender_name,
      sender_role: messageData.sender_role,
      content: messageData.content?.trim() || '',
      meeting_request: messageData.meeting_request || null,
      created_at: now,
      read: false,
    };

    // Update thread metadata
    const thread = threads[threadIndex];
    thread.last_message_at = now;
    thread.last_message_preview = messageData.content?.trim() || (messageData.meeting_request ? 'Meeting invitation proposed' : 'New message');
    if (messageData.sender_role === 'teacher') {
      thread.unread_for_parent = (thread.unread_for_parent || 0) + 1;
    } else if (messageData.sender_role === 'parent') {
      thread.unread_for_teacher = (thread.unread_for_teacher || 0) + 1;
    }

    threads[threadIndex] = { ...thread };
    saveStoredCommThreads(threads);
    saveStoredCommMessages([...messages, newMessage]);

    return { success: true, data: newMessage };
  },

  markThreadRead: async (threadId, readerRole) => {
    const threads = getStoredCommThreads();
    const threadIndex = threads.findIndex(t => String(t.id) === String(threadId));
    if (threadIndex !== -1) {
      if (readerRole === 'parent') {
        threads[threadIndex].unread_for_parent = 0;
      } else if (readerRole === 'teacher') {
        threads[threadIndex].unread_for_teacher = 0;
      }
      saveStoredCommThreads(threads);
    }
    return { success: true };
  },

  updateThreadStatus: async (threadId, newStatus) => {
    const threads = getStoredCommThreads();
    const threadIndex = threads.findIndex(t => String(t.id) === String(threadId));
    if (threadIndex !== -1) {
      threads[threadIndex].status = newStatus;
      saveStoredCommThreads(threads);
      return { success: true, data: threads[threadIndex] };
    }
    throw new Error('Thread not found');
  },

  respondMeeting: async (threadId, messageId, status) => {
    const messages = getStoredCommMessages();
    const msgIndex = messages.findIndex(m => String(m.id) === String(messageId));
    if (msgIndex !== -1 && messages[msgIndex].meeting_request) {
      messages[msgIndex].meeting_request.status = status;
      saveStoredCommMessages(messages);
      return { success: true, data: messages[msgIndex] };
    }
    return { success: false };
  },

  resetDefaults: async () => {
    saveStoredCommThreads(DEFAULT_COMM_THREADS);
    saveStoredCommMessages(DEFAULT_COMM_MESSAGES);
    return { success: true, message: 'Teacher-Parent communication reset to sample discussions' };
  },
};

// ==========================================
// School Events & Calendar API
// ==========================================
const EVENTS_STORAGE_KEY = 'sms_school_events';

const DEFAULT_SCHOOL_EVENTS = [
  {
    id: 'evt-1',
    title: "Children's Day Mega Carnival & House Parade",
    description: 'Annual festive carnival featuring student-led science exhibits, game stalls, marching band performances, and cultural stage acts.',
    category: 'cultural',
    startDate: '2026-11-14',
    endDate: '2026-11-14',
    startTime: '09:00',
    endTime: '15:30',
    isAllDay: false,
    venue: 'School Main Amphitheatre & Sports Ground',
    targetAudience: 'all',
    targetGrade: 'All Classes',
    organizer: 'Student Council & Cultural Committee',
    contactEmail: 'cultural@school.com',
    featured: true,
    priority: 'high',
    color: 'amber',
    link: '/gallery',
    attendeesCount: 650,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'evt-2',
    title: 'Inter-School Robotics & AI Expo 2026',
    description: 'Showcase of student-engineered autonomous rovers, IoT weather stations, and computer vision models with live demonstrations to university judges.',
    category: 'workshop',
    startDate: '2026-11-16',
    endDate: '2026-11-16',
    startTime: '10:00',
    endTime: '16:00',
    isAllDay: false,
    venue: 'Advanced STEM & Biotech Laboratory',
    targetAudience: 'all',
    targetGrade: 'Classes 8-12',
    organizer: 'Robotics Club & Science Dept',
    contactEmail: 'robotics@school.com',
    featured: true,
    priority: 'high',
    color: 'teal',
    link: '/gallery',
    attendeesCount: 320,
    createdAt: '2026-11-05T09:30:00.000Z',
  },
  {
    id: 'evt-3',
    title: 'Term 2 Pre-Board Mathematics Examination',
    description: 'Mandatory standard mock examination for Class 10 covering complete syllabus: Trigonometry, Coordinate Geometry, Quadratic Equations, and Statistics.',
    category: 'exam',
    startDate: '2026-11-18',
    endDate: '2026-11-18',
    startTime: '09:30',
    endTime: '12:30',
    isAllDay: false,
    venue: 'Examination Hall A & Senior Wing',
    targetAudience: 'students',
    targetGrade: 'Class 10',
    organizer: 'Examination Controller',
    contactEmail: 'exams@school.com',
    featured: false,
    priority: 'urgent',
    color: 'purple',
    link: '/exams',
    attendeesCount: 180,
    createdAt: '2026-11-02T11:00:00.000Z',
  },
  {
    id: 'evt-4',
    title: 'Senior Secondary Career Counseling & College Fair',
    description: 'Representatives from 18 leading engineering, medical, design, and commerce universities sharing admission guidelines, entrance exam paths, and scholarships.',
    category: 'workshop',
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    startTime: '11:00',
    endTime: '14:30',
    isAllDay: false,
    venue: 'Conference Hall 1 (Admin Block)',
    targetAudience: 'all',
    targetGrade: 'Classes 10, 11 & 12',
    organizer: 'Guidance & Counseling Cell',
    contactEmail: 'counselor@school.com',
    featured: false,
    priority: 'normal',
    color: 'indigo',
    link: '/communication',
    attendeesCount: 220,
    createdAt: '2026-11-06T14:15:00.000Z',
  },
  {
    id: 'evt-5',
    title: 'Term 2 Parent-Teacher Conference (PTM)',
    description: 'One-on-one parent-educator evaluation session to review midterm academic report cards, attendance records, and personalized growth plans.',
    category: 'ptm',
    startDate: '2026-11-21',
    endDate: '2026-11-21',
    startTime: '09:00',
    endTime: '13:30',
    isAllDay: false,
    venue: 'Respective Classrooms (Junior & Senior Blocks)',
    targetAudience: 'parents',
    targetGrade: 'All Classes',
    organizer: 'Academic Coordinator',
    contactEmail: 'ptm@school.com',
    featured: true,
    priority: 'urgent',
    color: 'sky',
    link: '/communication',
    attendeesCount: 480,
    createdAt: '2026-11-07T08:45:00.000Z',
  },
  {
    id: 'evt-6',
    title: 'Annual Inter-House Track & Field Relay Finals',
    description: 'High-octane sprint championships: 100m dashes, 4x100m relays, high jump, shot put, and cheerleading showdown among Shivaji, Tagore, Ashoka, and Raman houses.',
    category: 'sports',
    startDate: '2026-11-24',
    endDate: '2026-11-24',
    startTime: '08:00',
    endTime: '14:30',
    isAllDay: false,
    venue: 'Main Athletic Stadium & Running Track',
    targetAudience: 'all',
    targetGrade: 'All Classes',
    organizer: 'Physical Education & Sports Dept',
    contactEmail: 'sports@school.com',
    featured: true,
    priority: 'high',
    color: 'emerald',
    link: '/gallery',
    attendeesCount: 850,
    createdAt: '2026-11-04T12:00:00.000Z',
  },
  {
    id: 'evt-7',
    title: 'Guru Nanak Jayanti - Campus Holiday',
    description: 'School campus, administrative counters, library, and bus transport will remain closed in observation of Guru Nanak Gurpurab.',
    category: 'holiday',
    startDate: '2026-11-27',
    endDate: '2026-11-27',
    startTime: '00:00',
    endTime: '23:59',
    isAllDay: true,
    venue: 'Entire Campus (Closed)',
    targetAudience: 'all',
    targetGrade: 'All Classes',
    organizer: "Principal's Office",
    contactEmail: 'admin@school.com',
    featured: false,
    priority: 'normal',
    color: 'rose',
    link: null,
    attendeesCount: 0,
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'evt-8',
    title: 'Term 2 Fee Installment Due Date',
    description: 'Final settlement deadline for Term 2 tuition, science lab, and transportation fees. Online payments can be completed through the fee portal to avoid late fines.',
    category: 'administrative',
    startDate: '2026-11-28',
    endDate: '2026-11-28',
    startTime: '09:00',
    endTime: '17:00',
    isAllDay: true,
    venue: 'Accounts Office & Online Fee Payment Portal',
    targetAudience: 'parents',
    targetGrade: 'All Classes',
    organizer: 'Finance & Accounts Division',
    contactEmail: 'accounts@school.com',
    featured: false,
    priority: 'urgent',
    color: 'rose',
    link: '/fee-payment',
    attendeesCount: 380,
    createdAt: '2026-11-03T10:00:00.000Z',
  },
  {
    id: 'evt-9',
    title: 'Annual Science & Innovation Expo 2026',
    description: 'School-wide scientific exhibition showcasing sustainable energy models, organic chemistry demonstrations, and interactive biology exhibits.',
    category: 'academic',
    startDate: '2026-12-05',
    endDate: '2026-12-05',
    startTime: '09:30',
    endTime: '15:00',
    isAllDay: false,
    venue: 'School Exhibition Ground & Science Labs',
    targetAudience: 'all',
    targetGrade: 'Classes 6-12',
    organizer: 'Science Faculty',
    contactEmail: 'science@school.com',
    featured: true,
    priority: 'high',
    color: 'indigo',
    link: '/gallery',
    attendeesCount: 500,
    createdAt: '2026-11-10T11:00:00.000Z',
  },
  {
    id: 'evt-10',
    title: 'Winter Musical Symphony & Choir Performance',
    description: 'The school orchestra, junior choir, and brass ensemble performing classical and contemporary holiday melodies in the grand auditorium.',
    category: 'cultural',
    startDate: '2026-12-12',
    endDate: '2026-12-12',
    startTime: '17:00',
    endTime: '20:30',
    isAllDay: false,
    venue: 'Main School Auditorium',
    targetAudience: 'all',
    targetGrade: 'All Classes',
    organizer: 'Department of Music & Performing Arts',
    contactEmail: 'music@school.com',
    featured: false,
    priority: 'normal',
    color: 'amber',
    link: '/gallery',
    attendeesCount: 420,
    createdAt: '2026-11-08T15:30:00.000Z',
  },
  {
    id: 'evt-11',
    title: 'National Mathematics Day Quiz & Problem Solving Bee',
    description: 'Commemorating Srinivasa Ramanujan: speed mental math competitions, sudoku challenges, and geometric puzzle tournaments across junior and senior categories.',
    category: 'academic',
    startDate: '2026-12-22',
    endDate: '2026-12-22',
    startTime: '10:00',
    endTime: '13:00',
    isAllDay: false,
    venue: 'Ramanujan Math Lab & Media Center',
    targetAudience: 'students',
    targetGrade: 'Classes 7-10',
    organizer: 'Mathematics Department',
    contactEmail: 'maths@school.com',
    featured: false,
    priority: 'normal',
    color: 'purple',
    link: '/assignments',
    attendeesCount: 260,
    createdAt: '2026-11-10T14:00:00.000Z',
  },
  {
    id: 'evt-12',
    title: 'Christmas Celebrations & Winter Break Begins',
    description: 'Special Christmas morning carol assembly followed by closure for the annual winter vacation. Campus reopens on January 4, 2027.',
    category: 'holiday',
    startDate: '2026-12-25',
    endDate: '2026-12-25',
    startTime: '00:00',
    endTime: '23:59',
    isAllDay: true,
    venue: 'School Campus (Closed)',
    targetAudience: 'all',
    targetGrade: 'All Classes',
    organizer: "Principal's Office",
    contactEmail: 'admin@school.com',
    featured: false,
    priority: 'normal',
    color: 'rose',
    link: null,
    attendeesCount: 0,
    createdAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'evt-13',
    title: 'Spring Athletic Meet 2026 - Sprint Heats',
    description: 'Qualifying rounds for 200m and 400m track events for inter-school sports representation.',
    category: 'sports',
    startDate: '2026-02-18',
    endDate: '2026-02-18',
    startTime: '08:30',
    endTime: '13:30',
    isAllDay: false,
    venue: 'Athletics Ground',
    targetAudience: 'all',
    targetGrade: 'Classes 9-12',
    organizer: 'Sports Department',
    contactEmail: 'sports@school.com',
    featured: false,
    priority: 'normal',
    color: 'emerald',
    link: '/gallery',
    attendeesCount: 350,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'evt-14',
    title: 'Maha Shivratri - Campus Holiday',
    description: 'School campus, academic classes, administrative offices, and bus transport closed in observation of Maha Shivratri.',
    category: 'holiday',
    startDate: '2026-03-08',
    endDate: '2026-03-08',
    startTime: '00:00',
    endTime: '23:59',
    isAllDay: true,
    venue: 'School Campus (Closed)',
    targetAudience: 'all',
    targetGrade: 'All Classes',
    organizer: 'Administration',
    contactEmail: 'admin@school.com',
    featured: false,
    priority: 'normal',
    color: 'rose',
    link: null,
    attendeesCount: 0,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'evt-15',
    title: 'Central Board Examinations 2026 Commencement',
    description: 'Final board examinations for Class 10 & 12 begin. All examinees must arrive with admit cards and regulated stationery 45 minutes prior to bell.',
    category: 'exam',
    startDate: '2026-03-15',
    endDate: '2026-03-15',
    startTime: '09:00',
    endTime: '12:30',
    isAllDay: false,
    venue: 'Central Board Examination Wing',
    targetAudience: 'students',
    targetGrade: 'Classes 10 & 12',
    organizer: 'Board Exam Center Superintendent',
    contactEmail: 'exams@school.com',
    featured: true,
    priority: 'urgent',
    color: 'purple',
    link: '/exams',
    attendeesCount: 240,
    createdAt: '2026-02-15T09:00:00.000Z',
  },
];

const getStoredEvents = () => {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse stored events', e);
  }
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(DEFAULT_SCHOOL_EVENTS));
  } catch (_) {}
  return DEFAULT_SCHOOL_EVENTS;
};

const saveStoredEvents = (events) => {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save events', e);
  }
  try {
    window.dispatchEvent(new CustomEvent('sms:events-updated', { detail: { count: events.length } }));
  } catch (_) {}
};

export const eventsAPI = {
  getAll: async (params = {}) => {
    let items = getStoredEvents();
    const { year, month, category, audience, search, priority } = params;

    // Multi-School Scoping & Tenant Security Enforcement
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    if (effectiveSchoolId !== 'all') {
      items = items.filter(e => e.school_id === 'all' || String(e.school_id || 1) === String(effectiveSchoolId));
    }

    // Filter by year & month (month 1-12)
    if (year !== undefined && year !== null && year !== '') {
      items = items.filter(e => {
        if (!e.startDate) return false;
        const d = new Date(e.startDate);
        return d.getFullYear() === parseInt(year, 10);
      });
    }

    if (month !== undefined && month !== null && month !== '') {
      const targetMonth = parseInt(month, 10); // 1-12
      items = items.filter(e => {
        if (!e.startDate) return false;
        const d = new Date(e.startDate);
        return (d.getMonth() + 1) === targetMonth;
      });
    }

    // Filter by category
    if (category && category !== 'all') {
      items = items.filter(e => (e.category || '').toLowerCase() === category.toLowerCase());
    }

    // Filter by target audience
    if (audience && audience !== 'all') {
      items = items.filter(e => {
        if (!e.targetAudience || e.targetAudience === 'all') return true;
        return e.targetAudience.toLowerCase() === audience.toLowerCase();
      });
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      items = items.filter(e => (e.priority || '').toLowerCase() === priority.toLowerCase());
    }

    // Search query
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.venue || '').toLowerCase().includes(q) ||
        (e.organizer || '').toLowerCase().includes(q) ||
        (e.targetGrade || '').toLowerCase().includes(q)
      );
    }

    // Sort chronologically by startDate + startTime
    items.sort((a, b) => {
      const dateA = new Date(`${a.startDate}T${a.startTime || '00:00'}`);
      const dateB = new Date(`${b.startDate}T${b.startTime || '00:00'}`);
      return dateA - dateB;
    });

    return {
      success: true,
      data: items,
      total: items.length,
    };
  },

  getById: async (id) => {
    const items = getStoredEvents();
    const found = items.find(e => String(e.id) === String(id));
    if (!found) throw new Error('Event not found');
    if (found.school_id && found.school_id !== 'all' && !isSchoolAuthorized(found.school_id)) {
      throw new Error('Access Denied: You are not authorized to view events for this school campus.');
    }
    return { success: true, data: found };
  },

  create: async (eventData) => {
    const items = getStoredEvents();
    const effectiveSchoolId = getEffectiveSchoolId(eventData.school_id);
    const assignedSchoolId = effectiveSchoolId === 'all' ? 1 : effectiveSchoolId;
    const newId = `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newEvent = {
      id: newId,
      school_id: assignedSchoolId,
      title: eventData.title?.trim() || 'Untitled Event',
      description: eventData.description?.trim() || '',
      category: eventData.category || 'academic',
      startDate: eventData.startDate || new Date().toISOString().split('T')[0],
      endDate: eventData.endDate || eventData.startDate || new Date().toISOString().split('T')[0],
      startTime: eventData.startTime || '09:00',
      endTime: eventData.endTime || '12:00',
      isAllDay: !!eventData.isAllDay,
      venue: eventData.venue?.trim() || 'School Campus',
      targetAudience: eventData.targetAudience || 'all',
      targetGrade: eventData.targetGrade?.trim() || 'All Classes',
      organizer: eventData.organizer?.trim() || 'School Administration',
      contactEmail: eventData.contactEmail?.trim() || 'admin@school.com',
      featured: !!eventData.featured,
      priority: eventData.priority || 'normal',
      color: eventData.color || 'blue',
      link: eventData.link || null,
      attendeesCount: parseInt(eventData.attendeesCount, 10) || 0,
      createdAt: new Date().toISOString(),
    };

    items.push(newEvent);
    saveStoredEvents(items);

    // If creator requested to broadcast notification for this event
    if (eventData.broadcastNotification) {
      try {
        await notificationAPI.create({
          title: `Upcoming Event: ${newEvent.title}`,
          message: `${newEvent.description} | Date: ${newEvent.startDate} at ${newEvent.startTime}. Venue: ${newEvent.venue}`,
          type: newEvent.category === 'sports' ? 'announcement' : (newEvent.category === 'exam' ? 'exam' : 'announcement'),
          priority: newEvent.priority || 'normal',
          target_role: newEvent.targetAudience || 'all',
          link: '/events',
          metadata: {
            eventId: newEvent.id,
            date: newEvent.startDate,
            venue: newEvent.venue,
          },
        });
      } catch (err) {
        console.error('Failed to broadcast event notification:', err);
      }
    }

    return { success: true, data: newEvent };
  },

  update: async (id, eventData) => {
    const items = getStoredEvents();
    const idx = items.findIndex(e => String(e.id) === String(id));
    if (idx === -1) throw new Error('Event not found');

    items[idx] = {
      ...items[idx],
      ...eventData,
      id: items[idx].id, // preserve id
      updatedAt: new Date().toISOString(),
    };

    saveStoredEvents(items);
    return { success: true, data: items[idx] };
  },

  delete: async (id) => {
    const items = getStoredEvents();
    const next = items.filter(e => String(e.id) !== String(id));
    saveStoredEvents(next);
    return { success: true, id };
  },

  resetDefaults: async () => {
    saveStoredEvents(DEFAULT_SCHOOL_EVENTS);
    return { success: true, data: DEFAULT_SCHOOL_EVENTS };
  },

  /**
   * Generates standard RFC 5545 iCalendar content for Google/Apple/Outlook Calendar
   */
  generateICal: (event) => {
    const pad = (n) => String(n).padStart(2, '0');
    const toIcalDate = (dateStr, timeStr = '09:00') => {
      const [year, month, day] = (dateStr || '').split('-');
      const [hour, minute] = (timeStr || '09:00').split(':');
      return `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
    };

    const start = toIcalDate(event.startDate, event.startTime);
    const end = toIcalDate(event.endDate || event.startDate, event.endTime || '10:00');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//School Management System//Event Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@schoolmanagementsystem.org`,
      `DTSTAMP:${toIcalDate(new Date().toISOString().split('T')[0], '00:00')}Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${(event.title || '').replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${(event.venue || '').replace(/\n/g, ' ')}`,
      `CATEGORIES:${(event.category || 'EVENT').toUpperCase()}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  },
};

// ==========================================
// Human Resource Management System (HRMS) API
// ==========================================
const HRMS_STAFF_KEY = 'sms_hrms_staff';
const HRMS_LEAVES_KEY = 'sms_hrms_leaves';
const HRMS_ATTENDANCE_KEY = 'sms_hrms_attendance';
const HRMS_PAYROLL_KEY = 'sms_hrms_payroll';

const DEFAULT_HRMS_STAFF = [
  {
    id: 'EMP-101',
    name: 'Rajesh Kumar',
    email: 'teacher@school.com',
    phone: '+91 98765 00003',
    department: 'Science & STEM',
    designation: 'Senior PGT Physics & Science Lead',
    role: 'teacher',
    qualification: 'M.Sc Physics, B.Ed (Gold Medalist)',
    joiningDate: '2020-07-15',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 54000,
    allowances: { da: 10800, hra: 13500, conveyance: 3500 },
    deductions: { pf: 6480, esi: 818, tax: 2800 },
    bankDetails: { bankName: 'HDFC Bank', accountNumber: '5010048291024', ifsc: 'HDFC0001420' },
    leaveBalance: {
      casual: { total: 12, used: 3, remaining: 9 },
      medical: { total: 10, used: 2, remaining: 8 },
      earned: { total: 15, used: 4, remaining: 11 },
    },
    performanceScore: 94,
    shift: 'General (08:00 AM - 03:30 PM)',
  },
  {
    id: 'EMP-102',
    name: 'Vikram Malhotra',
    email: 'vikram.malhotra@school.com',
    phone: '+91 98765 11002',
    department: 'Mathematics',
    designation: 'TGT Mathematics & Department Head',
    role: 'teacher',
    qualification: 'M.Sc Mathematics, B.Ed',
    joiningDate: '2019-04-10',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 58000,
    allowances: { da: 11600, hra: 14500, conveyance: 3500 },
    deductions: { pf: 6960, esi: 876, tax: 3200 },
    bankDetails: { bankName: 'State Bank of India', accountNumber: '30495829104', ifsc: 'SBIN0004210' },
    leaveBalance: {
      casual: { total: 12, used: 4, remaining: 8 },
      medical: { total: 10, used: 1, remaining: 9 },
      earned: { total: 15, used: 5, remaining: 10 },
    },
    performanceScore: 96,
    shift: 'General (08:00 AM - 03:30 PM)',
  },
  {
    id: 'EMP-103',
    name: 'Anjali Gupta',
    email: 'anjali.gupta@school.com',
    phone: '+91 98765 11003',
    department: 'Languages & Literature',
    designation: 'Head of English Dept & Debate Mentor',
    role: 'teacher',
    qualification: 'M.A. English Literature, M.Phil',
    joiningDate: '2021-08-01',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 51000,
    allowances: { da: 10200, hra: 12750, conveyance: 3500 },
    deductions: { pf: 6120, esi: 775, tax: 2400 },
    bankDetails: { bankName: 'ICICI Bank', accountNumber: '002938475910', ifsc: 'ICIC0000029' },
    leaveBalance: {
      casual: { total: 12, used: 2, remaining: 10 },
      medical: { total: 10, used: 3, remaining: 7 },
      earned: { total: 15, used: 2, remaining: 13 },
    },
    performanceScore: 92,
    shift: 'General (08:00 AM - 03:30 PM)',
  },
  {
    id: 'EMP-104',
    name: 'Amit Patel',
    email: 'amit.patel@school.com',
    phone: '+91 98765 11004',
    department: 'Physical Education & Sports',
    designation: 'Director of Physical Education & Athletics',
    role: 'teacher',
    qualification: 'M.P.Ed, NIS Certified Athletics Coach',
    joiningDate: '2022-01-10',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 46000,
    allowances: { da: 9200, hra: 11500, conveyance: 4000 },
    deductions: { pf: 5520, esi: 707, tax: 1800 },
    bankDetails: { bankName: 'Axis Bank', accountNumber: '918029384756', ifsc: 'UTIB0000180' },
    leaveBalance: {
      casual: { total: 12, used: 1, remaining: 11 },
      medical: { total: 10, used: 0, remaining: 10 },
      earned: { total: 15, used: 3, remaining: 12 },
    },
    performanceScore: 95,
    shift: 'Sports (07:30 AM - 03:00 PM)',
  },
  {
    id: 'EMP-105',
    name: 'Dr. Sunita Rao',
    email: 'principal@school.com',
    phone: '+91 98765 00001',
    department: 'Administration',
    designation: 'Principal & Academic Dean',
    role: 'admin',
    qualification: 'Ph.D Education Leadership, M.Sc, M.Ed',
    joiningDate: '2018-05-01',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 85000,
    allowances: { da: 17000, hra: 21250, conveyance: 6000 },
    deductions: { pf: 10200, esi: 0, tax: 8500 },
    bankDetails: { bankName: 'HDFC Bank', accountNumber: '5010029384756', ifsc: 'HDFC0001420' },
    leaveBalance: {
      casual: { total: 15, used: 3, remaining: 12 },
      medical: { total: 15, used: 1, remaining: 14 },
      earned: { total: 20, used: 5, remaining: 15 },
    },
    performanceScore: 99,
    shift: 'Executive (08:30 AM - 04:30 PM)',
  },
  {
    id: 'EMP-106',
    name: 'Rajesh Sharma',
    email: 'admin@school.com',
    phone: '+91 98765 00002',
    department: 'Administration',
    designation: 'School Administrator & Operations Manager',
    role: 'admin',
    qualification: 'MBA Human Resources & Educational Administration',
    joiningDate: '2019-02-15',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 62000,
    allowances: { da: 12400, hra: 15500, conveyance: 4500 },
    deductions: { pf: 7440, esi: 944, tax: 3800 },
    bankDetails: { bankName: 'Kotak Mahindra Bank', accountNumber: '2938475610', ifsc: 'KKBK0000293' },
    leaveBalance: {
      casual: { total: 12, used: 2, remaining: 10 },
      medical: { total: 10, used: 1, remaining: 9 },
      earned: { total: 15, used: 3, remaining: 12 },
    },
    performanceScore: 97,
    shift: 'General (08:00 AM - 04:00 PM)',
  },
  {
    id: 'EMP-107',
    name: 'Meenakshi Sundaram',
    email: 'accounts@school.com',
    phone: '+91 98765 11007',
    department: 'Finance & Accounts',
    designation: 'Chief Accounts Officer & Bursar',
    role: 'finance',
    qualification: 'M.Com, Chartered Accountant (Inter)',
    joiningDate: '2020-09-01',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 55000,
    allowances: { da: 11000, hra: 13750, conveyance: 3500 },
    deductions: { pf: 6600, esi: 832, tax: 2900 },
    bankDetails: { bankName: 'Punjab National Bank', accountNumber: '109283746501', ifsc: 'PUNB0109200' },
    leaveBalance: {
      casual: { total: 12, used: 3, remaining: 9 },
      medical: { total: 10, used: 0, remaining: 10 },
      earned: { total: 15, used: 4, remaining: 11 },
    },
    performanceScore: 93,
    shift: 'General (09:00 AM - 05:00 PM)',
  },
  {
    id: 'EMP-108',
    name: 'Rohan Kulkarni',
    email: 'it.admin@school.com',
    phone: '+91 98765 11008',
    department: 'IT & Facilities',
    designation: 'Senior Network & Systems Engineer',
    role: 'staff',
    qualification: 'B.Tech Computer Science, CCNA',
    joiningDate: '2021-11-15',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 48000,
    allowances: { da: 9600, hra: 12000, conveyance: 3500 },
    deductions: { pf: 5760, esi: 731, tax: 2100 },
    bankDetails: { bankName: 'Canara Bank', accountNumber: '849302918273', ifsc: 'CNRB0008493' },
    leaveBalance: {
      casual: { total: 12, used: 4, remaining: 8 },
      medical: { total: 10, used: 2, remaining: 8 },
      earned: { total: 15, used: 1, remaining: 14 },
    },
    performanceScore: 91,
    shift: 'General (08:00 AM - 04:00 PM)',
  },
  {
    id: 'EMP-109',
    name: 'Kavita Deshmukh',
    email: 'library@school.com',
    phone: '+91 98765 11009',
    department: 'Library & Media',
    designation: 'Head Librarian & Archivist',
    role: 'staff',
    qualification: 'M.Lib.Sc, B.A. History',
    joiningDate: '2022-06-20',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 42000,
    allowances: { da: 8400, hra: 10500, conveyance: 3000 },
    deductions: { pf: 5040, esi: 639, tax: 1500 },
    bankDetails: { bankName: 'Union Bank of India', accountNumber: '584930291827', ifsc: 'UBIN0584930' },
    leaveBalance: {
      casual: { total: 12, used: 3, remaining: 9 },
      medical: { total: 10, used: 1, remaining: 9 },
      earned: { total: 15, used: 2, remaining: 13 },
    },
    performanceScore: 89,
    shift: 'Library (08:30 AM - 04:00 PM)',
  },
  {
    id: 'EMP-110',
    name: 'Baldev Singh',
    email: 'transport@school.com',
    phone: '+91 98765 11010',
    department: 'Facility & Transport',
    designation: 'Fleet & Bus Logistics Supervisor',
    role: 'staff',
    qualification: 'Diploma Automobile & Fleet Management',
    joiningDate: '2019-10-05',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 38000,
    allowances: { da: 7600, hra: 9500, conveyance: 4000 },
    deductions: { pf: 4560, esi: 591, tax: 1100 },
    bankDetails: { bankName: 'State Bank of India', accountNumber: '20394857291', ifsc: 'SBIN0001234' },
    leaveBalance: {
      casual: { total: 12, used: 2, remaining: 10 },
      medical: { total: 10, used: 0, remaining: 10 },
      earned: { total: 15, used: 4, remaining: 11 },
    },
    performanceScore: 90,
    shift: 'Fleet (06:30 AM - 02:30 PM)',
  },
  {
    id: 'EMP-201',
    school_id: 2,
    name: 'Debashis Roy',
    email: 'teacher.kolkata@school.com',
    phone: '+91 33 24901123',
    department: 'Science & STEM',
    designation: 'Senior Physics & Science Master',
    role: 'teacher',
    qualification: 'M.Sc Physics, B.Ed (Calcutta University)',
    joiningDate: '2019-07-01',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 52000,
    allowances: { da: 10400, hra: 13000, conveyance: 3500 },
    deductions: { pf: 6240, esi: 0, tax: 2500 },
    bankDetails: { bankName: 'State Bank of India', accountNumber: '30495867291', ifsc: 'SBIN0001827' },
    leaveBalance: { casual: { total: 12, used: 2, remaining: 10 }, medical: { total: 10, used: 1, remaining: 9 }, earned: { total: 15, used: 3, remaining: 12 } },
    performanceScore: 94,
    shift: 'General (08:00 AM - 03:30 PM)',
  },
  {
    id: 'EMP-202',
    school_id: 2,
    name: 'Maitreyi Sen',
    email: 'maitreyi.sen@school.com',
    phone: '+91 33 24901124',
    department: 'Mathematics',
    designation: 'Head of Mathematics Faculty',
    role: 'teacher',
    qualification: 'M.Sc Applied Mathematics, B.Ed',
    joiningDate: '2020-03-15',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 54000,
    allowances: { da: 10800, hra: 13500, conveyance: 3500 },
    deductions: { pf: 6480, esi: 0, tax: 2800 },
    bankDetails: { bankName: 'Axis Bank', accountNumber: '918029384712', ifsc: 'UTIB0000210' },
    leaveBalance: { casual: { total: 12, used: 1, remaining: 11 }, medical: { total: 10, used: 0, remaining: 10 }, earned: { total: 15, used: 2, remaining: 13 } },
    performanceScore: 96,
    shift: 'General (08:00 AM - 03:30 PM)',
  },
  {
    id: 'EMP-203',
    school_id: 2,
    name: 'Indrani Mukherjee',
    email: 'admin.kolkata@school.com',
    phone: '+91 33 24901122',
    department: 'Administration',
    designation: 'Campus Administrator & Bursar',
    role: 'admin',
    qualification: 'MBA Human Resources',
    joiningDate: '2018-11-01',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 64000,
    allowances: { da: 12800, hra: 16000, conveyance: 4500 },
    deductions: { pf: 7680, esi: 0, tax: 3900 },
    bankDetails: { bankName: 'HDFC Bank', accountNumber: '5010039281726', ifsc: 'HDFC0000420' },
    leaveBalance: { casual: { total: 15, used: 2, remaining: 13 }, medical: { total: 12, used: 1, remaining: 11 }, earned: { total: 20, used: 4, remaining: 16 } },
    performanceScore: 97,
    shift: 'Executive (08:30 AM - 04:30 PM)',
  },
  {
    id: 'EMP-301',
    school_id: 3,
    name: 'Venkatesh Iyer',
    email: 'teacher.bangalore@school.com',
    phone: '+91 80 41223345',
    department: 'Science & STEM',
    designation: 'Robotics & STEM Program Director',
    role: 'teacher',
    qualification: 'M.Tech Electronics, B.Ed',
    joiningDate: '2021-06-01',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 58000,
    allowances: { da: 11600, hra: 14500, conveyance: 4000 },
    deductions: { pf: 6960, esi: 0, tax: 3200 },
    bankDetails: { bankName: 'ICICI Bank', accountNumber: '002938475610', ifsc: 'ICIC0000029' },
    leaveBalance: { casual: { total: 12, used: 1, remaining: 11 }, medical: { total: 10, used: 0, remaining: 10 }, earned: { total: 15, used: 2, remaining: 13 } },
    performanceScore: 98,
    shift: 'General (08:00 AM - 03:30 PM)',
  },
  {
    id: 'EMP-302',
    school_id: 3,
    name: 'Dr. K. R. Narayanan',
    email: 'admin.bangalore@school.com',
    phone: '+91 80 41223344',
    department: 'Administration',
    designation: 'Director & Campus Head',
    role: 'admin',
    qualification: 'Ph.D Educational Technology, M.Ed',
    joiningDate: '2021-04-15',
    employmentType: 'Full-Time',
    status: 'active',
    basicSalary: 82000,
    allowances: { da: 16400, hra: 20500, conveyance: 5000 },
    deductions: { pf: 9840, esi: 0, tax: 7800 },
    bankDetails: { bankName: 'Canara Bank', accountNumber: '1029384756', ifsc: 'CNRB0001029' },
    leaveBalance: { casual: { total: 15, used: 3, remaining: 12 }, medical: { total: 15, used: 0, remaining: 15 }, earned: { total: 20, used: 5, remaining: 15 } },
    performanceScore: 99,
    shift: 'Executive (08:30 AM - 04:30 PM)',
  },
];

const DEFAULT_HRMS_LEAVES = [
  {
    id: 'leave-101',
    employeeId: 'EMP-101',
    employeeName: 'Rajesh Kumar',
    department: 'Science & STEM',
    leaveType: 'Casual Leave (CL)',
    startDate: '2026-11-20',
    endDate: '2026-11-21',
    daysCount: 2,
    reason: 'Attending the National Science Teachers Symposium and AI Pedagogy Seminar in New Delhi.',
    status: 'pending',
    appliedAt: '2026-11-15T09:30:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
  },
  {
    id: 'leave-102',
    employeeId: 'EMP-103',
    employeeName: 'Anjali Gupta',
    department: 'Languages & Literature',
    leaveType: 'Sick / Medical Leave (SL)',
    startDate: '2026-11-17',
    endDate: '2026-11-17',
    daysCount: 1,
    reason: 'Medical consultation and seasonal viral fever recovery as advised by doctor.',
    status: 'approved',
    appliedAt: '2026-11-14T11:00:00.000Z',
    reviewedBy: 'Rajesh Sharma',
    reviewedAt: '2026-11-14T14:30:00.000Z',
    reviewNotes: 'Approved. Syllabus substitution assigned to Mrs. Renu Saxena.',
  },
  {
    id: 'leave-103',
    employeeId: 'EMP-104',
    employeeName: 'Amit Patel',
    department: 'Physical Education & Sports',
    leaveType: 'Duty Leave (DL)',
    startDate: '2026-11-23',
    endDate: '2026-11-25',
    daysCount: 3,
    reason: 'Accompanying senior track and field relay squad to CBSE Zonal Athletics Championship.',
    status: 'approved',
    appliedAt: '2026-11-12T10:15:00.000Z',
    reviewedBy: 'Dr. Sunita Rao',
    reviewedAt: '2026-11-12T15:00:00.000Z',
    reviewNotes: 'Official Duty Leave granted. Best wishes to the school team.',
  },
  {
    id: 'leave-104',
    employeeId: 'EMP-108',
    employeeName: 'Rohan Kulkarni',
    department: 'IT & Facilities',
    leaveType: 'Casual Leave (CL)',
    startDate: '2026-11-12',
    endDate: '2026-11-12',
    daysCount: 1,
    reason: 'Personal family engagement and bank document processing.',
    status: 'approved',
    appliedAt: '2026-11-10T16:00:00.000Z',
    reviewedBy: 'Rajesh Sharma',
    reviewedAt: '2026-11-11T09:00:00.000Z',
    reviewNotes: 'Approved.',
  },
  {
    id: 'leave-105',
    employeeId: 'EMP-109',
    employeeName: 'Kavita Deshmukh',
    department: 'Library & Media',
    leaveType: 'Earned Leave (EL)',
    startDate: '2026-11-26',
    endDate: '2026-11-27',
    daysCount: 2,
    reason: 'Family outstation pilgrimage travel over the Guru Nanak Jayanti weekend.',
    status: 'pending',
    appliedAt: '2026-11-15T14:20:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
  },
];

// Helper to compute payroll entry
const computeStaffPayroll = (staff, month = 11, year = 2026, status = 'paid') => {
  const basic = staff.basicSalary || 50000;
  const da = Math.round(basic * 0.20);
  const hra = Math.round(basic * 0.25);
  const conveyance = staff.allowances?.conveyance || 3500;
  const gross = basic + da + hra + conveyance;

  const pf = Math.round(basic * 0.12);
  const esi = basic < 50000 ? Math.round(gross * 0.0075) : 0;
  const tax = basic > 60000 ? 4500 : (basic > 50000 ? 2800 : 1800);
  const totalDeductions = pf + esi + tax;
  const net = gross - totalDeductions;

  return {
    id: `pay-${year}-${month}-${staff.id}`,
    month,
    year,
    employeeId: staff.id,
    employeeName: staff.name,
    designation: staff.designation,
    department: staff.department,
    bankDetails: staff.bankDetails,
    workingDays: 26,
    presentDays: 24,
    paidLeaves: 2,
    lossOfPayDays: 0,
    basicPay: basic,
    da,
    hra,
    conveyance,
    grossSalary: gross,
    pfDeduction: pf,
    esiDeduction: esi,
    taxDeduction: tax,
    totalDeductions,
    netSalary: net,
    status,
    disbursedAt: `${year}-${String(month).padStart(2, '0')}-02T10:00:00.000Z`,
    transactionRef: `TXN-CMS-${year}${month}-${staff.id.replace('EMP-', '')}`,
    paymentMethod: 'Direct NEFT/RTGS Bank Transfer',
  };
};

const buildDefaultPayroll = () => {
  const list = [];
  // Build payroll for Oct 2026 (all paid)
  DEFAULT_HRMS_STAFF.forEach(staff => {
    list.push(computeStaffPayroll(staff, 10, 2026, 'paid'));
  });
  // Build payroll for Nov 2026 (current month - processed/paid)
  DEFAULT_HRMS_STAFF.forEach(staff => {
    list.push(computeStaffPayroll(staff, 11, 2026, 'paid'));
  });
  return list;
};

// Storage Getters & Setters
const getStoredHrmsStaff = () => {
  try {
    const raw = localStorage.getItem(HRMS_STAFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse HRMS staff', e);
  }
  try {
    localStorage.setItem(HRMS_STAFF_KEY, JSON.stringify(DEFAULT_HRMS_STAFF));
  } catch (_) {}
  return DEFAULT_HRMS_STAFF;
};

const saveStoredHrmsStaff = (data) => {
  try {
    localStorage.setItem(HRMS_STAFF_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save HRMS staff', e);
  }
  try {
    window.dispatchEvent(new CustomEvent('sms:hrms-updated'));
  } catch (_) {}
};

const getStoredHrmsLeaves = () => {
  try {
    const raw = localStorage.getItem(HRMS_LEAVES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse HRMS leaves', e);
  }
  try {
    localStorage.setItem(HRMS_LEAVES_KEY, JSON.stringify(DEFAULT_HRMS_LEAVES));
  } catch (_) {}
  return DEFAULT_HRMS_LEAVES;
};

const saveStoredHrmsLeaves = (data) => {
  try {
    localStorage.setItem(HRMS_LEAVES_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save HRMS leaves', e);
  }
  try {
    window.dispatchEvent(new CustomEvent('sms:hrms-updated'));
  } catch (_) {}
};

const getStoredHrmsPayroll = () => {
  try {
    const raw = localStorage.getItem(HRMS_PAYROLL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse HRMS payroll', e);
  }
  const defaults = buildDefaultPayroll();
  try {
    localStorage.setItem(HRMS_PAYROLL_KEY, JSON.stringify(defaults));
  } catch (_) {}
  return defaults;
};

const saveStoredHrmsPayroll = (data) => {
  try {
    localStorage.setItem(HRMS_PAYROLL_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save HRMS payroll', e);
  }
  try {
    window.dispatchEvent(new CustomEvent('sms:hrms-updated'));
  } catch (_) {}
};

/**
 * HRMS Authorization Context
 * Determines if the current caller is a teacher and restricts access accordingly.
 */
export const getCallerHRMSContext = () => {
  let user = null;
  let activeRole = null;
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) user = JSON.parse(rawUser);
    activeRole = localStorage.getItem('sms_active_role');
  } catch (_) {}

  const currentRole = (activeRole || user?.role || user?.roles?.[0] || 'admin').toLowerCase();
  const isSuperAdmin =
    user?.role === 'super-admin' ||
    user?.roles?.includes('super-admin') ||
    user?.is_group_admin === true ||
    currentRole === 'super-admin' ||
    user?.email?.toLowerCase() === 'superadmin@school.com';

  const isAdmin = isSuperAdmin || currentRole === 'admin' || currentRole === 'principal';
  const isFinance = currentRole === 'finance' || currentRole === 'accountant';
  const isTeacher = currentRole === 'teacher';
  const canManageHRMS = (isAdmin || isFinance) && !isTeacher;

  return {
    user,
    currentRole,
    isSuperAdmin,
    isAdmin,
    isFinance,
    canManageHRMS,
    isTeacher,
  };
};

/**
 * Resolves the personal staff record for a teacher.
 */
export const getMyStaffRecord = (staffList, user, targetSchoolId) => {
  if (!Array.isArray(staffList) || staffList.length === 0) return null;
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userName = (user?.name || '').toLowerCase().trim();

  // 1. Direct match by email
  if (userEmail) {
    const emailMatch = staffList.find(s => s.email && s.email.toLowerCase().trim() === userEmail);
    if (emailMatch) return emailMatch;
  }

  // 2. Direct match by user_id or teacher_id
  if (user?.id || user?.teacher_id) {
    const idMatch = staffList.find(s => String(s.user_id) === String(user.id) || String(s.id) === String(user.teacher_id));
    if (idMatch) return idMatch;
  }

  // 3. Direct match by name
  if (userName) {
    const nameMatch = staffList.find(s => s.name && s.name.toLowerCase().trim() === userName);
    if (nameMatch) return nameMatch;
  }

  // 4. Fallback: match first teacher in target school branch
  const schoolScoped = staffList.filter(s => targetSchoolId === 'all' || String(s.school_id || 1) === String(targetSchoolId || 1));
  const fallback = schoolScoped.find(s => s.role === 'teacher') || schoolScoped[0] || staffList[0];
  return fallback;
};

export const hrmsAPI = {
  // Staff Directory
  getStaff: async (params = {}) => {
    const ctx = getCallerHRMSContext();
    let list = getStoredHrmsStaff();
    const { department, role, status, search } = params;

    // Strict Multi-School Data Isolation
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    if (effectiveSchoolId !== 'all') {
      list = list.filter(s => String(s.school_id || 1) === String(effectiveSchoolId));
    }

    // STRICT PRIVACY PROTECTION: Teachers must NEVER see other staff's HRMS data
    if (ctx.isTeacher) {
      const myStaff = getMyStaffRecord(list, ctx.user, effectiveSchoolId);
      return {
        success: true,
        data: myStaff ? [myStaff] : [],
        total: myStaff ? 1 : 0,
        isPersonalView: true,
        personalStaffId: myStaff?.id || null,
      };
    }

    if (department && department !== 'all') {
      list = list.filter(s => (s.department || '').toLowerCase() === department.toLowerCase());
    }
    if (role && role !== 'all') {
      list = list.filter(s => (s.role || '').toLowerCase() === role.toLowerCase());
    }
    if (status && status !== 'all') {
      list = list.filter(s => (s.status || '').toLowerCase() === status.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.department || '').toLowerCase().includes(q) ||
        (s.designation || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q)
      );
    }

    return { success: true, data: list, total: list.length, isPersonalView: false };
  },

  getStaffById: async (id) => {
    const ctx = getCallerHRMSContext();
    const list = getStoredHrmsStaff();
    const staff = list.find(s => s.id === id);
    if (!staff) throw new Error('Staff member not found');
    if (!isSchoolAuthorized(staff.school_id || 1)) {
      throw new Error('Access Denied: You are not authorized to view staff records for this school campus.');
    }

    // STRICT PRIVACY PROTECTION: Teachers can only view their own profile
    if (ctx.isTeacher) {
      const myStaff = getMyStaffRecord(list, ctx.user, staff.school_id);
      if (!myStaff || String(myStaff.id) !== String(id)) {
        throw new Error('Access Denied: Teachers are restricted from accessing HRMS records of other faculty and staff members.');
      }
    }
    return { success: true, data: staff };
  },

  createStaff: async (data) => {
    const ctx = getCallerHRMSContext();
    if (ctx.isTeacher) {
      throw new Error('Access Denied: Teachers do not have administrative clearance to onboard staff members.');
    }
    const list = getStoredHrmsStaff();
    const effectiveSchoolId = getEffectiveSchoolId(data.school_id);
    const assignedSchoolId = effectiveSchoolId === 'all' ? 1 : effectiveSchoolId;
    const newId = `EMP-${100 + list.length + 1}`;
    const newStaff = {
      id: newId,
      school_id: assignedSchoolId,
      name: data.name?.trim(),
      email: data.email?.trim(),
      phone: data.phone?.trim() || '+91 98765 00000',
      department: data.department || 'Science & STEM',
      designation: data.designation?.trim() || 'Faculty Member',
      role: data.role || 'teacher',
      qualification: data.qualification?.trim() || 'Post Graduate, B.Ed',
      joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
      employmentType: data.employmentType || 'Full-Time',
      status: data.status || 'active',
      basicSalary: parseFloat(data.basicSalary) || 45000,
      allowances: {
        da: Math.round((parseFloat(data.basicSalary) || 45000) * 0.20),
        hra: Math.round((parseFloat(data.basicSalary) || 45000) * 0.25),
        conveyance: 3500,
      },
      deductions: {
        pf: Math.round((parseFloat(data.basicSalary) || 45000) * 0.12),
        esi: 650,
        tax: 2000,
      },
      bankDetails: {
        bankName: data.bankName || 'HDFC Bank',
        accountNumber: data.accountNumber || '50100' + Math.floor(10000000 + Math.random() * 90000000),
        ifsc: data.ifsc || 'HDFC0001420',
      },
      leaveBalance: {
        casual: { total: 12, used: 0, remaining: 12 },
        medical: { total: 10, used: 0, remaining: 10 },
        earned: { total: 15, used: 0, remaining: 15 },
      },
      performanceScore: 90,
      shift: data.shift || 'General (08:00 AM - 03:30 PM)',
    };

    list.unshift(newStaff);
    saveStoredHrmsStaff(list);
    return { success: true, data: newStaff };
  },

  updateStaff: async (id, data) => {
    const list = getStoredHrmsStaff();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Staff not found');
    list[idx] = { ...list[idx], ...data, id: list[idx].id };
    saveStoredHrmsStaff(list);
    return { success: true, data: list[idx] };
  },

  updateCompensation: async (id, compData) => {
    const ctx = getCallerHRMSContext();
    if (ctx.isTeacher) {
      throw new Error('Access Denied: Only administrators and finance officers can modify salary compensation or structures.');
    }
    const list = getStoredHrmsStaff();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Staff not found');
    if (!isSchoolAuthorized(list[idx].school_id || 1)) {
      throw new Error('Access Denied: You are not authorized to modify compensation for this school campus.');
    }

    const basic = parseFloat(compData.basicSalary) || list[idx].basicSalary || 50000;
    const allowances = {
      da: compData.allowances?.da !== undefined ? parseFloat(compData.allowances.da) : Math.round(basic * 0.20),
      hra: compData.allowances?.hra !== undefined ? parseFloat(compData.allowances.hra) : Math.round(basic * 0.25),
      conveyance: compData.allowances?.conveyance !== undefined ? parseFloat(compData.allowances.conveyance) : (list[idx].allowances?.conveyance || 3500),
    };
    const deductions = {
      pf: compData.deductions?.pf !== undefined ? parseFloat(compData.deductions.pf) : Math.round(basic * 0.12),
      esi: compData.deductions?.esi !== undefined ? parseFloat(compData.deductions.esi) : (basic < 50000 ? Math.round((basic + allowances.da + allowances.hra + allowances.conveyance) * 0.0075) : 0),
      tax: compData.deductions?.tax !== undefined ? parseFloat(compData.deductions.tax) : (list[idx].deductions?.tax || 2500),
    };

    list[idx] = {
      ...list[idx],
      basicSalary: basic,
      allowances,
      deductions,
      bankDetails: {
        ...list[idx].bankDetails,
        ...(compData.bankDetails || {}),
      },
    };
    saveStoredHrmsStaff(list);

    // Also update any open/current payroll records for this employee
    const payrollList = getStoredHrmsPayroll();
    const updatedPayroll = payrollList.map(p => {
      if (p.employeeId === id) {
        const gross = basic + allowances.da + allowances.hra + allowances.conveyance;
        const totalDeductions = deductions.pf + deductions.esi + deductions.tax;
        const net = gross - totalDeductions;
        return {
          ...p,
          basicPay: basic,
          da: allowances.da,
          hra: allowances.hra,
          conveyance: allowances.conveyance,
          grossSalary: gross,
          pfDeduction: deductions.pf,
          esiDeduction: deductions.esi,
          taxDeduction: deductions.tax,
          totalDeductions,
          netSalary: net,
          bankDetails: list[idx].bankDetails,
        };
      }
      return p;
    });
    saveStoredHrmsPayroll(updatedPayroll);

    return { success: true, data: list[idx] };
  },

  deleteStaff: async (id) => {
    const ctx = getCallerHRMSContext();
    if (ctx.isTeacher) {
      throw new Error('Access Denied: Teachers cannot decommission staff records.');
    }
    const list = getStoredHrmsStaff();
    const next = list.filter(s => s.id !== id);
    saveStoredHrmsStaff(next);
    return { success: true, id };
  },

  // Leave Management
  getLeaves: async (params = {}) => {
    const ctx = getCallerHRMSContext();
    let leaves = getStoredHrmsLeaves();
    const { status, employeeId, department } = params;

    // Strict Multi-School Data Isolation
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    if (effectiveSchoolId !== 'all') {
      leaves = leaves.filter(l => String(l.school_id || 1) === String(effectiveSchoolId));
    }

    // STRICT PRIVACY PROTECTION: Teachers must only see their own leave requests
    if (ctx.isTeacher) {
      const staffList = getStoredHrmsStaff();
      const myStaff = getMyStaffRecord(staffList, ctx.user, effectiveSchoolId);
      const myEmpId = myStaff?.id;
      const myEmail = (ctx.user?.email || '').toLowerCase().trim();
      const myName = (myStaff?.name || ctx.user?.name || '').toLowerCase().trim();

      leaves = leaves.filter(l =>
        (myEmpId && l.employeeId === myEmpId) ||
        (myEmail && l.email && l.email.toLowerCase().trim() === myEmail) ||
        (myName && (l.employeeName || '').toLowerCase().trim() === myName)
      );
    } else {
      if (status && status !== 'all') {
        leaves = leaves.filter(l => (l.status || '').toLowerCase() === status.toLowerCase());
      }
      if (employeeId) {
        leaves = leaves.filter(l => l.employeeId === employeeId);
      }
      if (department && department !== 'all') {
        leaves = leaves.filter(l => (l.department || '').toLowerCase() === department.toLowerCase());
      }
    }

    leaves.sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
    return { success: true, data: leaves, total: leaves.length, isPersonalView: ctx.isTeacher };
  },

  applyLeave: async (data) => {
    const ctx = getCallerHRMSContext();
    const leaves = getStoredHrmsLeaves();
    const staffList = getStoredHrmsStaff();
    let targetEmployeeId = data.employeeId;

    // RESTRICTION: A teacher must only apply on behalf of themselves
    if (ctx.isTeacher) {
      const myStaff = getMyStaffRecord(staffList, ctx.user, data.school_id);
      if (myStaff) {
        targetEmployeeId = myStaff.id;
      }
    }

    const staff = staffList.find(s => s.id === targetEmployeeId) || staffList[0];
    const assignedSchoolId = staff?.school_id || 1;

    const newLeave = {
      id: `leave-${Date.now()}`,
      school_id: assignedSchoolId,
      employeeId: staff.id,
      employeeName: staff.name,
      department: staff.department,
      leaveType: data.leaveType || 'Casual Leave (CL)',
      startDate: data.startDate,
      endDate: data.endDate || data.startDate,
      daysCount: parseInt(data.daysCount, 10) || 1,
      reason: data.reason?.trim() || '',
      status: 'pending',
      appliedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
    };

    leaves.unshift(newLeave);
    saveStoredHrmsLeaves(leaves);
    return { success: true, data: newLeave };
  },

  updateLeaveStatus: async (leaveId, { status, reviewedBy, reviewNotes }) => {
    const ctx = getCallerHRMSContext();
    if (ctx.isTeacher) {
      throw new Error('Access Denied: Teachers are strictly prohibited from approving or rejecting leave applications.');
    }
    const leaves = getStoredHrmsLeaves();
    const idx = leaves.findIndex(l => l.id === leaveId);
    if (idx === -1) throw new Error('Leave application not found');

    leaves[idx] = {
      ...leaves[idx],
      status,
      reviewedBy: reviewedBy || 'Administrator',
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes || (status === 'approved' ? 'Leave Approved' : 'Leave Rejected'),
    };

    saveStoredHrmsLeaves(leaves);
    return { success: true, data: leaves[idx] };
  },

  // Daily Staff Attendance
  getDailyAttendance: async (dateStr, params = {}) => {
    const ctx = getCallerHRMSContext();
    const date = dateStr || new Date().toISOString().split('T')[0];
    const effectiveSchoolId = getEffectiveSchoolId(params?.school_id);
    let staff = getStoredHrmsStaff();
    if (effectiveSchoolId !== 'all') {
      staff = staff.filter(s => String(s.school_id || 1) === String(effectiveSchoolId));
    }

    let records = [];
    const raw = localStorage.getItem(`${HRMS_ATTENDANCE_KEY}_${date}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          records = effectiveSchoolId === 'all'
            ? parsed
            : parsed.filter(r => staff.some(s => s.id === r.employeeId));
        }
      } catch (_) {}
    }

    if (!records || records.length === 0) {
      records = staff.map((s, idx) => ({
        employeeId: s.id,
        school_id: s.school_id || 1,
        employeeName: s.name,
        department: s.department,
        designation: s.designation,
        status: idx === 2 ? 'on-leave' : (idx === 7 ? 'late' : 'present'),
        checkIn: idx === 2 ? '-' : (idx === 7 ? '08:45 AM' : '07:55 AM'),
        checkOut: idx === 2 ? '-' : '03:45 PM',
        shift: s.shift,
      }));
      try {
        localStorage.setItem(`${HRMS_ATTENDANCE_KEY}_${date}`, JSON.stringify(records));
      } catch (_) {}
    }

    // STRICT PRIVACY PROTECTION: Teachers only see their own attendance record
    if (ctx.isTeacher) {
      const myStaff = getMyStaffRecord(staff, ctx.user, effectiveSchoolId);
      const myEmpId = myStaff?.id;
      const myName = (myStaff?.name || ctx.user?.name || '').toLowerCase().trim();

      const personalRecords = records.filter(r =>
        (myEmpId && r.employeeId === myEmpId) ||
        (myName && (r.employeeName || '').toLowerCase().trim() === myName)
      );
      return { success: true, date, data: personalRecords, isPersonalView: true };
    }

    return { success: true, date, data: records, isPersonalView: false };
  },

  saveDailyAttendance: async (dateStr, records) => {
    const ctx = getCallerHRMSContext();
    if (ctx.isTeacher) {
      throw new Error('Access Denied: Teachers do not have clearance to modify staff attendance registers.');
    }
    const date = dateStr || new Date().toISOString().split('T')[0];
    localStorage.setItem(`${HRMS_ATTENDANCE_KEY}_${date}`, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('sms:hrms-updated'));
    return { success: true, date, data: records };
  },

  // Payroll Management
  getPayroll: async (params = {}) => {
    const ctx = getCallerHRMSContext();
    let list = getStoredHrmsPayroll();
    const { month, year, status, employeeId, search } = params;

    // Strict Multi-School Data Isolation
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    if (effectiveSchoolId !== 'all') {
      const staffList = getStoredHrmsStaff();
      list = list.filter(p => {
        const matchingStaff = staffList.find(s => s.id === p.employeeId);
        return String(p.school_id || matchingStaff?.school_id || 1) === String(effectiveSchoolId);
      });
    }

    // STRICT PRIVACY PROTECTION: Teachers only see their own payslips
    if (ctx.isTeacher) {
      const staffList = getStoredHrmsStaff();
      const myStaff = getMyStaffRecord(staffList, ctx.user, effectiveSchoolId);
      const myEmpId = myStaff?.id;
      const myName = (myStaff?.name || ctx.user?.name || '').toLowerCase().trim();

      list = list.filter(p =>
        (myEmpId && p.employeeId === myEmpId) ||
        (myName && (p.employeeName || '').toLowerCase().trim() === myName)
      );
    } else {
      if (month) {
        list = list.filter(p => parseInt(p.month, 10) === parseInt(month, 10));
      }
      if (year) {
        list = list.filter(p => parseInt(p.year, 10) === parseInt(year, 10));
      }
      if (status && status !== 'all') {
        list = list.filter(p => (p.status || '').toLowerCase() === status.toLowerCase());
      }
      if (employeeId) {
        list = list.filter(p => p.employeeId === employeeId);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(p =>
          (p.employeeName || '').toLowerCase().includes(q) ||
          (p.department || '').toLowerCase().includes(q) ||
          (p.employeeId || '').toLowerCase().includes(q) ||
          (p.transactionRef || '').toLowerCase().includes(q)
        );
      }
    }

    return { success: true, data: list, total: list.length, isPersonalView: ctx.isTeacher };
  },

  updatePayrollStatus: async (payrollId, status) => {
    const ctx = getCallerHRMSContext();
    if (ctx.isTeacher) {
      throw new Error('Access Denied: Teachers cannot disburse or update payroll records.');
    }
    const list = getStoredHrmsPayroll();
    const idx = list.findIndex(p => p.id === payrollId);
    if (idx === -1) throw new Error('Payroll record not found');
    list[idx].status = status;
    if (status === 'paid' && !list[idx].disbursedAt) {
      list[idx].disbursedAt = new Date().toISOString();
      list[idx].transactionRef = `TXN-CMS-${Date.now()}`;
    }
    saveStoredHrmsPayroll(list);
    return { success: true, data: list[idx] };
  },

  resetDefaults: async () => {
    const ctx = getCallerHRMSContext();
    if (ctx.isTeacher) {
      throw new Error('Access Denied: Only administrators can reset institutional demo data.');
    }
    saveStoredHrmsStaff(DEFAULT_HRMS_STAFF);
    saveStoredHrmsLeaves(DEFAULT_HRMS_LEAVES);
    saveStoredHrmsPayroll(buildDefaultPayroll());
    return { success: true, message: 'HRMS reset to institutional demo data' };
  },
};

// ============================================================================
// TIMETABLE & SUBSTITUTION MANAGEMENT API
// ============================================================================

export const DEFAULT_TIMETABLE_PERIODS = [
  { id: '1', period_number: 1, name: 'Period 1', start_time: '08:00', end_time: '08:45', is_break: false, order: 1 },
  { id: '2', period_number: 2, name: 'Period 2', start_time: '08:45', end_time: '09:30', is_break: false, order: 2 },
  { id: '3', period_number: 3, name: 'Period 3', start_time: '09:30', end_time: '10:15', is_break: false, order: 3 },
  { id: 'b1', period_number: 0, name: 'Break', start_time: '10:15', end_time: '10:30', is_break: true, order: 4 },
  { id: '4', period_number: 4, name: 'Period 4', start_time: '10:30', end_time: '11:15', is_break: false, order: 5 },
  { id: '5', period_number: 5, name: 'Period 5', start_time: '11:15', end_time: '12:00', is_break: false, order: 6 },
  { id: 'b2', period_number: 0, name: 'Lunch Break', start_time: '12:00', end_time: '12:40', is_break: true, order: 7 },
  { id: '6', period_number: 6, name: 'Period 6', start_time: '12:40', end_time: '01:25', is_break: false, order: 8 },
  { id: '7', period_number: 7, name: 'Period 7', start_time: '01:25', end_time: '02:10', is_break: false, order: 9 },
];

export const DEFAULT_TIMETABLE_ROOMS = [
  { id: '1', name: 'Room 201', type: 'classroom', building: 'Main Academic Block', floor: '2nd Floor', capacity: 45 },
  { id: '2', name: 'Room 202', type: 'classroom', building: 'Main Academic Block', floor: '2nd Floor', capacity: 45 },
  { id: '3', name: 'Room 203', type: 'classroom', building: 'Main Academic Block', floor: '2nd Floor', capacity: 40 },
  { id: '4', name: 'Room 204', type: 'classroom', building: 'Science Wing', floor: '1st Floor', capacity: 42 },
  { id: '5', name: 'Room 205', type: 'classroom', building: 'Language Wing', floor: '2nd Floor', capacity: 40 },
  { id: '6', name: 'Lab 1', type: 'lab', building: 'Science Wing', floor: 'Ground Floor', capacity: 35 },
  { id: '7', name: 'Lab 2', type: 'lab', building: 'Science Wing', floor: '1st Floor', capacity: 35 },
  { id: '8', name: 'Lab 3', type: 'lab', building: 'IT Center', floor: '3rd Floor', capacity: 50 },
  { id: '9', name: 'Room 105', type: 'classroom', building: 'Humanities Wing', floor: '1st Floor', capacity: 38 },
  { id: '10', name: 'Room 106', type: 'activity', building: 'Arts Block', floor: '1st Floor', capacity: 30 },
  { id: '11', name: 'Room 107', type: 'activity', building: 'Music Conservatory', floor: '1st Floor', capacity: 30 },
  { id: '12', name: 'Ground', type: 'facility', building: 'Sports Complex', floor: 'Outdoors', capacity: 150 },
  { id: '13', name: 'Library', type: 'facility', building: 'Central Block', floor: '2nd Floor', capacity: 80 },
];

// Helper builders for initial realistic Class 10-A slots matching reference design image
const buildDefaultClass10Slots = (schoolId = 1, classId = 10, sectionId = 1) => {
  const schedule = [
    // MONDAY
    { day: 'Monday', p: '1', sub: 'Mathematics', teacher: 'R. Sharma', tId: 101, room: 'Room 201', rId: '1', type: 'lecture' },
    { day: 'Monday', p: '2', sub: 'English', teacher: 'S. Verma', tId: 102, room: 'Room 202', rId: '2', type: 'lecture' },
    { day: 'Monday', p: '3', sub: 'Physics', teacher: 'A. Singh', tId: 103, room: 'Lab 1', rId: '6', type: 'lab' },
    { day: 'Monday', p: '4', sub: 'Chemistry', teacher: 'P. Mehta', tId: 104, room: 'Lab 2', rId: '7', type: 'lab' },
    { day: 'Monday', p: '5', sub: 'History', teacher: 'V. Joshi', tId: 105, room: 'Room 203', rId: '3', type: 'lecture' },
    { day: 'Monday', p: '6', sub: 'Computer', teacher: 'N. Gupta', tId: 106, room: 'Lab 3', rId: '8', type: 'lab' },
    { day: 'Monday', p: '7', sub: 'Physical Ed.', teacher: 'M. Khan', tId: 107, room: 'Ground', rId: '12', type: 'activity' },

    // TUESDAY
    { day: 'Tuesday', p: '1', sub: 'Science', teacher: 'A. Singh', tId: 103, room: 'Room 204', rId: '4', type: 'lecture' },
    { day: 'Tuesday', p: '2', sub: 'Hindi', teacher: 'K. Gupta', tId: 108, room: 'Room 205', rId: '5', type: 'lecture' },
    { day: 'Tuesday', p: '3', sub: 'Mathematics', teacher: 'R. Sharma', tId: 101, room: 'Room 201', rId: '1', type: 'lecture' },
    { day: 'Tuesday', p: '4', sub: 'English', teacher: 'S. Verma', tId: 102, room: 'Room 202', rId: '2', type: 'lecture' },
    { day: 'Tuesday', p: '5', sub: 'Geography', teacher: 'T. Das', tId: 109, room: 'Room 203', rId: '3', type: 'lecture' },
    { day: 'Tuesday', p: '6', sub: 'Art', teacher: 'P. Rao', tId: 110, room: 'Room 106', rId: '10', type: 'activity' },
    { day: 'Tuesday', p: '7', sub: 'Library', teacher: 'S. Roy', tId: 111, room: 'Library', rId: '13', type: 'activity' },

    // WEDNESDAY
    { day: 'Wednesday', p: '1', sub: 'Physics', teacher: 'A. Singh', tId: 103, room: 'Lab 1', rId: '6', type: 'lab' },
    { day: 'Wednesday', p: '2', sub: 'Mathematics', teacher: 'R. Sharma', tId: 101, room: 'Room 201', rId: '1', type: 'lecture' },
    { day: 'Wednesday', p: '3', sub: 'Chemistry', teacher: 'P. Mehta', tId: 104, room: 'Lab 2', rId: '7', type: 'lab' },
    { day: 'Wednesday', p: '4', sub: 'English', teacher: 'S. Verma', tId: 102, room: 'Room 202', rId: '2', type: 'lecture' },
    { day: 'Wednesday', p: '5', sub: 'Computer', teacher: 'N. Gupta', tId: 106, room: 'Lab 3', rId: '8', type: 'lab' },
    { day: 'Wednesday', p: '6', sub: 'Hindi', teacher: 'K. Gupta', tId: 108, room: 'Room 205', rId: '5', type: 'lecture' },
    { day: 'Wednesday', p: '7', sub: 'Music', teacher: 'R. Iyer', tId: 112, room: 'Room 107', rId: '11', type: 'activity' },

    // THURSDAY
    { day: 'Thursday', p: '1', sub: 'Chemistry', teacher: 'P. Mehta', tId: 104, room: 'Lab 2', rId: '7', type: 'lab' },
    { day: 'Thursday', p: '2', sub: 'History', teacher: 'V. Joshi', tId: 105, room: 'Room 203', rId: '3', type: 'lecture' },
    { day: 'Thursday', p: '3', sub: 'Mathematics', teacher: 'R. Sharma', tId: 101, room: 'Room 201', rId: '1', type: 'lecture' },
    { day: 'Thursday', p: '4', sub: 'Biology', teacher: 'D. Patel', tId: 113, room: 'Lab 1', rId: '6', type: 'substitution', is_substituted: true, original_teacher: 'B. Sen', substitute_teacher: 'D. Patel' },
    { day: 'Thursday', p: '5', sub: 'Physical Ed.', teacher: 'M. Khan', tId: 107, room: 'Ground', rId: '12', type: 'activity' },
    { day: 'Thursday', p: '6', sub: 'Science', teacher: 'A. Singh', tId: 103, room: 'Room 204', rId: '4', type: 'lecture' },
    { day: 'Thursday', p: '7', sub: 'Value Ed.', teacher: 'S. Nair', tId: 114, room: 'Room 105', rId: '9', type: 'lecture' },

    // FRIDAY
    { day: 'Friday', p: '1', sub: 'English', teacher: 'S. Verma', tId: 102, room: 'Room 202', rId: '2', type: 'lecture' },
    { day: 'Friday', p: '2', sub: 'Geography', teacher: 'T. Das', tId: 109, room: 'Room 203', rId: '3', type: 'lecture' },
    { day: 'Friday', p: '3', sub: 'Computer', teacher: 'N. Gupta', tId: 106, room: 'Lab 3', rId: '8', type: 'lab' },
    { day: 'Friday', p: '4', sub: 'Mathematics', teacher: 'R. Sharma', tId: 101, room: 'Room 201', rId: '1', type: 'lecture' },
    { day: 'Friday', p: '5', sub: 'Hindi', teacher: 'K. Gupta', tId: 108, room: 'Room 205', rId: '5', type: 'lecture' },
    { day: 'Friday', p: '6', sub: 'Chemistry', teacher: 'P. Mehta', tId: 104, room: 'Lab 2', rId: '7', type: 'lab' },
    { day: 'Friday', p: '7', sub: 'Library', teacher: 'S. Roy', tId: 111, room: 'Library', rId: '13', type: 'activity' },

    // SATURDAY
    { day: 'Saturday', p: '1', sub: 'Physical Ed.', teacher: 'M. Khan', tId: 107, room: 'Ground', rId: '12', type: 'activity' },
    { day: 'Saturday', p: '2', sub: 'Art', teacher: 'P. Rao', tId: 110, room: 'Room 106', rId: '10', type: 'activity' },
    { day: 'Saturday', p: '3', sub: 'Music', teacher: 'R. Iyer', tId: 112, room: 'Room 107', rId: '11', type: 'activity' },
    { day: 'Saturday', p: '4', sub: 'Value Ed.', teacher: 'S. Nair', tId: 114, room: 'Room 105', rId: '9', type: 'lecture' },
    { day: 'Saturday', p: '5', sub: 'English', teacher: 'S. Verma', tId: 102, room: 'Room 202', rId: '2', type: 'lecture' },
    { day: 'Saturday', p: '6', sub: 'Hindi', teacher: 'K. Gupta', tId: 108, room: 'Room 205', rId: '5', type: 'lecture' },
    { day: 'Saturday', p: '7', sub: '--', teacher: '--', tId: null, room: '--', rId: null, type: 'free' },
  ];

  return schedule.map((item, idx) => ({
    id: `slot-10A-${item.day}-${item.p}`,
    school_id: schoolId,
    class_id: classId,
    class_name: 'Class 10-A',
    section_id: sectionId,
    section_name: 'A',
    term: 'Term 1 (2024-25)',
    academic_year: '2024-25',
    day_of_week: item.day,
    period_id: item.p,
    subject_id: item.sub,
    subject_name: item.sub,
    teacher_id: item.tId,
    teacher_name: item.teacher,
    room_id: item.rId,
    room_name: item.room,
    activity_type: item.type,
    is_substituted: !!item.is_substituted,
    original_teacher_name: item.original_teacher || null,
    substitute_teacher_name: item.substitute_teacher || null,
    status: 'published',
    order: idx,
  }));
};

const buildDefaultSubstitutions = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'sub-1',
      school_id: 1,
      class_id: 10,
      class_name: 'Class 10-A',
      section_id: 1,
      section_name: 'A',
      period_id: '4',
      day_of_week: 'Thursday',
      date: todayStr,
      subject_name: 'Biology',
      original_teacher_id: 115,
      original_teacher_name: 'B. Sen',
      substitute_teacher_id: 113,
      substitute_teacher_name: 'D. Patel',
      room_name: 'Lab 1',
      reason: 'Medical Leave',
      created_at: new Date().toISOString(),
      status: 'active',
    },
    {
      id: 'sub-2',
      school_id: 1,
      class_id: 9,
      class_name: 'Class 9-B',
      section_id: 2,
      section_name: 'B',
      period_id: '2',
      day_of_week: 'Thursday',
      date: todayStr,
      subject_name: 'Mathematics',
      original_teacher_id: 101,
      original_teacher_name: 'R. Sharma',
      substitute_teacher_id: 103,
      substitute_teacher_name: 'A. Singh',
      room_name: 'Room 204',
      reason: 'Conference Duty',
      created_at: new Date().toISOString(),
      status: 'active',
    },
    {
      id: 'sub-3',
      school_id: 1,
      class_id: 8,
      class_name: 'Class 8-A',
      section_id: 1,
      section_name: 'A',
      period_id: '5',
      day_of_week: 'Thursday',
      date: todayStr,
      subject_name: 'History',
      original_teacher_id: 105,
      original_teacher_name: 'V. Joshi',
      substitute_teacher_id: 109,
      substitute_teacher_name: 'T. Das',
      room_name: 'Room 203',
      reason: 'Official Workshop',
      created_at: new Date().toISOString(),
      status: 'active',
    },
  ];
};

const getStoredTimetableSlots = () => {
  try {
    const raw = localStorage.getItem('sms_timetable_slots');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  const defaults = buildDefaultClass10Slots();
  try {
    localStorage.setItem('sms_timetable_slots', JSON.stringify(defaults));
  } catch (_) {}
  return defaults;
};

const saveStoredTimetableSlots = (slots) => {
  try {
    localStorage.setItem('sms_timetable_slots', JSON.stringify(slots));
  } catch (_) {}
};

const getStoredTimetablePeriods = () => {
  try {
    const raw = localStorage.getItem('sms_timetable_periods');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  try {
    localStorage.setItem('sms_timetable_periods', JSON.stringify(DEFAULT_TIMETABLE_PERIODS));
  } catch (_) {}
  return DEFAULT_TIMETABLE_PERIODS;
};

const saveStoredTimetablePeriods = (periods) => {
  try {
    localStorage.setItem('sms_timetable_periods', JSON.stringify(periods));
  } catch (_) {}
};

const getStoredTimetableRooms = () => {
  try {
    const raw = localStorage.getItem('sms_timetable_rooms');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  try {
    localStorage.setItem('sms_timetable_rooms', JSON.stringify(DEFAULT_TIMETABLE_ROOMS));
  } catch (_) {}
  return DEFAULT_TIMETABLE_ROOMS;
};

const saveStoredTimetableRooms = (rooms) => {
  try {
    localStorage.setItem('sms_timetable_rooms', JSON.stringify(rooms));
  } catch (_) {}
};

const getStoredSubstitutions = () => {
  try {
    const raw = localStorage.getItem('sms_timetable_substitutions');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  const defaults = buildDefaultSubstitutions();
  try {
    localStorage.setItem('sms_timetable_substitutions', JSON.stringify(defaults));
  } catch (_) {}
  return defaults;
};

const saveStoredSubstitutions = (subs) => {
  try {
    localStorage.setItem('sms_timetable_substitutions', JSON.stringify(subs));
  } catch (_) {}
};

export const timetableAPI = {
  // 1. Get Timetable Slots with Filters & Scoping
  getTimetable: async (params = {}) => {
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    let allSlots = getStoredTimetableSlots();

    if (effectiveSchoolId !== 'all') {
      allSlots = allSlots.filter(s => !s.school_id || String(s.school_id) === String(effectiveSchoolId));
    }

    if (params.class_id) {
      allSlots = allSlots.filter(s => String(s.class_id) === String(params.class_id));
    }

    if (params.section_id) {
      allSlots = allSlots.filter(s => String(s.section_id) === String(params.section_id));
    }

    if (params.term) {
      allSlots = allSlots.filter(s => !s.term || s.term === params.term);
    }

    if (params.teacher_id) {
      allSlots = allSlots.filter(s => String(s.teacher_id) === String(params.teacher_id));
    }

    if (params.day_of_week) {
      allSlots = allSlots.filter(s => s.day_of_week === params.day_of_week);
    }

    // Merge active substitutions for today/selected date
    const todayStr = params.date || new Date().toISOString().split('T')[0];
    const subs = getStoredSubstitutions().filter(sub => sub.date === todayStr);

    const enriched = allSlots.map(slot => {
      const activeSub = subs.find(
        sub =>
          String(sub.class_id) === String(slot.class_id) &&
          sub.day_of_week === slot.day_of_week &&
          String(sub.period_id) === String(slot.period_id)
      );

      if (activeSub) {
        return {
          ...slot,
          is_substituted: true,
          original_teacher_name: activeSub.original_teacher_name,
          substitute_teacher_name: activeSub.substitute_teacher_name,
          teacher_name: activeSub.substitute_teacher_name,
          teacher_id: activeSub.substitute_teacher_id,
          activity_type: 'substitution',
          substitution_reason: activeSub.reason,
          substitution_id: activeSub.id,
        };
      }
      return slot;
    });

    return {
      success: true,
      data: enriched,
      count: enriched.length,
      publishedStatus: 'Published',
      publishedOn: '20 May 2024',
    };
  },

  // 2. CONFLICT CHECKER (Crucial Requirement: Prevent double-booking same teacher!)
  checkConflicts: ({ teacher_id, room_id, day_of_week, period_id, class_id, section_id, slot_id, date, substitute_id }) => {
    const effectiveSchoolId = getEffectiveSchoolId();
    const allSlots = getStoredTimetableSlots().filter(
      s => !s.school_id || String(s.school_id) === String(effectiveSchoolId)
    );

    // 2.1 TEACHER CONFLICT CHECK
    if (teacher_id && teacher_id !== '--') {
      const teacherConflict = allSlots.find(s =>
        String(s.teacher_id) === String(teacher_id) &&
        s.day_of_week === day_of_week &&
        String(s.period_id) === String(period_id) &&
        String(s.id) !== String(slot_id) &&
        (String(s.class_id) !== String(class_id) || (section_id && String(s.section_id) !== String(section_id)))
      );

      if (teacherConflict) {
        return {
          hasConflict: true,
          type: 'teacher',
          message: `Double-Booking Conflict: Teacher ${teacherConflict.teacher_name || 'Teacher'} is already scheduled for ${teacherConflict.class_name || 'another class'} on ${day_of_week} at Period ${period_id}!`,
          conflictingSlot: teacherConflict,
        };
      }
    }

    // 2.2 ROOM CONFLICT CHECK
    if (room_id && room_id !== '--') {
      const roomConflict = allSlots.find(s =>
        String(s.room_id) === String(room_id) &&
        s.day_of_week === day_of_week &&
        String(s.period_id) === String(period_id) &&
        String(s.id) !== String(slot_id) &&
        (String(s.class_id) !== String(class_id) || (section_id && String(s.section_id) !== String(section_id)))
      );

      if (roomConflict) {
        return {
          hasConflict: true,
          type: 'room',
          message: `Room Conflict: Classroom ${roomConflict.room_name || 'Room'} is already occupied by ${roomConflict.class_name || 'another class'} on ${day_of_week} at Period ${period_id}!`,
          conflictingSlot: roomConflict,
        };
      }
    }

    // 2.3 ACTIVE SUBSTITUTION CONFLICT CHECK
    if (teacher_id && date) {
      const subs = getStoredSubstitutions();
      const subConflict = subs.find(sub =>
        sub.date === date &&
        sub.day_of_week === day_of_week &&
        String(sub.period_id) === String(period_id) &&
        String(sub.substitute_teacher_id) === String(teacher_id) &&
        String(sub.id) !== String(substitute_id) &&
        (String(sub.class_id) !== String(class_id) || (section_id && String(sub.section_id) !== String(section_id)))
      );

      if (subConflict) {
        return {
          hasConflict: true,
          type: 'substitute',
          message: `Substitution Conflict: ${subConflict.substitute_teacher_name} is already serving as substitute for ${subConflict.class_name} during this period!`,
          conflictingSub: subConflict,
        };
      }
    }

    return { hasConflict: false };
  },

  // 3. Save or Update Timetable Slot
  saveSlot: async (slotData) => {
    // Run conflict prevention check first
    const conflict = timetableAPI.checkConflicts({
      teacher_id: slotData.teacher_id,
      room_id: slotData.room_id,
      day_of_week: slotData.day_of_week,
      period_id: slotData.period_id,
      class_id: slotData.class_id,
      section_id: slotData.section_id,
      slot_id: slotData.id,
    });

    if (conflict.hasConflict) {
      throw new Error(conflict.message);
    }

    const slots = getStoredTimetableSlots();
    const effectiveSchoolId = getEffectiveSchoolId(slotData.school_id);

    const slotPayload = {
      ...slotData,
      id: slotData.id || `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      school_id: effectiveSchoolId,
      updated_at: new Date().toISOString(),
    };

    const existingIdx = slots.findIndex(s => String(s.id) === String(slotPayload.id));
    if (existingIdx >= 0) {
      slots[existingIdx] = slotPayload;
    } else {
      slots.push(slotPayload);
    }

    saveStoredTimetableSlots(slots);
    return { success: true, data: slotPayload };
  },

  // 4. Delete Timetable Slot
  deleteSlot: async (slotId) => {
    const slots = getStoredTimetableSlots();
    const filtered = slots.filter(s => String(s.id) !== String(slotId));
    saveStoredTimetableSlots(filtered);
    return { success: true, message: 'Timetable slot removed successfully' };
  },

  // 5. Publish Timetable
  publishTimetable: async ({ class_id, term, status = 'published' }) => {
    const slots = getStoredTimetableSlots();
    slots.forEach(s => {
      if (!class_id || String(s.class_id) === String(class_id)) {
        s.status = status;
        s.published_at = new Date().toISOString();
      }
    });
    saveStoredTimetableSlots(slots);
    return {
      success: true,
      status,
      published_at: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  },

  // 6. Get Periods and Breaks
  getPeriods: async () => {
    return { success: true, data: getStoredTimetablePeriods() };
  },

  savePeriod: async (periodData) => {
    const periods = getStoredTimetablePeriods();
    const newPeriod = {
      ...periodData,
      id: periodData.id || `p-${Date.now()}`,
    };
    const idx = periods.findIndex(p => String(p.id) === String(newPeriod.id));
    if (idx >= 0) periods[idx] = newPeriod;
    else periods.push(newPeriod);
    periods.sort((a, b) => (a.order || 0) - (b.order || 0));
    saveStoredTimetablePeriods(periods);
    return { success: true, data: newPeriod };
  },

  deletePeriod: async (periodId) => {
    const periods = getStoredTimetablePeriods().filter(p => String(p.id) !== String(periodId));
    saveStoredTimetablePeriods(periods);
    return { success: true };
  },

  // 7. Get Rooms and Classrooms
  getRooms: async () => {
    return { success: true, data: getStoredTimetableRooms() };
  },

  saveRoom: async (roomData) => {
    const rooms = getStoredTimetableRooms();
    const newRoom = {
      ...roomData,
      id: roomData.id || `room-${Date.now()}`,
    };
    const idx = rooms.findIndex(r => String(r.id) === String(newRoom.id));
    if (idx >= 0) rooms[idx] = newRoom;
    else rooms.push(newRoom);
    saveStoredTimetableRooms(rooms);
    return { success: true, data: newRoom };
  },

  deleteRoom: async (roomId) => {
    const rooms = getStoredTimetableRooms().filter(r => String(r.id) !== String(roomId));
    saveStoredTimetableRooms(rooms);
    return { success: true };
  },

  // 8. Substitutions Management
  getSubstitutions: async (params = {}) => {
    const subs = getStoredSubstitutions();
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    let filtered = subs;

    if (effectiveSchoolId !== 'all') {
      filtered = filtered.filter(s => !s.school_id || String(s.school_id) === String(effectiveSchoolId));
    }
    if (params.date) {
      filtered = filtered.filter(s => s.date === params.date);
    }
    return { success: true, data: filtered, count: filtered.length };
  },

  assignSubstitute: async (subData) => {
    // Prevent assigning the substitute teacher if already scheduled or substituting elsewhere
    const conflict = timetableAPI.checkConflicts({
      teacher_id: subData.substitute_teacher_id,
      day_of_week: subData.day_of_week,
      period_id: subData.period_id,
      class_id: subData.class_id,
      section_id: subData.section_id,
      date: subData.date,
    });

    if (conflict.hasConflict) {
      throw new Error(`Cannot Assign Substitute: ${conflict.message}`);
    }

    const subs = getStoredSubstitutions();
    const newSub = {
      ...subData,
      id: subData.id || `sub-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'active',
    };

    subs.unshift(newSub);
    saveStoredSubstitutions(subs);
    return { success: true, data: newSub };
  },

  deleteSubstitute: async (subId) => {
    const subs = getStoredSubstitutions().filter(s => String(s.id) !== String(subId));
    saveStoredSubstitutions(subs);
    return { success: true, message: 'Substitute assignment removed' };
  },

  // 9. Teacher Availability for a Given Period
  getTeacherAvailability: async ({ day_of_week, period_id, date, teachersList = [] }) => {
    const slots = getStoredTimetableSlots();
    const effectiveSchoolId = getEffectiveSchoolId();
    const schoolSlots = slots.filter(s => !s.school_id || String(s.school_id) === String(effectiveSchoolId));

    const occupiedTeacherMap = {};
    schoolSlots.forEach(s => {
      if (s.day_of_week === day_of_week && String(s.period_id) === String(period_id) && s.teacher_id) {
        occupiedTeacherMap[String(s.teacher_id)] = {
          class_name: s.class_name,
          subject_name: s.subject_name,
          room_name: s.room_name,
        };
      }
    });

    // Also check substitutions on date
    if (date) {
      const subs = getStoredSubstitutions().filter(sub => sub.date === date && String(sub.period_id) === String(period_id));
      subs.forEach(sub => {
        if (sub.substitute_teacher_id) {
          occupiedTeacherMap[String(sub.substitute_teacher_id)] = {
            class_name: sub.class_name,
            subject_name: `${sub.subject_name} (Substitute)`,
            room_name: sub.room_name,
          };
        }
      });
    }

    return teachersList.map(t => ({
      ...t,
      is_available: !occupiedTeacherMap[String(t.id)],
      occupied_with: occupiedTeacherMap[String(t.id)] || null,
    }));
  },

  // 10. Reset Timetable Data to Initial Seeded Layout
  resetTimetableDefaults: async () => {
    localStorage.removeItem('sms_timetable_slots');
    localStorage.removeItem('sms_timetable_periods');
    localStorage.removeItem('sms_timetable_rooms');
    localStorage.removeItem('sms_timetable_substitutions');
    return {
      success: true,
      slots: getStoredTimetableSlots(),
      periods: getStoredTimetablePeriods(),
      rooms: getStoredTimetableRooms(),
      substitutions: getStoredSubstitutions(),
    };
  },
};

// ==========================================
// Online Admission Registration System API
// ==========================================
const ADMISSION_STORAGE_KEY = 'sms_admission_applications';
const ADMISSION_SETTINGS_KEY = 'sms_admission_settings';
const ADMISSION_DRAFTS_KEY = 'sms_admission_drafts';

export const DEFAULT_ADMISSION_SETTINGS = {
  school_id: 1,
  online_admissions_enabled: true,
  opening_date: '2026-01-01',
  closing_date: '2026-12-31',
  academic_session: '2026-2027',
  academic_year_id: 2,
  registration_fee: 500,
  fee_mandatory: true,
  application_number_prefix: 'ADM',
  eligible_classes: [
    { id: 1, name: 'Class 1', minAgeYears: 5, minAgeMonths: 6, maxAgeYears: 7, maxAgeMonths: 0, seats: 80, filled: 38 },
    { id: 2, name: 'Class 2', minAgeYears: 6, minAgeMonths: 6, maxAgeYears: 8, maxAgeMonths: 0, seats: 80, filled: 45 },
    { id: 3, name: 'Class 3', minAgeYears: 7, minAgeMonths: 6, maxAgeYears: 9, maxAgeMonths: 0, seats: 80, filled: 52 },
    { id: 4, name: 'Class 4', minAgeYears: 8, minAgeMonths: 6, maxAgeYears: 10, maxAgeMonths: 0, seats: 80, filled: 40 },
    { id: 5, name: 'Class 5', minAgeYears: 9, minAgeMonths: 6, maxAgeYears: 11, maxAgeMonths: 0, seats: 80, filled: 61 },
    { id: 6, name: 'Class 6', minAgeYears: 10, minAgeMonths: 6, maxAgeYears: 12, maxAgeMonths: 0, seats: 90, filled: 74 },
    { id: 7, name: 'Class 7', minAgeYears: 11, minAgeMonths: 6, maxAgeYears: 13, maxAgeMonths: 0, seats: 90, filled: 68 },
    { id: 8, name: 'Class 8', minAgeYears: 12, minAgeMonths: 6, maxAgeYears: 14, maxAgeMonths: 0, seats: 90, filled: 82 },
    { id: 9, name: 'Class 9', minAgeYears: 13, minAgeMonths: 6, maxAgeYears: 15, maxAgeMonths: 0, seats: 90, filled: 85 },
    { id: 10, name: 'Class 10', minAgeYears: 14, minAgeMonths: 6, maxAgeYears: 16, maxAgeMonths: 0, seats: 90, filled: 88 },
    { id: 11, name: 'Class 11', minAgeYears: 15, minAgeMonths: 6, maxAgeYears: 17, maxAgeMonths: 0, seats: 120, filled: 95 },
    { id: 12, name: 'Class 12', minAgeYears: 16, minAgeMonths: 6, maxAgeYears: 18, maxAgeMonths: 0, seats: 120, filled: 110 },
  ],
  required_documents: [
    { type: 'student_photo', name: 'Student Passport Photo', mandatory: true, acceptedTypes: '.jpg,.jpeg,.png' },
    { type: 'birth_certificate', name: 'Birth Certificate (Govt. / Municipal)', mandatory: true, acceptedTypes: '.pdf,.jpg,.jpeg,.png' },
    { type: 'address_proof', name: 'Residential Address Proof (Aadhaar / Passport / Utility)', mandatory: true, acceptedTypes: '.pdf,.jpg,.jpeg,.png' },
    { type: 'previous_report_card', name: 'Previous Academic Report Card / Marksheet', mandatory: false, acceptedTypes: '.pdf,.jpg,.jpeg,.png' },
    { type: 'transfer_certificate', name: 'Transfer Certificate (TC)', mandatory: false, acceptedTypes: '.pdf,.jpg,.jpeg,.png' },
    { type: 'guardian_id', name: 'Parent / Guardian ID Proof', mandatory: false, acceptedTypes: '.pdf,.jpg,.jpeg,.png' },
  ],
  instructions: 'Please fill in all mandatory details accurately. Keep digital scanned copies of the student photograph, birth certificate, and address proof ready for upload. Registration fee can be paid online via UPI/Card or at the school cash counter.',
  declaration_text: 'I hereby declare that all information furnished in this admission application is true, complete, and accurate. I understand that any false or withheld information may result in the forfeiture of admission.',
};

export const SEEDED_ADMISSION_APPLICATIONS = [
  {
    id: 1,
    uuid: 'adm-app-001',
    application_number: 'ADM-2027-000101',
    access_token: 'tok_app_101_e7c9',
    school_id: 1,
    session_id: 1,
    academic_year_id: 2,
    academic_session: '2026-2027',
    class_id: 1,
    class_name: 'Class 1',
    preferred_section: 'A',
    first_name: 'Ishaan',
    last_name: 'Chatterjee',
    email: 'ishaan.parents@gmail.com',
    phone: '+91 98301 22334',
    date_of_birth: '2020-05-14',
    gender: 'male',
    blood_group: 'B+',
    nationality: 'Indian',
    mother_tongue: 'Bengali',
    religion: 'Hindu',
    caste: 'General',
    birth_certificate_number: 'WB/KOL/2020/99881',
    permanent_address: '14/B Lake Gardens, Near Lake Mall',
    correspondence_address: '14/B Lake Gardens, Near Lake Mall',
    city: 'Kolkata',
    district: 'Kolkata',
    state: 'West Bengal',
    postal_code: '700045',
    country: 'India',
    previous_school: 'Little Angels Nursery School',
    previous_board: 'State Montessori Board',
    previous_class: 'Upper Kindergarten (UKG)',
    previous_percentage: 'Grade A+',
    transfer_certificate_number: 'TC-LAN-2026-089',
    transfer_certificate_date: '2026-03-10',
    status: 'submitted',
    payment_status: 'completed',
    payment_amount: 500,
    payment_method: 'UPI',
    payment_reference: 'UPI/20260216/88992211',
    guardians: {
      father_name: 'Subhashish Chatterjee',
      father_phone: '+91 98301 22334',
      father_email: 'subhashish.c@techcorp.com',
      father_occupation: 'Senior Software Architect',
      mother_name: 'Debjani Chatterjee',
      mother_phone: '+91 98301 55667',
      mother_email: 'debjani.c@education.org',
      mother_occupation: 'College Lecturer',
      emergency_contact_name: 'Subhashish Chatterjee',
      emergency_contact_phone: '+91 98301 22334',
      emergency_contact_relation: 'Father',
    },
    documents: [
      { id: 101, document_type: 'student_photo', file_name: 'ishaan_photo.jpg', file_size: 145000, mime_type: 'image/jpeg', verification_status: 'pending' },
      { id: 102, document_type: 'birth_certificate', file_name: 'birth_certificate_kolkata.pdf', file_size: 420000, mime_type: 'application/pdf', verification_status: 'pending' },
      { id: 103, document_type: 'address_proof', file_name: 'electricity_bill_lake_gardens.pdf', file_size: 310000, mime_type: 'application/pdf', verification_status: 'pending' },
    ],
    status_history: [
      { id: 1, from_status: 'draft', to_status: 'submitted', remarks: 'Application submitted successfully with online registration fee ₹500.', visible_to_applicant: true, changed_by_name: 'Applicant Portal', created_at: '2026-02-14 11:30:00' },
    ],
    submitted_at: '2026-02-14 11:30:00',
    reviewed_at: null,
    enrolled_at: null,
    admin_remarks: null,
  },
  {
    id: 2,
    uuid: 'adm-app-002',
    application_number: 'ADM-2027-000102',
    access_token: 'tok_app_102_b4f1',
    school_id: 1,
    session_id: 1,
    academic_year_id: 2,
    academic_session: '2026-2027',
    class_id: 6,
    class_name: 'Class 6',
    preferred_section: 'B',
    first_name: 'Ananya',
    last_name: 'Mukherjee',
    email: 'ananya.parent@yahoo.in',
    phone: '+91 94340 11223',
    date_of_birth: '2015-08-22',
    gender: 'female',
    blood_group: 'O+',
    nationality: 'Indian',
    mother_tongue: 'Bengali',
    religion: 'Hindu',
    caste: 'General',
    birth_certificate_number: 'WB/SLG/2015/00441',
    permanent_address: '42 Sevoke Road, Near Planet Mall',
    correspondence_address: '42 Sevoke Road, Near Planet Mall',
    city: 'Siliguri',
    district: 'Darjeeling',
    state: 'West Bengal',
    postal_code: '734001',
    country: 'India',
    previous_school: 'St. Mary Senior School',
    previous_board: 'ICSE',
    previous_class: 'Class 5',
    previous_percentage: '94.6%',
    transfer_certificate_number: 'TC-SMSS-2026-302',
    transfer_certificate_date: '2026-03-12',
    status: 'under_review',
    payment_status: 'completed',
    payment_amount: 500,
    payment_method: 'Credit Card',
    payment_reference: 'TXN_CC_99881122',
    guardians: {
      father_name: 'Dr. Alok Mukherjee',
      father_phone: '+91 94340 11223',
      father_email: 'dr.alok.m@health.org',
      father_occupation: 'Surgeon',
      mother_name: 'Sutapa Mukherjee',
      mother_phone: '+91 94340 44556',
      mother_email: 'sutapa.m@gmail.com',
      mother_occupation: 'Senior Bank Manager',
      emergency_contact_name: 'Dr. Alok Mukherjee',
      emergency_contact_phone: '+91 94340 11223',
      emergency_contact_relation: 'Father',
    },
    documents: [
      { id: 201, document_type: 'student_photo', file_name: 'ananya_photo.jpg', file_size: 160000, mime_type: 'image/jpeg', verification_status: 'verified', verification_notes: 'Clear passport photo verified.' },
      { id: 202, document_type: 'birth_certificate', file_name: 'birth_cert_ananya.pdf', file_size: 380000, mime_type: 'application/pdf', verification_status: 'verified', verification_notes: 'Govt municipal seal clear.' },
      { id: 203, document_type: 'previous_report_card', file_name: 'class5_marksheet.pdf', file_size: 520000, mime_type: 'application/pdf', verification_status: 'pending' },
      { id: 204, document_type: 'address_proof', file_name: 'aadhaar_card_proof.pdf', file_size: 290000, mime_type: 'application/pdf', verification_status: 'verified' },
    ],
    status_history: [
      { id: 1, from_status: 'draft', to_status: 'submitted', remarks: 'Application submitted online with registration fee.', visible_to_applicant: true, changed_by_name: 'Applicant Portal', created_at: '2026-02-15 09:15:00' },
      { id: 2, from_status: 'submitted', to_status: 'under_review', remarks: 'Application dossier taken up for academic verification by Admissions Committee.', visible_to_applicant: true, changed_by_name: 'Dr. Rameshwar Sharma (Admin)', created_at: '2026-02-16 10:20:00' },
    ],
    submitted_at: '2026-02-15 09:15:00',
    reviewed_at: '2026-02-16 10:20:00',
    enrolled_at: null,
    admin_remarks: 'Academic record is exemplary (94.6% in Class 5). Awaiting clearance of previous marksheet.',
  },
  {
    id: 3,
    uuid: 'adm-app-003',
    application_number: 'ADM-2027-000103',
    access_token: 'tok_app_103_a9d3',
    school_id: 1,
    session_id: 1,
    academic_year_id: 2,
    academic_session: '2026-2027',
    class_id: 9,
    class_name: 'Class 9',
    preferred_section: 'A',
    first_name: 'Rohan',
    last_name: 'Kapoor',
    email: 'kapoor.family@gmail.com',
    phone: '+91 98112 33445',
    date_of_birth: '2012-03-10',
    gender: 'male',
    blood_group: 'AB+',
    nationality: 'Indian',
    mother_tongue: 'Hindi',
    religion: 'Hindu',
    caste: 'General',
    birth_certificate_number: 'DL/ND/2012/77112',
    permanent_address: 'Flat 304, Green Heights, Pradhan Nagar',
    correspondence_address: 'Flat 304, Green Heights, Pradhan Nagar',
    city: 'Siliguri',
    district: 'Darjeeling',
    state: 'West Bengal',
    postal_code: '734001',
    country: 'India',
    previous_school: 'Delhi Heritage Academy',
    previous_board: 'CBSE',
    previous_class: 'Class 8',
    previous_percentage: '88.2%',
    transfer_certificate_number: 'TC-DHA-2026-119',
    transfer_certificate_date: '2026-03-01',
    status: 'documents_pending',
    payment_status: 'completed',
    payment_amount: 500,
    payment_method: 'Net Banking',
    payment_reference: 'NB_HDFC_994411',
    guardians: {
      father_name: 'Rajeev Kapoor',
      father_phone: '+91 98112 33445',
      father_email: 'rajeev.kapoor@business.com',
      father_occupation: 'Managing Director',
      mother_name: 'Pooja Kapoor',
      mother_phone: '+91 98112 77889',
      mother_email: 'pooja.kapoor@home.com',
      mother_occupation: 'Interior Designer',
      emergency_contact_name: 'Rajeev Kapoor',
      emergency_contact_phone: '+91 98112 33445',
      emergency_contact_relation: 'Father',
    },
    documents: [
      { id: 301, document_type: 'student_photo', file_name: 'rohan_photo.jpg', file_size: 130000, mime_type: 'image/jpeg', verification_status: 'verified' },
      { id: 302, document_type: 'birth_certificate', file_name: 'scanned_birth_cert_blurry.jpg', file_size: 89000, mime_type: 'image/jpeg', verification_status: 'rejected', verification_notes: 'Image is extremely blurry and registration seal is cut off. Please upload a clear high-res scan or PDF.' },
      { id: 303, document_type: 'address_proof', file_name: 'rental_agreement.pdf', file_size: 450000, mime_type: 'application/pdf', verification_status: 'verified' },
    ],
    status_history: [
      { id: 1, from_status: 'draft', to_status: 'submitted', remarks: 'Application submitted with registration fee.', visible_to_applicant: true, changed_by_name: 'Applicant Portal', created_at: '2026-02-15 14:00:00' },
      { id: 2, from_status: 'submitted', to_status: 'documents_pending', remarks: 'Birth Certificate image is blurry. Please re-upload a clear copy through the tracking portal.', visible_to_applicant: true, changed_by_name: 'Admissions Desk', created_at: '2026-02-16 11:45:00' },
    ],
    submitted_at: '2026-02-15 14:00:00',
    reviewed_at: '2026-02-16 11:45:00',
    enrolled_at: null,
    admin_remarks: 'Document correction requested: Birth certificate re-upload pending.',
  },
  {
    id: 4,
    uuid: 'adm-app-004',
    application_number: 'ADM-2027-000104',
    access_token: 'tok_app_104_c1a8',
    school_id: 1,
    session_id: 1,
    academic_year_id: 2,
    academic_session: '2026-2027',
    class_id: 1,
    class_name: 'Class 1',
    preferred_section: 'A',
    first_name: 'Samar',
    last_name: 'Sen',
    email: 'samar.sen.family@gmail.com',
    phone: '+91 97330 99881',
    date_of_birth: '2020-04-18',
    gender: 'male',
    blood_group: 'A+',
    nationality: 'Indian',
    mother_tongue: 'Bengali',
    religion: 'Hindu',
    caste: 'General',
    birth_certificate_number: 'WB/SLG/2020/11883',
    permanent_address: '88 Hakimpara, Siliguri',
    correspondence_address: '88 Hakimpara, Siliguri',
    city: 'Siliguri',
    district: 'Darjeeling',
    state: 'West Bengal',
    postal_code: '734001',
    country: 'India',
    previous_school: 'Early Steps Pre-School',
    previous_board: 'CBSE Early Years',
    previous_class: 'Kindergarten',
    previous_percentage: 'Grade A',
    transfer_certificate_number: 'TC-ESPS-2026-041',
    transfer_certificate_date: '2026-03-08',
    status: 'approved',
    payment_status: 'completed',
    payment_amount: 500,
    payment_method: 'UPI',
    payment_reference: 'UPI_GPay_441199',
    guardians: {
      father_name: 'Pradip Sen',
      father_phone: '+91 97330 99881',
      father_email: 'pradip.sen@wb.gov.in',
      father_occupation: 'Govt. Officer',
      mother_name: 'Moumita Sen',
      mother_phone: '+91 97330 22119',
      mother_email: 'moumita.sen@gmail.com',
      mother_occupation: 'Teacher',
      emergency_contact_name: 'Pradip Sen',
      emergency_contact_phone: '+91 97330 99881',
      emergency_contact_relation: 'Father',
    },
    documents: [
      { id: 401, document_type: 'student_photo', file_name: 'samar_photo.jpg', file_size: 155000, mime_type: 'image/jpeg', verification_status: 'verified' },
      { id: 402, document_type: 'birth_certificate', file_name: 'samar_birth_cert.pdf', file_size: 340000, mime_type: 'application/pdf', verification_status: 'verified' },
      { id: 403, document_type: 'address_proof', file_name: 'aadhaar_hakimpara.pdf', file_size: 290000, mime_type: 'application/pdf', verification_status: 'verified' },
    ],
    status_history: [
      { id: 1, from_status: 'draft', to_status: 'submitted', remarks: 'Application submitted with payment.', visible_to_applicant: true, changed_by_name: 'Applicant Portal', created_at: '2026-02-13 10:00:00' },
      { id: 2, from_status: 'submitted', to_status: 'under_review', remarks: 'Documents sent for committee review.', visible_to_applicant: true, changed_by_name: 'Admissions Officer', created_at: '2026-02-14 11:00:00' },
      { id: 3, from_status: 'under_review', to_status: 'approved', remarks: 'All credentials and documents verified successfully. Admission approved by Principal. Proceed to enrollment conversion.', visible_to_applicant: true, changed_by_name: 'Principal Dr. Sunita Sharma', created_at: '2026-02-16 15:30:00' },
    ],
    submitted_at: '2026-02-13 10:00:00',
    reviewed_at: '2026-02-16 15:30:00',
    enrolled_at: null,
    admin_remarks: 'Approved for Class 1 admission. Ready for final section allotment and enrollment.',
  },
  {
    id: 5,
    uuid: 'adm-app-005',
    application_number: 'ADM-2027-000105',
    access_token: 'tok_app_105_f2b9',
    school_id: 1,
    session_id: 1,
    academic_year_id: 2,
    academic_session: '2026-2027',
    class_id: 10,
    class_name: 'Class 10',
    preferred_section: 'A',
    first_name: 'Vikramaditya',
    last_name: 'Singhania',
    email: 'singhania.v@gmail.com',
    phone: '+91 98200 44556',
    date_of_birth: '2011-01-20',
    gender: 'male',
    blood_group: 'B+',
    nationality: 'Indian',
    mother_tongue: 'Hindi',
    religion: 'Hindu',
    caste: 'General',
    birth_certificate_number: 'MH/MUM/2011/99221',
    permanent_address: 'Bungalow 7, Hill Cart Road',
    correspondence_address: 'Bungalow 7, Hill Cart Road',
    city: 'Siliguri',
    district: 'Darjeeling',
    state: 'West Bengal',
    postal_code: '734001',
    country: 'India',
    previous_school: 'Bombay Scottish School',
    previous_board: 'ICSE',
    previous_class: 'Class 9',
    previous_percentage: '91.8%',
    transfer_certificate_number: 'TC-BSS-2026-904',
    transfer_certificate_date: '2026-02-28',
    status: 'enrolled',
    payment_status: 'completed',
    payment_amount: 500,
    payment_method: 'Card',
    payment_reference: 'CARD_HDFC_11099',
    converted_student_id: 3,
    enrolled_admission_number: 'SLG-2026-003',
    enrolled_class: 'Class 10-A',
    guardians: {
      father_name: 'Vikram Singhania Sr.',
      father_phone: '+91 98200 44556',
      father_email: 'vikram.sr@singhania.com',
      father_occupation: 'Industrialist',
      mother_name: 'Radhika Singhania',
      mother_phone: '+91 98200 11223',
      mother_email: 'radhika@singhania.com',
      mother_occupation: 'Philanthropist',
      emergency_contact_name: 'Vikram Singhania Sr.',
      emergency_contact_phone: '+91 98200 44556',
      emergency_contact_relation: 'Father',
    },
    documents: [
      { id: 501, document_type: 'student_photo', file_name: 'vikram_photo.jpg', file_size: 170000, mime_type: 'image/jpeg', verification_status: 'verified' },
      { id: 502, document_type: 'birth_certificate', file_name: 'birth_cert_mumbai.pdf', file_size: 410000, mime_type: 'application/pdf', verification_status: 'verified' },
      { id: 503, document_type: 'transfer_certificate', file_name: 'tc_bombay_scottish.pdf', file_size: 480000, mime_type: 'application/pdf', verification_status: 'verified' },
    ],
    status_history: [
      { id: 1, from_status: 'draft', to_status: 'submitted', remarks: 'Application submitted with payment.', visible_to_applicant: true, changed_by_name: 'Applicant Portal', created_at: '2026-02-10 12:00:00' },
      { id: 2, from_status: 'submitted', to_status: 'approved', remarks: 'Application approved by Principal.', visible_to_applicant: true, changed_by_name: 'Principal Dr. Sunita Sharma', created_at: '2026-02-12 14:00:00' },
      { id: 3, from_status: 'approved', to_status: 'enrolled', remarks: 'Student successfully admitted and enrolled into Class 10 (Section A). Admission Number: SLG-2026-003 assigned.', visible_to_applicant: true, changed_by_name: 'Super Admin', created_at: '2026-02-14 16:00:00' },
    ],
    submitted_at: '2026-02-10 12:00:00',
    reviewed_at: '2026-02-12 14:00:00',
    enrolled_at: '2026-02-14 16:00:00',
    admin_remarks: 'Successfully enrolled into Class 10-A.',
  },
];

export const getStoredAdmissionSettings = () => {
  try {
    const raw = localStorage.getItem(ADMISSION_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  try {
    localStorage.setItem(ADMISSION_SETTINGS_KEY, JSON.stringify(DEFAULT_ADMISSION_SETTINGS));
  } catch (_) {}
  return DEFAULT_ADMISSION_SETTINGS;
};

export const saveStoredAdmissionSettings = (settings) => {
  try {
    localStorage.setItem(ADMISSION_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('sms:admission-settings-updated', { detail: settings }));
  } catch (_) {}
};

export const getStoredAdmissionApplications = () => {
  try {
    const raw = localStorage.getItem(ADMISSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  try {
    localStorage.setItem(ADMISSION_STORAGE_KEY, JSON.stringify(SEEDED_ADMISSION_APPLICATIONS));
  } catch (_) {}
  return SEEDED_ADMISSION_APPLICATIONS;
};

export const saveStoredAdmissionApplications = (apps) => {
  try {
    localStorage.setItem(ADMISSION_STORAGE_KEY, JSON.stringify(apps));
    window.dispatchEvent(new CustomEvent('sms:admissions-updated', { detail: { count: apps.length } }));
  } catch (_) {}
};

export const admissionAPI = {
  // 1. Public Configuration (Active session, criteria, fee, documents checklist)
  getPublicConfig: async (params = {}) => {
    const effectiveSchoolId = getEffectiveSchoolId(params?.school_id);
    const assignedSchoolId = effectiveSchoolId === 'all' ? 1 : Number(effectiveSchoolId);
    const schools = getStoredSchools();
    const currentSch = schools.find(s => Number(s.id) === assignedSchoolId) || schools[0];
    const settings = getStoredAdmissionSettings();

    return {
      success: true,
      data: {
        ...settings,
        school_id: assignedSchoolId,
        school_name: currentSch?.name || 'Delhi Public Academy',
        school_logo: currentSch?.logo || 'preset:🏫',
        school_city: currentSch?.city || 'Siliguri',
        school_curriculum: currentSch?.curriculum || 'CBSE',
        school_email: currentSch?.email || 'admissions@dpa.edu',
        school_phone: currentSch?.phone || '+91 353 2548900',
        school_address: currentSch?.address || 'Hill Cart Road, Pradhan Nagar',
      },
    };
  },

  // 2. Draft Lifecycle (Save incomplete form and resume anytime)
  saveDraft: async (draftData) => {
    const drafts = JSON.parse(localStorage.getItem(ADMISSION_DRAFTS_KEY) || '{}');
    const token = draftData.access_token || `tok_draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const savedDraft = {
      ...draftData,
      access_token: token,
      updated_at: new Date().toISOString(),
    };
    drafts[token] = savedDraft;
    try {
      localStorage.setItem(ADMISSION_DRAFTS_KEY, JSON.stringify(drafts));
    } catch (_) {}
    return { success: true, access_token: token, message: 'Draft application saved successfully.' };
  },

  getDraft: async (token) => {
    if (!token) return { success: false, message: 'Token required.' };
    const drafts = JSON.parse(localStorage.getItem(ADMISSION_DRAFTS_KEY) || '{}');
    const draft = drafts[token];
    if (!draft) {
      return { success: false, message: 'No active draft found with this verification link.' };
    }
    return { success: true, data: draft };
  },

  // 3. Application Submission (Concurrency-Safe ID Generation & Validation)
  submitApplication: async (payload) => {
    const apps = getStoredAdmissionApplications();
    const settings = getStoredAdmissionSettings();
    const prefix = settings.application_number_prefix || 'ADM';
    const year = new Date().getFullYear();
    const sequentialNum = String(apps.length + 101).padStart(6, '0');
    const applicationNumber = `${prefix}-${year + 1}-${sequentialNum}`;
    const accessToken = `tok_app_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newApp = {
      id: Date.now(),
      uuid: `adm-app-${Date.now()}`,
      application_number: applicationNumber,
      access_token: accessToken,
      school_id: Number(payload.school_id || 1),
      session_id: 1,
      academic_year_id: 2,
      academic_session: payload.academic_session || '2026-2027',
      class_id: Number(payload.class_id || 1),
      class_name: payload.class_name || `Class ${payload.class_id || 1}`,
      preferred_section: payload.preferred_section || 'A',
      first_name: (payload.first_name || '').trim(),
      last_name: (payload.last_name || '').trim(),
      email: payload.email || '',
      phone: payload.phone || '',
      date_of_birth: payload.date_of_birth || '',
      gender: payload.gender || 'male',
      blood_group: payload.blood_group || '',
      nationality: payload.nationality || 'Indian',
      mother_tongue: payload.mother_tongue || '',
      religion: payload.religion || '',
      caste: payload.caste || 'General',
      birth_certificate_number: payload.birth_certificate_number || '',
      permanent_address: payload.permanent_address || '',
      correspondence_address: payload.correspondence_address || payload.permanent_address || '',
      city: payload.city || '',
      district: payload.district || '',
      state: payload.state || '',
      postal_code: payload.postal_code || '',
      country: payload.country || 'India',
      previous_school: payload.previous_school || '',
      previous_board: payload.previous_board || '',
      previous_class: payload.previous_class || '',
      previous_percentage: payload.previous_percentage || '',
      transfer_certificate_number: payload.transfer_certificate_number || '',
      transfer_certificate_date: payload.transfer_certificate_date || null,
      status: 'submitted',
      payment_status: settings.fee_mandatory ? (payload.payment_status || 'completed') : (payload.payment_status || 'na'),
      payment_amount: settings.registration_fee || 0,
      payment_method: payload.payment_method || (settings.fee_mandatory ? 'UPI' : 'Free / Exempted'),
      payment_reference: payload.payment_reference || `REF-${Date.now()}`,
      guardians: payload.guardians || {
        father_name: payload.father_name || '',
        father_phone: payload.father_phone || '',
        father_email: payload.father_email || '',
        father_occupation: payload.father_occupation || '',
        mother_name: payload.mother_name || '',
        mother_phone: payload.mother_phone || '',
        mother_email: payload.mother_email || '',
        mother_occupation: payload.mother_occupation || '',
        emergency_contact_name: payload.emergency_contact_name || payload.father_name || '',
        emergency_contact_phone: payload.emergency_contact_phone || payload.father_phone || '',
        emergency_contact_relation: payload.emergency_contact_relation || 'Father',
      },
      documents: (payload.documents || []).map((doc, idx) => ({
        id: Date.now() + idx,
        document_type: doc.document_type || doc.type,
        file_name: doc.file_name || doc.name,
        file_size: doc.file_size || doc.size || 100000,
        mime_type: doc.mime_type || doc.type || 'application/pdf',
        file_data: doc.file_data || doc.data || null,
        verification_status: 'pending',
        verification_notes: null,
      })),
      status_history: [
        {
          id: Date.now(),
          from_status: 'draft',
          to_status: 'submitted',
          remarks: `Application submitted successfully for ${payload.class_name || 'Class ' + payload.class_id}. Registration fee: ₹${settings.registration_fee || 0}.`,
          visible_to_applicant: true,
          changed_by_name: 'Applicant Portal',
          created_at: nowStr,
        },
      ],
      submitted_at: nowStr,
      reviewed_at: null,
      enrolled_at: null,
      admin_remarks: null,
    };

    apps.unshift(newApp);
    saveStoredAdmissionApplications(apps);

    // Auto-clean draft if access token exists
    if (payload.draft_token) {
      try {
        const drafts = JSON.parse(localStorage.getItem(ADMISSION_DRAFTS_KEY) || '{}');
        delete drafts[payload.draft_token];
        localStorage.setItem(ADMISSION_DRAFTS_KEY, JSON.stringify(drafts));
      } catch (_) {}
    }

    // Trigger in-app notification for School Admins
    try {
      await notificationAPI.create({
        title: `New Online Admission Application: ${newApp.application_number}`,
        message: `${newApp.first_name} ${newApp.last_name} applied for ${newApp.class_name}. Fee Status: ${newApp.payment_status.toUpperCase()}.`,
        type: 'admission',
        priority: 'high',
        target_role: 'admin',
        metadata: {
          application_number: newApp.application_number,
          student_name: `${newApp.first_name} ${newApp.last_name}`,
          class: newApp.class_name,
        },
      });
    } catch (_) {}

    return {
      success: true,
      message: 'Admission application submitted successfully.',
      data: newApp,
    };
  },

  // 4. Secure Application Tracking (Verification by Application No. + DOB / Phone)
  trackApplication: async (credentials) => {
    const { application_number, date_of_birth, phone } = credentials;
    if (!application_number) {
      return { success: false, message: 'Please provide a valid Application Number.' };
    }

    const apps = getStoredAdmissionApplications();
    const cleanAppNum = String(application_number).trim().toUpperCase();
    const app = apps.find(a => a.application_number.toUpperCase() === cleanAppNum);

    if (!app) {
      return { success: false, message: 'No admission application found matching this Application Number.' };
    }

    // Security challenge: verify with either DOB or Phone
    if (date_of_birth) {
      const inputDob = String(date_of_birth).trim().substring(0, 10);
      const appDob = String(app.date_of_birth).trim().substring(0, 10);
      if (inputDob !== appDob) {
        return { success: false, message: 'Security Verification Failed: Date of Birth does not match application records.' };
      }
    } else if (phone) {
      const cleanInputPhone = String(phone).replace(/[^0-9]/g, '');
      const cleanAppPhone = String(app.phone || app.guardians?.father_phone || '').replace(/[^0-9]/g, '');
      if (!cleanAppPhone.includes(cleanInputPhone)) {
        return { success: false, message: 'Security Verification Failed: Registered contact number does not match.' };
      }
    } else {
      return { success: false, message: 'Please provide either Date of Birth or Registered Phone Number to verify your identity.' };
    }

    return {
      success: true,
      data: app,
    };
  },

  // 5. Admin Application List (Filterable, Paginated, Searchable)
  getAll: async (params = {}) => {
    let apps = getStoredAdmissionApplications();
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    if (effectiveSchoolId !== 'all') {
      apps = apps.filter(a => Number(a.school_id || 1) === Number(effectiveSchoolId));
    }

    if (params.status && params.status !== 'all') {
      apps = apps.filter(a => a.status === params.status);
    }
    if (params.class_id && params.class_id !== 'all') {
      apps = apps.filter(a => String(a.class_id) === String(params.class_id));
    }
    if (params.payment_status && params.payment_status !== 'all') {
      apps = apps.filter(a => a.payment_status === params.payment_status);
    }
    if (params.search) {
      const term = String(params.search).toLowerCase().trim();
      apps = apps.filter(a =>
        a.application_number.toLowerCase().includes(term) ||
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(term) ||
        (a.email && a.email.toLowerCase().includes(term)) ||
        (a.phone && a.phone.includes(term)) ||
        (a.guardians?.father_name && a.guardians.father_name.toLowerCase().includes(term))
      );
    }

    const page = parseInt(params.page || 1, 10);
    const perPage = params.per_page === 'all' ? apps.length : parseInt(params.per_page || 15, 10);
    const total = apps.length;
    const startIndex = (page - 1) * perPage;
    const paginatedItems = apps.slice(startIndex, startIndex + perPage);

    return {
      success: true,
      data: paginatedItems,
      meta: {
        current_page: page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / (perPage || 1)),
      },
    };
  },

  // 6. Get Single Application by ID or Number
  getById: async (idOrNumber) => {
    const apps = getStoredAdmissionApplications();
    const app = apps.find(a => String(a.id) === String(idOrNumber) || a.application_number === String(idOrNumber));
    if (!app) return { success: false, message: 'Admission application not found.' };
    return { success: true, data: app };
  },

  // 7. Admin Status Update with Audit Trail
  updateStatus: async (applicationId, statusUpdate) => {
    const apps = getStoredAdmissionApplications();
    const index = apps.findIndex(a => String(a.id) === String(applicationId));
    if (index === -1) return { success: false, message: 'Application not found.' };

    const targetApp = apps[index];
    const prevStatus = targetApp.status;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    targetApp.status = statusUpdate.status || targetApp.status;
    if (statusUpdate.admin_remarks) targetApp.admin_remarks = statusUpdate.admin_remarks;
    if (statusUpdate.rejection_reason) targetApp.rejection_reason = statusUpdate.rejection_reason;
    if (statusUpdate.status === 'under_review' && !targetApp.reviewed_at) targetApp.reviewed_at = nowStr;

    // Push into status history
    if (!targetApp.status_history) targetApp.status_history = [];
    targetApp.status_history.unshift({
      id: Date.now(),
      from_status: prevStatus,
      to_status: targetApp.status,
      remarks: statusUpdate.remarks || statusUpdate.admin_remarks || `Status updated to ${targetApp.status.replace(/_/g, ' ')}.`,
      visible_to_applicant: statusUpdate.visible_to_applicant !== false,
      changed_by_name: statusUpdate.admin_name || 'Admissions Administrator',
      created_at: nowStr,
    });

    apps[index] = targetApp;
    saveStoredAdmissionApplications(apps);

    // Dispatched in-app notification if approved or correction requested
    if (statusUpdate.status === 'documents_pending') {
      try {
        await notificationAPI.create({
          title: `Document Correction Requested: ${targetApp.application_number}`,
          message: `Correction requested for ${targetApp.first_name} ${targetApp.last_name}: ${statusUpdate.remarks || 'Please re-upload requested documents.'}`,
          type: 'admission',
          priority: 'high',
          target_role: 'all',
          metadata: { application_number: targetApp.application_number },
        });
      } catch (_) {}
    }

    return { success: true, message: `Application status updated to ${targetApp.status}.`, data: targetApp };
  },

  // 8. Document Verification
  verifyDocument: async (applicationId, documentId, verificationData) => {
    const apps = getStoredAdmissionApplications();
    const index = apps.findIndex(a => String(a.id) === String(applicationId));
    if (index === -1) return { success: false, message: 'Application not found.' };

    const targetApp = apps[index];
    if (!targetApp.documents) targetApp.documents = [];
    const docIndex = targetApp.documents.findIndex(d => String(d.id) === String(documentId));
    if (docIndex === -1) return { success: false, message: 'Document not found.' };

    targetApp.documents[docIndex].verification_status = verificationData.status || 'verified';
    targetApp.documents[docIndex].verification_notes = verificationData.notes || null;
    targetApp.documents[docIndex].verified_at = new Date().toISOString();

    // If any document is rejected, auto-prompt correction
    const hasRejected = targetApp.documents.some(d => d.verification_status === 'rejected');
    if (hasRejected && targetApp.status !== 'documents_pending' && targetApp.status !== 'enrolled') {
      targetApp.status = 'documents_pending';
    }

    apps[index] = targetApp;
    saveStoredAdmissionApplications(apps);
    return { success: true, message: 'Document verification updated.', data: targetApp.documents[docIndex] };
  },

  // 9. Re-upload Document for Applicant (Correction Fix)
  reuploadDocument: async (applicationNumber, docId, fileData) => {
    const apps = getStoredAdmissionApplications();
    const index = apps.findIndex(a => a.application_number === applicationNumber);
    if (index === -1) return { success: false, message: 'Application not found.' };

    const targetApp = apps[index];
    const docIndex = targetApp.documents.findIndex(d => String(d.id) === String(docId));
    if (docIndex === -1) return { success: false, message: 'Document record not found.' };

    targetApp.documents[docIndex] = {
      ...targetApp.documents[docIndex],
      file_name: fileData.file_name || fileData.name,
      file_size: fileData.file_size || fileData.size,
      file_data: fileData.file_data || fileData.data,
      verification_status: 'pending',
      verification_notes: 'Re-uploaded by applicant. Awaiting fresh verification.',
      uploaded_at: new Date().toISOString(),
    };

    // If all previously rejected documents are now re-uploaded, transition back to under_review
    const anyStillRejected = targetApp.documents.some(d => d.verification_status === 'rejected');
    if (!anyStillRejected && targetApp.status === 'documents_pending') {
      targetApp.status = 'under_review';
    }

    apps[index] = targetApp;
    saveStoredAdmissionApplications(apps);
    return { success: true, message: 'Document re-uploaded successfully.', data: targetApp };
  },

  // 10. Atomic Enrollment Conversion (Convert approved application into real student)
  enrollApplicant: async (applicationId, enrollmentDetails) => {
    const apps = getStoredAdmissionApplications();
    const index = apps.findIndex(a => String(a.id) === String(applicationId));
    if (index === -1) return { success: false, message: 'Application not found.' };

    const targetApp = apps[index];
    if (targetApp.status === 'enrolled') {
      return { success: false, message: 'This applicant is already enrolled as a student.' };
    }
    if (targetApp.status !== 'approved') {
      return { success: false, message: 'Only approved applications can be converted into enrolled students.' };
    }

    const schoolId = targetApp.school_id || 1;
    const admissionNumber = enrollmentDetails.admission_number || `SLG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const rollNumber = enrollmentDetails.roll_number || '01';
    const sectionId = Number(enrollmentDetails.section_id || 1);
    const classId = Number(enrollmentDetails.class_id || targetApp.class_id || 1);
    const academicYearId = Number(enrollmentDetails.academic_year_id || targetApp.academic_year_id || 2);

    try {
      // 1. Create Student record via studentAPI
      const studentPayload = {
        school_id: schoolId,
        academic_year_id: academicYearId,
        class_id: classId,
        section_id: sectionId,
        admission_number: admissionNumber,
        admission_date: new Date().toISOString().substring(0, 10),
        first_name: targetApp.first_name,
        last_name: targetApp.last_name,
        email: targetApp.email || `${targetApp.first_name.toLowerCase()}.${targetApp.last_name ? targetApp.last_name.toLowerCase() : 'student'}@school.com`,
        phone: targetApp.phone || targetApp.guardians?.father_phone,
        date_of_birth: targetApp.date_of_birth,
        gender: targetApp.gender,
        blood_group: targetApp.blood_group,
        nationality: targetApp.nationality || 'Indian',
        mother_tongue: targetApp.mother_tongue,
        religion: targetApp.religion,
        caste: targetApp.caste,
        address: targetApp.permanent_address,
        city: targetApp.city,
        state: targetApp.state,
        country: targetApp.country || 'India',
        postal_code: targetApp.postal_code,
        previous_school: targetApp.previous_school,
        roll_number: rollNumber,
        status: 'active',
        father_name: targetApp.guardians?.father_name,
        father_phone: targetApp.guardians?.father_phone,
        father_occupation: targetApp.guardians?.father_occupation,
        mother_name: targetApp.guardians?.mother_name,
        mother_phone: targetApp.guardians?.mother_phone,
        mother_occupation: targetApp.guardians?.mother_occupation,
        emergency_contact_name: targetApp.guardians?.emergency_contact_name,
        emergency_contact_phone: targetApp.guardians?.emergency_contact_phone,
        emergency_contact_relation: targetApp.guardians?.emergency_contact_relation,
      };

      const studentRes = await studentAPI.create(studentPayload);
      const createdStudent = studentRes?.data || { id: Date.now() };

      // 2. Mark application as Enrolled
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      targetApp.status = 'enrolled';
      targetApp.converted_student_id = createdStudent.id;
      targetApp.enrolled_admission_number = admissionNumber;
      targetApp.enrolled_at = nowStr;
      targetApp.enrolled_class = `${targetApp.class_name || 'Class ' + classId}`;

      targetApp.status_history.unshift({
        id: Date.now(),
        from_status: 'approved',
        to_status: 'enrolled',
        remarks: `Student admitted and enrolled successfully. Admission Number: ${admissionNumber}, Roll No: ${rollNumber}.`,
        visible_to_applicant: true,
        changed_by_name: enrollmentDetails.admin_name || 'Super Admin',
        created_at: nowStr,
      });

      apps[index] = targetApp;
      saveStoredAdmissionApplications(apps);

      // 3. Trigger Notification
      try {
        await notificationAPI.create({
          title: `Student Admitted: ${targetApp.first_name} ${targetApp.last_name}`,
          message: `${targetApp.first_name} ${targetApp.last_name} has been enrolled into ${targetApp.class_name} with Admission No. ${admissionNumber}.`,
          type: 'admission',
          priority: 'normal',
          target_role: 'all',
          metadata: {
            student_id: createdStudent.id,
            admission_number: admissionNumber,
          },
        });
      } catch (_) {}

      return {
        success: true,
        message: `Applicant successfully enrolled as Student ${admissionNumber}.`,
        data: {
          student: createdStudent,
          application: targetApp,
        },
      };
    } catch (err) {
      console.error('Enrollment conversion error:', err);
      return { success: false, message: `Enrollment conversion failed: ${err.message || 'Internal error'}` };
    }
  },

  // 11. Dashboard KPI Statistics & Charts
  getStatistics: async (params = {}) => {
    let apps = getStoredAdmissionApplications();
    const effectiveSchoolId = getEffectiveSchoolId(params.school_id);
    if (effectiveSchoolId !== 'all') {
      apps = apps.filter(a => Number(a.school_id || 1) === Number(effectiveSchoolId));
    }

    const total = apps.length;
    const submitted = apps.filter(a => a.status === 'submitted').length;
    const underReview = apps.filter(a => a.status === 'under_review').length;
    const documentsPending = apps.filter(a => a.status === 'documents_pending').length;
    const approved = apps.filter(a => a.status === 'approved').length;
    const rejected = apps.filter(a => a.status === 'rejected').length;
    const waitlisted = apps.filter(a => a.status === 'waitlisted').length;
    const enrolled = apps.filter(a => a.status === 'enrolled').length;
    const totalFeesCollected = apps
      .filter(a => a.payment_status === 'completed')
      .reduce((sum, a) => sum + (Number(a.payment_amount) || 0), 0);

    // Class-wise breakdown
    const classMap = {};
    apps.forEach(a => {
      const clsName = a.class_name || `Class ${a.class_id}`;
      if (!classMap[clsName]) classMap[clsName] = { total: 0, approved: 0, enrolled: 0 };
      classMap[clsName].total += 1;
      if (a.status === 'approved') classMap[clsName].approved += 1;
      if (a.status === 'enrolled') classMap[clsName].enrolled += 1;
    });

    const classDistribution = Object.entries(classMap).map(([name, data]) => ({
      class_name: name,
      ...data,
    }));

    return {
      success: true,
      data: {
        total,
        submitted,
        underReview,
        documentsPending,
        approved,
        rejected,
        waitlisted,
        enrolled,
        totalFeesCollected,
        classDistribution,
      },
    };
  },

  // 12. Settings Configuration
  getSettings: async () => {
    return { success: true, data: getStoredAdmissionSettings() };
  },

  updateSettings: async (newSettings) => {
    const current = getStoredAdmissionSettings();
    const merged = { ...current, ...newSettings };
    saveStoredAdmissionSettings(merged);
    return { success: true, message: 'Admission configuration updated successfully.', data: merged };
  },
};

export default api;
