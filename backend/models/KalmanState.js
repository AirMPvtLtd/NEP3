// models/KalmanState.js
/**
 * KALMAN STATE MODEL - COMPLETE PRODUCTION VERSION
 * Store and manage Kalman filter states for adaptive difficulty per student
 * 
 * @module models/KalmanState
 */

const mongoose = require('mongoose');

const kalmanStateSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    ref: 'Student',
    index: true
  },
  
  schoolId: {
    type: String,
    required: true,
    ref: 'School',
    index: true
  },
  
  // Kalman Filter State Variables
  x: {
    type: Number,
    default: 50, // Initial ability estimate (0-100 scale)
    min: 0,
    max: 100
  },
  
  P: {
    type: Number,
    default: 100, // Initial uncertainty (error covariance)
    min: 0
  },
  
  Q: {
    type: Number,
    default: 5, // Process noise (how much ability changes over time)
    min: 0,
    max: 50
  },
  
  R: {
    type: Number,
    default: 15, // Measurement noise (assessment uncertainty)
    min: 0,
    max: 100
  },
  
  // Per-competency Kalman states
  competencyStates: {
    type: Map,
    of: {
      x: {
        type: Number,
        default: 50
      },
      P: {
        type: Number,
        default: 100
      },
      updates: {
        type: Number,
        default: 0
      },
      lastUpdate: Date
    },
    default: new Map()
  },
  
  // Statistics
  totalUpdates: {
    type: Number,
    default: 0
  },
  
  successfulUpdates: {
    type: Number,
    default: 0
  },
  
  lastUpdate: {
    type: Date,
    index: true
  },
  
  convergenceStatus: {
    type: String,
    enum: ['initializing', 'converging', 'converged', 'stable'],
    default: 'initializing'
  },
  
  // Recent measurements for analysis
  recentMeasurements: [{
    measurement: Number,
    estimate: Number,
    kalmanGain: Number,
    innovation: Number,
    innovationCovariance: Number,
    uncertainty: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    simulationType: String,
    difficulty: String
  }],
  
  // Performance tracking
  performance: {
    averageInnovation: {
      type: Number,
      default: 0
    },
    innovationStdDev: {
      type: Number,
      default: 0
    },
    consistencyScore: {
      type: Number,
      default: 0
    },
    learningRate: {
      type: Number,
      default: 0
    }
  },
  
  // Convergence tracking
  convergenceMetrics: {
    innovationHistory: [Number],
    uncertaintyHistory: [Number],
    estimateHistory: [Number],
    convergenceIteration: Number,
    stabilityCounter: Number
  },
  
  // Adaptive parameters
  adaptive: {
    enabled: {
      type: Boolean,
      default: true
    },
    autoTuneQ: {
      type: Boolean,
      default: true
    },
    autoTuneR: {
      type: Boolean,
      default: true
    },
    minQ: {
      type: Number,
      default: 1
    },
    maxQ: {
      type: Number,
      default: 20
    },
    minR: {
      type: Number,
      default: 5
    },
    maxR: {
      type: Number,
      default: 50
    }
  },
  
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ============================================================================
// INDEXES
// ============================================================================

kalmanStateSchema.index({ studentId: 1 }, { unique: true });
kalmanStateSchema.index({ schoolId: 1 });
kalmanStateSchema.index({ lastUpdate: -1 });
kalmanStateSchema.index({ convergenceStatus: 1 });

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get or create Kalman state for student
 * @param {String} studentId - Student ID
 * @param {String} schoolId - School ID
 * @returns {Object} Kalman state
 */
kalmanStateSchema.statics.getOrCreate = async function(studentId, schoolId) {
  let state = await this.findOne({ studentId });
  
  if (!state) {
    state = await this.create({ 
      studentId,
      schoolId
    });
  }
  
  return state;
};

/**
 * Get all states for school
 * @param {String} schoolId - School ID
 * @returns {Array} Kalman states
 */
kalmanStateSchema.statics.getBySchool = async function(schoolId) {
  return await this.find({ schoolId, active: true })
    .sort({ lastUpdate: -1 });
};

/**
 * Get convergence statistics
 * @param {String} schoolId - School ID (optional)
 * @returns {Object} Statistics
 */
