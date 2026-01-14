// algorithms/kalman.filter.js
/**
 * KALMAN FILTER - COMPLETE PRODUCTION VERSION
 * Adaptive learning algorithm for score adjustment
 * 
 * @module algorithms/kalman.filter
 */

const { KalmanState } = require('../models');

// ============================================================================
// KALMAN FILTER CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  // Process noise covariance (how much we expect true skill to change)
  processNoise: 0.01,
  
  // Measurement noise covariance (how noisy are our measurements)
  measurementNoise: 25.0,
  
  // Initial state estimate (initial skill level)
  initialEstimate: 50.0,
  
  // Initial error covariance (uncertainty in initial estimate)
  initialErrorCovariance: 100.0,
  
  // Learning rate decay (how quickly to reduce adjustment magnitude)
  learningRateDecay: 0.95,
  
  // Minimum learning rate
  minLearningRate: 0.1,
  
  // Maximum adjustment per update
  maxAdjustment: 20.0
};

// ============================================================================
// KALMAN FILTER CLASS
// ============================================================================

class KalmanFilter {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // State variables
    this.estimate = this.config.initialEstimate;
    this.errorCovariance = this.config.initialErrorCovariance;
    this.processNoise = this.config.processNoise;
    this.measurementNoise = this.config.measurementNoise;
    
    // Tracking
    this.updateCount = 0;
    this.history = [];
  }
  
  /**
   * Predict step - predict next state
   * @returns {Object} Predicted state
   */
  predict() {
    // State prediction (assumes no change in skill)
    const predictedEstimate = this.estimate;
    
    // Error covariance prediction
    const predictedErrorCovariance = this.errorCovariance + this.processNoise;
    
    return {
      estimate: predictedEstimate,
      errorCovariance: predictedErrorCovariance
    };
  }
  
  /**
   * Update step - update estimate with new measurement
   * @param {Number} measurement - New measurement (raw score)
   * @returns {Object} Updated state
   */
  update(measurement) {
    // Predict
    const predicted = this.predict();
    
    // Calculate Kalman gain
    const kalmanGain = predicted.errorCovariance / 
                      (predicted.errorCovariance + this.measurementNoise);
    
    // Update estimate
    const innovation = measurement - predicted.estimate;
    const newEstimate = predicted.estimate + (kalmanGain * innovation);
    
    // Update error covariance
    const newErrorCovariance = (1 - kalmanGain) * predicted.errorCovariance;
    
    // Apply learning rate decay
    const learningRate = Math.max(
      this.config.minLearningRate,
      Math.pow(this.config.learningRateDecay, this.updateCount)
    );
    
    // Calculate adjustment (with decay)
    let adjustment = (newEstimate - this.estimate) * learningRate;
    
    // Limit maximum adjustment
    adjustment = Math.max(
      -this.config.maxAdjustment,
      Math.min(this.config.maxAdjustment, adjustment)
    );
    
    // Update state
    this.estimate = this.estimate + adjustment;
    this.errorCovariance = newErrorCovariance;
    this.updateCount++;
    
    // Record history
    this.history.push({
      measurement,
      estimate: this.estimate,
      errorCovariance: this.errorCovariance,
      kalmanGain,
      innovation,
      adjustment,
      timestamp: new Date()
    });
    
    return {
      estimate: this.estimate,
      errorCovariance: this.errorCovariance,
      kalmanGain,
      innovation,
      adjustment,
      confidence: this.getConfidence()
    };
  }
  
  /**
   * Get current estimate
   * @returns {Number} Current estimate
   */
  getEstimate() {
    return this.estimate;
  }
  
  /**
   * Get confidence in current estimate
   * @returns {Number} Confidence (0-1)
   */
  getConfidence() {
    // Lower error covariance = higher confidence
    // Map error covariance [0, 100] to confidence [1, 0]
    const confidence = Math.max(0, Math.min(1, 1 - (this.errorCovariance / 100)));
    return confidence;
  }
  
  /**
   * Get uncertainty
   * @returns {Number} Uncertainty (standard deviation)
   */
  getUncertainty() {
    return Math.sqrt(this.errorCovariance);
  }
  
  /**
   * Reset filter
   */
  reset() {
    this.estimate = this.config.initialEstimate;
    this.errorCovariance = this.config.initialErrorCovariance;
    this.updateCount = 0;
    this.history = [];
  }
  
  /**
   * Get state snapshot
   * @returns {Object} State snapshot
   */
  getState() {
    return {
      estimate: this.estimate,
      errorCovariance: this.errorCovariance,
      uncertainty: this.getUncertainty(),
      confidence: this.getConfidence(),
      updateCount: this.updateCount,
      processNoise: this.processNoise,
      measurementNoise: this.measurementNoise
    };
  }
  
  /**
   * Restore state from snapshot
   * @param {Object} state - State snapshot
   */
  setState(state) {
    this.estimate = state.estimate;
    this.errorCovariance = state.errorCovariance;
    this.updateCount = state.updateCount || 0;
    this.processNoise = state.processNoise || this.config.processNoise;
    this.measurementNoise = state.measurementNoise || this.config.measurementNoise;
  }
}

