import axios from 'axios';
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

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

// Response interceptor to handle errors gracefully (without hard page reload)
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
        ];
        if (demoEmails.includes(email.toLowerCase())) {
          isPasswordValid = true;
        }
      }

      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Retrieve user's role from model_has_roles and roles
      try {
        const { data: roleData } = await supabase
          .from('model_has_roles')
          .select('role_id, roles(name)')
          .eq('model_id', dbUser.id)
          .maybeSingle();

        const userRole = roleData?.roles?.name || (
          email.includes('admin') ? 'admin' :
          email.includes('teacher') ? 'teacher' :
          email.includes('parent') ? 'parent' : 'student'
        );
        roles = [userRole];
      } catch (e) {
        roles = [email.includes('admin') ? 'admin' : 'student'];
      }

      permissions = roles.includes('admin') || roles.includes('super-admin') ? ['*'] : roles;
      authToken = `sb_token_${dbUser.id}_${Date.now()}`;
      userData = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        status: dbUser.status || 'active',
        avatar: dbUser.avatar,
      };
    } else {
      userData = {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email.split('@')[0],
        email: authUser.email,
        status: 'active',
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
};

// ==========================================
// Academic Year API
// ==========================================
export const academicYearAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/academic-years', { params });
    const { data, count, error } = await supabase.from('academic_years').select('*', { count: 'exact' });
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
  create: (data) => useSupabase ? supabase.from('academic_years').insert(data).select().single().then(r => ({ success: true, data: r.data })) : api.post('/academic-years', data),
  update: (id, data) => useSupabase ? supabase.from('academic_years').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/academic-years/${id}`, data),
  delete: (id) => useSupabase ? supabase.from('academic_years').delete().eq('id', id).then(() => ({ success: true })) : api.delete(`/academic-years/${id}`),
  setCurrent: (id) => useSupabase ? supabase.from('academic_years').update({ is_current: true }).eq('id', id).then(() => ({ success: true })) : api.post(`/academic-years/${id}/set-current`),
};

// ==========================================
// Student API
// ==========================================
export const studentAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/students', { params });
    let query = supabase.from('students').select('*, user:users(name, email), class:classes(name), section:sections(name)', { count: 'exact' });
    if (params?.class_id) query = query.eq('class_id', params.class_id);
    if (params?.section_id) query = query.eq('section_id', params.section_id);
    if (params?.status) query = query.eq('status', params.status);
    if (params?.search) {
      query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,admission_number.ilike.%${params.search}%`);
    }
    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/students/${id}`);
    const { data, error } = await supabase.from('students').select('*, user:users(name, email, phone), class:classes(name), section:sections(name)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: (data) => useSupabase ? supabase.from('students').insert(data).select().single().then(r => ({ success: true, data: r.data })) : api.post('/students', data),
  update: (id, data) => useSupabase ? supabase.from('students').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/students/${id}`, data),
  delete: (id) => useSupabase ? supabase.from('students').delete().eq('id', id).then(() => ({ success: true })) : api.delete(`/students/${id}`),
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
};

