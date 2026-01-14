/**
 * VALIDATION MIDDLEWARE - UPDATED VERSION
 * Added: validateSaveDraftAnswers, validateReportVerification, validateReportSharing
 * 
 * @module middleware/validation.middleware
 */

const { validationResult } = require('express-validator');
const validator = require('validator');

// Try to import constants, use defaults if not available
let SIMULATION_TYPES, DIFFICULTY_LEVELS, NEP_COMPETENCIES;
try {
  const constants = require('../config/constants');
  SIMULATION_TYPES = constants.SIMULATION_TYPES || [];
  DIFFICULTY_LEVELS = constants.DIFFICULTY_LEVELS || [];
  NEP_COMPETENCIES = constants.NEP_COMPETENCIES || [];
} catch (error) {
  // Fallback constants if config/constants.js doesn't exist
  SIMULATION_TYPES = ['projectile_motion', 'circular_motion', 'simple_harmonic_motion', 'wave_motion'];
  DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
  NEP_COMPETENCIES = ['mathematical_reasoning', 'problem_solving', 'critical_thinking', 'scientific_inquiry', 'communication', 'collaboration'];
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Create validation error response
 * @param {String} field - Field name
 * @param {String} message - Error message
 * @returns {Object} Error response
 */
const validationError = (field, message) => ({
  success: false,
  field,
  message
});

/**
 * Sanitize string input
 * @param {String} str - Input string
 * @returns {String} Sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return validator.trim(validator.escape(str));
};

/**
 * Validate email
 * @param {String} email - Email address
 * @returns {Boolean}
 */
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

/**
 * Validate password strength (relaxed for development)
 * @param {String} password - Password
 * @returns {Object} { valid: Boolean, message: String }
 */
const isValidPassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  // Relaxed validation - only check length in development/test
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return { valid: true };
  }
  
  // Strict validation in production
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
};

/**
 * Validate phone number
 * @param {String} phone - Phone number
 * @returns {Boolean}
 */
const isValidPhone = (phone) => {
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
};

/**
 * Validate MongoDB ObjectId
 * @param {String} id - ID
 * @returns {Boolean}
 */
const isValidObjectId = (id) => {
  return validator.isMongoId(id);
};

/**
 * Validate URL
 * @param {String} url - URL
 * @returns {Boolean}
 */
const isValidURL = (url) => {
  return validator.isURL(url);
};

/**
 * Validate date
 * @param {String} date - Date string
 * @returns {Boolean}
 */
const isValidDate = (date) => {
  return validator.isISO8601(date) || !isNaN(Date.parse(date));
};

// ============================================================================
// AUTHENTICATION VALIDATION - RELAXED
// ============================================================================

/**
 * Validate registration input (relaxed version)
 */
const validateRegistration = (req, res, next) => {
  const { email, password, userType } = req.body;
  
  // Email validation (required for all except admin)
  if (userType !== 'admin') {
    if (!email) {
      return res.status(400).json(validationError('email', 'Email is required'));
    }
    
    if (!isValidEmail(email)) {
      return res.status(400).json(validationError('email', 'Invalid email format'));
    }
    
    req.body.email = validator.normalizeEmail(email);
  } else {
    // Admin uses adminEmail
    if (!req.body.adminEmail) {
      return res.status(400).json(validationError('adminEmail', 'Admin email is required'));
    }
    
    if (!isValidEmail(req.body.adminEmail)) {
      return res.status(400).json(validationError('adminEmail', 'Invalid email format'));
    }
    
    req.body.adminEmail = validator.normalizeEmail(req.body.adminEmail);
  }
  
  // Password validation (required for all)
  const passwordField = userType === 'admin' ? 'adminPassword' : 'password';
  if (!req.body[passwordField]) {
    return res.status(400).json(validationError(passwordField, 'Password is required'));
  }
  
  const passwordCheck = isValidPassword(req.body[passwordField]);
  if (!passwordCheck.valid) {
    return res.status(400).json(validationError(passwordField, passwordCheck.message));
  }
  
  // Name validation (optional - let model handle it)
  if (req.body.name) {
    req.body.name = sanitizeString(req.body.name);
  }
  
  if (req.body.adminName) {
    req.body.adminName = sanitizeString(req.body.adminName);
  }
  
  // User type validation
  const validUserTypes = ['student', 'teacher', 'parent', 'admin'];
  if (userType && !validUserTypes.includes(userType)) {
    return res.status(400).json(validationError('userType', `User type must be one of: ${validUserTypes.join(', ')}`));
  }
  
  next();
};

