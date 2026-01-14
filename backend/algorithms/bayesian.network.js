// algorithms/bayesian.network.js
/**
 * BAYESIAN NETWORK - COMPLETE PRODUCTION VERSION
 * Bayesian inference for competency assessment and prediction
 * 
 * @module algorithms/bayesian.network
 */

const { MetaParameters, Challenge, Student } = require('../models');

// ============================================================================
// BAYESIAN NETWORK CONFIGURATION
// ============================================================================

const COMPETENCIES = {
  MATHEMATICAL_REASONING: 'mathematical_reasoning',
  PROBLEM_SOLVING: 'problem_solving',
  SCIENTIFIC_ANALYSIS: 'scientific_analysis',
  CRITICAL_THINKING: 'critical_thinking',
  CONCEPTUAL_UNDERSTANDING: 'conceptual_understanding',
  COMPUTATIONAL_THINKING: 'computational_thinking'
};

const EVIDENCE_TYPES = {
  CHALLENGE_SCORE: 'challenge_score',
  TIME_TAKEN: 'time_taken',
  ATTEMPTS: 'attempts',
  DIFFICULTY: 'difficulty',
  HINT_USAGE: 'hint_usage'
};

const DEFAULT_CONFIG = {
  // Prior probabilities (initial belief about competency levels)
  priorProbabilities: {
    low: 0.3,      // 0-40
    medium: 0.4,   // 40-70
    high: 0.3      // 70-100
  },
  
  // Likelihood parameters
  likelihoodParams: {
    // P(score | competency level)
    scoreGivenCompetency: {
      low: { mean: 30, std: 15 },
      medium: { mean: 60, std: 15 },
      high: { mean: 85, std: 10 }
    },
    
    // P(time | competency level)
    timeGivenCompetency: {
      low: { mean: 25, std: 10 },
      medium: { mean: 15, std: 5 },
      high: { mean: 10, std: 3 }
    }
  },
  
  // Learning rate for updating beliefs
  learningRate: 0.1,
  
  // Minimum observations for reliable inference
  minObservations: 3
};

// ============================================================================
// BAYESIAN NETWORK CLASS
// ============================================================================

class BayesianNetwork {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Competency beliefs (posterior probabilities)
    this.beliefs = {};
    Object.values(COMPETENCIES).forEach(comp => {
      this.beliefs[comp] = { ...this.config.priorProbabilities };
    });
    
    // Evidence history
    this.evidence = [];
    