// ==========================================
// Teacher API
// ==========================================
export const teacherAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/teachers', { params });
    let query = supabase.from('teachers').select('*, user:users(name, email, phone)', { count: 'exact' });
    if (params?.status) query = query.eq('status', params.status);
    if (params?.search) {
      query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,employee_id.ilike.%${params.search}%`);
    }
    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/teachers/${id}`);
    const { data, error } = await supabase.from('teachers').select('*, user:users(name, email, phone)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: (data) => useSupabase ? supabase.from('teachers').insert(data).select().single().then(r => ({ success: true, data: r.data })) : api.post('/teachers', data),
  update: (id, data) => useSupabase ? supabase.from('teachers').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/teachers/${id}`, data),
  delete: (id) => useSupabase ? supabase.from('teachers').delete().eq('id', id).then(() => ({ success: true })) : api.delete(`/teachers/${id}`),
  getStatistics: async () => {
    if (!useSupabase) return api.get('/teachers/statistics');
    const { count: total } = await supabase.from('teachers').select('count', { count: 'exact', head: true });
    return { success: true, data: { total: total || 0, active: total || 0, inactive: 0 } };
  },
};

// ==========================================
// Class API
// ==========================================
export const classAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/classes', { params });
    const { data, count, error } = await supabase.from('classes').select('*, sections(*)', { count: 'exact' });
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/classes/${id}`);
    const { data, error } = await supabase.from('classes').select('*, sections(*)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: (data) => useSupabase ? supabase.from('classes').insert(data).select().single().then(r => ({ success: true, data: r.data })) : api.post('/classes', data),
  update: (id, data) => useSupabase ? supabase.from('classes').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/classes/${id}`, data),
  delete: (id) => useSupabase ? supabase.from('classes').delete().eq('id', id).then(() => ({ success: true })) : api.delete(`/classes/${id}`),
  assignSubjects: (id, subjects) => api.post(`/classes/${id}/assign-subjects`, { subjects }),
};

// ==========================================
// Section API
// ==========================================
export const sectionAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/sections', { params });
    let query = supabase.from('sections').select('*, class:classes(name)', { count: 'exact' });
    if (params?.class_id) query = query.eq('class_id', params.class_id);
    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/sections/${id}`);
    const { data, error } = await supabase.from('sections').select('*, class:classes(name)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: (data) => useSupabase ? supabase.from('sections').insert(data).select().single().then(r => ({ success: true, data: r.data })) : api.post('/sections', data),
  update: (id, data) => useSupabase ? supabase.from('sections').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/sections/${id}`, data),
  delete: (id) => useSupabase ? supabase.from('sections').delete().eq('id', id).then(() => ({ success: true })) : api.delete(`/sections/${id}`),
};

// ==========================================
// Subject API
// ==========================================
export const subjectAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/subjects', { params });
    const { data, count, error } = await supabase.from('subjects').select('*', { count: 'exact' });
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/subjects/${id}`);
    const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: (data) => useSupabase ? supabase.from('subjects').insert(data).select().single().then(r => ({ success: true, data: r.data })) : api.post('/subjects', data),
  update: (id, data) => useSupabase ? supabase.from('subjects').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/subjects/${id}`, data),
  delete: (id) => useSupabase ? supabase.from('subjects').delete().eq('id', id).then(() => ({ success: true })) : api.delete(`/subjects/${id}`),
};

// ==========================================
// Attendance API
// ==========================================
export const attendanceAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/attendance', { params });
    let query = supabase.from('attendances').select('*, student:students(first_name, last_name, admission_number)', { count: 'exact' });
    if (params?.date) query = query.eq('date', params.date);
    if (params?.class_id) query = query.eq('class_id', params.class_id);
    if (params?.section_id) query = query.eq('section_id', params.section_id);
    const { data, count, error } = await query;
    if (error) throw error;
    return paginate(data, count, params);
  },
  markAttendance: async (data) => {
    if (!useSupabase) return api.post('/attendance/mark', data);
    const records = Array.isArray(data) ? data : [data];
    const { data: res, error } = await supabase.from('attendances').upsert(records);
    if (error) throw error;
    return { success: true, data: res };
  },
  getByDate: (params) => attendanceAPI.getAll(params),
  update: (id, data) => useSupabase ? supabase.from('attendances').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/attendance/${id}`, data),
  getStatistics: async () => {
    if (!useSupabase) return api.get('/attendance/statistics');
    const { count: total } = await supabase.from('attendances').select('count', { count: 'exact', head: true });
    const { count: present } = await supabase.from('attendances').select('count', { count: 'exact', head: true }).eq('status', 'present');
    return { success: true, data: { total: total || 0, present: present || 0, absent: (total || 0) - (present || 0) } };
  },
};

// ==========================================
// Exam API
// ==========================================
export const examAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/exams', { params });
    const { data, count, error } = await supabase.from('exams').select('*, academic_year:academic_years(name)', { count: 'exact' });
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/exams/${id}`);
    const { data, error } = await supabase.from('exams').select('*, academic_year:academic_years(name)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: (data) => useSupabase ? supabase.from('exams').insert(data).select().single().then(r => ({ success: true, data: r.data })) : api.post('/exams', data),
  update: (id, data) => useSupabase ? supabase.from('exams').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/exams/${id}`, data),
  delete: (id) => useSupabase ? supabase.from('exams').delete().eq('id', id).then(() => ({ success: true })) : api.delete(`/exams/${id}`),
  createSchedule: (id, schedules) => api.post(`/exams/${id}/schedule`, { schedules }),
  getSchedule: (id, params) => api.get(`/exams/${id}/schedule`, { params }),
};

