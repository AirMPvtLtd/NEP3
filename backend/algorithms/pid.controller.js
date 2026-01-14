// algorithms/pid.controller.js
/**
 * PID CONTROLLER - COMPLETE PRODUCTION VERSION
 * Proportional-Integral-Derivative controller for adaptive difficulty
 * 
 * @module algorithms/pid.controller
 */

const { MetaParameters } = require('../models');

// ============================================================================
// PID CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  // PID gains
  Kp: 0.5,  // Proportional gain
  Ki: 0.1,  // Integral gain
  Kd: 0.2,  // Derivative gain
  
  // Target setpoint (desired performance level)
  setpoint: 70.0,
  
  // Output limits
  minOutput: 0.5,   // Minimum difficulty multiplier
  maxOutput: 2.0,   // Maximum difficulty multiplier
  
  // Integral windup prevention
  integralMin: -10.0,
  integralMax: 10.0,
  
  // Derivative filter
  derivativeFilterAlpha: 0.3,
  
  // Sampling time (in challenges)
  samplingTime: 1,
  
  // Dead zone (tolerance around setpoint)
  deadZone: 5.0
};

const DIFFICULTY_LEVELS = {
  VERY_EASY: { name: 'very_easy', multiplier: 0.5 },
  EASY: { name: 'easy', multiplier: 0.8 },
  MEDIUM: { name: 'medium', multiplier: 1.0 },
  HARD: { name: 'hard', multiplier: 1.3 },
  VERY_HARD: { name: 'very_hard', multiplier: 1.6 },
  EXPERT: { name: 'expert', multiplier: 2.0 }
};

// ============================================================================
// PID CONTROLLER CLASS
// ============================================================================

class PIDController {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // PID gains
    this.Kp = this.config.Kp;
    this.Ki = this.config.Ki;
    this.Kd = this.config.Kd;
    
    // Setpoint
    this.setpoint = this.config.setpoint;
    
    // State variables
    this.integral = 0;
    this.previousError = 0;
    this.previousDerivative = 0;
    this.previousMeasurement = null;
    
    // Output
    this.output = 1.0;
    
