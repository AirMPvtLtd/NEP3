/**
 * LONGITUDINAL DATA MODEL
 * Multi-year tracking of student progress
 */

const mongoose = require('mongoose');

const longitudinalDataSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  trackingStartDate: {
    type: Date,
    default: Date.now
  },
  
  trackingDuration: {
    type: String,
    enum: ['6_MONTHS', '12_MONTHS', '24_MONTHS', '5_YEARS']
  },
  
  dataPoints: [{
    timestamp: Date,
    spi: Number,
    innovationScore: Number,
    learningState: String,
    conceptsMastered: [String],
    challengesCompleted: Number,
    majorMilestones: [String],
    externalEvents: [String]
  }],
  
  trends: {
    spiTrend: String,
    innovationTrend: String,
    engagementTrend: String,
    consistencyScore: Number
  },
  
  cohortComparison: {
    cohortId: String,
    percentileRank: Number,
    aboveAverage: Boolean
  }
}, {
  timestamps: true
});

longitudinalDataSchema.index({ studentId: 1, trackingStartDate: -1 });

module.exports = mongoose.model('LongitudinalData', longitudinalDataSchema);