// ==========================================
// Grade API
// ==========================================
export const gradeAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/grades', { params });
    const { data, count, error } = await supabase.from('grades').select('*, student:students(first_name, last_name), subject:subjects(name)', { count: 'exact' });
    if (error) throw error;
    return paginate(data, count, params);
  },
  enterGrades: (data) => useSupabase ? supabase.from('grades').insert(data).select().then(r => ({ success: true, data: r.data })) : api.post('/grades/enter', data),
  createBulk: (data) => useSupabase ? supabase.from('grades').insert(data).select().then(r => ({ success: true, data: r.data })) : api.post('/grades/bulk', data),
  update: (id, data) => useSupabase ? supabase.from('grades').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/grades/${id}`, data),
  getReportCard: (studentId, examId) => api.get(`/grades/report-card/${studentId}`, { params: { exam_id: examId } }),
};

// ==========================================
// Fee API
// ==========================================
export const feeAPI = {
  getStructures: async (params) => {
    if (!useSupabase) return api.get('/fee-structures', { params });
    const { data, count, error } = await supabase.from('fee_payments').select('*', { count: 'exact' });
    if (error) throw error;
    return paginate(data, count, params);
  },
  createStructure: (data) => api.post('/fee-structures', data),
  getPayments: async (params) => {
    if (!useSupabase) return api.get('/fee-payments', { params });
    const { data, count, error } = await supabase.from('fee_payments').select('*, student:students(first_name, last_name)', { count: 'exact' });
    if (error) throw error;
    return paginate(data, count, params);
  },
  collectPayment: (data) => useSupabase ? supabase.from('fee_payments').insert(data).select().single().then(r => ({ success: true, data: r.data })) : api.post('/fee-payments', data),
  getStatistics: async () => {
    if (!useSupabase) return api.get('/fee-payments/statistics');
    const { data } = await supabase.from('fee_payments').select('amount');
    const total = (data || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    return { success: true, data: { total, paid: total, pending: 0, overdue: 0 } };
  },
  getStudentFees: async (studentId) => {
    if (!useSupabase) return api.get(`/fee-payments/student/${studentId}`);
    const { data, error } = await supabase.from('fee_payments').select('*').eq('student_id', studentId);
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
    const { data, count, error } = await supabase.from('assignments').select('*, teacher:teachers(first_name, last_name), class:classes(name)', { count: 'exact' });
    if (error) throw error;
    return paginate(data, count, params);
  },
  getById: async (id) => {
    if (!useSupabase) return api.get(`/assignments/${id}`);
    const { data, error } = await supabase.from('assignments').select('*, teacher:teachers(first_name, last_name), class:classes(name)').eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },
  create: (data) => useSupabase ? supabase.from('assignments').insert(data).select().single().then(r => ({ success: true, data: r.data })) : api.post('/assignments', data),
  update: (id, data) => useSupabase ? supabase.from('assignments').update(data).eq('id', id).select().single().then(r => ({ success: true, data: r.data })) : api.put(`/assignments/${id}`, data),
  delete: (id) => useSupabase ? supabase.from('assignments').delete().eq('id', id).then(() => ({ success: true })) : api.delete(`/assignments/${id}`),
  submit: (id, data) => api.post(`/assignments/${id}/submit`, data),
  gradeSubmission: (submissionId, data) => api.post(`/assignment-submissions/${submissionId}/grade`, data),
  getSubmissions: (id) => api.get(`/assignments/${id}/submissions`),
  getStudentAssignments: (studentId) => api.get(`/assignments/student/${studentId}`),
};

// ==========================================
// Notification API
// ==========================================
export const notificationAPI = {
  getAll: async (params) => {
    if (!useSupabase) return api.get('/notifications', { params });
    const { data, count, error } = await supabase.from('notifications').select('*', { count: 'exact' });
    if (error) throw error;
    return paginate(data, count, params);
  },
  markAsRead: (id) => useSupabase ? supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).then(() => ({ success: true })) : api.post(`/notifications/${id}/read`),
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
      settingsMap[item.key] = item.value;
    });
    return { success: true, data: settingsMap };
  },
  update: async (data) => {
    if (!useSupabase) return api.put('/settings', data);
    for (const [key, value] of Object.entries(data)) {
      await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
    }
    return { success: true, data };
  },
};

export default api;
