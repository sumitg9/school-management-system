import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, studentAPI } from '../services/api';
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
      setUser(JSON.parse(storedUser));
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
    if (activeRole) return activeRole;
    if (user?.roles && user.roles.length > 0) {
      return normalizeRole(user.roles[0]);
    }
    return 'admin';
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
      if (effective !== 'student') return;

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

