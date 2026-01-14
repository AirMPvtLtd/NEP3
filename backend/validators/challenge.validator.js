// validators/challenge.validator.js
/**
 * CHALLENGE VALIDATOR - COMPLETE PRODUCTION VERSION
 * Challenge-related validation schemas for physics simulations
 * 
 * @module validators/challenge.validator
 * 
 * This validator handles all challenge-related validation including:
 * - Challenge creation and generation
 * - Challenge submission and evaluation
 * - Challenge queries and filters
 * - Simulation parameters validation
 * - Bulk operations
 * - Challenge metadata management
 */

const Joi = require('joi');

// ============================================================================
// SIMULATION TYPE CONFIGURATIONS
// ============================================================================

/**
 * Simulation types supported by the platform
 * Each simulation has specific parameters and physics calculations
 */
const SIMULATION_TYPES = {
  PROJECTILE_MOTION: 'projectile_motion',
  FREE_FALL: 'free_fall',
  CIRCULAR_MOTION: 'circular_motion',
  SIMPLE_PENDULUM: 'simple_pendulum',
  INCLINED_PLANE: 'inclined_plane'
};

/**
 * Difficulty levels for challenges
 * Each level affects parameter ranges and complexity
 */
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard', 'expert'];

/**
 * Competencies that can be assessed through challenges
 * Based on NEP (National Education Policy) framework
 */
const COMPETENCIES = [
  'mathematical_reasoning',
  'problem_solving',
  'scientific_analysis',
  'critical_thinking',
  'conceptual_understanding',
  'computational_thinking'
];

// ============================================================================
// PARAMETER VALIDATION SCHEMAS
// ============================================================================

/**
 * Projectile motion parameters
 * Physics: Projectile launched at angle with initial velocity
 * Outputs: max_height, range, time_of_flight
 */
const projectileMotionParamsSchema = Joi.object({
  initial_velocity: Joi.number()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.min': 'Initial velocity must be at least 1 m/s',
      'number.max': 'Initial velocity cannot exceed 100 m/s',
      'any.required': 'Initial velocity is required'
    }),
  
  launch_angle: Joi.number()
    .min(0)
    .max(90)
    .required()
    .messages({
      'number.min': 'Launch angle must be at least 0 degrees',
      'number.max': 'Launch angle cannot exceed 90 degrees',
      'any.required': 'Launch angle is required'
    }),
  
  height: Joi.number()
    .min(0)
    .max(1000)
    .default(0)
    .messages({
      'number.min': 'Height cannot be negative',
      'number.max': 'Height cannot exceed 1000 meters'
    })
});

/**
 * Free fall parameters
 * Physics: Object falling under gravity
 * Outputs: final_velocity, time_to_ground, impact_energy
 */
const freeFallParamsSchema = Joi.object({
  initial_height: Joi.number()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'number.min': 'Initial height must be at least 1 meter',
      'number.max': 'Initial height cannot exceed 1000 meters',
      'any.required': 'Initial height is required'
    }),
  
  initial_velocity: Joi.number()
    .min(0)
    .max(50)
    .default(0)
    .messages({
      'number.min': 'Initial velocity cannot be negative',
      'number.max': 'Initial velocity cannot exceed 50 m/s'
    }),
  
  mass: Joi.number()
    .min(0.1)
    .max(1000)
    .optional()
    .messages({
      'number.min': 'Mass must be at least 0.1 kg',
      'number.max': 'Mass cannot exceed 1000 kg'
    })
});

/**
 * Circular motion parameters
 * Physics: Object moving in circular path
 * Outputs: centripetal_force, angular_velocity, period
 */
const circularMotionParamsSchema = Joi.object({
  radius: Joi.number()
    .min(0.1)
    .max(100)
    .required()
    .messages({
      'number.min': 'Radius must be at least 0.1 meters',
      'number.max': 'Radius cannot exceed 100 meters',
      'any.required': 'Radius is required'
    }),
  
  velocity: Joi.number()
    .min(0.1)
    .max(100)
    .required()
    .messages({
      'number.min': 'Velocity must be at least 0.1 m/s',
      'number.max': 'Velocity cannot exceed 100 m/s',
      'any.required': 'Velocity is required'
    }),
  
  mass: Joi.number()
    .min(0.1)
    .max(1000)
    .required()
    .messages({
      'number.min': 'Mass must be at least 0.1 kg',
      'number.max': 'Mass cannot exceed 1000 kg',
      'any.required': 'Mass is required'
    })
});

