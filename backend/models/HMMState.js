/**
 * HIDDEN MARKOV MODEL STATE (Enhanced with Algorithm)
 * Uses algorithms/hmm.model.js for inference
 */

const mongoose = require('mongoose');
const HiddenMarkovModel = require('../algorithms/hmm.model');

const hmmStateSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  competency: {
    type: String,
    required: true,
    index: true
  },
  
  // HMM parameters
  states: [{
    name: String,
    id: Number
  }],
  
  // Current state belief
  currentBelief: {
    type: Map,
    of: Number
  },
  
  // Transition matrix
  transitionMatrix: [[Number]],
  
  // Emission matrix
  emissionMatrix: [[Number]],
  
  // Initial probabilities
  initialProbabilities: [Number],
  
  // Observation sequence
  observations: [{
    value: Number,
    timestamp: Date,
    context: Object
  }],
  
  // State sequence
  stateSequence: [{
    state: String,
    probability: Number,
    timestamp: Date
  }],
  
  // ✅ NEW: Algorithm results
  viterbiPath: [{
    state: String,
    probability: Number,
    index: Number
  }],
  
  // Predictions
  predictions: [{
    nextState: String,
    probability: Number,
    timeHorizon: Number,
    timestamp: Date
  }],
  
  // ✅ NEW: Training metadata
  trainingMetadata: {
    lastTrained: Date,
    iterations: Number,
    logLikelihood: Number,
    converged: Boolean
  },
  
  metadata: {
    lastUpdated: Date,
    observationCount: Number,
    convergence: Number
  }
  
}, {
  timestamps: true
});

// Indexes
hmmStateSchema.index({ studentId: 1, competency: 1 });

// ============================================================================
// METHODS (Enhanced with Algorithm)
// ============================================================================

/**
 * Initialize HMM algorithm
 */
hmmStateSchema.methods.initializeAlgorithm = function() {
  const hmm = new HiddenMarkovModel({
    states: this.states.map(s => s.name),
    observations: this.getObservationStates(),
    transitionMatrix: this.transitionMatrix,
    emissionMatrix: this.emissionMatrix,
    initialProbabilities: this.initialProbabilities
  });
  
  return hmm;
};

/**
 * Get observation states (discretize continuous observations)
 */
hmmStateSchema.methods.getObservationStates = function() {
  // Discretize scores into bins
  return ['very_low', 'low', 'medium', 'high', 'very_high'];
};

/**
 * Discretize observation value
 */
hmmStateSchema.methods.discretizeObservation = function(value) {
  if (value < 20) return 0; // very_low
  if (value < 40) return 1; // low
  if (value < 60) return 2; // medium
  if (value < 80) return 3; // high
  return 4; // very_high
};

/**
 * Add observation (enhanced with algorithm)
 */
hmmStateSchema.methods.addObservation = async function(observationValue, context = {}) {
  // Add to observations
  this.observations.push({
    value: observationValue,
    timestamp: new Date(),
    context
  });
  
  // ✅ NEW: Use algorithm for forward pass
  const hmm = this.initializeAlgorithm();
  
  // Get observation sequence
  const obsSequence = this.observations.map(o => 
    this.discretizeObservation(o.value)
  );
  
  // Forward algorithm to update beliefs
  const forwardResult = hmm.forward(obsSequence);
  
  // Update current belief
  const latestBelief = forwardResult.alpha[forwardResult.alpha.length - 1];
  this.states.forEach((state, i) => {
    this.currentBelief.set(state.name, latestBelief[i]);
  });
  
  // ✅ NEW: Viterbi algorithm for most likely path
  const viterbiResult = hmm.viterbi(obsSequence);
  
  // Update Viterbi path
  this.viterbiPath = viterbiResult.path.map((stateIndex, i) => ({
    state: this.states[stateIndex].name,
    probability: viterbiResult.probability,
    index: i
  }));
  
  // Update state sequence with most likely current state
  const mostLikelyState = viterbiResult.path[viterbiResult.path.length - 1];
  this.stateSequence.push({
    state: this.states[mostLikelyState].name,
    probability: viterbiResult.probability,
    timestamp: new Date()
  });
  
  this.metadata.lastUpdated = new Date();
  this.metadata.observationCount = this.observations.length;
  
  return this.save();
};

/**
 * Train HMM parameters (Baum-Welch algorithm)
 */
hmmStateSchema.methods.train = async function(maxIterations = 100, tolerance = 1e-6) {
  try {
    if (this.observations.length < 10) {
      return {
        trained: false,
        reason: 'Insufficient data (need at least 10 observations)'
      };
    }
    
    const hmm = this.initializeAlgorithm();
    
    // Get observation sequence
    const obsSequence = this.observations.map(o => 
      this.discretizeObservation(o.value)
    );
    
    // ✅ NEW: Baum-Welch training
    const trainingResult = hmm.baumWelch(obsSequence, {
      maxIterations,
      tolerance
    });
    
    // Update parameters
    this.transitionMatrix = trainingResult.transitionMatrix;
    this.emissionMatrix = trainingResult.emissionMatrix;
    this.initialProbabilities = trainingResult.initialProbabilities;
    
    // Update training metadata
    this.trainingMetadata = {
      lastTrained: new Date(),
      iterations: trainingResult.iterations,
      logLikelihood: trainingResult.logLikelihood,
      converged: trainingResult.converged
    };
    
    await this.save();
    
    return {
      trained: true,
      iterations: trainingResult.iterations,
      logLikelihood: trainingResult.logLikelihood,
      converged: trainingResult.converged
    };
    
  } catch (error) {
    console.error('HMM training error:', error);
    return {
      trained: false,
      error: error.message
    };
  }
};

/**
 * Predict next state
 */
