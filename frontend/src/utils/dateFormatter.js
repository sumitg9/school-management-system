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

