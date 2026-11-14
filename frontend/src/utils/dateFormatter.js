import { format, parseISO, isValid } from 'date-fns';

/**
 * Predefined Date & Time format options
 */
export const PREDEFINED_DATE_TIME_FORMATS = [
  { 
    id: 'dt-1',
    label: '31-10-2026 12:15:00 (DD-MM-YYYY HH:mm:ss)', 
    value: 'DD-MM-YYYY HH:mm:ss', 
    description: 'Standard Indian Format (24-hour)' 
  },
  { 
    id: 'dt-2',
    label: '31/10/2026 12:15:00 (DD/MM/YYYY HH:mm:ss)', 
    value: 'DD/MM/YYYY HH:mm:ss', 
    description: 'Slash Separated (24-hour)' 
  },
  { 
    id: 'dt-3',
    label: '31/10/2026 12:15:00 PM (DD/MM/YYYY hh:mm:ss A)', 
    value: 'DD/MM/YYYY hh:mm:ss A', 
    description: 'Slash Separated (12-hour AM/PM)' 
  },
  { 
    id: 'dt-4',
    label: '2026-10-31 12:15:00 (YYYY-MM-DD HH:mm:ss)', 
    value: 'YYYY-MM-DD HH:mm:ss', 
    description: 'ISO Standard (24-hour)' 
  },
  { 
    id: 'dt-5',
    label: '31 Oct 2026, 12:15 PM (DD MMM YYYY, hh:mm A)', 
    value: 'DD MMM YYYY, hh:mm A', 
    description: 'Friendly Text with Month Name' 
  },
  { 
    id: 'dt-6',
    label: '10/31/2026 12:15:00 PM (MM/DD/YYYY hh:mm:ss A)', 
    value: 'MM/DD/YYYY hh:mm:ss A', 
    description: 'US Format (12-hour AM/PM)' 
  },
];

export const PREDEFINED_DATE_FORMATS = [
  { label: '31-10-2026 (DD-MM-YYYY)', value: 'DD-MM-YYYY' },
  { label: '31/10/2026 (DD/MM/YYYY)', value: 'DD/MM/YYYY' },
  { label: '2026-10-31 (YYYY-MM-DD)', value: 'YYYY-MM-DD' },
  { label: '31 Oct 2026 (DD MMM YYYY)', value: 'DD MMM YYYY' },
  { label: '10/31/2026 (MM/DD/YYYY)', value: 'MM/DD/YYYY' },
];

export const PREDEFINED_TIME_FORMATS = [
  { label: '12:15:00 (HH:mm:ss - 24hr)', value: 'HH:mm:ss' },
  { label: '12:15:00 PM (hh:mm:ss A - 12hr)', value: 'hh:mm:ss A' },
  { label: '12:15 (HH:mm - 24hr)', value: 'HH:mm' },
  { label: '12:15 PM (hh:mm A - 12hr)', value: 'hh:mm A' },
];

/**
 * Converts user-friendly format tokens (e.g. YYYY, DD, A) into date-fns tokens (yyyy, dd, a)
 */
export const convertToDateFnsPattern = (pattern) => {
  if (!pattern || typeof pattern !== 'string') return 'dd-MM-yyyy HH:mm:ss';
  return pattern
    .replace(/YYYY/g, 'yyyy')
    .replace(/YY(?![y])/g, 'yy')
    .replace(/DD/g, 'dd')
    .replace(/A\b/g, 'a');
};

/**
 * Parses any date input safely into a valid JavaScript Date object
 */
export const parseAnyDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const cleanStr = value.trim();
    if (!cleanStr) return null;

    // Try parsing as ISO
    const isoDate = parseISO(cleanStr);
    if (isValid(isoDate)) return isoDate;

    // Handle SQL format 'YYYY-MM-DD HH:mm:ss'
    const sqlFormatted = cleanStr.replace(' ', 'T');
    const sqlDate = parseISO(sqlFormatted);
    if (isValid(sqlDate)) return sqlDate;

    // Direct Date constructor fallback
    const fallbackDate = new Date(cleanStr);
    if (isValid(fallbackDate)) return fallbackDate;
  }
  return null;
};

/**
 * Format a date value into full Date & Time string based on given or default format
 */
export const formatDateTime = (dateValue, formatPattern = 'DD-MM-YYYY HH:mm:ss') => {
  const date = parseAnyDate(dateValue);
  if (!date) return '-';
  try {
    const dateFnsPattern = convertToDateFnsPattern(formatPattern);
    return format(date, dateFnsPattern);
  } catch (error) {
    console.error('Error formatting date-time:', error);
    return String(dateValue);
  }
};

/**
 * Format a date value into Date only string based on given or default format
 */
