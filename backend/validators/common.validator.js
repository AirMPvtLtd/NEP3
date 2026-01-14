// validators/common.validator.js
/**
 * COMMON VALIDATOR - COMPLETE PRODUCTION VERSION
 * Shared validation schemas and utilities used across the application
 * 
 * @module validators/common.validator
 * 
 * This validator provides reusable validation schemas for:
 * - Pagination and sorting
 * - Date ranges and time filters
 * - ID formats and patterns
 * - Search and filtering
 * - File uploads
 * - Common data types
 * - Custom validators
 */

const Joi = require('joi');

// ============================================================================
// ID VALIDATION PATTERNS
// ============================================================================

/**
 * Common ID patterns used across the application
 */
const ID_PATTERNS = {
  STUDENT: /^STD-[A-Z0-9]{10}$/,
  TEACHER: /^TCH-[A-Z0-9]{10}$/,
  PARENT: /^PNT-[A-Z0-9]{10}$/,
  ADMIN: /^ADM-[A-Z0-9]{10}$/,
  SCHOOL: /^SCH-[A-Z0-9]{8}$/,
  CHALLENGE: /^CHAL-[A-Z0-9]{10}$/,
  REPORT: /^RPT-[A-Z0-9]{12}$/,
  TICKET: /^TKT-[A-Z0-9]{8}$/,
  NOTIFICATION: /^NOTIF-[A-Z0-9]{10}$/,
  SESSION: /^SESS-[A-Z0-9]{16}$/
};

/**
 * MongoDB ObjectId pattern
 */
const MONGODB_OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// ============================================================================
// REUSABLE FIELD VALIDATORS
// ============================================================================

/**
 * Email validation
 */
const emailField = Joi.string()
  .email()
  .lowercase()
  .trim()
  .max(255)
  .messages({
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email cannot exceed 255 characters'
  });

/**
 * Password validation
 */
const passwordField = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  });

/**
 * Name validation
 */
const nameField = Joi.string()
  .min(2)
  .max(100)
  .trim()
  .pattern(/^[a-zA-Z\s'-]+$/)
  .messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters',
    'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes'
  });

/**
 * Phone number validation (international format)
 */
const phoneField = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .messages({
    'string.pattern.base': 'Please provide a valid phone number in international format'
  });

/**
 * Date of birth validation
 */
const dateOfBirthField = Joi.date()
  .max('now')
  .min('1900-01-01')
  .messages({
    'date.max': 'Date of birth cannot be in the future',
    'date.min': 'Date of birth must be after 1900'
  });

/**
 * URL validation
 */
const urlField = Joi.string()
  .uri()
  .max(2048)
  .messages({
    'string.uri': 'Please provide a valid URL',
    'string.max': 'URL cannot exceed 2048 characters'
  });

/**
 * MongoDB ObjectId validation
 */
const mongoIdField = Joi.string()
  .pattern(MONGODB_OBJECT_ID)
  .messages({
    'string.pattern.base': 'Invalid MongoDB ObjectId format'
  });

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

/**
 * Standard pagination query schema
 */
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1',
      'number.base': 'Page must be a number'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.base': 'Limit must be a number'
    }),
  
  sortBy: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Sort field name too long'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    })
});

/**
 * Cursor-based pagination schema (for infinite scroll)
 */
const cursorPaginationSchema = Joi.object({
  cursor: Joi.string()
    .optional()
    .messages({
      'string.base': 'Cursor must be a string'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  direction: Joi.string()
    .valid('forward', 'backward')
    .default('forward')
});

// ============================================================================
// DATE RANGE SCHEMAS
// ============================================================================

/**
 * Date range query schema
 */
const dateRangeSchema = Joi.object({
  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date',
      'date.base': 'End date must be a valid date'
    }),
  
  timezone: Joi.string()
    .optional()
    .default('UTC')
    .messages({
      'string.base': 'Timezone must be a string'
    })
});

/**
 * Time period schema
 */
const timePeriodSchema = Joi.object({
  period: Joi.string()
    .valid('today', 'yesterday', 'week', 'month', 'quarter', 'year', 'custom')
    .required()
    .messages({
      'any.only': 'Period must be one of: today, yesterday, week, month, quarter, year, custom',
      'any.required': 'Period is required'
    }),
  
  startDate: Joi.date()
    .when('period', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'any.required': 'Start date is required for custom period'
    }),
  
  endDate: Joi.date()
    .when('period', {
      is: 'custom',
      then: Joi.required().min(Joi.ref('startDate')),
      otherwise: Joi.forbidden()
    })
    .messages({
      'any.required': 'End date is required for custom period',
      'date.min': 'End date must be after start date'
    })
});

