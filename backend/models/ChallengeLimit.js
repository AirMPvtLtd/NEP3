// models/ChallengeLimit.js
/**
 * CHALLENGE LIMIT MODEL - COMPLETE PRODUCTION VERSION
 * Track challenge generation limits per student with comprehensive rate limiting
 * 
 * @module models/ChallengeLimit
 */

const mongoose = require('mongoose');

const challengeLimitSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    ref: 'Student',
    index: true
  },
  
  schoolId: {
    type: String,
    required: true,
    ref: 'School',
    index: true
  },
  
  date: {
    type: Date,
    required: true,
    default: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    },
    index: true
  },
  
  totalToday: {
    type: Number,
    default: 0,
    min: 0
  },
  
  bySimulation: {
    type: Map,
    of: {
      count: {
        type: Number,
        default: 0,
        min: 0
      },
      lastGenerated: Date,
      firstGeneratedToday: Date
    },
    default: new Map()
  },
  
  dailyLimit: {
    type: Number,
    default: 20, // Default from constants
    min: 1,
    max: 100
  },
  
  perSimulationLimit: {
    type: Number,
    default: 5, // Default from constants
    min: 1,
    max: 20
  },
  
  // Track if limits were exceeded
  limitExceeded: {
    type: Boolean,
    default: false
  },
  
  exceedAttempts: {
    type: Number,
    default: 0
  },
  
  // Last reset time (for tracking)
  lastReset: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ============================================================================
// INDEXES
// ============================================================================

challengeLimitSchema.index({ studentId: 1, date: -1 });
challengeLimitSchema.index({ schoolId: 1, date: -1 });
challengeLimitSchema.index({ date: 1 }, { expireAfterSeconds: 172800 }); // Auto-delete after 2 days
challengeLimitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // Weekly cleanup

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Check if student can generate a challenge
 * @param {String} studentId - Student ID
 * @param {String} schoolId - School ID
 * @param {String} simulationType - Simulation type
 * @param {Number} dailyLimit - Daily limit override
 * @param {Number} perSimLimit - Per-simulation limit override
 * @returns {Object} { allowed: Boolean, reason: String, remaining: Object }
 */
challengeLimitSchema.statics.canGenerate = async function(
  studentId,
  schoolId,
  simulationType,
  dailyLimit = 20,
  perSimLimit = 5
) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let limit = await this.findOne({ 
      studentId, 
      date: { $gte: today } 
    });
    
    // Create new limit record if doesn't exist
    if (!limit) {
      limit = await this.create({ 
        studentId,
        schoolId,
        date: today,
        dailyLimit,
        perSimulationLimit: perSimLimit
      });
    }
    
    // Check daily limit
    if (limit.totalToday >= dailyLimit) {
      limit.limitExceeded = true;
      limit.exceedAttempts++;
      await limit.save();
      
      return { 
        allowed: false, 
        reason: 'daily_limit',
        remaining: {
          daily: 0,
          simulation: 0
        }
      };
    }
    
    // Check per-simulation limit
    const simData = limit.bySimulation.get(simulationType);
    if (simData && simData.count >= perSimLimit) {
      limit.exceedAttempts++;
      await limit.save();
      
      return { 
        allowed: false, 
        reason: 'simulation_limit',
        remaining: {
          daily: dailyLimit - limit.totalToday,
          simulation: 0
        }
      };
    }
    
    return { 
      allowed: true,
      remaining: {
        daily: dailyLimit - limit.totalToday,
        simulation: perSimLimit - (simData?.count || 0)
      }
    };
    
  } catch (error) {
    console.error('ChallengeLimit.canGenerate error:', error);
    // Default to allowing if error (fail open)
    return { allowed: true, error: error.message };
  }
};

/**
 * Record challenge generation
 * @param {String} studentId - Student ID
 * @param {String} schoolId - School ID
 * @param {String} simulationType - Simulation type
 * @returns {Object} Updated limit document
 */
challengeLimitSchema.statics.recordGeneration = async function(
  studentId,
  schoolId,
  simulationType
) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let limit = await this.findOne({ 
      studentId, 
      date: { $gte: today } 
    });
    
    if (!limit) {
      limit = await this.create({ 
        studentId,
        schoolId,
        date: today 
      });
    }
    
    // Increment total
    limit.totalToday++;
    
    // Update simulation-specific count
    const simData = limit.bySimulation.get(simulationType) || { 
      count: 0,
      firstGeneratedToday: new Date()
    };
    simData.count++;
    simData.lastGenerated = new Date();
    limit.bySimulation.set(simulationType, simData);
    
    return await limit.save();
    
  } catch (error) {
    console.error('ChallengeLimit.recordGeneration error:', error);
    throw error;
  }
};

/**
 * Get student's today limits
 * @param {String} studentId - Student ID
 * @returns {Object} Limit info
 */
