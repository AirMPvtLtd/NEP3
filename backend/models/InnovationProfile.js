/**
 * INNOVATION PROFILE MODEL
 * Tracks student innovation potential and predictions
 */

const mongoose = require('mongoose');

const innovationProfileSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
    index: true
  },
  
  baselineAssessment: {
    completedAt: { type: Date, default: Date.now },
    
    thinkingIndicators: {
      divergentThinking: {
        score: { type: Number, min: 0, max: 1 },
        evidence: [String],
        frequency: Number
      },
      convergentThinking: {
        score: { type: Number, min: 0, max: 1 },
        evidence: [String],
        frequency: Number
      },
      lateralThinking: {
        score: { type: Number, min: 0, max: 1 },
        evidence: [String],
        examples: [String]
      },
      ambiguityTolerance: {
        score: { type: Number, min: 0, max: 1 },
        evidence: [String],
        openEndedProblemComfort: Number
      },
      intellectualRiskTaking: {
        score: { type: Number, min: 0, max: 1 },
        novelApproachFrequency: Number,
        failureRecoverySpeed: Number
      },
      questionGenerationAbility: {
        score: { type: Number, min: 0, max: 1 },
        questionsAsked: Number,
        questionQuality: Number,
        examples: [String]
      },
      perspectiveTaking: {
        score: { type: Number, min: 0, max: 1 },
        viewpointsConsidered: Number,
        examples: [String]
      },
      patternRecognition: {
        score: { type: Number, min: 0, max: 1 },
        uniquePatternsIdentified: [String],
        abstractionAbility: Number
      },
      conceptualCombination: {
        score: { type: Number, min: 0, max: 1 },
        novelCombinations: [String],
        examples: [String]
      },
      intellectualCuriosity: {
        score: { type: Number, min: 0, max: 1 },
        deepDiveFrequency: Number,
        beyondRequirementExploration: Number,
        voluntaryLearning: Boolean
      }
    },
    
    behavioralIndicators: {
      persistence: {
        score: { type: Number, min: 0, max: 1 },
        averageAttemptsBeforeGivingUp: Number,
        hardProblemCompletionRate: Number
      },
      selfDirection: {
        score: { type: Number, min: 0, max: 1 },
        initiatesOwnProjects: Boolean,
        externalMotivation: Number,
        autonomyLevel: Number
      },
      collaboration: {
        score: { type: Number, min: 0, max: 1 },
        ideaSharing: Number,
        buildOnOthersIdeas: Number,
        leadershipInGroups: Boolean
      },
      growthMindset: {
        score: { type: Number, min: 0, max: 1 },
        failureResponse: String,
        challengeSeeking: Boolean,
        effortAttribution: String
      }
    },
    
    ethicalIndicators: {
      consequenceAwareness: {
        score: { type: Number, min: 0, max: 1 },
        considersSecondOrderEffects: Boolean,
        stakeholderAwareness: Number
      },
      moralImagination: {
        score: { type: Number, min: 0, max: 1 },
        considersDifferentScenarios: Boolean,
        ethicalCreativity: Number
      },
      valueConsistency: {
        score: { type: Number, min: 0, max: 1 },
        consistentPrinciples: Boolean,
        flexibleYetPrincipled: Number
      }
    },
    
    creativeIndicators: {
      originality: {
        score: { type: Number, min: 0, max: 1 },
        uniqueSolutionFrequency: Number,
        noveltyRating: Number
      },
      fluency: {
        score: { type: Number, min: 0, max: 1 },
        ideasPerChallenge: Number,
        explorationBreadth: Number
      },
      flexibility: {
        score: { type: Number, min: 0, max: 1 },
        strategyVariety: Number,
        adaptationSpeed: Number
      },
      elaboration: {
        score: { type: Number, min: 0, max: 1 },
        detailLevel: Number,
        developmentDepth: Number
      }
    }
  },
  
  innovationPotentialScore: {
    overall: { type: Number, min: 0, max: 100, required: true },
    components: {
      cognitiveScore: Number,
      behavioralScore: Number,
      ethicalScore: Number,
      creativeScore: Number
    },
    percentile: Number,
    confidence: { type: Number, min: 0, max: 1 },
    calculatedAt: { type: Date, default: Date.now }
  },
  
  innovationPrediction: {
    predictedToInnovate: { type: Boolean, required: true },
    predictionConfidence: { type: Number, min: 0, max: 1 },
    expectedTimeframe: {
      type: String,
      enum: ['3_MONTHS', '6_MONTHS', '12_MONTHS', '24_MONTHS', '5_YEARS'],
      default: '12_MONTHS'
    },
    likelyInnovationTypes: [{
      type: String,
      enum: [
        'SCIENTIFIC_DISCOVERY',
        'TECHNICAL_INVENTION',
        'ARTISTIC_CREATION',
        'SOCIAL_INNOVATION',
        'BUSINESS_INNOVATION',
        'EDUCATIONAL_METHOD',
        'PROBLEM_SOLVING_APPROACH'
      ]
    }],
    strengthAreas: [String],
    developmentNeeds: [String],
    predictionMadeAt: { type: Date, default: Date.now }
  },
  
  validationStatus: {
    validated: { type: Boolean, default: false },
    validatedAt: Date,
    actuallyInnovated: Boolean,
    innovationsAchieved: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InnovationEvent'
    }],
    predictionAccuracy: {
      type: String,
      enum: ['CORRECT', 'INCORRECT', 'PARTIALLY_CORRECT', 'TOO_EARLY']
    },
    timingAccuracy: {
      type: String,
      enum: ['ON_TIME', 'EARLY', 'LATE', 'NEVER']
    },
    typeAccuracy: String,
    notes: String
  },
  
  trackingHistory: [{
    checkInDate: Date,
    innovationsSinceLastCheckIn: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InnovationEvent'
    }],
    innovationPotentialScore: Number,
    changesObserved: [String],
    newIndicatorsDetected: [String],
    growthAreas: [String],
    interventionsApplied: [String],
    nextCheckInScheduled: Date
  }],
  
  externalData: {
    scienceFairParticipation: [{
      event: String,
      date: Date,
      award: String,
      projectTitle: String,
      innovationDetected: Boolean
    }],
    competitions: [{
      name: String,
      date: Date,
      placement: String,
      category: String
    }],
    publications: [{
      title: String,
      venue: String,
      date: Date,
      coAuthors: [String]
    }],
    patents: [{
      title: String,
      applicationDate: Date,
      patentNumber: String
    }],
    openSourceContributions: [{
      project: String,
      contribution: String,
      date: Date,
      impact: String
    }],
    hackathons: [{
      name: String,
      date: Date,
      project: String,
      award: String
    }],
    makerProjects: [{
      title: String,
      date: Date,
      description: String,
      exhibited: Boolean
    }],
    onlinePresence: [{
      platform: String,
      content: String,
      url: String,
      date: Date,
      engagement: Number
    }]
  },
  
  cohortInfo: {
    cohortId: String,
    enrollmentDate: Date,
    trackingDuration: String,
    controlGroup: Boolean
  },
  
  algorithmLearning: {
    initialConfidence: Number,
    confidenceHistory: [{
      date: Date,
      confidence: Number,
      reason: String
    }],
    currentConfidence: Number,
    featuresImportance: Map
  }
}, {
  timestamps: true
});

