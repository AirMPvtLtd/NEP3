// validators/teacher.validator.js
/**
 * TEACHER VALIDATOR - COMPLETE PRODUCTION VERSION
 * Teacher-related validation schemas
 * 
 * @module validators/teacher.validator
 */

const Joi = require('joi');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Create teacher validation schema
 */
const createTeacherSchema = Joi.object({
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
  
  subjects: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one subject is required',
      'array.max': 'Cannot assign more than 10 subjects',
      'any.required': 'Subjects are required'
    }),
  
  qualification: Joi.string()
    .valid('B.Ed', 'M.Ed', 'B.Sc', 'M.Sc', 'B.A', 'M.A', 'PhD', 'Other')
    .required()
    .messages({
      'any.required': 'Qualification is required'
    }),
  
  experience: Joi.number()
    .integer()
    .min(0)
    .max(50)
    .optional()
    .messages({
      'number.min': 'Experience cannot be negative',
      'number.max': 'Experience cannot exceed 50 years'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  address: Joi.string()
    .max(500)
    .optional(),
  
  dateOfBirth: Joi.date()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .optional(),
  
  employeeId: Joi.string()
    .max(50)
    .optional()
});

/**
 * Update teacher validation schema
 */
const updateTeacherSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional(),
  
  subjects: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .min(1)
    .max(10)
    .optional(),
  
  qualification: Joi.string()
    .valid('B.Ed', 'M.Ed', 'B.Sc', 'M.Sc', 'B.A', 'M.A', 'PhD', 'Other')
    .optional(),
  
  experience: Joi.number()
    .integer()
    .min(0)
    .max(50)
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
  
  specialization: Joi.string()
    .max(200)
    .optional()
}).min(1);

/**
 * Teacher ID parameter validation
 */
const teacherIdSchema = Joi.object({
  teacherId: Joi.string()
    .pattern(/^TCH-[A-Z0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid teacher ID format',
      'any.required': 'Teacher ID is required'
    })
});

/**
 * Get teachers query validation
 */
const getTeachersQuerySchema = Joi.object({
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
  
  subject: Joi.string()
    .max(50)
    .optional(),
  
  status: Joi.string()
    .valid('active', 'inactive', 'suspended', 'pending')
    .optional(),
  
  search: Joi.string()
    .max(100)
    .optional(),
  
  sortBy: Joi.string()
    .valid('name', 'email', 'experience', 'createdAt')
    .default('createdAt'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

/**
 * Assign classes validation
 */
const assignClassesSchema = Joi.object({
  classes: Joi.array()
    .items(Joi.object({
      class: Joi.number().integer().min(1).max(12).required(),
      section: Joi.string().length(1).uppercase().required(),
      subject: Joi.string().trim().min(1).max(50).required()
    }))
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': 'At least one class is required',
      'array.max': 'Cannot assign more than 20 classes',
      'any.required': 'Classes array is required'
    })
});

/**
 * Get students by teacher query
 */
const getStudentsByTeacherQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  
  class: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional(),
  
  section: Joi.string()
    .length(1)
    .uppercase()
    .optional(),
  
  subject: Joi.string()
    .max(50)
    .optional(),
  
  search: Joi.string()
    .max(100)
    .optional()
});

/**
 * Generate challenge for student validation
 */
const generateChallengeSchema = Joi.object({
  studentId: Joi.string()
    .pattern(/^STD-[A-Z0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid student ID format',
      'any.required': 'Student ID is required'
    }),
  
  simulationType: Joi.string()
    .valid('projectile_motion', 'free_fall', 'circular_motion', 'simple_pendulum', 'inclined_plane')
    .required()
    .messages({
      'any.only': 'Invalid simulation type',
      'any.required': 'Simulation type is required'
    }),
  
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'expert')
    .required()
    .messages({
      'any.only': 'Difficulty must be one of: easy, medium, hard, expert',
      'any.required': 'Difficulty is required'
    }),
  
  competencies: Joi.array()
    .items(Joi.string().valid(
      'mathematical_reasoning',
      'problem_solving',
      'scientific_analysis',
      'critical_thinking',
      'conceptual_understanding',
      'computational_thinking'
    ))
    .min(1)
    .max(3)
    .optional(),
  
  deadline: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Deadline must be in the future'
    })
});

/**
 * Class performance query validation
 */
const classPerformanceQuerySchema = Joi.object({
  class: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      'any.required': 'Class is required'
    }),
  
  section: Joi.string()
    .length(1)
    .uppercase()
    .required()
    .messages({
      'any.required': 'Section is required'
    }),
  
  startDate: Joi.date()
    .optional(),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  
  includeDetails: Joi.boolean()
    .default(false)
});

/**
 * Evaluate challenge validation
 */
const evaluateChallengeSchema = Joi.object({
  challengeId: Joi.string()
    .pattern(/^CHAL-[A-Z0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid challenge ID format',
      'any.required': 'Challenge ID is required'
    }),
  
  feedback: Joi.string()
    .max(2000)
    .optional(),
  
  suggestions: Joi.string()
    .max(1000)
    .optional()
});

