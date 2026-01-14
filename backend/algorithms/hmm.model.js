// algorithms/hmm.model.js
/**
 * HIDDEN MARKOV MODEL - COMPLETE PRODUCTION VERSION
 * HMM for learning state prediction and transition modeling
 * 
 * @module algorithms/hmm.model
 */

const { MetaParameters, Challenge } = require('../models');

// ============================================================================
// HMM CONFIGURATION
// ============================================================================

const LEARNING_STATES = {
  STRUGGLING: 'struggling',
  LEARNING: 'learning',
  PROFICIENT: 'proficient',
  MASTERY: 'mastery'
};

const DEFAULT_CONFIG = {
  // Initial state probabilities
  initialProbabilities: {
    [LEARNING_STATES.STRUGGLING]: 0.3,
    [LEARNING_STATES.LEARNING]: 0.4,
    [LEARNING_STATES.PROFICIENT]: 0.2,
    [LEARNING_STATES.MASTERY]: 0.1
  },
  
  // Transition probabilities (state -> state)
  transitionProbabilities: {
    [LEARNING_STATES.STRUGGLING]: {
      [LEARNING_STATES.STRUGGLING]: 0.5,
      [LEARNING_STATES.LEARNING]: 0.4,
      [LEARNING_STATES.PROFICIENT]: 0.08,
      [LEARNING_STATES.MASTERY]: 0.02
    },
    [LEARNING_STATES.LEARNING]: {
      [LEARNING_STATES.STRUGGLING]: 0.2,
      [LEARNING_STATES.LEARNING]: 0.4,
      [LEARNING_STATES.PROFICIENT]: 0.3,
      [LEARNING_STATES.MASTERY]: 0.1
    },
    [LEARNING_STATES.PROFICIENT]: {
      [LEARNING_STATES.STRUGGLING]: 0.05,
      [LEARNING_STATES.LEARNING]: 0.15,
      [LEARNING_STATES.PROFICIENT]: 0.5,
      [LEARNING_STATES.MASTERY]: 0.3
    },
    [LEARNING_STATES.MASTERY]: {
      [LEARNING_STATES.STRUGGLING]: 0.02,
      [LEARNING_STATES.LEARNING]: 0.08,
      [LEARNING_STATES.PROFICIENT]: 0.2,
      [LEARNING_STATES.MASTERY]: 0.7
    }
  },
  
  // Emission probabilities (state -> observation)
  emissionProbabilities: {
    [LEARNING_STATES.STRUGGLING]: {
      low: 0.7,      // 0-40
      medium: 0.25,  // 40-70
      high: 0.05     // 70-100
    },
    [LEARNING_STATES.LEARNING]: {
      low: 0.3,
      medium: 0.5,
      high: 0.2
    },
    [LEARNING_STATES.PROFICIENT]: {
      low: 0.1,
      medium: 0.3,
      high: 0.6
    },
    [LEARNING_STATES.MASTERY]: {
      low: 0.02,
      medium: 0.18,
      high: 0.8
    }
  }
};

// ============================================================================
// HIDDEN MARKOV MODEL CLASS
// ============================================================================

class HiddenMarkovModel {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.states = Object.values(LEARNING_STATES);
    this.initialProb = this.config.initialProbabilities;
    this.transitionProb = this.config.transitionProbabilities;
    this.emissionProb = this.config.emissionProbabilities;
    
