import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { schoolsAPI, DEFAULT_SCHOOLS } from '../services/api';
import { toast } from 'react-toastify';

const SchoolContext = createContext(null);

export const SchoolProvider = ({ children }) => {
  const { user, activeRole } = useAuth();

  const [allSchools, setAllSchools] = useState(DEFAULT_SCHOOLS);
  const [authorizedSchools, setAuthorizedSchools] = useState([]);
  const [currentSchool, setCurrentSchool] = useState(DEFAULT_SCHOOLS[0]);
  const [activeSchoolId, setActiveSchoolId] = useState(1);
  const [loading, setLoading] = useState(true);

  // Determine if caller has Group HQ Super Admin access
  const isGroupAdmin =
    user?.role === 'super-admin' ||
    user?.roles?.includes('super-admin') ||
    user?.is_group_admin === true ||
    activeRole === 'super-admin' ||
    user?.email?.toLowerCase() === 'superadmin@school.com';

  // Load and refresh schools from storage / API
  const loadSchools = async () => {
    try {
      setLoading(true);
      const res = await schoolsAPI.getAll();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAllSchools(res.data);
      }
    } catch (err) {
      console.warn('Could not load schools list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
    const handleSchoolsUpdated = () => loadSchools();
    window.addEventListener('sms:schools-updated', handleSchoolsUpdated);
    return () => window.removeEventListener('sms:schools-updated', handleSchoolsUpdated);
  }, [user]);

  // Update authorized schools and active school whenever user, allSchools, or role changes
  useEffect(() => {
    if (!user) {
      setAuthorizedSchools(allSchools.slice(0, 1));
      setCurrentSchool(allSchools[0] || DEFAULT_SCHOOLS[0]);
      setActiveSchoolId(1);
      return;
    }

    // Determine authorized schools for current user
    let userAuthList = [];
    if (isGroupAdmin) {
      userAuthList = allSchools;
    } else {
      const allowedIds = (user.authorized_schools || [user.school_id || 1]).map((id) => String(id));
      userAuthList = allSchools.filter((s) => allowedIds.includes(String(s.id)));
      if (userAuthList.length === 0) {
        const fallback = allSchools.find((s) => String(s.id) === String(user.school_id || 1)) || allSchools[0] || DEFAULT_SCHOOLS[0];
        userAuthList = [fallback];
      }
    }
    setAuthorizedSchools(userAuthList);

    // SECURITY CHECK: Validate stored activeSchoolId against user permissions
    const storedActive = localStorage.getItem('sms_active_school_id');
    let targetId = storedActive;

    if (isGroupAdmin) {
      if (storedActive === 'all') {
        targetId = 'all';
      } else {
        const found = allSchools.find((s) => String(s.id) === String(storedActive));
        targetId = found ? found.id : (allSchools[0]?.id || 1);
      }
    } else {
      // Non-superadmin: MUST be in userAuthList! If tampered or not in allowed list, reset to their authorized school
      const isAllowed = userAuthList.some((s) => String(s.id) === String(storedActive));
      if (!isAllowed) {
        targetId = userAuthList[0]?.id || user.school_id || 1;
        localStorage.setItem('sms_active_school_id', String(targetId));
      }
    }

    setActiveSchoolId(targetId);

    if (targetId === 'all') {
      setCurrentSchool({
        id: 'all',
        name: 'Twinkling Toddlers Group of Schools (HQ)',
        shortName: 'All Campuses (HQ)',
        code: 'TT-GROUP-HQ',
        city: 'All Regions',
        primaryColor: '#1E3A8A',
        logo: 'preset:🌐',
        isConsolidated: true,
      });
    } else {
      const matchingSchool = allSchools.find((s) => String(s.id) === String(targetId)) || userAuthList[0] || DEFAULT_SCHOOLS[0];
      setCurrentSchool(matchingSchool);
    }
  }, [user, allSchools, isGroupAdmin, activeRole]);

  // Security validation check
  const canAccessSchool = (schoolId) => {
    if (!schoolId) return false;
    if (isGroupAdmin) return true;
    if (schoolId === 'all') return false; // Non-superadmins cannot access consolidated view
    const allowedIds = (user?.authorized_schools || [user?.school_id || 1]).map((id) => String(id));
    return allowedIds.includes(String(schoolId));
  };

  // Switch active school context
  const switchSchool = (targetSchoolId) => {
    // 1. Strict Security Gatekeeper
    if (!canAccessSchool(targetSchoolId)) {
      toast.error('Security Violation: You are not authorized to access this campus branch.');
      console.warn(`[Security Alert] Blocked unauthorized attempt to access school ${targetSchoolId} by user ${user?.email}`);
      return false;
    }

    // 2. Perform safe switch
    if (targetSchoolId === 'all') {
      setActiveSchoolId('all');
      localStorage.setItem('sms_active_school_id', 'all');
      setCurrentSchool({
        id: 'all',
        name: 'Twinkling Toddlers Group of Schools (HQ)',
        shortName: 'All Campuses (HQ)',
        code: 'TT-GROUP-HQ',
        city: 'All Regions',
        primaryColor: '#1E3A8A',
        logo: 'preset:🌐',
        isConsolidated: true,
      });
      toast.info('Switched view to All Campuses (Consolidated HQ View)');
    } else {
      const matchingSchool = allSchools.find((s) => String(s.id) === String(targetSchoolId));
      if (matchingSchool) {
        setActiveSchoolId(matchingSchool.id);
        localStorage.setItem('sms_active_school_id', String(matchingSchool.id));
        setCurrentSchool(matchingSchool);
        toast.info(`Switched active campus to ${matchingSchool.shortName || matchingSchool.name}`);
      }
    }

    // 3. Dispatch reactive update event for all components
    window.dispatchEvent(new CustomEvent('sms:school-switched', { detail: { schoolId: targetSchoolId } }));
    return true;
  };

  return (
    <SchoolContext.Provider
      value={{
        currentSchool,
        activeSchoolId,
        authorizedSchools,
        allSchools,
        isGroupAdmin,
        canAccessSchool,
        switchSchool,
        refreshSchools: loadSchools,
        loading,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};

