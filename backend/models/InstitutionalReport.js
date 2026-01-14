// models/InstitutionalReport.js
/**
 * INSTITUTIONAL REPORT MODEL
 * School-wide analytics and reports
 * 
 * @module models/InstitutionalReport
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const institutionalReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    default: () => `INST-${nanoid(10).toUpperCase()}`
  },
  
  schoolId: {
    type: String,
    required: true,
    ref: 'School',
    index: true
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
  
  // Overall Statistics
  overview: {
    totalStudents: Number,
    activeStudents: Number,
    totalTeachers: Number,
    totalClasses: Number,
    totalChallenges: Number,
    averageSPI: Number
  },
  
  // Performance Distribution
  performanceDistribution: {
    aPlus: Number, // 90-100
    a: Number,     // 80-89
    b: Number,     // 70-79
    c: Number,     // 60-69
    d: Number,     // 50-59
    f: Number      // 0-49
  },
  
  // Class-wise Performance
  classwisePerformance: [{
    class: Number,
    section: String,
    totalStudents: Number,
    averageSPI: Number,
    averageChallengeScore: Number
  }],
  
  // Subject-wise Performance
  subjectwisePerformance: [{
    subject: String,
    totalChallenges: Number,
    averageScore: Number,
    passRate: Number
  }],
  
  // Top Performers
  topPerformers: [{
    studentId: String,
    name: String,
    class: Number,
    spi: Number,
    rank: Number
  }],
  
  // Competency Overview
  competencyOverview: [{
    competency: String,
    averageScore: Number,
    studentsAbove80: Number,
    studentsBelow50: Number
  }],
  
  // Activity Trends
  activityTrends: {
    dailyChallenges: Map,
    weeklyActive: Map,
    loginTrends: Map
  },
  
  // AI Usage Statistics
  aiUsage: {
    totalEvaluations: Number,
    averageResponseTime: Number,
    totalTokensUsed: Number,
    estimatedCost: Number
  },
  
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

institutionalReportSchema.index({ reportId: 1 });
institutionalReportSchema.index({ schoolId: 1, generatedAt: -1 });
institutionalReportSchema.index({ reportType: 1 });

const InstitutionalReport = mongoose.model('InstitutionalReport', institutionalReportSchema);

module.exports = InstitutionalReport;