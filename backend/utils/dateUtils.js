// utils/dateUtils.js
/**
 * DATE UTILS - COMPLETE PRODUCTION VERSION
 * Date formatting, parsing, and manipulation utilities
 * 
 * @module utils/dateUtils
 */

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date to string
 * @param {Date|String|Number} date - Date to format
 * @param {String} format - Format string
 * @returns {String} Formatted date
 */
const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const milliseconds = String(d.getMilliseconds()).padStart(3, '0');
  
  const tokens = {
    YYYY: year,
    YY: String(year).slice(-2),
    MM: month,
    M: String(d.getMonth() + 1),
    DD: day,
    D: String(d.getDate()),
    HH: hours,
    H: String(d.getHours()),
    hh: String(d.getHours() % 12 || 12).padStart(2, '0'),
    h: String(d.getHours() % 12 || 12),
    mm: minutes,
    m: String(d.getMinutes()),
    ss: seconds,
    s: String(d.getSeconds()),
    SSS: milliseconds,
    A: d.getHours() >= 12 ? 'PM' : 'AM',
    a: d.getHours() >= 12 ? 'pm' : 'am'
  };
  
  let result = format;
  Object.keys(tokens).forEach(token => {
    result = result.replace(new RegExp(token, 'g'), tokens[token]);
  });
  
  return result;
};

/**
 * Format date to ISO string
 * @param {Date|String|Number} date - Date
 * @returns {String} ISO string
 */
const toISO = (date) => {
  return new Date(date).toISOString();
};

/**
 * Format date to locale string
 * @param {Date|String|Number} date - Date
 * @param {String} locale - Locale
 * @param {Object} options - Intl options
 * @returns {String} Locale string
 */
const toLocaleString = (date, locale = 'en-US', options = {}) => {
  return new Date(date).toLocaleString(locale, options);
};

/**
 * Format date to human-readable string
 * @param {Date|String|Number} date - Date
 * @returns {String} Human-readable date
 */
const toHumanReadable = (date) => {
  const d = new Date(date);
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return d.toLocaleString('en-US', options);
};

/**
 * Format date to time string
 * @param {Date|String|Number} date - Date
 * @param {Boolean} includeSeconds - Include seconds
 * @returns {String} Time string
 */
const toTimeString = (date, includeSeconds = false) => {
  const format = includeSeconds ? 'HH:mm:ss' : 'HH:mm';
  return formatDate(date, format);
};

/**
 * Format date to date string (no time)
 * @param {Date|String|Number} date - Date
 * @returns {String} Date string
 */
const toDateString = (date) => {
  return formatDate(date, 'YYYY-MM-DD');
};

// ============================================================================
// RELATIVE TIME
// ============================================================================

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date|String|Number} date - Date
 * @param {Date|String|Number} baseDate - Base date (default: now)
 * @returns {String} Relative time
 */
const getRelativeTime = (date, baseDate = new Date()) => {
  const d = new Date(date);
  const base = new Date(baseDate);
  const diff = base - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) {
    return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
  } else if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  } else if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (days < 7) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  } else if (weeks < 4) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } else {
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
};

/**
 * Get time from now
 * @param {Date|String|Number} date - Date
 * @returns {String} Time from now
 */
const fromNow = (date) => {
  return getRelativeTime(date);
};

/**
 * Get time until date
 * @param {Date|String|Number} date - Date
 * @returns {String} Time until
 */
const timeUntil = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = d - now;
  
  if (diff <= 0) {
    return 'passed';
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return `in ${seconds} seconds`;
  } else if (minutes < 60) {
    return `in ${minutes} minutes`;
  } else if (hours < 24) {
    return `in ${hours} hours`;
  } else {
    return `in ${days} days`;
  }
};

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Parse date string to Date object
 * @param {String} dateString - Date string
 * @returns {Date} Parsed date
 */
const parseDate = (dateString) => {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date string');
  }
  
  return date;
};

/**
 * Parse ISO string to Date
 * @param {String} isoString - ISO string
 * @returns {Date} Parsed date
 */
const fromISO = (isoString) => {
  return new Date(isoString);
};

