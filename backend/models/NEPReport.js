// models/NEPReport.js
/**
 * NEP REPORT MODEL
 * Student NEP 2020 competency reports
 * 
 * @module models/NEPReport
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { NEP_COMPETENCIES } = require('../config/constants');

const nepReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    default: () => `REPORT-${nanoid(10).toUpperCase()}`
  },
  
  studentId: {
    type: String,
    required: true,
    ref: 'Student',
    index: true
  },
  
  schoolId: {
    type: String,
    required: true,
    ref: 'School'
  },
  
  reportType: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'annual'],
    required: true
  },
  
  periodStart: {
    type: Date,
    required: true
  },
  
  periodEnd: {
    type: Date,
    required: true
  },
  
  // Performance Summary
  summary: {
    overallSPI: Number,
    grade: String,
    totalChallenges: Number,
    completedChallenges: Number,
    averageScore: Number,
    improvement: Number, // Percentage change from last report
    streak: Number
  },
  
  // Competency Breakdown
  competencies: [{
    name: {
      type: String,
      enum: NEP_COMPETENCIES
    },
    score: Number,
    previousScore: Number,
    change: Number,
    status: {
      type: String,
      enum: ['improving', 'stable', 'declining']
    }
  }],
  
  // Challenge Statistics
  challengeStats: {
    bySimulation: Map,
    byDifficulty: {
      easy: { attempted: Number, completed: Number, averageScore: Number },
      medium: { attempted: Number, completed: Number, averageScore: Number },
      hard: { attempted: Number, completed: Number, averageScore: Number }
    }
  },
  
  // Recommendations
  recommendations: [{
    type: String,
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }],
  
  // Generated Data
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  generatedBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

nepReportSchema.index({ reportId: 1 });
nepReportSchema.index({ studentId: 1, generatedAt: -1 });
nepReportSchema.index({ schoolId: 1, reportType: 1 });

const NEPReport = mongoose.model('NEPReport', nepReportSchema);

module.exports = NEPReport;