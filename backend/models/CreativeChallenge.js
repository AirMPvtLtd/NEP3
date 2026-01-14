/**
 * CREATIVE CHALLENGE MODEL
 * Open-ended challenges with no single correct answer
 */

const mongoose = require('mongoose');

const creativeChallengeSchema = new mongoose.Schema({
  challengeId: {
    type: String,
    required: true,
    unique: true
  },
  
  title: {
    type: String,
    required: true
  },
  
  type: {
    type: String,
    required: true,
    enum: [
      'OPEN_ENDED_PROBLEM',
      'DESIGN_CHALLENGE',
      'ETHICAL_DILEMMA',
      'CREATIVE_EXPRESSION',
      'INVENTION_PROMPT',
      'SOCIAL_INNOVATION',
      'ALTERNATIVE_SOLUTION',
      'FUTURE_SCENARIO',
      'CONSTRAINT_CHALLENGE'
    ]
  },
  
  prompt: {
    type: String,
    required: true
  },
  
  context: String,
  constraints: [String],
  objectives: [String],
  
  evaluationCriteria: {
    originalityWeight: { type: Number, default: 0.30 },
    feasibilityWeight: { type: Number, default: 0.25 },
    impactWeight: { type: Number, default: 0.25 },
    clarityWeight: { type: Number, default: 0.10 },
    ethicalConsiderationWeight: { type: Number, default: 0.10 }
  },
  
  subject: [String],
  gradeLevel: [Number],
  estimatedTime: Number,
  
  difficulty: {
    type: String,
    enum: ['OPEN', 'MODERATE', 'CHALLENGING', 'ADVANCED']
  },
  
  examples: [{
    title: String,
    description: String,
    whyGood: String
  }],
  
  resources: [String],
  
  submissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreativeSubmission'
  }]
}, {
  timestamps: true
});

creativeChallengeSchema.index({ challengeId: 1 });
creativeChallengeSchema.index({ type: 1 });
creativeChallengeSchema.index({ subject: 1 });

module.exports = mongoose.model('CreativeChallenge', creativeChallengeSchema);