challengeLimitSchema.statics.getTodayLimits = async function(studentId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const limit = await this.findOne({ 
    studentId, 
    date: { $gte: today } 
  });
  
  if (!limit) {
    return {
      totalToday: 0,
      bySimulation: new Map(),
      dailyLimit: 20,
      perSimulationLimit: 5
    };
  }
  
  return {
    totalToday: limit.totalToday,
    bySimulation: limit.bySimulation,
    dailyLimit: limit.dailyLimit,
    perSimulationLimit: limit.perSimulationLimit,
    limitExceeded: limit.limitExceeded,
    exceedAttempts: limit.exceedAttempts
  };
};

/**
 * Get school's daily statistics
 * @param {String} schoolId - School ID
 * @returns {Object} School statistics
 */
challengeLimitSchema.statics.getSchoolStats = async function(schoolId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const limits = await this.find({ 
    schoolId,
    date: { $gte: today } 
  });
  
  const totalChallenges = limits.reduce((sum, limit) => sum + limit.totalToday, 0);
  const activeStudents = limits.length;
  const limitExceeded = limits.filter(l => l.limitExceeded).length;
  
  // Simulation breakdown
  const simulationCounts = {};
  limits.forEach(limit => {
    limit.bySimulation.forEach((data, simType) => {
      simulationCounts[simType] = (simulationCounts[simType] || 0) + data.count;
    });
  });
  
  return {
    totalChallenges,
    activeStudents,
    limitExceeded,
    averageChallengesPerStudent: activeStudents > 0 ? totalChallenges / activeStudents : 0,
    simulationCounts
  };
};

/**
 * Reset limits for a student (admin override)
 * @param {String} studentId - Student ID
 * @returns {Object} Result
 */
challengeLimitSchema.statics.resetLimits = async function(studentId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const result = await this.findOneAndUpdate(
    { studentId, date: { $gte: today } },
    {
      totalToday: 0,
      bySimulation: new Map(),
      limitExceeded: false,
      exceedAttempts: 0,
      lastReset: new Date()
    },
    { new: true }
  );
  
  return result;
};

/**
 * Update limits for a student (admin/school setting)
 * @param {String} studentId - Student ID
 * @param {Number} dailyLimit - New daily limit
 * @param {Number} perSimLimit - New per-simulation limit
 * @returns {Object} Updated limit
 */
challengeLimitSchema.statics.updateLimits = async function(
  studentId,
  dailyLimit,
  perSimLimit
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let limit = await this.findOne({ 
    studentId, 
    date: { $gte: today } 
  });
  
  if (!limit) {
    const student = await mongoose.model('Student').findOne({ studentId });
    limit = await this.create({ 
      studentId,
      schoolId: student.schoolId,
      date: today 
    });
  }
  
  if (dailyLimit !== undefined) {
    limit.dailyLimit = dailyLimit;
  }
  
  if (perSimLimit !== undefined) {
    limit.perSimulationLimit = perSimLimit;
  }
  
  return await limit.save();
};

/**
 * Get students exceeding limits (for monitoring)
 * @param {String} schoolId - School ID
 * @returns {Array} Students with exceeded limits
 */
challengeLimitSchema.statics.getExceededLimits = async function(schoolId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return await this.find({
    schoolId,
    date: { $gte: today },
    limitExceeded: true
  }).sort({ exceedAttempts: -1 });
};

/**
 * Cleanup old limit records (maintenance)
 * @param {Number} daysOld - Days to keep (default 7)
 * @returns {Object} Delete result
 */
challengeLimitSchema.statics.cleanup = async function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return await this.deleteMany({
    date: { $lt: cutoffDate }
  });
};

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Check if limit is exceeded
 * @returns {Boolean}
 */
challengeLimitSchema.methods.isExceeded = function() {
  return this.totalToday >= this.dailyLimit;
};

/**
 * Get remaining challenges
 * @returns {Object}
 */
challengeLimitSchema.methods.getRemaining = function() {
  return {
    daily: Math.max(0, this.dailyLimit - this.totalToday),
    total: this.totalToday,
    limit: this.dailyLimit
  };
};

/**
 * Get simulation-specific remaining
 * @param {String} simulationType
 * @returns {Number}
 */
challengeLimitSchema.methods.getRemainingForSimulation = function(simulationType) {
  const simData = this.bySimulation.get(simulationType);
  return Math.max(0, this.perSimulationLimit - (simData?.count || 0));
};

// ============================================================================
// VIRTUALS
// ============================================================================

challengeLimitSchema.virtual('percentageUsed').get(function() {
  return this.dailyLimit > 0 ? (this.totalToday / this.dailyLimit * 100) : 0;
});

challengeLimitSchema.virtual('isNearLimit').get(function() {
  return this.percentageUsed >= 80; // 80% or more
});

challengeLimitSchema.virtual('resetTime').get(function() {
  const tomorrow = new Date(this.date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Ensure date is always normalized
challengeLimitSchema.pre('save', function () {

  if (this.isModified('date') && this.date) {
    this.date.setHours(0, 0, 0, 0);
  }

});


// ============================================================================
// JSON TRANSFORMATION
// ============================================================================

challengeLimitSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.bySimulation = Object.fromEntries(ret.bySimulation);
    return ret;
  }
});

const ChallengeLimit = mongoose.model('ChallengeLimit', challengeLimitSchema);

module.exports = ChallengeLimit;