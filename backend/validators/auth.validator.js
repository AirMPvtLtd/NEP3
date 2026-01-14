// validators/auth.validator.js
/**
 * AUTH VALIDATOR - COMPLETE PRODUCTION VERSION
 * Authentication and authorization validation schemas
 * 
 * @module validators/auth.validator
 */

const Joi = require('joi');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Register validation schema
 */
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  userType: Joi.string()
    .valid('student', 'teacher', 'parent', 'admin')
    .required()
    .messages({
      'any.only': 'User type must be one of: student, teacher, parent, admin',
      'any.required': 'User type is required'
    }),
  
  // Student-specific fields
  name: Joi.when('userType', {
    is: 'student',
    then: Joi.string().required().trim().min(2).max(100),
    otherwise: Joi.forbidden()
  }),
  
  dateOfBirth: Joi.when('userType', {
    is: 'student',
    then: Joi.date().max('now').required(),
    otherwise: Joi.forbidden()
  }),
  
  schoolId: Joi.when('userType', {
    is: Joi.valid('student', 'teacher'),
    then: Joi.string().required().pattern(/^SCH-[A-Z0-9]{8}$/),
    otherwise: Joi.forbidden()
  }),
  
  class: Joi.when('userType', {
    is: 'student',
    then: Joi.number().integer().min(1).max(12).required(),
    otherwise: Joi.forbidden()
  }),
  
  section: Joi.when('userType', {
    is: 'student',
    then: Joi.string().length(1).uppercase().required(),
    otherwise: Joi.forbidden()
  }),
  
  rollNumber: Joi.when('userType', {
    is: 'student',
    then: Joi.string().max(20),
    otherwise: Joi.forbidden()
  }),
  
  // Teacher-specific fields
  subjects: Joi.when('userType', {
    is: 'teacher',
    then: Joi.array().items(Joi.string()).min(1).required(),
    otherwise: Joi.forbidden()
  }),
  
  // Parent-specific fields
  studentIds: Joi.when('userType', {
    is: 'parent',
    then: Joi.array().items(
      Joi.string().pattern(/^STD-[A-Z0-9]{10}$/)
    ).min(1).required(),
    otherwise: Joi.forbidden()
  }),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    })
});

/**
 * Login validation schema
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),
  
  rememberMe: Joi.boolean().optional()
});

/**
 * Verify email validation schema
 */
const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .length(64)
    .hex()
    .messages({
      'any.required': 'Verification token is required',
      'string.length': 'Invalid verification token',
      'string.hex': 'Invalid verification token format'
    })
});

/**
 * Forgot password validation schema
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

/**
 * Reset password validation schema
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .length(64)
    .hex()
    .messages({
      'any.required': 'Reset token is required',
      'string.length': 'Invalid reset token',
      'string.hex': 'Invalid reset token format'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Change password validation schema
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password must not exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required',
      'any.invalid': 'New password must be different from current password'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

/**
 * Logout validation schema
 */
const logoutSchema = Joi.object({
  refreshToken: Joi.string().optional()
});

/**
 * Update profile validation schema
 */
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional(),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  dateOfBirth: Joi.date()
    .max('now')
    .optional(),
  
  address: Joi.string()
    .max(500)
    .optional(),
  
  bio: Joi.string()
    .max(1000)
    .optional()
}).min(1);

/**
 * Resend verification email schema
 */
const resendVerificationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate request data
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    req.body = value;
    next();
  };
};

/**
 * Validate query parameters
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    req.query = value;
    next();
  };
};

/**
 * Validate params
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    req.params = value;
    next();
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Schemas
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  logoutSchema,
  updateProfileSchema,
  resendVerificationSchema,
  
  // Validation functions
  validate,
  validateQuery,
  validateParams,
  
  // Middleware exports
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateVerifyEmail: validate(verifyEmailSchema),
  validateForgotPassword: validate(forgotPasswordSchema),
  validateResetPassword: validate(resetPasswordSchema),
  validateChangePassword: validate(changePasswordSchema),
  validateRefreshToken: validate(refreshTokenSchema),
  validateLogout: validate(logoutSchema),
  validateUpdateProfile: validate(updateProfileSchema),
  validateResendVerification: validate(resendVerificationSchema)
};