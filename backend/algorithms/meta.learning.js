// algorithms/meta.learning.js
/**
 * META-LEARNING ENGINE - COMPLETE PRODUCTION VERSION
 * Adaptive learning system that learns how students learn
 * 
 * @module algorithms/meta.learning
 */

const { MetaParameters, Challenge, Student } = require('../models');
const { getStudentKalmanFilter } = require('./kalman.filter');
const { getStudentPIDController } = require('./pid.controller');

// ============================================================================
// META-LEARNING CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG = {
  // Learning rate
  learningRate: 0.01,
  learningRateDecay: 0.99,
  minLearningRate: 0.001,
  
  // Window sizes
  shortTermWindow: 5,
  mediumTermWindow: 10,
  longTermWindow: 20,
  
  // Adaptation thresholds
  performanceThreshold: 0.6,
  improvementThreshold: 0.05,
  
  // Feature weights
  featureWeights: {
    timeOfDay: 0.1,
    sessionLength: 0.15,
    difficulty: 0.2,
    simulationType: 0.15,
    previousScore: 0.25,
    streakLength: 0.15
  },
  
  // Pattern recognition
  minPatternLength: 3,
  patternSimilarityThreshold: 0.7
};

// ============================================================================
// META-LEARNING ENGINE CLASS
// ============================================================================