/**
 * Simple pendulum parameters
 * Physics: Pendulum oscillation
 * Outputs: period, frequency, max_velocity
 */
const simplePendulumParamsSchema = Joi.object({
  length: Joi.number()
    .min(0.1)
    .max(50)
    .required()
    .messages({
      'number.min': 'Length must be at least 0.1 meters',
      'number.max': 'Length cannot exceed 50 meters',
      'any.required': 'Length is required'
    }),
  
  angle: Joi.number()
    .min(1)
    .max(30)
    .required()
    .messages({
      'number.min': 'Angle must be at least 1 degree',
      'number.max': 'Angle cannot exceed 30 degrees (small angle approximation)',
      'any.required': 'Angle is required'
    }),
  
  mass: Joi.number()
    .min(0.1)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Mass must be at least 0.1 kg',
      'number.max': 'Mass cannot exceed 100 kg'
    })
});

/**
 * Inclined plane parameters
 * Physics: Object on inclined surface with friction
 * Outputs: acceleration, normal_force, friction_force
 */
const inclinedPlaneParamsSchema = Joi.object({
  angle: Joi.number()
    .min(1)
    .max(89)
    .required()
    .messages({
      'number.min': 'Angle must be at least 1 degree',
      'number.max': 'Angle cannot exceed 89 degrees',
      'any.required': 'Angle is required'
    }),
  
  mass: Joi.number()
    .min(0.1)
    .max(1000)
    .required()
    .messages({
      'number.min': 'Mass must be at least 0.1 kg',
      'number.max': 'Mass cannot exceed 1000 kg',
      'any.required': 'Mass is required'
    }),
  
  friction_coefficient: Joi.number()
    .min(0)
    .max(1)
    .required()
    .messages({
      'number.min': 'Friction coefficient cannot be negative',
      'number.max': 'Friction coefficient cannot exceed 1',
      'any.required': 'Friction coefficient is required'
    })
});

// ============================================================================
// MAIN VALIDATION SCHEMAS
// ============================================================================

/**
 * Generate challenge validation schema
 * Used when creating a new challenge for a student
 */
const generateChallengeSchema = Joi.object({
  studentId: Joi.string()
    .pattern(/^STD-[A-Z0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid student ID format (expected: STD-XXXXXXXXXX)',
      'any.required': 'Student ID is required'
    }),
  
  simulationType: Joi.string()
    .valid(...Object.values(SIMULATION_TYPES))
    .required()
    .messages({
      'any.only': `Simulation type must be one of: ${Object.values(SIMULATION_TYPES).join(', ')}`,
      'any.required': 'Simulation type is required'
    }),
  
  difficulty: Joi.string()
    .valid(...DIFFICULTY_LEVELS)
    .required()
    .messages({
      'any.only': `Difficulty must be one of: ${DIFFICULTY_LEVELS.join(', ')}`,
      'any.required': 'Difficulty is required'
    }),
  
  competencies: Joi.array()
    .items(Joi.string().valid(...COMPETENCIES))
    .min(1)
    .max(3)
    .optional()
    .messages({
      'array.min': 'At least one competency is required',
      'array.max': 'Cannot select more than 3 competencies',
      'any.only': `Competency must be one of: ${COMPETENCIES.join(', ')}`
    }),
  
  deadline: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Deadline must be in the future'
    }),
  
  instructions: Joi.string()
    .max(2000)
    .optional()
    .messages({
      'string.max': 'Instructions cannot exceed 2000 characters'
    }),
  
  hints: Joi.array()
    .items(Joi.string().max(500))
    .max(5)
    .optional()
    .messages({
      'array.max': 'Cannot provide more than 5 hints'
    })
});

/**
 * Submit challenge validation schema
 * Used when student submits their answers
 */