/**
 * Parse timestamp to Date
 * @param {Number} timestamp - Unix timestamp (seconds or milliseconds)
 * @returns {Date} Parsed date
 */
const fromTimestamp = (timestamp) => {
  // If timestamp is in seconds, convert to milliseconds
  const ts = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  return new Date(ts);
};

// ============================================================================
// DATE MANIPULATION
// ============================================================================

/**
 * Add time to date
 * @param {Date|String|Number} date - Date
 * @param {Number} amount - Amount to add
 * @param {String} unit - Unit (seconds, minutes, hours, days, weeks, months, years)
 * @returns {Date} New date
 */
const addTime = (date, amount, unit = 'days') => {
  const d = new Date(date);
  
  const units = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000
  };
  
  if (unit === 'months') {
    d.setMonth(d.getMonth() + amount);
  } else if (unit === 'years') {
    d.setFullYear(d.getFullYear() + amount);
  } else if (units[unit]) {
    d.setTime(d.getTime() + amount * units[unit]);
  }
  
  return d;
};

/**
 * Subtract time from date
 * @param {Date|String|Number} date - Date
 * @param {Number} amount - Amount to subtract
 * @param {String} unit - Unit
 * @returns {Date} New date
 */
const subtractTime = (date, amount, unit = 'days') => {
  return addTime(date, -amount, unit);
};

/**
 * Set date to start of day
 * @param {Date|String|Number} date - Date
 * @returns {Date} Start of day
 */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Set date to end of day
 * @param {Date|String|Number} date - Date
 * @returns {Date} End of day
 */
const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Set date to start of week
 * @param {Date|String|Number} date - Date
 * @returns {Date} Start of week
 */
const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Set date to end of week
 * @param {Date|String|Number} date - Date
 * @returns {Date} End of week
 */
const endOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Set date to start of month
 * @param {Date|String|Number} date - Date
 * @returns {Date} Start of month
 */
const startOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Set date to end of month
 * @param {Date|String|Number} date - Date
 * @returns {Date} End of month
 */
const endOfMonth = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

// ============================================================================
// DATE COMPARISON
// ============================================================================

/**
 * Check if date is before another date
 * @param {Date|String|Number} date1 - First date
 * @param {Date|String|Number} date2 - Second date
 * @returns {Boolean} Is before
 */
const isBefore = (date1, date2) => {
  return new Date(date1) < new Date(date2);
};

/**
 * Check if date is after another date
 * @param {Date|String|Number} date1 - First date
 * @param {Date|String|Number} date2 - Second date
 * @returns {Boolean} Is after
 */
const isAfter = (date1, date2) => {
  return new Date(date1) > new Date(date2);
};

/**
 * Check if dates are same day
 * @param {Date|String|Number} date1 - First date
 * @param {Date|String|Number} date2 - Second date
 * @returns {Boolean} Same day
 */
const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * Check if date is today
 * @param {Date|String|Number} date - Date
 * @returns {Boolean} Is today
 */
const isToday = (date) => {
  return isSameDay(date, new Date());
};

/**
 * Check if date is in the past
 * @param {Date|String|Number} date - Date
 * @returns {Boolean} Is past
 */
const isPast = (date) => {
  return new Date(date) < new Date();
};

/**
 * Check if date is in the future
 * @param {Date|String|Number} date - Date
 * @returns {Boolean} Is future
 */
const isFuture = (date) => {
  return new Date(date) > new Date();
};

/**
 * Check if date is between two dates
 * @param {Date|String|Number} date - Date to check
 * @param {Date|String|Number} start - Start date
 * @param {Date|String|Number} end - End date
 * @returns {Boolean} Is between
 */
const isBetween = (date, start, end) => {
  const d = new Date(date);
  return d >= new Date(start) && d <= new Date(end);
};

// ============================================================================
// DATE DIFFERENCE
// ============================================================================

/**
 * Get difference between two dates
 * @param {Date|String|Number} date1 - First date
 * @param {Date|String|Number} date2 - Second date
 * @param {String} unit - Unit (milliseconds, seconds, minutes, hours, days)
 * @returns {Number} Difference
 */
