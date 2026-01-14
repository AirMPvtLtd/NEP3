/**
 * SIMULATION SESSION MODEL
 * Tracks student interaction with simulations
 */

const mongoose = require('mongoose');

const simulationSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  simulationId: {
    type: String,
    required: true
  },
  
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  },
  
  startedAt: {
    type: Date,
    default: Date.now
  },
  
  endedAt: Date,
  
  totalInteractionTime: Number,
  
  interactions: [{
    timestamp: Number,
    action: String,
    value: mongoose.Schema.Types.Mixed,
    toolUsed: String,
    duration: Number,
    reasoning: String,
    observedResult: mongoose.Schema.Types.Mixed
  }],
  
  usagePatterns: {
    toolsUsed: [String],
    mostUsedTool: String,
    toolSwitchingFrequency: Number,
    explorationStrategy: String,
    selfCorrectionCount: Number,
    
    hypothesisTesting: [{
      hypothesis: String,
      tested: Boolean,
      result: String
    }],
    
    visualizationUsage: {
      trajectoryViewTime: Number,
      dataDisplayViewTime: Number,
      graphAnalysisTime: Number
    }
  },
  
  engagementMetrics: {
    pauseDurations: [Number],
    rapidActionBursts: Number,
    systematicTesting: Boolean,
    randomExploration: Boolean,
    focusedProblemSolving: Boolean,
    frustrationIndicators: Number,
    ahaMoments: [{
      timestamp: Number,
      indicator: String
    }]
  }
}, {
  timestamps: true
});

simulationSessionSchema.index({ studentId: 1, startedAt: -1 });
simulationSessionSchema.index({ simulationId: 1 });
simulationSessionSchema.index({ challengeId: 1 });

module.exports = mongoose.model('SimulationSession', simulationSessionSchema);