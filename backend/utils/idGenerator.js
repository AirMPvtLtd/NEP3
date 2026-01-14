// utils/idGenerator.js
/**
 * ID GENERATOR - COMPLETE PRODUCTION VERSION
 * Unique ID generation utilities for various entity types
 * 
 * @module utils/idGenerator
 */

const { nanoid, customAlphabet } = require('nanoid');
const crypto = require('crypto');

// ============================================================================
// ID CONFIGURATIONS
// ============================================================================

const ID_CONFIGS = {
  STUDENT: {
    prefix: 'STD',
    length: 10,
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  TEACHER: {
    prefix: 'TCH',
    length: 10,
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  PARENT: {
    prefix: 'PNT',
    length: 10,
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  ADMIN: {
    prefix: 'ADM',
    length: 10,
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  SCHOOL: {
    prefix: 'SCH',
    length: 8,
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  CHALLENGE: {
    prefix: 'CHAL',
    length: 10,
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  REPORT: {
    prefix: 'RPT',
    length: 12,
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  TICKET: {
    prefix: 'TKT',
    length: 8,
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  NOTIFICATION: {
    prefix: 'NOTIF',
    length: 10,
    alphabet: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  SESSION: {
    prefix: 'SESS',
    length: 16,
    alphabet: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  TOKEN: {
    prefix: '',
    length: 32,
    alphabet: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  API_KEY: {
    prefix: 'nep',
    length: 32,
    alphabet: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  }
};

// ============================================================================
// BASIC ID GENERATION
// ============================================================================

/**
 * Generate ID with prefix
 * @param {String} prefix - ID prefix
 * @param {Number} length - ID length (excluding prefix)
 * @param {String} alphabet - Character set
 * @returns {String} Generated ID
 */
const generateWithPrefix = (prefix, length, alphabet) => {
  const generator = customAlphabet(alphabet, length);
  const id = generator();
  return prefix ? `${prefix}-${id}` : id;
};

/**
 * Generate student ID
 * @returns {String} Student ID
 */
const generateStudentId = () => {
  const config = ID_CONFIGS.STUDENT;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate teacher ID
 * @returns {String} Teacher ID
 */
const generateTeacherId = () => {
  const config = ID_CONFIGS.TEACHER;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate parent ID
 * @returns {String} Parent ID
 */
const generateParentId = () => {
  const config = ID_CONFIGS.PARENT;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate admin ID
 * @returns {String} Admin ID
 */
const generateAdminId = () => {
  const config = ID_CONFIGS.ADMIN;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate school ID
 * @returns {String} School ID
 */
const generateSchoolId = () => {
  const config = ID_CONFIGS.SCHOOL;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate challenge ID
 * @returns {String} Challenge ID
 */
const generateChallengeId = () => {
  const config = ID_CONFIGS.CHALLENGE;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate report ID
 * @returns {String} Report ID
 */
const generateReportId = () => {
  const config = ID_CONFIGS.REPORT;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate ticket ID
 * @returns {String} Ticket ID
 */
const generateTicketId = () => {
  const config = ID_CONFIGS.TICKET;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate notification ID
 * @returns {String} Notification ID
 */
const generateNotificationId = () => {
  const config = ID_CONFIGS.NOTIFICATION;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate session ID
 * @returns {String} Session ID
 */
const generateSessionId = () => {
  const config = ID_CONFIGS.SESSION;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate secure random token
 * @param {Number} length - Token length
 * @returns {String} Token
 */
const generateToken = (length = 32) => {
  const config = ID_CONFIGS.TOKEN;
  const generator = customAlphabet(config.alphabet, length);
  return generator();
};

/**
 * Generate API key
 * @returns {String} API key
 */
const generateApiKey = () => {
  const config = ID_CONFIGS.API_KEY;
  return generateWithPrefix(config.prefix, config.length, config.alphabet);
};

/**
 * Generate verification token
 * @returns {String} Verification token
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate reset token
 * @returns {String} Reset token
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate OTP (One-Time Password)
 * @param {Number} length - OTP length
 * @returns {String} OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  const generator = customAlphabet(digits, length);
  return generator();
};

// ============================================================================
// UUID GENERATION
// ============================================================================

/**
 * Generate UUID v4
 * @returns {String} UUID
 */
const generateUUID = () => {
  return crypto.randomUUID();
};

/**
 * Generate short UUID
 * @param {Number} length - Length
 * @returns {String} Short UUID
 */
const generateShortUUID = (length = 8) => {
  return nanoid(length);
};

/**
 * Generate URL-safe UUID
 * @returns {String} URL-safe UUID
 */
const generateUrlSafeUUID = () => {
  return nanoid();
};

// ============================================================================
// CUSTOM ID GENERATION
// ============================================================================

/**
 * Generate custom ID
 * @param {Object} options - Generation options
 * @returns {String} Custom ID
 */
const generateCustomId = (options = {}) => {
  const {
    prefix = '',
    length = 10,
    alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    separator = '-',
    includeTimestamp = false,
    includeChecksum = false
  } = options;
  
  let id = '';
  
  // Add timestamp if requested
  if (includeTimestamp) {
    const timestamp = Date.now().toString(36).toUpperCase();
    id += timestamp + separator;
  }
  
  // Generate random part
  const generator = customAlphabet(alphabet, length);
  const randomPart = generator();
  id += randomPart;
  
  // Add checksum if requested
  if (includeChecksum) {
    const checksum = calculateChecksum(id);
    id += separator + checksum;
  }
  
  // Add prefix
  if (prefix) {
    id = prefix + separator + id;
  }
  
  return id;
};

/**
 * Generate sequential ID
 * @param {String} prefix - Prefix
 * @param {Number} sequence - Sequence number
 * @param {Number} padding - Zero padding
 * @returns {String} Sequential ID
 */
const generateSequentialId = (prefix, sequence, padding = 6) => {
  const sequenceStr = sequence.toString().padStart(padding, '0');
  return prefix ? `${prefix}-${sequenceStr}` : sequenceStr;
};

/**
 * Generate timestamp-based ID
 * @param {String} prefix - Prefix
 * @returns {String} Timestamp ID
 */
const generateTimestampId = (prefix = '') => {
  const timestamp = Date.now();
  const random = nanoid(6);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
};

/**
 * Generate hierarchical ID
 * @param {Array} components - ID components
 * @param {String} separator - Separator
 * @returns {String} Hierarchical ID
 */
const generateHierarchicalId = (components, separator = '-') => {
  return components.join(separator);
};

// ============================================================================
// CHECKSUM & VALIDATION
// ============================================================================

/**
 * Calculate checksum for ID
 * @param {String} id - ID string
 * @returns {String} Checksum
 */
const calculateChecksum = (id) => {
  const hash = crypto.createHash('md5').update(id).digest('hex');
  return hash.substring(0, 4).toUpperCase();
};

/**
 * Verify ID checksum
 * @param {String} id - ID with checksum
 * @param {String} separator - Separator character
 * @returns {Boolean} Valid checksum
 */
const verifyChecksum = (id, separator = '-') => {
  const parts = id.split(separator);
  const checksum = parts.pop();
  const baseId = parts.join(separator);
  
  return calculateChecksum(baseId) === checksum;
};

/**
 * Validate ID format
 * @param {String} id - ID to validate
 * @param {String} type - ID type
 * @returns {Boolean} Valid format
 */
const validateIdFormat = (id, type) => {
  const config = ID_CONFIGS[type.toUpperCase()];
  
  if (!config) {
    return false;
  }
  
  const pattern = new RegExp(`^${config.prefix}-[${config.alphabet}]{${config.length}}$`);
  return pattern.test(id);
};

/**
 * Extract ID components
 * @param {String} id - ID string
 * @param {String} separator - Separator
 * @returns {Object} ID components
 */
const parseId = (id, separator = '-') => {
  const parts = id.split(separator);
  
  return {
    prefix: parts.length > 1 ? parts[0] : null,
    body: parts.length > 1 ? parts.slice(1).join(separator) : parts[0],
    full: id
  };
};

// ============================================================================
// BULK GENERATION
// ============================================================================

/**
 * Generate multiple IDs
 * @param {Function} generator - Generator function
 * @param {Number} count - Number of IDs
 * @returns {Array} Array of IDs
 */
const generateBatch = (generator, count) => {
  const ids = [];
  const seen = new Set();
  
  while (ids.length < count) {
    const id = generator();
    
    // Ensure uniqueness
    if (!seen.has(id)) {
      ids.push(id);
      seen.add(id);
    }
  }
  
  return ids;
};

/**
 * Generate unique ID set
 * @param {String} type - ID type
 * @param {Number} count - Count
 * @returns {Set} Set of unique IDs
 */
const generateUniqueSet = (type, count) => {
  const generators = {
    student: generateStudentId,
    teacher: generateTeacherId,
    parent: generateParentId,
    admin: generateAdminId,
    school: generateSchoolId,
    challenge: generateChallengeId,
    report: generateReportId,
    ticket: generateTicketId,
    notification: generateNotificationId
  };
  
  const generator = generators[type.toLowerCase()];
  
  if (!generator) {
    throw new Error(`Unknown ID type: ${type}`);
  }
  
  return new Set(generateBatch(generator, count));
};

// ============================================================================
// ID UTILITIES
// ============================================================================

/**
 * Check if ID is valid
 * @param {String} id - ID to check
 * @returns {Boolean} Is valid
 */
const isValidId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  return id.length >= 3 && /^[A-Z0-9-]+$/.test(id);
};

/**
 * Sanitize ID
 * @param {String} id - ID to sanitize
 * @returns {String} Sanitized ID
 */
const sanitizeId = (id) => {
  if (!id) return '';
  
  return id
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .trim();
};

/**
 * Get ID type from prefix
 * @param {String} id - ID string
 * @returns {String} ID type
 */
const getIdType = (id) => {
  const parsed = parseId(id);
  const prefix = parsed.prefix;
  
  const typeMap = {
    STD: 'student',
    TCH: 'teacher',
    PNT: 'parent',
    ADM: 'admin',
    SCH: 'school',
    CHAL: 'challenge',
    RPT: 'report',
    TKT: 'ticket',
    NOTIF: 'notification',
    SESS: 'session'
  };
  
  return typeMap[prefix] || 'unknown';
};

/**
 * Compare IDs
 * @param {String} id1 - First ID
 * @param {String} id2 - Second ID
 * @returns {Number} Comparison result
 */
const compareIds = (id1, id2) => {
  return id1.localeCompare(id2);
};

/**
 * Sort IDs
 * @param {Array} ids - Array of IDs
 * @param {Boolean} ascending - Sort order
 * @returns {Array} Sorted IDs
 */
const sortIds = (ids, ascending = true) => {
  return ids.sort((a, b) => {
    return ascending ? compareIds(a, b) : compareIds(b, a);
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Entity IDs
  generateStudentId,
  generateTeacherId,
  generateParentId,
  generateAdminId,
  generateSchoolId,
  generateChallengeId,
  generateReportId,
  generateTicketId,
  generateNotificationId,
  generateSessionId,
  
  // Tokens
  generateToken,
  generateApiKey,
  generateVerificationToken,
  generateResetToken,
  generateOTP,
  
  // UUIDs
  generateUUID,
  generateShortUUID,
  generateUrlSafeUUID,
  
  // Custom
  generateCustomId,
  generateSequentialId,
  generateTimestampId,
  generateHierarchicalId,
  
  // Validation
  calculateChecksum,
  verifyChecksum,
  validateIdFormat,
  parseId,
  
  // Bulk
  generateBatch,
  generateUniqueSet,
  
  // Utilities
  isValidId,
  sanitizeId,
  getIdType,
  compareIds,
  sortIds,
  
  // Configuration
  ID_CONFIGS
};