/**
 * Validate login input
 */
const validateLogin = (req, res, next) => {
  const { userType, email, teacherId, password } = req.body;

  // User type validation
  const validUserTypes = ['student', 'teacher', 'parent', 'admin'];
  if (!userType || !validUserTypes.includes(userType)) {
    return res
      .status(400)
      .json(validationError('userType', `User type must be one of: ${validUserTypes.join(', ')}`));
  }

  // Password required for all
  if (!password) {
    return res.status(400).json(validationError('password', 'Password is required'));
  }

  // 👨‍🏫 TEACHER LOGIN → teacherId + password
  if (userType === 'teacher') {
    if (!teacherId) {
      return res.status(400).json(validationError('teacherId', 'Teacher ID is required'));
    }
    return next();
  }

  // 👤 OTHER ROLES → email + password
  if (!email) {
    return res.status(400).json(validationError('email', 'Email is required'));
  }

  if (!isValidEmail(email)) {
    return res.status(400).json(validationError('email', 'Invalid email format'));
  }

  req.body.email = validator.normalizeEmail(email);
  next();
};


/**
 * Validate password reset request
 */
const validatePasswordReset = (req, res, next) => {
  const { email } = req.body;
  
  // Make email optional - controller will handle it
  if (email) {
    if (!isValidEmail(email)) {
      return res.status(400).json(validationError('email', 'Invalid email format'));
    }
    req.body.email = validator.normalizeEmail(email);
  }
  
  next();
};

/**
 * Validate new password
 */
const validateNewPassword = (req, res, next) => {
  const { password, newPassword } = req.body;
  const passwordToCheck = newPassword || password;
  
  if (!passwordToCheck) {
    return res.status(400).json(validationError('password', 'Password is required'));
  }
  
  const passwordCheck = isValidPassword(passwordToCheck);
  if (!passwordCheck.valid) {
    return res.status(400).json(validationError('password', passwordCheck.message));
  }
  
  next();
};

/**
 * Validate change password
 */
const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword) {
    return res.status(400).json(validationError('currentPassword', 'Current password is required'));
  }
  
  if (!newPassword) {
    return res.status(400).json(validationError('newPassword', 'New password is required'));
  }
  
  const passwordCheck = isValidPassword(newPassword);
  if (!passwordCheck.valid) {
    return res.status(400).json(validationError('newPassword', passwordCheck.message));
  }
  
  next();
};

// ============================================================================
// STUDENT VALIDATION
// ============================================================================

/**
 * Validate student creation (relaxed)
 */
const validateStudentCreation = (req, res, next) => {
  const { name, email, class: className, section } = req.body;
  
  // Name validation (optional)
  if (name) {
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json(validationError('name', 'Name must be between 2 and 100 characters'));
    }
    req.body.name = sanitizeString(name);
  }
  
  // Email validation (optional)
  if (email) {
    if (!isValidEmail(email)) {
      return res.status(400).json(validationError('email', 'Invalid email format'));
    }
    req.body.email = validator.normalizeEmail(email);
  }
  
  // Class validation (optional - let model handle it)
  if (className && (!Number.isInteger(className) || className < 1 || className > 12)) {
    return res.status(400).json(validationError('class', 'Class must be between 1 and 12'));
  }
  
  // Section validation (optional)
  if (section) {
    req.body.section = section.toUpperCase();
  }
  
  next();
};

/**
 * Validate student profile update
 */
