// models/MetaParameters.js
/**
 * META PARAMETERS MODEL - COMPLETE PRODUCTION VERSION
 * Store and manage meta-learning algorithm parameters for adaptive difficulty
 * 
 * @module models/MetaParameters
 */

const mongoose = require('mongoose');

const metaParametersSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    unique: true,
    default: 'current',
    index: true
  },
  
  studentId: {
    type: String,
    ref: 'Student',
    index: true
  },
  
  scope: {
    type: String,
    enum: ['global', 'student', 'class', 'school'],
    default: 'global',
    index: true
  },
  
  parameters: {
    // Answer scoring weights
    answerWeight: {
      type: Number,
      default: 0.70,
      min: 0,
      max: 1
    },
    reasoningWeight: {
      type: Number,
      default: 0.30,
      min: 0,
      max: 1
    },
    
    // Component importance weights
    formulaImportance: {
      type: Number,
      default: 0.30,
      min: 0,
      max: 1
    },
    calculationImportance: {
      type: Number,
      default: 0.25,
      min: 0,
      max: 1
    },
    explanationImportance: {
      type: Number,
      default: 0.25,
      min: 0,
      max: 1
    },
    unitsImportance: {
      type: Number,
      default: 0.20,
      min: 0,
      max: 1
    },
    
    // Difficulty adjustment parameters
    difficultyIncrementRate: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1
    },
    difficultyDecrementRate: {
      type: Number,
      default: 0.15,
      min: 0,
      max: 1
    },
    difficultyThreshold: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    },
    
    // Performance tracking
    targetAccuracy: {
      type: Number,
      default: 0.75,
      min: 0,
      max: 1
    },
    windowSize: {
      type: Number,
      default: 10,
      min: 1,
      max: 100
    },
    
    // Competency biases (Map of competency -> bias value)
    biases: {
      type: Map,
      of: Number,
      default: new Map()
    },
    
    // Simulation type preferences
    simulationWeights: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  
  learningRate: {
    type: Number,
    default: 0.05,
    min: 0.001,
    max: 0.5
  },
  
  adaptationRate: {
    type: Number,
    default: 0.1,
    min: 0.01,
    max: 1.0
  },
  
  // Statistics
  totalCorrections: {
    type: Number,
    default: 0
  },
  
  totalUpdates: {
    type: Number,
    default: 0
  },
  
  successfulAdaptations: {
    type: Number,
    default: 0
  },
  
  averageError: {
    type: Number,
    default: 0
  },
  
  performanceMetrics: {
    accuracy: {
      type: Number,
      default: 0
    },
    precision: {
      type: Number,
      default: 0
    },
    recall: {
      type: Number,
      default: 0
    },
    f1Score: {
      type: Number,
      default: 0
    }
  },

  //

  // ADD TO SCHEMA
  pidConfig: {
    Kp: { type: Number, default: 0.5 },
    Ki: { type: Number, default: 0.1 },
    Kd: { type: Number, default: 0.2 },
    setpoint: { type: Number, default: 70 }
  },

  pidState: {
    integral: Number,
    lastError: Number,
    lastOutput: Number,
    lastTime: Date
  },

  pidLastUpdated: Date,

  pidUpdateHistory: [{
    performance: Number,
    adjustment: Number,
    error: Number,
    timestamp: Date
  }],
  // ADD TO SCHEMA
  irtAbility: {
    type: Number,
    default: 0
  },

  irtStandardError: {
    type: Number,
    default: 2.0
  },

  irtSampleSize: {
    type: Number,
    default: 0
  },

  irtLastUpdated: Date,

  irtHistory: [{
    ability: Number,
    standardError: Number,
    sampleSize: Number,
    timestamp: Date
  }],
  // ADD TO SCHEMA
  attentionConfig: {
    temperature: Number,
    queryWeights: Object
  },

  attentionMemory: [{
    simulation_type: String,
    difficulty: String,
    competency: [String],
    time_of_day: Number,
    session_length: Number,
    recent_performance: Number
  }],

  attentionHistory: [{
    timestamp: Date,
    query: Object,
    selectedChallenge: mongoose.Schema.Types.ObjectId,
    weights: [Number],
    topK: [Object],
    confidence: Number
  }],
  
  // History tracking
  updateHistory: [{
    timestamp: Date,
    parameterChanged: String,
    oldValue: Number,
    newValue: Number,
    reason: String
  }],
  
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
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