// ============================================================================
// STUDENT KALMAN FILTER MANAGEMENT
// ============================================================================

/**
 * Get or create Kalman filter for student
 * @param {String} studentId - Student ID
 * @returns {Promise<KalmanFilter>}
 */
const getStudentKalmanFilter = async (studentId) => {
  let kalmanState = await KalmanState.findOne({ studentId });
  
  if (!kalmanState) {
    // Create new Kalman state
    kalmanState = await KalmanState.create({
      studentId,
      estimate: DEFAULT_CONFIG.initialEstimate,
      errorCovariance: DEFAULT_CONFIG.initialErrorCovariance,
      updateCount: 0,
      processNoise: DEFAULT_CONFIG.processNoise,
      measurementNoise: DEFAULT_CONFIG.measurementNoise
    });
  }
  
  // Create filter and restore state
  const filter = new KalmanFilter();
  filter.setState({
    estimate: kalmanState.estimate,
    errorCovariance: kalmanState.errorCovariance,
    updateCount: kalmanState.updateCount,
    processNoise: kalmanState.processNoise,
    measurementNoise: kalmanState.measurementNoise
  });
  
  return filter;
};

/**
 * Save Kalman filter state for student
 * @param {String} studentId - Student ID
 * @param {KalmanFilter} filter - Kalman filter
 * @returns {Promise}
 */