const validateStudentUpdate = (req, res, next) => {
  const { name, phone, dateOfBirth, contactNumber } = req.body;
  
  if (name) {
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json(validationError('name', 'Name must be between 2 and 100 characters'));
    }
    req.body.name = sanitizeString(name);
  }
  
  const phoneToCheck = phone || contactNumber;
  if (phoneToCheck && !isValidPhone(phoneToCheck)) {
    return res.status(400).json(validationError('phone', 'Invalid phone number'));
  }
  
  if (dateOfBirth && !isValidDate(dateOfBirth)) {
    return res.status(400).json(validationError('dateOfBirth', 'Invalid date format'));
  }
  
  next();
};

// ============================================================================
// CHALLENGE VALIDATION
// ============================================================================

/**
 * Validate challenge generation
 */
const validateChallengeGeneration = (req, res, next) => {
  const { simulationType, difficulty } = req.body;
  
  // Simulation type validation
  if (!simulationType) {
    return res.status(400).json(validationError('simulationType', 'Simulation type is required'));
  }
  
  if (SIMULATION_TYPES.length > 0 && !SIMULATION_TYPES.includes(simulationType)) {
    return res.status(400).json(validationError('simulationType', `Invalid simulation type. Must be one of: ${SIMULATION_TYPES.join(', ')}`));
  }
  
  // Difficulty validation
  if (difficulty && DIFFICULTY_LEVELS.length > 0 && !DIFFICULTY_LEVELS.includes(difficulty)) {
    return res.status(400).json(validationError('difficulty', `Invalid difficulty. Must be one of: ${DIFFICULTY_LEVELS.join(', ')}`));
  }
  
  next();
};

/**
 * Validate challenge submission
 */
const validateChallengeSubmission = (req, res, next) => {
  const { answers } = req.body;
  
  if (!answers) {
    return res.status(400).json(validationError('answers', 'Answers are required'));
  }
  
  if (!Array.isArray(answers)) {
    return res.status(400).json(validationError('answers', 'Answers must be an array'));
  }
  
  if (answers.length === 0) {
    return res.status(400).json(validationError('answers', 'At least one answer is required'));
  }
  
  // Validate each answer
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    
    if (!answer.questionId) {
      return res.status(400).json(validationError(`answers[${i}].questionId`, 'Question ID is required'));
    }
    
    if (answer.answer === undefined || answer.answer === null) {
      return res.status(400).json(validationError(`answers[${i}].answer`, 'Answer is required'));
    }
  }
  
  next();
};

/**
 * Validate save draft answers (NEW)
 */
const validateSaveDraftAnswers = (req, res, next) => {
  const { answers } = req.body;
  
  if (!answers) {
    return res.status(400).json(validationError('answers', 'Answers array is required'));
  }
  
  if (!Array.isArray(answers)) {
    return res.status(400).json(validationError('answers', 'Answers must be an array'));
  }
  
  // Allow empty array for draft saves (student can save progress with 0 answers)
  // No validation on individual answers for drafts
  
  next();
};

/**
 * Validate score override
 */
const validateScoreOverride = (req, res, next) => {
  const { score, reason } = req.body;
  
  if (score === undefined || score === null) {
    return res.status(400).json(validationError('score', 'Score is required'));
  }
  
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return res.status(400).json(validationError('score', 'Score must be between 0 and 100'));
  }
  
  if (!reason || validator.isEmpty(reason.trim())) {
    return res.status(400).json(validationError('reason', 'Reason is required'));
  }
  
  if (reason.length < 10 || reason.length > 500) {
    return res.status(400).json(validationError('reason', 'Reason must be between 10 and 500 characters'));
  }
  
  req.body.reason = sanitizeString(reason);
  
  next();
};

// ============================================================================
// REPORT VALIDATION
// ============================================================================

/**
 * Validate report generation
 */