hmmStateSchema.methods.predict = async function(timeHorizon = 1) {
  const hmm = this.initializeAlgorithm();
  
  // Get current state distribution
  const currentBelief = Array.from(this.currentBelief.values());
  
  // Predict future state
  let futureProbs = currentBelief;
  
  for (let t = 0; t < timeHorizon; t++) {
    // Matrix multiplication: futureProbs * transitionMatrix
    const newProbs = [];
    for (let i = 0; i < this.states.length; i++) {
      let prob = 0;
      for (let j = 0; j < this.states.length; j++) {
        prob += futureProbs[j] * this.transitionMatrix[j][i];
      }
      newProbs.push(prob);
    }
    futureProbs = newProbs;
  }
  
  // Find most likely state
  const maxProb = Math.max(...futureProbs);
  const maxIndex = futureProbs.indexOf(maxProb);
  
  const prediction = {
    nextState: this.states[maxIndex].name,
    probability: maxProb,
    distribution: futureProbs,
    timeHorizon
  };
  
  // Store prediction
  this.predictions.push({
    nextState: prediction.nextState,
    probability: prediction.probability,
    timeHorizon,
    timestamp: new Date()
  });
  
  await this.save();
  
  return prediction;
};

/**
 * Get state probabilities using forward-backward
 */
hmmStateSchema.methods.getStateProbabilities = async function() {
  const hmm = this.initializeAlgorithm();
  
  const obsSequence = this.observations.map(o => 
    this.discretizeObservation(o.value)
  );
  
  // ✅ NEW: Forward-backward algorithm
  const fbResult = hmm.forwardBackward(obsSequence);
  
  // Return smoothed probabilities for each time step
  return fbResult.gamma.map((probs, t) => ({
    timestamp: this.observations[t].timestamp,
    probabilities: this.states.reduce((obj, state, i) => {
      obj[state.name] = probs[i];
      return obj;
    }, {}),
    mostLikely: this.states[probs.indexOf(Math.max(...probs))].name
  }));
};

/**
 * Detect state transitions
 */
hmmStateSchema.methods.detectTransitions = function() {
  const transitions = [];
  
  for (let i = 1; i < this.stateSequence.length; i++) {
    const prevState = this.stateSequence[i - 1].state;
    const currState = this.stateSequence[i].state;
    
    if (prevState !== currState) {
      transitions.push({
        from: prevState,
        to: currState,
        timestamp: this.stateSequence[i].timestamp,
        probability: this.stateSequence[i].probability
      });
    }
  }
  
  return transitions;
};

/**
 * Get learning trajectory
 */
hmmStateSchema.methods.getLearningTrajectory = function() {
  // Analyze state sequence for learning patterns
  const stateCounts = {};
  const stateOrder = ['confused', 'learning', 'practiced', 'mastered'];
  
  this.stateSequence.forEach(s => {
    stateCounts[s.state] = (stateCounts[s.state] || 0) + 1;
  });
  
  // Determine overall trend
  const recentStates = this.stateSequence.slice(-10);
  const avgRecentState = recentStates.reduce((sum, s) => {
    const index = stateOrder.indexOf(s.state);
    return sum + (index >= 0 ? index : 0);
  }, 0) / recentStates.length;
  
  const olderStates = this.stateSequence.slice(0, 10);
  const avgOlderState = olderStates.reduce((sum, s) => {
    const index = stateOrder.indexOf(s.state);
    return sum + (index >= 0 ? index : 0);
  }, 0) / olderStates.length;
  
  let trend;
  if (avgRecentState > avgOlderState + 0.5) {
    trend = 'improving';
  } else if (avgRecentState < avgOlderState - 0.5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }
  
  return {
    trend,
    currentState: recentStates[recentStates.length - 1]?.state,
    stateCounts,
    transitions: this.detectTransitions(),
    viterbiPath: this.viterbiPath
  };
};

// ============================================================================
// STATIC METHODS (Enhanced)
// ============================================================================

/**
 * Create HMM for competency
 */
hmmStateSchema.statics.createForCompetency = async function(studentId, competency) {
  // Default states and parameters
  const states = [
    { name: 'confused', id: 0 },
    { name: 'learning', id: 1 },
    { name: 'practiced', id: 2 },
    { name: 'mastered', id: 3 }
  ];
  
  // Transition matrix (tendency to improve)
  const transitionMatrix = [
    [0.6, 0.3, 0.08, 0.02], // from confused
    [0.1, 0.5, 0.3, 0.1],   // from learning
    [0.05, 0.15, 0.6, 0.2], // from practiced
    [0.02, 0.08, 0.3, 0.6]  // from mastered
  ];
  
  // Emission matrix (likelihood of scores given state)
  const emissionMatrix = [
    [0.5, 0.3, 0.15, 0.04, 0.01], // confused: mostly low scores
    [0.2, 0.4, 0.25, 0.1, 0.05],  // learning
    [0.05, 0.15, 0.3, 0.35, 0.15], // practiced
    [0.01, 0.04, 0.15, 0.4, 0.4]  // mastered: mostly high scores
  ];
  
  const initialProbabilities = [0.7, 0.2, 0.08, 0.02];
  
  const currentBelief = new Map([
    ['confused', 0.7],
    ['learning', 0.2],
    ['practiced', 0.08],
    ['mastered', 0.02]
  ]);
  
  return this.create({
    studentId,
    competency,
    states,
    currentBelief,
    transitionMatrix,
    emissionMatrix,
    initialProbabilities,
    viterbiPath: [],
    observations: [],
    stateSequence: [],
    predictions: [],
    metadata: {
      lastUpdated: new Date(),
      observationCount: 0,
      convergence: 0
    }
  });
};

module.exports = mongoose.model('HMMState', hmmStateSchema);