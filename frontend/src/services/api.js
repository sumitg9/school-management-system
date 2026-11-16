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
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (dbError || !dbUser) {
        throw new Error('Invalid email or password');
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
      permissions = roles.includes('admin') || roles.includes('super-admin') ? ['*'] : roles;
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
    } else {
      userData = {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email.split('@')[0],
        email: authUser.email,
        status: 'active',
        role: roles[0],
        roles: roles,
      };
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
    status: 'active',
    gender: 'male',
    address: 'Civil Lines',
    city: 'New Delhi',
    created_at: '2025-10-12T00:00:00.000Z',
  },
];

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

  create: async (userData) => {
    const listRes = await userAPI.getAll({ per_page: 'all' });
    const exists = listRes.data.some(u => u.email?.toLowerCase() === userData.email?.toLowerCase().trim());
    if (exists) {
      throw new Error(`A user with email "${userData.email}" already exists.`);
    }

    const newId = `user_${Date.now()}`;
    const newUser = {
      id: newId,
      name: userData.name?.trim(),
      email: userData.email?.toLowerCase().trim(),
      phone: userData.phone?.trim() || '',
      role: userData.role || 'student',
      roles: [userData.role || 'student'],
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

  update: async (id, userData) => {
    if (userData.email === 'superadmin@school.com' && userData.role && userData.role !== 'super-admin') {
      throw new Error('Root Super Admin role cannot be changed.');
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
        const listRes = await userAPI.getAll({ per_page: 'all' });
        const existing = listRes.data.find(u => String(u.id) === String(id));
        if (existing) {
          customList.push({ ...existing, ...userData });
        }
      }
      localStorage.setItem('sms_custom_users', JSON.stringify(customList));
    } catch (_) {}

    return { success: true, message: 'User updated successfully!' };
  },

  delete: async (id, currentUser) => {
    if (String(id) === String(currentUser?.id)) {
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

    if (target.role === 'super-admin' && currentUser?.roles?.[0] !== 'super-admin') {
      throw new Error('Only a Super Admin can delete another Super Admin.');
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

  resetPassword: async (id, newPassword) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
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

    const { data, count, error } = await query;
    if (error) throw error;

    // Enhance students with direct email and phone for list view
    const enhancedData = (data || []).map(s => ({
      ...s,
      email: s.user?.email || s.email,
      phone: s.user?.phone || s.phone,
    }));

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
      'status', 'notes'
    ];

    const studentPayload = { user_id: userId };
    for (const col of studentCols) {
      if (formData[col] !== undefined) {
        studentPayload[col] = formData[col] === '' ? null : formData[col];
      }
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

  delete: async (id) => {
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

    const { data, count, error } = await query;
    if (error) throw error;

    const enhancedData = (data || []).map(t => ({
      ...t,
      email: t.user?.email || t.email,
      phone: t.user?.phone || t.phone,
    }));

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
      'employment_type', 'status', 'notes'
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

  delete: async (id) => {
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

// Sanitizer for Class database payload (classes table only has name, numeric_name, order, description, status)
const cleanClassPayload = (data) => {
  const allowed = ['name', 'numeric_name', 'order', 'description', 'status'];
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
  delete: async (id) => {
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

    const { data, count, error } = await query;
    if (error) throw error;
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

    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  collectPayment: async (data) => {
    if (!useSupabase) return api.post('/fee-payments', data);
    const amount = parseFloat(data.amount || 0);
    const discount = parseFloat(data.discount || 0);
    const fine = parseFloat(data.fine || 0);
    const totalAmount = data.total_amount !== undefined ? parseFloat(data.total_amount) : (amount - discount + fine);
    const todayStr = new Date().toISOString().slice(0, 10);
    const receiptNum = data.receipt_number || `RCP-${todayStr.replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;

    const payload = {
      ...data,
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

    const rowsToInsert = items.map((item, idx) => ({
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
      receipt_number: items.length > 1 ? `${receiptNum}-${idx + 1}` : receiptNum,
      status: 'completed',
    }));

    if (rowsToInsert.length === 0 && data.fee_structure_id) {
      rowsToInsert.push({
        student_id: data.student_id,
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
    const newItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
    if (!useSupabase) return api.get('/settings');
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    const settingsMap = {};
    (data || []).forEach(item => {
      let val = item.value;
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try {
          val = JSON.parse(val);
        } catch {
          // keep as string
        }
      }
      settingsMap[item.key] = val;
    });
    return { success: true, data: settingsMap };
  },
  update: async (data) => {
    if (!useSupabase) return api.put('/settings', data);
    for (const [key, value] of Object.entries(data)) {
      const valStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
      const { error } = await supabase.from('settings').upsert({ key, value: valStr }, { onConflict: 'key' });
      if (error) throw error;
    }
    return { success: true, data };
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
    return { success: true, data: found };
  },

  create: async (eventData) => {
    const items = getStoredEvents();
    const newId = `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newEvent = {
      id: newId,
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

export default api;