const validateReportGeneration = (req, res, next) => {
  const { reportType, periodStart, periodEnd } = req.body;
  
  if (reportType) {
    const validTypes = ['comprehensive', 'brief', 'competency-focused', 'progress', 'diagnostic'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json(validationError('reportType', `Invalid report type. Must be one of: ${validTypes.join(', ')}`));
    }
  }
  
  if (periodStart && !isValidDate(periodStart)) {
    return res.status(400).json(validationError('periodStart', 'Invalid start date format'));
  }
  
  if (periodEnd && !isValidDate(periodEnd)) {
    return res.status(400).json(validationError('periodEnd', 'Invalid end date format'));
  }
  
  if (periodStart && periodEnd) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    
    if (start >= end) {
      return res.status(400).json(validationError('periodEnd', 'End date must be after start date'));
    }
  }
  
  next();
};

/**
 * Validate report verification (NEW)
 */
const validateReportVerification = (req, res, next) => {
  const { reportId } = req.params;
  
  if (!reportId) {
    return res.status(400).json(validationError('reportId', 'Report ID is required'));
  }
  
  // Check report ID format (REPORT-XXXXXX)
  if (!/^REPORT-[A-Z0-9]+$/i.test(reportId)) {
    return res.status(400).json(validationError('reportId', 'Invalid report ID format'));
  }
  
  next();
};

/**
 * Validate report sharing (NEW)
 */
const validateReportSharing = (req, res, next) => {
  const { email, message } = req.body;
  
  // Email validation
  if (!email) {
    return res.status(400).json(validationError('email', 'Email is required'));
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json(validationError('email', 'Invalid email format'));
  }
  
  req.body.email = validator.normalizeEmail(email);
  
  // Message validation (optional)
  if (message && message.length > 500) {
    return res.status(400).json(validationError('message', 'Message must not exceed 500 characters'));
  }
  
  if (message) {
    req.body.message = sanitizeString(message);
  }
  
  next();
};

// ============================================================================
// HELP TICKET VALIDATION
// ============================================================================

/**
 * Validate help ticket creation
 */
const validateHelpTicket = (req, res, next) => {
  const { subject, description, category, priority } = req.body;
  
  // Subject validation
  if (!subject || validator.isEmpty(subject.trim())) {
    return res.status(400).json(validationError('subject', 'Subject is required'));
  }
  
  if (subject.length < 5 || subject.length > 200) {
    return res.status(400).json(validationError('subject', 'Subject must be between 5 and 200 characters'));
  }
  
  // Description validation
  if (!description || validator.isEmpty(description.trim())) {
    return res.status(400).json(validationError('description', 'Description is required'));
  }
  
  if (description.length < 20 || description.length > 5000) {
    return res.status(400).json(validationError('description', 'Description must be between 20 and 5000 characters'));
  }
  
  // Category validation
  if (category) {
    const validCategories = ['technical', 'content', 'assessment', 'general', 'parent_communication', 'feedback', 'bug_report', 'feature_request', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json(validationError('category', `Invalid category. Must be one of: ${validCategories.join(', ')}`));
    }
  }
  
  // Priority validation
  if (priority) {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json(validationError('priority', `Invalid priority. Must be one of: ${validPriorities.join(', ')}`));
    }
  }
  
  req.body.subject = sanitizeString(subject);
  req.body.description = sanitizeString(description);
  
  next();
};

/**
 * Validate ticket response
 */
const validateTicketResponse = (req, res, next) => {
  const { message } = req.body;
  
  if (!message || validator.isEmpty(message.trim())) {
    return res.status(400).json(validationError('message', 'Message is required'));
  }
  
  if (message.length < 10 || message.length > 5000) {
    return res.status(400).json(validationError('message', 'Message must be between 10 and 5000 characters'));
  }
  
  req.body.message = sanitizeString(message);
  
  next();
};

// ============================================================================
// PAGINATION VALIDATION
// ============================================================================

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  
  if (page) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json(validationError('page', 'Page must be a positive integer'));
    }
    req.query.page = pageNum;
  } else {
    req.query.page = 1;
  }
  
  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json(validationError('limit', 'Limit must be between 1 and 100'));
    }
    req.query.limit = limitNum;
  } else {
    req.query.limit = 10;
  }
  
  next();
};