    this.currentState = null;
    this.history = [];
  }
  
  /**
   * Classify observation into category
   * @param {Number} score - Score (0-100)
   * @returns {String} Category
   */
  classifyObservation(score) {
    if (score < 40) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  }
  
  /**
   * Viterbi algorithm - find most likely state sequence
   * @param {Array} observations - Array of scores
   * @returns {Array} Most likely states
   */
  viterbi(observations) {
    const T = observations.length;
    const N = this.states.length;
    
    // Initialize
    const viterbiProb = Array(T).fill(null).map(() => Array(N).fill(0));
    const backpointer = Array(T).fill(null).map(() => Array(N).fill(0));
    
    // First observation
    const firstObs = this.classifyObservation(observations[0]);
    this.states.forEach((state, i) => {
      viterbiProb[0][i] = this.initialProb[state] * this.emissionProb[state][firstObs];
    });
    
    // Recursion
    for (let t = 1; t < T; t++) {
      const obs = this.classifyObservation(observations[t]);
      
      this.states.forEach((state, j) => {
        let maxProb = 0;
        let maxState = 0;
        
        this.states.forEach((prevState, i) => {
          const prob = viterbiProb[t - 1][i] * 
                      this.transitionProb[prevState][state] * 
                      this.emissionProb[state][obs];
          
          if (prob > maxProb) {
            maxProb = prob;
            maxState = i;
          }
        });
        
        viterbiProb[t][j] = maxProb;
        backpointer[t][j] = maxState;
      });
    }
    
    // Backtrack
    const stateSequence = Array(T);
    
    // Find best final state
    let maxProb = 0;
    let maxState = 0;
    this.states.forEach((state, i) => {
      if (viterbiProb[T - 1][i] > maxProb) {
        maxProb = viterbiProb[T - 1][i];
        maxState = i;
      }
    });
    
    stateSequence[T - 1] = this.states[maxState];
    
    // Backtrack through sequence
    for (let t = T - 2; t >= 0; t--) {
      const prevStateIdx = this.states.indexOf(stateSequence[t + 1]);
      maxState = backpointer[t + 1][prevStateIdx];
      stateSequence[t] = this.states[maxState];
    }
    
    return stateSequence;
  }
  
  /**
   * Forward algorithm - calculate probability of observations
   * @param {Array} observations - Array of scores
   * @returns {Number} Probability
   */
  forward(observations) {
    const T = observations.length;
    const N = this.states.length;
    
    const alpha = Array(T).fill(null).map(() => Array(N).fill(0));
    
    // Initialization
    const firstObs = this.classifyObservation(observations[0]);
    this.states.forEach((state, i) => {
      alpha[0][i] = this.initialProb[state] * this.emissionProb[state][firstObs];
    });
    
    // Recursion
    for (let t = 1; t < T; t++) {
      const obs = this.classifyObservation(observations[t]);
      
      this.states.forEach((state, j) => {
        let sum = 0;
        this.states.forEach((prevState, i) => {
          sum += alpha[t - 1][i] * this.transitionProb[prevState][state];
        });
        alpha[t][j] = sum * this.emissionProb[state][obs];
      });
    }
    
    // Termination
    let totalProb = 0;
    this.states.forEach((state, i) => {
      totalProb += alpha[T - 1][i];
    });
    
    return totalProb;
  }
  
  /**
   * Backward algorithm
   * @param {Array} observations - Array of scores
   * @returns {Array} Beta values
   */
  backward(observations) {
    const T = observations.length;
    const N = this.states.length;
    
    const beta = Array(T).fill(null).map(() => Array(N).fill(0));
    
    // Initialization
    this.states.forEach((state, i) => {
      beta[T - 1][i] = 1;
    });
    
    // Recursion
    for (let t = T - 2; t >= 0; t--) {
      const nextObs = this.classifyObservation(observations[t + 1]);
      
      this.states.forEach((state, i) => {
        let sum = 0;
        this.states.forEach((nextState, j) => {
          sum += this.transitionProb[state][nextState] * 
                 this.emissionProb[nextState][nextObs] * 
                 beta[t + 1][j];
        });
        beta[t][i] = sum;
      });
    }
    
    return beta;
  }
  
  /**
   * Predict next state
   * @param {String} currentState - Current state
   * @returns {Object} Prediction
   */
  predictNextState(currentState) {
    const transitions = this.transitionProb[currentState];
    
    let maxProb = 0;
    let mostLikelyState = null;
    
    Object.entries(transitions).forEach(([state, prob]) => {
      if (prob > maxProb) {
        maxProb = prob;
        mostLikelyState = state;
      }
    });
    
    return {
      nextState: mostLikelyState,
      probability: maxProb,
      allProbabilities: transitions
    };
  }
  
  /**
   * Calculate state probabilities given observations
   * @param {Array} observations - Array of scores
   * @returns {Array} State probabilities at each time
   */
  calculateStateProbabilities(observations) {
    const T = observations.length;
    const N = this.states.length;
    
    const alpha = this.forwardMatrix(observations);
    const beta = this.backward(observations);
    
    const gamma = Array(T).fill(null).map(() => ({}));
    
    for (let t = 0; t < T; t++) {
      let normalization = 0;
      
      this.states.forEach((state, i) => {
        normalization += alpha[t][i] * beta[t][i];
      });
      
      this.states.forEach((state, i) => {
        gamma[t][state] = (alpha[t][i] * beta[t][i]) / normalization;
      });
    }
    
    return gamma;
  }
  
  /**
   * Forward algorithm returning matrix
   * @param {Array} observations - Array of scores
   * @returns {Array} Alpha matrix
   */
  forwardMatrix(observations) {
    const T = observations.length;
    const N = this.states.length;
    
    const alpha = Array(T).fill(null).map(() => Array(N).fill(0));
    
    // Initialization
    const firstObs = this.classifyObservation(observations[0]);
    this.states.forEach((state, i) => {
      alpha[0][i] = this.initialProb[state] * this.emissionProb[state][firstObs];
    });
    
    // Recursion
    for (let t = 1; t < T; t++) {
      const obs = this.classifyObservation(observations[t]);
      
      this.states.forEach((state, j) => {
        let sum = 0;
        this.states.forEach((prevState, i) => {
          sum += alpha[t - 1][i] * this.transitionProb[prevState][state];
        });
        alpha[t][j] = sum * this.emissionProb[state][obs];
      });
    }
    
    return alpha;
  }
  
  /**
   * Train model using Baum-Welch algorithm
   * @param {Array} observations - Array of scores
   * @param {Number} maxIterations - Maximum iterations
   * @returns {Object} Training result
   */
  train(observations, maxIterations = 10) {
    let prevLogLikelihood = -Infinity;
    const convergenceThreshold = 0.001;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const alpha = this.forwardMatrix(observations);
      const beta = this.backward(observations);
      
      // E-step: Calculate expected counts
      const gamma = this.calculateStateProbabilities(observations);
      const xi = this.calculateXi(observations, alpha, beta);
      
      // M-step: Update parameters
      this.updateParameters(observations, gamma, xi);
      
      // Calculate log likelihood
      const logLikelihood = Math.log(this.forward(observations));
      
      if (Math.abs(logLikelihood - prevLogLikelihood) < convergenceThreshold) {
        return {
          converged: true,
          iterations: iter + 1,
          logLikelihood
        };
      }
      
      prevLogLikelihood = logLikelihood;
    }
    
    return {
      converged: false,
      iterations: maxIterations,
      logLikelihood: prevLogLikelihood
    };
  }
  
  /**
   * Calculate xi (transition probabilities at each time)
   * @param {Array} observations - Observations
   * @param {Array} alpha - Alpha matrix
   * @param {Array} beta - Beta matrix
   * @returns {Array} Xi values
   */
  calculateXi(observations, alpha, beta) {
    const T = observations.length;
    const xi = Array(T - 1).fill(null).map(() => ({}));
    
    for (let t = 0; t < T - 1; t++) {
      const nextObs = this.classifyObservation(observations[t + 1]);
      let normalization = 0;
      
      this.states.forEach((state, i) => {
        this.states.forEach((nextState, j) => {
          normalization += alpha[t][i] * 
                          this.transitionProb[state][nextState] * 
                          this.emissionProb[nextState][nextObs] * 
                          beta[t + 1][j];
        });
      });
      
      this.states.forEach((state, i) => {
        xi[t][state] = {};
        this.states.forEach((nextState, j) => {
          xi[t][state][nextState] = (alpha[t][i] * 
                                     this.transitionProb[state][nextState] * 
                                     this.emissionProb[nextState][nextObs] * 
                                     beta[t + 1][j]) / normalization;
        });
      });
    }
    
    return xi;
  }
  
  /**
   * Update model parameters
   * @param {Array} observations - Observations
   * @param {Array} gamma - Gamma values
   * @param {Array} xi - Xi values
   */
  updateParameters(observations, gamma, xi) {
    const T = observations.length;
    
    // Update initial probabilities
    this.states.forEach(state => {
      this.initialProb[state] = gamma[0][state];
    });
    
    // Update transition probabilities
    this.states.forEach(state => {
      this.states.forEach(nextState => {
        let numerator = 0;
        let denominator = 0;
        
        for (let t = 0; t < T - 1; t++) {
          numerator += xi[t][state][nextState];
          denominator += gamma[t][state];
        }
        
        this.transitionProb[state][nextState] = numerator / denominator;
      });
    });
    
    // Update emission probabilities
    const obsCategories = ['low', 'medium', 'high'];
    this.states.forEach(state => {
      obsCategories.forEach(obs => {
        let numerator = 0;
        let denominator = 0;
        
        for (let t = 0; t < T; t++) {
          if (this.classifyObservation(observations[t]) === obs) {
            numerator += gamma[t][state];
          }
          denominator += gamma[t][state];
        }
        
        this.emissionProb[state][obs] = numerator / denominator;
      });
    });
  }
  
  /**
   * Get current state
   * @returns {String} Current state
   */
  getCurrentState() {
    return this.currentState;
  }
  
  /**
   * Get model parameters
   * @returns {Object} Parameters
   */
  getParameters() {
    return {
      initialProbabilities: this.initialProb,
      transitionProbabilities: this.transitionProb,
      emissionProbabilities: this.emissionProb
    };
  }
  
  /**
   * Set model parameters
   * @param {Object} params - Parameters
   */
  setParameters(params) {
    if (params.initialProbabilities) {
      this.initialProb = params.initialProbabilities;
    }
    if (params.transitionProbabilities) {
      this.transitionProb = params.transitionProbabilities;
    }
    if (params.emissionProbabilities) {
      this.emissionProb = params.emissionProbabilities;
    }
  }
}