metaParametersSchema.index({ version: 1 }, { unique: true });
metaParametersSchema.index({ studentId: 1, scope: 1 });
metaParametersSchema.index({ scope: 1, active: 1 });
metaParametersSchema.index({ lastUpdated: -1 });

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get current global parameters
 * @returns {Object} Current parameters
 */
metaParametersSchema.statics.getCurrent = async function() {
  let params = await this.findOne({ version: 'current', scope: 'global', active: true });
  
  if (!params) {
    params = await this.create({ 
      version: 'current',
      scope: 'global'
    });
  }
  
  return params;
};

/**
 * Get student-specific parameters
 * @param {String} studentId - Student ID
 * @returns {Object} Student parameters or global
 */
metaParametersSchema.statics.getForStudent = async function(studentId) {
  let params = await this.findOne({ 
    studentId,
    scope: 'student',
    active: true
  });
  
  if (!params) {
    // Create from global defaults
    const globalParams = await this.getCurrent();
    params = await this.create({
      version: `student-${studentId}`,
      studentId,
      scope: 'student',
      parameters: globalParams.parameters,
      learningRate: globalParams.learningRate
    });
  }
  
  return params;
};

/**
 * Update parameters
 * @param {Object} updates - Parameter updates
 * @param {String} studentId - Student ID (optional)
 * @returns {Object} Updated parameters
 */
metaParametersSchema.statics.updateParameters = async function(updates, studentId = null) {
  const params = studentId 
    ? await this.getForStudent(studentId)
    : await this.getCurrent();
  
  Object.keys(updates).forEach(key => {
    if (params.parameters[key] !== undefined) {
      const oldValue = params.parameters[key];
      params.parameters[key] = updates[key];
      
      // Track update history
      params.updateHistory.push({
        timestamp: new Date(),
        parameterChanged: key,
        oldValue,
        newValue: updates[key],
        reason: 'manual_update'
      });
    }
  });
  
  params.totalUpdates++;
  params.lastUpdated = new Date();
  
  return await params.save();
};

/**
 * Record correction and adapt
 * @param {Number} error - Error value
 * @param {String} studentId - Student ID (optional)
 * @returns {Object} Updated parameters
 */
metaParametersSchema.statics.recordCorrection = async function(error, studentId = null) {
  const params = studentId 
    ? await this.getForStudent(studentId)
    : await this.getCurrent();
  
  // Running average with exponential moving average
  const alpha = params.learningRate;
  params.averageError = (params.averageError * (1 - alpha)) + (Math.abs(error) * alpha);
  params.totalCorrections++;
  
  // Adapt parameters based on error
  if (Math.abs(error) > 0.2) {
    // Significant error - adjust weights
    await params.adaptWeights(error);
  }
  
  return await params.save();
};

/**
 * Update difficulty parameters
 * @param {Number} performance - Current performance (0-1)
 * @param {String} studentId - Student ID (optional)
 * @returns {Object} Updated parameters
 */
metaParametersSchema.statics.updateDifficultyParams = async function(performance, studentId = null) {
  const params = studentId 
    ? await this.getForStudent(studentId)
    : await this.getCurrent();
  
  const target = params.parameters.targetAccuracy;
  const diff = performance - target;
  
  // Adapt difficulty adjustment rates
  if (diff > 0.1) {
    // Performing well - can increase difficulty faster
    params.parameters.difficultyIncrementRate = Math.min(
      0.2,
      params.parameters.difficultyIncrementRate + 0.01
    );
  } else if (diff < -0.1) {
    // Struggling - decrease difficulty faster
    params.parameters.difficultyDecrementRate = Math.min(
      0.3,
      params.parameters.difficultyDecrementRate + 0.01
    );
  }
  
  params.successfulAdaptations++;
  params.totalUpdates++;
  params.lastUpdated = new Date();
  
  return await params.save();
};

