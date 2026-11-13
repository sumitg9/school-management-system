/**
 * Currency Formatter Utility
 * Formats financial amounts using the Indian Rupee symbol (₹) and Indian number grouping (lakhs/crores).
 */

export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_CURRENCY_SYMBOL = '₹';

/**
 * Format a number or numeric string as Indian Rupee currency.
 * @param {number|string} amount - The amount to format
 * @param {object|string} [options] - Optional overrides or custom symbol string
 * @returns {string} Formatted currency string, e.g. "₹500.00", "₹1,50,000.00"
 */
export const formatCurrency = (amount, options = {}) => {
  if (amount === null || amount === undefined || amount === '') return '-';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return '-';

  const symbol = typeof options === 'string' ? options : (options.symbol || DEFAULT_CURRENCY_SYMBOL);
  const decimals = typeof options === 'object' && options.decimals !== undefined ? options.decimals : 2;

  try {
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
    return `${symbol}${formatted}`;
  } catch {
    return `${symbol}${num.toFixed(decimals)}`;
  }
};

export default formatCurrency;

