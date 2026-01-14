/**
 * PREDICTION VALIDATION MODEL
 * Tracks accuracy of innovation predictions
 */

const mongoose = require('mongoose');

const predictionValidationSchema = new mongoose.Schema({
  innovationProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InnovationProfile',
    required: true
  },
  
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  
  predictionMadeAt: Date,
  validationDate: Date,
  
  predicted: {
    willInnovate: Boolean,
    timeframe: String,
    innovationType: [String],
    confidence: Number
  },
  
  actual: {
    didInnovate: Boolean,
    innovations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InnovationEvent'
    }],
    innovationTypes: [String]
  },
  
  accuracy: {
    predictionCorrect: Boolean,
    timingCorrect: Boolean,
    typeCorrect: Boolean,
    confidenceCalibrated: Boolean,
    overallAccuracy: Number
  },
  
  learningUpdates: {
    algorithmsUpdated: [String],
    confidenceAdjustment: Number,
    featuresRefined: [String]
  }
}, {
  timestamps: true
});

predictionValidationSchema.index({ studentId: 1 });
predictionValidationSchema.index({ validationDate: -1 });

module.exports = mongoose.model('PredictionValidation', predictionValidationSchema);