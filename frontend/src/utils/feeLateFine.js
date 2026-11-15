/**
 * Fee Late Fine & Overdue Calculation Utilities
 */

export const LATE_FINE_TYPES = [
  { value: 'fixed_per_month', label: 'Fixed Amount Per Overdue Month (₹)' },
  { value: 'percentage', label: 'Percentage of Monthly Fee (% per month)' },
  { value: 'daily', label: 'Daily Late Fine (₹ per day overdue)' },
];

/**
 * Checks if a specific month is overdue according to school fee due day & grace period
 * @param {Object} month - Month object with { year: number, monthIndex: number (0-11) }
 * @param {Object} settings - Settings object with fee_due_day_of_month & fee_grace_period_days
 * @param {Date} [referenceDate] - Current date to evaluate against (defaults to now)
 * @returns {boolean}
 */
export const isMonthOverdue = (month, settings = {}, referenceDate = new Date()) => {
  if (!month || month.year === undefined || month.monthIndex === undefined) return false;

  const dueDay = Math.min(31, Math.max(1, parseInt(settings.fee_due_day_of_month ?? 10, 10) || 10));
  const graceDays = Math.max(0, parseInt(settings.fee_grace_period_days ?? 0, 10) || 0);

  // Month deadline: dueDay + graceDays in the month at 23:59:59
  const deadline = new Date(month.year, month.monthIndex, dueDay + graceDays, 23, 59, 59, 999);

  return referenceDate > deadline;
};

/**
 * Calculates number of overdue days for a specific month
 * @param {Object} month - Month object with { year, monthIndex }
 * @param {Object} settings - Settings object
 * @param {Date} [referenceDate] - Current date
 * @returns {number}
 */
export const getDaysOverdue = (month, settings = {}, referenceDate = new Date()) => {
  if (!month || month.year === undefined || month.monthIndex === undefined) return 0;

  const dueDay = Math.min(31, Math.max(1, parseInt(settings.fee_due_day_of_month ?? 10, 10) || 10));
  const graceDays = Math.max(0, parseInt(settings.fee_grace_period_days ?? 0, 10) || 0);

  const deadline = new Date(month.year, month.monthIndex, dueDay + graceDays, 23, 59, 59, 999);
  if (referenceDate <= deadline) return 0;

  const diffMs = referenceDate.getTime() - deadline.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

/**
 * Calculates the total late fine for a list of overdue months
 * @param {Array} overdueMonthsList - Array of month objects that are overdue
 * @param {number} monthlyFeeRate - Monthly recurring fee subtotal for 1 month
 * @param {Object} settings - Application settings
 * @param {Date} [referenceDate] - Current date
 * @returns {Object} { fineAmount: number, overdueCount: number, overdueMonths: string[], ruleDescription: string }
 */
export const calculateLateFine = (
  overdueMonthsList = [],
  monthlyFeeRate = 0,
  settings = {},
  referenceDate = new Date()
) => {
  const isEnabled = settings.fee_late_fine_enabled === true || 
    settings.fee_late_fine_enabled === 'true' || 
    settings.fee_late_fine_enabled === 1 ||
    settings.fee_late_fine_enabled === '1';

  if (!isEnabled || !Array.isArray(overdueMonthsList) || overdueMonthsList.length === 0) {
    return {
      fineAmount: 0,
      overdueCount: 0,
      overdueMonths: [],
      ruleDescription: 'Late fine disabled or no overdue months',
    };
  }

  const fineType = settings.fee_late_fine_type || 'fixed_per_month';
  const fineAmountSetting = parseFloat(settings.fee_late_fine_amount ?? 100) || 0;
  const maxCap = Math.max(0, parseFloat(settings.fee_late_fine_max_cap ?? 0) || 0);
  const dueDay = settings.fee_due_day_of_month || 10;

  let rawFine = 0;
  let ruleDescription = '';

  if (fineType === 'percentage') {
    // Percentage of 1 month's fee multiplied by overdue months count
    const rate = fineAmountSetting / 100;
    const finePerMonth = Math.round((parseFloat(monthlyFeeRate) || 0) * rate);
    rawFine = overdueMonthsList.length * finePerMonth;
    ruleDescription = `${fineAmountSetting}% per overdue month (₹${finePerMonth}/mo after ${dueDay}th)`;
  } else if (fineType === 'daily') {
    // Daily fine for each overdue day across all overdue months
    let totalDays = 0;
    overdueMonthsList.forEach(m => {
      totalDays += getDaysOverdue(m, settings, referenceDate);
    });
    rawFine = totalDays * fineAmountSetting;
    ruleDescription = `₹${fineAmountSetting}/day overdue (${totalDays} day${totalDays !== 1 ? 's' : ''} past ${dueDay}th)`;
  } else {
    // Default: fixed amount per overdue month
    rawFine = overdueMonthsList.length * fineAmountSetting;
    ruleDescription = `₹${fineAmountSetting} per overdue month (due after ${dueDay}th)`;
  }

  // Apply maximum cap if configured (> 0)
  let capped = false;
  if (maxCap > 0 && rawFine > maxCap) {
    rawFine = maxCap;
    capped = true;
    ruleDescription += ` (Capped at max ₹${maxCap})`;
  }

  return {
    fineAmount: Math.max(0, Math.round(rawFine)),
    overdueCount: overdueMonthsList.length,
    overdueMonths: overdueMonthsList.map(m => m.name || m.shortName || m.key),
    ruleDescription,
    capped,
  };
};