export const formatDate = (dateValue, formatPattern = 'DD-MM-YYYY') => {
  const date = parseAnyDate(dateValue);
  if (!date) return '-';
  try {
    const dateFnsPattern = convertToDateFnsPattern(formatPattern);
    return format(date, dateFnsPattern);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateValue);
  }
};

/**
 * Format a date value into Time only string based on given or default format
 */
export const formatTime = (dateValue, formatPattern = 'HH:mm:ss') => {
  const date = parseAnyDate(dateValue);
  if (!date) return '-';
  try {
    const dateFnsPattern = convertToDateFnsPattern(formatPattern);
    return format(date, dateFnsPattern);
  } catch (error) {
    console.error('Error formatting time:', error);
    return String(dateValue);
  }
};

/**
 * Recommended standard class-wise minimum age criteria
 */
export const DEFAULT_CLASS_AGE_CRITERIA = {
  'Pre-KG': { min_years: 2, min_months: 6 },
  'Nursery': { min_years: 3, min_months: 0 },
  'LKG': { min_years: 3, min_months: 6 },
  'UKG': { min_years: 4, min_months: 6 },
  'Class 1': { min_years: 5, min_months: 6 },
  'Class 2': { min_years: 6, min_months: 6 },
  'Class 3': { min_years: 7, min_months: 6 },
  'Class 4': { min_years: 8, min_months: 6 },
  'Class 5': { min_years: 9, min_months: 6 },
  'Class 6': { min_years: 10, min_months: 6 },
  'Class 7': { min_years: 11, min_months: 6 },
  'Class 8': { min_years: 12, min_months: 6 },
  'Class 9': { min_years: 13, min_months: 6 },
  'Class 10': { min_years: 14, min_months: 6 },
  'Class 11': { min_years: 15, min_months: 6 },
  'Class 12': { min_years: 16, min_months: 6 },
};

/**
 * Calculates exact age in years, months, days, and total months from a DOB string
 */
export const calculateAge = (dobString, ref = new Date()) => {
  if (!dobString) return null;
  const cleanStr = String(dobString).trim().substring(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length !== 3) return null;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dob = new Date(y, m, d);
  if (isNaN(dob.getTime())) return null;

  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (dob >= today) {
    return { years: 0, months: 0, days: 0, totalMonths: 0, isFuture: true, isValid: true };
  }

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthDays;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years,
    months,
    days,
    totalMonths: years * 12 + months,
    isFuture: false,
    isValid: true,
  };
};

/**
 * Calculates the maximum allowable Date of Birth string (YYYY-MM-DD) for a given age threshold
 */
export const getMaxDateForAge = (years = 0, months = 0, ref = new Date()) => {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  d.setFullYear(d.getFullYear() - Number(years || 0));
  d.setMonth(d.getMonth() - Number(months || 0));

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Retrieves applicable minimum age criteria for a student, matching specific class or falling back to default
 */
export const getStudentAgeCriteria = (classParam, settings = null) => {
  const defaultCriteria = {
    minYears: settings?.student_min_age_years !== undefined ? parseInt(settings.student_min_age_years, 10) : 2,
    minMonths: settings?.student_min_age_months !== undefined ? parseInt(settings.student_min_age_months, 10) : 6,
    className: null,
    isClassSpecific: false,
  };

  if (!classParam) return defaultCriteria;

  const rawName = typeof classParam === 'object' ? classParam?.name : String(classParam);
  if (!rawName || rawName === 'undefined' || rawName === 'null' || !rawName.trim()) {
    return defaultCriteria;
  }

  const className = rawName.trim();

  let criteriaMap = settings?.class_age_criteria;
  if (typeof criteriaMap === 'string') {
    try {
      criteriaMap = JSON.parse(criteriaMap);
    } catch {
      criteriaMap = null;
    }
  }
  if (!criteriaMap || typeof criteriaMap !== 'object') {
    criteriaMap = DEFAULT_CLASS_AGE_CRITERIA;
  }

  // 1. Direct key match
  if (criteriaMap[className]) {
    const item = criteriaMap[className];
    return {
      minYears: parseInt(item.min_years ?? 2, 10),
      minMonths: parseInt(item.min_months ?? 0, 10),
      className,
      isClassSpecific: true,
    };
  }

  // 2. Case-insensitive / normalized match (e.g. "Class 1", "class 1", "Grade 1")
  const normTarget = className.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, item] of Object.entries(criteriaMap)) {
    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normKey === normTarget) {
      return {
        minYears: parseInt(item.min_years ?? 2, 10),
        minMonths: parseInt(item.min_months ?? 0, 10),
        className: key,
        isClassSpecific: true,
      };
    }

    // Number matching e.g. "Class 5" matches "5" or "Grade 5"
    const keyNum = key.match(/\d+/);
    const targetNum = className.match(/\d+/);
    if (keyNum && targetNum && keyNum[0] === targetNum[0]) {
      return {
        minYears: parseInt(item.min_years ?? 2, 10),
        minMonths: parseInt(item.min_months ?? 0, 10),
        className: key,
        isClassSpecific: true,
      };
    }
  }

  return {
    ...defaultCriteria,
    className,
  };
};

