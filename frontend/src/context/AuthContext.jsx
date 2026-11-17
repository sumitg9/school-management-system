import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, studentAPI, teacherAPI, parentAPI } from '../services/api';
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
    window.dispatchEvent(new CustomEvent('sms:role-switched', { detail: { role: normalized } }));
    window.dispatchEvent(new CustomEvent('sms:hrms-updated', { detail: { role: normalized } }));
    const roleObj = SYSTEM_ROLES.find(r => r.id === normalized);
    toast.info(`Switched view to ${roleObj?.name || normalized}`);
  };

  const resetActiveRole = () => {
    localStorage.removeItem('sms_active_role');
    const defaultR = user?.roles?.[0] ? normalizeRole(user.roles[0]) : 'admin';
    setActiveRole(defaultR);
    window.dispatchEvent(new CustomEvent('sms:role-switched', { detail: { role: defaultR } }));
    window.dispatchEvent(new CustomEvent('sms:hrms-updated', { detail: { role: defaultR } }));
    toast.info(`Reset view to assigned role: ${defaultR}`);
  };

  // Permissions version state for immediate reactivity across components
  const [permissionsVersion, setPermissionsVersion] = useState(0);

  useEffect(() => {
    const handlePermUpdate = () => {
      setPermissionsVersion((v) => v + 1);
    };
    window.addEventListener('sms:permissions-updated', handlePermUpdate);
    window.addEventListener('sms:role-switched', handlePermUpdate);
    window.addEventListener('storage', handlePermUpdate);
    return () => {
      window.removeEventListener('sms:permissions-updated', handlePermUpdate);
      window.removeEventListener('sms:role-switched', handlePermUpdate);
      window.removeEventListener('storage', handlePermUpdate);
    };
  }, []);

  const hasRole = (role) => {
    const effective = getEffectiveRole();
    return normalizeRole(role) === effective;
  };

  const hasPermission = (permission) => {
    if (!permission) return true;
    const effectiveRole = getEffectiveRole();
    // Only real Super Admin session on super-admin role retains unrestricted root access
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

    // Check configured role permissions from settings and dedicated permissions store
    let configured = null;
    try {
      const storedDirect = localStorage.getItem('sms_role_permissions');
      if (storedDirect) {
        configured = JSON.parse(storedDirect);
      } else {
        const storedAppSettings = localStorage.getItem('app_settings');
        if (storedAppSettings) {
          const parsed = JSON.parse(storedAppSettings);
          if (parsed.user_role_permissions) {
            configured = parsed.user_role_permissions;
          }
        } else {
          const storedSettings = localStorage.getItem('sms_settings');
          if (storedSettings) {
            const parsed = JSON.parse(storedSettings);
            if (parsed.user_role_permissions) {
              configured = parsed.user_role_permissions;
            }
          }
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

  // Explicit edit & delete checks (strictly respects configured role permissions)
  const canEdit = (perm) => !isStudent() && (perm ? hasPermission(perm) : (isSuperAdmin() || isTeacher()));
  const canDelete = (perm) => !isStudent() && (perm ? hasPermission(perm) : isSuperAdmin());

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

  // Parent children and active child state
  const [parentChildren, setParentChildren] = useState([]);
  const [activeChild, setActiveChildState] = useState(null);
  const [parentLoading, setParentLoading] = useState(false);

  const setActiveChild = (childOrId) => {
    let target = null;
    if (typeof childOrId === 'object' && childOrId !== null) {
      target = childOrId;
    } else if (childOrId !== undefined && childOrId !== null) {
      target = parentChildren.find(c => String(c.id) === String(childOrId)) || null;
    }
    setActiveChildState(target);
    if (target?.id) {
      localStorage.setItem('sms_active_child_id', String(target.id));
      setStudentProfile(target);
    }
  };

  useEffect(() => {
    const loadParentChildren = async () => {
      const effective = getEffectiveRole();
      if (effective !== 'parent') {
        setParentChildren([]);
        setActiveChildState(null);
        return;
      }

      setParentLoading(true);
      try {
        const res = await parentAPI.getChildrenByParentUserId(user?.id, user);
        const children = res?.data || [];
        setParentChildren(children);

        if (children.length > 0) {
          const savedChildId = localStorage.getItem('sms_active_child_id');
          const matched = savedChildId ? children.find(c => String(c.id) === String(savedChildId)) : null;
          const initialChild = matched || children[0];
          setActiveChildState(initialChild);
          setStudentProfile(initialChild);
        } else {
          setActiveChildState(null);
        }
      } catch (err) {
        console.warn('Failed to load parent children:', err);
      } finally {
        setParentLoading(false);
      }
    };

    loadParentChildren();
  }, [user, activeRole]);

  useEffect(() => {
    const loadStudentInfo = async () => {
      const effective = getEffectiveRole();
      if (effective === 'parent') {
        return;
      }
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

  // Helper to read localStorage meta safely
  const getLocalMetaSafe = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  };

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
              String(t.user_id) === String(user.id) ||
              String(t.id) === String(user.teacher_id)
            );
            if (foundTeacher) {
              setTeacherProfile(foundTeacher);
              return;
            }
          }
        }

        // Demo teacher fallback for teacher role
        const demoRes = await teacherAPI.getDemoTeacher();
        if (demoRes?.data) {
          setTeacherProfile(demoRes.data);
          return;
        }
      } catch (err) {
        console.warn('Failed to load teacher profile:', err);
      }

      // Hard fallback if everything fails
      setTeacherProfile({
        id: user?.teacher_id || user?.id || 1,
        first_name: user?.name ? user.name.split(' ')[0] : 'Rahul',
        last_name: user?.name ? user.name.split(' ').slice(1).join(' ') : 'Mehta',
        email: user?.email || 'rahul.mehta@school.com',
        employee_id: user?.employee_id || 'EMP001',
        department: 'Science',
        status: 'active',
      });
    };

    loadTeacherInfo();
  }, [user, activeRole]);

  // Teacher Class & Section Scoping Helpers
  const getTeacherAssignedClassIds = (classesList = []) => {
    if (!isTeacher()) return null;
    const tId = teacherProfile?.id ? String(teacherProfile.id) : null;
    const tEmail = (teacherProfile?.email || user?.email || '').toLowerCase();

    const classMeta = getLocalMetaSafe('sms_class_meta');
    const secMeta = getLocalMetaSafe('sms_section_meta');

    const assigned = new Set();

    // Check direct assignments on teacher object if any
    const explicitClassIds = teacherProfile?.assigned_class_ids || user?.assigned_class_ids;
    if (Array.isArray(explicitClassIds)) {
      explicitClassIds.forEach(id => assigned.add(String(id)));
    }

    // Check class metadata & class objects
    classesList.forEach(cls => {
      const cId = String(cls.id);
      const meta = classMeta[cId] || {};
      const classTeacherId = meta.class_teacher_id || cls.class_teacher_id || cls.class_teacher?.id;

      if (tId && String(classTeacherId) === tId) {
        assigned.add(cId);
      } else if (tEmail && (cls.class_teacher?.email?.toLowerCase() === tEmail)) {
        assigned.add(cId);
      }

      // Check if any section belonging to this class is assigned to this teacher
      const sections = cls.sections || [];
      const hasTeacherSection = sections.some(sec => {
        const sMeta = secMeta[String(sec.id)] || {};
        const sTeacherId = sMeta.section_teacher_id || sec.section_teacher_id || sec.section_teacher?.id;
        return tId && String(sTeacherId) === tId;
      });
      if (hasTeacherSection) {
        assigned.add(cId);
      }
    });

    // Also check sections stored in sms_section_meta
    Object.keys(secMeta).forEach(sId => {
      const s = secMeta[sId];
      if (tId && String(s.section_teacher_id) === tId && s.class_id) {
        assigned.add(String(s.class_id));
      }
    });

    // Also check sms_class_meta directly for any class assigned to this teacher
    Object.keys(classMeta).forEach(cId => {
      const cm = classMeta[cId];
      if (tId && String(cm.class_teacher_id) === tId) {
        assigned.add(String(cId));
      }
    });

    return assigned;
  };

  const DEPARTMENT_SUBJECT_KEYWORDS = {
    science: ['science', 'physics', 'chemistry', 'biology', 'environmental', 'botany', 'zoology'],
    mathematics: ['math', 'mathematics', 'maths', 'algebra', 'geometry', 'calculus', 'arithmetic', 'statistics', 'trigonometry'],
    english: ['english', 'grammar', 'literature', 'comprehension'],
    'social studies': ['social science', 'social studies', 'history', 'geography', 'civics', 'economics', 'political science', 'sst'],
    'computer science': ['computer', 'coding', 'programming', 'information technology', 'software'],
    'physical education': ['physical education', 'sports', 'gym', 'yoga', 'fitness', 'athletics', 'games', 'pt'],
    arts: ['art', 'arts', 'drawing', 'painting', 'craft'],
    music: ['music', 'vocal', 'instrumental', 'dance'],
    languages: ['hindi', 'sanskrit', 'french', 'spanish', 'german', 'urdu'],
  };

  const resolveDepartmentGroup = (dept) => {
    if (!dept) return null;
    const d = dept.toLowerCase().trim();
    if (d.includes('computer') || d.includes('informati') || d === 'cs' || d === 'it') {
      return 'computer science';
    }
    if (d.includes('physic') && (d.includes('edu') || d.includes('sport') || d.includes('pe') || d.includes('gym')) || d === 'pe' || d === 'sports') {
      return 'physical education';
    }
    if (d.includes('science') || d.includes('physics') || d.includes('chemistry') || d.includes('biology')) {
      return 'science';
    }
    if (d.includes('math')) {
      return 'mathematics';
    }
    if (d.includes('english')) {
      return 'english';
    }
    if (d.includes('social') || d.includes('history') || d.includes('geography') || d.includes('civic') || d.includes('sst')) {
      return 'social studies';
    }
    if (d.includes('art')) {
      return 'arts';
    }
    if (d.includes('music')) {
      return 'music';
    }
    if (d.includes('lang') || d.includes('hindi') || d.includes('french') || d.includes('sanskrit')) {
      return 'languages';
    }
    return d;
  };

  const getTeacherAssignedSectionIds = (sectionsList = [], classesList = []) => {
    if (!isTeacher()) return null;
    const tId = teacherProfile?.id ? String(teacherProfile.id) : (user?.teacher_id ? String(user.teacher_id) : (user?.id ? String(user.id) : null));
    const tEmail = (teacherProfile?.email || user?.email || '').toLowerCase().trim();

    const secMeta = getLocalMetaSafe('sms_section_meta');
    const assigned = new Set();

    // 1. Check direct assignments on teacher object or user object
    const explicitSecIds = teacherProfile?.assigned_section_ids || user?.assigned_section_ids;
    if (Array.isArray(explicitSecIds)) {
      explicitSecIds.forEach(id => assigned.add(String(id)));
    }

    // 2. Check sections where teacher is explicitly assigned as section teacher
    if (Array.isArray(sectionsList)) {
      sectionsList.forEach(sec => {
        const sId = String(sec.id);
        const meta = secMeta[sId] || {};
        const secTeacherId = meta.section_teacher_id || sec.section_teacher_id || sec.section_teacher?.id;

        if (tId && String(secTeacherId) === tId) {
          assigned.add(sId);
        } else if (tEmail && sec.section_teacher?.email?.toLowerCase().trim() === tEmail) {
          assigned.add(sId);
        }
      });
    }

    // 3. Also check secMeta directly for any section assigned to this teacher
    Object.keys(secMeta).forEach(sId => {
      const s = secMeta[sId];
      if (tId && String(s.section_teacher_id) === tId) {
        assigned.add(String(sId));
      }
    });

    return assigned;
  };

  const getTeacherAssignedSubjectIds = (subjectsList = []) => {
    if (!isTeacher()) return null;
    const tId = teacherProfile?.id ? String(teacherProfile.id) : null;
    const teacherSubjectsMeta = getLocalMetaSafe('sms_teacher_subjects');
    const assigned = new Set();

    // 1. Explicit admin assignment via sms_teacher_subjects or teacher profile
    if (tId && Array.isArray(teacherSubjectsMeta[tId])) {
      teacherSubjectsMeta[tId].forEach(id => assigned.add(String(id)));
    }
    const explicitSubjectIds = teacherProfile?.assigned_subject_ids || user?.assigned_subject_ids;
    if (Array.isArray(explicitSubjectIds)) {
      explicitSubjectIds.forEach(id => assigned.add(String(id)));
    }

    const dept = (teacherProfile?.department || '').trim();
    const spec = (teacherProfile?.specialization || '').trim().toLowerCase();
    const groupDept = resolveDepartmentGroup(dept);
    const keywords = groupDept ? (DEPARTMENT_SUBJECT_KEYWORDS[groupDept] || [groupDept]) : [];

    // 2. Department & Specialization keyword matching across subjects
    if (Array.isArray(subjectsList) && subjectsList.length > 0) {
      subjectsList.forEach(sub => {
        const subId = String(sub.id);
        const subName = (sub.name || '').toLowerCase().trim();
        const subCode = (sub.code || '').toLowerCase().trim();

        // Direct specialization match
        if (spec && (subName.includes(spec) || spec.includes(subName) || subCode === spec)) {
          assigned.add(subId);
          return;
        }

        if (groupDept) {
          // If testing general science, exclude computer science and social science
          if (groupDept === 'science') {
            if (subName.includes('computer') || subCode === 'cs' || subName.includes('social') || subCode === 'sst') {
              return;
            }
          }

          // Exact code match
          if (groupDept === 'computer science' && subCode === 'cs') { assigned.add(subId); return; }
          if (groupDept === 'physical education' && (subCode === 'pe' || subCode === 'pt')) { assigned.add(subId); return; }
          if (groupDept === 'mathematics' && (subCode === 'math' || subCode === 'maths')) { assigned.add(subId); return; }
          if (groupDept === 'english' && subCode === 'eng') { assigned.add(subId); return; }
          if (groupDept === 'science' && (subCode === 'sci' || subCode === 'phy' || subCode === 'chem' || subCode === 'bio')) { assigned.add(subId); return; }

          // Keyword check with boundary checks for short keywords
          const hasKeyword = keywords.some(kw => {
            if (kw.length <= 3) {
              const regex = new RegExp(`\\b${kw}\\b`, 'i');
              return regex.test(subName) || subCode === kw;
            }
            return subName.includes(kw);
          });

          if (hasKeyword) {
            assigned.add(subId);
          }
        }
      });
    }

    return assigned;
  };

  const filterTeacherSubjects = (subjectsList) => {
    if (!subjectsList || !Array.isArray(subjectsList)) return [];
    if (!isTeacher()) return subjectsList;
    const assignedIds = getTeacherAssignedSubjectIds(subjectsList);
    if (!assignedIds) return subjectsList;
    return subjectsList.filter(s => assignedIds.has(String(s.id)));
  };

  const isSubjectAssignedToTeacher = (subjectId, subjectsList = []) => {
    if (!isTeacher()) return true;
    const assignedIds = getTeacherAssignedSubjectIds(subjectsList);
    return assignedIds ? assignedIds.has(String(subjectId)) : true;
  };

  const filterTeacherClasses = (classesList) => {
    if (!classesList || !Array.isArray(classesList)) return [];
    if (!isTeacher()) return classesList;
    const assignedIds = getTeacherAssignedClassIds(classesList);
    if (!assignedIds) return classesList;
    return classesList.filter(c => assignedIds.has(String(c.id)));
  };

  const filterTeacherSections = (sectionsList, classesList = []) => {
    if (!sectionsList || !Array.isArray(sectionsList)) return [];
    if (!isTeacher()) return sectionsList;
    const assignedIds = getTeacherAssignedSectionIds(sectionsList, classesList);
    if (!assignedIds) return sectionsList;
    return sectionsList.filter(s => assignedIds.has(String(s.id)));
  };

  const filterTeacherStudents = (studentsList, classesList = [], sectionsList = []) => {
    if (!studentsList || !Array.isArray(studentsList)) return [];
    if (!isTeacher()) return studentsList;
    const classIds = getTeacherAssignedClassIds(classesList);
    const sectionIds = getTeacherAssignedSectionIds(sectionsList, classesList);

    return studentsList.filter(stu => {
      const matchClass = stu.class_id && classIds && classIds.has(String(stu.class_id));
      const matchSection = stu.section_id && sectionIds && sectionIds.has(String(stu.section_id));
      return matchClass || matchSection;
    });
  };

  const isClassAssignedToTeacher = (classId, classesList = []) => {
    if (!isTeacher()) return true;
    const assigned = getTeacherAssignedClassIds(classesList);
    return assigned ? assigned.has(String(classId)) : true;
  };

  const isSectionAssignedToTeacher = (sectionId, sectionsList = [], classesList = []) => {
    if (!isTeacher()) return true;
    const assigned = getTeacherAssignedSectionIds(sectionsList, classesList);
    return assigned ? assigned.has(String(sectionId)) : true;
  };

  const isStudentAssignedToTeacher = (student, classesList = [], sectionsList = []) => {
    if (!isTeacher()) return true;
    if (!student) return false;
    const classIds = getTeacherAssignedClassIds(classesList);
    const sectionIds = getTeacherAssignedSectionIds(sectionsList, classesList);
    const matchClass = student.class_id && classIds && classIds.has(String(student.class_id));
    const matchSection = student.section_id && sectionIds && sectionIds.has(String(student.section_id));
    return Boolean(matchClass || matchSection);
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
    filterTeacherSections,
    filterTeacherStudents,
    filterTeacherSubjects,
    getTeacherAssignedClassIds,
    getTeacherAssignedSectionIds,
    getTeacherAssignedSubjectIds,
    isClassAssignedToTeacher,
    isSectionAssignedToTeacher,
    isStudentAssignedToTeacher,
    isSubjectAssignedToTeacher,
    currentStudent: studentProfile,
    studentProfile,
    studentLoading,
    parentChildren,
    activeChild,
    setActiveChild,
    parentLoading,
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

