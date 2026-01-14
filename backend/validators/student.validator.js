// validators/student.validator.js
/**
 * STUDENT VALIDATOR - COMPLETE PRODUCTION VERSION
 * Student-related validation schemas
 * 
 * @module validators/student.validator
 */

const Joi = require('joi');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Create student validation schema
 */
const createStudentSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required'
    }),
  
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
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
      'any.required': 'Password is required'
    }),
  
  schoolId: Joi.string()
    .pattern(/^SCH-[A-Z0-9]{8}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid school ID format',
      'any.required': 'School ID is required'
    }),
  
  class: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      'number.min': 'Class must be between 1 and 12',
      'number.max': 'Class must be between 1 and 12',
      'any.required': 'Class is required'
    }),
  
  section: Joi.string()
    .length(1)
    .uppercase()
    .required()
    .messages({
      'string.length': 'Section must be a single character',
      'any.required': 'Section is required'
    }),
  
  rollNumber: Joi.string()
    .max(20)
    .optional(),
  
  dateOfBirth: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.max': 'Date of birth cannot be in the future',
      'any.required': 'Date of birth is required'
    }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .optional(),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  address: Joi.string()
    .max(500)
    .optional(),
  
  parentEmail: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please provide a valid parent email address'
    })
});

/**
 * Update student validation schema
 */
const updateStudentSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional(),
  
  class: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional(),
  
  section: Joi.string()
    .length(1)
    .uppercase()
    .optional(),
  
  rollNumber: Joi.string()
    .max(20)
    .optional(),
  
  dateOfBirth: Joi.date()
    .max('now')
    .optional(),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .optional(),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  
  address: Joi.string()
    .max(500)
    .optional(),
  
  bio: Joi.string()
    .max(1000)
    .optional(),
  
  preferences: Joi.object({
    language: Joi.string().valid('en', 'hi', 'es', 'fr').optional(),
    theme: Joi.string().valid('light', 'dark').optional(),
    notifications: Joi.boolean().optional()
  }).optional()
}).min(1);

/**
 * Student ID parameter validation
 */
const studentIdSchema = Joi.object({
  studentId: Joi.string()
    .pattern(/^STD-[A-Z0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid student ID format',
      'any.required': 'Student ID is required'
    })
});

/**
 * Get students query validation
 */
const getStudentsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),
  
  schoolId: Joi.string()
    .pattern(/^SCH-[A-Z0-9]{8}$/)
    .optional(),
  
  class: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional(),
  
  section: Joi.string()
    .length(1)
    .uppercase()
    .optional(),
  
  status: Joi.string()
    .valid('active', 'inactive', 'suspended')
    .optional(),
  
  search: Joi.string()
    .max(100)
    .optional(),
  
  sortBy: Joi.string()
    .valid('name', 'email', 'class', 'createdAt')
    .default('createdAt'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

/**
 * Update student status validation
 */
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'inactive', 'suspended')
    .required()
    .messages({
      'any.only': 'Status must be one of: active, inactive, suspended',
      'any.required': 'Status is required'
    }),
  
  reason: Joi.string()
    .max(500)
    .when('status', {
      is: 'suspended',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Reason is required when suspending a student'
    })
});

/**
 * Assign parent validation
 */
const assignParentSchema = Joi.object({
  parentId: Joi.string()
    .pattern(/^PNT-[A-Z0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid parent ID format',
      'any.required': 'Parent ID is required'
    })
});

/**
 * Update academic info validation
 */
const updateAcademicInfoSchema = Joi.object({
  class: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional(),
  
  section: Joi.string()
    .length(1)
    .uppercase()
    .optional(),
  
  rollNumber: Joi.string()
    .max(20)
    .optional(),
  
  academicYear: Joi.string()
    .pattern(/^\d{4}-\d{4}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Academic year must be in format: YYYY-YYYY'
    })
}).min(1);

/**
 * Bulk import validation
 */
