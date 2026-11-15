import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, studentAPI, teacherAPI } from '../services/api';
import { toast } from 'react-toastify';
import { showGlobalValidationError } from './AlertContext';
import {
  SYSTEM_ROLES,
  normalizeRole,
  hasRolePermission,
  DEFAULT_ROLE_PERMISSIONS
} from '../utils/permissionRules';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        const parsed = JSON.parse(storedUser);
        const lowerEmail = parsed.email?.toLowerCase();
        const KNOWN_TEACHERS = [
          'teacher@school.com',
          'rahul.mehta@school.com',
          'rajesh.kumar@school.com',
          'priya.sharma@school.com',
          'amit.patel@school.com',
          'anjali.gupta@school.com',
        ];

        // Self-heal misidentified roles for seeded teachers
        if (KNOWN_TEACHERS.includes(lowerEmail) && parsed.roles?.[0] !== 'teacher') {
          parsed.role = 'teacher';
          parsed.roles = ['teacher'];
          localStorage.setItem('user', JSON.stringify(parsed));
        }

        // If user is not an administrator, ensure no preview switcher overrides their identity
        const isUserAdmin = parsed.roles?.some(r => {
          const n = normalizeRole(r);
          return n === 'admin' || n === 'super-admin';
        });
        if (!isUserAdmin) {
          localStorage.removeItem('sms_active_role');
          setActiveRole(null);
        }

        setUser(parsed);
      } catch (_) {
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);

      if (response.success) {
        const { user, token, roles, permissions } = response.data;

        // Store token and user
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...user, roles, permissions }));

        // Reset role preview switcher state so logged-in user always operates under their real assigned role
        localStorage.removeItem('sms_active_role');
        setActiveRole(null);

        setToken(token);
        setUser({ ...user, roles, permissions });

        toast.success(response.message || 'Login successful!');
        return { success: true };
      }
    } catch (error) {
      const errorMessage = typeof error === 'string'
        ? error
        : (error?.message || 'Login failed. Please check your credentials.');
      showGlobalValidationError(errorMessage, 'Authentication Error');
      return { success: false, error };
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);

      if (response.success) {
        const { user, token } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        setToken(token);
        setUser(user);

        toast.success(response.message || 'Registration successful!');
        return { success: true };
      }
    } catch (error) {
      showGlobalValidationError(error?.message || 'Registration failed.', 'Registration Error');
      return { success: false, error };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sms_active_role');
      setActiveRole(null);
      setToken(null);
      setUser(null);
      toast.info('Logged out successfully');
    }
  };

  const updateUser = async () => {
    try {
      const response = await authAPI.me();
      if (response.success) {
        const { user, roles, permissions } = response.data;
        const updatedUser = { ...user, roles, permissions };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const updateProfileData = async (partialData) => {
    try {
      const res = await authAPI.updateProfile(partialData);
      const updatedUser = { ...user, ...partialData };
      setUser(updatedUser);
      return res;
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };

  // Active role state (allows administrators to preview the system as any role)
  const [activeRole, setActiveRole] = useState(() => {
    return localStorage.getItem('sms_active_role') || null;
  });

  const getEffectiveRole = () => {
    // Only real administrators/super-admins can use the activeRole preview switcher
    const isRealAdmin = user?.roles?.some(r => {
      const n = normalizeRole(r);
      return n === 'admin' || n === 'super-admin';
    });

    if (isRealAdmin && activeRole) {
      return normalizeRole(activeRole);
    }
    if (user?.roles && user.roles.length > 0) {
      return normalizeRole(user.roles[0]);
    }
    if (user?.role) {
      return normalizeRole(user.role);
    }
    return 'general';
  };

  const switchActiveRole = (newRole) => {
    const normalized = normalizeRole(newRole);
    setActiveRole(normalized);
    localStorage.setItem('sms_active_role', normalized);
    const roleObj = SYSTEM_ROLES.find(r => r.id === normalized);
    toast.info(`Switched view to ${roleObj?.name || normalized}`);
  };

  const resetActiveRole = () => {
    localStorage.removeItem('sms_active_role');
    const defaultR = user?.roles?.[0] ? normalizeRole(user.roles[0]) : 'admin';
    setActiveRole(defaultR);
    toast.info(`Reset view to assigned role: ${defaultR}`);
  };

  const hasRole = (role) => {
    const effective = getEffectiveRole();
    return normalizeRole(role) === effective;
  };

  const hasPermission = (permission) => {
    if (!permission) return true;
    const effectiveRole = getEffectiveRole();
    if (effectiveRole === 'super-admin') return true;

    // Strict system constraint: students are strictly forbidden from edit, delete, create, manage, mark, or collect permissions
    if (effectiveRole === 'student') {
      const isForbidden =
        permission.startsWith('edit-') ||
        permission.startsWith('delete-') ||
        permission.startsWith('create-') ||
        permission.startsWith('manage-') ||
        permission.startsWith('mark-') ||
        permission.startsWith('enter-') ||
        permission.startsWith('collect-') ||
        permission === '*';
      if (isForbidden) return false;
    }

    // Direct user permissions override if present (for non-students)
    if (user?.permissions?.includes('*') || user?.permissions?.includes(permission)) {
      return true;
    }

    // Check configured role permissions from settings
    let configured = null;
    try {
      const storedSettings = localStorage.getItem('sms_settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.user_role_permissions) {
          configured = parsed.user_role_permissions;
        }
      }
    } catch (_) {}

    return hasRolePermission(configured, effectiveRole, permission);
  };

  const isSuperAdmin = () => hasRole('super-admin');
  const isAdmin = () => hasRole('super-admin') || hasRole('admin');
  const isTeacher = () => hasRole('teacher');
  const isStudent = () => hasRole('student');
  const isParent = () => hasRole('parent');
  const isFinance = () => hasRole('finance') || hasRole('accountant');
  const isBackOffice = () => hasRole('back-office') || hasRole('librarian') || hasRole('receptionist');
  const isGeneral = () => hasRole('general');

  // Explicit edit & delete checks (guarantees student NEVER has edit or delete anywhere)
  const canEdit = (perm) => !isStudent() && (perm ? hasPermission(perm) : (isAdmin() || isTeacher()));
  const canDelete = (perm) => !isStudent() && (perm ? hasPermission(perm) : isAdmin());

  // Student profile state for student role or preview
  const [studentProfile, setStudentProfile] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return parsed.student || null;
      } catch (_) {}
    }
    return null;
  });
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    const loadStudentInfo = async () => {
      const effective = getEffectiveRole();
      if (effective !== 'student') {
        setStudentProfile(null);
        return;
      }

      if (user?.student && user.student.id) {
        setStudentProfile(user.student);
        return;
      }

      setStudentLoading(true);
      try {
        if (user?.id) {
          const res = await studentAPI.getProfileByUserId(user.id);
          if (res?.data) {
            setStudentProfile(res.data);
            return;
          }
        }
        // Simulated student or demo student fallback
        const demoRes = await studentAPI.getDemoStudent();
        if (demoRes?.data) {
          setStudentProfile(demoRes.data);
        }
      } catch (err) {
        console.warn('Failed to load student profile:', err);
      } finally {
        setStudentLoading(false);
      }
    };

    loadStudentInfo();
  }, [user, activeRole]);

  // Teacher profile state for teacher role
  const [teacherProfile, setTeacherProfile] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        return parsed.teacher || null;
      } catch (_) {}
    }
    return null;
  });

  useEffect(() => {
    const loadTeacherInfo = async () => {
      const effective = getEffectiveRole();
      if (effective !== 'teacher') {
        setTeacherProfile(null);
        return;
      }

      if (user?.teacher && user.teacher.id) {
        setTeacherProfile(user.teacher);
        return;
      }

      try {
        if (user?.email) {
          const res = await teacherAPI.getAll({ search: user.email, per_page: 'all' });
          if (res?.data && res.data.length > 0) {
            const foundTeacher = res.data.find(t => 
              t.email?.toLowerCase() === user.email?.toLowerCase() ||
              String(t.user_id) === String(user.id)
            );
            if (foundTeacher) {
              setTeacherProfile(foundTeacher);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load teacher profile:', err);
      }
    };

    loadTeacherInfo();
  }, [user, activeRole]);

  // Teacher class filtering helper
  const filterTeacherClasses = (classesList) => {
    if (!classesList || !Array.isArray(classesList)) return [];
    if (!isTeacher()) return classesList;
    const assignedIds = user?.teacher?.assigned_class_ids || user?.assigned_class_ids;
    if (Array.isArray(assignedIds) && assignedIds.length > 0) {
      return classesList.filter(c => assignedIds.includes(c.id) || assignedIds.includes(String(c.id)));
    }
    return classesList;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    updateProfileData,
    activeRole: getEffectiveRole(),
    switchActiveRole,
    resetActiveRole,
    hasRole,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    isTeacher,
    isStudent,
    isParent,
    isFinance,
    isBackOffice,
    isGeneral,
    canEdit,
    canDelete,
    filterTeacherClasses,
    currentStudent: studentProfile,
    studentProfile,
    studentLoading,
    currentTeacher: teacherProfile,
    teacherProfile,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

