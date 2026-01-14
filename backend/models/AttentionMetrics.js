/**
 * ATTENTION METRICS MODEL
 * Focus and engagement pattern tracking
 */

const mongoose = require('mongoose');

const attentionMetricsSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  
  questionAttention: [{
    questionIndex: { type: Number, required: true },
    attentionScore: { type: Number, min: 0, max: 1, required: true },
    timeSpent: { type: Number, required: true },
    revisitCount: { type: Number, default: 0 },
    mouseMovements: Number,
    keystrokes: Number
  }],
  
  overallAttention: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  
  focusPatterns: [{
    startTime: { type: Number, required: true },
    duration: { type: Number, required: true },
    intensity: { type: Number, min: 0, max: 1, required: true }
  }],
  
  engagement: {
    peakAttention: { type: Number, min: 0, max: 1 },
    attentionDrops: { type: Number, default: 0 },
    averageFocusDuration: Number
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

attentionMetricsSchema.index({ studentId: 1, timestamp: -1 });
attentionMetricsSchema.index({ studentId: 1, challengeId: 1 });

attentionMetricsSchema.virtual('attentionQuality').get(function() {
  if (this.overallAttention >= 0.8) return 'EXCELLENT';
  if (this.overallAttention >= 0.6) return 'GOOD';
  if (this.overallAttention >= 0.4) return 'FAIR';
  return 'NEEDS_IMPROVEMENT';
});

attentionMetricsSchema.methods.getPeakAttentionPeriod = function() {
  if (!this.focusPatterns || this.focusPatterns.length === 0) return null;
  return this.focusPatterns.reduce((peak, pattern) => 
    pattern.intensity > peak.intensity ? pattern : peak
  );
};

attentionMetricsSchema.statics.getAverageAttention = async function(studentId, days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const metrics = await this.find({ studentId, timestamp: { $gte: cutoffDate } });
  
  if (metrics.length === 0) return null;
  
  const avgAttention = metrics.reduce((sum, m) => sum + m.overallAttention, 0) / metrics.length;
  return { average: avgAttention, count: metrics.length, period: days };
};

module.exports = mongoose.model('AttentionMetrics', attentionMetricsSchema);