const getDifference = (date1, date2, unit = 'milliseconds') => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = d1 - d2;
  
  const units = {
    milliseconds: 1,
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000
  };
  
  return Math.floor(diff / (units[unit] || 1));
};

/**
 * Get age from birth date
 * @param {Date|String|Number} birthDate - Birth date
 * @returns {Number} Age in years
 */
const getAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// ============================================================================
// DATE VALIDATION
// ============================================================================

/**
 * Check if date is valid
 * @param {Date|String|Number} date - Date
 * @returns {Boolean} Is valid
 */
const isValidDate = (date) => {
  const d = new Date(date);
  return !isNaN(d.getTime());
};

/**
 * Check if year is leap year
 * @param {Number} year - Year
 * @returns {Boolean} Is leap year
 */
const isLeapYear = (year) => {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

/**
 * Get days in month
 * @param {Number} year - Year
 * @param {Number} month - Month (1-12)
 * @returns {Number} Days in month
 */
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// ============================================================================
// DATE RANGES
// ============================================================================

/**
 * Generate date range
 * @param {Date|String|Number} start - Start date
 * @param {Date|String|Number} end - End date
 * @param {String} unit - Unit (days, weeks, months)
 * @returns {Array} Array of dates
 */
const getDateRange = (start, end, unit = 'days') => {
  const dates = [];
  let current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current = addTime(current, 1, unit);
  }
  
  return dates;
};

/**
 * Get business days between dates
 * @param {Date|String|Number} start - Start date
 * @param {Date|String|Number} end - End date
 * @returns {Number} Business days
 */
const getBusinessDays = (start, end) => {
  const dates = getDateRange(start, end, 'days');
  return dates.filter(date => {
    const day = date.getDay();
    return day !== 0 && day !== 6; // Not Sunday or Saturday
  }).length;
};

// ============================================================================
// TIMEZONE
// ============================================================================

/**
 * Get timezone offset in hours
 * @returns {Number} Offset in hours
 */
const getTimezoneOffset = () => {
  return -new Date().getTimezoneOffset() / 60;
};

/**
 * Convert date to UTC
 * @param {Date|String|Number} date - Date
 * @returns {Date} UTC date
 */
const toUTC = (date) => {
  const d = new Date(date);
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
};

/**
 * Convert UTC to local time
 * @param {Date|String|Number} date - UTC date
 * @returns {Date} Local date
 */
const toLocal = (date) => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
};

// ============================================================================
// ACADEMIC CALENDAR
// ============================================================================

/**
 * Get academic year from date
 * @param {Date|String|Number} date - Date
 * @returns {String} Academic year (e.g., "2024-2025")
 */
const getAcademicYear = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  
  // Academic year starts in July (month 6)
  if (month >= 6) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
};

/**
 * Get academic term from date
 * @param {Date|String|Number} date - Date
 * @returns {String} Term (Term 1, Term 2, Term 3)
 */
const getAcademicTerm = (date) => {
  const d = new Date(date);
  const month = d.getMonth();
  
  // Term 1: July-October
  if (month >= 6 && month <= 9) {
    return 'Term 1';
  }
  // Term 2: November-February
  else if (month >= 10 || month <= 1) {
    return 'Term 2';
  }
  // Term 3: March-June
  else {
    return 'Term 3';
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Formatting
  formatDate,
  toISO,
  toLocaleString,
  toHumanReadable,
  toTimeString,
  toDateString,
  
  // Relative time
  getRelativeTime,
  fromNow,
  timeUntil,
  
  // Parsing
  parseDate,
  fromISO,
  fromTimestamp,
  
  // Manipulation
  addTime,
  subtractTime,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  
  // Comparison
  isBefore,
  isAfter,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  isBetween,
  
  // Difference
  getDifference,
  getAge,
  
  // Validation
  isValidDate,
  isLeapYear,
  getDaysInMonth,
  
  // Ranges
  getDateRange,
  getBusinessDays,
  
  // Timezone
  getTimezoneOffset,
  toUTC,
  toLocal,
  
  // Academic
  getAcademicYear,
  getAcademicTerm
};