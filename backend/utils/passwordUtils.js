// utils/passwordUtils.js
/**
 * PASSWORD UTILS - COMPLETE PRODUCTION VERSION
 * Password hashing, validation, and security utilities
 * 
 * @module utils/passwordUtils
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');

// ============================================================================
// PASSWORD CONFIGURATION
// ============================================================================

const PASSWORD_CONFIG = {
  // Bcrypt salt rounds
  saltRounds: 12,
  
  // Password requirements
  minLength: 8,
  maxLength: 128,
  
  // Complexity requirements
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  
  // Special characters allowed
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  
  // Password history
  historyLimit: 5,
  
  // Reset token expiry (24 hours)
  resetTokenExpiry: 24 * 60 * 60 * 1000,
  
  // Temporary password expiry (1 hour)
  tempPasswordExpiry: 60 * 60 * 1000
};

// ============================================================================
// PASSWORD HASHING
// ============================================================================

/**
 * Hash password using bcrypt
 * @param {String} password - Plain text password
 * @param {Number} rounds - Salt rounds
 * @returns {Promise<String>} Hashed password
 */
const hashPassword = async (password, rounds = PASSWORD_CONFIG.saltRounds) => {
  if (!password) {
    throw new Error('Password is required');
  }
  
  const salt = await bcrypt.genSalt(rounds);
  const hash = await bcrypt.hash(password, salt);
  
  return hash;
};

/**
 * Compare password with hash
 * @param {String} password - Plain text password
 * @param {String} hash - Hashed password
 * @returns {Promise<Boolean>} Match result
 */
const comparePassword = async (password, hash) => {
  if (!password || !hash) {
    return false;
  }
  
  return await bcrypt.compare(password, hash);
};

/**
 * Hash password synchronously
 * @param {String} password - Plain text password
 * @param {Number} rounds - Salt rounds
 * @returns {String} Hashed password
 */
const hashPasswordSync = (password, rounds = PASSWORD_CONFIG.saltRounds) => {
  if (!password) {
    throw new Error('Password is required');
  }
  
  const salt = bcrypt.genSaltSync(rounds);
  return bcrypt.hashSync(password, salt);
};

/**
 * Compare password synchronously
 * @param {String} password - Plain text password
 * @param {String} hash - Hashed password
 * @returns {Boolean} Match result
 */
