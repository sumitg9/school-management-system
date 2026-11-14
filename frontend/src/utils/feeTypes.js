/**
 * Standard predefined fee types in the system
 */
export const STANDARD_FEE_TYPES = [
  { id: 'tuition', label: 'Tuition' },
  { id: 'transport', label: 'Transport' },
  { id: 'library', label: 'Library' },
  { id: 'sports', label: 'Sports' },
  { id: 'exam', label: 'Exam' },
  { id: 'lab', label: 'Laboratory' },
  { id: 'hostel', label: 'Hostel' },
  { id: 'uniform', label: 'Uniform' },
  { id: 'books', label: 'Books & Stationery' },
  { id: 'admission', label: 'Admission Fee' },
  { id: 'activity', label: 'Extra-Curricular Activity' },
  { id: 'other', label: 'Other' },
];

const STORAGE_KEY = 'custom_fee_types';

/**
 * Retrieves persisted custom fee types from localStorage
 */
export const getSavedCustomFeeTypes = () => {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
      return [];
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
};

/**
 * Persists a new custom fee type into localStorage and returns the created type object
 */
export const saveCustomFeeType = (rawName) => {
  if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
    return null;
  }

  const label = rawName.trim();
  // Generate safe identifier
  const id = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom-fee';

  const current = getSavedCustomFeeTypes();
  const existing = current.find(
    t => t.id === id || t.label.toLowerCase() === label.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  const newType = { id, label, isCustom: true };
  const updated = [...current, newType];
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.warn('Failed to persist custom fee type:', error);
  }

  return newType;
};

/**
 * Removes a custom fee type from localStorage
 */
export const removeCustomFeeType = (idToRemove) => {
  try {
    const current = getSavedCustomFeeTypes();
    const updated = current.filter(t => t.id !== idToRemove);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (error) {
    return [];
  }
};

/**
 * Combines standard and custom fee types without duplicates
 */
export const getAllFeeTypes = (additionalTypes = []) => {
  const combined = [...STANDARD_FEE_TYPES];
  const customList = getSavedCustomFeeTypes();

  customList.forEach(c => {
    if (!combined.some(item => item.id.toLowerCase() === c.id.toLowerCase())) {
      combined.push(c);
    }
  });

  if (Array.isArray(additionalTypes)) {
    additionalTypes.forEach(item => {
      if (!item) return;
      const typeStr = typeof item === 'object' ? (item.type || item.id || '') : String(item);
      const clean = typeStr.trim();
      if (clean && !combined.some(t => t.id.toLowerCase() === clean.toLowerCase())) {
        combined.push({
          id: clean,
          label: formatFeeTypeLabel(clean),
          isCustom: true,
        });
      }
    });
  }

  return combined;
};

/**
 * Formats any fee type id/slug into a human-readable title
 */
export const formatFeeTypeLabel = (type) => {
  if (!type) return '';
  const clean = String(type).trim();

  // 1. Look up in standard types
  const std = STANDARD_FEE_TYPES.find(t => t.id.toLowerCase() === clean.toLowerCase());
  if (std) return std.label;

  // 2. Look up in custom types
  const customs = getSavedCustomFeeTypes();
  const matched = customs.find(
    t => t.id.toLowerCase() === clean.toLowerCase() || t.label.toLowerCase() === clean.toLowerCase()
  );
  if (matched) return matched.label;

  // 3. Fallback: Title case conversion (e.g., "computer-lab" -> "Computer Lab")
  return clean
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Returns badge variant for a given fee type
 */
export const getFeeTypeBadgeVariant = (type) => {
  switch (String(type || '').toLowerCase()) {
    case 'tuition': return 'primary';
    case 'transport': return 'info';
    case 'library': return 'success';
    case 'sports': return 'warning';
    case 'exam': return 'danger';
    case 'lab': return 'purple';
    case 'hostel': return 'secondary';
    case 'uniform': return 'secondary';
    default: return 'default';
  }
};