kalmanStateSchema.statics.getConvergenceStats = async function(schoolId) {
  const query = schoolId ? { schoolId, active: true } : { active: true };
  
  const states = await this.find(query);
  
  const stats = {
    total: states.length,
    initializing: states.filter(s => s.convergenceStatus === 'initializing').length,
    converging: states.filter(s => s.convergenceStatus === 'converging').length,
    converged: states.filter(s => s.convergenceStatus === 'converged').length,
    stable: states.filter(s => s.convergenceStatus === 'stable').length,
    averageUpdates: states.reduce((sum, s) => sum + s.totalUpdates, 0) / states.length,
    averageUncertainty: states.reduce((sum, s) => sum + s.P, 0) / states.length
  };
  
  return stats;
};

/**
 * Reset all states
 * @param {String} schoolId - School ID (optional)
 * @returns {Number} Number reset
 */
kalmanStateSchema.statics.resetAll = async function(schoolId) {
  const query = schoolId ? { schoolId } : {};
  
  const result = await this.updateMany(query, {
    x: 50,
    P: 100,
    totalUpdates: 0,
    successfulUpdates: 0,
    convergenceStatus: 'initializing',
    recentMeasurements: [],
    'convergenceMetrics.innovationHistory': [],
    'convergenceMetrics.uncertaintyHistory': [],
    'convergenceMetrics.estimateHistory': []
  });
  
  return result.modifiedCount;
};

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Update Kalman filter with new measurement
 * @param {Number} measurement - Observed score (0-100)
 * @param {Object} options - Additional options (simulationType, difficulty)
 * @returns {Object} Update results
 */
kalmanStateSchema.methods.update = async function(measurement, options = {}) {
  // Prediction step
  const x_pred = this.x;
  const P_pred = this.P + this.Q;
  
  // Update step
  const y = measurement - x_pred; // Innovation (residual)
  const S = P_pred + this.R; // Innovation covariance
  const K = P_pred / S; // Kalman gain (0-1)
  
  // New state estimate
  this.x = x_pred + K * y;
  this.P = (1 - K) * P_pred;
  
  // Ensure bounds
  this.x = Math.max(0, Math.min(100, this.x));
  this.P = Math.max(1, this.P);
  
  // Record measurement
  this.totalUpdates++;
  this.successfulUpdates++;
  this.lastUpdate = new Date();
  
  this.recentMeasurements.push({
    measurement,
    estimate: this.x,
    kalmanGain: K,
    innovation: y,
    innovationCovariance: S,
    uncertainty: this.P,
    timestamp: new Date(),
    simulationType: options.simulationType,
    difficulty: options.difficulty
  });
  
  // Keep only last 50 measurements
  if (this.recentMeasurements.length > 50) {
    this.recentMeasurements = this.recentMeasurements.slice(-50);
  }
  
  // Update convergence metrics
  if (!this.convergenceMetrics.innovationHistory) {
    this.convergenceMetrics.innovationHistory = [];
  }
  if (!this.convergenceMetrics.uncertaintyHistory) {
    this.convergenceMetrics.uncertaintyHistory = [];
  }
  if (!this.convergenceMetrics.estimateHistory) {
    this.convergenceMetrics.estimateHistory = [];
  }
  
  this.convergenceMetrics.innovationHistory.push(Math.abs(y));
  this.convergenceMetrics.uncertaintyHistory.push(this.P);
  this.convergenceMetrics.estimateHistory.push(this.x);
  
  // Keep only last 30 for metrics
  if (this.convergenceMetrics.innovationHistory.length > 30) {
    this.convergenceMetrics.innovationHistory = this.convergenceMetrics.innovationHistory.slice(-30);
    this.convergenceMetrics.uncertaintyHistory = this.convergenceMetrics.uncertaintyHistory.slice(-30);
    this.convergenceMetrics.estimateHistory = this.convergenceMetrics.estimateHistory.slice(-30);
  }
  
  // Update performance metrics
  await this.updatePerformanceMetrics();
  
  // Update convergence status
  await this.updateConvergenceStatus();
  
  // Adaptive tuning
  if (this.adaptive.enabled) {
    await this.adaptiveParameterTuning();
  }
  
  await this.save();
  
  return {
    estimatedAbility: this.x,
    uncertainty: this.P,
    kalmanGain: K,
    innovation: y,
    innovationCovariance: S,
    convergenceStatus: this.convergenceStatus
  };
};

