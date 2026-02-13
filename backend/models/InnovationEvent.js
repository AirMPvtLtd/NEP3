/**
 * INNOVATION EVENT MODEL
 * Logs actual innovations achieved by students
 */

const mongoose = require('mongoose');

const innovationEventSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  eventType: {
    type: String,
    required: true,
    enum: [
      'SCIENTIFIC_DISCOVERY',
      'TECHNICAL_INVENTION',
      'ARTISTIC_CREATION',
      'SOCIAL_INNOVATION',
      'BUSINESS_INNOVATION',
      'EDUCATIONAL_METHOD',
      'PROBLEM_SOLVING_APPROACH',
      'CREATIVE_WORK',
      'PUBLICATION',
      'PATENT',
      'OPEN_SOURCE_PROJECT',
      'COMPETITION_WIN',
      'HACKATHON_PROJECT',
      'MAKER_PROJECT',
      'RESEARCH_CONTRIBUTION',
      'STARTUP_LAUNCH',
      'COMMUNITY_INITIATIVE'
    ]
  },
  
  title: { type: String, required: true },
  description: { type: String, required: true },
  occurredAt: { type: Date, required: true },
  detectedAt: { type: Date, default: Date.now },
  
  innovationQuality: {
    novelty: { type: Number, min: 0, max: 10, required: true },
    impact: { type: Number, min: 0, max: 10, required: true },
    complexity: { type: Number, min: 0, max: 10, required: true },
    scalability: { type: Number, min: 0, max: 10 },
    sustainability: { type: Number, min: 0, max: 10 },
    overallScore: { type: Number, min: 0, max: 10 }
  },
  
  evidence: {
    sourceType: {
      type: String,
      enum: ['SELF_REPORTED', 'TEACHER_VERIFIED', 'COMPETITION_RESULT', 
             'PUBLICATION', 'PATENT', 'EXTERNAL_RECOGNITION', 'PLATFORM_DATA']
    },
    sourceUrl: String,
    documentation: [String],
    awards: [String],
    recognition: [String],
    mediaLinks: [String],
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    verificationDate: Date
  },
  
  connectionToBaseline: {
    predictedBySystem: Boolean,
    matchedPredictionType: Boolean,
    indicatorsEvident: [String],
    thinkingPatternsUsed: [String],
    skillsApplied: [String],
    conceptsLeveraged: [String]
  },
  
  aiAlignmentValue: {
    usefulForTraining: { type: Boolean, default: true },
    exemplifiesIdealThinking: Boolean,
    showsRealWorldApplication: Boolean,
    demonstratesEthicalConsideration: Boolean,
    illustratesCreativeProcess: Boolean
  },
  
  collaborators: [String],
  mentor: String,
  duration: String,
  resources: [String],
  obstacles: [String],
  learningPoints: [String],
  nextSteps: String
}, {
  timestamps: true
});

innovationEventSchema.index({ studentId: 1, occurredAt: -1 });
innovationEventSchema.index({ eventType: 1 });
innovationEventSchema.index({ 'innovationQuality.overallScore': -1 });
innovationEventSchema.index({ 'connectionToBaseline.predictedBySystem': 1 });

innovationEventSchema.pre('save', function () {

  if (this.innovationQuality) {
    const { novelty, impact, complexity, scalability, sustainability } = this.innovationQuality;

    this.innovationQuality.overallScore =
      novelty * 0.30 +
      impact * 0.30 +
      complexity * 0.20 +
      (scalability || 5) * 0.10 +
      (sustainability || 5) * 0.10;
  }

});


module.exports = mongoose.model('InnovationEvent', innovationEventSchema);