const saveStudentKalmanFilter = async (studentId, filter) => {
  const state = filter.getState();
  
  await KalmanState.findOneAndUpdate(
    { studentId },
    {
      estimate: state.estimate,
      errorCovariance: state.errorCovariance,
      updateCount: state.updateCount,
      processNoise: state.processNoise,
      measurementNoise: state.measurementNoise,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
};

/**
 * Adjust score using Kalman filter
 * @param {String} studentId - Student ID
 * @param {Number} rawScore - Raw score
 * @param {Object} options - Options
 * @returns {Promise<Object>} Adjusted score data
 */
const adjustScore = async (studentId, rawScore, options = {}) => {
  const {
    difficulty = 'medium',
    simulationType,
    previousAttempts = 0
  } = options;
  
  // Get or create filter
  const filter = await getStudentKalmanFilter(studentId);
  
  // Adjust measurement noise based on difficulty
  const difficultyMultipliers = {
    easy: 1.2,      // More noise for easy (less informative)
    medium: 1.0,
    hard: 0.8,      // Less noise for hard (more informative)
    expert: 0.6
  };
  
  const multiplier = difficultyMultipliers[difficulty] || 1.0;
  filter.measurementNoise = DEFAULT_CONFIG.measurementNoise * multiplier;
  
  // Update filter with new measurement
  const result = filter.update(rawScore);
  
  // Calculate adjusted score
  const adjustedScore = Math.max(0, Math.min(100, result.estimate));
  
  // Save filter state
  await saveStudentKalmanFilter(studentId, filter);
  
  return {
    rawScore,
    adjustedScore: Math.round(adjustedScore * 100) / 100,
    adjustment: Math.round((adjustedScore - rawScore) * 100) / 100,
    kalmanGain: Math.round(result.kalmanGain * 1000) / 1000,
    confidence: Math.round(result.confidence * 100) / 100,
    uncertainty: Math.round(filter.getUncertainty() * 100) / 100,
    updateCount: filter.updateCount,
    metadata: {
      difficulty,
      simulationType,
      previousAttempts,
      innovation: Math.round(result.innovation * 100) / 100
    }
  };
};

/**
 * Batch adjust scores
 * @param {String} studentId - Student ID
 * @param {Array} scores - Array of {rawScore, difficulty, simulationType}
 * @returns {Promise<Array>} Array of adjusted scores
 */
const batchAdjustScores = async (studentId, scores) => {
  const filter = await getStudentKalmanFilter(studentId);
  const results = [];
  
  for (const scoreData of scores) {
    const result = filter.update(scoreData.rawScore);
    
    results.push({
      rawScore: scoreData.rawScore,
      adjustedScore: Math.round(result.estimate * 100) / 100,
      adjustment: Math.round((result.estimate - scoreData.rawScore) * 100) / 100,
      kalmanGain: Math.round(result.kalmanGain * 1000) / 1000,
      confidence: Math.round(result.confidence * 100) / 100
    });
  }
  
  await saveStudentKalmanFilter(studentId, filter);
  
  return results;
};

/**
 * Reset Kalman filter for student
 * @param {String} studentId - Student ID
 * @returns {Promise}
 */
const resetStudentKalmanFilter = async (studentId) => {
  const filter = new KalmanFilter();
  filter.reset();
  
  await saveStudentKalmanFilter(studentId, filter);
  
  return filter.getState();
};

/**
 * Get Kalman filter statistics
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getKalmanStatistics = async (studentId) => {
  const kalmanState = await KalmanState.findOne({ studentId });
  
  if (!kalmanState) {
    return {
      initialized: false,
      message: 'No Kalman filter data found'
    };
  }
  
  const filter = new KalmanFilter();
  filter.setState({
    estimate: kalmanState.estimate,
    errorCovariance: kalmanState.errorCovariance,
    updateCount: kalmanState.updateCount,
    processNoise: kalmanState.processNoise,
    measurementNoise: kalmanState.measurementNoise
  });
  
  return {
    initialized: true,
    currentEstimate: Math.round(filter.estimate * 100) / 100,
    uncertainty: Math.round(filter.getUncertainty() * 100) / 100,
    confidence: Math.round(filter.getConfidence() * 100) / 100,
    updateCount: filter.updateCount,
    processNoise: filter.processNoise,
    measurementNoise: filter.measurementNoise,
    lastUpdated: kalmanState.lastUpdated
  };
};

/**
 * Tune Kalman filter parameters
 * @param {String} studentId - Student ID
 * @param {Object} parameters - New parameters
 * @returns {Promise<Object>}
 */
const tuneKalmanFilter = async (studentId, parameters) => {
  const filter = await getStudentKalmanFilter(studentId);
  
  if (parameters.processNoise !== undefined) {
    filter.processNoise = parameters.processNoise;
  }
  
  if (parameters.measurementNoise !== undefined) {
    filter.measurementNoise = parameters.measurementNoise;
  }
  
  await saveStudentKalmanFilter(studentId, filter);
  
  return filter.getState();
};

/**
 * Compare raw vs adjusted scores
 * @param {String} studentId - Student ID
 * @param {Array} scores - Array of raw scores
 * @returns {Promise<Object>} Comparison data
 */
const compareAdjustedScores = async (studentId, scores) => {
  const filter = await getStudentKalmanFilter(studentId);
  
  const rawAverage = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  
  const adjustedScores = scores.map(score => {
    const result = filter.update(score);
    return result.estimate;
  });
  
  const adjustedAverage = adjustedScores.reduce((sum, s) => sum + s, 0) / adjustedScores.length;
  
  return {
    raw: {
      scores,
      average: Math.round(rawAverage * 100) / 100,
      min: Math.min(...scores),
      max: Math.max(...scores)
    },
    adjusted: {
      scores: adjustedScores.map(s => Math.round(s * 100) / 100),
      average: Math.round(adjustedAverage * 100) / 100,
      min: Math.round(Math.min(...adjustedScores) * 100) / 100,
      max: Math.round(Math.max(...adjustedScores) * 100) / 100
    },
    difference: Math.round((adjustedAverage - rawAverage) * 100) / 100,
    improvement: Math.round(((adjustedAverage - rawAverage) / rawAverage) * 10000) / 100
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Class
  KalmanFilter,
  
  // Student management
  getStudentKalmanFilter,
  saveStudentKalmanFilter,
  resetStudentKalmanFilter,
  
  // Score adjustment
  adjustScore,
  batchAdjustScores,
  
  // Statistics
  getKalmanStatistics,
  compareAdjustedScores,
  
  // Tuning
  tuneKalmanFilter,
  
  // Configuration
  DEFAULT_CONFIG
};