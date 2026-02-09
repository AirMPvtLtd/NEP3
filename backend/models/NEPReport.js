/**
 * NEP REPORT MODEL (FINAL – UPSERT SAFE)
 * --------------------------------------------------
 * Canonical academic report under NEP 2020
 * - One report per student per period per reportType
 * - Ledger anchored
 * - SPI is READ-ONLY consumer
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { NEP_COMPETENCIES } = require('../config/constants');

const nepReportSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // CORE IDENTIFIERS
    // --------------------------------------------------
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
      ref: 'School',
      index: true
    },

    reportType: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'annual'],
      required: true,
      index: true
    },

    periodStart: {
      type: Date,
      required: true,
      index: true
    },

    periodEnd: {
      type: Date,
      required: true,
      index: true
    },

    // --------------------------------------------------
    // PERFORMANCE SUMMARY (SPI → READ ONLY)
    // --------------------------------------------------
    summary: {
      overallSPI: Number,
      grade: String,
      totalChallenges: Number,
      completedChallenges: Number,
      averageScore: Number,
      improvement: Number,
      streak: Number
    },

    // --------------------------------------------------
    // COMPETENCY BREAKDOWN (CPI / LEDGER DERIVED)
    // --------------------------------------------------
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

    // --------------------------------------------------
    // CHALLENGE ANALYTICS (NON-AUTHORITATIVE)
    // --------------------------------------------------
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

    // --------------------------------------------------
    // RECOMMENDATIONS (SYSTEM / TEACHER)
    // --------------------------------------------------
    recommendations: [
      {
        type: { type: String },
        description: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'medium'
        }
      }
    ],

    // --------------------------------------------------
    // AI NARRATION (CACHE ONLY)
    // --------------------------------------------------
    narration: {
      text: String,
      model: { type: String, default: 'SPYRAL-AI' },
      language: { type: String, default: 'en' },
      version: { type: String, default: 'v1' },
      generatedAt: Date
    },

    // --------------------------------------------------
    // METADATA
    // --------------------------------------------------
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

// --------------------------------------------------
// 🔐 CRITICAL COMPOSITE UNIQUE INDEX (SYSTEM LAW)
// --------------------------------------------------
nepReportSchema.index(
  {
    studentId: 1,
    reportType: 1,
    periodStart: 1,
    periodEnd: 1
  },
  {
    unique: true,
    name: 'unique_student_period_report'
  }
);

// --------------------------------------------------
module.exports = mongoose.model('NEPReport', nepReportSchema);
