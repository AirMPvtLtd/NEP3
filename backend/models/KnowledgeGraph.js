/**
 * KNOWLEDGE GRAPH MODEL
 * Concept mastery and relationship tracking
 */

const mongoose = require('mongoose');

const knowledgeGraphSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  
  subject: {
    type: String,
    required: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  concepts: {
    type: Map,
    of: {
      mastery: { type: Number, min: 0, max: 1 },
      confidence: { type: Number, min: 0, max: 1 },
      lastPracticed: Date,
      practiceCount: Number,
      
      relatedConcepts: [{
        concept: String,
        strength: { type: Number, min: 0, max: 1 }
      }],
      
      strengths: [String],
      weaknesses: [String],
      
      progressionHistory: [{
        date: Date,
        mastery: Number
      }]
    }
  },
  
  conceptualGaps: [{
    gap: String,
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    },
    detectedFrom: [String],
    recommendedPractice: [String],
    estimatedTimeToClose: String
  }],
  
  knowledgeMap: {
    nodes: [{
      id: String,
      mastery: Number
    }],
    edges: [{
      from: String,
      to: String,
      strength: Number
    }]
  }
}, {
  timestamps: true
});

knowledgeGraphSchema.index({ studentId: 1 });
knowledgeGraphSchema.index({ subject: 1 });

module.exports = mongoose.model('KnowledgeGraph', knowledgeGraphSchema);