/**
 * Calculates max allowable DOB string for a student based on class or general student criteria
 */
export const getMaxStudentDateOfBirth = (classParam = null, settings = null) => {
  const criteria = getStudentAgeCriteria(classParam, settings);
  return getMaxDateForAge(criteria.minYears, criteria.minMonths);
};

/**
 * Validates student Date of Birth against class-wise or default 2 years 6 months criteria
 */
export const validateStudentDateOfBirth = (dobString, classParam = null, settings = null) => {
  if (!dobString) return null;

  const cleanStr = String(dobString).trim().substring(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length !== 3) {
    return 'Please enter a valid Date of Birth (YYYY-MM-DD).';
  }

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dob = new Date(y, m, d);
  if (isNaN(dob.getTime())) {
    return 'Please enter a valid Date of Birth.';
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (dob >= todayMidnight) {
    return "Student's date of birth cannot be today or a future date.";
  }

  const criteria = getStudentAgeCriteria(classParam, settings);
  const age = calculateAge(cleanStr, today);
  const requiredMonths = criteria.minYears * 12 + criteria.minMonths;

  if (age.totalMonths < requiredMonths) {
    const ageDesc = `${criteria.minYears} year${criteria.minYears !== 1 ? 's' : ''}${
      criteria.minMonths > 0 ? ` and ${criteria.minMonths} month${criteria.minMonths !== 1 ? 's' : ''}` : ''
    }`;
    if (criteria.className) {
      return `For ${criteria.className}, student must be at least ${ageDesc} old.`;
    }
    return `Student's date of birth must be at least ${ageDesc} old (minimum 2 years 6 months).`;
  }

  return null;
};

/**
 * Calculates max allowable DOB string for a teacher (default 20 years)
 */
export const getMaxTeacherDateOfBirth = (settings = null) => {
  const minYears = settings?.teacher_min_age_years !== undefined
    ? parseInt(settings.teacher_min_age_years, 10)
    : 20;
  return getMaxDateForAge(minYears, 0);
};

/**
 * Validates teacher Date of Birth (default minimum 20 years)
 */
export const validateTeacherDateOfBirth = (dobString, settings = null) => {
  if (!dobString) return null;

  const cleanStr = String(dobString).trim().substring(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length !== 3) {
    return 'Please enter a valid Date of Birth (YYYY-MM-DD).';
  }

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dob = new Date(y, m, d);
  if (isNaN(dob.getTime())) {
    return 'Please enter a valid Date of Birth.';
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (dob >= todayMidnight) {
    return "Teacher's date of birth cannot be today or a future date.";
  }

  const minYears = settings?.teacher_min_age_years !== undefined
    ? parseInt(settings.teacher_min_age_years, 10)
    : 20;

  const age = calculateAge(cleanStr, today);
  if (age.years < minYears) {
    return `Teacher's date of birth must be at least ${minYears} years back (minimum age is ${minYears} years).`;
  }

  return null;
};

/**
 * Calculates max allowable DOB string for non-teaching / staff members (default 18 years)
 */
export const getMaxStaffDateOfBirth = (settings = null) => {
  const minYears = settings?.staff_min_age_years !== undefined
    ? parseInt(settings.staff_min_age_years, 10)
    : 18;
  return getMaxDateForAge(minYears, 0);
};

/**
 * Validates staff Date of Birth (default minimum 18 years)
 */
export const validateStaffDateOfBirth = (dobString, settings = null) => {
  if (!dobString) return null;

  const cleanStr = String(dobString).trim().substring(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length !== 3) {
    return 'Please enter a valid Date of Birth (YYYY-MM-DD).';
  }

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dob = new Date(y, m, d);
  if (isNaN(dob.getTime())) {
    return 'Please enter a valid Date of Birth.';
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (dob >= todayMidnight) {
    return "Staff date of birth cannot be today or a future date.";
  }

  const minYears = settings?.staff_min_age_years !== undefined
    ? parseInt(settings.staff_min_age_years, 10)
    : 18;

  const age = calculateAge(cleanStr, today);
  if (age.years < minYears) {
    return `Staff date of birth must be at least ${minYears} years back (minimum age is ${minYears} years).`;
  }

  return null;
};

/**
 * Legacy backwards-compatible max DOB helper (defaults to 20 years)
 */
export const getMaxDateOfBirth = () => {
  return getMaxDateForAge(20, 0);
};

/**
 * Legacy backwards-compatible generic DOB validator
 */
export const validateDateOfBirth = (dobString) => {
  return validateTeacherDateOfBirth(dobString);
};

