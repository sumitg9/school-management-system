import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Authentication API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Academic Year API
export const academicYearAPI = {
  getAll: (params) => api.get('/academic-years', { params }),
  getById: (id) => api.get(`/academic-years/${id}`),
  create: (data) => api.post('/academic-years', data),
  update: (id, data) => api.put(`/academic-years/${id}`, data),
  delete: (id) => api.delete(`/academic-years/${id}`),
  getCurrent: () => api.get('/academic-years/current'),
  setCurrent: (id) => api.post(`/academic-years/${id}/set-current`),
};

// Student API
export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  getStatistics: () => api.get('/students/statistics'),
  downloadTemplate: () => api.get('/students/template', { responseType: 'blob' }),
  import: (formData) => api.post('/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Teacher API
export const teacherAPI = {
  getAll: (params) => api.get('/teachers', { params }),
  getById: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  getStatistics: () => api.get('/teachers/statistics'),
};

// Class API
export const classAPI = {
  getAll: (params) => api.get('/classes', { params }),
  getById: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  assignSubjects: (id, subjects) => api.post(`/classes/${id}/assign-subjects`, { subjects }),
};

// Section API
export const sectionAPI = {
  getAll: (params) => api.get('/sections', { params }),
  getById: (id) => api.get(`/sections/${id}`),
  create: (data) => api.post('/sections', data),
  update: (id, data) => api.put(`/sections/${id}`, data),
  delete: (id) => api.delete(`/sections/${id}`),
};

// Subject API
export const subjectAPI = {
  getAll: (params) => api.get('/subjects', { params }),
  getById: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

// Attendance API
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  markAttendance: (data) => api.post('/attendance/mark', data),
  getByDate: (params) => api.get('/attendance/by-date', { params }),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  getStatistics: (params) => api.get('/attendance/statistics', { params }),
};

// Exam API
export const examAPI = {
  getAll: (params) => api.get('/exams', { params }),
  getById: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  createSchedule: (id, schedules) => api.post(`/exams/${id}/schedule`, { schedules }),
  getSchedule: (id, params) => api.get(`/exams/${id}/schedule`, { params }),
};

// Grade API
export const gradeAPI = {
  getAll: (params) => api.get('/grades', { params }),
  enterGrades: (data) => api.post('/grades/enter', data),
  createBulk: (data) => api.post('/grades/bulk', data),
  update: (id, data) => api.put(`/grades/${id}`, data),
  getReportCard: (studentId, examId) => api.get(`/grades/report-card/${studentId}`, { params: { exam_id: examId } }),
};

// Fee API
export const feeAPI = {
  getStructures: (params) => api.get('/fee-structures', { params }),
  createStructure: (data) => api.post('/fee-structures', data),
  getPayments: (params) => api.get('/fee-payments', { params }),
  collectPayment: (data) => api.post('/fee-payments', data),
  getStatistics: (params) => api.get('/fee-payments/statistics', { params }),
  getStudentFees: (studentId) => api.get(`/fee-payments/student/${studentId}`),
};

// Assignment API
export const assignmentAPI = {
  getAll: (params) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  submit: (id, data) => api.post(`/assignments/${id}/submit`, data),
  gradeSubmission: (submissionId, data) => api.post(`/assignment-submissions/${submissionId}/grade`, data),
  getSubmissions: (id) => api.get(`/assignments/${id}/submissions`),
  getStudentAssignments: (studentId) => api.get(`/assignments/student/${studentId}`),
};

// Settings API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export default api;