// ============================================================================
// DATE RANGE VALIDATION
// ============================================================================

/**
 * Validate date range
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json(validationError('startDate', 'Invalid start date format'));
  }
  
  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json(validationError('endDate', 'Invalid end date format'));
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json(validationError('endDate', 'End date must be after start date'));
    }
    
    // Check if range is not too large (e.g., max 1 year)
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      return res.status(400).json(validationError('dateRange', 'Date range cannot exceed 365 days'));
    }
  }
  
  next();
};

// ============================================================================
// SEARCH VALIDATION
// ============================================================================

/**
 * Validate search query
 */
const validateSearch = (req, res, next) => {
  const { query, searchTerm, q } = req.query;
  const searchQuery = query || searchTerm || q;
  
  if (searchQuery) {
    if (searchQuery.length < 2) {
      return res.status(400).json(validationError('query', 'Search query must be at least 2 characters'));
    }
    
    if (searchQuery.length > 100) {
      return res.status(400).json(validationError('query', 'Search query must not exceed 100 characters'));
    }
    
    // Sanitize search query
    req.query.query = sanitizeString(searchQuery);
    req.query.searchTerm = req.query.query;
    req.query.q = req.query.query;
  }
  
  next();
};

// ============================================================================
// ID VALIDATION
// ============================================================================

/**
 * Validate ID parameter
 * @param {String} paramName - Parameter name
 */
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json(validationError(paramName, `${paramName} is required`));
    }
    
    // Check if it's alphanumeric with hyphens (our ID format)
    if (!/^[A-Z0-9\-]+$/.test(id)) {
      return res.status(400).json(validationError(paramName, `Invalid ${paramName} format`));
    }
    
    next();
  };
};

// ============================================================================
// COMPETENCY VALIDATION
// ============================================================================

/**
 * Validate competency
 */
const validateCompetency = (req, res, next) => {
  const { competency } = req.params || req.body;
  
  if (competency && NEP_COMPETENCIES.length > 0 && !NEP_COMPETENCIES.includes(competency)) {
    return res.status(400).json(validationError('competency', `Invalid competency. Must be one of: ${NEP_COMPETENCIES.join(', ')}`));
  }
  
  next();
};

// ============================================================================
// PROFILE UPDATE VALIDATION
// ============================================================================

/**
 * Validate profile update
 */
const validateUpdateProfile = (req, res, next) => {
  // Just let it through - controller will handle which fields are allowed
  next();
};

// ============================================================================
// LEGACY VALIDATOR.JS FUNCTIONS
// ============================================================================

/**
 * Validate request based on validation rules (Legacy function)
 * @param {String} type - Validation type
 * @returns {Function} Middleware function
 */
const validateRequest = (type) => {
  const validationMap = {
    'signup': validateRegistration,
    'login': validateLogin,
    'email': validatePasswordReset,
    'resetPassword': validateNewPassword,
    'changePassword': validateChangePassword,
    'updateProfile': validateUpdateProfile
  };
  
  return validationMap[type] || ((req, res, next) => next());
};

/**
 * Check validation results from express-validator
 */
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Helpers
  sanitizeString,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidObjectId,
  isValidURL,
  isValidDate,
  validationError,
  
  // Authentication
  validateRegistration,
  validateLogin,
  validatePasswordReset,
  validateNewPassword,
  validateChangePassword,
  validateUpdateProfile,
  
  // Student
  validateStudentCreation,
  validateStudentUpdate,
  
  // Challenge
  validateChallengeGeneration,
  validateChallengeSubmission,
  validateSaveDraftAnswers,      // ← NEW
  validateScoreOverride,
  
  // Report
  validateReportGeneration,
  validateReportVerification,    // ← NEW
  validateReportSharing,         // ← NEW
  
  // Help Ticket
  validateHelpTicket,
  validateTicketResponse,
  
  // Common
  validatePagination,
  validateDateRange,
  validateSearch,
  validateId,
  validateCompetency,
  
  // Legacy
  validateRequest,
  checkValidation
};