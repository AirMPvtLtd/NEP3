/**
 * HIDDEN MARKOV MODEL STATE (SPI + Advanced HMM)
 * ------------------------------------------------------------
 * FIXES:
 * - studentId is STRING (domain ID, e.g. "STU-AMQZM")
 * - Removed ObjectId + ref mismatch
 * - Fully compatible with SPI pipeline
 *
 * NOTE:
 * - Advanced HMM logic retained
 * - SPI only uses currentState / transitions
 */

const mongoose = require('mongoose');
const HiddenMarkovModel = require('../algorithms/hmm.model');

const hmmStateSchema = new mongoose.Schema(
  {
    // =========================================================
    // IDENTIFIER (FIXED)
    // =========================================================
    studentId: {
      type: String,          // ✅ FIXED (was ObjectId)
      required: true,
      index: true
    },

    competency: {
      type: String,
      required: true,
      index: true
    },

    // =========================================================
    // HMM STRUCTURE
    // =========================================================
    states: [
      {
        name: String,
        id: Number
      }
    ],

    // Current belief distribution over states
    currentBelief: {
      type: Map,
      of: Number,
      default: {}
    },

    // Transition probabilities
    transitionMatrix: {
      type: [[Number]],
      required: true
    },

    // Emission probabilities
    emissionMatrix: {
      type: [[Number]],
      required: true
    },

    // Initial probabilities
    initialProbabilities: {
      type: [Number],
      required: true
    },

    // =========================================================
    // OBSERVATIONS & STATE HISTORY
    // =========================================================
    observations: [
      {
        value: Number,
        timestamp: Date,
        context: Object
      }
    ],

    stateSequence: [
      {
        state: String,
        probability: Number,
        timestamp: Date
      }
    ],

    // Viterbi path (most likely sequence)
    viterbiPath: [
      {
        state: String,
        probability: Number,
        index: Number
      }
    ],

    // =========================================================
    // PREDICTIONS
    // =========================================================
    predictions: [
      {
        nextState: String,
        probability: Number,
        timeHorizon: Number,
        timestamp: Date
      }
    ],

    // =========================================================
    // TRAINING METADATA
    // =========================================================
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
  },
  { timestamps: true }
);

// Composite index (important for performance)
hmmStateSchema.index({ studentId: 1, competency: 1 });

// ============================================================================
// ========================= ALGORITHM METHODS ================================
// ============================================================================

hmmStateSchema.methods.initializeAlgorithm = function () {
  return new HiddenMarkovModel({
    states: this.states.map(s => s.name),
    observations: this.getObservationStates(),
    transitionMatrix: this.transitionMatrix,
    emissionMatrix: this.emissionMatrix,
    initialProbabilities: this.initialProbabilities
  });
};

hmmStateSchema.methods.getObservationStates = function () {
  return ['very_low', 'low', 'medium', 'high', 'very_high'];
};

hmmStateSchema.methods.discretizeObservation = function (value) {
  if (value < 20) return 0;
  if (value < 40) return 1;
  if (value < 60) return 2;
  if (value < 80) return 3;
  return 4;
};

hmmStateSchema.methods.addObservation = async function (value, context = {}) {
  this.observations.push({
    value,
    timestamp: new Date(),
    context
  });

  const hmm = this.initializeAlgorithm();
  const obsSeq = this.observations.map(o =>
    this.discretizeObservation(o.value)
  );

  // Forward algorithm
  const forward = hmm.forward(obsSeq);
  const latest = forward.alpha[forward.alpha.length - 1];

  this.states.forEach((state, i) => {
    this.currentBelief.set(state.name, latest[i]);
  });

  // Viterbi
  const viterbi = hmm.viterbi(obsSeq);
  this.viterbiPath = viterbi.path.map((idx, i) => ({
    state: this.states[idx].name,
    probability: viterbi.probability,
    index: i
  }));

  const lastIdx = viterbi.path[viterbi.path.length - 1];
  this.stateSequence.push({
    state: this.states[lastIdx].name,
    probability: viterbi.probability,
    timestamp: new Date()
  });

  this.metadata.lastUpdated = new Date();
  this.metadata.observationCount = this.observations.length;

  return this.save();
};

// ============================================================================
// ============================ STATIC HELPERS ================================
// ============================================================================

hmmStateSchema.statics.createForCompetency = async function (
  studentId,
  competency
) {
  const states = [
    { name: 'confused', id: 0 },
    { name: 'learning', id: 1 },
    { name: 'practiced', id: 2 },
    { name: 'mastered', id: 3 }
  ];

  const transitionMatrix = [
    [0.6, 0.3, 0.08, 0.02],
    [0.1, 0.5, 0.3, 0.1],
    [0.05, 0.15, 0.6, 0.2],
    [0.02, 0.08, 0.3, 0.6]
  ];

  const emissionMatrix = [
    [0.5, 0.3, 0.15, 0.04, 0.01],
    [0.2, 0.4, 0.25, 0.1, 0.05],
    [0.05, 0.15, 0.3, 0.35, 0.15],
    [0.01, 0.04, 0.15, 0.4, 0.4]
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
    observations: [],
    stateSequence: [],
    viterbiPath: [],
    predictions: [],
    metadata: {
      lastUpdated: new Date(),
      observationCount: 0,
      convergence: 0
    }
  });
};

// ============================================================================
// EXPORT
// ============================================================================
module.exports = mongoose.model('HMMState', hmmStateSchema);