/**
 * Update competency-specific Kalman state
 * @param {String} competency - Competency name
 * @param {Number} measurement - Observed score
 * @returns {Object} Update results
 */
kalmanStateSchema.methods.updateCompetency = async function(competency, measurement) {
  let compState = this.competencyStates.get(competency) || {
    x: 50,
    P: 100,
    updates: 0,
    lastUpdate: new Date()
  };
  
  // Kalman update for this competency
  const Q_comp = this.Q;
  const R_comp = this.R;
  
  const x_pred = compState.x;
  const P_pred = compState.P + Q_comp;
  
  const y = measurement - x_pred;
  const S = P_pred + R_comp;
  const K = P_pred / S;
  
  compState.x = Math.max(0, Math.min(100, x_pred + K * y));
  compState.P = Math.max(1, (1 - K) * P_pred);
  compState.updates++;
  compState.lastUpdate = new Date();
  
  this.competencyStates.set(competency, compState);
  
  await this.save();
  
  return {
    competency,
    estimate: compState.x,
    uncertainty: compState.P,
    kalmanGain: K
  };
};

/**
 * Update performance metrics
 * @returns {Object} This
 */
kalmanStateSchema.methods.updatePerformanceMetrics = async function() {
  if (this.recentMeasurements.length < 3) return this;
  
  // Calculate average innovation
  const innovations = this.recentMeasurements.map(m => Math.abs(m.innovation));
  const avgInnovation = innovations.reduce((a, b) => a + b, 0) / innovations.length;
  
  // Calculate standard deviation
  const variance = innovations.reduce((sum, inn) => sum + Math.pow(inn - avgInnovation, 2), 0) / innovations.length;
  const stdDev = Math.sqrt(variance);
  
  // Consistency score (inverse of normalized std dev)
  const consistencyScore = Math.max(0, 100 - (stdDev / avgInnovation * 100));
  
  // Learning rate (how fast estimate is changing)
  const recentEstimates = this.recentMeasurements.slice(-10).map(m => m.estimate);
  if (recentEstimates.length >= 2) {
    const changes = [];
    for (let i = 1; i < recentEstimates.length; i++) {
      changes.push(Math.abs(recentEstimates[i] - recentEstimates[i - 1]));
    }
    this.performance.learningRate = changes.reduce((a, b) => a + b, 0) / changes.length;
  }
  
  this.performance.averageInnovation = avgInnovation;
  this.performance.innovationStdDev = stdDev;
  this.performance.consistencyScore = consistencyScore;
  
  return this;
};

/**
 * Update convergence status
 * @returns {Object} This
 */
kalmanStateSchema.methods.updateConvergenceStatus = async function() {
  const minUpdates = 5;
  
  if (this.totalUpdates < minUpdates) {
    this.convergenceStatus = 'initializing';
    return this;
  }
  
  const recentInnovations = this.convergenceMetrics.innovationHistory.slice(-10);
  const recentUncertainties = this.convergenceMetrics.uncertaintyHistory.slice(-10);
  
  // Check if innovations are decreasing
  const avgRecentInn = recentInnovations.reduce((a, b) => a + b, 0) / recentInnovations.length;
  const avgRecentUnc = recentUncertainties.reduce((a, b) => a + b, 0) / recentUncertainties.length;
  
  // Convergence criteria
  const innovationThreshold = 10; // Average innovation < 10
  const uncertaintyThreshold = 20; // Uncertainty < 20
  const stabilityThreshold = 5; // 5 consecutive stable updates
  
  if (avgRecentInn < innovationThreshold && avgRecentUnc < uncertaintyThreshold) {
    this.convergenceMetrics.stabilityCounter = (this.convergenceMetrics.stabilityCounter || 0) + 1;
    
    if (this.convergenceMetrics.stabilityCounter >= stabilityThreshold) {
      this.convergenceStatus = 'stable';
    } else {
      this.convergenceStatus = 'converged';
    }
  } else {
    this.convergenceMetrics.stabilityCounter = 0;
    this.convergenceStatus = 'converging';
  }
  
  return this;
};

