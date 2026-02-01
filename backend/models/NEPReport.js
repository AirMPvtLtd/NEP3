/**
 * NEP REPORT MODEL
 * Student NEP 2020 competency reports
 *
 * Ledger-anchored, AI-assisted (language only)
 *
 * @module models/NEPReport
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { NEP_COMPETENCIES } = require('../config/constants');

const nepReportSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------
    // CORE IDENTIFIERS
    // ------------------------------------------------------------------
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

    // ------------------------------------------------------------------
    // PERFORMANCE SUMMARY (DETERMINISTIC / ANALYTICS)
    // ------------------------------------------------------------------
    summary: {
      overallSPI: Number,
      grade: String,
      totalChallenges: Number,
      completedChallenges: Number,
      averageScore: Number,
      improvement: Number, // percentage change
      streak: Number
    },

    // ------------------------------------------------------------------
    // COMPETENCY BREAKDOWN (LEDGER-DERIVED ONLY)
    // ------------------------------------------------------------------
    competencies: [
      {
        name: {
          type: String,
          enum: NEP_COMPETENCIES,
          required: true
        },
        score: Number,
        previousScore: Number,
        change: Number,
        status: {
          type: String,
          enum: ['improving', 'stable', 'declining'],
          default: 'stable'
        }
      }
    ],

    // ------------------------------------------------------------------
    // CHALLENGE STATISTICS (ANALYTICS ONLY)
    // ------------------------------------------------------------------
    challengeStats: {
      bySimulation: {
        type: Map,
        of: Number
      },
      byDifficulty: {
        easy: {
          attempted: Number,
          completed: Number,
          averageScore: Number
        },
        medium: {
          attempted: Number,
          completed: Number,
          averageScore: Number
        },
        hard: {
          attempted: Number,
          completed: Number,
          averageScore: Number
        }
      }
    },

    // ------------------------------------------------------------------
    // RECOMMENDATIONS (SYSTEM / TEACHER)
    // ------------------------------------------------------------------
    recommendations: [
      {
        type: {
          type: String
        },
        description: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'medium'
        }
      }
    ],

    // ------------------------------------------------------------------
    // 🔥 AI NARRATION CACHE (LANGUAGE ONLY)
    // ------------------------------------------------------------------
    narration: {
      text: {
        type: String
      },
      model: {
        type: String,
        default: 'SPYRAL-AI'
      },
      language: {
        type: String,
        default: 'en'
      },
      version: {
        type: String,
        default: 'v1'
      },
      generatedAt: {
        type: Date
      }
    },

    // ------------------------------------------------------------------
    // METADATA
    // ------------------------------------------------------------------
    generatedAt: {
      type: Date,
      default: Date.now
    },

    generatedBy: {
      type: String,
      default: 'system'
    }
  },
  {
    timestamps: true
  }
);

// ----------------------------------------------------------------------
// INDEXES
// ----------------------------------------------------------------------
nepReportSchema.index({ reportId: 1 });
nepReportSchema.index({ studentId: 1, generatedAt: -1 });
nepReportSchema.index({ schoolId: 1, reportType: 1 });

// ----------------------------------------------------------------------
// MODEL EXPORT
// ----------------------------------------------------------------------
const NEPReport = mongoose.model('NEPReport', nepReportSchema);
module.exports = NEPReport;