// ============================================================================
// STUDENT HMM MANAGEMENT
// ============================================================================

/**
 * Get or create HMM for student
 * @param {String} studentId - Student ID
 * @returns {Promise<HiddenMarkovModel>}
 */
const getStudentHMM = async (studentId) => {
  let metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams || !metaParams.hmmParameters) {
    const hmm = new HiddenMarkovModel();
    return hmm;
  }
  
  const hmm = new HiddenMarkovModel();
  hmm.setParameters(metaParams.hmmParameters);
  hmm.currentState = metaParams.hmmCurrentState;
  
  return hmm;
};

/**
 * Save HMM state
 * @param {String} studentId - Student ID
 * @param {HiddenMarkovModel} hmm - HMM
 * @returns {Promise}
 */
const saveStudentHMM = async (studentId, hmm) => {
  const params = hmm.getParameters();
  
  await MetaParameters.findOneAndUpdate(
    { studentId },
    {
      hmmParameters: params,
      hmmCurrentState: hmm.currentState,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
};

/**
 * Predict learning state
 * @param {String} studentId - Student ID
 * @param {Array} recentScores - Recent scores
 * @returns {Promise<Object>}
 */
const predictLearningState = async (studentId, recentScores = null) => {
  const hmm = await getStudentHMM(studentId);
  
  if (!recentScores) {
    const challenges = await Challenge.find({ 
      studentId, 
      status: 'evaluated' 
    })
      .sort({ createdAt: -1 })
      .limit(10);
    
    recentScores = challenges.map(c => c.evaluation?.score || 0).reverse();
  }
  
  if (recentScores.length === 0) {
    return {
      currentState: LEARNING_STATES.LEARNING,
      confidence: 0,
      message: 'Insufficient data'
    };
  }
  
  const states = hmm.viterbi(recentScores);
  const currentState = states[states.length - 1];
  const prediction = hmm.predictNextState(currentState);
  
  hmm.currentState = currentState;
  await saveStudentHMM(studentId, hmm);
  
  return {
    currentState,
    predictedNextState: prediction.nextState,
    probability: Math.round(prediction.probability * 100) / 100,
    stateSequence: states,
    transitionProbabilities: prediction.allProbabilities
  };
};

/**
 * Train student HMM
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const trainStudentHMM = async (studentId) => {
  const challenges = await Challenge.find({ 
    studentId, 
    status: 'evaluated' 
  })
    .sort({ createdAt: 1 })
    .limit(50);
  
  if (challenges.length < 10) {
    throw new Error('Insufficient data for training (need at least 10 evaluated challenges)');
  }
  
  const scores = challenges.map(c => c.evaluation?.score || 0);
  
  const hmm = await getStudentHMM(studentId);
  const result = hmm.train(scores);
  
  await saveStudentHMM(studentId, hmm);
  
  return result;
};

/**
 * Get state probabilities over time
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getStateProbabilitiesOverTime = async (studentId) => {
  const hmm = await getStudentHMM(studentId);
  
  const challenges = await Challenge.find({ 
    studentId, 
    status: 'evaluated' 
  })
    .sort({ createdAt: 1 })
    .limit(20);
  
  if (challenges.length === 0) {
    return {
      probabilities: [],
      message: 'No data available'
    };
  }
  
  const scores = challenges.map(c => c.evaluation?.score || 0);
  const probabilities = hmm.calculateStateProbabilities(scores);
  
  return {
    probabilities: probabilities.map((prob, index) => ({
      timestamp: challenges[index].createdAt,
      score: scores[index],
      stateProbabilities: prob
    }))
  };
};

/**
 * Get HMM statistics
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getHMMStatistics = async (studentId) => {
  const metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams || !metaParams.hmmParameters) {
    return {
      initialized: false,
      message: 'No HMM data found'
    };
  }
  
  return {
    initialized: true,
    currentState: metaParams.hmmCurrentState,
    lastUpdated: metaParams.lastUpdated
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Class
  HiddenMarkovModel,
  
  // Constants
  LEARNING_STATES,
  
  // Student management
  getStudentHMM,
  saveStudentHMM,
  
  // Prediction
  predictLearningState,
  getStateProbabilitiesOverTime,
  
  // Training
  trainStudentHMM,
  
  // Statistics
  getHMMStatistics,
  
  // Configuration
  DEFAULT_CONFIG
};