/**
 * Get all active parameters
 * @param {String} scope - Scope filter (optional)
 * @returns {Array} Active parameters
 */
metaParametersSchema.statics.getAllActive = async function(scope = null) {
  const query = { active: true };
  if (scope) query.scope = scope;
  
  return await this.find(query).sort({ lastUpdated: -1 });
};

/**
 * Reset to defaults
 * @param {String} studentId - Student ID (optional)
 * @returns {Object} Reset parameters
 */
metaParametersSchema.statics.resetToDefaults = async function(studentId = null) {
  const params = studentId 
    ? await this.getForStudent(studentId)
    : await this.getCurrent();
  
  // Reset to default values
  params.parameters = {
    answerWeight: 0.70,
    reasoningWeight: 0.30,
    formulaImportance: 0.30,
    calculationImportance: 0.25,
    explanationImportance: 0.25,
    unitsImportance: 0.20,
    difficultyIncrementRate: 0.1,
    difficultyDecrementRate: 0.15,
    difficultyThreshold: 0.7,
    targetAccuracy: 0.75,
    windowSize: 10,
    biases: new Map(),
    simulationWeights: new Map()
  };
  
  params.learningRate = 0.05;
  params.adaptationRate = 0.1;
  params.updateHistory = [];
  params.lastUpdated = new Date();
  
  return await params.save();
};

/**
 * Calculate performance metrics
 * @param {Array} predictions - Array of predictions
 * @param {Array} actuals - Array of actual values
 * @param {String} studentId - Student ID (optional)
 * @returns {Object} Updated parameters with metrics
 */
metaParametersSchema.statics.calculateMetrics = async function(predictions, actuals, studentId = null) {
  const params = studentId 
    ? await this.getForStudent(studentId)
    : await this.getCurrent();
  
  if (predictions.length !== actuals.length || predictions.length === 0) {
    return params;
  }
  
  let correct = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] === actuals[i]) {
      correct++;
      if (predictions[i] === 1) truePositives++;
    } else {
      if (predictions[i] === 1) falsePositives++;
      else falseNegatives++;
    }
  }
  
  const accuracy = correct / predictions.length;
  const precision = truePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  const recall = truePositives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  
  params.performanceMetrics = { accuracy, precision, recall, f1Score };
  params.lastUpdated = new Date();
  
  return await params.save();
};

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Adapt weights based on error
 * @param {Number} error - Error value
 * @returns {Object} This
 */
metaParametersSchema.methods.adaptWeights = async function(error) {
  const rate = this.adaptationRate;
  
  // Adjust answer vs reasoning weight
  if (error < 0) {
    // Student scored lower than expected - increase answer weight
    this.parameters.answerWeight = Math.min(1, this.parameters.answerWeight + rate * 0.1);
    this.parameters.reasoningWeight = 1 - this.parameters.answerWeight;
  } else {
    // Student scored higher - can focus more on reasoning
    this.parameters.reasoningWeight = Math.min(0.5, this.parameters.reasoningWeight + rate * 0.05);
    this.parameters.answerWeight = 1 - this.parameters.reasoningWeight;
  }
  
  this.updateHistory.push({
    timestamp: new Date(),
    parameterChanged: 'weights',
    oldValue: null,
    newValue: null,
    reason: `error_adaptation: ${error.toFixed(3)}`
  });
  
  this.successfulAdaptations++;
  
  return this;
};

/**
 * Update bias for competency
 * @param {String} competency - Competency name
 * @param {Number} bias - Bias value
 * @returns {Object} This
 */