const submitChallengeSchema = Joi.object({
  challengeId: Joi.string()
    .pattern(/^CHAL-[A-Z0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid challenge ID format',
      'any.required': 'Challenge ID is required'
    }),
  
  answers: Joi.object()
    .pattern(
      Joi.string(),
      Joi.number()
    )
    .min(1)
    .required()
    .messages({
      'object.min': 'At least one answer is required',
      'any.required': 'Answers are required'
    }),
  
  workingSteps: Joi.string()
    .max(5000)
    .optional()
    .messages({
      'string.max': 'Working steps cannot exceed 5000 characters'
    }),
  
  timeTaken: Joi.number()
    .integer()
    .min(1)
    .max(7200)
    .optional()
    .messages({
      'number.min': 'Time taken must be at least 1 second',
      'number.max': 'Time taken cannot exceed 2 hours (7200 seconds)'
    }),
  
  hintsUsed: Joi.number()
    .integer()
    .min(0)
    .max(5)
    .default(0)
    .messages({
      'number.min': 'Hints used cannot be negative',
      'number.max': 'Cannot use more than 5 hints'
    }),
  
  attempts: Joi.number()
    .integer()
    .min(1)
    .max(3)
    .default(1)
    .messages({
      'number.min': 'Attempts must be at least 1',
      'number.max': 'Cannot exceed 3 attempts'
    })
});

/**
 * Evaluate challenge validation schema
 * Used when teacher manually evaluates a challenge
 */
const evaluateChallengeSchema = Joi.object({
  challengeId: Joi.string()
    .pattern(/^CHAL-[A-Z0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid challenge ID format',
      'any.required': 'Challenge ID is required'
    }),
  
  manualScore: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.min': 'Score cannot be negative',
      'number.max': 'Score cannot exceed 100'
    }),
  
  feedback: Joi.string()
    .max(2000)
    .optional()
    .messages({
      'string.max': 'Feedback cannot exceed 2000 characters'
    }),
  
  strengths: Joi.array()
    .items(Joi.string().max(200))
    .max(5)
    .optional()
    .messages({
      'array.max': 'Cannot provide more than 5 strengths'
    }),
  
  weaknesses: Joi.array()
    .items(Joi.string().max(200))
    .max(5)
    .optional()
    .messages({
      'array.max': 'Cannot provide more than 5 weaknesses'
    }),
  
  suggestions: Joi.array()
    .items(Joi.string().max(200))
    .max(5)
    .optional()
    .messages({
      'array.max': 'Cannot provide more than 5 suggestions'
    })
});

/**
 * Challenge ID parameter validation
 */
const challengeIdSchema = Joi.object({
  challengeId: Joi.string()
    .pattern(/^CHAL-[A-Z0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid challenge ID format',
      'any.required': 'Challenge ID is required'
    })
});

/**
 * Get challenges query validation
 * Used for filtering and pagination
 */
const getChallengesQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  studentId: Joi.string()
    .pattern(/^STD-[A-Z0-9]{10}$/)
    .optional(),
  
  teacherId: Joi.string()
    .pattern(/^TCH-[A-Z0-9]{10}$/)
    .optional(),
  
  simulationType: Joi.string()
    .valid(...Object.values(SIMULATION_TYPES))
    .optional(),
  
  difficulty: Joi.string()
    .valid(...DIFFICULTY_LEVELS)
    .optional(),
  
  status: Joi.string()
    .valid('pending', 'submitted', 'evaluated')
    .optional(),
  
  startDate: Joi.date()
    .optional(),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  
  minScore: Joi.number()
    .min(0)
    .max(100)
    .optional(),
  
  maxScore: Joi.number()
    .min(Joi.ref('minScore'))
    .max(100)
    .optional()
    .messages({
      'number.min': 'Max score must be greater than min score'
    }),
  
  sortBy: Joi.string()
    .valid('createdAt', 'submittedAt', 'evaluatedAt', 'score', 'difficulty')
    .default('createdAt'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

/**
 * Bulk generate challenges validation
 * Used when creating challenges for multiple students
 */
const bulkGenerateChallengesSchema = Joi.object({
  studentIds: Joi.array()
    .items(Joi.string().pattern(/^STD-[A-Z0-9]{10}$/))
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one student ID is required',
      'array.max': 'Cannot generate challenges for more than 50 students at once',
      'any.required': 'Student IDs are required'
    }),
  
  simulationType: Joi.string()
    .valid(...Object.values(SIMULATION_TYPES))
    .required()
    .messages({
      'any.required': 'Simulation type is required'
    }),
  
  difficulty: Joi.string()
    .valid(...DIFFICULTY_LEVELS)
    .required()
    .messages({
      'any.required': 'Difficulty is required'
    }),
  
  deadline: Joi.date()
    .min('now')
    .optional(),
  
  sameChallengeForAll: Joi.boolean()
    .default(false)
    .description('Whether to generate the same challenge parameters for all students')
});

