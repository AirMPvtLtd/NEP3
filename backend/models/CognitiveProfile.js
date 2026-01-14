/**
 * COGNITIVE PROFILE MODEL
 * Student thinking patterns and cognitive abilities
 */

const mongoose = require('mongoose');

const cognitiveProfileSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  thinkingPatterns: {
    reasoningQuality: { type: Number, min: 0, max: 1 },
    confidenceAlignment: { type: Number, min: 0, max: 1 },
    
    conceptualConnections: [String],
    misconceptions: [String],
    problemSolvingStrategy: String,
    alternativeApproaches: [String],
    
    selfCorrectionAttempts: { type: Number, default: 0 },
    hesitationPoints: [Number],
    confusionIndicators: [String],
    
    cognitiveLoad: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH', 'OVERLOAD']
    },
    mentalEffort: { type: Number, min: 0, max: 1 },
    
    metacognition: {
      selfAwareness: { type: Number, min: 0, max: 1 },
      strategyAdaptation: { type: Number, min: 0, max: 1 },
      errorRecognition: { type: Number, min: 0, max: 1 }
    }
  },
  
  writingAnalysis: {
    sentenceComplexity: {
      type: String,
      enum: ['SIMPLE', 'MEDIUM', 'COMPLEX']
    },
    vocabularyLevel: String,
    technicalTermsUsed: [String],
    logicalConnectors: [String],
    uncertaintyIndicators: [String],
    confidenceIndicators: [String]
  },
  
  timeAnalysis: {
    totalTime: Number,
    thinkingTime: Number,
    pausePattern: [Number],
    rushingDetected: Boolean,
    optimalPaceScore: { type: Number, min: 0, max: 1 },
    timeDistribution: {
      reading: Number,
      thinking: Number,
      writing: Number,
      verification: Number
    }
  },
  
  emotionalIndicators: {
    frustrationPoints: [Number],
    confidenceProgression: [Number],
    stressLevel: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH']
    },
    engagementLevel: {
      type: String,
      enum: ['LOW', 'MODERATE', 'HIGH']
    }
  }
}, {
  timestamps: true
});

cognitiveProfileSchema.index({ studentId: 1, timestamp: -1 });
cognitiveProfileSchema.index({ studentId: 1, challengeId: 1 });

module.exports = mongoose.model('CognitiveProfile', cognitiveProfileSchema);