// ============================================================================
// SEARCH AND FILTER SCHEMAS
// ============================================================================

/**
 * Search query schema
 */
const searchSchema = Joi.object({
  query: Joi.string()
    .min(1)
    .max(200)
    .trim()
    .required()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 200 characters',
      'any.required': 'Search query is required'
    }),
  
  fields: Joi.array()
    .items(Joi.string())
    .min(1)
    .optional()
    .messages({
      'array.min': 'At least one search field is required'
    }),
  
  caseSensitive: Joi.boolean()
    .default(false),
  
  exactMatch: Joi.boolean()
    .default(false)
});

/**
 * Filter schema
 */
const filterSchema = Joi.object({
  field: Joi.string()
    .required()
    .messages({
      'any.required': 'Filter field is required'
    }),
  
  operator: Joi.string()
    .valid('eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'startsWith', 'endsWith')
    .required()
    .messages({
      'any.only': 'Invalid filter operator',
      'any.required': 'Filter operator is required'
    }),
  
  value: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.date(),
      Joi.array()
    )
    .required()
    .messages({
      'any.required': 'Filter value is required'
    })
});

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

/**
 * File upload metadata schema
 */
const fileUploadSchema = Joi.object({
  filename: Joi.string()
    .max(255)
    .optional(),
  
  mimetype: Joi.string()
    .valid(
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    )
    .optional()
    .messages({
      'any.only': 'Unsupported file type'
    }),
  
  size: Joi.number()
    .integer()
    .max(10 * 1024 * 1024) // 10MB
    .optional()
    .messages({
      'number.max': 'File size cannot exceed 10MB'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
});

// ============================================================================
// LOCATION SCHEMAS
// ============================================================================

/**
 * Address schema
 */
const addressSchema = Joi.object({
  street: Joi.string()
    .max(200)
    .optional(),
  
  city: Joi.string()
    .max(100)
    .optional(),
  
  state: Joi.string()
    .max(100)
    .optional(),
  
  country: Joi.string()
    .max(100)
    .optional(),
  
  postalCode: Joi.string()
    .max(20)
    .optional(),
  
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional()
  }).optional()
});

/**
 * Coordinates schema
 */
const coordinatesSchema = Joi.object({
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required'
    }),
  
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required'
    })
});

// ============================================================================
// PREFERENCE SCHEMAS
// ============================================================================

/**
 * Language preference schema
 */
const languageSchema = Joi.string()
  .valid('en', 'hi', 'es', 'fr', 'de', 'zh', 'ja', 'ar')
  .default('en')
  .messages({
    'any.only': 'Unsupported language'
  });

/**
 * Theme preference schema
 */
const themeSchema = Joi.string()
  .valid('light', 'dark', 'auto')
  .default('light')
  .messages({
    'any.only': 'Theme must be one of: light, dark, auto'
  });

/**
 * Notification preferences schema
 */
const notificationPreferencesSchema = Joi.object({
  email: Joi.boolean().default(true),
  push: Joi.boolean().default(true),
  sms: Joi.boolean().default(false),
  inApp: Joi.boolean().default(true)
});

// ============================================================================
// STATUS SCHEMAS
// ============================================================================

/**
 * Generic status schema
 */
const statusSchema = Joi.string()
  .valid('active', 'inactive', 'pending', 'suspended', 'deleted')
  .messages({
    'any.only': 'Invalid status value'
  });

/**
 * Challenge status schema
 */
const challengeStatusSchema = Joi.string()
  .valid('pending', 'in_progress', 'submitted', 'evaluated', 'expired')
  .messages({
    'any.only': 'Invalid challenge status'
  });

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Create ID validator for specific type
 * @param {String} type - ID type (student, teacher, etc.)
 * @returns {Joi.Schema} Joi validation schema
 */
const createIdValidator = (type) => {
  const pattern = ID_PATTERNS[type.toUpperCase()];
  
  if (!pattern) {
    throw new Error(`Unknown ID type: ${type}`);
  }
  
  return Joi.string()
    .pattern(pattern)
    .messages({
      'string.pattern.base': `Invalid ${type} ID format`
    });
};

/**
 * Create array of IDs validator
 * @param {String} type - ID type
 * @param {Number} min - Minimum array length
 * @param {Number} max - Maximum array length
 * @returns {Joi.Schema} Joi validation schema
 */