class MetaLearningEngine {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.learningRate = this.config.learningRate;
    this.parameters = new Map();
    this.patterns = [];
    this.updateCount = 0;
  }
  
  /**
   * Learn from challenge result
   * @param {Object} challengeData - Challenge data
   * @returns {Object} Learning result
   */
  learn(challengeData) {
    const features = this.extractFeatures(challengeData);
    const performance = challengeData.score / 100;
    
    // Update parameters based on performance
    const parameterUpdates = this.updateParameters(features, performance);
    
    // Detect patterns
    const patterns = this.detectPatterns(challengeData);
    
    // Calculate learning metrics
    const metrics = this.calculateLearningMetrics();
    
    // Decay learning rate
    this.learningRate = Math.max(
      this.config.minLearningRate,
      this.learningRate * this.config.learningRateDecay
    );
    
    this.updateCount++;
    
    return {
      parameterUpdates,
      patterns,
      metrics,
      learningRate: this.learningRate
    };
  }
  
  /**
   * Extract features from challenge data
   * @param {Object} challengeData - Challenge data
   * @returns {Object} Features
   */
  extractFeatures(challengeData) {
    const now = new Date(challengeData.timestamp || Date.now());
    
    return {
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      sessionLength: challengeData.sessionLength || 0,
      difficulty: this.encodeDifficulty(challengeData.difficulty),
      simulationType: challengeData.simulationType,
      previousScore: challengeData.previousScore || 0,
      streakLength: challengeData.streakLength || 0,
      timeSinceLastChallenge: challengeData.timeSinceLastChallenge || 0,
      attemptNumber: challengeData.attemptNumber || 1
    };
  }
  
  /**
   * Encode difficulty as numeric value
   * @param {String} difficulty - Difficulty level
   * @returns {Number} Encoded value
   */
  encodeDifficulty(difficulty) {
    const mapping = {
      'very_easy': 0.2,
      'easy': 0.4,
      'medium': 0.6,
      'hard': 0.8,
      'very_hard': 0.9,
      'expert': 1.0
    };
    return mapping[difficulty] || 0.6;
  }
  
  /**
   * Update parameters based on performance
   * @param {Object} features - Feature vector
   * @param {Number} performance - Performance (0-1)
   * @returns {Object} Parameter updates
   */
  updateParameters(features, performance) {
    const updates = {};
    
    Object.entries(features).forEach(([feature, value]) => {
      if (typeof value !== 'number') return;
      
      const key = feature;
      const currentParam = this.parameters.get(key) || 0;
      
      // Gradient descent update
      const error = performance - 0.7; // Target performance
      const gradient = error * value;
      const update = this.learningRate * gradient;
      
      const newParam = currentParam + update;
      this.parameters.set(key, newParam);
      
      updates[feature] = {
        previous: currentParam,
        current: newParam,
        change: update
      };
    });
    
    return updates;
  }
  
  /**
   * Detect learning patterns
   * @param {Object} challengeData - Challenge data
   * @returns {Array} Detected patterns
   */
  detectPatterns(challengeData) {
    const patterns = [];
    
    // Time-based patterns
    if (challengeData.timeOfDay) {
      const timePattern = this.detectTimePattern(challengeData);
      if (timePattern) patterns.push(timePattern);
    }
    
    // Difficulty progression patterns
    if (challengeData.difficultyHistory) {
      const difficultyPattern = this.detectDifficultyPattern(challengeData);
      if (difficultyPattern) patterns.push(difficultyPattern);
    }
    
    // Performance trend patterns
    if (challengeData.scoreHistory) {
      const trendPattern = this.detectTrendPattern(challengeData);
      if (trendPattern) patterns.push(trendPattern);
    }
    
    return patterns;
  }
  
  /**
   * Detect time-based patterns
   * @param {Object} data - Challenge data
   * @returns {Object} Time pattern
   */
  detectTimePattern(data) {
    const hour = new Date(data.timestamp).getHours();
    
    if (hour >= 6 && hour < 12) {
      return {
        type: 'time_of_day',
        pattern: 'morning_learner',
        confidence: 0.7
      };
    } else if (hour >= 14 && hour < 18) {
      return {
        type: 'time_of_day',
        pattern: 'afternoon_learner',
        confidence: 0.7
      };
    } else if (hour >= 18 && hour < 22) {
      return {
        type: 'time_of_day',
        pattern: 'evening_learner',
        confidence: 0.7
      };
    }
    
    return null;
  }
  
  /**
   * Detect difficulty progression pattern
   * @param {Object} data - Challenge data
   * @returns {Object} Difficulty pattern
   */
  detectDifficultyPattern(data) {
    const history = data.difficultyHistory || [];
    if (history.length < this.config.minPatternLength) return null;
    
    const recent = history.slice(-5);
    const difficulties = recent.map(h => this.encodeDifficulty(h.difficulty));
    
    // Check for consistent increase
    let increasing = true;
    for (let i = 1; i < difficulties.length; i++) {
      if (difficulties[i] <= difficulties[i - 1]) {
        increasing = false;
        break;
      }
    }
    
    if (increasing) {
      return {
        type: 'difficulty_progression',
        pattern: 'steady_advancement',
        confidence: 0.8
      };
    }
    
    // Check for plateau
    const variance = this.calculateVariance(difficulties);
    if (variance < 0.01) {
      return {
        type: 'difficulty_progression',
        pattern: 'plateau',
        confidence: 0.75
      };
    }
    
    return null;
  }
  
  /**
   * Detect performance trend pattern
   * @param {Object} data - Challenge data
   * @returns {Object} Trend pattern
   */
  detectTrendPattern(data) {
    const scores = data.scoreHistory || [];
    if (scores.length < this.config.minPatternLength) return null;
    
    const recent = scores.slice(-5);
    const trend = this.calculateTrend(recent);
    
    if (trend > this.config.improvementThreshold) {
      return {
        type: 'performance_trend',
        pattern: 'improving',
        confidence: 0.8,
        rate: trend
      };
    } else if (trend < -this.config.improvementThreshold) {
      return {
        type: 'performance_trend',
        pattern: 'declining',
        confidence: 0.8,
        rate: trend
      };
    } else {
      return {
        type: 'performance_trend',
        pattern: 'stable',
        confidence: 0.7,
        rate: trend
      };
    }
  }
  
  /**
   * Calculate learning metrics
   * @returns {Object} Metrics
   */
  calculateLearningMetrics() {
    return {
      parametersLearned: this.parameters.size,
      patternsDetected: this.patterns.length,
      updateCount: this.updateCount,
      learningRate: this.learningRate,
      adaptationScore: this.calculateAdaptationScore()
    };
  }
  
  /**
   * Calculate adaptation score
   * @returns {Number} Adaptation score (0-1)
   */
  calculateAdaptationScore() {
    if (this.updateCount === 0) return 0;
    
    const parameterMagnitude = Array.from(this.parameters.values())
      .reduce((sum, v) => sum + Math.abs(v), 0) / this.parameters.size;
    
    const normalizedScore = Math.min(1, parameterMagnitude / 10);
    return Math.round(normalizedScore * 100) / 100;
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
  
  /**
   * Calculate trend
   * @param {Array} values - Values
   * @returns {Number} Trend slope
   */
  calculateTrend(values) {
    const n = values.length;
    const xSum = n * (n + 1) / 2;
    const ySum = values.reduce((sum, v) => sum + v, 0);
    const xySum = values.reduce((sum, v, i) => sum + v * (i + 1), 0);
    const xxSum = n * (n + 1) * (2 * n + 1) / 6;
    
    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    return slope;
  }
  
  /**
   * Predict performance
   * @param {Object} features - Feature vector
   * @returns {Number} Predicted performance (0-1)
   */
  predictPerformance(features) {
    let prediction = 0.7; // Base prediction
    
    Object.entries(features).forEach(([feature, value]) => {
      if (typeof value !== 'number') return;
      
      const param = this.parameters.get(feature) || 0;
      prediction += param * value;
    });
    
    return Math.max(0, Math.min(1, prediction));
  }
  
  /**
   * Get recommendations
   * @param {Object} studentContext - Student context
   * @returns {Array} Recommendations
   */
  getRecommendations(studentContext) {
    const recommendations = [];
    
    // Time-based recommendations
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 9) {
      recommendations.push({
        type: 'timing',
        recommendation: 'Morning session - focus on conceptual challenges',
        priority: 'medium'
      });
    } else if (hour >= 14 && hour < 17) {
      recommendations.push({
        type: 'timing',
        recommendation: 'Afternoon session - good for practice challenges',
        priority: 'medium'
      });
    }
    
    // Difficulty recommendations
    if (studentContext.recentPerformance > 0.8) {
      recommendations.push({
        type: 'difficulty',
        recommendation: 'Consider increasing difficulty for better learning',
        priority: 'high'
      });
    } else if (studentContext.recentPerformance < 0.5) {
      recommendations.push({
        type: 'difficulty',
        recommendation: 'Focus on easier challenges to build confidence',
        priority: 'high'
      });
    }
    
    // Simulation type recommendations
    if (studentContext.weakSimulationType) {
      recommendations.push({
        type: 'focus',
        recommendation: `Practice more ${studentContext.weakSimulationType} challenges`,
        priority: 'high'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Get state
   * @returns {Object} State
   */
  getState() {
    return {
      parameters: Array.from(this.parameters.entries()),
      patterns: this.patterns,
      learningRate: this.learningRate,
      updateCount: this.updateCount
    };
  }
  
  /**
   * Set state
   * @param {Object} state - State
   */
  setState(state) {
    this.parameters = new Map(state.parameters || []);
    this.patterns = state.patterns || [];
    this.learningRate = state.learningRate || this.config.learningRate;
    this.updateCount = state.updateCount || 0;
  }
}

// ============================================================================
// STUDENT META-LEARNING MANAGEMENT
// ============================================================================

/**
 * Get or create meta-learning engine for student
 * @param {String} studentId - Student ID
 * @returns {Promise<MetaLearningEngine>}
 */
const getStudentMetaLearning = async (studentId) => {
  let metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams) {
    metaParams = await MetaParameters.create({
      studentId,
      metaLearningParameters: {},
      metaLearningPatterns: [],
      metaLearningRate: DEFAULT_CONFIG.learningRate,
      metaUpdateCount: 0
    });
  }
  
  const engine = new MetaLearningEngine();
  engine.setState({
    parameters: Object.entries(metaParams.metaLearningParameters || {}),
    patterns: metaParams.metaLearningPatterns || [],
    learningRate: metaParams.metaLearningRate || DEFAULT_CONFIG.learningRate,
    updateCount: metaParams.metaUpdateCount || 0
  });
  
  return engine;
};

/**
 * Save meta-learning engine state
 * @param {String} studentId - Student ID
 * @param {MetaLearningEngine} engine - Meta-learning engine
 * @returns {Promise}
 */
const saveStudentMetaLearning = async (studentId, engine) => {
  const state = engine.getState();
  
  await MetaParameters.findOneAndUpdate(
    { studentId },
    {
      metaLearningParameters: Object.fromEntries(state.parameters),
      metaLearningPatterns: state.patterns,
      metaLearningRate: state.learningRate,
      metaUpdateCount: state.updateCount,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
};

/**
 * Learn from challenge
 * @param {String} studentId - Student ID
 * @param {Object} challengeData - Challenge data
 * @returns {Promise<Object>}
 */
const learnFromChallenge = async (studentId, challengeData) => {
  const engine = await getStudentMetaLearning(studentId);
  
  // Get historical data
  const challenges = await Challenge.find({ studentId, status: 'evaluated' })
    .sort({ createdAt: -1 })
    .limit(20);
  
  // Enrich challenge data with history
  const enrichedData = {
    ...challengeData,
    scoreHistory: challenges.map(c => c.evaluation?.score || 0),
    difficultyHistory: challenges.map(c => ({ difficulty: c.difficulty })),
    previousScore: challenges[0]?.evaluation?.score || 0,
    streakLength: calculateStreak(challenges)
  };
  
  const result = engine.learn(enrichedData);
  
  await saveStudentMetaLearning(studentId, engine);
  
  return result;
};

/**
 * Calculate current streak
 * @param {Array} challenges - Challenges
 * @returns {Number} Streak length
 */
const calculateStreak = (challenges) => {
  let streak = 0;
  for (const challenge of challenges) {
    if (challenge.evaluation?.score >= 60) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Get learning recommendations
 * @param {String} studentId - Student ID
 * @returns {Promise<Array>}
 */
const getLearningRecommendations = async (studentId) => {
  const engine = await getStudentMetaLearning(studentId);
  const student = await Student.findOne({ studentId });
  
  const challenges = await Challenge.find({ studentId, status: 'evaluated' })
    .sort({ createdAt: -1 })
    .limit(10);
  
  const recentPerformance = challenges.length > 0
    ? challenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / challenges.length / 100
    : 0.5;
  
  // Calculate weak simulation type
  const simulationScores = {};
  challenges.forEach(c => {
    const type = c.simulationType;
    if (!simulationScores[type]) {
      simulationScores[type] = [];
    }
    simulationScores[type].push(c.evaluation?.score || 0);
  });
  
  let weakSimulationType = null;
  let lowestAvg = 100;
  Object.entries(simulationScores).forEach(([type, scores]) => {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    if (avg < lowestAvg) {
      lowestAvg = avg;
      weakSimulationType = type;
    }
  });
  
  const context = {
    recentPerformance,
    weakSimulationType: lowestAvg < 70 ? weakSimulationType : null
  };
  
  return engine.getRecommendations(context);
};

/**
 * Predict challenge performance
 * @param {String} studentId - Student ID
 * @param {Object} challengeFeatures - Challenge features
 * @returns {Promise<Object>}
 */
const predictChallengePerformance = async (studentId, challengeFeatures) => {
  const engine = await getStudentMetaLearning(studentId);
  
  const features = engine.extractFeatures(challengeFeatures);
  const prediction = engine.predictPerformance(features);
  
  return {
    predictedScore: Math.round(prediction * 100),
    confidence: engine.calculateAdaptationScore(),
    features
  };
};

/**
 * Get meta-learning statistics
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getMetaLearningStatistics = async (studentId) => {
  const metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams) {
    return {
      initialized: false,
      message: 'No meta-learning data found'
    };
  }
  
  const engine = new MetaLearningEngine();
  engine.setState({
    parameters: Object.entries(metaParams.metaLearningParameters || {}),
    patterns: metaParams.metaLearningPatterns || [],
    learningRate: metaParams.metaLearningRate,
    updateCount: metaParams.metaUpdateCount
  });
  
  const metrics = engine.calculateLearningMetrics();
  
  return {
    initialized: true,
    metrics,
    patterns: metaParams.metaLearningPatterns || [],
    lastUpdated: metaParams.lastUpdated
  };
};

/**
 * Optimize learning path
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const optimizeLearningPath = async (studentId) => {
  const engine = await getStudentMetaLearning(studentId);
  const challenges = await Challenge.find({ studentId, status: 'evaluated' })
    .sort({ createdAt: -1 })
    .limit(20);
  
  // Analyze performance by simulation type
  const typePerformance = {};
  challenges.forEach(c => {
    const type = c.simulationType;
    if (!typePerformance[type]) {
      typePerformance[type] = {
        count: 0,
        totalScore: 0,
        avgScore: 0
      };
    }
    typePerformance[type].count++;
    typePerformance[type].totalScore += c.evaluation?.score || 0;
  });
  
  Object.keys(typePerformance).forEach(type => {
    const data = typePerformance[type];
    data.avgScore = data.totalScore / data.count;
  });
  
  // Analyze performance by difficulty
  const difficultyPerformance = {};
  challenges.forEach(c => {
    const diff = c.difficulty;
    if (!difficultyPerformance[diff]) {
      difficultyPerformance[diff] = {
        count: 0,
        totalScore: 0,
        avgScore: 0
      };
    }
    difficultyPerformance[diff].count++;
    difficultyPerformance[diff].totalScore += c.evaluation?.score || 0;
  });
  
  Object.keys(difficultyPerformance).forEach(diff => {
    const data = difficultyPerformance[diff];
    data.avgScore = data.totalScore / data.count;
  });
  
  // Generate optimized path
  const path = [];
  
  // Prioritize weak areas
  const weakTypes = Object.entries(typePerformance)
    .filter(([_, data]) => data.avgScore < 70)
    .sort((a, b) => a[1].avgScore - b[1].avgScore)
    .slice(0, 2);
  
  weakTypes.forEach(([type, data]) => {
    path.push({
      simulationType: type,
      difficulty: data.avgScore < 50 ? 'easy' : 'medium',
      reason: `Focus on ${type} (current avg: ${Math.round(data.avgScore)}%)`,
      priority: 'high'
    });
  });
  
  // Add variety for engagement
  const strongTypes = Object.entries(typePerformance)
    .filter(([_, data]) => data.avgScore >= 80)
    .slice(0, 1);
  
  strongTypes.forEach(([type, data]) => {
    path.push({
      simulationType: type,
      difficulty: 'hard',
      reason: `Challenge yourself with advanced ${type}`,
      priority: 'medium'
    });
  });
  
  return {
    optimizedPath: path,
    analysis: {
      typePerformance,
      difficultyPerformance
    }
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Class
  MetaLearningEngine,
  
  // Student management
  getStudentMetaLearning,
  saveStudentMetaLearning,
  
  // Learning
  learnFromChallenge,
  getLearningRecommendations,
  predictChallengePerformance,
  
  // Statistics
  getMetaLearningStatistics,
  
  // Optimization
  optimizeLearningPath,
  
  // Configuration
  DEFAULT_CONFIG
};