    // Update count
    this.updateCount = 0;
  }
  
  /**
   * Update beliefs with new evidence
   * @param {String} competency - Competency name
   * @param {Object} evidence - Evidence object
   * @returns {Object} Updated beliefs
   */
  updateBelief(competency, evidence) {
    if (!this.beliefs[competency]) {
      throw new Error(`Unknown competency: ${competency}`);
    }
    
    const prior = this.beliefs[competency];
    const likelihood = this.calculateLikelihood(evidence);
    const posterior = this.bayesianUpdate(prior, likelihood);
    
    // Apply learning rate for smooth updates
    const smoothedPosterior = {};
    Object.keys(posterior).forEach(level => {
      smoothedPosterior[level] = 
        prior[level] * (1 - this.config.learningRate) + 
        posterior[level] * this.config.learningRate;
    });
    
    // Normalize
    this.beliefs[competency] = this.normalize(smoothedPosterior);
    
    // Store evidence
    this.evidence.push({
      competency,
      evidence,
      timestamp: new Date(),
      prior,
      posterior: this.beliefs[competency]
    });
    
    this.updateCount++;
    
    return this.beliefs[competency];
  }
  
  /**
   * Calculate likelihood P(evidence | competency level)
   * @param {Object} evidence - Evidence object
   * @returns {Object} Likelihood for each level
   */
  calculateLikelihood(evidence) {
    const likelihood = {
      low: 1.0,
      medium: 1.0,
      high: 1.0
    };
    
    // Score evidence
    if (evidence.score !== undefined) {
      const scoreLikelihood = this.calculateScoreLikelihood(evidence.score);
      likelihood.low *= scoreLikelihood.low;
      likelihood.medium *= scoreLikelihood.medium;
      likelihood.high *= scoreLikelihood.high;
    }
    
    // Time evidence
    if (evidence.timeTaken !== undefined) {
      const timeLikelihood = this.calculateTimeLikelihood(evidence.timeTaken);
      likelihood.low *= timeLikelihood.low;
      likelihood.medium *= timeLikelihood.medium;
      likelihood.high *= timeLikelihood.high;
    }
    
    // Difficulty adjustment
    if (evidence.difficulty) {
      const difficultyFactor = this.getDifficultyFactor(evidence.difficulty);
      likelihood.low *= difficultyFactor.low;
      likelihood.medium *= difficultyFactor.medium;
      likelihood.high *= difficultyFactor.high;
    }
    
    return this.normalize(likelihood);
  }
  
  /**
   * Calculate score likelihood using Gaussian
   * @param {Number} score - Score (0-100)
   * @returns {Object} Likelihood
   */
  calculateScoreLikelihood(score) {
    const params = this.config.likelihoodParams.scoreGivenCompetency;
    
    return {
      low: this.gaussianPDF(score, params.low.mean, params.low.std),
      medium: this.gaussianPDF(score, params.medium.mean, params.medium.std),
      high: this.gaussianPDF(score, params.high.mean, params.high.std)
    };
  }
  
  /**
   * Calculate time likelihood
   * @param {Number} timeTaken - Time in minutes
   * @returns {Object} Likelihood
   */
  calculateTimeLikelihood(timeTaken) {
    const params = this.config.likelihoodParams.timeGivenCompetency;
    
    return {
      low: this.gaussianPDF(timeTaken, params.low.mean, params.low.std),
      medium: this.gaussianPDF(timeTaken, params.medium.mean, params.medium.std),
      high: this.gaussianPDF(timeTaken, params.high.mean, params.high.std)
    };
  }
  
  /**
   * Gaussian probability density function
   * @param {Number} x - Value
   * @param {Number} mean - Mean
   * @param {Number} std - Standard deviation
   * @returns {Number} Probability density
   */
  gaussianPDF(x, mean, std) {
    const coefficient = 1 / (std * Math.sqrt(2 * Math.PI));
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(std, 2));
    return coefficient * Math.exp(exponent);
  }
  
  /**
   * Get difficulty adjustment factor
   * @param {String} difficulty - Difficulty level
   * @returns {Object} Factor for each level
   */
  getDifficultyFactor(difficulty) {
    const factors = {
      easy: { low: 1.2, medium: 1.0, high: 0.8 },
      medium: { low: 1.0, medium: 1.0, high: 1.0 },
      hard: { low: 0.8, medium: 1.0, high: 1.2 },
      expert: { low: 0.6, medium: 1.0, high: 1.5 }
    };
    
    return factors[difficulty] || factors.medium;
  }
  
  /**
   * Bayesian update: P(H|E) = P(E|H) * P(H) / P(E)
   * @param {Object} prior - Prior probabilities
   * @param {Object} likelihood - Likelihood
   * @returns {Object} Posterior probabilities
   */
  bayesianUpdate(prior, likelihood) {
    const posterior = {};
    
    // Calculate numerator: P(E|H) * P(H)
    Object.keys(prior).forEach(level => {
      posterior[level] = likelihood[level] * prior[level];
    });
    
    // Normalize by P(E)
    return this.normalize(posterior);
  }
  
  /**
   * Normalize probabilities to sum to 1
   * @param {Object} probabilities - Probabilities
   * @returns {Object} Normalized probabilities
   */
  normalize(probabilities) {
    const sum = Object.values(probabilities).reduce((acc, val) => acc + val, 0);
    
    if (sum === 0) {
      // Uniform distribution if all zeros
      const uniform = 1 / Object.keys(probabilities).length;
      const normalized = {};
      Object.keys(probabilities).forEach(key => {
        normalized[key] = uniform;
      });
      return normalized;
    }
    
    const normalized = {};
    Object.keys(probabilities).forEach(key => {
      normalized[key] = probabilities[key] / sum;
    });
    
    return normalized;
  }
  
  /**
   * Get most likely competency level
   * @param {String} competency - Competency name
   * @returns {Object} Level and confidence
   */
  getMostLikelyLevel(competency) {
    const beliefs = this.beliefs[competency];
    
    let maxProb = 0;
    let maxLevel = null;
    
    Object.entries(beliefs).forEach(([level, prob]) => {
      if (prob > maxProb) {
        maxProb = prob;
        maxLevel = level;
      }
    });
    
    return {
      level: maxLevel,
      confidence: Math.round(maxProb * 100),
      probabilities: beliefs
    };
  }
  
  /**
   * Get expected competency score
   * @param {String} competency - Competency name
   * @returns {Number} Expected score (0-100)
   */
  getExpectedScore(competency) {
    const beliefs = this.beliefs[competency];
    
    // Map levels to score ranges
    const scoreMidpoints = {
      low: 25,
      medium: 60,
      high: 85
    };
    
    let expectedScore = 0;
    Object.entries(beliefs).forEach(([level, prob]) => {
      expectedScore += prob * scoreMidpoints[level];
    });
    
    return Math.round(expectedScore);
  }
  
  /**
   * Predict performance on new challenge
   * @param {String} competency - Competency name
   * @param {String} difficulty - Challenge difficulty
   * @returns {Object} Prediction
   */
  predictPerformance(competency, difficulty) {
    const beliefs = this.beliefs[competency];
    const expectedScore = this.getExpectedScore(competency);
    
    // Adjust for difficulty
    const difficultyAdjustment = {
      easy: 15,
      medium: 0,
      hard: -15,
      expert: -25
    };
    
    const adjustment = difficultyAdjustment[difficulty] || 0;
    const predictedScore = Math.max(0, Math.min(100, expectedScore + adjustment));
    
    // Calculate confidence (entropy-based)
    const entropy = this.calculateEntropy(beliefs);
    const maxEntropy = Math.log2(Object.keys(beliefs).length);
    const confidence = (1 - entropy / maxEntropy) * 100;
    
    return {
      predictedScore: Math.round(predictedScore),
      confidence: Math.round(confidence),
      competencyLevel: this.getMostLikelyLevel(competency),
      uncertainty: Math.round(entropy * 100) / 100
    };
  }
  
  /**
   * Calculate entropy (uncertainty measure)
   * @param {Object} probabilities - Probability distribution
   * @returns {Number} Entropy
   */
  calculateEntropy(probabilities) {
    let entropy = 0;
    
    Object.values(probabilities).forEach(prob => {
      if (prob > 0) {
        entropy -= prob * Math.log2(prob);
      }
    });
    
    return entropy;
  }
  
  /**
   * Get competency correlations
   * @returns {Object} Correlation matrix
   */
  getCompetencyCorrelations() {
    const competencies = Object.keys(this.beliefs);
    const correlations = {};
    
    competencies.forEach(comp1 => {
      correlations[comp1] = {};
      competencies.forEach(comp2 => {
        if (comp1 === comp2) {
          correlations[comp1][comp2] = 1.0;
        } else {
          correlations[comp1][comp2] = this.calculateCorrelation(comp1, comp2);
        }
      });
    });
    
    return correlations;
  }
  
  /**
   * Calculate correlation between two competencies
   * @param {String} comp1 - First competency
   * @param {String} comp2 - Second competency
   * @returns {Number} Correlation
   */
  calculateCorrelation(comp1, comp2) {
    const beliefs1 = this.beliefs[comp1];
    const beliefs2 = this.beliefs[comp2];
    
    // Simple correlation based on belief similarity
    let similarity = 0;
    Object.keys(beliefs1).forEach(level => {
      similarity += Math.abs(beliefs1[level] - beliefs2[level]);
    });
    
    return Math.round((1 - similarity / 2) * 100) / 100;
  }
  
  /**
   * Get network state
   * @returns {Object} State
   */
  getState() {
    return {
      beliefs: this.beliefs,
      updateCount: this.updateCount,
      evidenceCount: this.evidence.length
    };
  }
  
  /**
   * Set network state
   * @param {Object} state - State
   */
  setState(state) {
    this.beliefs = state.beliefs || this.beliefs;
    this.updateCount = state.updateCount || 0;
  }
  
  /**
   * Reset network to prior
   */
  reset() {
    Object.values(COMPETENCIES).forEach(comp => {
      this.beliefs[comp] = { ...this.config.priorProbabilities };
    });
    this.evidence = [];
    this.updateCount = 0;
  }
}

