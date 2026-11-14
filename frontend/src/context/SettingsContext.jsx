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
import { toast } from 'react-toastify';
import { showGlobalValidationError } from './AlertContext';

const SettingsContext = createContext(null);

export const DEFAULT_SETTINGS = {
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

  merged.student_min_age_years = parseInt(merged.student_min_age_years ?? 2, 10);
  merged.student_min_age_months = parseInt(merged.student_min_age_months ?? 6, 10);
  merged.teacher_min_age_years = parseInt(merged.teacher_min_age_years ?? 20, 10);
  merged.staff_min_age_years = parseInt(merged.staff_min_age_years ?? 18, 10);

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
    };
  }
  return context;
};

export default SettingsContext;

