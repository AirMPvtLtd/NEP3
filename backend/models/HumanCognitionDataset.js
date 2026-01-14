/**
 * HUMAN COGNITION DATASET MODEL
 * AI alignment training data - captures authentic human thinking
 */

const mongoose = require('mongoose');

const humanCognitionDatasetSchema = new mongoose.Schema({
  datasetId: {
    type: String,
    required: true,
    unique: true
  },
  
  purpose: {
    type: String,
    default: 'AI_ALIGNMENT_TRAINING'
  },
  
  studentId: {
    type: String, // Anonymized hash
    required: true
  },
  
  demographicContext: {
    gradeLevel: Number,
    subject: String,
    priorKnowledgeLevel: Number,
    learningState: String
  },
  
  problemContext: {
    simulation: String,
    topic: String,
    difficulty: Number,
    bloomLevel: String,
    realWorldContext: Boolean
  },
  
  humanThinkingData: {
    initialApproach: {
      strategy: String,
      priorKnowledgeActivated: [String],
      hypothesisFormed: String,
      plannedSteps: [String]
    },
    
    explorationJourney: [{
      step: Number,
      action: String,
      reasoning: String,
      expectation: String,
      cognitiveProcess: String
    }],
    
    reasoningNarratives: [{
      questionIndex: Number,
      fullText: String,
      analyzedStructure: {
        introduction: String,
        methodology: String,
        observation: String,
        verification: String,
        calculation: String,
        conclusion: String
      },
      logicalFlow: String,
      argumentation: String,
      certaintyProgression: [Number],
      keyInsights: [String]
    }],
    
    conceptualModel: {
      concepts: {
        type: Map,
        of: {
          understanding: Number,
          representation: String,
          keyProperties: [String],
          relationships: Map,
          misconceptions_corrected: [String]
        }
      },
      mentalModels: {
        type: Map,
        of: {
          type: String,
          accuracy: String,
          description: String
        }
      }
    },
    
    strategiesUsed: [{
      strategy: String,
      description: String,
      effectiveness: String,
      whenUsed: String
    }],
    
    metacognitivePatterns: {
      planning: {
        evident: Boolean,
        quality: String,
        example: String
      },
      monitoring: {
        evident: Boolean,
        quality: String,
        example: String
      },
      evaluation: {
        evident: Boolean,
        quality: String,
        example: String
      },
      regulation: {
        evident: Boolean,
        example: String
      },
      selfAwareness: {
        level: String,
        indicators: [String]
      }
    },
    
    learningBehaviors: {
      curiosityIndicators: [String],
      persistenceIndicators: [String],
      reflectionIndicators: [String],
      adaptationIndicators: [String]
    },
    
    errorRecovery: {
      initialMisconceptions: [String],
      howCorrected: [String],
      correctionQuality: String,
      timeToCorrection: Number,
      correctionPermanence: String
    },
    
    communicationStyle: {
      clarityScore: Number,
      technicalLanguageUse: String,
      logicalStructure: String,
      evidenceUsage: String,
      exampleQuality: String,
      visualizationDescription: String,
      uncertaintyExpression: String,
      confidenceCalibration: String
    },
    
    cognitiveLoadIndicators: {
      overallLoad: String,
      managementStrategies: [String],
      workingMemoryUsage: String,
      attentionAllocation: String,
      mentalEffort: Number
    }
  },
  
  simulationBehavior: {
    toolMastery: Number,
    explorationStyle: String,
    dataCollectionQuality: String,
    experimentalDesignSkill: Number,
    observationAccuracy: Number,
    patternRecognition: String,
    transferAbility: String
  },
  
  aiAlignmentLabels: {
    idealHumanQualities: [String],
    
    thinkingProcessToEmulate: {
      approach: String,
      keySteps: [String],
      whenToUse: String,
      expectedOutcome: String
    },
    
    qualityIndicators: {
      rigor: Number,
      creativity: Number,
      practicality: Number,
      clarity: Number,
      thoroughness: Number,
      adaptability: Number,
      selfAwareness: Number
    }
  },
  
  collectionMetadata: {
    collectedAt: { type: Date, default: Date.now },
    anonymized: { type: Boolean, default: true },
    consentObtained: { type: Boolean, default: true },
    researchPurpose: String,
    dataQuality: String,
    completeness: Number,
    validationStatus: String
  },
  
  aiTrainingFormat: {
    input: {
      problem: String,
      context: String,
      tools: [String],
      priorKnowledge: String
    },
    humanThinkingProcess: {
      steps: [String],
      reasoning: String,
      strategies: [String],
      metacognition: Object
    },
    output: {
      answer: String,
      explanation: String,
      confidence: Number,
      verification: String
    },
    quality_scores: {
      understanding: Number,
      rigor: Number,
      clarity: Number
    }
  }
}, {
  timestamps: true
});

humanCognitionDatasetSchema.index({ studentId: 1 });
humanCognitionDatasetSchema.index({ 'collectionMetadata.collectedAt': -1 });
humanCognitionDatasetSchema.index({ 'demographicContext.subject': 1 });
humanCognitionDatasetSchema.index({ 'problemContext.simulation': 1 });
humanCognitionDatasetSchema.index({ 'collectionMetadata.dataQuality': 1 });

module.exports = mongoose.model('HumanCognitionDataset', humanCognitionDatasetSchema);