// models/AILog.js
/**
 * AI LOG MODEL - COMPLETE PRODUCTION VERSION
 * Log AI evaluation requests, responses, and usage tracking
 * 
 * @module models/AILog
 */

const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  userType: {
    type: String,
    enum: ['student', 'teacher', 'admin', 'system'],
    required: true,
    index: true
  },
  
  schoolId: {
    type: String,
    ref: 'School',
    index: true
  },
  
  challengeId: {
    type: String,
    ref: 'Challenge',
    index: true
  },
  
  operation: {
    type: String,
    enum: [
      'challenge_generation',
      'challenge_evaluation', 
      'answer_evaluation',
      'feedback_generation',
      'nep_report_generation',
      'competency_analysis',
      'recommendation_generation',
      'other'
    ],
    required: true,
    index: true
  },
  
  // Model Information
  model: {
    type: String,
    required: true,
    index: true
  },
  
  modelVersion: String,
  
  // Request Details
  request: {
    prompt: String,
    temperature: Number,
    maxTokens: Number,
    topP: Number,
    frequencyPenalty: Number,
    presencePenalty: Number,
    stopSequences: [String],
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Response Details
  response: {
    content: String,
    tokensUsed: Number,
    promptTokens: Number,
    completionTokens: Number,
    responseTime: Number, // milliseconds
    finishReason: String,
    choices: Number,
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Processing Details
  processing: {
    kalmanApplied: Boolean,
    pidApplied: Boolean,
    metaLearningApplied: Boolean,
    preprocessingTime: Number,
    postprocessingTime: Number,
    totalProcessingTime: Number,
    rawScore: Number,
    adjustedScore: Number,
    adjustmentFactor: Number
  },
  
  // Success/Error Tracking
  success: {
    type: Boolean,
    default: true,
    index: true
  },
  
  errorMessage: String,
  errorCode: String,
  errorStack: String,
  
  retryCount: {
    type: Number,
    default: 0
  },
  
  // Cost Tracking
  tokensUsed: {
    type: Number,
    default: 0,
    index: true
  },
  
  cost: {
    type: Number,
    default: 0
  },
  
  costBreakdown: {
    promptCost: Number,
    completionCost: Number,
    totalCost: Number
  },
  
  // Performance Metrics
  performance: {
    latency: Number, // Total time from request to response
    throughput: Number, // Tokens per second
    cacheHit: Boolean,
    cached: Boolean
  },
  
  // Rate Limiting
  rateLimitStatus: {
    remaining: Number,
    limit: Number,
    resetAt: Date
  },
  
  // IP and Device Info
  ipAddress: String,
  userAgent: String,
  
  // Additional Context
  context: {
    simulationType: String,
    difficulty: String,
    competencies: [String],
    studentLevel: String,
    previousAttempts: Number
  },
  
  // Result Quality
  quality: {
    score: Number, // 0-100
    confidence: Number, // 0-1
    validated: Boolean,
    validationErrors: [String]
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// ============================================================================
// INDEXES
// ============================================================================

aiLogSchema.index({ timestamp: -1 });
aiLogSchema.index({ userId: 1, timestamp: -1 });
aiLogSchema.index({ schoolId: 1, timestamp: -1 });
aiLogSchema.index({ operation: 1, timestamp: -1 });
aiLogSchema.index({ model: 1, timestamp: -1 });
aiLogSchema.index({ success: 1, timestamp: -1 });
aiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Log AI request
 * @param {Object} data - Log data
 * @returns {Object} Created log
 */
aiLogSchema.statics.logRequest = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Failed to log AI request:', error);
    return null;
  }
};

/**
 * Get usage statistics
 * @param {Object} options - Query options
 * @returns {Object} Statistics
 */
aiLogSchema.statics.getStatistics = async function(options = {}) {
  const {
    days = 7,
    userId,
    schoolId,
    operation,
    model
  } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const match = { timestamp: { $gte: startDate } };
  if (userId) match.userId = userId;
  if (schoolId) match.schoolId = schoolId;
  if (operation) match.operation = operation;
  if (model) match.model = model;
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: { $sum: { $cond: ['$success', 1, 0] } },
        failedRequests: { $sum: { $cond: ['$success', 0, 1] } },
        totalTokens: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$cost' },
        avgResponseTime: { $avg: '$response.responseTime' },
        avgTokensPerRequest: { $avg: '$tokensUsed' },
        avgCostPerRequest: { $avg: '$cost' }
      }
    }
  ]);
  
  return stats[0] || {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    avgResponseTime: 0,
    avgTokensPerRequest: 0,
    avgCostPerRequest: 0
  };
};

