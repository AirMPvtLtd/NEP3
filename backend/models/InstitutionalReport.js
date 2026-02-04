/**
 * INSTITUTIONAL REPORT MODEL
 * School-wide NEP analytics & audit-ready reports
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { NEP_COMPETENCIES } = require('../config/constants');

const institutionalReportSchema = new mongoose.Schema({

  // ------------------------------------------------------------------
  // Identity
  // ------------------------------------------------------------------
  reportId: {
    type: String,
    unique: true,
    required: true,
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

  // ------------------------------------------------------------------
  // High-Level Overview (Executive Summary)
  // ------------------------------------------------------------------
  overview: {
    totalStudents: { type: Number, default: 0 },
    activeStudents: { type: Number, default: 0 },
    totalTeachers: { type: Number, default: 0 },
    totalClasses: { type: Number, default: 0 },
    totalChallenges: { type: Number, default: 0 },

    // School-level SPI / CPI equivalent
    averageSPI: { type: Number, default: null }
  },

  // ------------------------------------------------------------------
  // Performance Distribution (Grade Bands)
  // ------------------------------------------------------------------
  performanceDistribution: {
    aPlus: { type: Number, default: 0 }, // 90–100
    a:     { type: Number, default: 0 }, // 80–89
    b:     { type: Number, default: 0 }, // 70–79
    c:     { type: Number, default: 0 }, // 60–69
    d:     { type: Number, default: 0 }, // 50–59
    f:     { type: Number, default: 0 }  // <50
  },

  // ------------------------------------------------------------------
  // Class-wise Performance
  // ------------------------------------------------------------------
  classwisePerformance: [{
    class: { type: Number, required: true },
    section: { type: String, required: true },

    totalStudents: { type: Number, default: 0 },
    averageSPI: { type: Number, default: null },
    averageChallengeScore: { type: Number, default: null }
  }],

  // ------------------------------------------------------------------
  // Subject-wise Performance
  // ------------------------------------------------------------------
  subjectwisePerformance: [{
    subject: { type: String, required: true },

    totalChallenges: { type: Number, default: 0 },
    averageScore: { type: Number, default: null },
    passRate: { type: Number, default: null } // percentage
  }],

  // ------------------------------------------------------------------
  // Top Performers (Leaderboard Snapshot)
  // ------------------------------------------------------------------
  topPerformers: [{
    studentId: { type: String, required: true },
    name: { type: String, required: true },
    class: { type: Number, required: true },

    spi: { type: Number, required: true },
    rank: { type: Number, required: true }
  }],

  // ------------------------------------------------------------------
  // NEP Competency Overview (12-Competency Map)
  // ------------------------------------------------------------------
  competencyOverview: [{
    competency: {
      type: String,
      enum: NEP_COMPETENCIES,
      required: true
    },

    averageScore: { type: Number, default: null },
    studentsAbove80: { type: Number, default: 0 },
    studentsBelow50: { type: Number, default: 0 }
  }],

  // ------------------------------------------------------------------
  // Activity & Engagement Trends
  // ------------------------------------------------------------------
  activityTrends: {
    dailyChallenges: {
      type: Map,
      of: Number,
      default: {}
    },

    weeklyActive: {
      type: Map,
      of: Number,
      default: {}
    },

    loginTrends: {
      type: Map,
      of: Number,
      default: {}
    }
  },

  // ------------------------------------------------------------------
  // AI Usage & Cost Analytics (for Admin / Govt)
  // ------------------------------------------------------------------
  aiUsage: {
    totalEvaluations: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: null }, // ms
    totalTokensUsed: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 }
  },

  // ------------------------------------------------------------------
  // Metadata
  // ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// Indexes (Performance + Audit)
// ------------------------------------------------------------------
institutionalReportSchema.index({ reportId: 1 });
institutionalReportSchema.index({ schoolId: 1, generatedAt: -1 });
institutionalReportSchema.index({ reportType: 1, periodStart: -1 });

module.exports = mongoose.model(
  'InstitutionalReport',
  institutionalReportSchema
);