innovationProfileSchema.index({ studentId: 1 });
innovationProfileSchema.index({ 'innovationPotentialScore.overall': -1 });
innovationProfileSchema.index({ 'innovationPrediction.predictedToInnovate': 1 });
innovationProfileSchema.index({ 'validationStatus.validated': 1 });
innovationProfileSchema.index({ 'cohortInfo.cohortId': 1 });

innovationProfileSchema.methods.calculateInnovationScore = function() {
  const indicators = this.baselineAssessment.thinkingIndicators;
  const behavioral = this.baselineAssessment.behavioralIndicators;
  const ethical = this.baselineAssessment.ethicalIndicators;
  const creative = this.baselineAssessment.creativeIndicators;
  
  const cognitiveScore = (
    (indicators.divergentThinking?.score || 0) * 0.15 +
    (indicators.lateralThinking?.score || 0) * 0.15 +
    (indicators.patternRecognition?.score || 0) * 0.15 +
    (indicators.conceptualCombination?.score || 0) * 0.15 +
    (indicators.ambiguityTolerance?.score || 0) * 0.10 +
    (indicators.intellectualRiskTaking?.score || 0) * 0.10 +
    (indicators.questionGenerationAbility?.score || 0) * 0.10 +
    (indicators.perspectiveTaking?.score || 0) * 0.10
  ) * 100;
  
  const behavioralScore = (
    (behavioral.persistence?.score || 0) * 0.30 +
    (behavioral.selfDirection?.score || 0) * 0.30 +
    (behavioral.growthMindset?.score || 0) * 0.25 +
    (behavioral.collaboration?.score || 0) * 0.15
  ) * 100;
  
  const ethicalScore = (
    (ethical.consequenceAwareness?.score || 0) * 0.40 +
    (ethical.moralImagination?.score || 0) * 0.35 +
    (ethical.valueConsistency?.score || 0) * 0.25
  ) * 100;
  
  const creativeScore = (
    (creative.originality?.score || 0) * 0.30 +
    (creative.fluency?.score || 0) * 0.25 +
    (creative.flexibility?.score || 0) * 0.25 +
    (creative.elaboration?.score || 0) * 0.20
  ) * 100;
  
  const overall = (
    cognitiveScore * 0.35 +
    behavioralScore * 0.25 +
    ethicalScore * 0.15 +
    creativeScore * 0.25
  );
  
  this.innovationPotentialScore = {
    overall,
    components: { cognitiveScore, behavioralScore, ethicalScore, creativeScore },
    confidence: 0.75,
    calculatedAt: Date.now()
  };
  
  return this.innovationPotentialScore;
};

innovationProfileSchema.statics.getHighPotentialStudents = async function(threshold = 75) {
  return await this.find({
    'innovationPotentialScore.overall': { $gte: threshold },
    'validationStatus.validated': false
  }).populate('studentId');
};

module.exports = mongoose.model('InnovationProfile', innovationProfileSchema);