/**
 * Get statistics by operation
 * @param {Object} options - Query options
 * @returns {Array} Statistics by operation
 */
aiLogSchema.statics.getStatsByOperation = async function(options = {}) {
  const { days = 7, schoolId } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const match = { timestamp: { $gte: startDate } };
  if (schoolId) match.schoolId = schoolId;
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$operation',
        count: { $sum: 1 },
        totalTokens: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$cost' },
        avgResponseTime: { $avg: '$response.responseTime' },
        successRate: { $avg: { $cond: ['$success', 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

/**
 * Get statistics by model
 * @param {Object} options - Query options
 * @returns {Array} Statistics by model
 */
aiLogSchema.statics.getStatsByModel = async function(options = {}) {
  const { days = 7, schoolId } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const match = { timestamp: { $gte: startDate } };
  if (schoolId) match.schoolId = schoolId;
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$model',
        count: { $sum: 1 },
        totalTokens: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$cost' },
        avgResponseTime: { $avg: '$response.responseTime' },
        successRate: { $avg: { $cond: ['$success', 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

/**
 * Get daily usage trend
 * @param {Object} options - Query options
 * @returns {Array} Daily statistics
 */
aiLogSchema.statics.getDailyTrend = async function(options = {}) {
  const { days = 30, schoolId } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const match = { timestamp: { $gte: startDate } };
  if (schoolId) match.schoolId = schoolId;
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        requests: { $sum: 1 },
        tokens: { $sum: '$tokensUsed' },
        cost: { $sum: '$cost' },
        avgResponseTime: { $avg: '$response.responseTime' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

/**
 * Get cost projection
 * @param {Object} options - Query options
 * @returns {Object} Cost projection
 */
aiLogSchema.statics.getCostProjection = async function(options = {}) {
  const { schoolId } = options;
  
  // Last 30 days
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const match = { timestamp: { $gte: last30Days } };
  if (schoolId) match.schoolId = schoolId;
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$cost' },
        totalTokens: { $sum: '$tokensUsed' },
        totalRequests: { $sum: 1 }
      }
    }
  ]);
  
  if (!stats[0]) {
    return {
      last30DaysCost: 0,
      dailyAvgCost: 0,
      monthlyProjection: 0,
      yearlyProjection: 0
    };
  }
  
  const last30DaysCost = stats[0].totalCost;
  const dailyAvgCost = last30DaysCost / 30;
  const monthlyProjection = dailyAvgCost * 30;
  const yearlyProjection = dailyAvgCost * 365;
  
  return {
    last30DaysCost,
    last30DaysTokens: stats[0].totalTokens,
    last30DaysRequests: stats[0].totalRequests,
    dailyAvgCost,
    dailyAvgTokens: stats[0].totalTokens / 30,
    dailyAvgRequests: stats[0].totalRequests / 30,
    monthlyProjection,
    yearlyProjection
  };
};

/**
 * Get error analysis
 * @param {Object} options - Query options
 * @returns {Array} Error statistics
 */
aiLogSchema.statics.getErrorAnalysis = async function(options = {}) {
  const { days = 7, schoolId } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const match = { 
    timestamp: { $gte: startDate },
    success: false
  };
  if (schoolId) match.schoolId = schoolId;
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$errorCode',
        count: { $sum: 1 },
        errorMessages: { $push: '$errorMessage' },
        operations: { $addToSet: '$operation' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

/**
 * Get top users by usage
 * @param {Object} options - Query options
 * @returns {Array} Top users
 */
aiLogSchema.statics.getTopUsers = async function(options = {}) {
  const { days = 7, schoolId, limit = 10 } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const match = { timestamp: { $gte: startDate } };
  if (schoolId) match.schoolId = schoolId;
  
  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$userId',
        userType: { $first: '$userType' },
        requests: { $sum: 1 },
        tokens: { $sum: '$tokensUsed' },
        cost: { $sum: '$cost' }
      }
    },
    { $sort: { requests: -1 } },
    { $limit: limit }
  ]);
};

/**
 * Clean up old logs
 * @param {Number} daysOld - Days to keep
 * @returns {Object} Delete result
 */
aiLogSchema.statics.cleanup = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return await this.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
};

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Calculate cost
 * @param {Number} promptTokens - Prompt tokens
 * @param {Number} completionTokens - Completion tokens
 * @param {String} model - Model name
 * @returns {Number} Estimated cost
 */
aiLogSchema.methods.calculateCost = function(promptTokens, completionTokens, model) {
  // Cost per 1K tokens (example rates - adjust based on actual pricing)
  const rates = {
    'mistral-large-latest': { prompt: 0.004, completion: 0.012 },
    'mistral-medium-latest': { prompt: 0.002, completion: 0.006 },
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 }
  };
  
  const rate = rates[model] || { prompt: 0.002, completion: 0.002 };
  
  const promptCost = (promptTokens / 1000) * rate.prompt;
  const completionCost = (completionTokens / 1000) * rate.completion;
  
  this.costBreakdown = {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost
  };
  
  this.cost = promptCost + completionCost;
  
  return this.cost;
};

/**
 * Mark as cached
 * @returns {Object} This
 */
aiLogSchema.methods.markAsCached = function() {
  this.performance = this.performance || {};
  this.performance.cached = true;
  this.performance.cacheHit = true;
  this.cost = 0; // No cost for cached responses
  return this;
};

// ============================================================================
// VIRTUALS
// ============================================================================

aiLogSchema.virtual('tokensPerSecond').get(function() {
  if (!this.response?.responseTime || this.response.responseTime === 0) return 0;
  return (this.tokensUsed / (this.response.responseTime / 1000));
});

aiLogSchema.virtual('costPerToken').get(function() {
  if (!this.tokensUsed || this.tokensUsed === 0) return 0;
  return this.cost / this.tokensUsed;
});

aiLogSchema.virtual('isError').get(function() {
  return !this.success;
});

aiLogSchema.virtual('hasHighLatency').get(function() {
  return this.response?.responseTime > 5000; // > 5 seconds
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

aiLogSchema.pre('save', function(next) {
  // Calculate total tokens if not set
  if (!this.tokensUsed && this.response?.tokensUsed) {
    this.tokensUsed = this.response.tokensUsed;
  }
  
  // Calculate performance latency
  if (this.response?.responseTime && !this.performance?.latency) {
    if (!this.performance) this.performance = {};
    this.performance.latency = this.response.responseTime;
  }
  
  // Calculate throughput
  if (this.tokensUsed && this.response?.responseTime) {
    if (!this.performance) this.performance = {};
    this.performance.throughput = this.tokensPerSecond;
  }
  
  next();
});

// ============================================================================
// JSON TRANSFORMATION
// ============================================================================

aiLogSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Don't expose full prompts in API responses (privacy)
    if (ret.request?.prompt && ret.request.prompt.length > 100) {
      ret.request.prompt = ret.request.prompt.substring(0, 100) + '...';
    }
    if (ret.response?.content && ret.response.content.length > 500) {
      ret.response.content = ret.response.content.substring(0, 500) + '...';
    }
    delete ret.__v;
    return ret;
  }
});

const AILog = mongoose.model('AILog', aiLogSchema);

module.exports = AILog;