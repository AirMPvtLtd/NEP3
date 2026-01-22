// models/SimulationSession.js
/**
 * SIMULATION SESSION MODEL
 * Tracks active simulation sessions with state persistence
 * 
 * @module models/SimulationSession
 */

const mongoose = require('mongoose');

const simulationSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true,
    index: true
  },
  
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  simulatorId: {
    type: String,
    required: true,
    enum: [
      'projectile_motion',
      'circular_motion',
      'simple_harmonic_motion',
      'fluid_dynamics',
      'thermodynamics',
      'electromagnetism',
      'optics',
      'quantum_mechanics'
    ]
  },
  
  state: {
    currentStep: {
      type: Number,
      default: 0
    },
    parameters: {
      type: Object,
      default: {}
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    lastSaveTime: {
      type: Date,
      default: Date.now
    },
    pausedAt: Date,
    resumedAt: Date
  },
  
  interactions: [{
    timestamp: Date,
    action: String,
    data: Object,
    result: Object
  }],
  
  finalState: {
    type: Object,
    default: null
  },
  
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned', 'expired'],
    default: 'active',
    index: true
  },
  
  metadata: {
    difficulty: String,
    expectedDuration: Number,
    actualDuration: Number,
    pauseCount: {
      type: Number,
      default: 0
    },
    saveCount: {
      type: Number,
      default: 0
    },
    deviceInfo: Object,
    browserInfo: Object
  },
  
  timeTaken: {
    type: Number,
    default: 0
  },
  
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  completedAt: Date,
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
}, {
  timestamps: true
});

// Indexes
simulationSessionSchema.index({ studentId: 1, status: 1 });
simulationSessionSchema.index({ challengeId: 1, studentId: 1 });
simulationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
simulationSessionSchema.methods.pause = function() {
  this.status = 'paused';
  this.state.pausedAt = new Date();
  this.metadata.pauseCount += 1;
  return this.save();
};

simulationSessionSchema.methods.resume = function() {
  this.status = 'active';
  this.state.resumedAt = new Date();
  return this.save();
};

simulationSessionSchema.methods.saveState = function(newState) {
  this.state = {
    ...this.state,
    ...newState,
    lastSaveTime: new Date()
  };
  this.metadata.saveCount += 1;
  return this.save();
};

simulationSessionSchema.methods.addInteraction = function(interaction) {
  this.interactions.push({
    timestamp: new Date(),
    ...interaction
  });
  return this.save();
};

simulationSessionSchema.methods.complete = function(finalState) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.finalState = finalState;
  this.timeTaken = Math.floor((this.completedAt - this.startedAt) / 1000); // seconds
  this.metadata.actualDuration = this.timeTaken;
  return this.save();
};

// Static methods
simulationSessionSchema.statics.getActiveSession = async function(studentId, challengeId) {
  return this.findOne({
    studentId,
    challengeId,
    status: 'active'
  }).populate('challengeId');
};

simulationSessionSchema.statics.getActiveSessions = async function(studentId) {
  return this.find({
    studentId,
    status: 'active'
  }).populate('challengeId').sort({ startedAt: -1 });
};

simulationSessionSchema.statics.expireOldSessions = async function() {
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() }
    },
    {
      status: 'expired'
    }
  );
  return result.modifiedCount;
};

const SimulationSession = mongoose.model('SimulationSession', simulationSessionSchema);

module.exports = SimulationSession;