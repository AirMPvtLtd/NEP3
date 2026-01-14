/**
 * ETHICAL DILEMMA MODEL
 * Challenges for ethical reasoning assessment
 */

const mongoose = require('mongoose');

const ethicalDilemmaSchema = new mongoose.Schema({
  dilemmaId: {
    type: String,
    required: true,
    unique: true
  },
  
  title: {
    type: String,
    required: true
  },
  
  scenario: {
    type: String,
    required: true
  },
  
  context: {
    setting: String,
    stakeholders: [String],
    timeframe: String,
    constraints: [String]
  },
  
  conflictingValues: [String],
  perspectivesToConsider: [String],
  complicatingFactors: [String],
  
  evaluationCriteria: {
    considerationOfPerspectives: Boolean,
    logicalCoherence: Boolean,
    ethicalPrinciplesApplied: Boolean,
    consequencesConsidered: Boolean,
    nuanceRecognized: Boolean,
    tradeoffsAcknowledged: Boolean
  },
  
  subject: [String],
  realWorld: Boolean,
  
  complexity: {
    type: String,
    enum: ['SIMPLE', 'MODERATE', 'COMPLEX', 'HIGHLY_COMPLEX']
  },
  
  topics: [String],
  
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EthicalSubmission'
  }]
}, {
  timestamps: true
});

ethicalDilemmaSchema.index({ dilemmaId: 1 });
ethicalDilemmaSchema.index({ complexity: 1 });
ethicalDilemmaSchema.index({ topics: 1 });

module.exports = mongoose.model('EthicalDilemma', ethicalDilemmaSchema);