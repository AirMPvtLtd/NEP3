/**
 * HMM STATE MODEL
 * Hidden Markov Model for learning state transitions
 */

const mongoose = require('mongoose');

const hmmStateSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  
  currentState: {
    type: String,
    enum: ['STRUGGLING', 'LEARNING', 'MASTERING', 'EXPERT'],
    default: 'LEARNING'
  },
  
  transitionMatrix: {
    type: Map,
    of: Map,
    default: () => new Map([
      ['STRUGGLING', new Map([
        ['STRUGGLING', 0.4], ['LEARNING', 0.5], ['MASTERING', 0.1], ['EXPERT', 0.0]
      ])],
      ['LEARNING', new Map([
        ['STRUGGLING', 0.2], ['LEARNING', 0.5], ['MASTERING', 0.25], ['EXPERT', 0.05]
      ])],
      ['MASTERING', new Map([
        ['STRUGGLING', 0.1], ['LEARNING', 0.2], ['MASTERING', 0.5], ['EXPERT', 0.2]
      ])],
      ['EXPERT', new Map([
        ['STRUGGLING', 0.05], ['LEARNING', 0.15], ['MASTERING', 0.3], ['EXPERT', 0.5]
      ])]
    ])
  },
  
  emissionMatrix: {
    type: Map,
    of: Map,
    default: () => new Map()
  },
  
  stateHistory: [{
    state: String,
    timestamp: Date,
    evidence: {
      score: Number,
      timeSpent: Number,
      difficulty: Number
    }
  }],
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

hmmStateSchema.index({ studentId: 1 });

module.exports = mongoose.model('HMMState', hmmStateSchema);