const comparePasswordSync = (password, hash) => {
  if (!password || !hash) {
    return false;
  }
  
  return bcrypt.compareSync(password, hash);
};

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
const validatePassword = (password, options = {}) => {
  const config = { ...PASSWORD_CONFIG, ...options };
  const errors = [];
  
  // Check if password exists
  if (!password) {
    return {
      valid: false,
      errors: ['Password is required'],
      strength: 0
    };
  }
  
  // Check length
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }
  
  if (password.length > config.maxLength) {
    errors.push(`Password must not exceed ${config.maxLength} characters`);
  }
  
  // Check uppercase
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check lowercase
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check numbers
  if (config.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check special characters
  if (config.requireSpecialChars) {
    const specialRegex = new RegExp(`[${config.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (!specialRegex.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  // Calculate strength
  const strength = calculatePasswordStrength(password);
  
  return {
    valid: errors.length === 0,
    errors,
    strength
  };
};

/**
 * Calculate password strength (0-100)
 * @param {String} password - Password
 * @returns {Number} Strength score
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  if (!password) return 0;
  
  // Length score (max 40 points)
  score += Math.min(password.length * 4, 40);
  
  // Uppercase letters (10 points)
  if (/[A-Z]/.test(password)) score += 10;
  
  // Lowercase letters (10 points)
  if (/[a-z]/.test(password)) score += 10;
  
  // Numbers (10 points)
  if (/[0-9]/.test(password)) score += 10;
  
  // Special characters (15 points)
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  
  // Mixed case (5 points)
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 5;
  
  // Letters and numbers (5 points)
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score += 5;
  
  // Letters, numbers and special chars (5 points)
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
    score += 5;
  }
  
  return Math.min(100, score);
};

/**
 * Get password strength label
 * @param {Number} strength - Strength score (0-100)
 * @returns {String} Strength label
 */
const getPasswordStrengthLabel = (strength) => {
  if (strength < 30) return 'Very Weak';
  if (strength < 50) return 'Weak';
  if (strength < 70) return 'Fair';
  if (strength < 90) return 'Strong';
  return 'Very Strong';
};

/**
 * Check if password is commonly used
 * @param {String} password - Password to check
 * @returns {Boolean} Is common password
 */
const isCommonPassword = (password) => {
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'monkey', '1234567', 'letmein', 'trustno1', 'dragon',
    'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
    'bailey', 'passw0rd', 'shadow', '123123', '654321',
    'superman', 'qazwsx', 'michael', 'football'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
};

/**
 * Check if password contains personal info
 * @param {String} password - Password
 * @param {Object} userInfo - User information
 * @returns {Boolean} Contains personal info
 */
const containsPersonalInfo = (password, userInfo = {}) => {
  const lowerPassword = password.toLowerCase();
  
  const fields = [
    userInfo.name,
    userInfo.email?.split('@')[0],
    userInfo.username,
    userInfo.phone
  ].filter(Boolean);
  
  return fields.some(field => 
    lowerPassword.includes(field.toLowerCase())
  );
};

// ============================================================================
// PASSWORD GENERATION
// ============================================================================

/**
 * Generate random password
 * @param {Object} options - Generation options
 * @returns {String} Generated password
 */
const generatePassword = (options = {}) => {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSpecialChars = true,
    excludeSimilar = true,
    excludeAmbiguous = true
  } = options;
  
  let charset = '';
  
  if (includeUppercase) {
    charset += excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (includeLowercase) {
    charset += excludeSimilar ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (includeNumbers) {
    charset += excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (includeSpecialChars) {
    charset += excludeAmbiguous ? '!@#$%^&*-_=+' : '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }
  
  if (charset.length === 0) {
    throw new Error('No character sets selected');
  }
  
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  // Ensure password meets requirements
  if (includeUppercase && !/[A-Z]/.test(password)) {
    password = password.slice(0, -1) + 'A';
  }
  if (includeLowercase && !/[a-z]/.test(password)) {
    password = password.slice(0, -1) + 'a';
  }
  if (includeNumbers && !/[0-9]/.test(password)) {
    password = password.slice(0, -1) + '1';
  }
  if (includeSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    password = password.slice(0, -1) + '!';
  }
  
  return password;
};

/**
 * Generate secure random password
 * @param {Number} length - Password length
 * @returns {String} Secure password
 */
const generateSecurePassword = (length = 16) => {
  return generatePassword({
    length,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSpecialChars: true,
    excludeSimilar: true,
    excludeAmbiguous: true
  });
};

/**
 * Generate temporary password
 * @returns {String} Temporary password
 */
const generateTempPassword = () => {
  return generateSecurePassword(12);
};

/**
 * Generate passphrase
 * @param {Number} wordCount - Number of words
 * @returns {String} Passphrase
 */
const generatePassphrase = (wordCount = 4) => {
  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest',
    'garden', 'harbor', 'island', 'jungle', 'kitten', 'lemon',
    'mountain', 'night', 'ocean', 'panda', 'queen', 'river',
    'sunset', 'tiger', 'umbrella', 'valley', 'winter', 'yellow'
  ];
  
  const selectedWords = [];
  const randomBytes = crypto.randomBytes(wordCount);
  
  for (let i = 0; i < wordCount; i++) {
    const index = randomBytes[i] % words.length;
    selectedWords.push(words[index]);
  }
  
  // Add random number
  const number = Math.floor(Math.random() * 100);
  
  return selectedWords.join('-') + '-' + number;
};

// ============================================================================
// RESET TOKEN GENERATION
// ============================================================================

/**
 * Generate password reset token
 * @returns {Object} Token data
 */
const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiry = new Date(Date.now() + PASSWORD_CONFIG.resetTokenExpiry);
  
  return {
    token,
    hash,
    expiry
  };
};

/**
 * Verify reset token
 * @param {String} token - Reset token
 * @param {String} hash - Stored hash
 * @param {Date} expiry - Token expiry
 * @returns {Boolean} Valid token
 */
const verifyResetToken = (token, hash, expiry) => {
  if (!token || !hash || !expiry) {
    return false;
  }
  
  // Check expiry
  if (new Date() > new Date(expiry)) {
    return false;
  }
  
  // Verify hash
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return tokenHash === hash;
};

// ============================================================================
// PASSWORD HISTORY
// ============================================================================

/**
 * Check if password was used before
 * @param {String} password - New password
 * @param {Array} passwordHistory - Array of hashed passwords
 * @returns {Promise<Boolean>} Was used before
 */
const isPasswordReused = async (password, passwordHistory = []) => {
  if (!passwordHistory || passwordHistory.length === 0) {
    return false;
  }
  
  for (const oldHash of passwordHistory) {
    const match = await comparePassword(password, oldHash);
    if (match) {
      return true;
    }
  }
  
  return false;
};

/**
 * Add password to history
 * @param {Array} passwordHistory - Current history
 * @param {String} newHash - New password hash
 * @param {Number} limit - History limit
 * @returns {Array} Updated history
 */
const addToPasswordHistory = (passwordHistory = [], newHash, limit = PASSWORD_CONFIG.historyLimit) => {
  const history = [newHash, ...passwordHistory];
  return history.slice(0, limit);
};

// ============================================================================
// PASSWORD POLICIES
// ============================================================================

/**
 * Check password against policy
 * @param {String} password - Password to check
 * @param {Object} policy - Password policy
 * @returns {Object} Check result
 */
const checkPasswordPolicy = (password, policy = {}) => {
  const defaultPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    preventPersonalInfo: false,
    maxConsecutiveChars: 3
  };
  
  const activePolicy = { ...defaultPolicy, ...policy };
  const errors = [];
  
  // Length check
  if (password.length < activePolicy.minLength) {
    errors.push(`Minimum length: ${activePolicy.minLength}`);
  }
  
  // Character requirements
  if (activePolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letter');
  }
  
  if (activePolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letter');
  }
  
  if (activePolicy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Must contain number');
  }
  
  if (activePolicy.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Must contain special character');
  }
  
  // Common password check
  if (activePolicy.preventCommonPasswords && isCommonPassword(password)) {
    errors.push('Password is too common');
  }
  
  // Consecutive characters
  if (activePolicy.maxConsecutiveChars) {
    const pattern = new RegExp(`(.)\\1{${activePolicy.maxConsecutiveChars},}`);
    if (pattern.test(password)) {
      errors.push(`Too many consecutive identical characters`);
    }
  }
  
  return {
    compliant: errors.length === 0,
    errors
  };
};

// ============================================================================
// PASSWORD EXPIRY
// ============================================================================

/**
 * Check if password is expired
 * @param {Date} lastChanged - Last password change date
 * @param {Number} expiryDays - Days until expiry
 * @returns {Object} Expiry status
 */
const checkPasswordExpiry = (lastChanged, expiryDays = 90) => {
  if (!lastChanged) {
    return {
      expired: false,
      daysRemaining: expiryDays
    };
  }
  
  const now = new Date();
  const changeDate = new Date(lastChanged);
  const daysSinceChange = Math.floor((now - changeDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = expiryDays - daysSinceChange;
  
  return {
    expired: daysRemaining <= 0,
    daysRemaining: Math.max(0, daysRemaining),
    daysSinceChange
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Hashing
  hashPassword,
  comparePassword,
  hashPasswordSync,
  comparePasswordSync,
  
  // Validation
  validatePassword,
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  isCommonPassword,
  containsPersonalInfo,
  
  // Generation
  generatePassword,
  generateSecurePassword,
  generateTempPassword,
  generatePassphrase,
  
  // Reset tokens
  generateResetToken,
  verifyResetToken,
  
  // History
  isPasswordReused,
  addToPasswordHistory,
  
  // Policy
  checkPasswordPolicy,
  checkPasswordExpiry,
  
  // Configuration
  PASSWORD_CONFIG
};