const bulkImportSchema = Joi.object({
  students: Joi.array()
    .items(Joi.object({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      class: Joi.number().integer().min(1).max(12).required(),
      section: Joi.string().length(1).uppercase().required(),
      rollNumber: Joi.string().max(20).optional(),
      dateOfBirth: Joi.date().max('now').required(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
    }))
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one student is required',
      'array.max': 'Cannot import more than 100 students at once',
      'any.required': 'Students array is required'
    })
});

/**
 * Student performance query validation
 */
const performanceQuerySchema = Joi.object({
  startDate: Joi.date()
    .optional(),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  
  simulationType: Joi.string()
    .valid('projectile_motion', 'free_fall', 'circular_motion', 'simple_pendulum', 'inclined_plane')
    .optional(),
  
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'expert')
    .optional(),
  
  includeMetrics: Joi.boolean()
    .default(true)
});

/**
 * Student progress report validation
 */
const progressReportSchema = Joi.object({
  startDate: Joi.date()
    .required()
    .messages({
      'any.required': 'Start date is required'
    }),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .required()
    .messages({
      'date.min': 'End date must be after start date',
      'any.required': 'End date is required'
    }),
  
  includeDetails: Joi.boolean()
    .default(false),
  
  format: Joi.string()
    .valid('json', 'pdf', 'excel')
    .default('json')
});

/**
 * Student competency query validation
 */
const competencyQuerySchema = Joi.object({
  competency: Joi.string()
    .valid(
      'mathematical_reasoning',
      'problem_solving',
      'scientific_analysis',
      'critical_thinking',
      'conceptual_understanding',
      'computational_thinking'
    )
    .optional(),
  
  includeHistory: Joi.boolean()
    .default(false),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
});

/**
 * Student activity query validation
 */
const activityQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  
  activityType: Joi.string()
    .valid('challenge_generated', 'challenge_submitted', 'challenge_evaluated', 'report_generated')
    .optional(),
  
  startDate: Joi.date()
    .optional(),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
});

/**
 * Update preferences validation
 */
const updatePreferencesSchema = Joi.object({
  language: Joi.string()
    .valid('en', 'hi', 'es', 'fr')
    .optional(),
  
  theme: Joi.string()
    .valid('light', 'dark', 'auto')
    .optional(),
  
  notifications: Joi.object({
    email: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
    sms: Joi.boolean().optional()
  }).optional(),
  
  privacy: Joi.object({
    showProfile: Joi.boolean().optional(),
    showProgress: Joi.boolean().optional(),
    allowParentView: Joi.boolean().optional()
  }).optional()
}).min(1);

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
  createStudentSchema,
  updateStudentSchema,
  studentIdSchema,
  getStudentsQuerySchema,
  updateStatusSchema,
  assignParentSchema,
  updateAcademicInfoSchema,
  bulkImportSchema,
  performanceQuerySchema,
  progressReportSchema,
  competencyQuerySchema,
  activityQuerySchema,
  updatePreferencesSchema,
  
  // Validation functions
  validate,
  validateQuery,
  validateParams,
  
  // Middleware exports
  validateCreateStudent: validate(createStudentSchema),
  validateUpdateStudent: validate(updateStudentSchema),
  validateStudentId: validateParams(studentIdSchema),
  validateGetStudentsQuery: validateQuery(getStudentsQuerySchema),
  validateUpdateStatus: validate(updateStatusSchema),
  validateAssignParent: validate(assignParentSchema),
  validateUpdateAcademicInfo: validate(updateAcademicInfoSchema),
  validateBulkImport: validate(bulkImportSchema),
  validatePerformanceQuery: validateQuery(performanceQuerySchema),
  validateProgressReport: validateQuery(progressReportSchema),
  validateCompetencyQuery: validateQuery(competencyQuerySchema),
  validateActivityQuery: validateQuery(activityQuerySchema),
  validateUpdatePreferences: validate(updatePreferencesSchema)
};