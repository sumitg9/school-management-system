import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsAPI } from '../services/api';
import { 
  formatDateTime as baseFormatDateTime, 
  formatDate as baseFormatDate, 
  formatTime as baseFormatTime,
  DEFAULT_CLASS_AGE_CRITERIA,
  getStudentAgeCriteria as baseGetStudentAgeCriteria,
  getMaxStudentDateOfBirth as baseGetMaxStudentDateOfBirth,
  validateStudentDateOfBirth as baseValidateStudentDateOfBirth,
  getMaxTeacherDateOfBirth as baseGetMaxTeacherDateOfBirth,
  validateTeacherDateOfBirth as baseValidateTeacherDateOfBirth,
  getMaxStaffDateOfBirth as baseGetMaxStaffDateOfBirth,
  validateStaffDateOfBirth as baseValidateStaffDateOfBirth,
} from '../utils/dateFormatter';
import {
  formatCurrency as baseFormatCurrency,
  DEFAULT_CURRENCY_SYMBOL
} from '../utils/currencyFormatter';
import {
  calculateLateFine as baseCalculateLateFine,
  isMonthOverdue as baseIsMonthOverdue,
  getDaysOverdue as baseGetDaysOverdue,
  LATE_FINE_TYPES
} from '../utils/feeLateFine';
import {
  DEFAULT_ROLE_PERMISSIONS,
  mergeRolePermissions,
  hasRolePermission
} from '../utils/permissionRules';
import { toast } from 'react-toastify';
import { showGlobalValidationError } from './AlertContext';

const SettingsContext = createContext(null);

export const DEFAULT_SETTINGS = {
  // School Identity & Branding
  school_name: 'Delhi Public Academy',
  school_logo: '',
  school_tagline: 'Empowering Minds, Shaping Futures',
  school_email: 'accounts@school.edu',
  school_phone: '+91 98765 43210',
  school_address: 'Knowledge Park, Institutional Area, New Delhi',
  school_affiliation: 'Affiliated to CBSE / State Board • Reg. No: SMS-EDU-2024-9988',
  school_website: 'www.school.edu',

  date_time_format: 'DD-MM-YYYY HH:mm:ss',
  date_format: 'DD-MM-YYYY',
  time_format: 'HH:mm:ss',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  currency_symbol: '₹',
  student_min_age_years: 2,
  student_min_age_months: 6,
  teacher_min_age_years: 20,
  staff_min_age_years: 18,
  class_age_criteria: DEFAULT_CLASS_AGE_CRITERIA,

  // Fee Rules & Late Fine
  fee_late_fine_enabled: true,
  fee_late_fine_type: 'fixed_per_month', // 'fixed_per_month' | 'percentage' | 'daily'
  fee_late_fine_amount: 100,
  fee_due_day_of_month: 10,
  fee_grace_period_days: 0,
  fee_late_fine_max_cap: 1000,

  // User Role Permissions Matrix
  user_role_permissions: DEFAULT_ROLE_PERMISSIONS,
};