/**
 * Challenge statistics query validation
 */
const challengeStatisticsQuerySchema = Joi.object({
  studentId: Joi.string()
    .pattern(/^STD-[A-Z0-9]{10}$/)
    .optional(),
  
  groupBy: Joi.string()
    .valid('simulationType', 'difficulty', 'date', 'competency')
    .default('simulationType'),
  
  startDate: Joi.date()
    .optional(),
  
  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional(),
  
  includeDetails: Joi.boolean()
    .default(false)
});

/**
 * Delete challenge validation
 */
const deleteChallengeSchema = Joi.object({
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters'
    })
});

/**
 * Update challenge metadata validation
 */
const updateChallengeMetadataSchema = Joi.object({
  instructions: Joi.string()
    .max(2000)
    .optional(),
  
  hints: Joi.array()
    .items(Joi.string().max(500))
    .max(5)
    .optional(),
  
  deadline: Joi.date()
    .min('now')
    .optional(),
  
  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .optional()
}).min(1);

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate request body
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
 * Validate route parameters
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

/**
 * Validate simulation parameters based on type
 * @param {String} simulationType - Type of simulation
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validation result
 */
const validateSimulationParams = (simulationType, params) => {
  let schema;
  
  switch (simulationType) {
    case SIMULATION_TYPES.PROJECTILE_MOTION:
      schema = projectileMotionParamsSchema;
      break;
    case SIMULATION_TYPES.FREE_FALL:
      schema = freeFallParamsSchema;
      break;
    case SIMULATION_TYPES.CIRCULAR_MOTION:
      schema = circularMotionParamsSchema;
      break;
    case SIMULATION_TYPES.SIMPLE_PENDULUM:
      schema = simplePendulumParamsSchema;
      break;
    case SIMULATION_TYPES.INCLINED_PLANE:
      schema = inclinedPlaneParamsSchema;
      break;
    default:
      return {
        valid: false,
        errors: ['Invalid simulation type']
      };
  }
  
  const { error, value } = schema.validate(params);
  
  if (error) {
    return {
      valid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return {
    valid: true,
    value
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  SIMULATION_TYPES,
  DIFFICULTY_LEVELS,
  COMPETENCIES,
  
  // Main schemas
  generateChallengeSchema,
  submitChallengeSchema,
  evaluateChallengeSchema,
  challengeIdSchema,
  getChallengesQuerySchema,
  bulkGenerateChallengesSchema,
  challengeStatisticsQuerySchema,
  deleteChallengeSchema,
  updateChallengeMetadataSchema,
  
  // Parameter schemas
  projectileMotionParamsSchema,
  freeFallParamsSchema,
  circularMotionParamsSchema,
  simplePendulumParamsSchema,
  inclinedPlaneParamsSchema,
  
  // Validation functions
  validate,
  validateQuery,
  validateParams,
  validateSimulationParams,
  
  // Middleware exports
  validateGenerateChallenge: validate(generateChallengeSchema),
  validateSubmitChallenge: validate(submitChallengeSchema),
  validateEvaluateChallenge: validate(evaluateChallengeSchema),
  validateChallengeId: validateParams(challengeIdSchema),
  validateGetChallengesQuery: validateQuery(getChallengesQuerySchema),
  validateBulkGenerateChallenges: validate(bulkGenerateChallengesSchema),
  validateChallengeStatisticsQuery: validateQuery(challengeStatisticsQuerySchema),
  validateDeleteChallenge: validate(deleteChallengeSchema),
  validateUpdateChallengeMetadata: validate(updateChallengeMetadataSchema)
};