// ============================================================================
// STUDENT BAYESIAN NETWORK MANAGEMENT
// ============================================================================

/**
 * Get or create Bayesian network for student
 * @param {String} studentId - Student ID
 * @returns {Promise<BayesianNetwork>}
 */
const getStudentBayesianNetwork = async (studentId) => {
  let metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams || !metaParams.bayesianBeliefs) {
    const network = new BayesianNetwork();
    return network;
  }
  
  const network = new BayesianNetwork();
  network.setState({
    beliefs: metaParams.bayesianBeliefs,
    updateCount: metaParams.bayesianUpdateCount || 0
  });
  
  return network;
};

/**
 * Save Bayesian network state
 * @param {String} studentId - Student ID
 * @param {BayesianNetwork} network - Bayesian network
 * @returns {Promise}
 */
const saveStudentBayesianNetwork = async (studentId, network) => {
  const state = network.getState();
  
  await MetaParameters.findOneAndUpdate(
    { studentId },
    {
      bayesianBeliefs: state.beliefs,
      bayesianUpdateCount: state.updateCount,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
};

/**
 * Update competency assessment
 * @param {String} studentId - Student ID
 * @param {String} competency - Competency name
 * @param {Object} evidence - Evidence
 * @returns {Promise<Object>}
 */
const updateCompetencyAssessment = async (studentId, competency, evidence) => {
  const network = await getStudentBayesianNetwork(studentId);
  
  const updatedBeliefs = network.updateBelief(competency, evidence);
  const assessment = network.getMostLikelyLevel(competency);
  
  await saveStudentBayesianNetwork(studentId, network);
  
  return {
    competency,
    assessment,
    beliefs: updatedBeliefs,
    evidence
  };
};

/**
 * Batch update from challenge
 * @param {String} studentId - Student ID
 * @param {Object} challenge - Challenge object
 * @returns {Promise<Object>}
 */
const updateFromChallenge = async (studentId, challenge) => {
  const network = await getStudentBayesianNetwork(studentId);
  
  const evidence = {
    score: challenge.evaluation?.score || 0,
    timeTaken: challenge.metadata?.timeTaken || null,
    difficulty: challenge.difficulty,
    attempts: challenge.metadata?.attempts || 1,
    hintsUsed: challenge.metadata?.hintsUsed || 0
  };
  
  const updates = {};
  
  // Update each competency involved in challenge
  if (challenge.competencies && challenge.competencies.length > 0) {
    for (const competency of challenge.competencies) {
      const competencyKey = competency.toLowerCase().replace(/\s+/g, '_');
      if (network.beliefs[competencyKey]) {
        updates[competencyKey] = network.updateBelief(competencyKey, evidence);
      }
    }
  }
  
  await saveStudentBayesianNetwork(studentId, network);
  
  return {
    updates,
    overallState: network.getState()
  };
};

/**
 * Get competency assessment
 * @param {String} studentId - Student ID
 * @param {String} competency - Competency name (optional)
 * @returns {Promise<Object>}
 */
const getCompetencyAssessment = async (studentId, competency = null) => {
  const network = await getStudentBayesianNetwork(studentId);
  
  if (competency) {
    return {
      competency,
      assessment: network.getMostLikelyLevel(competency),
      expectedScore: network.getExpectedScore(competency),
      beliefs: network.beliefs[competency]
    };
  }
  
  // All competencies
  const assessments = {};
  Object.keys(network.beliefs).forEach(comp => {
    assessments[comp] = {
      assessment: network.getMostLikelyLevel(comp),
      expectedScore: network.getExpectedScore(comp),
      beliefs: network.beliefs[comp]
    };
  });
  
  return assessments;
};

/**
 * Predict challenge performance
 * @param {String} studentId - Student ID
 * @param {String} competency - Competency name
 * @param {String} difficulty - Difficulty level
 * @returns {Promise<Object>}
 */
const predictChallengePerformance = async (studentId, competency, difficulty) => {
  const network = await getStudentBayesianNetwork(studentId);
  
  const competencyKey = competency.toLowerCase().replace(/\s+/g, '_');
  
  if (!network.beliefs[competencyKey]) {
    throw new Error(`Unknown competency: ${competency}`);
  }
  
  return network.predictPerformance(competencyKey, difficulty);
};

/**
 * Get learning insights
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getLearningInsights = async (studentId) => {
  const network = await getStudentBayesianNetwork(studentId);
  const state = network.getState();
  
  // Identify strengths and weaknesses
  const strengths = [];
  const weaknesses = [];
  
  Object.entries(network.beliefs).forEach(([comp, beliefs]) => {
    const level = network.getMostLikelyLevel(comp);
    const expectedScore = network.getExpectedScore(comp);
    
    if (level.level === 'high' && level.confidence >= 70) {
      strengths.push({
        competency: comp,
        level: level.level,
        score: expectedScore,
        confidence: level.confidence
      });
    } else if (level.level === 'low' && level.confidence >= 60) {
      weaknesses.push({
        competency: comp,
        level: level.level,
        score: expectedScore,
        confidence: level.confidence
      });
    }
  });
  
  // Get correlations
  const correlations = network.getCompetencyCorrelations();
  
  return {
    strengths,
    weaknesses,
    correlations,
    overallUncertainty: state.updateCount < DEFAULT_CONFIG.minObservations,
    updateCount: state.updateCount
  };
};

/**
 * Get Bayesian statistics
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getBayesianStatistics = async (studentId) => {
  const metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams || !metaParams.bayesianBeliefs) {
    return {
      initialized: false,
      message: 'No Bayesian network data found'
    };
  }
  
  const network = new BayesianNetwork();
  network.setState({
    beliefs: metaParams.bayesianBeliefs,
    updateCount: metaParams.bayesianUpdateCount
  });
  
  const assessments = {};
  Object.keys(network.beliefs).forEach(comp => {
    assessments[comp] = network.getMostLikelyLevel(comp);
  });
  
  return {
    initialized: true,
    assessments,
    updateCount: metaParams.bayesianUpdateCount,
    lastUpdated: metaParams.lastUpdated
  };
};

/**
 * Reset student network
 * @param {String} studentId - Student ID
 * @returns {Promise}
 */
const resetStudentBayesianNetwork = async (studentId) => {
  const network = new BayesianNetwork();
  network.reset();
  
  await saveStudentBayesianNetwork(studentId, network);
  
  return network.getState();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Class
  BayesianNetwork,
  
  // Constants
  COMPETENCIES,
  EVIDENCE_TYPES,
  
  // Student management
  getStudentBayesianNetwork,
  saveStudentBayesianNetwork,
  resetStudentBayesianNetwork,
  
  // Assessment
  updateCompetencyAssessment,
  updateFromChallenge,
  getCompetencyAssessment,
  
  // Prediction
  predictChallengePerformance,
  
  // Insights
  getLearningInsights,
  getBayesianStatistics,
  
  // Configuration
  DEFAULT_CONFIG
};