const normalizeSettings = (raw) => {
  if (!raw) return DEFAULT_SETTINGS;
  const merged = { ...DEFAULT_SETTINGS, ...raw };

  if (typeof merged.class_age_criteria === 'string') {
    try {
      merged.class_age_criteria = JSON.parse(merged.class_age_criteria);
    } catch {
      merged.class_age_criteria = DEFAULT_CLASS_AGE_CRITERIA;
    }
  } else if (!merged.class_age_criteria || typeof merged.class_age_criteria !== 'object') {
    merged.class_age_criteria = DEFAULT_CLASS_AGE_CRITERIA;
  }

  // Normalize user role permissions
  if (typeof merged.user_role_permissions === 'string') {
    try {
      merged.user_role_permissions = JSON.parse(merged.user_role_permissions);
    } catch {
      merged.user_role_permissions = DEFAULT_ROLE_PERMISSIONS;
    }
  }
  merged.user_role_permissions = mergeRolePermissions(merged.user_role_permissions);

  merged.student_min_age_years = parseInt(merged.student_min_age_years ?? 2, 10);
  merged.student_min_age_months = parseInt(merged.student_min_age_months ?? 6, 10);
  merged.teacher_min_age_years = parseInt(merged.teacher_min_age_years ?? 20, 10);
  merged.staff_min_age_years = parseInt(merged.staff_min_age_years ?? 18, 10);

  // Late Fine normalization
  merged.fee_late_fine_enabled =
    merged.fee_late_fine_enabled === true ||
    merged.fee_late_fine_enabled === 'true' ||
    merged.fee_late_fine_enabled === 1 ||
    merged.fee_late_fine_enabled === '1';
  merged.fee_late_fine_type = ['fixed_per_month', 'percentage', 'daily'].includes(merged.fee_late_fine_type)
    ? merged.fee_late_fine_type
    : 'fixed_per_month';
  merged.fee_late_fine_amount = parseFloat(merged.fee_late_fine_amount ?? 100) || 0;
  merged.fee_due_day_of_month = Math.min(31, Math.max(1, parseInt(merged.fee_due_day_of_month ?? 10, 10) || 10));
  merged.fee_grace_period_days = Math.max(0, parseInt(merged.fee_grace_period_days ?? 0, 10) || 0);
  merged.fee_late_fine_max_cap = Math.max(0, parseFloat(merged.fee_late_fine_max_cap ?? 1000) || 0);

  // School Identity normalization
  merged.school_name = raw?.school_name && raw.school_name !== 'null' ? String(raw.school_name).trim() : DEFAULT_SETTINGS.school_name;
  merged.school_logo = raw?.school_logo && raw.school_logo !== 'null' ? String(raw.school_logo) : DEFAULT_SETTINGS.school_logo;
  merged.school_tagline = raw?.school_tagline && raw.school_tagline !== 'null' ? String(raw.school_tagline).trim() : DEFAULT_SETTINGS.school_tagline;
  merged.school_email = raw?.school_email && raw.school_email !== 'null' ? String(raw.school_email).trim() : DEFAULT_SETTINGS.school_email;
  merged.school_phone = raw?.school_phone && raw.school_phone !== 'null' ? String(raw.school_phone).trim() : DEFAULT_SETTINGS.school_phone;
  merged.school_address = raw?.school_address && raw.school_address !== 'null' ? String(raw.school_address).trim() : DEFAULT_SETTINGS.school_address;
  merged.school_affiliation = raw?.school_affiliation && raw.school_affiliation !== 'null' ? String(raw.school_affiliation).trim() : DEFAULT_SETTINGS.school_affiliation;
  merged.school_website = raw?.school_website && raw.school_website !== 'null' ? String(raw.school_website).trim() : DEFAULT_SETTINGS.school_website;

  return merged;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('app_settings');
      return cached ? normalizeSettings(JSON.parse(cached)) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await settingsAPI.getAll();
      if (response && response.success && response.data) {
        const merged = normalizeSettings(response.data);
        setSettings(merged);
        localStorage.setItem('app_settings', JSON.stringify(merged));
      }
    } catch (error) {
      console.warn('Could not fetch settings, using defaults/cached:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings?.school_name) {
      document.title = `${settings.school_name} - School Management System`;
    }
  }, [settings?.school_name]);

  const updateSettings = async (newSettings) => {
    try {
      const response = await settingsAPI.update(newSettings);
      if (response && response.success) {
        const updated = normalizeSettings({ ...settings, ...(response.data || newSettings) });
        setSettings(updated);
        localStorage.setItem('app_settings', JSON.stringify(updated));
        toast.success(response.message || 'Settings updated successfully!');
        return { success: true, data: updated };
      }
      return { success: false };
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to update settings';
      showGlobalValidationError(msg, 'Settings Error');
      return { success: false, error };
    }
  };

  const formatDateTime = useCallback(
    (date, customFormat) => {
      const pattern = customFormat || settings.date_time_format || DEFAULT_SETTINGS.date_time_format;
      return baseFormatDateTime(date, pattern);
    },
    [settings.date_time_format]
  );

  const formatDate = useCallback(
    (date, customFormat) => {
      const pattern = customFormat || settings.date_format || DEFAULT_SETTINGS.date_format;
      return baseFormatDate(date, pattern);
    },
    [settings.date_format]
  );

  const formatTime = useCallback(
    (date, customFormat) => {
      const pattern = customFormat || settings.time_format || DEFAULT_SETTINGS.time_format;
      return baseFormatTime(date, pattern);
    },
    [settings.time_format]
  );

  const formatCurrency = useCallback(
    (amount, options) => {
      const symbol = settings.currency_symbol || DEFAULT_CURRENCY_SYMBOL;
      const opts = typeof options === 'object' ? { symbol, ...options } : { symbol };
      return baseFormatCurrency(amount, opts);
    },
    [settings.currency_symbol]
  );

  const getStudentAgeCriteria = useCallback(
    (classParam) => baseGetStudentAgeCriteria(classParam, settings),
    [settings]
  );

  const getMaxStudentDateOfBirth = useCallback(
    (classParam) => baseGetMaxStudentDateOfBirth(classParam, settings),
    [settings]
  );

  const validateStudentDateOfBirth = useCallback(
    (dobString, classParam) => baseValidateStudentDateOfBirth(dobString, classParam, settings),
    [settings]
  );

  const getMaxTeacherDateOfBirth = useCallback(
    () => baseGetMaxTeacherDateOfBirth(settings),
    [settings]
  );

  const validateTeacherDateOfBirth = useCallback(
    (dobString) => baseValidateTeacherDateOfBirth(dobString, settings),
    [settings]
  );

  const getMaxStaffDateOfBirth = useCallback(
    () => baseGetMaxStaffDateOfBirth(settings),
    [settings]
  );

  const validateStaffDateOfBirth = useCallback(
    (dobString) => baseValidateStaffDateOfBirth(dobString, settings),
    [settings]
  );

  const calculateLateFine = useCallback(
    (overdueMonthsList, monthlyFeeRate, referenceDate) =>
      baseCalculateLateFine(overdueMonthsList, monthlyFeeRate, settings, referenceDate),
    [settings]
  );

  const isMonthOverdue = useCallback(
    (monthObj, referenceDate) =>
      baseIsMonthOverdue(monthObj, settings, referenceDate),
    [settings]
  );

  const getDaysOverdue = useCallback(
    (monthObj, referenceDate) =>
      baseGetDaysOverdue(monthObj, settings, referenceDate),
    [settings]
  );

  const value = {
    settings,
    loading,
    fetchSettings,
    updateSettings,
    formatDateTime,
    formatDate,
    formatTime,
    formatCurrency,
    currencySymbol: settings.currency_symbol || DEFAULT_CURRENCY_SYMBOL,
    getStudentAgeCriteria,
    getMaxStudentDateOfBirth,
    validateStudentDateOfBirth,
    getMaxTeacherDateOfBirth,
    validateTeacherDateOfBirth,
    getMaxStaffDateOfBirth,
    validateStaffDateOfBirth,
    calculateLateFine,
    isMonthOverdue,
    getDaysOverdue,
    checkRolePermission: (role, permId) => hasRolePermission(settings.user_role_permissions, role, permId),
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      settings: DEFAULT_SETTINGS,
      loading: false,
      fetchSettings: () => {},
      updateSettings: async () => ({ success: false }),
      checkRolePermission: (role, permId) => hasRolePermission(DEFAULT_ROLE_PERMISSIONS, role, permId),
      formatDateTime: (date, fmt) => baseFormatDateTime(date, fmt || DEFAULT_SETTINGS.date_time_format),
      formatDate: (date, fmt) => baseFormatDate(date, fmt || DEFAULT_SETTINGS.date_format),
      formatTime: (date, fmt) => baseFormatTime(date, fmt || DEFAULT_SETTINGS.time_format),
      formatCurrency: (amount, opts) => baseFormatCurrency(amount, opts),
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      getStudentAgeCriteria: (cls) => baseGetStudentAgeCriteria(cls, DEFAULT_SETTINGS),
      getMaxStudentDateOfBirth: (cls) => baseGetMaxStudentDateOfBirth(cls, DEFAULT_SETTINGS),
      validateStudentDateOfBirth: (dob, cls) => baseValidateStudentDateOfBirth(dob, cls, DEFAULT_SETTINGS),
      getMaxTeacherDateOfBirth: () => baseGetMaxTeacherDateOfBirth(DEFAULT_SETTINGS),
      validateTeacherDateOfBirth: (dob) => baseValidateTeacherDateOfBirth(dob, DEFAULT_SETTINGS),
      getMaxStaffDateOfBirth: () => baseGetMaxStaffDateOfBirth(DEFAULT_SETTINGS),
      validateStaffDateOfBirth: (dob) => baseValidateStaffDateOfBirth(dob, DEFAULT_SETTINGS),
      calculateLateFine: (overdueMonths, rate, refDate) =>
        baseCalculateLateFine(overdueMonths, rate, DEFAULT_SETTINGS, refDate),
      isMonthOverdue: (m, refDate) => baseIsMonthOverdue(m, DEFAULT_SETTINGS, refDate),
      getDaysOverdue: (m, refDate) => baseGetDaysOverdue(m, DEFAULT_SETTINGS, refDate),
    };
  }
  return context;
};

export default SettingsContext;