metaParametersSchema.methods.updateBias = async function(competency, bias) {
  const oldBias = this.parameters.biases.get(competency) || 0;
  this.parameters.biases.set(competency, bias);
  
  this.updateHistory.push({
    timestamp: new Date(),
    parameterChanged: `bias_${competency}`,
    oldValue: oldBias,
    newValue: bias,
    reason: 'competency_bias_update'
  });
  
  this.totalUpdates++;
  this.lastUpdated = new Date();
  
  return await this.save();
};

/**
 * Get effective weight for parameter
 * @param {String} param - Parameter name
 * @returns {Number} Effective weight
 */
metaParametersSchema.methods.getEffectiveWeight = function(param) {
  return this.parameters[param] || 0;
};

/**
 * Check if parameters need recalibration
 * @returns {Boolean}
 */
metaParametersSchema.methods.needsRecalibration = function() {
  // Needs recalibration if:
  // 1. Error is too high
  // 2. Not updated recently
  // 3. Performance metrics are poor
  
  const errorThreshold = 0.3;
  const daysSinceUpdate = (Date.now() - this.lastUpdated) / (1000 * 60 * 60 * 24);
  const accuracyThreshold = 0.5;
  
  return this.averageError > errorThreshold ||
         daysSinceUpdate > 30 ||
         (this.performanceMetrics?.accuracy || 1) < accuracyThreshold;
};

/**
 * Export parameters
 * @returns {Object} Exportable parameters
 */
metaParametersSchema.methods.exportParameters = function() {
  return {
    version: this.version,
    scope: this.scope,
    parameters: {
      ...this.parameters,
      biases: Object.fromEntries(this.parameters.biases || new Map()),
      simulationWeights: Object.fromEntries(this.parameters.simulationWeights || new Map())
    },
    learningRate: this.learningRate,
    adaptationRate: this.adaptationRate,
    performanceMetrics: this.performanceMetrics
  };
};

// ============================================================================
// VIRTUALS
// ============================================================================

metaParametersSchema.virtual('isGlobal').get(function() {
  return this.scope === 'global';
});

metaParametersSchema.virtual('isStudentSpecific').get(function() {
  return this.scope === 'student' && !!this.studentId;
});

metaParametersSchema.virtual('updateFrequency').get(function() {
  if (this.totalUpdates === 0) return 0;
  const ageInDays = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  return this.totalUpdates / Math.max(1, ageInDays);
});

metaParametersSchema.virtual('adaptationSuccess').get(function() {
  if (this.totalUpdates === 0) return 0;
  return this.successfulAdaptations / this.totalUpdates;
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

metaParametersSchema.pre('save', function () {
  // Ensure weights sum to 1
  const answerWeight = this.parameters.answerWeight || 0.7;
  const reasoningWeight = 1 - answerWeight;

  this.parameters.answerWeight = answerWeight;
  this.parameters.reasoningWeight = reasoningWeight;

  // Ensure component importances sum to ~1
  const total =
    (this.parameters.formulaImportance || 0) +
    (this.parameters.calculationImportance || 0) +
    (this.parameters.explanationImportance || 0) +
    (this.parameters.unitsImportance || 0);

  if (total > 0 && Math.abs(total - 1.0) > 0.01) {
    // Normalize
    const factor = 1.0 / total;

    this.parameters.formulaImportance *= factor;
    this.parameters.calculationImportance *= factor;
    this.parameters.explanationImportance *= factor;
    this.parameters.unitsImportance *= factor;
  }
});


// ============================================================================
// JSON TRANSFORMATION
// ============================================================================

metaParametersSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.parameters?.biases) {
      ret.parameters.biases = Object.fromEntries(ret.parameters.biases);
    }
    if (ret.parameters?.simulationWeights) {
      ret.parameters.simulationWeights = Object.fromEntries(ret.parameters.simulationWeights);
    }
    delete ret.__v;
    return ret;
  }
});

const MetaParameters = mongoose.model('MetaParameters', metaParametersSchema);

module.exports = MetaParameters;