const createIdArrayValidator = (type, min = 1, max = 100) => {
  return Joi.array()
    .items(createIdValidator(type))
    .min(min)
    .max(max)
    .messages({
      'array.min': `At least ${min} ${type} ID(s) required`,
      'array.max': `Cannot exceed ${max} ${type} ID(s)`
    });
};

/**
 * Create enum validator
 * @param {Array} values - Allowed values
 * @param {String} fieldName - Field name for error messages
 * @returns {Joi.Schema} Joi validation schema
 */
const createEnumValidator = (values, fieldName = 'value') => {
  return Joi.string()
    .valid(...values)
    .messages({
      'any.only': `${fieldName} must be one of: ${values.join(', ')}`
    });
};

/**
 * Create numeric range validator
 * @param {Number} min - Minimum value
 * @param {Number} max - Maximum value
 * @param {Boolean} integer - Whether value must be integer
 * @returns {Joi.Schema} Joi validation schema
 */
const createRangeValidator = (min, max, integer = false) => {
  let schema = Joi.number().min(min).max(max);
  
  if (integer) {
    schema = schema.integer();
  }
  
  return schema.messages({
    'number.min': `Value must be at least ${min}`,
    'number.max': `Value cannot exceed ${max}`,
    'number.integer': 'Value must be an integer'
  });
};

// ============================================================================
// CUSTOM VALIDATORS
// ============================================================================

/**
 * Validate Indian phone number
 */
const indianPhoneValidator = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .messages({
    'string.pattern.base': 'Please provide a valid 10-digit Indian phone number'
  });

/**
 * Validate academic year format (YYYY-YYYY)
 */
const academicYearValidator = Joi.string()
  .pattern(/^\d{4}-\d{4}$/)
  .custom((value, helpers) => {
    const [start, end] = value.split('-').map(Number);
    if (end !== start + 1) {
      return helpers.error('any.invalid');
    }
    return value;
  })
  .messages({
    'string.pattern.base': 'Academic year must be in format: YYYY-YYYY',
    'any.invalid': 'Academic year end must be exactly one year after start'
  });

/**
 * Validate percentage (0-100)
 */
const percentageValidator = Joi.number()
  .min(0)
  .max(100)
  .precision(2)
  .messages({
    'number.min': 'Percentage cannot be negative',
    'number.max': 'Percentage cannot exceed 100'
  });

/**
 * Validate class number (1-12)
 */
const classNumberValidator = Joi.number()
  .integer()
  .min(1)
  .max(12)
  .messages({
    'number.min': 'Class must be between 1 and 12',
    'number.max': 'Class must be between 1 and 12',
    'number.integer': 'Class must be an integer'
  });

/**
 * Validate section (single uppercase letter)
 */
const sectionValidator = Joi.string()
  .length(1)
  .uppercase()
  .pattern(/^[A-Z]$/)
  .messages({
    'string.length': 'Section must be a single character',
    'string.pattern.base': 'Section must be an uppercase letter'
  });

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Generic validation middleware factory
 * @param {Object} schema - Joi schema
 * @param {String} source - Source of data (body, query, params)
 * @returns {Function} Express middleware
 */
const createValidator = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    req[source] = value;
    next();
  };
};

/**
 * Validate multiple sources
 * @param {Object} schemas - Object with schemas for different sources
 * @returns {Function} Express middleware
 */
const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];
    
    Object.entries(schemas).forEach(([source, schema]) => {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        error.details.forEach(detail => {
          errors.push({
            source,
            field: detail.path.join('.'),
            message: detail.message
          });
        });
      } else {
        req[source] = value;
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Patterns
  ID_PATTERNS,
  MONGODB_OBJECT_ID,
  
  // Field validators
  emailField,
  passwordField,
  nameField,
  phoneField,
  dateOfBirthField,
  urlField,
  mongoIdField,
  
  // Schema groups
  paginationSchema,
  cursorPaginationSchema,
  dateRangeSchema,
  timePeriodSchema,
  searchSchema,
  filterSchema,
  fileUploadSchema,
  addressSchema,
  coordinatesSchema,
  languageSchema,
  themeSchema,
  notificationPreferencesSchema,
  statusSchema,
  challengeStatusSchema,
  
  // Custom validators
  indianPhoneValidator,
  academicYearValidator,
  percentageValidator,
  classNumberValidator,
  sectionValidator,
  
  // Helper functions
  createIdValidator,
  createIdArrayValidator,
  createEnumValidator,
  createRangeValidator,
  
  // Middleware
  createValidator,
  validateMultiple
};