/**
 * BAYESIAN NETWORK MODEL
 * Probabilistic inference for student understanding
 */

const mongoose = require('mongoose');

const bayesianNetworkSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  
  nodes: {
    priorKnowledge: { probability: { type: Number, default: 0.5 } },
    studyTime: { probability: { type: Number, default: 0.5 } },
    attentionLevel: { probability: { type: Number, default: 0.5 } },
    understanding: { 
      probability: { type: Number, default: 0.5 },
      parents: { type: [String], default: ['priorKnowledge', 'studyTime', 'attentionLevel'] }
    },
    performance: {
      probability: { type: Number, default: 0.5 },
      parents: { type: [String], default: ['understanding'] }
    }
  },
  
  cpt: {
    type: Map,
    of: Object,
    default: () => new Map()
  },
  
  evidence: {
    type: Map,
    of: Number,
    default: () => new Map()
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

bayesianNetworkSchema.index({ studentId: 1 });

module.exports = mongoose.model('BayesianNetwork', bayesianNetworkSchema);