/**
 * Adaptive parameter tuning
 * @returns {Object} This
 */
kalmanStateSchema.methods.adaptiveParameterTuning = async function() {
  if (this.recentMeasurements.length < 10) return this;
  
  const recentInnovations = this.recentMeasurements.slice(-10).map(m => Math.abs(m.innovation));
  const avgInnovation = recentInnovations.reduce((a, b) => a + b, 0) / recentInnovations.length;
  
  // Auto-tune Q (process noise)
  if (this.adaptive.autoTuneQ) {
    // If innovations are large, increase Q (more dynamic ability)
    // If innovations are small, decrease Q (stable ability)
    if (avgInnovation > 15) {
      this.Q = Math.min(this.adaptive.maxQ, this.Q * 1.1);
    } else if (avgInnovation < 5) {
      this.Q = Math.max(this.adaptive.minQ, this.Q * 0.9);
    }
  }
  
  // Auto-tune R (measurement noise)
  if (this.adaptive.autoTuneR) {
    const innovationStdDev = this.performance.innovationStdDev || 10;
    
    // If measurements are inconsistent, increase R (less trust in measurements)
    // If measurements are consistent, decrease R (more trust in measurements)
    if (innovationStdDev > 15) {
      this.R = Math.min(this.adaptive.maxR, this.R * 1.1);
    } else if (innovationStdDev < 5) {
      this.R = Math.max(this.adaptive.minR, this.R * 0.9);
    }
  }
  
  return this;
};

/**
 * Predict next performance
 * @returns {Object} Prediction
 */
kalmanStateSchema.methods.predict = function() {
  const x_pred = this.x;
  const P_pred = this.P + this.Q;
  
  return {
    predictedAbility: x_pred,
    predictedUncertainty: P_pred,
    confidenceInterval: {
      lower: Math.max(0, x_pred - 1.96 * Math.sqrt(P_pred)),
      upper: Math.min(100, x_pred + 1.96 * Math.sqrt(P_pred))
    }
  };
};

/**
 * Get competency estimates
 * @returns {Object} Competency estimates
 */
kalmanStateSchema.methods.getCompetencyEstimates = function() {
  const estimates = {};
  
  this.competencyStates.forEach((state, comp) => {
    estimates[comp] = {
      estimate: state.x,
      uncertainty: state.P,
      updates: state.updates,
      lastUpdate: state.lastUpdate
    };
  });
  
  return estimates;
};

/**
 * Reset state
 * @returns {Object} This
 */
kalmanStateSchema.methods.reset = async function() {
  this.x = 50;
  this.P = 100;
  this.totalUpdates = 0;
  this.successfulUpdates = 0;
  this.convergenceStatus = 'initializing';
  this.recentMeasurements = [];
  this.competencyStates = new Map();
  this.convergenceMetrics = {
    innovationHistory: [],
    uncertaintyHistory: [],
    estimateHistory: [],
    stabilityCounter: 0
  };
  
  return await this.save();
};

// ============================================================================
// VIRTUALS
// ============================================================================

kalmanStateSchema.virtual('isConverged').get(function() {
  return this.convergenceStatus === 'converged' || this.convergenceStatus === 'stable';
});

kalmanStateSchema.virtual('confidenceLevel').get(function() {
  // Confidence inversely proportional to uncertainty
  return Math.max(0, 100 - this.P);
});

kalmanStateSchema.virtual('estimateQuality').get(function() {
  if (this.totalUpdates < 5) return 'poor';
  if (this.P > 50) return 'poor';
  if (this.P > 30) return 'fair';
  if (this.P > 15) return 'good';
  return 'excellent';
});

// ============================================================================
// JSON TRANSFORMATION
// ============================================================================

kalmanStateSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.competencyStates) {
      ret.competencyStates = Object.fromEntries(ret.competencyStates);
    }
    delete ret.__v;
    return ret;
  }
});

const KalmanState = mongoose.model('KalmanState', kalmanStateSchema);

module.exports = KalmanState;