    // Tracking
    this.updateCount = 0;
    this.history = [];
  }
  
  /**
   * Compute PID output
   * @param {Number} measurement - Current measurement (score)
   * @param {Number} dt - Time delta (default: 1)
   * @returns {Object} PID output
   */
  compute(measurement, dt = 1) {
    // Calculate error
    const error = this.setpoint - measurement;
    
    // Dead zone check
    if (Math.abs(error) < this.config.deadZone) {
      return {
        output: this.output,
        error: 0,
        proportional: 0,
        integral: this.integral,
        derivative: 0,
        inDeadZone: true
      };
    }
    
    // Proportional term
    const proportional = this.Kp * error;
    
    // Integral term with anti-windup
    this.integral += error * dt;
    this.integral = Math.max(
      this.config.integralMin,
      Math.min(this.config.integralMax, this.integral)
    );
    const integralTerm = this.Ki * this.integral;
    
    // Derivative term with filtering
    let derivative = 0;
    if (this.previousMeasurement !== null) {
      const rawDerivative = (measurement - this.previousMeasurement) / dt;
      derivative = this.config.derivativeFilterAlpha * rawDerivative +
                   (1 - this.config.derivativeFilterAlpha) * this.previousDerivative;
    }
    const derivativeTerm = -this.Kd * derivative; // Negative for derivative on measurement
    
    // Compute output
    let output = proportional + integralTerm + derivativeTerm;
    
    // Convert to difficulty multiplier (centered around 1.0)
    output = 1.0 + (output / 100);
    
    // Clamp output
    output = Math.max(
      this.config.minOutput,
      Math.min(this.config.maxOutput, output)
    );
    
    // Update state
    this.output = output;
    this.previousError = error;
    this.previousDerivative = derivative;
    this.previousMeasurement = measurement;
    this.updateCount++;
    
    // Record history
    this.history.push({
      measurement,
      error,
      proportional,
      integral: this.integral,
      derivative,
      output,
      timestamp: new Date()
    });
    
    return {
      output,
      error,
      proportional,
      integral: integralTerm,
      derivative: derivativeTerm,
      inDeadZone: false
    };
  }
  
  /**
   * Get recommended difficulty
   * @param {Number} currentScore - Current score
   * @returns {Object} Recommended difficulty
   */
  getRecommendedDifficulty(currentScore) {
    const result = this.compute(currentScore);
    const multiplier = result.output;
    
    // Map multiplier to difficulty level
    let difficulty = DIFFICULTY_LEVELS.MEDIUM;
    let minDiff = Infinity;
    
    Object.values(DIFFICULTY_LEVELS).forEach(level => {
      const diff = Math.abs(level.multiplier - multiplier);
      if (diff < minDiff) {
        minDiff = diff;
        difficulty = level;
      }
    });
    
    return {
      difficulty: difficulty.name,
      multiplier: difficulty.multiplier,
      pidOutput: multiplier,
      error: result.error,
      reason: this.getAdjustmentReason(result.error, currentScore)
    };
  }
  
  /**
   * Get adjustment reason
   * @param {Number} error - PID error
   * @param {Number} currentScore - Current score
   * @returns {String} Reason
   */
  getAdjustmentReason(error, currentScore) {
    if (Math.abs(error) < this.config.deadZone) {
      return 'Performance is optimal, maintaining current difficulty';
    }
    
    if (error > 20) {
      return 'Significantly below target, reducing difficulty to build confidence';
    } else if (error > 10) {
      return 'Below target, slightly reducing difficulty';
    } else if (error > 0) {
      return 'Slightly below target, minor difficulty adjustment';
    } else if (error > -10) {
      return 'Slightly above target, minor difficulty increase';
    } else if (error > -20) {
      return 'Above target, increasing difficulty for challenge';
    } else {
      return 'Significantly above target, increasing difficulty substantially';
    }
  }
  
  /**
   * Reset controller
   */
  reset() {
    this.integral = 0;
    this.previousError = 0;
    this.previousDerivative = 0;
    this.previousMeasurement = null;
    this.output = 1.0;
    this.updateCount = 0;
    this.history = [];
  }
  
  /**
   * Get controller state
   * @returns {Object} State
   */
  getState() {
    return {
      Kp: this.Kp,
      Ki: this.Ki,
      Kd: this.Kd,
      setpoint: this.setpoint,
      integral: this.integral,
      previousError: this.previousError,
      previousDerivative: this.previousDerivative,
      previousMeasurement: this.previousMeasurement,
      output: this.output,
      updateCount: this.updateCount
    };
  }
  
  /**
   * Set controller state
   * @param {Object} state - State
   */
  setState(state) {
    this.Kp = state.Kp || this.config.Kp;
    this.Ki = state.Ki || this.config.Ki;
    this.Kd = state.Kd || this.config.Kd;
    this.setpoint = state.setpoint || this.config.setpoint;
    this.integral = state.integral || 0;
    this.previousError = state.previousError || 0;
    this.previousDerivative = state.previousDerivative || 0;
    this.previousMeasurement = state.previousMeasurement || null;
    this.output = state.output || 1.0;
    this.updateCount = state.updateCount || 0;
  }
  
  /**
   * Tune PID gains
   * @param {Object} gains - New gains {Kp, Ki, Kd}
   */
  tune(gains) {
    if (gains.Kp !== undefined) this.Kp = gains.Kp;
    if (gains.Ki !== undefined) this.Ki = gains.Ki;
    if (gains.Kd !== undefined) this.Kd = gains.Kd;
  }
  
  /**
   * Set setpoint
   * @param {Number} setpoint - New setpoint
   */
  setSetpoint(setpoint) {
    this.setpoint = setpoint;
  }
  
  /**
   * Get performance metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    if (this.history.length === 0) {
      return null;
    }
    
    const recentHistory = this.history.slice(-10);
    const errors = recentHistory.map(h => Math.abs(h.error));
    const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
    const maxError = Math.max(...errors);
    
    return {
      averageError: Math.round(avgError * 100) / 100,
      maxError: Math.round(maxError * 100) / 100,
      stability: this.calculateStability(),
      convergence: this.calculateConvergence()
    };
  }
  
  /**
   * Calculate stability
   * @returns {Number} Stability (0-1)
   */
  calculateStability() {
    if (this.history.length < 5) return 0;
    
    const recentOutputs = this.history.slice(-5).map(h => h.output);
    const variance = this.calculateVariance(recentOutputs);
    
    // Lower variance = higher stability
    const stability = Math.max(0, 1 - (variance / 0.5));
    return Math.round(stability * 100) / 100;
  }
  
  /**
   * Calculate convergence
   * @returns {Number} Convergence (0-1)
   */
  calculateConvergence() {
    if (this.history.length < 5) return 0;
    
    const recentErrors = this.history.slice(-5).map(h => Math.abs(h.error));
    const avgError = recentErrors.reduce((sum, e) => sum + e, 0) / recentErrors.length;
    
    // Lower error = higher convergence
    const convergence = Math.max(0, 1 - (avgError / 50));
    return Math.round(convergence * 100) / 100;
  }
  
  /**
   * Calculate variance
   * @param {Array} values - Values
   * @returns {Number} Variance
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  }
}

// ============================================================================
// STUDENT PID MANAGEMENT
// ============================================================================

/**
 * Get or create PID controller for student
 * @param {String} studentId - Student ID
 * @returns {Promise<PIDController>}
 */