/**
 * Teacher schedule validation
 */
const scheduleSchema = Joi.object({
  schedule: Joi.array()
    .items(Joi.object({
      day: Joi.string()
        .valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
        .required(),
      periods: Joi.array()
        .items(Joi.object({
          periodNumber: Joi.number().integer().min(1).max(10).required(),
          class: Joi.number().integer().min(1).max(12).required(),
          section: Joi.string().length(1).uppercase().required(),
          subject: Joi.string().trim().min(1).max(50).required(),
          startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
          endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
        }))
        .min(0)
        .max(10)
        .required()
    }))
    .min(1)
    .max(6)
    .required()
    .messages({
      'array.min': 'At least one day schedule is required',
      'any.required': 'Schedule is required'
    })
});

/**
 * Teacher report query validation
 */
const teacherReportQuerySchema = Joi.object({
  reportType: Joi.string()
    .valid('performance', 'attendance', 'progress', 'comprehensive')
    .required()
    .messages({
      'any.required': 'Report type is required'
    }),
  
  class: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .optional(),
  
  section: Joi.string()
    .length(1)
    .uppercase()
    .optional(),
  
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
  
  format: Joi.string()
    .valid('json', 'pdf', 'excel')
    .default('json')
});

/**
 * Teacher statistics query validation
 */
const statisticsQuerySchema = Joi.object({
  period: Joi.string()
    .valid('week', 'month', 'quarter', 'year', 'custom')
    .default('month'),
  
  startDate: Joi.date()
    .when('period', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
  
  endDate: Joi.date()
    .when('period', {
      is: 'custom',
      then: Joi.required().min(Joi.ref('startDate')),
      otherwise: Joi.forbidden()
    })
});

/**
 * Update teacher status validation
 */
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'inactive', 'suspended', 'pending')
    .required()
    .messages({
      'any.only': 'Status must be one of: active, inactive, suspended, pending',
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
      'any.required': 'Reason is required when suspending a teacher'
    })
});

/**
 * Bulk assign challenges validation
 */
const bulkAssignChallengesSchema = Joi.object({
  studentIds: Joi.array()
    .items(Joi.string().pattern(/^STD-[A-Z0-9]{10}$/))
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one student ID is required',
      'array.max': 'Cannot assign to more than 50 students at once',
      'any.required': 'Student IDs are required'
    }),
  
  simulationType: Joi.string()
    .valid('projectile_motion', 'free_fall', 'circular_motion', 'simple_pendulum', 'inclined_plane')
    .required()
    .messages({
      'any.required': 'Simulation type is required'
    }),
  
  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard', 'expert')
    .required()
    .messages({
      'any.required': 'Difficulty is required'
    }),
  
  deadline: Joi.date()
    .min('now')
    .optional()
});

/**
 * Teacher preferences validation
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
    studentSubmissions: Joi.boolean().optional(),
    performanceAlerts: Joi.boolean().optional()
  }).optional(),
  
  dashboard: Joi.object({
    defaultView: Joi.string().valid('overview', 'students', 'challenges', 'reports').optional(),
    showStatistics: Joi.boolean().optional(),
    chartType: Joi.string().valid('line', 'bar', 'pie').optional()
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
  createTeacherSchema,
  updateTeacherSchema,
  teacherIdSchema,
  getTeachersQuerySchema,
  assignClassesSchema,
  getStudentsByTeacherQuerySchema,
  generateChallengeSchema,
  classPerformanceQuerySchema,
  evaluateChallengeSchema,
  scheduleSchema,
  teacherReportQuerySchema,
  statisticsQuerySchema,
  updateStatusSchema,
  bulkAssignChallengesSchema,
  updatePreferencesSchema,
  
  // Validation functions
  validate,
  validateQuery,
  validateParams,
  
  // Middleware exports
  validateCreateTeacher: validate(createTeacherSchema),
  validateUpdateTeacher: validate(updateTeacherSchema),
  validateTeacherId: validateParams(teacherIdSchema),
  validateGetTeachersQuery: validateQuery(getTeachersQuerySchema),
  validateAssignClasses: validate(assignClassesSchema),
  validateGetStudentsByTeacher: validateQuery(getStudentsByTeacherQuerySchema),
  validateGenerateChallenge: validate(generateChallengeSchema),
  validateClassPerformanceQuery: validateQuery(classPerformanceQuerySchema),
  validateEvaluateChallenge: validate(evaluateChallengeSchema),
  validateSchedule: validate(scheduleSchema),
  validateTeacherReportQuery: validateQuery(teacherReportQuerySchema),
  validateStatisticsQuery: validateQuery(statisticsQuerySchema),
  validateUpdateStatus: validate(updateStatusSchema),
  validateBulkAssignChallenges: validate(bulkAssignChallengesSchema),
  validateUpdatePreferences: validate(updatePreferencesSchema)
};