const getStudentPIDController = async (studentId) => {
  let metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams) {
    metaParams = await MetaParameters.create({
      studentId,
      pidGains: {
        Kp: DEFAULT_CONFIG.Kp,
        Ki: DEFAULT_CONFIG.Ki,
        Kd: DEFAULT_CONFIG.Kd
      },
      pidSetpoint: DEFAULT_CONFIG.setpoint,
      pidIntegral: 0,
      pidPreviousError: 0,
      pidOutput: 1.0
    });
  }
  
  const controller = new PIDController();
  controller.setState({
    Kp: metaParams.pidGains.Kp,
    Ki: metaParams.pidGains.Ki,
    Kd: metaParams.pidGains.Kd,
    setpoint: metaParams.pidSetpoint,
    integral: metaParams.pidIntegral,
    previousError: metaParams.pidPreviousError,
    output: metaParams.pidOutput
  });
  
  return controller;
};

/**
 * Save PID controller state
 * @param {String} studentId - Student ID
 * @param {PIDController} controller - PID controller
 * @returns {Promise}
 */
const saveStudentPIDController = async (studentId, controller) => {
  const state = controller.getState();
  
  await MetaParameters.findOneAndUpdate(
    { studentId },
    {
      pidGains: {
        Kp: state.Kp,
        Ki: state.Ki,
        Kd: state.Kd
      },
      pidSetpoint: state.setpoint,
      pidIntegral: state.integral,
      pidPreviousError: state.previousError,
      pidOutput: state.output,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
};

/**
 * Adjust difficulty using PID
 * @param {String} studentId - Student ID
 * @param {Number} currentScore - Current score
 * @returns {Promise<Object>}
 */
const adjustDifficulty = async (studentId, currentScore) => {
  const controller = await getStudentPIDController(studentId);
  const result = controller.compute(currentScore);
  const recommendation = controller.getRecommendedDifficulty(currentScore);
  
  await saveStudentPIDController(studentId, controller);
  
  return {
    currentScore,
    targetScore: controller.setpoint,
    error: Math.round(result.error * 100) / 100,
    pidOutput: Math.round(result.output * 1000) / 1000,
    recommendedDifficulty: recommendation.difficulty,
    difficultyMultiplier: recommendation.multiplier,
    reason: recommendation.reason,
    components: {
      proportional: Math.round(result.proportional * 1000) / 1000,
      integral: Math.round(result.integral * 1000) / 1000,
      derivative: Math.round(result.derivative * 1000) / 1000
    },
    inDeadZone: result.inDeadZone
  };
};

/**
 * Batch adjust difficulty
 * @param {String} studentId - Student ID
 * @param {Array} scores - Array of scores
 * @returns {Promise<Array>}
 */
const batchAdjustDifficulty = async (studentId, scores) => {
  const controller = await getStudentPIDController(studentId);
  const results = [];
  
  for (const score of scores) {
    const result = controller.compute(score);
    const recommendation = controller.getRecommendedDifficulty(score);
    
    results.push({
      score,
      recommendedDifficulty: recommendation.difficulty,
      multiplier: recommendation.multiplier,
      error: Math.round(result.error * 100) / 100
    });
  }
  
  await saveStudentPIDController(studentId, controller);
  
  return results;
};

/**
 * Reset PID controller
 * @param {String} studentId - Student ID
 * @returns {Promise}
 */
const resetStudentPIDController = async (studentId) => {
  const controller = new PIDController();
  controller.reset();
  
  await saveStudentPIDController(studentId, controller);
  
  return controller.getState();
};

/**
 * Get PID statistics
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getPIDStatistics = async (studentId) => {
  const metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams) {
    return {
      initialized: false,
      message: 'No PID controller data found'
    };
  }
  
  const controller = new PIDController();
  controller.setState({
    Kp: metaParams.pidGains.Kp,
    Ki: metaParams.pidGains.Ki,
    Kd: metaParams.pidGains.Kd,
    setpoint: metaParams.pidSetpoint,
    integral: metaParams.pidIntegral,
    previousError: metaParams.pidPreviousError,
    output: metaParams.pidOutput
  });
  
  return {
    initialized: true,
    gains: {
      Kp: metaParams.pidGains.Kp,
      Ki: metaParams.pidGains.Ki,
      Kd: metaParams.pidGains.Kd
    },
    setpoint: metaParams.pidSetpoint,
    currentOutput: Math.round(metaParams.pidOutput * 1000) / 1000,
    integral: Math.round(metaParams.pidIntegral * 100) / 100,
    previousError: Math.round(metaParams.pidPreviousError * 100) / 100,
    lastUpdated: metaParams.lastUpdated
  };
};

/**
 * Tune PID controller
 * @param {String} studentId - Student ID
 * @param {Object} gains - New gains {Kp, Ki, Kd}
 * @param {Number} setpoint - New setpoint (optional)
 * @returns {Promise<Object>}
 */
const tunePIDController = async (studentId, gains, setpoint = null) => {
  const controller = await getStudentPIDController(studentId);
  
  controller.tune(gains);
  
  if (setpoint !== null) {
    controller.setSetpoint(setpoint);
  }
  
  await saveStudentPIDController(studentId, controller);
  
  return controller.getState();
};

/**
 * Auto-tune PID using Ziegler-Nichols method
 * @param {String} studentId - Student ID
 * @param {Array} performanceData - Historical performance data
 * @returns {Promise<Object>}
 */
const autoTunePID = async (studentId, performanceData) => {
  if (performanceData.length < 10) {
    throw new Error('Insufficient data for auto-tuning (need at least 10 data points)');
  }
  
  // Calculate oscillation characteristics
  const peaks = findPeaks(performanceData);
  const troughs = findTroughs(performanceData);
  
  if (peaks.length < 2 || troughs.length < 2) {
    throw new Error('Insufficient oscillation for auto-tuning');
  }
  
  // Calculate ultimate gain (Ku) and period (Tu)
  const amplitude = (peaks[0] - troughs[0]) / 2;
  const Tu = calculatePeriod(performanceData);
  const Ku = 0.6; // Conservative estimate
  
  // Ziegler-Nichols PID tuning rules
  const Kp = 0.6 * Ku;
  const Ki = 2 * Kp / Tu;
  const Kd = Kp * Tu / 8;
  
  const gains = {
    Kp: Math.round(Kp * 1000) / 1000,
    Ki: Math.round(Ki * 1000) / 1000,
    Kd: Math.round(Kd * 1000) / 1000
  };
  
  await tunePIDController(studentId, gains);
  
  return {
    gains,
    method: 'Ziegler-Nichols',
    ultimateGain: Ku,
    ultimatePeriod: Tu
  };
};

/**
 * Find peaks in data
 * @param {Array} data - Data array
 * @returns {Array} Peak values
 */
const findPeaks = (data) => {
  const peaks = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
      peaks.push(data[i]);
    }
  }
  return peaks;
};

/**
 * Find troughs in data
 * @param {Array} data - Data array
 * @returns {Array} Trough values
 */
const findTroughs = (data) => {
  const troughs = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
      troughs.push(data[i]);
    }
  }
  return troughs;
};

/**
 * Calculate period of oscillation
 * @param {Array} data - Data array
 * @returns {Number} Period
 */
const calculatePeriod = (data) => {
  const peaks = findPeaks(data);
  if (peaks.length < 2) return 1;
  
  // Average distance between peaks
  let totalDistance = 0;
  for (let i = 1; i < peaks.length; i++) {
    totalDistance += i;
  }
  
  return totalDistance / (peaks.length - 1);
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Class
  PIDController,
  
  // Student management
  getStudentPIDController,
  saveStudentPIDController,
  resetStudentPIDController,
  
  // Difficulty adjustment
  adjustDifficulty,
  batchAdjustDifficulty,
  
  // Statistics
  getPIDStatistics,
  
  // Tuning
  tunePIDController,
  autoTunePID,
  
  // Configuration
  DEFAULT_CONFIG,
  DIFFICULTY_LEVELS
};